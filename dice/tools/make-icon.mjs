#!/usr/bin/env node
/* 아이콘 생성 — node dice/tools/make-icon.mjs
 * 핑크 토끼 마스코트가 동물 주사위를 든 모습(다른 앱과 통일된 컨셉)을 Chromium 으로 래스터화해
 * icon-192.png / icon-512.png 를 만든다.
 * 핑크톤: 몸 #FFC0D4 · 안쪽귀·볼 #FF8FB0 · 선 #E05C86 · 흰배 #FFF2F7, 초록 주사위 소품.
 * (공유 tools/make-mascot-icons.mjs 는 건드리지 않는다 — dice 전용 복제본)
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
    background:linear-gradient(160deg,#E4A4A0,#DE908B)}
  svg{width:86%;height:86%}
  </style></head><body>
  <div class="box"><svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD0DE"/><stop offset="1" stop-color="#FFB4CB"/></linearGradient>
      <linearGradient id="dice" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#EAF6EC"/></linearGradient>
    </defs>
    <!-- 귀 -->
    <g stroke="#E05C86" stroke-width="5">
      <path d="M74 60 C64 26 58 8 72 6 C86 8 84 40 88 58 Z" fill="url(#body)"/>
      <path d="M126 60 C136 26 142 8 128 6 C114 8 116 40 112 58 Z" fill="url(#body)"/>
    </g>
    <path d="M76 54 C70 32 68 18 74 16 C80 20 80 40 84 54 Z" fill="#FF8FB0"/>
    <path d="M124 54 C130 32 132 18 126 16 C120 20 120 40 116 54 Z" fill="#FF8FB0"/>
    <!-- 얼굴 -->
    <ellipse cx="100" cy="90" rx="52" ry="46" fill="url(#body)" stroke="#E05C86" stroke-width="5"/>
    <ellipse cx="100" cy="104" rx="30" ry="22" fill="#FFF2F7"/>
    <circle cx="80" cy="84" r="6.5" fill="#5A2B3A"/><circle cx="120" cy="84" r="6.5" fill="#5A2B3A"/>
    <circle cx="82" cy="82" r="2" fill="#fff"/><circle cx="122" cy="82" r="2" fill="#fff"/>
    <ellipse cx="70" cy="100" rx="9" ry="6" fill="#FF8FB0" opacity=".8"/>
    <ellipse cx="130" cy="100" rx="9" ry="6" fill="#FF8FB0" opacity=".8"/>
    <path d="M96 94 Q100 98 104 94" fill="#FF8FB0" stroke="#E05C86" stroke-width="3" stroke-linejoin="round"/>
    <path d="M100 98 Q92 108 84 102 M100 98 Q108 108 116 102" fill="none" stroke="#E05C86" stroke-width="3.5" stroke-linecap="round"/>
    <!-- 손 -->
    <ellipse cx="60" cy="150" rx="15" ry="13" fill="url(#body)" stroke="#E05C86" stroke-width="5"/>
    <ellipse cx="140" cy="150" rx="15" ry="13" fill="url(#body)" stroke="#E05C86" stroke-width="5"/>
    <!-- 동물 주사위 (개구리 얼굴) -->
    <rect x="66" y="126" width="68" height="60" rx="16" fill="url(#dice)" stroke="#3E9B5B" stroke-width="4.5"/>
    <circle cx="86" cy="146" r="9" fill="#8DC63F" stroke="#5F9628" stroke-width="2.4"/>
    <circle cx="114" cy="146" r="9" fill="#8DC63F" stroke="#5F9628" stroke-width="2.4"/>
    <circle cx="86" cy="146" r="4" fill="#2E2E2E"/><circle cx="114" cy="146" r="4" fill="#2E2E2E"/>
    <path d="M80 164 Q100 178 120 164" fill="none" stroke="#4E7E22" stroke-width="4" stroke-linecap="round"/>
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
