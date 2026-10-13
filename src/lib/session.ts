import { useSyncExternalStore } from 'react';
import { setToken } from './auth.ts';

/**
 * 로그인 만료 — 화면을 켜 둔 채 로그인이 끝났을 때.
 *
 * 들어온 뒤의 401은 토큰이 끝났다는 뜻이에요(`apiFetch`가 갱신을 먼저 해 봐요).
 * 그때 **화면을 떠나지 않아요.** 요청은 실패시키지 않고 여기서 기다리게 하고, 화면은
 * “다시 로그인” 창을 띄워요(`SessionExpiredDialog`). 다시 로그인하면 기다리던 요청이
 * 새 토큰으로 그대로 다시 가요 — 고치던 값이 사라지지 않아요.
 */

let expired = false;
let resumed: Promise<void> | null = null;
let resume: (() => void) | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function isSessionExpired(): boolean {
  return expired;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 로그인이 끝나 다시 로그인을 기다리는 중인가 */
export function useSessionExpired(): boolean {
  return useSyncExternalStore(subscribe, isSessionExpired);
}

/**
 * 로그인이 끝났다고 알리고 다시 로그인할 때까지 기다려요.
 * 여러 요청이 함께 기다려도 창은 하나예요. `signal`이 끊기면 그 요청만 그만 기다려요.
 */
export function waitForLogin(signal?: AbortSignal | null): Promise<void> {
  if (!resumed) {
    expired = true;
    resumed = new Promise((resolve) => {
      resume = resolve;
    });
    notify();
  }
  const pending = resumed;
  if (!signal) return pending;
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    pending.then(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    });
  });
}

/** 같은 사람으로 다시 로그인했어요. 기다리던 요청이 새 토큰으로 다시 가요 */
export function resumeSession(token: string): void {
  setToken(token);
  expired = false;
  resume?.();
  resume = null;
  resumed = null;
  notify();
}
