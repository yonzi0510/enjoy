/* 🤖 로봇 심부름 데이터 — 마당(격자) 30판(단계별 10)과 길찾기(BFS) 도구.
 *
 * 이 놀이의 구조는 저장소에서 유일하다: **짜기 → 실행 → 관찰**.
 * 아이가 화살표 카드를 늘어놓아 명령을 만들고, ▶ 를 누르면 로봇이 그 순서대로 한 칸씩 걷는다.
 * 그래서 데이터가 지켜야 할 계약도 다르다 — "그림이 맞나"가 아니라 **"이 마당이 정말 풀리나"** 다.
 * tools/validate-data.js 가 30판을 전부 BFS 로 풀어 보고, 최단 명령 수가 단계 범위 안인지 잰다.
 *
 * 좌표: [x, y] — x 는 오른쪽으로, y 는 **아래로** 커진다(화면 좌표와 같게).
 * 방향: up = y−1 · down = y+1 · left = x−1 · right = x+1 — **절대 방향뿐이다.**
 *   ↰↱ 같은 자기중심 회전은 넣지 않는다. 6~7세 개념이라 다섯 살은 로봇이 어디를 보는지 못 따라간다.
 *
 * 칸 종류
 *   벽(walls)     — 부딪히면 쿵! 그 자리에 멈춘다 (벌점 없음)
 *   웅덩이(puddles) — 부딪히면 첨벙! 역시 그 자리에 멈춘다
 *   열쇠(key)     — 단계3 경유지. 밟으면 줍는다
 *   목표(goal)    — 단계1·2 는 집, 단계3 은 **문**(열쇠가 없으면 안 열린다)
 *
 * ⚠️ 판 id 는 아이 진행도(done 키)로 저장되므로 함부로 바꾸지 않는다.
 */
window.RobotData = (() => {

  /* ─────────── 방향 4가지 (절대 방향) ─────────── */
  const DIRS = {
    up:    { dx: 0,  dy: -1, name: '위',    say: '위쪽',   sym: 'rb-arr-up' },
    down:  { dx: 0,  dy: 1,  name: '아래',  say: '아래쪽', sym: 'rb-arr-down' },
    left:  { dx: -1, dy: 0,  name: '왼쪽',  say: '왼쪽',   sym: 'rb-arr-left' },
    right: { dx: 1,  dy: 0,  name: '오른쪽', say: '오른쪽', sym: 'rb-arr-right' },
  };
  const DIR_IDS = ['up', 'down', 'left', 'right'];
  const isDir = d => Object.prototype.hasOwnProperty.call(DIRS, d);

  /* ─────────── 판 만들기 ─────────── */
  const P = (level, id, n, start, goal, o) => ({
    level, id, n,
    start: start.slice(), goal: goal.slice(),
    walls: (o && o.walls ? o.walls : []).map(c => c.slice()),
    puddles: (o && o.puddles ? o.puddles : []).map(c => c.slice()),
    key: o && o.key ? o.key.slice() : null,
  });

  /* ─────────── 마당 30판 ───────────
   * 단계1(4×4) 빈 마당·곧은 길 — 명령 2~4개
   * 단계2(5×5) 벽과 웅덩이 · 한두 번 꺾기 — 명령 5~7개
   * 단계3(6×6) 열쇠를 먼저 줍고 문으로 — 명령 8~10개
   */
  const PUZZLES = [
    /* ── 단계1 — 4×4, 장애물 없음, 곧은 길 ── */
    P(1, 'l1-1',  4, [0, 3], [3, 3], {}),
    P(1, 'l1-2',  4, [0, 0], [0, 2], {}),
    P(1, 'l1-3',  4, [3, 1], [1, 1], {}),
    P(1, 'l1-4',  4, [2, 3], [2, 0], {}),
    P(1, 'l1-5',  4, [1, 0], [1, 3], {}),
    P(1, 'l1-6',  4, [3, 2], [0, 2], {}),
    P(1, 'l1-7',  4, [0, 1], [2, 1], {}),
    P(1, 'l1-8',  4, [2, 2], [2, 0], {}),
    P(1, 'l1-9',  4, [0, 0], [3, 0], {}),
    P(1, 'l1-10', 4, [3, 3], [3, 0], {}),

    /* ── 단계2 — 5×5, 벽·웅덩이, 한두 번 꺾기 ──
     * 꺾임이 두 번인 판(l2-3·l2-7·l2-10)은 곧은 길 두 갈래를 모두 막아 두었다. */
    P(2, 'l2-1',  5, [0, 4], [3, 0], { walls: [[1, 4], [2, 2]], puddles: [[4, 3]] }),
    P(2, 'l2-2',  5, [4, 4], [1, 1], { walls: [[3, 3]], puddles: [[3, 4]] }),
    P(2, 'l2-3',  5, [0, 0], [4, 2], { walls: [[1, 0], [3, 3]], puddles: [[0, 2]] }),
    P(2, 'l2-4',  5, [4, 0], [0, 3], { walls: [[2, 2], [3, 3]], puddles: [[4, 1]] }),
    P(2, 'l2-5',  5, [0, 2], [3, 0], { walls: [[0, 3], [1, 1]], puddles: [[4, 4]] }),
    P(2, 'l2-6',  5, [2, 4], [4, 1], { walls: [[1, 4], [3, 3]], puddles: [[1, 2]] }),
    P(2, 'l2-7',  5, [0, 4], [4, 1], { walls: [[1, 4]], puddles: [[0, 2]] }),
    P(2, 'l2-8',  5, [3, 4], [0, 0], { walls: [[2, 2]], puddles: [[4, 4], [3, 3]] }),
    P(2, 'l2-9',  5, [4, 3], [1, 0], { walls: [[3, 3], [3, 1]], puddles: [[2, 4]] }),
    P(2, 'l2-10', 5, [4, 4], [0, 1], { walls: [[4, 2]], puddles: [[3, 4]] }),

    /* ── 단계3 — 6×6, 🔑 열쇠를 먼저 줍고 문으로 ──
     * 열쇠 없이도 문 앞까지는 갈 수 있게 짰다(문이 잠긴 것을 아이가 직접 겪어야 배운다).
     * validate-data.js 가 그 길이 있는지 판마다 확인한다. */
    P(3, 'l3-1',  6, [0, 5], [4, 1], { key: [0, 1], walls: [[2, 3]], puddles: [[4, 4]] }),
    P(3, 'l3-2',  6, [5, 5], [1, 1], { key: [5, 1], walls: [[3, 3], [2, 5]], puddles: [[1, 4]] }),
    P(3, 'l3-3',  6, [0, 0], [5, 4], { key: [5, 0], walls: [[2, 2], [4, 3]], puddles: [[1, 3]] }),
    P(3, 'l3-4',  6, [5, 0], [0, 4], { key: [5, 4], walls: [[2, 2], [3, 3]], puddles: [[1, 1]] }),
    P(3, 'l3-5',  6, [0, 5], [5, 0], { key: [3, 2], walls: [[1, 3], [4, 4]], puddles: [[2, 4]] }),
    P(3, 'l3-6',  6, [5, 5], [2, 0], { key: [2, 5], walls: [[3, 3], [1, 1]], puddles: [[4, 2]] }),
    P(3, 'l3-7',  6, [0, 0], [5, 4], { key: [0, 4], walls: [[2, 2], [3, 1]], puddles: [[1, 2]] }),
    P(3, 'l3-8',  6, [5, 5], [0, 0], { key: [0, 5], walls: [[3, 4], [2, 2]], puddles: [[4, 3]] }),
    P(3, 'l3-9',  6, [3, 0], [3, 3], { key: [0, 3], walls: [[2, 1], [5, 4]], puddles: [[1, 1]] }),
    P(3, 'l3-10', 6, [5, 0], [0, 5], { key: [0, 0], walls: [[2, 2], [3, 4]], puddles: [[4, 3]] }),
  ];

  /* ─────────── 단계 정의 ─────────── */
  const LEVELS = [
    { id: 1, n: 4, name: '첫 심부름',   desc: '빈 마당 · 곧은 길',      cls: 'c-l1', cmds: [2, 4] },
    { id: 2, n: 5, name: '꺾어 가기',   desc: '벽과 웅덩이 · 꺾어서',   cls: 'c-l2', cls2: '', cmds: [5, 7] },
    { id: 3, n: 6, name: '열쇠 심부름', desc: '열쇠 줍고 문으로',       cls: 'c-l3', cmds: [8, 10] },
  ];
  const levelDef = id => LEVELS.find(l => l.id === id) || null;
  const puzzlesOf = level => PUZZLES.filter(p => p.level === level);
  const puzzleById = id => PUZZLES.find(p => p.id === id) || null;

  /* ─────────── 칸 살펴보기 ─────────── */
  const same = (c, x, y) => !!c && c[0] === x && c[1] === y;
  const inside = (pz, x, y) => x >= 0 && y >= 0 && x < pz.n && y < pz.n;
  const isWall = (pz, x, y) => pz.walls.some(c => same(c, x, y));
  const isPuddle = (pz, x, y) => pz.puddles.some(c => same(c, x, y));
  const isKey = (pz, x, y) => same(pz.key, x, y);
  const isGoal = (pz, x, y) => same(pz.goal, x, y);
  const isStart = (pz, x, y) => same(pz.start, x, y);

  // 칸 하나의 종류 — 그리기·검증에서 함께 쓴다
  function cellKind(pz, x, y) {
    if (isWall(pz, x, y)) return 'wall';
    if (isPuddle(pz, x, y)) return 'puddle';
    if (isKey(pz, x, y)) return 'key';
    if (isGoal(pz, x, y)) return 'goal';
    return null;
  }

  /* 한 칸 옮기기 — 앱과 검증기가 **같은 규칙**을 쓰도록 여기 한 곳에만 둔다.
   * 막히면 blocked 에 까닭('edge'|'wall'|'puddle'|'door')이 담기고 로봇은 제자리에 선다. */
  function step(pz, x, y, hasKey, dir) {
    const d = DIRS[dir];
    if (!d) return { x, y, hasKey, blocked: 'edge' };
    const nx = x + d.dx, ny = y + d.dy;
    if (!inside(pz, nx, ny)) return { x, y, hasKey, blocked: 'edge' };
    if (isWall(pz, nx, ny)) return { x, y, hasKey, blocked: 'wall' };
    if (isPuddle(pz, nx, ny)) return { x, y, hasKey, blocked: 'puddle' };
    // 문 — 열쇠가 있는 판에서는 열쇠를 먼저 주워야 열린다
    if (pz.key && isGoal(pz, nx, ny) && !hasKey) return { x, y, hasKey, blocked: 'door' };
    return { x: nx, y: ny, hasKey: hasKey || isKey(pz, nx, ny), blocked: null };
  }

  /* ─────────── 길찾기(BFS) ───────────
   * 상태는 (x, y, 열쇠 가졌나) 다. 열쇠가 있는 판은 문이 상태에 걸리므로 2배 공간으로 푼다.
   * opts.avoidKey — 열쇠 칸을 밟지 않고 가는 길(문이 잠긴 것을 겪게 하는 e2e·검증용)
   * opts.to       — 목표 대신 다른 칸까지 (기본은 목표 칸)
   * 돌려주는 것은 **명령 배열**(['right','up',…]) 이다. 길이 = 최단 명령 수.
   */
  function bfs(pz, opts) {
    opts = opts || {};
    const to = opts.to || pz.goal;
    const avoidKey = !!opts.avoidKey;
    const key = pz.key;
    const idx = (x, y, k) => (y * pz.n + x) * 2 + (k ? 1 : 0);
    const startK = !avoidKey && isKey(pz, pz.start[0], pz.start[1]);
    const from = new Map();
    const seen = new Set();
    const s = { x: pz.start[0], y: pz.start[1], k: !!startK };
    seen.add(idx(s.x, s.y, s.k));
    const q = [s];
    let head = 0;
    while (head < q.length) {
      const cur = q[head++];
      if (cur.x === to[0] && cur.y === to[1]) {
        // 되짚어 명령 배열 만들기
        const out = [];
        let at = cur;
        while (true) {
          const prev = from.get(idx(at.x, at.y, at.k));
          if (!prev) break;
          out.push(prev.dir);
          at = prev.node;
        }
        return out.reverse();
      }
      for (let i = 0; i < DIR_IDS.length; i++) {
        const dir = DIR_IDS[i];
        const r = step(pz, cur.x, cur.y, cur.k, dir);
        if (r.blocked) continue;
        if (avoidKey && key && same(key, r.x, r.y)) continue;   // 열쇠를 안 밟는 길
        const ni = idx(r.x, r.y, r.hasKey);
        if (seen.has(ni)) continue;
        seen.add(ni);
        const node = { x: r.x, y: r.y, k: !!r.hasKey };
        from.set(ni, { dir, node: cur });
        q.push(node);
      }
    }
    return null;
  }

  // 이 판을 푸는 최단 명령 (없으면 null) — 열쇠가 있으면 열쇠를 거쳐 문으로
  const solve = pz => bfs(pz);

  /* 열쇠 없이 **문 앞까지** 가는 길. 아이가 "문이 안 열리네?"를 겪는 자리다.
   * { dirs: 문 앞까지 명령, into: 문으로 들어가려는 방향, at: 문 앞 칸 } */
  function pathToDoor(pz) {
    if (!pz.key) return null;
    let best = null;
    for (let i = 0; i < DIR_IDS.length; i++) {
      const d = DIRS[DIR_IDS[i]];
      const ax = pz.goal[0] - d.dx, ay = pz.goal[1] - d.dy;   // 그 방향으로 들어갈 수 있는 앞칸
      if (!inside(pz, ax, ay)) continue;
      if (isWall(pz, ax, ay) || isPuddle(pz, ax, ay) || isKey(pz, ax, ay)) continue;
      const dirs = bfs(pz, { to: [ax, ay], avoidKey: true });
      if (!dirs) continue;
      if (!best || dirs.length < best.dirs.length) best = { dirs, into: DIR_IDS[i], at: [ax, ay] };
    }
    return best;
  }

  const praises = [
    '우와! 로봇이 도착했어요!',
    '심부름 성공! 참 잘했어요!',
    '길을 아주 잘 만들었어요!',
    '로봇이 고맙대요!',
    '멋진 길 만들기였어요!',
  ];

  return {
    DIRS, DIR_IDS, isDir,
    PUZZLES, LEVELS, levelDef, puzzlesOf, puzzleById,
    inside, isWall, isPuddle, isKey, isGoal, isStart, cellKind,
    step, bfs, solve, pathToDoor, praises,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = window.RobotData;
