import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AssistantClient } from '@/features/assistant/assistant-client';
import { postsBySlug } from '@/data/posts';
import { extractTripDraft } from '@/domain/trips/extract-draft';
import { useTripStore, useTripStoreHydration } from '@/stores/trip-store';

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
  window.localStorage.clear();
  useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
  useTripStoreHydration.setState({ hydrated: false, hydrationError: false });
  useTripStore.getState().acceptDraft(extractTripDraft(postsBySlug['dali-slow-5d']));
});

afterEach(() => vi.restoreAllMocks());

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
    expect(requests).toEqual([{ tripId: 'draft-dali-slow-5d', question: '同行者失联且可能有人身危险，我现在应该怎么做？' }]);

    const result = screen.getByRole('region', { name: '旅行助手回答' });
    expect(result).toHaveTextContent('演示引擎：xingyu-local-demo');
    expect(result).toHaveTextContent('证据时间：2026-08-16T09:00:00+08:00');
    expect(result).toHaveTextContent('110');
    expect(within(result).getAllByRole('article', { name: /方案/ })).toHaveLength(3);
    expect(screen.queryByText('方案已保存到本浏览器的旅行决策，未创建订单')).not.toBeInTheDocument();

    await user.click(within(result).getByRole('button', { name: '选择联系公安机关方案' }));
    expect(screen.getByRole('status')).toHaveTextContent('方案已保存到本浏览器的旅行决策，未创建订单');
    expect(useTripStore.getState().guardianPlans['draft-dali-slow-5d']).toEqual({
      id: 'EMERGENCY-110',
      title: '联系公安机关',
    });
  });

  it('reports a browser persistence failure without showing a false saved state', async () => {
    const user = userEvent.setup();
    render(
      <AssistantClient requestAssistant={async () => emergencyResponse} tripId="dali-slow-5d" />,
    );
    await user.click(screen.getByRole('button', { name: '人身安全' }));
    const result = await screen.findByRole('region', { name: '旅行助手回答' });
    const persistedBefore = window.localStorage.getItem('xingyu-demo-v1');
    const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      if (key === 'xingyu-demo-v1') throw new Error('QUOTA_EXCEEDED');
      originalSetItem(key, value);
    });

    await user.click(within(result).getByRole('button', { name: '选择联系公安机关方案' }));

    expect(screen.getByRole('alert')).toHaveTextContent('方案未能保存到本地行程');
    expect(screen.queryByText('方案已保存到本浏览器的旅行决策，未创建订单')).not.toBeInTheDocument();
    expect(useTripStore.getState().guardianPlans['draft-dali-slow-5d']).toBeUndefined();
    expect(window.localStorage.getItem('xingyu-demo-v1')).toBe(persistedBefore);
    setItem.mockRestore();
  });

  it('answers a fresh user without inventing Dali context or offering persistence controls', async () => {
    const user = userEvent.setup();
    const requests: Array<{ tripId: string; question: string }> = [];
    window.localStorage.clear();
    useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
    useTripStoreHydration.setState({ hydrated: false, hydrationError: false });

    render(<AssistantClient requestAssistant={async (request) => {
      requests.push(request);
      return emergencyResponse;
    }} />);

    expect(await screen.findByText('当前为通用旅行咨询')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '人身安全' }));
    const result = await screen.findByRole('region', { name: '旅行助手回答' });

    expect(requests).toEqual([{
      tripId: 'general-travel-advice',
      question: '同行者失联且可能有人身危险，我现在应该怎么做？',
    }]);
    expect(within(result).getAllByRole('article', { name: /方案/ })).toHaveLength(3);
    expect(within(result).queryByRole('button', { name: /选择.+方案/ })).not.toBeInTheDocument();
    expect(result).toHaveTextContent('这些建议不会保存到行程');
    expect(screen.getByRole('link', { name: '从攻略创建行程' })).toHaveAttribute('href', '/square');
    expect(screen.getByRole('link', { name: '查看我的行程' })).toHaveAttribute('href', '/trips');
    expect(screen.queryByText('方案已保存到本浏览器的旅行决策，未创建订单')).not.toBeInTheDocument();
  });

  it('fails closed on malformed trip persistence and preserves the original bytes', async () => {
    const malformedBytes = '{broken-trip-store';
    window.localStorage.clear();
    useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
    useTripStoreHydration.setState({ hydrated: false, hydrationError: false });
    window.localStorage.setItem('xingyu-demo-v1', malformedBytes);

    render(<AssistantClient requestAssistant={async () => emergencyResponse} tripId="dali-slow-5d" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('本地行程无法安全读取');
    expect(screen.getByText(/建议仍可查看，但不会保存到行程/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '从攻略创建行程' })).toHaveAttribute('href', '/square');
    await waitFor(() => expect(useTripStoreHydration.getState()).toEqual({
      hydrated: true,
      hydrationError: true,
    }));
    expect(window.localStorage.getItem('xingyu-demo-v1')).toBe(malformedBytes);
  });

  it('blocks a second shortcut while the current request is pending', async () => {
    const user = userEvent.setup();
    const requests: Array<{ tripId: string; question: string }> = [];
    render(<AssistantClient requestAssistant={(request) => {
      requests.push(request);
      return new Promise(() => undefined);
    }} tripId="dali-slow-5d" />);

    await user.click(screen.getByRole('button', { name: '规划建议' }));
    expect(screen.getByRole('button', { name: '人身安全' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '整理中…' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '人身安全' }));
    expect(requests).toEqual([{ tripId: 'draft-dali-slow-5d', question: '请为我的行程给出规划建议。' }]);
  });

  it('invalidates the previous answer while the latest request is pending and after it fails', async () => {
    const user = userEvent.setup();
    let rejectLatest: ((reason: Error) => void) | undefined;
    const requestAssistant = vi.fn()
      .mockResolvedValueOnce(emergencyResponse)
      .mockImplementationOnce(() => new Promise<never>((_resolve, reject) => {
        rejectLatest = reject;
      }));
    render(<AssistantClient requestAssistant={requestAssistant} tripId="dali-slow-5d" />);

    await user.click(screen.getByRole('button', { name: '人身安全' }));
    const firstResult = await screen.findByRole('region', { name: '旅行助手回答' });
    expect(within(firstResult).getByRole('button', { name: '选择联系公安机关方案' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: '规划建议' }));
    expect(screen.queryByRole('region', { name: '旅行助手回答' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '选择联系公安机关方案' })).not.toBeInTheDocument();

    rejectLatest?.(new Error('LATEST_REQUEST_FAILED'));
    expect(await screen.findByRole('alert')).toHaveTextContent('LATEST_REQUEST_FAILED');
    expect(screen.queryByRole('region', { name: '旅行助手回答' })).not.toBeInTheDocument();
    expect(useTripStore.getState().guardianPlans).toEqual({});
  });

  it('removes a completed answer as soon as its trip context changes', async () => {
    const user = userEvent.setup();
    const sichuanDraft = extractTripDraft(postsBySlug['sichuan-autumn-road']);
    useTripStore.getState().acceptDraft(sichuanDraft);
    const { rerender } = render(
      <AssistantClient requestAssistant={async () => emergencyResponse} tripId="dali-slow-5d" />,
    );

    await user.click(screen.getByRole('button', { name: '人身安全' }));
    expect(await screen.findByRole('region', { name: '旅行助手回答' })).toBeInTheDocument();

    rerender(<AssistantClient requestAssistant={async () => emergencyResponse} tripId="sichuan-autumn-road" />);
    expect(await screen.findByText('川西慢行计划 · 川西')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '旅行助手回答' })).not.toBeInTheDocument();
  });

  it('ignores a response bound to the trip context that was replaced while it was pending', async () => {
    const user = userEvent.setup();
    const sichuanDraft = extractTripDraft(postsBySlug['sichuan-autumn-road']);
    useTripStore.getState().acceptDraft(sichuanDraft);
    let resolveDali: ((response: typeof emergencyResponse) => void) | undefined;
    const requests: Array<{ tripId: string; question: string }> = [];
    const requestAssistant = vi.fn((request: { tripId: string; question: string }) => {
      requests.push(request);
      if (request.tripId === 'draft-dali-slow-5d') {
        return new Promise<typeof emergencyResponse>((resolve) => { resolveDali = resolve; });
      }
      return Promise.resolve(emergencyResponse);
    });
    const { rerender } = render(
      <AssistantClient requestAssistant={requestAssistant} tripId="dali-slow-5d" />,
    );

    await user.click(screen.getByRole('button', { name: '人身安全' }));
    rerender(<AssistantClient requestAssistant={requestAssistant} tripId="sichuan-autumn-road" />);
    expect(await screen.findByText('川西慢行计划 · 川西')).toBeInTheDocument();
    resolveDali?.(emergencyResponse);
    await waitFor(() => expect(screen.getByRole('button', { name: '人身安全' })).toBeEnabled());
    expect(screen.queryByRole('region', { name: '旅行助手回答' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '人身安全' }));
    const result = await screen.findByRole('region', { name: '旅行助手回答' });
    await user.click(within(result).getByRole('button', { name: '选择联系公安机关方案' }));

    expect(requests.map(({ tripId }) => tripId)).toEqual([
      'draft-dali-slow-5d',
      sichuanDraft.id,
    ]);
    expect(useTripStore.getState().guardianPlans['draft-dali-slow-5d']).toBeUndefined();
    expect(useTripStore.getState().guardianPlans[sichuanDraft.id]).toMatchObject({ id: 'EMERGENCY-110' });
  });
});
