'use client';

import { ArrowRight, CalendarBlank, CheckCircle, MapPin, ShieldCheck, UsersThree } from '@phosphor-icons/react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { defaultPartnerIntent, demoPartnerCandidates, demoViewerProfile, filterPartnerCandidates, scorePartnerCandidate, type PartnerIntent } from '@/data/partners';
import { hydratePartnerStore, usePartnerStore, usePartnerStoreHydration } from '@/stores/partner-store';
import { IntentForm } from './intent-form';
import styles from './partners.module.css';

export function PartnerMatchExperience() {
  const [published, setPublished] = useState(false);
  const [actionError, setActionError] = useState('');
  const intent = usePartnerStore((state) => state.intents[demoViewerProfile.id]);
  const matches = usePartnerStore((state) => state.matches);
  const blockedCandidateIds = usePartnerStore((state) => state.blockedCandidateIds);
  const publishIntent = usePartnerStore((state) => state.publishIntent);
  const requestMatch = usePartnerStore((state) => state.requestMatch);
  const simulateMutualApproval = usePartnerStore((state) => state.simulateMutualApproval);
  const hydrationError = usePartnerStoreHydration((state) => state.hydrationError);
  const hydrated = usePartnerStoreHydration((state) => state.hydrated);

  useEffect(() => { void hydratePartnerStore(); }, []);
  const candidates = useMemo(() => intent ? filterPartnerCandidates(intent, demoPartnerCandidates, {
    viewerId: demoViewerProfile.id, blockedCandidateIds,
  }) : demoPartnerCandidates, [blockedCandidateIds, intent]);
  const matchByCandidate = useMemo(() => Object.fromEntries(
    Object.values(matches).map((match) => [match.candidateId, match]),
  ), [matches]);

  const handlePublish = (nextIntent: PartnerIntent) => {
    try {
      publishIntent(demoViewerProfile, nextIntent);
      setPublished(true);
      setActionError('');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '匹配意愿暂时无法发布');
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.eyebrow}><span>TRUSTED COMPANIONS</span><span>浏览器本地沙箱</span></div>
        <div className={styles.heroGrid}>
          <div><h1>先谈边界，<br />再一起出发。</h1><p>公开浏览演示搭子卡片。发布、认识、聊天和安全操作均需成年、身份状态已验证且风险状态清晰。</p></div>
          <aside aria-label="演示身份状态"><ShieldCheck aria-hidden size={30} weight="thin" /><p>DEMO IDENTITY STATUS</p><strong>已完成身份状态验证 · 风险状态清晰</strong><span>此处仅展示验证状态，不收集证件号、照片或人脸。</span></aside>
        </div>
      </header>
      {hydrationError && <p className={styles.notice} role="status">本地匹配记录校验失败，已继续使用安全的内存状态；原数据未被覆盖。</p>}
      {hydrated
        ? <IntentForm key={JSON.stringify(intent ?? defaultPartnerIntent)} initialIntent={intent ?? defaultPartnerIntent} onPublish={handlePublish} />
        : <p className={styles.notice} aria-live="polite">正在读取本地匹配意愿…</p>}
      {published && <p className={styles.publishedNotice}><CheckCircle aria-hidden size={18} />已发布到本地演示匹配</p>}
      {actionError && <p className={styles.formError} role="alert">{actionError}</p>}
      <section aria-labelledby="candidate-title" className={styles.candidateSection}>
        <div className={styles.sectionHeading}><div><p>PUBLIC PROFILES / 02</p><h2 id="candidate-title">合拍，也要能说清为什么</h2></div><span>{intent ? `${candidates.length} 位通过硬条件` : '公开卡片可先浏览，发布后计算匹配'}</span></div>
        <div className={styles.cardGrid}>
          {candidates.map((candidate, index) => {
            const scored = intent ? scorePartnerCandidate(intent, candidate) : undefined;
            const match = matchByCandidate[candidate.id];
            return (
              <article className={styles.partnerCard} data-testid={`partner-card-${candidate.id}`} key={candidate.id}>
                <div className={styles.cardTopline}><span>PROFILE {String(index + 1).padStart(2, '0')}</span><span className={styles.verifiedPill}><ShieldCheck aria-hidden size={14} />状态已验证</span></div>
                <div className={styles.profileHeading}><span aria-hidden className={styles.monogram}>{candidate.displayName.slice(0, 1)}</span><div><h3>{candidate.displayName}</h3><p>{candidate.age} 岁 · {candidate.pace}旅行</p></div>{scored && <strong aria-label={`匹配分 ${scored.score}`}><b>{scored.score}</b><small>MATCH</small></strong>}</div>
                <p className={styles.introduction}>{candidate.introduction}</p>
                <div className={styles.profileMeta}><span><MapPin aria-hidden size={16} />{candidate.destination}</span><span><CalendarBlank aria-hidden size={16} />{candidate.startDate} — {candidate.endDate}</span><span><UsersThree aria-hidden size={16} />最多 {candidate.capacity} 人</span></div>
                {scored ? <ol className={styles.reasonList}>{scored.reasons.map((reason, reasonIndex) => <li key={reason}><span>0{reasonIndex + 1}</span>{reason}</li>)}</ol> : <p className={styles.scorePrompt}>发布完整意愿后，将展示固定权重分数与三条主要理由。</p>}
                <div className={styles.cardAction}>
                  {!intent && <span>需先发布完整匹配意愿</span>}
                  {intent && !match && <button onClick={() => requestMatch(demoViewerProfile, candidate.id)} type="button">愿意认识{candidate.displayName}</button>}
                  {match?.status === 'pending_mutual' && <><span>等待对方同意</span><button className={styles.sandboxButton} onClick={() => simulateMutualApproval(demoViewerProfile, match.id)} type="button">模拟对方同意（沙箱）</button></>}
                  {match?.status === 'matched' && <><span>双方已同意</span><Link href={`/chat/${match.id}`}>进入聊天 <ArrowRight aria-hidden size={16} /></Link></>}
                </div>
              </article>
            );
          })}
        </div>
        {intent && candidates.length === 0 && <div className={styles.emptyState}><h3>暂无通过全部硬条件的搭子</h3><p>可调整日期、容量或认证要求；被拉黑与风险受限关系不会重新出现。</p></div>}
      </section>
    </main>
  );
}
