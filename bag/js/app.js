/* 가방 놀이터 셸 — 홈/도안 목록/세 놀이(숟가락·빨대·네모 조각) 화면 전환과 드래그·회전 엔진.
 * 포인터 이벤트(pointerdown/move/up)로 손가락·마우스·펜을 같은 코드로 다룬다.
 * 화면 배치(본보기 왼쪽/위 + 놀이판 오른쪽/아래)는 CSS가 방향에 맞게 바꾸므로
 * 여기서는 방향을 신경 쓰지 않는다 — 놀이판 좌표계는 언제나 0~100이다. */
window.App = (() => {
  const D = window.BagData;
  const A = window.Audio2;
  const P = window.Progress;
  const $ = id => document.getElementById(id);
  const SVGNS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  /* ─────────── 물건 모양 (가운데 원점, 위를 향함, 약 22단위 높이) ─────────── */
  const OBJ_SHAPES = {
    spoon: [
      { t: 'ellipse', a: { cx: 0, cy: -6, rx: 5.5, ry: 6 } },
      { t: 'rect', a: { x: -2, y: -1, width: 4, height: 11, rx: 2 } },
    ],
    fork: [
      { t: 'rect', a: { x: -3.6, y: -11, width: 1.7, height: 6, rx: .5 } },
      { t: 'rect', a: { x: -0.85, y: -11, width: 1.7, height: 6, rx: .5 } },
      { t: 'rect', a: { x: 1.9, y: -11, width: 1.7, height: 6, rx: .5 } },
      { t: 'rect', a: { x: -4, y: -6.5, width: 8, height: 4, rx: 1.4 } },
      { t: 'rect', a: { x: -2, y: -3, width: 4, height: 13, rx: 2 } },
    ],
    pencil: [
      { t: 'polygon', a: { points: '0,-12 -3,-6 3,-6' } },
      { t: 'rect', a: { x: -3, y: -6, width: 6, height: 16, rx: 1 } },
    ],
    brush: [
      { t: 'polygon', a: { points: '0,-12 -3.6,-6 3.6,-6' } },
      { t: 'rect', a: { x: -3, y: -6.5, width: 6, height: 4.5, rx: 1 } },
      { t: 'rect', a: { x: -2, y: -2.5, width: 4, height: 12.5, rx: 2 } },
    ],
    key: [
      { t: 'circle', a: { cx: 0, cy: -7, r: 5 } },
      { t: 'rect', a: { x: -1.3, y: -4, width: 2.6, height: 14, rx: 1 } },
      { t: 'rect', a: { x: 1.1, y: 4.5, width: 2.4, height: 1.7, rx: .4 } },
      { t: 'rect', a: { x: 1.1, y: 7.6, width: 3, height: 1.7, rx: .4 } },
      { t: 'circle', a: { cx: 0, cy: -7.5, r: 2, hole: true } },
    ],
    tooth: [
      { t: 'rect', a: { x: -2.6, y: -12.5, width: 1, height: 2.6, rx: .4 } },
      { t: 'rect', a: { x: -1, y: -12.5, width: 1, height: 2.6, rx: .4 } },
      { t: 'rect', a: { x: 0.6, y: -12.5, width: 1, height: 2.6, rx: .4 } },
      { t: 'rect', a: { x: 2.2, y: -12.5, width: 1, height: 2.6, rx: .4 } },
      { t: 'rect', a: { x: -3, y: -10, width: 6, height: 7, rx: 1.6 } },
      { t: 'rect', a: { x: -2, y: -3.5, width: 4, height: 13.5, rx: 2 } },
    ],
  };
  // 물건 그리기 — 색·테두리·구멍색을 받아 그룹을 만든다 (본보기·조각·회색 실루엣 공용)
  function buildObj(type, fill, stroke, holeFill) {
    const g = el('g', {});
    OBJ_SHAPES[type].forEach(s => {
      const a = Object.assign({}, s.a);
      const hole = a.hole; delete a.hole;
      if (hole) { a.fill = holeFill; a.stroke = 'none'; }
      else {
        a.fill = fill; a.stroke = stroke; a['stroke-width'] = 1;
        a['stroke-linejoin'] = 'round'; a['paint-order'] = 'stroke';
      }
      g.appendChild(el(s.t, a));
    });
    return g;
  }

  /* ─────────── 화면 전환 ─────────── */
  let screenId = 'scr-home';
  function showScreen(id) {
    A.stop();
    screenId = id;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id === 'scr-home') renderHome();
  }

  /* ─────────── 두 놀이 ─────────── */
  const MODES = [
    { id: 'spoon', game: 'spoon', icon: '🥄', name: '요리조리 숟가락', desc: '본보기 보고 방향 맞추기', cls: 'c-spoon', list: () => D.spoons },
    { id: 'straw', game: 'straw', icon: '🎚️', name: '요리조리 빨대', desc: '슬라이더 높이 맞추기', cls: 'c-straw', list: () => D.straws },
    { id: 'square', game: 'square', icon: '🟧', name: '네모 조각 맞추기', desc: '톡 눌러 조각 돌리기', cls: 'c-square', list: () => D.squares },
  ];

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

    if (D.balloons) { // 요리조리 풍선 줄 (canvas 운필력)
      const done = balloonDone(), total = balloonTotal();
      const bl = document.createElement('button');
      bl.type = 'button';
      bl.className = 'menu-card c-balloon';
      bl.innerHTML =
        '<span class="mc-icon">' + D.balloons.icon + '</span>' +
        '<span class="mc-name">' + D.balloons.name + '</span>' +
        '<span class="mc-desc">' + D.balloons.desc + '</span>' +
        '<span class="mc-prog">' + (done >= total ? '🏅 완성!' : (done ? '⭐ ' + done + ' / ' + total : '처음이야!')) + '</span>';
      bl.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openBalloonLevels(); });
      menu.appendChild(bl);
    }
  }

  /* ─────────── 도안 목록 ─────────── */
  let curMode = null;
  function openList(m) {
    curMode = m;
    $('list-title').textContent = m.icon + ' ' + m.name;
    const list = $('play-list');
    list.innerHTML = '';
    m.list().forEach(pz => {
      const done = P.isDone(m.id, pz.id);
      const kind = m.game === 'spoon'
        ? '물건 ' + pz.objs.length + '개 · ' + (pz.rotStep ? '방향 맞추기' : '자리 맞추기')
        : m.game === 'straw'
          ? '슬라이더 ' + pz.sliders.length + '개'
          : '조각 ' + pz.pieces.length + '개 · 톡 돌리기';
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'item-main';
      b.dataset.puzzle = pz.id;
      b.innerHTML =
        '<span class="it-emoji">' + pz.emoji + '</span>' +
        '<span class="it-texts"><span class="it-name">' + pz.name + '</span>' +
        '<span class="it-kind">' + kind + '</span></span>' +
        '<span class="it-prog">' + (done ? '🏅' : '') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPuzzle(m, pz); });
      list.appendChild(b);
    });
    showScreen('scr-list');
  }

  /* ─────────── 현재 놀이 상태 ─────────── */
  let cur = null;   // { game, mode, puzzle, svg, pieces, placedCount }
  let grabbed = null, grabOff = null, moved = 0;

  function openPuzzle(m, pz) {
    if (m.game === 'spoon') openSpoon(m, pz);
    else if (m.game === 'straw') openStraw(m, pz);
    else openSquare(m, pz);
  }

  /* ═══════════ 숟가락 놀이 (방향·위치 맞추기) ═══════════ */
  const TOL = 11;      // 위치 스냅 임계(판 단위, 판의 약 11%)
  const TRAY_CY = 119; // 트레이 세로 가운데

  function openSpoon(m, pz) {
    cur = { game: 'spoon', mode: m.id, puzzle: pz, svg: $('spoon-stage'), pieces: [], placedCount: 0 };
    $('spoon-title').textContent = pz.emoji + ' ' + pz.name;
    $('spoon-count').textContent = '0 / ' + pz.objs.length;
    showScreen('scr-spoon');

    // 본보기(가운데 색칠된 물건들)
    const sample = $('spoon-sample');
    sample.innerHTML = '';
    pz.objs.forEach(o => {
      const g = buildObj(o.type, D.OBJ_COLORS[o.type], '#fff', 'rgba(255,255,255,.85)');
      g.setAttribute('transform', 'translate(' + o.x + ' ' + o.y + ') rotate(' + o.rot + ')');
      sample.appendChild(g);
    });

    // 놀이판: 회색 실루엣(자리) + 트레이 조각
    const svg = cur.svg;
    svg.innerHTML = '';
    cur.boardLayer = el('g', {}); svg.appendChild(cur.boardLayer);
    cur.trayBg = el('rect', { x: 2, y: 104, width: 96, height: 30, rx: 5, class: 'tray-bg' });
    svg.appendChild(cur.trayBg);
    cur.pieceLayer = el('g', {}); svg.appendChild(cur.pieceLayer);

    const n = pz.objs.length;
    const step = 100 / n;
    pz.objs.forEach((o, i) => {
      // 자리(회색 실루엣) — 목표 위치·각도
      const sil = buildObj(o.type, '#D8CBB8', '#B7A488', '#EDE4D6');
      sil.setAttribute('class', 'slot');
      sil.setAttribute('data-slot', i);
      sil.setAttribute('transform', 'translate(' + o.x + ' ' + o.y + ') rotate(' + o.rot + ')');
      cur.boardLayer.appendChild(sil);
      // 조각(색칠) — 트레이에서 시작, 회전이 필요하면 0°로 출발
      const spawnRot = pz.rotStep ? 0 : o.rot;
      const p = {
        id: 'p' + i, type: o.type,
        target: { x: o.x, y: o.y }, rotTarget: o.rot, rot: spawnRot,
        pos: { x: (i + 0.5) * step, y: TRAY_CY },
        placed: false, slotIdx: i,
      };
      p.el = el('g', { class: 'piece', 'data-id': p.id });
      // 손가락으로 집기 쉽게 투명 히트 영역
      p.el.appendChild(el('circle', { cx: 0, cy: 0, r: 13, fill: '#fff', 'fill-opacity': 0, 'pointer-events': 'all' }));
      p.el.appendChild(buildObj(o.type, D.OBJ_COLORS[o.type], '#fff', 'rgba(255,255,255,.85)'));
      cur.pieceLayer.appendChild(p.el);
      cur.pieces.push(p);
      renderSpoon(p);
    });

    setTimeout(() => A.speak(pz.rotStep
      ? '본보기랑 똑같이! 물건을 끌어다 놓고 톡 눌러 방향을 맞춰 봐.'
      : '본보기를 보고 물건을 같은 자리에 끌어다 놓아 볼까?'), 350);
  }

  function renderSpoon(p) {
    p.el.setAttribute('transform', 'translate(' + p.pos.x + ' ' + p.pos.y + ') rotate(' + p.rot + ')');
  }

  function spoonDown(p) {
    grabbed = p; moved = 0;
    p.el.classList.add('grab');
    cur.pieceLayer.appendChild(p.el); // 맨 위로
    const s = slotEl(p.slotIdx); if (s) s.classList.add('hint');
    A.sfx.pick();
  }
  function spoonMove(pt) {
    const nx = Math.min(98, Math.max(2, pt.x + grabOff.x));
    const ny = Math.min(136, Math.max(2, pt.y + grabOff.y));
    moved += Math.abs(nx - grabbed.pos.x) + Math.abs(ny - grabbed.pos.y);
    grabbed.pos = { x: nx, y: ny };
    renderSpoon(grabbed);
  }
  function spoonUp() {
    const p = grabbed; grabbed = null;
    p.el.classList.remove('grab');
    const s = slotEl(p.slotIdx); if (s) s.classList.remove('hint');

    if (moved < 3) { // 끌지 않고 톡 → 방향 돌리기
      if (cur.puzzle.rotStep) {
        p.rot = (p.rot + cur.puzzle.rotStep) % 360;
        renderSpoon(p);
        A.sfx.spin();
        if (p.rot === p.rotTarget && dist(p.pos, p.target) < TOL) return snapSpoon(p);
      } else A.sfx.tap();
      return;
    }
    // 끌어서 놓기 — 자리·각도가 맞으면 착!
    const near = dist(p.pos, p.target) < TOL;
    if (near && p.rot === p.rotTarget) return snapSpoon(p);
    if (near && p.rot !== p.rotTarget) {
      A.sfx.nope(); wiggle(p.el);
      A.speak('톡 눌러서 방향을 돌려 볼까?');
    }
    renderSpoon(p);
  }
  function snapSpoon(p) {
    p.placed = true; p.rot = p.rotTarget; p.pos = { x: p.target.x, y: p.target.y };
    animSpoon(p);
    p.el.classList.add('placed');
    const s = slotEl(p.slotIdx); if (s) s.classList.add('filled');
    cur.placedCount++;
    $('spoon-count').textContent = cur.placedCount + ' / ' + cur.pieces.length;
    A.sfx.pop();
    if (cur.placedCount >= cur.pieces.length) setTimeout(complete, 420);
  }
  // 목표로 스르륵 (rAF)
  function animSpoon(p) {
    const from = { x: p.pos.x, y: p.pos.y }, t0 = performance.now();
    function stepFn(t) {
      let f = Math.min(1, (t - t0) / 220); f = 1 - (1 - f) * (1 - f);
      p.pos = { x: from.x + (p.target.x - from.x) * f, y: from.y + (p.target.y - from.y) * f };
      renderSpoon(p);
      if (f < 1) requestAnimationFrame(stepFn);
    }
    requestAnimationFrame(stepFn);
  }
  function slotEl(idx) { return cur.boardLayer.querySelector('[data-slot="' + idx + '"]'); }

  /* ═══════════ 빨대 놀이 (높이 맞추기) ═══════════ */
  const Y_TOP = 12, Y_BOT = 88, SNAP_H = 0.08; // 목표 ±8% 안이면 착
  const hToY = h => Y_BOT - h * (Y_BOT - Y_TOP);
  const yToH = y => (Y_BOT - y) / (Y_BOT - Y_TOP);

  function openStraw(m, pz) {
    cur = { game: 'straw', mode: m.id, puzzle: pz, svg: $('straw-stage'), pieces: [], placedCount: 0 };
    $('straw-title').textContent = pz.emoji + ' ' + pz.name;
    $('straw-count').textContent = '0 / ' + pz.sliders.length;
    showScreen('scr-straw');

    const n = pz.sliders.length;
    const step = 100 / n;
    const xs = pz.sliders.map((s, i) => (i + 0.5) * step);

    // 본보기 — 끈 + 색 슬라이더가 목표 높이에
    const sample = $('straw-sample');
    sample.innerHTML = '';
    pz.sliders.forEach((s, i) => {
      sample.appendChild(el('line', { x1: xs[i], y1: Y_TOP - 4, x2: xs[i], y2: Y_BOT + 4, class: 'string' }));
      sample.appendChild(el('circle', { cx: xs[i], cy: Y_TOP - 5, r: 2.2, class: 'peg' }));
      sample.appendChild(sliderRect(xs[i], hToY(s.target), s.color, false));
    });

    // 놀이판 — 끈 + 목표 표시(회색) + 실제 슬라이더
    const svg = cur.svg;
    svg.innerHTML = '';
    cur.boardLayer = el('g', {}); svg.appendChild(cur.boardLayer);
    cur.pieceLayer = el('g', {}); svg.appendChild(cur.pieceLayer);

    pz.sliders.forEach((s, i) => {
      cur.boardLayer.appendChild(el('line', { x1: xs[i], y1: Y_TOP - 4, x2: xs[i], y2: Y_BOT + 4, class: 'string' }));
      cur.boardLayer.appendChild(el('circle', { cx: xs[i], cy: Y_TOP - 5, r: 2.2, class: 'peg' }));
      // 목표 자리(회색 점선)
      cur.boardLayer.appendChild(sliderRect(xs[i], hToY(s.target), '#D8CBB8', true, i));
      // 실제 슬라이더 — 목표에서 멀리 떨어진 곳에서 시작
      const init = s.target > 0.5 ? Math.max(0.05, s.target - 0.4) : Math.min(0.95, s.target + 0.4);
      const p = { id: 'q' + i, x: xs[i], target: s.target, h: init, color: s.color, placed: false, slotIdx: i };
      p.el = sliderRect(xs[i], hToY(init), s.color, false);
      p.el.classList.add('piece', 'slider');
      p.el.dataset.id = p.id;
      cur.pieceLayer.appendChild(p.el);
      cur.pieces.push(p);
    });

    setTimeout(() => A.speak('본보기랑 똑같은 높이로! 색 막대를 위아래로 밀어 맞춰 봐.'), 350);
  }
  // 슬라이더(빨대 토막) 모양 — 가운데 (cx, cy)
  function sliderRect(cx, cy, color, ghost, slotIdx) {
    const g = el('g', ghost ? { class: 'straw-target', 'data-slot': slotIdx } : {});
    g.appendChild(el('rect', {
      x: cx - 9, y: cy - 5.5, width: 18, height: 11, rx: 4,
      fill: ghost ? 'none' : color, stroke: ghost ? '#B7A488' : '#fff',
      'stroke-width': ghost ? 0.8 : 1.4, 'stroke-dasharray': ghost ? '2 1.4' : 'none',
    }));
    if (!ghost) {
      g.appendChild(el('circle', { cx: cx - 4.5, cy: cy, r: 1.3, fill: 'rgba(255,255,255,.75)' }));
      g.appendChild(el('circle', { cx: cx + 4.5, cy: cy, r: 1.3, fill: 'rgba(255,255,255,.55)' }));
    }
    g.__cx = cx;
    return g;
  }
  function renderStraw(p) {
    const cy = hToY(p.h);
    const r = p.el.querySelector('rect');
    r.setAttribute('y', cy - 5.5);
    p.el.querySelectorAll('circle').forEach(c => c.setAttribute('cy', cy));
  }
  function strawDown(p) {
    grabbed = p; moved = 0;
    p.el.classList.add('grab');
    cur.pieceLayer.appendChild(p.el);
    const s = strawTargetEl(p.slotIdx); if (s) s.classList.add('hint');
    A.sfx.pick();
  }
  function strawMove(pt) {
    const h = Math.min(1, Math.max(0, yToH(pt.y + grabOff.y)));
    moved += Math.abs(h - grabbed.h);
    if (Math.abs(h - grabbed.h) > 0.006) A.sfx.slide();
    grabbed.h = h;
    renderStraw(grabbed);
  }
  function strawUp() {
    const p = grabbed; grabbed = null;
    p.el.classList.remove('grab');
    const s = strawTargetEl(p.slotIdx); if (s) s.classList.remove('hint');
    if (Math.abs(p.h - p.target) <= SNAP_H) return snapStraw(p);
    renderStraw(p); // 안 맞아도 그 자리에 그대로 — 벌점 없음
  }
  function snapStraw(p) {
    p.placed = true; p.h = p.target;
    renderStraw(p);
    p.el.classList.add('placed');
    const s = strawTargetEl(p.slotIdx); if (s) s.classList.add('filled');
    cur.placedCount++;
    $('straw-count').textContent = cur.placedCount + ' / ' + cur.pieces.length;
    A.sfx.pop();
    if (cur.placedCount >= cur.pieces.length) setTimeout(() => {
      A.xylo(cur.pieces.map(q => q.target)); // 실로폰 음
      complete();
    }, 420);
  }
  function strawTargetEl(idx) { return cur.boardLayer.querySelector('.straw-target[data-slot="' + idx + '"]'); }

  /* ═══════════ 네모 조각 놀이 (회전 맞추기) ═══════════ */
  const SQ_M = 6;         // 판 바깥 여백(0~100 안)
  let sqStart = null;     // 톡/끌기 구분용 시작점

  // 조각 하나(2×2 칸)를 그린다 — 가운데 원점, 칸 반크기 half
  function buildSquarePiece(cells, half) {
    const g = el('g', {});
    const gap = half * 0.28;          // 칸 사이 틈
    const r = half - gap;             // 칸 반쪽 크기
    const size = r * 2;
    // 조각 바탕 타일(2×2를 감싸는 둥근 판) — 조각 경계가 눈에 보이게
    g.appendChild(el('rect', {
      x: -half * 2 + gap * 0.4, y: -half * 2 + gap * 0.4,
      width: half * 4 - gap * 0.8, height: half * 4 - gap * 0.8,
      rx: half * 0.5, class: 'sq-tile',
    }));
    const off = [[-half, -half], [half, -half], [-half, half], [half, half]]; // TL,TR,BL,BR
    cells.forEach((v, i) => {
      g.appendChild(el('rect', {
        x: off[i][0] - r, y: off[i][1] - r, width: size, height: size,
        rx: r * 0.34, class: v ? 'sq-cell on' : 'sq-cell',
      }));
    });
    return g;
  }
  // 본보기(정지 무늬)를 그린다 — 조각들이 제자리(rot 0)일 때의 전체 격자
  function drawSquareSample(svg, pz) {
    svg.innerHTML = '';
    const per = pz.size / 2;              // 한 변 조각 수 (1 또는 2)
    const span = (100 - SQ_M * 2) / per;  // 조각 한 칸(2×2) 크기
    const half = span / 4;                // 칸 반크기
    pz.pieces.forEach((pc, idx) => {
      const qx = idx % per, qy = Math.floor(idx / per);
      const cx = SQ_M + (qx + 0.5) * span, cy = SQ_M + (qy + 0.5) * span;
      const g = buildSquarePiece(pc.cells, half);
      g.setAttribute('transform', 'translate(' + cx + ' ' + cy + ')');
      svg.appendChild(g);
    });
  }

  function openSquare(m, pz) {
    cur = { game: 'square', mode: m.id, puzzle: pz, svg: $('square-stage'), pieces: [], placedCount: 0 };
    $('square-title').textContent = pz.emoji + ' ' + pz.name;
    $('square-count').textContent = '0 / ' + pz.pieces.length;
    showScreen('scr-square');

    drawSquareSample($('square-sample'), pz);

    const svg = cur.svg;
    svg.innerHTML = '';
    const per = pz.size / 2;
    const span = (100 - SQ_M * 2) / per;
    const half = span / 4;
    pz.pieces.forEach((pc, idx) => {
      const qx = idx % per, qy = Math.floor(idx / per);
      const cx = SQ_M + (qx + 0.5) * span, cy = SQ_M + (qy + 0.5) * span;
      const p = {
        id: 'r' + idx, idx, cells: pc.cells, cx, cy,
        rot: pc.startRot, matched: false,
      };
      p.el = el('g', { class: 'piece sq-piece', 'data-id': p.id });
      p.el.appendChild(buildSquarePiece(pc.cells, half));
      svg.appendChild(p.el);
      cur.pieces.push(p);
      renderSquare(p);
    });

    setTimeout(() => A.speak(pz.pieces.length > 1
      ? '본보기랑 똑같이! 네모 조각을 톡톡 눌러 돌려서 맞춰 봐.'
      : '네모를 톡톡 눌러 돌려서 본보기랑 똑같이 만들어 볼까?'), 350);
  }
  // p.rot은 누적 각도(계속 커진다) — 뒤로 튕기지 않고 늘 앞으로 돈다. 판정은 360으로 접어서 본다.
  function renderSquare(p) {
    p.el.setAttribute('transform', 'translate(' + p.cx + ' ' + p.cy + ') rotate(' + p.rot + ')');
  }
  // 지금 각도의 무늬가 본보기(제자리)와 같은지 — 누적 각도를 0~359로 접어서 본다
  function squareMatched(p) { return D.sameCells(D.rotN(p.cells, ((p.rot % 360) + 360) % 360), p.cells); }

  function rotateSquare(p) {
    p.rot += 90;
    // 스르륵 도는 느낌 — CSS transition이 transform을 부드럽게 이어준다
    renderSquare(p);
    A.sfx.spin();
    if (squareMatched(p)) snapSquare(p);
  }
  function snapSquare(p) {
    p.matched = true;
    p.el.classList.add('placed', 'sq-lock');
    cur.placedCount++;
    $('square-count').textContent = cur.placedCount + ' / ' + cur.pieces.length;
    A.sfx.pop();
    if (cur.placedCount >= cur.pieces.length) setTimeout(complete, 420);
  }
  function squareDown(p) { grabbed = p; moved = 0; sqStart = null; }
  function squareUp() {
    const p = grabbed; grabbed = null;
    if (moved < 3) rotateSquare(p); // 끌지 않고 톡 → 회전
  }

  /* ─────────── 포인터 (세 놀이 공통 입구) ─────────── */
  function svgPoint(ev, svg) {
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const pt = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
    return { x: pt.x, y: pt.y };
  }
  function onDown(ev) {
    if (!cur || grabbed) return;
    const g = ev.target.closest && ev.target.closest('.piece');
    if (!g) return;
    const p = cur.pieces.find(q => q.el === g);
    if (!p || p.placed || p.matched) return;
    ev.preventDefault();
    const pt = svgPoint(ev, cur.svg);
    if (cur.game === 'spoon') { grabOff = { x: p.pos.x - pt.x, y: p.pos.y - pt.y }; spoonDown(p); }
    else if (cur.game === 'straw') { grabOff = { x: 0, y: hToY(p.h) - pt.y }; strawDown(p); }
    else { sqStart = pt; squareDown(p); }
  }
  function onMove(ev) {
    if (!grabbed) return;
    ev.preventDefault();
    const pt = svgPoint(ev, cur.svg);
    if (cur.game === 'spoon') spoonMove(pt);
    else if (cur.game === 'straw') strawMove(pt);
    else { if (sqStart) { moved += dist(pt, sqStart); sqStart = pt; } } // 톡/끌기 구분만
  }
  function onUp() {
    if (!grabbed) return;
    if (cur.game === 'spoon') spoonUp();
    else if (cur.game === 'straw') strawUp();
    else squareUp();
  }

  function wiggle(e) {
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
      Pet.awardSnack(1); // 한 판 완성 = 간식
      const lvIds = m.list().filter(q => q.level === pz.level).map(q => q.id);
      if (lvIds.every(id => P.isDone(m.id, id))) Pet.awardMeal(1); // 단계 완주 = 식사
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
  const CF = ['#FF8A80', '#FFD54F', '#81C784', '#4FC3F7', '#BA68C8', '#F48FB1', '#FF9E58', '#C99A5B'];
  function confetti() {
    const box = $('confetti');
    box.innerHTML = '';
    for (let i = 0; i < 36; i++) {
      const s = document.createElement('span');
      s.className = 'cf';
      s.style.left = (2 + Math.random() * 96) + '%';
      s.style.background = CF[i % CF.length];
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
    rewardNextFn = onNext; rewardCloseFn = onClose || null;
    $('reward-close').hidden = !onClose;
    $('reward').classList.add('on');
  }

  /* ═══════════ 요리조리 풍선 줄 놀이 (canvas 운필력) ═══════════
   * 본보기 풍선 카드의 줄을 보고 내 카드에 풍선 꼭지부터 줄을 그린다.
   * 판정: ink.js judge(band) 의 재현율(coverage)·정밀도(precision)를 함께 본다.
   *   통과 = coverage ≥ cmin AND precision ≥ pmin.
   *   1·2단계(따라 그리기)는 밴드를 좁혀 곡선을 잘 따라와야 통과,
   *   3단계(보고 그리기)는 밴드를 넓히고 임계를 낮춰 관대하되,
   *   마구 칠하기·곡선 무시 직선·점 몇 개는 정밀도(precision)에서 떨어진다. */
  const BL_JUDGE = {
    trace: { band: 54, cmin: 0.55, pmin: 0.55 },  // 따라 그리기(1·2단계)
    free:  { band: 72, cmin: 0.42, pmin: 0.42 },  // 보고 그리기(3단계) — 너그럽게
  };
  // 크레용 색 (본보기 검은 줄과 비슷한 남색이 기본)
  const COLORS = ['#E8354D', '#F2762E', '#E5A800', '#3FBF77', '#31B7D8', '#4E6FE3', '#8B5BD6', '#F25CA2', '#8A5A3B', '#3B3B4A'];
  let bPad = null;
  let bcur = null;   // { level, li, idx, col, dirty, failStamp }
  let balloonColor = COLORS[9];
  let balloonTool = 'pen';

  function makeSwatches(container, current, onPick) {
    container.innerHTML = '';
    COLORS.forEach(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch' + (c === current ? ' on' : '');
      b.style.background = c === 'rb' ? 'conic-gradient(red,orange,gold,green,blue,violet,red)' : c;
      b.addEventListener('click', ev => {
        ev.preventDefault(); A.sfx.tap(); onPick(c);
        container.querySelectorAll('.swatch').forEach(s => s.classList.toggle('on', s === b));
      });
      container.appendChild(b);
    });
  }

  function balloonPageId(level, idx) { return level.id + '-' + idx; }
  function balloonDoneIn(level) {
    let n = 0;
    level.pages.forEach((_, i) => { if (P.isDone('balloon', balloonPageId(level, i))) n++; });
    return n;
  }
  function balloonDone() { return D.balloons.levels.reduce((n, lv) => n + balloonDoneIn(lv), 0); }
  function balloonTotal() { return D.balloons.levels.reduce((n, lv) => n + lv.pages.length, 0); }
  function balloonFirstTodo(level) {
    for (let i = 0; i < level.pages.length; i++) if (!P.isDone('balloon', balloonPageId(level, i))) return i;
    return 0;
  }
  function setBalloonTool(tool) {
    balloonTool = tool;
    $('btn-balloon-eraser').classList.toggle('on', tool === 'erase');
  }
  function balloonJudge() { return bcur.level.trace ? BL_JUDGE.trace : BL_JUDGE.free; }

  function initBalloon() {
    bPad = Ink.BalloonPad($('balloon-pad'), {
      color: () => balloonColor, tool: () => balloonTool,
      onChange: () => { if (bcur) bcur.dirty = true; },
    });
    makeSwatches($('balloon-swatches'), balloonColor, c => { balloonColor = c; setBalloonTool('pen'); });
    window.addEventListener('resize', renderBalloonSampleNow);
  }
  function renderBalloonSampleNow() {
    if (!bcur) return;
    const page = bcur.level.pages[bcur.idx];
    Ink.renderBalloonSample($('balloon-sample'), page.p, bcur.col);
  }

  // 단계 목록 — 도안 목록 화면(scr-list)을 재사용한다
  function openBalloonLevels() {
    bcur = null;
    curMode = null;
    $('list-title').textContent = D.balloons.icon + ' ' + D.balloons.name;
    const list = $('play-list');
    list.innerHTML = '';
    D.balloons.levels.forEach(lv => {
      const done = balloonDoneIn(lv), total = lv.pages.length;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'item-main';
      b.dataset.level = lv.id;
      b.innerHTML =
        '<span class="it-emoji">' + lv.e + '</span>' +
        '<span class="it-texts"><span class="it-name">' + lv.name + '</span>' +
        '<span class="it-kind">' + lv.kind + '</span></span>' +
        '<span class="it-prog">' + (done >= total ? '🏅' : '⭐ ' + done + ' / ' + total) + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openBalloon(lv, balloonFirstTodo(lv)); });
      list.appendChild(b);
    });
    showScreen('scr-list');
  }

  function openBalloon(level, idx) {
    bcur = { level, li: D.balloons.levels.indexOf(level), idx };
    $('balloon-title').textContent = '🎈 ' + level.name;
    setBalloonTool('pen');
    showScreen('scr-balloon');
    bPad.resize();
    openBalloonPage(idx);
  }

  function openBalloonPage(idx) {
    const level = bcur.level;
    bcur.idx = idx;
    bcur.dirty = false;
    bcur.failStamp = null;
    bcur.col = (bcur.li * 10 + idx) % Ink.BALLOON_N; // 페이지마다 풍선 색 순환
    const page = level.pages[idx];
    $('balloon-prev').disabled = idx === 0;
    $('balloon-next').disabled = false;
    const dots = $('balloon-dots');
    dots.innerHTML = '';
    level.pages.forEach((_, i) => {
      const d = document.createElement('span');
      d.className = 'dot' + (i === idx ? ' on' : '') + (P.isDone('balloon', balloonPageId(level, i)) ? ' done' : '');
      dots.appendChild(d);
    });
    bPad.setCurve(page.p, level.trace ? 'show' : 'hide', bcur.col);
    renderBalloonSampleNow();
    bcur.dirty = false;
    setTimeout(() => A.speak(page.say || page.name), 350);
  }

  function balloonStamp() { return bPad.strokeCount() + ':' + Math.round(bPad.inkLength()); }
  /* ▶ = 다 그렸어요 + 다음. 안 그렸으면 그냥 넘기고,
   * 판정 실패 후 같은 상태로 두 번 누르면 좌절하지 않게 보내 준다. */
  function balloonNext() {
    if (!bcur) return;
    const level = bcur.level;
    const next = () => { if (bcur.idx < level.pages.length - 1) openBalloonPage(bcur.idx + 1); else openBalloonLevels(); };
    if (bPad.strokeCount() === 0) { A.sfx.tap(); next(); return; } // 안 그렸으면 구경만
    if (!bcur.dirty && P.isDone('balloon', balloonPageId(level, bcur.idx))) { A.sfx.tap(); next(); return; }
    const j = balloonJudge();
    const r = bPad.judge(j.band);
    if (r.coverage < j.cmin || r.precision < j.pmin) {
      const stamp = balloonStamp();
      if (bcur.failStamp === stamp) { A.sfx.tap(); next(); return; } // 두 번째 누름 → 보내주기
      bcur.failStamp = stamp;
      A.sfx.nope();
      wiggle($('balloon-mine'));
      A.speak(level.trace
        ? '풍선 꼭지부터 점선을 따라 그려 볼까?'
        : '본보기 풍선 줄을 잘 보고 똑같이 그려 볼까?');
      return;
    }
    finishBalloonPage();
  }

  function finishBalloonPage() {
    const level = bcur.level, idx = bcur.idx;
    const pz = level.pages[idx];
    P.recordDone('balloon', balloonPageId(level, idx));
    P.addStar(1);
    if (window.Pet) { // 펫 먹이: 페이지 = 간식, 단계(10장) 완주 = 식사
      Pet.awardSnack(1);
      if (balloonDoneIn(level) >= level.pages.length) Pet.awardMeal(1);
    }
    // 풍선이 두둥실 떠오르는 축하 → 보상 카드
    const fly = $('balloon-fly');
    fly.className = 'bl-fly blc-' + bcur.col;
    fly.hidden = false;
    void fly.offsetWidth;
    fly.classList.add('fly');
    A.sfx.fanfare();
    confetti();
    const praise = D.praises[Math.floor(Math.random() * D.praises.length)];
    A.speak(pz.name + '! ' + praise);
    const last = idx >= level.pages.length - 1;
    clearTimeout(finishBalloonPage.t);
    finishBalloonPage.t = setTimeout(() => {
      fly.classList.remove('fly');
      fly.hidden = true;
      showReward(praise, last ? '단계 목록으로' : '다음 🎈 ▶',
        () => { if (last) openBalloonLevels(); else openBalloonPage(idx + 1); },
        () => openBalloonLevels());
    }, 950);
  }

  /* ─────────── 초기화 ─────────── */
  function init() {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());

    ['spoon-stage', 'straw-stage', 'square-stage'].forEach(id => $(id).addEventListener('pointerdown', onDown));
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    initBalloon();
    $('btn-balloon-back').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openBalloonLevels(); });
    $('balloon-prev').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); if (bcur && bcur.idx > 0) openBalloonPage(bcur.idx - 1); });
    $('balloon-next').addEventListener('click', ev => { ev.preventDefault(); balloonNext(); });
    $('btn-balloon-listen').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      if (!bcur) return;
      const p = bcur.level.pages[bcur.idx];
      A.speak(p.say || p.name);
    });
    $('btn-balloon-eraser').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      setBalloonTool(balloonTool === 'erase' ? 'pen' : 'erase');
    });
    $('btn-balloon-undo').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); bPad.undo(); });
    $('balloon-clear').addEventListener('click', ev => { ev.preventDefault(); A.sfx.pop(); bPad.clear(); });

    document.querySelectorAll('[data-go]').forEach(b => {
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); showScreen(b.dataset.go); });
    });
    $('btn-spoon-back').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openList(curMode); });
    $('btn-straw-back').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openList(curMode); });
    $('btn-square-back').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openList(curMode); });
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

  /* ─────────── 종단 테스트용 상태 ─────────── */
  function debug() {
    const out = {
      screen: screenId, stars: P.stars(),
      game: cur ? cur.game : null, puzzle: cur ? cur.puzzle.id : null,
      placed: cur ? cur.placedCount : 0, total: cur ? cur.pieces.length : 0,
      rewardOn: $('reward').classList.contains('on'),
      pieces: [],
      balloon: bcur ? (() => {
        const r = bPad.judge(balloonJudge().band);
        return {
          level: bcur.level.id, idx: bcur.idx, col: bcur.col,
          guide: bPad.guideShown(), strokes: bPad.strokeCount(),
          coverage: r.coverage, precision: r.precision, judge: balloonJudge(),
        };
      })() : null,
    };
    if (cur && (screenId === 'scr-spoon' || screenId === 'scr-straw' || screenId === 'scr-square')) {
      const m = cur.svg.getScreenCTM();
      const toClient = (x, y) => { const q = new DOMPoint(x, y).matrixTransform(m); return { x: q.x, y: q.y }; };
      if (cur.game === 'spoon') {
        out.pieces = cur.pieces.map(p => ({
          id: p.id, placed: p.placed, rot: p.rot, rotTarget: p.rotTarget, rotStep: cur.puzzle.rotStep,
          client: toClient(p.pos.x, p.pos.y), targetClient: toClient(p.target.x, p.target.y),
        }));
      } else if (cur.game === 'straw') {
        out.pieces = cur.pieces.map(p => ({
          id: p.id, placed: p.placed, h: p.h, target: p.target,
          client: toClient(p.x, hToY(p.h)), targetClient: toClient(p.x, hToY(p.target)),
        }));
      } else {
        out.pieces = cur.pieces.map(p => ({
          id: p.id, placed: p.matched, matched: p.matched, rot: p.rot,
          client: toClient(p.cx, p.cy),
        }));
      }
    }
    return out;
  }

  return { showScreen, debug };
})();
