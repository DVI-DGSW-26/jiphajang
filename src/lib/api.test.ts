import { afterEach, expect, test, vi } from 'vitest';
import { ApiError, apiFetch } from './api.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});

function respondWith(body: string, status: number, contentType = 'application/json') {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(body, { status, headers: { 'Content-Type': contentType } })),
  );
}

async function errorOf(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
  }
  throw new Error('ApiError가 나야 해요');
}

test('서버가 { message }로 답하면 그 문구만 보여줘요', async () => {
  respondWith(JSON.stringify({ message: '‘P-999’는 마스터에 없어요.' }), 400);
  const error = await errorOf(apiFetch('/parts'));
  expect(error.status).toBe(400);
  expect(error.message).toBe('‘P-999’는 마스터에 없어요.');
});

test('JSON이 아니면 글자 그대로, HTML 오류 쪽이면 상태 코드로 말해요', async () => {
  respondWith('잠시 후 다시 해 주세요', 503, 'text/plain');
  expect((await errorOf(apiFetch('/x'))).message).toBe('잠시 후 다시 해 주세요');

  respondWith('<!doctype html><h1>502 Bad Gateway</h1>', 502, 'text/html');
  expect((await errorOf(apiFetch('/x'))).message).toBe('서버가 502로 답했어요.');
});
