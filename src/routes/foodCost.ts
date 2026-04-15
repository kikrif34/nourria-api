import { Router, Request, Response } from 'express';
import { getFoodCostParPlat, sauvegarderSnapshot } from '../services/foodCost';
import { ValidationError } from '../middleware/errorHandler';

export const foodCostRouter = Router();

// GET /api/v1/food-cost/plats?id_restaurant=xxx
foodCostRouter.get('/plats', async (req: Request, res: Response) => {
  const { id_restaurant } = req.query;

  if (!id_restaurant || typeof id_restaurant !== 'string') {
    throw new ValidationError('id_restaurant est requis en query param');
  }

  const plats = await getFoodCostParPlat(id_restaurant);

  // Sauvegarde snapshot en arrière-plan
  sauvegarderSnapshot(plats).catch((err) =>
    console.error('[NourrIA] Erreur snapshot:', err)
  );

  res.json({ data: plats });
});
