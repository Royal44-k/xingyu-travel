import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST, selectAssistantProvider } from '@/app/api/v1/assistant/route';
import { GET as getGuardian } from '@/app/api/v1/guardian/[tripId]/route';
import { MockAssistantProvider } from '@/adapters/mock/mock-assistant';
import { QwenProvider } from '@/adapters/qwen/qwen-provider';

const environment = { ...process.env };

afterEach(() => {
  process.env = { ...environment };
  vi.restoreAllMocks();
});

describe('assistant provider selection', () => {
  it('keeps the labeled local demo provider unless both Qwen selection and a key are present', () => {
    expect(selectAssistantProvider({ AI_PROVIDER: 'qwen' })).toBeInstanceOf(MockAssistantProvider);
    expect(selectAssistantProvider({ DASHSCOPE_API_KEY: 'secret' })).toBeInstanceOf(MockAssistantProvider);
    expect(selectAssistantProvider({ AI_PROVIDER: 'qwen', DASHSCOPE_API_KEY: 'secret' })).toBeInstanceOf(QwenProvider);
  });
});

describe('assistant route', () => {
  it('returns a labeled structured local-demo response with a request id', async () => {
    process.env.AI_PROVIDER = 'mock';
    const response = await POST(new Request('http://localhost/api/v1/assistant', {
      method: 'POST',
      body: JSON.stringify({ tripId: 'dali-slow-5d', question: '下雨怎么办？' }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      demo_mode: true,
      model: 'xingyu-local-demo',
      request_id: expect.stringMatching(/^req_/),
    });
  });

  it('rejects malformed requests with a stable error that does not expose parser details', async () => {
    const response = await POST(new Request('http://localhost/api/v1/assistant', {
      method: 'POST',
      body: JSON.stringify({ tripId: '', question: '' }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code: 'INVALID_ASSISTANT_REQUEST', message: '助手问题无效，请检查行程和问题后重试。' },
      request_id: expect.any(String),
      demo_mode: true,
    });
  });
});

describe('guardian route', () => {
  it('returns fixed demo risk events with request metadata instead of claiming live monitoring', async () => {
    const response = await getGuardian(new Request('http://localhost/api/v1/guardian/dali-slow-5d'), {
      params: Promise.resolve({ tripId: 'dali-slow-5d' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      demo_mode: true,
      request_id: expect.stringMatching(/^req_/),
      events: [expect.objectContaining({ status: 'notified', source: '星屿沙箱风险事件' })],
    });
  });
});
