#!/usr/bin/env node
/* 손가락 고무줄 아이콘 생성기 — node rings/tools/make-icon.mjs
 * 공용 마스코트(핑크 토끼)를 이 앱 안에서만 복제해, 색 고리를 손에 든 모습으로 그린다.
 * ⚠️ 공유 tools/make-mascot-icons.mjs 는 절대 수정하지 않는다(여기서 rabbit() 을 복제).
 * 팔레트: 몸 #FFC9DB~#FFB0C8 · 볼/안쪽귀 #FF8FB0 · 진한선 #E05C86 · 흰배 #FFF2F7
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const outDir = dirname(fileURLToPath(import.meta.url)).replace(/\/tools$/, '');

/* ── 공용 핑크 토끼 베이스(복제) ── */
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
function sparkle(x, y, r, color = '#FFE08A') {
  return `<path d="M${x} ${y-r} Q${x+r*0.28} ${y-r*0.28} ${x+r} ${y} Q${x+r*0.28} ${y+r*0.28} ${x} ${y+r} Q${x-r*0.28} ${y+r*0.28} ${x-r} ${y} Q${x-r*0.28} ${y-r*0.28} ${x} ${y-r} Z" fill="${color}"/>`;
}
/* 색 고리 밴드 하나(가운데 구멍) */
function ring(cx, cy, rx, ry, hex, lt, dk, rot = 0) {
  return `<g transform="rotate(${rot} ${cx} ${cy})">
    <ellipse cx="${cx}" cy="${cy+2}" rx="${rx}" ry="${ry}" fill="none" stroke="${dk}" stroke-width="9"/>
    <ellipse cx="${cx}" cy="${cy}"   rx="${rx}" ry="${ry}" fill="none" stroke="${hex}" stroke-width="7"/>
    <path d="M${cx-rx+3} ${cy-ry*0.4} Q${cx} ${cy-ry-4} ${cx+rx-3} ${cy-ry*0.4}" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" opacity=".6"/>
  </g>`;
}

/* 소품: 앞발 사이로 색 고리 3개를 손에 든 모습 + 귀 옆 반짝 */
const front = `
  ${ring(78, 152, 15, 10, '#4DA6E8', '#9BD0F5', '#2E7CC0', -12)}
  ${ring(122, 152, 15, 10, '#57BE4E', '#A7E58C', '#3E9636', 12)}
  ${ring(100, 146, 17, 11, '#EF4E4E', '#FF9C90', '#C42F2F', 0)}
`;
const top = sparkle(150, 58, 9, '#FFD34E') + sparkle(56, 66, 6, '#7FD0F5') + sparkle(44, 120, 6, '#B49BF0');

function pageHTML(size) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0}
  .box{width:${size}px;height:${size}px;
    background:radial-gradient(120% 120% at 50% 28%, #BFABDA 0%, #AF97D1 100%)}
  svg{display:block;width:100%;height:100%}
  </style></head><body>
  <div class="box"><svg viewBox="0 0 200 205" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFC9DB"/><stop offset="1" stop-color="#FFB0C8"/>
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
  console.log(`✅ rings/icon-${size}.png`);
}
await browser.close();
console.log('완료 — 아이콘 2종');
