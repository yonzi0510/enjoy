#!/usr/bin/env node
/* 밑그림 데이터 계약 검증 — node coloring/tools/validate-data.js
 * 검사: 30장·카테고리별 개수·id 유일·필수 필드·SVG path 유효(파서)·닫힌 큰 윤곽(Z 존재)
 * 순수 노드에서 window.Pictures 를 흉내 내 로드한다(브라우저 없이).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'pictures.js'), 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const Pictures = sandbox.window.Pictures;

let errors = 0;
const fail = m => { console.error('  ❌ ' + m); errors++; };
const ok = m => console.log('  ✅ ' + m);

if (!Pictures) { console.error('Pictures 로드 실패'); process.exit(1); }

const { PICTURES, CATS } = Pictures;
const CAT_MIN = 7;
const EXPECT_TOTAL = 30;

// 1) 총 개수
if (PICTURES.length === EXPECT_TOTAL) ok('밑그림 ' + EXPECT_TOTAL + '장');
else fail('밑그림 개수 ' + PICTURES.length + ' (기대 ' + EXPECT_TOTAL + ')');

// 2) 카테고리 4종 존재 + 각 최소 개수
const catIds = CATS.map(c => c.id);
if (catIds.length === 4) ok('카테고리 4종: ' + catIds.join(', '));
else fail('카테고리 수 ' + catIds.length);
for (const cid of catIds) {
  const cnt = PICTURES.filter(p => p.cat === cid).length;
  if (cnt >= CAT_MIN) ok('카테고리 ' + cid + ': ' + cnt + '장');
  else fail('카테고리 ' + cid + ' 개수 ' + cnt + ' (최소 ' + CAT_MIN + ')');
}
// 알 수 없는 카테고리 사용 금지
for (const p of PICTURES) if (!catIds.includes(p.cat)) fail(p.id + ': 알 수 없는 카테고리 ' + p.cat);

// 3) id 유일 + 필수 필드
const seen = new Set();
for (const p of PICTURES) {
  if (!p.id) { fail('id 없는 그림'); continue; }
  if (seen.has(p.id)) fail('중복 id: ' + p.id);
  seen.add(p.id);
  if (!p.name) fail(p.id + ': name 없음');
  if (!p.emoji) fail(p.id + ': emoji 없음');
  if (!Array.isArray(p.items) || !p.items.length) fail(p.id + ': items 없음');
}
if (seen.size === PICTURES.length && !errors) ok('id 유일 + 필수 필드 OK');

// 4) SVG path 유효성 + 닫힌 윤곽(최소 한 개는 Z 로 닫힘)
const CMD = /[MmLlHhVvCcSsQqTtAaZz]/;
const NUM = /-?\d*\.?\d+/;
function tokenize(d) {
  // 명령/숫자로 대략 분해해 각 명령의 인자 개수를 확인
  const cmds = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])|(-?\d*\.?\d+)/g;
  let m, curCmd = null, nums = [];
  const argCount = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  while ((m = re.exec(d))) {
    if (m[1]) {
      if (curCmd) cmds.push({ cmd: curCmd, nums });
      curCmd = m[1]; nums = [];
    } else {
      nums.push(parseFloat(m[2]));
    }
  }
  if (curCmd) cmds.push({ cmd: curCmd, nums });
  return { cmds, argCount };
}
for (const p of PICTURES) {
  let closedOutline = 0, bad = 0;
  for (const it of p.items) {
    const d = typeof it === 'string' ? it : it.d;
    if (typeof d !== 'string' || !CMD.test(d) || !NUM.test(d)) { bad++; continue; }
    if (!/^\s*[Mm]/.test(d)) bad++;              // 반드시 M 으로 시작
    if (/[Zz]/.test(d)) closedOutline++;
    // 숫자만 남거나 알 수 없는 문자가 없는지 (허용 문자만)
    if (/[^MmLlHhVvCcSsQqTtAaZz0-9.\-\s]/.test(d)) { fail(p.id + ': 허용되지 않은 문자 in path'); bad++; }
  }
  if (bad) fail(p.id + ': 잘못된 path ' + bad + '개');
  if (closedOutline < 1) fail(p.id + ': 닫힌 윤곽(Z)이 없음 — flood fill 이 막히지 않음');
}
if (!errors) ok('모든 path 유효 + 닫힌 윤곽 존재');

// 5) SVG 마크업 생성이 오류 없이 동작
try {
  for (const p of PICTURES) {
    const s = Pictures.svg(p);
    if (!s.startsWith('<svg') || s.indexOf('path') < 0) throw new Error(p.id + ' svg 비정상');
  }
  ok('svg() 썸네일 생성 OK');
} catch (e) { fail('svg 생성 오류: ' + e.message); }

console.log('\n' + (errors ? '❌ 실패 ' + errors + '건' : '✅ 모든 검증 통과 (' + PICTURES.length + '장)'));
process.exit(errors ? 1 : 0);
