import { type FormEvent, useMemo, useState } from 'react';
import { Button } from '../components/Button.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { FieldForm } from '../components/FieldForm.tsx';
import { FormDialog } from '../components/FormDialog.tsx';
import { Grid } from '../components/grid/Grid.tsx';
import { useToast } from '../components/Toast.tsx';
import { API } from '../config/api.ts';
import { CONTAINER_STATUS, type ContainerStatus } from '../config/enums.ts';
import {
  CONTAINER_NO_PATTERN,
  CONTAINER_NO_WARNING,
  containerFields,
  containerLineFields,
  receiveFields,
  recentContainerColumns,
} from '../config/forms/inbound.ts';
import { FormFields } from '../forms/FormFields.tsx';
import {
  formatCell,
  gridColumns,
  initialTexts,
  parseCell,
  readFields,
} from '../forms/fromConfig.ts';
import { type Line, LineItemsTable, newLine, readLines } from '../forms/LineItemsTable.tsx';
import { Page } from '../layout/Page.tsx';
import type { AuthMe } from '../lib/api.ts';
import { formatFileDate } from '../lib/format.ts';
import { useList } from '../lib/useList.ts';
import { sendJson } from '../lib/useQuery.ts';
import { ListError } from '../lists/ListError.tsx';
import { lineAmount, today } from '../overseas/calc.ts';
import { ContainerBadge } from '../overseas/StatusBadge.tsx';
import type { ContainerRow } from '../overseas/types.ts';
import { useMasterData } from '../overseas/useMasterData.ts';

const rowKey = (row: ContainerRow) => row.id;

/** 입고 등록 양식. 등록하면 빈 양식으로 돌아가요 */
function InboundForm({ onCreated }: { onCreated: (containerNo: string) => void }) {
  const { warehouseOptions, partOptions, parts } = useMasterData();
  const [texts, setTexts] = useState(() =>
    initialTexts(containerFields, { receivedDate: today() }),
  );
  const [lines, setLines] = useState<Line[]>(() => [newLine()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lineErrors, setLineErrors] = useState<Record<string, Record<string, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const change = (key: string, text: string) => {
    setTexts((current) => ({ ...current, [key]: text }));
    setErrors(({ [key]: _cleared, ...rest }) => rest);
  };

  const changeLine = (lineKey: string, key: string, text: string) => {
    setLines((current) =>
      current.map((line) =>
        line.key === lineKey ? { ...line, texts: { ...line.texts, [key]: text } } : line,
      ),
    );
    setLineErrors(({ [lineKey]: _cleared, ...rest }) => rest);
  };

  /** 품번 마스터에서 가져온 값과 계산한 값 */
  const autoText = (line: Line, _index: number, key: string) => {
    const part = parts.find((row) => row.id === line.texts.partId);
    if (!part) return '';
    const parsed = parseCell(
      { label: '팔레트 수', type: 'number', min: 1 },
      line.texts.pallets ?? '',
      true,
    );
    const pallets = 'value' in parsed ? Number(parsed.value) : null;
    const totalQty = pallets === null ? null : pallets * part.setQtyPerBox;
    switch (key) {
      case 'qtyPerPallet':
        return formatCell('number', part.setQtyPerBox);
      case 'totalQty':
        return formatCell('number', totalQty);
      case 'unitPrice':
        return formatCell('price', part.unitPrice);
      case 'amount':
        return totalQty !== null && part.unitPrice
          ? formatCell('money', lineAmount(totalQty, part.unitPrice))
          : '';
      default:
        return '';
    }
  };

  const containerNo = texts.containerNo?.trim() ?? '';
  const hints: Record<string, string> =
    containerNo && !CONTAINER_NO_PATTERN.test(containerNo)
      ? { containerNo: CONTAINER_NO_WARNING }
      : {};

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const head = readFields(containerFields, texts);
    const items = readLines(containerLineFields, lines);
    setErrors(head.errors);
    setLineErrors(items.errors);
    const bad = Object.keys(head.errors).length + Object.keys(items.errors).length > 0;
    if (bad || lines.length === 0) {
      setFailure(bad ? '표시한 칸을 확인해 주세요.' : '품목을 한 줄 이상 넣어 주세요.');
      return;
    }
    setFailure(null);
    setBusy(true);
    try {
      await sendJson(API.containers, 'POST', { ...head.values, lines: items.values });
      onCreated(head.values.containerNo ?? '');
    } catch (error) {
      setFailure(error instanceof Error && error.message ? error.message : '등록하지 못했어요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <section className="jh-section" aria-label="컨테이너 정보">
        <h2 className="jh-section__title">컨테이너 정보</h2>
        <div className="jh-form">
          <FormFields
            defs={containerFields}
            texts={texts}
            errors={errors}
            options={{ warehouseId: warehouseOptions }}
            hints={hints}
            onChange={change}
          />
        </div>
      </section>

      <section className="jh-section" aria-label="적재 품목">
        <h2 className="jh-section__title">적재 품목</h2>
        {lines.length > 0 && (
          <LineItemsTable
            caption="적재 품목"
            defs={containerLineFields}
            lines={lines}
            errors={lineErrors}
            options={{ partId: partOptions }}
            autoText={autoText}
            onChange={changeLine}
            onRemove={(key) => setLines((current) => current.filter((line) => line.key !== key))}
          />
        )}
        <div className="jh-lines__add">
          <Button onClick={() => setLines((current) => [...current, newLine()])}>품목 추가</Button>
        </div>
      </section>

      <div className="jh-form-actions">
        {failure && (
          <p className="jh-field__error" role="alert">
            {failure}
          </p>
        )}
        <Button variant="primary" type="submit" busy={busy}>
          입고 등록
        </Button>
      </div>
    </form>
  );
}

/** 컨테이너 입고 — 등록 양식과 최근 입고 목록. 입고 완료 컨테이너만 재고가 돼요 */
export function InboundPage({ me }: { me: AuthMe }) {
  const list = useList<ContainerRow>(API.containers, null);
  const toast = useToast();
  const canEdit = me.role === 'REPORTER';
  const [formKey, setFormKey] = useState(0);
  const [receiving, setReceiving] = useState<ContainerRow | null>(null);
  const { rows, state, reload } = list;

  const columns = useMemo(
    () =>
      gridColumns<ContainerRow>(recentContainerColumns, {
        status: {
          format: (value) => CONTAINER_STATUS[value as ContainerStatus] ?? '',
          render: (row) => (
            <span className="jh-cell-actions">
              <ContainerBadge status={row.status} />
              {canEdit && row.status === 'IN_TRANSIT' && (
                <button
                  type="button"
                  className="jh-button jh-button--small"
                  aria-label={`${row.containerNo} 입고 처리`}
                  onClick={() => setReceiving(row)}
                >
                  입고 처리
                </button>
              )}
            </span>
          ),
        },
      }),
    [canEdit],
  );

  return (
    <Page title="컨테이너 입고" wide>
      {canEdit && (
        <InboundForm
          key={formKey}
          onCreated={(containerNo) => {
            toast(`${containerNo}을 등록했어요.`);
            setFormKey((current) => current + 1);
            reload();
          }}
        />
      )}

      <section className="jh-section" aria-label="최근 입고 컨테이너">
        <h2 className="jh-section__title">최근 입고 컨테이너</h2>
        {state.status === 'error' ? (
          <ListError title="컨테이너" error={state.error} onRetry={reload} />
        ) : rows.length === 0 ? (
          state.status === 'loading' ? (
            <p className="jh-list-loading" role="status">
              불러오는 중이에요.
            </p>
          ) : (
            <EmptyState
              title="등록한 컨테이너가 없어요"
              description="컨테이너를 등록하면 여기에 나와요."
            />
          )
        ) : (
          <Grid
            caption="최근 입고 컨테이너"
            columns={columns}
            rows={rows}
            rowKey={rowKey}
            viewId={API.containers}
            download={{
              fileName: `컨테이너_입고_${formatFileDate(new Date())}`,
              title: '최근 입고 컨테이너',
              description: `작성 ${me.name}`,
            }}
          />
        )}
      </section>

      {receiving && (
        <FormDialog title={`${receiving.containerNo} 입고 처리`} onClose={() => setReceiving(null)}>
          <FieldForm
            defs={receiveFields}
            initial={{ receivedDate: today() }}
            submitLabel="입고 완료로 바꾸기"
            onClose={() => setReceiving(null)}
            onSubmit={async (values) => {
              await sendJson(API.containerReceive(receiving.containerId), 'POST', values);
              toast(`${receiving.containerNo}을 입고 완료로 바꿨어요.`);
              setReceiving(null);
              reload();
            }}
          />
        </FormDialog>
      )}
    </Page>
  );
}
