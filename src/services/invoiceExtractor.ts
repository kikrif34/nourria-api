import { callClaudeVision, parseClaudeJson, ImageInput } from '../utils/claude';
import { AIExtractionError } from '../middleware/errorHandler';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvoiceLine = {
  description: string;
  quantity: number;
  unit: string;
  unit_price_ht: number;
  tva_rate: number;
  line_total_ht: number;
};

export type ExtractedInvoice = {
  supplier_name: string;
  invoice_date: string | null;      // format YYYY-MM-DD
  invoice_number: string | null;
  total_ht: number;
  total_tva: number;
  currency: string;
  lines: InvoiceLine[];
};

// ─── Prompts ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un assistant spécialisé dans l'extraction de données
de factures fournisseurs pour restaurants. Tu réponds UNIQUEMENT en JSON valide,
sans aucun texte avant ou après. Aucun markdown, aucun bloc json.
Si tu ne peux pas lire une valeur, utilise null.
Si l'image n'est pas une facture, retourne {"error":"not_a_invoice"}.
Si l'image est illisible, retourne {"error":"image_quality"}.`;

const USER_PROMPT = `Extrais toutes les données de cette facture fournisseur.
Retourne ce JSON exact :
{
  "supplier_name": "string",
  "invoice_date": "YYYY-MM-DD ou null",
  "invoice_number": "string ou null",
  "total_ht": number,
  "total_tva": number,
  "currency": "EUR",
  "lines": [
    {
      "description": "string",
      "quantity": number,
      "unit": "kg | L | piece | carton | ...",
      "unit_price_ht": number,
      "tva_rate": number,
      "line_total_ht": number
    }
  ]
}`;

// ─── Service ──────────────────────────────────────────────────────────────────

export async function extractInvoice(
  image: ImageInput
): Promise<ExtractedInvoice> {
  const response = await callClaudeVision(
    SYSTEM_PROMPT,
    USER_PROMPT,
    image,
    1000
  );

  // Parse la réponse JSON
  const parsed = parseClaudeJson<{ error?: string } & ExtractedInvoice>(
    response.content
  );

  // Gestion des erreurs remontées par Claude
  if (parsed.error === 'not_a_invoice') {
    throw new AIExtractionError('not_a_invoice');
  }
  if (parsed.error === 'image_quality') {
    throw new AIExtractionError('image_quality');
  }

  // Validation minimale
  if (!parsed.supplier_name || !Array.isArray(parsed.lines)) {
    throw new AIExtractionError('parse_failed');
  }

  console.log(
    `[MargeIA] Facture extraite — ${parsed.supplier_name} — ` +
    `${parsed.lines.length} lignes — ` +
    `${response.durationMs}ms — ` +
    `${response.inputTokens + response.outputTokens} tokens`
  );

  return parsed;
}
