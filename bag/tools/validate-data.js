/* 데이터 검증 — node bag/tools/validate-data.js
 * 숟가락(물건 2~6개·위치 판 안·각도·id 유일·단계별 개수), 빨대(슬라이더 3~5개·목표 0~1·색 유일),
 * 두 놀이 각각 30개 이상인지 정적 검사한다.
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.BagData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

function uniqueIds(list, label) {
  const seen = new Set();
  list.forEach(p => {
    if (seen.has(p.id)) err(label + ' id 중복: ' + p.id);
    seen.add(p.id);
    if (!p.name || !p.emoji) err(label + ' ' + p.id + ': 이름·이모지 필요');
    if (!(p.level >= 1 && p.level <= 3)) err(label + ' ' + p.id + ': 단계(level)는 1~3 (' + p.level + ')');
  });
}
// 단계별 도안 수가 기대치와 같은지
function levelCounts(list, label, want) {
  [1, 2, 3].forEach(lv => {
    const n = list.filter(p => p.level === lv).length;
    if (n !== want) err(label + ' ' + lv + '단계 도안 수가 ' + want + '이 아님 (' + n + ')');
  });
}

/* ─────────── 숟가락 ─────────── */
const KNOWN_TYPES = D.SPOON_TYPES;
if (!Array.isArray(D.spoons) || D.spoons.length < 30) err('숟가락 도안이 30개 미만: ' + (D.spoons || []).length);
uniqueIds(D.spoons, '숟가락');
levelCounts(D.spoons, '숟가락', 10);
const OBJ_BY_LEVEL = { 1: 3, 2: 4, 3: 5 };
D.spoons.forEach(pz => {
  if (![0, 45, 90].includes(pz.rotStep)) err('숟가락 ' + pz.id + ': rotStep은 0·45·90 (' + pz.rotStep + ')');
  if (!Array.isArray(pz.objs) || pz.objs.length < 2 || pz.objs.length > 6) {
    err('숟가락 ' + pz.id + ': 물건은 2~6개 (' + (pz.objs || []).length + ')');
  }
  if (pz.objs.length !== OBJ_BY_LEVEL[pz.level]) {
    err('숟가락 ' + pz.id + ': ' + pz.level + '단계 물건 수는 ' + OBJ_BY_LEVEL[pz.level] + '개여야 함 (' + pz.objs.length + ')');
  }
  pz.objs.forEach((o, i) => {
    if (!KNOWN_TYPES.includes(o.type)) err('숟가락 ' + pz.id + ' 물건 ' + i + ': 모르는 종류 ' + o.type);
    if (!(o.x >= 5 && o.x <= 95) || !(o.y >= 5 && o.y <= 95)) {
      err('숟가락 ' + pz.id + ' 물건 ' + i + ': 판(5~95) 밖 (' + o.x + ',' + o.y + ')');
    }
    if (!(o.rot >= 0 && o.rot < 360)) err('숟가락 ' + pz.id + ' 물건 ' + i + ': 각도는 0~359 (' + o.rot + ')');
    // 각도는 단계의 회전 단위(rotStep)로 갈 수 있어야 함
    if (pz.rotStep === 0) { if (o.rot !== 0) err('숟가락 ' + pz.id + ' 물건 ' + i + ': 회전 없는 단계인데 각도 ' + o.rot); }
    else if (o.rot % pz.rotStep !== 0) err('숟가락 ' + pz.id + ' 물건 ' + i + ': 각도가 ' + pz.rotStep + '의 배수가 아님 (' + o.rot + ')');
  });
});

/* ─────────── 빨대 ─────────── */
if (!Array.isArray(D.straws) || D.straws.length < 30) err('빨대 도안이 30개 미만: ' + (D.straws || []).length);
uniqueIds(D.straws, '빨대');
levelCounts(D.straws, '빨대', 10);
const SLIDER_BY_LEVEL = { 1: 3, 2: 5, 3: 5 };
D.straws.forEach(pz => {
  if (!Array.isArray(pz.sliders) || pz.sliders.length < 3 || pz.sliders.length > 5) {
    err('빨대 ' + pz.id + ': 슬라이더는 3~5개 (' + (pz.sliders || []).length + ')');
  }
  if (pz.sliders.length !== SLIDER_BY_LEVEL[pz.level]) {
    err('빨대 ' + pz.id + ': ' + pz.level + '단계 슬라이더 수는 ' + SLIDER_BY_LEVEL[pz.level] + '개여야 함 (' + pz.sliders.length + ')');
  }
  const colors = new Set();
  pz.sliders.forEach((s, i) => {
    if (!s.color) err('빨대 ' + pz.id + ' 슬라이더 ' + i + ': 색 없음');
    if (colors.has(s.color)) err('빨대 ' + pz.id + ': 색 중복 ' + s.color);
    colors.add(s.color);
    if (!(s.target >= 0 && s.target <= 1)) err('빨대 ' + pz.id + ' 슬라이더 ' + i + ': 목표 높이는 0~1 (' + s.target + ')');
  });
  // 목표 높이가 서로 너무 붙어 있지 않은지(±8% 스냅과 겹치면 헷갈림) — 0.1 이상 벌어져야 함
  const ts = pz.sliders.map(s => s.target).sort((a, b) => a - b);
  for (let i = 1; i < ts.length; i++) {
    if (ts[i] - ts[i - 1] < 0.1) err('빨대 ' + pz.id + ': 목표 높이가 너무 가까움 (' + ts[i - 1] + ', ' + ts[i] + ')');
  }
});

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터 검증 통과 — 숟가락 ' + D.spoons.length + '개, 빨대 ' + D.straws.length + '개');
