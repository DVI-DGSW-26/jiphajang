import { Button } from '../components/Button.tsx';

/**
 * 인보이스 출력 자리.
 * TODO(확인 필요): 고객사별 양식을 받으면 다운로드와 미리보기를 만들어요. 그때까지 단추는 눌리지 않아요 (Q18, Q22)
 */
export function InvoiceOutput() {
  return (
    <section className="jh-section" aria-label="인보이스 출력">
      <div className="jh-output__head">
        <h2 className="jh-section__title">인보이스 출력</h2>
        <div className="jh-output__actions">
          <Button fileType="XLSX" disabled>
            엑셀 다운로드
          </Button>
          <Button fileType="PDF" disabled>
            PDF 다운로드
          </Button>
        </div>
      </div>
      <div className="jh-output__preview">고객사별 양식을 받으면 여기에 미리보기가 나와요.</div>
    </section>
  );
}
