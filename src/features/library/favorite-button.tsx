'use client';

import { Heart } from '@phosphor-icons/react';
import { useEffect, useId, useState } from 'react';
import {
  hydrateLibraryStore,
  useLibraryStore,
  useLibraryStoreHydration,
} from '@/stores/library-store';
import styles from './library.module.css';

interface FavoriteButtonProps {
  slug: string;
  label: string;
}

export function FavoriteButton({ slug, label }: FavoriteButtonProps) {
  const liked = useLibraryStore((state) => state.likedPostSlugs.includes(slug));
  const togglePostLike = useLibraryStore((state) => state.togglePostLike);
  const hydrated = useLibraryStoreHydration((state) => state.hydrated);
  const hydrationError = useLibraryStoreHydration((state) => state.hydrationError);
  const hydrationErrorId = useId();
  const [message, setMessage] = useState('');
  const [justLiked, setJustLiked] = useState(false);
  const unavailable = !hydrated || hydrationError;

  useEffect(() => {
    void hydrateLibraryStore();
  }, []);

  function toggleFavorite() {
    if (unavailable) return;
    togglePostLike(slug);
    setMessage(liked ? `已取消喜欢 ${label}` : `已喜欢 ${label}`);
    setJustLiked(!liked);
  }

  return (
    <span className={styles.favoriteControl}>
      <button
        aria-describedby={hydrationError ? hydrationErrorId : undefined}
        aria-label={`喜欢 ${label}`}
        aria-pressed={liked}
        className={styles.favoriteButton}
        data-just-liked={justLiked || undefined}
        disabled={unavailable}
        onAnimationEnd={() => setJustLiked(false)}
        onClick={toggleFavorite}
        type="button"
      >
        <Heart aria-hidden size={20} weight={liked ? 'fill' : 'regular'} />
      </button>
      {!hydrated ? (
        <span className={styles.visuallyHidden} role="status">正在读取本地喜欢状态…</span>
      ) : null}
      {hydrationError ? (
        <span className={styles.errorMessage} id={hydrationErrorId} role="alert">本地喜欢暂不可用</span>
      ) : null}
      {message ? (
        <span aria-live="polite" className={styles.visuallyHidden} role="status">{message}</span>
      ) : null}
    </span>
  );
}
