/* 데이터 검증 — node matrix/tools/validate-data.js
 * 조각 계약(색4 × 방향4 = 16개 · id·이름·SVG·uid)과 퍼즐 30개(단계별 10, 격자 크기 2/3/4,
 * 헤더 색·방향 중복 없음, 각 칸 정답의 색·방향이 헤더와 일치, 트레이 정답 포함·방해 조각 여유)를
 * 정적 검사한다. node 에서는 문자열만 다루므로 SVG 렌더 없이 안전하다.
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.MatrixData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

/* ── 색 4종 · 방향 4종 ── */
if (!Array.isArray(D.COLORS) || D.COLORS.length !== 4) err('색은 4종이어야 함 — ' + (D.COLORS ? D.COLORS.length : 0));
if (!Array.isArray(D.DIRS) || D.DIRS.length !== 4) err('방향은 4종이어야 함 — ' + (D.DIRS ? D.DIRS.length : 0));
const colorIds = new Set();
(D.COLORS || []).forEach(c => {
  const tag = '색 ' + (c.id || '?');
  if (!c.id || colorIds.has(c.id)) err(tag + ': id 누락/중복');
  colorIds.add(c.id);
  if (!c.name || !c.say) err(tag + ': 이름/읽기 누락');
  if (!c.hex || !c.hex2 || !c.line) err(tag + ': 색값(hex/hex2/line) 누락');
  if (!D.colorDef(c.id)) err(tag + ': colorDef 조회 실패');
});
const dirIds = new Set();
(D.DIRS || []).forEach(d => {
  const tag = '방향 ' + (d.id || '?');
  if (!d.id || dirIds.has(d.id)) err(tag + ': id 누락/중복');
  dirIds.add(d.id);
  if (!d.name || !d.say) err(tag + ': 이름/읽기 누락');
  if (typeof d.rot !== 'number') err(tag + ': 회전각(rot) 누락');
  if (!D.dirDef(d.id)) err(tag + ': dirDef 조회 실패');
});

/* ── 조각 16개 (색4 × 방향4) ── */
if (!Array.isArray(D.PIECE_IDS) || D.PIECE_IDS.length !== 16) err('조각은 16개여야 함 — ' + (D.PIECE_IDS ? D.PIECE_IDS.length : 0));
colorIds.forEach(cid => dirIds.forEach(did => {
  const id = D.pieceId(cid, did);
  const tag = '조각 ' + id;
  if (!D.hasPiece(id)) { err(tag + ': 정의 없음'); return; }
  const pc = D.piece(id);
  if (pc.color !== cid) err(tag + ': color 불일치 — ' + pc.color);
  if (pc.dir !== did) err(tag + ': dir 불일치 — ' + pc.dir);
  if (!pc.name || !pc.say) err(tag + ': 이름/읽기 누락');
  if (typeof pc.draw !== 'function') { err(tag + ': draw 함수 없음'); return; }
  const svg = pc.draw('t' + id);
  if (typeof svg !== 'string' || svg.indexOf('<svg') < 0 || svg.indexOf('</svg>') < 0) err(tag + ': SVG 문자열 오류');
  // uid 가 SVG 에 반영돼야 그라데이션 id 충돌이 없다
  const a = pc.draw('uidA'), b = pc.draw('uidB');
  if (a === b && /id="/.test(a)) err(tag + ': uid 가 SVG 에 반영되지 않음(id 충돌 위험)');
}));

/* ── 헤더용 그림(화살표·스와치)도 SVG 를 낸다 ── */
(D.DIRS || []).forEach(d => {
  const s = D.drawArrow('a' + d.id, d);
  if (typeof s !== 'string' || s.indexOf('<svg') < 0) err('방향 화살표 SVG 오류 — ' + d.id);
});
(D.COLORS || []).forEach(c => {
  const s = D.drawSwatch('s' + c.id, c);
  if (typeof s !== 'string' || s.indexOf('<svg') < 0) err('색 스와치 SVG 오류 — ' + c.id);
});

/* ── 단계 정의 3개 (격자 크기 2/3/4) ── */
if (!Array.isArray(D.LEVELS) || D.LEVELS.length !== 3) err('단계 정의가 3개여야 함');
const N_OF = { 1: 2, 2: 3, 3: 4 };
(D.LEVELS || []).forEach(lv => {
  const tag = '단계 ' + lv.id;
  if (![1, 2, 3].includes(lv.id)) err(tag + ': 단계 id 오류');
  if (lv.n !== N_OF[lv.id]) err(tag + ': 격자 크기(n) 는 ' + N_OF[lv.id] + ' 여야 함 — ' + lv.n);
  if (!lv.name || !lv.desc || !lv.cls) err(tag + ': 이름/설명/클래스 누락');
  if (typeof lv.extra !== 'number' || lv.extra < 0) err(tag + ': 방해 조각 수(extra) 오류');
});

/* ── 퍼즐 30개 (단계별 10, 격자·헤더·정답·트레이 여유) ── */
if (!Array.isArray(D.PUZZLES) || D.PUZZLES.length !== 30) err('퍼즐이 30개여야 함 — ' + (D.PUZZLES ? D.PUZZLES.length : 0));
const perLevel = { 1: 0, 2: 0, 3: 0 };
const seenIds = new Set();
const seenSig = new Set();
(D.PUZZLES || []).forEach(pz => {
  const tag = '퍼즐 ' + (pz.id || '?');
  if (!pz.id || seenIds.has(pz.id)) err(tag + ': id 누락/중복');
  seenIds.add(pz.id);
  if (![1, 2, 3].includes(pz.level)) { err(tag + ': 단계 오류 — ' + pz.level); return; }
  perLevel[pz.level]++;
  const n = N_OF[pz.level];
  // 격자 크기 = 색 수 × 방향 수 = n × n
  if (D.rowsOf(pz) !== n) err(tag + ': 색(행) 수는 ' + n + ' 이어야 함 — ' + D.rowsOf(pz));
  if (D.colsOf(pz) !== n) err(tag + ': 방향(열) 수는 ' + n + ' 이어야 함 — ' + D.colsOf(pz));
  // 헤더 색·방향은 유효하고 서로 중복 없음
  const cset = new Set(), dset = new Set();
  pz.colors.forEach(cid => {
    if (!colorIds.has(cid)) err(tag + ': 없는 색 — ' + cid);
    if (cset.has(cid)) err(tag + ': 색 헤더 중복 — ' + cid);
    cset.add(cid);
  });
  pz.dirs.forEach(did => {
    if (!dirIds.has(did)) err(tag + ': 없는 방향 — ' + did);
    if (dset.has(did)) err(tag + ': 방향 헤더 중복 — ' + did);
    dset.add(did);
  });
  // 각 칸(r,c) 정답 조각의 색·방향이 헤더와 일치 + 조각이 실제로 존재
  const answer = D.answerPieces(pz);
  if (answer.length !== n * n) err(tag + ': 정답 조각 수는 ' + (n * n) + ' 이어야 함 — ' + answer.length);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const id = D.cellPiece(pz, r, c);
    if (!D.hasPiece(id)) { err(tag + ': 없는 정답 조각 — ' + id); continue; }
    const pc = D.piece(id);
    if (pc.color !== pz.colors[r]) err(tag + ': 칸(' + r + ',' + c + ') 색이 헤더와 다름 — ' + pc.color + ' ≠ ' + pz.colors[r]);
    if (pc.dir !== pz.dirs[c]) err(tag + ': 칸(' + r + ',' + c + ') 방향이 헤더와 다름 — ' + pc.dir + ' ≠ ' + pz.dirs[c]);
  }
  // 정답 조각은 서로 겹치지 않는다(색×방향 조합이 유일하므로)
  if (new Set(answer).size !== answer.length) err(tag + ': 정답 조각이 중복됨');
  // 트레이 = 정답 + 방해. 방해 조각(정답에 없는 조각)이 단계 extra 만큼 확보돼야 한다
  const used = new Set(answer);
  const distractPool = D.PIECE_IDS.filter(id => !used.has(id));
  const extra = D.levelDef(pz.level).extra || 0;
  if (distractPool.length < extra) err(tag + ': 방해 조각 부족 — 남은 조각 ' + distractPool.length + ' < ' + extra);
  // 같은 색·방향 배치의 퍼즐이 중복되지 않는다
  const sig = pz.colors.join(',') + '|' + pz.dirs.join(',');
  if (seenSig.has(sig)) err(tag + ': 같은 배치의 퍼즐이 중복됨 — ' + sig);
  seenSig.add(sig);
});
[1, 2, 3].forEach(lv => { if (perLevel[lv] !== 10) err('단계 ' + lv + ' 퍼즐이 10개여야 함 — ' + perLevel[lv]); });

if (!Array.isArray(D.praises) || !D.praises.length) err('칭찬 문구가 없음');

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터 검증 통과 — 색 ' + D.COLORS.length + ' × 방향 ' + D.DIRS.length +
  ' = 조각 ' + D.PIECE_IDS.length + '개, 퍼즐 ' + D.PUZZLES.length + '개(단계별 10), 단계 ' + D.LEVELS.length + '개');
