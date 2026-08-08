#!/usr/bin/env node
/* 제목 손글씨 생성기 — node tools/make-title.mjs
 *
 * 은아가 실제로 쓴 글씨를 보고 맞춘다.
 *
 * 은아 글씨의 특징 (사진 참고: 심온아 / 김영지 / 심우영 / 심채아 / 김덕구)
 *   · 사인펜이라 획 굵기가 처음부터 끝까지 똑같다 (크레용처럼 번지지 않는다)
 *   · 획이 곧다. 다섯 살이 자를 대듯 쭉 긋는다 — 흔들림은 아주 조금만.
 *   · 모서리가 각지다. ㅁ·ㅂ은 네 귀가 딱 만나거나 살짝 튀어나간다.
 *   · ㅇ은 작고 살짝 찌그러진 동그라미. 시작점과 끝점이 겹쳐 튀어나온다.
 *   · 글자마다 크기·기울기·높이가 제각각이다.
 *   · 한 낱말은 한 색으로 쓴다 (분홍 / 보라 / 파랑 / 주황 / 하늘).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const CELL = 92;
const SPACE = 34;

/* 은아 필통 색 */
const INK = { '은': 0, '아': 0, '와': 0, '서': 1, '하': 1, '의': 1, '놀': 2, '이': 2, '터': 2 };
const COLORS = ['#C93C9B', '#7B3FC4', '#2E56C8'];

let P = [];
const push = d => P.push(d);

/* ── 자모 ── */
// ㅇ — 작고 찌그러진 동그라미, 끝이 살짝 겹쳐 튀어나온다
const ieung = (x, y, r) => {
  push(`M${x} ${y - r} a${r * 1.03} ${r * 0.95} 0 1 1 -1.5 0.2`);
  push(`M${x - 1.5} ${y - r + 0.2} l3.5 -1.2`);
};
const hLine = (x, y, w) => push(`M${x} ${y} h${w}`);
const vLine = (x, y, h) => push(`M${x} ${y} v${h}`);
const nieun = (x, y, h, w) => push(`M${x} ${y} v${h} h${w}`);
const a_ = (x, y, h) => { push(`M${x} ${y} v${h}`); push(`M${x} ${y + h * 0.45} h19`); };
const eo_ = (x, y, h) => { push(`M${x} ${y} v${h}`); push(`M${x - 19} ${y + h * 0.44} h19`); };
const o_ = (x, y, w) => { push(`M${x} ${y} h${w}`); push(`M${x + w / 2} ${y - 17} v17`); };
const siot = (x, y, h) => {
  push(`M${x + 17} ${y} l-17 ${h}`);
  push(`M${x + 17} ${y + h * 0.26} l15 ${h * 0.74}`);
};
const hieut = (x, y, r) => {
  push(`M${x - 3} ${y - r - 21} v-7`);
  push(`M${x - r - 6} ${y - r - 9} h${r * 2 + 12}`);
  ieung(x, y, r);
};
const rieul = (x, y, w, h) => push(`M${x} ${y} h${w} v${h / 2} h-${w} v${h / 2} h${w}`);
const tieut = (x, y, w, h) => {
  push(`M${x} ${y} h${w}`);
  push(`M${x} ${y + h / 2} h${w - 3}`);
  push(`M${x} ${y} v${h} h${w}`);
};

const GLYPHS = {
  '은': o => { ieung(o + 46, 31, 16); hLine(o + 19, 55, 57); nieun(o + 21, 65, 27, 53); },
  '아': o => { ieung(o + 33, 55, 21); a_(o + 68, 19, 75); },
  '와': o => { ieung(o + 27, 33, 15); o_(o + 7, 61, 45); a_(o + 70, 17, 78); },
  '서': o => { siot(o + 11, 25, 63); eo_(o + 77, 19, 75); },
  '하': o => { hieut(o + 31, 61, 16); a_(o + 72, 19, 75); },
  '의': o => { ieung(o + 27, 35, 16); hLine(o + 9, 67, 41); vLine(o + 72, 17, 77); },
  '놀': o => { nieun(o + 25, 13, 23, 31); o_(o + 13, 51, 51); rieul(o + 21, 65, 51, 27); },
  '이': o => { ieung(o + 33, 55, 21); vLine(o + 74, 19, 75); },
  '터': o => { tieut(o + 13, 29, 41, 47); eo_(o + 79, 19, 75); },
};

const TEXT = '은아와 서하의 놀이터';

/* 글자마다 크기·기울기가 조금씩 다르다 — 정해진 값이라 매번 같게 나온다 */
const JITTER = [
  [-1.8, 2, 1.02], [1.4, -3, 0.97], [-0.9, 1, 1.04],
  [2.1, -1, 0.99], [-1.5, 3, 1.03], [0.8, 0, 0.96],
  [-2.2, -2, 1.05], [1.1, 2, 0.98], [-0.6, -1, 1.01],
];

const groups = [];
let x = 10, gi = 0;
for (const ch of TEXT) {
  if (ch === ' ') { x += SPACE; continue; }
  const draw = GLYPHS[ch];
  if (!draw) throw new Error('그리는 법이 없는 글자: ' + ch);
  P = [];
  draw(0);
  const [rot, dy, sc] = JITTER[gi];
  groups.push(
    `<g transform="translate(${x + CELL / 2} ${59 + dy}) rotate(${rot}) scale(${sc}) translate(${-CELL / 2} -59)"
       stroke="${COLORS[INK[ch]]}">${P.map(d => `<path d="${d}"/>`).join('')}</g>`
  );
  x += CELL;
  gi++;
}

const W = x + 10, H = 120;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"
     role="img" aria-label="${TEXT}">
  <defs>
    <!-- 사인펜이라 번짐은 없고, 손 떨림만 아주 조금 -->
    <filter id="h" x="-3%" y="-8%" width="106%" height="116%">
      <feTurbulence type="fractalNoise" baseFrequency="0.019" numOctaves="2" seed="11" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="1.7"/>
    </filter>
  </defs>
  <g filter="url(#h)" fill="none" stroke-width="11"
     stroke-linecap="round" stroke-linejoin="round">
    ${groups.join('\n    ')}
  </g>
</svg>
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'title.svg'), svg);
console.log('title.svg', (svg.length / 1024).toFixed(1) + 'KB');
