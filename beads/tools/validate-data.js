/* 데이터 검증 — node beads/tools/validate-data.js
 * 색 구슬 6종(id·이름·읽기·SVG) 과 퍼즐 30개(단계별 10, 격자 3/4/5, 셀 색 유효,
 * cells 길이=size², 최소 구슬 수, rows↔cells 일치, 퍼즐 id 유일)를 정적 검사한다.
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.BeadsData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

/* ── 색 구슬: 6종, id·이름·읽기·색·SVG 계약 ── */
if (!Array.isArray(D.COLOR_IDS) || D.COLOR_IDS.length !== 6) {
  err('색 구슬은 6종이어야 함 — ' + (D.COLOR_IDS ? D.COLOR_IDS.length : 0));
}
D.COLOR_IDS.forEach(id => {
  const c = D.COLORS[id];
  const tag = '색 ' + id;
  if (!c) { err(tag + ': 정의 없음'); return; }
  if (!c.name || !c.say) err(tag + ': 이름/읽기 누락');
  ['c0', 'c1', 'c2'].forEach(k => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(c[k] || '')) err(tag + ': 색값 ' + k + ' 오류 — ' + c[k]);
  });
  const svg = D.drawBead(id);
  if (typeof svg !== 'string' || svg.indexOf('<svg') < 0 || svg.indexOf('</svg>') < 0) err(tag + ': SVG 문자열 오류');
  // 그라데이션 uid 충돌 방지 — 같은 색을 여러 번 그리면 서로 다른 id 를 써야 한다
  const a = D.drawBead(id), b = D.drawBead(id);
  if (a === b && /id="/.test(a)) err(tag + ': uid 가 SVG 에 반영되지 않음(id 충돌 위험)');
});
if (D.drawBead('없는색') !== '') err('없는 색은 빈 문자열을 반환해야 함');

/* ── 퍼즐: 30개, 단계별 10개, 격자 3/4/5 ── */
if (!Array.isArray(D.PUZZLES) || D.PUZZLES.length !== 30) {
  err('퍼즐이 30개여야 함 — ' + (D.PUZZLES ? D.PUZZLES.length : 0));
}
const SIZE = { 1: 3, 2: 4, 3: 5 };
const perLevel = { 1: 0, 2: 0, 3: 0 };
const seenIds = new Set();
const seenCells = new Set();
(D.PUZZLES || []).forEach(pz => {
  const tag = '퍼즐 ' + (pz.id || '?');
  if (!pz.id || seenIds.has(pz.id)) err(tag + ': id 누락/중복');
  seenIds.add(pz.id);
  if (![1, 2, 3].includes(pz.level)) { err(tag + ': 단계 오류 — ' + pz.level); return; }
  perLevel[pz.level]++;
  const n = SIZE[pz.level];
  if (pz.size !== n) err(tag + ': 단계 ' + pz.level + ' 격자는 ' + n + '이어야 함 — ' + pz.size);
  if (!Array.isArray(pz.cells) || pz.cells.length !== n * n) {
    err(tag + ': cells 길이가 ' + (n * n) + '이어야 함 — ' + (pz.cells ? pz.cells.length : 0));
    return;
  }
  // rows 와 cells 일치 확인(있으면)
  if (Array.isArray(pz.rows)) {
    if (pz.rows.length !== n) err(tag + ': rows 줄 수 ' + pz.rows.length + ' ≠ ' + n);
    pz.rows.forEach((r, ri) => { if (r.length !== n) err(tag + ': rows[' + ri + '] 길이 ' + r.length + ' ≠ ' + n); });
  }
  // 각 셀은 유효한 색 id 이거나 null(빈 구멍)
  pz.cells.forEach((cell, i) => {
    if (cell !== null && !D.hasColor(cell)) err(tag + ': 셀 ' + i + ' 색 오류 — ' + cell);
  });
  // 채울 구슬이 최소 3개는 있어야 놀이가 성립
  const beads = D.beadCount(pz);
  if (beads < 3) err(tag + ': 채울 구슬이 너무 적음 — ' + beads);
  // 서로 다른 색이 최소 1종
  if (D.colorsIn(pz).length < 1) err(tag + ': 쓰인 색이 없음');
  // 완전히 같은 배치의 퍼즐 중복 금지(단계·cells 조합)
  const key = pz.level + ':' + pz.cells.map(c => c || '.').join('');
  if (seenCells.has(key)) err(tag + ': 같은 배치의 퍼즐이 중복됨');
  seenCells.add(key);
});
[1, 2, 3].forEach(lv => { if (perLevel[lv] !== 10) err('단계 ' + lv + ' 퍼즐이 10개여야 함 — ' + perLevel[lv]); });

/* ── 단계 정의 3개 ── */
if (!Array.isArray(D.LEVELS) || D.LEVELS.length !== 3) err('단계 정의가 3개여야 함');
(D.LEVELS || []).forEach(lv => {
  if (!lv.name || !lv.desc || !lv.cls) err('단계 ' + lv.id + ': 이름/설명/클래스 누락');
  if (D.SIZES[lv.id] !== SIZE[lv.id]) err('단계 ' + lv.id + ': SIZES 값 오류 — ' + D.SIZES[lv.id]);
  if (D.puzzlesOf(lv.id).length !== 10) err('단계 ' + lv.id + ': puzzlesOf 10개 아님');
});

if (!Array.isArray(D.praises) || !D.praises.length) err('칭찬 문구가 없음');

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터 검증 통과 — 색 ' + D.COLOR_IDS.length + '종, 퍼즐 ' + D.PUZZLES.length +
  '개(단계별 10), 단계 ' + D.LEVELS.length + '개');
