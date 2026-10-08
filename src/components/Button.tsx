import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'secondary' | 'primary' | 'danger' | 'danger-fill';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
  /** 주 버튼(`primary`)은 한 화면에 하나만 둬요 */
  variant?: Variant;
  /** 파일을 내려받는 버튼이면 `XLSX`·`PDF` 꼬리표를 앞에 붙여요 */
  fileType?: 'XLSX' | 'PDF';
  /** 처리 중이면 누를 수 없고 `busyLabel`(기본 “저장 중…”)을 보여줘요 */
  busy?: boolean;
  busyLabel?: string;
  /** 폼 제출 버튼일 때만 `submit` */
  type?: 'button' | 'submit';
  children: ReactNode;
};

/** 버튼 — 디자인 매뉴얼 7장. 글자는 누르면 일어나는 일을 써요(“엑셀 다운로드”, “확인” 말고) */
export function Button({
  variant = 'secondary',
  fileType,
  busy = false,
  busyLabel = '저장 중…',
  type = 'button',
  className,
  disabled,
  children,
  ...rest
}: Props) {
  const classes = ['jh-button', variant !== 'secondary' && `jh-button--${variant}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...rest}
      type={type}
      className={classes}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      {busy ? (
        busyLabel
      ) : (
        <>
          {fileType && (
            <span className="jh-button__ext" aria-hidden="true">
              {fileType}
            </span>
          )}
          {children}
        </>
      )}
    </button>
  );
}
