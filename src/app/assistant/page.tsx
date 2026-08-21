import { SiteHeader } from '@/components/site-header';
import { AssistantClient } from '@/features/assistant/assistant-client';

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ tripId?: string | string[] }>;
}) {
  const params = await searchParams;
  const tripId = Array.isArray(params.tripId) ? params.tripId[0] : params.tripId;
  const safeTripId = tripId?.trim().slice(0, 120) || undefined;

  return <><SiteHeader activePath="/assistant" variant="solid" /><AssistantClient tripId={safeTripId} /></>;
}
