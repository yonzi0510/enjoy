/* 앱 셸 — 홈(단계 3개) → 퍼즐 목록(단계별 10) → 무지개 탱그램 놀이판.
 * 판은 SVG 하나(위 = 그림판, 아래/오른쪽 = 조각 트레이)로 그려서 폰·패드 어디서나 같은 비율로 늘어난다.
 * 조각은 고리를 부채꼴로 자른 모양(SVG path, 두 호 + 두 직선)이며,
 * 포인터 이벤트(pointerdown/move/up)로 손가락·마우스·펜 모두 같은 코드로 끈다.
 * 높은 단계(rotate:true)는 조각을 톡 누르면 30°씩 돌아가고, 자리·각도가 모두 맞아야 착 붙는다.
 * 눈 등 고정 장식은 아이가 옮기지 않는 배경 스티커로, 조각 위에 항상 보이도록 맨 위 레이어에 그린다. */
window.App = (() => {
  const D = window.TangramData;
  const A = window.Audio2;
  const P = window.Progress;
  const $ = id => document.getElementById(id);
  const SVGNS = 'http://www.w3.org/2000/svg';

  const ROT_STEP = 30; // 톡 누르면 도는 각도

  /* ─────────── 판 좌표계 (shape/도형 놀이터와 같은 방식) ───────────
   * 세로: viewBox 0 0 100 148 — 위 0~92 그림판, 94~146 트레이(가로 두 줄)
   * 가로: viewBox 0 0 158 92 — 왼쪽 0~100 그림판, 오른쪽 102~156.5 트레이(세로 두 줄)
   * 그림판 영역(0~100×0~92)은 두 방향에서 똑같아서 조각 목표 좌표는 방향과 무관하다. */
  const VW = 100, VH = 148, BOARD_H = 92, TRAY_Y = 94, TRAY_H = 52;
  const LVW = 158, LVH = 92, TRAY_X = 102;
  const landMq = window.matchMedia('(orientation: landscape)');
  let land = landMq.matches;
  const inTray = pos => land ? pos.x > TRAY_X - 2 : pos.y > TRAY_Y - 2;
  const viewSize = () => land ? { w: LVW, h: LVH } : { w: VW, h: VH };

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function el(tag, attrs) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  /* ─────────── 화면 전환 ─────────── */
  let screenId = 'scr-home';
  function showScreen(id) {
    A.stop();
    screenId = id;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id === 'scr-home') renderHome();
  }

  /* ─────────── 그림 그리기(축소판 — 목록·본보기 카드·보상에 공용) ─────────── */
  function decoSVG(d, ox, oy, sc) {
    ox = ox || 0; oy = oy || 0; sc = sc == null ? 1 : sc;
    if (d.t === 'eye') {
      const x = ox + d.x * sc, y = oy + d.y * sc, r = (d.r || 0.6) * sc;
      return '<g><circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#fff" stroke="#3a3a3a" stroke-width="' + (r * 0.16) + '"/>' +
        '<circle cx="' + (x + r * 0.32) + '" cy="' + (y + r * 0.22) + '" r="' + (r * 0.52) + '" fill="#2b2b2b"/></g>';
    }
    if (d.t === 'dot') {
      return '<circle cx="' + (ox + d.x * sc) + '" cy="' + (oy + d.y * sc) + '" r="' + (d.r * sc) +
        '" fill="' + d.c + '" stroke="#fff" stroke-width="' + (0.15 * sc) + '"/>';
    }
    if (d.t === 'line') {
      return '<line x1="' + (ox + d.x1 * sc) + '" y1="' + (oy + d.y1 * sc) + '" x2="' + (ox + d.x2 * sc) + '" y2="' + (oy + d.y2 * sc) +
        '" stroke="' + (d.c || '#8A5A38') + '" stroke-width="' + (d.w || 0.45) * sc + '" stroke-linecap="round"/>';
    }
    if (d.t === 'smile') {
      const x = ox + d.x * sc, y = oy + d.y * sc, w = d.w * sc, h = d.h * sc;
      return '<path d="M ' + (x - w / 2) + ' ' + y + ' Q ' + x + ' ' + (y + h) + ' ' + (x + w / 2) + ' ' + y +
        '" fill="none" stroke="#3a3a3a" stroke-width="' + (0.22 * sc) + '" stroke-linecap="round"/>';
    }
    return '';
  }
  function pieceSVGPath(pc, ox, oy, sc, rotOverride) {
    const tpl = D.ARC_SHAPES[pc.shape];
    const scTpl = { innerR: tpl.innerR * sc, outerR: tpl.outerR * sc, sweep: tpl.sweep };
    const rot = rotOverride == null ? pc.rot : rotOverride;
    return D.arcPathD(ox + pc.x * sc, oy + pc.y * sc, scTpl, rot);
  }
  // 완성된 그림 전체를 작게 그린 SVG 문자열 (목록 썸네일·본보기 카드·보상 카드 공용)
  function pictureSVG(pz) {
    const bb = D.pictureBBox(pz);
    const pad = 1.4;
    const vb = [bb.x0 - pad, bb.y0 - pad, (bb.x1 - bb.x0) + pad * 2, (bb.y1 - bb.y0) + pad * 2];
    let s = '';
    pz.pieces.forEach(pc => {
      s += '<path d="' + pieceSVGPath(pc, 0, 0, 1) + '" fill="' + D.colorMeta(pc.color).hex + '" stroke="#fff" stroke-width="0.22"/>';
    });
    (pz.deco || []).forEach(d => { s += decoSVG(d, 0, 0, 1); });
    return '<svg class="pic-svg" viewBox="' + vb.join(' ') + '" xmlns="' + SVGNS + '">' + s + '</svg>';
  }

  /* ─────────── 홈: 단계 3개 ─────────── */
  function renderHome() {
    $('home-stars').textContent = P.stars();
    const menu = $('menu');
    menu.innerHTML = '';
    D.LEVELS.forEach(lv => {
      const ids = D.puzzlesOf(lv.id).map(x => x.id);
      const done = P.doneCount(ids);
      const rep = D.puzzlesOf(lv.id)[0];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-card ' + lv.cls;
      b.innerHTML =
        '<span class="mc-icon">' + pictureSVG(rep) + '</span>' +
        '<span class="mc-name">' + lv.name + '</span>' +
        '<span class="mc-desc">' + lv.desc + '</span>' +
        '<span class="mc-prog">' + (done ? '⭐ ' + done + ' / ' + ids.length : '처음이야!') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openList(lv); });
      menu.appendChild(b);
    });
  }

  /* ─────────── 퍼즐 목록 ─────────── */
  let curLevel = null;
  function openList(lv) {
    curLevel = lv;
    $('list-title').textContent = lv.icon + ' ' + lv.name;
    const list = D.puzzlesOf(lv.id);
    $('list-count').textContent = P.doneCount(list.map(x => x.id)) + ' / ' + list.length;
    const box = $('list');
    box.innerHTML = '';
    list.forEach((pz, i) => {
      const done = P.isDone(pz.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'puzzle-card' + (done ? ' done' : '');
      b.dataset.id = pz.id;
      b.innerHTML =
        '<span class="pz-no">' + (i + 1) + '</span>' +
        '<span class="pz-thumb">' + pictureSVG(pz) + '</span>' +
        '<span class="pz-badge">' + (done ? '⭐' : pz.emoji) + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPuzzle(pz); });
      box.appendChild(b);
    });
    showScreen('scr-list');
  }

  /* ─────────── 놀이판 만들기 ─────────── */
  let cur = null; // { puzzle, pieces:[], placedCount, snapTol, boardLayer, decoLayer, pieceLayer, trayBg }
  let grabbed = null, grabOff = null, moved = 0;

  function openPuzzle(pz) {
    cur = { puzzle: pz, pieces: [], placedCount: 0 };
    $('play-title').textContent = pz.emoji + ' ' + pz.name;
    $('ref-card').innerHTML = pictureSVG(pz);
    showScreen('scr-play');

    const svg = $('stage');
    svg.innerHTML = '';
    cur.trayBg = el('rect', { rx: 5, class: 'tray-bg' });
    svg.appendChild(cur.trayBg);
    const boardLayer = el('g', {}); svg.appendChild(boardLayer);
    const pieceLayer = el('g', {}); svg.appendChild(pieceLayer);
    const decoLayer = el('g', { class: 'deco-layer' }); svg.appendChild(decoLayer);
    cur.boardLayer = boardLayer; cur.pieceLayer = pieceLayer; cur.decoLayer = decoLayer;

    buildBoard(pz);
    applyOrientation();
    layoutTray();
    cur.pieces.forEach(renderPiece);
    updateCount();

    const say = pz.name + '! 조각을 끌어서 회색 그림 위에 맞춰 봐!' + (pz.rotate ? ' 조각을 톡 누르면 빙글 돌아!' : '');
    setTimeout(() => A.speak(say), 350);
  }

  function buildBoard(pz) {
    const bb = D.pictureBBox(pz);
    const sc = Math.min(9, (VW - 12) / (bb.x1 - bb.x0), (BOARD_H - 14) / (bb.y1 - bb.y0));
    const ox = VW / 2 - (bb.x0 + bb.x1) / 2 * sc;
    const oy = BOARD_H / 2 - (bb.y0 + bb.y1) / 2 * sc;
    cur.snapTol = Math.max(6.5, sc * 2.6);
    cur.ox = ox; cur.oy = oy; cur.sc = sc;

    pz.pieces.forEach((pc, i) => {
      const tpl = D.ARC_SHAPES[pc.shape];
      const scTpl = { innerR: tpl.innerR * sc, outerR: tpl.outerR * sc, sweep: tpl.sweep };
      const cx = ox + pc.x * sc, cy = oy + pc.y * sc;
      // 회색 실루엣 자리
      cur.boardLayer.appendChild(el('path', {
        d: D.arcPathD(cx, cy, scTpl, pc.rot), class: 'slot', 'data-slot': i,
      }));
      const spawnRot = pz.rotate ? (pc.rot + 90 + ROT_STEP * i) % 360 : pc.rot;
      const p = {
        id: 't' + i, cx, cy, tpl: scTpl,
        rot: spawnRot, rotTarget: pc.rot,
        target: { x: cx, y: cy }, slotIdx: i,
        color: D.colorMeta(pc.color).hex,
        pos: { x: 0, y: 0 }, k: 0.72, trayK: 0.72, trayK0: 0.72, placed: false,
      };
      p.el = el('g', { class: 'piece', 'data-id': p.id });
      p.body = el('path', { fill: p.color, class: 'piece-face' });
      p.el.appendChild(p.body);
      setPiecePath(p);
      cur.pieceLayer.appendChild(p.el);
      cur.pieces.push(p);
    });
    // 눈 등 고정 장식 — 맨 위 레이어(조각을 놓아도 스티커처럼 계속 보인다)
    if (pz.deco && pz.deco.length) {
      const wrap = el('g', {});
      wrap.innerHTML = pz.deco.map(d => decoSVG(d, ox, oy, sc)).join('');
      cur.decoLayer.appendChild(wrap);
    }
  }

  // 현재 rot 기준으로 조각 경로를 다시 계산 (자기 중심점 기준 회전이라 위치는 그대로)
  function setPiecePath(p) {
    p.body.setAttribute('d', D.arcPathD(0, 0, p.tpl, p.rot));
    p.bbox = bboxWH(p.tpl, p.rot);
  }
  function bboxWH(tpl, rot) {
    const b = D.pieceBBox(0, 0, tpl, rot);
    return { w: b.x1 - b.x0, h: b.y1 - b.y0 };
  }

  /* ─────────── 방향 적용 (viewBox·트레이 바탕) ─────────── */
  function applyOrientation() {
    land = landMq.matches;
    $('stage').setAttribute('viewBox', land ? '0 0 ' + LVW + ' ' + LVH : '0 0 ' + VW + ' ' + VH);
    if (!cur || !cur.trayBg) return;
    const a = land
      ? { x: TRAY_X, y: 1.5, width: LVW - TRAY_X - 1.5, height: LVH - 3 }
      : { x: 1.5, y: TRAY_Y, width: VW - 3, height: TRAY_H - 2 };
    for (const k in a) cur.trayBg.setAttribute(k, a[k]);
  }

  /* ─────────── 트레이 배치 (두 줄로 차곡차곡) ─────────── */
  function layoutTray() {
    if (!land) {
      let x = 5, row = 0;
      const rowY = [TRAY_Y + 13, TRAY_Y + 39];
      cur.pieces.forEach(p => {
        p.trayK = Math.min(p.trayK0, 22 / p.bbox.h, 32 / p.bbox.w);
        const w = p.bbox.w * p.trayK + 3;
        if (x + w > VW - 4 && row < rowY.length - 1) { row++; x = 5; }
        p.home = { x: x + w / 2, y: rowY[row] };
        x += w;
      });
    } else {
      const colX = [TRAY_X + 14, TRAY_X + 40];
      for (let f = 1; f > 0.35; f -= 0.08) {
        let y = 4, col = 0, over = false;
        cur.pieces.forEach(p => {
          p.trayK = Math.min(p.trayK0, 22 / p.bbox.w, 32 / p.bbox.h) * f;
          const h = p.bbox.h * p.trayK + 3;
          if (y + h > LVH - 3 && col < colX.length - 1) { col++; y = 4; }
          p.home = { x: colX[col], y: y + h / 2 };
          y += h;
          if (y > LVH - 3) over = true;
        });
        if (!over) break;
      }
    }
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

  /* ─────────── 드래그(터치·마우스·펜 공통) ─────────── */
  function svgPoint(ev) {
    const svg = $('stage');
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const pt = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
    return { x: pt.x, y: pt.y };
  }
  function slotEl(idx) { return cur.boardLayer.querySelector('[data-slot="' + idx + '"]'); }

  function onDown(ev) {
    if (!cur || grabbed) return;
    const g = ev.target.closest && ev.target.closest('.piece');
    if (!g) return;
    const p = cur.pieces.find(q => q.el === g);
    if (!p || p.placed) return;
    ev.preventDefault();
    grabbed = p; moved = 0;
    const pt = svgPoint(ev);
    grabOff = { x: p.pos.x - pt.x, y: p.pos.y - pt.y };
    p.k = 1;
    p.el.classList.add('grab');
    cur.pieceLayer.appendChild(p.el);
    const s = slotEl(p.slotIdx); if (s) s.classList.add('hint');
    renderPiece(p);
    A.sfx.pick();
  }
  function onMove(ev) {
    if (!grabbed) return;
    ev.preventDefault();
    const pt = svgPoint(ev);
    const vs = viewSize();
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
    const s = slotEl(p.slotIdx); if (s) s.classList.remove('hint');

    if (moved < 2.5) { // 끌지 않고 톡 — 돌리기 단계면 30° 회전
      if (cur.puzzle.rotate) {
        tapRotate(p);
        if (rotOk(p) && dist(p.pos, p.target) < cur.snapTol) return snap(p, p.target);
      } else {
        A.sfx.tap();
      }
      p.k = inTray(p.pos) ? p.trayK : 1;
      renderPiece(p);
      return;
    }
    dropPiece(p);
  }
  function tapRotate(p) {
    p.rot = (p.rot + ROT_STEP) % 360;
    setPiecePath(p);
    A.sfx.spin();
  }
  function rotOk(p) { return ((p.rot - p.rotTarget) % 360 + 360) % 360 === 0; }

  function dropPiece(p) {
    if (dist(p.pos, p.target) < cur.snapTol && rotOk(p)) return snap(p, p.target);
    if (dist(p.pos, p.target) < cur.snapTol && !rotOk(p)) {
      A.sfx.nope();
      wiggleEl(p.el);
      A.speak('톡 눌러서 빙글 돌려 볼까?');
    }
    p.k = inTray(p.pos) ? p.trayK : 1;
    renderPiece(p);
  }

  function snap(p, to) {
    p.placed = true;
    p.rot = p.rotTarget;
    setPiecePath(p);
    p.el.classList.add('placed');
    animMove(p, to, 1);
    cur.placedCount++;
    updateCount();
    A.sfx.pop();
    if (cur.placedCount >= cur.pieces.length) setTimeout(complete, 420);
  }

  function animMove(p, to, k, dur) {
    const from = { x: p.pos.x, y: p.pos.y }, k0 = p.k, t0 = performance.now();
    dur = dur || 260;
    function step(t) {
      let f = Math.min(1, (t - t0) / dur);
      f = 1 - (1 - f) * (1 - f);
      p.pos = { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f };
      p.k = k0 + (k - k0) * f;
      renderPiece(p);
      if (f < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function wiggleEl(e) { e.classList.remove('wiggle'); void e.getBoundingClientRect(); e.classList.add('wiggle'); }

  /* ─────────── 완성! ─────────── */
  function complete() {
    const pz = cur.puzzle;
    P.markDone(pz.id);
    P.addStar(1);
    if (window.Pet) {
      Pet.awardSnack(1);
      const ids = D.puzzlesOf(pz.level).map(x => x.id);
      if (P.doneCount(ids) >= ids.length && P.markStageMealOnce(pz.level)) Pet.awardMeal(1);
    }
    A.sfx.fanfare();
    confetti();
    const praise = D.praises[Math.floor(Math.random() * D.praises.length)];
    A.speak(pz.name + ' 완성! ' + praise);
    setTimeout(() => {
      $('reward-pic').innerHTML = pictureSVG(pz);
      const list = D.puzzlesOf(pz.level);
      const next = list.find(q => q.id !== pz.id && !P.isDone(q.id)) || list.find(q => q.id !== pz.id);
      showReward(praise, next ? '다음 ' + next.emoji + ' ▶' : '목록으로', () => {
        if (next) openPuzzle(next); else openList(D.levelDef(pz.level));
      });
    }, 900);
  }

  /* ─────────── 색종이 축하 ─────────── */
  const CONFETTI_COLORS = D.COLOR_IDS.map(id => D.colorMeta(id).hex);
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
  let rewardNextFn = null;
  function showReward(praise, nextLabel, onNext) {
    $('reward-praise').textContent = praise;
    $('reward-next').textContent = nextLabel;
    rewardNextFn = onNext;
    $('reward').classList.add('on');
  }

  /* ─────────── 초기화 ─────────── */
  function init() {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());

    const svg = $('stage');
    svg.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    const onOrient = () => {
      if (land === landMq.matches) return;
      applyOrientation();
      if (!cur || screenId !== 'scr-play') return;
      if (grabbed) {
        const g = grabbed;
        grabbed = null;
        g.el.classList.remove('grab');
        const s = slotEl(g.slotIdx); if (s) s.classList.remove('hint');
      }
      layoutTray();
      cur.pieces.forEach(renderPiece);
    };
    landMq.addEventListener('change', onOrient);
    window.addEventListener('resize', onOrient);
    applyOrientation();

    document.querySelectorAll('[data-go]').forEach(b => {
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); showScreen(b.dataset.go); });
    });
    $('btn-play-back').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); openList(D.levelDef(cur.puzzle.level));
    });
    $('reward-next').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      $('reward').classList.remove('on');
      if (rewardNextFn) rewardNextFn();
    });
    $('reward-close').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      $('reward').classList.remove('on');
      openList(D.levelDef(cur.puzzle.level));
    });

    renderHome();
  }
  init();

  /* ─────────── 종단 테스트용 상태 확인·직접 조작 ─────────── */
  function debug() {
    const out = {
      screen: screenId,
      stars: P.stars(),
      level: cur ? cur.puzzle.level : null,
      puzzle: cur ? cur.puzzle.id : null,
      rotateRequired: cur ? cur.puzzle.rotate : null,
      placed: cur ? cur.placedCount : 0,
      total: cur ? cur.pieces.length : 0,
      done: cur ? P.isDone(cur.puzzle.id) : null,
      pieces: [],
    };
    if (cur && screenId === 'scr-play') {
      out.pieces = cur.pieces.map(p => ({
        id: p.id, placed: p.placed, rot: p.rot, rotTarget: p.rotTarget,
        pos: { x: p.pos.x, y: p.pos.y }, target: { x: p.target.x, y: p.target.y },
      }));
    }
    return out;
  }
  function findPiece(id) { return cur ? cur.pieces.find(p => p.id === id) : null; }
  // 조각을 지정한 판 좌표(x,y)로 옮기고 놓아 본다 (실제 드래그와 같은 판정 경로)
  function attempt(id, x, y) {
    const p = findPiece(id);
    if (!p || p.placed) return false;
    p.pos = { x, y };
    dropPiece(p);
    return true;
  }
  // 조각을 30° 톡 돌린다
  function rotate(id) {
    const p = findPiece(id);
    if (!p || p.placed) return false;
    tapRotate(p);
    return true;
  }
  // 모든 조각을 (필요하면 돌려서) 제자리에 맞춰 퍼즐을 완성한다
  function solve() {
    if (!cur) return false;
    cur.pieces.slice().forEach(p => {
      if (p.placed) return;
      if (cur.puzzle.rotate) {
        let guard = 0;
        while (!rotOk(p) && guard++ < 15) tapRotate(p);
      }
      attempt(p.id, p.target.x, p.target.y);
    });
    return true;
  }

  return { showScreen, debug, _attempt: attempt, _rotate: rotate, _solve: solve };
})();
