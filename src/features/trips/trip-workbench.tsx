'use client';

import { ArrowRight, CalendarBlank, Coins, MapPin, UsersThree } from '@phosphor-icons/react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  getBudgetSummary,
  hydrateWorkbenchTripStore,
  type WorkbenchTrip,
  useTripStore,
  useTripStoreHydration,
} from '@/stores/trip-store';
import { DecisionRoom } from './decision-room';
import { ItineraryEditor } from './itinerary-editor';
import styles from './trips.module.css';
import { demoViewerProfile } from '@/data/partners';
import { postHrefForSlug } from '@/data/posts';
import { tripToPartnerIntent } from '@/features/partners/trip-to-partner-intent';
import { hydratePartnerStore, usePartnerStore, usePartnerStoreHydration } from '@/stores/partner-store';

export function TripWorkbench({ slug }: { slug: string }) {
  const workbenchHydrated = useTripStoreHydration((state) => state.hydrated);
  const workbenchHydrationError = useTripStoreHydration((state) => state.hydrationError);
  const partnerHydrated = usePartnerStoreHydration((state) => state.hydrated);
  const partnerIntent = usePartnerStore((state) => state.intents[demoViewerProfile.id]);
  const publishPartnerMatchIntent = usePartnerStore((state) => state.publishIntent);
  const tripId = useTripStore((state) =>
    Object.keys(state.trips).find((id) => state.trips[id].sourcePostSlug === slug),
  );
  const trip = useTripStore((state) => tripId ? state.trips[tripId] : undefined);
  const partnerIntentPublished = useTripStore((state) => tripId ? Boolean(state.partnerIntents[tripId]) : false);
  const updateTrip = useTripStore((state) => state.updateTrip);
  const updateItem = useTripStore((state) => state.updateItem);
  const reorderItem = useTripStore((state) => state.reorderItem);
  const toggleAlternative = useTripStore((state) => state.toggleAlternative);
  const vote = useTripStore((state) => state.vote);
  const enableGuardian = useTripStore((state) => state.enableGuardian);
  const publishPartnerIntent = useTripStore((state) => state.publishPartnerIntent);
  useEffect(() => {
    void Promise.all([hydrateWorkbenchTripStore(), hydratePartnerStore()]);
  }, []);

  const compareHref = useMemo(() => {
    if (!trip) return '/compare';
    const query = new URLSearchParams({
      destination: trip.destination,
      from: trip.startDate,
      to: trip.endDate,
      travelers: String(trip.travelers),
    });
    return `/compare?${query.toString()}`;
  }, [trip]);

  if (!workbenchHydrated || !partnerHydrated) {
    return <WorkbenchState title="正在读取本地行程…" message="正在读取浏览器中的行程工作台状态。" />;
  }

  if (!trip && workbenchHydrationError) {
    return <WorkbenchState title="本地行程暂时无法读取" message="浏览器中的数据未被覆盖。请返回原攻略，稍后再试。" sourceHref={postHrefForSlug(slug)} />;
  }

  if (!trip) {
    return <WorkbenchState title="未找到本地行程" message="行程只保存在创建它的浏览器中。请返回攻略重新保存。" sourceHref={postHrefForSlug(slug)} />;
  }

  const budgetSummary = getBudgetSummary(trip);
  return (
    <main className={styles.page}>
      {workbenchHydrationError && <p className={styles.hydrationWarning} role="status">工作台存储校验失败，继续使用当前安全的内存状态；原存储未被覆盖。</p>}
      <header className={styles.hero}>
        <div className={styles.eyebrow}>
          <span>LOCAL TRIP / {trip.destination}</span>
          <span className={styles.eyebrowActions}>
            <Link href={postHrefForSlug(trip.sourcePostSlug)}>返回原攻略</Link>
            <span>本地演示工作台</span>
          </span>
        </div>
        <div className={styles.heroTitle}>
          <div><p>{trip.destination} · {trip.items.length} DAYS</p><h1>{trip.title}</h1></div>
          <span className={styles.statusPill}>{trip.guardianEnabled ? '守护演示中' : '共同规划中'}</span>
        </div>
        <p className={styles.heroLead}>把来自攻略的灵感拆成可以讨论、调整与核算的 {trip.items.length} 天。所有编辑仅保存在当前浏览器。</p>
        <div className={styles.tripMeta}>
          <span><MapPin aria-hidden size={18} />{trip.destination}</span>
          <span><CalendarBlank aria-hidden size={18} />{trip.startDate} — {trip.endDate}</span>
          <span><UsersThree aria-hidden size={18} />{trip.travelers} 位演示同行者</span>
        </div>
      </header>

      <TripSettings
        key={trip.id}
        onSave={(patch) => updateTrip(trip.id, patch)}
        trip={trip}
      />

      <ItineraryEditor
        items={trip.items}
        onReorder={(itemId, direction) => reorderItem(trip.id, itemId, direction)}
        onSave={(itemId, patch) => updateItem(trip.id, itemId, patch)}
        onToggleAlternative={(itemId) => toggleAlternative(trip.id, itemId)}
      />

      <section aria-labelledby="budget-title" className={styles.budgetPanel}>
        <div><p>BUDGET / 03</p><h2 id="budget-title">预算核算</h2></div>
        <div className={styles.budgetNumbers}>
          <span><small>{trip.items.length} 项预计花费</small><strong>¥{budgetSummary.overall.toLocaleString('zh-CN')}</strong></span>
          <span><small>行程总预算</small><strong>¥{trip.budget.toLocaleString('zh-CN')}</strong></span>
          <span><small>剩余弹性</small><strong>¥{Math.max(0, trip.budget - budgetSummary.overall).toLocaleString('zh-CN')}</strong></span>
        </div>
        <ol className={styles.costList}>{trip.items.map((item, index) => <li key={item.id}><span>{String(index + 1).padStart(2, '0')} · {item.title}</span><strong>¥{budgetSummary.itemTotals[index].toLocaleString('zh-CN')}</strong></li>)}</ol>
      </section>

      <DecisionRoom
        onEnableGuardian={(consent) => enableGuardian(trip.id, consent)}
        onPublishPartnerIntent={() => { publishPartnerMatchIntent(demoViewerProfile, tripToPartnerIntent(trip, partnerIntent)); publishPartnerIntent(trip.id); }}
        onVote={(memberId, candidateId) => vote(trip.id, memberId, candidateId)}
        partnerIntentPublished={partnerIntentPublished}
        trip={trip}
      />

      <section className={styles.compareCta}>
        <div><Coins aria-hidden size={26} /><span><p>NEXT STEP</p><h2>把决定交给真实比价</h2><small>将目的地、日期和人数带入现有比价页，不进行预订。</small></span></div>
        <Link href={compareHref}>进入比价 <ArrowRight aria-hidden size={18} /></Link>
      </section>
    </main>
  );
}

function TripSettings({
  trip,
  onSave,
}: {
  trip: WorkbenchTrip;
  onSave: (patch: Pick<WorkbenchTrip, 'startDate' | 'endDate' | 'budget'>) => void;
}) {
  const [startDate, setStartDate] = useState(trip.startDate);
  const [endDate, setEndDate] = useState(trip.endDate);
  const [budget, setBudget] = useState(String(trip.budget));
  const [settingsError, setSettingsError] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);

  const saveSettings = () => {
    const parsedBudget = Number(budget);
    if (!startDate || !endDate) {
      setSettingsError('请选择完整的出发与返程日期');
      return;
    }
    if (endDate < startDate) {
      setSettingsError('返程日期不能早于出发日期');
      return;
    }
    if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
      setSettingsError('总预算必须是大于或等于 0 的数字');
      return;
    }
    onSave({ startDate, endDate, budget: parsedBudget });
    setSettingsError('');
    setSettingsSaved(true);
  };

  return (
    <section aria-labelledby="settings-title" className={styles.settingsPanel}>
      <div><p>TRIP SETTINGS</p><h2 id="settings-title">行程设置</h2></div>
      <div className={styles.settingsFields}>
        <label>出发日期<input onChange={(event) => { setStartDate(event.target.value); setSettingsSaved(false); }} type="date" value={startDate} /></label>
        <label>返程日期<input onChange={(event) => { setEndDate(event.target.value); setSettingsSaved(false); }} type="date" value={endDate} /></label>
        <label>总预算<input min="0" onChange={(event) => { setBudget(event.target.value); setSettingsSaved(false); }} type="number" value={budget} /></label>
        <button onClick={saveSettings} type="button">保存行程设置</button>
      </div>
      {settingsError && <p className={styles.formError} role="alert">{settingsError}</p>}
      {settingsSaved && <p className={styles.formSuccess}>行程设置已保存到本浏览器</p>}
    </section>
  );
}

function WorkbenchState({ title, message, sourceHref }: { title: string; message: string; sourceHref?: string }) {
  return (
    <main className={styles.statePage}>
      <section aria-live="polite" className={styles.statePanel}>
        <p>LOCAL TRIP</p><h1>{title}</h1><span>{message}</span>
        {sourceHref && <Link href={sourceHref}>返回原攻略</Link>}
      </section>
    </main>
  );
}
