#!/usr/bin/env node
/* 제목 손글씨 생성기 — node tools/make-title.mjs
 *
 * "은아와 서하의 놀이터" 를 크레용 손글씨로 **직접 그린다**.
 *
 * 왜 그리는가 — 참고 그림의 제목은 손글씨체인데, 한글 폰트는 2~6MB라
 * CLAUDE.md 의 "외부 파일 금지"에 걸린다. 다행히 제목은 **고정된 글자 9자**라
 * 폰트를 통째로 들이지 않고 글자만 그리면 된다 (합쳐 6KB 안쪽).
 *
 * 그리는 방식 — 한글은 자모를 조합하는 글자라 획 몇 개로 만들 수 있다.
 * 자모 하나를 그리는 함수를 두고, 글자마다 자모를 배치한다.
 * 획 끝은 둥글게(stroke-linecap:round) 해서 크레용으로 꾹 눌러 쓴 느낌을 낸다.
 * 마지막에 흔들림 필터를 얹어 자로 그은 티를 없앤다.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets');

const CELL = 92;    // 글자 한 칸 (너무 넓으면 글자가 흩어져 보인다)
const GAP = 0;      // 글자 사이
const SPACE = 30;   // 띄어쓰기

/* ── 자모 획 ────────────────────────────────────────────────────────
 * 모두 (x, y, w, h) 상자 안에 그린다. 좌표는 글자 칸 기준. */
const P = [];
const push = d => P.push(`<path d="${d}"/>`);

const ieung = (x, y, r) =>                                   // ㅇ
  push(`M${x} ${y - r} a${r} ${r} 0 1 1 -0.1 0 z`);
const hLine = (x, y, w) => push(`M${x} ${y} h${w}`);          // ㅡ
const vLine = (x, y, h) => push(`M${x} ${y} v${h}`);         // ㅣ
const nieun = (x, y, h, w) => push(`M${x} ${y} v${h} h${w}`); // ㄴ
const a_ = (x, y, h) => {                                     // ㅏ
  push(`M${x} ${y} v${h}`);
  push(`M${x} ${y + h * 0.46} h18`);
};
const eo_ = (x, y, h) => {                                    // ㅓ
  push(`M${x} ${y} v${h}`);
  push(`M${x - 18} ${y + h * 0.46} h18`);
};
const o_ = (x, y, w) => {                                     // ㅗ
  push(`M${x} ${y} h${w}`);
  push(`M${x + w / 2} ${y - 16} v16`);
};
const siot = (x, y, h) => {                                   // ㅅ
  push(`M${x + 16} ${y} l-16 ${h}`);
  push(`M${x + 16} ${y + h * 0.3} l14 ${h * 0.7}`);
};
const hieut = (x, y, r) => {                                  // ㅎ
  push(`M${x - 4} ${y - r - 20} v-8`);
  push(`M${x - r - 4} ${y - r - 8} h${r * 2 + 8}`);
  ieung(x, y, r);
};
const rieul = (x, y, w, h) => {                               // ㄹ
  push(`M${x} ${y} h${w} v${h / 2} h-${w} v${h / 2} h${w}`);
};
const tieut = (x, y, w, h) => {                               // ㅌ
  push(`M${x} ${y} h${w}`);
  push(`M${x} ${y + h / 2} h${w}`);
  push(`M${x} ${y} v${h} h${w}`);
};

/* ── 글자 9자 ────────────────────────────────────────────────────── */
const GLYPHS = {
  // 은 = ㅇ / ㅡ / ㄴ  (세로로 쌓는다)
  '은': o => { ieung(o + 46, 32, 17); hLine(o + 20, 56, 56); nieun(o + 22, 66, 26, 52); },
  // 아 = ㅇ + ㅏ
  '아': o => { ieung(o + 34, 56, 22); a_(o + 68, 20, 74); },
  // 와 = ㅇ / ㅗ + ㅏ
  '와': o => { ieung(o + 28, 34, 16); o_(o + 8, 62, 44); a_(o + 70, 18, 78); },
  // 서 = ㅅ + ㅓ
  '서': o => { siot(o + 12, 26, 62); eo_(o + 76, 20, 74); },
  // 하 = ㅎ + ㅏ
  '하': o => { hieut(o + 32, 62, 17); a_(o + 72, 20, 74); },
  // 의 = ㅇ / ㅡ + ㅣ
  '의': o => { ieung(o + 28, 36, 17); hLine(o + 10, 68, 40); vLine(o + 72, 18, 76); },
  // 놀 = ㄴ / ㅗ / ㄹ
  '놀': o => { nieun(o + 26, 14, 22, 30); o_(o + 14, 52, 50); rieul(o + 22, 66, 50, 26); },
  // 이 = ㅇ + ㅣ
  '이': o => { ieung(o + 34, 56, 22); vLine(o + 74, 20, 74); },
  // 터 = ㅌ + ㅓ
  '터': o => { tieut(o + 14, 30, 40, 46); eo_(o + 78, 20, 74); },
};

const TEXT = '은아와 서하의 놀이터';

let x = 8;
const marks = [];
for (const ch of TEXT) {
  if (ch === ' ') { x += SPACE; continue; }
  const draw = GLYPHS[ch];
  if (!draw) throw new Error('그리는 법이 없는 글자: ' + ch);
  const before = P.length;
  draw(x);
  marks.push({ ch, from: before, to: P.length });
  x += CELL + GAP;
}
const W = x + 8;
const H = 118;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"
     role="img" aria-label="${TEXT}">
  <defs>
    <!-- 획을 실제로 떨리게 해 손으로 쓴 티를 낸다 -->
    <filter id="w" x="-6%" y="-14%" width="112%" height="128%">
      <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="3" seed="6" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" result="d"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="2" seed="15" result="g"/>
      <feColorMatrix in="g" type="matrix"
        values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -.5 .6" result="gr"/>
      <feComposite in="gr" in2="d" operator="in" result="gi"/>
      <feBlend in="d" in2="gi" mode="multiply"/>
    </filter>
  </defs>
  <g filter="url(#w)" fill="none" stroke="#4A3B31" stroke-width="10.5"
     stroke-linecap="round" stroke-linejoin="round">
    ${P.join('\n    ')}
  </g>
</svg>
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'title.svg'), svg);
console.log(`✅ assets/title.svg  (${(Buffer.byteLength(svg) / 1024).toFixed(1)}KB · ${W}×${H} · 획 ${P.length}개)`);
console.log(`   글자 ${marks.length}자: ${marks.map(m => m.ch).join('')}`);
