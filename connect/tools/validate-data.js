/* 데이터 검증 — node connect/tools/validate-data.js
 * 색 6종·퍼즐 30개(단계별 10)·단계별 점 개수(4/6/8)·좌표 유효·경로가 모든 점을 한 번씩·
 * 색 유효·퍼즐 id 유일·순서 중복 없음을 정적 검사한다.
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.ConnectData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

/* ── 색 6종 ── */
if (!D.COLOR_IDS || D.COLOR_IDS.length !== 6) err('색은 6종이어야 함 — ' + (D.COLOR_IDS ? D.COLOR_IDS.length : 0));
D.COLOR_IDS.forEach(c => {
  const m = D.colorMeta(c);
  if (!m || !m.hex || !m.say) err('색 ' + c + ': hex/say 누락');
  if (m && !/^#[0-9A-Fa-f]{6}$/.test(m.hex)) err('색 ' + c + ': hex 형식 오류 — ' + m.hex);
});

/* ── 퍼즐 30개, 단계별 10개 ── */
if (!Array.isArray(D.PUZZLES) || D.PUZZLES.length !== 30) {
  err('퍼즐이 30개여야 함 — ' + (D.PUZZLES ? D.PUZZLES.length : 0));
}
const DOTS = { 1: 4, 2: 6, 3: 8 }; // 단계별 점 개수
const perLevel = { 1: 0, 2: 0, 3: 0 };
const seenIds = new Set();
const seenSig = new Set();
(D.PUZZLES || []).forEach(pz => {
  const tag = '퍼즐 ' + (pz.id || '?');
  if (!pz.id || seenIds.has(pz.id)) err(tag + ': id 누락/중복');
  seenIds.add(pz.id);
  if (![1, 2, 3].includes(pz.level)) { err(tag + ': 단계 오류 — ' + pz.level); return; }
  perLevel[pz.level]++;
  const dots = pz.dots, order = pz.order;
  if (!Array.isArray(dots) || dots.length !== DOTS[pz.level]) {
    err(tag + ': 단계 ' + pz.level + ' 는 점 ' + DOTS[pz.level] + '개여야 함 — ' + (dots ? dots.length : 0));
    return;
  }
  // 좌표·색 유효
  dots.forEach((d, i) => {
    if (typeof d.x !== 'number' || d.x < 0 || d.x > 100) err(tag + ' 점' + i + ': x 좌표 범위 오류 — ' + d.x);
    if (typeof d.y !== 'number' || d.y < 0 || d.y > 100) err(tag + ' 점' + i + ': y 좌표 범위 오류 — ' + d.y);
    if (!D.hasColor(d.c)) err(tag + ' 점' + i + ': 없는 색 — ' + d.c);
  });
  // 두 점이 너무 겹치지 않게 (탭 구분)
  for (let a = 0; a < dots.length; a++) for (let b = a + 1; b < dots.length; b++) {
    const dx = dots[a].x - dots[b].x, dy = dots[a].y - dots[b].y;
    if (Math.hypot(dx, dy) < 14) err(tag + ': 점 ' + a + '·' + b + ' 가 너무 가까움 (' + Math.hypot(dx, dy).toFixed(1) + ')');
  }
  // 경로: 모든 점 인덱스를 정확히 한 번씩
  if (!Array.isArray(order) || order.length !== dots.length) {
    err(tag + ': order 길이가 점 개수와 달라 — ' + (order ? order.length : 0));
  } else {
    const seen = new Array(dots.length).fill(0);
    order.forEach(idx => {
      if (typeof idx !== 'number' || idx < 0 || idx >= dots.length) err(tag + ': order 에 잘못된 인덱스 — ' + idx);
      else seen[idx]++;
    });
    seen.forEach((n, idx) => { if (n !== 1) err(tag + ': 점 ' + idx + ' 를 ' + n + '번 지남(정확히 1번이어야)'); });
  }
  // 같은 배치+순서의 퍼즐 중복 금지
  const sig = pz.level + '|' + order.map(i => dots[i].x + ',' + dots[i].y + dots[i].c).join('>');
  if (seenSig.has(sig)) err(tag + ': 같은 배치·순서의 퍼즐 중복');
  seenSig.add(sig);
});
[1, 2, 3].forEach(lv => { if (perLevel[lv] !== 10) err('단계 ' + lv + ' 퍼즐이 10개여야 함 — ' + perLevel[lv]); });

/* ── 단계 정의 3개 ── */
if (!Array.isArray(D.LEVELS) || D.LEVELS.length !== 3) err('단계 정의가 3개여야 함');
(D.LEVELS || []).forEach(lv => {
  if (!lv.name || !lv.desc || !lv.cls) err('단계 ' + lv.id + ': 이름/설명/클래스 누락');
  if (lv.dots !== DOTS[lv.id]) err('단계 ' + lv.id + ': dots 값이 ' + DOTS[lv.id] + ' 이어야 함 — ' + lv.dots);
});

if (!Array.isArray(D.praises) || !D.praises.length) err('칭찬 문구가 없음');

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터 검증 통과 — 색 ' + D.COLOR_IDS.length + '종, 퍼즐 ' + D.PUZZLES.length +
  '개(단계별 10), 단계 ' + D.LEVELS.length + '개(점 4/6/8)');
