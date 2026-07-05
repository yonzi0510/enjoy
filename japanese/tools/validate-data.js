#!/usr/bin/env node
/* 데이터 검증 — node japanese/tools/validate-data.js
 * 행/글자 수, 획 좌표 범위, 낱말·이모지·뜻 존재, 낱말 첫 글자 일치 확인
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.KanaData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

if (D.rows.length !== 10) err('행이 10개가 아님: ' + D.rows.length);
if (D.all.length !== 46) err('글자가 46자가 아님: ' + D.all.length);
const gA = D.groupA.reduce((n, r) => n + r.kana.length, 0);
const gB = D.groupB.reduce((n, r) => n + r.kana.length, 0);
if (gA !== 25) err('앞 그룹(あ~な)이 25자가 아님: ' + gA);
if (gB !== 21) err('뒤 그룹(は~ん)이 21자가 아님: ' + gB);

D.all.forEach(k => {
  const tag = k.ch + '(' + k.romaji + ')';
  if (!k.ch || !k.romaji || !k.ko) err(tag + ': ch/romaji/ko 누락');
  if (!Array.isArray(k.strokes) || k.strokes.length === 0) err(tag + ': 획 없음');
  k.strokes.forEach((s, i) => {
    if (s.length < 2) err(tag + ' 획' + (i + 1) + ': 점이 2개 미만');
    s.forEach(p => {
      if (!Array.isArray(p) || p.length !== 2 || p.some(v => typeof v !== 'number' || v < 0 || v > 100)) {
        err(tag + ' 획' + (i + 1) + ': 좌표 범위(0~100) 벗어남 ' + JSON.stringify(p));
      }
    });
  });
  if (!Array.isArray(k.words) || k.words.length < 1) err(tag + ': 낱말 없음');
  k.words.forEach(w => {
    if (!w.w || !w.e || !w.ko) { err(tag + ': 낱말/이모지/뜻 누락 ' + JSON.stringify(w)); return; }
    if (!D.noFirstSound[k.ch] && w.w.charAt(0) !== k.ch) {
      err(tag + ': 낱말 ' + w.w + ' 첫 글자가 ' + w.w.charAt(0));
    }
    if (D.noFirstSound[k.ch] && w.w.indexOf(k.ch) === -1) {
      err(tag + ': 낱말 ' + w.w + ' 에 ' + k.ch + ' 이(가) 없음');
    }
  });
});

if (errors === 0) {
  console.log('✅ 데이터 검증 통과 — 히라가나 ' + D.all.length + '자, 낱말 ' +
    D.all.reduce((n, k) => n + k.words.length, 0) + '개');
} else {
  console.error(errors + '개 오류');
  process.exit(1);
}
