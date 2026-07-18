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

function checkPages(scope, label, needEmoji, maxUnits) {
  if (!Array.isArray(scope.pages) || !scope.pages.length) { err(label + ': pages 없음'); return; }
  scope.pages.forEach((p, i) => {
    pageCount++;
    const at = label + ' pages[' + i + ']';
    if (!p.text || typeof p.text !== 'string') { err(at + ': text 없음'); return; }
    if (p.text !== p.text.trim()) err(at + ': text 앞뒤 공백 — "' + p.text + '"');
    const u = units(p.text);
    if (u > maxUnits) err(at + ': 너무 김 (' + u + '칸, 최대 ' + maxUnits + ') — "' + p.text + '"');
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
    checkPages(ch, at, ch.id === 'word', 11);
  } else {
    ch.items.forEach(it => {
      const iat = at + ' > ' + (it.id || '?');
      if (!it.id) err(iat + ': id 없음');
      if (scopeIds.has(it.id)) err(iat + ': 항목 id 중복 (페이지 id 가 겹침)');
      scopeIds.add(it.id);
      if (!it.e || !it.name || !it.kind) err(iat + ': e/name/kind 필요');
      if (ch.dict) {
        // 받아쓰기: 정답을 미리 들려주면 안 되므로 full 없음, 단계당 30개 이상,
        // 두 줄로 나눠 쓰므로 최대 20칸까지 허용
        if (it.full) err(iat + ': 받아쓰기 단계에 full(전체 듣기)이 있으면 정답이 새어 나감');
        if (it.pages && it.pages.length < 30) err(iat + ': 받아쓰기 단계는 30개 이상이어야 함 (현재 ' + it.pages.length + ')');
        checkPages(it, iat, false, 20);
      } else {
        if (!Array.isArray(it.full) || !it.full.length) err(iat + ': 전체 듣기(full) 없음');
        checkPages(it, iat, ch.id === 'word', 11);
      }
    });
  }
});

/* 요리조리 풍선 줄 — 곡선 데이터 계약:
 * 3단계 × 10개 = 30개, 시작점은 풍선 꼭지(260,244) 근처, 모든 점이 카드(520×640) 안,
 * 1~2단계는 따라 그리기(trace: true), 3단계는 보고 그리기(trace: false), 곡선 중복 금지 */
let curveCount = 0;
(function checkBalloons() {
  const B = D.balloons;
  const KX = 260, KY = 244, BW = 520, BH = 640;
  if (!B || !Array.isArray(B.levels)) { err('balloons(요리조리 풍선 줄) 없음'); return; }
  if (!B.icon || !B.name || !B.desc) err('balloons: icon/name/desc 필요');
  if (B.levels.length !== 3) { err('balloons: 단계는 3개여야 함 (현재 ' + B.levels.length + ')'); return; }
  const seen = new Set();
  B.levels.forEach((lv, li) => {
    const at = '풍선 ' + (lv.id || '?');
    if (!lv.id || !/^line\d+$/.test(lv.id)) err(at + ': id는 line* 형식이어야 함');
    if (scopeIds.has(lv.id)) err(at + ': id가 다른 챕터·항목과 겹침');
    scopeIds.add(lv.id);
    if (!lv.e || !lv.name || !lv.kind) err(at + ': e/name/kind 필요');
    if (li < 2 && lv.trace !== true) err(at + ': 1~2단계는 따라 그리기(trace: true)여야 함');
    if (li === 2 && lv.trace !== false) err(at + ': 3단계는 보고 그리기(trace: false)여야 함');
    if (!Array.isArray(lv.pages) || lv.pages.length !== 10) {
      err(at + ': 단계마다 곡선 10개여야 함 (현재 ' + (lv.pages ? lv.pages.length : 0) + ')');
      return;
    }
    lv.pages.forEach((p, i) => {
      curveCount++;
      const pat = at + ' pages[' + i + ']';
      if (!p.name || !p.say) err(pat + ': name/say 필요');
      const pts = p.p;
      if (!Array.isArray(pts) || pts.length < 8 || pts.length % 2) { err(pat + ': 점열(p)이 이상함'); return; }
      if (Math.hypot(pts[0] - KX, pts[1] - KY) > 20) {
        err(pat + ': 시작점(' + pts[0] + ',' + pts[1] + ')이 풍선 꼭지(260,244) 근처가 아님');
      }
      let len = 0;
      for (let j = 0; j < pts.length; j += 2) {
        if (!Number.isFinite(pts[j]) || !Number.isFinite(pts[j + 1]) ||
            pts[j] < 0 || pts[j] > BW || pts[j + 1] < 0 || pts[j + 1] > BH) {
          err(pat + ': 점(' + pts[j] + ',' + pts[j + 1] + ')이 카드(520×640) 밖');
        }
        if (j >= 2) len += Math.hypot(pts[j] - pts[j - 2], pts[j + 1] - pts[j - 1]);
      }
      if (len < 300) err(pat + ': 줄이 너무 짧음 (' + Math.round(len) + ', 최소 300)');
      const key = pts.join(',');
      if (seen.has(key)) err(pat + ': 곡선이 다른 페이지와 중복');
      seen.add(key);
    });
  });
})();

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터 검증 통과 — 챕터 ' + D.chapters.length + '개, 페이지 ' + pageCount + '장, 풍선 줄 곡선 ' + curveCount + '개');
