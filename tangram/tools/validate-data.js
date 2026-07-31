#!/usr/bin/env node
/* 데이터 검증 — node tangram/tools/validate-data.js
 * 조각 원형(반지름·각도 범위)·색 6종·퍼즐 30개(단계별 10, 조각 수 2~4/4~6/6~9,
 * rotate 는 단계3만 true)·조각 shape·color 유효성·장식(deco) 형식·id 유일성·
 * 그림 전체 크기(bbox)가 지나치게 작거나 크지 않은지를 정적 검사한다.
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.TangramData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

/* ── 조각 원형 라이브러리 ── */
const shapeKeys = Object.keys(D.ARC_SHAPES || {});
if (shapeKeys.length < 6) err('조각 원형(ARC_SHAPES)이 너무 적음 — ' + shapeKeys.length);
shapeKeys.forEach(k => {
  const t = D.ARC_SHAPES[k];
  if (typeof t.innerR !== 'number' || t.innerR < 0) err('조각 ' + k + ': innerR 오류 — ' + t.innerR);
  if (typeof t.outerR !== 'number' || t.outerR <= t.innerR) err('조각 ' + k + ': outerR 은 innerR 보다 커야 함 — ' + t.outerR + ' vs ' + t.innerR);
  if (typeof t.sweep !== 'number' || t.sweep <= 0 || t.sweep > 360) err('조각 ' + k + ': sweep 범위 오류(0~360) — ' + t.sweep);
});

/* ── 색 6종 이상 ── */
if (!D.COLOR_IDS || D.COLOR_IDS.length < 6) err('무지개 색은 6종 이상이어야 함 — ' + (D.COLOR_IDS ? D.COLOR_IDS.length : 0));
(D.COLOR_IDS || []).forEach(c => {
  const m = D.colorMeta(c);
  if (!m || !m.hex || !m.say) err('색 ' + c + ': hex/say 누락');
  if (m && !/^#[0-9A-Fa-f]{6}$/.test(m.hex)) err('색 ' + c + ': hex 형식 오류 — ' + m.hex);
});

/* ── 기하 도우미 자체 점검 — 원점에서 만든 부채꼴이 유효한 path 문자열을 내는가 ── */
shapeKeys.forEach(k => {
  const d = D.arcPathD(0, 0, D.ARC_SHAPES[k], 0);
  if (typeof d !== 'string' || d.indexOf('M') !== 0 || d.indexOf('A') < 0) err('조각 ' + k + ': arcPathD 결과가 이상함');
});

/* ── 퍼즐 30개, 단계별 10개 ── */
if (!Array.isArray(D.PUZZLES) || D.PUZZLES.length !== 30) {
  err('퍼즐이 30개여야 함 — ' + (D.PUZZLES ? D.PUZZLES.length : 0));
}
const PIECE_RANGE = { 1: [2, 4], 2: [4, 6], 3: [6, 9] };
const perLevel = { 1: 0, 2: 0, 3: 0 };
const seenIds = new Set();
const DECO_TYPES = ['eye', 'dot', 'line', 'smile'];

(D.PUZZLES || []).forEach(pz => {
  const tag = '퍼즐 ' + (pz.id || '?');
  if (!pz.id || seenIds.has(pz.id)) err(tag + ': id 누락/중복');
  seenIds.add(pz.id);
  if (!pz.name || !pz.emoji) err(tag + ': 이름/이모지 누락');
  if (![1, 2, 3].includes(pz.level)) { err(tag + ': 단계 오류 — ' + pz.level); return; }
  perLevel[pz.level]++;

  // rotate 플래그: 단계3만 true
  const wantRotate = pz.level === 3;
  if (pz.rotate !== wantRotate) err(tag + ': rotate 는 단계3만 true 여야 함 — ' + pz.rotate);

  // 조각 수
  const [lo, hi] = PIECE_RANGE[pz.level];
  const n = Array.isArray(pz.pieces) ? pz.pieces.length : 0;
  if (n < lo || n > hi) err(tag + ': 단계 ' + pz.level + ' 조각 수는 ' + lo + '~' + hi + '개여야 함 — ' + n);

  // 조각 하나하나 유효성
  const tagSeen = new Set();
  (pz.pieces || []).forEach((pc, i) => {
    const ptag = tag + ' 조각' + i;
    if (!D.hasShape(pc.shape)) err(ptag + ': 없는 조각 원형 — ' + pc.shape);
    if (!D.hasColor(pc.color)) err(ptag + ': 없는 색 — ' + pc.color);
    if (typeof pc.x !== 'number' || typeof pc.y !== 'number' || Number.isNaN(pc.x) || Number.isNaN(pc.y)) err(ptag + ': 좌표 오류');
    if (typeof pc.rot !== 'number' || pc.rot < 0 || pc.rot >= 360) err(ptag + ': rot 범위 오류(0~359) — ' + pc.rot);
    if (pc.tag) {
      if (tagSeen.has(pc.tag)) err(ptag + ': 조각 태그 중복 — ' + pc.tag);
      tagSeen.add(pc.tag);
    }
  });

  // 장식(deco) 형식
  (pz.deco || []).forEach((d, i) => {
    const dtag = tag + ' 장식' + i;
    if (DECO_TYPES.indexOf(d.t) < 0) { err(dtag + ': 알 수 없는 장식 종류 — ' + d.t); return; }
    if (d.t === 'line') {
      ['x1', 'y1', 'x2', 'y2'].forEach(k => { if (typeof d[k] !== 'number' || Number.isNaN(d[k])) err(dtag + ': ' + k + ' 좌표 오류'); });
    } else {
      if (typeof d.x !== 'number' || typeof d.y !== 'number' || Number.isNaN(d.x) || Number.isNaN(d.y)) err(dtag + ': 좌표 오류');
    }
    if (d.t === 'dot' && (typeof d.r !== 'number' || d.r <= 0)) err(dtag + ': dot 반지름(r) 오류');
    if (d.t === 'dot' && !d.c) err(dtag + ': dot 색(c) 누락');
  });

  // 그림 전체 크기가 지나치게 작거나 크지 않은지(스케일 계산이 안정적인 범위인지)
  const bb = D.pictureBBox(pz);
  const w = bb.x1 - bb.x0, h = bb.y1 - bb.y0;
  if (!(w > 3 && w < 80 && h > 3 && h < 80)) err(tag + ': 그림 크기가 비정상 범위 — w=' + w.toFixed(1) + ' h=' + h.toFixed(1));
});
[1, 2, 3].forEach(lv => { if (perLevel[lv] !== 10) err('단계 ' + lv + ' 퍼즐이 10개여야 함 — ' + perLevel[lv]); });

/* ── 단계 정의 3개 ── */
if (!Array.isArray(D.LEVELS) || D.LEVELS.length !== 3) err('단계 정의가 3개여야 함');
(D.LEVELS || []).forEach(lv => {
  if (!lv.name || !lv.desc || !lv.cls) err('단계 ' + lv.id + ': 이름/설명/클래스 누락');
});

if (!Array.isArray(D.praises) || !D.praises.length) err('칭찬 문구가 없음');

// 그림 이름(도안) 다양성 — 최소 8종 이상의 서로 다른 이름을 써야 한다
const distinctNames = new Set((D.PUZZLES || []).map(pz => pz.name));
if (distinctNames.size < 8) err('그림 도안 종류가 너무 적음(8종 이상 권장) — ' + distinctNames.size);

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터 검증 통과 — 조각 원형 ' + shapeKeys.length + '종, 색 ' + D.COLOR_IDS.length + '종, ' +
  '퍼즐 ' + D.PUZZLES.length + '개(단계별 10, 조각 2~4/4~6/6~9), 도안 ' + distinctNames.size + '종');
