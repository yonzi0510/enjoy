/* 데이터 검증 — node lines/tools/validate-data.js
 * 안내선 생성기가 유효한 점 배열을 만드는지, 매개변수가 정상 범위인지, 단계별 종류가
 * 맞는지(1=햇살 · 2=물결/지그재그 · 3=소용돌이), 퍼즐 id 가 유일한지를 정적 검사한다.
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.LinesData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

/* ── 캔버스 좌표계 ── */
if (D.W !== 640 || D.H !== 640) err('캔버스 논리 좌표계는 640×640 이어야 함 — ' + D.W + '×' + D.H);

/* ── 캐릭터 얼굴 이모지 ── */
if (!Array.isArray(D.CHARS) || D.CHARS.length < 4) err('캐릭터 이모지가 너무 적음 — ' + (D.CHARS ? D.CHARS.length : 0));
(D.CHARS || []).forEach((c, i) => { if (typeof c !== 'string' || !c.length) err('캐릭터 ' + i + ': 빈 값'); });

/* ── 단계 정의 3개 ── */
if (!Array.isArray(D.STAGES) || D.STAGES.length !== 3) err('단계 정의가 3개여야 함');
(D.STAGES || []).forEach(st => {
  if (!st.name || !st.desc || !st.cls || !st.icon) err('단계 ' + st.id + ': 이름/설명/아이콘/클래스 누락');
});

/* ── 퍼즐 30개, 단계별 10개 ── */
if (!Array.isArray(D.PUZZLES) || D.PUZZLES.length !== 30) {
  err('퍼즐이 30개여야 함 — ' + (D.PUZZLES ? D.PUZZLES.length : 0));
}
const STAGE_TYPES = { 1: ['ray'], 2: ['wave', 'zigzag'], 3: ['spiral'] };
const perLevel = { 1: 0, 2: 0, 3: 0 };
const typeCountByLevel = { 1: {}, 2: {}, 3: {} };
const seenIds = new Set();
const seenSig = new Set();
const MARGIN = 0; // 캔버스 안(0~W, 0~H)에는 들어가야 함

(D.PUZZLES || []).forEach(pz => {
  const tag = '퍼즐 ' + (pz.id || '?');
  if (!pz.id || seenIds.has(pz.id)) err(tag + ': id 누락/중복');
  seenIds.add(pz.id);
  if (![1, 2, 3].includes(pz.level)) { err(tag + ': 단계 오류 — ' + pz.level); return; }
  perLevel[pz.level]++;
  typeCountByLevel[pz.level][pz.type] = (typeCountByLevel[pz.level][pz.type] || 0) + 1;

  if (!STAGE_TYPES[pz.level].includes(pz.type)) {
    err(tag + ': 단계 ' + pz.level + ' 에 맞지 않는 종류 — ' + pz.type + ' (허용: ' + STAGE_TYPES[pz.level].join('/') + ')');
  }
  if (!D.CHARS.includes(pz.char)) err(tag + ': 캐릭터가 CHARS 목록에 없음 — ' + pz.char);

  // 매개변수 정상 범위
  const p = pz.p || {};
  if (pz.type === 'ray') {
    if (!Array.isArray(p.angles) || p.angles.length < 3) err(tag + ': 햇살 줄기는 3개 이상이어야 함');
    if (!(p.len > 40 && p.len <= 400)) err(tag + ': len 범위 이상 — ' + p.len);
  } else if (pz.type === 'spiral') {
    if (!(p.turns >= 1 && p.turns <= 4)) err(tag + ': turns 범위 이상 — ' + p.turns);
    if (!(p.a >= 0 && p.a < p.maxR)) err(tag + ': a/maxR 관계 이상 — a=' + p.a + ' maxR=' + p.maxR);
    if (!(p.maxR > 40 && p.maxR <= 320)) err(tag + ': maxR 범위 이상 — ' + p.maxR);
    if (p.dir !== 1 && p.dir !== -1) err(tag + ': dir 은 1 또는 -1 이어야 함 — ' + p.dir);
  } else if (pz.type === 'wave') {
    if (!(p.len > 100)) err(tag + ': len 범위 이상 — ' + p.len);
    if (!(p.amp > 10 && p.amp <= 200)) err(tag + ': amp 범위 이상 — ' + p.amp);
    if (!(p.freq > 0 && p.freq <= 5)) err(tag + ': freq 범위 이상 — ' + p.freq);
  } else if (pz.type === 'zigzag') {
    if (!(p.len > 100)) err(tag + ': len 범위 이상 — ' + p.len);
    if (!(p.amp > 10 && p.amp <= 200)) err(tag + ': amp 범위 이상 — ' + p.amp);
    if (!(Number.isInteger(p.count) && p.count >= 2 && p.count <= 12)) err(tag + ': count 범위 이상 — ' + p.count);
  }

  // 안내선 점 배열이 실제로 유효한지(캔버스 안, 좌표 숫자)
  let paths;
  try { paths = D.guideOf(pz); } catch (e) { err(tag + ': guideOf 예외 — ' + e.message); return; }
  if (!Array.isArray(paths) || !paths.length) { err(tag + ': 안내선 경로가 비어 있음'); return; }
  let totalPts = 0;
  paths.forEach((path, pi) => {
    if (!Array.isArray(path) || path.length < 2) { err(tag + ' 경로' + pi + ': 점이 2개 미만'); return; }
    totalPts += path.length;
    path.forEach((pt, i) => {
      if (typeof pt.x !== 'number' || Number.isNaN(pt.x) || pt.x < -MARGIN || pt.x > D.W + MARGIN) {
        err(tag + ' 경로' + pi + ' 점' + i + ': x 좌표 범위 이상 — ' + pt.x);
      }
      if (typeof pt.y !== 'number' || Number.isNaN(pt.y) || pt.y < -MARGIN || pt.y > D.H + MARGIN) {
        err(tag + ' 경로' + pi + ' 점' + i + ': y 좌표 범위 이상 — ' + pt.y);
      }
    });
  });
  // 지그재그는 count(꺾임 수, 허용범위 2~12)만큼만 점을 찍으므로 절대 점 개수가 적을 수 있다 —
  // 문턱은 "허용된 최소 count(2)일 때의 점 개수(3)"보다 낮게 잡아야 정상 데이터를 오탐하지 않는다.
  if (totalPts < 3) err(tag + ': 안내선 점이 너무 적음(경로가 너무 짧음) — ' + totalPts);

  // 기준점(origin)도 캔버스 안에 있어야 함
  const o = D.originOf(pz);
  if (!o || o.x < 0 || o.x > D.W || o.y < 0 || o.y > D.H) err(tag + ': 기준점이 캔버스 밖 — ' + JSON.stringify(o));

  // 같은 매개변수의 퍼즐 중복 금지
  const sig = pz.level + '|' + pz.type + '|' + JSON.stringify(p);
  if (seenSig.has(sig)) err(tag + ': 같은 매개변수의 퍼즐 중복');
  seenSig.add(sig);
});

[1, 2, 3].forEach(lv => { if (perLevel[lv] !== 10) err('단계 ' + lv + ' 퍼즐이 10개여야 함 — ' + perLevel[lv]); });
// 단계2는 물결·지그재그가 섞여 있어야 한다(둘 다 최소 1개 이상)
if ((typeCountByLevel[2].wave || 0) < 1) err('단계 2 에 물결(wave) 퍼즐이 없음');
if ((typeCountByLevel[2].zigzag || 0) < 1) err('단계 2 에 지그재그(zigzag) 퍼즐이 없음');

if (!Array.isArray(D.praises) || !D.praises.length) err('칭찬 문구가 없음');
if (!Array.isArray(D.nudges) || !D.nudges.length) err('다시 권하는 문구가 없음');

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터 검증 통과 — 퍼즐 ' + D.PUZZLES.length + '개(단계별 10: 햇살 ' + perLevel[1] +
  ', 물결/지그재그 ' + perLevel[2] + '[물결 ' + typeCountByLevel[2].wave + '·지그재그 ' + typeCountByLevel[2].zigzag +
  '], 소용돌이 ' + perLevel[3] + '), 캐릭터 ' + D.CHARS.length + '종');
