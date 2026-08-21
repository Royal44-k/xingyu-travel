import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { posts } from '@/data/posts';
import {
  DestinationFilmCarousel,
  type DestinationFilmItem,
} from '@/features/home/destination-film-carousel';
import { FeaturedDestinations } from '@/features/home/featured-destinations';

let reduceMotion = false;

vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>();
  function MotionArticle({ animate, transition, ...properties }: ComponentProps<'article'> & {
    animate?: unknown;
    transition?: unknown;
  }) {
    void animate;
    void transition;
    return <article {...properties} />;
  }
  return {
    ...actual,
    motion: { article: MotionArticle },
    useReducedMotion: () => reduceMotion,
  };
});

const destinations: readonly DestinationFilmItem[] = posts.slice(0, 4).map((post) => ({
  destination: post.destination,
  title: post.title,
  description: post.excerpt,
  days: post.days,
  season: '初秋',
  image: post.media[0],
  href: `/square/${post.slug}`,
  ctaLabel: `打开${post.destination}攻略`,
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
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('DestinationFilmCarousel', () => {
  it('advances every six seconds and pauses while focus remains inside', () => {
    vi.useFakeTimers();
    render(<DestinationFilmCarousel destinations={destinations} intervalMs={6000} />);

    act(() => vi.advanceTimersByTime(6000));
    expect(position()).toHaveTextContent('2 / 4');

    const guilinLink = screen.getByRole('link', { name: /桂林/ });
    fireEvent.focus(guilinLink);
    act(() => vi.advanceTimersByTime(12_000));
    expect(position()).toHaveTextContent('2 / 4');

    fireEvent.blur(guilinLink, { relatedTarget: null });
    act(() => vi.advanceTimersByTime(6000));
    expect(position()).toHaveTextContent('3 / 4');
  });

  it('gives every resume a fresh six-second dwell without duplicate timers', () => {
    vi.useFakeTimers();
    const timeoutSpy = vi.spyOn(window, 'setTimeout');
    render(<DestinationFilmCarousel destinations={destinations} intervalMs={6000} />);
    const carousel = screen.getByRole('region', { name: '目的地旅行取景窗' });
    const autoplayDeadlineCount = () => timeoutSpy.mock.calls
      .filter(([, delay]) => delay === 6000).length;

    expect(autoplayDeadlineCount()).toBe(1);
    act(() => vi.advanceTimersByTime(5900));
    fireEvent.mouseEnter(carousel);
    act(() => vi.advanceTimersByTime(12_000));
    expect(position()).toHaveTextContent('1 / 4');

    fireEvent.mouseLeave(carousel);
    expect(autoplayDeadlineCount()).toBe(2);
    act(() => vi.advanceTimersByTime(5999));
    expect(position()).toHaveTextContent('1 / 4');
    act(() => vi.advanceTimersByTime(1));
    expect(position()).toHaveTextContent('2 / 4');
    expect(autoplayDeadlineCount()).toBe(3);
  });

  it('keeps a native-clicked control paused until focus leaves, then starts a fresh dwell', () => {
    vi.useFakeTimers();
    render(
      <>
        <DestinationFilmCarousel destinations={destinations} intervalMs={6000} />
        <button type="button">取景窗外的控件</button>
      </>,
    );

    act(() => vi.advanceTimersByTime(5900));
    const nextButton = screen.getByRole('button', { name: '下一个目的地' });
    fireEvent.pointerDown(nextButton, { pointerId: 1 });
    act(() => nextButton.focus());
    fireEvent.pointerUp(nextButton, { pointerId: 1 });
    fireEvent.click(nextButton);
    expect(nextButton).toHaveFocus();
    expect(position()).toHaveTextContent('2 / 4');

    act(() => vi.advanceTimersByTime(12_000));
    expect(position()).toHaveTextContent('2 / 4');

    const outsideButton = screen.getByRole('button', { name: '取景窗外的控件' });
    fireEvent.pointerDown(outsideButton, { pointerId: 2 });
    act(() => outsideButton.focus());
    fireEvent.pointerUp(outsideButton, { pointerId: 2 });
    fireEvent.click(outsideButton);
    expect(outsideButton).toHaveFocus();
    act(() => vi.advanceTimersByTime(5999));
    expect(position()).toHaveTextContent('2 / 4');
    act(() => vi.advanceTimersByTime(1));
    expect(position()).toHaveTextContent('3 / 4');
  });

  it('restarts the autoplay deadline after controls, pagination, and drag selection', () => {
    vi.useFakeTimers();
    render(<DestinationFilmCarousel destinations={destinations} intervalMs={6000} />);
    const viewport = screen.getByTestId('destination-film-viewport');

    act(() => vi.advanceTimersByTime(5900));
    fireEvent.click(screen.getByRole('button', { name: '下一个目的地' }));
    act(() => vi.advanceTimersByTime(5999));
    expect(position()).toHaveTextContent('2 / 4');
    act(() => vi.advanceTimersByTime(1));
    expect(position()).toHaveTextContent('3 / 4');

    act(() => vi.advanceTimersByTime(5900));
    fireEvent.click(screen.getByRole('button', { name: /查看大理/ }));
    act(() => vi.advanceTimersByTime(5999));
    expect(position()).toHaveTextContent('1 / 4');

    fireEvent.pointerDown(viewport, { clientX: 280, clientY: 120, pointerId: 7 });
    fireEvent.pointerMove(viewport, { clientX: 120, clientY: 126, pointerId: 7 });
    fireEvent.pointerUp(viewport, { clientX: 120, clientY: 126, pointerId: 7 });
    expect(position()).toHaveTextContent('2 / 4');
    act(() => vi.advanceTimersByTime(5999));
    expect(position()).toHaveTextContent('2 / 4');
    act(() => vi.advanceTimersByTime(1));
    expect(position()).toHaveTextContent('3 / 4');
    expect(vi.getTimerCount()).toBe(1);
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

  it('lets a nested destination link activate without its pointer being captured', async () => {
    const user = userEvent.setup();
    render(<DestinationFilmCarousel destinations={destinations} intervalMs={6000} />);
    const viewport = screen.getByTestId('destination-film-viewport');
    const setPointerCapture = vi.fn();
    Object.defineProperty(viewport, 'setPointerCapture', {
      configurable: true,
      value: setPointerCapture,
    });
    const link = screen.getByRole('link', { name: /打开大理攻略/ });
    const activated = vi.fn((event: Event) => event.preventDefault());
    link.addEventListener('click', activated);

    await user.pointer({ keys: '[MouseLeft]', target: link });

    expect(setPointerCapture).not.toHaveBeenCalled();
    expect(activated).toHaveBeenCalledOnce();
    expect(link).toHaveAttribute('href', '/square/dali-slow-5d');

    fireEvent.pointerDown(viewport, { clientX: 280, clientY: 120, pointerId: 9 });
    fireEvent.pointerMove(viewport, { clientX: 120, clientY: 126, pointerId: 9 });
    fireEvent.pointerUp(viewport, { clientX: 120, clientY: 126, pointerId: 9 });
    expect(setPointerCapture).toHaveBeenCalledWith(9);
    expect(position()).toHaveTextContent('2 / 4');
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

  it('keeps only the active slide accessible while adjacent image peeks stay visual', () => {
    render(<DestinationFilmCarousel destinations={destinations} />);

    const links = screen.getAllByRole('link', { hidden: true });
    expect(links.filter((link) => link.tabIndex === 0)).toHaveLength(1);
    expect(links[0]).toHaveAttribute('aria-current', 'true');
    expect(links[0].closest('article')).not.toHaveAttribute('aria-hidden');
    for (const link of links.slice(1)) {
      expect(link).toHaveAttribute('tabindex', '-1');
      expect(link.closest('article')).toHaveAttribute('aria-hidden', 'true');
      expect(link.closest('article')).toHaveAttribute('inert');
    }
  });

  it('mounts and prioritizes only the active and adjacent destination images', () => {
    render(<DestinationFilmCarousel destinations={destinations} />);

    const images = screen.getAllByRole('img', { hidden: true });
    expect(images).toHaveLength(3);
    for (const image of images) {
      expect(image).toHaveAttribute('fetchpriority', 'high');
    }
  });

  it('maps eight guides and four discovery cities to complete valid routes', () => {
    render(<FeaturedDestinations />);

    const guideNames = ['大理', '桂林', '川西', '三亚', '杭州', '南京', '上海', '贵州'];
    const discoveryNames = ['北京', '西安', '重庆', '厦门'];
    const destinationNames = [...guideNames, ...discoveryNames];
    expect(screen.getByRole('status', { name: '目的地位置' })).toHaveTextContent('1 / 12');
    for (const destination of destinationNames) {
      expect(screen.getByRole('button', { name: `查看${destination}` })).toBeInTheDocument();
      const action = guideNames.includes(destination)
        ? `打开${destination}攻略`
        : `比价${destination}行程`;
      const link = screen.getByRole('link', { name: action, hidden: true });
      const article = link.closest('article');
      expect(article).not.toBeNull();
      expect(within(article as HTMLElement).getByText(/\d+ 天 · \S+/)).toBeInTheDocument();
      expect(within(article as HTMLElement).getByText(/。$/)).toBeInTheDocument();
    }

    const discoveryRoutes = {
      北京: '/compare?kind=hotel&destination=%E5%8C%97%E4%BA%AC',
      西安: '/compare?kind=hotel&destination=%E8%A5%BF%E5%AE%89',
      重庆: '/compare?kind=hotel&destination=%E9%87%8D%E5%BA%86',
      厦门: '/compare?kind=hotel&destination=%E5%8E%A6%E9%97%A8',
    } as const;
    for (const [destination, href] of Object.entries(discoveryRoutes)) {
      expect(screen.getByRole('link', {
        name: `比价${destination}行程`,
        hidden: true,
      })).toHaveAttribute('href', href);
    }
  });
});
