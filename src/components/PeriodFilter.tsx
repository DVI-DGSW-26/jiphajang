import { useId } from 'react';
import { formatDate } from '../lib/format.ts';

export type Period = { from: string; to: string };

/** 이번 달 1일 ~ 말일 */
export function monthPeriod(base: Date, offset = 0): Period {
  const first = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const last = new Date(base.getFullYear(), base.getMonth() + offset + 1, 0);
  return { from: formatDate(first), to: formatDate(last) };
}

export function yearPeriod(base: Date): Period {
  return { from: `${base.getFullYear()}-01-01`, to: `${base.getFullYear()}-12-31` };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 주소창에서 읽은 기간이 쓸 만한가요 */
export function isPeriod(from: string | null, to: string | null): boolean {
  return !!from && !!to && DATE.test(from) && DATE.test(to) && from <= to;
}

type Props = {
  value: Period;
  onChange: (period: Period) => void;
  /** 어느 날짜로 거르는지 — “Ship date” */
  basis?: string;
  /** 오늘. 시험할 때 바꿔요 */
  today?: Date;
};

/**
 * 기간 필터 — 목록은 기간을 골라 그 안의 행을 다 받아요(서버와 맞춘 공통 약속).
 * 날짜는 `YYYY-MM-DD`. 빠른 버튼으로 이번 달·지난 달·올해를 골라요.
 */
export function PeriodFilter({ value, onChange, basis, today = new Date() }: Props) {
  const id = useId();
  const presets: { label: string; period: Period }[] = [
    { label: '이번 달', period: monthPeriod(today) },
    { label: '지난 달', period: monthPeriod(today, -1) },
    { label: '올해', period: yearPeriod(today) },
  ];

  const change = (next: Period) => {
    if (!DATE.test(next.from) || !DATE.test(next.to)) return;
    // 시작이 끝보다 늦으면 엑셀처럼 두 날짜를 맞바꿔요
    onChange(next.from <= next.to ? next : { from: next.to, to: next.from });
  };

  return (
    <fieldset className="jh-period">
      <legend className="jh-period__legend">
        기간{basis && <span className="jh-period__basis"> ({basis} 기준)</span>}
      </legend>
      <div className="jh-period__controls">
        <label className="jh-visually-hidden" htmlFor={`${id}-from`}>
          시작일
        </label>
        <input
          id={`${id}-from`}
          type="date"
          className="jh-input jh-period__date"
          value={value.from}
          max={value.to}
          onChange={(event) => change({ ...value, from: event.target.value })}
        />
        <span aria-hidden="true">~</span>
        <label className="jh-visually-hidden" htmlFor={`${id}-to`}>
          종료일
        </label>
        <input
          id={`${id}-to`}
          type="date"
          className="jh-input jh-period__date"
          value={value.to}
          min={value.from}
          onChange={(event) => change({ ...value, to: event.target.value })}
        />
        <div className="jh-period__presets">
          {presets.map(({ label, period }) => (
            <button
              key={label}
              type="button"
              className="jh-button"
              aria-pressed={period.from === value.from && period.to === value.to}
              onClick={() => onChange(period)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </fieldset>
  );
}
