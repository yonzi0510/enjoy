#!/usr/bin/env node
/* 앱 아이콘 바탕색 — node tools/recolor-app-icons.mjs (표만 찍는다)
 *
 * 왜 —  런처에 깔리는 48px 크기에서 29개를 나란히 놓으면 서로 구별이 돼야 한다.
 * 바탕은 홈 화면의 **묶음 색(hue)** 을 그대로 쓰고, 같은 묶음 안에서는 **밝기만** 벌린다.
 *
 * 예전 식은 `deep = 0.26 + (i % 4) * 0.06` 이었다. 두 가지가 문제였다.
 *   ① 폭이 18%p 뿐이라 이웃끼리 12%p 차 — 48px 에서는 같은 색으로 보였다.
 *   ② `% 4` 로 되감겨서 5개 이상인 묶음은 색이 **겹쳤다**
 *      (색 맞추기 묶음의 lab 과 slide 가 완전히 같은 보라였다).
 * 지금은 묶음 안에서 0.08 → 0.52 로 **44%p** 를 고르게 벌린다(되감김 없음).
 * 0.52 를 넘기면 48px 에서 흰 바탕처럼 보여 묶음 색이 사라지고,
 * 0.08 보다 진하면 소품의 연필선이 바탕에 묻힌다 — 둘 다 실사로 확인했다.
 *
 * 이 파일은 **색만** 정한다. 그림(소품 29개)과 렌더링은 tools/make-app-icons.mjs 에 있고
 * 그쪽이 이 모듈을 불러 쓴다. 색을 바꾸려면 여기만 고치면 29개가 같이 바뀐다.
 */

/* 홈 화면 묶음 색 (index.html 의 GROUPS 와 같은 값).
 * apps 배열의 **순서 = 바탕 밝기 순서**(앞이 진하고 뒤가 옅다). 홈의 나열 순서와 달라도 된다.
 * 48px 에서 헷갈리기 쉬운 짝(시험관·구슬↔슬라이드, 햄버거↔꼬치, 도형↔탱그램, 주사위↔돌림블록)은
 * 일부러 배열의 양 끝에 두어 밝기까지 벌어지게 했다. */
export const GROUPS = {
  learn: { c: '#E0A21B', apps: ['heart', 'hangul', 'english', 'japanese', 'math', 'market', 'pixel', 'practika'] },
  draw:  { c: '#3E86BE', apps: ['write', 'lines', 'coloring'] },
  shape: { c: '#4E9B48', apps: ['shape', 'geoboard', 'cups', 'tangram'] },
  color: { c: '#7E57B5', apps: ['tubes', 'beads', 'lab', 'rings', 'slide'] },
  order: { c: '#DD8329', apps: ['burger', 'robot', 'pattern', 'connect', 'kkochi'] },
  find:  { c: '#CE5C55', apps: ['play', 'dice', 'dig', 'donut', 'matrix', 'bag', 'twist'] },
};

/* 밝기를 벌리는 폭 — 묶음 안 첫 앱과 마지막 앱의 차 */
export const LIGHT_MIN = 0.08;
export const LIGHT_MAX = 0.52;
/* 가운데 하이라이트는 이만큼 더 옅게 (radial-gradient 안쪽 색) */
const HILIGHT = 0.10;

/* 흰색과 섞어 파스텔로 만든다 (t=0 이면 원색, t=1 이면 흰색) */
export function tint(hex, t) {
  const n = parseInt(hex.slice(1), 16);
  const mix = v => Math.round(v + (255 - v) * t);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/* 앱마다 [진한색(가장자리), 옅은색(가운데)] 두 개 */
export const BG = {};
/* 앱 → 묶음 이름 (검증·문서용) */
export const GROUP_OF = {};
for (const [name, { c, apps }] of Object.entries(GROUPS)) {
  apps.forEach((app, i) => {
    const t = apps.length > 1
      ? LIGHT_MIN + (i / (apps.length - 1)) * (LIGHT_MAX - LIGHT_MIN)
      : (LIGHT_MIN + LIGHT_MAX) / 2;
    BG[app] = [tint(c, t), tint(c, t + HILIGHT)];
    GROUP_OF[app] = name;
  });
}

/* 루트(홈) 아이콘은 묶음이 없다 — 무지개 파스텔 그대로 */
BG['.'] = ['#FFE7F1', '#EAF6FF'];

/* 직접 실행하면 배정표를 찍는다 */
if (import.meta.url === `file://${process.argv[1]}`) {
  for (const [name, { c, apps }] of Object.entries(GROUPS)) {
    console.log(`\n[${name}] ${c}`);
    apps.forEach((app, i) => {
      const t = LIGHT_MIN + (i / (apps.length - 1)) * (LIGHT_MAX - LIGHT_MIN);
      console.log(`  ${String(i).padStart(2)} ${app.padEnd(10)} 밝기 ${(t * 100).toFixed(0).padStart(2)}%  ${BG[app][0]} → ${BG[app][1]}`);
    });
  }
  console.log('\n그림까지 다시 뽑으려면: node tools/make-app-icons.mjs');
}
