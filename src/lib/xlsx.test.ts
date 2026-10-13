import { expect, test } from 'vitest';
import { buildXlsx, columnName, crc32, excelDate, XLSX_STYLE, type XlsxSheet } from './xlsx.ts';

test('열 이름은 A부터 Z, 그다음 AA예요', () => {
  expect([0, 25, 26, 27, 701, 702].map(columnName)).toEqual(['A', 'Z', 'AA', 'AB', 'ZZ', 'AAA']);
});

test('날짜는 엑셀 날짜 일련번호로 바꿔요', () => {
  expect(excelDate('1900-03-01')).toBe(61);
  expect(excelDate('2026-10-07')).toBe(46302);
  expect(excelDate('2026-10')).toBeNull();
});

test('CRC-32는 표준 값과 같아요', () => {
  expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
});

/** 압축 없이 담은 zip에서 파일 하나를 글자로 꺼내요 */
function readEntry(bytes: Uint8Array, name: string): string {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  for (let at = 0; view.getUint32(at, true) === 0x04034b50; ) {
    const size = view.getUint32(at + 18, true);
    const nameLength = view.getUint16(at + 26, true);
    const entry = decoder.decode(bytes.subarray(at + 30, at + 30 + nameLength));
    const start = at + 30 + nameLength;
    if (entry === name) return decoder.decode(bytes.subarray(start, start + size));
    at = start + size;
  }
  throw new Error(`${name}이 없어요`);
}

test('시트 하나짜리 엑셀을 zip으로 묶어요', () => {
  const sheet: XlsxSheet = {
    name: '수출신고취합',
    rows: [
      [{ kind: 'text', value: '수출신고취합', style: XLSX_STYLE.title }],
      [],
      [],
      [{ kind: 'text', value: 'A&B <x>', style: XLSX_STYLE.header }],
      [{ kind: 'number', value: '30720.00', style: XLSX_STYLE.money }],
      [{ kind: 'formula', value: 'SUBTOTAL(109,A5:A5)', style: XLSX_STYLE.totalMoney }],
    ],
    widths: [12],
    headerRow: 3,
    filter: { firstRow: 3, lastRow: 4, lastCol: 0 },
  };
  const bytes = buildXlsx(sheet);
  expect(new DataView(bytes.buffer).getUint32(bytes.length - 22, true)).toBe(0x06054b50);

  const xml = readEntry(bytes, 'xl/worksheets/sheet1.xml');
  expect(xml).toContain('<t xml:space="preserve">A&amp;B &lt;x&gt;</t>');
  expect(xml).toContain(`<c r="A5" s="${XLSX_STYLE.money}"><v>30720.00</v></c>`);
  expect(xml).toContain('<f>SUBTOTAL(109,A5:A5)</f>');
  expect(xml).toContain('<autoFilter ref="A4:A5"/>');
  expect(xml).toContain('state="frozen"');
  expect(readEntry(bytes, 'xl/workbook.xml')).toContain(
    `<definedName name="_xlnm.Print_Titles" localSheetId="0">'수출신고취합'!$4:$4</definedName>`,
  );
});
