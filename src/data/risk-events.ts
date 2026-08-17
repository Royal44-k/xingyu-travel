import type { AssistantAlternative } from '@/domain/assistant/schema';
import type { TripRiskEvent } from '@/domain/trips/state';

export type GuardianRiskEvent = TripRiskEvent & {
  status: 'detected' | 'notified' | 'acknowledged' | 'monitoring' | 'resolved';
  source: string;
  plans: AssistantAlternative[];
};

const demoPlans: AssistantAlternative[] = [
  { id: 'PLAN-A', title: '调整苍山徒步为古城慢游', cost: '预计不增加费用', duration: '当天调整', risk: '低', actions: ['在本地行程中标记室内备选', '关注景区官方公告'] },
  { id: 'PLAN-B', title: '改乘下午交通并延后出发', cost: '以供应商页面为准', duration: '约 3 小时', risk: '中', actions: ['自行核对实时交通', '联系人工顾问确认'] },
  { id: 'PLAN-C', title: '保留原计划并等待官方提示', cost: '无自动下单', duration: '持续观察', risk: '高', actions: ['不进入风险区域', '按官方公告行动'] },
];

export const demoRiskEvents: GuardianRiskEvent[] = [
  {
    id: 'risk-dali-rain-01',
    tripId: 'dali-slow-5d',
    riskLevel: 'high',
    title: '苍山沿线强降雨演示提醒',
    description: '固定沙箱事件：仅用于展示风险提示与备选决策，不代表实时天气或景区状态。',
    observedAt: '2026-08-16T09:00:00+08:00',
    demoMode: true,
    status: 'notified',
    source: '星屿沙箱风险事件',
    plans: demoPlans,
  },
];

export function riskEventsForTrip(tripId: string): GuardianRiskEvent[] {
  return demoRiskEvents.map((event) => ({ ...event, tripId }));
}
