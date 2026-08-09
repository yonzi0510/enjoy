/* 앱 셸 — 홈(단계 3개) → 퍼즐 목록(단계별 10) → 놀이(고무줄 걸기).
 * 왼쪽 본보기 카드(못판에 색 고무줄을 건 모습)를 보고, 오른쪽 놀이판에 트레이의 색을 골라
 * 못 두 개를 순서대로 탭해 그 사이에 고무줄을 건다(실제 지오보드 장난감과 같은 조작).
 * (색, 못A, 못B)가 아직 안 건 목표 세그먼트와 맞으면(순서 상관없이) 통! 소리와 함께 걸리고,
 * 안 맞으면 아무 일도 없이 살짝 안내만 한다(무벌점). 다 걸면 색종이 축하 + TTS + 별 + 펫 간식.
 * 별 = 그 퍼즐의 세그먼트 수. 진행도는 완성한 퍼즐 id로 저장한다. */
window.App = (() => {
  const D = window.GeoboardData;
  const A = window.Audio2;
  const P = window.Progress;
  const $ = id => document.getElementById(id);
  const SVGNS = 'http://www.w3.org/2000/svg';

  const GRID = D.GRID;
  const BMIN = 10, BMAX = 90; // 못판 여백(0~100 좌표계) — 가장자리 못도 잘리지 않게
  const STEP = (BMAX - BMIN) / (GRID - 1);
  const pegPx = (gx, gy) => [BMIN + gx * STEP, BMIN + gy * STEP];

  /* ─────────── 화면 전환 ─────────── */
  let screenId = 'scr-home';
  function showScreen(id) {
    A.stop();
    screenId = id;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id === 'scr-home') renderHome();
  }

  /* ─────────── 못판 SVG 그리기 ───────────
   * segments: 그릴 세그먼트 목록 · matched: 세그먼트별 완성 여부(불리언 배열, variant='play'에서만 사용)
   * variant: 'card'(본보기, 전부 실선) · 'thumb'(목록 미리보기, 전부 실선, 작게) · 'play'(놀이판) */
  function lineSVG(s, solid) {
    const [x1, y1] = pegPx(s.from[0], s.from[1]);
    const [x2, y2] = pegPx(s.to[0], s.to[1]);
    if (solid) {
      const c = D.colorMeta(s.color);
      return '<line class="band c-' + s.color + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
        '" stroke="' + c.hex + '" stroke-width="3.4" stroke-linecap="round"/>';
    }
    return '<line class="guide-line" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
      '" stroke="#B6AECC" stroke-width="1.8" stroke-dasharray="3 4.5" stroke-linecap="round" opacity=".65"/>';
  }
  function pegSVG(gx, gy, hi) {
    const [x, y] = pegPx(gx, gy);
    const idx = gy * GRID + gx;
    let s = '<g class="peg' + (hi ? ' hi' : '') + '" data-i="' + idx + '" data-x="' + gx + '" data-y="' + gy + '">';
    s += '<circle class="hit" cx="' + x + '" cy="' + y + '" r="7.2" fill="transparent"/>';
    if (hi) s += '<circle class="ring" cx="' + x + '" cy="' + y + '" r="5.6" fill="none" stroke="#6C5CE7" stroke-width="1.8"/>';
    s += '<circle class="dot" cx="' + x + '" cy="' + y + '" r="2.6"/>';
    s += '</g>';
    return s;
  }
  function boardSVG(pz, matched, variant, pendingFrom) {
    let under = '', over = '', pegs = '';
    pz.segments.forEach((s, i) => {
      if (variant === 'play') {
        if (matched[i]) over += lineSVG(s, true);
        else under += lineSVG(s, false);
      } else {
        over += lineSVG(s, true);
      }
    });
    for (let gy = 0; gy < GRID; gy++) for (let gx = 0; gx < GRID; gx++) {
      const idx = gy * GRID + gx;
      pegs += pegSVG(gx, gy, variant === 'play' && pendingFrom === idx);
    }
    return '<svg class="board-svg" viewBox="0 0 100 100" xmlns="' + SVGNS + '">' + under + over + pegs + '</svg>';
  }

  /* 손그림 아이콘 한 조각 — index.html 의 <symbol> 을 가리킨다(이모지 대신) */
  const ico = (name, cls) => '<svg class="ico' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#gb-' + name + '"/></svg>';

  /* ─────────── 홈: 단계 3개 ─────────── */
  function renderHome() {
    $('home-stars').textContent = P.stars();
    const menu = $('menu');
    menu.innerHTML = '';
    D.LEVELS.forEach(lv => {
      const ids = D.puzzlesOf(lv.id).map(x => x.id);
      const done = P.doneCount(ids);
      const pz = D.puzzlesOf(lv.id)[0];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-card ' + lv.cls;
      // 첫 칸을 가리키는 시작 화살표는 shared/screen.css 가 얹는다 — 앱에서 그리지 않는다
      b.innerHTML =
        '<span class="mc-icon">' + boardSVG(pz, pz.segments.map(() => true), 'thumb') + '</span>' +
        '<span class="mc-name">' + lv.name + '</span>' +
        '<span class="mc-desc">' + lv.desc + '</span>' +
        '<span class="mc-prog">' + (done ? ico('star') + ' ' + done + ' / ' + ids.length : '처음이야!') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openList(lv); });
      menu.appendChild(b);
    });
  }

  /* ─────────── 퍼즐 목록 ─────────── */
  let curLevel = null;
  function openList(lv) {
    curLevel = lv;
    $('list-title').innerHTML = ico('pin') + ' ' + lv.name;
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
        '<span class="pz-thumb">' + boardSVG(pz, pz.segments.map(() => true), 'thumb') + '</span>' +
        '<span class="pz-badge">' + (done ? ico('star') : ico('pin')) + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPlay(pz); });
      box.appendChild(b);
    });
    showScreen('scr-list');
  }

  /* ─────────── 놀이 ─────────── */
  let cur = null; // { pz, matched:[bool...], pendingFrom, locked }
  let selColor = null;

  function openPlay(pz) {
    cur = { pz, matched: new Array(pz.segments.length).fill(false), pendingFrom: null, locked: false };
    selColor = null;
    $('play-title').innerHTML = ico('pin') + ' 똑같이 걸어요';
    $('card-board').innerHTML = boardSVG(pz, pz.segments.map(() => true), 'card');
    renderTray();
    renderBoard();
    showScreen('scr-play');
    setTimeout(() => { if (cur && !cur.locked) A.speak('카드처럼 고무줄을 걸어 볼까?'); }, 300);
  }

  const totalMatched = () => cur.matched.filter(Boolean).length;
  const placedSegments = () => cur.pz.segments.filter((s, i) => cur.matched[i]);
  const remainingSegments = () => cur.pz.segments.filter((s, i) => !cur.matched[i]);

  function renderBoard() {
    $('board').innerHTML = boardSVG(cur.pz, cur.matched, 'play', cur.pendingFrom);
  }

  // 색 고무줄 트레이 5종(소모되지 않음, 여러 번 고를 수 있다)
  function renderTray() {
    const box = $('tray');
    box.innerHTML = '';
    D.COLOR_IDS.forEach(id => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tray-item c-' + id + (selColor === id ? ' sel' : '');
      b.dataset.id = id;
      b.innerHTML = '<span class="ti-band">' + D.bandSwatchSVG(id, 'sw-' + id) + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); trayPick(id); });
      box.appendChild(b);
    });
  }
  function trayPick(id) {
    if (!cur || cur.locked) return;
    selColor = (selColor === id) ? null : id;
    cur.pendingFrom = null;
    A.sfx.tap();
    renderTray();
    renderBoard();
    if (selColor) A.speak(D.COLORS[selColor].say + '! 어느 못이야?');
  }

  /* ─────────── 못 탭 → 걸기 판정 ─────────── */
  function pegTap(idx) {
    if (!cur || cur.locked) return;
    if (!selColor) { A.sfx.tap(); A.speak('색을 먼저 골라 봐!'); return; }
    if (cur.pendingFrom === null) {
      cur.pendingFrom = idx;
      A.sfx.tap();
      renderBoard();
      return;
    }
    if (cur.pendingFrom === idx) { // 같은 못 다시 탭 = 선택 취소
      cur.pendingFrom = null;
      renderBoard();
      return;
    }
    const from = cur.pendingFrom;
    cur.pendingFrom = null;
    attemptPlace(selColor, from, idx);
  }

  function attemptPlace(color, fromIdx, toIdx) {
    if (!cur || cur.locked) return;
    if (fromIdx === toIdx) return;
    const p1 = [fromIdx % GRID, Math.floor(fromIdx / GRID)];
    const p2 = [toIdx % GRID, Math.floor(toIdx / GRID)];
    const idx = cur.pz.segments.findIndex((s, i) => !cur.matched[i] && s.color === color && D.sameSeg(s, p1, p2));
    if (idx >= 0) {
      cur.matched[idx] = true;
      A.sfx.twang();
      selColor = null;
      renderTray();
      renderBoard();
      if (totalMatched() === cur.pz.segments.length) complete();
    } else {
      // 안 맞는 자리 — 무벌점, 아무것도 걸리지 않고 부드럽게 안내
      A.sfx.hmm();
      wobblePegs(fromIdx, toIdx);
      renderBoard();
    }
  }
  function wobblePegs(a, b) {
    [a, b].forEach(i => {
      const g = $('board').querySelector('.peg[data-i="' + i + '"]');
      if (!g) return;
      g.classList.remove('wrong'); void g.getBoundingClientRect();
      g.classList.add('wrong');
    });
  }

  /* ─────────── 완성 ─────────── */
  function complete() {
    cur.locked = true;
    const pz = cur.pz;
    const first = !P.isDone(pz.id);
    P.markDone(pz.id);
    P.addStar(pz.segments.length); // 별 = 세그먼트 수
    if (window.Pet) Pet.awardSnack(1);
    if (first && window.Pet) {
      const ids = D.puzzlesOf(pz.stage).map(x => x.id);
      if (P.doneCount(ids) >= ids.length) Pet.awardMeal(1);
    }
    burstConfetti();
    A.sfx.fanfare();
    const praise = D.praises[Math.floor(Math.random() * D.praises.length)];
    setTimeout(() => A.speak(praise), 250);
    setTimeout(() => showReward(praise), 700);
  }

  /* ─────────── 보상 오버레이 ─────────── */
  function showReward(praise) {
    $('reward-praise').textContent = praise;
    $('reward-board').innerHTML = boardSVG(cur.pz, cur.pz.segments.map(() => true), 'card');
    $('reward').classList.add('on');
  }
  function nextPuzzle() {
    const list = D.puzzlesOf(cur.pz.stage);
    const idx = list.findIndex(x => x.id === cur.pz.id);
    for (let k = 1; k <= list.length; k++) {
      const cand = list[(idx + k) % list.length];
      if (!P.isDone(cand.id)) { openPlay(cand); return; }
    }
    openList(D.levelDef(cur.pz.stage));
  }

  /* ─────────── 색종이 축하 ─────────── */
  function burstConfetti() {
    const box = $('confetti');
    box.innerHTML = '';
    const colors = ['#EF4E4E', '#4DA6E8', '#F4CE2A', '#57BE4E', '#F5952E', '#A77CE0'];
    for (let i = 0; i < 34; i++) {
      const c = document.createElement('i');
      c.className = 'cf';
      c.style.left = (5 + Math.random() * 90) + '%';
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = (Math.random() * 0.3) + 's';
      c.style.animationDuration = (1.1 + Math.random() * 0.9) + 's';
      c.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      c.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
      if (Math.random() < 0.5) c.style.borderRadius = '50%';
      box.appendChild(c);
    }
    setTimeout(() => { box.innerHTML = ''; }, 2400);
  }

  /* ─────────── 초기화 ─────────── */
  function init() {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());

    document.querySelectorAll('[data-go]').forEach(b => {
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); showScreen(b.dataset.go); });
    });
    $('btn-play-back').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); openList(D.levelDef(cur.pz.stage));
    });
    $('btn-listen').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      if (!cur) return;
      const rem = remainingSegments();
      if (!rem.length) { A.speak('다 걸었어요!'); return; }
      A.speak(D.COLORS[rem[0].color].say + '이 아직 남았어!');
    });
    $('reward-next').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on'); nextPuzzle();
    });
    $('reward-close').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on');
      openList(D.levelDef(cur.pz.stage));
    });

    $('board').addEventListener('pointerdown', ev => {
      if (!cur || cur.locked) return;
      const g = ev.target.closest('.peg');
      if (!g) return;
      pegTap(+g.dataset.i);
    });

    renderHome();
  }
  init();

  /* ─────────── 종단 테스트용 ─────────── */
  function solveAll() {
    if (!cur || cur.locked) return;
    cur.pz.segments.forEach((s, i) => {
      if (!cur.matched[i]) {
        const fromIdx = s.from[1] * GRID + s.from[0];
        const toIdx = s.to[1] * GRID + s.to[0];
        attemptPlace(s.color, fromIdx, toIdx);
      }
    });
  }
  function debug() {
    return {
      screen: screenId,
      stars: P.stars(),
      stage: cur ? cur.pz.stage : null,
      puzzleId: cur ? cur.pz.id : null,
      segments: cur ? cur.pz.segments.slice() : null,
      total: cur ? cur.pz.segments.length : null,
      placed: cur ? placedSegments() : null,
      placedCount: cur ? totalMatched() : null,
      colorsCount: cur ? D.colorsOf(cur.pz).length : null,
      locked: cur ? cur.locked : null,
      done: cur ? P.isDone(cur.pz.id) : null,
      bandCount: $('board') ? $('board').querySelectorAll('.band').length : 0,
    };
  }
  return {
    debug,
    _attempt: (color, fromIdx, toIdx) => attemptPlace(color, fromIdx, toIdx),
    _solve: solveAll,
  };
})();
