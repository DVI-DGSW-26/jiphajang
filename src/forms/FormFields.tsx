import { Field } from '../components/Field.tsx';
import { SelectField, type SelectOption } from '../components/SelectField.tsx';
import type { FieldDef } from '../config/forms/types.ts';
import { isNumericType } from './fromConfig.ts';

type Props = {
  defs: readonly FieldDef[];
  texts: Record<string, string>;
  errors: Record<string, string>;
  /** 마스터에서 받은 선택지. 정의의 `options`보다 먼저 봐요 */
  options?: Record<string, SelectOption[]>;
  /** 자동 칸에 보여줄 글자 */
  autoValues?: Record<string, string>;
  /** 칸 아래 도움말을 화면에서 정할 때 — 형식 경고 등 */
  hints?: Record<string, string>;
  onChange: (key: string, text: string) => void;
};

/** 칸 정의대로 입력 칸을 그려요. 자동 칸은 읽기 전용에 출처를 붙여요 */
export function FormFields({
  defs,
  texts,
  errors,
  options = {},
  autoValues = {},
  hints = {},
  onChange,
}: Props) {
  return (
    <>
      {defs.map((def) => {
        const hint = hints[def.key] ?? def.hint;
        const error = errors[def.key];
        const message = { ...(error ? { error } : {}), ...(hint ? { hint } : {}) };

        if (def.mode === 'auto') {
          return (
            <Field
              key={def.key}
              label={def.label}
              readOnly
              value={autoValues[def.key] ?? ''}
              numeric={isNumericType(def.type)}
              {...(def.source ? { source: def.source } : {})}
              {...message}
            />
          );
        }
        const choices = options[def.key] ?? def.options;
        return choices ? (
          <SelectField
            key={def.key}
            label={def.label}
            options={[...choices]}
            placeholder="골라 주세요"
            value={texts[def.key] ?? ''}
            onChange={(event) => onChange(def.key, event.target.value)}
            {...message}
          />
        ) : (
          <Field
            key={def.key}
            label={def.label}
            numeric={isNumericType(def.type)}
            placeholder={def.type === 'date' ? 'YYYY-MM-DD' : undefined}
            value={texts[def.key] ?? ''}
            onChange={(event) => onChange(def.key, event.target.value)}
            {...message}
          />
        );
      })}
    </>
  );
}
