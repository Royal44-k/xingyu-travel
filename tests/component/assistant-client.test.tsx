import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { AssistantClient } from '@/features/assistant/assistant-client';
import { useTripStore } from '@/stores/trip-store';

const emergencyResponse = {
  risk_level: 'critical' as const,
  answer: '请立即拨打 110，并按现场官方人员指引行动。',
  alternatives: [
    { id: 'EMERGENCY-110', title: '联系公安机关', cost: '以官方处置为准', duration: '立即执行', risk: '极高', actions: ['拨打 110'] },
    { id: 'EMERGENCY-120', title: '请求医疗急救', cost: '以官方处置为准', duration: '立即执行', risk: '极高', actions: ['拨打 120'] },
    { id: 'EMERGENCY-119', title: '请求消防救援', cost: '以官方处置为准', duration: '立即执行', risk: '极高', actions: ['拨打 119'] },
  ],
  evidence: [{ source: '星屿沙箱应急指引', observed_at: '2026-08-16T09:00:00+08:00' }],
  data_freshness: '固定沙箱快照：2026-08-16 09:00 CST',
  requires_human_help: true,
  demo_mode: true,
  model: 'xingyu-local-demo',
};

beforeEach(() => {
  useTripStore.setState({ trips: {}, partnerIntents: {} });
});

describe('AssistantClient', () => {
  it('shows structured emergency advice with model and evidence labels, then saves a selected plan locally', async () => {
    const user = userEvent.setup();
    const requests: Array<{ tripId: string; question: string }> = [];
    render(
      <AssistantClient
        requestAssistant={async (request) => {
          requests.push(request);
          return emergencyResponse;
        }}
        tripId="dali-slow-5d"
      />,
    );

    await user.click(screen.getByRole('button', { name: '人身安全' }));
    expect(await screen.findByText('请立即拨打 110，并按现场官方人员指引行动。')).toBeInTheDocument();
    expect(requests).toEqual([{ tripId: 'dali-slow-5d', question: '同行者失联且可能有人身危险，我现在应该怎么做？' }]);

    const result = screen.getByRole('region', { name: '旅行助手回答' });
    expect(result).toHaveTextContent('演示引擎：xingyu-local-demo');
    expect(result).toHaveTextContent('证据时间：2026-08-16T09:00:00+08:00');
    expect(result).toHaveTextContent('110');
    expect(within(result).getAllByRole('article', { name: /方案/ })).toHaveLength(3);

    await user.click(within(result).getByRole('button', { name: '选择联系公安机关方案' }));
    expect(screen.getByRole('status')).toHaveTextContent('方案已保存到本浏览器的旅行决策，未创建订单');
    expect(useTripStore.getState().guardianPlans['dali-slow-5d']).toEqual({
      id: 'EMERGENCY-110',
      title: '联系公安机关',
    });
  });
});
