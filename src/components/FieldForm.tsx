import { type FormEvent, useState } from 'react';
import { Button } from './Button.tsx';
import { Field } from './Field.tsx';
import type { ParseResult } from './grid/gridModel.ts';
import { SelectField, type SelectOption } from './SelectField.tsx';

export type FormField = {
  key: string;
  label: string;
  /** 넣은 글자를 서버에 보낼 값으로 바꿔요. 표의 칸 고치기와 같은 함수를 써요(`grid/parsers.ts`) */
  parse: (text: string) => ParseResult;
  initial?: string;
  numeric?: boolean;
  hint?: string;
  /** 있으면 고르기 칸이에요 */
  options?: SelectOption[];
};

export type FormValues = Record<string, string | null>;

type Props = {
  fields: FormField[];
  /** 누르면 일어나는 일 — “품번 추가하기” */
  submitLabel: string;
  /** 실패하면 던져요. 문구는 칸들 아래에 보여줘요 */
  onSubmit: (values: FormValues) => Promise<void>;
  onClose: () => void;
};

/** 칸 목록으로 그리는 입력 양식. 칸마다 읽어 보고, 다 맞을 때만 보내요 */
export function FieldForm({ fields, submitLabel, onSubmit, onClose }: Props) {
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.key, field.initial ?? ''])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const change = (key: string, text: string) => {
    setTexts((current) => ({ ...current, [key]: text }));
    setErrors(({ [key]: _cleared, ...rest }) => rest);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const values: FormValues = {};
    const nextErrors: Record<string, string> = {};
    for (const field of fields) {
      const result = field.parse(texts[field.key] ?? '');
      if ('error' in result) nextErrors[field.key] = result.error;
      else values[field.key] = result.value;
    }
    setErrors(nextErrors);
    setFailure(null);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    try {
      await onSubmit(values);
    } catch (error) {
      // 서버가 준 이유를 그대로 보여줘요. 넣은 값은 그대로 둬요
      setFailure(error instanceof Error && error.message ? error.message : '저장하지 못했어요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="jh-form" onSubmit={submit} noValidate>
      {fields.map((field) => {
        const error = errors[field.key];
        const message = {
          ...(error ? { error } : {}),
          ...(field.hint ? { hint: field.hint } : {}),
        };
        return field.options ? (
          <SelectField
            key={field.key}
            label={field.label}
            options={field.options}
            placeholder="골라 주세요"
            value={texts[field.key] ?? ''}
            onChange={(event) => change(field.key, event.target.value)}
            {...message}
          />
        ) : (
          <Field
            key={field.key}
            label={field.label}
            numeric={field.numeric ?? false}
            value={texts[field.key] ?? ''}
            onChange={(event) => change(field.key, event.target.value)}
            {...message}
          />
        );
      })}
      {failure && (
        <p className="jh-field__error" role="alert">
          {failure}
        </p>
      )}
      <div className="jh-dialog__actions">
        <button type="button" className="jh-button" onClick={onClose} disabled={busy}>
          닫기
        </button>
        <Button variant="primary" type="submit" busy={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
