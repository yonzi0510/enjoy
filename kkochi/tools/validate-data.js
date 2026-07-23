/* 데이터 검증 — node kkochi/tools/validate-data.js
 * 재료 계약(분식5·과일5·경단4 = 14종, id·이름·읽기·SVG·높이·uid 반영)과
 * 미션 30개(단계별 10, 단계별 알 개수 범위, 순서 유효, 미션 id 유일·순서 유일,
 * 단계별 반복 패턴 규칙[1단계=반복 없음 / 2·3단계=반복 존재], 트레이 방해재료 여유)를 정적 검사한다.
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.KkochiData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

/* ── 재료: 분식5 · 과일5 · 경단4 = 14종, id·이름·읽기·역할(cat)·SVG·높이 계약 ── */
const cats = { '분식': 0, '과일': 0, '경단': 0 };
D.ID_LIST.forEach(id => {
  const ing = D.meta(id);
  const tag = '재료 ' + id;
  if (!ing) { err(tag + ': 정의 없음'); return; }
  if (!ing.name || !ing.say) err(tag + ': 이름/읽기 누락');
  if (!Object.prototype.hasOwnProperty.call(cats, ing.cat)) err(tag + ': 분류(cat) 오류 — ' + ing.cat);
  else cats[ing.cat]++;
  if (typeof ing.draw !== 'function') { err(tag + ': draw 함수 없음'); return; }
  const svg = ing.draw('t' + id);
  if (typeof svg !== 'string' || svg.indexOf('<svg') < 0 || svg.indexOf('</svg>') < 0) err(tag + ': SVG 문자열 오류');
  if (svg.indexOf('width="100%"') < 0) err(tag + ': SVG 는 width 100% 로 그려야 함(스틱 관통 폭 맞춤)');
  if (typeof ing.h !== 'number' || ing.h <= 0) err(tag + ': 높이(h) 오류');
});
if (D.ID_LIST.length !== 14) err('재료는 14종이어야 함 — ' + D.ID_LIST.length);
if (cats['분식'] !== 5) err('분식 재료는 5종이어야 함 — ' + cats['분식']);
if (cats['과일'] !== 5) err('과일 재료는 5종이어야 함 — ' + cats['과일']);
if (cats['경단'] !== 4) err('경단 재료는 4종이어야 함 — ' + cats['경단']);

// SVG 그라데이션 id 충돌 방지 — 같은 재료를 다른 uid 로 그리면 서로 다른 id 를 써야 한다
D.ID_LIST.forEach(id => {
  const a = D.meta(id).draw('uidA'), b = D.meta(id).draw('uidB');
  if (a === b && /id="/.test(a)) err('재료 ' + id + ': uid 가 SVG 에 반영되지 않음(id 충돌 위험)');
});

/* ── 미션: 30개, 단계별 10개 ── */
if (!Array.isArray(D.MISSIONS) || D.MISSIONS.length !== 30) {
  err('미션이 30개여야 함 — ' + (D.MISSIONS ? D.MISSIONS.length : 0));
}
const RANGE = { 1: [3, 4], 2: [4, 5], 3: [6, 7] }; // 단계별 알 개수 범위
const perLevel = { 1: 0, 2: 0, 3: 0 };
const seenIds = new Set();
const seenSeq = new Set();

function uniq(a) { return Array.from(new Set(a)); }

(D.MISSIONS || []).forEach(ms => {
  const tag = '미션 ' + (ms.id || '?');
  if (!ms.id || seenIds.has(ms.id)) err(tag + ': id 누락/중복');
  seenIds.add(ms.id);
  if (![1, 2, 3].includes(ms.level)) { err(tag + ': 단계 오류 — ' + ms.level); return; }
  perLevel[ms.level]++;
  const seq = ms.seq;
  if (!Array.isArray(seq) || seq.length === 0) { err(tag + ': seq 누락'); return; }
  const [lo, hi] = RANGE[ms.level];
  if (seq.length < lo || seq.length > hi) err(tag + ': 단계 ' + ms.level + ' 알 개수는 ' + lo + '~' + hi + ' — ' + seq.length);
  // 순서 유효: 모두 존재하는 재료
  seq.forEach(id => { if (!D.has(id)) err(tag + ': 없는 재료 — ' + id); });
  // 순서 중복 방지 (같은 미션이 두 번 나오지 않게)
  const key = seq.join('>');
  if (seenSeq.has(key)) err(tag + ': 같은 순서의 미션이 중복됨 — ' + key);
  seenSeq.add(key);
  // 단계별 반복 패턴 규칙
  const distinct = uniq(seq).length;
  if (ms.level === 1) {
    if (distinct !== seq.length) err(tag + ': 단계1 은 반복 없는 순서여야 함(모두 다른 알) — ' + key);
  } else {
    if (distinct >= seq.length) err(tag + ': 단계 ' + ms.level + ' 는 반복 패턴(재등장 알)이 있어야 함 — ' + key);
  }
});
[1, 2, 3].forEach(lv => { if (perLevel[lv] !== 10) err('단계 ' + lv + ' 미션이 10개여야 함 — ' + perLevel[lv]); });

/* ── 단계 정의 3개 + 방해 재료 여유 ── */
if (!Array.isArray(D.LEVELS) || D.LEVELS.length !== 3) err('단계 정의가 3개여야 함');
(D.LEVELS || []).forEach(lv => {
  if (!lv.name || !lv.desc || !lv.cls || !lv.icon) err('단계 ' + lv.id + ': 이름/설명/클래스/아이콘 누락');
  if (typeof lv.extra !== 'number' || lv.extra < 0) err('단계 ' + lv.id + ': 방해 재료 수(extra) 오류');
  // 트레이는 미션에 쓰인 재료 + 방해 재료. 미션에 안 쓰인 재료가 extra 개 이상 남아야 한다.
  D.missionsOf(lv.id).forEach(ms => {
    const used = uniq(ms.seq);
    const unused = D.ID_LIST.filter(id => used.indexOf(id) < 0);
    if (unused.length < lv.extra) err('미션 ' + ms.id + ': 방해 재료 부족 — 남은 재료 ' + unused.length + ' < ' + lv.extra);
  });
});

if (!Array.isArray(D.praises) || !D.praises.length) err('칭찬 문구가 없음');

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터 검증 통과 — 재료 ' + D.ID_LIST.length + '종(분식 ' + cats['분식'] +
  '·과일 ' + cats['과일'] + '·경단 ' + cats['경단'] + '), 미션 ' + D.MISSIONS.length +
  '개(단계별 10), 단계 ' + D.LEVELS.length + '개');
