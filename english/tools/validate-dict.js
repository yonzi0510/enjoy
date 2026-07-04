/* 사전 계약 검증기 — 사용법: node english/tools/validate-dict.js [최소단어수]
 * 모든 dict/*.js를 로드해 스키마·중복·이모지·카테고리를 검사한다.
 */
const fs = require('fs');
const path = require('path');

const MIN_TOTAL = +(process.argv[2] || 0);

global.window = globalThis;
const dictDir = path.join(__dirname, '..', 'js', 'dict');
fs.readdirSync(dictDir).filter(f => f.endsWith('.js')).sort().forEach(f => require(path.join(dictDir, f)));

const WORDS = globalThis.WORDS || [];
const CATS = globalThis.CATS || [];
const errs = [];
const warn = [];

const HANGUL = /^[가-힣\s]+$/;
const ENGLISH = /^[a-z][a-z ]*$/;
const EMOJI_RE = /\p{Extended_Pictographic}/u;

if (!CATS.length) errs.push('CATS가 비어 있음');
const catIds = new Set(CATS.map(c => c.id));
if (catIds.size !== CATS.length) errs.push('CATS id 중복');
CATS.forEach(c => {
  if (!c.name || !c.emoji) errs.push('카테고리 ' + c.id + ': name/emoji 누락');
});

const enSeen = new Map();
const koSeen = new Map();

WORDS.forEach((w, i) => {
  const tag = w.en || w.ko || ('#' + i);
  if (!w.ko || !HANGUL.test(w.ko)) errs.push(tag + ': ko는 한글이어야 함 ("' + w.ko + '")');
  if (!w.en || !ENGLISH.test(w.en)) errs.push(tag + ': en은 소문자 영문이어야 함 ("' + w.en + '")');
  if (!w.read || !HANGUL.test(w.read)) errs.push(tag + ': read는 한글 발음 표기여야 함 ("' + w.read + '")');
  if (!w.emoji || !EMOJI_RE.test(w.emoji)) errs.push(tag + ': emoji 누락/비이모지');
  if (!catIds.has(w.cat)) errs.push(tag + ': 존재하지 않는 cat "' + w.cat + '"');
  if (w.alt && !Array.isArray(w.alt)) errs.push(tag + ': alt는 배열이어야 함');
  (w.alt || []).forEach(a => { if (!HANGUL.test(a)) errs.push(tag + ': alt "' + a + '"는 한글이어야 함'); });

  if (enSeen.has(w.en)) errs.push('en 중복: "' + w.en + '" (' + enSeen.get(w.en) + ' ↔ ' + w.ko + ')');
  enSeen.set(w.en, w.ko);

  [w.ko].concat(w.alt || []).forEach(k => {
    if (koSeen.has(k) && koSeen.get(k) !== w.en) warn.push('한국어 키 중복: "' + k + '" (' + koSeen.get(k) + ' ↔ ' + w.en + ') — 먼저 등록된 쪽만 매칭됨');
    koSeen.set(k, w.en);
    if (k.length === 1) warn.push(tag + ': 1글자 키 "' + k + '" — 오탐 가능, 가급적 2글자 이상 권장');
  });
});

console.log('카테고리별 단어 수:');
CATS.forEach(c => {
  const n = WORDS.filter(w => w.cat === c.id).length;
  console.log('  ' + c.emoji + ' ' + c.name + ' (' + c.id + '): ' + n + '개');
});
console.log('총 ' + WORDS.length + '개');
if (MIN_TOTAL && WORDS.length < MIN_TOTAL) errs.push('총 단어 수 ' + WORDS.length + ' < 최소 ' + MIN_TOTAL);

if (warn.length) { console.log('⚠️ 경고 ' + warn.length + '건:'); warn.slice(0, 20).forEach(w => console.log('  - ' + w)); }
if (errs.length) {
  console.log('❌ 실패 ' + errs.length + '건:');
  errs.slice(0, 40).forEach(e => console.log('  - ' + e));
  process.exit(1);
}
console.log('✅ 사전 계약 통과');
