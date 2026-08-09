/* 일본어 낱말 사전 계약 검증기 — 사용법: node shared/tools/validate-dict-ja.js [최소낱말수]
 *
 * shared/dict-ja/*.js 를 모두 읽어 스키마·중복·이모지·갈래를 검사하고,
 * 영어 사전(english/js/dict/*.js)과 겹치는 ko 가 몇 개인지 세어 준다.
 * 겹칠수록 좋다 — "영어로 뭐야"와 "일본어로 뭐야"가 같은 낱말에서 둘 다 답이 나온다.
 */
const fs = require('fs');
const path = require('path');

const MIN_TOTAL = +(process.argv[2] || 0);
const ROOT = path.join(__dirname, '..', '..');

/* --- 일본어 사전 읽기 --- */
global.window = globalThis;
const jaDir = path.join(ROOT, 'shared', 'dict-ja');
fs.readdirSync(jaDir).filter(f => f.endsWith('.js')).sort().forEach(f => require(path.join(jaDir, f)));

const WORDS_JA = globalThis.WORDS_JA || [];
const CATS_JA = globalThis.CATS_JA || [];

const errs = [];
const warn = [];

const HANGUL = /^[가-힣\s]+$/;
// 히라가나 · 가타카나(장음표 ー 포함) · 한자만 허용. 라틴 글자·숫자·공백은 안 된다.
const JAPANESE = /^[぀-ゟ゠-ヿ一-鿿]+$/;
const HAS_KANJI = /[一-鿿]/;
// 한자 표기에는 오쿠리가나·가타카나가 섞일 수 있다 (お茶 · 消しゴム · 半ズボン)
const KANJI_FIELD = /^[぀-ゟ゠-ヿ一-鿿]+$/;
const EMOJI_RE = /\p{Extended_Pictographic}/u;

if (!CATS_JA.length) errs.push('CATS_JA가 비어 있음');
const catIds = new Set(CATS_JA.map(c => c.id));
if (catIds.size !== CATS_JA.length) errs.push('CATS_JA id 중복');
CATS_JA.forEach(c => {
  if (!c.name || !c.emoji) errs.push('갈래 ' + c.id + ': name/emoji 누락');
});

const koSeen = new Map();
const jaSeen = new Map();

WORDS_JA.forEach((w, i) => {
  const tag = w.ko || w.ja || ('#' + i);
  if (!w.ko || !HANGUL.test(w.ko)) errs.push(tag + ': ko는 한글이어야 함 ("' + w.ko + '")');
  if (!w.ja || !JAPANESE.test(w.ja)) errs.push(tag + ': ja는 일본어 문자(히라가나·가타카나·한자)여야 함 ("' + w.ja + '")');
  if (!w.read || !HANGUL.test(w.read)) errs.push(tag + ': read는 한글 발음 표기여야 함 ("' + w.read + '")');
  if (!w.emoji || !EMOJI_RE.test(w.emoji)) errs.push(tag + ': emoji 누락/비이모지');
  if (!catIds.has(w.cat)) errs.push(tag + ': 존재하지 않는 cat "' + w.cat + '"');
  if (w.alt && !Array.isArray(w.alt)) errs.push(tag + ': alt는 배열이어야 함');
  (w.alt || []).forEach(a => { if (!HANGUL.test(a)) errs.push(tag + ': alt "' + a + '"는 한글이어야 함'); });

  if (w.kanji !== undefined) {
    if (!KANJI_FIELD.test(w.kanji)) errs.push(tag + ': kanji는 일본어 문자여야 함 ("' + w.kanji + '")');
    else if (!HAS_KANJI.test(w.kanji)) errs.push(tag + ': kanji에 한자가 없음 ("' + w.kanji + '") — 없으면 필드를 빼라');
  }

  // ko 중복 금지 (대표·변형 모두)
  [w.ko].concat(w.alt || []).forEach(k => {
    if (koSeen.has(k)) errs.push('ko 중복: "' + k + '" (' + koSeen.get(k) + ' ↔ ' + w.ja + ')');
    koSeen.set(k, w.ja);
    if (k.length === 1) warn.push(tag + ': 1글자 키 "' + k + '" — 오탐 가능');
  });

  // 같은 ja 가 여러 낱말에 붙는 것은 막지 않는다(はな 꽃/코처럼 실제로 같다). 알려만 준다.
  if (jaSeen.has(w.ja)) warn.push('같은 일본어 "' + w.ja + '" (' + jaSeen.get(w.ja) + ' ↔ ' + w.ko + ') — 동음이의어인지 확인');
  jaSeen.set(w.ja, w.ko);
});

/* --- 영어 사전과 겹치는 ko 세기 --- */
let overlap = 0, onlyJa = [];
const enDir = path.join(ROOT, 'english', 'js', 'dict');
if (fs.existsSync(enDir)) {
  fs.readdirSync(enDir).filter(f => f.endsWith('.js')).sort().forEach(f => require(path.join(enDir, f)));
  const enKo = new Set();
  (globalThis.WORDS || []).forEach(w => { enKo.add(w.ko); (w.alt || []).forEach(a => enKo.add(a)); });
  WORDS_JA.forEach(w => {
    const hit = enKo.has(w.ko) || (w.alt || []).some(a => enKo.has(a));
    if (hit) overlap++; else onlyJa.push(w.ko);
  });
} else {
  warn.push('영어 사전 폴더를 찾지 못해 겹침 검사를 건너뜀');
}

/* --- 보고 --- */
console.log('갈래별 낱말 수:');
CATS_JA.forEach(c => {
  const n = WORDS_JA.filter(w => w.cat === c.id).length;
  console.log('  ' + c.name + ' (' + c.id + '): ' + n + '개');
});
console.log('총 ' + WORDS_JA.length + '개');
console.log('영어 사전과 겹치는 ko: ' + overlap + '개 (' +
  (WORDS_JA.length ? Math.round(overlap / WORDS_JA.length * 100) : 0) + '%)');
if (onlyJa.length) {
  console.log('  일본어에만 있는 ko ' + onlyJa.length + '개: ' + onlyJa.slice(0, 30).join(', ') +
    (onlyJa.length > 30 ? ' …' : ''));
}

if (MIN_TOTAL && WORDS_JA.length < MIN_TOTAL) errs.push('총 낱말 수 ' + WORDS_JA.length + ' < 최소 ' + MIN_TOTAL);

// 한 글자 키 경고는 수만 알리고, 살펴봐야 할 경고(동음이의어 등)를 먼저 보여 준다.
const short = warn.filter(w => w.includes('1글자 키'));
const notable = warn.filter(w => !w.includes('1글자 키'));
if (notable.length) { console.log('⚠️ 살펴볼 경고 ' + notable.length + '건:'); notable.forEach(w => console.log('  - ' + w)); }
if (short.length) console.log('⚠️ 1글자 키 ' + short.length + '건 (영어 사전과 같은 관행 — 오탐만 주의)');
if (errs.length) {
  console.log('❌ 실패 ' + errs.length + '건:');
  errs.slice(0, 40).forEach(e => console.log('  - ' + e));
  process.exit(1);
}
console.log('✅ 일본어 사전 계약 통과');
