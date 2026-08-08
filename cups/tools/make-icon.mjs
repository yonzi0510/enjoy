#!/usr/bin/env node
/* 아이콘 생성 — node cups/tools/make-icon.mjs
 * 공유 마스코트(핑크 토끼)와 통일된 컨셉: 토끼가 색깔 컵 탑을 안은 모습.
 * tools/make-mascot-icons.mjs 의 rabbit()·page() 를 복제만 하고(원본 수정 금지),
 * 소품(색 컵 피라미드)만 얹어 Chromium 으로 192·512 PNG 를 래스터화한다.
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

/* 색 컵 소품 하나 — 위 넓고 아래 좁은 사다리꼴 (app data.js cupSVG 와 통일된 모양) */
function cup(cx, cy, w, gid, lite, dark, rim) {
  const hw = w / 2, top = cy - w * 0.48, bot = cy + w * 0.48;
  const tl = cx - hw, tr = cx + hw, bl = cx - hw * 0.62, br = cx + hw * 0.62;
  return `
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${lite}"/><stop offset="1" stop-color="${dark}"/>
    </linearGradient></defs>
    <path d="M${tl} ${top} L${tr} ${top} L${br} ${bot} Q${br} ${bot+3} ${br-3} ${bot+3} L${bl+3} ${bot+3} Q${bl} ${bot+3} ${bl} ${bot} Z"
      fill="url(#${gid})" stroke="#B84A78" stroke-width="2.4" stroke-linejoin="round"/>
    <ellipse cx="${cx}" cy="${top}" rx="${hw}" ry="${w*0.16}" fill="${rim}" stroke="#B84A78" stroke-width="2.4"/>
    <ellipse cx="${cx}" cy="${top-0.5}" rx="${hw*0.78}" ry="${w*0.11}" fill="${dark}"/>`;
}

/* 소품: 토끼가 안은 3컵 피라미드 (빨강·노랑 + 파랑 꼭대기) — 배 앞쪽에 */
const cupsProp = `
  ${cup(84, 158, 30, 'ic-r', '#FF7D6E', '#E23B2E', '#B72A1E')}
  ${cup(116, 158, 30, 'ic-y', '#FFE066', '#F4BE12', '#C99705')}
  ${cup(100, 133, 30, 'ic-b', '#5FB9F0', '#2E86D6', '#1F65A8')}`;

function page(size) {
  const [c0, c1] = ['#9CC799', '#B1D3AE'];
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
    ${cupsProp}
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
