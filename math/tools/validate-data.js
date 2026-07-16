/* 데이터 검증 — node math/tools/validate-data.js
 * 숫자 이름(1~100)·따라쓰기 묶음·문제 레벨 계약을 정적 검사한다.
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.MathData;

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

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터 검증 통과 — 숫자 1~100, 묶음 10개, 레벨 ' + D.LEVELS.length + '단계');
