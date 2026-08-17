import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ExternalBookingDialog } from '@/components/external-booking-dialog';
import { ReportDialog } from '@/components/report-dialog';
import { posts } from '@/data/posts';
import { PostCard } from '@/features/square/post-card';

describe('ReportDialog', () => {
  it('validates a reason and records only a local demo disposition', async () => {
    const user = userEvent.setup();
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const onClose = vi.fn();
    render(<ReportDialog onClose={onClose} open returnFocusRef={{ current: trigger }} subject="大理五日慢游" />);

    const dialog = screen.getByRole('dialog', { name: '举报内容' });
    await user.click(within(dialog).getByRole('button', { name: '提交举报' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('请选择举报原因');
    await user.click(within(dialog).getByRole('radio', { name: '虚假或误导信息' }));
    await user.click(within(dialog).getByRole('button', { name: '提交举报' }));

    expect(screen.getByRole('status')).toHaveTextContent('仅记录在此浏览器的演示状态，不会联系作者或提交到外部平台');
    await user.click(screen.getByRole('button', { name: '关闭举报结果' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it('resets a completed local report before the dialog is opened for another post', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ReportDialog onClose={() => undefined} open returnFocusRef={createRef<HTMLButtonElement>()} subject="第一篇攻略" />,
    );

    await user.click(screen.getByRole('radio', { name: '虚假或误导信息' }));
    await user.click(screen.getByRole('button', { name: '提交举报' }));
    expect(screen.getByRole('dialog', { name: '举报结果' })).toBeInTheDocument();
    rerender(<ReportDialog onClose={() => undefined} open={false} returnFocusRef={createRef<HTMLButtonElement>()} subject="第一篇攻略" />);
    rerender(<ReportDialog onClose={() => undefined} open returnFocusRef={createRef<HTMLButtonElement>()} subject="另一篇攻略" />);

    expect(screen.getByRole('dialog', { name: '举报内容' })).toHaveTextContent('另一篇攻略');
  });

  it('moves focus into the report result and keeps its keyboard trap until close', async () => {
    const user = userEvent.setup();
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const onClose = vi.fn();
    render(<ReportDialog onClose={onClose} open returnFocusRef={{ current: trigger }} subject="大理五日慢游" />);

    await user.click(screen.getByRole('radio', { name: '虚假或误导信息' }));
    await user.click(screen.getByRole('button', { name: '提交举报' }));

    const close = screen.getByRole('button', { name: '关闭举报结果' });
    expect(close).toHaveFocus();
    await user.keyboard('{Tab}');
    expect(close).toHaveFocus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(close).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});

describe('square report entry point', () => {
  it('opens the validated report dialog from a public post card', async () => {
    const user = userEvent.setup();
    render(<PostCard post={posts[0]} />);

    await user.click(screen.getByRole('button', { name: `举报 ${posts[0].title}` }));
    expect(screen.getByRole('dialog', { name: '举报内容' })).toHaveTextContent(posts[0].title);
  });
});

describe('ExternalBookingDialog', () => {
  it('requires confirmation before invoking the external booking action and restores trigger focus on cancel', async () => {
    const user = userEvent.setup();
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ExternalBookingDialog
        onClose={onClose}
        onConfirm={onConfirm}
        offer={{ provider: '云程旅行', totalPrice: 1020, title: '上海至大理演示航班' }}
        open
        returnFocusRef={{ current: trigger }}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: '前往外部供应商' });
    expect(dialog).toHaveTextContent('外部页面的价格、库存和成交由供应商负责');
    expect(dialog).toHaveTextContent('不会在行屿完成成交或付款');
    await user.click(within(dialog).getByRole('button', { name: '取消并留在行屿' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it('only calls the supplied external action after confirmation', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ExternalBookingDialog
        onClose={() => undefined}
        onConfirm={onConfirm}
        offer={{ provider: '云程旅行', totalPrice: 1020, title: '上海至大理演示航班' }}
        open
        returnFocusRef={createRef<HTMLButtonElement>()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '确认前往外部页面' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
