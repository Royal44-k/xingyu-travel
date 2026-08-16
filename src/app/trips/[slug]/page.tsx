import { SiteHeader } from '@/components/site-header';
import { TripDraftHandoff } from '@/features/trips/trip-draft-handoff';

export default async function TripDraftPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <>
      <SiteHeader />
      <TripDraftHandoff slug={slug} />
    </>
  );
}
