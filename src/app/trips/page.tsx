import { SiteHeader } from '@/components/site-header';
import { TripCollection } from '@/features/trips/trip-collection';

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string | string[] }>;
}) {
  const intent = (await searchParams).intent === 'guardian' ? 'guardian' : undefined;
  return (
    <>
      <SiteHeader activePath="/trips" variant="solid" />
      <TripCollection intent={intent} />
    </>
  );
}
