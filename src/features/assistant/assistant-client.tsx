'use client';

import { PaperPlaneTilt, ShieldWarning, Sparkle } from '@phosphor-icons/react';
import { useState } from 'react';
import type { AssistantAlternative, AssistantResponse } from '@/domain/assistant/schema';
import { useTripStore } from '@/stores/trip-store';
import { AlternativePlan } from './alternative-plan';
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

export function AssistantClient({ tripId = 'dali-slow-5d', requestAssistant = requestFromApi }: AssistantClientProps) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<AssistantResponse>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const selectGuardianPlan = useTripStore((state) => state.selectGuardianPlan);

  const ask = async (nextQuestion: string) => {
    if (!nextQuestion.trim()) return;
    setLoading(true);
    setError(undefined);
    try {
      setResult(await requestAssistant({ tripId, question: nextQuestion }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '助手暂时不可用，请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  const selectPlan = (alternative: AssistantAlternative) => {
    selectGuardianPlan(tripId, { id: alternative.id, title: alternative.title });
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="assistant-title">
        <p>AI TRAVEL ASSISTANT / DEMO</p>
        <h1 id="assistant-title">把不确定，整理成下一步</h1>
        <span>默认使用清晰标注的本地演示引擎；不会伪造实时航班、天气或官方救援结果。</span>
      </section>

      <section className={styles.askPanel} aria-label="咨询旅行助手">
        <div className={styles.quickQuestions} aria-label="快捷问题">
          {quickQuestions.map((item) => (
            <button key={item.label} onClick={() => void ask(item.question)} type="button">{item.label}</button>
          ))}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); void ask(question); }}>
          <label htmlFor="assistant-question">你的问题</label>
          <div>
            <input id="assistant-question" onChange={(event) => setQuestion(event.target.value)} placeholder="例如：下雨后如何调整苍山行程？" value={question} />
            <button disabled={loading || !question.trim()} type="submit"><PaperPlaneTilt aria-hidden size={18} />{loading ? '整理中…' : '获取建议'}</button>
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
          <div className={styles.plans}>{result.alternatives.map((alternative, index) => <AlternativePlan alternative={alternative} index={index} key={alternative.id} onSelect={selectPlan} />)}</div>
          <p className={styles.localStatus} role="status">方案已保存到本浏览器的旅行决策，未创建订单</p>
        </section>
      ) : null}
    </main>
  );
}
