'use client';

import Link from 'next/link';
import { List, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import styles from './site-header.module.css';

const primaryLinks = [
  { href: '/', label: '首页' },
  { href: '/compare', label: '真实比价' },
  { href: '/square', label: '灵感广场' },
  { href: '/partners', label: '寻找搭子' },
  { href: '/guardian/dali-slow-5d', label: '行程守护' },
] as const;

type SiteHeaderProps = {
  activePath?: string;
  variant?: 'overlay' | 'solid';
};

export function SiteHeader({ activePath = '/', variant = 'overlay' }: SiteHeaderProps) {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const updateHeader = () => setHasScrolled(window.scrollY > 48);
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
    return () => window.removeEventListener('scroll', updateHeader);
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  return (
    <header
      className={styles.header}
      data-scrolled={hasScrolled ? 'true' : 'false'}
      data-variant={variant}
    >
      <div className={styles.inner}>
        <Link className={styles.brand} href="/" aria-label="行屿 XINGYU">
          <span className={styles.brandChinese}>行屿</span>
          <span className={styles.brandLatin}>XINGYU</span>
        </Link>

        <button
          aria-controls="primary-navigation"
          aria-expanded={mobileNavOpen}
          aria-label={mobileNavOpen ? '关闭导航' : '打开导航'}
          className={styles.menuButton}
          onClick={() => setMobileNavOpen((open) => !open)}
          type="button"
        >
          {mobileNavOpen ? <X aria-hidden size={22} /> : <List aria-hidden size={24} />}
        </button>

        <nav className={styles.nav} aria-label="主导航" data-open={mobileNavOpen} id="primary-navigation">
          {primaryLinks.map((link) => {
            const isCurrent = activePath === link.href;
            return (
              <Link
                className={styles.navLink}
                href={link.href}
                key={link.href}
                aria-current={isCurrent ? 'page' : undefined}
                onClick={() => setMobileNavOpen(false)}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <Link aria-current={activePath === '/trips' ? 'page' : undefined} className={styles.tripLink} href="/trips">
          我的行程
        </Link>
      </div>
    </header>
  );
}
