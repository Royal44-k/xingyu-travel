'use client';

import { FunnelSimple, Sparkle, X } from '@phosphor-icons/react';
import { useState } from 'react';
import type { FeedMode } from '@/data/posts';
import styles from './square.module.css';

interface FeedControlsProps {
  mode: FeedMode;
  onModeChange: (mode: FeedMode) => void;
  interestTags?: readonly string[];
  onClearInterestTags?: () => void;
}

export function FeedControls({
  mode,
  onModeChange,
  interestTags = [],
  onClearInterestTags,
}: FeedControlsProps) {
  const personalized = mode === 'recommended';
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  return (
    <div className={styles.feedControls}>
      <div className={styles.modeButtons} aria-label="攻略排序">
        <button aria-pressed={personalized} className={styles.modeButton} onClick={() => onModeChange('recommended')} type="button">
          <Sparkle aria-hidden size={17} weight="fill" /> 为你推荐
        </button>
        <button aria-pressed={!personalized} className={styles.modeButton} onClick={() => onModeChange('chronological')} type="button">
          按时间排序
        </button>
      </div>
      <div className={styles.preferences}>
        <button aria-expanded={preferencesOpen} aria-label="查看兴趣偏好" className={styles.preferencesTrigger} onClick={() => setPreferencesOpen((open) => !open)} type="button"><FunnelSimple aria-hidden size={16} /> 兴趣偏好</button>
        {preferencesOpen && <div className={styles.preferencePanel}>
          <p>{personalized && interestTags.length ? '推荐会参考这些演示偏好：' : '个性化推荐已关闭，当前按时间排序。'}</p>
          {interestTags.length > 0 && <div className={styles.tagList}>{interestTags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
          {onClearInterestTags && interestTags.length > 0 && (
            <button className={styles.clearButton} onClick={onClearInterestTags} type="button"><X aria-hidden size={15} /> 清除兴趣偏好</button>
          )}
        </div>}
      </div>
    </div>
  );
}
