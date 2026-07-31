/* 데이터 검증 — node geoboard/tools/validate-data.js
 * 못 6×6 격자 · 고무줄 색 5종 · 퍼즐 30개(단계별 10)의 정적 계약을 검사한다:
 * 세그먼트 endpoint 가 격자 범위(0~5) 안에 있는지, 같은 퍼즐 안에 완전히 같은 세그먼트가
 * 중복되지 않는지(순서 무관), 색이 정의된 팔레트(5종) 안에 있는지, 단계별 세그먼트 수 범위
 * (1=2~4·2=5~8·3=9~14), 퍼즐 id 유일, 단계 정의 3개.
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.GeoboardData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

/* ── 못 격자 6×6 ── */
if (D.GRID !== 6) err('못 격자는 6×6 이어야 함 — GRID=' + D.GRID);
if (D.pegCount !== 36) err('못 개수는 36개여야 함 — ' + D.pegCount);
if (D.pegIndex(2, 3) !== 3 * D.GRID + 2) err('pegIndex 계산 오류');
const back = D.pegOf(D.pegIndex(4, 5));
if (back[0] !== 4 || back[1] !== 5) err('pegOf/pegIndex 왕복 불일치');

/* ── 고무줄 색 5종 ── */
const cids = D.COLOR_IDS;
if (!Array.isArray(cids) || cids.length !== 5) err('고무줄 색은 5종이어야 함 — ' + (cids ? cids.length : 0));
cids.forEach(id => {
  const c = D.COLORS[id];
  const tag = '색 ' + id;
  if (!c) { err(tag + ': 정의 없음'); return; }
  if (!D.hasColor(id)) err(tag + ': hasColor 실패');
  if (!c.name || !c.say) err(tag + ': 이름/읽기 누락');
  ['hex', 'lt', 'dk'].forEach(k => { if (!/^#[0-9A-Fa-f]{6}$/.test(c[k] || '')) err(tag + ': ' + k + ' 색값 오류 — ' + c[k]); });
});
if (!D.hasColor('red') || D.hasColor('nope')) err('hasColor 판정 오류');
const swatch = D.bandSwatchSVG('red', 'u1');
if (typeof swatch !== 'string' || swatch.indexOf('<svg') < 0 || swatch.indexOf('</svg>') < 0) err('bandSwatchSVG: SVG 문자열 오류');
if (D.bandSwatchSVG('red', 'uidA') === D.bandSwatchSVG('red', 'uidB')) err('bandSwatchSVG: uid 가 반영되지 않음(그라데이션 id 충돌 위험)');

/* ── 퍼즐 30개, 단계별 10개 ── */
if (!Array.isArray(D.PUZZLES) || D.PUZZLES.length !== 30) err('퍼즐이 30개여야 함 — ' + (D.PUZZLES ? D.PUZZLES.length : 0));
const RANGE = { 1: [2, 4], 2: [5, 8], 3: [9, 14] };
const perStage = { 1: 0, 2: 0, 3: 0 };
const seenIds = new Set();
const inGrid = (pt) => Array.isArray(pt) && pt.length === 2 &&
  Number.isInteger(pt[0]) && Number.isInteger(pt[1]) &&
  pt[0] >= 0 && pt[0] < D.GRID && pt[1] >= 0 && pt[1] < D.GRID;
const sameEndpoints = (a, b) => {
  const eq = (p, q) => p[0] === q[0] && p[1] === q[1];
  return (eq(a.from, b.from) && eq(a.to, b.to)) || (eq(a.from, b.to) && eq(a.to, b.from));
};

(D.PUZZLES || []).forEach(pz => {
  const tag = '퍼즐 ' + (pz.id || '?');
  if (!pz.id || seenIds.has(pz.id)) err(tag + ': id 누락/중복');
  seenIds.add(pz.id);
  if (![1, 2, 3].includes(pz.stage)) { err(tag + ': 단계 오류 — ' + pz.stage); return; }
  perStage[pz.stage]++;
  if (!Array.isArray(pz.segments) || !pz.segments.length) { err(tag + ': segments 없음'); return; }

  // 세그먼트 수 범위(단계별)
  const [lo, hi] = RANGE[pz.stage];
  if (pz.segments.length < lo || pz.segments.length > hi) {
    err(tag + ': 단계 ' + pz.stage + ' 세그먼트 수는 ' + lo + '~' + hi + ' — ' + pz.segments.length);
  }

  // 세그먼트 endpoint 범위 · 자기 자신을 잇는 0길이 세그먼트 금지 · 색 유효 · 중복 금지
  pz.segments.forEach((s, i) => {
    const stag = tag + ' 세그먼트 ' + i;
    if (!s || !inGrid(s.from) || !inGrid(s.to)) { err(stag + ': endpoint 격자 범위(0~' + (D.GRID - 1) + ') 오류'); return; }
    if (s.from[0] === s.to[0] && s.from[1] === s.to[1]) err(stag + ': 시작/끝 못이 같음(길이 0)');
    if (!D.hasColor(s.color)) err(stag + ': 없는 색 — ' + s.color);
  });
  for (let i = 0; i < pz.segments.length; i++) {
    for (let j = i + 1; j < pz.segments.length; j++) {
      if (sameEndpoints(pz.segments[i], pz.segments[j])) err(tag + ': 세그먼트 ' + i + '·' + j + ' 가 완전히 같은 자리(중복)');
    }
  }

  // sameSeg 계약 확인(순서 무관 매칭)
  const s0 = pz.segments[0];
  if (!D.sameSeg(s0, s0.from, s0.to) || !D.sameSeg(s0, s0.to, s0.from)) err(tag + ': sameSeg 판정 오류');
});
[1, 2, 3].forEach(st => { if (perStage[st] !== 10) err('단계 ' + st + ' 퍼즐이 10개여야 함 — ' + perStage[st]); });

/* ── 단계 정의 3개 ── */
if (!Array.isArray(D.LEVELS) || D.LEVELS.length !== 3) err('단계 정의가 3개여야 함');
(D.LEVELS || []).forEach(lv => {
  if (!lv.name || !lv.desc || !lv.cls) err('단계 ' + lv.id + ': 이름/설명/클래스 누락');
  if (!D.levelDef(lv.id)) err('단계 ' + lv.id + ': levelDef 조회 실패');
  if (D.puzzlesOf(lv.id).length !== 10) err('단계 ' + lv.id + ': puzzlesOf 가 10개가 아님');
});

if (!Array.isArray(D.praises) || !D.praises.length) err('칭찬 문구가 없음');

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터 검증 통과 — 색 ' + cids.length + '종, 못 ' + D.pegCount +
  '개(6×6), 퍼즐 ' + D.PUZZLES.length + '개(단계별 10), 단계 ' + D.LEVELS.length + '개');
