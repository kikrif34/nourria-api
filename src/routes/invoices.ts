import { Router, Request, Response } from 'express';
import { extractInvoice } from '../services/invoiceExtractor';
import { ValidationError } from '../middleware/errorHandler';
import { ImageInput } from '../utils/claude';

export const invoiceRouter = Router();

// POST /api/v1/invoices/extract
// Body : { image_base64: string, image_mime_type: string }
invoiceRouter.post('/extract', async (req: Request, res: Response) => {
  const { image_base64, image_mime_type } = req.body;

  // Validation
  if (!image_base64) {
    throw new ValidationError('image_base64 est requis');
  }
  if (!image_mime_type) {
    throw new ValidationError('image_mime_type est requis');
  }
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(image_mime_type)) {
    throw new ValidationError(
      `image_mime_type doit être : ${allowedTypes.join(', ')}`
    );
  }

  // Vérification taille (base64 ~1.33x la taille réelle)
  const estimatedBytes = (image_base64.length * 3) / 4;
  const maxBytes = 1.5 * 1024 * 1024; // 1.5 Mo
  if (estimatedBytes > maxBytes) {
    throw new ValidationError('Image trop grande — maximum 1.5 Mo');
  }

  const image: ImageInput = {
    base64: image_base64,
    mimeType: image_mime_type as ImageInput['mimeType'],
  };

  const extracted = await extractInvoice(image);

  res.status(200).json({
    data: {
      status: 'pending_validation',
      extracted,
    },
  });
});
