#!/usr/bin/env node
/* 크레용 낙서·종이결 생성기 — node tools/make-doodles.mjs
 *
 * 홈 화면 가장자리를 채우는 손그림 낙서(무지개·해·구름·별·나무·꽃·풀·돌고래)와
 * 종이결 텍스처를 SVG 로 만든다. 전부 코드로 그리며 외부 이미지를 쓰지 않는다.
 *
 * 크레용 느낌의 정체 — 세 가지를 겹친다:
 *   1) 선 흔들림  feTurbulence + feDisplacementMap 으로 획을 실제로 떨리게
 *   2) 왁스 결    성긴 노이즈를 곱하기로 얹어 크레용이 종이결에 걸린 자국을 낸다
 *   3) 끊긴 획    stroke-linecap:round + 살짝 벌어진 획으로 손으로 칠한 티
 *
 * 낙서는 장식이라 화면을 가리면 안 된다 — 가장자리에만 두고 아이 손이 닿는
 * 영역에는 넣지 않으며, pointer-events:none 으로 터치를 가로채지 않는다.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets');

/* 크레용 필터 — 모든 낙서가 공유한다 */
const CRAYON_FILTER = `
  <filter id="cr" x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency="0.038" numOctaves="3" seed="5" result="w"/>
    <feDisplacementMap in="SourceGraphic" in2="w" scale="3.2" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="2" seed="11" result="g"/>
    <feColorMatrix in="g" type="matrix"
      values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -.55 .62" result="grain"/>
    <feComposite in="grain" in2="d" operator="in" result="gin"/>
    <feBlend in="d" in2="gin" mode="multiply"/>
  </filter>`;

const wrap = (w, h, body, label) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">
  <defs>${CRAYON_FILTER}</defs>
  <g filter="url(#cr)" fill="none" stroke-linecap="round" stroke-linejoin="round">${body}
  </g>
</svg>
`;

const DOODLES = {
  // 🌈 무지개 — 여섯 줄 크레용 아치
  rainbow: wrap(170, 100, `
    <path d="M10 96 A76 76 0 0 1 162 96" stroke="#E8453C" stroke-width="11"/>
    <path d="M23 96 A63 63 0 0 1 149 96" stroke="#FF8C42" stroke-width="11"/>
    <path d="M36 96 A50 50 0 0 1 136 96" stroke="#F2B705" stroke-width="11"/>
    <path d="M49 96 A37 37 0 0 1 123 96" stroke="#4CA64C" stroke-width="11"/>
    <path d="M62 96 A24 24 0 0 1 110 96" stroke="#2E7BC4" stroke-width="11"/>
    <path d="M75 96 A11 11 0 0 1 97 96" stroke="#9B59B6" stroke-width="11"/>`, '무지개'),

  // ☀️ 웃는 해
  sun: wrap(120, 120, `
    <circle cx="60" cy="60" r="30" fill="#FFE066" stroke="#F2B705" stroke-width="5"/>
    <g stroke="#F2B705" stroke-width="6">
      <path d="M60 14 v-11"/><path d="M60 106 v11"/><path d="M14 60 h-11"/><path d="M106 60 h11"/>
      <path d="M27 27 l-8 -8"/><path d="M93 27 l8 -8"/><path d="M27 93 l-8 8"/><path d="M93 93 l8 8"/>
    </g>
    <circle cx="49" cy="55" r="3.6" fill="#8A5A12"/><circle cx="71" cy="55" r="3.6" fill="#8A5A12"/>
    <path d="M50 70 q10 9 20 0" stroke="#8A5A12" stroke-width="4"/>
    <circle cx="41" cy="66" r="5" fill="#FFAFC4" opacity=".75"/>
    <circle cx="79" cy="66" r="5" fill="#FFAFC4" opacity=".75"/>`, '웃는 해'),

  // ☁️ 구름
  cloud: wrap(120, 66, `
    <path d="M26 48 q-18 0 -18 -13 q0 -12 14 -13 q3 -14 18 -14 q12 0 17 10
             q6 -6 14 -6 q15 0 17 14 q14 1 14 12 q0 10 -15 10 z"
          stroke="#7FB8E0" stroke-width="5"/>
    <path d="M34 34 q8 -6 16 -1" stroke="#A8D2ED" stroke-width="4"/>`, '구름'),

  // ⭐ 별
  star: wrap(70, 70, `
    <path d="M35 8 l8.5 19.5 21 2 -16 14.5 4.6 20.8 -18.1 -10.6 -18.1 10.6 4.6 -20.8 -16 -14.5 21 -2 z"
          stroke="#F48FB1" stroke-width="5"/>`, '별'),

  // 🌳 나무
  tree: wrap(120, 140, `
    <path d="M60 118 v-34" stroke="#A5703C" stroke-width="10"/>
    <path d="M60 96 l-15 -13 M60 104 l16 -12" stroke="#A5703C" stroke-width="7"/>
    <circle cx="60" cy="52" r="36" fill="#BEE3A6" stroke="#5FA83F" stroke-width="6"/>
    <path d="M38 44 q10 -12 22 -6 M62 62 q12 -10 22 -2" stroke="#5FA83F" stroke-width="5"/>`, '나무'),

  // 🌸 꽃
  flower: wrap(70, 80, `
    <path d="M35 78 v-28" stroke="#5FA83F" stroke-width="6"/>
    <path d="M35 62 q-13 -3 -16 -14" stroke="#5FA83F" stroke-width="5"/>
    <g fill="#FFC0D4" stroke="#E8709A" stroke-width="4">
      <ellipse cx="35" cy="20" rx="9" ry="12"/><ellipse cx="35" cy="42" rx="9" ry="12"/>
      <ellipse cx="24" cy="31" rx="12" ry="9"/><ellipse cx="46" cy="31" rx="12" ry="9"/>
    </g>
    <circle cx="35" cy="31" r="7" fill="#F2B705" stroke="#D69A05" stroke-width="3"/>`, '꽃'),

  // 🐬 돌고래
  dolphin: wrap(140, 110, `
    <path d="M18 74 q22 -44 62 -40 q26 3 42 26 q-16 6 -30 3 q6 14 -4 24
             q-18 16 -44 6 q-16 -6 -26 -19 z" fill="#BFE2F5" stroke="#3E97D1" stroke-width="5"/>
    <path d="M70 34 q10 -20 26 -22 q-4 16 -12 26" stroke="#3E97D1" stroke-width="5"/>
    <circle cx="46" cy="58" r="4" fill="#2A6C99"/>
    <path d="M104 22 q6 -10 14 -12 M120 34 q9 -6 17 -4" stroke="#7FC4E8" stroke-width="5"/>`, '돌고래'),

  // 🌿 풀 — 아래 가장자리에 깔린다
  grass: wrap(320, 60, `
    <g stroke="#6FB84A" stroke-width="6">
      <path d="M14 56 q4 -26 -4 -38"/><path d="M34 56 q-3 -22 6 -34"/><path d="M56 56 q5 -28 -3 -40"/>
      <path d="M80 56 q-4 -20 5 -31"/><path d="M104 56 q6 -26 -2 -37"/><path d="M128 56 q-3 -23 6 -33"/>
      <path d="M152 56 q5 -27 -3 -39"/><path d="M178 56 q-4 -21 5 -32"/><path d="M202 56 q6 -25 -2 -36"/>
      <path d="M226 56 q-3 -22 6 -34"/><path d="M250 56 q5 -28 -3 -38"/><path d="M276 56 q-4 -20 5 -31"/>
      <path d="M300 56 q6 -26 -2 -36"/>
    </g>
    <path d="M4 57 H316" stroke="#8CCB63" stroke-width="7"/>`, '풀'),
};

/* 종이결 — 배경에 아주 옅게 깔아 크레용이 걸릴 결을 만든다 */
const PAPER = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">
  <filter id="p">
    <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" seed="3"/>
    <feColorMatrix type="matrix"
      values="0 0 0 0 .42  0 0 0 0 .33  0 0 0 0 .18  0 0 0 -.12 .105"/>
  </filter>
  <rect width="220" height="220" filter="url(#p)"/>
</svg>
`;

mkdirSync(outDir, { recursive: true });
let total = 0;
for (const [name, svg] of Object.entries(DOODLES)) {
  writeFileSync(join(outDir, `doodle-${name}.svg`), svg);
  total += Buffer.byteLength(svg);
  console.log(`✅ assets/doodle-${name}.svg`);
}
writeFileSync(join(outDir, 'paper.svg'), PAPER);
total += Buffer.byteLength(PAPER);
console.log('✅ assets/paper.svg');
console.log(`완료 — 낙서 ${Object.keys(DOODLES).length}종 + 종이결 · 합계 ${(total / 1024).toFixed(1)}KB`);
