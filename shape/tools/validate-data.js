/* 데이터 검증 — node shape/tools/validate-data.js
 * 칠교 도안(조각 7개 구성·회전각·겹침), 블록 퍼즐(칸 중복·격자 안·이어짐),
 * 도형 맞추기(도형 종류·그림판 안) 계약을 정적 검사한다.
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.ShapeData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

/* ─────────── 공용 기하 ─────────── */
const rad = d => d * Math.PI / 180;
function rotPt(p, deg) {
  const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
}
function inPoly(pt, poly) { // 짝홀 규칙 점-다각형 포함 판정
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > pt[1]) !== (yj > pt[1]) &&
        pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function polyArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}
function shrink(poly, f) { // 무게중심 쪽으로 살짝 줄여 경계 접촉을 겹침으로 오판하지 않게
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length;
  const cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
  return poly.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f]);
}
function uniqueIds(list, label) {
  const seen = new Set();
  list.forEach(p => {
    if (seen.has(p.id)) err(label + ' id 중복: ' + p.id);
    seen.add(p.id);
    if (!p.name || !p.emoji) err(label + ' ' + p.id + ': 이름·이모지 필요');
  });
}

/* ─────────── 칠교 ─────────── */
if (D.tangrams.length < 10) err('칠교 도안이 10개 미만: ' + D.tangrams.length);
uniqueIds(D.tangrams, '칠교');
const noRot = D.tangrams.filter(p => !p.rotate).length;
const withRot = D.tangrams.filter(p => p.rotate).length;
if (noRot < 5) err('회전 없는 칠교 도안이 5개 미만: ' + noRot);
if (withRot < 5) err('회전 있는 칠교 도안이 5개 미만: ' + withRot);

D.tangrams.forEach(pz => {
  // 조각 일곱 개 구성: 큰삼각형2·중간삼각형1·작은삼각형2·정사각형1·평행사변형1
  const kinds = pz.pieces.map(p => p.t).sort().join(',');
  const want = [...D.TAN_SET].sort().join(',');
  if (kinds !== want) err('칠교 ' + pz.id + ': 조각 구성이 다름 (' + kinds + ')');
  const polys = pz.pieces.map(pc => {
    if (!D.TAN_SHAPES[pc.t]) { err('칠교 ' + pz.id + ': 모르는 조각 ' + pc.t); return []; }
    if (pc.r % 45 !== 0 || pc.r < 0 || pc.r >= 360) err('칠교 ' + pz.id + ': 회전각은 0~315의 45 배수여야 함 (' + pc.r + ')');
    if (!isFinite(pc.x) || !isFinite(pc.y)) err('칠교 ' + pz.id + ': 좌표가 숫자가 아님');
    return D.TAN_SHAPES[pc.t].map(q => {
      const r = rotPt(q, pc.r);
      return [r[0] + pc.x, r[1] + pc.y];
    });
  });
  // 전체 테두리가 어이없이 크지 않은지 (판에 맞게 확대되므로 12단위 안이면 충분)
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  polys.forEach(poly => poly.forEach(([x, y]) => {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }));
  if (x1 - x0 > 12 || y1 - y0 > 12) err('칠교 ' + pz.id + ': 도안이 너무 큼 (' + (x1 - x0).toFixed(1) + '×' + (y1 - y0).toFixed(1) + ')');
  // 넓이 보존: 일곱 조각 합 = 8 (작은삼각형 직각변 1 기준)
  const area = polys.reduce((s, p) => s + polyArea(p), 0);
  if (Math.abs(area - 8) > 0.01) err('칠교 ' + pz.id + ': 조각 넓이 합이 8이 아님 (' + area.toFixed(3) + ')');
  // 조각끼리 겹침: 살짝 줄인 다각형 안에 촘촘한 표본점을 놓고 두 조각에 동시에 들어가면 겹침
  const small = polys.map(p => shrink(p, 0.96));
  for (let i = 0; i < polys.length; i++) {
    for (let gx = 0; gx <= 40; gx++) {
      for (let gy = 0; gy <= 40; gy++) {
        const pt = [x0 + (x1 - x0) * gx / 40, y0 + (y1 - y0) * gy / 40];
        if (!inPoly(pt, small[i])) continue;
        for (let j = i + 1; j < polys.length; j++) {
          if (inPoly(pt, small[j])) {
            err('칠교 ' + pz.id + ': 조각 ' + i + '·' + j + ' 겹침 (' + pt[0].toFixed(2) + ',' + pt[1].toFixed(2) + ')');
            gx = gy = 99; // 도안당 한 번만 보고
            break;
          }
        }
      }
    }
  }
});

/* ─────────── 블록 퍼즐 ─────────── */
if (D.blocks.length < 6) err('블록 퍼즐이 6개 미만: ' + D.blocks.length);
uniqueIds(D.blocks, '블록');
D.blocks.forEach(pz => {
  if (!(pz.cols > 0) || !(pz.rows > 0)) err('블록 ' + pz.id + ': 격자 크기 오류');
  if (pz.pieces.length < 4) err('블록 ' + pz.id + ': 조각이 너무 적음 (' + pz.pieces.length + ')');
  const used = new Set();
  let total = 0;
  pz.pieces.forEach((pc, i) => {
    if (!pc.color) err('블록 ' + pz.id + ' 조각 ' + i + ': 색 없음');
    if (!pc.cells.length) err('블록 ' + pz.id + ' 조각 ' + i + ': 칸 없음');
    // 칸이 서로 붙어 있는지 (상하좌우 이어짐)
    const cs = pc.cells.map(([dx, dy]) => dx + ',' + dy);
    const seen = new Set([cs[0]]);
    let grew = true;
    while (grew) {
      grew = false;
      pc.cells.forEach(([dx, dy]) => {
        const k = dx + ',' + dy;
        if (seen.has(k)) return;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ax, ay]) => seen.has((dx + ax) + ',' + (dy + ay)))) {
          seen.add(k);
          grew = true;
        }
      });
    }
    if (seen.size !== pc.cells.length) err('블록 ' + pz.id + ' 조각 ' + i + ' (' + pc.name + '): 칸이 이어져 있지 않음');
    pc.cells.forEach(([dx, dy]) => {
      const gx = pc.x + dx, gy = pc.y + dy;
      if (gx < 0 || gy < 0 || gx >= pz.cols || gy >= pz.rows) err('블록 ' + pz.id + ' 조각 ' + i + ': 칸 (' + gx + ',' + gy + ')이 격자 밖');
      const k = gx + ',' + gy;
      if (used.has(k)) err('블록 ' + pz.id + ': 칸 (' + k + ') 중복');
      used.add(k);
      total++;
    });
  });
  if (used.size !== total) err('블록 ' + pz.id + ': 조각 칸 수 합(' + total + ')과 목표 칸 수(' + used.size + ')가 다름');
});

/* ─────────── 도형 맞추기 ─────────── */
const SHAPE_KINDS = ['tri', 'sq', 'rect', 'circ', 'semi', 'trap', 'trapd'];
if (D.shapes.length < 6) err('도형 맞추기 그림이 6개 미만: ' + D.shapes.length);
uniqueIds(D.shapes, '도형');
D.shapes.forEach(pz => {
  if (pz.parts.length < 5) err('도형 ' + pz.id + ': 부품이 너무 적음 (' + pz.parts.length + ')');
  pz.parts.forEach((pt, i) => {
    if (!SHAPE_KINDS.includes(pt.s)) err('도형 ' + pz.id + ' 부품 ' + i + ': 모르는 도형 ' + pt.s);
    if (!(pt.w > 0) || !(pt.h > 0)) err('도형 ' + pz.id + ' 부품 ' + i + ': 크기 오류');
    if (pt.x < 0 || pt.y < 0 || pt.x + pt.w > 100 || pt.y + pt.h > 100) {
      err('도형 ' + pz.id + ' 부품 ' + i + ': 100×100 그림판 밖 (' + pt.x + ',' + pt.y + ' ' + pt.w + '×' + pt.h + ')');
    }
    if (pt.s === 'sq' && pt.w !== pt.h) err('도형 ' + pz.id + ' 부품 ' + i + ': 정사각형은 가로세로가 같아야 함');
    if (pt.s === 'circ' && pt.w !== pt.h) err('도형 ' + pz.id + ' 부품 ' + i + ': 동그라미는 가로세로가 같아야 함');
    if (!pt.color) err('도형 ' + pz.id + ' 부품 ' + i + ': 색 없음');
  });
});

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 데이터 검증 통과 — 칠교 ' + D.tangrams.length + '개(회전없음 ' + noRot + '·회전 ' + withRot +
  '), 블록 ' + D.blocks.length + '개, 도형 맞추기 ' + D.shapes.length + '개');
