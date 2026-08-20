'use client';

import { CheckCircle, ShieldCheck, UsersThree, X } from '@phosphor-icons/react';
import { useRef, useState } from 'react';
import { isKnownGuardianTrip } from '@/data/risk-events';
import { useDialogFocus } from '@/features/comparison/use-dialog-focus';
import { demoMembers, type WorkbenchTrip } from '@/stores/trip-store';
import styles from './trips.module.css';

interface DecisionRoomProps {
  trip: WorkbenchTrip;
  partnerIntentPublished: boolean;
  onEnableGuardian: (consent: boolean) => void;
  onPublishPartnerIntent: () => void;
  onVote: (memberId: string, candidateId: string) => void;
}

export function DecisionRoom({
  trip,
  partnerIntentPublished,
  onEnableGuardian,
  onPublishPartnerIntent,
  onVote,
}: DecisionRoomProps) {
  const [guardianDialogOpen, setGuardianDialogOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const guardianSupported = isKnownGuardianTrip(trip.sourcePostSlug);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeGuardianDialog = () => {
    setGuardianDialogOpen(false);
    setConsent(false);
  };
  useDialogFocus(
    guardianDialogOpen,
    dialogRef,
    triggerRef,
    closeGuardianDialog,
  );

  const counts = Object.fromEntries(
    trip.candidates.map((candidate) => [
      candidate.id,
      Object.values(trip.votes).filter((candidateId) => candidateId === candidate.id).length,
    ]),
  );
  const consensus = trip.candidates.find((candidate) => counts[candidate.id] >= 2);

  const toggleGuardian = () => {
    if (trip.guardianEnabled) onEnableGuardian(false);
    else if (guardianSupported) setGuardianDialogOpen(true);
  };

  const confirmGuardian = () => {
    if (!guardianSupported || !consent) return;
    onEnableGuardian(true);
    closeGuardianDialog();
  };

  return (
    <section aria-labelledby="decision-title" className={styles.decisionSection}>
      <div className={styles.sectionHeading}>
        <div><p>DECISION ROOM / 02</p><h2 id="decision-title">同行决策室</h2></div>
        <span>三位演示成员 · 每人一票</span>
      </div>
      <div className={styles.decisionGrid}>
        <div className={styles.candidateColumn}>
          {trip.candidates.map((candidate) => (
            <article className={styles.candidateCard} key={candidate.id}>
              <span>PLAN {candidate.id === 'candidate-a' ? 'A' : 'B'}</span>
              <h3>{candidate.title}</h3>
              <p>{candidate.description}</p>
              <strong>{candidate.title} {counts[candidate.id]} 票</strong>
              <div className={styles.voteButtons}>
                {demoMembers.map((member) => (
                  <button
                    aria-label={`${member.name}投票给${candidate.title}`}
                    aria-pressed={trip.votes[member.id] === candidate.id}
                    key={member.id}
                    onClick={() => onVote(member.id, candidate.id)}
                    type="button"
                  >{member.name.slice(0, 1)}</button>
                ))}
              </div>
            </article>
          ))}
        </div>
        <aside className={styles.roomSidebar}>
          <div className={styles.membersCard}>
            <UsersThree aria-hidden size={24} />
            <h3>本次同行</h3>
            <ul>{demoMembers.map((member) => (
              <li aria-label={`${member.name}演示成员`} key={member.id}>
                <span>{member.name.slice(0, 1)}</span>{member.name}
                <small>{trip.votes[member.id] ? '已投票' : '待决定'}</small>
              </li>
            ))}</ul>
          </div>
          <div aria-live="polite" className={styles.consensusCard}>
            {consensus ? <><CheckCircle aria-hidden size={22} weight="fill" /><strong>已形成共识：{consensus.title}</strong></> : <><span className={styles.pulseDot} /><strong>等待更多意见</strong></>}
          </div>
        </aside>
      </div>

      <div className={styles.localActions}>
        <div><UsersThree aria-hidden size={21} /><span><strong>寻找同行</strong><small>仅创建浏览器本地演示意愿</small></span></div>
        <button disabled={partnerIntentPublished} onClick={onPublishPartnerIntent} type="button">
          {partnerIntentPublished ? '已保存搭子意愿' : '发布搭子意愿'}
        </button>
      </div>
      {partnerIntentPublished && <p className={styles.localConfirmation} role="status">搭子意愿已保存到本浏览器，未发布到平台。</p>}

      <div className={styles.localActions}>
        <div><ShieldCheck aria-hidden size={21} /><span><strong>行程守护</strong><small>{guardianSupported ? '不读取实时坐标，不连接真实监测服务' : '当前守护沙箱只支持大理慢行示例'}</small></span></div>
        <button
          aria-checked={trip.guardianEnabled}
          aria-label="行程守护演示"
          className={styles.switch}
          disabled={!guardianSupported}
          onClick={toggleGuardian}
          ref={triggerRef}
          role="switch"
          type="button"
        ><span /></button>
      </div>
      {trip.guardianEnabled && <p className={styles.guardianNotice}>仅为本地监测演示，不读取实时位置</p>}

      {guardianDialogOpen && (
        <div className={styles.dialogBackdrop}>
          <div
            aria-describedby="guardian-description"
            aria-labelledby="guardian-title"
            aria-modal="true"
            className={styles.guardianDialog}
            ref={dialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <button aria-label="关闭守护授权" className={styles.dialogClose} onClick={closeGuardianDialog} type="button"><X aria-hidden size={20} /></button>
            <ShieldCheck aria-hidden className={styles.dialogIcon} size={32} />
            <p>LOCAL GUARDIAN DEMO</p>
            <h2 id="guardian-title">授权行程守护演示</h2>
            <span id="guardian-description">开启后仅在这个浏览器记录“守护已开启”的演示状态。不会读取位置、联系紧急联系人或发出真实预警。</span>
            <label className={styles.consentLabel}><input checked={consent} onChange={(event) => setConsent(event.target.checked)} type="checkbox" />我明确同意开启本地守护演示</label>
            <div className={styles.guardianDialogActions}>
              <button className={styles.cancelGuardian} onClick={closeGuardianDialog} type="button">取消</button>
              <button className={styles.confirmGuardian} disabled={!consent} onClick={confirmGuardian} type="button">确认开启</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
