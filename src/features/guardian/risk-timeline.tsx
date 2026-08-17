'use client';

import { WarningCircle } from '@phosphor-icons/react';
import type { GuardianRiskEvent } from '@/data/risk-events';
import { useTripStore } from '@/stores/trip-store';
import styles from './guardian.module.css';

interface RiskTimelineProps { events: GuardianRiskEvent[]; tripId: string; }

export function RiskTimeline({ events, tripId }: RiskTimelineProps) {
  const selectGuardianPlan = useTripStore((state) => state.selectGuardianPlan);
  return (
    <section aria-label="行程守护风险时间线" className={styles.timeline} role="region">
      <p className={styles.demoNote}>固定沙箱事件，不读取实时位置、天气或航班状态。</p>
      {events.map((event) => (
        <article className={styles.event} key={event.id}>
          <div className={styles.eventHead}><WarningCircle aria-hidden size={22} weight="fill" /><div><p>RISK / {event.status.toUpperCase()}</p><h2>{event.title}</h2></div></div>
          <p>{event.description}</p><small>来源：{event.source} · 证据时间：{event.observedAt}</small>
          <div className={styles.plans}>{event.plans.map((plan, index) => <article aria-label={`Plan ${String.fromCharCode(65 + index)}`} className={styles.plan} key={plan.id}><p>PLAN {String.fromCharCode(65 + index)}</p><h3>{plan.title}</h3><dl><div><dt>成本</dt><dd>{plan.cost}</dd></div><div><dt>耗时</dt><dd>{plan.duration}</dd></div><div><dt>风险</dt><dd>{plan.risk}</dd></div></dl><button onClick={() => selectGuardianPlan(tripId, { id: plan.id, title: plan.title })} type="button">选择{plan.title}方案</button></article>)}</div>
        </article>
      ))}
      <p className={styles.status} role="status">方案已保存到本浏览器的旅行决策，未创建订单</p>
    </section>
  );
}
