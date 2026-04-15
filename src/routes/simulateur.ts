import { Router, Request, Response } from 'express';
import { simuler } from '../services/simulateur';
import { ValidationError } from '../middleware/errorHandler';

export const simulateurRouter = Router();

simulateurRouter.post('/', async (req: Request, res: Response) => {
  const { id_restaurant, question } = req.body;

  if (!id_restaurant) {
    throw new ValidationError('id_restaurant est requis');
  }
  if (!question || typeof question !== 'string' || question.trim().length < 5) {
    throw new ValidationError('question est requise (minimum 5 caracteres)');
  }

  const resultat = await simuler(id_restaurant, question.trim());

  res.json({ data: resultat });
});
