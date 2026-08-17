import { describe, expect, it, vi } from 'vitest';
import { QwenProvider } from '@/adapters/qwen/qwen-provider';

const structuredAnswer = { intent: 'plan' as const };

function qwenResponse(content: string, status = 200): Response {
  return new Response(JSON.stringify({
    model: 'qwen-plus',
    choices: [{ message: { content } }],
  }), { status });
}

function provider(fetcher: typeof fetch) {
  return new QwenProvider({ apiKey: 'not-a-real-key', model: 'qwen-plus', fetcher });
}

describe('QwenProvider safety boundary', () => {
  it('keeps immediate danger out of the model path and returns the deterministic official emergency response', async () => {
    const fetcher = vi.fn(async () => qwenResponse(JSON.stringify(structuredAnswer))) as unknown as typeof fetch;

    const result = await provider(fetcher).answer({
      tripId: 'dali-slow-5d',
      question: '同行者昏迷、胸痛且呼吸困难',
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(result).toMatchObject({ risk_level: 'critical', requires_human_help: true, demo_mode: true });
    expect(result.answer).toMatch(/110.*120.*119/);
  });

  it('fails closed when a model response includes unverified real-time or medical facts', async () => {
    const unsafe = { ...structuredAnswer, answer: '当前航班已经延误，医生诊断你需要马上用药。' };

    await expect(provider(async () => qwenResponse(JSON.stringify(unsafe))).answer({
      tripId: 'dali-slow-5d',
      question: '请帮我整理备选行程',
    })).rejects.toThrow('QWEN_PROVIDER_INVALID_RESPONSE');
  });

  it('never exposes model-authored answer, plan, evidence, or freshness text without trusted tools', async () => {
    const malicious = {
      ...structuredAnswer,
      answer: '以下为建议。',
      alternatives: [{ id: 'A', title: '模型计划', cost: '1', duration: '1', risk: '低', actions: ['已确诊肺炎，救援十分钟到达'] }],
      evidence: [{ source: 'MU123 将于18:00起飞', observed_at: '现在' }],
      data_freshness: '实时官方确认',
    };

    await expect(provider(async () => qwenResponse(JSON.stringify(malicious))).answer({
      tripId: 'dali-slow-5d',
      question: '帮我规划行程',
    })).rejects.toThrow('QWEN_PROVIDER_INVALID_RESPONSE');
  });

  it('renders the audited local template for an allowed model intent', async () => {
    const result = await provider(async () => qwenResponse(JSON.stringify({ intent: 'disruption' }))).answer({
      tripId: 'dali-slow-5d',
      question: '帮我整理行程',
    });

    expect(result).toMatchObject({
      answer: '这是固定的沙箱演示建议：请先核对行程，再选择备选交通方案。',
      demo_mode: false,
      model: 'qwen-plus',
    });
    expect(result.alternatives.map((alternative) => alternative.id)).toEqual([
      'DEMO-ALT-TRAIN-01',
      'DEMO-ALT-BUS-02',
      'DEMO-ALT-CAR-03',
    ]);
  });

  it('fails closed for an unrecognized model intent', async () => {
    await expect(provider(async () => qwenResponse(JSON.stringify({ intent: 'freeform' }))).answer({
      tripId: 'dali-slow-5d',
      question: '帮我整理行程',
    })).rejects.toThrow('QWEN_PROVIDER_INVALID_RESPONSE');
  });

  it.each([
    ['non-success status', async () => qwenResponse(JSON.stringify(structuredAnswer), 503), 'QWEN_PROVIDER_UNAVAILABLE'],
    ['malformed JSON content', async () => qwenResponse('{not-json'), 'QWEN_PROVIDER_INVALID_RESPONSE'],
    ['schema-invalid content', async () => qwenResponse(JSON.stringify({ ...structuredAnswer, alternatives: [] })), 'QWEN_PROVIDER_INVALID_RESPONSE'],
    ['timeout abort', async () => {
      const error = new Error('upstream timeout');
      error.name = 'AbortError';
      throw error;
    }, 'QWEN_PROVIDER_TIMEOUT'],
  ])('returns a stable non-leaking error for %s', async (_caseName, fetcher, code) => {
    await expect(provider(fetcher as typeof fetch).answer({
      tripId: 'dali-slow-5d',
      question: '请整理行程',
    })).rejects.toThrow(code);
  });
});
