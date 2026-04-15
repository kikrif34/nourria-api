import { mockFrom } from './mocks';
import { creerReleve, getBilanHaccp } from '../services/haccp';

const ID_RESTAURANT = '00000000-0000-0000-0000-000000000001';

describe('creerReleve', () => {
  it('crée un relevé conforme', async () => {
    const releve_mock = {
      id_releve: 'uuid-1',
      id_restaurant: ID_RESTAURANT,
      zone: 'Chambre froide 1',
      temperature: 3.2,
      temperature_min: -2,
      temperature_max: 4,
      conforme: true,
      note: null,
      releve_le: new Date().toISOString(),
    };

    mockFrom.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: releve_mock, error: null }),
    });

    const releve = await creerReleve(ID_RESTAURANT, 'Chambre froide 1', 3.2, -2, 4);

    expect(releve.conforme).toBe(true);
    expect(releve.zone).toBe('Chambre froide 1');
    expect(releve.temperature).toBe(3.2);
  });

  it('crée un relevé non conforme si température hors plage', async () => {
    const releve_mock = {
      id_releve: 'uuid-2',
      id_restaurant: ID_RESTAURANT,
      zone: 'Frigo legumes',
      temperature: 12.0,
      temperature_min: 0,
      temperature_max: 6,
      conforme: false,
      note: 'Alarme déclenchée',
      releve_le: new Date().toISOString(),
    };

    mockFrom.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: releve_mock, error: null }),
    });

    const releve = await creerReleve(ID_RESTAURANT, 'Frigo legumes', 12.0, 0, 6, 'Alarme déclenchée');

    expect(releve.conforme).toBe(false);
    expect(releve.note).toBe('Alarme déclenchée');
  });

  it('lève une erreur si Supabase échoue', async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Erreur insert' } }),
    });

    await expect(
      creerReleve(ID_RESTAURANT, 'Zone test', 5.0, 0, 8)
    ).rejects.toThrow('Erreur insert');
  });
});

describe('getBilanHaccp', () => {
  const RELEVES_MOCK = [
    { id_releve: '1', zone: 'CF1', temperature: 3.2, temperature_min: -2, temperature_max: 4, conforme: true,  note: null, releve_le: new Date().toISOString() },
    { id_releve: '2', zone: 'CF2', temperature: 4.1, temperature_min: 0,  temperature_max: 6, conforme: true,  note: null, releve_le: new Date().toISOString() },
    { id_releve: '3', zone: 'CF3', temperature: 9.5, temperature_min: 0,  temperature_max: 8, conforme: false, note: null, releve_le: new Date().toISOString() },
  ];

  beforeEach(() => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: RELEVES_MOCK, error: null }),
    });
  });

  it('calcule correctement le taux de conformité', async () => {
    const bilan = await getBilanHaccp(ID_RESTAURANT);

    expect(bilan.nb_releves).toBe(3);
    expect(bilan.nb_conformes).toBe(2);
    expect(bilan.nb_non_conformes).toBe(1);
    expect(bilan.taux_conformite).toBe(67);
  });

  it('retourne taux 0 si aucun relevé', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    });

    const bilan = await getBilanHaccp(ID_RESTAURANT);

    expect(bilan.nb_releves).toBe(0);
    expect(bilan.taux_conformite).toBe(0);
  });
});
