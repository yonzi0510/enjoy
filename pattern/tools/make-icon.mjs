#!/usr/bin/env node
/* 아이콘 생성 — node pattern/tools/make-icon.mjs
 * 핑크 토끼 마스코트(다른 앱과 통일된 컨셉)가 알록달록 패턴 타일/도형 조각을 든 모습을
 * Chromium 으로 래스터화해 icon-192.png / icon-512.png 를 만든다.
 * 팔레트: 몸 #FFC9DB~#FFB0C8 · 안쪽귀·볼 #FF8FB0 · 진한선 #E05C86 · 흰배 #FFF2F7
 *   (tools/make-mascot-icons.mjs 의 rabbit() 을 복제 — 공유 파일은 수정하지 않는다)
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..');

/* 공용 핑크 토끼 베이스(복제) */
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
  <ellipse cx="66"  cy="150" rx="12" ry="14" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <ellipse cx="134" cy="150" rx="12" ry="14" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
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

/* 소품: 토끼가 든 알록달록 패턴 타일 줄(세모·하트·마름모·원) — 앱 상징 */
const front = `<g transform="translate(64 132)" stroke="#3A2740" stroke-width="2.5" stroke-linejoin="round">
    <!-- 빨강 세모 -->
    <path d="M13 2 L24 22 L2 22 Z" fill="#E24B3B"/>
    <!-- 노랑 하트 -->
    <path d="M40 22 C28 14 25 6 31 1.5 C35 -1 40 2 40 6 C40 2 45 -1 49 1.5 C55 6 52 14 40 22 Z" fill="#FFC12E"/>
    <!-- 파랑 마름모 -->
    <path d="M67 1 L79 12 L67 23 L55 12 Z" fill="#2E8FE0"/>
    <!-- 초록 동그라미 -->
    <circle cx="94" cy="12" r="11" fill="#4FB84A"/>
  </g>`;

/* 반짝임 별 */
function sparkle(x, y, r, color = '#9B6FD6') {
  return `<path d="M${x} ${y-r} Q${x+r*0.28} ${y-r*0.28} ${x+r} ${y} Q${x+r*0.28} ${y+r*0.28} ${x} ${y+r} Q${x-r*0.28} ${y+r*0.28} ${x-r} ${y} Q${x-r*0.28} ${y-r*0.28} ${x} ${y-r} Z" fill="${color}"/>`;
}
const top = sparkle(150, 60, 8, '#2BB6A9') + sparkle(56, 74, 6, '#FF7FAA');

function page(size) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0}
  .box{width:${size}px;height:${size}px;
    background:radial-gradient(120% 120% at 50% 28%, #EAF9F6 0%, #CFEFEA 100%)}
  svg{display:block;width:100%;height:100%}
  </style></head><body>
  <div class="box"><svg viewBox="0 0 200 205" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFC9DB"/><stop offset="1" stop-color="#FFB0C8"/>
      </linearGradient>
    </defs>
    ${rabbit()}
    ${front}
    ${top}
  </svg></div></body></html>`;
}

const browser = await chromium.launch();
for (const size of [192, 512]) {
  const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(page(size));
  const buf = await p.locator('.box').screenshot({ type: 'png' });
  writeFileSync(join(outDir, `icon-${size}.png`), buf);
  await p.close();
}
await browser.close();
console.log('✅ pattern/icon-{192,512}.png');
