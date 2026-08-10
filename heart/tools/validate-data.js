#!/usr/bin/env node
/* 데이터 검증 — node heart/tools/validate-data.js
 *
 * 이 놀이에는 **정답이 없다.** 그래서 검사할 것도 「맞는 답이 있는가」가 아니라
 * 「아이가 무엇을 골라도 놀이가 끝까지 굴러가는가」다:
 *
 *   ① 장면 24~30개 · id 유일 · 묶음 3개
 *   ② 장면마다 도움 카드 **정확히 4장**, 카드마다 반응 대사(reply)가 있다
 *      → 어느 카드를 눌러도 친구가 대답한다(빈 반응이 있으면 그 카드는 아이에게 '먹통'이다)
 *   ③ 마음 12종이 장면에 모두 한 번 이상 나온다 → 도감 12칸을 전부 채울 수 있다
 *   ④ **대사 전수에 부정 표현(틀렸/아니야/안 돼/잘못)이 없다** — 「틀렸어요」가 나오면 안 된다
 *   ⑤ 얼굴 부품이 부위별 5~6종이고 전부 <path> 로 그려진다(이모지로는 표정을 조립할 수 없다)
 *   ⑥ 장면·얼굴 그림이 실제 SVG 문자열로 나온다
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.HeartData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

/* ── ⑤ 얼굴 부품: 부위 3개, 부위마다 5~6종, 전부 path ── */
const SLOTS = ['brow', 'eyes', 'mouth'];
if (!Array.isArray(D.SLOTS) || D.SLOTS.length !== 3 || SLOTS.some(s => D.SLOTS.indexOf(s) < 0)) {
  err('부위는 눈썹·눈·입 셋이어야 함 — ' + JSON.stringify(D.SLOTS));
}
SLOTS.forEach(slot => {
  const g = D.PARTS[slot];
  if (!g) { err('부위 ' + slot + ': 정의 없음'); return; }
  if (!g.name) err('부위 ' + slot + ': 이름 없음');
  if (!g.vb || g.vb.split(/\s+/).length !== 4) err('부위 ' + slot + ': 부품 띠 viewBox(vb) 오류 — ' + g.vb);
  if (!Array.isArray(g.list) || g.list.length < 5 || g.list.length > 6) {
    err('부위 ' + slot + ': 부품은 5~6종이어야 함 — ' + (g.list ? g.list.length : 0));
  }
  const seen = new Set();
  (g.list || []).forEach(p => {
    const tag = '부품 ' + slot + '/' + (p.id || '?');
    if (!p.id || seen.has(p.id)) err(tag + ': id 누락/중복');
    seen.add(p.id);
    if (!p.name) err(tag + ': 이름 없음');
    if (!p.d && !p.fd) err(tag + ': 그림(path d/fd)이 없음');
    [p.d, p.fd].forEach(dd => {
      if (dd && !/^[Mm]/.test(dd.trim())) err(tag + ': path 가 M 으로 시작해야 함 — ' + dd.slice(0, 12));
    });
    // 실제로 <path> 로 나오는가 (이모지·이미지가 아니라)
    const html = D.partPaths(slot, p.id);
    if (html.indexOf('<path') < 0) err(tag + ': partPaths 가 <path> 를 내지 않음');
    if (/[\u{1F300}-\u{1FAFF}]/u.test(html)) err(tag + ': 이모지가 섞여 있음');
  });
});

/* ── ⑥ 얼굴 그림: 고른 부품이 실제로 SVG 에 들어간다 ── */
(() => {
  const sel = { brow: D.PARTS.brow.list[0].id, eyes: D.PARTS.eyes.list[2].id, mouth: D.PARTS.mouth.list[0].id };
  const svg = D.faceSvg(sel);
  if (svg.indexOf('<svg') < 0 || svg.indexOf('</svg>') < 0) err('faceSvg: SVG 문자열 오류');
  SLOTS.forEach(s => {
    if (svg.indexOf('data-' + s + '="' + sel[s] + '"') < 0) err('faceSvg: 고른 ' + s + ' 이 겉에 안 적힘');
    if (svg.indexOf('data-part="' + sel[s] + '"') < 0) err('faceSvg: 고른 ' + s + ' 부품이 안 그려짐');
  });
  // 안 고른 부품은 그리지 않는다 (아직 안 붙인 얼굴)
  const empty = D.faceSvg({});
  if (empty.indexOf('data-part=') >= 0) err('faceSvg: 안 고른 부품이 그려짐');
})();

/* ── ① 묶음 3개 ── */
if (!Array.isArray(D.GROUPS) || D.GROUPS.length !== 3) err('묶음이 3개여야 함 — ' + (D.GROUPS ? D.GROUPS.length : 0));
(D.GROUPS || []).forEach(g => {
  if (!g.id || !g.name || !g.desc || !g.cls) err('묶음 ' + g.id + ': 이름/설명/클래스 누락');
  if (!D.BG[g.bg]) err('묶음 ' + g.id + ': 배경 그림(' + g.bg + ') 없음');
  if (D.scenesOf(g.id).length < 8) err('묶음 ' + g.id + ': 장면이 너무 적음 — ' + D.scenesOf(g.id).length);
});

/* ── ③ 마음 12종 ── */
if (!Array.isArray(D.MOODS) || D.MOODS.length !== 12) err('마음이 12종이어야 함 — ' + (D.MOODS ? D.MOODS.length : 0));
const moodIds = new Set();
(D.MOODS || []).forEach(m => {
  if (!m.id || moodIds.has(m.id)) err('마음 ' + m.id + ': id 누락/중복');
  moodIds.add(m.id);
  if (!m.name || !m.say) err('마음 ' + m.id + ': 이름/읽기 누락');
  if (!/^#[0-9A-Fa-f]{6}$/.test(m.color || '')) err('마음 ' + m.id + ': 색 오류 — ' + m.color);
});

/* ── ① 장면 24~30개 ── */
const SC = D.SCENES || [];
if (!Array.isArray(SC) || SC.length < 24 || SC.length > 30) err('장면은 24~30개여야 함 — ' + SC.length);

const seenScene = new Set();
const moodUse = {};
const ALL_TEXT = [];   // ④ 부정 표현 전수 검사용
SC.forEach(sc => {
  const tag = '장면 ' + (sc.id || '?');
  if (!sc.id || seenScene.has(sc.id)) err(tag + ': id 누락/중복');
  seenScene.add(sc.id);
  if (!D.groupDef(sc.group)) err(tag + ': 없는 묶음 — ' + sc.group);
  if (!moodIds.has(sc.mood)) err(tag + ': 없는 마음 — ' + sc.mood);
  moodUse[sc.mood] = (moodUse[sc.mood] || 0) + 1;
  if (!D.BG[sc.bg]) err(tag + ': 없는 배경 — ' + sc.bg);
  if (!sc.prop || sc.prop.indexOf('<path') < 0) err(tag + ': 소품 그림이 <path> 가 아님');
  if (!sc.line || sc.line.length < 6) err(tag + ': 상황 한 줄이 없음/너무 짧음');
  ALL_TEXT.push([tag + ' 상황', sc.line]);

  // 도움을 받기 전 친구 얼굴 — 부품이 셋 다 있어야 얼굴이 그려진다
  SLOTS.forEach(s => {
    if (!sc.look || !D.partMeta(s, sc.look[s])) err(tag + ': 친구 얼굴 ' + s + ' 부품 오류 — ' + (sc.look ? sc.look[s] : '없음'));
  });

  // ② 도움 카드 정확히 4장
  if (!Array.isArray(sc.cards) || sc.cards.length !== 4) {
    err(tag + ': 도움 카드는 정확히 4장이어야 함 — ' + (sc.cards ? sc.cards.length : 0));
  }
  const seenCard = new Set();
  const seenIcon = new Set();
  (sc.cards || []).forEach(c => {
    const ct = tag + ' 카드 ' + (c.id || '?');
    if (!c.id || seenCard.has(c.id)) err(ct + ': id 누락/중복');
    seenCard.add(c.id);
    if (!c.name) err(ct + ': 이름 없음');
    if (!D.ICONS[c.icon]) err(ct + ': 없는 카드 그림 — ' + c.icon);
    if (seenIcon.has(c.icon)) err(ct + ': 한 장면에 같은 그림 카드가 둘 — ' + c.icon);
    seenIcon.add(c.icon);
    // ② 반응 대사 — 1~2줄, 빈 줄 금지 (어느 카드를 줘도 친구가 대답해야 한다)
    if (!Array.isArray(c.reply) || c.reply.length < 1 || c.reply.length > 2) {
      err(ct + ': 반응 대사는 1~2줄이어야 함 — ' + (c.reply ? c.reply.length : 0));
    }
    (c.reply || []).forEach((r, i) => {
      if (typeof r !== 'string' || r.trim().length < 4) err(ct + ': 반응 대사 ' + (i + 1) + ' 이 비었음');
      ALL_TEXT.push([ct + ' 반응', r]);
    });
    ALL_TEXT.push([ct + ' 이름', c.name]);
  });

  // 장면 그림이 실제 SVG 로 나온다
  const svg = D.sceneSvg(sc, sc.look, 'v' + sc.id);
  if (svg.indexOf('<svg') < 0 || svg.indexOf('</svg>') < 0) err(tag + ': 장면 SVG 문자열 오류');
  if (/[\u{1F300}-\u{1FAFF}]/u.test(svg)) err(tag + ': 장면에 이모지가 섞여 있음');
});

// 마음 12종이 모두 한 번 이상 쓰였나 (도감을 다 채울 수 있어야 한다)
(D.MOODS || []).forEach(m => {
  if (!moodUse[m.id]) err('마음 ' + m.id + '(' + m.name + ') 을 다루는 장면이 없음 — 도감 칸을 채울 길이 없다');
});

/* ── ④ 부정 표현 전수 검사 ──
 * 「맞고 틀림이 없다」가 이 놀이의 전부다. 아이가 무엇을 골라도 실패로 읽히면 안 된다. */
(D.facePraises || []).forEach((t, i) => ALL_TEXT.push(['얼굴 칭찬 ' + (i + 1), t]));
(D.praises || []).forEach((t, i) => ALL_TEXT.push(['칭찬 ' + (i + 1), t]));
(D.MOODS || []).forEach(m => { ALL_TEXT.push(['마음 ' + m.id, m.name]); ALL_TEXT.push(['마음 ' + m.id + ' 읽기', m.say]); });

const BAD = ['틀렸', '틀려', '아니야', '안 돼', '안돼', '잘못', '실패', '땡'];
ALL_TEXT.forEach(([where, text]) => {
  BAD.forEach(w => { if (String(text).indexOf(w) >= 0) err(where + ': 부정 표현 「' + w + '」 — ' + text); });
});
if (!Array.isArray(D.facePraises) || !D.facePraises.length) err('얼굴 칭찬 문구가 없음');
if (!Array.isArray(D.praises) || !D.praises.length) err('칭찬 문구가 없음');

/* 데이터에 '정답' 필드가 끼어들지 않았는지 — 이 놀이에는 맞는 얼굴도 맞는 카드도 없다 */
SC.forEach(sc => {
  ['answer', 'correct', 'right', 'score'].forEach(k => {
    if (k in sc) err('장면 ' + sc.id + ': 정답 필드(' + k + ')가 생겼다 — 이 놀이에 정답은 없다');
    (sc.cards || []).forEach(c => {
      if (k in c) err('장면 ' + sc.id + ' 카드 ' + c.id + ': 정답 필드(' + k + ')가 생겼다');
    });
  });
});

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
const cardCount = SC.reduce((n, s) => n + s.cards.length, 0);
const replyCount = SC.reduce((n, s) => n + s.cards.reduce((k, c) => k + c.reply.length, 0), 0);
console.log('✅ 데이터 검증 통과 — 장면 ' + SC.length + '개(묶음 ' + D.GROUPS.length + '), 도움 카드 ' + cardCount +
  '장 · 반응 대사 ' + replyCount + '줄, 마음 ' + D.MOODS.length + '종 모두 등장, ' +
  '얼굴 부품 ' + SLOTS.map(s => D.PARTS[s].list.length).join('/') + '종, 부정 표현 0');
