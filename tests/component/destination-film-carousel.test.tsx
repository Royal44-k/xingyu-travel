import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { posts } from '@/data/posts';
import {
  DestinationFilmCarousel,
  type DestinationFilmItem,
} from '@/features/home/destination-film-carousel';

let reduceMotion = false;

vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>();
  return { ...actual, useReducedMotion: () => reduceMotion };
});

const destinations: readonly DestinationFilmItem[] = posts.slice(0, 4).map((post) => ({
  destination: post.destination,
  title: post.title,
  description: post.excerpt,
  days: post.days,
  season: '初秋',
  image: post.media[0],
  href: `/square/${post.slug}`,
}));

function position() {
  return screen.getByRole('status', { name: '目的地位置' });
}

beforeEach(() => {
  reduceMotion = false;
  vi.useRealTimers();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('DestinationFilmCarousel', () => {
  it('advances every six seconds and pauses while focus remains inside', () => {
    vi.useFakeTimers();
    render(<DestinationFilmCarousel destinations={destinations} intervalMs={6000} />);

    act(() => vi.advanceTimersByTime(6000));
    expect(position()).toHaveTextContent('2 / 4');

    const guilinLink = screen.getByRole('link', { name: /桂林/ });
    guilinLink.focus();
    act(() => vi.advanceTimersByTime(12_000));
    expect(position()).toHaveTextContent('2 / 4');

    fireEvent.blur(guilinLink, { relatedTarget: null });
    act(() => vi.advanceTimersByTime(6000));
    expect(position()).toHaveTextContent('3 / 4');
  });

  it('pauses on hover and while the document is hidden', () => {
    vi.useFakeTimers();
    render(<DestinationFilmCarousel destinations={destinations} intervalMs={6000} />);
    const carousel = screen.getByRole('region', { name: '目的地旅行取景窗' });

    fireEvent.mouseEnter(carousel);
    act(() => vi.advanceTimersByTime(12_000));
    expect(position()).toHaveTextContent('1 / 4');

    fireEvent.mouseLeave(carousel);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    fireEvent(document, new Event('visibilitychange'));
    act(() => vi.advanceTimersByTime(6000));
    expect(position()).toHaveTextContent('1 / 4');

    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    fireEvent(document, new Event('visibilitychange'));
    act(() => vi.advanceTimersByTime(6000));
    expect(position()).toHaveTextContent('2 / 4');
  });

  it('supports pointer drag, arrow buttons, pagination, and Home/End/Arrow keys', async () => {
    const user = userEvent.setup();
    render(<DestinationFilmCarousel destinations={destinations} intervalMs={6000} />);
    const carousel = screen.getByRole('region', { name: '目的地旅行取景窗' });
    const viewport = screen.getByTestId('destination-film-viewport');

    fireEvent.pointerDown(viewport, { clientX: 280, clientY: 120, pointerId: 1 });
    fireEvent.pointerMove(viewport, { clientX: 120, clientY: 126, pointerId: 1 });
    fireEvent.pointerUp(viewport, { clientX: 120, clientY: 126, pointerId: 1 });
    expect(position()).toHaveTextContent('2 / 4');

    await user.click(screen.getByRole('button', { name: '上一个目的地' }));
    expect(position()).toHaveTextContent('1 / 4');
    await user.click(screen.getByRole('button', { name: /查看川西/ }));
    expect(position()).toHaveTextContent('3 / 4');

    carousel.focus();
    await user.keyboard('{Home}{ArrowRight}{End}{ArrowLeft}');
    expect(position()).toHaveTextContent('3 / 4');
    expect(screen.getByRole('button', { name: /查看川西/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('cancels an interrupted pointer gesture without changing destination', () => {
    render(<DestinationFilmCarousel destinations={destinations} intervalMs={6000} />);
    const viewport = screen.getByTestId('destination-film-viewport');

    fireEvent.pointerDown(viewport, { clientX: 280, clientY: 120, pointerId: 1 });
    fireEvent.pointerMove(viewport, { clientX: 120, clientY: 126, pointerId: 1 });
    fireEvent.pointerCancel(viewport, { clientX: 0, clientY: 0, pointerId: 1 });

    expect(position()).toHaveTextContent('1 / 4');
    expect(viewport.style.getPropertyValue('--film-drag-x')).toBe('0px');
  });

  it('disables autoplay and drag parallax when reduced motion is requested', () => {
    reduceMotion = true;
    vi.useFakeTimers();
    render(<DestinationFilmCarousel destinations={destinations} intervalMs={6000} />);
    const viewport = screen.getByTestId('destination-film-viewport');

    act(() => vi.advanceTimersByTime(18_000));
    expect(position()).toHaveTextContent('1 / 4');

    fireEvent.pointerDown(viewport, { clientX: 280, clientY: 120, pointerId: 1 });
    fireEvent.pointerMove(viewport, { clientX: 210, clientY: 122, pointerId: 1 });
    expect(viewport).toHaveAttribute('data-parallax', 'disabled');
    expect(viewport.style.getPropertyValue('--film-drag-x')).toBe('0px');
  });

  it('uses real destination copy, images, and existing guide routes', () => {
    render(<DestinationFilmCarousel destinations={destinations} />);

    expect(screen.getByRole('link', { name: /大理/ })).toHaveAttribute(
      'href',
      '/square/dali-slow-5d',
    );
    expect(screen.getByRole('img', { name: destinations[0].image.alt })).toHaveAttribute(
      'src',
      expect.stringContaining('dali'),
    );
    const activeGuide = screen.getByRole('link', { name: /大理/ }).closest('article');
    expect(activeGuide).not.toBeNull();
    expect(within(activeGuide as HTMLElement).getByText('5 天 · 初秋')).toBeInTheDocument();
  });
});
