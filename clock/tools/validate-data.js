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

/* ══════════ ① 방 3개 — 이제 셋 다 열려 있다 ══════════
 * 1차에는 "열린 방은 하나"를 일부러 걸어 두었다(만들지도 않은 방이 열리는 것을 막으려고).
 * 2차에서 방②③ 을 만들었으므로 그 자물쇠를 **풀지 않고 다시 적는다** —
 * 이제는 「셋 다 열려 있고, 세 방이 각자 제 데이터를 갖췄는가」를 본다. */
if (!Array.isArray(D.ROOMS) || D.ROOMS.length !== 3) err('방이 3개여야 함 — ' + (D.ROOMS ? D.ROOMS.length : 0));
const readyRooms = (D.ROOMS || []).filter(r => r.ready);
if (readyRooms.length !== 3) err('방 셋이 모두 열려 있어야 함 — ' + readyRooms.length);
['cuckoo', 'wake', 'day'].forEach((id, i) => {
  const r = (D.ROOMS || [])[i];
  if (!r || r.id !== id) err('방 차례가 어긋남 — ' + i + '번째가 ' + (r ? r.id : '없음') + ' (기대 ' + id + ')');
});
(D.ROOMS || []).forEach(r => {
  if (/곧 만들어요/.test(r.desc || '')) err('방 ' + r.id + ': 설명이 아직 「곧 만들어요」다 — 다 만들었으면 바꿀 것');
});
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

/* ══════════════════════════════════════════════════════════════════
 *            ⑪ 방② ⏰ 잠꾸러기 깨우기
 * ══════════════════════════════════════════════════════════════════ */

/* ⑪-1 단계 둘 — 정각과 반뿐이다.
 * 방② 는 「맞춰 두고 기다리기」가 중심이라 잔 눈금을 두지 않는다(js/data.js 머리 주석).
 * 5분·15분 단계가 생기면 여기서 막힌다 — 늘리려면 그 판단부터 다시 하라는 뜻이다. */
const WAKE_UNITS = [60, 30];
if (!Array.isArray(D.WAKE_STAGES) || D.WAKE_STAGES.length !== 2) err('방② 단계가 2개여야 함 — ' + (D.WAKE_STAGES ? D.WAKE_STAGES.length : 0));
(D.WAKE_STAGES || []).forEach((s, i) => {
  if (s.id !== i + 1) err('방② 단계 차례가 어긋남 — ' + s.id);
  if (s.unit !== WAKE_UNITS[i]) err('방② 단계 ' + s.id + ' 단위는 ' + WAKE_UNITS[i] + '분이어야 함 — ' + s.unit);
  if (!s.name || !s.desc || !s.cls) err('방② 단계 ' + s.id + ': 이름/설명/클래스 누락');
  if (D.wakeUnitOf(s.id) !== s.unit) err('방② 단계 ' + s.id + ': wakeUnitOf 불일치');
});

/* ⑪-2 잠꾸러기 8~12종 · 반응 3~5개 — 두 번째·세 번째가 달라야 한다 */
const S = D.SLEEPERS || [];
if (S.length < 8 || S.length > 12) err('잠꾸러기는 8~12종이어야 함 — ' + S.length);
const EARS = ['round', 'long', 'point', 'flop', 'mane', 'small', 'none'];
const palIds = new Set();
const sayAll = [];
S.forEach(p => {
  const tag = '잠꾸러기 ' + (p.id || '?');
  if (!p.id || !p.name) err(tag + ': id/이름 누락');
  if (palIds.has(p.id)) err(tag + ': id 중복');
  palIds.add(p.id);
  if (EARS.indexOf(p.ear) < 0) err(tag + ': 귀 모양이 낯설다 — ' + p.ear);
  ['fur', 'belly', 'nose'].forEach(k => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(p[k] || '')) err(tag + ': ' + k + ' 색값 오류 — ' + p[k]);
  });
  if (!Array.isArray(p.wakes) || p.wakes.length < 3 || p.wakes.length > 5) {
    err(tag + ': 깨어나는 장면이 3~5개여야 함 — ' + (p.wakes ? p.wakes.length : 0));
    return;
  }
  // 같은 친구 안에서 자세도 대사도 겹치면 안 된다 — 두 번째가 첫 번째와 같으면 놀이가 죽는다
  const poses = new Set(), says = new Set();
  p.wakes.forEach((wk, i) => {
    const wt = tag + ' 장면 ' + (i + 1);
    if (!D.POSES[wk.pose]) err(wt + ': 모르는 자세 — ' + wk.pose);
    if (poses.has(wk.pose)) err(wt + ': 앞 장면과 같은 자세 — ' + wk.pose);
    poses.add(wk.pose);
    if (says.has(wk.say)) err(wt + ': 앞 장면과 같은 대사 — ' + wk.say);
    says.add(wk.say);
    sayAll.push([wt, wk.say]);
  });
  // 자는 자세를 깨어나는 장면에 쓰면 「안 깨어난 것」이 된다
  if (poses.has('sleep')) err(tag + ': 깨어나는 장면에 자는 자세(sleep)가 들어 있음');
});
// 친구마다 대사 꾸러미가 달라야 한다 — 열 마리가 같은 말을 하면 만난 보람이 없다
const sayKeys = S.map(p => (p.wakes || []).map(k => k.say).join('|'));
if (new Set(sayKeys).size !== sayKeys.length) err('잠꾸러기 둘이 똑같은 대사 꾸러미를 쓰고 있음');
// 넘겨도 마지막 장면이 이어질 뿐, 사라지거나 되감기지 않는다
S.forEach(p => {
  const last = p.wakes[p.wakes.length - 1];
  if (D.wakeSceneOf(p.id, 99) !== last) err('잠꾸러기 ' + p.id + ': 많이 깨웠을 때 장면이 마지막으로 이어지지 않음');
  if (D.wakeSceneOf(p.id, 0) !== p.wakes[0]) err('잠꾸러기 ' + p.id + ': 첫 장면 조회 오류');
});

/* ⑪-3 판 24개 — 파생 필드·정답 필드 금지 */
const WB = D.WAKE_BOARDS || [];
const W_ALLOWED = ['stage', 'id', 'ask', 'pal'];
if (WB.length < 20 || WB.length > 30) err('방② 판은 20~30개여야 함 — ' + WB.length);
const wSeen = new Set(), wPerStage = { 1: 0, 2: 0 }, wPerStageTime = { 1: new Set(), 2: new Set() };
const palUse = {};
WB.forEach(bd => {
  const tag = '방② 판 ' + (bd.id || '?');
  if (!bd.id || wSeen.has(bd.id)) err(tag + ': id 누락/중복');
  wSeen.add(bd.id);
  Object.keys(bd).forEach(k => {
    if (W_ALLOWED.indexOf(k) < 0) err(tag + ': 쓸데없는 필드 — ' + k);
    if (BANNED.indexOf(k) >= 0) err(tag + ': 파생 필드 금지 — ' + k);
  });
  if (!WAKE_UNITS[bd.stage - 1]) { err(tag + ': 단계 오류 — ' + bd.stage); return; }
  wPerStage[bd.stage]++;
  const unit = D.wakeUnitOf(bd.stage);
  if (!Number.isInteger(bd.ask) || bd.ask < 0 || bd.ask > 719) { err(tag + ': ask 는 0~719 정수 — ' + bd.ask); return; }
  if (bd.ask % unit !== 0) err(tag + ': 단계 ' + bd.stage + ' 는 ' + unit + '분의 배수여야 함 — ' + bd.ask);
  if (wPerStageTime[bd.stage].has(bd.ask)) err(tag + ': 단계 안에서 시각 중복 — ' + bd.ask);
  wPerStageTime[bd.stage].add(bd.ask);
  if (!palIds.has(bd.pal)) err(tag + ': 없는 친구 — ' + bd.pal);
  palUse[bd.pal] = (palUse[bd.pal] || 0) + 1;
  if (!D.wakeBoardById(bd.id)) err(tag + ': wakeBoardById 조회 실패');
});
[1, 2].forEach(s => {
  if (wPerStage[s] !== 12) err('방② 단계 ' + s + ' 판이 12개여야 함 — ' + wPerStage[s]);
  if (D.wakeBoardsOf(s).length !== 12) err('방② 단계 ' + s + ': wakeBoardsOf 가 12개가 아님');
});
// 두 번째·세 번째 장면을 볼 수 있어야 한다 — 한 번만 나오는 친구가 있으면 그 장면은 죽은 데이터다
S.forEach(p => { if ((palUse[p.id] || 0) < 2) err('잠꾸러기 ' + p.id + ': 판에 ' + (palUse[p.id] || 0) + '번만 나옴 — 두 번째 장면을 볼 길이 없다'); });
// 도감 12칸처럼 앨범 칸을 다 채울 수 있어야 한다
if (Object.keys(palUse).length !== S.length) err('앨범을 다 채울 수 없다 — 판에 안 나오는 친구가 있음');

/* ⑪-4 알람 바늘 시작 자리 — 열자마자 정답이거나 몇 바퀴짜리가 아니게(방① 과 같은 규칙) */
WB.forEach(bd => {
  const tag = '방② 판 ' + bd.id;
  const st = D.wakeStartOf(bd);
  const unit = D.wakeUnitOf(bd.stage);
  if (!Number.isInteger(st) || st < 0 || st > 719) { err(tag + ': 시작 자리가 0~719 정수가 아님 — ' + st); return; }
  if (st === bd.ask) { err(tag + ': 열자마자 카드 시각'); return; }
  const fwd = ((bd.ask - st) % 720 + 720) % 720;
  if (fwd <= unit / 2) err(tag + ': 시작 자리가 자석 반경 안 (' + fwd + '분)');
  if (fwd >= 60) err(tag + ': 시작 자리가 한 바퀴 밖 (' + fwd + '분)');
});
/* ⑪-5 시간이 흐르는 거리는 **아이가 맞춘 시각**에서 잰다 — 카드 시각에서 재면 벌점이 된다
 * (카드와 다르게 맞췄을 때만 오래 기다리게 되면, 그것이 곧 벌이다) */
for (let a = 0; a < 720; a += 5) {
  const from = D.wakeRunFrom(a);
  const gap = ((a - from) % 720 + 720) % 720;
  if (gap !== D.WAKE_RUN) err('방② 시간 흐름: 알람 ' + a + '분에서 도는 거리가 ' + gap + '분 (늘 ' + D.WAKE_RUN + '분이어야 함)');
  if (!Number.isInteger(from) || from < 0 || from > 719) err('방② 시간 흐름: 출발 자리가 0~719 밖 — ' + from);
}

/* ⑪-6 잠꾸러기 그림 — 회전 없이 좌표로만 */
S.forEach(p => {
  ['sleep'].concat(p.wakes.map(k => k.pose)).forEach(pose => {
    const svg = D.sleeperSVG(p.id, pose, 'v' + p.id + pose);
    if (typeof svg !== 'string' || svg.indexOf('<svg') < 0 || svg.indexOf('</svg>') < 0) err('잠꾸러기 ' + p.id + '/' + pose + ': SVG 문자열 오류');
    if (/transform=/.test(svg)) err('잠꾸러기 ' + p.id + '/' + pose + ': SVG 에 transform 이 있음 — 좌표로 그릴 것');
    if (/[\u{1F300}-\u{1FAFF}]/u.test(svg)) err('잠꾸러기 ' + p.id + '/' + pose + ': 이모지가 섞임');
  });
});
if (D.sleeperSVG('bear', 'jump', 'uidA') === D.sleeperSVG('bear', 'jump', 'uidB')) err('sleeperSVG: uid 가 반영되지 않음(그라데이션 id 충돌 위험)');
// 자세마다 그림이 실제로 달라야 한다 — 표만 다르고 그림이 같으면 반응이 다른 척만 하는 것이다
{
  const drawn = Object.keys(D.POSES).map(k => D.sleeperSVG('bear', k, 'same'));
  if (new Set(drawn).size !== drawn.length) err('잠꾸러기 자세 그림이 서로 같다 — 반응이 달라 보이지 않는다');
}

/* ══════════════════════════════════════════════════════════════════
 *            ⑫ 방③ 🍚 내 하루 만들기 — 정답이 없다
 * ══════════════════════════════════════════════════════════════════ */
const DC = D.DAY_CARDS || [];
if (DC.length < 12 || DC.length > 16) err('하루 카드는 12~16종이어야 함 — ' + DC.length);
const NO_ANSWER = ['answer', 'correct', 'right', 'score', 'goal', 'hour', 'slot', 'target'];
const cardIds = new Set();
DC.forEach(c => {
  const tag = '하루 카드 ' + (c.id || '?');
  if (!c.id || !c.name || !c.say) err(tag + ': id/이름/대사 누락');
  if (cardIds.has(c.id)) err(tag + ': id 중복');
  cardIds.add(c.id);
  if (['day', 'night'].indexOf(c.kind) < 0) err(tag + ': kind 는 day/night — ' + c.kind);
  if (typeof c.food !== 'boolean') err(tag + ': food 는 true/false');
  /* ⚠️ 정답 필드 금지 — 「이 카드는 몇 시가 맞다」를 데이터에 적는 순간 이 방은 죽는다.
   * hour·slot·target 까지 막는 것은, 「어울리는 자리」라는 이름으로 정답이 슬쩍 들어오는
   * 것이 가장 흔한 길이기 때문이다. */
  NO_ANSWER.forEach(k => { if (k in c) err(tag + ': 정답 필드(' + k + ')가 생겼다 — 이 방에 정답은 없다'); });
  if (!D.dayCardOf(c.id)) err(tag + ': dayCardOf 조회 실패');
});
if (DC.filter(c => c.food).length < 3) err('밥 카드가 3종 미만 — 배가 빵빵해지는 웃음을 만들 수 없다');
if (!DC.some(c => c.kind === 'night')) err('밤에 하는 카드가 없다 — 낮에 놓았을 때의 웃음이 없다');
// 낮 자리·밤 자리 여섯씩, 열두 자리를 빠짐없이 나눈다
if (!Array.isArray(D.NIGHT_HOURS) || D.NIGHT_HOURS.length !== 6) err('밤 자리는 6칸이어야 함 — ' + (D.NIGHT_HOURS || []).length);
{
  let night = 0;
  for (let h = 1; h <= 12; h++) if (D.isNightHour(h)) night++;
  if (night !== 6) err('밤 자리가 6칸이 아님 — ' + night);
  if (!Array.isArray(D.DAY_ORDER) || D.DAY_ORDER.length !== 12) err('재생 차례가 12칸이 아님');
  if (new Set(D.DAY_ORDER).size !== 12) err('재생 차례에 같은 자리가 두 번 나옴');
  D.DAY_ORDER.forEach(h => { if (h < 1 || h > 12) err('재생 차례에 시계에 없는 자리 — ' + h); });
  if (D.isNightHour(D.DAY_ORDER[0])) err('재생이 밤에서 시작한다 — 하루는 아침에서 시작해야 읽힌다');
}

/* ⑫-2 장면 그림 — 웃음이 그림으로 실제로 갈린다 */
DC.forEach(c => {
  const dayPic = D.daySceneSVG(c.id, { hour: 6, tummy: 0 });      // 낮 자리
  const nightPic = D.daySceneSVG(c.id, { hour: 2, tummy: 0 });    // 밤 자리
  const tag = '하루 장면 ' + c.id;
  [['낮', dayPic], ['밤', nightPic]].forEach(([w, svg]) => {
    if (typeof svg !== 'string' || svg.indexOf('<svg') < 0 || svg.indexOf('</svg>') < 0) err(tag + '(' + w + '): SVG 문자열 오류');
    if (/transform=/.test(svg)) err(tag + '(' + w + '): SVG 에 transform 이 있음 — 좌표로 그릴 것');
    if (/[\u{1F300}-\u{1FAFF}]/u.test(svg)) err(tag + '(' + w + '): 이모지가 섞임');
  });
  if (dayPic === nightPic) err(tag + ': 낮 자리와 밤 자리 그림이 같다 — 이상하게 놓아도 안 웃기다');
  // 배가 부푼다
  if (c.food) {
    const t0 = D.daySceneSVG(c.id, { hour: 6, tummy: 0 });
    const t3 = D.daySceneSVG(c.id, { hour: 6, tummy: 3 });
    if (t0 === t3) err(tag + ': 여러 번 먹어도 배가 그대로다');
  }
  if (D.dayPropSVG(c.id).length < 40) err(tag + ': 소품 그림이 비었다');
});
// 낮 것을 밤에 놓으면 창밖에 부엉이가 온다 (요구된 웃음 포인트다)
{
  const bathNight = D.daySceneSVG('bath', { hour: 3, tummy: 0 });
  const bathDay = D.daySceneSVG('bath', { hour: 6, tummy: 0 });
  if (bathNight.indexOf('#8B6A4F') < 0) err('새벽에 목욕을 놓았는데 창밖에 부엉이가 없다');
  if (bathDay.indexOf('#8B6A4F') >= 0) err('낮에 목욕을 놓았는데 부엉이가 와 있다');
  const sleepDay = D.daySceneSVG('sleep', { hour: 6, tummy: 0 });
  const sleepNight = D.daySceneSVG('sleep', { hour: 1, tummy: 0 });
  if (sleepDay === sleepNight) err('잠을 낮에 놓아도 밤에 놓은 것과 같다');
}

/* ══════════ ⑬ 말 계약 — 두 갈래, 겹치지 않는다 ══════════
 * ① 시각 안내는 readTime 한마디뿐이고, ② 장면 대사에는 시각이 한 글자도 안 섞인다.
 * 「검사를 느슨하게 고치는 것」과 「계약을 정확히 다시 적는 것」은 다르다 — 여기는 후자다. */
const times = D.SPEECH.times();
const scenes = D.SPEECH.scenes();
if (!times.length || !scenes.length) err('말 계약: 집합이 비어 있음');
if (D.SPEECH.all().length !== times.length + scenes.length) err('말 계약: all() 이 두 집합의 합이 아님');
{
  const tset = new Set(times);
  scenes.forEach(s => { if (tset.has(s)) err('말 계약: 장면 대사가 시각 읽기와 겹침 — ' + s); });
}
const BAD_WORDS = ['늦', '지각', '빨리', '얼른', '큰일', '혼나', '틀렸', '틀려', '잘못', '실패', '안 돼', '안돼', '왜 안', '땡'];
scenes.forEach(s => {
  const tag = '장면 대사 「' + s + '」';
  if (/[0-9]/.test(s)) err(tag + ': 숫자가 섞임 — 시각 안내가 아니다');
  if (/시|분/.test(s)) err(tag + ': 시각을 가리키는 글자가 섞임 — 시각은 시각 한마디로만 말한다');
  if (s.length > 8) err(tag + ': 너무 길다(' + s.length + '자) — 장면 대사는 짧다');
  if (/[\u{1F300}-\u{1FAFF}]/u.test(s)) err(tag + ': 이모지가 섞임');
  BAD_WORDS.forEach(bw => { if (s.indexOf(bw) >= 0) err(tag + ': 재촉·야단 낱말 「' + bw + '」'); });
});
// 잠꾸러기 대사·카드 이름이 빠짐없이 집합에 들어 있어야 한다(e2e 가 이 집합으로 대조한다)
{
  const sset = new Set(scenes);
  sayAll.forEach(([where, s]) => { if (!sset.has(s)) err(where + ': SPEECH.scenes() 에 없는 대사 — ' + s); });
  DC.forEach(c => { if (!sset.has(c.say)) err('하루 카드 ' + c.id + ': SPEECH.scenes() 에 없는 대사'); });
}
// 이름·설명에도 재촉·야단이 없다
[].concat(
  S.map(p => ['잠꾸러기 이름 ' + p.id, p.name]),
  DC.map(c => ['하루 카드 이름 ' + c.id, c.name]),
  (D.ROOMS || []).map(r => ['방 설명 ' + r.id, r.desc]),
  (D.WAKE_STAGES || []).map(s => ['방② 단계 설명 ' + s.id, s.desc])
).forEach(([where, text]) => {
  BAD_WORDS.forEach(bw => { if (String(text).indexOf(bw) >= 0) err(where + ': 재촉·야단 낱말 「' + bw + '」 — ' + text); });
});

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터·계약 검증 통과 — 방 ' + D.ROOMS.length + '개(셋 다 열림)\n' +
  '   방① 단계 ' + D.STAGES.length + '개(60/30/15/5분) · 판 ' + D.BOARDS.length + '개 · 새 ' + D.BIRDS.length + '종 · ' +
  '각도↔분 고정표 ' + (ANGLES.length * Object.keys(EXPECT).length) + '칸 대조\n' +
  '   방② 단계 ' + D.WAKE_STAGES.length + '개(60/30분) · 판 ' + WB.length + '개 · 잠꾸러기 ' + S.length + '종 · ' +
  '깨어나는 장면 ' + S.reduce((n, p) => n + p.wakes.length, 0) + '개 · 무벌점(판정 필드 0)\n' +
  '   방③ 하루 카드 ' + DC.length + '종(밥 ' + DC.filter(c => c.food).length + ') · 자리 12(밤 6) · 정답 필드 0\n' +
  '   말 계약 — 시각 ' + times.length + '마디 · 장면 대사 ' + scenes.length + '마디, 겹침 0');
