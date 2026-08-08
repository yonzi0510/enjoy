#!/usr/bin/env node
/* 아이콘 생성 — node tangram/tools/make-icon.mjs
 * 공유 마스코트(핑크 토끼)와 통일된 컨셉: 토끼가 무지개 고리 조각을 들고 있는 모습.
 * tools/make-mascot-icons.mjs 의 rabbit() 를 복제만 하고(원본 수정 금지),
 * 소품(무지개 고리 부채꼴 조각들)만 얹어 Chromium 으로 192·512 PNG 를 래스터화한다.
 * 팔레트: 몸 #FFC0D4~#FFB0C8 · 안쪽귀/볼 #FF8FB0 · 진한선/포인트 #E05C86 · 흰배 #FFF2F7
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ── 공유 make-mascot-icons.mjs 에서 복제한 핑크 토끼 베이스 (원본 무수정) ── */
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

/* 무지개 고리 부채꼴 조각 하나 (app data.js 의 arcPathD 와 같은 방식: 안쪽호+바깥호+두 직선) */
function ring(cx, cy, r0, r1, a0, a1, color) {
  const rad = d => (d) * Math.PI / 180;
  const pt = (r, a) => [cx + r * Math.sin(rad(a)), cy - r * Math.cos(rad(a))];
  const [ox0, oy0] = pt(r1, a0), [ox1, oy1] = pt(r1, a1);
  const [ix0, iy0] = pt(r0, a0), [ix1, iy1] = pt(r0, a1);
  const large = (a1 - a0) > 180 ? 1 : 0;
  const d = `M${ix0.toFixed(1)} ${iy0.toFixed(1)} L${ox0.toFixed(1)} ${oy0.toFixed(1)} ` +
    `A${r1} ${r1} 0 ${large} 1 ${ox1.toFixed(1)} ${oy1.toFixed(1)} ` +
    `L${ix1.toFixed(1)} ${iy1.toFixed(1)} A${r0} ${r0} 0 ${large} 0 ${ix0.toFixed(1)} ${iy0.toFixed(1)} Z`;
  return `<path d="${d}" fill="${color}" stroke="#fff" stroke-width="1.6"/>`;
}

/* 소품: 토끼 앞발 사이에 든 작은 무지개 고리(4조각) — 배 앞쪽에 */
const RAINBOW = ['#FF5A5F', '#FF9F40', '#FFD93D', '#4ECDC4', '#4FA3E8', '#3B5FC0'];
const ringProp = [0, 1, 2, 3].map(i => ring(100, 152, 12, 26, i * 90, i * 90 + 90, RAINBOW[i])).join('');

function page(size) {
  const [c0, c1] = ['#87BB83', '#9CC799'];
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0}
  .box{width:${size}px;height:${size}px;
    background:radial-gradient(120% 120% at 50% 28%, ${c1} 0%, ${c0} 100%)}
  svg{display:block;width:100%;height:100%}
  </style></head><body>
  <div class="box"><svg viewBox="0 0 200 205" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFC9DB"/><stop offset="1" stop-color="#FFB0C8"/>
      </linearGradient>
    </defs>
    ${rabbit({})}
    ${ringProp}
  </svg></div></body></html>`;
}

const browser = await chromium.launch();
for (const size of [192, 512]) {
  const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(page(size));
  const buf = await p.locator('.box').screenshot({ type: 'png' });
  writeFileSync(join(outDir, `icon-${size}.png`), buf);
  console.log(`✅ icon-${size}.png (${buf.length} bytes)`);
  await p.close();
}
await browser.close();
