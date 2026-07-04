#!/usr/bin/env node
/* 데이터 검증 — node hangul/tools/validate-data.js
 * 글자 수, 획 좌표 범위, 낱말·이모지 존재, 낱말 첫소리가 글자와 일치하는지 확인
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.HangulData;

const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

if (D.consonants.length !== 14) err('자음이 14자가 아님: ' + D.consonants.length);
if (D.vowels.length !== 10) err('모음이 10자가 아님: ' + D.vowels.length);

D.all.forEach(l => {
  const tag = l.ch + '(' + l.name + ')';
  if (!l.ch || !l.name) err(tag + ': ch/name 누락');
  if (!Array.isArray(l.strokes) || l.strokes.length === 0) err(tag + ': 획 없음');
  l.strokes.forEach((s, i) => {
    if (s.length < 2) err(tag + ' 획' + (i + 1) + ': 점이 2개 미만');
    s.forEach(p => {
      if (!Array.isArray(p) || p.length !== 2 || p.some(v => typeof v !== 'number' || v < 0 || v > 100)) {
        err(tag + ' 획' + (i + 1) + ': 좌표 범위(0~100) 벗어남 ' + JSON.stringify(p));
      }
    });
  });
  if (!Array.isArray(l.words) || l.words.length < 2) err(tag + ': 낱말이 2개 미만');
  l.words.forEach(w => {
    if (!w.w || !w.e) { err(tag + ': 낱말/이모지 누락 ' + JSON.stringify(w)); return; }
    const c = w.w.charCodeAt(0);
    if (c < 0xAC00 || c > 0xD7A3) { err(tag + ': 첫 글자가 한글 음절이 아님 ' + w.w); return; }
    const cho = CHO[Math.floor((c - 0xAC00) / 588)];
    const jung = JUNG[Math.floor(((c - 0xAC00) % 588) / 28)];
    if (D.isConsonant(l.ch) && cho !== l.ch) err(tag + ': 낱말 ' + w.w + ' 첫소리가 ' + cho);
    if (!D.isConsonant(l.ch) && jung !== l.ch) err(tag + ': 낱말 ' + w.w + ' 첫 모음이 ' + jung);
  });
});

// 획 시작점이 캔버스 밖 안내점과 겹치지 않는지(획끼리 시작점 최소 간격) — 참고용 경고만
if (errors === 0) {
  console.log('✅ 데이터 검증 통과 — 자음 ' + D.consonants.length + '자, 모음 ' + D.vowels.length +
    '자, 낱말 ' + D.all.reduce((n, l) => n + l.words.length, 0) + '개');
} else {
  console.error(errors + '개 오류');
  process.exit(1);
}
