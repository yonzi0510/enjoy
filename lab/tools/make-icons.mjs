#!/usr/bin/env node
/* 아이콘 생성 — node lab/tools/make-icons.mjs
 * 물감 방울이 떨어지는 유리병 SVG 를 Chromium 으로 래스터화해 icon-192.png / icon-512.png 를 만든다.
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
    background:linear-gradient(160deg,#C8E89A,#8BBF52)}
  svg{width:80%;height:80%}
  </style></head><body>
  <div class="box"><svg viewBox="0 0 200 210" xmlns="http://www.w3.org/2000/svg">
    <!-- 유리병 속 주황 물 (빨+노가 섞이는 중) -->
    <path d="M64 62 q-26 14 -26 46 v64 q0 20 20 20 h84 q20 0 20 -20 v-64 q0 -32 -26 -46 z" fill="#EAF6FB"/>
    <path d="M42 122 h116 v50 q0 20 -20 20 h-76 q-20 0 -20 -20 z" fill="#FF9F40"/>
    <path d="M42 122 q20 -8 39 0 t39 0 t38 0 v10 h-116 z" fill="#FFB56B"/>
    <!-- 거품 -->
    <circle cx="76" cy="160" r="7" fill="#FFD9AE"/><circle cx="118" cy="174" r="5" fill="#FFD9AE"/>
    <circle cx="138" cy="148" r="6" fill="#FFD9AE"/>
    <!-- 병 테두리 + 입구 -->
    <path d="M66 40 h68 v22 q26 14 26 46 v64 q0 20 -20 20 h-80 q-20 0 -20 -20 v-64 q0 -32 26 -46 z"
          fill="none" stroke="#4C7A1C" stroke-width="9" stroke-linejoin="round"/>
    <rect x="56" y="26" width="88" height="18" rx="9" fill="#4C7A1C"/>
    <!-- 떨어지는 물감 방울 (빨강·노랑) -->
    <path d="M74 0 q11 14 11 21 a11 11 0 1 1 -22 0 q0 -7 11 -21z" fill="#E8354D"/>
    <path d="M126 6 q11 14 11 21 a11 11 0 1 1 -22 0 q0 -7 11 -21z" fill="#FFD400"/>
    <!-- 유리 반짝임 -->
    <path d="M56 108 q0 -22 16 -34" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="8" stroke-linecap="round"/>
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
