/* 데이터 검증 — node pattern/tools/validate-data.js
 * 타일 세트(도형 6 × 색 6 + 분할 타일 · id·이름·SVG),
 * 퍼즐 30개(단계별 10, id 유일)와 단계별 규칙을 정적 검사한다.
 *   - 단계1: 빈칸 1개가 줄 끝, 단순 반복(주기 ≤ 3), 시작 보이는 칸
 *   - 단계2: 빈칸 1개가 가운데(끝이 아님)
 *   - 단계3: 긴 반복(주기 ≥ 3) 또는 분할 타일, 빈칸 1~2개
 * 그리고 빈칸 정답이 반복 규칙(pattern[i] = base[i % period])과 일치,
 * 트레이에 정답이 모두 들어가고 방해 타일을 뽑을 여유(extra)가 있는지 검사한다.
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.PatternData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

/* ── 타일 세트: 도형 6종 × 색 6종 = 36 일반 타일 + 분할 타일 ── */
const SHAPE_N = Object.keys(D.SHAPES).length;
const COLOR_N = Object.keys(D.COLORS).length;
if (SHAPE_N !== 6) err('도형은 6종이어야 함 — ' + SHAPE_N);
if (COLOR_N !== 6) err('색은 6종이어야 함 — ' + COLOR_N);
if (D.SOLID_IDS.length !== SHAPE_N * COLOR_N) err('일반 타일은 36종이어야 함 — ' + D.SOLID_IDS.length);
if (D.TILE_IDS.length <= D.SOLID_IDS.length) err('분할 타일이 최소 1종 이상 있어야 함');

D.TILE_IDS.forEach(id => {
  const t = D.tile(id);
  const tag = '타일 ' + id;
  if (!t) { err(tag + ': 정의 없음'); return; }
  if (!t.name || !t.say) err(tag + ': 이름/읽기 누락');
  if (typeof t.draw !== 'function') { err(tag + ': draw 함수 없음'); return; }
  const svg = t.draw('u' + id);
  if (typeof svg !== 'string' || svg.indexOf('<svg') < 0 || svg.indexOf('</svg>') < 0) err(tag + ': SVG 문자열 오류');
});
// 분할 타일은 서로 다른 uid 로 그리면 그라데이션 id 가 달라야 한다(충돌 방지)
D.TILE_IDS.filter(id => D.tile(id).split).forEach(id => {
  const a = D.tile(id).draw('uidA'), b = D.tile(id).draw('uidB');
  if (a === b && /id="/.test(a)) err('분할 타일 ' + id + ': uid 가 SVG 에 반영되지 않음(id 충돌 위험)');
});

/* ── 퍼즐: 30개, 단계별 10개, id 유일 ── */
if (!Array.isArray(D.PUZZLES) || D.PUZZLES.length !== 30) {
  err('퍼즐이 30개여야 함 — ' + (D.PUZZLES ? D.PUZZLES.length : 0));
}
const perLevel = { 1: 0, 2: 0, 3: 0 };
const seenIds = new Set();

(D.PUZZLES || []).forEach(p => {
  const tag = '퍼즐 ' + (p.id || '?');
  if (!p.id || seenIds.has(p.id)) err(tag + ': id 누락/중복');
  seenIds.add(p.id);
  if (![1, 2, 3].includes(p.level)) { err(tag + ': 단계 오류 — ' + p.level); return; }
  perLevel[p.level]++;

  const pat = p.pattern, blanks = p.blanks, period = p.period;
  if (!Array.isArray(pat) || pat.length < 3) { err(tag + ': 패턴 길이 오류'); return; }
  if (typeof period !== 'number' || period < 2) err(tag + ': 주기(period) 오류 — ' + period);
  // 모든 칸 타일 id 가 실제 타일이어야
  pat.forEach((id, i) => { if (!D.has(id)) err(tag + ': 없는 타일 — ' + id + ' (칸 ' + i + ')'); });
  // 반복 규칙: pattern[i] === pattern[i % period] (base 반복)
  for (let i = 0; i < pat.length; i++) {
    if (pat[i] !== pat[i % period]) err(tag + ': 반복 규칙 위반 — 칸 ' + i + ' ≠ 칸 ' + (i % period));
  }

  // 빈칸 검사
  if (!Array.isArray(blanks) || blanks.length < 1) { err(tag + ': 빈칸이 없음'); return; }
  const blankSet = new Set();
  blanks.forEach(bi => {
    if (typeof bi !== 'number' || bi < 0 || bi >= pat.length) err(tag + ': 빈칸 인덱스 범위 밖 — ' + bi);
    if (blankSet.has(bi)) err(tag + ': 빈칸 중복 — ' + bi);
    blankSet.add(bi);
    // 정답은 반복 규칙으로 결정되므로 보이는 칸에서 유추 가능해야 한다
    // (같은 위상 base[bi % period] 인 '보이는' 칸이 최소 하나 있어야 정답을 규칙으로 알 수 있다)
    const phase = bi % period;
    let anchor = false;
    for (let i = 0; i < pat.length; i++) {
      if (i % period === phase && !blanks.includes(i)) { anchor = true; break; }
    }
    if (!anchor) err(tag + ': 빈칸 ' + bi + ' 의 정답을 알 단서(같은 위상 보이는 칸)가 없음');
  });

  // answersOf 정합성
  const answers = D.answersOf(p);
  if (answers.length !== blanks.length) err(tag + ': 정답 개수 불일치');

  // ── 단계별 규칙 ──
  if (p.level === 1) {
    if (blanks.length !== 1) err(tag + ': 단계1 빈칸은 1개여야 함 — ' + blanks.length);
    if (blanks[0] !== pat.length - 1) err(tag + ': 단계1 빈칸은 줄 끝이어야 함 — ' + blanks[0]);
    if (period > 3) err(tag + ': 단계1 은 단순 반복(주기 ≤ 3)이어야 함 — ' + period);
    if (blanks[0] === 0) err(tag + ': 단계1 시작 칸은 보여야 함');
  } else if (p.level === 2) {
    if (blanks.length !== 1) err(tag + ': 단계2 빈칸은 1개여야 함 — ' + blanks.length);
    if (blanks[0] === pat.length - 1 || blanks[0] === 0) err(tag + ': 단계2 빈칸은 가운데여야 함 — ' + blanks[0]);
  } else if (p.level === 3) {
    const hasSplit = pat.some(id => D.tile(id).split);
    if (period < 3 && !hasSplit) err(tag + ': 단계3 은 긴 반복(주기 ≥ 3) 또는 분할 타일이어야 함 — 주기 ' + period);
    if (blanks.length < 1 || blanks.length > 2) err(tag + ': 단계3 빈칸은 1~2개 — ' + blanks.length);
  }
});
[1, 2, 3].forEach(lv => { if (perLevel[lv] !== 10) err('단계 ' + lv + ' 퍼즐이 10개여야 함 — ' + perLevel[lv]); });

/* ── 단계 정의 3개 + 트레이 구성(정답 + 방해 타일 여유) ── */
if (!Array.isArray(D.LEVELS) || D.LEVELS.length !== 3) err('단계 정의가 3개여야 함');
(D.LEVELS || []).forEach(lv => {
  if (!lv.name || !lv.desc || !lv.cls) err('단계 ' + lv.id + ': 이름/설명/클래스 누락');
  if (typeof lv.extra !== 'number' || lv.extra < 0) err('단계 ' + lv.id + ': 방해 타일 수(extra) 오류');
  // 각 퍼즐마다 정답을 제외한 일반 타일이 extra 개 이상 남아야 트레이가 채워진다
  D.puzzlesOf(lv.id).forEach(p => {
    const answerSet = new Set(D.answersOf(p));
    const pool = D.SOLID_IDS.filter(id => !answerSet.has(id));
    if (pool.length < lv.extra) err('퍼즐 ' + p.id + ': 방해 타일 부족 — 남은 ' + pool.length + ' < ' + lv.extra);
    // 정답이 SOLID 든 분할이든 실제 타일이어야(트레이에 넣을 수 있어야)
    D.answersOf(p).forEach(id => { if (!D.has(id)) err('퍼즐 ' + p.id + ': 정답 타일 없음 — ' + id); });
  });
});

if (!Array.isArray(D.praises) || !D.praises.length) err('칭찬 문구가 없음');

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터 검증 통과 — 타일 ' + D.TILE_IDS.length + '종(일반 ' + D.SOLID_IDS.length +
  '), 퍼즐 ' + D.PUZZLES.length + '개(단계별 10), 단계 ' + D.LEVELS.length + '개');
