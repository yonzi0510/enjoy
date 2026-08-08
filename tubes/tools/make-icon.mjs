#!/usr/bin/env node
/* 아이콘 생성 — node tubes/tools/make-icon.mjs
 * 공용 '핑크 토끼' 마스코트(tools/make-mascot-icons.mjs 의 rabbit())를 이 파일 안에 복제해,
 * 색 구슬이 담긴 시험관을 앞발로 든 모습을 Chromium 으로 래스터화한다.
 * → tubes/icon-192.png · icon-512.png
 * ※ 공유 tools/make-mascot-icons.mjs 는 절대 수정하지 않는다(이 파일은 그 rabbit()을 복사만).
 * 팔레트: 몸 #FFC9DB~#FFB0C8 · 안쪽귀/볼 #FF8FB0 · 진한선/포인트 #E05C86 · 흰배 #FFF2F7
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ── 공용 핑크 토끼 베이스 (make-mascot-icons.mjs 의 rabbit() 복제) ── */
function rabbit(opts = {}) {
  const eye = opts.eye || { l: [83, 92], r: [117, 92] };
  return `
  <!-- 귀 (머리 뒤) -->
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
  <!-- 발 -->
  <ellipse cx="82"  cy="187" rx="15" ry="10" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <ellipse cx="118" cy="187" rx="15" ry="10" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <ellipse cx="82"  cy="188" rx="6"  ry="4"  fill="#FF8FB0"/>
  <ellipse cx="118" cy="188" rx="6"  ry="4"  fill="#FF8FB0"/>
  <!-- 몸 + 흰 배 -->
  <ellipse cx="100" cy="150" rx="46" ry="43" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <ellipse cx="100" cy="158" rx="27" ry="30" fill="#FFF2F7"/>
  ${opts.paws !== false ? `
  <!-- 앞발 (소품을 감싼다) -->
  <ellipse cx="66"  cy="150" rx="12" ry="14" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <ellipse cx="134" cy="150" rx="12" ry="14" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>` : ''}
  <!-- 머리 -->
  <ellipse cx="100" cy="95" rx="50" ry="46" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <!-- 볼터치 -->
  <ellipse cx="71"  cy="103" rx="11" ry="8" fill="#FF8FB0" opacity=".6"/>
  <ellipse cx="129" cy="103" rx="11" ry="8" fill="#FF8FB0" opacity=".6"/>
  <!-- 눈 (반짝) -->
  <ellipse cx="${eye.l[0]}" cy="${eye.l[1]}" rx="8.5" ry="11" fill="#3A2233"/>
  <ellipse cx="${eye.r[0]}" cy="${eye.r[1]}" rx="8.5" ry="11" fill="#3A2233"/>
  <circle cx="${eye.l[0]-3}" cy="${eye.l[1]-4}" r="3.2" fill="#fff"/>
  <circle cx="${eye.r[0]-3}" cy="${eye.r[1]-4}" r="3.2" fill="#fff"/>
  <circle cx="${eye.l[0]+3}" cy="${eye.l[1]+4}" r="1.5" fill="#fff" opacity=".85"/>
  <circle cx="${eye.r[0]+3}" cy="${eye.r[1]+4}" r="1.5" fill="#fff" opacity=".85"/>
  <!-- 코 + 입 -->
  <path d="M95 105 h10 l-5 5.5 z" fill="#E05C86"/>
  <path d="M100 110.5 q-5 6 -11 3 M100 110.5 q5 6 11 3" fill="none" stroke="#E05C86" stroke-width="2.4" stroke-linecap="round"/>`;
}

function sparkle(x, y, r, color = '#FFE08A') {
  return `<path d="M${x} ${y-r} Q${x+r*0.28} ${y-r*0.28} ${x+r} ${y} Q${x+r*0.28} ${y+r*0.28} ${x} ${y+r} Q${x-r*0.28} ${y+r*0.28} ${x-r} ${y} Q${x-r*0.28} ${y-r*0.28} ${x} ${y-r} Z" fill="${color}"/>`;
}

/* ── 소품: 색 구슬이 담긴 시험관 (앞발 사이에 세로로) ──
 * 구슬은 아래→위로 빨강·노랑·초록·파랑 4알, 유리는 맑은 하늘빛. */
function bead(cx, cy, r, light, base, dark) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${base}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${dark}" stroke-width="1.2" opacity=".5"/>
    <ellipse cx="${cx-r*0.32}" cy="${cy-r*0.4}" rx="${r*0.42}" ry="${r*0.3}" fill="#fff" opacity=".7"/>`;
}
const TUBE = `
  <!-- 시험관 유리 -->
  <path d="M86 118 L86 168 Q86 188 100 188 Q114 188 114 168 L114 118 Z"
    fill="#EAF6FE" stroke="#8FB8E0" stroke-width="3.5" stroke-linejoin="round" opacity=".92"/>
  <!-- 구슬 4알 (아래→위 빨강·노랑·초록·파랑) -->
  ${bead(100, 176, 10.5, '#F58275', '#E24B3B', '#B4301F')}
  ${bead(100, 160, 10.5, '#FFE58C', '#F6C744', '#D6A014')}
  ${bead(100, 144, 10.5, '#93D783', '#57B24A', '#3B8330')}
  ${bead(100, 128, 10.5, '#8CB8EF', '#4C86D6', '#2C5FAC')}
  <!-- 유리 하이라이트 + 입구 테 -->
  <rect x="91" y="126" width="4" height="50" rx="2" fill="#fff" opacity=".55"/>
  <ellipse cx="100" cy="118" rx="14" ry="4.5" fill="#F4FAFF" stroke="#8FB8E0" stroke-width="3.5"/>`;

const APP = {
  bg: ['#B7A1D6', '#C6B5DE'],
  front: TUBE,
  top: sparkle(150, 60, 8, '#9BC4F0') + sparkle(56, 74, 6, '#C6A6E9'),
};

function page(size, app) {
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
  await p.setContent(page(size, APP));
  const buf = await p.locator('.box').screenshot({ type: 'png' });
  writeFileSync(join(outDir, `icon-${size}.png`), buf);
  console.log(`✅ icon-${size}.png (${buf.length} bytes)`);
  await p.close();
}
await browser.close();
