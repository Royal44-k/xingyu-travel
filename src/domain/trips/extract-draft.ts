import type { ItineraryItem, TravelPost } from '@/data/posts';

export interface TripDraft {
  id: string;
  destination: string;
  days: number;
  budget: number;
  items: Array<ItineraryItem & { id: string }>;
  sourcePostSlug: string;
  status: 'review';
}

export function extractTripDraft(post: TravelPost): TripDraft {
  return {
    id: `draft-${post.slug}`,
    destination: post.destination,
    days: post.days,
    budget: post.budget,
    items: post.itinerary.map((item, index) => ({ ...item, id: `${post.slug}-${index + 1}` })),
    sourcePostSlug: post.slug,
    status: 'review',
  };
}
