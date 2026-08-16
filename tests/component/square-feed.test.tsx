import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FeedControls } from '@/features/square/feed-controls';

describe('FeedControls', () => {
  it('lets users switch off recommendations', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(<FeedControls mode="recommended" onModeChange={change} />);

    await user.click(screen.getByRole('button', { name: '按时间排序' }));

    expect(change).toHaveBeenCalledWith('chronological');
  });

  it('lets users inspect and clear their demo interest tags', async () => {
    const user = userEvent.setup();
    const clear = vi.fn();
    render(
      <FeedControls
        mode="recommended"
        interestTags={['慢旅行', '咖啡']}
        onClearInterestTags={clear}
        onModeChange={() => undefined}
      />,
    );

    await user.click(screen.getByRole('button', { name: '查看兴趣偏好' }));
    expect(screen.getByText('慢旅行')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '清除兴趣偏好' }));
    expect(clear).toHaveBeenCalledOnce();
  });
});
