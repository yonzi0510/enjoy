#!/usr/bin/env node
/* 데이터·계약 검증 — node clock/tools/validate-data.js
 *
 * 방 3개 · 단계 4개(60/30/15/5분) · 판 40개(단계별 10) · 친구 12종과,
 * 시계 엔진(js/clock.js)의 각도↔분 규칙을 정적으로 검사한다.
 *
 * ⚠️ 각도↔분은 **손으로 적어 둔 표**와 대조한다. 검증기가 앱의 변환 함수를 그냥 불러
 *    왕복만 보면 규칙이 새도 같이 새서 통과한다(로봇 놀이터 BFS 에서 실제로 겪은 일이다).
 *    그래서 아래 EXPECT 표는 사람이 계산해 적은 것이고, 코드가 만들어 낸 것이 아니다.
 */
'use strict';

global.window = {};
require('../js/data.js');
require('../js/clock.js');
const D = global.window.ClockData;
const E = global.window.ClockEngine;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }
function eq(got, want, msg) { if (got !== want) err(msg + ' — ' + got + ' (기대 ' + want + ')'); }

/* ══════════ ① 방 3개 ══════════ */
if (!Array.isArray(D.ROOMS) || D.ROOMS.length !== 3) err('방이 3개여야 함 — ' + (D.ROOMS ? D.ROOMS.length : 0));
const readyRooms = (D.ROOMS || []).filter(r => r.ready);
if (readyRooms.length !== 1) err('이번 차수에 열린 방은 하나(뻐꾸기 시계)여야 함 — ' + readyRooms.length);
if (!readyRooms.length || readyRooms[0].id !== 'cuckoo') err('열린 방이 뻐꾸기 시계가 아님');
(D.ROOMS || []).forEach(r => {
  if (!r.id || !r.name || !r.desc || !r.cls) err('방 ' + (r.id || '?') + ': 이름/설명/클래스 누락');
  if (!D.roomDef(r.id)) err('방 ' + r.id + ': roomDef 조회 실패');
});

/* ══════════ ② 단계 4개 — 정각 → 반 → 15분 → 5분 ══════════
 * 1분 단위는 넣지 않는다. 폰에서 눈금 간격이 17px 라 다섯 살이 못 집는다. */
const WANT_UNITS = [60, 30, 15, 5];
if (!Array.isArray(D.STAGES) || D.STAGES.length !== 4) err('단계가 4개여야 함 — ' + (D.STAGES ? D.STAGES.length : 0));
(D.STAGES || []).forEach((s, i) => {
  if (s.id !== i + 1) err('단계 차례가 어긋남 — ' + s.id);
  if (s.unit !== WANT_UNITS[i]) err('단계 ' + s.id + ' 단위는 ' + WANT_UNITS[i] + '분이어야 함 — ' + s.unit);
  if (s.unit < 5) err('단계 ' + s.id + ': 5분보다 잔 눈금은 금지 — ' + s.unit);
  if (60 % s.unit !== 0 || 720 % s.unit !== 0) err('단계 ' + s.id + ': 단위가 한 시간·열두 시간을 고르게 나누지 못함');
  if (!s.name || !s.desc || !s.cls) err('단계 ' + s.id + ': 이름/설명/클래스 누락');
  if (D.unitOf(s.id) !== s.unit) err('단계 ' + s.id + ': unitOf 불일치');
});

/* ══════════ ③ 판 40개 ══════════ */
const ALLOWED = ['stage', 'id', 'minutes'];
const BANNED = ['angle', 'handAngle', 'hourAngle', 'minuteAngle', 'text', 'answer', 'correct', 'score', 'read'];
if (!Array.isArray(D.BOARDS) || D.BOARDS.length !== 40) err('판이 40개여야 함 — ' + (D.BOARDS ? D.BOARDS.length : 0));

const perStage = { 1: 0, 2: 0, 3: 0, 4: 0 };
const seenIds = new Set();
const seenPerStage = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set() };
const hoursSeen = new Set();

(D.BOARDS || []).forEach(bd => {
  const tag = '판 ' + (bd.id || '?');
  if (!bd.id || seenIds.has(bd.id)) err(tag + ': id 누락/중복');
  seenIds.add(bd.id);
  if (![1, 2, 3, 4].includes(bd.stage)) { err(tag + ': 단계 오류 — ' + bd.stage); return; }
  perStage[bd.stage]++;

  // 파생 필드 금지 — 상태는 「총 분」 하나뿐이다
  Object.keys(bd).forEach(k => {
    if (ALLOWED.indexOf(k) < 0) err(tag + ': 쓸데없는 필드 — ' + k);
    if (BANNED.indexOf(k) >= 0) err(tag + ': 파생 필드 금지 — ' + k + ' (총 분 하나에서 계산할 것)');
  });

  // minutes: 정수 0~719, 단계 단위의 배수
  const m = bd.minutes;
  if (!Number.isInteger(m) || m < 0 || m > 719) { err(tag + ': minutes 는 0~719 정수 — ' + m); return; }
  const unit = D.unitOf(bd.stage);
  if (m % unit !== 0) err(tag + ': 단계 ' + bd.stage + ' 는 ' + unit + '분의 배수여야 함 — ' + m);

  // 단계 안에서 같은 시각이 두 번 나오지 않는다
  if (seenPerStage[bd.stage].has(m)) err(tag + ': 단계 ' + bd.stage + ' 안에서 시각 중복 — ' + m);
  seenPerStage[bd.stage].add(m);

  hoursSeen.add(D.hour12(m));
  if (!D.boardById(bd.id)) err(tag + ': boardById 조회 실패');
});
[1, 2, 3, 4].forEach(s => {
  if (perStage[s] !== 10) err('단계 ' + s + ' 판이 10개여야 함 — ' + perStage[s]);
  if (D.boardsOf(s).length !== 10) err('단계 ' + s + ': boardsOf 가 10개가 아님');
});

// 12시(총분 0)를 겪는 판이 반드시 있어야 한다 — 0/360 경계가 실제로 도는 자리
if (!(D.BOARDS || []).some(b => b.minutes === 0)) err('총분 0(12시) 판이 없음 — 0/360 경계를 아무도 안 겪는다');
// 도감 12칸을 다 채울 수 있어야 한다
for (let h = 1; h <= 12; h++) if (!hoursSeen.has(h)) err('도감 ' + h + '시 친구를 얻을 판이 없음');

/* ══════════ ④ 시작 자리 — 열자마자 정답이거나 몇 바퀴짜리가 아니게 ══════════ */
(D.BOARDS || []).forEach(bd => {
  const tag = '판 ' + bd.id;
  const st = D.startOf(bd);
  const unit = D.unitOf(bd.stage);
  if (!Number.isInteger(st) || st < 0 || st > 719) { err(tag + ': 시작 자리가 0~719 정수가 아님 — ' + st); return; }
  if (st === bd.minutes) { err(tag + ': 열자마자 정답'); return; }
  const fwd = ((bd.minutes - st) % 720 + 720) % 720;   // 시계 방향으로 가야 할 거리
  if (fwd <= unit / 2) err(tag + ': 시작 자리가 자석 반경 안 — 놓기만 해도 맞는다 (' + fwd + '분)');
  if (fwd >= 60) err(tag + ': 시작 자리가 한 바퀴 밖 — 다섯 살이 몇 바퀴를 돌려야 한다 (' + fwd + '분)');
});

/* ══════════ ⑤ 각도 ↔ 분 — 손으로 적어 둔 표와 대조 ══════════
 * 각도는 12시가 0°, 시계 방향이 +. 분침은 1분에 6°.
 * 아래 값은 사람이 계산해 적은 것이다 — 코드로 만들지 마라(같이 새면 못 잡는다).
 *   0° → 0.00분   29° → 4.83분   31° → 5.17분   89° → 14.83분
 *  91° → 15.17분 179° → 29.83분 181° → 30.17분 359° → 59.83분
 * 그 값을 각 단위의 가장 가까운 눈금으로 **한 번만** 반올림한 결과: */
const ANGLES = [0, 29, 31, 89, 91, 179, 181, 359];
const EXPECT = {
  1:  [0, 5, 5, 15, 15, 30, 30, 0],    // 1분 눈금 (59.83 → 60 → 0)
  5:  [0, 5, 5, 15, 15, 30, 30, 0],    // 5분 눈금
  15: [0, 0, 0, 15, 15, 30, 30, 0],    // 15분 눈금 (4.83·5.17 → 0)
  30: [0, 0, 0,  0, 30, 30, 30, 0],    // 30분 눈금 (14.83 → 0 · 15.17 → 30)
  60: [0, 0, 0,  0,  0,  0,  0, 0],    // 한 시간 눈금 — 분은 언제나 0
};
Object.keys(EXPECT).forEach(u => {
  const unit = Number(u);
  ANGLES.forEach((a, i) => {
    eq(E.angleToMinutes(a, unit), EXPECT[u][i], '각도→분 (' + a + '°, ' + unit + '분 눈금)');
  });
});

// 왕복 — 눈금 위의 분은 각도로 갔다가 그대로 돌아와야 한다
WANT_UNITS.forEach(unit => {
  for (let m = 0; m < 60; m += unit) {
    eq(E.angleToMinutes(E.minutesToAngle(m), unit), m, '왕복 (' + m + '분, ' + unit + '분 눈금)');
  }
});

// 각도 접기 [-180,180) — 12시 경계
eq(E.fold(-355), 5, '접기 fold(-355)');
eq(E.fold(355), -5, '접기 fold(355)');
eq(E.fold(0), 0, '접기 fold(0)');
eq(E.fold(180), -180, '접기 fold(180)');
eq(E.fold(-180), -180, '접기 fold(-180)');
eq(E.fold(365), 5, '접기 fold(365)');

// 절대각 — 12시가 0°, 3시 방향이 90°
eq(E.pointAngle(50, 50, 50, 10), 0, '절대각 12시');
eq(E.pointAngle(50, 50, 90, 50), 90, '절대각 3시');
eq(E.pointAngle(50, 50, 50, 90), 180, '절대각 6시');
eq(E.pointAngle(50, 50, 10, 50), 270, '절대각 9시');

// 자석 — 어떤 실수 총분을 놓아도 반드시 눈금 위에 서고, 0~719 안에 있다
WANT_UNITS.forEach(unit => {
  for (let k = 0; k < 400; k++) {
    const t = (k * 17.37) % 720;
    const s = E.snapTotal(t, unit);
    if (s % unit !== 0) err('자석: ' + t.toFixed(2) + '분(' + unit + '눈금) → ' + s + ' 이 눈금 위가 아님');
    if (s < 0 || s > 719) err('자석: 결과가 0~719 밖 — ' + s);
  }
  // 12시 경계 — 11:59 언저리는 12시(0)로 붙는다. 11시로 되감기면 안 된다
  const near = E.snapTotal(719.6, unit);
  if (near !== 0) err('자석: 719.6분(' + unit + '눈금) → ' + near + ' — 12시(0)로 붙어야 함');
});

/* ══════════ ⑥ 시침 맞물림 — 두 바늘은 총 분 하나에서 나온다 ══════════ */
for (let h = 0; h < 12; h++) {
  const half = h * 60 + 30;
  eq(E.hourAngle(half), h * 30 + 15, h + '시 30분 시침각(반 칸 물려야 함)');
  eq(E.minuteAngle(half), 180, h + '시 30분 분침각');
  eq(E.hourAngle(h * 60), h * 30, h + '시 정각 시침각');
}
// 15분·45분도 톱니가 물린다
eq(E.hourAngle(3 * 60 + 15), 97.5, '3시 15분 시침각');
eq(E.hourAngle(11 * 60 + 45), 352.5, '11시 45분 시침각');
// 총 분이 한 바퀴를 넘어도 접힌다
eq(E.norm720(720), 0, '총분 접기 720');
eq(E.norm720(-1), 719, '총분 접기 -1');
eq(E.hour12(0), 12, '0분은 12시');
eq(E.hour12(60), 1, '60분은 1시');

/* ══════════ ⑦ 숫자 톡 누르기 ══════════ */
// 정각 단계 — 숫자를 누르면 그 「시」로 간다
eq(E.tapTotal(480, 3, 60), 180, '정각: 3을 누르면 3시');
eq(E.tapTotal(480, 12, 60), 0, '정각: 12를 누르면 12시');
// 그 밖의 단계 — 긴바늘이 그 숫자로 간다(가까운 쪽으로)
eq(E.tapTotal(180, 3, 5), 195, '5분: 3시에서 3을 누르면 3시 15분');
eq(E.tapTotal(180, 6, 15), 210, '15분: 3시에서 6을 누르면 3시 30분');
eq(E.tapTotal(705, 12, 15), 720 % 720, '15분: 11시 45분에서 12를 누르면 12시');
WANT_UNITS.forEach(unit => {
  for (let n = 1; n <= 12; n++) {
    for (let cur = 0; cur < 720; cur += 37) {
      const t = E.tapTotal(cur, n, unit);
      if (t % unit !== 0) err('숫자 탭 결과가 눈금 위가 아님 — ' + cur + '/' + n + '/' + unit + ' → ' + t);
      if (t < 0 || t > 719) err('숫자 탭 결과가 0~719 밖 — ' + t);
    }
  }
});

/* ══════════ ⑧ 한국어 시각 읽기 — 시는 순우리말 ══════════
 * "4시"를 그냥 TTS 에 넘기면 기기에 따라 "사 시"로 읽는다. 그래서 글자를 직접 만든다.
 * 아래 표는 사람이 적은 것이다. */
const HOUR_WORD = ['열두', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열', '열한'];
const SINO_HOUR = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구', '십', '십일', '십이'];
eq(D.readTime(4 * 60), '네 시', '4시 읽기');
eq(D.readTime(4 * 60 + 30), '네 시 반', '4시 30분 읽기');
eq(D.readTime(4 * 60 + 15), '네 시 십오 분', '4시 15분 읽기');
eq(D.readTime(0), '열두 시', '12시 읽기');
eq(D.readTime(11 * 60 + 45), '열한 시 사십오 분', '11시 45분 읽기');
eq(D.readTime(60 + 5), '한 시 오 분', '1시 5분 읽기');
eq(D.readTime(40), '열두 시 사십 분', '12시 40분 읽기');

// 전수 — 이 앱이 낼 수 있는 시각(5분 배수) 전부
for (let t = 0; t < 720; t += 5) {
  const say = D.readTime(t);
  const h = Math.floor(t / 60), m = t % 60;
  const head = HOUR_WORD[h] + ' 시';
  if (say.indexOf(head) !== 0) { err('시각 읽기 ' + t + ': "' + say + '" 가 순우리말 시로 시작하지 않음(기대 "' + head + '")'); continue; }
  // 한자어 시("사 시")가 섞이면 안 된다
  SINO_HOUR.forEach(w => {
    if (say.indexOf(w + ' 시') === 0) err('시각 읽기 ' + t + ': 한자어 시가 쓰임 — "' + say + '"');
  });
  const tail = say.slice(head.length);
  if (m === 0) { if (tail !== '') err('시각 읽기 ' + t + ': 정각인데 뒷말이 붙음 — "' + say + '"'); }
  else if (m === 30) { if (tail !== ' 반') err('시각 읽기 ' + t + ': 30분은 "반" — "' + say + '"'); }
  else if (!/^ (오|십|십오|이십|이십오|삼십오|사십|사십오|오십|오십오) 분$/.test(tail)) {
    err('시각 읽기 ' + t + ': 분이 한자어 + " 분" 이 아님 — "' + say + '"');
  }
  // 설명을 붙이지 않는다 — 말은 시각 한마디뿐이다
  if (/[놀먹자밥학원간]/.test(say)) err('시각 읽기 ' + t + ': 설명이 섞임 — "' + say + '"');
  if (say.length > 14) err('시각 읽기 ' + t + ': 너무 길다(두 마디로 잘린다) — "' + say + '"');
}
// 판 40개의 시각도 같은 계약을 지킨다
(D.BOARDS || []).forEach(bd => {
  const say = D.readTime(bd.minutes);
  if (say.indexOf(HOUR_WORD[Math.floor(bd.minutes / 60)] + ' 시') !== 0) err('판 ' + bd.id + ': 시각 읽기 계약 위반 — ' + say);
});
// 숫자 표기(2단계 이후 목표 제시)
eq(D.digitOf(0), '12:00', '숫자 표기 12시');
eq(D.digitOf(705), '11:45', '숫자 표기 11시 45분');
eq(D.digitOf(65), '1:05', '숫자 표기 1시 5분');

/* ══════════ ⑨ 친구 12종 ══════════ */
if (!Array.isArray(D.BIRDS) || D.BIRDS.length !== 12) err('친구가 12종이어야 함 — ' + (D.BIRDS ? D.BIRDS.length : 0));
const seenH = new Set();
(D.BIRDS || []).forEach(bird => {
  const tag = '친구 ' + (bird.id || '?');
  if (!bird.id || !bird.name) err(tag + ': id/이름 누락');
  if (!Number.isInteger(bird.h) || bird.h < 1 || bird.h > 12) err(tag + ': 시각(1~12)이 아님 — ' + bird.h);
  if (seenH.has(bird.h)) err(tag + ': 같은 시각의 친구가 둘 — ' + bird.h);
  seenH.add(bird.h);
  ['body', 'belly', 'wing', 'beak'].forEach(k => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(bird[k] || '')) err(tag + ': ' + k + ' 색값 오류 — ' + bird[k]);
  });
});
for (let h = 1; h <= 12; h++) {
  const svg = D.birdSVG(h, 'v' + h);
  if (typeof svg !== 'string' || svg.indexOf('<svg') < 0 || svg.indexOf('</svg>') < 0) err(h + '시 친구: SVG 문자열 오류');
  // 놀잇감·화면에 회전을 걸지 않는다 (무변형 계약)
  if (/transform=/.test(svg)) err(h + '시 친구: SVG 에 transform 이 있음 — 좌표로 그릴 것');
  if (D.birdOfHour(h).h !== h) err(h + '시 친구: birdOfHour 조회 오류');
}
if (D.birdSVG(4, 'uidA') === D.birdSVG(4, 'uidB')) err('birdSVG: uid 가 반영되지 않음(그라데이션 id 충돌 위험)');

/* ══════════ ⑩ 시계판 SVG — 회전을 쓰지 않는다 ══════════ */
const face = E.faceSVG({ total: 195, interactive: true });
if (face.indexOf('<svg') < 0) err('faceSVG: SVG 문자열 오류');
if (/transform=/.test(face)) err('faceSVG: 시계판에 transform 이 있음 — 좌표로 그려야 한다');
['ck-rim', 'ck-tick', 'ck-num', 'ck-hour', 'ck-min', 'ck-knob', 'ck-grab', 'ck-numhit'].forEach(c => {
  if (face.indexOf(c) < 0) err('faceSVG: ' + c + ' 가 없음');
});
if ((face.match(/class="ck-numhit"/g) || []).length !== 12) err('faceSVG: 숫자 탭 자리가 12개가 아님');
// 잡는 굵기 — 폰 세로 312px 판에서 46px 을 넘어야 한다
const grabPx = E.W_GRAB / 100 * 312;
if (grabPx < 46) err('잡는 영역이 폰 세로에서 ' + grabPx.toFixed(1) + 'px — 46px 이상이어야 함');
// 한복판은 안 잡힌다
if (E.R_GRAB_IN < 12) err('한복판이 잡힌다 — 잡는 자리는 중심에서 떨어져야 함 (R_GRAB_IN=' + E.R_GRAB_IN + ')');

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터·계약 검증 통과 — 방 ' + D.ROOMS.length + '개(열림 1) · 단계 ' + D.STAGES.length +
  '개(60/30/15/5분) · 판 ' + D.BOARDS.length + '개(단계별 10) · 친구 ' + D.BIRDS.length + '종 · ' +
  '각도↔분 고정표 ' + (ANGLES.length * Object.keys(EXPECT).length) + '칸 대조');
