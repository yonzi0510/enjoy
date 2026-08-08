#!/usr/bin/env node
/* 아이콘 생성 — node lines/tools/make-icon.mjs
 * 핑크 토끼 마스코트가 크레용(연필)을 쥐고 소용돌이 선을 막 그리고 있는 모습.
 * 몸 베이스는 루트 tools/make-mascot-icons.mjs 의 rabbit() 패턴을 그대로 복제(공유 파일은 건드리지 않음).
 * 핑크톤: 몸 #FFC0D4~#FFB0C8 · 안쪽귀/볼 #FF8FB0 · 진한선/포인트 #E05C86 · 흰배 #FFF2F7, 민트 배경(lines 앱 톤).
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..');

/* 공용 핑크 토끼 베이스(루트 make-mascot-icons.mjs 의 rabbit() 과 동일한 형태) */
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

/* 소용돌이 안내선(점선) — 오른쪽 앞발 아래에서 막 그려지는 중인 느낌 */
function swirlGuide() {
  const pts = [];
  const steps = 26, turns = 1.6;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const theta = t * turns * Math.PI * 2;
    const r = 8 + 30 * t;
    pts.push([160 + Math.cos(theta) * r, 176 - Math.sin(theta) * r * 0.75]);
  }
  const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return `<path d="${d}" fill="none" stroke="#8558C9" stroke-width="6" stroke-linecap="round"
    stroke-dasharray="3 10" opacity=".8"/>`;
}

/* 크레용을 쥔 앞발(소용돌이를 막 그리는 중) — 몸통 앞에 겹쳐 그린다 */
function crayonPaw() {
  return `
  <g transform="rotate(-32 150 158)">
    <!-- 크레용(굵은 삼각 촉) -->
    <rect x="140" y="118" width="20" height="52" rx="6" fill="#F4C020" stroke="#C98F16" stroke-width="3"/>
    <path d="M140 118 L150 100 L160 118 Z" fill="#E8946B" stroke="#C98F16" stroke-width="3" stroke-linejoin="round"/>
    <rect x="141" y="132" width="18" height="8" fill="#fff" opacity=".55"/>
  </g>
  <!-- 앞발(크레용을 쥐고 있음) -->
  <ellipse cx="146" cy="164" rx="13" ry="15" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>`;
}

function svg(size) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0}
  .box{width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;
    background:linear-gradient(160deg,#93BBDB,#7CADD3)}
  svg{width:86%;height:86%}
  </style></head><body>
  <div class="box"><svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD0DE"/><stop offset="1" stop-color="#FFB4CB"/></linearGradient>
    </defs>
    ${swirlGuide()}
    ${rabbit({ paws: false })}
    <!-- 왼쪽(그림상 오른쪽 아님, 향해서 왼쪽) 앞발은 기본 위치로 -->
    <ellipse cx="66" cy="150" rx="12" ry="14" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
    ${crayonPaw()}
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
