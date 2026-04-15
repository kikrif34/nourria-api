import { Router, Request, Response } from 'express';
import { creerReleve, getBilanHaccp, getHistoriqueHaccp } from '../services/haccp';
import { genererPlanning } from '../services/planning';
import { ValidationError } from '../middleware/errorHandler';

export const adminRouter = Router();

// POST /api/v1/admin/haccp
adminRouter.post('/haccp', async (req: Request, res: Response) => {
  const { id_restaurant, zone, temperature, temperature_min, temperature_max, note } = req.body;

  if (!id_restaurant) throw new ValidationError('id_restaurant est requis');
  if (!zone) throw new ValidationError('zone est requise');
  if (temperature === undefined) throw new ValidationError('temperature est requise');

  const releve = await creerReleve(
    id_restaurant,
    zone,
    parseFloat(temperature),
    parseFloat(temperature_min ?? -5),
    parseFloat(temperature_max ?? 8),
    note
  );

  res.status(201).json({ data: releve });
});

// GET /api/v1/admin/haccp/bilan?id_restaurant=xxx&date=2026-04-14
adminRouter.get('/haccp/bilan', async (req: Request, res: Response) => {
  const { id_restaurant, date } = req.query;

  if (!id_restaurant || typeof id_restaurant !== 'string') {
    throw new ValidationError('id_restaurant est requis');
  }

  const bilan = await getBilanHaccp(id_restaurant, date as string | undefined);
  res.json({ data: bilan });
});

// GET /api/v1/admin/haccp/historique?id_restaurant=xxx
adminRouter.get('/haccp/historique', async (req: Request, res: Response) => {
  const { id_restaurant } = req.query;

  if (!id_restaurant || typeof id_restaurant !== 'string') {
    throw new ValidationError('id_restaurant est requis');
  }

  const historique = await getHistoriqueHaccp(id_restaurant);
  res.json({ data: historique });
});

// POST /api/v1/admin/planning/generer
adminRouter.post('/planning/generer', async (req: Request, res: Response) => {
  const { id_restaurant, semaine, annee } = req.body;

  if (!id_restaurant) throw new ValidationError('id_restaurant est requis');

  const planning = await genererPlanning(
    id_restaurant,
    semaine ? parseInt(semaine, 10) : undefined,
    annee   ? parseInt(annee, 10)   : undefined
  );

  res.status(201).json({ data: planning });
});
