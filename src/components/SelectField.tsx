import { type SelectHTMLAttributes, useId } from 'react';

export type SelectOption = { value: string; label: string };

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  label: string;
  options: SelectOption[];
  /** 아직 고르지 않았을 때 보일 글자 */
  placeholder?: string;
  error?: string;
  hint?: string;
};

/** 고르기 칸. 라벨·오류 문구 자리는 `Field`와 같아요 */
export function SelectField({ label, options, placeholder, error, hint, ...selectProps }: Props) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className="jh-field">
      <label className="jh-field__label" htmlFor={id}>
        {label}
      </label>
      <div className="jh-field__control">
        <select
          {...selectProps}
          id={id}
          className="jh-input"
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {message && (
        <p id={messageId} className={error ? 'jh-field__error' : 'jh-field__hint'}>
          {message}
        </p>
      )}
    </div>
  );
}
