import { getSupabaseClient } from '../utils/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LigneFoodCost = {
  id_ingredient: string;
  nom_ingredient: string;
  quantite: number;
  unite: string;
  cout_unitaire: number;
  cout_ligne: number;
};

export type FoodCostPlat = {
  id_plat: string;
  nom_plat: string;
  categorie: string | null;
  prix_vente: number;
  cout_total: number;
  marge_euro: number;
  marge_pct: number;
  alerte: boolean;
  ingredients: LigneFoodCost[];
};

// ─── Calcul food cost pour tous les plats d'un restaurant ────────────────────

export async function getFoodCostParPlat(
  id_restaurant: string,
  seuil_alerte: number = 32
): Promise<FoodCostPlat[]> {
  const db = getSupabaseClient();

  // Récupère tous les plats avec leurs recettes et coûts ingrédients
  const { data, error } = await db
    .from('plats')
    .select(`
      id_plat,
      nom,
      categorie,
      prix_vente,
      actif,
      recettes (
        quantite,
        unite,
        ingredients (
          id_ingredient,
          nom,
          cout_unitaire,
          unite
        )
      )
    `)
    .eq('id_restaurant', id_restaurant)
    .eq('actif', true)
    .order('nom');

  if (error) throw new Error(`[Supabase] ${error.message}`);
  if (!data) return [];

  const resultats: FoodCostPlat[] = data.map((plat: any) => {
    const lignes: LigneFoodCost[] = (plat.recettes ?? [])
      .filter((r: any) => r.ingredients?.cout_unitaire != null)
      .map((r: any) => {
        const cout_ligne = parseFloat(
          (r.quantite * r.ingredients.cout_unitaire).toFixed(4)
        );
        return {
          id_ingredient: r.ingredients.id_ingredient,
          nom_ingredient: r.ingredients.nom,
          quantite: r.quantite,
          unite: r.unite,
          cout_unitaire: r.ingredients.cout_unitaire,
          cout_ligne,
        };
      });

    const cout_total = parseFloat(
      lignes.reduce((acc, l) => acc + l.cout_ligne, 0).toFixed(4)
    );
    const marge_euro = parseFloat((plat.prix_vente - cout_total).toFixed(2));
    const marge_pct = plat.prix_vente > 0
      ? parseFloat(((marge_euro / plat.prix_vente) * 100).toFixed(1))
      : 0;
    const food_cost_pct = 100 - marge_pct;

    return {
      id_plat: plat.id_plat,
      nom_plat: plat.nom,
      categorie: plat.categorie,
      prix_vente: plat.prix_vente,
      cout_total,
      marge_euro,
      marge_pct,
      alerte: food_cost_pct > seuil_alerte,
      ingredients: lignes,
    };
  });

  // Trier par marge croissante — les plats les moins rentables en premier
  return resultats.sort((a, b) => a.marge_pct - b.marge_pct);
}

// ─── Snapshot : enregistre les marges calculées en base ──────────────────────

export async function sauvegarderSnapshot(
  plats: FoodCostPlat[]
): Promise<void> {
  const db = getSupabaseClient();

  const snapshots = plats.map((p) => ({
    id_plat: p.id_plat,
    cout_total: p.cout_total,
    marge_pct: p.marge_pct,
  }));

  const { error } = await db.from('food_cost_snapshots').insert(snapshots);
  if (error) throw new Error(`[Supabase snapshot] ${error.message}`);
}
