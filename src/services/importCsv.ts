import { parse } from 'csv-parse/sync';
import { getSupabaseClient } from '../utils/supabase';

export type LigneCSV = {
  date: string;
  heure: string;
  plat: string;
  quantite: number;
  prix_unitaire: number;
  creneau: 'midi' | 'soir';
};

export type ResultatImport = {
  nb_lignes: number;
  nb_ventes_inserees: number;
  nb_erreurs: number;
  erreurs: string[];
  plats_inconnus: string[];
};

export async function importerCSV(contenu: string, id_restaurant: string): Promise<ResultatImport> {
  const db = getSupabaseClient();
  const erreurs: string[] = [];
  const plats_inconnus: Set<string> = new Set();
  let nb_ventes_inserees = 0;

  let lignes: any[];
  try {
    lignes = parse(contenu, { columns: true, skip_empty_lines: true, trim: true });
  } catch (err: any) {
    throw new Error('Format CSV invalide : ' + err.message);
  }

  if (lignes.length === 0) throw new Error('Le fichier CSV est vide');

  const { data: plats } = await db.from('plats').select('id_plat, nom').eq('id_restaurant', id_restaurant);
  const platMap = new Map<string, string>();
  (plats ?? []).forEach((p: any) => platMap.set(p.nom.toLowerCase().trim(), p.id_plat));

  const ventesMap = new Map<string, { nb_couverts: number; ca_ht: number; heure_debut: string }>();

  for (let i = 0; i < lignes.length; i++) {
    const ligne = lignes[i];
    const num = i + 2;

    if (!ligne.date || !ligne.heure || !ligne.plat || !ligne.quantite || !ligne.creneau) {
      erreurs.push('Ligne ' + num + ' : champs manquants');
      continue;
    }

    const creneau = ligne.creneau.toLowerCase().trim();
    if (creneau !== 'midi' && creneau !== 'soir') {
      erreurs.push('Ligne ' + num + ' : creneau invalide "' + ligne.creneau + '"');
      continue;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(ligne.date)) {
      erreurs.push('Ligne ' + num + ' : format date invalide "' + ligne.date + '"');
      continue;
    }

    const quantite = parseFloat(ligne.quantite);
    const prix = parseFloat(ligne.prix_unitaire ?? 0);

    if (isNaN(quantite) || quantite <= 0) {
      erreurs.push('Ligne ' + num + ' : quantite invalide "' + ligne.quantite + '"');
      continue;
    }

    const nomPlat = ligne.plat.toLowerCase().trim();
    if (!platMap.has(nomPlat)) plats_inconnus.add(ligne.plat);

    const cle = ligne.date + '__' + creneau;
    const existing = ventesMap.get(cle);
    if (existing) {
      existing.nb_couverts += quantite;
      existing.ca_ht += quantite * prix;
    } else {
      ventesMap.set(cle, { nb_couverts: quantite, ca_ht: quantite * prix, heure_debut: creneau === 'midi' ? '12:00' : '19:00' });
    }
  }

  for (const [cle, vente] of ventesMap.entries()) {
    const [date_service, creneau] = cle.split('__');
    const { error } = await db.from('ventes').upsert({
      id_restaurant,
      date_service,
      creneau,
      heure_debut: vente.heure_debut,
      nb_couverts: Math.round(vente.nb_couverts),
      ca_ht: Math.round(vente.ca_ht * 100) / 100,
    }, { onConflict: 'id_restaurant,date_service,creneau' });

    if (error) {
      erreurs.push('Erreur insertion ' + date_service + ' ' + creneau + ' : ' + error.message);
    } else {
      nb_ventes_inserees++;
    }
  }

  return {
    nb_lignes: lignes.length,
    nb_ventes_inserees,
    nb_erreurs: erreurs.length,
    erreurs: erreurs.slice(0, 10),
    plats_inconnus: Array.from(plats_inconnus),
  };
}
