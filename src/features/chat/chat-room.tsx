'use client';

import { CheckCircle, Flag, LinkSimple, ShieldCheck, UserMinus, UsersThree, WarningCircle } from '@phosphor-icons/react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { SafetyConsent } from '@/components/safety-consent';
import { demoPartnerCandidates, demoViewerProfile } from '@/data/partners';
import { hydratePartnerStore, usePartnerStore, usePartnerStoreHydration } from '@/stores/partner-store';
import styles from './chat.module.css';

export function ChatRoom({ matchId }: { matchId: string }) {
  const match = usePartnerStore((state) => state.matches[matchId]);
  const sendMessage = usePartnerStore((state) => state.sendMessage);
  const setContactConsent = usePartnerStore((state) => state.setContactConsent);
  const acknowledgeTrustedContact = usePartnerStore((state) => state.acknowledgeTrustedContact);
  const shareTrip = usePartnerStore((state) => state.shareTrip);
  const recordCheckIn = usePartnerStore((state) => state.recordCheckIn);
  const blockMatch = usePartnerStore((state) => state.blockMatch);
  const reportMatch = usePartnerStore((state) => state.reportMatch);
  const hydrationError = usePartnerStoreHydration((state) => state.hydrationError);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState('');
  const [sendWarning, setSendWarning] = useState('');
  const [trustedOpen, setTrustedOpen] = useState(false);
  const trustedTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { void hydratePartnerStore(); }, []);

  if (!match) return <LockedChat title="聊天暂不可用" message="找不到这条本地演示匹配，或它从未完成双方同意。" />;
  if (match.viewerId !== demoViewerProfile.id) {
    return <LockedChat title="聊天暂不可用" message="这条本地演示匹配不属于当前演示身份。" />;
  }
  if (match.status !== 'matched') {
    return <LockedChat title={match.status === 'blocked' || match.status === 'reported' ? '此聊天已锁定' : '聊天暂不可用'} message={match.status === 'pending_mutual' ? '只有双方明确同意后才会开放聊天。' : '拉黑或举报会立即结束匹配，聊天不可恢复。'} />;
  }
  const candidate = demoPartnerCandidates.find(({ id }) => id === match.candidateId);
  if (!candidate) return <LockedChat title="聊天暂不可用" message="搭子公开资料已不可用，请返回匹配页。" />;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const result = sendMessage(demoViewerProfile, matchId, draft);
      if (!result.sent) {
        setSendError('检测到电话、邮箱或微信等联系方式。需先完成单独的双方联系方式同意。');
        setSendWarning('');
        return;
      }
      setDraft('');
      setSendError('');
      setSendWarning(result.warning ?? '');
    } catch (error) {
      setSendError(error instanceof Error && error.message === 'PARTNER_EMPTY_MESSAGE' ? '请输入消息内容' : '消息暂时无法发送');
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.chatHeader}>
        <div><p>MUTUAL MATCH · SANDBOX</p><h1>与 {candidate.displayName} 的会话</h1><span><ShieldCheck aria-hidden size={16} />双方已同意 · 本地演示聊天，无实时服务或后台连接</span></div>
        <Link href="/partners">返回搭子匹配</Link>
      </header>
      <p className={styles.safetyNotice} role="note">请勿在聊天中交换身份证件、精确位置、支付信息或其他敏感信息；涉及联系方式时需双方单独同意。</p>
      {hydrationError && <p className={styles.warningBar}>本地聊天记录校验失败，已使用安全的内存状态。</p>}
      <div className={styles.chatLayout}>
        <section aria-labelledby="messages-title" className={styles.conversation}>
          <div className={styles.conversationHeading}><div><p>PRIVATE DEMO ROOM</p><h2 id="messages-title">对话记录</h2></div><span>仅当前浏览器</span></div>
          <ol aria-live="polite" className={styles.messageList}>
            <li className={styles.candidateMessage}><small>{candidate.displayName} · 沙箱示例</small><p>你好，我们可以先从路线节奏和住宿边界聊起。</p></li>
            {match.messages.map((message) => <li className={styles.viewerMessage} key={message.id}><small>我 · 本地演示</small><p>{message.body}</p></li>)}
          </ol>
          <form className={styles.composer} onSubmit={submit}>
            <label htmlFor="chat-message">消息</label>
            <textarea id="chat-message" maxLength={1000} onChange={(event) => setDraft(event.target.value)} placeholder="先聊路线与边界；联系方式需双方单独同意" rows={3} value={draft} />
            <button type="submit">发送</button>
          </form>
          {sendError && <p className={styles.inlineError} role="alert">{sendError}</p>}
          {sendWarning && <p className={styles.inlineWarning} role="status">{sendWarning}</p>}
        </section>

        <aside className={styles.safetyRail}>
          <section><p>CONTACT CONSENT</p><h2>联系方式双向同意</h2><span>普通消息无需同意；电话、邮箱、微信或其他账号需两边分别确认。</span>
            <div className={styles.consentActions}>
              <button aria-pressed={match.viewerContactConsent} onClick={() => setContactConsent(demoViewerProfile, matchId, 'viewer', true)} type="button">{match.viewerContactConsent ? '我已同意' : '我同意交换联系方式'}</button>
              {match.viewerContactConsent && !match.candidateContactConsent && <span>等待对方单独同意</span>}
              <button aria-pressed={match.candidateContactConsent} onClick={() => setContactConsent(demoViewerProfile, matchId, 'candidate', true)} type="button">{match.candidateContactConsent ? '对方已模拟同意' : '模拟对方同意交换联系方式（沙箱）'}</button>
            </div>
          </section>
          <section><p>SAFETY TOOLS</p><h2>出发前的安全约定</h2><div className={styles.safetyActions}>
            <button onClick={() => setTrustedOpen(true)} ref={trustedTriggerRef} type="button"><UsersThree aria-hidden size={18} />可信联系人确认</button>
            {match.trustedContactAcknowledged && <span><CheckCircle aria-hidden size={15} />可信联系人已确认</span>}
            <button onClick={() => shareTrip(demoViewerProfile, matchId)} type="button"><LinkSimple aria-hidden size={18} />共享演示行程</button>
            {match.tripShared && <span><CheckCircle aria-hidden size={15} />演示行程已共享</span>}
            <button onClick={() => recordCheckIn(demoViewerProfile, matchId, 'checked_in')} type="button"><ShieldCheck aria-hidden size={18} />平安签到</button>
            <button onClick={() => recordCheckIn(demoViewerProfile, matchId, 'missed')} type="button"><WarningCircle aria-hidden size={18} />模拟错过签到</button>
            {match.checkInStatus === 'checked_in' && <span><CheckCircle aria-hidden size={15} />本次平安签到已记录</span>}
            {match.checkInStatus === 'missed' && <span className={styles.missedNotice} role="alert"><WarningCircle aria-hidden size={16} />已错过平安签到。请优先通过站内消息确认，并联系你已告知的可信联系人；本演示不会自动报警。</span>}
          </div></section>
          <section className={styles.dangerZone}><p>END MATCH</p><h2>结束这段匹配</h2><span>举报或拉黑会立即移除并锁定会话。</span><div><button onClick={() => reportMatch(demoViewerProfile, matchId)} type="button"><Flag aria-hidden size={17} />举报并结束匹配</button><button onClick={() => blockMatch(demoViewerProfile, matchId)} type="button"><UserMinus aria-hidden size={17} />拉黑并结束匹配</button></div></section>
        </aside>
      </div>
      <SafetyConsent open={trustedOpen} returnFocusRef={trustedTriggerRef} onClose={() => setTrustedOpen(false)} onConfirm={() => acknowledgeTrustedContact(demoViewerProfile, matchId)} />
    </main>
  );
}

function LockedChat({ title, message }: { title: string; message: string }) {
  return <main className={styles.lockedPage}><section><p>LOCAL CHAT GUARD</p><h1>{title}</h1><span>{message}</span><Link href="/partners">返回搭子匹配</Link></section></main>;
}
