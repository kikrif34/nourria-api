import { Router, Request, Response } from 'express';
import { getSupabaseClient } from '../utils/supabase';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';

export const carteRouter = Router();

const ID_RESTAURANT = '00000000-0000-0000-0000-000000000001';

// ─── PLATS ────────────────────────────────────────────────────────────────────

// GET /api/v1/carte/plats
carteRouter.get('/plats', async (_req, res: Response) => {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('plats')
    .select('*')
    .eq('id_restaurant', ID_RESTAURANT)
    .order('categorie', { ascending: true })
    .order('nom', { ascending: true });

  if (error) throw new Error(error.message);
  res.json({ data });
});

// POST /api/v1/carte/plats
carteRouter.post('/plats', async (req: Request, res: Response) => {
  const { nom, categorie, prix_vente } = req.body;
  if (!nom) throw new ValidationError('nom est requis');
  if (!prix_vente) throw new ValidationError('prix_vente est requis');

  const db = getSupabaseClient();
  const { data, error } = await db
    .from('plats')
    .insert({ id_restaurant: ID_RESTAURANT, nom, categorie, prix_vente: parseFloat(prix_vente) })
    .select()
    .single();

  if (error) throw new Error(error.message);
  res.status(201).json({ data });
});

// PUT /api/v1/carte/plats/:id
carteRouter.put('/plats/:id', async (req: Request, res: Response) => {
  const { nom, categorie, prix_vente, actif } = req.body;
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('plats')
    .update({ nom, categorie, prix_vente: prix_vente ? parseFloat(prix_vente) : undefined, actif })
    .eq('id_plat', req.params.id)
    .eq('id_restaurant', ID_RESTAURANT)
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new NotFoundError('Plat');
  res.json({ data });
});

// DELETE /api/v1/carte/plats/:id
carteRouter.delete('/plats/:id', async (req: Request, res: Response) => {
  const db = getSupabaseClient();
  const { error } = await db
    .from('plats')
    .delete()
    .eq('id_plat', req.params.id)
    .eq('id_restaurant', ID_RESTAURANT);

  if (error) throw new Error(error.message);
  res.status(204).send();
});

// ─── INGREDIENTS ──────────────────────────────────────────────────────────────

// GET /api/v1/carte/ingredients
carteRouter.get('/ingredients', async (_req, res: Response) => {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('ingredients')
    .select('*')
    .eq('id_restaurant', ID_RESTAURANT)
    .order('nom', { ascending: true });

  if (error) throw new Error(error.message);
  res.json({ data });
});

// POST /api/v1/carte/ingredients
carteRouter.post('/ingredients', async (req: Request, res: Response) => {
  const { nom, unite, cout_unitaire } = req.body;
  if (!nom) throw new ValidationError('nom est requis');
  if (!unite) throw new ValidationError('unite est requise');

  const db = getSupabaseClient();
  const { data, error } = await db
    .from('ingredients')
    .insert({
      id_restaurant: ID_RESTAURANT,
      nom,
      unite,
      cout_unitaire: cout_unitaire ? parseFloat(cout_unitaire) : null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  res.status(201).json({ data });
});

// PUT /api/v1/carte/ingredients/:id
carteRouter.put('/ingredients/:id', async (req: Request, res: Response) => {
  const { nom, unite, cout_unitaire } = req.body;
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('ingredients')
    .update({ nom, unite, cout_unitaire: cout_unitaire ? parseFloat(cout_unitaire) : null })
    .eq('id_ingredient', req.params.id)
    .eq('id_restaurant', ID_RESTAURANT)
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new NotFoundError('Ingredient');
  res.json({ data });
});

// DELETE /api/v1/carte/ingredients/:id
carteRouter.delete('/ingredients/:id', async (req: Request, res: Response) => {
  const db = getSupabaseClient();
  const { error } = await db
    .from('ingredients')
    .delete()
    .eq('id_ingredient', req.params.id)
    .eq('id_restaurant', ID_RESTAURANT);

  if (error) throw new Error(error.message);
  res.status(204).send();
});

// ─── RECETTES ─────────────────────────────────────────────────────────────────

// GET /api/v1/carte/plats/:id/recette
carteRouter.get('/plats/:id/recette', async (req: Request, res: Response) => {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('recettes')
    .select(`*, ingredients(nom, unite, cout_unitaire)`)
    .eq('id_plat', req.params.id);

  if (error) throw new Error(error.message);
  res.json({ data });
});

// POST /api/v1/carte/plats/:id/recette
carteRouter.post('/plats/:id/recette', async (req: Request, res: Response) => {
  const { id_ingredient, quantite, unite } = req.body;
  if (!id_ingredient) throw new ValidationError('id_ingredient est requis');
  if (!quantite) throw new ValidationError('quantite est requise');
  if (!unite) throw new ValidationError('unite est requise');

  const db = getSupabaseClient();
  const { data, error } = await db
    .from('recettes')
    .upsert({
      id_plat: req.params.id,
      id_ingredient,
      quantite: parseFloat(quantite),
      unite,
    }, { onConflict: 'id_plat,id_ingredient' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  res.status(201).json({ data });
});

// DELETE /api/v1/carte/plats/:id/recette/:id_ingredient
carteRouter.delete('/plats/:id/recette/:id_ingredient', async (req: Request, res: Response) => {
  const db = getSupabaseClient();
  const { error } = await db
    .from('recettes')
    .delete()
    .eq('id_plat', req.params.id)
    .eq('id_ingredient', req.params.id_ingredient);

  if (error) throw new Error(error.message);
  res.status(204).send();
});
