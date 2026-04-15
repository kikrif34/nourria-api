import { getSupabaseClient } from '../utils/supabase';
import { callClaude, parseClaudeJson } from '../utils/claude';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Shift = {
  id_employe: string;
  prenom: string;
  poste: string;
  jour_semaine: number;
  heure_debut: string;
  heure_fin: string;
};

export type PlanningGenere = {
  semaine: number;
  annee: number;
  shifts: Shift[];
  masse_salariale: number;
  nb_heures_total: number;
  genere_par_ia: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function heureEnMinutes(heure: string): number {
  const [h, m] = heure.split(':').map(Number);
  return h * 60 + m;
}

function dureeHeures(debut: string, fin: string): number {
  return (heureEnMinutes(fin) - heureEnMinutes(debut)) / 60;
}

function numeroSemaine(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// ─── Générer planning avec IA ─────────────────────────────────────────────────

export async function genererPlanning(
  id_restaurant: string,
  semaine?: number,
  annee?: number
): Promise<PlanningGenere> {
  const db = getSupabaseClient();

  const now = new Date();
  const sem = semaine ?? numeroSemaine(now);
  const an  = annee   ?? now.getFullYear();

  // Récupère les employés
  const { data: employes, error } = await db
    .from('employes')
    .select('id_employe, prenom, nom, poste, heures_contrat, taux_horaire')
    .eq('id_restaurant', id_restaurant);

  if (error) throw new Error(`[Supabase planning] ${error.message}`);
  if (!employes || employes.length === 0) {
    throw new Error('Aucun employe trouve pour ce restaurant');
  }

  const system_prompt = `Tu es un assistant RH pour restaurant.
Tu génères des plannings hebdomadaires optimisés.
Tu réponds UNIQUEMENT en JSON valide sans markdown ni backticks.
Format exact :
{
  "shifts": [
    {
      "id_employe": "uuid",
      "jour_semaine": 1,
      "heure_debut": "09:00",
      "heure_fin": "17:00"
    }
  ]
}
Règles :
- jour_semaine : 1=Lundi, 2=Mardi, ..., 7=Dimanche
- Respecte les heures de contrat de chaque employe
- Minimum 2 personnes par service (midi et soir)
- Pause obligatoire : au moins 1 jour de repos par semaine
- Horaires midi : 10h00-15h30, soir : 17h00-23h00
- Responsable toujours present au moins 5 jours`;

  const user_prompt = `Génère le planning de la semaine ${sem}/${an}.
Employés :
${JSON.stringify(employes.map((e: any) => ({
  id_employe: e.id_employe,
  prenom: e.prenom,
  poste: e.poste,
  heures_contrat: e.heures_contrat,
})), null, 2)}`;

  const reponse = await callClaude(system_prompt, user_prompt, 4000);
  const resultat = parseClaudeJson<{ shifts: any[] }>(reponse.content);

  // Enrichit avec les infos employés
  const shifts_enrichis: Shift[] = resultat.shifts.map((s: any) => {
    const emp = employes.find((e: any) => e.id_employe === s.id_employe);
    return {
      id_employe: s.id_employe,
      prenom: emp?.prenom ?? 'Inconnu',
      poste: emp?.poste ?? 'Inconnu',
      jour_semaine: s.jour_semaine,
      heure_debut: s.heure_debut,
      heure_fin: s.heure_fin,
    };
  });

  // Calcule masse salariale
  let masse_salariale = 0;
  let nb_heures_total = 0;
  for (const s of resultat.shifts) {
    const emp = employes.find((e: any) => e.id_employe === s.id_employe);
    if (emp) {
      const heures = dureeHeures(s.heure_debut, s.heure_fin);
      nb_heures_total += heures;
      masse_salariale += heures * emp.taux_horaire;
    }
  }

  // Sauvegarde en base
  const { data: planning_data, error: planning_error } = await db
    .from('planning')
    .upsert({
      id_restaurant,
      semaine: sem,
      annee: an,
      statut: 'brouillon',
      genere_par_ia: true,
    }, { onConflict: 'id_restaurant,semaine,annee' })
    .select()
    .single();

  if (planning_error) throw new Error(`[Supabase planning] ${planning_error.message}`);

  // Supprime les anciens shifts et insère les nouveaux
  await db.from('shifts').delete().eq('id_planning', planning_data.id_planning);
  await db.from('shifts').insert(
    resultat.shifts.map((s: any) => ({
      id_planning: planning_data.id_planning,
      id_employe: s.id_employe,
      jour_semaine: s.jour_semaine,
      heure_debut: s.heure_debut,
      heure_fin: s.heure_fin,
      poste: employes.find((e: any) => e.id_employe === s.id_employe)?.poste ?? '',
    }))
  );

  console.log(
    `[AdminIA] Planning S${sem}/${an} généré — ` +
    `${shifts_enrichis.length} shifts — ` +
    `masse salariale : ${masse_salariale.toFixed(2)} €`
  );

  return {
    semaine: sem,
    annee: an,
    shifts: shifts_enrichis,
    masse_salariale: Math.round(masse_salariale * 100) / 100,
    nb_heures_total: Math.round(nb_heures_total * 10) / 10,
    genere_par_ia: true,
  };
}
