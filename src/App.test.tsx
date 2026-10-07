import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { App } from './App.tsx';

test('상단 바에 로고를 보여줘요', () => {
  render(<App />);
  expect(screen.getByRole('img', { name: '집하장' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('출하 원장');
});
