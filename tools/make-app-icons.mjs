#!/usr/bin/env node
/* 앱 아이콘 29개 + 홈 아이콘 1개를 **한 곳에서** 그린다 — node tools/make-app-icons.mjs
 *
 * ── 왜 이렇게 모았나 ────────────────────────────────────────────────
 * 예전에는 생성기가 두 갈래로 흩어져 있었다(옛 앱 13개는 tools/make-mascot-icons.mjs,
 * 나머지 24개는 <앱>/tools/make-icon(s).mjs). 같은 토끼를 24번 복제해 두었으니
 * 한 곳을 고쳐도 나머지가 따라오지 않아 그림이 갈라졌다.
 * 이제 **소품 29개와 공통 틀이 이 파일 하나**에 있고, 각 앱의 생성기는 이 파일을
 * 자기 앱 하나로 부르는 얇은 껍데기다. 여기만 고치면 29개가 같이 바뀐다.
 *
 * ── 무엇을 그리나 (시안 「나」 — 부모님 승인) ────────────────────────
 * 48px(아이 폰 런처의 실제 크기)로 29개를 나란히 놓으면 예전 아이콘은 전부 같은
 * 분홍 토끼였다. 소품이 아이콘의 15% 남짓이라 3~7px 로 사라졌기 때문이다.
 * 그래서 **마스코트를 빼고 소품만** 남겨 아이콘의 약 78% 로 키웠다.
 *   · 실루엣부터 서로 다르게 — 48px 에서는 안쪽 무늬가 아니라 바깥 모양으로 갈린다.
 *   · 낙서장 결 유지 — 연필심 #3A2E26 윤곽, 종이 #FFFDF6, 살짝 기운 손그림.
 *   · 바탕은 홈 묶음 색(hue)을 그대로 쓰고 같은 묶음 안에서는 밝기를 벌린다
 *     (색 계산은 tools/recolor-app-icons.mjs).
 * 홈(루트) 아이콘만 예외로 마스코트 토끼를 지킨다 — 그건 이 사이트의 얼굴이다.
 *
 * 그림은 전부 인라인 SVG 로 직접 그린다(외부 이미지·폰트 금지). Chromium 으로 PNG 래스터화.
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BG } from './recolor-app-icons.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ── 색 (DESIGN.md 크레용 팔레트) ─────────────────────────────────── */
const INK = '#3A2E26';          // 연필심 — 모든 윤곽
const PAPER = '#FFFDF6';        // 종이
const RED = '#E24B3B', YEL = '#FDCB35', BLU = '#4FA3E8', GRN = '#5CB85C',
      PUR = '#9B59B6', ORG = '#F08A2E', PNK = '#F585A8', WOOD = '#DFC08A';

/* ── 작은 조각들 ─────────────────────────────────────────────────── */
const bead = (x, y, r, c) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${INK}" stroke-width="2.6"/>
   <ellipse cx="${x - r * .3}" cy="${y - r * .34}" rx="${r * .34}" ry="${r * .22}" fill="#fff" opacity=".5"
     transform="rotate(-25 ${x - r * .3} ${y - r * .34})"/>`;

/* 벚꽃 한 송이 (꽃잎 5장, 끝에 홈) */
function sakura(cx, cy, r) {
  let p = `<g transform="translate(${cx} ${cy})">`;
  for (let i = 0; i < 5; i++) {
    p += `<g transform="rotate(${i * 72})">
      <path d="M0 0 C -${r * .3} -${r * .5} -${r * .27} -${r * .95} -${r * .1} -${r}
               Q0 -${r * .86} ${r * .1} -${r} C ${r * .27} -${r * .95} ${r * .3} -${r * .5} 0 0 Z"
        fill="#FFF3F8" stroke="#EE7BA6" stroke-width="3.4" stroke-linejoin="round"/></g>`;
  }
  return p + `<circle cx="0" cy="0" r="${(r * .22).toFixed(1)}" fill="${YEL}" stroke="${INK}" stroke-width="2.6"/></g>`;
}

/* 소용돌이 (선 따라 그리기) — 점을 계산해 매끈한 나선으로 잇는다 */
function spiral(cx, cy, r0, r1, turns, from, to) {
  const pts = [];
  const steps = 90;
  for (let i = 0; i <= steps; i++) {
    const u = from + (to - from) * (i / steps);
    const th = u * turns * Math.PI * 2 - Math.PI / 2;
    const r = r0 + (r1 - r0) * u;
    pts.push([(cx + r * Math.cos(th)).toFixed(2), (cy + r * Math.sin(th)).toFixed(2)]);
  }
  return 'M' + pts.map(p => p.join(' ')).join(' L');
}

/* ── 소품 29개 — 모두 0..100 정사각 안에 그린다 ─────────────────────
 * 48px 에서 서로 다른 '실루엣'이 되도록 한 가지씩 밀어붙였다.
 * (실루엣 요약은 파일 끝 SILHOUETTE 표 참고) */
export const PROPS = {

  /* 🔍 찾기 놀이터 — 돋보기 (동그란 렌즈 + 비스듬한 손잡이) */
  play: `
    <g transform="rotate(32 50 50)">
      <rect x="39" y="58" width="23" height="44" rx="11" fill="${YEL}" stroke="${INK}" stroke-width="4.5"/>
      <circle cx="50" cy="34" r="32" fill="#E6F5FE" stroke="${INK}" stroke-width="6.5"/>
      <path d="M34 26 a18 18 0 0 1 14 -10" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
    </g>`,

  /* 🗣️ 영어 놀이터 — ABC 말풍선 */
  english: `
    <path d="M12 12 h76 q11 0 11 11 v40 q0 11 -11 11 H46 L24 92 l4 -18 h-16 q-11 0 -11 -11 V23 q0 -11 11 -11 z"
      fill="${PAPER}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <g fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 60 L27 26 L36 60 M22 48 H32" stroke="${RED}"/>
      <path d="M47 26 v34 M47 26 h9 a8 8 0 0 1 0 17 h-9 M47 43 h10 a8.5 8.5 0 0 1 0 17 h-10" stroke="${BLU}"/>
      <path d="M89 34 a16 16 0 1 0 0 18" stroke="${GRN}"/>
    </g>`,

  /* 🧩 픽셀 놀이터 — 점으로 그린 하트 (계단 모양 가장자리가 곧 '픽셀') */
  pixel: (() => {
    const map = [
      '.XX.XX.',
      'XXXXXXX',
      'XXXXXXX',
      '.XXXXX.',
      '..XXX..',
      '...X...',
    ];
    const s = 13, x0 = 4.5, y0 = 13;
    let out = '';
    map.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch !== 'X') return;
      const light = (r + c) % 5 === 0;
      out += `<rect x="${x0 + c * s}" y="${y0 + r * s}" width="${s}" height="${s}"
        fill="${light ? '#F58070' : RED}"/>`;
    }));
    return out;
  })(),

  /* 🌟 한글 놀이터 — 굵은 크레용 획으로 쓴 '가' */
  hangul: `
    <g fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 24 H50 L40 78"/>
      <path d="M72 12 V90"/>
      <path d="M72 50 H95"/>
    </g>`,

  /* 🌸 일본어 놀이터 — 벚꽃 한 송이 */
  japanese: sakura(50, 52, 45),

  /* 🎙️ 프랙티카 놀이터 — 마이크 */
  practika: `
    <path d="M22 44 a28 28 0 0 0 56 0" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <path d="M50 72 v14" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <rect x="28" y="86" width="44" height="10" rx="5" fill="${PUR}" stroke="${INK}" stroke-width="4"/>
    <rect x="34" y="4" width="32" height="56" rx="16" fill="#F1E9FF" stroke="${INK}" stroke-width="5"/>
    <g stroke="#A98FE0" stroke-width="4" stroke-linecap="round">
      <path d="M41 20 h18 M41 32 h18 M41 44 h18"/>
    </g>`,

  /* 🔢 산수 놀이터 — 숫자 타일 1·2·3 이 계단처럼 어긋나게 */
  math: (() => {
    const tile = (x, y, c) =>
      `<rect x="${x}" y="${y}" width="33" height="35" rx="8" fill="${c}" stroke="${INK}" stroke-width="4"/>`;
    const g = 'fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"';
    return tile(1, 42, RED) + tile(34, 18, BLU) + tile(66, 50, YEL) +
      `<path d="M13 55 l6 -4 v18" ${g}/>
       <path d="M44 30 a7.5 7.5 0 0 1 13 5 c0 6 -13 8 -13 14 h14" ${g}/>
       <path d="M76 62 h13 l-8 8 h1 a8 8 0 1 1 -7 12" ${g}/>`;
  })(),

  /* 🛒 시장 놀이터 — 장바구니 + 동전 */
  market: `
    <path d="M28 34 q0 -24 22 -24 q22 0 22 24" fill="none" stroke="${INK}" stroke-width="5.5"/>
    <path d="M6 32 h88 l-10 48 q-2 14 -16 14 H32 q-14 0 -16 -14 z"
      fill="${PNK}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <g stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".85">
      <path d="M30 46 v34 M50 46 v34 M70 46 v34"/>
    </g>
    <circle cx="79" cy="79" r="16" fill="${YEL}" stroke="${INK}" stroke-width="4.5"/>
    <path d="M72 73 l4 8 l3 -6 l3 6 l4 -8 M72 82 h14" fill="none" stroke="${INK}" stroke-width="3.4"
      stroke-linecap="round" stroke-linejoin="round"/>`,

  /* ✍️ 글씨 놀이터 — 줄노트 + 연필 */
  write: `
    <rect x="4" y="12" width="62" height="80" rx="8" fill="${PAPER}" stroke="${INK}" stroke-width="5"/>
    <g stroke="#9CC0DC" stroke-width="5" stroke-linecap="round">
      <path d="M14 34 h42 M14 52 h42 M14 70 h26"/>
    </g>
    <g transform="rotate(18 78 52)">
      <rect x="66" y="10" width="24" height="56" rx="5" fill="${YEL}" stroke="${INK}" stroke-width="4.5"/>
      <rect x="66" y="10" width="24" height="14" rx="5" fill="${PNK}" stroke="${INK}" stroke-width="4.5"/>
      <path d="M66 66 h24 l-12 22 z" fill="#F6E3C0" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
      <path d="M73 78 h10 l-5 10 z" fill="${INK}"/>
    </g>`,

  /* ✏️ 선 따라 그리기 — 점선 소용돌이를 크레용이 따라간다 */
  lines: `
    <path d="${spiral(46, 54, 7, 44, 1.75, 0, 1)}" fill="none" stroke="#A28C70"
      stroke-width="7" stroke-linecap="round" stroke-dasharray="0.1 15"/>
    <path d="${spiral(46, 54, 7, 44, 1.75, 0, 0.6)}" fill="none" stroke="${ORG}"
      stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <g transform="translate(61 30) rotate(-38)">
      <rect x="-10" y="-42" width="20" height="34" rx="4" fill="${RED}" stroke="${INK}" stroke-width="4"/>
      <path d="M-10 -8 h20 l-10 15 z" fill="#FFE1AA" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    </g>`,

  /* 🎨 색칠공부 — 물감 팔레트 + 크레용 */
  coloring: `
    <path d="M44 4 C16 4 2 26 4 48 C6 72 26 96 46 94 C60 93 60 82 54 76 C48 70 52 62 60 62
             C74 62 88 56 92 42 C97 24 72 4 44 4 Z"
      fill="#FFF7E6" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="26" cy="26" r="9" fill="${RED}" stroke="${INK}" stroke-width="3"/>
    <circle cx="17" cy="52" r="9" fill="${BLU}" stroke="${INK}" stroke-width="3"/>
    <circle cx="30" cy="74" r="9" fill="${GRN}" stroke="${INK}" stroke-width="3"/>
    <circle cx="55" cy="24" r="9" fill="${YEL}" stroke="${INK}" stroke-width="3"/>
    <circle cx="74" cy="40" r="9" fill="${PUR}" stroke="${INK}" stroke-width="3"/>
    <g transform="rotate(40 82 74)">
      <rect x="72" y="52" width="19" height="34" rx="4" fill="${ORG}" stroke="${INK}" stroke-width="4"/>
      <path d="M72 52 h19 l-9.5 -16 z" fill="#FFE1AA" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    </g>`,

  /* 🔷 도형 놀이터 — 큰 삼각형·네모·동그라미 세 조각 */
  shape: `
    <path d="M50 4 L82 48 L18 48 Z" fill="${YEL}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <rect x="4" y="56" width="40" height="40" rx="5" fill="${BLU}" stroke="${INK}" stroke-width="5"/>
    <circle cx="76" cy="76" r="21" fill="${RED}" stroke="${INK}" stroke-width="5"/>`,

  /* 🌈 무지개 탱그램 — 곡선 링 조각(부채꼴)이 무지개를 이룬다 */
  tangram: (() => {
    /* 반원 링 조각 하나 — 바깥 반지름 R, 안쪽 반지름 r (가운데 (cx,cy)) */
    const arc = (cx, cy, R, r, c) =>
      `<path d="M${cx - R} ${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy} L${cx + r} ${cy} A${r} ${r} 0 0 0 ${cx - r} ${cy} Z"
        fill="${c}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
    return arc(50, 88, 48, 34, RED) + arc(50, 88, 32, 18, ORG) + arc(50, 88, 16, 3, GRN) +
      `<g transform="rotate(24 66 22)">${arc(66, 34, 30, 16, BLU)}</g>`;
  })(),

  /* 📌 지오보드 — 못판에 고무줄로 만든 삼각형 */
  geoboard: (() => {
    let pegs = '';
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const x = 21 + c * 19.3, y = 21 + r * 19.3;
      pegs += `<circle cx="${x}" cy="${y}" r="5" fill="#7C6A52" stroke="${INK}" stroke-width="2.2"/>`;
    }
    /* 구슬 보드와 같은 '네모 판'이라 판 색을 짙은 나무로 낮추고 고무줄을 굵게 —
     * 48px 에서 안쪽 그림(큰 초록 삼각형)이 판보다 먼저 보이게 한다 */
    return `<rect x="2" y="2" width="96" height="96" rx="14" fill="#E7D2A4" stroke="${INK}" stroke-width="5"/>
      ${pegs}
      <path d="M21 79 L79 79 L40.3 21 Z" fill="none" stroke="${GRN}" stroke-width="11"
        stroke-linejoin="round"/>`;
  })(),

  /* 🥤 컵 쌓기 — 사다리꼴 컵 6개가 삼각 피라미드로 */
  cups: (() => {
    const cup = (cx, cy, c) => {
      const w = 31, h = 28, top = cy - h / 2, bot = cy + h / 2, hw = w / 2, bw = hw * .68;
      return `<path d="M${cx - hw} ${top} L${cx + hw} ${top} L${cx + bw} ${bot} L${cx - bw} ${bot} Z"
          fill="${c}" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/>
        <ellipse cx="${cx}" cy="${top}" rx="${hw}" ry="4.8" fill="${c}" stroke="${INK}" stroke-width="3.6"/>`;
    };
    return cup(19, 80, RED) + cup(50, 80, BLU) + cup(81, 80, YEL) +
           cup(34, 50, GRN) + cup(66, 50, PUR) + cup(50, 20, ORG);
  })(),

  /* 🧪 색깔 실험실 — 세 색이 겹쳐 섞인다 */
  lab: `
    <g fill-opacity=".78">
      <circle cx="34" cy="34" r="30" fill="${RED}" stroke="${INK}" stroke-width="4"/>
      <circle cx="68" cy="36" r="30" fill="${YEL}" stroke="${INK}" stroke-width="4"/>
      <circle cx="50" cy="68" r="30" fill="${BLU}" stroke="${INK}" stroke-width="4"/>
    </g>`,

  /* 🔵 구슬 보드 — 네모 판에 3×3 구멍, 구슬이 박혀 있다 */
  beads: `
    <rect x="2" y="10" width="96" height="84" rx="15" fill="#FFF3D6" stroke="${INK}" stroke-width="5"/>
    ${[[26, 32], [50, 32], [74, 32], [26, 54], [50, 54], [74, 54], [26, 76], [50, 76], [74, 76]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11" fill="#E3D3B0"/>`).join('')}
    ${bead(26, 32, 11, RED)}${bead(50, 32, 11, YEL)}${bead(74, 32, 11, BLU)}
    ${bead(26, 54, 11, GRN)}${bead(74, 54, 11, RED)}
    ${bead(26, 76, 11, PUR)}${bead(50, 76, 11, BLU)}`,

  /* 💍 손가락 고무줄 — 손 실루엣에 색 고리 */
  rings: `
    <rect x="76" y="52" width="14" height="31" rx="7" fill="#FFDCB8" stroke="${INK}" stroke-width="4.2"
      transform="rotate(32 83 67)"/>
    <rect x="19" y="50" width="62" height="46" rx="18" fill="#FFDCB8" stroke="${INK}" stroke-width="4.2"/>
    <rect x="22" y="22" width="14" height="45" rx="7" fill="#FFDCB8" stroke="${INK}" stroke-width="4.2"/>
    <rect x="38" y="9"  width="14" height="58" rx="7" fill="#FFDCB8" stroke="${INK}" stroke-width="4.2"/>
    <rect x="54" y="15" width="14" height="52" rx="7" fill="#FFDCB8" stroke="${INK}" stroke-width="4.2"/>
    <rect x="69" y="29" width="14" height="38" rx="7" fill="#FFDCB8" stroke="${INK}" stroke-width="4.2"/>
    <rect x="18" y="38" width="22" height="13" rx="4" fill="${RED}" stroke="${INK}" stroke-width="3.2"/>
    <rect x="34" y="26" width="22" height="13" rx="4" fill="${BLU}" stroke="${INK}" stroke-width="3.2"/>
    <rect x="50" y="31" width="22" height="13" rx="4" fill="${GRN}" stroke="${INK}" stroke-width="3.2"/>
    <rect x="65" y="45" width="22" height="13" rx="4" fill="${YEL}" stroke="${INK}" stroke-width="3.2"/>`,

  /* ⚗️ 시험관 구슬 — 길쭉한 유리관 3개, 아래부터 색 구슬 */
  tubes: (() => {
    const tube = cx => `<path d="M${cx - 12} 12 L${cx - 12} 74 Q${cx - 12} 90 ${cx} 90 Q${cx + 12} 90 ${cx + 12} 74 L${cx + 12} 12 Z"
        fill="#E9F5FF" stroke="${INK}" stroke-width="4.4"/>`;
    const rim = cx => `<ellipse cx="${cx}" cy="12" rx="12" ry="5" fill="#F6FBFF" stroke="${INK}" stroke-width="4.4"/>`;
    return tube(22) + tube(50) + tube(78) +
      bead(22, 78, 9.2, RED) + bead(22, 59, 9.2, YEL) +
      bead(50, 78, 9.2, BLU) + bead(50, 59, 9.2, GRN) + bead(50, 40, 9.2, RED) +
      bead(78, 78, 9.2, GRN) +
      rim(22) + rim(50) + rim(78);
  })(),

  /* 🔴 네 색 슬라이드 — 색마다 모양이 다른 조각을 네 자리로 갈라 놓는다 */
  slide: (() => {
    const sq = (x, y, c) => `<rect x="${x - 11}" y="${y - 10}" width="22" height="20" rx="4" fill="${c}" stroke="${INK}" stroke-width="3.4"/>`;
    const ci = (x, y, c) => `<circle cx="${x}" cy="${y}" r="10.5" fill="${c}" stroke="${INK}" stroke-width="3.4"/>`;
    const tr = (x, y, c) => `<path d="M${x} ${y - 11} L${x + 11} ${y + 9} L${x - 11} ${y + 9} Z" fill="${c}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>`;
    const di = (x, y, c) => `<path d="M${x} ${y - 11} L${x + 11} ${y} L${x} ${y + 11} L${x - 11} ${y} Z" fill="${c}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>`;
    /* 색마다 한 줄씩 — '네 자리로 갈라 놓았다'가 한눈에 보이게 네 줄을 세운다.
     * 줄 높이를 3·3·2·2 로 달리해 '옮기는 중'이 읽히게 했다. */
    return `<path d="M1 92 h98" stroke="${INK}" stroke-width="5.5" stroke-linecap="round"/>
      ${ci(14, 78, RED)}${ci(14, 54, RED)}${ci(14, 30, RED)}
      ${sq(38, 78, BLU)}${sq(38, 54, BLU)}${sq(38, 30, BLU)}
      ${tr(62, 78, GRN)}${tr(62, 54, GRN)}
      ${di(86, 78, YEL)}${di(86, 54, YEL)}`;
  })(),

  /* 🍔 햄버거 가게 — 층층이 쌓은 햄버거 */
  burger: `
    <path d="M6 44 a44 34 0 0 1 88 0 z" fill="#E5A55C" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <g fill="#FFF3D6"><ellipse cx="34" cy="28" rx="5" ry="3.4"/><ellipse cx="58" cy="22" rx="5" ry="3.4"/>
      <ellipse cx="76" cy="34" rx="5" ry="3.4"/></g>
    <path d="M4 46 q9 -9 18 0 t18 0 t18 0 t18 0 t18 0 v8 H4 z" fill="${GRN}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <rect x="6" y="56" width="88" height="17" rx="8" fill="#9A6337" stroke="${INK}" stroke-width="4.5"/>
    <path d="M6 76 h88 v6 a12 12 0 0 1 -12 12 H18 a12 12 0 0 1 -12 -12 z"
      fill="#E5A55C" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`,

  /* 🍢 꼬치 가게 — 세로 막대에 재료를 꿴다 */
  kkochi: `
    <path d="M40 0 h13 v88 l-6.5 12 l-6.5 -12 z" fill="${WOOD}" stroke="${INK}" stroke-width="4"
      stroke-linejoin="round"/>
    <circle cx="46.5" cy="26" r="15" fill="${RED}" stroke="${INK}" stroke-width="4.4"/>
    <rect x="26" y="48" width="41" height="21" rx="6" fill="${GRN}" stroke="${INK}" stroke-width="4.4"/>
    <circle cx="46.5" cy="84" r="13" fill="${YEL}" stroke="${INK}" stroke-width="4.4"/>`,

  /* 🔁 패턴 놀이터 — 반복하는 띠, 마지막 자리는 비어 있다 */
  pattern: `
    <rect x="1" y="26" width="98" height="48" rx="16" fill="#FFF3D6" stroke="${INK}" stroke-width="5"/>
    <path d="M16 38 L27 61 L5 61 Z" fill="${RED}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>
    <circle cx="39" cy="50" r="12" fill="${BLU}" stroke="${INK}" stroke-width="3.4"/>
    <path d="M62 38 L73 61 L51 61 Z" fill="${RED}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>
    <rect x="73" y="37" width="24" height="26" rx="6" fill="${PAPER}" stroke="${INK}" stroke-width="3.4"/>`,

  /* ✏️ 점 잇기 — 색 점을 차례대로 선으로 잇는다 */
  connect: `
    <path d="M15 78 L31 20 L58 56 L85 15" fill="none" stroke="${INK}" stroke-width="6.5"
      stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M85 15 L88 86" fill="none" stroke="${INK}" stroke-width="6.5" stroke-linecap="round"
      stroke-dasharray="1 13"/>
    <circle cx="15" cy="78" r="12" fill="${RED}" stroke="${INK}" stroke-width="3.6"/>
    <circle cx="31" cy="20" r="12" fill="${YEL}" stroke="${INK}" stroke-width="3.6"/>
    <circle cx="58" cy="56" r="12" fill="${BLU}" stroke="${INK}" stroke-width="3.6"/>
    <circle cx="85" cy="15" r="12" fill="${GRN}" stroke="${INK}" stroke-width="3.6"/>
    <circle cx="88" cy="86" r="12" fill="${PUR}" stroke="${INK}" stroke-width="3.6"/>`,

  /* 🎲 동물 주사위 — 입체 정육면체에 동물 얼굴 */
  dice: `
    <path d="M10 34 L33 11 L94 11 L71 34 Z" fill="#F2ECDC" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
    <path d="M71 34 L94 11 L94 66 L71 89 Z" fill="#DED5BE" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
    <rect x="10" y="34" width="61" height="55" rx="8" fill="${PAPER}" stroke="${INK}" stroke-width="4.5"/>
    <circle cx="29" cy="53" r="9.5" fill="#8DC63F" stroke="${INK}" stroke-width="3.2"/>
    <circle cx="52" cy="53" r="9.5" fill="#8DC63F" stroke="${INK}" stroke-width="3.2"/>
    <circle cx="29" cy="54" r="3.8" fill="${INK}"/><circle cx="52" cy="54" r="3.8" fill="${INK}"/>
    <path d="M26 72 Q40.5 83 55 72" fill="none" stroke="${INK}" stroke-width="4.4" stroke-linecap="round"/>`,

  /* 🦴 발굴 놀이터 — 흙더미에 삽이 꽂혀 있고 뼈가 삐죽 나왔다.
     48px 에서 「비스듬한 자루 + 낮은 둔덕」 실루엣이라 다른 28개와 안 겹친다. */
  dig: `
    <path d="M4 74 Q22 46 50 46 Q78 46 96 74 L96 92 L4 92 Z"
      fill="#C89A62" stroke="${INK}" stroke-width="4.4" stroke-linejoin="round"/>
    <path d="M14 74 Q30 60 46 66" fill="none" stroke="#A87C46" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M60 78 Q74 68 86 76" fill="none" stroke="#A87C46" stroke-width="3.4" stroke-linecap="round"/>
    <g transform="rotate(-16 40 58)">
      <path d="M31 34 h12 v26 h-12 Z" fill="${WOOD}" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/>
      <path d="M27 12 h20 v10 a10 10 0 0 1 -20 0 Z" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/>
      <path d="M25 58 h24 l-4 20 a8 8 0 0 1 -16 0 Z"
        fill="#BFC7CE" stroke="${INK}" stroke-width="3.8" stroke-linejoin="round"/>
    </g>
    <g transform="rotate(18 74 56)">
      <path d="M62 52 h24" stroke="${PAPER}" stroke-width="11" stroke-linecap="round"/>
      <circle cx="62" cy="47" r="6.5" fill="${PAPER}"/><circle cx="62" cy="57" r="6.5" fill="${PAPER}"/>
      <circle cx="86" cy="47" r="6.5" fill="${PAPER}"/><circle cx="86" cy="57" r="6.5" fill="${PAPER}"/>
      <path d="M62 52 h24" stroke="${INK}" stroke-width="3.4" stroke-linecap="round" fill="none" opacity="0"/>
      <path d="M55.5 47 a6.5 6.5 0 1 1 0 .01 M55.5 57 a6.5 6.5 0 1 1 0 .01" fill="none" stroke="${INK}" stroke-width="3.4"/>
      <path d="M62 41.5 h24 M62 62.5 h24" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M92.5 47 a6.5 6.5 0 1 1 0 .01 M92.5 57 a6.5 6.5 0 1 1 0 .01" fill="none" stroke="${INK}" stroke-width="3.4"/>
    </g>`,

  /* 🤖 로봇 심부름 — 안테나 달린 둥근 로봇 + 나아갈 방향 화살표.
     주사위(정육면체)와 헷갈리지 않게 **모서리를 둥글리고 안테나·바퀴**를 달았다. */
  robot: `
    <path d="M50 6 v10" stroke="${INK}" stroke-width="3.8" stroke-linecap="round"/>
    <circle cx="50" cy="7" r="6" fill="${RED}" stroke="${INK}" stroke-width="3.4"/>
    <rect x="8" y="16" width="60" height="44" rx="14" fill="${PAPER}" stroke="${INK}" stroke-width="4.6"/>
    <circle cx="26" cy="35" r="8" fill="${BLU}" stroke="${INK}" stroke-width="3.4"/>
    <circle cx="52" cy="35" r="8" fill="${BLU}" stroke="${INK}" stroke-width="3.4"/>
    <circle cx="26" cy="35" r="3" fill="${INK}"/><circle cx="52" cy="35" r="3" fill="${INK}"/>
    <path d="M30 49 h18" stroke="${INK}" stroke-width="4.2" stroke-linecap="round"/>
    <rect x="17" y="62" width="42" height="19" rx="8" fill="#BFC7CE" stroke="${INK}" stroke-width="4.2"/>
    <circle cx="14" cy="84" r="7.5" fill="${INK}"/><circle cx="62" cy="84" r="7.5" fill="${INK}"/>
    <!-- 나아갈 방향 — 돌림블록(twist)과 갈리는 유일한 표시라 크고 굵게 -->
    <path d="M72 48 h16" fill="none" stroke="${GRN}" stroke-width="9" stroke-linecap="round"/>
    <path d="M82 36 l14 12 l-14 12" fill="${GRN}" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/>`,

  /* 💗 마음 놀이터 — 얼굴에 눈썹 조각을 붙이는 중.
     하트는 쓰지 않는다(픽셀 놀이터의 계단 하트와 48px 에서 겹친다). */
  heart: `
    <circle cx="46" cy="52" r="36" fill="${PAPER}" stroke="${INK}" stroke-width="4.6"/>
    <path d="M28 36 q7 -6 15 -2" fill="none" stroke="${INK}" stroke-width="4.6" stroke-linecap="round"/>
    <circle cx="34" cy="50" r="5.4" fill="${INK}"/>
    <circle cx="58" cy="50" r="5.4" fill="${INK}"/>
    <path d="M32 68 q14 12 28 0" fill="none" stroke="${INK}" stroke-width="4.6" stroke-linecap="round"/>
    <circle cx="18" cy="62" r="7" fill="${PNK}" opacity=".55"/>
    <circle cx="74" cy="62" r="7" fill="${PNK}" opacity=".55"/>
    <g transform="rotate(14 78 26)">
      <rect x="62" y="18" width="32" height="16" rx="8" fill="${YEL}" stroke="${INK}" stroke-width="3.6"/>
      <path d="M69 27 q9 -7 18 -2" fill="none" stroke="${INK}" stroke-width="4.2" stroke-linecap="round"/>
    </g>`,

  /* 🕐 시계 놀이터 — 뻐꾸기 집 지붕 + 시계판. 바늘은 4시 20분(둘이 확실히 갈리는 각도).
     48px 에서 「지붕 + 동그란 판 + 두 바늘」 실루엣이라 다른 32개와 안 겹친다. */
  clock: `
    <path d="M50 4 L92 26 L8 26 Z" fill="${WOOD}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="50" cy="62" r="34" fill="${WOOD}" stroke="${INK}" stroke-width="4.4"/>
    <circle cx="50" cy="62" r="27" fill="${PAPER}" stroke="${INK}" stroke-width="3"/>
    <g stroke="${INK}" stroke-width="3.2" stroke-linecap="round">
      <path d="M50 39 v4"/><path d="M50 81 v4"/><path d="M27 62 h4"/><path d="M69 62 h4"/>
    </g>
    <path d="M50 62 L50 46" stroke="${RED}" stroke-width="5.4" stroke-linecap="round"/>
    <path d="M50 62 L69 72" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="50" cy="62" r="3.6" fill="${INK}"/>`,

  /* 🍩 도넛 짝맞추기 — 가운데가 뻥 뚫린 고리 */
  donut: `
    <circle cx="50" cy="52" r="30" fill="none" stroke="#D89A56" stroke-width="32"/>
    <circle cx="50" cy="52" r="30" fill="none" stroke="${PNK}" stroke-width="22"/>
    <circle cx="50" cy="52" r="46" fill="none" stroke="${INK}" stroke-width="4.4"/>
    <circle cx="50" cy="52" r="14" fill="none" stroke="${INK}" stroke-width="4.4"/>
    <g stroke-width="5" stroke-linecap="round">
      <path d="M31 29 l6 -5" stroke="${YEL}"/><path d="M65 27 l6 5" stroke="#7FD0F5"/>
      <path d="M77 52 l-1 8" stroke="${GRN}"/><path d="M50 18 l6 2" stroke="#fff"/>
      <path d="M24 60 l7 2" stroke="${PUR}"/><path d="M58 77 l6 -3" stroke="${YEL}"/>
    </g>`,

  /* 🎡 돌림 블록 — 막대에 꽂힌 드럼 두 개가 얼굴을 이룬다 */
  twist: `
    <rect x="45" y="2" width="10" height="94" rx="5" fill="${WOOD}" stroke="${INK}" stroke-width="3.4"/>
    <ellipse cx="50" cy="94" rx="28" ry="7" fill="${WOOD}" stroke="${INK}" stroke-width="3.6"/>
    <rect x="9" y="14" width="82" height="36" rx="11" fill="#FFE7A8" stroke="${INK}" stroke-width="5"/>
    <circle cx="33" cy="33" r="8" fill="${INK}"/><circle cx="67" cy="33" r="8" fill="${INK}"/>
    <circle cx="30" cy="30" r="3" fill="#fff"/><circle cx="64" cy="30" r="3" fill="#fff"/>
    <rect x="9" y="52" width="82" height="36" rx="11" fill="#FFBE7A" stroke="${INK}" stroke-width="5"/>
    <path d="M33 66 Q50 82 67 66" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round"/>`,

  /* 🧭 방향·색 놀이터 — 칸마다 다른 방향의 삼각형 */
  matrix: (() => {
    const cell = (x, y) => `<rect x="${x}" y="${y}" width="44" height="44" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="4.4"/>`;
    const tri = (cx, cy, rot, c) => `<g transform="rotate(${rot} ${cx} ${cy})">
      <path d="M${cx} ${cy - 15} L${cx + 14} ${cy + 12} L${cx - 14} ${cy + 12} Z" fill="${c}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/></g>`;
    return cell(3, 3) + cell(53, 3) + cell(3, 53) + cell(53, 53) +
      tri(25, 25, 0, RED) + tri(75, 25, 90, BLU) + tri(25, 75, 180, YEL) + tri(75, 75, 270, GRN);
  })(),

  /* 💡 생각 놀이터 — 반짝 떠오른 전구 */
  bag: `
    <g stroke="${ORG}" stroke-width="6" stroke-linecap="round">
      <path d="M8 20 l9 7"/><path d="M92 20 l-9 7"/><path d="M4 58 h11"/><path d="M96 58 h-11"/>
      <path d="M50 0 v10"/>
    </g>
    <circle cx="50" cy="42" r="30" fill="#FFF0A8" stroke="${INK}" stroke-width="5"/>
    <path d="M34 68 h32 l-4 10 h-24 z" fill="#FFF0A8" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M36 36 a16 16 0 0 1 11 -11" fill="none" stroke="#FFFBE6" stroke-width="6" stroke-linecap="round"/>
    <path d="M40 46 q10 12 20 0" fill="none" stroke="${ORG}" stroke-width="4.4" stroke-linecap="round"/>
    <rect x="33" y="79" width="34" height="8" rx="3" fill="#CDD2D9" stroke="${INK}" stroke-width="3.6"/>
    <rect x="36" y="89" width="28" height="8" rx="3" fill="#CDD2D9" stroke="${INK}" stroke-width="3.6"/>`,
};

/* ── 홈(루트) 아이콘 — 이 사이트의 얼굴인 분홍 토끼는 그대로 지킨다 ─── */
function rabbit() {
  const l = [83, 92], r = [117, 92];
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
  <ellipse cx="66"  cy="150" rx="12" ry="14" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <ellipse cx="134" cy="150" rx="12" ry="14" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <ellipse cx="100" cy="95" rx="50" ry="46" fill="url(#body)" stroke="#E05C86" stroke-width="3"/>
  <ellipse cx="71"  cy="103" rx="11" ry="8" fill="#FF8FB0" opacity=".6"/>
  <ellipse cx="129" cy="103" rx="11" ry="8" fill="#FF8FB0" opacity=".6"/>
  <ellipse cx="${l[0]}" cy="${l[1]}" rx="8.5" ry="11" fill="#3A2233"/>
  <ellipse cx="${r[0]}" cy="${r[1]}" rx="8.5" ry="11" fill="#3A2233"/>
  <circle cx="${l[0] - 3}" cy="${l[1] - 4}" r="3.2" fill="#fff"/>
  <circle cx="${r[0] - 3}" cy="${r[1] - 4}" r="3.2" fill="#fff"/>
  <path d="M95 105 h10 l-5 5.5 z" fill="#E05C86"/>
  <path d="M100 110.5 q-5 6 -11 3 M100 110.5 q5 6 11 3" fill="none" stroke="#E05C86" stroke-width="2.4" stroke-linecap="round"/>`;
}
const HOME = `
  <g fill="none" stroke-linecap="round" opacity=".9">
    <path d="M2 150 A98 98 0 0 1 198 150" stroke="#FF7E9D" stroke-width="10"/>
    <path d="M16 150 A84 84 0 0 1 184 150" stroke="#FFB24B" stroke-width="10"/>
    <path d="M30 150 A70 70 0 0 1 170 150" stroke="#FFD64E" stroke-width="10"/>
    <path d="M44 150 A56 56 0 0 1 156 150" stroke="#7BD86B" stroke-width="10"/>
    <path d="M58 150 A42 42 0 0 1 142 150" stroke="#5BBDF0" stroke-width="10"/>
  </g>
  ${rabbit()}`;

/* ── 공통 틀 ─────────────────────────────────────────────────────
 * 소품을 200×200 판의 한가운데에 78% 크기로 놓고, 손그림처럼 아주 조금 기울인다.
 * 기울기는 앱 이름에서 정해지므로 다시 돌려도 같은 그림이 나온다. */
const SCALE = 0.78;
function tilt(app) {
  let h = 0;
  for (const ch of app) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return ((h % 9) - 4) * 0.45;          // -1.8° ~ +1.8°
}
function page(app, size) {
  const [deep, light] = BG[app];
  const s = 200 * SCALE / 100;
  const body = app === '.'
    ? `<svg viewBox="0 0 200 205" xmlns="http://www.w3.org/2000/svg">
         <defs><linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
           <stop offset="0" stop-color="#FFC9DB"/><stop offset="1" stop-color="#FFB0C8"/>
         </linearGradient></defs>${HOME}</svg>`
    : `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
         <g transform="rotate(${tilt(app)} 100 100) translate(${100 - 50 * s} ${100 - 50 * s}) scale(${s})">
           ${PROPS[app]}
         </g></svg>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0}
  .box{width:${size}px;height:${size}px;
    background:radial-gradient(120% 120% at 50% 28%, ${light} 0%, ${deep} 100%)}
  svg{display:block;width:100%;height:100%}
  </style></head><body><div class="box">${body}</div></body></html>`;
}

/* ── 렌더 ────────────────────────────────────────────────────────
 * buildIcons(['beads']) 처럼 앱 하나만도 뽑을 수 있다 — 각 앱의 생성기가 이렇게 부른다.
 * '.' 은 저장소 루트(홈 아이콘). */
export const APPS = Object.keys(PROPS);
export async function buildIcons(list = [...APPS, '.'], { quiet = false } = {}) {
  const browser = await chromium.launch();
  for (const app of list) {
    if (app !== '.' && !PROPS[app]) throw new Error(`모르는 앱: ${app}`);
    const outDir = app === '.' ? ROOT : join(ROOT, app);
    for (const size of [192, 512]) {
      const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
      await p.setContent(page(app, size));
      writeFileSync(join(outDir, `icon-${size}.png`), await p.locator('.box').screenshot({ type: 'png' }));
      await p.close();
    }
    if (!quiet) console.log(`✅ ${app}/icon-{192,512}.png`);
  }
  await browser.close();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await buildIcons();
  console.log(`완료 — 앱 ${APPS.length}개 + 홈 1개`);
}

/* ── SILHOUETTE — 48px 에서 무엇으로 갈리는가 ────────────────────────
 *  play 돋보기(비스듬한 원+자루) · english 말풍선 · pixel 계단 하트 · hangul 굵은 '가'
 *  japanese 꽃잎 다섯 · practika 마이크(세로 알약+반원) · math 어긋난 숫자 타일 3개
 *  market 사다리꼴 바구니+손잡이 · write 노트+연필 · lines 소용돌이 · coloring 팔레트
 *  shape 삼각·네모·원 세 조각 · tangram 무지개 반원 · geoboard 못판+초록 삼각형
 *  cups 컵 피라미드 · lab 세 색 겹친 원 · beads 네모 판 3×3 · rings 손
 *  tubes 유리관 세 개 · slide 네 자리 세로 더미 · burger 층층 빵 · kkochi 세로 꼬치
 *  pattern 가로 띠+빈 칸 · connect 점+지그재그 · dice 정육면체 · donut 뚫린 고리
 *  twist 드럼 2단 얼굴 · matrix 2×2 방향 삼각형 · bag 전구
 *  dig 흙더미+비스듬한 삽+뼈 · robot 안테나 로봇+화살표 · heart 얼굴+떠 있는 눈썹 조각
 *  clock 뻐꾸기 집 지붕+시계판+두 바늘
 */
