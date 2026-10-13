import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { connectionSettled, isOffline, waitForConnection } from '../lib/connection.ts';
import { ConnectionBanner } from './ConnectionBanner.tsx';

test('끊긴 동안 기다리는 요청 수를 보여주고, 지금 다시 시도할 수 있어요', async () => {
  render(<ConnectionBanner />);
  expect(screen.queryByText('연결이 끊겼어요.')).not.toBeInTheDocument();

  let waiting!: Promise<void>;
  act(() => {
    waiting = waitForConnection();
    void waitForConnection();
  });
  expect(screen.getByRole('status')).toHaveTextContent('기다리는 요청 2개');

  // 맨 앞 요청이 나가요. 아직 줄이 남아 있어 표시는 그대로예요
  fireEvent.click(screen.getByRole('button', { name: '지금 다시 시도' }));
  await waiting;
  expect(isOffline()).toBe(true);

  // 맨 앞이 통하면 다음이 나가고, 그것도 통하면 연결된 거예요
  act(() => connectionSettled());
  act(() => connectionSettled());
  expect(isOffline()).toBe(false);
  expect(screen.queryByText('연결이 끊겼어요.')).not.toBeInTheDocument();
});
