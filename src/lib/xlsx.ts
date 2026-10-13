/**
 * 엑셀(.xlsx) 파일 만들기 — 시트 하나짜리 표만 써요. 라이브러리 없이 직접 만들어요
 * (xlsx는 XML 몇 개를 zip으로 묶은 것이에요). 서식은 디자인 매뉴얼 9장: 흑백, 머리줄 고정,
 * 자동 필터, 숫자는 숫자 서식.
 */

/** 칸 서식 — `STYLES` 순서와 같아요 */
export const XLSX_STYLE = {
  general: 0,
  title: 1,
  header: 2,
  qty: 3,
  unitPrice: 4,
  money: 5,
  date: 6,
  totalLabel: 7,
  totalQty: 8,
  totalUnitPrice: 9,
  totalMoney: 10,
} as const;

export type XlsxStyle = (typeof XLSX_STYLE)[keyof typeof XLSX_STYLE];

export type XlsxCell =
  | { kind: 'text'; value: string; style?: XlsxStyle }
  /** 숫자는 문자열(decimal) 그대로 받아요. 엑셀이 읽을 때 숫자가 돼요 */
  | { kind: 'number'; value: string; style?: XlsxStyle }
  /** `YYYY-MM-DD`. 엑셀 날짜로 넣어요 */
  | { kind: 'date'; value: string; style?: XlsxStyle }
  /** 수식. 파일을 열면 엑셀이 다시 계산해요 */
  | { kind: 'formula'; value: string; style?: XlsxStyle }
  | null;

export type XlsxSheet = {
  name: string;
  rows: XlsxCell[][];
  /** 열 폭(글자 수) */
  widths: number[];
  /** 이 행(0부터)까지 고정하고, 인쇄할 때 장마다 다시 찍어요 — 머리줄 */
  headerRow: number;
  /** 자동 필터를 걸 범위 — 머리줄부터 마지막 데이터 행까지(0부터, 끝 포함) */
  filter: { firstRow: number; lastRow: number; lastCol: number } | null;
};

const escapeXml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // XML에 넣을 수 없는 제어 문자는 버려요
    // biome-ignore lint/suspicious/noControlCharactersInRegex: 제어 문자를 지우려는 것
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

/** 0 → A, 25 → Z, 26 → AA */
export function columnName(index: number): string {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

export const cellRef = (row: number, col: number) => `${columnName(col)}${row + 1}`;

/** `2026-10-07` → 엑셀 날짜 일련번호 (1899-12-30부터 며칠). 시간대와 상관없어요 */
export function excelDate(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const utc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return utc / 86_400_000 + 25_569;
}

function cellXml(cell: XlsxCell, ref: string): string {
  if (!cell) return '';
  const style = cell.style ? ` s="${cell.style}"` : '';
  switch (cell.kind) {
    case 'text':
      // 빈 칸이라도 서식(합계줄 위 선 등)이 있으면 칸은 남겨요
      if (cell.value === '') return style ? `<c r="${ref}"${style}/>` : '';
      return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(cell.value)}</t></is></c>`;
    case 'number':
      return /^-?\d+(\.\d+)?$/.test(cell.value)
        ? `<c r="${ref}"${style}><v>${cell.value}</v></c>`
        : `<c r="${ref}"${style}/>`;
    case 'date': {
      const serial = excelDate(cell.value);
      return serial === null
        ? `<c r="${ref}"${style}/>`
        : `<c r="${ref}"${style}><v>${serial}</v></c>`;
    }
    case 'formula':
      return `<c r="${ref}"${style}><f>${escapeXml(cell.value)}</f></c>`;
  }
}

function sheetXml(sheet: XlsxSheet): string {
  const freeze = cellRef(sheet.headerRow + 1, 0);
  const cols = sheet.widths
    .map((width, i) => `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`)
    .join('');
  const rows = sheet.rows
    .map((cells, r) => {
      const xml = cells.map((cell, c) => cellXml(cell, cellRef(r, c))).join('');
      return `<row r="${r + 1}">${xml}</row>`;
    })
    .join('');
  const filter = sheet.filter
    ? `<autoFilter ref="${cellRef(sheet.filter.firstRow, 0)}:${cellRef(sheet.filter.lastRow, sheet.filter.lastCol)}"/>`
    : '';
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${sheet.headerRow + 1}" topLeftCell="${freeze}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<cols>${cols}</cols>` +
    `<sheetData>${rows}</sheetData>` +
    filter +
    '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.6" header="0.3" footer="0.3"/>' +
    // A4 가로, 폭은 한 장에 맞추고 길이는 넘쳐도 돼요
    '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>' +
    '<headerFooter><oddFooter>&amp;L&amp;D &amp;T&amp;R&amp;P / &amp;N</oddFooter></headerFooter>' +
    '</worksheet>'
  );
}

function workbookXml(sheet: XlsxSheet): string {
  const name = escapeXml(sheetName(sheet.name));
  const titles = `'${name.replace(/'/g, "''")}'!$${sheet.headerRow + 1}:$${sheet.headerRow + 1}`;
  const filter = sheet.filter
    ? `<definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${name.replace(/'/g, "''")}'!$A$${sheet.filter.firstRow + 1}:$${columnName(sheet.filter.lastCol)}$${sheet.filter.lastRow + 1}</definedName>`
    : '';
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets>` +
    `<definedNames>${filter}<definedName name="_xlnm.Print_Titles" localSheetId="0">${titles}</definedName></definedNames>` +
    '<calcPr calcId="191029" fullCalcOnLoad="1"/>' +
    '</workbook>'
  );
}

/** 시트 이름은 31자까지, `\ / ? * [ ] :`는 못 써요 */
function sheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet1';
}

const FONT = '<name val="맑은 고딕"/><family val="2"/><charset val="129"/>';

// 흰 바탕에 진회색·회색만 (매뉴얼 9장)
const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="2"><numFmt numFmtId="164" formatCode="0.0000"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd"/></numFmts>' +
  '<fonts count="3">' +
  `<font><sz val="10"/><color rgb="FF222222"/>${FONT}</font>` +
  `<font><b/><sz val="10"/><color rgb="FF222222"/>${FONT}</font>` +
  `<font><b/><sz val="14"/><color rgb="FF222222"/>${FONT}</font>` +
  '</fonts>' +
  '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFEDEDED"/><bgColor indexed="64"/></patternFill></fill></fills>' +
  '<borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border>' +
  '<border><left/><right/><top/><bottom style="thin"><color rgb="FF555555"/></bottom><diagonal/></border>' +
  '<border><left/><right/><top style="thin"><color rgb="FF555555"/></top><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="11">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' + // general
  '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' + // title
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>' + // header
  '<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' + // qty
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' + // unitPrice
  '<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' + // money
  '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' + // date
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"/>' + // totalLabel
  '<xf numFmtId="3" fontId="1" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>' +
  '<xf numFmtId="164" fontId="1" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>' +
  '<xf numFmtId="4" fontId="1" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>' +
  '</cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>';

const CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  '</Types>';

const ROOT_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  '</Relationships>';

const WORKBOOK_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '</Relationships>';

export const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** 시트 하나짜리 엑셀 파일의 바이트 */
export function buildXlsx(sheet: XlsxSheet): Uint8Array {
  return zip([
    ['[Content_Types].xml', CONTENT_TYPES],
    ['_rels/.rels', ROOT_RELS],
    ['xl/workbook.xml', workbookXml(sheet)],
    ['xl/_rels/workbook.xml.rels', WORKBOOK_RELS],
    ['xl/styles.xml', STYLES_XML],
    ['xl/worksheets/sheet1.xml', sheetXml(sheet)],
  ]);
}

// ── zip (압축 없이 담기만 해요. 표 하나라 크기는 괜찮아요) ──

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zip(files: [name: string, text: string][]): Uint8Array {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const [name, text] of files) {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(text);
    const crc = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true); // 풀 때 필요한 버전
    lv.setUint16(6, 0x0800, true); // 이름이 UTF-8
    lv.setUint16(8, 0, true); // 압축 없음
    lv.setUint16(10, 0, true); // 시각
    lv.setUint16(12, 0x21, true); // 날짜 1980-01-01
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    locals.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centrals.push(central);

    offset += local.length;
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const out = new Uint8Array(offset + centralSize + end.length);
  let at = 0;
  for (const part of [...locals, ...centrals, end]) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
