'use client';

import {
  AirplaneTilt,
  ArrowRight,
  Buildings,
  CalendarBlank,
  CaretDown,
  MapPin,
  Ticket,
  UsersThree,
} from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import styles from './search-composer.module.css';

export type ProductKind = 'flight' | 'hotel' | 'ticket';

export type HomeSearch = {
  kind: ProductKind;
  destination: string;
  from: string;
  to: string;
  travelers: number;
};

type SearchComposerProps = {
  onSubmit?: (search: HomeSearch) => void;
};

const kinds = [
  { id: 'flight', label: '机票', icon: AirplaneTilt },
  { id: 'hotel', label: '酒店', icon: Buildings },
  { id: 'ticket', label: '门票', icon: Ticket },
] as const;

const fieldLabels: Record<
  ProductKind,
  { destination: string; from: string; to?: string; travelers: string }
> = {
  flight: {
    destination: '到达地',
    from: '出发日期',
    to: '返程日期',
    travelers: '乘机人',
  },
  hotel: {
    destination: '入住地',
    from: '入住日期',
    to: '退房日期',
    travelers: '住客',
  },
  ticket: {
    destination: '游玩地',
    from: '游玩日期',
    travelers: '游客',
  },
};

export function buildComparisonHref(search: HomeSearch) {
  const params = new URLSearchParams({
    kind: search.kind,
    destination: search.destination,
    from: search.from,
    to: search.to,
    travelers: String(search.travelers),
  });
  return `/compare?${params.toString()}`;
}

function navigateToComparison(search: HomeSearch) {
  if (typeof window !== 'undefined') {
    window.location.assign(buildComparisonHref(search));
  }
}

export function SearchComposer({
  onSubmit = navigateToComparison,
}: SearchComposerProps) {
  const [kind, setKind] = useState<ProductKind>('flight');
  const [destination, setDestination] = useState('大理');
  const [from, setFrom] = useState('2026-08-22');
  const [to, setTo] = useState('2026-08-27');
  const [travelers, setTravelers] = useState('2');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const reduceMotion = useReducedMotion();
  const labels = fieldLabels[kind];

  function selectAdjacentTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();

    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % kinds.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + kinds.length) % kinds.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = kinds.length - 1;

    const nextKind = kinds[nextIndex];
    setKind(nextKind.id);
    tabRefs.current[nextIndex]?.focus();
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      kind,
      destination: destination.trim(),
      from,
      to,
      travelers: Number(travelers),
    });
  }

  return (
    <form className={styles.composer} onSubmit={submitSearch}>
      <div className={styles.tabs} role="tablist" aria-label="比价类型">
        {kinds.map((item, index) => {
          const Icon = item.icon;
          const selected = kind === item.id;
          return (
            <button
              aria-controls="home-search-fields"
              aria-selected={selected}
              className={styles.tab}
              id={`search-tab-${item.id}`}
              key={item.id}
              onClick={() => setKind(item.id)}
              onKeyDown={(event) => selectAdjacentTab(event, index)}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              <Icon aria-hidden size={20} weight="light" />
              {item.label}
            </button>
          );
        })}
      </div>

      <motion.div
        animate={{ opacity: 1, x: 0 }}
        aria-labelledby={`search-tab-${kind}`}
        className={styles.fields}
        data-kind={kind}
        id="home-search-fields"
        initial={reduceMotion ? false : { opacity: 0.72, x: 10 }}
        key={kind}
        role="tabpanel"
        transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
      >
        <label className={styles.destinationField}>
          <span>{labels.destination}</span>
          <span className={styles.controlRow}>
            <MapPin aria-hidden size={22} weight="light" />
            <input
              autoComplete="address-level2"
              name="destination"
              onChange={(event) => setDestination(event.target.value)}
              required
              type="text"
              value={destination}
            />
            <CaretDown aria-hidden size={16} />
          </span>
        </label>

        <div className={styles.dates}>
          <CalendarBlank aria-hidden size={22} weight="light" />
          <label>
            <span>{labels.from}</span>
            <input
              name="from"
              onChange={(event) => setFrom(event.target.value)}
              required
              type="date"
              value={from}
            />
          </label>
          {labels.to ? (
            <>
              <span className={styles.dateDash} aria-hidden>
                —
              </span>
              <label>
                <span>{labels.to}</span>
                <input
                  min={from}
                  name="to"
                  onChange={(event) => setTo(event.target.value)}
                  required
                  type="date"
                  value={to}
                />
              </label>
            </>
          ) : (
            <input name="to" type="hidden" value={to} />
          )}
        </div>

        <label className={styles.travelersField}>
          <span>{labels.travelers}</span>
          <span className={styles.controlRow}>
            <UsersThree aria-hidden size={22} weight="light" />
            <select
              name="travelers"
              onChange={(event) => setTravelers(event.target.value)}
              value={travelers}
            >
              <option value="1">1 位</option>
              <option value="2">2 位</option>
              <option value="3">3 位</option>
              <option value="4">4 位</option>
              <option value="5">5 位</option>
              <option value="6">6 位</option>
            </select>
            <CaretDown aria-hidden size={16} />
          </span>
        </label>

        <button className={styles.submit} type="submit">
          <span>开始规划</span>
          <ArrowRight aria-hidden size={22} weight="light" />
        </button>
      </motion.div>
    </form>
  );
}
