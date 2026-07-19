/* 데이터 검증 — node bag/tools/validate-data.js
 * 숟가락(물건 2~6개·위치 판 안·각도·id 유일·단계별 개수), 빨대(슬라이더 3~5개·목표 0~1·색 유일),
 * 네모 조각(조각 2×2칸·주황 수·회전만으로 풀리는지 시뮬·해답 각도 유일·본보기 일치),
 * 세 놀이 각각 30개 이상인지 정적 검사한다.
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.BagData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

function uniqueIds(list, label) {
  const seen = new Set();
  list.forEach(p => {
    if (seen.has(p.id)) err(label + ' id 중복: ' + p.id);
    seen.add(p.id);
    if (!p.name || !p.emoji) err(label + ' ' + p.id + ': 이름·이모지 필요');
    if (!(p.level >= 1 && p.level <= 3)) err(label + ' ' + p.id + ': 단계(level)는 1~3 (' + p.level + ')');
  });
}
// 단계별 도안 수가 기대치와 같은지
function levelCounts(list, label, want) {
  [1, 2, 3].forEach(lv => {
    const n = list.filter(p => p.level === lv).length;
    if (n !== want) err(label + ' ' + lv + '단계 도안 수가 ' + want + '이 아님 (' + n + ')');
  });
}

/* ─────────── 숟가락 ─────────── */
const KNOWN_TYPES = D.SPOON_TYPES;
if (!Array.isArray(D.spoons) || D.spoons.length < 30) err('숟가락 도안이 30개 미만: ' + (D.spoons || []).length);
uniqueIds(D.spoons, '숟가락');
levelCounts(D.spoons, '숟가락', 10);
const OBJ_BY_LEVEL = { 1: 3, 2: 4, 3: 5 };
D.spoons.forEach(pz => {
  if (![0, 45, 90].includes(pz.rotStep)) err('숟가락 ' + pz.id + ': rotStep은 0·45·90 (' + pz.rotStep + ')');
  if (!Array.isArray(pz.objs) || pz.objs.length < 2 || pz.objs.length > 6) {
    err('숟가락 ' + pz.id + ': 물건은 2~6개 (' + (pz.objs || []).length + ')');
  }
  if (pz.objs.length !== OBJ_BY_LEVEL[pz.level]) {
    err('숟가락 ' + pz.id + ': ' + pz.level + '단계 물건 수는 ' + OBJ_BY_LEVEL[pz.level] + '개여야 함 (' + pz.objs.length + ')');
  }
  pz.objs.forEach((o, i) => {
    if (!KNOWN_TYPES.includes(o.type)) err('숟가락 ' + pz.id + ' 물건 ' + i + ': 모르는 종류 ' + o.type);
    if (!(o.x >= 5 && o.x <= 95) || !(o.y >= 5 && o.y <= 95)) {
      err('숟가락 ' + pz.id + ' 물건 ' + i + ': 판(5~95) 밖 (' + o.x + ',' + o.y + ')');
    }
    if (!(o.rot >= 0 && o.rot < 360)) err('숟가락 ' + pz.id + ' 물건 ' + i + ': 각도는 0~359 (' + o.rot + ')');
    // 각도는 단계의 회전 단위(rotStep)로 갈 수 있어야 함
    if (pz.rotStep === 0) { if (o.rot !== 0) err('숟가락 ' + pz.id + ' 물건 ' + i + ': 회전 없는 단계인데 각도 ' + o.rot); }
    else if (o.rot % pz.rotStep !== 0) err('숟가락 ' + pz.id + ' 물건 ' + i + ': 각도가 ' + pz.rotStep + '의 배수가 아님 (' + o.rot + ')');
  });
});

/* ─────────── 빨대 ─────────── */
if (!Array.isArray(D.straws) || D.straws.length < 30) err('빨대 도안이 30개 미만: ' + (D.straws || []).length);
uniqueIds(D.straws, '빨대');
levelCounts(D.straws, '빨대', 10);
const SLIDER_BY_LEVEL = { 1: 3, 2: 5, 3: 5 };
D.straws.forEach(pz => {
  if (!Array.isArray(pz.sliders) || pz.sliders.length < 3 || pz.sliders.length > 5) {
    err('빨대 ' + pz.id + ': 슬라이더는 3~5개 (' + (pz.sliders || []).length + ')');
  }
  if (pz.sliders.length !== SLIDER_BY_LEVEL[pz.level]) {
    err('빨대 ' + pz.id + ': ' + pz.level + '단계 슬라이더 수는 ' + SLIDER_BY_LEVEL[pz.level] + '개여야 함 (' + pz.sliders.length + ')');
  }
  const colors = new Set();
  pz.sliders.forEach((s, i) => {
    if (!s.color) err('빨대 ' + pz.id + ' 슬라이더 ' + i + ': 색 없음');
    if (colors.has(s.color)) err('빨대 ' + pz.id + ': 색 중복 ' + s.color);
    colors.add(s.color);
    if (!(s.target >= 0 && s.target <= 1)) err('빨대 ' + pz.id + ' 슬라이더 ' + i + ': 목표 높이는 0~1 (' + s.target + ')');
  });
  // 목표 높이가 서로 너무 붙어 있지 않은지(±8% 스냅과 겹치면 헷갈림) — 0.1 이상 벌어져야 함
  const ts = pz.sliders.map(s => s.target).sort((a, b) => a - b);
  for (let i = 1; i < ts.length; i++) {
    if (ts[i] - ts[i - 1] < 0.1) err('빨대 ' + pz.id + ': 목표 높이가 너무 가까움 (' + ts[i - 1] + ', ' + ts[i] + ')');
  }
});

/* ─────────── 네모 조각 ─────────── */
// 2×2 칸 회전([a,b,c,d] → [c,a,d,b]) — data.js가 내보낸 것을 쓰되 없으면 자체 구현
const rotCells = D.rotCells || (c => [c[2], c[0], c[3], c[1]]);
function rotDeg(cells, deg) { let c = cells.slice(); for (let i = 0; i < ((deg / 90) % 4 + 4) % 4; i++) c = rotCells(c); return c; }
function eqCells(a, b) { return a.length === b.length && a.every((v, i) => v === b[i]); }

if (!Array.isArray(D.squares) || D.squares.length < 30) err('네모 조각 도안이 30개 미만: ' + (D.squares || []).length);
uniqueIds(D.squares, '네모');
levelCounts(D.squares, '네모', 10);
const SQ_PIECES_BY_LEVEL = { 1: 1, 2: 4, 3: 4 };   // 판 크기: 1단계 2×2(조각1), 2·3단계 4×4(조각4)
const SQ_SIZE_BY_LEVEL = { 1: 2, 2: 4, 3: 4 };
const SQ_ORANGE_MAX = { 1: 1, 2: 2, 3: 3 };        // 단계별 조각당 주황 칸 상한
D.squares.forEach(pz => {
  if (pz.size !== SQ_SIZE_BY_LEVEL[pz.level]) err('네모 ' + pz.id + ': ' + pz.level + '단계 판 크기는 ' + SQ_SIZE_BY_LEVEL[pz.level] + ' (' + pz.size + ')');
  if (!Array.isArray(pz.pieces) || pz.pieces.length !== SQ_PIECES_BY_LEVEL[pz.level]) {
    err('네모 ' + pz.id + ': ' + pz.level + '단계 조각 수는 ' + SQ_PIECES_BY_LEVEL[pz.level] + '개 (' + (pz.pieces || []).length + ')');
  }
  // 조각 수 = (size/2)^2 (판을 2×2 조각으로 빈틈없이 채움)
  if (pz.pieces && pz.pieces.length !== (pz.size / 2) * (pz.size / 2)) {
    err('네모 ' + pz.id + ': 조각 수가 판을 채우지 못함 (' + pz.pieces.length + ')');
  }
  (pz.pieces || []).forEach((pc, i) => {
    // 칸: 길이 4, 값 0/1
    if (!Array.isArray(pc.cells) || pc.cells.length !== 4 || pc.cells.some(v => v !== 0 && v !== 1)) {
      return err('네모 ' + pz.id + ' 조각 ' + i + ': cells는 0/1 4칸 (' + JSON.stringify(pc.cells) + ')');
    }
    const nOr = pc.cells.reduce((a, v) => a + v, 0);
    if (nOr < 1 || nOr > SQ_ORANGE_MAX[pz.level]) {
      err('네모 ' + pz.id + ' 조각 ' + i + ': 주황 칸은 1~' + SQ_ORANGE_MAX[pz.level] + '개 (' + nOr + ')');
    }
    // 시작 각도: 90·180·270 중 하나
    if (![90, 180, 270].includes(pc.startRot)) err('네모 ' + pz.id + ' 조각 ' + i + ': startRot은 90·180·270 (' + pc.startRot + ')');
    // 회전만으로 풀리는지 시뮬레이션 — 시작 각도에서 +90씩 최대 4번, 본보기(제자리 무늬)와 같아지는 각도가 나와야 함
    let reached = false, needsTurn = !eqCells(rotDeg(pc.cells, pc.startRot), pc.cells);
    for (let t = 0; t <= 4; t++) {
      const deg = (pc.startRot + t * 90) % 360;
      if (eqCells(rotDeg(pc.cells, deg), pc.cells)) { reached = true; break; }
    }
    if (!reached) err('네모 ' + pz.id + ' 조각 ' + i + ': 회전만으로 본보기와 맞출 수 없음');
    if (!needsTurn) err('네모 ' + pz.id + ' 조각 ' + i + ': 처음부터 정답이라 돌릴 필요가 없음(재미 없음)');
    // 네 방향이 모두 달라야(해답 각도 유일) — 대각선·꽉참·빈칸 무늬 금지
    const rots = [0, 90, 180, 270].map(d => rotDeg(pc.cells, d));
    const solvedCount = rots.filter(r => eqCells(r, pc.cells)).length;
    if (solvedCount !== 1) err('네모 ' + pz.id + ' 조각 ' + i + ': 해답 각도가 유일하지 않음(대칭 무늬) — ' + JSON.stringify(pc.cells));
  });
});

/* ─────────── 요리조리 풍선 줄 ───────────
 * 3단계 × 10개 = 30개, 시작점은 풍선 꼭지(260,244) 근처, 모든 점이 카드(520×640) 안,
 * 1~2단계는 따라 그리기(trace: true), 3단계는 보고 그리기(trace: false), 곡선 중복 금지 */
let curveCount = 0;
(function checkBalloons() {
  const B = D.balloons;
  const KX = 260, KY = 244, BW = 520, BH = 640;
  if (!B || !Array.isArray(B.levels)) { err('balloons(요리조리 풍선 줄) 없음'); return; }
  if (!B.icon || !B.name || !B.desc) err('balloons: icon/name/desc 필요');
  if (B.levels.length !== 3) { err('balloons: 단계는 3개여야 함 (현재 ' + B.levels.length + ')'); return; }
  const ids = new Set(), seen = new Set();
  B.levels.forEach((lv, li) => {
    const at = '풍선 ' + (lv.id || '?');
    if (!lv.id || !/^line\d+$/.test(lv.id)) err(at + ': id는 line* 형식이어야 함');
    if (ids.has(lv.id)) err(at + ': id 중복');
    ids.add(lv.id);
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
console.log('✅ 데이터 검증 통과 — 숟가락 ' + D.spoons.length + '개, 빨대 ' + D.straws.length + '개, 네모 ' + D.squares.length + '개, 풍선 줄 곡선 ' + curveCount + '개');
