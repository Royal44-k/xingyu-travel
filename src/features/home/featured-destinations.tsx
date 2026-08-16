'use client';

import { ArrowRight } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { brandAssets } from '@/data/assets';
import styles from './featured-destinations.module.css';

const destinations = [
  {
    title: '川西秘境',
    description: '雪山湖泊，秋色铺满高原',
    image: brandAssets.sichuan,
    href: '/compare?kind=ticket&destination=%E5%B7%9D%E8%A5%BF&from=2026-09-18&to=2026-09-24&travelers=2',
  },
  {
    title: '桂林山水',
    description: '江作青罗带，山如碧玉簪',
    image: brandAssets.guilin,
    href: '/compare?kind=ticket&destination=%E6%A1%82%E6%9E%97&from=2026-10-02&to=2026-10-06&travelers=2',
  },
] as const;

export function FeaturedDestinations() {
  const reduceMotion = useReducedMotion();

  return (
    <section className={styles.section} aria-labelledby="featured-title">
      <div className={styles.intro}>
        <p>SEASONAL EDIT</p>
        <h2 id="featured-title">今秋值得出发的地方</h2>
        <span>在山海之间，遇见更辽阔的自己</span>
      </div>

      <div className={styles.destinations}>
        {destinations.map((destination) => (
          <motion.article
            className={styles.card}
            key={destination.title}
            whileHover={reduceMotion ? undefined : { y: -8 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
          >
            <Image
              alt={destination.image.alt}
              className={styles.destinationImage}
              fill
              sizes="(max-width: 760px) 100vw, 38vw"
              src={destination.image.src}
            />
            <div className={styles.cardScrim} aria-hidden />
            <div className={styles.cardCopy}>
              <h3>{destination.title}</h3>
              <p>{destination.description}</p>
              <Link href={destination.href} aria-label={`探索${destination.title}`}>
                <ArrowRight aria-hidden size={25} weight="light" />
              </Link>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
