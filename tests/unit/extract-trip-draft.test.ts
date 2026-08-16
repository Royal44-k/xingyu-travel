import { describe, expect, it } from 'vitest';
import { orderPosts, posts, postsBySlug } from '@/data/posts';
import { extractTripDraft } from '@/domain/trips/extract-draft';

describe('extractTripDraft', () => {
  it('extracts a reviewable itinerary draft from a guide', () => {
    const draft = extractTripDraft(postsBySlug['dali-slow-5d']);

    expect(draft).toMatchObject({ destination: '大理', days: 5, budget: 5200 });
    expect(draft.items).toHaveLength(5);
    expect(draft.items.map((item) => item.id)).toEqual([
      'dali-slow-5d-1',
      'dali-slow-5d-2',
      'dali-slow-5d-3',
      'dali-slow-5d-4',
      'dali-slow-5d-5',
    ]);
    expect(draft.status).toBe('review');
  });

  it('orders recommended posts by active interests rather than timestamp alone', () => {
    const chronological = orderPosts('chronological').map((post) => post.slug);
    const recommended = orderPosts('recommended', ['自驾']).map((post) => post.slug);

    expect(chronological).toEqual([
      'dali-slow-5d',
      'sichuan-autumn-road',
      'guilin-river-morning',
      'rainy-mountain-notes',
    ]);
    expect(recommended).toEqual([
      'sichuan-autumn-road',
      'rainy-mountain-notes',
      'dali-slow-5d',
      'guilin-river-morning',
    ]);
  });

  it('keeps every published guide convertible for each declared day', () => {
    for (const post of posts) {
      expect(post.itinerary).toHaveLength(post.days);
      expect(extractTripDraft(post).items).toHaveLength(post.days);
    }
  });
});
