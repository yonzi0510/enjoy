#!/usr/bin/env node
/* 묶음(카테고리) 아이콘 생성기 — node tools/make-category-icons.mjs
 *
 * 홈 화면의 6개 묶음 머리표에 쓰는 핑크 토끼 6마리를 만든다.
 * 앱 아이콘(tools/make-mascot-icons.mjs)과 같은 토끼를 쓰되, 목적이 다르다:
 *   - 앱 아이콘: 28장을 구분해야 해서 소품이 작다 → 카드 크기에서 잘 안 보인다
 *   - 묶음 아이콘: 6마리만 외우면 되므로 소품을 크게 잡아 60px 에서도 알아보게 한다
 * 배경도 묶음 색을 그대로 써서 색 띠와 토끼가 같은 신호를 준다.
 *
 * 토끼 팔레트(앱 아이콘과 동일): 몸 #FFC0D4~#FFB0C8 · 안쪽귀/볼 #FF8FB0 ·
 * 진한선/포인트 #E05C86 · 흰배 #FFF2F7
 *
 * ※ tools/make-mascot-icons.mjs 는 최상위 await 로 즉시 실행되는 스크립트라
 *   import 하면 앱 아이콘 30장이 다시 써진다. 그래서 토끼 베이스를 여기에 복제해 둔다.
 */
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets');

/* ── 공용 핑크 토끼 베이스 (앱 아이콘과 같은 모양) ─────────────────── */
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

/* ── 묶음 6종 ──────────────────────────────────────────────────────
 * 소품은 토끼 앞쪽 아래(y 120~200)에 크게 둔다 — 얼굴을 가리지 않으면서
 * 작은 크기에서도 실루엣으로 구분되게. */
const CATS = {
  // 📚 배우기 — 큼직하게 펼친 책
  learn: {
    file: 'cat-learn', bg: ['#FFE9B8', '#FFF8E8'],
    front: `<g>
      <path d="M100 138 q-26 -12 -50 -6 v50 q24 -6 50 6 z" fill="#FFFDF6" stroke="#C98A16" stroke-width="4" stroke-linejoin="round"/>
      <path d="M100 138 q26 -12 50 -6 v50 q-24 -6 -50 6 z" fill="#FFF7E2" stroke="#C98A16" stroke-width="4" stroke-linejoin="round"/>
      <path d="M100 138 v50" stroke="#C98A16" stroke-width="4" stroke-linecap="round"/>
      <g stroke="#E0B152" stroke-width="3" stroke-linecap="round">
        <path d="M62 150 h26"/><path d="M62 162 h26"/>
        <path d="M112 150 h26"/><path d="M112 162 h26"/>
      </g>
    </g>`,
  },
  // ✏️ 그리기와 쓰기 — 큰 연필을 비스듬히
  draw: {
    file: 'cat-draw', bg: ['#CFE7FA', '#F0F8FE'],
    front: `<g transform="rotate(-28 100 155)">
      <rect x="86" y="108" width="28" height="66" rx="4" fill="#FFD24E" stroke="#C98A16" stroke-width="4"/>
      <rect x="86" y="108" width="28" height="12" rx="4" fill="#FF9FC0" stroke="#C98A16" stroke-width="4"/>
      <path d="M86 174 h28 l-14 22 z" fill="#FFE9C4" stroke="#C98A16" stroke-width="4" stroke-linejoin="round"/>
      <path d="M93 188 h14 l-7 8 z" fill="#3A2233"/>
    </g>`,
  },
  // 🔷 모양 만들기 — 삼각형·네모·동그라미 블록
  shape: {
    file: 'cat-shape', bg: ['#C9E9DE', '#EFFAF6'],
    front: `<g>
      <rect x="52" y="150" width="40" height="40" rx="6" fill="#5BBDF0" stroke="#fff" stroke-width="4"/>
      <path d="M100 142 l26 44 h-52 z" fill="#FFC24B" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="130" cy="170" r="21" fill="#FF6F91" stroke="#fff" stroke-width="4"/>
    </g>`,
  },
  // 🌈 색 맞추기 — 큰 물감 팔레트
  color: {
    file: 'cat-color', bg: ['#DCD2F2', '#F4F1FC'],
    front: `<g>
      <path d="M100 124 q46 0 46 37 q0 17 -17 17 h-11 q-10 0 -10 9 q0 11 -13 11 q-40 0 -40 -37 q0 -37 45 -37 z"
            fill="#FFFDF8" stroke="#7A62C4" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="78"  cy="147" r="11.5" fill="#FF6F91"/>
      <circle cx="108" cy="141" r="11.5" fill="#FFC24B"/>
      <circle cx="128" cy="160" r="11.5" fill="#5BBDF0"/>
      <circle cx="83"  cy="175" r="11.5" fill="#7BD86B"/>
    </g>`,
  },
  // 🔁 순서와 규칙 — 반복 패턴 줄
  order: {
    file: 'cat-order', bg: ['#FBDCC0', '#FEF3E8'],
    front: `<g>
      <rect x="44" y="146" width="112" height="42" rx="10" fill="#FFFDF8" stroke="#C96A1E" stroke-width="4"/>
      <circle cx="66" cy="167" r="11" fill="#FF6F91"/>
      <path d="M100 155 l12 22 h-24 z" fill="#5BBDF0" stroke-linejoin="round"/>
      <circle cx="134" cy="167" r="11" fill="#FF6F91"/>
    </g>`,
  },
  // 👀 찾기와 짝맞추기 — 큰 돋보기
  find: {
    file: 'cat-find', bg: ['#FBD3E1', '#FEF0F5'],
    front: `<g transform="rotate(20 100 158)">
      <circle cx="100" cy="152" r="30" fill="#EAF7FE" opacity=".95"/>
      <circle cx="100" cy="152" r="30" fill="none" stroke="#3FA9C4" stroke-width="9"/>
      <path d="M86 142 a19 19 0 0 1 13 -11" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".95"/>
      <rect x="93" y="184" width="14" height="26" rx="7" fill="#F2A93B" stroke="#C9871F" stroke-width="4"/>
    </g>`,
  },
};

function page(size, cat) {
  const [c0, c1] = cat.bg;
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
    ${cat.back || ''}
    ${rabbit(cat)}
    ${cat.front || ''}
  </svg></div></body></html>`;
}

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
for (const cat of Object.values(CATS)) {
  const p = await browser.newPage({ viewport: { width: 192, height: 192 }, deviceScaleFactor: 1 });
  await p.setContent(page(192, cat));
  const buf = await p.locator('.box').screenshot({ type: 'png' });
  writeFileSync(join(outDir, `${cat.file}.png`), buf);
  await p.close();
  console.log(`✅ assets/${cat.file}.png`);
}
await browser.close();
console.log('완료 — 묶음 토끼 6마리');
