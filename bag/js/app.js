/* 가방 놀이터 셸 — 홈/도안 목록/두 놀이(숟가락·빨대) 화면 전환과 드래그 엔진.
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
        : '슬라이더 ' + pz.sliders.length + '개';
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
    else openStraw(m, pz);
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

  /* ─────────── 포인터 (두 놀이 공통 입구) ─────────── */
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
    if (!p || p.placed) return;
    ev.preventDefault();
    const pt = svgPoint(ev, cur.svg);
    if (cur.game === 'spoon') { grabOff = { x: p.pos.x - pt.x, y: p.pos.y - pt.y }; spoonDown(p); }
    else { grabOff = { x: 0, y: hToY(p.h) - pt.y }; strawDown(p); }
  }
  function onMove(ev) {
    if (!grabbed) return;
    ev.preventDefault();
    const pt = svgPoint(ev, cur.svg);
    if (cur.game === 'spoon') spoonMove(pt); else strawMove(pt);
  }
  function onUp() {
    if (!grabbed) return;
    if (cur.game === 'spoon') spoonUp(); else strawUp();
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

  /* ─────────── 초기화 ─────────── */
  function init() {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());

    ['spoon-stage', 'straw-stage'].forEach(id => $(id).addEventListener('pointerdown', onDown));
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    document.querySelectorAll('[data-go]').forEach(b => {
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); showScreen(b.dataset.go); });
    });
    $('btn-spoon-back').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openList(curMode); });
    $('btn-straw-back').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openList(curMode); });
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
    };
    if (cur && (screenId === 'scr-spoon' || screenId === 'scr-straw')) {
      const m = cur.svg.getScreenCTM();
      const toClient = (x, y) => { const q = new DOMPoint(x, y).matrixTransform(m); return { x: q.x, y: q.y }; };
      if (cur.game === 'spoon') {
        out.pieces = cur.pieces.map(p => ({
          id: p.id, placed: p.placed, rot: p.rot, rotTarget: p.rotTarget, rotStep: cur.puzzle.rotStep,
          client: toClient(p.pos.x, p.pos.y), targetClient: toClient(p.target.x, p.target.y),
        }));
      } else {
        out.pieces = cur.pieces.map(p => ({
          id: p.id, placed: p.placed, h: p.h, target: p.target,
          client: toClient(p.x, hToY(p.h)), targetClient: toClient(p.x, hToY(p.target)),
        }));
      }
    }
    return out;
  }

  return { showScreen, debug };
})();
