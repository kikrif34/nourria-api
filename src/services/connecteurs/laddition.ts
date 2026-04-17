import { VenteNourria, ResultatSync, insererVentes } from './utils';

function genererVentesMock(): VenteNourria[] {
  const ventes: VenteNourria[] = [];
  for (let i = 1; i <= 14; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    ventes.push(
      { date_service: dateStr, creneau: 'midi', heure_debut: '12:00', nb_couverts: Math.floor(40 + Math.random() * 30), ca_ht: Math.round((500 + Math.random() * 400) * 100) / 100 },
      { date_service: dateStr, creneau: 'soir', heure_debut: '19:00', nb_couverts: Math.floor(30 + Math.random() * 25), ca_ht: Math.round((400 + Math.random() * 300) * 100) / 100 }
    );
  }
  return ventes;
}

async function fetchLadditionVentes(config: any): Promise<VenteNourria[]> {
  if (!config.api_key) return [];

  const depuis = new Date();
  depuis.setDate(depuis.getDate() - 14);

  const resp = await fetch(
    `https://api.laddition.com/api/tickets?date_from=${depuis.toISOString().split('T')[0]}&date_to=${new Date().toISOString().split('T')[0]}`,
    { headers: { 'X-Api-Key': config.api_key, 'Content-Type': 'application/json' } }
  );

  if (!resp.ok) throw new Error(`L'Addition API erreur : ${resp.status}`);
  const data = await resp.json() as any;

  const ventesMap = new Map<string, { nb_couverts: number; ca_ht: number }>();

  for (const ticket of data.tickets ?? []) {
    const date = ticket.opened_at?.split('T')[0];
    const heure = parseInt(ticket.opened_at?.split('T')[1]?.split(':')[0] ?? '12', 10);
    const creneau = heure < 16 ? 'midi' : 'soir';
    const cle = `${date}__${creneau}`;
    const existing = ventesMap.get(cle);
    if (existing) {
      existing.nb_couverts += ticket.covers ?? 1;
      existing.ca_ht += ticket.total_ht ?? 0;
    } else {
      ventesMap.set(cle, { nb_couverts: ticket.covers ?? 1, ca_ht: ticket.total_ht ?? 0 });
    }
  }

  return Array.from(ventesMap.entries()).map(([cle, v]) => {
    const [date_service, creneau] = cle.split('__');
    return {
      date_service,
      creneau: creneau as 'midi' | 'soir',
      heure_debut: creneau === 'midi' ? '12:00' : '19:00',
      nb_couverts: Math.round(v.nb_couverts),
      ca_ht: Math.round(v.ca_ht * 100) / 100,
    };
  });
}

export async function syncLaddition(config: any, id_restaurant: string): Promise<ResultatSync> {
  const useMock = !config.api_key;
  const ventes = useMock ? genererVentesMock() : await fetchLadditionVentes(config);
  const nb = await insererVentes(ventes, id_restaurant);

  return {
    type_caisse: 'laddition',
    nb_ventes: nb,
    periode: '14 derniers jours',
    statut: useMock ? 'mock' : 'ok',
    message: useMock
      ? "Mode demonstration — connectez votre compte L'Addition pour synchroniser vos vraies ventes"
      : `${nb} jours de ventes synchronises depuis L'Addition`,
  };
}
