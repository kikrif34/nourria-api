import { callClaude, parseClaudeJson } from '../utils/claude';
import { getFoodCostParPlat } from './foodCost';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlatImpacte = {
  nom_plat: string;
  marge_actuelle_pct: number;
  marge_simulee_pct: number;
  impact_euros_semaine: number;
};

export type ResultatSimulation = {
  reponse: string;
  plats_impactes: PlatImpacte[];
};

// ─── Simulateur ───────────────────────────────────────────────────────────────

export async function simuler(
  id_restaurant: string,
  question: string
): Promise<ResultatSimulation> {
  const plats = await getFoodCostParPlat(id_restaurant);

  const contexte = plats.map((p) => ({
    nom: p.nom_plat,
    prix_vente: p.prix_vente,
    cout_total: p.cout_total,
    marge_pct: p.marge_pct,
    ingredients: p.ingredients.map((i) => ({
      nom: i.nom_ingredient,
      quantite: i.quantite,
      unite: i.unite,
      cout_unitaire: i.cout_unitaire,
    })),
  }));

  const system_prompt = `Tu es l'assistant financier d'un restaurant.
Tu analyses les données de la carte et tu réponds aux questions "et si ?"
du responsable de façon concise et chiffrée.

Tu réponds UNIQUEMENT en JSON valide sans markdown ni backticks.
Format exact :
{
  "reponse": "explication concise en français avec chiffres",
  "plats_impactes": [
    {
      "nom_plat": "string",
      "marge_actuelle_pct": number,
      "marge_simulee_pct": number,
      "impact_euros_semaine": number
    }
  ]
}

Si aucun plat n'est impacté, retourne "plats_impactes": [].
Base tes calculs sur une moyenne de 50 couverts par semaine par plat.`;

  const user_prompt = `Données actuelles de la carte :
${JSON.stringify(contexte, null, 2)}

Question du responsable : ${question}`;

  const reponse = await callClaude(system_prompt, user_prompt, 1000);
  const resultat = parseClaudeJson<ResultatSimulation>(reponse.content);

  console.log(
    `[SimulateurIA] Question traitée — ` +
    `${reponse.durationMs}ms — ` +
    `${reponse.inputTokens + reponse.outputTokens} tokens`
  );

  return resultat;
}
