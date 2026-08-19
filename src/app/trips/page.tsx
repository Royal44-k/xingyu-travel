import { SiteHeader } from '@/components/site-header';
import { TripCollection } from '@/features/trips/trip-collection';

export default function TripsPage() {
  return (
    <>
      <SiteHeader activePath="/trips" variant="solid" />
      <TripCollection />
    </>
  );
}
