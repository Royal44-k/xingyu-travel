import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { defaultPartnerIntent, demoPartnerCandidates, demoViewerProfile } from '@/data/partners';
import { ChatRoom } from '@/features/chat/chat-room';
import { PartnerMatchExperience } from '@/features/partners/match-list';
import { usePartnerStore, usePartnerStoreHydration } from '@/stores/partner-store';

beforeEach(() => {
  window.localStorage.clear();
  usePartnerStore.setState({ intents: {}, matches: {}, visibleMatchIds: [], blockedCandidateIds: [] });
  usePartnerStoreHydration.setState({ hydrated: false, hydrationError: false });
});

describe('partner matching flow', () => {
  it('keeps public cards browseable and validates every required intent before publishing', async () => {
    const user = userEvent.setup();
    render(<PartnerMatchExperience />);

    expect(screen.getByRole('heading', { name: demoPartnerCandidates[0].displayName })).toBeInTheDocument();
    expect(screen.getByText('已完成身份状态验证 · 风险状态清晰')).toBeInTheDocument();
    expect(screen.getByText('此处仅展示验证状态，不收集证件号、照片或人脸。')).toBeInTheDocument();

    const destination = screen.getByLabelText('目的地');
    await user.clear(destination);
    await user.click(screen.getByRole('button', { name: '发布匹配意愿' }));

    expect(screen.getByRole('alert')).toHaveTextContent('请输入目的地');
    expect(screen.queryByText('已发布到本地演示匹配')).not.toBeInTheDocument();
  });

  it('shows exactly three reasons and withholds chat until sandbox mutual approval', async () => {
    const user = userEvent.setup();
    render(<PartnerMatchExperience />);

    await user.click(screen.getByRole('button', { name: '发布匹配意愿' }));
    expect(await screen.findByText('已发布到本地演示匹配')).toBeInTheDocument();
    const card = screen.getByTestId(`partner-card-${demoPartnerCandidates[0].id}`);
    expect(within(card).getByText('92')).toBeInTheDocument();
    expect(within(card).getAllByRole('listitem')).toHaveLength(3);
    expect(within(card).getByText('旅行日期高度重合')).toBeInTheDocument();

    await user.click(within(card).getByRole('button', { name: '愿意认识木雨' }));
    expect(within(card).getByText('等待对方同意')).toBeInTheDocument();
    expect(within(card).queryByRole('link', { name: '进入聊天' })).not.toBeInTheDocument();

    await user.click(within(card).getByRole('button', { name: '模拟对方同意（沙箱）' }));
    expect(within(card).getByText('双方已同意')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: '进入聊天' })).toHaveAttribute('href', expect.stringMatching(/^\/chat\/match-/));
  });
});

describe('matched chat safety flow', () => {
  it('blocks contact details until bilateral consent and warns after permitted send', async () => {
    const user = userEvent.setup();
    const matchId = createMatchedDemo();
    render(<ChatRoom matchId={matchId} />);

    await user.type(screen.getByLabelText('消息'), '加微信 travel_2026');
    await user.click(screen.getByRole('button', { name: '发送' }));
    expect(screen.getByRole('alert')).toHaveTextContent('需先完成单独的双方联系方式同意');
    expect(within(screen.getByRole('list')).queryByText('加微信 travel_2026')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '我同意交换联系方式' }));
    expect(screen.getByText('等待对方单独同意')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '模拟对方同意交换联系方式（沙箱）' }));
    await user.clear(screen.getByLabelText('消息'));
    await user.type(screen.getByLabelText('消息'), '邮箱 me@example.com');
    await user.click(screen.getByRole('button', { name: '发送' }));

    expect(screen.getByText('邮箱 me@example.com')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('仍请谨慎核验并优先使用站内沟通');
  });

  it('acknowledges safety controls, surfaces missed check-in, and locks immediately on block', async () => {
    const user = userEvent.setup();
    const matchId = createMatchedDemo();
    render(<ChatRoom matchId={matchId} />);

    const trustedTrigger = screen.getByRole('button', { name: '可信联系人确认' });
    await user.click(trustedTrigger);
    const dialog = screen.getByRole('dialog', { name: '可信联系人确认' });
    expect(within(dialog).getByRole('checkbox')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: '可信联系人确认' })).not.toBeInTheDocument();
    expect(trustedTrigger).toHaveFocus();

    await user.click(trustedTrigger);
    await user.click(within(screen.getByRole('dialog', { name: '可信联系人确认' })).getByRole('checkbox'));
    await user.click(within(screen.getByRole('dialog', { name: '可信联系人确认' })).getByRole('button', { name: '确认已告知' }));
    expect(screen.getByText('可信联系人已确认')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '共享演示行程' }));
    expect(screen.getByText('演示行程已共享')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '模拟错过签到' }));
    expect(screen.getByRole('alert')).toHaveTextContent('已错过平安签到');

    await user.click(screen.getByRole('button', { name: '拉黑并结束匹配' }));
    expect(screen.getByRole('heading', { name: '此聊天已锁定' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回搭子匹配' })).toHaveAttribute('href', '/partners');
    expect(screen.queryByLabelText('消息')).not.toBeInTheDocument();
  });

  it('guards unknown and unmatched chat ids with a locked recovery state', () => {
    render(<ChatRoom matchId="unknown-match" />);

    expect(screen.getByRole('heading', { name: '聊天暂不可用' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回搭子匹配' })).toHaveAttribute('href', '/partners');
  });
});

function createMatchedDemo() {
  usePartnerStore.getState().publishIntent(demoViewerProfile, defaultPartnerIntent);
  const matchId = usePartnerStore.getState().requestMatch(demoViewerProfile, demoPartnerCandidates[0].id);
  usePartnerStore.getState().simulateMutualApproval(demoViewerProfile, matchId);
  return matchId;
}
