#!/usr/bin/env node
/* 아이콘 생성 — node donut/tools/make-icon.mjs
 * 공용 핑크 토끼(마스코트)가 도넛을 든 모습을 Chromium 으로 래스터화해
 * icon-192.png / icon-512.png 를 만든다. tools/make-mascot-icons.mjs 의 rabbit() 를 복제.
 * 팔레트: 몸 #FFC9DB~#FFB0C8 · 안쪽귀/볼 #FF8FB0 · 진한선 #E05C86 · 흰배 #FFF2F7 · 도넛 소품.
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..');

/* 공용 핑크 토끼 베이스 (tools/make-mascot-icons.mjs rabbit() 복제) */
function rabbit(opts = {}) {
  const eye = opts.eye || { l: [83, 92], r: [117, 92] };
  return `
  <g>
    <g transform="rotate(-14 84 62)">
      <ellipse cx="84" cy="40" rx="15" ry="40" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
      <ellipse cx="84" cy="44" rx="7"  ry="27" fill="#FF8FB0"/>
    </g>
    <g transform="rotate(14 116 62)">
      <ellipse cx="116" cy="40" rx="15" ry="40" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
      <ellipse cx="116" cy="44" rx="7"  ry="27" fill="#FF8FB0"/>
    </g>
  </g>
  <ellipse cx="82"  cy="187" rx="15" ry="10" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <ellipse cx="118" cy="187" rx="15" ry="10" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <ellipse cx="82"  cy="188" rx="6"  ry="4"  fill="#FF8FB0"/>
  <ellipse cx="118" cy="188" rx="6"  ry="4"  fill="#FF8FB0"/>
  <ellipse cx="100" cy="150" rx="46" ry="43" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <ellipse cx="100" cy="158" rx="27" ry="30" fill="#FFF2F7"/>
  ${opts.paws !== false ? `
  <ellipse cx="66"  cy="150" rx="12" ry="14" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <ellipse cx="134" cy="150" rx="12" ry="14" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>` : ''}
  <ellipse cx="100" cy="95" rx="50" ry="46" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <ellipse cx="71"  cy="103" rx="11" ry="8" fill="#FF8FB0" opacity=".6"/>
  <ellipse cx="129" cy="103" rx="11" ry="8" fill="#FF8FB0" opacity=".6"/>
  <ellipse cx="${eye.l[0]}" cy="${eye.l[1]}" rx="8.5" ry="11" fill="#3A2233"/>
  <ellipse cx="${eye.r[0]}" cy="${eye.r[1]}" rx="8.5" ry="11" fill="#3A2233"/>
  <circle cx="${eye.l[0]-3}" cy="${eye.l[1]-4}" r="3.2" fill="#fff"/>
  <circle cx="${eye.r[0]-3}" cy="${eye.r[1]-4}" r="3.2" fill="#fff"/>
  <circle cx="${eye.l[0]+3}" cy="${eye.l[1]+4}" r="1.5" fill="#fff" opacity=".85"/>
  <circle cx="${eye.r[0]+3}" cy="${eye.r[1]+4}" r="1.5" fill="#fff" opacity=".85"/>
  <path d="M95 105 h10 l-5 5.5 z" fill="#E05C86"/>
  <path d="M100 110.5 q-5 6 -11 3 M100 110.5 q5 6 11 3" fill="none" stroke="#E05C86" stroke-width="2.4" stroke-linecap="round"/>`;
}

function sparkle(x, y, r, color = '#FFE08A') {
  return `<path d="M${x} ${y-r} Q${x+r*0.28} ${y-r*0.28} ${x+r} ${y} Q${x+r*0.28} ${y+r*0.28} ${x} ${y+r} Q${x-r*0.28} ${y+r*0.28} ${x-r} ${y} Q${x-r*0.28} ${y-r*0.28} ${x} ${y-r} Z" fill="${color}"/>`;
}

/* 딸기 도넛 소품(토끼 앞발이 감싸는 앞쪽) — 도우 링 + 분홍 아이싱 + 알록달록 스프링클 */
const donut = `<g transform="translate(100 150)">
  <ellipse cx="0" cy="26" rx="34" ry="6" fill="#C98A4E" opacity=".18"/>
  <circle cx="0" cy="0" r="30" fill="none" stroke="url(#dough)" stroke-width="26"/>
  <g fill="#EE7CA6"><circle cx="-16" cy="28" r="4.4"/><circle cx="0" cy="32" r="5.2"/><circle cx="17" cy="27" r="4"/></g>
  <circle cx="0" cy="0" r="30" fill="none" stroke="url(#icing)" stroke-width="20"/>
  <path d="M-16 -13 A22 22 0 0 1 16 -16" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity=".45"/>
  <g stroke-width="3.4" stroke-linecap="round">
    <path d="M-26 -6 l5 -4" stroke="#FFD24C"/>
    <path d="M-8 -24 l3 6" stroke="#5EC2E8"/>
    <path d="M14 -22 l-2 6" stroke="#8ED96B"/>
    <path d="M26 -4 l-6 -2" stroke="#B57CE0"/>
    <path d="M22 16 l-4 -5" stroke="#FF9F5A"/>
    <path d="M-22 14 l6 -3" stroke="#FFD24C"/>
    <path d="M2 -28 l0 6" stroke="#EE7CA6"/>
  </g>
  <circle cx="0" cy="0" r="12" fill="none" stroke="#CB914F" stroke-width="3" opacity=".55"/>
</g>`;

function svg(size) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0}
  .box{width:${size}px;height:${size}px;
    background:radial-gradient(120% 120% at 50% 28%, #E7AEAA 0%, #E19A96 100%)}
  svg{display:block;width:100%;height:100%}
  </style></head><body>
  <div class="box"><svg viewBox="0 0 200 205" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFC9DB"/><stop offset="1" stop-color="#FFB0C8"/>
      </linearGradient>
      <linearGradient id="dough" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EEBC84"/><stop offset="1" stop-color="#CB914F"/></linearGradient>
      <linearGradient id="icing" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7A6C4"/><stop offset="1" stop-color="#EE7CA6"/></linearGradient>
    </defs>
    ${rabbit()}
    ${donut}
    ${sparkle(150, 60, 8, '#FFD34E') + sparkle(52, 72, 6, '#FFC7DE')}
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
