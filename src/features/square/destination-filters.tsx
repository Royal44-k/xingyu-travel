'use client';

import { MagnifyingGlass, X } from '@phosphor-icons/react';
import styles from './square.module.css';

export interface DestinationFilterValues {
  query: string;
  destination: string;
  theme: string;
  maxDays: number | null;
}

interface DestinationFiltersProps {
  destinations: readonly string[];
  themes: readonly string[];
  values: DestinationFilterValues;
  onChange: (values: DestinationFilterValues) => void;
  onClear: () => void;
}

export function DestinationFilters({
  destinations,
  themes,
  values,
  onChange,
  onClear,
}: DestinationFiltersProps) {
  const hasActiveFilters = Boolean(
    values.query.trim() || values.destination || values.theme || values.maxDays,
  );

  return (
    <section aria-label="筛选旅行攻略" className={styles.destinationFilters}>
      <label className={styles.searchField}>
        <span>搜索攻略</span>
        <span className={styles.searchInputWrap}>
          <MagnifyingGlass aria-hidden size={18} />
          <input
            onChange={(event) => onChange({ ...values, query: event.target.value })}
            placeholder="搜索城市、主题或地点"
            type="search"
            value={values.query}
          />
        </span>
      </label>

      <label className={styles.filterField}>
        <span>目的地</span>
        <select
          onChange={(event) => onChange({ ...values, destination: event.target.value })}
          value={values.destination}
        >
          <option value="">全部目的地</option>
          {destinations.map((destination) => (
            <option key={destination} value={destination}>{destination}</option>
          ))}
        </select>
      </label>

      <label className={styles.filterField}>
        <span>最多天数</span>
        <select
          onChange={(event) => onChange({
            ...values,
            maxDays: event.target.value ? Number(event.target.value) : null,
          })}
          value={values.maxDays ?? ''}
        >
          <option value="">不限天数</option>
          {[3, 4, 5, 6, 7].map((days) => (
            <option key={days} value={days}>{days} 天以内</option>
          ))}
        </select>
      </label>

      <div className={styles.themeFilters}>
        <span>主题</span>
        <div>
          {themes.map((theme) => (
            <button
              aria-pressed={values.theme === theme}
              key={theme}
              onClick={() => onChange({
                ...values,
                theme: values.theme === theme ? '' : theme,
              })}
              type="button"
            >
              {theme}
            </button>
          ))}
        </div>
      </div>

      <button
        className={styles.clearFiltersButton}
        disabled={!hasActiveFilters}
        onClick={onClear}
        type="button"
      >
        <X aria-hidden size={16} /> 清除筛选
      </button>
    </section>
  );
}
