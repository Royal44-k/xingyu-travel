'use client';

import { MapPin, ShieldCheck } from '@phosphor-icons/react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import Image from 'next/image';
import { brandAssets } from '@/data/assets';
import { SearchComposer } from './search-composer';
import styles from './hero.module.css';

export function Hero() {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const imageY = useTransform(scrollY, [0, 820], [0, 44]);

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <motion.div
        className={styles.imageLayer}
        style={reduceMotion ? undefined : { y: imageY }}
      >
        <Image
          alt={brandAssets.hero.alt}
          className={styles.image}
          fill
          priority
          sizes="100vw"
          src={brandAssets.hero.src}
        />
      </motion.div>
      <div className={styles.scrim} aria-hidden />

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className={styles.copy}
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        transition={{ duration: reduceMotion ? 0 : 0.8, ease: 'easeOut' }}
      >
        <p className={styles.eyebrow}>XINGYU · TRAVEL WITH CLARITY</p>
        <h1 id="hero-title">
          把远方，<br />
          变成一段安心抵达的旅程
        </h1>
        <p className={styles.description}>
          真实比价，严选资源，行程守护
          <br />
          每一步，都有可靠的答案
        </p>
      </motion.div>

      <div className={styles.route} aria-label="目的地路径：大理至丽江">
        <MapPin aria-hidden size={19} weight="light" />
        <span>大理</span>
        <span className={styles.routeRule} aria-hidden />
        <span>
          下一站 <strong>丽江</strong>
        </span>
      </div>

      <div className={styles.searchArea}>
        <SearchComposer />
        <p className={styles.trustLine}>
          <ShieldCheck aria-hidden size={18} weight="light" />
          含税总价 · 条件可比 · 数据更新时间可见
        </p>
      </div>
    </section>
  );
}
