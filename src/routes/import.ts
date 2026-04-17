import { Router, Request, Response } from 'express';
import { importerCSV } from '../services/importCsv';
import { ValidationError } from '../middleware/errorHandler';

export const importRouter = Router();

const ID_RESTAURANT = '00000000-0000-0000-0000-000000000001';

// POST /api/v1/import/csv
// Body : { contenu: string (contenu du fichier CSV en texte) }
importRouter.post('/csv', async (req: Request, res: Response) => {
  const { contenu } = req.body;

  if (!contenu || typeof contenu !== 'string') {
    throw new ValidationError('contenu est requis (texte CSV)');
  }

  if (contenu.length > 5 * 1024 * 1024) {
    throw new ValidationError('Fichier trop grand — maximum 5 Mo');
  }

  const resultat = await importerCSV(contenu, ID_RESTAURANT);
  res.json({ data: resultat });
});
