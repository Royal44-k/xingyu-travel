'use client';

import { X } from '@phosphor-icons/react';
import { useRef, useState } from 'react';
import { useDialogFocus } from '@/features/comparison/use-dialog-focus';
import styles from '@/features/chat/chat.module.css';

export function SafetyConsent({ open, returnFocusRef, onClose, onConfirm }: {
  open: boolean;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [consented, setConsented] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const close = () => { setConsented(false); onClose(); };
  useDialogFocus(open, dialogRef, returnFocusRef, close);
  if (!open) return null;

  return (
    <div className={styles.dialogBackdrop}>
      <div aria-labelledby="trusted-contact-title" aria-modal="true" className={styles.safetyDialog} ref={dialogRef} role="dialog">
        <label className={styles.consentCheck}><input checked={consented} onChange={(event) => setConsented(event.target.checked)} type="checkbox" /><span>我已告知可信联系人本次结伴信息，并确认共享内容不含精确实时坐标。</span></label>
        <button aria-label="关闭可信联系人确认" className={styles.dialogClose} onClick={close} type="button"><X aria-hidden size={20} /></button>
        <p>SAFETY ACKNOWLEDGEMENT</p><h2 id="trusted-contact-title">可信联系人确认</h2>
        <span>这是浏览器本地演示确认，不会向任何联系人自动发送消息，也不会上传身份材料。</span>
        <button className={styles.confirmButton} disabled={!consented} onClick={() => { onConfirm(); close(); }} type="button">确认已告知</button>
      </div>
    </div>
  );
}
