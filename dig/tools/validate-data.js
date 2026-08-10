#!/usr/bin/env node
/* 데이터 검증 — node dig/tools/validate-data.js
 *
 * 발굴 놀이터는 그림을 스스로 갖고 있지 않다 — 색칠공부의 밑그림(coloring/js/pictures.js)을
 * id 로 가리킬 뿐이다. 그래서 여기서 보는 것은 "그 가리킴이 맞는가"다:
 *   판 30개(단계별 10) · id 유일 · 그림 id 가 Pictures 에 실제로 있는가
 *   보기 개수가 단계와 맞는가(2/3/4) · 정답이 보기 안에 **정확히 하나**
 *   오답이 정답과 겹치지 않고 서로도 안 겹치는가 · 별 계산이 규칙대로인가
 */
'use strict';

global.window = {};
require('../../coloring/js/pictures.js');   // window.Pictures — 읽기만 한다
require('../js/data.js');
const PIC = global.window.Pictures;
const D = global.window.DigData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

/* ── 그림 창고가 제대로 실렸는가 ── */
if (!PIC || !Array.isArray(PIC.PICTURES) || PIC.PICTURES.length < 20) {
  err('coloring/js/pictures.js 를 못 읽었다 — 밑그림 ' + (PIC && PIC.PICTURES ? PIC.PICTURES.length : 0) + '장');
}
const picIds = new Set((PIC && PIC.PICTURES ? PIC.PICTURES : []).map(p => p.id));

/* ── 단계 3개 ── */
if (!Array.isArray(D.LEVELS) || D.LEVELS.length !== 3) err('단계 정의가 3개여야 함');
const CHOICES = {};
(D.LEVELS || []).forEach(lv => {
  if (!lv.name || !lv.desc || !lv.cls) err('단계 ' + lv.id + ': 이름/설명/클래스 누락');
  if (lv.choices !== lv.id + 1) err('단계 ' + lv.id + ': 보기 수는 ' + (lv.id + 1) + '개여야 함 — ' + lv.choices);
  CHOICES[lv.id] = lv.choices;
});

/* ── 판 30개, 단계별 10개 ── */
if (!Array.isArray(D.ROUNDS) || D.ROUNDS.length !== 30) {
  err('판이 30개여야 함 — ' + (D.ROUNDS ? D.ROUNDS.length : 0));
}
const perLevel = { 1: 0, 2: 0, 3: 0 };
const seenIds = new Set();
const seenSig = new Set();
const usedPics = new Set();

(D.ROUNDS || []).forEach(rd => {
  const tag = '판 ' + (rd.id || '?');
  if (!rd.id || seenIds.has(rd.id)) err(tag + ': id 누락/중복');
  seenIds.add(rd.id);
  if (![1, 2, 3].includes(rd.level)) { err(tag + ': 단계 오류 — ' + rd.level); return; }
  perLevel[rd.level]++;

  // 숨은 그림이 실제로 있는가
  if (!rd.pic || !picIds.has(rd.pic)) err(tag + ': 없는 그림 id — ' + rd.pic);
  usedPics.add(rd.pic);

  // 보기 개수가 단계와 맞는가
  const want = CHOICES[rd.level];
  if (!Array.isArray(rd.choices) || rd.choices.length !== want) {
    err(tag + ': 단계 ' + rd.level + ' 는 보기 ' + want + '개여야 함 — ' + (rd.choices ? rd.choices.length : 0));
    return;
  }
  // 보기의 그림이 전부 실재하고, 서로 겹치지 않는가
  const seen = new Set();
  rd.choices.forEach(cid => {
    if (!picIds.has(cid)) err(tag + ': 없는 보기 그림 — ' + cid);
    if (seen.has(cid)) err(tag + ': 보기 중복 — ' + cid);
    seen.add(cid);
  });
  // 정답이 보기 안에 정확히 하나
  const hits = rd.choices.filter(cid => cid === rd.pic).length;
  if (hits !== 1) err(tag + ': 정답(' + rd.pic + ')이 보기 안에 정확히 하나여야 함 — ' + hits + '개');
  // 오답이 하나라도 있어야 "고르기"가 성립
  if (rd.choices.length - hits < 1) err(tag + ': 오답 보기가 없음');

  // 같은 구성의 판이 두 번 나오지 않게
  const sig = rd.level + '|' + rd.pic + '|' + rd.choices.join(',');
  if (seenSig.has(sig)) err(tag + ': 같은 구성의 판 중복 — ' + sig);
  seenSig.add(sig);
});
[1, 2, 3].forEach(lv => { if (perLevel[lv] !== 10) err('단계 ' + lv + ' 판이 10개여야 함 — ' + perLevel[lv]); });

/* ── 정답 그림이 골고루 쓰이는가 (한 그림만 계속 나오면 외워 버린다) ── */
if (usedPics.size < 20) err('숨은 그림 종류가 너무 적다 — ' + usedPics.size + '종');

/* ── 별 계산 규칙 ── */
if (typeof D.starsFor !== 'function') err('starsFor 가 없음');
else {
  const cases = [
    [0.10, 0, 3], [D.CUT3, 0, 3], [D.CUT3 + 0.01, 0, 2],
    [0.60, 0, 2], [D.CUT2, 0, 2], [D.CUT2 + 0.01, 0, 1],
    [0.95, 0, 1],
    [0.10, 1, 2], [0.10, 2, 1], [0.10, 5, 1],   // 틀려도 최소 1개
    [0.95, 3, 1],
  ];
  cases.forEach(([r, m, want]) => {
    const got = D.starsFor(r, m);
    if (got !== want) err('별 계산: 파낸 ' + Math.round(r * 100) + '% · 틀림 ' + m + '회 → ' + want + '개여야 함 (받은 값 ' + got + ')');
  });
  // 적게 팔수록 별이 많아야 한다(단조성)
  for (let r = 0; r <= 1.0001; r += 0.05) {
    if (D.starsFor(r, 0) > D.starsFor(Math.max(0, r - 0.05), 0)) err('별 계산: 더 많이 팠는데 별이 늘었다 — ' + r.toFixed(2));
  }
  if (D.starsFor(0.1, 0) === D.starsFor(0.9, 0)) err('별 계산이 파낸 양을 보지 않는다(상수)');
}

/* ── 보기가 뜨는 기준 ── */
if (!(D.REVEAL > 0.05 && D.REVEAL < D.CUT3)) err('보기 등장 기준(REVEAL)이 이상하다 — ' + D.REVEAL);

if (!Array.isArray(D.praises) || !D.praises.length) err('칭찬 문구가 없음');

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터 검증 통과 — 판 ' + D.ROUNDS.length + '개(단계별 10, 보기 2/3/4), ' +
  '숨은 그림 ' + usedPics.size + '종 / 색칠공부 밑그림 ' + picIds.size + '장, ' +
  '보기 등장 ' + Math.round(D.REVEAL * 100) + '% · 별 ' + Math.round(D.CUT3 * 100) + '%/' + Math.round(D.CUT2 * 100) + '%');
