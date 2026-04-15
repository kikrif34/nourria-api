import { mockFrom } from './mocks';
import { getFoodCostParPlat } from '../services/foodCost';

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
      { quantite: 1,     unite: 'piece', ingredients: { id_ingredient: '2', nom: 'Pain burger', cout_unitaire: 0.35,  unite: 'piece' } },
      { quantite: 0.050, unite: 'kg', ingredients: { id_ingredient: '3', nom: 'Salade',      cout_unitaire: 2.80,  unite: 'kg' } },
    ],
  },
  {
    id_plat: '20000000-0000-0000-0000-000000000002',
    nom: 'Salade Cesar',
    categorie: 'Entree',
    prix_vente: 9.50,
    actif: true,
    recettes: [],
  },
];

describe('getFoodCostParPlat', () => {
  beforeEach(() => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: PLATS_MOCK, error: null }),
    });
  });

  it('calcule correctement le food cost du Burger maison', async () => {
    const plats = await getFoodCostParPlat(ID_RESTAURANT);
    const burger = plats.find((p) => p.nom_plat === 'Burger maison');

    expect(burger).toBeDefined();
    // 0.18*18.5 + 1*0.35 + 0.05*2.80 = 3.33 + 0.35 + 0.14 = 3.82
    expect(burger!.cout_total).toBe(3.82);
    expect(burger!.marge_euro).toBe(10.68);
    expect(burger!.marge_pct).toBe(73.7);
    expect(burger!.alerte).toBe(false);
  });

  it('retourne marge 100% pour un plat sans recette', async () => {
    const plats = await getFoodCostParPlat(ID_RESTAURANT);
    const salade = plats.find((p) => p.nom_plat === 'Salade Cesar');

    expect(salade).toBeDefined();
    expect(salade!.cout_total).toBe(0);
    expect(salade!.marge_pct).toBe(100);
    expect(salade!.ingredients).toHaveLength(0);
  });

  it('trie les plats par marge croissante', async () => {
    const plats = await getFoodCostParPlat(ID_RESTAURANT);
    expect(plats[0].marge_pct).toBeLessThanOrEqual(plats[1].marge_pct);
  });

  it('déclenche une alerte si food cost dépasse le seuil', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [{
          ...PLATS_MOCK[0],
          prix_vente: 5.00, // Prix très bas = food cost élevé
        }],
        error: null,
      }),
    });

    const plats = await getFoodCostParPlat(ID_RESTAURANT, 32);
    expect(plats[0].alerte).toBe(true);
  });

  it('lève une erreur si Supabase échoue', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Connexion impossible' } }),
    });

    await expect(getFoodCostParPlat(ID_RESTAURANT)).rejects.toThrow('Connexion impossible');
  });
});
