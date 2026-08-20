'use client';

import Link from 'next/link';
import { List, SuitcaseRolling, UserCircle, X } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { isKnownGuardianTrip } from '@/data/risk-events';
import {
  hydrateWorkbenchTripStore,
  selectMostRecentGuardianTrip,
  type TripStoreState,
  useTripStore,
  useTripStoreHydration,
} from '@/stores/trip-store';
import styles from './site-header.module.css';

const primaryLinks = [
  { href: '/', label: '首页' },
  { href: '/compare', label: '真实比价' },
  { href: '/square', label: '灵感广场' },
  { href: '/partners', label: '寻找搭子' },
  { href: '/assistant', label: '旅行助手' },
] as const;
const guardianIntentHref = '/trips?intent=guardian';

function selectGuardianHref(state: Pick<TripStoreState, 'trips'>) {
  const trip = selectMostRecentGuardianTrip(state, isKnownGuardianTrip);
  return trip ? `/guardian/${encodeURIComponent(trip.sourcePostSlug)}` : guardianIntentHref;
}

type SiteHeaderProps = {
  activePath?: string;
  variant?: 'overlay' | 'solid';
};

export function SiteHeader({ activePath = '/', variant = 'overlay' }: SiteHeaderProps) {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const guardianHref = useTripStore(selectGuardianHref);
  const tripHydrated = useTripStoreHydration((state) => state.hydrated);
  const tripHydrationError = useTripStoreHydration((state) => state.hydrationError);

  useEffect(() => {
    const updateHeader = () => setHasScrolled(window.scrollY > 48);
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
    return () => window.removeEventListener('scroll', updateHeader);
  }, []);

  useEffect(() => {
    void hydrateWorkbenchTripStore();
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setMobileNavOpen(false);
      menuButtonRef.current?.focus();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileNavOpen]);

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
          ref={menuButtonRef}
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
          {tripHydrated && !tripHydrationError ? (
            <Link
              aria-current={activePath.startsWith('/guardian/') ? 'page' : undefined}
              className={styles.navLink}
              href={guardianHref}
              onClick={() => setMobileNavOpen(false)}
            >
              行程守护
            </Link>
          ) : (
            <span aria-disabled="true" className={`${styles.navLink} ${styles.navUnavailable}`}>
              行程守护
            </span>
          )}
        </nav>

        <div className={styles.accountLinks}>
          <Link aria-current={activePath === '/trips' ? 'page' : undefined} aria-label="我的行程" className={styles.tripLink} href="/trips">
            <SuitcaseRolling aria-hidden size={18} />
            <span className={styles.tripLabel}>我的行程</span>
          </Link>
          <Link aria-current={activePath === '/profile' ? 'page' : undefined} className={styles.profileLink} href="/profile">
            <UserCircle aria-hidden size={19} />
            <span>个人中心</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
