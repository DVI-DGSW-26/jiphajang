import type { SelectOption } from '../components/SelectField.tsx';
import { SourceTag } from '../components/SourceTag.tsx';
import type { FieldDef } from '../config/forms/types.ts';
import { isNumericType, parseCell } from './fromConfig.ts';

export type Line = { key: string; texts: Record<string, string> };

let nextLine = 0;
export function newLine(texts: Record<string, string> = {}): Line {
  nextLine += 1;
  return { key: `line-${nextLine}`, texts };
}

/** 입력 칸을 읽어요. 칸이 하나라도 틀리면 그 줄의 오류를 돌려줘요 */
export function readLines(
  defs: readonly FieldDef[],
  lines: readonly Line[],
): { values: Record<string, string | null>[]; errors: Record<string, Record<string, string>> } {
  const values: Record<string, string | null>[] = [];
  const errors: Record<string, Record<string, string>> = {};
  for (const line of lines) {
    const row: Record<string, string | null> = {};
    const rowErrors: Record<string, string> = {};
    for (const def of defs) {
      if (def.mode === 'auto') continue;
      const result = parseCell(def, line.texts[def.key] ?? '', !!def.required);
      if ('error' in result) rowErrors[def.key] = result.error;
      else row[def.key] = result.value;
    }
    values.push(row);
    if (Object.keys(rowErrors).length > 0) errors[line.key] = rowErrors;
  }
  return { values, errors };
}

type Props = {
  caption: string;
  defs: readonly FieldDef[];
  lines: readonly Line[];
  errors: Record<string, Record<string, string>>;
  options: Record<string, SelectOption[]>;
  /** 자동 칸에 보여줄 글자 */
  autoText: (line: Line, index: number, key: string) => string;
  onChange: (lineKey: string, key: string, text: string) => void;
  onRemove: (lineKey: string) => void;
};

/** 여러 줄 입력 — 입고 품목과 인보이스 품목이 같이 써요. 공통 표는 행 추가를 받지 않아 따로 그려요 */
export function LineItemsTable({
  caption,
  defs,
  lines,
  errors,
  options,
  autoText,
  onChange,
  onRemove,
}: Props) {
  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: 가로로 넓은 표를 키보드로도 스크롤할 수 있게 해요
    <section className="jh-table-wrap jh-lines" tabIndex={0} aria-label={caption}>
      <table className="jh-table">
        <caption className="jh-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {defs.map((def) => (
              <th
                key={def.key}
                scope="col"
                className={isNumericType(def.type) ? 'jh-table__num' : undefined}
              >
                {def.label}
                {def.source && <SourceTag source={def.source} />}
              </th>
            ))}
            <th scope="col">
              <span className="jh-visually-hidden">품목 삭제</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={line.key}>
              {defs.map((def) => {
                const numeric = isNumericType(def.type);
                if (def.mode === 'auto') {
                  return (
                    <td
                      key={def.key}
                      className={numeric ? 'jh-table__num jh-table__auto' : 'jh-table__auto'}
                    >
                      {autoText(line, index, def.key)}
                    </td>
                  );
                }
                const error = errors[line.key]?.[def.key];
                const label = `${index + 1}번째 줄 ${def.label}`;
                const invalid = error ? { 'aria-invalid': true } : {};
                const choices = options[def.key];
                return (
                  <td key={def.key} className="jh-lines__input">
                    {choices ? (
                      <select
                        className="jh-input"
                        aria-label={label}
                        value={line.texts[def.key] ?? ''}
                        onChange={(event) => onChange(line.key, def.key, event.target.value)}
                        {...invalid}
                      >
                        <option value="">골라 주세요</option>
                        {choices.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className={numeric ? 'jh-input jh-input--number' : 'jh-input'}
                        aria-label={label}
                        inputMode={numeric ? 'numeric' : undefined}
                        value={line.texts[def.key] ?? ''}
                        onChange={(event) => onChange(line.key, def.key, event.target.value)}
                        {...invalid}
                      />
                    )}
                    {error && <p className="jh-field__error">{error}</p>}
                  </td>
                );
              })}
              <td>
                <button
                  type="button"
                  className="jh-link-button"
                  aria-label={`${index + 1}번째 줄 품목 삭제`}
                  onClick={() => onRemove(line.key)}
                >
                  품목 삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
