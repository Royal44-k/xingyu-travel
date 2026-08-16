'use client';

import {
  AirplaneTilt,
  Bell,
  Buildings,
  CalendarDots,
  Check,
  Funnel,
  Info,
  SlidersHorizontal,
  Ticket,
  X,
} from '@phosphor-icons/react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import type {
  ComparisonProductKind,
  NormalizedOffer,
  QuoteEvent,
} from '@/domain/comparison/types';
import type { ComparisonSearchInput } from '@/domain/shared/api';
import { OfferRow } from './offer-row';
import styles from './comparison.module.css';

type ComparisonClientProps = {
  initialSearch: ComparisonSearchInput;
  stream?: AsyncIterable<QuoteEvent>;
  now?: string;
};

type SortOrder = 'price-asc' | 'price-desc' | 'updated';

const productTabs = [
  { id: 'flight', label: '机票', icon: AirplaneTilt },
  { id: 'hotel', label: '酒店', icon: Buildings },
  { id: 'ticket', label: '门票', icon: Ticket },
] as const;

function offerKey(offer: NormalizedOffer): string {
  return `${offer.provider}\u0000${offer.id}`;
}

function upsertOffer(
  current: NormalizedOffer[],
  incoming: NormalizedOffer,
): NormalizedOffer[] {
  const key = offerKey(incoming);
  const index = current.findIndex((offer) => offerKey(offer) === key);
  if (index === -1) return [...current, incoming];
  return current.map((offer, offerIndex) => (offerIndex === index ? incoming : offer));
}

function connectToQuoteStream(
  search: ComparisonSearchInput,
  onEvent: (event: QuoteEvent) => void,
  onFailure: () => void,
): () => void {
  let source: EventSource | undefined;
  let cancelled = false;

  void fetch('/api/v1/comparison/searches', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(search),
  })
    .then(async (response) => {
      if (!response.ok) throw new Error('comparison search rejected');
      return (await response.json()) as { search_id: string };
    })
    .then(({ search_id: searchId }) => {
      if (cancelled) return;
      source = new EventSource(`/api/v1/comparison/searches/${searchId}/events`);

      for (const type of ['offer', 'degraded', 'complete'] as const) {
        source.addEventListener(type, (rawEvent) => {
          const payload = JSON.parse((rawEvent as MessageEvent<string>).data) as QuoteEvent['payload'];
          onEvent({ type, payload } as QuoteEvent);
          if (type === 'complete') source?.close();
        });
      }
      source.onerror = onFailure;
    })
    .catch(onFailure);

  return () => {
    cancelled = true;
    source?.close();
  };
}

export function ComparisonClient({
  initialSearch,
  stream,
  now = new Date().toISOString(),
}: ComparisonClientProps) {
  const initialKind = initialSearch.kind ?? 'flight';
  const [search, setSearch] = useState<ComparisonSearchInput>({
    ...initialSearch,
    kind: initialKind,
  });
  const [offers, setOffers] = useState<NormalizedOffer[]>([]);
  const [degradedMessage, setDegradedMessage] = useState<string>();
  const [sortOrder, setSortOrder] = useState<SortOrder>('price-asc');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [refundableOnly, setRefundableOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [outboundOffer, setOutboundOffer] = useState<NormalizedOffer>();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    let active = true;

    const acceptEvent = (event: QuoteEvent) => {
      if (!active) return;
      if (event.type === 'offer') {
        setOffers((current) => upsertOffer(current, event.payload));
      } else if (event.type === 'degraded') {
        setDegradedMessage(event.payload.message);
      }
    };

    if (stream) {
      void (async () => {
        for await (const event of stream) acceptEvent(event);
      })();
      return () => {
        active = false;
      };
    }

    const disconnect = connectToQuoteStream(search, acceptEvent, () => {
      if (active) setDegradedMessage('报价流暂时中断，已保留当前结果');
    });

    return () => {
      active = false;
      disconnect();
    };
  }, [search, stream]);

  const visibleOffers = useMemo(() => {
    const filtered = refundableOnly
      ? offers.filter((offer) => offer.refundable)
      : offers;

    return [...filtered].sort((left, right) => {
      if (sortOrder === 'price-desc') return right.totalPrice - left.totalPrice;
      if (sortOrder === 'updated') {
        return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
      }
      return left.totalPrice - right.totalPrice;
    });
  }, [offers, refundableOnly, sortOrder]);

  function selectKind(kind: ComparisonProductKind) {
    setOffers([]);
    setDegradedMessage(undefined);
    setSearch((current) => ({ ...current, kind }));
    setSelectedIds([]);
  }

  function selectAdjacentTab(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % productTabs.length;
    if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + productTabs.length) % productTabs.length;
    }
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = productTabs.length - 1;
    selectKind(productTabs[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }

  function toggleInList(id: string, setter: typeof setFavoriteIds) {
    setter((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  }

  function toggleComparison(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((entry) => entry !== id);
      if (current.length >= 3) return current;
      return [...current, id];
    });
  }

  return (
    <main className={styles.page}>
      <section className={styles.masthead} aria-labelledby="comparison-title">
        <p>XINGYU · TRANSPARENT COMPARISON</p>
        <h1 id="comparison-title">看清总价，再从容出发</h1>
        <span>
          {search.origin ? `${search.origin} → ` : ''}
          {search.destination} · 沙箱演示报价
        </span>
      </section>

      <section className={styles.workspace} aria-label="旅行产品比价">
        <div className={styles.tabs} role="tablist" aria-label="产品类型">
          {productTabs.map((tab, index) => {
            const Icon = tab.icon;
            const selected = search.kind === tab.id;
            return (
              <button
                aria-controls="comparison-results"
                aria-selected={selected}
                className={styles.tab}
                id={`compare-tab-${tab.id}`}
                key={tab.id}
                onClick={() => selectKind(tab.id)}
                onKeyDown={(event) => selectAdjacentTab(event, index)}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                role="tab"
                tabIndex={selected ? 0 : -1}
                type="button"
              >
                <Icon aria-hidden size={21} weight="light" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className={styles.toolbar}>
          <div>
            <strong>{visibleOffers.length} 项可比报价</strong>
            <span>税费与必付费用已统一计入</span>
          </div>
          <label className={styles.alertSwitch}>
            <Bell aria-hidden size={18} />
            <span>降价提醒</span>
            <button
              aria-checked={alertsEnabled}
              aria-label="降价提醒"
              className={styles.switch}
              onClick={() => setAlertsEnabled((value) => !value)}
              role="switch"
              type="button"
            >
              <span />
            </button>
          </label>
          <button
            aria-expanded={calendarOpen}
            className={styles.secondaryButton}
            onClick={() => setCalendarOpen((value) => !value)}
            type="button"
          >
            <CalendarDots aria-hidden size={18} />
            价格日历
          </button>
          <button
            aria-expanded={filtersOpen}
            className={styles.secondaryButton}
            onClick={() => setFiltersOpen(true)}
            type="button"
          >
            <Funnel aria-hidden size={18} />
            筛选条件
          </button>
          <label className={styles.sortControl}>
            <SlidersHorizontal aria-hidden size={18} />
            <span className={styles.visuallyHidden}>报价排序</span>
            <select
              aria-label="报价排序"
              onChange={(event) => setSortOrder(event.target.value as SortOrder)}
              value={sortOrder}
            >
              <option value="price-asc">总价从低到高</option>
              <option value="price-desc">总价从高到低</option>
              <option value="updated">最近更新</option>
            </select>
          </label>
        </div>

        {calendarOpen ? (
          <section className={styles.priceCalendar} aria-label="价格日历">
            <div><span>8月21日</span><strong>¥1,090</strong></div>
            <div data-best="true"><span>8月22日</span><strong>¥980</strong><small>较低</small></div>
            <div><span>8月23日</span><strong>¥1,140</strong></div>
            <p><Info aria-hidden size={16} /> 固定沙箱样本，仅用于展示日期价差。</p>
          </section>
        ) : null}

        {degradedMessage ? (
          <div className={styles.degradedBanner} role="status">
            <Info aria-hidden size={18} weight="fill" />
            <span>{degradedMessage}，其余报价仍可正常比较。</span>
          </div>
        ) : null}

        <div
          aria-labelledby={`compare-tab-${search.kind}`}
          className={styles.results}
          id="comparison-results"
          role="tabpanel"
        >
          {visibleOffers.map((offer) => (
            <OfferRow
              comparisonDisabled={
                selectedIds.length >= 3 && !selectedIds.includes(offer.id)
              }
              favorite={favoriteIds.includes(offer.id)}
              key={offerKey(offer)}
              now={now}
              offer={offer}
              onFavorite={() => toggleInList(offer.id, setFavoriteIds)}
              onOutbound={() => setOutboundOffer(offer)}
              onSelect={() => toggleComparison(offer.id)}
              selected={selectedIds.includes(offer.id)}
            />
          ))}
          {offers.length === 0 ? (
            <div className={styles.loading} aria-live="polite">
              正在接收沙箱报价…
            </div>
          ) : null}
        </div>
      </section>

      {selectedIds.length > 0 ? (
        <aside className={styles.compareBar} aria-label="同屏对比选择">
          <span><Check aria-hidden size={17} /> 已选择 {selectedIds.length}/3 项</span>
          <button className={styles.primaryButton} type="button">查看同屏差异</button>
        </aside>
      ) : null}

      {filtersOpen ? (
        <div className={styles.drawerBackdrop}>
          <aside aria-label="筛选条件" aria-modal="true" className={styles.drawer} role="dialog">
            <div className={styles.drawerHeader}>
              <div><p>FILTERS</p><h2>筛选条件</h2></div>
              <button aria-label="关闭筛选" className={styles.iconButton} onClick={() => setFiltersOpen(false)} type="button"><X aria-hidden size={21} /></button>
            </div>
            <fieldset>
              <legend>退改与服务</legend>
              <label><input checked={refundableOnly} onChange={(event) => setRefundableOnly(event.target.checked)} type="checkbox" />仅看可退改</label>
              <label><input type="checkbox" />包含行李或早餐</label>
            </fieldset>
            <fieldset>
              <legend>供应商可信度</legend>
              <label><input type="checkbox" />仅看已验证供应商</label>
            </fieldset>
            <button className={styles.primaryButton} onClick={() => setFiltersOpen(false)} type="button">应用筛选</button>
          </aside>
        </div>
      ) : null}

      {outboundOffer ? (
        <div className={styles.dialogBackdrop}>
          <section aria-label="沙箱演示确认" aria-modal="true" className={styles.confirmDialog} role="dialog">
            <span className={styles.demoPill}>沙箱 / Demo</span>
            <h2>这是演示报价，不会跳转真实供应商</h2>
            <p>当前操作仅解释外部确认流程，不会预订、出票或付款，也不会采集支付信息。</p>
            <p className={styles.dialogOffer}>{outboundOffer.provider} · ¥{new Intl.NumberFormat('zh-CN').format(outboundOffer.totalPrice)} 含税总价</p>
            <button className={styles.primaryButton} onClick={() => setOutboundOffer(undefined)} type="button">我知道了</button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
