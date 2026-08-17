'use client';

import { ArrowSquareOut, WarningCircle, X } from '@phosphor-icons/react';
import { useRef, type RefObject } from 'react';
import { useDialogFocus } from '@/features/comparison/use-dialog-focus';
import styles from '@/features/comparison/comparison.module.css';

type ExternalBookingOffer = {
  provider: string;
  totalPrice: number;
  title?: string;
};

type ExternalBookingDialogProps = {
  open: boolean;
  offer: ExternalBookingOffer;
  returnFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onConfirm: () => void;
};

export function ExternalBookingDialog({
  open,
  offer,
  returnFocusRef,
  onClose,
  onConfirm,
}: ExternalBookingDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);

  function close() {
    returnFocusRef.current?.focus();
    onClose();
  }

  useDialogFocus(open, dialogRef, returnFocusRef, close);

  if (!open) return null;

  return (
    <div className={styles.dialogBackdrop}>
      <section aria-label="前往外部供应商" aria-modal="true" className={styles.confirmDialog} ref={dialogRef} role="dialog" tabIndex={-1}>
        <div className={styles.drawerHeader}>
          <div><p>EXTERNAL BOOKING</p><h2>前往外部供应商</h2></div>
          <button aria-label="取消外部跳转" className={styles.iconButton} onClick={close} type="button"><X aria-hidden size={20} /></button>
        </div>
        <p className={styles.dialogOffer}>{offer.provider} · {offer.title ?? '演示报价'} · ¥{new Intl.NumberFormat('zh-CN').format(offer.totalPrice)} 含税总价</p>
        <p><WarningCircle aria-hidden size={17} /> 外部页面的价格、库存和成交由供应商负责，页面跳转后请重新核验退改与隐私条款。</p>
        <p>不会在行屿完成成交或付款，也不会采集支付信息。</p>
        <p>本地或测试预览中，为避免误导航，确认后只会关闭此说明；受支持的公开部署才会新开旅行搜索页。</p>
        <div>
          <button className={styles.secondaryButton} onClick={close} type="button">取消并留在行屿</button>
          <button className={styles.primaryButton} onClick={() => { onConfirm(); close(); }} type="button">确认前往外部页面 <ArrowSquareOut aria-hidden size={17} /></button>
        </div>
      </section>
    </div>
  );
}
