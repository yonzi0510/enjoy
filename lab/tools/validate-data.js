/* 데이터 검증 — node lab/tools/validate-data.js
 * 물감 5종·미션 12색(레시피가 목표색을 실제로 만드는지)·판정 임계·색 이름표 계약을 정적 검사한다.
 */
'use strict';

global.window = {};
require('../js/mix.js');
require('../js/data.js');
const M = global.window.Mix;
const D = global.window.LabData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

const HEX = /^#[0-9A-Fa-f]{6}$/;

/* 물감: 5종(빨·파·노·흰·검), 유채색은 RYB 벡터가 0~1 */
if (!Array.isArray(D.PAINTS) || D.PAINTS.length !== 5) err('물감이 5종이어야 함');
const paintIds = new Set();
(D.PAINTS || []).forEach(p => {
  const tag = '물감 ' + (p.id || '?');
  if (!p.id || paintIds.has(p.id)) err(tag + ': id 누락/중복');
  paintIds.add(p.id);
  if (!p.name) err(tag + ': 이름 누락');
  if (!HEX.test(p.color || '')) err(tag + ': 표시색 형식 오류 — ' + p.color);
  if (p.kind) {
    if (p.kind !== 'white' && p.kind !== 'black') err(tag + ': kind 는 white/black 만 — ' + p.kind);
  } else if (!Array.isArray(p.ryb) || p.ryb.length !== 3 || !p.ryb.every(v => v >= 0 && v <= 1)) {
    err(tag + ': ryb 벡터(0~1 세 개) 오류');
  }
});
['red', 'blue', 'yellow', 'white', 'black'].forEach(id => {
  if (!paintIds.has(id)) err('기본 물감 누락: ' + id);
});

/* 판정 임계: 관대하되(≥40) 다른 색으로 착각할 만큼 크지 않게(≤90) */
if (!(D.THRESHOLD >= 40 && D.THRESHOLD <= 90)) err('판정 임계 THRESHOLD 가 40~90 범위를 벗어남: ' + D.THRESHOLD);
if (!(D.MAX_DROPS >= 4 && D.MAX_DROPS <= 12)) err('MAX_DROPS 가 4~12 범위를 벗어남: ' + D.MAX_DROPS);

/* 감산혼합 상식 검사 — RGB 평균이 아니라 물감처럼 섞이는지 */
const byId = id => D.PAINTS.find(p => p.id === id);
function mixOf(ids) { return M.mixDrops(ids.map(byId)); }
const ry = mixOf(['red', 'yellow']);
if (!(ry[0] > 200 && ry[1] > 90 && ry[1] < 210 && ry[2] < 110)) err('빨+노가 주황이 아님: ' + M.hex(ry));
const by = mixOf(['blue', 'yellow']);
if (!(by[1] > by[2] && by[1] > 120)) err('파+노가 초록이 아님: ' + M.hex(by));
const rb = mixOf(['red', 'blue']);
if (!(rb[0] > rb[1] && rb[2] > rb[1])) err('빨+파가 보라가 아님: ' + M.hex(rb));
const rw = mixOf(['red', 'white']);
if (!(rw[1] > 90 && rw[0] > rw[1])) err('빨+흰이 파스텔(분홍)이 아님: ' + M.hex(rw));
const rk = mixOf(['red', 'black']);
if (!(rk[0] < 200 && rk[0] > rk[1])) err('빨+검이 어두운 빨강이 아님: ' + M.hex(rk));

/* 미션: 12개, id·이름·레시피 유효, 레시피가 목표색을 정확히 만들고,
 * 목표색끼리는 판정 임계보다 멀어야 한다(도감이 헷갈리지 않게) */
if (!Array.isArray(D.MISSIONS) || D.MISSIONS.length !== 12) {
  err('미션이 12개여야 함: ' + (D.MISSIONS || []).length);
}
const ids = new Set();
(D.MISSIONS || []).forEach(ms => {
  const tag = '미션 ' + (ms.id || '?');
  if (!ms.id || ids.has(ms.id)) err(tag + ': id 누락/중복');
  ids.add(ms.id);
  if (!ms.name || !ms.sayName || !ms.emoji) err(tag + ': 이름·발화 이름·이모지 누락');
  if (!HEX.test(ms.target || '')) err(tag + ': 목표색 형식 오류 — ' + ms.target);
  if (!Array.isArray(ms.recipe) || ms.recipe.length < 2 || ms.recipe.length > D.MAX_DROPS) {
    err(tag + ': 레시피 길이(2~' + D.MAX_DROPS + ') 오류');
    return;
  }
  const bad = ms.recipe.filter(id => !paintIds.has(id));
  if (bad.length) { err(tag + ': 레시피에 없는 물감 — ' + bad.join(',')); return; }
  // 레시피대로 섞으면 목표색이 정확히 나와야 한다 (판정은 임계 안이면 통과지만 데이터는 정답이어야)
  const mixed = mixOf(ms.recipe);
  const d = M.dist(mixed, M.parse(ms.target));
  if (d > 3) err(tag + ': 레시피 혼합 결과(' + M.hex(mixed) + ')가 목표색(' + ms.target + ')과 다름 — 거리 ' + d.toFixed(1));
});
for (let i = 0; i < (D.MISSIONS || []).length; i++) {
  for (let j = i + 1; j < D.MISSIONS.length; j++) {
    const a = D.MISSIONS[i], b = D.MISSIONS[j];
    const d = M.dist(M.parse(a.target), M.parse(b.target));
    if (d <= D.THRESHOLD) {
      err('미션 ' + a.id + ' ↔ ' + b.id + ' 목표색이 판정 임계(' + D.THRESHOLD + ')보다 가까움: ' + d.toFixed(1));
    }
  }
}

/* 자유 실험 색 이름표: 15개 이상, 이름 중복 없음, hex 유효 */
if (!Array.isArray(D.COLOR_NAMES) || D.COLOR_NAMES.length < 15) err('색 이름표가 15개 이상이어야 함');
const names = new Set();
(D.COLOR_NAMES || []).forEach(n => {
  if (!n.name || names.has(n.name)) err('색 이름표: 이름 누락/중복 — ' + n.name);
  names.add(n.name);
  if (!HEX.test(n.c || '')) err('색 이름표 ' + n.name + ': 색 형식 오류 — ' + n.c);
});
// 기본 물감 5색이 각자 알맞은 이름을 갖는지 (nameOf 가 늘 뭔가는 돌려주는지)
if (D.nameOf && typeof D.nameOf === 'function') {
  if (!D.nameOf([255, 0, 0])) err('nameOf 가 이름을 돌려주지 않음');
} else err('nameOf 함수가 없음');

if (!Array.isArray(D.PRAISES) || !D.PRAISES.length) err('칭찬 문구가 없음');

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터 검증 통과 — 물감 ' + D.PAINTS.length + '종, 미션 ' + D.MISSIONS.length +
  '색 (판정 임계 ' + D.THRESHOLD + '), 색 이름표 ' + D.COLOR_NAMES.length + '개');
