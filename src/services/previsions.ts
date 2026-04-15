import { getSupabaseClient } from '../utils/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PrevisionCreneau = {
  creneau: string;
  heure_debut: string;
  nb_couverts_prevu: number;
  nb_couverts_min: number;
  nb_couverts_max: number;
  niveau: 'calme' | 'normal' | 'charge' | 'rush';
};

export type PrevisionJour = {
  date: string;
  jour_semaine: string;
  creneaux: PrevisionCreneau[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const JOURS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];

function niveauRush(couverts: number): PrevisionCreneau['niveau'] {
  if (couverts < 20) return 'calme';
  if (couverts < 40) return 'normal';
  if (couverts < 60) return 'charge';
  return 'rush';
}

// ─── Service prévisions ───────────────────────────────────────────────────────

export async function getPrevisions(
  id_restaurant: string,
  nb_jours: number = 7
): Promise<PrevisionJour[]> {
  const db = getSupabaseClient();

  // Récupère l'historique des 4 dernières semaines
  const { data, error } = await db
    .from('ventes')
    .select('date_service, creneau, heure_debut, nb_couverts')
    .eq('id_restaurant', id_restaurant)
    .gte('date_service', new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0])
    .order('date_service', { ascending: true });

  if (error) throw new Error(`[Supabase] ${error.message}`);
  if (!data || data.length === 0) return [];

  // Groupe par jour de semaine + créneau
  const historique: Record<string, Record<string, number[]>> = {};
  for (const v of data) {
    const jourSemaine = new Date(v.date_service).getDay().toString();
    if (!historique[jourSemaine]) historique[jourSemaine] = {};
    if (!historique[jourSemaine][v.creneau]) historique[jourSemaine][v.creneau] = [];
    historique[jourSemaine][v.creneau].push(v.nb_couverts);
  }

  // Calcule moyenne pondérée (les données récentes comptent plus)
  function moyennePonderee(valeurs: number[]): number {
    if (valeurs.length === 0) return 0;
    let somme = 0;
    let poids_total = 0;
    valeurs.forEach((v, i) => {
      const poids = i + 1;
      somme += v * poids;
      poids_total += poids;
    });
    return Math.round(somme / poids_total);
  }

  // Génère les prévisions pour les prochains jours
  const previsions: PrevisionJour[] = [];
  const creneaux_info: Record<string, string> = { midi: '12:00', soir: '19:00' };

  for (let i = 0; i < nb_jours; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const jourSemaine = date.getDay().toString();
    const dateStr = date.toISOString().split('T')[0];

    const creneaux: PrevisionCreneau[] = [];

    for (const [creneau, heure] of Object.entries(creneaux_info)) {
      const valeurs = historique[jourSemaine]?.[creneau] ?? [];
      const prevu = valeurs.length > 0 ? moyennePonderee(valeurs) : 35;
      const min = valeurs.length > 0 ? Math.min(...valeurs) : 20;
      const max = valeurs.length > 0 ? Math.max(...valeurs) : 50;

      creneaux.push({
        creneau,
        heure_debut: heure,
        nb_couverts_prevu: prevu,
        nb_couverts_min: min,
        nb_couverts_max: max,
        niveau: niveauRush(prevu),
      });
    }

    previsions.push({
      date: dateStr,
      jour_semaine: JOURS[date.getDay()],
      creneaux,
    });
  }

  return previsions;
}
