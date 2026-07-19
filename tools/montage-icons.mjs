#!/usr/bin/env node
/* 몽타주 — 14개 512 아이콘을 앱 카드(border-radius 26%)로 한 장에 모아 검수용 PNG 저장 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || '/tmp/montage.png';

const apps = ['play','english','pixel','hangul','japanese','write','math','shape','market','lab','bag','coloring','practika','.'];
const label = {play:'찾기',english:'영어',pixel:'픽셀',hangul:'한글',japanese:'일본어',write:'글씨',math:'산수',shape:'도형',market:'시장',lab:'실험실',bag:'가방',coloring:'색칠',practika:'프랙티카','.':'홈'};

const cells = apps.map(a => {
  const f = a === '.' ? join(root, 'icon-512.png') : join(root, a, 'icon-512.png');
  const b64 = readFileSync(f).toString('base64');
  return `<div class="c"><img src="data:image/png;base64,${b64}"><span>${a}</span></div>`;
}).join('');

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#404652;font-family:sans-serif}
.grid{display:grid;grid-template-columns:repeat(7,1fr);gap:18px;padding:22px}
.c{display:flex;flex-direction:column;align-items:center;gap:6px}
.c img{width:150px;height:150px;border-radius:26%;box-shadow:0 4px 12px rgba(0,0,0,.35)}
.c span{color:#eee;font-size:15px}
</style></head><body><div class="grid">${cells}</div></body></html>`;

const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1250, height: 520 }, deviceScaleFactor: 1.4 });
await p.setContent(html);
const buf = await p.locator('.grid').screenshot({ type: 'png' });
writeFileSync(out, buf);
await browser.close();
console.log('saved', out);
