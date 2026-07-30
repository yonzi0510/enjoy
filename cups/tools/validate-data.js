/* 데이터 검증 — node cups/tools/validate-data.js
 * 색 컵 6종(id·이름·읽기·색값)과 퍼즐 30개(단계별 10, 피라미드 모양 3/6/10칸,
 * 칸 색 유효, 트레이 방해 색 여유, 쌓기 순서 유일)를 정적 검사한다.
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.CupsData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

const isHex = s => typeof s === 'string' && /^#[0-9A-Fa-f]{6}$/.test(s);

/* ── 색 컵 6종: id·이름·읽기·4색값 계약 ── */
if (!Array.isArray(D.ORDER) || D.ORDER.length !== 6) err('색은 정확히 6종이어야 함 — ' + (D.ORDER ? D.ORDER.length : 0));
const colorKeys = Object.keys(D.COLORS || {});
if (colorKeys.length !== 6) err('COLORS 정의가 6종이어야 함 — ' + colorKeys.length);
D.ORDER.forEach(k => {
  const c = D.meta(k);
  const tag = '색 ' + k;
  if (!c) { err(tag + ': 정의 없음'); return; }
  if (!c.name || !c.say) err(tag + ': 이름/읽기 누락');
  ['lite', 'dark', 'rim', 'hi'].forEach(f => { if (!isHex(c[f])) err(tag + ': ' + f + ' 색값 오류 — ' + c[f]); });
});
// ORDER 와 COLORS 가 정확히 일치
colorKeys.forEach(k => { if (D.ORDER.indexOf(k) < 0) err('COLORS 의 ' + k + ' 가 ORDER 에 없음'); });

/* ── 컵/슬롯 SVG: 문자열 계약 + uid 반영(그라데이션 id 충돌 방지) ── */
D.ORDER.forEach(k => {
  const a = D.cupSVG(k, 'uidA'), b = D.cupSVG(k, 'uidB');
  if (typeof a !== 'string' || a.indexOf('<svg') < 0 || a.indexOf('</svg>') < 0) err('색 ' + k + ': cupSVG 문자열 오류');
  if (a === b && /id="/.test(a)) err('색 ' + k + ': uid 가 SVG 에 반영되지 않음(gradient id 충돌 위험)');
});
{
  const s = D.slotSVG();
  if (typeof s !== 'string' || s.indexOf('<svg') < 0 || s.indexOf('</svg>') < 0) err('slotSVG 문자열 오류');
}

/* ── 퍼즐: 30개, 단계별 10, 피라미드 모양 ──
 * 단계 L → 밑줄 L+1칸, 위로 한 칸씩 줄어 꼭대기 1칸.
 *   L1=[2,1](3칸) · L2=[3,2,1](6칸) · L3=[4,3,2,1](10칸). rows[0]=맨 아래줄. */
const CUPS = { 1: 3, 2: 6, 3: 10 };
if (!Array.isArray(D.PUZZLES) || D.PUZZLES.length !== 30) err('퍼즐이 30개여야 함 — ' + (D.PUZZLES ? D.PUZZLES.length : 0));
const perLevel = { 1: 0, 2: 0, 3: 0 };
const seenIds = new Set();
const seenSeq = new Set();
(D.PUZZLES || []).forEach(pz => {
  const tag = '퍼즐 ' + (pz.id || '?');
  if (!pz.id || seenIds.has(pz.id)) err(tag + ': id 누락/중복');
  seenIds.add(pz.id);
  if (![1, 2, 3].includes(pz.level)) { err(tag + ': 단계 오류 — ' + pz.level); return; }
  perLevel[pz.level]++;
  const rows = pz.rows;
  const base = pz.level + 1;
  if (!Array.isArray(rows) || rows.length !== base) {
    err(tag + ': 단계 ' + pz.level + ' 는 ' + base + '줄이어야 함 — ' + (rows ? rows.length : 0));
    return;
  }
  // 각 줄 길이: 아래줄 base → 꼭대기 1
  rows.forEach((row, r) => {
    const want = base - r;
    if (!Array.isArray(row) || row.length !== want) err(tag + ': ' + (r + 1) + '번째 줄은 ' + want + '칸이어야 함 — ' + (row ? row.length : 0));
    (row || []).forEach(col => { if (!D.has(col)) err(tag + ': 없는 색 — ' + col); });
  });
  // 총 컵 수
  const n = D.cupCount(pz);
  if (n !== CUPS[pz.level]) err(tag + ': 컵 수 ' + n + ' ≠ ' + CUPS[pz.level]);
  // 트레이는 6색을 늘 보여준다 → 방해(안 쓰는) 색이 최소 1개 남아야 한다
  const used = D.colorsUsed(pz);
  if (used.length > D.ORDER.length - 1) err(tag + ': 방해 색 여유 없음 — 쓰는 색 ' + used.length + ' > ' + (D.ORDER.length - 1));
  // 쌓기 순서(펼친 색 배열)는 퍼즐끼리 유일
  const seq = D.flat(pz).join('>');
  if (seenSeq.has(seq)) err(tag + ': 같은 색 배치의 퍼즐이 중복됨 — ' + seq);
  seenSeq.add(seq);
});
[1, 2, 3].forEach(lv => { if (perLevel[lv] !== 10) err('단계 ' + lv + ' 퍼즐이 10개여야 함 — ' + perLevel[lv]); });

/* ── 단계 정의 3개 ── */
if (!Array.isArray(D.LEVELS) || D.LEVELS.length !== 3) err('단계 정의가 3개여야 함');
(D.LEVELS || []).forEach(lv => {
  if (!lv.name || !lv.desc || !lv.cls) err('단계 ' + lv.id + ': 이름/설명/클래스 누락');
  if (!D.levelDef(lv.id)) err('단계 ' + lv.id + ': levelDef 조회 실패');
});

if (!Array.isArray(D.praises) || !D.praises.length) err('칭찬 문구가 없음');

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터 검증 통과 — 색 ' + D.ORDER.length + '종, 퍼즐 ' + D.PUZZLES.length +
  '개(단계별 10, 컵 3/6/10), 단계 ' + D.LEVELS.length + '개');
