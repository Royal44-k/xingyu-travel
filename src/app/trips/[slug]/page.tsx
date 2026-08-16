import { SiteHeader } from '@/components/site-header';
import { TripWorkbench } from '@/features/trips/trip-workbench';

export default async function TripPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <>
      <SiteHeader />
      <TripWorkbench slug={slug} />
    </>
  );
}
