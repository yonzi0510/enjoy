#!/usr/bin/env node
/* 앱 아이콘 바탕색 정하기 — node tools/recolor-app-icons.mjs
 *
 * 왜 —  런처에 깔리는 48px 크기에서는 분홍 토끼가 화면을 다 차지해서
 * 29개 앱이 전부 똑같아 보였다. 토끼와 소품은 그대로 두고 **바탕색만** 홈의
 * 묶음 색으로 칠해, 한눈에 어느 묶음의 놀이인지 알아보게 한다.
 * 같은 묶음 안에서는 밝기를 조금씩 달리해 서로도 구분된다.
 *
 * 아이콘 생성기가 두 갈래라(옛 앱 14개는 tools/make-mascot-icons.mjs,
 * 나중 앱 15개는 각자 <앱>/tools/make-icon.mjs) 이 스크립트가 양쪽의
 * 바탕색 값만 고쳐 놓는다. 그 뒤 생성기를 돌리면 PNG가 새로 만들어진다.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* 홈 화면 묶음 색 (index.html 의 GROUPS 와 같은 값) */
const GROUPS = {
  learn: { c: '#E0A21B', apps: ['hangul', 'english', 'japanese', 'math', 'market', 'pixel', 'practika'] },
  draw:  { c: '#3E86BE', apps: ['write', 'lines', 'coloring'] },
  shape: { c: '#4E9B48', apps: ['shape', 'tangram', 'geoboard', 'cups'] },
  color: { c: '#7E57B5', apps: ['lab', 'beads', 'rings', 'tubes', 'slide'] },
  order: { c: '#DD8329', apps: ['burger', 'kkochi', 'pattern', 'connect'] },
  find:  { c: '#CE5C55', apps: ['play', 'dice', 'donut', 'twist', 'matrix', 'bag'] },
};

/* 흰색과 섞어 파스텔로 만든다 (t=0 이면 원색, t=1 이면 흰색) */
function tint(hex, t) {
  const n = parseInt(hex.slice(1), 16);
  const mix = v => Math.round(v + (255 - v) * t);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/* 앱마다 [진한색, 옅은색] 두 개. 같은 묶음 안에서는 밝기를 조금씩 달리한다. */
const COLORS = {};
for (const { c, apps } of Object.values(GROUPS)) {
  apps.forEach((app, i) => {
    /* 48px 런처 크기에서 색이 보이려면 이만큼은 진해야 한다 */
    const deep = 0.26 + (i % 4) * 0.06;
    /* 두 색을 가깝게 둔다 — 가운데가 너무 밝으면 작은 크기에서 색이 안 보인다 */
    COLORS[app] = [tint(c, deep), tint(c, deep + 0.12)];
  });
}

const HEX = /#[0-9A-Fa-f]{6}/g;
let changed = 0;

/* ① 옛 앱 14개 — tools/make-mascot-icons.mjs 안의 bg: ['진한','옅은'] */
{
  const p = join(ROOT, 'tools', 'make-mascot-icons.mjs');
  let s = readFileSync(p, 'utf8');
  s = s.replace(/dir: '([a-z.]+)', bg: \[[^\]]+\]/g, (m, dir) => {
    const c = COLORS[dir];
    if (!c) return m;                       // 루트('.') 아이콘은 그대로 둔다
    changed++;
    return `dir: '${dir}', bg: ['${c[0]}', '${c[1]}']`;
  });
  writeFileSync(p, s);
}

/* ② 나중 앱 15개 — 각자 <앱>/tools/make-icon.mjs 의 background 선언 한 줄.
      두 갈래 서식이 있는데 둘 다 '옅은색 → 진한색' 순서로 적혀 있다. */
for (const app of Object.keys(COLORS)) {
  /* 파일 이름이 make-icon.mjs 인 곳도 있고 make-icons.mjs 인 곳도 있다 */
  const p = ['make-icon.mjs', 'make-icons.mjs']
    .map(f => join(ROOT, app, 'tools', f)).find(existsSync);
  if (!p) continue;
  const [deep, light] = COLORS[app];
  let s = readFileSync(p, 'utf8');

  if (/bg: \[/.test(s)) {
    s = s.replace(/bg: \[[^\]]+\]/, `bg: ['${deep}', '${light}']`);
  } else if (/^const BG = \[/m.test(s)) {
    /* 색을 파일 위쪽 상수로 뽑아 둔 서식 — const BG = ['진한', '옅은'] */
    s = s.replace(/^const BG = \[[^\]]+\]/m, `const BG = ['${deep}', '${light}']`);
  } else if (/\[c0, c1\] = \[/.test(s)) {
    /* 색을 그 자리에서 바로 적어 둔 서식 — const [c0, c1] = ['진한', '옅은'] */
    s = s.replace(/\[c0, c1\] = \[[^\]]+\]/, `[c0, c1] = ['${deep}', '${light}']`);
  } else {
    s = s.replace(/(background:(?:radial|linear)-gradient\([^)]*?)((?:#[0-9A-Fa-f]{6}[^)]*?){2})\)/,
      (m, head, tail) => {
        let n = 0;
        return head + tail.replace(HEX, () => (n++ === 0 ? light : deep)) + ')';
      });
  }
  writeFileSync(p, s);
  changed++;
}

console.log(`바탕색 ${changed}곳 정리 완료.`);
console.log('이제 생성기를 돌린다 — 순서가 중요하다:');
console.log('  for f in */tools/make-icon.mjs */tools/make-icons.mjs; do node $f; done');
console.log('  node tools/make-mascot-icons.mjs      # 반드시 마지막');
console.log('');
console.log('앱 8개(write·math·shape·market·lab·bag·coloring·practika)는 생성기가 둘 다 있다.');
console.log('나중에 돌린 쪽이 이긴다 — 배포된 그림은 make-mascot-icons.mjs 쪽이라 이걸 마지막에 돌린다.');
