#!/usr/bin/env node
/* 놀이 버튼 크레용 아이콘 생성기 — node tools/make-app-icons.mjs
 *
 * 홈 화면 놀이 버튼에 쓰던 이모지(🌟🗣️🛒…)를 손그림 크레용 아이콘으로 바꾼다.
 * 이모지를 쓰면 기기마다 모양이 달라지고(안드로이드·아이폰·PC가 전부 다름)
 * 크레용 톤과도 겉돈다. 코드로 그리면 어디서나 같은 그림이 나온다.
 *
 * 크레용 필터는 낙서 생성기(make-doodles.mjs)와 같은 방식이다:
 *   선 흔들림(feDisplacementMap) + 왁스 결(성긴 노이즈 곱하기)
 *
 * 아이콘은 24px 안팎으로 작게 쓰이므로 **획을 굵게, 형태를 단순하게** 잡는다.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets/icons');

const FILTER = `
  <filter id="cr" x="-18%" y="-18%" width="136%" height="136%">
    <feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="3" seed="4" result="w"/>
    <feDisplacementMap in="SourceGraphic" in2="w" scale="2.2" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="13" result="g"/>
    <feColorMatrix in="g" type="matrix"
      values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -.5 .58" result="grain"/>
    <feComposite in="grain" in2="d" operator="in" result="gin"/>
    <feBlend in="d" in2="gin" mode="multiply"/>
  </filter>`;

const INK = '#5A4632'; // 크레용 윤곽 (연필보다 조금 따뜻하게)

const svg = (body, label) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${label}">
  <defs>${FILTER}</defs>
  <g filter="url(#cr)" fill="none" stroke="${INK}" stroke-width="3.4"
     stroke-linecap="round" stroke-linejoin="round">${body}
  </g>
</svg>
`;

/* 앱별 아이콘 — 놀이 내용이 한눈에 보이는 물건 하나씩 */
const ICONS = {
  // 📚 배우기
  hangul: svg(`<path d="M32 8 l7 16 17 1.6 -13 11.6 3.8 16.8 -14.8 -8.7 -14.8 8.7 3.8 -16.8 -13 -11.6 17 -1.6 z"
      fill="#FFD84D"/>`, '한글 놀이터 — 별'),
  english: svg(`<path d="M12 40 q-4 0 -4 -5 V20 q0 -5 5 -5 h26 q5 0 5 5 v15 q0 5 -5 5 H24 l-9 9 z"
      fill="#BFD9F2"/>
    <path d="M17 27 h5 M27 27 h5 M37 27 h5" stroke="#3E7DB8"/>
    <path d="M50 30 q6 -3 6 -9 M50 40 q11 -5 11 -18" stroke="#7FB0DA" stroke-width="3"/>`, '영어 놀이터 — 말풍선'),
  japanese: svg(`<g fill="#FFC6DC">
      <ellipse cx="32" cy="16" rx="7" ry="10"/><ellipse cx="32" cy="48" rx="7" ry="10"/>
      <ellipse cx="16" cy="32" rx="10" ry="7"/><ellipse cx="48" cy="32" rx="10" ry="7"/>
    </g>
    <circle cx="32" cy="32" r="6" fill="#FFE066"/>`, '일본어 놀이터 — 벚꽃'),
  math: svg(`<rect x="10" y="10" width="44" height="44" rx="8" fill="#CFC4EE"/>
    <path d="M22 24 v-2 l3 -2 v14" stroke="#4A3A86"/>
    <path d="M36 21 q6 -2 6 3 q0 4 -6 10 h7" stroke="#4A3A86"/>
    <path d="M22 40 q6 -2 6 2 q0 3 -4 3 q4 0 4 3 q0 4 -6 3" stroke="#4A3A86"/>
    <path d="M43 36 v9 M39 45 h9 M46 40 v11" stroke="#4A3A86"/>`, '산수 놀이터 — 숫자 블록'),
  market: svg(`<path d="M8 14 h7 l7 26 h24 l6 -18 H20" fill="#FFE6C7"/>
    <circle cx="26" cy="50" r="4.5" fill="#E8453C"/><circle cx="44" cy="50" r="4.5" fill="#E8453C"/>`, '시장 놀이터 — 장바구니'),
  pixel: svg(`<path d="M26 10 q0 -4 6 -4 q6 0 6 4 q0 5 4 5 q4 0 4 -3 q6 0 6 7 q0 6 -4 6
      q-4 0 -4 4 q0 4 4 4 q4 0 4 6 q0 7 -7 7 q-3 0 -3 -4 q0 -4 -5 -4 q-5 0 -5 5
      q0 5 -6 5 q-7 0 -7 -7 q0 -4 4 -4 q4 0 4 -4 q0 -4 -4 -4 q-4 0 -4 -6 q0 -7 7 -7 q0 -6 0 -6 z"
      fill="#A8DFA0"/>`, '픽셀 놀이터 — 퍼즐 조각'),
};

mkdirSync(outDir, { recursive: true });
let total = 0;
for (const [name, s] of Object.entries(ICONS)) {
  writeFileSync(join(outDir, `${name}.svg`), s);
  total += Buffer.byteLength(s);
  console.log(`✅ assets/icons/${name}.svg`);
}
console.log(`완료 — 놀이 아이콘 ${Object.keys(ICONS).length}종 · 합계 ${(total / 1024).toFixed(1)}KB`);
