#!/usr/bin/env node
/* 아이콘 생성 — node shape/tools/make-icons.mjs
 * 알록달록 칠교 정사각형 SVG 를 Chromium 으로 래스터화해 icon-192.png / icon-512.png 를 만든다.
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..');

function svg(size) {
  // 고전 칠교 정사각형(8×8 좌표)을 조각별 색으로 — 앱 트레이 색과 같은 팔레트
  const pieces = [
    ['0,0 8,0 4,4', '#FF8A80'],      // 큰 삼각형 1
    ['0,0 4,4 0,8', '#4FC3F7'],      // 큰 삼각형 2
    ['8,4 8,8 4,8', '#81C784'],      // 중간 삼각형
    ['4,4 6,2 8,4 6,6', '#FF9E58'],  // 정사각형
    ['8,0 8,4 6,2', '#FFD54F'],      // 작은 삼각형 1
    ['2,6 4,4 6,6', '#BA68C8'],      // 작은 삼각형 2
    ['0,8 2,6 6,6 4,8', '#F48FB1'],  // 평행사변형
  ].map(([pts, fill]) =>
    `<polygon points="${pts}" fill="${fill}" stroke="#FFFFFF" stroke-width="0.42" stroke-linejoin="round"/>`
  ).join('\n    ');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0}
  .box{width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;
    background:linear-gradient(160deg,#7EE7D7,#2EC4B6)}
  svg{width:72%;height:72%}
  </style></head><body>
  <div class="box"><svg viewBox="-1 -1 10 10" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(-8 4 4)">
    ${pieces}
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
