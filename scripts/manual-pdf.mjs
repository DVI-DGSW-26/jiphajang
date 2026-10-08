// 디자인 매뉴얼 HTML(docs/design-manual/index.html)을 PDF(docs/design-manual.pdf)로 뽑아요.
// 컴퓨터에 설치된 Chrome이나 Edge를 써요. 경로가 다르면 CHROME_PATH로 알려 주세요.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const browser = candidates.find((p) => existsSync(p));
if (!browser) {
  console.error('Chrome이나 Edge를 찾지 못했어요. CHROME_PATH에 실행 파일 경로를 넣어 주세요.');
  process.exit(1);
}

const source = pathToFileURL(resolve('docs/design-manual/index.html')).href;
const out = resolve('docs/design-manual.pdf');

execFileSync(
  browser,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-pdf-header-footer',
    '--allow-file-access-from-files',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=5000',
    `--print-to-pdf=${out}`,
    source,
  ],
  { stdio: 'inherit' },
);
