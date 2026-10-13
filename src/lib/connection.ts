import { useSyncExternalStore } from 'react';

/**
 * 연결이 끊겼을 때 — 와이파이가 잠깐 끊기거나 서버가 다시 켜지는 중일 때.
 *
 * 요청을 실패시키지 않고 **줄을 세워 기다리게** 해요. 다시 시도는 2초부터 두 배씩, 30초까지
 * 늘려 가며 하고, 브라우저가 다시 연결됐다고 알리거나(`online`) 사람이 “지금 다시 시도”를
 * 누르면 바로 해요.
 *
 * **보낸 순서대로 하나씩** 다시 보내요. 같은 칸을 두 번 고쳤으면 나중 값이 남아야 해요.
 * 맨 앞 요청이 통하면 다음 요청을 내보내고, 줄이 비면 연결된 것으로 봐요.
 * 끊긴 동안 새로 부른 요청도 바로 보내지 않고 줄 뒤에 서요.
 */

const FIRST_DELAY_MS = 2000;
const MAX_DELAY_MS = 30_000;

type Waiter = { release: () => void };

let offline = false;
/** 줄에서 나가 지금 다시 보내는 중인 요청이 있는가 */
let inFlight = false;
const queue: Waiter[] = [];
let delay = FIRST_DELAY_MS;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

type Snapshot = { offline: boolean; waiting: number };
let snapshot: Snapshot = { offline: false, waiting: 0 };

function notify(): void {
  const waiting = queue.length + (inFlight ? 1 : 0);
  if (snapshot.offline !== offline || snapshot.waiting !== waiting) {
    snapshot = { offline, waiting };
  }
  for (const listener of listeners) listener();
}

function clearTimer(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
}

function schedule(): void {
  clearTimer();
  timer = setTimeout(tryAgainNow, delay);
  delay = Math.min(delay * 2, MAX_DELAY_MS);
}

function onOnline(): void {
  tryAgainNow();
}

function setOffline(next: boolean): void {
  if (offline === next) return;
  offline = next;
  if (typeof window === 'undefined') return;
  if (next) window.addEventListener('online', onOnline);
  else window.removeEventListener('online', onOnline);
}

/** 줄 맨 앞을 내보내요. 줄이 비었으면 연결된 거예요 */
function releaseNext(): void {
  const next = queue.shift();
  if (next) {
    inFlight = true;
    next.release();
  } else {
    inFlight = false;
    setOffline(false);
    delay = FIRST_DELAY_MS;
    clearTimer();
  }
  notify();
}

export function isOffline(): boolean {
  return offline;
}

/** 지금 다시 보내 봐요 — 버튼, `online` 이벤트, 타이머 */
export function tryAgainNow(): void {
  if (!offline || inFlight) return;
  clearTimer();
  releaseNext();
}

/**
 * 연결될 때까지 줄을 서요. `retry`는 줄에서 나갔다가 또 끊긴 요청이에요 — 맨 앞에 다시 서요.
 * `signal`이 끊기면 그 요청만 줄에서 빠져요.
 */
export function waitForConnection(signal?: AbortSignal | null, retry = false): Promise<void> {
  if (retry) inFlight = false;
  if (signal?.aborted) {
    // 다시 보내던 요청이 끊겼으면 다음 요청이 나가야 해요
    if (retry) releaseNext();
    return Promise.reject(signal.reason);
  }
  if (retry) {
    schedule();
  } else if (!offline) {
    setOffline(true);
    schedule();
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      const index = queue.indexOf(waiter);
      if (index >= 0) queue.splice(index, 1);
      if (queue.length === 0 && !inFlight) releaseNext();
      else notify();
      reject(signal?.reason);
    };
    const waiter: Waiter = {
      release: () => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      },
    };
    if (retry) queue.unshift(waiter);
    else queue.push(waiter);
    signal?.addEventListener('abort', onAbort, { once: true });
    notify();
  });
}

/** 줄에서 나간 요청이 서버에 닿았어요(답이 무엇이든). 다음 요청을 내보내요 */
export function connectionSettled(): void {
  delay = FIRST_DELAY_MS;
  releaseNext();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 끊겼는가, 저장 등을 기다리는 요청이 몇 개인가 */
export function useConnection(): Snapshot {
  return useSyncExternalStore(subscribe, () => snapshot);
}
