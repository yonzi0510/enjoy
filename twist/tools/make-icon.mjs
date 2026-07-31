#!/usr/bin/env node
/* 아이콘 생성 — node twist/tools/make-icon.mjs
 * 핑크 토끼 마스코트가 돌림 블록(원통 실린더) 하나를 손에 들고 돌리는 모습(다른 앱과 통일된 컨셉)을
 * Chromium 으로 래스터화해 icon-192.png / icon-512.png 를 만든다.
 * 핑크톤: 몸 #FFC0D4 · 안쪽귀·볼 #FF8FB0 · 선 #E05C86 · 흰배 #FFF2F7, 호박색 원통 블록 소품.
 * (공유 tools/make-mascot-icons.mjs 는 건드리지 않는다 — twist 전용 복제본)
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..');

/* 공용 핑크 토끼 베이스(마스코트 통일 규칙) — 몸통·귀·눈·코·입만, 소품은 바깥에서 얹는다 */
function rabbit() {
  return `
  <!-- 귀 -->
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
  <!-- 앞발(원통 블록을 감싸 쥔다) -->
  <ellipse cx="62"  cy="146" rx="12" ry="14" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <ellipse cx="138" cy="146" rx="12" ry="14" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <!-- 머리 -->
  <ellipse cx="100" cy="95" rx="50" ry="46" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <!-- 볼터치 -->
  <ellipse cx="71"  cy="103" rx="11" ry="8" fill="#FF8FB0" opacity=".6"/>
  <ellipse cx="129" cy="103" rx="11" ry="8" fill="#FF8FB0" opacity=".6"/>
  <!-- 눈 (반짝) -->
  <ellipse cx="83" cy="92" rx="8.5" ry="11" fill="#3A2233"/>
  <ellipse cx="117" cy="92" rx="8.5" ry="11" fill="#3A2233"/>
  <circle cx="80" cy="88" r="3.2" fill="#fff"/><circle cx="114" cy="88" r="3.2" fill="#fff"/>
  <circle cx="86" cy="96" r="1.5" fill="#fff" opacity=".85"/><circle cx="120" cy="96" r="1.5" fill="#fff" opacity=".85"/>
  <!-- 코 + 입 -->
  <path d="M95 105 h10 l-5 5.5 z" fill="#E05C86"/>
  <path d="M100 110.5 q-5 6 -11 3 M100 110.5 q5 6 11 3" fill="none" stroke="#E05C86" stroke-width="2.4" stroke-linecap="round"/>`;
}

function svg(size) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0}
  .box{width:${size}px;height:${size}px;
    background:radial-gradient(120% 120% at 50% 28%, #FFF3E0 0%, #FFE1B8 100%)}
  svg{display:block;width:100%;height:100%}
  </style></head><body>
  <div class="box"><svg viewBox="0 0 200 205" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFC9DB"/><stop offset="1" stop-color="#FFB0C8"/>
      </linearGradient>
      <linearGradient id="rod" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#D9A25E"/><stop offset="1" stop-color="#8F5B26"/>
      </linearGradient>
    </defs>
    ${rabbit()}
    <!-- 나무 막대(원통 블록이 꿰인 막대) — 앞발 사이를 가로지른다 -->
    <rect x="52" y="140" width="96" height="14" rx="7" fill="url(#rod)" stroke="#6E431C" stroke-width="2.5"/>
    <!-- 돌림 블록(원통) 하나 — 동물 얼굴(사슴) -->
    <rect x="78" y="118" width="44" height="48" rx="14" fill="#FFF8EC" stroke="#C97C2E" stroke-width="4"/>
    <g transform="translate(100 142)">
      <path d="M-14 -20 L-19 -34 L-6 -22 Z" fill="#C97C2E" stroke="#8F5B26" stroke-width="2" stroke-linejoin="round"/>
      <path d="M14 -20 L19 -34 L6 -22 Z" fill="#C97C2E" stroke="#8F5B26" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="0" cy="0" r="17" fill="#E8B073" stroke="#C97C2E" stroke-width="2.6"/>
      <circle cx="-6" cy="-3" r="2.6" fill="#5A3216"/><circle cx="6" cy="-3" r="2.6" fill="#5A3216"/>
      <ellipse cx="0" cy="6" rx="5" ry="3.4" fill="#8F5B26"/>
    </g>
  </svg></div></body></html>`;
}

const browser = await chromium.launch();
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(svg(size));
  const buf = await page.locator('.box').screenshot({ type: 'png' });
  writeFileSync(join(outDir, `icon-${size}.png`), buf);
  console.log(`✅ icon-${size}.png (${buf.length} bytes)`);
  await page.close();
}
await browser.close();
