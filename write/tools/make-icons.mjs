#!/usr/bin/env node
/* 아이콘 생성 — node write/tools/make-icons.mjs
 * 연필 든 파란 토끼 SVG 를 Chromium 으로 래스터화해 icon-192.png / icon-512.png 를 만든다.
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
    background:linear-gradient(160deg,#7FB8FF,#3D7BE8)}
  svg{width:78%;height:78%}
  </style></head><body>
  <div class="box"><svg viewBox="0 0 200 210" xmlns="http://www.w3.org/2000/svg">
    <!-- 귀 -->
    <ellipse cx="70" cy="46" rx="16" ry="40" fill="#CFE5FF" transform="rotate(-12 70 46)"/>
    <ellipse cx="130" cy="46" rx="16" ry="40" fill="#CFE5FF" transform="rotate(12 130 46)"/>
    <ellipse cx="70" cy="50" rx="8" ry="26" fill="#8FBDF7" transform="rotate(-12 70 50)"/>
    <ellipse cx="130" cy="50" rx="8" ry="26" fill="#8FBDF7" transform="rotate(12 130 50)"/>
    <!-- 얼굴 -->
    <circle cx="100" cy="112" r="58" fill="#CFE5FF"/>
    <circle cx="70" cy="126" r="10" fill="#FFAECB" opacity="0.85"/>
    <circle cx="130" cy="126" r="10" fill="#FFAECB" opacity="0.85"/>
    <circle cx="82" cy="104" r="7.5" fill="#23406E"/><circle cx="118" cy="104" r="7.5" fill="#23406E"/>
    <circle cx="84.4" cy="101.6" r="2.4" fill="#fff"/><circle cx="120.4" cy="101.6" r="2.4" fill="#fff"/>
    <ellipse cx="100" cy="122" rx="7" ry="5" fill="#F08CAE"/>
    <path d="M100 127 Q94 136 87 132 M100 127 Q106 136 113 132" fill="none" stroke="#5D86C4" stroke-width="4" stroke-linecap="round"/>
    <!-- 연필 -->
    <g transform="rotate(38 150 158)">
      <rect x="136" y="118" width="26" height="62" rx="4" fill="#F5C542"/>
      <rect x="136" y="112" width="26" height="12" rx="4" fill="#FF8FB3"/>
      <path d="M136 180 L149 202 L162 180 Z" fill="#FFE3B0"/>
      <path d="M144 193 L149 202 L154 193 Z" fill="#5A4632"/>
    </g>
    <!-- 글씨 획 -->
    <path d="M28 186 Q48 172 66 186 Q84 200 100 188" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/>
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
