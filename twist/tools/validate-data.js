/* 데이터 검증 — node twist/tools/validate-data.js
 * 퍼즐 30개(단계별 10, 실린더 수 2/3/4, 얼굴 수 4/4~5/5~6), 얼굴 유일성, 정답 인덱스 범위,
 * 테마 유효성, 퍼즐 id 유일성, 단계 정의 3개를 정적 검사한다.
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.TwistData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

/* ── 그림 풀: 테마 3개, 이모지 문자열 ── */
if (!D.POOLS || !D.THEME_IDS || D.THEME_IDS.length < 3) err('테마 풀이 3종 이상이어야 함');
(D.THEME_IDS || []).forEach(t => {
  const pool = D.POOLS[t];
  if (!Array.isArray(pool) || pool.length < 4) err('테마 ' + t + ': 그림이 4개 이상이어야 함 — ' + (pool ? pool.length : 0));
  const set = new Set(pool);
  if (set.size !== pool.length) err('테마 ' + t + ': 그림 중복 있음');
});

/* ── 퍼즐: 30개, 단계별 10개 ── */
if (!Array.isArray(D.PUZZLES) || D.PUZZLES.length !== 30) {
  err('퍼즐이 30개여야 함 — ' + (D.PUZZLES ? D.PUZZLES.length : 0));
}
const CYL_COUNT = { 1: 2, 2: 3, 3: 4 };            // 단계별 실린더 수
const FACE_RANGE = { 1: [4, 4], 2: [4, 5], 3: [5, 6] }; // 단계별 얼굴 수 [최소,최대]
const perStage = { 1: 0, 2: 0, 3: 0 };
const seenIds = new Set();

(D.PUZZLES || []).forEach(pz => {
  const tag = '퍼즐 ' + (pz.id || '?');
  if (!pz.id || seenIds.has(pz.id)) err(tag + ': id 누락/중복');
  seenIds.add(pz.id);
  if (![1, 2, 3].includes(pz.stage)) { err(tag + ': 단계 오류 — ' + pz.stage); return; }
  perStage[pz.stage]++;

  // 실린더 수
  if (!Array.isArray(pz.cylinders) || pz.cylinders.length !== CYL_COUNT[pz.stage]) {
    err(tag + ': 단계 ' + pz.stage + ' 는 실린더 ' + CYL_COUNT[pz.stage] + '개여야 함 — ' + (pz.cylinders ? pz.cylinders.length : 0));
    return;
  }
  // 퍼즐 테마 표기 유효성(단계1=animals, 단계2·3=mixed)
  if (pz.stage === 1 && pz.theme !== 'animals') err(tag + ': 단계1 테마는 animals 여야 함 — ' + pz.theme);
  if ((pz.stage === 2 || pz.stage === 3) && pz.theme !== 'mixed') err(tag + ': 단계' + pz.stage + ' 테마는 mixed 여야 함 — ' + pz.theme);

  const [lo, hi] = FACE_RANGE[pz.stage];
  const themesUsed = new Set();
  pz.cylinders.forEach((c, ci) => {
    const ctag = tag + ' 실린더' + ci;
    if (!D.THEME_IDS.includes(c.theme)) { err(ctag + ': 없는 테마 — ' + c.theme); return; }
    themesUsed.add(c.theme);
    if (!Array.isArray(c.faces) || c.faces.length < lo || c.faces.length > hi) {
      err(ctag + ': 얼굴 수는 ' + lo + '~' + hi + ' 여야 함 — ' + (c.faces ? c.faces.length : 0));
    }
    // 얼굴 유일성 + 실제 테마 풀에 속하는지
    const faceSet = new Set(c.faces || []);
    if (faceSet.size !== (c.faces || []).length) err(ctag + ': 얼굴 중복 있음');
    (c.faces || []).forEach(f => { if (D.POOLS[c.theme].indexOf(f) < 0) err(ctag + ': 테마에 없는 그림 — ' + f); });
    // 정답 인덱스 범위
    if (!Number.isInteger(c.target) || c.target < 0 || (c.faces && c.target >= c.faces.length)) {
      err(ctag + ': 정답 인덱스 범위 오류 — ' + c.target);
    }
  });
  // 단계2 이상은 실제로 두 테마 이상 섞여야 "섞어서"가 성립
  if (pz.stage >= 2 && themesUsed.size < 2) err(tag + ': 테마가 섞이지 않음 — ' + [...themesUsed].join(','));
  // 단계3은 동물+공룡+도형이 모두 등장해야 "가장 어려운" 구성이 성립
  if (pz.stage === 3 && themesUsed.size < 3) err(tag + ': 단계3은 테마 3종이 모두 섞여야 함 — ' + [...themesUsed].join(','));
});
[1, 2, 3].forEach(st => { if (perStage[st] !== 10) err('단계 ' + st + ' 퍼즐이 10개여야 함 — ' + perStage[st]); });

/* ── 단계 정의 3개 ── */
if (!Array.isArray(D.LEVELS) || D.LEVELS.length !== 3) err('단계 정의가 3개여야 함');
(D.LEVELS || []).forEach(lv => {
  if (!lv.name || !lv.desc || !lv.cls) err('단계 ' + lv.id + ': 이름/설명/클래스 누락');
  if (lv.cylinders !== CYL_COUNT[lv.id]) err('단계 ' + lv.id + ': 실린더 수(cylinders) 정의 오류 — ' + lv.cylinders);
});

if (!Array.isArray(D.praises) || !D.praises.length) err('칭찬 문구가 없음');

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터 검증 통과 — 테마 ' + D.THEME_IDS.length + '종, 퍼즐 ' + D.PUZZLES.length +
  '개(단계별 10), 단계 ' + D.LEVELS.length + '개(실린더 2/3/4)');
