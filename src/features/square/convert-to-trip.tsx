'use client';

import { ArrowRight, CheckCircle, X } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { TravelPost } from '@/data/posts';
import { extractTripDraft } from '@/domain/trips/extract-draft';
import { useDialogFocus } from '@/features/comparison/use-dialog-focus';
import { hydrateWorkbenchTripStore, useTripStore, useTripStoreHydration } from '@/stores/trip-store';
import styles from './square.module.css';

interface ConvertToTripProps {
  post: TravelPost;
  onNavigate?: (href: string) => void;
}

export function ConvertToTrip({ post, onNavigate }: ConvertToTripProps) {
  const router = useRouter();
  const savePostAsTrip = useTripStore((state) => state.savePostAsTrip);
  const existingTrip = useTripStore((state) => Object.values(state.trips).find(
    (trip) => trip.sourcePostSlug === post.slug,
  ));
  const hydrated = useTripStoreHydration((state) => state.hydrated);
  const hydrationError = useTripStoreHydration((state) => state.hydrationError);
  const readyToConvert = hydrated && !hydrationError;
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const draft = extractTripDraft(post);
  useDialogFocus(open, dialogRef, triggerRef, () => setOpen(false));

  useEffect(() => {
    void hydrateWorkbenchTripStore();
  }, []);

  const navigateToTrip = () => {
    const href = `/trips/${post.slug}`;
    if (onNavigate) onNavigate(href);
    else router.push(href);
  };

  const openOrEnterTrip = () => {
    if (!readyToConvert) return;
    if (existingTrip) navigateToTrip();
    else setOpen(true);
  };

  const confirm = () => {
    if (!readyToConvert) return;
    savePostAsTrip(draft, post.media[0]?.src);
    setOpen(false);
    navigateToTrip();
  };

  return (
    <>
      <button aria-describedby={readyToConvert ? undefined : hydrationError ? 'trip-store-error' : 'trip-store-loading'} className={styles.convertButton} disabled={!readyToConvert} onClick={openOrEnterTrip} ref={triggerRef} type="button">{existingTrip ? '已在我的行程中' : '转为行程'} <ArrowRight aria-hidden size={18} /></button>
      {!hydrated && <p className={styles.hydrationNotice} id="trip-store-loading" role="status">正在读取本地行程…</p>}
      {hydrationError && <p className={styles.hydrationNotice} id="trip-store-error" role="alert">本地行程暂时无法读取，无法转为行程。浏览器中的数据未被覆盖。</p>}
      {open && (
        <div className={styles.dialogBackdrop}>
          <div aria-describedby="trip-review-description" aria-labelledby="trip-review-title" aria-modal="true" className={styles.reviewDrawer} ref={dialogRef} role="dialog" tabIndex={-1}>
            <div className={styles.drawerHeader}><div><p>本地沙箱草稿</p><h2 id="trip-review-title">确认行程草稿</h2></div><button aria-label="关闭行程审核" onClick={() => setOpen(false)} type="button"><X aria-hidden size={22} /></button></div>
            <p id="trip-review-description">请先核对信息。确认后仅保存到本浏览器的“我的行程”，不会预订或发布。</p>
            <dl className={styles.draftSummary}><div><dt>目的地</dt><dd>{draft.destination}</dd></div><div><dt>天数</dt><dd>{draft.days} 天</dd></div><div><dt>预算</dt><dd>¥{draft.budget.toLocaleString('zh-CN')}</dd></div></dl>
            <ol className={styles.draftItems}>{draft.items.map((item) => <li key={item.id}><span>DAY {item.day}</span><div><strong>{item.title}</strong><p>{item.location} · {item.description}</p></div></li>)}</ol>
            <button className={styles.confirmButton} onClick={confirm} type="button"><CheckCircle aria-hidden size={19} weight="fill" /> 确认并保存行程</button>
          </div>
        </div>
      )}
    </>
  );
}
