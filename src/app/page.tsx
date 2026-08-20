import { SiteHeader } from '@/components/site-header';
import { FeaturedDestinations } from '@/features/home/featured-destinations';
import { Hero } from '@/features/home/hero';
import { HomeStorySections } from '@/features/home/home-story-sections';

export default function HomePage() {
  return (
    <>
      <SiteHeader activePath="/" />
      <main className="homePage">
        <Hero />
        <FeaturedDestinations />
        <HomeStorySections />
      </main>
    </>
  );
}
