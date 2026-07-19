#!/usr/bin/env node
/* 아이콘 생성 — node bag/tools/make-icons.mjs
 * 지퍼백(가방)에 색 조각들이 담긴 SVG를 Chromium으로 래스터화해 icon-192.png / icon-512.png 를 만든다.
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
    background:linear-gradient(160deg,#F3E1C4,#D9A867)}
  svg{width:82%;height:82%}
  </style></head><body>
  <div class="box"><svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <!-- 지퍼백 몸통 -->
    <rect x="34" y="46" width="132" height="130" rx="18" fill="#FFFFFF" fill-opacity="0.92"
          stroke="#A5763A" stroke-width="9"/>
    <!-- 지퍼 줄 -->
    <rect x="34" y="58" width="132" height="12" fill="#C99A5B"/>
    <line x1="46" y1="46" x2="46" y2="30" stroke="#A5763A" stroke-width="7" stroke-linecap="round"/>
    <line x1="154" y1="46" x2="154" y2="30" stroke="#A5763A" stroke-width="7" stroke-linecap="round"/>
    <rect x="44" y="26" width="112" height="10" rx="5" fill="#A5763A"/>
    <!-- 안에 담긴 색 조각들 -->
    <circle cx="74" cy="104" r="17" fill="#FF8A80"/>
    <rect x="104" y="88" width="30" height="30" rx="7" fill="#4FC3F7"/>
    <polygon points="128,164 108,132 148,132" fill="#FFD54F"/>
    <rect x="56" y="134" width="34" height="14" rx="7" fill="#7FC06B"/>
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
