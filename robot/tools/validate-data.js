/* 데이터 검증 — node robot/tools/validate-data.js
 *
 * 이 놀이의 데이터 계약에서 가장 중요한 것은 **"그 마당이 정말 풀리는가"** 다.
 * 그림 데이터가 아니라 길이기 때문이다. 그래서 정적 검사(좌표·개수·겹침) 뒤에
 * 30판을 **전부 BFS 로 풀어 보고**, 최단 명령 수가 그 단계의 범위 안인지 잰다.
 * (선례: slide/tools/validate-data.js 가 solution 을 실제로 재생해 목표 도달을 확인한다.
 *  여기서는 solution 을 손으로 적지 않고 검증기가 직접 푼다 — 손으로 적은 답은 데이터와
 *  같이 낡는다.)
 *
 * 함께 재는 것
 *   · 단계1 은 곧은 길인가(꺾임 0)          — 다섯 살의 첫 심부름
 *   · 단계2 는 꺾임이 한두 번인가            — 최단 경로 중 **가장 적게 꺾는 길**로 잰다
 *   · 단계3 은 열쇠를 먼저 줍는 길인가,
 *     그리고 **열쇠 없이 문 앞까지 갈 수 있는가**(잠긴 문을 직접 겪어야 배운다)
 *   · 부딪힘을 배울 수 있게, 시작 칸 옆에 벽·웅덩이가 있는 판이 넉넉한가
 */
'use strict';

global.window = {};
require('../js/data.js');
const D = global.window.RobotData;

let errors = 0;
function err(msg) { errors++; console.error('❌ ' + msg); }

const LEVEL_N = { 1: 4, 2: 5, 3: 6 };            // 단계별 격자 크기
const LEVEL_CMDS = { 1: [2, 4], 2: [5, 7], 3: [8, 10] };  // 단계별 최단 명령 수 범위
const LEVEL_TURNS = { 1: [0, 0], 2: [1, 2], 3: [0, 99] }; // 단계별 꺾임 수 범위

/* ── 방향 4가지 ── */
if (!Array.isArray(D.DIR_IDS) || D.DIR_IDS.length !== 4) err('방향은 절대 방향 4가지여야 함');
['up', 'down', 'left', 'right'].forEach(id => {
  const d = D.DIRS[id];
  if (!d) { err('방향 ' + id + ': 정의 없음'); return; }
  if (!d.name || !d.say || !d.sym) err('방향 ' + id + ': 이름/읽기/아이콘 누락');
  if (Math.abs(d.dx) + Math.abs(d.dy) !== 1) err('방향 ' + id + ': 한 칸 이동이 아님');
});
// 회전 명령이 섞여 들어오면 안 된다 — 자기중심 회전은 6~7세 개념
Object.keys(D.DIRS).forEach(id => {
  if (['up', 'down', 'left', 'right'].indexOf(id) < 0) err('절대 방향이 아닌 명령이 있음 — ' + id);
});

/* ── 최단 경로 중 '가장 적게 꺾는' 길의 꺾임 수 ──
 * 비용 = 걸음수 * 1000 + 꺾임수 로 다익스트라. 꺾임은 1000 미만이므로
 * 몫이 최단 걸음수, 나머지가 그 걸음수에서 가능한 최소 꺾임 수가 된다. */
function minTurnsOfShortest(pz) {
  const DIRS = D.DIR_IDS;
  const key = (x, y, k, d) => ((y * pz.n + x) * 2 + (k ? 1 : 0)) * 5 + d;
  const startK = D.isKey(pz, pz.start[0], pz.start[1]) ? 1 : 0;
  const best = new Map();
  const q = [{ x: pz.start[0], y: pz.start[1], k: !!startK, d: 4, cost: 0 }]; // d=4 : 아직 안 움직임
  best.set(key(pz.start[0], pz.start[1], startK, 4), 0);
  let done = null;
  while (q.length) {
    // 작은 비용부터 (판이 작아 선형 탐색으로 충분)
    let bi = 0;
    for (let i = 1; i < q.length; i++) if (q[i].cost < q[bi].cost) bi = i;
    const cur = q.splice(bi, 1)[0];
    if (cur.x === pz.goal[0] && cur.y === pz.goal[1]) { done = cur; break; }
    for (let i = 0; i < DIRS.length; i++) {
      const r = D.step(pz, cur.x, cur.y, cur.k, DIRS[i]);
      if (r.blocked) continue;
      const turn = (cur.d === 4 || cur.d === i) ? 0 : 1;
      const cost = cur.cost + 1000 + turn;
      const kk = key(r.x, r.y, r.hasKey ? 1 : 0, i);
      if (best.has(kk) && best.get(kk) <= cost) continue;
      best.set(kk, cost);
      q.push({ x: r.x, y: r.y, k: !!r.hasKey, d: i, cost });
    }
  }
  if (!done) return null;
  return { steps: Math.floor(done.cost / 1000), turns: done.cost % 1000 };
}

/* ── 판 30개 ── */
if (!Array.isArray(D.PUZZLES) || D.PUZZLES.length !== 30) {
  err('판이 30개여야 함 — ' + (D.PUZZLES ? D.PUZZLES.length : 0));
}
const perLevel = { 1: 0, 2: 0, 3: 0 };
const seenIds = new Set();
const seenSig = new Set();
let adjacentObstacle = 0;      // 시작 칸 옆에 벽·웅덩이가 있는 판 수
const lens = [];

(D.PUZZLES || []).forEach(pz => {
  const tag = '판 ' + (pz.id || '?');
  if (!pz.id || seenIds.has(pz.id)) err(tag + ': id 누락/중복');
  seenIds.add(pz.id);
  if (![1, 2, 3].includes(pz.level)) { err(tag + ': 단계 오류 — ' + pz.level); return; }
  perLevel[pz.level]++;

  // 격자 크기가 단계와 맞는가
  if (pz.n !== LEVEL_N[pz.level]) err(tag + ': 단계 ' + pz.level + ' 격자는 ' + LEVEL_N[pz.level] + '×' + LEVEL_N[pz.level] + ' 여야 함 — ' + pz.n);

  // 모든 좌표가 격자 안인가
  const cells = [['시작', pz.start], ['목표', pz.goal]];
  if (pz.key) cells.push(['열쇠', pz.key]);
  pz.walls.forEach((c, i) => cells.push(['벽' + i, c]));
  pz.puddles.forEach((c, i) => cells.push(['웅덩이' + i, c]));
  cells.forEach(([nm, c]) => {
    if (!Array.isArray(c) || c.length !== 2 || !Number.isInteger(c[0]) || !Number.isInteger(c[1])) {
      err(tag + ': ' + nm + ' 좌표 형식 오류 — ' + JSON.stringify(c));
    } else if (!D.inside(pz, c[0], c[1])) {
      err(tag + ': ' + nm + ' 좌표가 격자 밖 — ' + JSON.stringify(c) + ' (n=' + pz.n + ')');
    }
  });

  // 칸이 겹치지 않는가 (시작·목표·열쇠·벽·웅덩이는 서로 다른 칸)
  const seenCell = new Set();
  cells.forEach(([nm, c]) => {
    if (!Array.isArray(c) || c.length !== 2) return;
    const k = c[0] + ',' + c[1];
    if (seenCell.has(k)) err(tag + ': 칸이 겹침 — ' + nm + ' ' + k);
    seenCell.add(k);
  });

  // 시작 ≠ 목표
  if (pz.start[0] === pz.goal[0] && pz.start[1] === pz.goal[1]) err(tag + ': 시작과 목표가 같은 칸');

  // 열쇠는 단계3 에만
  if (pz.level === 3 && !pz.key) err(tag + ': 단계3 인데 열쇠가 없음');
  if (pz.level !== 3 && pz.key) err(tag + ': 단계 ' + pz.level + ' 에는 열쇠를 두지 않는다');

  // 단계1 은 빈 마당
  if (pz.level === 1 && (pz.walls.length || pz.puddles.length)) err(tag + ': 단계1 은 빈 마당이어야 함');
  // 단계2·3 은 벽·웅덩이가 있어야 한다
  if (pz.level >= 2 && pz.walls.length + pz.puddles.length < 2) {
    err(tag + ': 단계 ' + pz.level + ' 은 벽·웅덩이가 둘 이상이어야 함');
  }

  /* ★ 가장 중요 — 정말 풀리는가 (BFS 전수 검증) */
  const sol = D.solve(pz);
  if (!sol) { err(tag + ': 풀 수 없는 마당 (목표까지 길이 없음)'); return; }

  // 찾은 명령을 실제로 재생해 목표에 닿는지 되짚어 본다 (BFS 를 그대로 믿지 않는다)
  let x = pz.start[0], y = pz.start[1], hasKey = D.isKey(pz, x, y);
  for (let i = 0; i < sol.length; i++) {
    const r = D.step(pz, x, y, hasKey, sol[i]);
    if (r.blocked) { err(tag + ': 해답 재생 중 막힘 — ' + i + '번째 ' + sol[i] + ' (' + r.blocked + ')'); return; }
    x = r.x; y = r.y; hasKey = r.hasKey;
  }
  if (x !== pz.goal[0] || y !== pz.goal[1]) { err(tag + ': 해답을 다 써도 목표에 못 닿음'); return; }
  if (pz.key && !hasKey) err(tag + ': 열쇠 없이 문에 들어갔다 (문 규칙이 새고 있음)');

  // 최단 명령 수가 단계 범위 안인가
  const [lo, hi] = LEVEL_CMDS[pz.level];
  if (sol.length < lo || sol.length > hi) {
    err(tag + ': 단계 ' + pz.level + ' 최단 명령 ' + sol.length + '개가 범위[' + lo + '~' + hi + '] 밖');
  }

  // 꺾임 수
  const mt = minTurnsOfShortest(pz);
  if (!mt) { err(tag + ': 꺾임 계산 실패'); return; }
  if (mt.steps !== sol.length) err(tag + ': 최단 걸음 수 불일치 — BFS ' + sol.length + ' vs 다익스트라 ' + mt.steps);
  const [tlo, thi] = LEVEL_TURNS[pz.level];
  if (mt.turns < tlo || mt.turns > thi) {
    err(tag + ': 단계 ' + pz.level + ' 꺾임 ' + mt.turns + '번이 범위[' + tlo + '~' + thi + '] 밖');
  }
  lens.push({ id: pz.id, level: pz.level, steps: sol.length, turns: mt.turns });

  // 단계3 — 열쇠를 밟지 않고 문 앞까지 갈 수 있어야 한다(잠긴 문을 직접 겪는 자리)
  if (pz.level === 3) {
    const toDoor = D.pathToDoor(pz);
    if (!toDoor) err(tag + ': 열쇠 없이 문 앞까지 가는 길이 없음 — 잠긴 문을 겪을 수 없다');
    else {
      // 그 길을 재생하면 문 앞에 서고, 문으로 한 걸음 더 가면 막혀야 한다
      let ax = pz.start[0], ay = pz.start[1], k = false;
      toDoor.dirs.forEach(d => { const r = D.step(pz, ax, ay, k, d); ax = r.x; ay = r.y; k = r.hasKey; });
      if (k) err(tag + ': 문 앞까지 가는 길이 열쇠를 밟는다');
      const bump = D.step(pz, ax, ay, k, toDoor.into);
      if (bump.blocked !== 'door') err(tag + ': 열쇠 없이 문에 들어가진다 — ' + bump.blocked);
    }
  }

  /* 벽·웅덩이가 **정말 막는가** — 이동 규칙 자체를 따로 잰다.
   * BFS 는 step() 을 쓰므로, 규칙이 새면 길찾기도 같이 새서 "풀린다"로 통과해 버린다
   * (실제로 벽 판정을 지워 놓고 돌려 보니 위의 전수 검증이 그대로 통과했다).
   * 그래서 여기서는 이웃 칸에서 장애물 칸으로 한 걸음 들어가 보고 막히는지 직접 본다. */
  [['wall', pz.walls], ['puddle', pz.puddles]].forEach(([kind, list]) => {
    list.forEach(c => {
      let tested = 0;
      D.DIR_IDS.forEach(d => {
        const dd = D.DIRS[d];
        const fx = c[0] - dd.dx, fy = c[1] - dd.dy;   // 그 방향으로 들어오는 이웃 칸
        if (!D.inside(pz, fx, fy)) return;
        if (D.isWall(pz, fx, fy) || D.isPuddle(pz, fx, fy)) return;
        tested++;
        const r = D.step(pz, fx, fy, true, d);
        if (r.blocked !== kind) err(tag + ': ' + kind + ' ' + JSON.stringify(c) + ' 이 안 막는다 — ' + (r.blocked || '통과됨'));
      });
      if (!tested) err(tag + ': ' + kind + ' ' + JSON.stringify(c) + ' 에 들어가 볼 이웃 칸이 없다');
    });
  });

  // 시작 칸 옆에 벽·웅덩이가 있는가 (부딪힘을 배우는 자리)
  const near = D.DIR_IDS.some(d => {
    const dd = D.DIRS[d], nx = pz.start[0] + dd.dx, ny = pz.start[1] + dd.dy;
    return D.inside(pz, nx, ny) && (D.isWall(pz, nx, ny) || D.isPuddle(pz, nx, ny));
  });
  if (near) adjacentObstacle++;

  // 판 유일성 (같은 시작·목표·장애물 배치가 두 번 나오지 않게)
  const sig = pz.level + '|' + pz.n + '|' + pz.start + '|' + pz.goal + '|' + (pz.key || '-') + '|' +
    JSON.stringify(pz.walls) + '|' + JSON.stringify(pz.puddles);
  if (seenSig.has(sig)) err(tag + ': 같은 구성의 판이 중복됨');
  seenSig.add(sig);
});
[1, 2, 3].forEach(lv => { if (perLevel[lv] !== 10) err('단계 ' + lv + ' 판이 10개여야 함 — ' + perLevel[lv]); });

/* 단계2 는 「한두 번 꺾기」다. 꺾임 2번 판이 하나도 없으면 벽이 길을 막는 구실을 못 하고
 * 있다는 뜻이다(벽 판정이 새면 두 번 꺾던 판이 전부 한 번으로 줄어든다 — 실제로 그랬다). */
const twoTurn = lens.filter(x => x.level === 2 && x.turns === 2).length;
if (twoTurn < 2) err('단계2 에 두 번 꺾는 판이 ' + twoTurn + '개뿐 — 벽이 길을 막는 구실을 못 하고 있다(2개 이상)');

/* e2e 의 「벽에 부딪히면 멈춘다」 검사가 늘 잡을 판을 고를 수 있어야 한다 */
if (adjacentObstacle < 6) err('시작 칸 옆에 벽·웅덩이가 있는 판이 ' + adjacentObstacle + '개뿐 — 부딪힘을 배울 자리가 모자람(6개 이상)');

/* ── 단계 정의 3개 ── */
if (!Array.isArray(D.LEVELS) || D.LEVELS.length !== 3) err('단계 정의가 3개여야 함');
(D.LEVELS || []).forEach(lv => {
  if (!lv.name || !lv.desc || !lv.cls) err('단계 ' + lv.id + ': 이름/설명/클래스 누락');
  if (lv.n !== LEVEL_N[lv.id]) err('단계 ' + lv.id + ': 격자 크기 정의 오류 — ' + lv.n);
  const [lo, hi] = LEVEL_CMDS[lv.id];
  if (!Array.isArray(lv.cmds) || lv.cmds[0] !== lo || lv.cmds[1] !== hi) {
    err('단계 ' + lv.id + ': 명령 수 범위 정의 오류 — ' + JSON.stringify(lv.cmds));
  }
});

if (!Array.isArray(D.praises) || !D.praises.length) err('칭찬 문구가 없음');

/* ── 결과 ── */
if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
[1, 2, 3].forEach(lv => {
  const g = lens.filter(x => x.level === lv);
  const st = g.map(x => x.steps);
  const tn = g.map(x => x.turns);
  console.log('  단계' + lv + ' — 최단 명령 ' + Math.min(...st) + '~' + Math.max(...st) +
    '개 (' + st.join(',') + ') · 꺾임 ' + Math.min(...tn) + '~' + Math.max(...tn) + '번');
});
console.log('✅ 데이터 검증 통과 — 판 ' + D.PUZZLES.length + '개(단계별 10) 전부 BFS 로 풀림, ' +
  '단계 명령 수 범위 2~4 / 5~7 / 8~10, 단계3 열쇠·문 규칙 확인, 시작 옆 장애물 ' + adjacentObstacle + '판');
