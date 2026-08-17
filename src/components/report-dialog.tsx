'use client';

import { WarningCircle, X } from '@phosphor-icons/react';
import { useRef, useState, type RefObject } from 'react';
import { useDialogFocus } from '@/features/comparison/use-dialog-focus';
import styles from '@/features/comparison/comparison.module.css';

type ReportDialogProps = {
  open: boolean;
  subject: string;
  returnFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
};

const reasons = ['虚假或误导信息', '骚扰、仇恨或不安全内容', '侵权或其他问题'] as const;

export function ReportDialog({ open, subject, returnFocusRef, onClose }: ReportDialogProps) {
  if (!open) return null;
  return <ReportDialogContent onClose={onClose} returnFocusRef={returnFocusRef} subject={subject} />;
}

function ReportDialogContent({ subject, returnFocusRef, onClose }: Omit<ReportDialogProps, 'open'>) {
  const dialogRef = useRef<HTMLElement>(null);
  const [reason, setReason] = useState<string>();
  const [error, setError] = useState<string>();
  const [submitted, setSubmitted] = useState(false);

  function close() {
    returnFocusRef.current?.focus();
    onClose();
  }

  useDialogFocus(true, dialogRef, returnFocusRef, close, submitted);

  if (submitted) {
    return (
      <div className={styles.dialogBackdrop}>
        <section aria-label="举报结果" aria-modal="true" className={styles.confirmDialog} ref={dialogRef} role="dialog" tabIndex={-1}>
          <span className={styles.demoPill}>本地演示处置</span>
          <h2>已记录演示举报</h2>
          <p role="status">仅记录在此浏览器的演示状态，不会联系作者或提交到外部平台。</p>
          <button className={styles.primaryButton} onClick={close} type="button">关闭举报结果</button>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.dialogBackdrop}>
      <section aria-label="举报内容" aria-modal="true" className={styles.confirmDialog} ref={dialogRef} role="dialog" tabIndex={-1}>
        <div className={styles.drawerHeader}>
          <div><p>SAFETY FEEDBACK</p><h2>举报内容</h2></div>
          <button aria-label="取消举报" className={styles.iconButton} onClick={close} type="button"><X aria-hidden size={20} /></button>
        </div>
        <p>你正在举报：{subject}。请勿在举报说明中填写证件、联系方式或支付信息。</p>
        <fieldset>
          <legend>请选择举报原因</legend>
          {reasons.map((item) => (
            <label key={item}><input checked={reason === item} name="report-reason" onChange={() => { setReason(item); setError(undefined); }} type="radio" />{item}</label>
          ))}
        </fieldset>
        {error ? <p role="alert"><WarningCircle aria-hidden size={17} />{error}</p> : null}
        <div>
          <button className={styles.secondaryButton} onClick={close} type="button">取消</button>
          <button className={styles.primaryButton} onClick={() => { if (!reason) { setError('请选择举报原因'); return; } setSubmitted(true); }} type="button">提交举报</button>
        </div>
      </section>
    </div>
  );
}
