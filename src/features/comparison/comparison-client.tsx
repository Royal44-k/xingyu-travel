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
import { ExternalBookingDialog } from '@/components/external-booking-dialog';
import { offerIdentity } from '@/domain/comparison/offer-identity';
import type { ComparisonSearchInput } from '@/domain/shared/api';
import { OfferRow } from './offer-row';
import { useDialogFocus } from './use-dialog-focus';
import {
  hydrateLibraryStore,
  useLibraryStore,
  useLibraryStoreHydration,
} from '@/stores/library-store';
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

function hasIncludedBenefit(offer: NormalizedOffer): boolean {
  if (offer.kind === 'flight') return offer.baggageIncluded;
  return (offer.includedBenefits?.length ?? 0) > 0;
}

function upsertOffer(
  current: NormalizedOffer[],
  incoming: NormalizedOffer,
): NormalizedOffer[] {
  const key = offerIdentity(incoming);
  const index = current.findIndex((offer) => offerIdentity(offer) === key);
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
  const [streamComplete, setStreamComplete] = useState(false);
  const [degradedMessage, setDegradedMessage] = useState<string>();
  const [sortOrder, setSortOrder] = useState<SortOrder>('price-asc');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [refundableOnly, setRefundableOnly] = useState(false);
  const [benefitOnly, setBenefitOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedOfferKeys, setSelectedOfferKeys] = useState<string[]>([]);
  const [libraryNotice, setLibraryNotice] = useState('');
  const [pendingRemoval, setPendingRemoval] = useState<NormalizedOffer>();
  const [outboundOffer, setOutboundOffer] = useState<NormalizedOffer>();
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const filterDialogRef = useRef<HTMLElement>(null);
  const outboundTriggerRef = useRef<HTMLElement>(null);
  const compareTriggerRef = useRef<HTMLButtonElement>(null);
  const compareDialogRef = useRef<HTMLElement>(null);
  const removalTriggerRef = useRef<HTMLButtonElement>(null);
  const removalDialogRef = useRef<HTMLElement>(null);
  const favoriteOffers = useLibraryStore((state) => state.favoriteOffers);
  const priceAlerts = useLibraryStore((state) => state.priceAlerts);
  const saveOffer = useLibraryStore((state) => state.saveOffer);
  const removeOffer = useLibraryStore((state) => state.removeOffer);
  const setPriceAlert = useLibraryStore((state) => state.setPriceAlert);
  const libraryHydrated = useLibraryStoreHydration((state) => state.hydrated);
  const libraryHydrationError = useLibraryStoreHydration((state) => state.hydrationError);
  const libraryReady = libraryHydrated && !libraryHydrationError;

  useDialogFocus(filtersOpen, filterDialogRef, filterTriggerRef, () => setFiltersOpen(false));
  useDialogFocus(comparisonOpen, compareDialogRef, compareTriggerRef, () => setComparisonOpen(false));
  useDialogFocus(Boolean(pendingRemoval), removalDialogRef, removalTriggerRef, () => setPendingRemoval(undefined));

  useEffect(() => {
    void hydrateLibraryStore();
  }, []);

  useEffect(() => {
    let active = true;

    const acceptEvent = (event: QuoteEvent) => {
      if (!active) return;
      if (event.type === 'offer') {
        setOffers((current) => upsertOffer(current, event.payload));
      } else if (event.type === 'degraded') {
        setDegradedMessage(event.payload.message);
      } else if (event.type === 'complete') {
        setStreamComplete(true);
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
      if (active) {
        setDegradedMessage('报价流暂时中断，已保留当前结果');
        setStreamComplete(true);
      }
    });

    return () => {
      active = false;
      disconnect();
    };
  }, [search, stream]);

  const visibleOffers = useMemo(() => {
    const filtered = offers
      .filter((offer) => !refundableOnly || offer.refundable)
      .filter((offer) => !benefitOnly || hasIncludedBenefit(offer))
      .filter((offer) => !verifiedOnly || offer.providerVerified !== false);

    return [...filtered].sort((left, right) => {
      if (sortOrder === 'price-desc') return right.totalPrice - left.totalPrice;
      if (sortOrder === 'updated') {
        return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
      }
      return left.totalPrice - right.totalPrice;
    });
  }, [benefitOnly, offers, refundableOnly, sortOrder, verifiedOnly]);

  const selectedOffers = useMemo(
    () =>
      offers.filter((offer) => selectedOfferKeys.includes(offerIdentity(offer))),
    [offers, selectedOfferKeys],
  );

  const savedOfferKeys = useMemo(
    () => offers.map(offerIdentity).filter((key) => Boolean(favoriteOffers[key])),
    [favoriteOffers, offers],
  );
  const alertsEnabled = savedOfferKeys.length > 0 &&
    savedOfferKeys.every((key) => Boolean(priceAlerts[key]?.enabled));

  function selectKind(kind: ComparisonProductKind) {
    setOffers([]);
    setStreamComplete(false);
    setDegradedMessage(undefined);
    setSearch((current) => ({ ...current, kind }));
    setSelectedOfferKeys([]);
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

  function toggleFavorite(offer: NormalizedOffer, trigger: HTMLButtonElement) {
    if (!libraryReady) return;
    const key = offerIdentity(offer);
    if (!favoriteOffers[key]) {
      saveOffer(offer, search);
      return;
    }
    if (priceAlerts[key]?.enabled) {
      removalTriggerRef.current = trigger;
      setPendingRemoval(offer);
      return;
    }
    removeOffer(key);
  }

  function toggleAlerts() {
    if (!libraryReady || savedOfferKeys.length === 0) return;
    const enabled = !alertsEnabled;
    for (const key of savedOfferKeys) setPriceAlert(key, enabled);
    setLibraryNotice(enabled
      ? '已保存提醒设置；本演示不会在关闭页面后推送'
      : '已关闭当前收藏报价的降价提醒');
  }

  function confirmRemoval() {
    if (!pendingRemoval) return;
    removeOffer(offerIdentity(pendingRemoval));
    setPendingRemoval(undefined);
  }

  function toggleComparison(key: string) {
    setSelectedOfferKeys((current) => {
      if (current.includes(key)) return current.filter((entry) => entry !== key);
      if (current.length >= 3) return current;
      return [...current, key];
    });
  }

  function openExternalBooking() {
    if (!outboundOffer || typeof window === 'undefined') return;
    const localDemo =
      process.env.NODE_ENV !== 'production' ||
      ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    if (localDemo) return;
    window.open('https://www.ctrip.com/', '_blank', 'noopener,noreferrer');
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
              aria-describedby="comparison-library-state"
              aria-label="降价提醒"
              className={styles.switch}
              disabled={!libraryReady || savedOfferKeys.length === 0}
              onClick={toggleAlerts}
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
            ref={filterTriggerRef}
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

        {!libraryHydrated ? (
          <p className={styles.libraryNotice} id="comparison-library-state" role="status">正在读取本地收藏与提醒…</p>
        ) : null}
        {libraryHydrationError ? (
          <p className={styles.libraryNotice} id="comparison-library-state" role="alert">本地收藏与提醒无法安全读取，暂时无法更改。请清除浏览器中的本地收藏后重试。</p>
        ) : null}
        {libraryReady && savedOfferKeys.length === 0 ? (
          <p className={styles.libraryNotice} id="comparison-library-state">收藏报价后可开启本地降价提醒。</p>
        ) : null}
        {libraryReady && savedOfferKeys.length > 0 && libraryNotice ? (
          <p className={styles.libraryNotice} id="comparison-library-state" role="status">{libraryNotice}</p>
        ) : null}

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
                selectedOfferKeys.length >= 3 &&
                !selectedOfferKeys.includes(offerIdentity(offer))
              }
              favorite={Boolean(favoriteOffers[offerIdentity(offer)])}
              favoriteDisabled={!libraryReady}
              key={offerIdentity(offer)}
              now={now}
              offer={offer}
              onFavorite={(trigger) => toggleFavorite(offer, trigger)}
              onOutbound={(trigger) => {
                outboundTriggerRef.current = trigger;
                setOutboundOffer(offer);
              }}
              onSelect={() => toggleComparison(offerIdentity(offer))}
              selected={selectedOfferKeys.includes(offerIdentity(offer))}
            />
          ))}
          {offers.length === 0 && !streamComplete ? (
            <div className={styles.loading} aria-live="polite">
              正在接收沙箱报价…
            </div>
          ) : null}
          {offers.length === 0 && streamComplete ? (
            <div className={styles.loading}>暂无可用的沙箱报价</div>
          ) : null}
          {offers.length > 0 && visibleOffers.length === 0 ? (
            <div className={styles.loading}>没有符合筛选条件的报价</div>
          ) : null}
        </div>
      </section>

      {selectedOfferKeys.length > 0 ? (
        <aside className={styles.compareBar} aria-label="同屏对比选择">
          <span><Check aria-hidden size={17} /> 已选择 {selectedOfferKeys.length}/3 项</span>
          <button className={styles.primaryButton} onClick={() => setComparisonOpen(true)} ref={compareTriggerRef} type="button">查看同屏差异</button>
        </aside>
      ) : null}

      {filtersOpen ? (
        <div className={styles.drawerBackdrop}>
          <aside aria-label="筛选条件" aria-modal="true" className={styles.drawer} ref={filterDialogRef} role="dialog" tabIndex={-1}>
            <div className={styles.drawerHeader}>
              <div><p>FILTERS</p><h2>筛选条件</h2></div>
              <button aria-label="关闭筛选" className={styles.iconButton} onClick={() => setFiltersOpen(false)} type="button"><X aria-hidden size={21} /></button>
            </div>
            <fieldset>
              <legend>退改与服务</legend>
              <label><input checked={refundableOnly} onChange={(event) => setRefundableOnly(event.target.checked)} type="checkbox" />仅看可退改</label>
              <label><input checked={benefitOnly} onChange={(event) => setBenefitOnly(event.target.checked)} type="checkbox" />仅看含权益</label>
            </fieldset>
            <fieldset>
              <legend>供应商可信度</legend>
              <label><input checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} type="checkbox" />仅看已验证供应商</label>
            </fieldset>
            <button className={styles.primaryButton} onClick={() => setFiltersOpen(false)} type="button">应用筛选</button>
          </aside>
        </div>
      ) : null}

      {outboundOffer ? (
        <ExternalBookingDialog
          offer={outboundOffer}
          onClose={() => setOutboundOffer(undefined)}
          onConfirm={openExternalBooking}
          open
          returnFocusRef={outboundTriggerRef}
        />
      ) : null}

      {pendingRemoval ? (
        <div className={styles.dialogBackdrop}>
          <section
            aria-labelledby="remove-favorite-title"
            aria-modal="true"
            className={styles.confirmDialog}
            ref={removalDialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <span className={styles.demoPill}>本地收藏</span>
            <h2 id="remove-favorite-title">移除收藏报价</h2>
            <p>移除收藏也会关闭这条报价的降价提醒。此操作只影响当前浏览器中的演示数据。</p>
            <p className={styles.dialogOffer}>{pendingRemoval.provider} · {pendingRemoval.title}</p>
            <div className={styles.dialogActions}>
              <button className={styles.secondaryButton} onClick={() => setPendingRemoval(undefined)} type="button">保留收藏</button>
              <button className={styles.dangerButton} onClick={confirmRemoval} type="button">确认移除并关闭提醒</button>
            </div>
          </section>
        </div>
      ) : null}

      {comparisonOpen ? (
        <div className={styles.dialogBackdrop}>
          <section aria-label="报价同屏对比" aria-modal="true" className={styles.comparisonDialog} ref={compareDialogRef} role="dialog" tabIndex={-1}>
            <div className={styles.drawerHeader}>
              <div><p>COMPARE</p><h2>报价同屏对比</h2></div>
              <button aria-label="关闭同屏对比" className={styles.iconButton} onClick={() => setComparisonOpen(false)} type="button"><X aria-hidden size={21} /></button>
            </div>
            <div className={styles.comparisonTableWrap}>
              <table aria-label="已选报价差异" className={styles.comparisonTable}>
                <thead><tr><th scope="col">对比项</th>{selectedOffers.map((offer) => <th key={offerIdentity(offer)} scope="col">{offer.provider}</th>)}</tr></thead>
                <tbody>
                  <tr><th scope="row">含税总价</th>{selectedOffers.map((offer) => <td key={offerIdentity(offer)}>¥{new Intl.NumberFormat('zh-CN').format(offer.totalPrice)}</td>)}</tr>
                  <tr><th scope="row">行李与权益</th>{selectedOffers.map((offer) => <td key={offerIdentity(offer)}>{offer.baggageIncluded ? '含托运行李' : offer.includedBenefits?.join('、') || '未含额外权益'}</td>)}</tr>
                  <tr><th scope="row">退改条件</th>{selectedOffers.map((offer) => <td key={offerIdentity(offer)}>{offer.refundable ? '支持退改' : '限制退改'}</td>)}</tr>
                  <tr><th scope="row">供应商</th>{selectedOffers.map((offer) => <td key={offerIdentity(offer)}>{offer.providerVerified === false ? '待核验' : '已验证'}</td>)}</tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
