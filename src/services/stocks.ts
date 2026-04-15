import { getSupabaseClient } from '../utils/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EtatStock = {
  id_stock: string;
  id_ingredient: string;
  nom_ingredient: string;
  quantite: number;
  seuil_alerte: number;
  unite: string;
  statut: 'ok' | 'alerte' | 'rupture';
  mis_a_jour_le: string;
};

export type EtatEquipement = {
  id_equipement: string;
  nom: string;
  date_derniere_revision: string | null;
  intervalle_jours: number;
  jours_restants: number;
  statut: 'ok' | 'bientot' | 'urgent';
};

export type TableauBordOps = {
  stocks: EtatStock[];
  alertes_stock: EtatStock[];
  equipements: EtatEquipement[];
  alertes_equipement: EtatEquipement[];
};

// ─── Service stocks ───────────────────────────────────────────────────────────

export async function getTableauBordOps(
  id_restaurant: string
): Promise<TableauBordOps> {
  const db = getSupabaseClient();

  // Stocks
  const { data: stocks_data, error: stocks_error } = await db
    .from('stocks')
    .select(`
      id_stock,
      id_ingredient,
      quantite,
      seuil_alerte,
      unite,
      mis_a_jour_le,
      ingredients (nom)
    `)
    .eq('id_restaurant', id_restaurant)
    .order('quantite', { ascending: true });

  if (stocks_error) throw new Error(`[Supabase stocks] ${stocks_error.message}`);

  const stocks: EtatStock[] = (stocks_data ?? []).map((s: any) => {
    let statut: EtatStock['statut'] = 'ok';
    if (s.quantite === 0) statut = 'rupture';
    else if (s.quantite <= s.seuil_alerte) statut = 'alerte';

    return {
      id_stock: s.id_stock,
      id_ingredient: s.id_ingredient,
      nom_ingredient: s.ingredients?.nom ?? 'Inconnu',
      quantite: s.quantite,
      seuil_alerte: s.seuil_alerte,
      unite: s.unite,
      statut,
      mis_a_jour_le: s.mis_a_jour_le,
    };
  });

  // Equipements
  const { data: equip_data, error: equip_error } = await db
    .from('equipements')
    .select('*')
    .eq('id_restaurant', id_restaurant);

  if (equip_error) throw new Error(`[Supabase equipements] ${equip_error.message}`);

  const equipements: EtatEquipement[] = (equip_data ?? []).map((e: any) => {
    let jours_restants = e.intervalle_jours;
    if (e.date_derniere_revision) {
      const derniere = new Date(e.date_derniere_revision);
      const prochaine = new Date(derniere);
      prochaine.setDate(prochaine.getDate() + e.intervalle_jours);
      jours_restants = Math.ceil(
        (prochaine.getTime() - Date.now()) / 86400000
      );
    }

    let statut: EtatEquipement['statut'] = 'ok';
    if (jours_restants <= 0) statut = 'urgent';
    else if (jours_restants <= 14) statut = 'bientot';

    return {
      id_equipement: e.id_equipement,
      nom: e.nom,
      date_derniere_revision: e.date_derniere_revision,
      intervalle_jours: e.intervalle_jours,
      jours_restants,
      statut,
    };
  });

  return {
    stocks,
    alertes_stock: stocks.filter((s) => s.statut !== 'ok'),
    equipements,
    alertes_equipement: equipements.filter((e) => e.statut !== 'ok'),
  };
}
