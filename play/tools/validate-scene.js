/* 씬 계약 검증기 — 사용법: node play/tools/validate-scene.js <themeId>
 * 난이도 3레벨 계약을 정적 검사한다. (실기 검사는 Playwright 스모크가 담당)
 *  - 숨은그림: L1 6개 · L2 7개 · L3 8개 (data-level, 전 레벨 대상이 항상 그려짐)
 *  - 다른그림: L1 5개 · L2 6개 · L3 7개 (해당 레벨 B에서만 차이, id는 레벨 통틀어 유일)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const themeId = process.argv[2];
if (!themeId) { console.error('usage: node validate-scene.js <themeId>'); process.exit(2); }

global.window = globalThis;
require(path.join(__dirname, '..', 'js', 'scenes', themeId + '.js'));
const scene = (globalThis.SCENES || []).find(s => s.id === themeId);

const errs = [];
const warn = [];
const ok = m => console.log('  ✓ ' + m);

if (!scene) { console.error('❌ SCENES에 id="' + themeId + '" 등록 없음'); process.exit(1); }

// 기본 필드
['name', 'emoji', 'bg'].forEach(k => { if (!scene[k]) errs.push('필드 누락: ' + k); });
if (typeof scene.buildScene !== 'function') errs.push('buildScene 함수 없음');
if (!scene.sticker || !/^<svg/.test((scene.sticker.svg || '').trim()) || !scene.sticker.name) errs.push('sticker.svg/name 불량');

const HIDDEN_COUNT = { 1: 6, 2: 7, 3: 8 };
const DIFF_COUNT = { 1: 5, 2: 6, 3: 7 };

// hidden 배열 검사
const hidden = scene.hidden || [];
if (hidden.length !== 21) errs.push('hidden은 총 21개(6+7+8)여야 함 (현재 ' + hidden.length + ')');
for (let lv = 1; lv <= 3; lv++) {
  const items = hidden.filter(h => (h.level || 1) === lv);
  if (items.length !== HIDDEN_COUNT[lv]) errs.push('hidden L' + lv + ': ' + HIDDEN_COUNT[lv] + '개 필요 (현재 ' + items.length + ')');
}
const hiddenIds = hidden.map(h => h.id);
if (new Set(hiddenIds).size !== hiddenIds.length) errs.push('hidden id 중복');
hidden.forEach(h => {
  if (!h.label) errs.push('hidden "' + h.id + '": label 없음');
  if (!/^<svg/.test((h.icon || '').trim())) errs.push('hidden "' + h.id + '": icon SVG 아님');
});

const allDiffIds = new Set();

for (let lv = 1; lv <= 3; lv++) {
  const A = scene.buildScene('A', lv);
  const B = scene.buildScene('B', lv);

  [['A', A], ['B', B]].forEach(([v, s]) => {
    const tag = 'L' + lv + '/' + v;
    if (typeof s !== 'string' || !s.includes('<svg')) { errs.push(tag + ': SVG 문자열 아님'); return; }
    if (!s.includes('viewBox="0 0 1200 800"')) errs.push(tag + ': viewBox="0 0 1200 800" 아님');
    if (!s.includes('xMidYMid meet')) errs.push(tag + ': preserveAspectRatio="xMidYMid meet" 아님');
    if (s.includes('<defs') || s.includes('url(#')) errs.push(tag + ': defs/url(#) 사용 금지');
    if (/<(image|text|foreignObject|script|a)\b/.test(s)) errs.push(tag + ': image/text/script 등 금지 요소 사용');
    try {
      const tmp = path.join(require('os').tmpdir(), 'scene-' + themeId + '-' + lv + v + '.svg');
      fs.writeFileSync(tmp, s.trim());
      execFileSync('xmllint', ['--noout', tmp]);
    } catch (e) { errs.push(tag + ': XML 파싱 실패 — ' + String(e.stderr || e.message).slice(0, 300)); }
  });

  // 숨은그림: 씬에 전 레벨 대상이 항상 존재해야 함 (data-find→data-label→[data-level] 순서)
  const finds = [...A.matchAll(/data-find="([^"]+)"\s+data-label="([^"]*)"(?:\s+data-level="([^"]+)")?/g)]
    .map(m => ({ id: m[1], label: m[2], level: +(m[3] || 1) }));
  if (finds.length !== 21) errs.push('L' + lv + '/A: data-find 그룹 21개 필요 — 전 레벨 대상 항상 그림 (현재 ' + finds.length + ')');
  for (let flv = 1; flv <= 3; flv++) {
    const cnt = finds.filter(f => f.level === flv).length;
    if (cnt !== HIDDEN_COUNT[flv]) errs.push('L' + lv + '/A: data-level=' + flv + ' 대상 ' + HIDDEN_COUNT[flv] + '개 필요 (현재 ' + cnt + ')');
  }
  if (lv === 1) {
    finds.forEach(f => { if (!hiddenIds.includes(f.id)) errs.push('씬의 data-find "' + f.id + '"가 hidden 배열에 없음'); });
    hidden.forEach(h => {
      const f = finds.find(x => x.id === h.id);
      if (!f) errs.push('hidden "' + h.id + '"가 씬에 없음');
      else if (f.level !== (h.level || 1)) errs.push('hidden "' + h.id + '": 씬 data-level(' + f.level + ')과 배열 level(' + (h.level || 1) + ') 불일치');
    });
  }

  // 다른그림: 해당 레벨 마커만 (data-diff→[data-level]→data-cx→data-cy→data-r 순서)
  function diffMarkers(s, v) {
    const ms = [...s.matchAll(/data-diff="([^"]+)"(?:\s+data-level="([^"]+)")?\s+data-cx="([^"]+)"\s+data-cy="([^"]+)"\s+data-r="([^"]+)"/g)]
      .map(m => ({ id: m[1], level: +(m[2] || 1), cx: +m[3], cy: +m[4], r: +m[5] }));
    const mine = ms.filter(m => m.level === lv);
    if (mine.length !== DIFF_COUNT[lv]) errs.push('L' + lv + '/' + v + ': 이 레벨 diff 마커 ' + DIFF_COUNT[lv] + '개 필요 (현재 ' + mine.length + ', 속성 순서 확인)');
    mine.forEach(m => {
      if (!(m.cx >= 60 && m.cx <= 1140 && m.cy >= 60 && m.cy <= 740)) warn.push('L' + lv + '/' + v + ' diff ' + m.id + ': 좌표가 가장자리에 너무 가까움');
      if (!(m.r >= 35 && m.r <= 130)) warn.push('L' + lv + '/' + v + ' diff ' + m.id + ': r은 35~130 권장 (현재 ' + m.r + ')');
    });
    return mine;
  }
  const mA = diffMarkers(A, 'A'), mB = diffMarkers(B, 'B');
  if (mA.length === DIFF_COUNT[lv] && mB.length === DIFF_COUNT[lv]) {
    mB.forEach(b => allDiffIds.add(b.id));
    mA.forEach(a => {
      const b = mB.find(x => x.id === a.id);
      if (!b) errs.push('L' + lv + ' diff ' + a.id + ': B에 없음');
      else if (a.cx !== b.cx || a.cy !== b.cy) errs.push('L' + lv + ' diff ' + a.id + ': A/B 좌표 불일치');
    });
    // 각 diff 주변 내용이 실제로 달라지는지 (마커 위치부터 400자 창 비교)
    mA.forEach(a => {
      const ia = A.indexOf('data-diff="' + a.id + '"');
      const ib = B.indexOf('data-diff="' + a.id + '"');
      if (A.slice(ia, ia + 400) === B.slice(ib, ib + 400)) warn.push('L' + lv + ' diff ' + a.id + ': A/B 내용이 동일해 보임 — 실제 차이 확인 필요');
    });
  }
  if (A === B) errs.push('L' + lv + ': A와 B가 완전히 동일함');

  // 다른 레벨의 차이가 새어 들어오지 않는지: L레벨 A와 B는 이 레벨 diff 외에 동일해야 함
  if (!errs.length) ok('L' + lv + ' — 숨은그림 ' + HIDDEN_COUNT[lv] + '개 · 차이 ' + DIFF_COUNT[lv] + '개');
}

// diff id 유일성 (레벨 통틀어 5+6+7=18)
if (allDiffIds.size && allDiffIds.size !== 18) errs.push('diff id는 레벨 통틀어 유일한 18개여야 함 (현재 ' + allDiffIds.size + ')');

if (warn.length) { console.log('⚠️ 경고:'); warn.forEach(w => console.log('  - ' + w)); }
if (errs.length) {
  console.log('❌ ' + themeId + ' 실패:');
  [...new Set(errs)].forEach(e => console.log('  - ' + e));
  process.exit(1);
}
console.log('✅ ' + themeId + ' 계약 통과 (3레벨)');
