import { Request, Response, NextFunction } from 'express';

export class NourrIAError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'NourrIAError';
  }
}

export class ValidationError extends NourrIAError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
  }
}

export class AIExtractionError extends NourrIAError {
  constructor(reason: 'image_quality' | 'not_a_invoice' | 'parse_failed' | 'timeout') {
    const messages = {
      image_quality: 'Photo trop floue — réessayez en meilleure lumière',
      not_a_invoice: "Cette image ne semble pas être une facture fournisseur",
      parse_failed: 'Saisie manuelle requise pour cette facture',
      timeout: 'Traitement en cours — vous serez notifié',
    };
    super('AI_EXTRACTION_ERROR', messages[reason], 422);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof NourrIAError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }
  console.error('[NourrIA] Erreur non gérée :', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'Une erreur interne est survenue'
        : err.message,
    },
  });
}
