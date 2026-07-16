#!/usr/bin/env node
/* 아이콘 생성 — node market/tools/make-icons.mjs
 * 줄무늬 차양의 과일 가게 + 금색 동전 SVG 를 Chromium 으로 래스터화해 icon-192.png / icon-512.png 를 만든다.
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..');

function svg(size) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0}
  .box{width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;
    background:linear-gradient(160deg,#FFB98C,#EF7440)}
  svg{width:82%;height:82%}
  </style></head><body>
  <div class="box"><svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <!-- 가게 몸통 -->
    <rect x="26" y="66" width="148" height="106" rx="14" fill="#FFF6EA"/>
    <!-- 진열 선반 -->
    <rect x="40" y="118" width="120" height="10" rx="5" fill="#E8B08B"/>
    <!-- 진열된 과일: 사과·귤·포도 -->
    <circle cx="62" cy="104" r="15" fill="#F25C4B"/>
    <path d="M62 89 q3 -8 9 -9" fill="none" stroke="#5F8F3E" stroke-width="4" stroke-linecap="round"/>
    <circle cx="100" cy="104" r="15" fill="#FFA53E"/>
    <ellipse cx="100" cy="93" rx="4" ry="2.6" fill="#6FA84D"/>
    <g fill="#9B6FD4">
      <circle cx="132" cy="97" r="6.5"/><circle cx="144" cy="97" r="6.5"/>
      <circle cx="126" cy="107" r="6.5"/><circle cx="138" cy="107" r="6.5"/><circle cx="150" cy="107" r="6.5"/>
      <circle cx="132" cy="117" r="6.5"/><circle cx="144" cy="117" r="6.5"/>
    </g>
    <!-- 계산대 -->
    <rect x="26" y="140" width="148" height="32" rx="10" fill="#F5C48F"/>
    <rect x="26" y="140" width="148" height="10" fill="#E8A667"/>
    <!-- 차양 (빨강·흰 줄무늬) -->
    <g>
      <path d="M18 42 q82 -26 164 0 l0 22 q-82 20 -164 0 Z" fill="#F0563F"/>
      <path d="M43 35 l26 -4 0 34 q-13 2 -26 1 Z" fill="#FFF6EA"/>
      <path d="M95 30 l26 0 0 38 q-13 1 -26 0 Z" fill="#FFF6EA"/>
      <path d="M147 34 l26 5 0 30 q-13 3 -26 -1 Z" fill="#FFF6EA"/>
      <path d="M18 42 q82 -26 164 0 l0 8 q-82 -24 -164 0 Z" fill="#D9432E"/>
    </g>
    <!-- 금색 동전 -->
    <g>
      <circle cx="152" cy="158" r="30" fill="#FFD34E" stroke="#D9A13B" stroke-width="5"/>
      <circle cx="152" cy="158" r="20" fill="none" stroke="#D9A13B" stroke-width="2.6" opacity=".75"/>
      <text x="152" y="167" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900"
        font-size="22" fill="#7A5800">100</text>
    </g>
    <!-- 반짝 -->
    <g stroke="#FFF6EA" stroke-width="6" stroke-linecap="round">
      <path d="M30 22 h16 M38 14 v16"/>
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
