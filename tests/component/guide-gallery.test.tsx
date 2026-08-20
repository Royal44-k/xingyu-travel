import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SquarePostPage from '@/app/square/[slug]/page';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: () => ({ push: vi.fn() }),
}));

async function renderSanyaDetail() {
  render(await SquarePostPage({ params: Promise.resolve({ slug: 'sanya-bay-rainforest-5d' }) }));
}

describe('GuideGallery', () => {
  it('supports arrow buttons, thumbnails, and Home/End/Arrow keys across four images', async () => {
    const user = userEvent.setup();
    await renderSanyaDetail();

    const gallery = screen.getByRole('region', { name: '三亚攻略图片画廊' });
    expect(screen.getByRole('status', { name: '图片位置' })).toHaveTextContent('1 / 4');
    expect(screen.getByRole('button', { name: /查看图片 1/ })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: '下一张图片' }));
    expect(screen.getByRole('status', { name: '图片位置' })).toHaveTextContent('2 / 4');

    await user.click(screen.getByRole('button', { name: /查看图片 4/ }));
    expect(screen.getByRole('status', { name: '图片位置' })).toHaveTextContent('4 / 4');

    gallery.focus();
    await user.keyboard('{Home}{ArrowRight}{End}{ArrowLeft}');
    expect(screen.getByRole('status', { name: '图片位置' })).toHaveTextContent('3 / 4');
  });

  it('changes image on a horizontal touch swipe without autoplay', async () => {
    await renderSanyaDetail();
    const gallery = screen.getByRole('region', { name: '三亚攻略图片画廊' });

    fireEvent.touchStart(gallery, { touches: [{ clientX: 280, clientY: 120 }] });
    fireEvent.touchMove(gallery, { touches: [{ clientX: 120, clientY: 124 }] });
    fireEvent.touchEnd(gallery, { changedTouches: [{ clientX: 120, clientY: 124 }] });

    expect(screen.getByRole('status', { name: '图片位置' })).toHaveTextContent('2 / 4');
  });

  it('keeps the failed source in a stable frame and retries that same image', async () => {
    const user = userEvent.setup();
    await renderSanyaDetail();
    const image = screen.getByRole('img', { name: /亚龙湾黎明/ });
    const failedSource = image.getAttribute('src');

    fireEvent.error(image);

    expect(screen.getByRole('alert')).toHaveTextContent('亚龙湾黎明');
    expect(screen.getByRole('img', { name: /亚龙湾黎明/ })).toHaveAttribute('src', failedSource);
    await user.click(screen.getByRole('button', { name: '重试当前图片' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /亚龙湾黎明/ })).toHaveAttribute('src', failedSource);
  });
});
