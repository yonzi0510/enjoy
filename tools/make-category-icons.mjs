#!/usr/bin/env node
/* 묶음(카테고리) 아이콘 생성기 — node tools/make-category-icons.mjs
 *
 * 홈 화면의 6개 묶음 머리표에 쓰는 핑크 토끼 6마리를 **SVG로** 만든다.
 * 앱 아이콘(tools/make-mascot-icons.mjs)과 같은 토끼를 쓰되, 목적이 다르다:
 *   - 앱 아이콘: 여러 장을 구분해야 해서 소품이 작다 → 작은 크기에서 잘 안 보인다
 *   - 묶음 아이콘: 6마리만 외우면 되므로 소품을 크게 잡아 40px 에서도 알아보게 한다
 * 배경도 묶음 색을 그대로 써서 상자 색과 토끼가 같은 신호를 준다.
 *
 * SVG 로 두는 이유 — CLAUDE.md 의 "그림은 이모지·인라인 SVG·캔버스" 원칙에 맞고,
 * 어떤 크기에서도 또렷하며, 6개 합쳐 PNG(약 145KB)보다 훨씬 가볍다.
 * 브라우저(Playwright)가 필요 없어 이 스크립트만으로 다시 만들 수 있다.
 *
 * 디자인 시안 C "크레용 스케치북" 기준 — 스케치북 종이 위에 크레용으로 그린 느낌.
 * 윤곽선은 연필심색(#3A2E26)이고, feTurbulence+feDisplacementMap 으로 선을 실제로 떨리게 해
 * 손으로 그린 티를 낸다(가짜 손그림 아님). 흔들림은 SVG 파일 6개에만 들어가고 화면 요소에는
 * 쓰지 않는다 — 필터를 많이 쓰면 낮은 사양 기기에서 느려지기 때문.
 * 묶음 구분은 배경색이 아니라 토끼 뒤에 크레용으로 그린 '동그라미' 색으로 준다.
 *
 * 토끼 팔레트: 몸 #FFB6CF~#FFA8C4 · 안쪽귀/볼 #FF9BBB · 윤곽 #3A2E26 · 흰배 #FFFDF8
 *
 * ※ tools/make-mascot-icons.mjs 는 최상위 await 로 즉시 실행되는 스크립트라
 *   import 하면 앱 아이콘 30장이 다시 써진다. 그래서 토끼 베이스를 여기에 복제해 둔다.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets');

/* 캔버스는 정사각(205×205) — 홈에서 border-radius:50% 로 동그랗게 잘라 쓴다.
   토끼 원본은 가로 200 이라 2.5 만큼 밀어 가운데를 맞춘다. */
const SIZE = 205;
const SHIFT = 2.5;

/* ── 공용 핑크 토끼 베이스 (앱 아이콘과 같은 모양) ─────────────────── */
function rabbit() {
  const eye = { l: [83, 92], r: [117, 92] };
  return `
    <g>
      <g transform="rotate(-14 84 62)">
        <ellipse cx="84" cy="40" rx="15" ry="40" fill="url(#body)" stroke="#3A2E26" stroke-width="3"/>
        <ellipse cx="84" cy="44" rx="7" ry="27" fill="#FF9BBB"/>
      </g>
      <g transform="rotate(14 116 62)">
        <ellipse cx="116" cy="40" rx="15" ry="40" fill="url(#body)" stroke="#3A2E26" stroke-width="3"/>
        <ellipse cx="116" cy="44" rx="7" ry="27" fill="#FF9BBB"/>
      </g>
    </g>
    <ellipse cx="82" cy="187" rx="15" ry="10" fill="url(#body)" stroke="#3A2E26" stroke-width="3"/>
    <ellipse cx="118" cy="187" rx="15" ry="10" fill="url(#body)" stroke="#3A2E26" stroke-width="3"/>
    <ellipse cx="82" cy="188" rx="6" ry="4" fill="#FF9BBB"/>
    <ellipse cx="118" cy="188" rx="6" ry="4" fill="#FF9BBB"/>
    <ellipse cx="100" cy="150" rx="46" ry="43" fill="url(#body)" stroke="#3A2E26" stroke-width="3"/>
    <ellipse cx="100" cy="158" rx="27" ry="30" fill="#FFFDF8"/>
    <ellipse cx="66" cy="150" rx="12" ry="14" fill="url(#body)" stroke="#3A2E26" stroke-width="3"/>
    <ellipse cx="134" cy="150" rx="12" ry="14" fill="url(#body)" stroke="#3A2E26" stroke-width="3"/>
    <ellipse cx="100" cy="95" rx="50" ry="46" fill="url(#body)" stroke="#3A2E26" stroke-width="3"/>
    <ellipse cx="71" cy="103" rx="11" ry="8" fill="#FF9BBB" opacity=".6"/>
    <ellipse cx="129" cy="103" rx="11" ry="8" fill="#FF9BBB" opacity=".6"/>
    <ellipse cx="${eye.l[0]}" cy="${eye.l[1]}" rx="8.5" ry="11" fill="#3A2233"/>
    <ellipse cx="${eye.r[0]}" cy="${eye.r[1]}" rx="8.5" ry="11" fill="#3A2233"/>
    <circle cx="${eye.l[0] - 3}" cy="${eye.l[1] - 4}" r="3.2" fill="#fff"/>
    <circle cx="${eye.r[0] - 3}" cy="${eye.r[1] - 4}" r="3.2" fill="#fff"/>
    <circle cx="${eye.l[0] + 3}" cy="${eye.l[1] + 4}" r="1.5" fill="#fff" opacity=".85"/>
    <circle cx="${eye.r[0] + 3}" cy="${eye.r[1] + 4}" r="1.5" fill="#fff" opacity=".85"/>
    <path d="M95 105 h10 l-5 5.5 z" fill="#3A2E26"/>
    <path d="M100 110.5 q-5 6 -11 3 M100 110.5 q5 6 11 3" fill="none" stroke="#3A2E26" stroke-width="2.4" stroke-linecap="round"/>`;
}

/* ── 묶음 6종 ──────────────────────────────────────────────────────
 * 소품은 토끼 앞쪽 아래(y 120~200)에 크게 둔다 — 얼굴을 가리지 않으면서
 * 작은 크기에서도 실루엣으로 구분되게. 묶음 내용과 맞는 물건 하나씩만 든다. */
const CATS = {
  // 📚 배우기 (한글·영어·산수·시장·픽셀) — 펼친 책
  learn: {
    file: 'cat-learn', crayon: '#F2B705', label: '배우기 — 책 펼친 토끼',
    front: `
      <path d="M100 138 q-26 -12 -50 -6 v50 q24 -6 50 6 z" fill="#FFFDF6" stroke="#3A2E26" stroke-width="4" stroke-linejoin="round"/>
      <path d="M100 138 q26 -12 50 -6 v50 q-24 -6 -50 6 z" fill="#FFF7E2" stroke="#3A2E26" stroke-width="4" stroke-linejoin="round"/>
      <path d="M100 138 v50" stroke="#3A2E26" stroke-width="4" stroke-linecap="round"/>
      <g stroke="#E8B84B" stroke-width="3" stroke-linecap="round">
        <path d="M62 150 h26"/><path d="M62 162 h26"/>
        <path d="M112 150 h26"/><path d="M112 162 h26"/>
      </g>`,
  },
  // ✏️ 그리기와 쓰기 — 큰 연필
  draw: {
    file: 'cat-draw', crayon: '#2E7BC4', label: '그리기와 쓰기 — 연필 안은 토끼',
    front: `
      <g transform="rotate(-28 100 155)">
        <rect x="86" y="108" width="28" height="66" rx="4" fill="#FFD24E" stroke="#3A2E26" stroke-width="4"/>
        <rect x="86" y="108" width="28" height="12" rx="4" fill="#FF9FC0" stroke="#3A2E26" stroke-width="4"/>
        <path d="M86 174 h28 l-14 22 z" fill="#FFE9C4" stroke="#3A2E26" stroke-width="4" stroke-linejoin="round"/>
        <path d="M93 188 h14 l-7 8 z" fill="#3A2233"/>
      </g>`,
  },
  // 🔷 모양 만들기 — 세모·네모·동그라미 블록
  shape: {
    file: 'cat-shape', crayon: '#4CA64C', label: '모양 만들기 — 도형 블록 든 토끼',
    front: `
      <rect x="52" y="150" width="40" height="40" rx="6" fill="#5BBDF0" stroke="#3A2E26" stroke-width="4"/>
      <path d="M100 142 l26 44 h-52 z" fill="#FFC24B" stroke="#3A2E26" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="130" cy="170" r="21" fill="#FF6F91" stroke="#3A2E26" stroke-width="4"/>`,
  },
  // 🌈 색 맞추기 — 물감 팔레트
  color: {
    file: 'cat-color', crayon: '#9B59B6', label: '색 맞추기 — 팔레트 든 토끼',
    front: `
      <path d="M100 124 q46 0 46 37 q0 17 -17 17 h-11 q-10 0 -10 9 q0 11 -13 11 q-40 0 -40 -37 q0 -37 45 -37 z"
            fill="#FFFDF8" stroke="#3A2E26" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="78" cy="147" r="11.5" fill="#FF6F91"/>
      <circle cx="108" cy="141" r="11.5" fill="#FFC24B"/>
      <circle cx="128" cy="160" r="11.5" fill="#5BBDF0"/>
      <circle cx="83" cy="175" r="11.5" fill="#7BD86B"/>`,
  },
  // 🔁 순서와 규칙 — 반복되는 패턴 줄
  order: {
    file: 'cat-order', crayon: '#FF8C42', label: '순서와 규칙 — 패턴 줄 든 토끼',
    front: `
      <rect x="44" y="146" width="112" height="42" rx="10" fill="#FFFDF8" stroke="#3A2E26" stroke-width="4"/>
      <circle cx="66" cy="167" r="11" fill="#FF6F91"/>
      <path d="M100 155 l12 22 h-24 z" fill="#5BBDF0" stroke-linejoin="round"/>
      <circle cx="134" cy="167" r="11" fill="#FF6F91"/>`,
  },
  // 👀 찾기와 짝맞추기 — 큰 돋보기
  find: {
    file: 'cat-find', crayon: '#E8453C', label: '찾기와 짝맞추기 — 돋보기 든 토끼',
    front: `
      <g transform="rotate(20 100 158)">
        <circle cx="100" cy="152" r="30" fill="#EAF7FE" opacity=".95"/>
        <circle cx="100" cy="152" r="30" fill="none" stroke="#2E7BC4" stroke-width="8"/>
        <path d="M86 142 a19 19 0 0 1 13 -11" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".95"/>
        <rect x="93" y="184" width="14" height="26" rx="7" fill="#F2A93B" stroke="#3A2E26" stroke-width="4"/>
      </g>`,
  },
};

function svg(cat) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" role="img" aria-label="${cat.label}">
  <defs>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFB6CF"/><stop offset="1" stop-color="#FFA8C4"/>
    </linearGradient>
    <!-- 선을 실제로 떨리게 해 손으로 그린 티를 낸다 -->
    <filter id="wob"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7"/>
      <feDisplacementMap in="SourceGraphic" scale="2.6"/></filter>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="#FFFDF6"/>
  <!-- 묶음 구분은 배경색이 아니라 크레용으로 그린 동그라미 색으로 준다 -->
  <g filter="url(#wob)">
    <circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="88" fill="none" stroke="${cat.crayon}" stroke-width="9" stroke-linecap="round" opacity=".9"/>
    <circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="80" fill="${cat.crayon}" opacity=".12"/>
  </g>
  <g transform="translate(${SHIFT} 0)" filter="url(#wob)">${rabbit()}${cat.front}
  </g>
</svg>
`;
}

mkdirSync(outDir, { recursive: true });
let total = 0;
for (const cat of Object.values(CATS)) {
  const s = svg(cat);
  writeFileSync(join(outDir, `${cat.file}.svg`), s);
  total += Buffer.byteLength(s);
  console.log(`✅ assets/${cat.file}.svg  (${(Buffer.byteLength(s) / 1024).toFixed(1)}KB)`);
}
console.log(`완료 — 묶음 토끼 6마리 · 합계 ${(total / 1024).toFixed(1)}KB`);
