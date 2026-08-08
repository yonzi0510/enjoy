#!/usr/bin/env node
/* 손그림 아이콘 생성기 — node write/tools/make-doodle-icons.mjs
 *
 * 「낙서장」 시안에서 UI 이모지(🍎🎵📚🎧🎨🎤🖼️…)를 걷어내고
 * **다섯 살이 크레용으로 그린 것 같은 SVG** 로 바꾼다.
 *
 * 손맛을 내는 세 가지:
 *   · feTurbulence + feDisplacementMap  — 자로 그은 티가 나지 않게 획을 실제로 떨리게
 *   · 굵고 고른 획(stroke-width 7, 둥근 끝)  — 아이는 필압을 못 준다
 *   · 색칠을 윤곽에서 4~5px 밀어 칠한다  — 아이는 선 밖으로 삐져나가게 칠한다
 *   · 동그라미·사각형은 일부러 끝을 안 닫는다
 *
 * 결과물은 write/css/doodle-icons.css 한 장(데이터 URI 배경). 외부 이미지 파일을
 * 받지 않는다는 규칙(CLAUDE.md)을 지키면서도 CSS 만으로 갈아끼울 수 있다.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'css', 'doodle-icons.css');

const INK = '#2E2A24';

/* 별처럼 규칙적인 도형은 손으로 찍지 않고 계산해서 그린다 (대신 좌표를 흔든다) */
function starPath(cx, cy, R, r, n = 5, jitter = 2) {
  const p = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (-90 + i * (180 / n)) * Math.PI / 180;
    const rad = (i % 2 ? r : R) + (i % 3 - 1) * jitter;
    p.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
  }
  // 마지막 한 점은 살짝 못 미치게 — 안 닫히는 손그림
  return 'M' + p.map(([x, y]) => x.toFixed(1) + ' ' + y.toFixed(1)).join(' L') +
    ' L' + (p[0][0] + 2).toFixed(1) + ' ' + (p[0][1] + 3).toFixed(1);
}

/* 아이콘 정의
 *   fills  : 윤곽 밖으로 삐져나갈 색칠 (그림 아래에 깔린다)
 *   lines  : 연필 윤곽 (fill 없음)
 *   solids : 윤곽선과 함께 칠해야 하는 조각 (창문·잎사귀 등)
 */
const ICONS = {
  /* 낱말 쓰기 — 사과 */
  apple: {
    seed: 3,
    fills: [{ d: 'M50 34 C30 34 24 50 28 64 C32 80 44 86 50 84 C57 86 70 80 74 64 C78 50 71 34 50 34 Z', c: '#E8506A' }],
    lines: [
      'M50 32 C29 31 22 49 26 64 C30 80 44 88 50 83 C56 88 70 80 74 64 C78 49 71 31 51 33',
      'M50 33 L52 16',
      'M52 22 C62 13 72 17 69 26 C60 31 54 28 52 22',
    ],
  },
  /* 동요 필사 — 음표 */
  note: {
    seed: 11,
    fills: [
      { d: 'M22 76 a15 12 -16 1 0 26 4 a15 12 -16 1 0 -26 -4 Z', c: '#F2A03D' },
      { d: 'M66 68 a13 10 -16 1 0 22 3 a13 10 -16 1 0 -22 -3 Z', c: '#F2A03D' },
    ],
    lines: [
      'M35 87 C25 88 20 82 22 75 C25 68 34 64 42 66 C49 68 51 76 47 82 C45 85 40 87 35 87',
      'M78 79 C69 80 65 74 67 68 C70 62 78 59 84 61 C90 63 91 70 87 75 C85 78 82 79 78 79',
      'M47 80 L49 26', 'M88 72 L90 22',
      'M49 28 C62 20 78 25 90 21',
    ],
  },
  /* 동화 필사 — 펼친 책 */
  book: {
    seed: 21,
    fills: [{ d: 'M50 36 C41 28 24 25 15 29 L15 77 C26 73 43 76 50 84 C57 76 75 73 86 77 L86 29 C77 25 60 28 50 36 Z', c: '#7E9FE8' }],
    lines: [
      'M50 33 C40 24 22 22 13 26 L14 75 C25 71 42 74 50 82',
      'M50 33 C60 24 78 22 87 26 L86 75 C75 71 58 74 50 82',
      'M50 34 L50 81',
    ],
  },
  /* 받아쓰기 — 헤드폰 */
  head: {
    seed: 31,
    fills: [
      { d: 'M13 60 C13 56 17 55 21 55 L25 55 C28 55 29 58 29 61 L29 76 C29 80 27 82 23 82 L19 82 C15 82 13 79 13 75 Z', c: '#7FCDE8' },
      { d: 'M87 60 C87 56 83 55 79 55 L75 55 C72 55 71 58 71 61 L71 76 C71 80 73 82 77 82 L81 82 C85 82 87 79 87 75 Z', c: '#7FCDE8' },
    ],
    lines: [
      'M17 62 C14 28 33 14 50 14 C67 14 86 28 83 62',
      'M13 60 C13 56 17 55 21 55 L25 55 C28 55 29 58 29 61 L29 76 C29 80 27 82 23 82 L19 82 C15 82 13 79 13 75 Z',
      'M87 60 C87 56 83 55 79 55 L75 55 C72 55 71 58 71 61 L71 76 C71 80 73 82 77 82 L81 82 C85 82 87 79 87 75 Z',
    ],
  },
  /* 자유 낙서장 — 물감판 */
  palette: {
    seed: 41,
    fills: [{ d: 'M50 20 C26 20 14 39 16 56 C18 73 34 83 47 81 C56 79 53 70 59 66 C67 60 82 69 84 52 C86 33 72 20 50 20 Z', c: '#F7E2B0' }],
    lines: [
      'M50 17 C24 17 11 38 13 56 C15 74 33 85 47 82 C57 80 52 69 59 65 C68 59 84 70 86 52 C88 32 73 17 51 18',
      'M31 62 C36 60 40 63 39 68 C38 72 33 73 30 70 C28 67 28 63 31 62',
    ],
    solids: [
      { d: 'M32 34 a8 8 0 1 0 .1 0 Z', c: '#E8506A' },
      { d: 'M53 27 a8 8 0 1 0 .1 0 Z', c: '#F2C14E' },
      { d: 'M71 37 a8 8 0 1 0 .1 0 Z', c: '#4FB477' },
      { d: 'M76 55 a8 8 0 1 0 .1 0 Z', c: '#5B8DEF' },
    ],
  },
  /* 물어보고 쓰기 — 마이크 */
  mic: {
    seed: 51,
    fills: [{ d: 'M50 14 C41 14 37 21 37 29 L37 47 C37 55 42 61 50 61 C58 61 63 55 63 47 L63 29 C63 21 59 14 50 14 Z', c: '#F06292' }],
    lines: [
      'M50 13 C41 13 36 20 36 28 L36 46 C36 55 41 61 50 61 C59 61 64 55 64 46 L64 28 C64 20 59 13 51 14',
      'M27 45 C27 66 37 75 50 75 C63 75 73 66 73 45',
      'M50 75 L50 88', 'M36 88 L65 87',
    ],
  },
  /* 내 글씨 — 그림 액자 */
  frame: {
    seed: 61,
    fills: [{ d: 'M17 23 L84 21 L86 79 L15 81 Z', c: '#DFCBF7' }],
    lines: [
      'M15 22 L84 20 L86 78 L14 80 L15 22',
      'M22 69 L39 47 L52 62 L65 42 L79 68',
      'M33 33 a7 7 0 1 0 .1 0',
    ],
  },
  /* 제목·다시 쓰기 — 연필 */
  pencil: {
    seed: 71,
    fills: [{ d: 'M31 60 L71 20 L85 33 L45 73 Z', c: '#F2C14E' }],
    lines: [
      'M20 82 L30 58 L70 17 L84 30 L44 71 L20 82',
      'M30 58 L44 71', 'M65 22 L78 35',
    ],
  },
  /* 별 */
  star: {
    seed: 81,
    fills: [{ d: starPath(50, 53, 34, 15, 5, 0) + ' Z', c: '#F5C433' }],
    lines: [starPath(50, 52, 36, 15)],
  },
  /* 다 끝낸 묶음 — 메달 */
  medal: {
    seed: 85,
    fills: [{ d: 'M50 44 a22 22 0 1 0 .1 0 Z', c: '#F5C433' }],
    lines: [
      'M31 12 L44 46', 'M69 12 L56 46',
      'M62 44 C74 48 80 58 78 68 C75 80 63 87 50 87 C37 87 26 79 24 68 C22 56 32 44 50 43',
      'M50 55 L54 63 L62 64 L56 70 L58 78 L50 74 L42 78 L44 70 L38 64 L46 63 Z',
    ],
  },
  /* 목소리 설정 — 말풍선 */
  voice: {
    seed: 91,
    fills: [{ d: 'M18 25 L82 23 C87 23 89 27 89 31 L89 61 C89 66 85 69 81 69 L47 69 L29 84 L31 69 L20 69 C16 69 14 65 14 61 L14 29 C14 27 16 25 18 25 Z', c: '#7ED0A5' }],
    lines: [
      'M18 23 L82 21 C86 21 88 25 88 29 L88 59 C88 65 84 67 80 67 L46 67 L27 83 L30 67 L20 67 C16 67 13 63 13 59 L13 27 C13 24 15 23 19 23',
      'M31 38 L70 37', 'M31 52 L58 51',
    ],
  },
  /* 물어본 낱말 지우기 — 빗자루 */
  broom: {
    seed: 101,
    fills: [{ d: 'M31 46 L60 64 L46 86 L17 68 Z', c: '#E0A35C' }],
    lines: [
      'M74 14 L44 50',
      'M29 42 L59 61 L45 84 L15 66 Z',
      'M38 48 L31 72', 'M48 55 L41 78',
    ],
  },
  /* 도구 — 가는 펜(연필) */
  'pen-thin': {
    seed: 111, sw: 6,
    fills: [{ d: 'M35 62 L70 26 L80 36 L45 72 Z', c: '#8FA6BE' }],
    lines: ['M25 82 L33 60 L69 23 L80 34 L44 70 L25 82', 'M33 60 L44 70'],
  },
  /* 도구 — 보통 펜 */
  'pen-mid': {
    seed: 112,
    fills: [{ d: 'M34 63 L69 27 L81 38 L46 74 Z', c: '#4E6FE3' }],
    lines: ['M22 84 L32 60 L68 22 L82 35 L45 71 L22 84', 'M32 60 L45 71', 'M60 30 L74 43'],
  },
  /* 도구 — 굵은 크레용 */
  'pen-thick': {
    seed: 113, sw: 8,
    fills: [{ d: 'M32 66 L66 30 L84 46 L50 82 Z', c: '#E8763A' }],
    lines: ['M20 86 L30 62 L64 25 L83 43 L48 78 L20 86', 'M30 62 L48 78'],
  },
  /* 도구 — 형광펜(붓) */
  'pen-hl': {
    seed: 114,
    fills: [{ d: 'M30 66 L64 30 L82 46 L48 82 Z', c: '#F2E14E' }],
    lines: ['M18 86 L28 62 L62 26 L82 44 L46 78 L18 86', 'M28 62 L46 78', 'M14 88 L30 84'],
  },
  /* 지우개 */
  eraser: {
    seed: 121,
    fills: [{ d: 'M23 67 L47 35 C51 29 59 29 63 33 L78 48 C83 53 82 61 77 65 L53 85 Z', c: '#9BD4F0' }],
    lines: [
      'M20 66 L45 33 C49 27 58 27 62 32 L78 47 C83 52 82 61 76 64 L51 84 L20 66',
      'M35 47 L66 74',
    ],
  },
  /* 한 획 되돌리기 */
  undo: {
    seed: 131,
    fills: [],
    lines: [
      'M76 76 C81 47 64 32 43 32 L21 33',
      'M34 20 L18 33 L34 45',
    ],
  },
  /* 다 지우기 — 쓰레기통 */
  trash: {
    seed: 141,
    fills: [{ d: 'M28 36 L34 84 L68 84 L74 36 Z', c: '#AEBFC9' }],
    lines: [
      'M25 34 L32 84 L69 84 L75 33',
      'M16 32 L84 30',
      'M39 30 L41 19 L60 18 L61 29',
      'M42 46 L44 72', 'M59 45 L57 71',
    ],
  },
  /* 다 지우기(한 번 더 누르면 지워짐) — 빨간 통 + 느낌표 */
  'trash-on': {
    seed: 142,
    fills: [{ d: 'M28 36 L34 84 L68 84 L74 36 Z', c: '#F09098' }],
    lines: [
      'M25 34 L32 84 L69 84 L75 33',
      'M16 32 L84 30',
      'M39 30 L41 19 L60 18 L61 29',
      'M50 44 L50 64', 'M50 74 L50 75',
    ],
  },
  /* 보관하기 */
  save: {
    seed: 151,
    fills: [{ d: 'M20 21 L72 19 L85 33 L83 83 L19 85 Z', c: '#A9E7C7' }],
    lines: [
      'M18 20 L71 18 L84 32 L83 82 L17 84 L18 20',
      'M35 58 L68 56 L67 83',
      'M39 20 L39 40 L66 38 L66 19',
    ],
  },
  /* 듣기 — 확성기 */
  speaker: {
    seed: 161,
    fills: [{ d: 'M19 43 L33 43 L49 26 L49 77 L33 61 L19 61 Z', c: '#F2A03D' }],
    lines: [
      'M17 42 L32 42 L48 25 L48 76 L32 60 L17 60 L17 42',
      'M60 38 C70 47 70 58 60 66',
      'M72 27 C88 44 88 60 72 74',
    ],
  },
  /* 맞았어요 — 크레용 동그라미 */
  circle: {
    seed: 171,
    fills: [{ d: 'M50 20 C74 20 86 36 86 52 C86 70 71 84 50 84 C29 84 15 70 15 52 C15 35 27 20 50 20 Z', c: '#9BE0B8' }],
    lines: ['M62 20 C80 24 87 38 86 53 C85 70 70 84 50 84 C29 84 14 69 14 51 C14 34 29 19 50 19'],
  },
};

function svgOf(name, ic) {
  const sw = ic.sw || 7;
  const fills = (ic.fills || [])
    .map(f => `<path d="${f.d}" fill="${f.c}"/>`).join('');
  const solids = (ic.solids || [])
    .map(f => `<path d="${f.d}" fill="${f.c}" stroke="${INK}" stroke-width="4"/>`).join('');
  const lines = (ic.lines || [])
    .map(d => `<path d="${d}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<filter id="w" x="-25%" y="-25%" width="150%" height="150%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.032" numOctaves="2" seed="${ic.seed}"/>` +
    `<feDisplacementMap in="SourceGraphic" scale="3.4"/></filter>` +
    `<g filter="url(#w)">` +
    // 색칠은 윤곽보다 4~5px 밀려 있다 — 선 밖으로 삐져나간 크레용
    `<g transform="translate(4.5,5)" opacity="0.9">${fills}</g>` +
    `<g fill="none" stroke="${INK}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${lines}</g>` +
    `<g stroke-linejoin="round">${solids}</g>` +
    `</g></svg>`;
}

const head = `/* 손그림 아이콘 — 자동 생성 파일. 직접 고치지 말고
 *   node write/tools/make-doodle-icons.mjs
 * 를 다시 돌린다. 그림 정의는 write/tools/make-doodle-icons.mjs 안에 있다.
 *
 * 쓰는 법: <i class="di di-apple"></i>  (글자 옆에 놓는 아이콘)
 *          .c-word .mc-icon { --di: var(--di-apple) }  (칸 아이콘)
 */
:root {
`;

let css = head;
for (const [name, ic] of Object.entries(ICONS)) {
  css += `  --di-${name}: url("data:image/svg+xml,${encodeURIComponent(svgOf(name, ic))}");\n`;
}
css += '}\n\n';
for (const name of Object.keys(ICONS)) {
  css += `.di-${name} { --di: var(--di-${name}); }\n`;
}

writeFileSync(OUT, css);
console.log('✅ ' + OUT + ' — 아이콘 ' + Object.keys(ICONS).length + '종, ' +
  (css.length / 1024).toFixed(1) + 'KB');
