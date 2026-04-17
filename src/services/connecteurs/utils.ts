import { getSupabaseClient } from '../../utils/supabase';

export type VenteNourria = {
  date_service: string;
  creneau: 'midi' | 'soir';
  heure_debut: string;
  nb_couverts: number;
  ca_ht: number;
};

export type ResultatSync = {
  type_caisse: string;
  nb_ventes: number;
  periode: string;
  statut: 'ok' | 'erreur' | 'mock';
  message: string;
};

export async function insererVentes(ventes: VenteNourria[], id_restaurant: string): Promise<number> {
  const db = getSupabaseClient();
  let nb = 0;
  for (const vente of ventes) {
    const { error } = await db.from('ventes').upsert({
      id_restaurant,
      ...vente,
      nb_couverts: Math.round(vente.nb_couverts),
      ca_ht: Math.round(vente.ca_ht * 100) / 100,
    }, { onConflict: 'id_restaurant,date_service,creneau' });
    if (!error) nb++;
  }
  return nb;
}
