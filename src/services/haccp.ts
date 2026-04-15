import { getSupabaseClient } from '../utils/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReleveHaccp = {
  id_releve: string;
  zone: string;
  temperature: number;
  temperature_min: number;
  temperature_max: number;
  conforme: boolean;
  note: string | null;
  releve_le: string;
};

export type BilanHaccp = {
  date: string;
  nb_releves: number;
  nb_conformes: number;
  nb_non_conformes: number;
  taux_conformite: number;
  releves: ReleveHaccp[];
};

// ─── Créer un relevé ──────────────────────────────────────────────────────────

export async function creerReleve(
  id_restaurant: string,
  zone: string,
  temperature: number,
  temperature_min: number,
  temperature_max: number,
  note?: string
): Promise<ReleveHaccp> {
  const db = getSupabaseClient();

  const { data, error } = await db
    .from('relevés_haccp')
    .insert({
      id_restaurant,
      zone,
      temperature,
      temperature_min,
      temperature_max,
      note: note ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`[Supabase HACCP] ${error.message}`);

  console.log(
    `[AdminIA] Relevé HACCP — ${zone} — ${temperature}°C — ` +
    `${data.conforme ? 'CONFORME' : 'NON CONFORME'}`
  );

  return data as ReleveHaccp;
}

// ─── Bilan du jour ────────────────────────────────────────────────────────────

export async function getBilanHaccp(
  id_restaurant: string,
  date?: string
): Promise<BilanHaccp> {
  const db = getSupabaseClient();

  const date_cible = date ?? new Date().toISOString().split('T')[0];
  const debut = `${date_cible}T00:00:00.000Z`;
  const fin   = `${date_cible}T23:59:59.999Z`;

  const { data, error } = await db
    .from('relevés_haccp')
    .select('*')
    .eq('id_restaurant', id_restaurant)
    .gte('releve_le', debut)
    .lte('releve_le', fin)
    .order('releve_le', { ascending: true });

  if (error) throw new Error(`[Supabase HACCP] ${error.message}`);

  const releves = (data ?? []) as ReleveHaccp[];
  const nb_conformes = releves.filter((r) => r.conforme).length;

  return {
    date: date_cible,
    nb_releves: releves.length,
    nb_conformes,
    nb_non_conformes: releves.length - nb_conformes,
    taux_conformite: releves.length > 0
      ? Math.round((nb_conformes / releves.length) * 100)
      : 0,
    releves,
  };
}

// ─── Historique 30 jours ──────────────────────────────────────────────────────

export async function getHistoriqueHaccp(
  id_restaurant: string,
  nb_jours: number = 30
): Promise<{ date: string; taux_conformite: number; nb_releves: number }[]> {
  const db = getSupabaseClient();

  const depuis = new Date(Date.now() - nb_jours * 86400000)
    .toISOString()
    .split('T')[0];

  const { data, error } = await db
    .from('relevés_haccp')
    .select('releve_le, conforme')
    .eq('id_restaurant', id_restaurant)
    .gte('releve_le', depuis)
    .order('releve_le', { ascending: true });

  if (error) throw new Error(`[Supabase HACCP] ${error.message}`);

  // Groupe par date
  const par_date: Record<string, { total: number; conformes: number }> = {};
  for (const r of data ?? []) {
    const date = r.releve_le.split('T')[0];
    if (!par_date[date]) par_date[date] = { total: 0, conformes: 0 };
    par_date[date].total++;
    if (r.conforme) par_date[date].conformes++;
  }

  return Object.entries(par_date).map(([date, stats]) => ({
    date,
    taux_conformite: Math.round((stats.conformes / stats.total) * 100),
    nb_releves: stats.total,
  }));
}
