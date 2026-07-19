#!/usr/bin/env node
/* 아이콘 생성 — node burger/tools/make-icons.mjs
 * 핑크 토끼 마스코트가 햄버거를 든 모습(다른 앱과 통일된 컨셉)을 Chromium 으로 래스터화해
 * icon-192.png / icon-512.png 를 만든다.
 * 핑크톤: 몸 #FFC0D4 · 안쪽귀·볼 #FF8FB0 · 선 #E05C86, 햄버거 소품.
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
    background:linear-gradient(160deg,#FFE1EA,#FFB7CC)}
  svg{width:86%;height:86%}
  </style></head><body>
  <div class="box"><svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F8CD86"/><stop offset="1" stop-color="#DD9540"/></linearGradient>
      <linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD0DE"/><stop offset="1" stop-color="#FFB4CB"/></linearGradient>
    </defs>
    <!-- 귀 -->
    <g stroke="#E05C86" stroke-width="5">
      <path d="M74 60 C64 26 58 8 72 6 C86 8 84 40 88 58 Z" fill="url(#body)"/>
      <path d="M126 60 C136 26 142 8 128 6 C114 8 116 40 112 58 Z" fill="url(#body)"/>
    </g>
    <path d="M76 54 C70 32 68 18 74 16 C80 20 80 40 84 54 Z" fill="#FF8FB0"/>
    <path d="M124 54 C130 32 132 18 126 16 C120 20 120 40 116 54 Z" fill="#FF8FB0"/>
    <!-- 얼굴 -->
    <ellipse cx="100" cy="92" rx="52" ry="46" fill="url(#body)" stroke="#E05C86" stroke-width="5"/>
    <circle cx="80" cy="86" r="6.5" fill="#5A2B3A"/><circle cx="120" cy="86" r="6.5" fill="#5A2B3A"/>
    <circle cx="82" cy="84" r="2" fill="#fff"/><circle cx="122" cy="84" r="2" fill="#fff"/>
    <ellipse cx="70" cy="102" rx="9" ry="6" fill="#FF8FB0" opacity=".8"/>
    <ellipse cx="130" cy="102" rx="9" ry="6" fill="#FF8FB0" opacity=".8"/>
    <path d="M96 96 Q100 100 104 96" fill="#FF8FB0" stroke="#E05C86" stroke-width="3" stroke-linejoin="round"/>
    <path d="M100 100 Q92 110 84 104 M100 100 Q108 110 116 104" fill="none" stroke="#E05C86" stroke-width="3.5" stroke-linecap="round"/>
    <!-- 손 -->
    <ellipse cx="66" cy="150" rx="15" ry="13" fill="url(#body)" stroke="#E05C86" stroke-width="5"/>
    <ellipse cx="134" cy="150" rx="15" ry="13" fill="url(#body)" stroke="#E05C86" stroke-width="5"/>
    <!-- 햄버거 -->
    <g stroke="#B8321F" stroke-width="3.5" stroke-linejoin="round">
      <path d="M60 150 C60 132 82 124 100 124 C118 124 140 132 140 150 Z" fill="url(#bun)"/>
      <rect x="58" y="150" width="84" height="12" rx="6" fill="#7CC242"/>
      <rect x="60" y="160" width="80" height="12" rx="5" fill="#E24B3B"/>
      <rect x="58" y="170" width="84" height="14" rx="7" fill="url(#bun)"/>
    </g>
    <g fill="#FBEFCF"><ellipse cx="86" cy="138" rx="4" ry="2.4"/><ellipse cx="108" cy="134" rx="4" ry="2.4"/><ellipse cx="120" cy="142" rx="3.6" ry="2.2"/></g>
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
