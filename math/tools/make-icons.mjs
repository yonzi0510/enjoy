#!/usr/bin/env node
/* 아이콘 생성 — node math/tools/make-icons.mjs
 * 숫자 블록을 든 주황 토끼 SVG 를 Chromium 으로 래스터화해 icon-192.png / icon-512.png 를 만든다.
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
    background:linear-gradient(160deg,#FFC46B,#EF8A2E)}
  svg{width:78%;height:78%}
  </style></head><body>
  <div class="box"><svg viewBox="0 0 200 210" xmlns="http://www.w3.org/2000/svg">
    <!-- 귀 -->
    <ellipse cx="70" cy="46" rx="16" ry="40" fill="#FFF1DC" transform="rotate(-12 70 46)"/>
    <ellipse cx="130" cy="46" rx="16" ry="40" fill="#FFF1DC" transform="rotate(12 130 46)"/>
    <ellipse cx="70" cy="50" rx="8" ry="26" fill="#FFB37E" transform="rotate(-12 70 50)"/>
    <ellipse cx="130" cy="50" rx="8" ry="26" fill="#FFB37E" transform="rotate(12 130 50)"/>
    <!-- 얼굴 -->
    <circle cx="100" cy="112" r="58" fill="#FFF1DC"/>
    <circle cx="70" cy="126" r="10" fill="#FFAB8A" opacity="0.85"/>
    <circle cx="130" cy="126" r="10" fill="#FFAB8A" opacity="0.85"/>
    <circle cx="82" cy="104" r="7.5" fill="#5A4632"/><circle cx="118" cy="104" r="7.5" fill="#5A4632"/>
    <circle cx="84.4" cy="101.6" r="2.4" fill="#fff"/><circle cx="120.4" cy="101.6" r="2.4" fill="#fff"/>
    <ellipse cx="100" cy="122" rx="7" ry="5" fill="#F08CAE"/>
    <path d="M100 127 Q94 136 87 132 M100 127 Q106 136 113 132" fill="none" stroke="#C4854F" stroke-width="4" stroke-linecap="round"/>
    <!-- 숫자 블록 -->
    <g font-family="Arial, sans-serif" font-weight="900" text-anchor="middle">
      <rect x="24" y="150" width="44" height="44" rx="10" fill="#5DB4F0"/>
      <text x="46" y="183" font-size="30" fill="#fff">1</text>
      <rect x="78" y="158" width="44" height="44" rx="10" fill="#6FCB86"/>
      <text x="100" y="191" font-size="30" fill="#fff">2</text>
      <rect x="132" y="150" width="44" height="44" rx="10" fill="#F282AE"/>
      <text x="154" y="183" font-size="30" fill="#fff">3</text>
    </g>
    <!-- 더하기 반짝 -->
    <g stroke="#FFF1DC" stroke-width="7" stroke-linecap="round">
      <path d="M170 84 h22 M181 73 v22"/>
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
