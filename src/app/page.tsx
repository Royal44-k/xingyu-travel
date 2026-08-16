import { SiteHeader } from '@/components/site-header';
import { FeaturedDestinations } from '@/features/home/featured-destinations';
import { Hero } from '@/features/home/hero';

export default function HomePage() {
  return (
    <main>
      <SiteHeader activePath="/" />
      <Hero />
      <FeaturedDestinations />
    </main>
  );
}
