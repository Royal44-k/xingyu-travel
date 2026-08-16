'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './site-header.module.css';

const primaryLinks = [
  { href: '/', label: '首页' },
  { href: '/compare', label: '真实比价' },
  { href: '/square', label: '灵感广场' },
  { href: '/partners', label: '寻找搭子' },
  { href: '/guardian/demo', label: '行程守护' },
] as const;

type SiteHeaderProps = {
  activePath?: string;
};

export function SiteHeader({ activePath = '/' }: SiteHeaderProps) {
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const updateHeader = () => setHasScrolled(window.scrollY > 48);
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
    return () => window.removeEventListener('scroll', updateHeader);
  }, []);

  return (
    <header
      className={styles.header}
      data-scrolled={hasScrolled ? 'true' : 'false'}
    >
      <div className={styles.inner}>
        <Link className={styles.brand} href="/" aria-label="行屿 XINGYU">
          <span className={styles.brandChinese}>行屿</span>
          <span className={styles.brandLatin}>XINGYU</span>
        </Link>

        <nav className={styles.nav} aria-label="主导航">
          {primaryLinks.map((link) => {
            const isCurrent = activePath === link.href;
            return (
              <Link
                className={styles.navLink}
                href={link.href}
                key={link.href}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <Link className={styles.tripLink} href="/trips/demo">
          我的行程
        </Link>
      </div>
    </header>
  );
}
