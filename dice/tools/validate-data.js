/* 데이터 검증 — node dice/tools/validate-data.js
 * 동물 세트(8종, id·이름·읽기·SVG)와 라운드 30개(단계별 10, 주사위 수 6/8/9,
 * 찾을 동물 수 1/2/2~3, 정답=카드 동물이 실제 주사위에 존재, 라운드 id 유일)를 정적 검사한다.
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.DiceData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

/* ── 동물: 8종, id·이름·읽기·SVG 계약 ── */
if (D.ID_LIST.length < 8) err('동물이 8종 이상이어야 함 — ' + D.ID_LIST.length);
D.ID_LIST.forEach(id => {
  const a = D.meta(id);
  const tag = '동물 ' + id;
  if (!a) { err(tag + ': 정의 없음'); return; }
  if (!a.name || !a.say) err(tag + ': 이름/읽기 누락');
  if (typeof a.draw !== 'function') { err(tag + ': draw 함수 없음'); return; }
  const svg = a.draw('t' + id);
  if (typeof svg !== 'string' || svg.indexOf('<svg') < 0 || svg.indexOf('</svg>') < 0) err(tag + ': SVG 문자열 오류');
});
// SVG 그라데이션 id 충돌 방지 — 같은 동물을 다른 uid 로 그리면 서로 다른 id 를 써야 한다
D.ID_LIST.forEach(id => {
  const a = D.meta(id).draw('uidA'), b = D.meta(id).draw('uidB');
  if (a === b && /id="/.test(a)) err('동물 ' + id + ': uid 가 SVG 에 반영되지 않음(id 충돌 위험)');
});

/* ── 라운드: 30개, 단계별 10개 ── */
if (!Array.isArray(D.ROUNDS) || D.ROUNDS.length !== 30) {
  err('라운드가 30개여야 함 — ' + (D.ROUNDS ? D.ROUNDS.length : 0));
}
const DICE = { 1: 6, 2: 8, 3: 9 };  // 단계별 주사위 수
const FIND = { 1: [1, 1], 2: [2, 2], 3: [2, 3] };  // 단계별 찾을 동물 수 [최소,최대]
const perLevel = { 1: 0, 2: 0, 3: 0 };
const seenIds = new Set();
const seenSig = new Set();
(D.ROUNDS || []).forEach(rd => {
  const tag = '라운드 ' + (rd.id || '?');
  if (!rd.id || seenIds.has(rd.id)) err(tag + ': id 누락/중복');
  seenIds.add(rd.id);
  if (![1, 2, 3].includes(rd.level)) { err(tag + ': 단계 오류 — ' + rd.level); return; }
  perLevel[rd.level]++;

  // 주사위 수
  if (!Array.isArray(rd.dice) || rd.dice.length !== DICE[rd.level]) {
    err(tag + ': 단계 ' + rd.level + ' 는 주사위 ' + DICE[rd.level] + '개여야 함 — ' + (rd.dice ? rd.dice.length : 0));
  }
  // 주사위 얼굴이 유효한 동물인가
  (rd.dice || []).forEach(aid => { if (!D.has(aid)) err(tag + ': 없는 동물 주사위 — ' + aid); });

  // 찾을 동물 수
  const [lo, hi] = FIND[rd.level];
  if (!Array.isArray(rd.find) || rd.find.length < lo || rd.find.length > hi) {
    err(tag + ': 단계 ' + rd.level + ' 찾을 동물 수는 ' + lo + '~' + hi + ' — ' + (rd.find ? rd.find.length : 0));
  }
  // 찾을 동물: 유효 id, 중복 없음, 실제 주사위에 존재(정답 보장)
  const findSet = new Set();
  (rd.find || []).forEach(aid => {
    if (!D.has(aid)) err(tag + ': 없는 찾을 동물 — ' + aid);
    if (findSet.has(aid)) err(tag + ': 찾을 동물 중복 — ' + aid);
    findSet.add(aid);
    if ((rd.dice || []).indexOf(aid) < 0) err(tag + ': 찾을 동물이 주사위에 없음 — ' + aid);
  });
  // 방해 주사위(정답 아님)가 하나라도 있어야 "찾기"가 성립
  const targetIdx = D.targetIndices(rd);
  if (targetIdx.length >= (rd.dice || []).length) err(tag + ': 방해 주사위가 없음(전부 정답)');
  if (targetIdx.length < 1) err(tag + ': 정답 주사위가 없음');

  // 라운드 서명(주사위+찾을동물) 유일성
  const sig = rd.level + '|' + (rd.dice || []).join(',') + '|' + (rd.find || []).join(',');
  if (seenSig.has(sig)) err(tag + ': 같은 구성의 라운드 중복 — ' + sig);
  seenSig.add(sig);
});
[1, 2, 3].forEach(lv => { if (perLevel[lv] !== 10) err('단계 ' + lv + ' 라운드가 10개여야 함 — ' + perLevel[lv]); });

/* ── 단계 정의 3개 ── */
if (!Array.isArray(D.LEVELS) || D.LEVELS.length !== 3) err('단계 정의가 3개여야 함');
(D.LEVELS || []).forEach(lv => {
  if (!lv.name || !lv.desc || !lv.cls) err('단계 ' + lv.id + ': 이름/설명/클래스 누락');
  if (lv.dice !== DICE[lv.id]) err('단계 ' + lv.id + ': 주사위 수(dice) 정의 오류 — ' + lv.dice);
});

if (!Array.isArray(D.praises) || !D.praises.length) err('칭찬 문구가 없음');

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터 검증 통과 — 동물 ' + D.ID_LIST.length + '종, 라운드 ' + D.ROUNDS.length +
  '개(단계별 10), 단계 ' + D.LEVELS.length + '개(주사위 6/8/9)');
