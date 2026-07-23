#!/usr/bin/env node
/* 아이콘 생성 — node kkochi/tools/make-icon.mjs
 * 공용 핑크 토끼 마스코트가 '꼬치 하나'를 든 모습을 Chromium 으로 래스터화해
 * icon-192.png / icon-512.png 를 만든다.
 * 토끼 베이스(rabbit())는 tools/make-mascot-icons.mjs 의 것을 복제했다(그 파일은 수정 금지).
 * 팔레트: 몸 #FFC9DB~#FFB0C8 · 안쪽귀/볼 #FF8FB0 · 진한선 #E05C86 · 흰배 #FFF2F7
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ── 공용 핑크 토끼 베이스 (make-mascot-icons.mjs 복제) ── */
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

/* ── 소품: 토끼가 든 꼬치 하나 (세로 스틱 + 먹음직한 알 4개) ──
 * 앞발(66,150)·(134,150) 사이 몸 앞에 살짝 기울여 세운다. 알은 서로 다른 재료색. */
function skewer() {
  const x = 100;                 // 스틱 가로 중심
  // 얼굴(눈 92·코 108·턱 141)을 가리지 않게 알은 가슴·배 앞(130~186)에만 둔다.
  const beads = [
    { cy: 186, c0: '#F0B36A', c1: '#C98A1E', rx: 16, ry: 12 }, // 감자/어묵빛 노릇한 알
    { cy: 167, c0: '#FF7E86', c1: '#E23B48', rx: 15, ry: 11 }, // 빨강 경단
    { cy: 149, c0: '#FFFFFF', c1: '#E6D8C8', rx: 14, ry: 11 }, // 하얀 떡
    { cy: 131, c0: '#8FD46B', c1: '#4E9E39', rx: 14, ry: 10 }, // 초록 경단
  ];
  return `
    <!-- 대나무 스틱: 알 뒤로 관통, 알 사이 틈으로 보인다 -->
    <g transform="rotate(5 ${x} 158)">
      <rect x="${x-4}" y="118" width="8" height="80" rx="4"
        fill="#E4B77E" stroke="#C08A46" stroke-width="2"/>
      <path d="M${x} 110 l7 12 h-14 z" fill="#E4B77E" stroke="#C08A46" stroke-width="2" stroke-linejoin="round"/>
      ${beads.map(b => `
      <ellipse cx="${x}" cy="${b.cy}" rx="${b.rx}" ry="${b.ry}" fill="${b.c1}" opacity=".35"/>
      <ellipse cx="${x}" cy="${b.cy}" rx="${b.rx-1.5}" ry="${b.ry-1}" fill="${b.c0}" stroke="${b.c1}" stroke-width="2"/>
      <ellipse cx="${x-4}" cy="${b.cy-3}" rx="${b.rx*0.4}" ry="${b.ry*0.32}" fill="#FFFFFF" opacity=".55"/>`).join('')}
    </g>`;
}

const BG = ['#FFE7D6', '#FFF6EE']; // 분식 국물빛 따뜻한 파스텔

function page(size) {
  const [c0, c1] = BG;
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
    ${rabbit()}
    ${skewer()}
    ${sparkle(150, 62, 8, '#FFC7DE') + sparkle(54, 78, 6, '#FFD9A0')}
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
console.log('완료 — 꼬치 든 토끼 아이콘 2종');
