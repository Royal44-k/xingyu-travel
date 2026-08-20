'use client';

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import type { PostMedia } from '@/data/posts';
import styles from './featured-destinations.module.css';

export interface DestinationFilmItem {
  destination: string;
  title: string;
  description: string;
  days: number;
  season: string;
  image: PostMedia;
  href: string;
}

interface DestinationFilmCarouselProps {
  destinations: readonly DestinationFilmItem[];
  intervalMs?: number;
}

interface DragOrigin {
  pointerId: number;
  x: number;
  y: number;
}

const dragThreshold = 64;
const maxDragParallax = 36;

function circularOffset(index: number, activeIndex: number, length: number) {
  let offset = index - activeIndex;
  if (offset > length / 2) offset -= length;
  if (offset < -length / 2) offset += length;
  return offset;
}

export function DestinationFilmCarousel({
  destinations,
  intervalMs = 6000,
}: DestinationFilmCarouselProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const dragOrigin = useRef<DragOrigin | null>(null);
  const pauseState = useRef({
    documentHidden: typeof document !== 'undefined' && document.hidden,
    dragging: false,
    focusWithin: false,
    hovered: false,
  });
  const count = destinations.length;

  const select = useCallback((index: number) => {
    if (count === 0) return;
    setActiveIndex((index + count) % count);
  }, [count]);

  const selectRelative = useCallback((step: number) => {
    if (count === 0) return;
    setActiveIndex((current) => (current + step + count) % count);
  }, [count]);

  useEffect(() => {
    function onVisibilityChange() {
      pauseState.current.documentHidden = document.hidden;
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    if (
      reduceMotion ||
      count < 2
    ) return;

    const timer = window.setInterval(() => {
      const paused = Object.values(pauseState.current).some(Boolean);
      if (!paused) selectRelative(1);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [count, intervalMs, reduceMotion, selectRelative]);

  if (count === 0) return null;

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') selectRelative(-1);
    if (event.key === 'ArrowRight') selectRelative(1);
    if (event.key === 'Home') select(0);
    if (event.key === 'End') select(count - 1);
  }

  function onBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      pauseState.current.focusWithin = false;
    }
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    dragOrigin.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    pauseState.current.dragging = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const origin = dragOrigin.current;
    if (!origin || origin.pointerId !== event.pointerId || reduceMotion) return;
    const distance = event.clientX - origin.x;
    setDragOffset(Math.max(-maxDragParallax, Math.min(maxDragParallax, distance * 0.18)));
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    const origin = dragOrigin.current;
    dragOrigin.current = null;
    pauseState.current.dragging = false;
    setDragOffset(0);
    if (!origin || origin.pointerId !== event.pointerId) return;

    const horizontalDistance = event.clientX - origin.x;
    const verticalDistance = event.clientY - origin.y;
    if (
      Math.abs(horizontalDistance) >= dragThreshold &&
      Math.abs(horizontalDistance) > Math.abs(verticalDistance)
    ) {
      selectRelative(horizontalDistance < 0 ? 1 : -1);
    }
  }

  function cancelDrag() {
    dragOrigin.current = null;
    pauseState.current.dragging = false;
    setDragOffset(0);
  }

  const viewportStyle = {
    '--film-drag-x': reduceMotion ? '0px' : `${dragOffset}px`,
  } as CSSProperties;

  return (
    <section
      aria-label="目的地旅行取景窗"
      className={styles.filmCarousel}
      onBlurCapture={onBlur}
      onFocusCapture={() => { pauseState.current.focusWithin = true; }}
      onKeyDown={onKeyDown}
      onMouseEnter={() => { pauseState.current.hovered = true; }}
      onMouseLeave={() => { pauseState.current.hovered = false; }}
      tabIndex={0}
    >
      <div
        className={styles.filmViewport}
        data-parallax={reduceMotion ? 'disabled' : 'enabled'}
        data-testid="destination-film-viewport"
        onPointerCancel={cancelDrag}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        style={viewportStyle}
      >
        <div className={styles.filmScene}>
          {destinations.map((destination, index) => {
            const offset = circularOffset(index, activeIndex, count);
            const active = offset === 0;
            const adjacent = Math.abs(offset) === 1;
            const visible = active || adjacent;

            return (
              <motion.article
                animate={{
                  opacity: active ? 1 : adjacent ? 0.62 : 0,
                  scale: active ? 1 : 0.88,
                  x: `${offset * 100 - 50}%`,
                }}
                aria-hidden={visible ? undefined : true}
                className={styles.filmCard}
                data-active={active ? 'true' : 'false'}
                key={destination.href}
                transition={reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.62, ease: [0.22, 0.61, 0.36, 1] }}
              >
                <Image
                  alt={destination.image.alt}
                  className={styles.filmImage}
                  fill
                  sizes="(max-width: 720px) 86vw, 60vw"
                  src={destination.image.src}
                />
                <div aria-hidden className={styles.filmScrim} />
                <div className={styles.filmCopy}>
                  <p>{destination.days} 天 · {destination.season}</p>
                  <h3>{destination.destination}</h3>
                  <span>{destination.description}</span>
                  <Link
                    aria-current={active ? 'true' : undefined}
                    href={destination.href}
                    tabIndex={visible ? 0 : -1}
                  >
                    打开{destination.destination}攻略
                    <CaretRight aria-hidden size={18} weight="light" />
                  </Link>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>

      <div className={styles.filmControls}>
        <button aria-label="上一个目的地" onClick={() => selectRelative(-1)} type="button">
          <CaretLeft aria-hidden size={22} weight="light" />
        </button>
        <p aria-label="目的地位置" aria-live="polite" aria-atomic="true" role="status">
          <span>{activeIndex + 1} / {count}</span>
          <span className={styles.srOnly}>，当前目的地：{destinations[activeIndex].destination}</span>
        </p>
        <button aria-label="下一个目的地" onClick={() => selectRelative(1)} type="button">
          <CaretRight aria-hidden size={22} weight="light" />
        </button>
      </div>

      <div aria-label="选择目的地" className={styles.filmPagination} role="group">
        {destinations.map((destination, index) => (
          <button
            aria-label={`查看${destination.destination}`}
            aria-pressed={index === activeIndex}
            key={destination.href}
            onClick={() => select(index)}
            type="button"
          />
        ))}
      </div>
    </section>
  );
}
