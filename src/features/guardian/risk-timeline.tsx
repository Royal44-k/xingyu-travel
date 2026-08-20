'use client';

import { WarningCircle } from '@phosphor-icons/react';
import Link from 'next/link';
import { useEffect } from 'react';
import type { GuardianRiskEvent } from '@/data/risk-events';
import {
  hydrateWorkbenchTripStore,
  selectTripBySourceSlug,
  useTripStore,
  useTripStoreHydration,
} from '@/stores/trip-store';
import styles from './guardian.module.css';

interface RiskTimelineProps {
  events: GuardianRiskEvent[];
  tripId: string;
}

export function RiskTimeline({ events, tripId }: RiskTimelineProps) {
  const hydrated = useTripStoreHydration((state) => state.hydrated);
  const hydrationError = useTripStoreHydration((state) => state.hydrationError);
  const canonicalTripId = useTripStore(
    (state) => selectTripBySourceSlug(state, tripId)?.id,
  );
  const trip = useTripStore((state) => canonicalTripId ? state.trips[canonicalTripId] : undefined);
  const selectedPlan = useTripStore(
    (state) => canonicalTripId ? state.guardianPlans[canonicalTripId] : undefined,
  );

  useEffect(() => {
    void hydrateWorkbenchTripStore();
  }, []);

  if (!hydrated) {
    return (
      <TimelineState
        message="正在校验保存在当前浏览器中的行程与守护状态。"
        title="正在读取守护行程…"
      />
    );
  }
  if (hydrationError) {
    return (
      <TimelineState
        actionHref="/trips?intent=guardian"
        actionLabel="返回我的行程"
        alert
        message="行程存储校验失败；原始浏览器数据已保留且没有被覆盖。请返回我的行程恢复或重新创建守护示例。"
        title="本地守护行程暂时无法读取"
      />
    );
  }
  if (!trip) {
    return (
      <TimelineState
        actionHref="/trips?intent=guardian"
        actionLabel="返回我的行程"
        message="守护事件可以公开查看，但方案选择只属于当前浏览器中已开启守护的本地行程。"
        title="当前浏览器没有这条守护行程"
      />
    );
  }
  if (trip.status !== 'guarded' || !trip.guardianEnabled) {
    return (
      <TimelineState
        actionHref={`/trips/${trip.sourcePostSlug}`}
        actionLabel="返回行程开启守护"
        message="先在行程工作台阅读边界并确认开启，本页才会允许保存 Plan A/B/C 选择。"
        title="这条行程尚未开启守护"
      />
    );
  }

  const selectedPlanIndex = selectedPlan
    ? events.flatMap((event) => event.plans).findIndex((plan) => plan.id === selectedPlan.id)
    : -1;
  const selectPlan = (plan: { id: string; title: string }) => {
    const hydration = useTripStoreHydration.getState();
    if (!hydration.hydrated || hydration.hydrationError) return;
    const state = useTripStore.getState();
    const currentTrip = selectTripBySourceSlug(state, tripId);
    if (!currentTrip || currentTrip.status !== 'guarded' || !currentTrip.guardianEnabled) return;
    try {
      state.selectGuardianPlan(currentTrip.id, plan);
    } catch {
      // The local trip can be removed between the eligibility check and the persisted update.
    }
  };

  return (
    <section aria-label="行程守护风险时间线" className={styles.timeline} role="region">
      <p className={styles.demoNote}>固定沙箱事件，不读取实时位置、天气或航班状态。</p>
      <h2 className={styles.alternativesHeading}>备选方案</h2>
      {events.map((event) => (
        <article className={styles.event} key={event.id}>
          <div className={styles.eventHead}>
            <WarningCircle aria-hidden size={22} weight="fill" />
            <div><p>RISK / {event.status.toUpperCase()}</p><h2>{event.title}</h2></div>
          </div>
          <p>{event.description}</p>
          <small>来源：{event.source} · 证据时间：{event.observedAt}</small>
          <div className={styles.plans}>
            {event.plans.map((plan, index) => (
              <article aria-label={`Plan ${String.fromCharCode(65 + index)}`} className={styles.plan} key={plan.id}>
                <p>PLAN {String.fromCharCode(65 + index)}</p>
                <h3>{plan.title}</h3>
                <dl>
                  <div><dt>成本</dt><dd>{plan.cost}</dd></div>
                  <div><dt>耗时</dt><dd>{plan.duration}</dd></div>
                  <div><dt>风险</dt><dd>{plan.risk}</dd></div>
                </dl>
                <button
                  aria-label={`选择 Plan ${String.fromCharCode(65 + index)}：${plan.title}方案`}
                  aria-pressed={selectedPlan?.id === plan.id}
                  onClick={() => selectPlan({ id: plan.id, title: plan.title })}
                  type="button"
                >
                  选择{plan.title}方案
                </button>
              </article>
            ))}
          </div>
        </article>
      ))}
      {selectedPlan && selectedPlanIndex >= 0 ? (
        <p className={styles.status} role="status">
          已选择 Plan {String.fromCharCode(65 + selectedPlanIndex)}：{selectedPlan.title}；方案已保存到本浏览器的旅行决策，未创建订单
        </p>
      ) : null}
    </section>
  );
}

function TimelineState({
  title,
  message,
  actionHref,
  actionLabel,
  alert = false,
}: {
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
  alert?: boolean;
}) {
  return (
    <section aria-live="polite" className={styles.timelineState} role={alert ? 'alert' : 'status'}>
      <p>LOCAL GUARDIAN</p>
      <h2>{title}</h2>
      <span>{message}</span>
      {actionHref && actionLabel ? <Link href={actionHref}>{actionLabel}</Link> : null}
    </section>
  );
}
