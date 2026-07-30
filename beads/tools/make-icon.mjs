#!/usr/bin/env node
/* 아이콘 생성 — node beads/tools/make-icon.mjs
 * 다른 앱과 통일된 '핑크 토끼 마스코트'가 색 구슬을 집게로 든 모습을
 * Chromium 으로 래스터화해 icon-192.png / icon-512.png 를 만든다.
 * 토끼 베이스 SVG(rabbit())는 공유 tools/make-mascot-icons.mjs 의 것을 복제했다(공유 파일은 수정 금지).
 * 팔레트: 몸 #FFC0D4~#FFB0C8 · 안쪽귀/볼 #FF8FB0 · 진한선/포인트 #E05C86 · 흰배 #FFF2F7
 * 소품 색: 구슬은 js/data.js 의 6색(빨강 #E24B3B · 노랑 #FDCB35 · 파랑 #4FA3E8 · 초록 #5CB85C 등)
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

/* ── 반짝이는 색 구슬 한 알 (js/data.js drawBead 와 같은 느낌) ── */
function bead(cx, cy, r, c0, c1, c2, uid) {
  return `<g>
    <defs><radialGradient id="${uid}" cx=".37" cy=".33" r=".75">
      <stop offset="0" stop-color="${c0}"/><stop offset=".55" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </radialGradient></defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${uid})" stroke="${c2}" stroke-width="2"/>
    <ellipse cx="${cx-r*0.28}" cy="${cy-r*0.34}" rx="${r*0.34}" ry="${r*0.24}" fill="#fff" opacity=".55" transform="rotate(-24 ${cx-r*0.28} ${cy-r*0.34})"/>
  </g>`;
}

/* ── 소품: 토끼가 집게(집게발)로 파란 구슬을 들고, 앞발 옆에 색 구슬 3알 ──
 * 얼굴을 가리지 않게 아래쪽·손 근처에 배치한다. */
const PROP = `
  ${bead(100, 150, 15, '#8FD0F5', '#4FA3E8', '#2E77B0', 'bd-hold')}
  ${bead(64, 168, 11, '#F58A72', '#E24B3B', '#B8321F', 'bd-r')}
  ${bead(100, 178, 11, '#FFE47A', '#FDCB35', '#DFA51C', 'bd-y')}
  ${bead(136, 168, 11, '#9BD86B', '#5CB85C', '#3E8E3E', 'bd-g')}`;

const APP = {
  bg: ['#D6E9FB', '#F1F8FF'],
  front: PROP,
  top: sparkle(150, 60, 8, '#9CC9F2') + sparkle(56, 74, 6, '#FFC7DE'),
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
