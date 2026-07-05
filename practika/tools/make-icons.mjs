#!/usr/bin/env node
/* 아이콘 생성 — node practika/tools/make-icons.mjs
 * 튜터 아바타 SVG 를 Chromium 으로 래스터화해 icon-192.png / icon-512.png 를 만든다.
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
    background:linear-gradient(160deg,#8A7BE0,#6B5AC8)}
  svg{width:74%;height:74%}
  </style></head><body>
  <div class="box"><svg viewBox="0 0 200 210" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 96 A60 60 0 0 1 160 96" fill="none" stroke="#F3EFFF" stroke-width="10" stroke-linecap="round"/>
    <circle cx="100" cy="112" r="60" fill="#FDFBFF"/>
    <circle cx="66" cy="126" r="11" fill="#FF9FC4" opacity="0.75"/>
    <circle cx="134" cy="126" r="11" fill="#FF9FC4" opacity="0.75"/>
    <circle cx="80" cy="104" r="8" fill="#4A3F8C"/><circle cx="120" cy="104" r="8" fill="#4A3F8C"/>
    <circle cx="82.5" cy="101.5" r="2.6" fill="#fff"/><circle cx="122.5" cy="101.5" r="2.6" fill="#fff"/>
    <ellipse cx="100" cy="132" rx="12" ry="8" fill="#8A5A86"/>
    <rect x="30" y="96" width="20" height="34" rx="9" fill="#F3EFFF"/>
    <rect x="150" y="96" width="20" height="34" rx="9" fill="#F3EFFF"/>
    <path d="M40 128 Q40 158 74 160" fill="none" stroke="#F3EFFF" stroke-width="6" stroke-linecap="round"/>
    <circle cx="78" cy="160" r="7" fill="#FF7FA8"/>
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
