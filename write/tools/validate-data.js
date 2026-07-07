/* 데이터 검증 — node write/tools/validate-data.js
 * 챕터·페이지 계약을 정적 검사한다:
 * 글 길이(한 줄에 들어가는지), 필수 필드, id 중복, 낱말 이모지, 동요·동화 full 존재
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.WriteData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

function units(text) {
  let u = 0;
  for (const ch of text) u += ch === ' ' ? 0.45 : 1;
  return u;
}

if (!Array.isArray(D.praises) || D.praises.length < 3) err('praises 는 3개 이상이어야 함');
if (!Array.isArray(D.chapters) || !D.chapters.length) err('chapters 없음');

const chapterIds = new Set();
const scopeIds = new Set();
let pageCount = 0;

function checkPages(scope, label, needEmoji) {
  if (!Array.isArray(scope.pages) || !scope.pages.length) { err(label + ': pages 없음'); return; }
  scope.pages.forEach((p, i) => {
    pageCount++;
    const at = label + ' pages[' + i + ']';
    if (!p.text || typeof p.text !== 'string') { err(at + ': text 없음'); return; }
    if (p.text !== p.text.trim()) err(at + ': text 앞뒤 공백 — "' + p.text + '"');
    const u = units(p.text);
    if (u > 11) err(at + ': 한 줄에 너무 김 (' + u + '칸) — "' + p.text + '"');
    if (needEmoji && !p.e) err(at + ': 낱말 이모지(e) 없음 — "' + p.text + '"');
  });
}

D.chapters.forEach(ch => {
  const at = '챕터 ' + (ch.id || '?');
  if (!ch.id) err('id 없는 챕터');
  if (chapterIds.has(ch.id)) err(at + ': id 중복');
  chapterIds.add(ch.id);
  if (!ch.icon || !ch.name || !ch.desc) err(at + ': icon/name/desc 필요');
  if (!!ch.pages === !!ch.items) { err(at + ': pages 또는 items 중 하나만 가져야 함'); return; }

  if (ch.pages) {
    if (scopeIds.has(ch.id)) err(at + ': 페이지 id 접두사 중복');
    scopeIds.add(ch.id);
    checkPages(ch, at, ch.id === 'word');
  } else {
    ch.items.forEach(it => {
      const iat = at + ' > ' + (it.id || '?');
      if (!it.id) err(iat + ': id 없음');
      if (scopeIds.has(it.id)) err(iat + ': 항목 id 중복 (페이지 id 가 겹침)');
      scopeIds.add(it.id);
      if (!it.e || !it.name || !it.kind) err(iat + ': e/name/kind 필요');
      if (!Array.isArray(it.full) || !it.full.length) err(iat + ': 전체 듣기(full) 없음');
      checkPages(it, iat, ch.id === 'word');
    });
  }
});

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터 검증 통과 — 챕터 ' + D.chapters.length + '개, 페이지 ' + pageCount + '장');
