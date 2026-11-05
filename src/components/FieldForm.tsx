import { type FormEvent, useState } from 'react';
import type { FieldDef } from '../config/forms/types.ts';
import { FormFields } from '../forms/FormFields.tsx';
import { type FieldValues, initialTexts, readFields } from '../forms/fromConfig.ts';
import { Button } from './Button.tsx';
import type { SelectOption } from './SelectField.tsx';

export type FormValues = FieldValues;

type Props = {
  /** 칸 정의 (`src/config/forms/`) */
  defs: readonly FieldDef[];
  /** 마스터에서 받은 선택지 */
  options?: Record<string, SelectOption[]>;
  /** 정의의 첫 값 위에 얹는 값 — 오늘 날짜 등 */
  initial?: Record<string, string>;
  /** 누르면 일어나는 일 — “품번 추가하기” */
  submitLabel: string;
  /** 실패하면 던져요. 문구는 칸들 아래에 보여줘요 */
  onSubmit: (values: FormValues) => Promise<void>;
  onClose: () => void;
};

/** 칸 정의로 그리는 입력 양식. 칸마다 읽어 보고, 다 맞을 때만 보내요 */
export function FieldForm({
  defs,
  options = {},
  initial = {},
  submitLabel,
  onSubmit,
  onClose,
}: Props) {
  const [texts, setTexts] = useState(() => initialTexts(defs, initial));
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
    const { values, errors: nextErrors } = readFields(defs, texts);
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
      <FormFields defs={defs} texts={texts} errors={errors} options={options} onChange={change} />
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
