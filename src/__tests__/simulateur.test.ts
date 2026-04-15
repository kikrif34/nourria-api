import { mockFrom, mockCallClaude, mockParseClaudeJson } from './mocks';
import { simuler } from '../services/simulateur';

const ID_RESTAURANT = '00000000-0000-0000-0000-000000000001';

const PLATS_MOCK = [
  {
    id_plat: '20000000-0000-0000-0000-000000000001',
    nom: 'Burger maison',
    categorie: 'Plat',
    prix_vente: 14.50,
    actif: true,
    recettes: [
      { quantite: 0.180, unite: 'kg', ingredients: { id_ingredient: '1', nom: 'Boeuf hache', cout_unitaire: 18.50, unite: 'kg' } },
    ],
  },
];

const RESULTAT_IA_MOCK = {
  reponse: 'Le Burger maison passerait de 73.7% à 65.2% de marge. Impact : -31.50€/semaine.',
  plats_impactes: [
    {
      nom_plat: 'Burger maison',
      marge_actuelle_pct: 73.7,
      marge_simulee_pct: 65.2,
      impact_euros_semaine: -31.5,
    },
  ],
};

describe('simuler', () => {
  beforeEach(() => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: PLATS_MOCK, error: null }),
    });

    mockCallClaude.mockResolvedValue({
      content: JSON.stringify(RESULTAT_IA_MOCK),
      inputTokens: 500,
      outputTokens: 200,
      durationMs: 1200,
    });

    mockParseClaudeJson.mockReturnValue(RESULTAT_IA_MOCK);
  });

  it('retourne une réponse chiffrée avec plats impactés', async () => {
    const resultat = await simuler(ID_RESTAURANT, 'Et si je passe le boeuf a 22 euros ?');

    expect(resultat.reponse).toContain('Burger maison');
    expect(resultat.plats_impactes).toHaveLength(1);
    expect(resultat.plats_impactes[0].impact_euros_semaine).toBe(-31.5);
  });

  it('appelle Claude avec le contexte du restaurant', async () => {
    await simuler(ID_RESTAURANT, 'Et si je passe le boeuf a 22 euros ?');

    expect(mockCallClaude).toHaveBeenCalledTimes(1);
    const [systemPrompt, userPrompt] = mockCallClaude.mock.calls[0];
    expect(systemPrompt).toContain('assistant financier');
    expect(userPrompt).toContain('Burger maison');
  });

  it('retourne plats_impactes vide si aucun impact', async () => {
    const resultat_vide = { reponse: 'Aucun impact sur la carte.', plats_impactes: [] };
    mockParseClaudeJson.mockReturnValue(resultat_vide);

    const resultat = await simuler(ID_RESTAURANT, 'Et si je change la musique ?');

    expect(resultat.plats_impactes).toHaveLength(0);
  });

  it('lève une erreur si Claude ne répond pas', async () => {
    mockCallClaude.mockRejectedValue(new Error('Timeout API'));

    await expect(
      simuler(ID_RESTAURANT, 'Et si je passe le boeuf a 22 euros ?')
    ).rejects.toThrow('Timeout API');
  });
});
