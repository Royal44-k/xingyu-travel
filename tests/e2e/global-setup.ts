const baseUrl = 'http://127.0.0.1:4173';

export default async function globalSetup() {
  const input = {
    destination: '大理',
    kind: 'flight',
    from: '2026-08-22',
    to: '2026-08-27',
    travelers: 2,
  };

  const create = await fetch(`${baseUrl}/api/v1/comparison/searches`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (create.status !== 202) {
    throw new Error(`comparison API warm-up failed with ${create.status}`);
  }

  const { search_id: searchId } = (await create.json()) as { search_id: string };
  const events = await fetch(`${baseUrl}/api/v1/comparison/searches/${searchId}/events`);
  if (!events.ok) {
    throw new Error(`comparison SSE warm-up failed with ${events.status}`);
  }
  await events.text();
}
