/* 앱 셸 — 홈/도안 목록/퍼즐판 화면 전환과 세 놀이(칠교·블록·도형 맞추기) 공용 드래그 엔진.
 * 판은 SVG 하나(위 = 그림판, 아래 = 조각 트레이)로 그려서 폰·패드 어디서나 같은 비율로 늘어난다.
 * 포인터 이벤트(pointerdown/move/up)로 손가락·마우스·펜 모두 같은 코드로 끈다. */
window.App = (() => {
  const D = window.ShapeData;
  const A = window.Audio2;
  const P = window.Progress;

  const $ = id => document.getElementById(id);

  /* ─────────── 판 좌표계 ───────────
   * 세로: viewBox 0 0 100 148 — 위 0~92 그림판, 94~146 트레이(가로 두 줄)
   * 가로: viewBox 0 0 158 92 — 왼쪽 0~100 그림판, 오른쪽 102~156.5 트레이(세로 두 줄)
   * 그림판 영역(0~100 × 0~92)은 두 방향에서 똑같아서
   * 조각의 목표 좌표·스냅 판정은 방향과 무관하게 유지된다. */
  const VW = 100, VH = 148, BOARD_H = 92, TRAY_Y = 94, TRAY_H = 52;
  const LVW = 158, LVH = 92, TRAY_X = 102; // 가로모드 전용 치수
  const SVGNS = 'http://www.w3.org/2000/svg';
  const landMq = window.matchMedia('(orientation: landscape)');
  let land = landMq.matches; // 지금 가로모드인가
  // 조각이 트레이 영역에 있는가 (방향에 따라 아래쪽/오른쪽)
  const inTray = pos => land ? pos.x > TRAY_X - 2 : pos.y > TRAY_Y - 2;
  // 현재 방향의 viewBox 크기 (드래그 범위 제한용)
  const viewSize = () => land ? { w: LVW, h: LVH } : { w: VW, h: VH };

  /* ─────────── 화면 전환 ─────────── */
  let screenId = 'scr-home';
  function showScreen(id) {
    A.stop();
    screenId = id;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id === 'scr-home') renderHome();
  }

  /* ─────────── 놀이 세 가지 ─────────── */
  const MODES = [
    { id: 'tan', icon: '🧩', name: '칠교놀이', desc: '일곱 조각 그림 맞추기', cls: 'c-tan', list: () => D.tangrams },
    { id: 'block', icon: '🐢', name: '블록 퍼즐', desc: '블록으로 그림 채우기', cls: 'c-block', list: () => D.blocks },
    { id: 'shape', icon: '🏠', name: '도형 맞추기', desc: '같은 모양 자리 찾기', cls: 'c-shape', list: () => D.shapes },
  ];
  const modeDef = id => MODES.find(m => m.id === id);

  function renderHome() {
    $('home-stars').textContent = P.stars();
    const menu = $('menu');
    menu.innerHTML = '';
    MODES.forEach(m => {
      const ids = m.list().map(p => p.id);
      const done = P.doneCount(m.id, ids);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-card ' + m.cls;
      b.innerHTML =
        '<span class="mc-icon">' + m.icon + '</span>' +
        '<span class="mc-name">' + m.name + '</span>' +
        '<span class="mc-desc">' + m.desc + '</span>' +
        '<span class="mc-prog">' + (done ? '⭐ ' + done + ' / ' + ids.length : '처음이야!') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openList(m); });
      menu.appendChild(b);
    });
  }

  /* ─────────── 도안 목록 ─────────── */
  let curMode = null;
  function openList(m) {
    curMode = m;
    $('list-title').textContent = m.icon + ' ' + m.name;
    const list = $('puzzle-list');
    list.innerHTML = '';
    m.list().forEach(pz => {
      const done = P.isDone(m.id, pz.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'item-main';
      b.dataset.puzzle = pz.id;
      b.innerHTML =
        '<span class="it-emoji">' + pz.emoji + '</span>' +
        '<span class="it-texts"><span class="it-name">' + pz.name + '</span>' +
        '<span class="it-kind">' + (m.id === 'tan' ? (pz.rotate ? '🔄 빙글빙글 단계' : '쏙쏙 끼우기 단계') :
          m.id === 'block' ? '블록 ' + pz.pieces.length + '개' : '도형 ' + pz.parts.length + '개') + '</span></span>' +
        '<span class="it-prog">' + (done ? '🏅' : '') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPuzzle(m, pz); });
      list.appendChild(b);
    });
    showScreen('scr-list');
  }

  /* ─────────── 기하 도우미 ─────────── */
  const rad = d => d * Math.PI / 180;
  function rotPt(p, deg) {
    const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
    return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
  }
  function centroid(poly) { // 다각형 넓이 무게중심
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
      const f = x1 * y2 - x2 * y1;
      a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f;
    }
    a *= 0.5;
    return [cx / (6 * a), cy / (6 * a)];
  }
  const ptsStr = poly => poly.map(p => p[0].toFixed(3) + ',' + p[1].toFixed(3)).join(' ');
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function el(tag, attrs) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  /* ─────────── 현재 퍼즐 상태 ─────────── */
  let cur = null; // { mode, puzzle, pieces, snapTol, placedCount }
  let grabbed = null, grabOff = null, moved = 0;

  function openPuzzle(m, pz) {
    cur = { mode: m.id, puzzle: pz, pieces: [], placedCount: 0 };
    $('play-title').textContent = pz.emoji + ' ' + pz.name;
    showScreen('scr-play');
    const svg = $('stage');
    svg.innerHTML = '';
    // 트레이 바탕 — 위치·크기는 applyOrientation()이 방향에 맞게 넣는다
    cur.trayBg = el('rect', { rx: 5, class: 'tray-bg' });
    svg.appendChild(cur.trayBg);
    // 레이어 순서(아래→위): 놓인 도형 → 회색 자리 안내 → 트레이·집는 조각
    // 도형 맞추기는 부품 자리가 서로 겹쳐서(문·창문이 몸통 안), 놓은 조각을
    // 안내 아래(placedLayer)로 내려야 아직 안 놓은 빈 자리 안내가 안 가려진다.
    const placedLayer = el('g', {}); svg.appendChild(placedLayer);
    const boardLayer = el('g', {}); svg.appendChild(boardLayer);
    const pieceLayer = el('g', {}); svg.appendChild(pieceLayer);
    cur.placedLayer = placedLayer;
    cur.boardLayer = boardLayer;
    cur.pieceLayer = pieceLayer;

    if (m.id === 'tan') buildTangram(pz);
    else if (m.id === 'block') buildBlock(pz);
    else buildShape(pz);

    applyOrientation();
    layoutTray();
    cur.pieces.forEach(renderPiece);
    updateCount();

    const say = m.id === 'tan'
      ? pz.name + '! 조각을 끌어서 회색 그림 위에 맞춰 봐!' + (pz.rotate ? ' 조각을 톡 누르면 빙글 돌아!' : '')
      : m.id === 'block'
        ? pz.name + '! 블록을 끌어서 칸을 채워 볼까?'
        : pz.name + '! 같은 모양 자리를 찾아 끌어다 놓아 봐!';
    setTimeout(() => A.speak(say), 350);
  }

  /* ─────────── 칠교 만들기 ─────────── */
  function buildTangram(pz) {
    const colorLeft = {}; // 종류별 색 배정 (bt 두 개는 서로 다른 색)
    // 절대 목표 다각형과 전체 테두리
    const abs = pz.pieces.map(pc => D.TAN_SHAPES[pc.t].map(q => {
      const r = rotPt(q, pc.r);
      return [r[0] + pc.x, r[1] + pc.y];
    }));
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    abs.forEach(poly => poly.forEach(([x, y]) => {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }));
    const sc = Math.min(18, (VW - 12) / (x1 - x0), (BOARD_H - 14) / (y1 - y0));
    const ox = VW / 2 - (x0 + x1) / 2 * sc;
    const oy = BOARD_H / 2 - (y0 + y1) / 2 * sc;
    cur.snapTol = Math.max(4.5, sc * 0.35); // 위치 판정: 판 크기의 5% 안팎

    pz.pieces.forEach((pc, i) => {
      const tPoly = abs[i].map(([x, y]) => [ox + x * sc, oy + y * sc]);
      // 회색 실루엣 (조각 이음새가 살짝 보이게)
      cur.boardLayer.appendChild(el('polygon', { points: ptsStr(tPoly), class: 'slot slot-tan', 'data-slot': i }));
      const tc = centroid(tPoly);
      const c0 = centroid(D.TAN_SHAPES[pc.t]);
      const n = (colorLeft[pc.t] = (colorLeft[pc.t] || 0) + 1) - 1;
      const spawnRot = pz.rotate ? (pc.r + 45 + 45 * i) % 360 : pc.r;
      const p = {
        id: 't' + i, kind: 'tan', shape: pc.t, c0, sc,
        rot: spawnRot, rotTarget: pc.r, sym: D.TAN_SYM[pc.t],
        target: { x: tc[0], y: tc[1] }, slotIdx: i,
        color: D.TAN_COLORS[pc.t][n % D.TAN_COLORS[pc.t].length],
        pos: { x: 0, y: 0 }, k: 0.7, trayK: 0.7, trayK0: 0.7, placed: false,
      };
      p.el = el('g', { class: 'piece', 'data-id': p.id });
      p.body = el('polygon', { fill: p.color, class: 'piece-face' });
      p.el.appendChild(p.body);
      setTanPoints(p);
      cur.pieceLayer.appendChild(p.el);
      cur.pieces.push(p);
    });
  }
  // 현재 회전각으로 조각 다각형 좌표 다시 계산 (무게중심 기준 회전)
  function setTanPoints(p) {
    const pts = D.TAN_SHAPES[p.shape].map(q =>
      rotPt([q[0] - p.c0[0], q[1] - p.c0[1]], p.rot).map(v => v * p.sc));
    p.body.setAttribute('points', ptsStr(pts));
    p.bbox = ptsBBox(pts);
  }
  function ptsBBox(pts) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    pts.forEach(([x, y]) => {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    });
    return { w: x1 - x0, h: y1 - y0 };
  }

  /* ─────────── 블록 퍼즐 만들기 ─────────── */
  function buildBlock(pz) {
    const c = Math.min(11, (VW - 10) / pz.cols, (BOARD_H - 12) / pz.rows);
    const ox = VW / 2 - pz.cols * c / 2;
    const oy = BOARD_H / 2 - pz.rows * c / 2;
    cur.snapTol = c * 0.6;

    pz.pieces.forEach((pc, i) => {
      // 목표 칸 실루엣
      const absCells = pc.cells.map(([dx, dy]) => [pc.x + dx, pc.y + dy]);
      const slotG = el('g', { class: 'slot', 'data-slot': i });
      absCells.forEach(([gx, gy]) => {
        slotG.appendChild(el('rect', {
          x: ox + gx * c + 0.4, y: oy + gy * c + 0.4, width: c - 0.8, height: c - 0.8,
          rx: 1.4, class: 'slot-cell',
        }));
      });
      cur.boardLayer.appendChild(slotG);
      // 조각 (셀 묶음의 가운데를 기준점으로)
      let mx0 = 1e9, my0 = 1e9, mx1 = -1e9, my1 = -1e9;
      absCells.forEach(([gx, gy]) => {
        mx0 = Math.min(mx0, gx); my0 = Math.min(my0, gy); mx1 = Math.max(mx1, gx); my1 = Math.max(my1, gy);
      });
      const tc = { x: ox + (mx0 + mx1 + 1) / 2 * c, y: oy + (my0 + my1 + 1) / 2 * c };
      const p = {
        id: 'b' + i, kind: 'block',
        rot: 0, rotTarget: 0, sym: 360,
        target: tc, slotIdx: i, color: pc.color,
        pos: { x: 0, y: 0 }, k: 0.7, trayK: 0.7, trayK0: 0.7, placed: false,
      };
      p.el = el('g', { class: 'piece', 'data-id': p.id });
      const ccx = (mx0 + mx1 + 1) / 2 - pc.x, ccy = (my0 + my1 + 1) / 2 - pc.y; // 기준 칸에서 가운데까지
      pc.cells.forEach(([dx, dy]) => {
        p.el.appendChild(el('rect', {
          x: (dx - ccx) * c + 0.4, y: (dy - ccy) * c + 0.4, width: c - 0.8, height: c - 0.8,
          rx: 1.4, fill: pc.color, class: 'piece-face',
        }));
      });
      p.bbox = { w: (mx1 - mx0 + 1) * c, h: (my1 - my0 + 1) * c };
      cur.pieceLayer.appendChild(p.el);
      cur.pieces.push(p);
    });
  }

  /* ─────────── 도형 맞추기 만들기 ─────────── */
  function shapeNode(s, w, h, extra) { // 가운데(0,0) 기준 도형
    const a = Object.assign({}, extra);
    if (s === 'circ') return el('ellipse', Object.assign(a, { cx: 0, cy: 0, rx: w / 2, ry: h / 2 }));
    if (s === 'sq' || s === 'rect') return el('rect', Object.assign(a, { x: -w / 2, y: -h / 2, width: w, height: h, rx: Math.min(1.2, w / 8) }));
    if (s === 'tri') return el('polygon', Object.assign(a, { points: ptsStr([[0, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]) }));
    if (s === 'semi') return el('path', Object.assign(a, { d: 'M ' + (-w / 2) + ' ' + (h / 2) + ' A ' + (w / 2) + ' ' + h + ' 0 0 1 ' + (w / 2) + ' ' + (h / 2) + ' Z' }));
    const ins = w * 0.22; // 사다리꼴
    const pts = s === 'trap'
      ? [[-w / 2 + ins, -h / 2], [w / 2 - ins, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]
      : [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2 - ins, h / 2], [-w / 2 + ins, h / 2]];
    return el('polygon', Object.assign(a, { points: ptsStr(pts) }));
  }
  function buildShape(pz) {
    const sc = Math.min((VW - 10) / 100, (BOARD_H - 8) / 100);
    const ox = VW / 2 - 50 * sc, oy = BOARD_H / 2 - 50 * sc;
    cur.snapTol = 9;
    cur.slots = [];

    pz.parts.forEach((pt, i) => {
      const w = pt.w * sc, h = pt.h * sc;
      const c = { x: ox + (pt.x + pt.w / 2) * sc, y: oy + (pt.y + pt.h / 2) * sc };
      const slotEl = shapeNode(pt.s, w, h, { class: 'slot slot-shape', 'data-slot': i, transform: 'translate(' + c.x + ' ' + c.y + ')' });
      cur.boardLayer.appendChild(slotEl);
      cur.slots.push({ idx: i, s: pt.s, w: pt.w, h: pt.h, c, filled: false, el: slotEl });
      const p = {
        id: 's' + i, kind: 'shape', shape: pt.s, sw: pt.w, sh: pt.h,
        rot: 0, rotTarget: 0, sym: 360,
        target: c, slotIdx: i, color: pt.color,
        pos: { x: 0, y: 0 }, k: 0.72, trayK: 0.72, trayK0: 0.72, placed: false,
      };
      p.el = el('g', { class: 'piece', 'data-id': p.id });
      p.el.appendChild(shapeNode(pt.s, w, h, { fill: pt.color, class: 'piece-face' }));
      p.bbox = { w, h };
      cur.pieceLayer.appendChild(p.el);
      cur.pieces.push(p);
    });
  }

  /* ─────────── 방향 적용 (viewBox·트레이 바탕) ───────────
   * 세로: 판 위 + 트레이 아래 / 가로: 판 왼쪽 + 트레이 오른쪽 */
  function applyOrientation() {
    land = landMq.matches;
    $('stage').setAttribute('viewBox', land ? '0 0 ' + LVW + ' ' + LVH : '0 0 ' + VW + ' ' + VH);
    if (!cur || !cur.trayBg) return;
    const a = land
      ? { x: TRAY_X, y: 1.5, width: LVW - TRAY_X - 1.5, height: LVH - 3 }
      : { x: 1.5, y: TRAY_Y, width: VW - 3, height: TRAY_H - 2 };
    for (const k in a) cur.trayBg.setAttribute(k, a[k]);
  }

  /* ─────────── 트레이 배치 (두 줄로 차곡차곡) ───────────
   * 세로: 가로 두 줄에 왼→오 / 가로: 세로 두 줄에 위→아래로 담는다 */
  function layoutTray() {
    if (!land) {
      let x = 5, row = 0;
      const rowY = [TRAY_Y + 13, TRAY_Y + 39];
      cur.pieces.forEach(p => {
        // 길쭉한 조각은 줄 높이에 맞게 트레이 축소율을 조금 더 줄인다
        p.trayK = Math.min(p.trayK0, 23 / p.bbox.h, 34 / p.bbox.w);
        const w = p.bbox.w * p.trayK + 3;
        if (x + w > VW - 4 && row < rowY.length - 1) { row++; x = 5; }
        p.home = { x: x + w / 2, y: rowY[row] };
        x += w;
      });
    } else {
      const colX = [TRAY_X + 14, TRAY_X + 40];
      // 두 줄에 다 안 들어가면(회전 단계는 조각이 비스듬해 더 크다)
      // 축소율을 조금씩 줄여 전부 담길 때까지 다시 담는다
      for (let f = 1; f > 0.4; f -= 0.08) {
        let y = 4, col = 0, over = false;
        cur.pieces.forEach(p => {
          // 세로 줄에서는 폭·높이 제한을 서로 바꿔 적용한다
          p.trayK = Math.min(p.trayK0, 23 / p.bbox.w, 34 / p.bbox.h) * f;
          const h = p.bbox.h * p.trayK + 3;
          if (y + h > LVH - 3 && col < colX.length - 1) { col++; y = 4; }
          p.home = { x: colX[col], y: y + h / 2 };
          y += h;
          if (y > LVH - 3) over = true;
        });
        if (!over) break;
      }
    }
    // 아직 안 놓인 조각은 (새) 트레이 집으로 — 놓인 조각은 그림판에 그대로
    cur.pieces.forEach(p => {
      if (p.placed) return;
      p.k = p.trayK;
      p.pos = { x: p.home.x, y: p.home.y };
    });
  }

  function renderPiece(p) {
    p.el.setAttribute('transform', 'translate(' + p.pos.x + ' ' + p.pos.y + ') scale(' + p.k + ')');
  }
  function updateCount() {
    $('play-count').textContent = cur.placedCount + ' / ' + cur.pieces.length;
  }

  /* ─────────── 드래그 (터치·마우스·펜 공통) ─────────── */
  function svgPoint(ev) {
    const svg = $('stage');
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const pt = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
    return { x: pt.x, y: pt.y };
  }
  function slotEl(idx) {
    return cur.boardLayer.querySelector('[data-slot="' + idx + '"]');
  }
  function onDown(ev) {
    if (!cur || grabbed) return;
    const g = ev.target.closest && ev.target.closest('.piece');
    if (!g) return;
    const p = cur.pieces.find(q => q.el === g);
    if (!p || p.placed) return;
    ev.preventDefault();
    grabbed = p;
    moved = 0;
    const pt = svgPoint(ev);
    grabOff = { x: p.pos.x - pt.x, y: p.pos.y - pt.y };
    p.k = 1;
    p.el.classList.add('grab');
    cur.pieceLayer.appendChild(p.el); // 맨 위로
    if (cur.mode !== 'shape') { const s = slotEl(p.slotIdx); if (s) s.classList.add('hint'); } // 자리 힌트
    renderPiece(p);
    A.sfx.pick();
  }
  function onMove(ev) {
    if (!grabbed) return;
    ev.preventDefault();
    const pt = svgPoint(ev);
    const vs = viewSize(); // 방향에 따라 드래그 범위가 다르다
    const nx = Math.min(vs.w - 2, Math.max(2, pt.x + grabOff.x));
    const ny = Math.min(vs.h - 2, Math.max(2, pt.y + grabOff.y));
    moved += Math.abs(nx - grabbed.pos.x) + Math.abs(ny - grabbed.pos.y);
    grabbed.pos = { x: nx, y: ny };
    renderPiece(grabbed);
  }
  function onUp() {
    if (!grabbed) return;
    const p = grabbed;
    grabbed = null;
    p.el.classList.remove('grab');
    if (cur.mode !== 'shape') { const s = slotEl(p.slotIdx); if (s) s.classList.remove('hint'); }

    if (moved < 2.5) { // 끌지 않고 톡 — 빙글빙글 단계면 45° 회전
      if (p.kind === 'tan' && cur.puzzle.rotate) {
        p.rot = (p.rot + 45) % 360;
        setTanPoints(p);
        A.sfx.spin();
        // 제 자리 위에서 돌리다가 각도가 딱 맞으면 바로 착!
        const rotOk = ((p.rot - p.rotTarget) % p.sym + p.sym) % p.sym === 0;
        if (rotOk && dist(p.pos, p.target) < cur.snapTol) return snap(p, p.target);
      } else {
        A.sfx.tap();
      }
      p.k = inTray(p.pos) ? p.trayK : 1;
      renderPiece(p);
      return;
    }
    dropPiece(p);
  }

  function dropPiece(p) {
    if (p.kind === 'shape') return dropShape(p);
    // 칠교·블록: 제 자리 근처 + (칠교) 맞는 각도면 착!
    const rotOk = ((p.rot - p.rotTarget) % p.sym + p.sym) % p.sym === 0;
    if (dist(p.pos, p.target) < cur.snapTol && rotOk) return snap(p, p.target);
    if (dist(p.pos, p.target) < cur.snapTol && !rotOk) {
      A.sfx.nope();
      wiggleEl(p.el);
      A.speak('톡 눌러서 빙글 돌려 볼까?');
    }
    p.k = inTray(p.pos) ? p.trayK : 1;
    renderPiece(p);
  }
  function dropShape(p) {
    // 가장 가까운 빈 자리 찾기
    let best = null, bd = 1e9;
    cur.slots.forEach(s => {
      if (s.filled) return;
      const d = dist(p.pos, s.c);
      if (d < bd) { bd = d; best = s; }
    });
    if (best && bd < cur.snapTol) {
      const fits = best.s === p.shape && Math.abs(best.w - p.sw) < 0.5 && Math.abs(best.h - p.sh) < 0.5;
      if (fits) {
        p.slotIdx = best.idx; // 같은 모양·크기면 어느 자리든 괜찮아
        p.target = best.c;
        return snap(p, best.c);
      }
      // 틀린 자리 — 부드럽게 튕겨 돌아가고 격려
      A.sfx.nope();
      animMove(p, p.home, p.trayK);
      A.speak('괜찮아! 같은 모양을 찾아볼까?');
      return;
    }
    p.k = inTray(p.pos) ? p.trayK : 1;
    renderPiece(p);
  }

  function snap(p, to) {
    p.placed = true;
    p.rot = p.rotTarget;
    if (p.kind === 'tan') setTanPoints(p);
    p.el.classList.add('placed');
    if (p.kind === 'shape') {
      cur.slots[p.slotIdx].filled = true;
      cur.slots[p.slotIdx].el.classList.add('filled');
      // 놓은 도형은 안내 실루엣 아래 레이어로 — 겹치는 이웃 빈 자리 안내가 계속 보이게
      cur.placedLayer.appendChild(p.el);
    }
    animMove(p, to, 1);
    cur.placedCount++;
    updateCount();
    A.sfx.pop();
    if (cur.placedCount >= cur.pieces.length) setTimeout(complete, 420);
  }

  // 조각을 스르륵 옮기는 잔동작 (rAF — CSS transition 없이 transform 속성으로)
  function animMove(p, to, k, dur) {
    const from = { x: p.pos.x, y: p.pos.y }, k0 = p.k, t0 = performance.now();
    dur = dur || 260;
    function step(t) {
      let f = Math.min(1, (t - t0) / dur);
      f = 1 - (1 - f) * (1 - f); // ease-out
      p.pos = { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f };
      p.k = k0 + (k - k0) * f;
      renderPiece(p);
      if (f < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function wiggleEl(e) {
    e.classList.remove('wiggle');
    void e.getBoundingClientRect();
    e.classList.add('wiggle');
  }

  /* ─────────── 완성! ─────────── */
  function complete() {
    const m = curMode, pz = cur.puzzle;
    P.recordDone(m.id, pz.id);
    P.addStar(1);
    if (window.Pet) {
      Pet.awardSnack(1); // 퍼즐 하나 완성 = 간식
      if (m.id === 'tan' && pz.rotate) Pet.awardMeal(1); // 빙글빙글 칠교 완성 = 식사
    }
    A.sfx.fanfare();
    confetti();
    const praise = D.praises[Math.floor(Math.random() * D.praises.length)];
    A.speak(pz.name + ' 완성! ' + praise);
    setTimeout(() => {
      const ids = m.list();
      const next = ids.find(q => q.id !== pz.id && !P.isDone(m.id, q.id)) || ids.find(q => q.id !== pz.id);
      showReward(praise, next ? '다음 ' + next.emoji + ' ▶' : '목록으로', () => {
        if (next) openPuzzle(m, next); else openList(m);
      }, () => openList(m));
    }, 900);
  }

  /* ─────────── 색종이 축하 ─────────── */
  const CONFETTI_COLORS = ['#FF8A80', '#FFD54F', '#81C784', '#4FC3F7', '#BA68C8', '#F48FB1', '#FF9E58'];
  function confetti() {
    const box = $('confetti');
    box.innerHTML = '';
    for (let i = 0; i < 36; i++) {
      const s = document.createElement('span');
      s.className = 'cf';
      s.style.left = (2 + Math.random() * 96) + '%';
      s.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      s.style.animationDelay = (Math.random() * 0.5) + 's';
      s.style.animationDuration = (1.1 + Math.random() * 0.9) + 's';
      s.style.transform = 'rotate(' + Math.floor(Math.random() * 360) + 'deg)';
      box.appendChild(s);
    }
    clearTimeout(confetti.t);
    confetti.t = setTimeout(() => { box.innerHTML = ''; }, 2600);
  }

  /* ─────────── 보상 오버레이 ─────────── */
  let rewardNextFn = null, rewardCloseFn = null;
  function showReward(praise, nextLabel, onNext, onClose) {
    $('reward-praise').textContent = praise;
    $('reward-next').textContent = nextLabel;
    rewardNextFn = onNext;
    rewardCloseFn = onClose || null;
    $('reward-close').hidden = !onClose;
    $('reward').classList.add('on');
  }

  /* ─────────── 초기화 ─────────── */
  function init() {
    // 길게 눌러도 복사·전체선택 풍선이 뜨지 않게
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());

    const svg = $('stage');
    svg.addEventListener('pointerdown', onDown);
    // 합성 이벤트(테스트)와 포인터 캡처 어느 쪽이든 따라오도록 창 전체에서 듣는다
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    // 기기 회전(가로↔세로) 시 퍼즐판을 자연스럽게 재배치 —
    // 놓인 조각은 그림판에 그대로, 트레이 조각은 새 트레이 집으로 옮긴다
    const onOrient = () => {
      if (land === landMq.matches) return; // 방향이 그대로면 아무것도 안 한다
      applyOrientation();
      if (!cur || screenId !== 'scr-play') return;
      if (grabbed) { // 잡은 채 회전하면 조용히 놓는다
        const g = grabbed;
        grabbed = null;
        g.el.classList.remove('grab');
        if (cur.mode !== 'shape') { const s = slotEl(g.slotIdx); if (s) s.classList.remove('hint'); }
      }
      layoutTray();
      cur.pieces.forEach(renderPiece);
    };
    landMq.addEventListener('change', onOrient);
    window.addEventListener('resize', onOrient);
    applyOrientation(); // 첫 화면부터 방향에 맞는 viewBox로

    document.querySelectorAll('[data-go]').forEach(b => {
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); showScreen(b.dataset.go); });
    });
    $('btn-play-back').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); openList(curMode);
    });
    $('reward-next').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      $('reward').classList.remove('on');
      if (rewardNextFn) rewardNextFn();
    });
    $('reward-close').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      $('reward').classList.remove('on');
      if (rewardCloseFn) rewardCloseFn();
    });

    renderHome();
  }
  init();

  /* ─────────── 종단 테스트용 상태 확인 ─────────── */
  function debug() {
    const out = {
      screen: screenId,
      stars: P.stars(),
      mode: cur ? cur.mode : null,
      puzzle: cur ? cur.puzzle.id : null,
      placed: cur ? cur.placedCount : 0,
      total: cur ? cur.pieces.length : 0,
      pieces: [],
    };
    if (cur && screenId === 'scr-play') {
      const svg = $('stage');
      const m = svg.getScreenCTM();
      const toClient = p => {
        const q = new DOMPoint(p.x, p.y).matrixTransform(m);
        return { x: q.x, y: q.y };
      };
      out.pieces = cur.pieces.map(p => ({
        id: p.id, placed: p.placed, rot: p.rot, rotTarget: p.rotTarget, sym: p.sym,
        shape: p.shape || null,
        client: toClient(p.pos), targetClient: toClient(p.target),
      }));
    }
    return out;
  }

  return { showScreen, debug };
})();
