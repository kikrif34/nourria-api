import { Router, Request, Response } from 'express';
import { getPrevisions } from '../services/previsions';
import { getTableauBordOps } from '../services/stocks';
import { ValidationError } from '../middleware/errorHandler';

export const opsRouter = Router();

// GET /api/v1/ops/previsions?id_restaurant=xxx&nb_jours=7
opsRouter.get('/previsions', async (req: Request, res: Response) => {
  const { id_restaurant, nb_jours } = req.query;

  if (!id_restaurant || typeof id_restaurant !== 'string') {
    throw new ValidationError('id_restaurant est requis');
  }

  const jours = nb_jours ? parseInt(nb_jours as string, 10) : 7;
  const previsions = await getPrevisions(id_restaurant, jours);

  res.json({ data: previsions });
});

// GET /api/v1/ops/stocks?id_restaurant=xxx
opsRouter.get('/stocks', async (req: Request, res: Response) => {
  const { id_restaurant } = req.query;

  if (!id_restaurant || typeof id_restaurant !== 'string') {
    throw new ValidationError('id_restaurant est requis');
  }

  const tableau_bord = await getTableauBordOps(id_restaurant);

  res.json({ data: tableau_bord });
});
