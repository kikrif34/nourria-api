import { Router, Request, Response } from 'express';
import { getSupabaseClient } from '../utils/supabase';
import { syncCaisse } from '../services/connecteurs/index';
import { ValidationError } from '../middleware/errorHandler';

export const connecteursRouter = Router();

const ID_RESTAURANT = '00000000-0000-0000-0000-000000000001';

// GET /api/v1/connecteurs — liste les connexions caisses
connecteursRouter.get('/', async (_req, res: Response) => {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('connexions_caisses')
    .select('*')
    .eq('id_restaurant', ID_RESTAURANT)
    .order('type_caisse');

  if (error) throw new Error(error.message);
  res.json({ data });
});

// POST /api/v1/connecteurs/:type/sync — synchronise une caisse
connecteursRouter.post('/:type/sync', async (req: Request, res: Response) => {
  const { type } = req.params;
  const types_valides = ['sumup', 'zelty', 'laddition'];

  if (!types_valides.includes(type)) {
    throw new ValidationError(`Type de caisse invalide. Valeurs : ${types_valides.join(', ')}`);
  }

  const resultat = await syncCaisse(ID_RESTAURANT, type);
  res.json({ data: resultat });
});

// PUT /api/v1/connecteurs/:type/config — met à jour la config d'une caisse
connecteursRouter.put('/:type/config', async (req: Request, res: Response) => {
  const { type } = req.params;
  const { config } = req.body;

  if (!config) throw new ValidationError('config est requise');

  const db = getSupabaseClient();
  const { data, error } = await db
    .from('connexions_caisses')
    .update({ config })
    .eq('id_restaurant', ID_RESTAURANT)
    .eq('type_caisse', type)
    .select()
    .single();

  if (error) throw new Error(error.message);
  res.json({ data });
});
