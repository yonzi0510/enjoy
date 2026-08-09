#!/usr/bin/env node
/* 알파벳 획순 계약 검증 — node english/tools/validate-alphabet.js
 * 52자가 다 있는지, 획 좌표가 규격 안에 있는지, 이름·소리·낱말이 갖춰졌는지 본다.
 * 사전(js/dict/*.js)에 없는 낱말은 오류가 아니라 참고 경고로만 알린다.
 */
'use strict';

const fs = require('fs');
const path = require('path');

global.window = {};
require('../js/alphabet.js');
const D = global.window.AlphabetData;

let errors = 0, warns = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }
function warn(msg) { warns++; console.warn('⚠️  ' + msg); }

// ── 사전 낱말 모으기 (참고용) ────────────────────────────────
const dictEn = new Set();
try {
  const dictDir = path.join(__dirname, '..', 'js', 'dict');
  const sandbox = { WORDS: [], CATS: [] };
  global.window = sandbox; globalThis.WORDS = sandbox.WORDS; globalThis.CATS = sandbox.CATS;
  fs.readdirSync(dictDir).filter(f => f.endsWith('.js')).sort()
    .forEach(f => require(path.join(dictDir, f)));
  (globalThis.WORDS || []).forEach(w => dictEn.add(w.en));
} catch (e) {
  warn('사전을 읽지 못했다 — 낱말 대조는 건너뛴다 (' + e.message + ')');
}

// ── 규격 ────────────────────────────────────────────────────
const UPPER_CH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const LOWER_CH = 'abcdefghijklmnopqrstuvwxyz'.split('');
const HANGUL = /^[가-힣]+$/;                 // name·sound 는 한글만
const EN_WORD = /^[a-z][a-z' -]*[a-z]$/;      // 낱말은 영소문자(공백·하이픈 허용)
const EMOJI = /\p{Extended_Pictographic}/u;
const MIN_SPAN = 45;   // 글자의 긴 쪽은 최소 이만큼 — 격자에서 너무 작아 보이면 안 된다
const MIN_THIN = 20;   // 가로·세로가 둘 다 이보다 작으면 글자가 아니다
const MAX_STROKES = 5; // 다섯 살이 감당할 획 수
const BOTTOM_LO = 84, BOTTOM_HI = 99; // 밑줄(또는 내려긋는 획) 자리
const TOP_LO = 8, TOP_HI = 46;        // 글자 꼭대기 자리

function bbox(strokes) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  strokes.forEach(s => s.forEach(p => {
    x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]);
    y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]);
  }));
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

function polyLen(s) {
  let d = 0;
  for (let i = 1; i < s.length; i++) d += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
  return d;
}

// ── 낱낱의 글자 검사 ────────────────────────────────────────
function checkLetter(l, expectCh) {
  const tag = '[' + (l && l.ch) + ']';
  if (!l || l.ch !== expectCh) { err(tag + ' 글자 순서가 어긋남 — ' + expectCh + ' 자리'); return; }
  if (!HANGUL.test(l.name || '')) err(tag + ' name 이 한글이 아님: ' + l.name);
  if (!HANGUL.test(l.sound || '')) err(tag + ' sound 가 한글이 아님: ' + l.sound);

  // 획
  if (!Array.isArray(l.strokes) || l.strokes.length === 0) { err(tag + ' 획이 없음'); return; }
  if (l.strokes.length > MAX_STROKES) warn(tag + ' 획이 ' + l.strokes.length + '개 — 다섯 살에게 많다');
  l.strokes.forEach((s, i) => {
    const st = tag + ' 획' + (i + 1);
    if (!Array.isArray(s) || s.length < 2) { err(st + ': 점이 2개 미만 (점 하나짜리 획은 짧은 선분으로)'); return; }
    s.forEach(p => {
      if (!Array.isArray(p) || p.length !== 2 || p.some(v => typeof v !== 'number' || !isFinite(v) || v < 0 || v > 100)) {
        err(st + ': 좌표가 숫자 0~100 이 아님 ' + JSON.stringify(p));
      }
    });
    const len = polyLen(s);
    if (len < 4) warn(st + ': 길이 ' + len.toFixed(1) + ' — 너무 짧다');
    // 겹친 점(길이 0 구간)은 리샘플에서 헛돈다
    for (let k = 1; k < s.length; k++) {
      if (Math.hypot(s[k][0] - s[k - 1][0], s[k][1] - s[k - 1][1]) === 0) { warn(st + ': 같은 점이 이어짐 ' + JSON.stringify(s[k])); break; }
    }
    // 곡선은 촘촘해야 채점이 따라온다.
    // 꺾임(V·L·Z 처럼 한 번에 크게 도는 자리)은 점이 적어도 되지만,
    // 완만하게 계속 도는 획(=곡선)인데 점이 적으면 리샘플이 곡선을 각지게 깎는다.
    let turnSum = 0, turnMax = 0;
    for (let k = 1; k < s.length - 1; k++) {
      const a1 = Math.atan2(s[k][1] - s[k - 1][1], s[k][0] - s[k - 1][0]);
      const a2 = Math.atan2(s[k + 1][1] - s[k][1], s[k + 1][0] - s[k][0]);
      let d = Math.abs((a2 - a1) * 180 / Math.PI) % 360;
      if (d > 180) d = 360 - d;
      turnSum += d; turnMax = Math.max(turnMax, d);
    }
    if (turnSum >= 60 && turnMax <= 45 && s.length < 12) {
      warn(st + ': 곡선인데 점이 ' + s.length + '개뿐 (12점 이상 권장)');
    }
  });

  // 크기·자리
  const b = bbox(l.strokes);
  if (Math.max(b.w, b.h) < MIN_SPAN) err(tag + ' 글자가 너무 작다 — ' + b.w.toFixed(0) + '×' + b.h.toFixed(0));
  if (b.w < MIN_THIN && b.h < MIN_THIN) err(tag + ' 가로·세로가 둘 다 ' + MIN_THIN + ' 미만 — ' + b.w.toFixed(0) + '×' + b.h.toFixed(0));
  const cx = (b.x0 + b.x1) / 2;
  if (Math.abs(cx - 50) > 20) warn(tag + ' 좌우로 치우침 — 가운데 x=' + cx.toFixed(1));
  if (b.y1 < BOTTOM_LO || b.y1 > BOTTOM_HI) warn(tag + ' 밑줄이 안 맞음 — 맨 아래 y=' + b.y1.toFixed(1));
  if (b.y0 < TOP_LO || b.y0 > TOP_HI) warn(tag + ' 꼭대기가 안 맞음 — 맨 위 y=' + b.y0.toFixed(1));

  // 낱말
  if (!Array.isArray(l.words) || l.words.length < 2) { err(tag + ' 낱말이 2개 미만'); return; }
  if (l.words.length > 3) warn(tag + ' 낱말이 ' + l.words.length + '개 — 2~3개가 알맞다');
  l.words.forEach(w => {
    if (!w || !w.w || !w.k || !w.e) { err(tag + ' 낱말에 w/k/e 가 빠짐 ' + JSON.stringify(w)); return; }
    if (!EN_WORD.test(w.w)) err(tag + ' 낱말이 영소문자가 아님: ' + w.w);
    if (w.w[0] !== l.ch.toLowerCase()) err(tag + ' 낱말 ' + w.w + ' 은 ' + l.ch + ' 로 시작하지 않음');
    if (!HANGUL.test(w.k.replace(/\s/g, ''))) err(tag + ' 뜻이 한글이 아님: ' + w.k);
    if (!EMOJI.test(w.e)) err(tag + ' 이모지가 아님: ' + w.e);
    if (dictEn.size && !dictEn.has(w.w)) warn(tag + ' 낱말 ' + w.w + ' 은 사전(js/dict)에 없다');
  });
}

// ── 묶음 검사 ───────────────────────────────────────────────
if (!D) { console.error('❌ window.AlphabetData 가 없다'); process.exit(1); }
if (D.UPPER.length !== 26) err('대문자가 26자가 아님: ' + D.UPPER.length);
if (D.LOWER.length !== 26) err('소문자가 26자가 아님: ' + D.LOWER.length);
if (D.all.length !== 52) err('all 이 52자가 아님: ' + D.all.length);

const seen = new Set();
D.all.forEach(l => {
  if (seen.has(l.ch)) err('ch 가 겹침: ' + l.ch);
  seen.add(l.ch);
});

UPPER_CH.forEach((ch, i) => checkLetter(D.UPPER[i], ch));
LOWER_CH.forEach((ch, i) => checkLetter(D.LOWER[i], ch));

// 대문자·소문자 짝은 이름과 소리가 같아야 한다
UPPER_CH.forEach((ch, i) => {
  const u = D.UPPER[i], v = D.LOWER[i];
  if (!u || !v) return;
  if (u.name !== v.name) err(ch + '/' + v.ch + ' 이름이 다름: ' + u.name + ' vs ' + v.name);
  if (u.sound !== v.sound) err(ch + '/' + v.ch + ' 소리가 다름: ' + u.sound + ' vs ' + v.sound);
});

// find() 계약
if (typeof D.find !== 'function' || !D.find('A') || D.find('a').ch !== 'a') err('find(ch) 가 제대로 없다');

// ── 결과 ────────────────────────────────────────────────────
const strokeCounts = D.all.map(l => l.strokes.length);
const ptCounts = D.all.map(l => l.strokes.reduce((n, s) => n + s.length, 0));
const avg = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);

if (errors === 0) {
  console.log('✅ 알파벳 검증 통과 — 52자, 낱말 ' + D.all.reduce((n, l) => n + l.words.length, 0) + '개');
  console.log('   획수: 평균 ' + avg(strokeCounts) + ' · 최대 ' + Math.max(...strokeCounts) +
    ' · 최소 ' + Math.min(...strokeCounts));
  console.log('   점수: 글자당 평균 ' + avg(ptCounts) + ' · 최대 ' + Math.max(...ptCounts));
  if (warns) console.log('   (경고 ' + warns + '건)');
} else {
  console.error(errors + '개 오류, ' + warns + '개 경고');
  process.exit(1);
}
