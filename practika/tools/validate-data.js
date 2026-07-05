#!/usr/bin/env node
/* 데이터 검증 — node practika/tools/validate-data.js
 * 다국어 트랙·레슨·대본·어휘 구조가 대화 엔진이 기대하는 형태인지 확인한다.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'data', 'lessons.js'), 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const { LANGS, TRACKS, LESSONS, TRACK_LESSONS } = sandbox.window;

let errors = 0;
function fail(msg) { errors++; console.error('  ❌ ' + msg); }
function ok(msg) { console.log('  ✅ ' + msg); }

const langIds = LANGS.map(l => l.id);
if (!Array.isArray(LANGS) || LANGS.length !== 3) fail('LANGS 는 3개(en·ja·zh)여야 함');
else ok('언어 ' + langIds.join('·'));
for (const l of LANGS) for (const k of ['id', 'label', 'flag', 'tts', 'stt', 'hello']) if (!l[k]) fail(`언어 ${l.id} 에 ${k} 없음`);

// 트랙: 각 언어 3트랙
for (const lang of langIds) {
  const n = TRACKS.filter(t => t.lang === lang).length;
  if (n !== 3) fail(`${lang} 트랙이 3개가 아님(${n})`);
}
ok('트랙 ' + TRACKS.length + '개');
for (const tr of TRACKS) {
  for (const k of ['id', 'lang', 'title', 'emoji', 'color', 'desc']) if (!tr[k]) fail(`트랙 ${tr.id || '?'} 에 ${k} 없음`);
  if (!TRACK_LESSONS[tr.id]) fail(`TRACK_LESSONS 에 ${tr.id} 없음`);
  if (!tr.id.startsWith(tr.lang + '-')) fail(`트랙 id(${tr.id}) 가 언어 접두어(${tr.lang}-)로 시작하지 않음`);
}

// 트랙 순서가 실제 레슨을 가리키는지
let lessonCount = 0;
for (const tid in TRACK_LESSONS) {
  for (const id of TRACK_LESSONS[tid]) {
    lessonCount++;
    const les = LESSONS[id];
    if (!les) { fail(`레슨 ${id} 정의 없음`); continue; }
    if (les.trackId !== tid) fail(`레슨 ${id} 의 trackId(${les.trackId}) 가 ${tid} 와 다름`);
  }
}
ok('레슨 ' + lessonCount + '개');

// 레슨 세부
let userTurns = 0;
for (const id in LESSONS) {
  const les = LESSONS[id];
  for (const k of ['lang', 'trackId', 'title', 'emoji', 'level', 'turns', 'vocab']) if (les[k] === undefined) fail(`${id} 에 ${k} 없음`);
  if (!langIds.includes(les.lang)) fail(`${id} 의 lang(${les.lang}) 이 LANGS 에 없음`);
  if (!id.startsWith(les.lang + '-')) fail(`${id} 가 언어 접두어로 시작하지 않음`);
  if (!Array.isArray(les.turns) || les.turns.length < 4) fail(`${id} turns 가 너무 짧음`);

  let hasUser = false;
  les.turns.forEach((t, i) => {
    if (t.speaker === 'tutor') {
      if (!t.t || !t.ko) fail(`${id} turn ${i} 튜터 대사에 t/ko 없음`);
      if (/[가-힣]/.test(t.t)) fail(`${id} turn ${i} 튜터 대사(t)에 한글이 섞임`);
    } else if (t.speaker === 'user') {
      hasUser = true; userTurns++;
      if (!t.ask) fail(`${id} turn ${i} 유저 턴에 ask 없음`);
      if (!t.model) fail(`${id} turn ${i} 유저 턴에 model 없음`);
      if (!Array.isArray(t.expect) || t.expect.length < 1) fail(`${id} turn ${i} 유저 턴에 expect 없음`);
      if (!t.expect.includes(t.model)) fail(`${id} turn ${i} expect 에 model 이 없음`);
      if (/[가-힣]/.test(t.model)) fail(`${id} turn ${i} model 에 한글이 섞임: ${t.model}`);
    } else {
      fail(`${id} turn ${i} speaker 가 tutor/user 가 아님`);
    }
  });
  if (!hasUser) fail(`${id} 에 유저 말하기 턴이 없음`);

  if (!Array.isArray(les.vocab) || les.vocab.length < 3) fail(`${id} vocab 가 3개 미만`);
  for (const v of (les.vocab || [])) {
    if (!v.t || !v.ko) fail(`${id} vocab 항목에 t/ko 없음`);
    if (/[가-힣]/.test(v.t)) fail(`${id} vocab(t)에 한글이 섞임: ${v.t}`);
  }
}
ok('유저 말하기 턴 ' + userTurns + '개');

if (errors) { console.error(`\n검증 실패: ${errors}건`); process.exit(1); }
console.log('\n✅ 모든 데이터 검증 통과');
