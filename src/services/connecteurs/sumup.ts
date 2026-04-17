import { VenteNourria, ResultatSync, insererVentes } from './utils';

// ─── Mock données SumUp ───────────────────────────────────────────────────────
// Simule ce que retournerait GET /v0.1/me/receipts

function genererVentesMock(): VenteNourria[] {
  const ventes: VenteNourria[] = [];
  for (let i = 1; i <= 14; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    ventes.push(
      { date_service: dateStr, creneau: 'midi', heure_debut: '12:00', nb_couverts: Math.floor(30 + Math.random() * 30), ca_ht: Math.round((400 + Math.random() * 400) * 100) / 100 },
      { date_service: dateStr, creneau: 'soir', heure_debut: '19:00', nb_couverts: Math.floor(20 + Math.random() * 25), ca_ht: Math.round((300 + Math.random() * 300) * 100) / 100 }
    );
  }
  return ventes;
}

// ─── Vrai appel SumUp (à activer avec de vraies clés) ────────────────────────

async function fetchSumupVentes(config: any): Promise<VenteNourria[]> {
  if (!config.access_token) return [];

  const depuis = new Date();
  depuis.setDate(depuis.getDate() - 14);

  const resp = await fetch(
    `https://api.sumup.com/v0.1/me/receipts?start_date=${depuis.toISOString()}&end_date=${new Date().toISOString()}`,
    { headers: { Authorization: `Bearer ${config.access_token}` } }
  );

  if (!resp.ok) throw new Error(`SumUp API erreur : ${resp.status}`);
  const data = await resp.json() as any;

  return (data.items ?? []).map((ticket: any) => {
    const date = ticket.timestamp?.split('T')[0] ?? new Date().toISOString().split('T')[0];
    const heure = parseInt(ticket.timestamp?.split('T')[1]?.split(':')[0] ?? '12', 10);
    const creneau = heure < 16 ? 'midi' : 'soir';
    return {
      date_service: date,
      creneau,
      heure_debut: creneau === 'midi' ? '12:00' : '19:00',
      nb_couverts: 1,
      ca_ht: Math.round((ticket.amount ?? 0) / 1.1 * 100) / 100,
    };
  });
}

// ─── Service principal ────────────────────────────────────────────────────────

export async function syncSumup(config: any, id_restaurant: string): Promise<ResultatSync> {
  const useMock = !config.access_token;

  const ventes = useMock ? genererVentesMock() : await fetchSumupVentes(config);
  const nb = await insererVentes(ventes, id_restaurant);

  return {
    type_caisse: 'sumup',
    nb_ventes: nb,
    periode: '14 derniers jours',
    statut: useMock ? 'mock' : 'ok',
    message: useMock
      ? 'Mode demonstration — connectez votre compte SumUp pour synchroniser vos vraies ventes'
      : `${nb} jours de ventes synchronises depuis SumUp`,
  };
}
