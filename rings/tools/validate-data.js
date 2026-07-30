/* 데이터 검증 — node rings/tools/validate-data.js
 * 색 고리 세트 · 손(손가락 5개) · 퍼즐 30개(단계별 10)의 정적 계약을 검사한다:
 * 색 유효(6종·hex/lt/dk/say), 손가락 index 0~4, slots 2개·zone 4값,
 * 단계별 고리 수(1=2~3·2=4~5·3=5~7), 손가락당 최대 2개, 단계3만 겹침(1·2는 겹침 없음),
 * 퍼즐 id 유일·배치 유일, SVG 문자열·uid 반영, 단계 정의 3개.
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.RingsData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

/* ── 손가락 5개 ── */
if (!Array.isArray(D.FINGERS) || D.FINGERS.length !== 5) err('손가락은 5개여야 함 — ' + (D.FINGERS ? D.FINGERS.length : 0));
D.FINGERS.forEach((f, i) => {
  const tag = '손가락 ' + i;
  if (f.i !== i) err(tag + ': index 불일치 — ' + f.i);
  if (!f.name || !f.say) err(tag + ': 이름/읽기 누락');
  if (!Array.isArray(f.slots) || f.slots.length !== 2) err(tag + ': slots 는 [밑동,손끝] 2개여야 함');
  else f.slots.forEach((s, k) => { if (!Array.isArray(s) || s.length !== 2 || s.some(n => typeof n !== 'number')) err(tag + ': slot ' + k + ' 좌표 오류'); });
  if (!Array.isArray(f.zone) || f.zone.length !== 4 || f.zone.some(n => typeof n !== 'number')) err(tag + ': zone 은 [x,y,w,h] 숫자 4개여야 함');
});
// 손 SVG 계약
['handSVG'].forEach(fn => {
  const svg = D[fn]('u1');
  if (typeof svg !== 'string' || svg.indexOf('<svg') < 0 || svg.indexOf('</svg>') < 0) err(fn + ': SVG 문자열 오류');
  if (D[fn]('uidA') === D[fn]('uidB')) err(fn + ': uid 가 SVG 에 반영되지 않음(그라데이션 id 충돌 위험)');
});

/* ── 색 고리 6종 ── */
const cids = D.COLOR_IDS;
if (!Array.isArray(cids) || cids.length !== 6) err('색 고리는 6종이어야 함 — ' + (cids ? cids.length : 0));
cids.forEach(id => {
  const c = D.COLORS[id];
  const tag = '색 ' + id;
  if (!c) { err(tag + ': 정의 없음'); return; }
  if (!D.hasColor(id)) err(tag + ': hasColor 실패');
  if (!c.name || !c.say) err(tag + ': 이름/읽기 누락');
  ['hex', 'lt', 'dk'].forEach(k => { if (!/^#[0-9A-Fa-f]{6}$/.test(c[k] || '')) err(tag + ': ' + k + ' 색값 오류 — ' + c[k]); });
  const svg = D.ringSVG(id, 'u');
  if (typeof svg !== 'string' || svg.indexOf('<svg') < 0) err(tag + ': ringSVG 오류');
  if (D.ringSVG(id, 'a') === D.ringSVG(id, 'b')) err(tag + ': ringSVG uid 미반영');
});
if (D.ghostSVG().indexOf('<svg') < 0) err('ghostSVG: SVG 오류');
if (!D.hasColor('red') || D.hasColor('nope')) err('hasColor 판정 오류');

/* ── 퍼즐 30개, 단계별 10개 ── */
if (!Array.isArray(D.PUZZLES) || D.PUZZLES.length !== 30) err('퍼즐이 30개여야 함 — ' + (D.PUZZLES ? D.PUZZLES.length : 0));
const RANGE = { 1: [2, 3], 2: [4, 5], 3: [5, 7] };
const perLevel = { 1: 0, 2: 0, 3: 0 };
const seenIds = new Set();
const seenSeq = new Set();
(D.PUZZLES || []).forEach(pz => {
  const tag = '퍼즐 ' + (pz.id || '?');
  if (!pz.id || seenIds.has(pz.id)) err(tag + ': id 누락/중복');
  seenIds.add(pz.id);
  if (![1, 2, 3].includes(pz.level)) { err(tag + ': 단계 오류 — ' + pz.level); return; }
  perLevel[pz.level]++;
  if (!Array.isArray(pz.rings) || !pz.rings.length) { err(tag + ': rings 없음'); return; }
  // 고리 수 범위
  const [lo, hi] = RANGE[pz.level];
  if (pz.rings.length < lo || pz.rings.length > hi) err(tag + ': 단계 ' + pz.level + ' 고리 수는 ' + lo + '~' + hi + ' — ' + pz.rings.length);
  // 각 고리: [손가락 0~4, 색 유효]
  const perFinger = {};
  pz.rings.forEach((r, k) => {
    if (!Array.isArray(r) || r.length !== 2) { err(tag + ': 고리 ' + k + ' 형식 오류'); return; }
    const [fi, cid] = r;
    if (!Number.isInteger(fi) || fi < 0 || fi > 4) err(tag + ': 손가락 index 0~4 아님 — ' + fi);
    if (!D.hasColor(cid)) err(tag + ': 없는 색 — ' + cid);
    perFinger[fi] = (perFinger[fi] || 0) + 1;
  });
  // 손가락당 최대 2개(slots 2칸)
  Object.keys(perFinger).forEach(fi => { if (perFinger[fi] > 2) err(tag + ': 한 손가락에 3개 이상 — 손가락 ' + fi); });
  // 겹침 규칙: 단계1·2 는 손가락당 1개(겹침 없음), 단계3 은 겹침 있어야 함
  const stacked = D.isStacked(pz);
  const maxPer = Math.max(...Object.values(perFinger));
  if (pz.level < 3) {
    if (stacked || maxPer > 1) err(tag + ': 단계 ' + pz.level + ' 는 손가락당 1개여야 함(겹침 금지)');
  } else {
    if (!stacked) err(tag + ': 단계 3 은 일부 손가락에 2개 겹쳐 끼워야 함');
  }
  // 배치 유일성 (같은 퍼즐 배치 중복 금지)
  const seq = pz.level + ':' + pz.rings.map(r => r.join('-')).join('_');
  if (seenSeq.has(seq)) err(tag + ': 같은 배치의 퍼즐 중복 — ' + seq);
  seenSeq.add(seq);
  // steps/target 계약 — 채우기 순서가 고리 수와 일치
  if (D.steps(pz).length !== pz.rings.length) err(tag + ': steps 길이 불일치');
});
[1, 2, 3].forEach(lv => { if (perLevel[lv] !== 10) err('단계 ' + lv + ' 퍼즐이 10개여야 함 — ' + perLevel[lv]); });

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
console.log('✅ 데이터 검증 통과 — 색 ' + cids.length + '종, 손가락 ' + D.FINGERS.length +
  ', 퍼즐 ' + D.PUZZLES.length + '개(단계별 10), 단계 ' + D.LEVELS.length + '개');
