#!/usr/bin/env node
/* 마스코트 아이콘 통일 생성기 — node tools/make-mascot-icons.mjs
 *
 * '귀여운 핑크 토끼' 하나를 모든 앱이 공유한다. 앱 구분은 색이 아니라
 * 토끼가 들거나 곁에 둔 '소품'으로만 한다. 재사용 가능한 토끼 베이스 SVG(rabbit())를
 * 함수로 두고, 앱별 소품 SVG(props)만 얹어 Chromium 으로 192·512 PNG 를 래스터화한다.
 *
 * 팔레트: 몸 #FFC0D4~#FFB0C8 · 안쪽귀/볼 #FF8FB0 · 진한선/포인트 #E05C86 · 흰배 #FFF2F7
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ── 공용 핑크 토끼 베이스 ─────────────────────────────────────────
 * opts.look: 'smile'(기본) · 표정은 통일. 소품은 뒤(back)·앞(front)으로 얹는다.
 * 얼굴이 소품에 가리지 않도록 소품은 주로 아래·옆에 배치한다. */
function rabbit(opts = {}) {
  const eye = opts.eye || { l: [83, 92], r: [117, 92] }; // 필요 시 시선 이동
  return `
  <!-- 귀 (머리 뒤) -->
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
  <!-- 발 -->
  <ellipse cx="82"  cy="187" rx="15" ry="10" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <ellipse cx="118" cy="187" rx="15" ry="10" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <ellipse cx="82"  cy="188" rx="6"  ry="4"  fill="#FF8FB0"/>
  <ellipse cx="118" cy="188" rx="6"  ry="4"  fill="#FF8FB0"/>
  <!-- 몸 + 흰 배 -->
  <ellipse cx="100" cy="150" rx="46" ry="43" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <ellipse cx="100" cy="158" rx="27" ry="30" fill="#FFF2F7"/>
  ${opts.paws !== false ? `
  <!-- 앞발 (소품을 감싼다) -->
  <ellipse cx="66"  cy="150" rx="12" ry="14" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <ellipse cx="134" cy="150" rx="12" ry="14" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>` : ''}
  <!-- 머리 -->
  <ellipse cx="100" cy="95" rx="50" ry="46" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <!-- 볼터치 -->
  <ellipse cx="71"  cy="103" rx="11" ry="8" fill="#FF8FB0" opacity=".6"/>
  <ellipse cx="129" cy="103" rx="11" ry="8" fill="#FF8FB0" opacity=".6"/>
  <!-- 눈 (반짝) -->
  <ellipse cx="${eye.l[0]}" cy="${eye.l[1]}" rx="8.5" ry="11" fill="#3A2233"/>
  <ellipse cx="${eye.r[0]}" cy="${eye.r[1]}" rx="8.5" ry="11" fill="#3A2233"/>
  <circle cx="${eye.l[0]-3}" cy="${eye.l[1]-4}" r="3.2" fill="#fff"/>
  <circle cx="${eye.r[0]-3}" cy="${eye.r[1]-4}" r="3.2" fill="#fff"/>
  <circle cx="${eye.l[0]+3}" cy="${eye.l[1]+4}" r="1.5" fill="#fff" opacity=".85"/>
  <circle cx="${eye.r[0]+3}" cy="${eye.r[1]+4}" r="1.5" fill="#fff" opacity=".85"/>
  <!-- 코 + 입 -->
  <path d="M95 105 h10 l-5 5.5 z" fill="#E05C86"/>
  <path d="M100 110.5 q-5 6 -11 3 M100 110.5 q5 6 11 3" fill="none" stroke="#E05C86" stroke-width="2.4" stroke-linecap="round"/>`;
}

/* 반짝임 별 (소품 장식용) */
function sparkle(x, y, r, color = '#FFE08A') {
  return `<path d="M${x} ${y-r} Q${x+r*0.28} ${y-r*0.28} ${x+r} ${y} Q${x+r*0.28} ${y+r*0.28} ${x} ${y+r} Q${x-r*0.28} ${y+r*0.28} ${x-r} ${y} Q${x-r*0.28} ${y-r*0.28} ${x} ${y-r} Z" fill="${color}"/>`;
}

/* ── 앱별 소품 정의 ───────────────────────────────────────────────
 * bg: 배경 그라디언트(은은한 파스텔) / back: 토끼 뒤 / front: 토끼 앞 */
const APPS = {
  // 🔍 찾기 — 돋보기
  play: {
    dir: 'play', bg: ['#DDF3FF', '#F3FBFF'],
    front: `<g transform="rotate(18 128 150)">
      <circle cx="128" cy="150" r="20" fill="#EAF7FE"/>
      <circle cx="128" cy="150" r="20" fill="none" stroke="#3FA9C4" stroke-width="7"/>
      <path d="M118 143 a13 13 0 0 1 9 -8" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".9"/>
      <rect x="123" y="168" width="10" height="26" rx="5" fill="#F2A93B" stroke="#C9871F" stroke-width="2.5"/>
    </g>`,
    top: sparkle(150, 60, 8) + sparkle(58, 74, 6, '#FFC7DE'),
  },
  // 🗣️ 영어 — 말풍선 ABC
  english: {
    dir: 'english', bg: ['#E3F6E9', '#F5FCF7'],
    back: `<g transform="translate(120 34)">
      <path d="M6 4 h56 q10 0 10 10 v26 q0 10 -10 10 h-30 l-14 12 l2 -12 h-14 q-10 0 -10 -10 v-26 q0 -10 10 -10 z" fill="#fff" stroke="#E05C86" stroke-width="3"/>
      <text x="40" y="35" font-family="Liberation Sans, DejaVu Sans, sans-serif" font-weight="900" font-size="24" text-anchor="middle">
        <tspan fill="#EF5B6E">A</tspan><tspan fill="#3FA9C4">B</tspan><tspan fill="#5DBB63">C</tspan></text>
    </g>`,
  },
  // 🧩 픽셀 — 알록달록 블록
  pixel: {
    dir: 'pixel', bg: ['#EDE7FF', '#F8F5FF'],
    front: `<g transform="translate(104 128)">
      <rect x="0"  y="0"  width="22" height="22" rx="4" fill="#FF6F91" stroke="#fff" stroke-width="2.5"/>
      <rect x="24" y="0"  width="22" height="22" rx="4" fill="#FFC24B" stroke="#fff" stroke-width="2.5"/>
      <rect x="0"  y="24" width="22" height="22" rx="4" fill="#4FC0E8" stroke="#fff" stroke-width="2.5"/>
      <rect x="24" y="24" width="22" height="22" rx="4" fill="#7BD86B" stroke="#fff" stroke-width="2.5"/>
    </g>`,
    top: sparkle(56, 66, 7, '#C9B8FF'),
  },
  // 🌟 한글 — ㄱㄴㄷ 카드 + 별
  hangul: {
    dir: 'hangul', bg: ['#FFF0D6', '#FFFBF0'],
    front: `<g transform="translate(72 130)">
      <rect x="0" y="0" width="74" height="42" rx="9" fill="#fff" stroke="#E05C86" stroke-width="3"/>
      <g stroke="#3A2233" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M11 12 h13 v19"/>       <!-- ㄱ -->
        <path d="M31 12 v19 h13"/>       <!-- ㄴ -->
        <path d="M63 12 h-13 v19 h13"/>  <!-- ㄷ -->
      </g>
    </g>`,
    top: sparkle(150, 58, 10, '#FFD34E') + sparkle(56, 72, 6, '#FFE08A'),
  },
  // 🌸 일본어 — 벚꽃
  japanese: {
    dir: 'japanese', bg: ['#FFE6EE', '#FFF6F9'],
    front: `<g transform="translate(150 158)">${sakura(0, 0, 30)}</g>`,
    top: petal(150, 56, '#FF9EBD') + petal(48, 80, '#FFA9C4') + petal(60, 44, '#FFC1D5'),
  },
  // ✍️ 글씨 — 공책 + 연필
  write: {
    dir: 'write', bg: ['#E1F0FF', '#F4FAFF'],
    front: `<g transform="translate(78 128)">
      <rect x="0" y="4" width="52" height="44" rx="6" fill="#fff" stroke="#E05C86" stroke-width="3"/>
      <g stroke="#BFD6E8" stroke-width="3" stroke-linecap="round"><path d="M10 18 h32 M10 28 h32 M10 38 h24"/></g>
      <g transform="rotate(38 74 40)">
        <rect x="66" y="6" width="12" height="40" rx="3" fill="#FFC83D" stroke="#D99B18" stroke-width="2.5"/>
        <path d="M66 46 h12 l-6 12 z" fill="#F6D9AE" stroke="#D99B18" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M69 54 h6 l-3 4 z" fill="#3A2233"/>
        <rect x="66" y="6" width="12" height="8" rx="3" fill="#F58AA6"/>
      </g>
    </g>`,
  },
  // 🔢 산수 — 숫자 블록
  math: {
    dir: 'math', bg: ['#E6F7F1', '#F5FCFA'],
    front: `<g font-family="Liberation Sans, DejaVu Sans, sans-serif" font-weight="900" font-size="24" text-anchor="middle">
      <rect x="70"  y="132" width="30" height="30" rx="6" fill="#FF6F91" stroke="#fff" stroke-width="2.5"/>
      <text x="85"  y="154" fill="#fff">1</text>
      <rect x="100" y="126" width="30" height="30" rx="6" fill="#4FC0E8" stroke="#fff" stroke-width="2.5"/>
      <text x="115" y="148" fill="#fff">2</text>
      <rect x="118" y="150" width="30" height="30" rx="6" fill="#FFC24B" stroke="#fff" stroke-width="2.5"/>
      <text x="133" y="172" fill="#fff">3</text>
    </g>`,
  },
  // 🔷 도형 — 칠교 조각
  shape: {
    dir: 'shape', bg: ['#E7ECFF', '#F6F8FF'],
    front: `<g stroke="#fff" stroke-width="2.5" stroke-linejoin="round" transform="translate(98 130)">
      <path d="M0 0 L36 0 L18 18 Z" fill="#FF6F91"/>
      <path d="M36 0 L36 36 L18 18 Z" fill="#4FC0E8"/>
      <path d="M0 0 L18 18 L0 36 Z" fill="#FFC24B"/>
      <rect x="6" y="24" width="18" height="18" rx="2" fill="#7BD86B" transform="rotate(0 15 33)"/>
    </g>`,
    top: sparkle(150, 60, 7, '#AEC2FF'),
  },
  // 🛒 시장 — 장바구니 + 동전
  market: {
    dir: 'market', bg: ['#FFEEDD', '#FFF8F1'],
    front: `<g transform="translate(96 130)">
      <path d="M4 8 h44 l-6 30 q-1 6 -8 6 h-16 q-7 0 -8 -6 z" fill="#FF8FA8" stroke="#E05C86" stroke-width="3" stroke-linejoin="round"/>
      <path d="M12 8 q0 -14 14 -14 q14 0 14 14" fill="none" stroke="#E05C86" stroke-width="3"/>
      <g stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M18 16 v22 M28 16 v22 M38 16 v22"/></g>
      <circle cx="14" cy="46" r="11" fill="#FFD34E" stroke="#E0A81E" stroke-width="2.5"/>
      <text x="14" y="51" font-family="Liberation Sans, sans-serif" font-weight="900" font-size="12" fill="#E0A81E" text-anchor="middle">₩</text>
    </g>`,
  },
  // 🧪 색깔 실험실 — 물감병
  lab: {
    dir: 'lab', bg: ['#E9F6D9', '#F6FCEE'],
    front: `<g transform="translate(112 124)">
      <path d="M8 2 h16 v18 l12 30 q4 12 -8 12 h-24 q-12 0 -8 -12 l12 -30 z" fill="#EAF7FE" stroke="#3FA9C4" stroke-width="3" stroke-linejoin="round"/>
      <path d="M2 44 q10 -6 14 0 t14 0 v6 q0 8 -8 8 h-12 q-8 0 -8 -8 z" fill="#FF6F91"/>
      <rect x="6" y="-6" width="20" height="10" rx="4" fill="#3FA9C4"/>
      <circle cx="12" cy="50" r="3" fill="#FFC9DC"/>
    </g>
    ${sparkle(150, 150, 6, '#FF9EBD')}`,
    top: sparkle(150, 60, 7, '#BCE38A'),
  },
  // 💡 생각 놀이터 — 반짝이는 전구(아이디어)
  bag: {
    dir: 'bag', bg: ['#FFF6E4', '#FFFBF2'],
    front: `
      ${sparkle(74, 128, 5, '#FFCE4D')}
      ${sparkle(126, 130, 5, '#FFCE4D')}
      ${sparkle(100, 108, 6, '#FFE08A')}
      <!-- 전구 유리 -->
      <circle cx="100" cy="147" r="23" fill="#FFF3B0" stroke="#E0A93B" stroke-width="3"/>
      <!-- 목 -->
      <path d="M89 165 h22 l-2 6 h-18 z" fill="#FFF3B0" stroke="#E0A93B" stroke-width="3" stroke-linejoin="round"/>
      <!-- 하이라이트 -->
      <path d="M90 139 a13 13 0 0 1 9 -9" fill="none" stroke="#FFFBE6" stroke-width="4" stroke-linecap="round"/>
      <!-- 미소 필라멘트 -->
      <path d="M92 149 q8 9 16 0" fill="none" stroke="#E0A93B" stroke-width="2.6" stroke-linecap="round"/>
      <!-- 나사 베이스 -->
      <rect x="90" y="171" width="20" height="6" rx="2.5" fill="#CDD2D9" stroke="#8A8F98" stroke-width="2"/>
      <rect x="92" y="177" width="16" height="6" rx="2.5" fill="#CDD2D9" stroke="#8A8F98" stroke-width="2"/>`,
  },
  // 🎨 색칠공부 — 크레용 + 팔레트
  coloring: {
    dir: 'coloring', bg: ['#FFF0F6', '#FFF8FB'],
    front: `<g transform="translate(92 128)">
      <path d="M28 6 a28 24 0 1 0 0 48 a10 10 0 0 0 0 -20 a6 6 0 0 1 0 -12 a8 8 0 0 0 0 -16 z" fill="#fff" stroke="#E05C86" stroke-width="3"/>
      <circle cx="16" cy="18" r="4.5" fill="#FF6F91"/><circle cx="12" cy="34" r="4.5" fill="#4FC0E8"/>
      <circle cx="22" cy="46" r="4.5" fill="#7BD86B"/><circle cx="36" cy="14" r="4.5" fill="#FFC24B"/>
      <g transform="rotate(40 56 34)">
        <rect x="50" y="10" width="12" height="40" rx="3" fill="#FF6F91" stroke="#D63B63" stroke-width="2.5"/>
        <path d="M50 10 h12 l-6 -12 z" fill="#FFE1AA" stroke="#D63B63" stroke-width="2.5" stroke-linejoin="round"/>
      </g>
    </g>`,
  },
  // 🎙️ 프랙티카 — 헤드셋 마이크
  practika: {
    dir: 'practika', bg: ['#EDE6FF', '#F8F5FF'],
    front: `<g transform="translate(100 132)" stroke-linejoin="round">
      <path d="M-26 18 a26 26 0 0 1 52 0" fill="none" stroke="#8A6FE0" stroke-width="7"/>
      <rect x="-32" y="14" width="14" height="26" rx="7" fill="#8A6FE0"/>
      <rect x="18"  y="14" width="14" height="26" rx="7" fill="#8A6FE0"/>
      <path d="M18 34 q6 20 -14 22" fill="none" stroke="#8A6FE0" stroke-width="5"/>
      <circle cx="2" cy="58" r="9" fill="#FF8FA8" stroke="#E05C86" stroke-width="2.5"/>
      <circle cx="2" cy="58" r="3.5" fill="#fff"/>
    </g>`,
    top: sparkle(150, 60, 7, '#C9B8FF'),
  },
};

/* 벚꽃 한 송이 (5장 꽃잎) — 분홍 토끼와 대비되게 흰빛 꽃잎 + 끝 홈 */
function sakura(cx, cy, r) {
  let p = `<g transform="translate(${cx} ${cy})">`;
  for (let i = 0; i < 5; i++) {
    // 뿌리에서 뻗는 꽃잎: 끝에 살짝 홈(벚꽃 특징)
    p += `<g transform="rotate(${i*72})">
      <path d="M0 0 C -9 -${r*0.5} -8 -${r*0.95} -3 -${r} Q0 -${r*0.86} 3 -${r} C 8 -${r*0.95} 9 -${r*0.5} 0 0 Z"
        fill="#FFF3F8" stroke="#F585A8" stroke-width="2.4" stroke-linejoin="round"/>
    </g>`;
  }
  p += `<circle cx="0" cy="0" r="${(r*0.24).toFixed(1)}" fill="#FFD34E"/>
    <circle cx="0" cy="0" r="${(r*0.24).toFixed(1)}" fill="none" stroke="#F0B01E" stroke-width="1.5"/></g>`;
  return p;
}
/* 흩날리는 꽃잎 */
function petal(x, y, color) {
  return `<path d="M${x} ${y} Q${x+9} ${y-6} ${x+6} ${y+6} Q${x} ${y+9} ${x} ${y} Z" fill="${color}"/>`;
}

/* 루트 홈 — 무지개 + 별에 둘러싸인 대표 마스코트 */
const ROOT = {
  dir: '.', bg: ['#FFE7F1', '#EAF6FF'],
  back: `<g fill="none" stroke-linecap="round" opacity=".9">
      <path d="M2 150 A98 98 0 0 1 198 150" stroke="#FF7E9D" stroke-width="10"/>
      <path d="M16 150 A84 84 0 0 1 184 150" stroke="#FFB24B" stroke-width="10"/>
      <path d="M30 150 A70 70 0 0 1 170 150" stroke="#FFD64E" stroke-width="10"/>
      <path d="M44 150 A56 56 0 0 1 156 150" stroke="#7BD86B" stroke-width="10"/>
      <path d="M58 150 A42 42 0 0 1 142 150" stroke="#5BBDF0" stroke-width="10"/>
    </g>`,
  top: sparkle(30, 44, 10, '#FFD34E') + sparkle(170, 40, 11, '#FF9EBD') +
       sparkle(24, 96, 7, '#7FD0F5') + sparkle(178, 92, 8, '#B49BF0'),
};

function page(size, app) {
  const [c0, c1] = app.bg;
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
    ${app.back || ''}
    ${rabbit(app)}
    ${app.front || ''}
    ${app.top || ''}
  </svg></div></body></html>`;
}

const browser = await chromium.launch();
const jobs = [...Object.values(APPS), ROOT];
for (const app of jobs) {
  const outDir = app.dir === '.' ? root : join(root, app.dir);
  for (const size of [192, 512]) {
    const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await p.setContent(page(size, app));
    const buf = await p.locator('.box').screenshot({ type: 'png' });
    writeFileSync(join(outDir, `icon-${size}.png`), buf);
    await p.close();
  }
  console.log(`✅ ${app.dir}/icon-{192,512}.png`);
}
await browser.close();
console.log('완료 — 14세트');
