import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { postsBySlug } from '@/data/posts';
import { extractTripDraft } from '@/domain/trips/extract-draft';
import { TripWorkbench } from '@/features/trips/trip-workbench';
import { createTripStore, useTripStore, useTripStoreHydration } from '@/stores/trip-store';

const draft = extractTripDraft(postsBySlug['dali-slow-5d']);

function readyStores() {
  useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
  useTripStore.getState().savePostAsTrip(draft, postsBySlug['dali-slow-5d'].media[0].src);
  useTripStoreHydration.setState({ hydrated: true, hydrationError: false });
}

beforeEach(() => {
  window.localStorage.clear();
  readyStores();
});

afterEach(() => {
  window.localStorage.clear();
  useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
  useTripStoreHydration.setState({ hydrated: false, hydrationError: false });
});

describe('TripWorkbench', () => {
  it('renders the hydrated canonical trip with all five editable itinerary nodes', async () => {
    render(<TripWorkbench slug="dali-slow-5d" />);

    expect(await screen.findByRole('heading', { name: /大理慢行计划/ })).toBeInTheDocument();
    expect(screen.getAllByRole('group', { name: /第 [1-5] 天行程/ })).toHaveLength(5);
    expect(screen.getByText('本地演示工作台')).toBeInTheDocument();
  });

  it('uses the canonical destination and day count for every accepted guide route', async () => {
    const sichuanPost = postsBySlug['sichuan-autumn-road'];
    useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
    useTripStore.getState().savePostAsTrip(extractTripDraft(sichuanPost), sichuanPost.media[0].src);

    render(<TripWorkbench slug={sichuanPost.slug} />);

    expect(await screen.findByRole('heading', { name: '川西慢行计划' })).toBeInTheDocument();
    expect(screen.getByText('LOCAL TRIP / 川西')).toBeInTheDocument();
    expect(screen.getByText(/拆成可以讨论、调整与核算的 6 天/)).toBeInTheDocument();
    expect(screen.getByText('6 个节点 · 自动保存至本浏览器')).toBeInTheDocument();
    expect(screen.queryByText('LOCAL TRIP / DALI')).not.toBeInTheDocument();
  });

  it('edits dates, budget and an itinerary item with validation', async () => {
    const user = userEvent.setup();
    render(<TripWorkbench slug="dali-slow-5d" />);
    await screen.findByRole('heading', { name: /大理慢行计划/ });

    await user.clear(screen.getByLabelText('出发日期'));
    await user.type(screen.getByLabelText('出发日期'), '2026-10-01');
    await user.clear(screen.getByLabelText('返程日期'));
    await user.type(screen.getByLabelText('返程日期'), '2026-09-30');
    await user.click(screen.getByRole('button', { name: '保存行程设置' }));
    expect(screen.getByRole('alert')).toHaveTextContent('返程日期不能早于出发日期');

    await user.clear(screen.getByLabelText('返程日期'));
    await user.type(screen.getByLabelText('返程日期'), '2026-10-05');
    await user.clear(screen.getByLabelText('总预算'));
    await user.type(screen.getByLabelText('总预算'), '6600');
    await user.click(screen.getByRole('button', { name: '保存行程设置' }));
    expect(screen.getByText('行程设置已保存到本浏览器')).toBeInTheDocument();

    const first = screen.getByRole('group', { name: '第 1 天行程' });
    await user.clear(within(first).getByLabelText('标题'));
    await user.type(within(first).getByLabelText('标题'), '先去古城喝茶');
    await user.clear(within(first).getByLabelText('预计花费'));
    await user.type(within(first).getByLabelText('预计花费'), '700');
    await user.click(within(first).getByRole('button', { name: '保存第 1 天' }));
    expect(first).toHaveTextContent('已保存');
  });

  it('reorders nodes accessibly and toggles an alternative', async () => {
    const user = userEvent.setup();
    render(<TripWorkbench slug="dali-slow-5d" />);
    await screen.findByRole('heading', { name: /大理慢行计划/ });
    const secondTitle = '菜场与苍山脚下';

    await user.click(screen.getByRole('button', { name: '上移第 2 天' }));
    const groups = screen.getAllByRole('group', { name: /第 [1-5] 天行程/ });
    expect(within(groups[0]).getByDisplayValue(secondTitle)).toBeInTheDocument();

    await user.click(within(groups[0]).getByRole('button', { name: '标记为备选' }));
    expect(within(groups[0]).getByRole('button', { name: '取消备选' })).toBeInTheDocument();
  });

  it('shows three member votes, replacement semantics and consensus', async () => {
    const user = userEvent.setup();
    render(<TripWorkbench slug="dali-slow-5d" />);
    await screen.findByRole('heading', { name: /大理慢行计划/ });

    expect(screen.getAllByRole('listitem', { name: /演示成员/ })).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: '林见山投票给喜洲稻田骑行' }));
    await user.click(screen.getByRole('button', { name: '木雨投票给喜洲稻田骑行' }));
    expect(screen.getByText('已形成共识：喜洲稻田骑行')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '林见山投票给苍山茶席' }));
    expect(screen.getByText('喜洲稻田骑行 1 票')).toBeInTheDocument();
  });

  it('updates the budget aggregate after an item cost edit', async () => {
    const user = userEvent.setup();
    render(<TripWorkbench slug="dali-slow-5d" />);
    await screen.findByRole('heading', { name: /大理慢行计划/ });
    expect(screen.getByText('¥2,970')).toBeInTheDocument();

    const first = screen.getByRole('group', { name: '第 1 天行程' });
    await user.clear(within(first).getByLabelText('预计花费'));
    await user.type(within(first).getByLabelText('预计花费'), '700');
    await user.click(within(first).getByRole('button', { name: '保存第 1 天' }));
    expect(screen.getByText('¥3,150')).toBeInTheDocument();
  });

  it('links to comparison with the current destination, dates and three travelers', async () => {
    render(<TripWorkbench slug="dali-slow-5d" />);
    await screen.findByRole('heading', { name: /大理慢行计划/ });

    expect(screen.getByRole('link', { name: '进入比价' })).toHaveAttribute(
      'href',
      '/compare?destination=%E5%A4%A7%E7%90%86&from=2026-09-18&to=2026-09-22&travelers=3',
    );
  });

  it('publishes only a visible browser-local partner intent', async () => {
    const user = userEvent.setup();
    render(<TripWorkbench slug="dali-slow-5d" />);
    await screen.findByRole('heading', { name: /大理慢行计划/ });

    await user.click(screen.getByRole('button', { name: '发布搭子意愿' }));
    expect(screen.getByRole('status')).toHaveTextContent('搭子意愿已保存到本浏览器');
    expect(screen.getByRole('status')).toHaveTextContent('未发布到平台');
  });

  it('requires explicit guardian consent and can turn the local demo off again', async () => {
    const user = userEvent.setup();
    render(<TripWorkbench slug="dali-slow-5d" />);
    await screen.findByRole('heading', { name: /大理慢行计划/ });

    const guardian = screen.getByRole('switch', { name: '行程守护演示' });
    await user.click(guardian);
    const dialog = screen.getByRole('dialog', { name: '授权行程守护演示' });
    expect(within(dialog).getByRole('button', { name: '确认开启' })).toBeDisabled();
    await user.click(within(dialog).getByRole('checkbox', { name: /我明确同意/ }));
    await user.click(within(dialog).getByRole('button', { name: '确认开启' }));
    expect(guardian).toBeChecked();
    expect(screen.getByText('仅为本地监测演示，不读取实时位置')).toBeInTheDocument();

    await user.click(guardian);
    expect(guardian).not.toBeChecked();
  });

  it('resets guardian consent through close, Escape and cancel before restoring trigger focus', async () => {
    const user = userEvent.setup();
    render(<TripWorkbench slug="dali-slow-5d" />);
    await screen.findByRole('heading', { name: /大理慢行计划/ });
    const guardian = screen.getByRole('switch', { name: '行程守护演示' });

    const openAndConsent = async () => {
      await user.click(guardian);
      const dialog = screen.getByRole('dialog', { name: '授权行程守护演示' });
      await user.click(within(dialog).getByRole('checkbox', { name: /我明确同意/ }));
      return dialog;
    };
    const expectResetOnReopen = async () => {
      expect(guardian).toHaveFocus();
      await user.click(guardian);
      const dialog = screen.getByRole('dialog', { name: '授权行程守护演示' });
      expect(within(dialog).getByRole('checkbox', { name: /我明确同意/ })).not.toBeChecked();
      expect(within(dialog).getByRole('button', { name: '确认开启' })).toBeDisabled();
      return dialog;
    };

    let dialog = await openAndConsent();
    await user.click(within(dialog).getByRole('button', { name: '关闭守护授权' }));
    dialog = await expectResetOnReopen();
    await user.click(within(dialog).getByRole('checkbox', { name: /我明确同意/ }));
    await user.keyboard('{Escape}');
    dialog = await expectResetOnReopen();
    await user.click(within(dialog).getByRole('checkbox', { name: /我明确同意/ }));
    await user.click(within(dialog).getByRole('button', { name: '取消' }));
    await expectResetOnReopen();
  });

  it('renders and edits an in-memory canonical workbench when persisted hydration fails', async () => {
    const user = userEvent.setup();
    useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
    const persistedStore = createTripStore();
    persistedStore.getState().acceptDraft(draft);
    persistedStore.getState().updateTrip(draft.id, { budget: 6100 });
    useTripStore.setState({ trips: persistedStore.getState().trips });
    useTripStoreHydration.setState({ hydrated: false, hydrationError: false });
    window.localStorage.setItem('xingyu-demo-v1', '{broken');

    render(<TripWorkbench slug="dali-slow-5d" />);

    expect(await screen.findByRole('heading', { name: /大理慢行计划/ })).toBeInTheDocument();
    expect(screen.getByLabelText('总预算')).toHaveValue(6100);
    expect(screen.getByText(/工作台存储校验失败/)).toBeInTheDocument();
    await user.clear(screen.getByLabelText('总预算'));
    await user.type(screen.getByLabelText('总预算'), '6200');
    await user.click(screen.getByRole('button', { name: '保存行程设置' }));
    expect(useTripStore.getState().trips[draft.id].budget).toBe(6200);
  });

  it('recovers without crashing or overwriting valid JSON with malformed workbench structure', async () => {
    useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
    useTripStoreHydration.setState({ hydrated: false, hydrationError: false });
    const malformedBytes = JSON.stringify({
      state: { trips: null, partnerIntents: {} },
      version: 1,
    });
    window.localStorage.setItem('xingyu-demo-v1', malformedBytes);

    render(<TripWorkbench slug="dali-slow-5d" />);

    await waitFor(() => expect(screen.getByText('本地行程暂时无法读取')).toBeInTheDocument());
    expect(window.localStorage.getItem('xingyu-demo-v1')).toBe(malformedBytes);
  });

  it('keeps loading and recovery states stable around canonical hydration', async () => {
    useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
    useTripStoreHydration.setState({ hydrated: false, hydrationError: false });
    render(<TripWorkbench slug="dali-slow-5d" />);
    expect(screen.getByText('正在读取本地行程…')).toBeInTheDocument();

    useTripStoreHydration.setState({ hydrated: true, hydrationError: true });
    await waitFor(() => expect(screen.getByText('本地行程暂时无法读取')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: '返回原攻略' })).toHaveAttribute('href', '/square/dali-slow-5d');
  });

  it('keeps a persisted legacy source slug out of discovery while linking to its current guide', async () => {
    const legacyDraft = {
      ...draft,
      id: 'draft-rainy-mountain-notes',
      sourcePostSlug: 'rainy-mountain-notes',
    };
    useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
    useTripStore.getState().savePostAsTrip(legacyDraft);

    render(<TripWorkbench slug="rainy-mountain-notes" />);

    expect(await screen.findByRole('heading', { name: /大理慢行计划/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回原攻略' })).toHaveAttribute(
      'href',
      '/square/sichuan-autumn-road',
    );
  });
});
