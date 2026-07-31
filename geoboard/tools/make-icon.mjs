#!/usr/bin/env node
/* 지오보드 아이콘 생성기 — node geoboard/tools/make-icon.mjs
 * 공용 마스코트(보라 토끼)를 이 앱 안에서만 복제해, 못 두 개에 색 고무줄을 걸어 늘이는 모습으로 그린다.
 * ⚠️ 공유 tools/make-mascot-icons.mjs 는 절대 수정하지 않는다(여기서 rabbit() 을 복제).
 * 팔레트: 몸 #D9D0FB~#C2B4F6 · 볼/안쪽귀 #A98FF0 · 진한선 #6C48C4 · 흰배 #F5F2FF
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const outDir = dirname(fileURLToPath(import.meta.url)).replace(/\/tools$/, '');

/* ── 공용 보라 토끼 베이스(복제) ── */
function rabbit(opts = {}) {
  const eye = opts.eye || { l: [83, 92], r: [117, 92] };
  return `
  <g>
    <g transform="rotate(-14 84 62)">
      <ellipse cx="84" cy="40" rx="15" ry="40" fill="url(#body)" stroke="#6C48C4" stroke-width="3"/>
      <ellipse cx="84" cy="44" rx="7"  ry="27" fill="#A98FF0"/>
    </g>
    <g transform="rotate(14 116 62)">
      <ellipse cx="116" cy="40" rx="15" ry="40" fill="url(#body)" stroke="#6C48C4" stroke-width="3"/>
      <ellipse cx="116" cy="44" rx="7"  ry="27" fill="#A98FF0"/>
    </g>
  </g>
  <ellipse cx="82"  cy="187" rx="15" ry="10" fill="url(#body)" stroke="#6C48C4" stroke-width="3"/>
  <ellipse cx="118" cy="187" rx="15" ry="10" fill="url(#body)" stroke="#6C48C4" stroke-width="3"/>
  <ellipse cx="82"  cy="188" rx="6"  ry="4"  fill="#A98FF0"/>
  <ellipse cx="118" cy="188" rx="6"  ry="4"  fill="#A98FF0"/>
  <ellipse cx="100" cy="150" rx="46" ry="43" fill="url(#body)" stroke="#6C48C4" stroke-width="3"/>
  <ellipse cx="100" cy="158" rx="27" ry="30" fill="#F5F2FF"/>
  ${opts.paws !== false ? `
  <ellipse cx="66"  cy="150" rx="12" ry="14" fill="url(#body)" stroke="#6C48C4" stroke-width="3"/>
  <ellipse cx="134" cy="150" rx="12" ry="14" fill="url(#body)" stroke="#6C48C4" stroke-width="3"/>` : ''}
  <ellipse cx="100" cy="95" rx="50" ry="46" fill="url(#body)" stroke="#6C48C4" stroke-width="3"/>
  <ellipse cx="71"  cy="103" rx="11" ry="8" fill="#A98FF0" opacity=".6"/>
  <ellipse cx="129" cy="103" rx="11" ry="8" fill="#A98FF0" opacity=".6"/>
  <ellipse cx="${eye.l[0]}" cy="${eye.l[1]}" rx="8.5" ry="11" fill="#3A2233"/>
  <ellipse cx="${eye.r[0]}" cy="${eye.r[1]}" rx="8.5" ry="11" fill="#3A2233"/>
  <circle cx="${eye.l[0]-3}" cy="${eye.l[1]-4}" r="3.2" fill="#fff"/>
  <circle cx="${eye.r[0]-3}" cy="${eye.r[1]-4}" r="3.2" fill="#fff"/>
  <circle cx="${eye.l[0]+3}" cy="${eye.l[1]+4}" r="1.5" fill="#fff" opacity=".85"/>
  <circle cx="${eye.r[0]+3}" cy="${eye.r[1]+4}" r="1.5" fill="#fff" opacity=".85"/>
  <path d="M95 105 h10 l-5 5.5 z" fill="#6C48C4"/>
  <path d="M100 110.5 q-5 6 -11 3 M100 110.5 q5 6 11 3" fill="none" stroke="#6C48C4" stroke-width="2.4" stroke-linecap="round"/>`;
}
function sparkle(x, y, r, color = '#FFE08A') {
  return `<path d="M${x} ${y-r} Q${x+r*0.28} ${y-r*0.28} ${x+r} ${y} Q${x+r*0.28} ${y+r*0.28} ${x} ${y+r} Q${x-r*0.28} ${y+r*0.28} ${x-r} ${y} Q${x-r*0.28} ${y-r*0.28} ${x} ${y-r} Z" fill="${color}"/>`;
}
/* 못 하나(짧은 세로 막대 + 반짝이는 머리) */
function peg(cx, cy) {
  return `
  <rect x="${cx-4}" y="${cy-2}" width="8" height="20" rx="3.5" fill="#8A7BC8" stroke="#5A4796" stroke-width="2"/>
  <circle cx="${cx}" cy="${cy}" r="6.5" fill="#B6ABE8" stroke="#5A4796" stroke-width="2"/>
  <circle cx="${cx-2}" cy="${cy-2}" r="1.8" fill="#FFFFFF" opacity=".8"/>`;
}
/* 두 못 사이를 팽팽하게 잇는 색 고무줄 하나 */
function band(x1, y1, x2, y2, hex, dk) {
  return `
  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${dk}" stroke-width="9" stroke-linecap="round"/>
  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hex}" stroke-width="6" stroke-linecap="round"/>`;
}

/* 소품: 앞발 사이 못판 위에서 빨강 고무줄을 손가락으로 늘여 잡은 모습 + 반짝이 */
const front = `
  ${peg(66, 168)}
  ${peg(134, 168)}
  ${band(66, 168, 134, 168, '#EF4E4E', '#C42F2F')}
`;
const top = sparkle(150, 58, 9, '#FFD34E') + sparkle(56, 66, 6, '#7FD0F5') + sparkle(44, 120, 6, '#FFB0C8');

function pageHTML(size) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0}
  .box{width:${size}px;height:${size}px;
    background:radial-gradient(120% 120% at 50% 28%, #F8F6FF 0%, #E6DFFB 100%)}
  svg{display:block;width:100%;height:100%}
  </style></head><body>
  <div class="box"><svg viewBox="0 0 200 205" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#D9D0FB"/><stop offset="1" stop-color="#C2B4F6"/>
    </linearGradient></defs>
    ${rabbit({})}
    ${front}
    ${top}
  </svg></div></body></html>`;
}

const browser = await chromium.launch();
for (const size of [192, 512]) {
  const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(pageHTML(size));
  const buf = await p.locator('.box').screenshot({ type: 'png' });
  writeFileSync(join(outDir, `icon-${size}.png`), buf);
  await p.close();
  console.log(`✅ geoboard/icon-${size}.png`);
}
await browser.close();
console.log('완료 — 아이콘 2종');
