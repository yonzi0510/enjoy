/* 데이터 검증 — node burger/tools/validate-data.js
 * 재료 계약(빵 2 + 속재료 · id·이름·SVG) 과 미션 30개(단계별 10, 순서 유효, 빵 시작/끝,
 * 층 수 규칙, 속재료 중복 없음, 재료 id 유효, 미션 id 유일)를 정적 검사한다.
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.BurgerData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

/* ── 재료: 빵 2종 + 속재료, id·이름·역할·SVG 계약 ── */
const roles = { bottom: 0, top: 0, fill: 0 };
D.ID_LIST.forEach(id => {
  const ing = D.meta(id);
  const tag = '재료 ' + id;
  if (!ing) { err(tag + ': 정의 없음'); return; }
  if (!ing.name || !ing.say) err(tag + ': 이름/읽기 누락');
  if (!['bottom', 'top', 'fill'].includes(ing.role)) err(tag + ': 역할 오류 — ' + ing.role);
  else roles[ing.role]++;
  if (typeof ing.draw !== 'function') { err(tag + ': draw 함수 없음'); return; }
  const svg = ing.draw('t' + id);
  if (typeof svg !== 'string' || svg.indexOf('<svg') < 0 || svg.indexOf('</svg>') < 0) err(tag + ': SVG 문자열 오류');
  if (typeof ing.h !== 'number' || ing.h <= 0) err(tag + ': 높이(h) 오류');
});
if (roles.bottom !== 1) err('아래빵(bottom) 재료는 정확히 1종이어야 함 — ' + roles.bottom);
if (roles.top !== 1) err('윗빵(top) 재료는 정확히 1종이어야 함 — ' + roles.top);
if (roles.fill < 8) err('속재료(fill)가 8종 이상이어야 함 — ' + roles.fill);
// SVG 그라데이션 id 충돌 방지 — 같은 재료를 다른 uid 로 그리면 서로 다른 id 를 써야 한다
D.ID_LIST.forEach(id => {
  const a = D.meta(id).draw('uidA'), b = D.meta(id).draw('uidB');
  if (a === b && /id="/.test(a)) err('재료 ' + id + ': uid 가 SVG 에 반영되지 않음(id 충돌 위험)');
});

/* ── 미션: 30개, 단계별 10개 ── */
if (!Array.isArray(D.MISSIONS) || D.MISSIONS.length !== 30) {
  err('미션이 30개여야 함 — ' + (D.MISSIONS ? D.MISSIONS.length : 0));
}
const LEN = { 1: 3, 2: 5, 3: 7 }; // 단계별 층 수
const perLevel = { 1: 0, 2: 0, 3: 0 };
const seenIds = new Set();
const seenSeq = new Set();
(D.MISSIONS || []).forEach(ms => {
  const tag = '미션 ' + (ms.id || '?');
  if (!ms.id || seenIds.has(ms.id)) err(tag + ': id 누락/중복');
  seenIds.add(ms.id);
  if (![1, 2, 3].includes(ms.level)) { err(tag + ': 단계 오류 — ' + ms.level); return; }
  perLevel[ms.level]++;
  const L = ms.layers;
  if (!Array.isArray(L) || L.length !== LEN[ms.level]) {
    err(tag + ': 단계 ' + ms.level + ' 는 ' + LEN[ms.level] + '층이어야 함 — ' + (L ? L.length : 0));
    return;
  }
  // 빵 시작/끝 규칙
  if (D.meta(L[0]) === undefined || D.meta(L[0]).role !== 'bottom') err(tag + ': 맨 아래는 아래빵이어야 함 — ' + L[0]);
  if (D.meta(L[L.length - 1]) === undefined || D.meta(L[L.length - 1]).role !== 'top') err(tag + ': 맨 위는 윗빵이어야 함 — ' + L[L.length - 1]);
  // 가운데는 속재료, 중복 없음, 유효 id
  const mids = L.slice(1, -1);
  const midSet = new Set();
  mids.forEach(id => {
    if (!D.has(id)) err(tag + ': 없는 재료 — ' + id);
    else if (D.meta(id).role !== 'fill') err(tag + ': 가운데엔 속재료만 — ' + id);
    if (midSet.has(id)) err(tag + ': 속재료 중복 — ' + id);
    midSet.add(id);
  });
  // 트레이가 채워지려면 방해 재료 여지가 있어야 한다 (속재료 종류가 미션 재료보다 많다)
  const seq = L.join('>');
  if (seenSeq.has(seq)) err(tag + ': 같은 순서의 미션이 중복됨 — ' + seq);
  seenSeq.add(seq);
});
[1, 2, 3].forEach(lv => { if (perLevel[lv] !== 10) err('단계 ' + lv + ' 미션이 10개여야 함 — ' + perLevel[lv]); });

/* ── 단계 정의 3개 ── */
if (!Array.isArray(D.LEVELS) || D.LEVELS.length !== 3) err('단계 정의가 3개여야 함');
(D.LEVELS || []).forEach(lv => {
  if (!lv.name || !lv.desc || !lv.cls) err('단계 ' + lv.id + ': 이름/설명/클래스 누락');
  if (typeof lv.extra !== 'number' || lv.extra < 0) err('단계 ' + lv.id + ': 방해 재료 수(extra) 오류');
  // 방해 재료를 뽑을 여유가 있어야 한다 (미션에 안 쓰인 속재료가 extra 개 이상 존재)
  D.missionsOf(lv.id).forEach(ms => {
    const unused = D.FILLS.filter(id => ms.layers.indexOf(id) < 0);
    if (unused.length < lv.extra) err('미션 ' + ms.id + ': 방해 재료 부족 — 남은 속재료 ' + unused.length + ' < ' + lv.extra);
  });
});

if (!Array.isArray(D.praises) || !D.praises.length) err('칭찬 문구가 없음');

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터 검증 통과 — 재료 ' + D.ID_LIST.length + '종(속재료 ' + D.FILLS.length +
  '), 미션 ' + D.MISSIONS.length + '개(단계별 10), 단계 ' + D.LEVELS.length + '개');
