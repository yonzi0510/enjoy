/* 데이터 검증 — node tubes/tools/validate-data.js
 * 색 구슬 6종(id·이름·읽기·색·SVG)과 퍼즐 30개(단계별 10, 관 수 2/3/4, 길이 3/4/5,
 * 색 유효, 퍼즐 유일)를 정적 검사한다.
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.TubesData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

/* ── 색 구슬: 6종, id·이름·읽기·색·SVG 계약 ── */
const NEED = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
if (D.COLOR_IDS.length !== 6) err('색 구슬은 정확히 6종이어야 함 — ' + D.COLOR_IDS.length);
NEED.forEach(id => { if (!D.has(id)) err('색 누락 — ' + id); });
D.COLOR_IDS.forEach(id => {
  const c = D.meta(id);
  const tag = '색 ' + id;
  if (!c) { err(tag + ': 정의 없음'); return; }
  if (!c.name || !c.say) err(tag + ': 이름/읽기 누락');
  ['light', 'base', 'dark'].forEach(k => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(c[k] || '')) err(tag + ': ' + k + ' 색값 오류 — ' + c[k]);
  });
  const svg = D.beadDraw(id, 't' + id);
  if (typeof svg !== 'string' || svg.indexOf('<svg') < 0 || svg.indexOf('</svg>') < 0) err(tag + ': 구슬 SVG 오류');
});
// 시험관 유리 SVG
const g = D.glassDraw('gg');
if (typeof g !== 'string' || g.indexOf('<svg') < 0 || g.indexOf('</svg>') < 0) err('시험관 유리 SVG 오류');
// uid 반영(그라데이션 id 충돌 방지)
D.COLOR_IDS.forEach(id => {
  const a = D.beadDraw(id, 'uidA'), b = D.beadDraw(id, 'uidB');
  if (a === b) err('색 ' + id + ': uid 가 SVG 에 반영되지 않음(id 충돌 위험)');
});

/* ── 퍼즐: 30개, 단계별 10개 ── */
if (!Array.isArray(D.PUZZLES) || D.PUZZLES.length !== 30) {
  err('퍼즐이 30개여야 함 — ' + (D.PUZZLES ? D.PUZZLES.length : 0));
}
const TUBES = { 1: 2, 2: 3, 3: 4 }; // 단계별 관 수
const LEN = { 1: 3, 2: 4, 3: 5 };   // 단계별 길이
const perLevel = { 1: 0, 2: 0, 3: 0 };
const seenIds = new Set();
const seenSeq = new Set();
(D.PUZZLES || []).forEach(pz => {
  const tag = '퍼즐 ' + (pz.id || '?');
  if (!pz.id || seenIds.has(pz.id)) err(tag + ': id 누락/중복');
  seenIds.add(pz.id);
  if (![1, 2, 3].includes(pz.level)) { err(tag + ': 단계 오류 — ' + pz.level); return; }
  perLevel[pz.level]++;
  if (!Array.isArray(pz.tubes) || pz.tubes.length !== TUBES[pz.level]) {
    err(tag + ': 단계 ' + pz.level + ' 는 관 ' + TUBES[pz.level] + '개여야 함 — ' + (pz.tubes ? pz.tubes.length : 0));
    return;
  }
  pz.tubes.forEach((t, ti) => {
    if (!Array.isArray(t) || t.length !== LEN[pz.level]) {
      err(tag + ': ' + (ti + 1) + '번 관 길이는 ' + LEN[pz.level] + '이어야 함 — ' + (t ? t.length : 0));
      return;
    }
    t.forEach(cid => { if (!D.has(cid)) err(tag + ': 없는 색 — ' + cid); });
  });
  // 전체 배치 유일성
  const seq = pz.tubes.map(t => t.join('')).join('|');
  if (seenSeq.has(seq)) err(tag + ': 같은 배치의 퍼즐이 중복됨 — ' + seq);
  seenSeq.add(seq);
});
[1, 2, 3].forEach(lv => { if (perLevel[lv] !== 10) err('단계 ' + lv + ' 퍼즐이 10개여야 함 — ' + perLevel[lv]); });

/* ── 단계 정의 3개 ── */
if (!Array.isArray(D.LEVELS) || D.LEVELS.length !== 3) err('단계 정의가 3개여야 함');
(D.LEVELS || []).forEach(lv => {
  if (!lv.name || !lv.desc || !lv.cls) err('단계 ' + lv.id + ': 이름/설명/클래스 누락');
  if (lv.tubes !== TUBES[lv.id]) err('단계 ' + lv.id + ': 관 수 정의 오류 — ' + lv.tubes);
  if (lv.len !== LEN[lv.id]) err('단계 ' + lv.id + ': 길이 정의 오류 — ' + lv.len);
});

if (!Array.isArray(D.praises) || !D.praises.length) err('칭찬 문구가 없음');

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터 검증 통과 — 색 ' + D.COLOR_IDS.length + '종, 퍼즐 ' + D.PUZZLES.length +
  '개(단계별 10 · 관 2/3/4 · 길이 3/4/5), 단계 ' + D.LEVELS.length + '개');
