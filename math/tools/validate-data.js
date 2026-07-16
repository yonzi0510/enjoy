/* 데이터 검증 — node math/tools/validate-data.js
 * 숫자 이름(1~100)·따라쓰기 묶음·문제 레벨·수 세기/숫자표 단계·점 잇기 도안 계약을 정적 검사한다.
 */
'use strict';

global.window = {};
require('../js/data.js');
require('../js/dots.js');
const D = global.window.MathData;
const DOTS = global.window.MathDots;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

// 숫자 이름 표본 검사
const expect = {
  1: '일', 7: '칠', 10: '십', 11: '십일', 20: '이십', 34: '삼십사',
  47: '사십칠', 60: '육십', 99: '구십구', 100: '백',
};
Object.entries(expect).forEach(([n, name]) => {
  const got = D.numName(+n);
  if (got !== name) err('numName(' + n + ') = "' + got + '" (기대: "' + name + '")');
});
for (let n = 1; n <= 100; n++) {
  if (!D.numName(n)) err('numName(' + n + ') 비어 있음');
}
if (D.traceSay(7).indexOf('일곱') < 0) err('traceSay(7)에 순우리말이 없음: ' + D.traceSay(7));
if (D.traceSay(47).indexOf('사십칠') < 0) err('traceSay(47): ' + D.traceSay(47));

// 따라쓰기 묶음: 1~100을 빠짐없이 덮는지
if (D.traceGroups.length !== 10) err('묶음이 10개여야 함');
let covered = 0;
D.traceGroups.forEach(g => {
  if (g.to - g.from !== 9) err('묶음 ' + g.id + ' 크기 오류');
  covered += 10;
});
if (covered !== 100) err('묶음 합계가 100이 아님');

// 레벨: 덧셈·뺄셈 문제가 항상 만들어지는지 (a≥1, b≥1, 답≥1)
D.LEVELS.forEach(lv => {
  if (lv.max < 3) err(lv.name + ': max 가 너무 작음');
});
if (!D.OBJECTS.length) err('세기 물건이 없음');
if (D.ROUND < 3) err('한 판 문제 수가 너무 적음');

// 수 세기 단계: 보기 3개를 만들 수 있고 5세에게 무리 없는 범위인지
if (!Array.isArray(D.COUNT_LEVELS) || D.COUNT_LEVELS.length < 2) err('수 세기 단계가 2개 이상이어야 함');
(D.COUNT_LEVELS || []).forEach(lv => {
  if (!(lv.max >= 3 && lv.max <= 10)) err('수 세기 ' + lv.name + ': max 범위(3~10) 오류 — ' + lv.max);
});

// 숫자표 단계: 1~100 안, 한 줄 10칸 맞춤, 빈칸 수가 말이 되는지
if (!Array.isArray(D.CHART_LEVELS) || D.CHART_LEVELS.length < 3) err('숫자표 단계가 3개 이상이어야 함');
(D.CHART_LEVELS || []).forEach(lv => {
  const total = lv.to - lv.from + 1;
  if (!(lv.from >= 1 && lv.to <= 100 && lv.from < lv.to)) err('숫자표 ' + lv.name + ': 범위 오류');
  if (total % 10 !== 0) err('숫자표 ' + lv.name + ': 칸 수(' + total + ')가 10의 배수가 아님 — 줄이 안 맞는다');
  if (!(lv.blanks >= 3 && lv.blanks < total)) err('숫자표 ' + lv.name + ': 빈칸 수 오류 — ' + lv.blanks);
});

// 점 잇기 도안: 그림 8개 이상, 점 10~20개(번호는 배열 순서 = 1부터 연속),
// 좌표는 viewBox 안, 점끼리 9 이상 떨어져야 한다(잘못 눌림 방지)
if (!DOTS || !Array.isArray(DOTS.PICTURES)) {
  err('점 잇기 도안(MathDots.PICTURES)이 없음');
} else {
  if (DOTS.PICTURES.length < 8) err('점 잇기 그림이 8개 이상이어야 함: ' + DOTS.PICTURES.length);
  const ids = new Set();
  DOTS.PICTURES.forEach(p => {
    const tag = '점 잇기 ' + (p.id || '?');
    if (!p.id || ids.has(p.id)) err(tag + ': id 누락/중복');
    ids.add(p.id);
    if (!p.name || !p.emoji) err(tag + ': 이름·이모지 누락');
    if (!/^#[0-9A-Fa-f]{6}$/.test(p.color || '')) err(tag + ': 채움색 형식 오류 — ' + p.color);
    if (!Array.isArray(p.dots) || p.dots.length < 10 || p.dots.length > 20) {
      err(tag + ': 점 수(10~20) 오류 — ' + (Array.isArray(p.dots) ? p.dots.length : '없음'));
      return;
    }
    p.dots.forEach((d, i) => {
      if (!Array.isArray(d) || d.length !== 2 || !d.every(v => Number.isFinite(v))) {
        err(tag + ': ' + (i + 1) + '번 점 좌표 형식 오류');
      } else if (d[0] < 0 || d[0] > DOTS.VIEW || d[1] < 0 || d[1] > DOTS.VIEW) {
        err(tag + ': ' + (i + 1) + '번 점이 viewBox(0~' + DOTS.VIEW + ') 밖 — ' + d);
      }
    });
    for (let i = 0; i < p.dots.length; i++) {
      for (let j = i + 1; j < p.dots.length; j++) {
        const dist = Math.hypot(p.dots[i][0] - p.dots[j][0], p.dots[i][1] - p.dots[j][1]);
        if (dist < 9) err(tag + ': ' + (i + 1) + '번과 ' + (j + 1) + '번 점이 너무 가까움(' + dist.toFixed(1) + ')');
      }
    }
  });
}

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터 검증 통과 — 숫자 1~100, 묶음 10개, 레벨 ' + D.LEVELS.length + '단계, 수 세기 ' +
  D.COUNT_LEVELS.length + '단계, 숫자표 ' + D.CHART_LEVELS.length + '단계, 점 잇기 그림 ' + DOTS.PICTURES.length + '개');
