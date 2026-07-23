#!/usr/bin/env node
/* 아이콘 생성 — node matrix/tools/make-icon.mjs
 * 다른 앱과 통일된 '핑크 토끼 마스코트'가 색·방향 조각(색깔 화살표 4방향 패드)을 든 모습을
 * Chromium 으로 래스터화해 icon-192.png / icon-512.png 를 만든다.
 * 토끼 베이스 SVG(rabbit())는 공유 tools/make-mascot-icons.mjs 의 것을 복제했다(공유 파일은 수정 금지).
 * 팔레트: 몸 #FFC0D4~#FFB0C8 · 안쪽귀/볼 #FF8FB0 · 진한선/포인트 #E05C86 · 흰배 #FFF2F7
 * 소품 색: 빨강 #EE5140 · 노랑 #FFCE44 · 파랑 #4FAAE8 · 초록 #68C566 (js/data.js 와 동일)
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ── 공유 make-mascot-icons.mjs 의 rabbit() 복제 (공유 파일은 건드리지 않음) ── */
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

/* ── 소품: 색×방향 조각 4개(빨강↑·노랑→·파랑↓·초록←)로 이룬 방향 패드 ──
 * 삼각형은 위를 향한 뒤 rot 만큼 돌린다(data.js 의 방향 규칙과 동일: 위0·오른90·아래180·왼270). */
function tri(cx, cy, rot, fill, line) {
  return `<g transform="translate(${cx} ${cy}) rotate(${rot})">
    <path d="M0 -15 C1.6 -15 2.8 -13.8 3.6 -12.2 L11.6 4.4 C13 7.2 11 10.4 8 10.4 L-8 10.4 C-11 10.4 -13 7.2 -11.6 4.4 L-3.6 -12.2 C-2.8 -13.8 -1.6 -15 0 -15 Z"
      fill="${fill}" stroke="${line}" stroke-width="2.4" stroke-linejoin="round"/>
    <circle cx="-3.2" cy="1" r="2.2" fill="#fff"/><circle cx="3.2" cy="1" r="2.2" fill="#fff"/>
    <circle cx="-2.8" cy="1.4" r="1.1" fill="#3A2233"/><circle cx="3.6" cy="1.4" r="1.1" fill="#3A2233"/>
  </g>`;
}
const PAD = `<g transform="translate(100 151)">
  <circle cx="0" cy="0" r="27" fill="#FFFFFF" opacity=".55"/>
  ${tri(0, -13, 0, '#EE5140', '#A9271B')}   <!-- 빨강 · 위 -->
  ${tri(15, 2, 90, '#FFCE44', '#CF8410')}   <!-- 노랑 · 오른쪽 -->
  ${tri(0, 17, 180, '#4FAAE8', '#1D6AA4')}  <!-- 파랑 · 아래 -->
  ${tri(-15, 2, 270, '#68C566', '#2C8531')} <!-- 초록 · 왼쪽 -->
</g>`;

const APP = {
  bg: ['#D6F1E1', '#F3FCF7'],
  front: PAD,
  top: sparkle(150, 60, 8, '#9FE0BE') + sparkle(56, 74, 6, '#FFC7DE'),
};

function pageHtml(size, app) {
  const [c0, c1] = app.bg;
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
    ${app.back || ''}
    ${rabbit(app)}
    ${app.front || ''}
    ${app.top || ''}
  </svg></div></body></html>`;
}

const browser = await chromium.launch();
for (const size of [192, 512]) {
  const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(pageHtml(size, APP));
  const buf = await p.locator('.box').screenshot({ type: 'png' });
  writeFileSync(join(outDir, `icon-${size}.png`), buf);
  console.log(`✅ icon-${size}.png (${buf.length} bytes)`);
  await p.close();
}
await browser.close();
