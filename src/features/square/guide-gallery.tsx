'use client';

import { ArrowClockwise, CaretLeft, CaretRight } from '@phosphor-icons/react';
import Image from 'next/image';
import { useRef, useState } from 'react';
import type { PostMedia } from '@/data/posts';
import styles from './square.module.css';

interface GuideGalleryProps {
  images: readonly PostMedia[];
  title: string;
}

export function GuideGallery({ images, title }: GuideGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<ReadonlySet<number>>(() => new Set());
  const [retryVersions, setRetryVersions] = useState<Readonly<Record<number, number>>>({});
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchLatest = useRef<{ x: number; y: number } | null>(null);
  const activeImage = images[activeIndex];

  if (!activeImage) return null;

  function showImage(index: number) {
    const wrappedIndex = (index + images.length) % images.length;
    setActiveIndex(wrappedIndex);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(images.length - 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showImage(activeIndex - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      showImage(activeIndex + 1);
    }
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLElement>) {
    const start = touchStart.current;
    const changedTouch = event.changedTouches[0];
    const end = changedTouch
      ? { x: changedTouch.clientX, y: changedTouch.clientY }
      : touchLatest.current;
    touchStart.current = null;
    touchLatest.current = null;
    if (!start || !end) return;

    const horizontalDistance = end.x - start.x;
    const verticalDistance = end.y - start.y;
    if (Math.abs(horizontalDistance) < 48 || Math.abs(horizontalDistance) <= Math.abs(verticalDistance)) {
      return;
    }
    showImage(activeIndex + (horizontalDistance < 0 ? 1 : -1));
  }

  function retryCurrentImage() {
    setFailedImages((current) => {
      const next = new Set(current);
      next.delete(activeIndex);
      return next;
    });
    setRetryVersions((current) => ({
      ...current,
      [activeIndex]: (current[activeIndex] ?? 0) + 1,
    }));
  }

  const imageFailed = failedImages.has(activeIndex);

  return (
    <section
      aria-label={`${title}攻略图片画廊`}
      className={styles.guideGallery}
      onKeyDown={handleKeyDown}
      onTouchEnd={handleTouchEnd}
      onTouchMove={(event) => {
        const touch = event.touches[0];
        if (touch) touchLatest.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        if (!touch) return;
        const point = { x: touch.clientX, y: touch.clientY };
        touchStart.current = point;
        touchLatest.current = point;
      }}
      role="region"
      tabIndex={0}
    >
      <div className={styles.galleryFrame}>
        <Image
          alt={activeImage.alt}
          className={styles.galleryImage}
          fill
          key={`${activeImage.src}-${retryVersions[activeIndex] ?? 0}`}
          onError={() => setFailedImages((current) => new Set(current).add(activeIndex))}
          onLoad={() => setFailedImages((current) => {
            if (!current.has(activeIndex)) return current;
            const next = new Set(current);
            next.delete(activeIndex);
            return next;
          })}
          priority={activeIndex === 0}
          sizes="(max-width: 900px) 100vw, 70vw"
          src={activeImage.src}
        />

        {imageFailed ? (
          <div className={styles.galleryError} role="alert">
            <strong>{activeImage.alt}</strong>
            <span>图片暂时无法显示，画幅与来源已保留。</span>
            <button onClick={retryCurrentImage} type="button">
              <ArrowClockwise aria-hidden size={17} /> 重试当前图片
            </button>
          </div>
        ) : null}

        <button
          aria-label="上一张图片"
          className={`${styles.galleryArrow} ${styles.galleryArrowPrevious}`}
          onClick={() => showImage(activeIndex - 1)}
          type="button"
        >
          <CaretLeft aria-hidden size={22} weight="bold" />
        </button>
        <button
          aria-label="下一张图片"
          className={`${styles.galleryArrow} ${styles.galleryArrowNext}`}
          onClick={() => showImage(activeIndex + 1)}
          type="button"
        >
          <CaretRight aria-hidden size={22} weight="bold" />
        </button>
        <span aria-label="图片位置" className={styles.galleryPosition} role="status">
          {activeIndex + 1} / {images.length}
        </span>
      </div>

      <div aria-label="选择攻略图片" className={styles.galleryThumbnails} role="group">
        {images.map((image, index) => (
          <button
            aria-label={`查看图片 ${index + 1}：${image.alt}`}
            aria-pressed={index === activeIndex}
            key={image.src}
            onClick={() => setActiveIndex(index)}
            type="button"
          >
            <Image alt="" fill sizes="120px" src={image.src} />
          </button>
        ))}
      </div>
    </section>
  );
}
