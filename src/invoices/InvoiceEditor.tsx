import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '../components/Button.tsx';
import { useToast } from '../components/Toast.tsx';
import { API } from '../config/api.ts';
import { invoiceHeadFields, invoiceLineFields } from '../config/forms/invoice.ts';
import { FormFields } from '../forms/FormFields.tsx';
import { formatCell, initialTexts, parseCell, readFields } from '../forms/fromConfig.ts';
import { type Line, LineItemsTable, newLine, readLines } from '../forms/LineItemsTable.tsx';
import { formatMoney, formatQty } from '../lib/format.ts';
import { sendJson } from '../lib/useQuery.ts';
import { today } from '../overseas/calc.ts';
import type { Invoice, InvoicePreview, PreviewLine } from '../overseas/types.ts';
import { useMasterData } from '../overseas/useMasterData.ts';
import { InvoiceOutput } from './InvoiceOutput.tsx';

const PREVIEW_DELAY = 200;

const isBlank = (line: Line) => !line.texts.partId && !line.texts.boxQty?.trim();

function normalized(key: string, text: string): string {
  const def = invoiceHeadFields.concat(invoiceLineFields).find((item) => item.key === key);
  if (!def) return text;
  const result = parseCell(def, text, false);
  return 'value' in result ? (result.value ?? '') : '';
}

function lineAuto(line: PreviewLine | undefined, key: string): string {
  if (!line) return '';
  const def = invoiceLineFields.find((item) => item.key === key);
  const value = (line as unknown as Record<string, unknown>)[key];
  return def ? formatCell(def.type, value) : '';
}

type Props = {
  /** 임시 저장한 것을 고칠 때 */
  draft?: Invoice;
  onSaved: (invoice: Invoice) => void;
};

/** 인보이스 작성 양식 — 번호·금액·FIFO 배정은 서버 계산을 그대로 보여줘요(저장 전에는 예상값) */
export function InvoiceEditor({ draft, onSaved }: Props) {
  const { customerOptions, warehouseOptions, parts } = useMasterData();
  const toast = useToast();
  const [texts, setTexts] = useState(() =>
    initialTexts(invoiceHeadFields, {
      invoiceDate: draft?.invoiceDate ?? today(),
      customerId: draft?.customerId ?? '',
      shipFromWarehouseId: draft?.shipFromWarehouseId ?? '',
      poNo: draft?.poNo ?? '',
    }),
  );
  const [lines, setLines] = useState<Line[]>(() =>
    draft && draft.lines.length > 0
      ? draft.lines.map((line) => newLine({ partId: line.partId, boxQty: String(line.boxQty) }))
      : [newLine()],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lineErrors, setLineErrors] = useState<Record<string, Record<string, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState<'draft' | 'send' | null>(null);
  const [preview, setPreview] = useState<InvoicePreview | null>(null);

  const customerId = texts.customerId ?? '';
  // 선택한 고객사의 품번만 고를 수 있어요
  const partOptions = useMemo(
    () =>
      parts
        .filter((part) => part.customerId === customerId)
        .map((part) => ({ value: part.id, label: part.partNo })),
    [parts, customerId],
  );

  const payload = JSON.stringify({
    customerId,
    shipFromWarehouseId: texts.shipFromWarehouseId ?? '',
    invoiceDate: normalized('invoiceDate', texts.invoiceDate ?? ''),
    lines: lines.map((line) => ({
      partId: line.texts.partId ?? '',
      boxQty: normalized('boxQty', line.texts.boxQty ?? ''),
    })),
  });

  useEffect(() => {
    let stale = false;
    const timer = setTimeout(() => {
      const body = JSON.parse(payload) as { customerId: string };
      if (!body.customerId) {
        setPreview(null);
        return;
      }
      sendJson<InvoicePreview>(API.invoicePreview, 'POST', body)
        .then((result) => {
          if (!stale) setPreview(result);
        })
        .catch(() => {
          // 미리보기는 도움일 뿐이에요. 저장할 때 서버가 다시 계산하고 알려줘요
          if (!stale) setPreview(null);
        });
    }, PREVIEW_DELAY);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [payload]);

  const change = (key: string, text: string) => {
    setTexts((current) => ({ ...current, [key]: text }));
    setErrors(({ [key]: _cleared, ...rest }) => rest);
    if (key === 'customerId') {
      // 다른 고객사의 품번이 남지 않게 비워요
      setLines((current) =>
        current.map((line) => {
          const part = parts.find((row) => row.id === line.texts.partId);
          return part && part.customerId !== text
            ? { ...line, texts: { ...line.texts, partId: '' } }
            : line;
        }),
      );
    }
  };

  const changeLine = (lineKey: string, key: string, text: string) => {
    setLines((current) =>
      current.map((line) =>
        line.key === lineKey ? { ...line, texts: { ...line.texts, [key]: text } } : line,
      ),
    );
    setLineErrors(({ [lineKey]: _cleared, ...rest }) => rest);
  };

  /** 가용 재고를 넘은 줄은 Box QTY 칸에 바로 알려줘요 */
  const shownLineErrors = useMemo(() => {
    const next = { ...lineErrors };
    lines.forEach((line, index) => {
      const shortage = preview?.lines[index]?.shortage ?? 0;
      if (shortage > 0) {
        next[line.key] = {
          ...next[line.key],
          boxQty: `가용 재고보다 ${shortage}팔레트 많아요.`,
        };
      }
    });
    return next;
  }, [lineErrors, lines, preview]);

  const save = async (action: 'draft' | 'send') => {
    if (busy) return;
    const filled = lines.filter((line) => !isBlank(line));
    const head = readFields(invoiceHeadFields, texts);
    const items = readLines(invoiceLineFields, filled);
    setErrors(head.errors);
    setLineErrors(items.errors);
    const bad = Object.keys(head.errors).length + Object.keys(items.errors).length > 0;
    if (bad) {
      setFailure('표시한 칸을 확인해 주세요.');
      return;
    }
    if (action === 'send' && filled.length === 0) {
      setFailure('품목을 한 줄 이상 넣어 주세요.');
      return;
    }
    if (action === 'send' && preview?.lines.some((line) => line.shortage > 0)) {
      setFailure('가용 재고를 넘은 품목이 있어요. Box QTY를 줄여 주세요.');
      return;
    }
    setFailure(null);
    setBusy(action);
    try {
      const body = { ...head.values, lines: items.values, action };
      const saved = draft
        ? await sendJson<Invoice>(API.invoice(draft.id), 'PUT', body)
        : await sendJson<Invoice>(API.invoices, 'POST', body);
      toast(
        action === 'send'
          ? `${saved.invoiceNo}을 창고에 보냈어요. 재고를 예약했어요.`
          : '임시 저장했어요. 재고는 예약하지 않았어요.',
      );
      onSaved(saved);
    } catch (error) {
      setFailure(error instanceof Error && error.message ? error.message : '저장하지 못했어요.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <form
      noValidate
      onSubmit={(event: FormEvent) => {
        // 칸에서 Enter를 눌러도 보내지 않아요. 재고를 예약하는 일이라 단추로만 해요
        event.preventDefault();
      }}
    >
      <section className="jh-section" aria-label="기본 정보">
        <h2 className="jh-section__title">기본 정보</h2>
        <div className="jh-form">
          <FormFields
            defs={invoiceHeadFields}
            texts={texts}
            errors={errors}
            options={{ customerId: customerOptions, shipFromWarehouseId: warehouseOptions }}
            autoValues={{
              invoiceNo: preview?.invoiceNo ?? '',
              shipTo: preview?.shipTo ?? '',
              paymentTerms: preview?.paymentTerms ?? '',
              dueDate: preview?.dueDate ?? '',
            }}
            hints={preview?.invoiceNo ? { invoiceNo: '보낼 때 정해지는 예상 번호예요.' } : {}}
            onChange={change}
          />
        </div>
      </section>

      <section className="jh-section" aria-label="품목">
        <h2 className="jh-section__title">품목</h2>
        {lines.length > 0 && (
          <LineItemsTable
            caption="품목"
            defs={invoiceLineFields}
            lines={lines}
            errors={shownLineErrors}
            options={{ partId: partOptions }}
            autoText={(_line, index, key) => lineAuto(preview?.lines[index], key)}
            onChange={changeLine}
            onRemove={(key) => setLines((current) => current.filter((line) => line.key !== key))}
          />
        )}
        <div className="jh-lines__add">
          <Button onClick={() => setLines((current) => [...current, newLine()])}>품목 추가</Button>
        </div>
      </section>

      <section className="jh-section" aria-label="합계">
        <h2 className="jh-section__title">합계</h2>
        <dl className="jh-stats">
          <div className="jh-stat">
            <dt>총 팔레트</dt>
            <dd>{formatQty(preview?.totalPallets ?? 0)}</dd>
          </div>
          <div className="jh-stat">
            <dt>총수량</dt>
            <dd>{formatQty(preview?.totalQty ?? 0)}</dd>
          </div>
          <div className="jh-stat">
            <dt>총금액</dt>
            <dd>{formatMoney(preview?.totalAmount ?? '0')}</dd>
          </div>
        </dl>
        {preview && preview.availability.length > 0 && (
          <ul className="jh-note-list">
            {preview.availability.map((item) => (
              <li key={item.partId}>
                {item.partNo} 가용 {formatQty(item.availablePallets)}팔레트 중{' '}
                {formatQty(item.allocatedPallets)}팔레트 배정
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="jh-form-actions">
        {failure && (
          <p className="jh-field__error" role="alert">
            {failure}
          </p>
        )}
        <Button busy={busy === 'draft'} disabled={busy !== null} onClick={() => void save('draft')}>
          임시 저장
        </Button>
        <Button
          variant="primary"
          busy={busy === 'send'}
          disabled={busy !== null}
          onClick={() => void save('send')}
        >
          작성하고 창고에 보내기
        </Button>
      </div>

      <InvoiceOutput />
    </form>
  );
}
