#!/usr/bin/env node
/* 아이콘 생성 — node connect/tools/make-icon.mjs
 * 공용 마스코트(핑크 토끼)를 이 앱만 위해 복제해(공유 tools/make-mascot-icons.mjs 는 건드리지 않는다)
 * '연필로 색 점을 이어 길을 그리는' 소품을 얹어 icon-192.png / icon-512.png 를 만든다.
 * 팔레트: 몸 #FFC9DB~#FFB0C8 · 안쪽귀/볼 #FF8FB0 · 진한선 #E05C86 · 흰배 #FFF2F7
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ── 공용 핑크 토끼 베이스 (make-mascot-icons.mjs 의 rabbit() 복제본) ── */
function rabbit(opts = {}) {
  const eye = opts.eye || { l: [83, 92], r: [117, 92] };
  return `
  <g>
    <g transform="rotate(-14 84 62)">
      <ellipse cx="84" cy="40" rx="15" ry="40" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
      <ellipse cx="84" cy="44" rx="7"  ry="27" fill="#FF8FB0"/>
    </g>
    <g transform="rotate(14 116 62)">
      <ellipse cx="116" cy="40" rx="15" ry="40" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
      <ellipse cx="116" cy="44" rx="7"  ry="27" fill="#FF8FB0"/>
    </g>
  </g>
  <ellipse cx="82"  cy="187" rx="15" ry="10" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <ellipse cx="118" cy="187" rx="15" ry="10" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <ellipse cx="82"  cy="188" rx="6"  ry="4"  fill="#FF8FB0"/>
  <ellipse cx="118" cy="188" rx="6"  ry="4"  fill="#FF8FB0"/>
  <ellipse cx="100" cy="150" rx="46" ry="43" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <ellipse cx="100" cy="158" rx="27" ry="30" fill="#FFF2F7"/>
  ${opts.paws !== false ? `
  <ellipse cx="66"  cy="150" rx="12" ry="14" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <ellipse cx="134" cy="150" rx="12" ry="14" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>` : ''}
  <ellipse cx="100" cy="95" rx="50" ry="46" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <ellipse cx="71"  cy="103" rx="11" ry="8" fill="#FF8FB0" opacity=".6"/>
  <ellipse cx="129" cy="103" rx="11" ry="8" fill="#FF8FB0" opacity=".6"/>
  <ellipse cx="${eye.l[0]}" cy="${eye.l[1]}" rx="8.5" ry="11" fill="#3A2233"/>
  <ellipse cx="${eye.r[0]}" cy="${eye.r[1]}" rx="8.5" ry="11" fill="#3A2233"/>
  <circle cx="${eye.l[0]-3}" cy="${eye.l[1]-4}" r="3.2" fill="#fff"/>
  <circle cx="${eye.r[0]-3}" cy="${eye.r[1]-4}" r="3.2" fill="#fff"/>
  <circle cx="${eye.l[0]+3}" cy="${eye.l[1]+4}" r="1.5" fill="#fff" opacity=".85"/>
  <circle cx="${eye.r[0]+3}" cy="${eye.r[1]+4}" r="1.5" fill="#fff" opacity=".85"/>
  <path d="M95 105 h10 l-5 5.5 z" fill="#E05C86"/>
  <path d="M100 110.5 q-5 6 -11 3 M100 110.5 q5 6 11 3" fill="none" stroke="#E05C86" stroke-width="2.4" stroke-linecap="round"/>`;
}

/* 반짝임 별 */
function sparkle(x, y, r, color = '#FFE08A') {
  return `<path d="M${x} ${y-r} Q${x+r*0.28} ${y-r*0.28} ${x+r} ${y} Q${x+r*0.28} ${y+r*0.28} ${x} ${y+r} Q${x-r*0.28} ${y+r*0.28} ${x-r} ${y} Q${x-r*0.28} ${y-r*0.28} ${x} ${y-r} Z" fill="${color}"/>`;
}

/* ── 소품: 연필로 색 점을 이어 그린 길 ── */
const APP = {
  bg: ['#FFE1D3', '#FFF6F0'],
  // 토끼 앞(배 위쪽)에 색 점 4개를 잇는 선 + 연필
  front: `<g transform="translate(60 128)">
    <!-- 이어진 길 -->
    <path d="M6 30 L26 6 L46 26 L66 4" fill="none" stroke="#F2694B" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- 색 점들 -->
    <circle cx="6"  cy="30" r="6.5" fill="#EA5148" stroke="#fff" stroke-width="2.4"/>
    <circle cx="26" cy="6"  r="6.5" fill="#F4C020" stroke="#fff" stroke-width="2.4"/>
    <circle cx="46" cy="26" r="6.5" fill="#5DBE58" stroke="#fff" stroke-width="2.4"/>
    <circle cx="66" cy="4"  r="6.5" fill="#4FA3E8" stroke="#fff" stroke-width="2.4"/>
    <!-- 연필 (마지막 점을 향해) -->
    <g transform="rotate(38 78 22)">
      <rect x="72" y="-16" width="12" height="34" rx="3" fill="#FFC83D" stroke="#D99B18" stroke-width="2.5"/>
      <rect x="72" y="-16" width="12" height="8"  rx="3" fill="#F58AA6"/>
      <path d="M72 18 h12 l-6 13 z" fill="#F6D9AE" stroke="#D99B18" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M75 27 h6 l-3 4 z" fill="#3A2233"/>
    </g>
  </g>`,
  top: sparkle(150, 58, 9, '#FFC46A') + sparkle(54, 70, 6, '#FFC7DE'),
};

function page(size) {
  const [c0, c1] = APP.bg;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0}
  .box{width:${size}px;height:${size}px;
    background:radial-gradient(120% 120% at 50% 28%, ${c1} 0%, ${c0} 100%)}
  svg{display:block;width:100%;height:100%}
  </style></head><body>
  <div class="box"><svg viewBox="0 0 200 205" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFC9DB"/><stop offset="1" stop-color="#FFB0C8"/>
      </linearGradient>
    </defs>
    ${rabbit(APP)}
    ${APP.front}
    ${APP.top}
  </svg></div></body></html>`;
}

const browser = await chromium.launch();
for (const size of [192, 512]) {
  const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(page(size));
  const buf = await p.locator('.box').screenshot({ type: 'png' });
  writeFileSync(join(outDir, `icon-${size}.png`), buf);
  console.log(`✅ icon-${size}.png (${buf.length} bytes)`);
  await p.close();
}
await browser.close();
