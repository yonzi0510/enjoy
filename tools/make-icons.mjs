#!/usr/bin/env node
/* 아이콘 생성 — node tools/make-icons.mjs
 * 메인 홈(은아의 놀이터)용 무지개 SVG 를 Chromium 으로 래스터화해
 * 루트 icon-192.png / icon-512.png 를 만든다.
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
  .box{width:${size}px;height:${size}px;display:flex;align-items:flex-end;justify-content:center;
    background:linear-gradient(170deg,#BFE7FF 0%,#E6F4FF 55%,#FFEFF7 100%)}
  svg{width:96%;height:88%}
  </style></head><body>
  <div class="box"><svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
    <!-- 해님 -->
    <circle cx="168" cy="30" r="17" fill="#FFD34E"/>
    <g stroke="#FFD34E" stroke-width="5" stroke-linecap="round">
      <path d="M168 4 V-2 M192 30 H198 M185 13 L189 9 M185 47 L189 51"/>
    </g>
    <!-- 무지개 (반원 아치) -->
    <g fill="none" stroke-linecap="round">
      <path d="M25 132 A75 75 0 0 1 175 132" stroke="#FF5F6D" stroke-width="11"/>
      <path d="M36 132 A64 64 0 0 1 164 132" stroke="#FF9F45" stroke-width="11"/>
      <path d="M47 132 A53 53 0 0 1 153 132" stroke="#FFD34E" stroke-width="11"/>
      <path d="M58 132 A42 42 0 0 1 142 132" stroke="#5DD187" stroke-width="11"/>
      <path d="M69 132 A31 31 0 0 1 131 132" stroke="#57B6F2" stroke-width="11"/>
      <path d="M80 132 A20 20 0 0 1 120 132" stroke="#9B7BE0" stroke-width="11"/>
    </g>
    <!-- 구름 -->
    <g fill="#FFFFFF">
      <ellipse cx="30" cy="132" rx="26" ry="15"/>
      <circle cx="16" cy="124" r="12"/><circle cx="38" cy="120" r="14"/>
      <ellipse cx="170" cy="132" rx="26" ry="15"/>
      <circle cx="158" cy="121" r="13"/><circle cx="182" cy="124" r="11"/>
    </g>
    <!-- 구름 볼터치 -->
    <circle cx="22" cy="132" r="4" fill="#FFC9DC"/><circle cx="42" cy="130" r="4" fill="#FFC9DC"/>
    <circle cx="162" cy="131" r="4" fill="#FFC9DC"/><circle cx="182" cy="132" r="4" fill="#FFC9DC"/>
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
