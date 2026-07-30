/* 데이터 검증 — node donut/tools/validate-data.js
 * 도넛 세트(9종+·id·이름·읽기·SVG·uid 반영)와 퍼즐 30개(단계별 10, 자리 수 4/6/9,
 * 목표 도넛 유효·퍼즐 안 유일·트레이에 정답 포함, 퍼즐 id 유일, 단계 안 자리배열 유일)를
 * 정적 검사한다. node 에서 문자열만 다루므로 안전하다.
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.DonutData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

/* ── 도넛 세트: 9종 이상, id·이름·읽기·draw(SVG) 계약 ── */
if (!Array.isArray(D.ID_LIST) || D.ID_LIST.length < 9) {
  err('도넛은 9종 이상이어야 함 — ' + (D.ID_LIST ? D.ID_LIST.length : 0));
}
D.ID_LIST.forEach(id => {
  const dn = D.meta(id);
  const tag = '도넛 ' + id;
  if (!dn) { err(tag + ': 정의 없음'); return; }
  if (!dn.name || !dn.say) err(tag + ': 이름/읽기 누락');
  if (typeof dn.draw !== 'function') { err(tag + ': draw 함수 없음'); return; }
  const svg = dn.draw('t' + id);
  if (typeof svg !== 'string' || svg.indexOf('<svg') < 0 || svg.indexOf('</svg>') < 0) err(tag + ': SVG 문자열 오류');
});
// SVG 그라데이션 id 충돌 방지 — 같은 도넛을 다른 uid 로 그리면 서로 다른 id 를 써야 한다
D.ID_LIST.forEach(id => {
  const a = D.meta(id).draw('uidA'), b = D.meta(id).draw('uidB');
  if (a === b && /id="/.test(a)) err('도넛 ' + id + ': uid 가 SVG 에 반영되지 않음(id 충돌 위험)');
});

/* ── 단계 정의 3개 (자리 수 4/6/9) ── */
if (!Array.isArray(D.LEVELS) || D.LEVELS.length !== 3) err('단계 정의가 3개여야 함');
const COUNT = { 1: 4, 2: 6, 3: 9 };
(D.LEVELS || []).forEach(lv => {
  if (!lv.name || !lv.desc || !lv.cls) err('단계 ' + lv.id + ': 이름/설명/클래스 누락');
  if (typeof lv.cols !== 'number' || lv.cols < 1) err('단계 ' + lv.id + ': cols 오류');
  if (lv.count !== COUNT[lv.id]) err('단계 ' + lv.id + ': 자리 수는 ' + COUNT[lv.id] + ' 이어야 함 — ' + lv.count);
});

/* ── 퍼즐: 30개, 단계별 10개 ── */
if (!Array.isArray(D.PUZZLES) || D.PUZZLES.length !== 30) {
  err('퍼즐이 30개여야 함 — ' + (D.PUZZLES ? D.PUZZLES.length : 0));
}
const perLevel = { 1: 0, 2: 0, 3: 0 };
const seenIds = new Set();
const seenSeqByLevel = { 1: new Set(), 2: new Set(), 3: new Set() };
(D.PUZZLES || []).forEach(pz => {
  const tag = '퍼즐 ' + (pz.id || '?');
  if (!pz.id || seenIds.has(pz.id)) err(tag + ': id 누락/중복');
  seenIds.add(pz.id);
  if (![1, 2, 3].includes(pz.level)) { err(tag + ': 단계 오류 — ' + pz.level); return; }
  perLevel[pz.level]++;
  const slots = pz.slots;
  if (!Array.isArray(slots) || slots.length !== COUNT[pz.level]) {
    err(tag + ': 단계 ' + pz.level + ' 는 자리 ' + COUNT[pz.level] + '개여야 함 — ' + (slots ? slots.length : 0));
    return;
  }
  // 목표 도넛 유효 + 퍼즐 안에서 서로 다름(자리·도넛 1:1)
  const set = new Set();
  slots.forEach(id => {
    if (!D.has(id)) err(tag + ': 없는 도넛 — ' + id);
    if (set.has(id)) err(tag + ': 같은 퍼즐에 도넛 중복 — ' + id);
    set.add(id);
  });
  // 트레이(흩어 놓을 도넛)에 모든 정답이 들어 있어야 한다
  const tray = D.trayOf(pz);
  slots.forEach(id => { if (tray.indexOf(id) < 0) err(tag + ': 트레이에 정답 도넛 누락 — ' + id); });
  // 단계 안에서 자리 배열이 겹치지 않는다
  const seq = slots.join('>');
  if (seenSeqByLevel[pz.level].has(seq)) err(tag + ': 단계 ' + pz.level + ' 안에 같은 자리배열 중복 — ' + seq);
  seenSeqByLevel[pz.level].add(seq);
});
[1, 2, 3].forEach(lv => { if (perLevel[lv] !== 10) err('단계 ' + lv + ' 퍼즐이 10개여야 함 — ' + perLevel[lv]); });

if (!Array.isArray(D.praises) || !D.praises.length) err('칭찬 문구가 없음');

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터 검증 통과 — 도넛 ' + D.ID_LIST.length +
  '종, 퍼즐 ' + D.PUZZLES.length + '개(단계별 10), 단계 ' + D.LEVELS.length + '개');
