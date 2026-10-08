import { type InputHTMLAttributes, useId } from 'react';
import { type Source, SourceTag } from './SourceTag.tsx';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  /** 자동으로 채운 칸이면 출처. 미색 바탕 + 출처 표시, 직접 입력 칸은 비워 둬요 */
  source?: Source;
  /** 고치는 방법까지 쓴 오류 문구. 칸 아래에 보여요 */
  error?: string;
  /** 도움말. 오류가 있으면 오류만 보여요 */
  hint?: string;
  /** 수량·금액·단가처럼 숫자 칸이면 Mono 글꼴에 오른쪽 정렬 */
  numeric?: boolean;
};

/**
 * 입력칸 — 디자인 매뉴얼 7장. 라벨은 항상 위, 오류 문구는 칸 아래.
 * 마스터에서 고른 값은 `코드 · 이름`으로 넘겨요(예: `P-110 · 품명`).
 */
export function Field({ label, source, error, hint, numeric, className, ...inputProps }: Props) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  const inputClass = [
    'jh-input',
    source && 'jh-input--auto',
    numeric && 'jh-input--number',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="jh-field">
      <label className="jh-field__label" htmlFor={id}>
        {label}
      </label>
      <div className="jh-field__control">
        <input
          {...inputProps}
          id={id}
          className={inputClass}
          inputMode={numeric ? 'decimal' : inputProps.inputMode}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
        />
        {source && <SourceTag source={source} />}
      </div>
      {message && (
        <p id={messageId} className={error ? 'jh-field__error' : 'jh-field__hint'}>
          {message}
        </p>
      )}
    </div>
  );
}
