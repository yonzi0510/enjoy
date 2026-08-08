#!/usr/bin/env node
/* 크레용 테두리·칠 생성기 — node tools/make-frames.mjs
 *
 * 왜 필요한가 — CSS `border` 로는 크레용 선을 못 만든다. 아무리 굵게 줘도
 * 반듯한 선이라 "자로 그은 티"가 난다. 그래서 테두리를 **크레용으로 그린 SVG**로 만들고
 * CSS `border-image` 로 늘려 쓴다. 9조각(9-slice)이라 상자가 커져도 모서리가 안 뭉개진다.
 *
 * 만드는 것 두 가지:
 *   1) frame-<색>.svg  — 삐뚤삐뚤한 크레용 테두리 (border-image 용)
 *   2) hatch-<색>.svg  — 크레용으로 슥슥 칠한 결 (상자 안쪽 채움)
 *
 * 크레용 느낌은 세 겹이다:
 *   선 흔들림(feDisplacementMap) + 왁스 결(성긴 노이즈 곱하기) + 겹쳐 그은 획
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets/frames');

/* 묶음 색 — 홈 CSS·토끼 아이콘과 같은 값 */
const COLORS = {
  learn: '#F2B705', draw: '#2E7BC4', shape: '#4CA64C',
  color: '#9B59B6', order: '#FF8C42', find: '#E8453C',
  ink: '#5A4632',   // 놀이 버튼 테두리 (크레용 갈색)
};

const crayonFilter = (seed, scale) => `
    <filter id="cr" x="-15%" y="-15%" width="130%" height="130%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="${seed}" result="w"/>
      <feDisplacementMap in="SourceGraphic" in2="w" scale="${scale}" result="d"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="${seed + 7}" result="g"/>
      <feColorMatrix in="g" type="matrix"
        values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -.6 .68" result="grain"/>
      <feComposite in="grain" in2="d" operator="in" result="gin"/>
      <feBlend in="d" in2="gin" mode="multiply"/>
    </filter>`;

/* ── 테두리 ──────────────────────────────────────────────────────────
 * 100×100 정사각에 둥근 사각형을 두 번 겹쳐 긋는다 (한 번에 못 그은 손맛).
 * border-image-slice 로 잘라 쓸 것이므로 모서리 여유(36)를 넉넉히 둔다. */
function frame(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
  <defs>${crayonFilter(5, 2.6)}</defs>
  <g filter="url(#cr)" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">
    <rect x="5" y="5" width="90" height="90" rx="16" stroke-width="6"/>
    <rect x="5.8" y="4.4" width="88.6" height="91" rx="17" stroke-width="3.4" opacity=".7"/>
  </g>
</svg>
`;
}

/* ── 칠(해치) ────────────────────────────────────────────────────────
 * 크레용으로 비스듬히 슥슥 그은 획. 옅게 깔아 '칠한 면'처럼 보이게 한다.
 * 타일로 반복하므로 좌우 끝이 이어지도록 화면 밖까지 길게 긋는다. */
function hatch(color) {
  /* 간격·굵기·기울기를 일부러 어긋나게 흩는다 — 일정하면 크레용이 아니라 '줄무늬'로 보인다.
     타일로 반복되므로 seed 는 고정값을 쓴다(매번 같은 결이 나와야 한다). */
  const strokes = [];
  const jit = [0, 5.5, -3, 8, 2, -6, 4.5, -2, 7, 1, -5, 3, 6, -4, 2.5, -7];
  for (let i = -2; i < 14; i++) {
    const x = i * 11 + jit[(i + 2) % jit.length];
    const w = 3.2 + ((i * 7) % 5) * 0.9;
    const o = 0.34 + ((i * 3) % 5) * 0.07;
    const skew = 44 + ((i * 5) % 7) * 2;
    strokes.push(`<path d="M${x} 128 L${(x + skew).toFixed(1)} -12" stroke-width="${w.toFixed(1)}" opacity="${o.toFixed(2)}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>${crayonFilter(9, 3.4)}</defs>
  <g filter="url(#cr)" fill="none" stroke="${color}" stroke-linecap="round">
    ${strokes.join('\n    ')}
  </g>
</svg>
`;
}

mkdirSync(outDir, { recursive: true });
let total = 0;
for (const [name, hex] of Object.entries(COLORS)) {
  const f = frame(hex), h = hatch(hex);
  writeFileSync(join(outDir, `frame-${name}.svg`), f);
  writeFileSync(join(outDir, `hatch-${name}.svg`), h);
  total += Buffer.byteLength(f) + Buffer.byteLength(h);
  console.log(`✅ assets/frames/{frame,hatch}-${name}.svg`);
}
console.log(`완료 — 테두리·칠 ${Object.keys(COLORS).length}쌍 · 합계 ${(total / 1024).toFixed(1)}KB`);
