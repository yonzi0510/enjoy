#!/usr/bin/env node
/* 아이콘 생성 — node coloring/tools/make-icons.mjs
 * 크레용과 팔레트 물감 방울 SVG 를 Chromium 으로 래스터화해 icon-192/512.png 를 만든다.
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
    background:linear-gradient(160deg,#FBA7CE,#E85D9A)}
  svg{width:82%;height:82%}
  </style></head><body>
  <div class="box"><svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <!-- 종이 -->
    <rect x="34" y="30" width="132" height="150" rx="16" fill="#FFFFFF" stroke="#B0356E" stroke-width="7"/>
    <!-- 색칠된 하트 -->
    <path d="M100 74 C88 60 62 62 62 86 C62 108 100 132 100 132 C100 132 138 108 138 86 C138 62 112 60 100 74Z"
          fill="#FFD23D" stroke="#B0356E" stroke-width="6" stroke-linejoin="round"/>
    <!-- 크레용 3자루 -->
    <g stroke="#B0356E" stroke-width="5" stroke-linejoin="round">
      <rect x="48" y="150" width="22" height="44" rx="4" fill="#E8483F"/>
      <path d="M48 150 L59 132 L70 150Z" fill="#F4948C"/>
      <rect x="90" y="150" width="22" height="44" rx="4" fill="#3DB6E8"/>
      <path d="M90 150 L101 132 L112 150Z" fill="#9BD9F0"/>
      <rect x="132" y="150" width="22" height="44" rx="4" fill="#7BC043"/>
      <path d="M132 150 L143 132 L154 150Z" fill="#B6DF94"/>
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
