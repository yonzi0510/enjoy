/* 데이터 검증 — node slide/tools/validate-data.js
 * 색 조각 계약(4종 · id·이름·읽기·모양·명암·SVG) 과 퍼즐 30개(단계별 10, 열 4개,
 * 색 개수 균형, 시작≠목표, solution 시뮬레이션이 규칙을 지키며 목표에 도달, 퍼즐·시작 유일성)를
 * 정적 검사한다. "풀 수 있음"을 실제 이동 재생으로 재검증한다.
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.SlideData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

/* ── 색 조각: 정확히 4종, id·이름·읽기·모양·명암·SVG 계약 ── */
if (!Array.isArray(D.COLOR_IDS) || D.COLOR_IDS.length !== 4) {
  err('색은 정확히 4종이어야 함 — ' + (D.COLOR_IDS ? D.COLOR_IDS.length : 0));
}
if (D.NCOLS !== 4) err('열 수(NCOLS)는 4여야 함 — ' + D.NCOLS);
if (typeof D.CAP !== 'number' || D.CAP < 1) err('CAP 오류 — ' + D.CAP);
if (typeof D.CAPACITY !== 'number' || D.CAPACITY <= D.CAP) err('CAPACITY 는 CAP 보다 커야(작업 여유) 함 — ' + D.CAPACITY);

D.COLOR_IDS.forEach(id => {
  const c = D.meta(id);
  const tag = '색 ' + id;
  if (!c) { err(tag + ': 정의 없음'); return; }
  if (!c.name || !c.say) err(tag + ': 이름/읽기 누락');
  if (!c.shape) err(tag + ': 모양 누락');
  if (!c.light || !c.base || !c.dark) err(tag + ': 명암(light/base/dark) 누락');
  const svg = D.chipDraw(id, 't' + id);
  if (typeof svg !== 'string' || svg.indexOf('<svg') < 0 || svg.indexOf('</svg>') < 0) err(tag + ': SVG 문자열 오류');
});
// SVG 그라데이션 id 충돌 방지 — 다른 uid 로 그리면 서로 다른 id 를 써야 한다
D.COLOR_IDS.forEach(id => {
  const a = D.chipDraw(id, 'uidA'), b = D.chipDraw(id, 'uidB');
  if (a === b && /id="/.test(a)) err('색 ' + id + ': uid 가 SVG 에 반영되지 않음(id 충돌 위험)');
});

/* ── 이동 규칙 시뮬레이터 (앱 attemptMove 와 동일 규칙) ── */
const CAP = D.CAP, CAPACITY = D.CAPACITY;
function applyMove(cols, from, to) {
  if (from === to) return '같은 열 이동';
  if (!cols[from] || !cols[to]) return '없는 열';
  if (!cols[from].length) return 'from 이 빈 열';
  if (cols[to].length >= CAPACITY) return 'to 가 가득 참(>=CAPACITY)';
  cols[to].push(cols[from].pop());
  return null;
}
function eqCols(a, b) {
  return a.length === b.length &&
    a.every((c, i) => c.length === b[i].length && c.every((x, j) => x === b[i][j]));
}

/* ── 퍼즐: 30개, 단계별 10개 ── */
if (!Array.isArray(D.PUZZLES) || D.PUZZLES.length !== 30) {
  err('퍼즐이 30개여야 함 — ' + (D.PUZZLES ? D.PUZZLES.length : 0));
}
const perLevel = { 1: 0, 2: 0, 3: 0 };
const seenIds = new Set();
const seenStart = new Set();

(D.PUZZLES || []).forEach(pz => {
  const tag = '퍼즐 ' + (pz.id || '?');
  if (!pz.id || seenIds.has(pz.id)) err(tag + ': id 누락/중복');
  seenIds.add(pz.id);
  if (![1, 2, 3].includes(pz.level)) { err(tag + ': 단계 오류 — ' + pz.level); return; }
  perLevel[pz.level]++;

  // 열 4개
  if (!Array.isArray(pz.perm) || pz.perm.length !== 4) err(tag + ': perm(목표 색)은 4열이어야 함');
  if (!Array.isArray(pz.start) || pz.start.length !== 4) err(tag + ': start 는 4열이어야 함');
  if (!Array.isArray(pz.target) || pz.target.length !== 4) err(tag + ': target 은 4열이어야 함');
  (pz.perm || []).forEach(cid => { if (!D.has(cid)) err(tag + ': 없는 색 — ' + cid); });

  // target = perm 색으로 CAP 개씩
  (pz.target || []).forEach((col, i) => {
    if (col.length !== CAP || !col.every(x => x === pz.perm[i])) err(tag + ': target ' + i + ' 열이 perm×CAP 이 아님');
  });

  // 시작 열 길이는 CAPACITY 이하
  const startCounts = {};
  (pz.start || []).forEach((col, i) => {
    if (col.length > CAPACITY) err(tag + ': start ' + i + ' 열이 CAPACITY 초과 — ' + col.length);
    col.forEach(cid => {
      if (!D.has(cid)) err(tag + ': start 에 없는 색 — ' + cid);
      startCounts[cid] = (startCounts[cid] || 0) + 1;
    });
  });
  // 색 개수 균형: 각 색이 정확히 CAP 개 (총 4×CAP)
  D.COLOR_IDS.forEach(cid => {
    if ((startCounts[cid] || 0) !== CAP) err(tag + ': 색 ' + cid + ' 개수 ' + (startCounts[cid] || 0) + ' ≠ CAP(' + CAP + ')');
  });

  // 시작 ≠ 목표 (이미 정렬돼 있으면 놀이가 아님)
  if (eqCols(pz.start, pz.target)) err(tag + ': 시작이 이미 목표와 같음');

  // 시작 배치 유일성
  const sig = JSON.stringify(pz.start);
  if (seenStart.has(sig)) err(tag + ': 같은 시작 배치의 퍼즐이 중복됨');
  seenStart.add(sig);

  // solution: 배열, 규칙을 지키며 시뮬레이션하면 목표에 도달(=풀 수 있음)
  if (!Array.isArray(pz.solution) || !pz.solution.length) { err(tag + ': solution 이 비었음'); return; }
  // 단계별 이동 수: 단계1=1~2, 단계2=3~4, 단계3=5+
  const n = pz.solution.length;
  const range = { 1: [1, 2], 2: [3, 4], 3: [5, 99] }[pz.level];
  if (n < range[0] || n > range[1]) err(tag + ': 단계 ' + pz.level + ' 이동 수 ' + n + ' 가 범위[' + range[0] + '~' + range[1] + '] 밖');

  const cols = pz.start.map(c => c.slice());
  for (let k = 0; k < pz.solution.length; k++) {
    const mv = pz.solution[k];
    if (!Array.isArray(mv) || mv.length !== 2) { err(tag + ': solution[' + k + '] 형식 오류'); return; }
    const bad = applyMove(cols, mv[0], mv[1]);
    if (bad) { err(tag + ': solution[' + k + '] 규칙 위반 — ' + bad); return; }
  }
  if (!eqCols(cols, pz.target)) err(tag + ': solution 을 다 적용해도 목표에 도달하지 못함 (풀 수 없음)');
});
[1, 2, 3].forEach(lv => { if (perLevel[lv] !== 10) err('단계 ' + lv + ' 퍼즐이 10개여야 함 — ' + perLevel[lv]); });

/* ── 단계 정의 3개 ── */
if (!Array.isArray(D.LEVELS) || D.LEVELS.length !== 3) err('단계 정의가 3개여야 함');
(D.LEVELS || []).forEach(lv => {
  if (!lv.name || !lv.desc || !lv.cls) err('단계 ' + lv.id + ': 이름/설명/클래스 누락');
});

if (!Array.isArray(D.praises) || !D.praises.length) err('칭찬 문구가 없음');

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터 검증 통과 — 색 ' + D.COLOR_IDS.length + '종, 퍼즐 ' + D.PUZZLES.length +
  '개(단계별 10), 열 ' + D.NCOLS + '개, 모든 solution 시뮬레이션 목표 도달');
