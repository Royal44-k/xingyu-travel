import { describe, expect, it, vi } from 'vitest';
import { QwenProvider } from '@/adapters/qwen/qwen-provider';

const structuredAnswer = {
  risk_level: 'low' as const,
  answer: '这是模型生成的通用行程整理建议，不代表实时事实。',
  alternatives: [
    { id: 'MODEL-A', title: 'Plan A', cost: '¥0', duration: '当天', risk: '低', actions: ['自行核对公开信息'] },
    { id: 'MODEL-B', title: 'Plan B', cost: '¥80', duration: '2小时', risk: '中', actions: ['联系人工顾问'] },
    { id: 'MODEL-C', title: 'Plan C', cost: '¥160', duration: '3小时', risk: '中', actions: ['保留本地行程决定'] },
  ],
  evidence: [],
  data_freshness: '模型回答不含实时数据',
  requires_human_help: false,
  demo_mode: false,
  model: 'untrusted-model-label',
};

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

  it('fails closed when a low-risk model response states unverified real-time or medical facts', async () => {
    const unsafe = { ...structuredAnswer, answer: '当前航班已经延误，医生诊断你需要马上用药。' };

    await expect(provider(async () => qwenResponse(JSON.stringify(unsafe))).answer({
      tripId: 'dali-slow-5d',
      question: '请帮我整理备选行程',
    })).rejects.toThrow('QWEN_PROVIDER_UNSAFE_OUTPUT');
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
