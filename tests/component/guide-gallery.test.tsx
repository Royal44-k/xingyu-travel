import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SquarePostPage from '@/app/square/[slug]/page';
import { posts, postsBySlug, type PostMedia } from '@/data/posts';
import { GuideGallery } from '@/features/square/guide-gallery';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: () => ({ push: vi.fn() }),
}));

async function renderSanyaDetail() {
  render(await SquarePostPage({ params: Promise.resolve({ slug: 'sanya-bay-rainforest-5d' }) }));
}

const sanyaImages = postsBySlug['sanya-bay-rainforest-5d'].media;

function renderInvalidGallery(images: readonly PostMedia[]) {
  render(<GuideGallery images={images as never} title="测试目的地" />);
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

  it('handles gallery keys only when the root region itself has focus', async () => {
    const user = userEvent.setup();
    await renderSanyaDetail();
    const gallery = screen.getByRole('region', { name: '三亚攻略图片画廊' });

    gallery.focus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByRole('status', { name: '图片位置' })).toHaveTextContent('3 / 4');

    screen.getByRole('button', { name: '下一张图片' }).focus();
    await user.keyboard('{End}');
    expect(screen.getByRole('status', { name: '图片位置' })).toHaveTextContent('3 / 4');

    screen.getByRole('button', { name: /查看图片 1/ }).focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('status', { name: '图片位置' })).toHaveTextContent('3 / 4');

    fireEvent.error(screen.getByRole('img', { name: /后海村/ }));
    screen.getByRole('button', { name: '重试当前图片' }).focus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('status', { name: '图片位置' })).toHaveTextContent('3 / 4');
  });

  it('changes image only after a sufficiently horizontal swipe on the main viewport', async () => {
    await renderSanyaDetail();
    const gallery = screen.getByRole('region', { name: '三亚攻略图片画廊' });
    const viewport = gallery.firstElementChild as HTMLElement;

    fireEvent.touchStart(viewport, { touches: [{ clientX: 280, clientY: 120 }] });
    fireEvent.touchMove(viewport, { touches: [{ clientX: 240, clientY: 122 }] });
    fireEvent.touchEnd(viewport, { changedTouches: [{ clientX: 240, clientY: 122 }] });
    expect(screen.getByRole('status', { name: '图片位置' })).toHaveTextContent('1 / 4');

    fireEvent.touchStart(viewport, { touches: [{ clientX: 280, clientY: 120 }] });
    fireEvent.touchMove(viewport, { touches: [{ clientX: 200, clientY: 240 }] });
    fireEvent.touchEnd(viewport, { changedTouches: [{ clientX: 200, clientY: 240 }] });
    expect(screen.getByRole('status', { name: '图片位置' })).toHaveTextContent('1 / 4');

    fireEvent.touchStart(viewport, { touches: [{ clientX: 280, clientY: 120 }] });
    fireEvent.touchMove(viewport, { touches: [{ clientX: 120, clientY: 124 }] });
    fireEvent.touchEnd(viewport, { changedTouches: [{ clientX: 120, clientY: 124 }] });

    expect(screen.getByRole('status', { name: '图片位置' })).toHaveTextContent('2 / 4');
  });

  it('leaves the active image unchanged while the thumbnail strip is swiped', async () => {
    await renderSanyaDetail();
    const thumbnails = screen.getByRole('group', { name: '选择攻略图片' });

    fireEvent.touchStart(thumbnails, { touches: [{ clientX: 280, clientY: 40 }] });
    fireEvent.touchMove(thumbnails, { touches: [{ clientX: 120, clientY: 42 }] });
    fireEvent.touchEnd(thumbnails, { changedTouches: [{ clientX: 120, clientY: 42 }] });

    expect(screen.getByRole('status', { name: '图片位置' })).toHaveTextContent('1 / 4');
  });

  it('never advances automatically while the guide is left open', () => {
    vi.useFakeTimers();
    try {
      render(<GuideGallery images={sanyaImages} title="三亚" />);

      act(() => vi.advanceTimersByTime(120_000));

      expect(screen.getByRole('status', { name: '图片位置' })).toHaveTextContent('1 / 4');
    } finally {
      vi.useRealTimers();
    }
  });

  it('fails fast unless both post data and the gallery boundary contain exactly four images', () => {
    expect(posts.map((post) => post.media.length)).toEqual([4, 4, 4, 4, 4, 4, 4, 4]);
    expect(() => renderInvalidGallery(sanyaImages.slice(0, 3))).toThrow(/exactly four/i);
    expect(() => renderInvalidGallery([...sanyaImages, sanyaImages[0]])).toThrow(/exactly four/i);
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
