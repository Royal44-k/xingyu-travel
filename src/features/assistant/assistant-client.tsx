'use client';

import { PaperPlaneTilt, ShieldWarning, Sparkle } from '@phosphor-icons/react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { AssistantAlternative, AssistantResponse } from '@/domain/assistant/schema';
import {
  hydrateWorkbenchTripStore,
  useTripStore,
  useTripStoreHydration,
} from '@/stores/trip-store';
import { AlternativePlan } from './alternative-plan';
import { createLatestRequestGate } from './request-sequence';
import styles from './assistant.module.css';

const quickQuestions = [
  { label: '规划建议', question: '请为我的行程给出规划建议。' },
  { label: '航班变化', question: '航班变化时我应该如何调整行程？' },
  { label: '天气提醒', question: '下雨天气有哪些安全的备选安排？' },
  { label: '证件准备', question: '出发前需要核对哪些证件？' },
  { label: '人身安全', question: '同行者失联且可能有人身危险，我现在应该怎么做？' },
] as const;

type AssistantRequest = { tripId: string; question: string };

interface AssistantClientProps {
  tripId?: string;
  requestAssistant?: (request: AssistantRequest) => Promise<AssistantResponse>;
}

async function requestFromApi(request: AssistantRequest): Promise<AssistantResponse> {
  const response = await fetch('/api/v1/assistant', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  });
  const payload = await response.json() as AssistantResponse | { error?: { message?: string } };
  if (!response.ok || !('risk_level' in payload)) {
    throw new Error('error' in payload ? payload.error?.message || '助手暂时不可用' : '助手暂时不可用');
  }
  return payload;
}

export function AssistantClient({ tripId, requestAssistant = requestFromApi }: AssistantClientProps) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<AssistantResponse>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>();
  const [selectionError, setSelectionError] = useState<string>();
  const requestGate = useRef(createLatestRequestGate());
  const hydrated = useTripStoreHydration((state) => state.hydrated);
  const hydrationError = useTripStoreHydration((state) => state.hydrationError);
  const contextTrip = useTripStore((state) => {
    if (!tripId) return undefined;
    return state.trips[tripId] ?? Object.values(state.trips).find(
      (trip) => trip.sourcePostSlug === tripId,
    );
  });
  const selectGuardianPlan = useTripStore((state) => state.selectGuardianPlan);
  const canPersistSelection = hydrated && !hydrationError && Boolean(contextTrip);
  const contextIdentity = contextTrip?.id ?? (tripId ? `missing:${tripId}` : 'general-travel-advice');

  useEffect(() => {
    void hydrateWorkbenchTripStore();
  }, []);

  useEffect(() => {
    requestGate.current.start();
    setResult(undefined);
    setError(undefined);
    setLoading(false);
    setSelectedPlanId(undefined);
    setSelectionError(undefined);
  }, [contextIdentity]);

  const ask = async (nextQuestion: string) => {
    if (!nextQuestion.trim() || loading) return;
    const request = requestGate.current.start();
    setLoading(true);
    setResult(undefined);
    setError(undefined);
    setSelectedPlanId(undefined);
    setSelectionError(undefined);
    try {
      const response = await requestAssistant({
        tripId: contextTrip?.id ?? 'general-travel-advice',
        question: nextQuestion,
      });
      if (requestGate.current.isLatest(request)) setResult(response);
    } catch (caught) {
      if (requestGate.current.isLatest(request)) {
        setError(caught instanceof Error ? caught.message : '助手暂时不可用，请稍后重试。');
      }
    } finally {
      if (requestGate.current.isLatest(request)) setLoading(false);
    }
  };

  const selectPlan = (alternative: AssistantAlternative) => {
    if (!canPersistSelection || !contextTrip) return;
    try {
      selectGuardianPlan(contextTrip.id, { id: alternative.id, title: alternative.title });
      setSelectedPlanId(alternative.id);
      setSelectionError(undefined);
    } catch {
      setSelectedPlanId(undefined);
      setSelectionError('方案未能保存到本地行程。你仍可直接参考本次建议，或稍后重试。');
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="assistant-title">
        <p>AI TRAVEL ASSISTANT / DEMO</p>
        <h1 id="assistant-title">把不确定，整理成下一步</h1>
        <span>默认使用清晰标注的本地演示引擎；不会伪造实时航班、天气或官方救援结果。</span>
      </section>

      <section className={styles.askPanel} aria-label="咨询旅行助手">
        <div className={styles.contextCard}>
          {!hydrated ? <p role="status">正在读取本地行程上下文…</p> : null}
          {hydrated && hydrationError ? (
            <div role="alert">
              <strong>本地行程无法安全读取</strong>
              <span>原数据未被覆盖；建议仍可查看，但不会保存到行程。</span>
            </div>
          ) : null}
          {hydrated && !hydrationError && contextTrip ? (
            <div>
              <strong>已关联本地行程</strong>
              <span>{contextTrip.title} · {contextTrip.destination}</span>
            </div>
          ) : null}
          {hydrated && !hydrationError && tripId && !contextTrip ? (
            <div role="status">
              <strong>未找到要关联的本地行程</strong>
              <span>本次按通用旅行问题回答，建议不会保存。</span>
            </div>
          ) : null}
          {hydrated && !hydrationError && !tripId ? (
            <div>
              <strong>当前为通用旅行咨询</strong>
              <span>可直接使用建议，不会自动写入任何行程。</span>
            </div>
          ) : null}
          {hydrated && !canPersistSelection ? (
            <nav aria-label="建立行程上下文">
              <Link href="/square">从攻略创建行程</Link>
              <Link href="/trips">查看我的行程</Link>
            </nav>
          ) : null}
        </div>
        <div className={styles.quickQuestions} aria-label="快捷问题">
          {quickQuestions.map((item) => (
            <button disabled={loading || !hydrated} key={item.label} onClick={() => void ask(item.question)} type="button">{item.label}</button>
          ))}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); void ask(question); }}>
          <label htmlFor="assistant-question">你的问题</label>
          <div>
            <input id="assistant-question" onChange={(event) => setQuestion(event.target.value)} placeholder="例如：下雨后如何调整今天的户外行程？" value={question} />
            <button disabled={loading || !hydrated || !question.trim()} type="submit"><PaperPlaneTilt aria-hidden size={18} />{loading ? '整理中…' : '获取建议'}</button>
          </div>
        </form>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </section>

      {result ? (
        <section aria-label="旅行助手回答" className={styles.result} role="region">
          <div className={styles.resultMeta}>
            <span className={result.risk_level === 'critical' ? styles.critical : undefined}>{result.risk_level === 'critical' ? <ShieldWarning aria-hidden size={18} /> : <Sparkle aria-hidden size={18} />}{result.risk_level === 'critical' ? '需立即人工/官方协助' : '结构化建议'}</span>
            <span>{result.demo_mode ? `演示引擎：${result.model}` : `模型：${result.model}`}</span>
          </div>
          <p className={styles.answer}>{result.answer}</p>
          <p className={styles.freshness}>数据新鲜度：{result.data_freshness}</p>
          <div className={styles.evidence}><strong>证据与时间</strong>{result.evidence.map((item) => <span key={`${item.source}-${item.observed_at}`}>{item.source} · 证据时间：{item.observed_at}</span>)}</div>
          <div className={styles.plans}>{result.alternatives.map((alternative, index) => (
            <AlternativePlan
              alternative={alternative}
              index={index}
              key={alternative.id}
              onSelect={canPersistSelection ? selectPlan : undefined}
              selected={selectedPlanId === alternative.id}
            />
          ))}</div>
          {!canPersistSelection ? <p className={styles.adviceOnly}>这些建议不会保存到行程；你可以直接参考并自行决定下一步。</p> : null}
          {selectionError ? <p className={styles.error} role="alert">{selectionError}</p> : null}
          {selectedPlanId ? <p className={styles.localStatus} role="status">方案已保存到本浏览器的旅行决策，未创建订单</p> : null}
        </section>
      ) : null}
    </main>
  );
}
