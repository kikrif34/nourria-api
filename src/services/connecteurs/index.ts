import { getSupabaseClient } from '../../utils/supabase';
import { syncSumup } from './sumup';
import { syncZelty } from './zelty';
import { syncLaddition } from './laddition';

export { VenteNourria, ResultatSync, insererVentes } from './utils';

export async function syncCaisse(id_restaurant: string, type_caisse: string) {
  const db = getSupabaseClient();

  const { data: connexion, error } = await db
    .from('connexions_caisses')
    .select('*')
    .eq('id_restaurant', id_restaurant)
    .eq('type_caisse', type_caisse)
    .single();

  if (error || !connexion) throw new Error(`Connexion ${type_caisse} non trouvee`);

  let resultat;
  switch (type_caisse) {
    case 'sumup':    resultat = await syncSumup(connexion.config, id_restaurant); break;
    case 'zelty':    resultat = await syncZelty(connexion.config, id_restaurant); break;
    case 'laddition': resultat = await syncLaddition(connexion.config, id_restaurant); break;
    default: throw new Error(`Type de caisse inconnu : ${type_caisse}`);
  }

  await db.from('connexions_caisses').update({
    derniere_synchro: new Date().toISOString(),
    statut: resultat.statut === 'erreur' ? 'erreur' : 'actif',
  }).eq('id_restaurant', id_restaurant).eq('type_caisse', type_caisse);

  return resultat;
}
