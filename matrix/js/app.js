/* 앱 셸 — 홈(단계 3개) → 퍼즐 목록(단계별 10) → 놀이(격자 채우기).
 * 격자 맨 윗줄=방향 헤더(화살표), 맨 왼쪽 열=색 헤더(스와치). 각 칸에 "행 색 + 열 방향" 조각을 놓는다.
 * 다음에 채울 칸을 은은히 강조(👉)한다. 맞는 조각이면 툭 들어가고,
 * 틀리면 부드럽게 튕기며 "색은 맞아! 방향을 봐!" 같은 안내(무벌점).
 * 다 채우면 색종이 축하 + TTS + 별 + 펫 간식. 진행도는 완성한 퍼즐 id 로 저장한다. */
window.App = (() => {
  const D = window.MatrixData;
  const A = window.Audio2;
  const P = window.Progress;
  const $ = id => document.getElementById(id);

  /* ─────────── 화면 전환 ─────────── */
  let screenId = 'scr-home';
  function showScreen(id) {
    A.stop();
    screenId = id;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id === 'scr-home') renderHome();
  }

  /* ─────────── 홈: 단계 3개 ─────────── */
  function renderHome() {
    $('home-stars').textContent = P.stars();
    const menu = $('menu');
    menu.innerHTML = '';
    D.LEVELS.forEach(lv => {
      const ids = D.puzzlesOf(lv.id).map(x => x.id);
      const done = P.doneCount(ids);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-card ' + lv.cls;
      b.innerHTML =
        '<span class="mc-icon">' + miniGrid(lv.id) + '</span>' +
        '<span class="mc-name">' + lv.name + '</span>' +
        '<span class="mc-desc">' + lv.desc + '</span>' +
        '<span class="mc-prog">' + (done ? '⭐ ' + done + ' / ' + ids.length : '처음이야!') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPuzzles(lv); });
      menu.appendChild(b);
    });
  }

  // 단계 아이콘용 작은 격자 미리보기(대표 퍼즐로 완성 모습)
  function miniGrid(level) {
    const pz = D.puzzlesOf(level)[0];
    return gridPreview(pz, 'mn' + level);
  }
  // 완성된 격자를 조각으로 채워 보여준다(비상호작용)
  function gridPreview(pz, tag) {
    const rows = D.rowsOf(pz), cols = D.colsOf(pz);
    let cells = '';
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        cells += '<span class="pv-cell">' + D.piece(D.cellPiece(pz, r, c)).draw(tag + r + c) + '</span>';
    return '<span class="mini-grid n' + pz.colors.length + '">' + cells + '</span>';
  }

  /* ─────────── 퍼즐 목록 ─────────── */
  let curLevel = null;
  function openPuzzles(lv) {
    curLevel = lv;
    $('puzzles-title').textContent = lv.icon + ' ' + lv.name;
    const list = D.puzzlesOf(lv.id);
    $('puzzles-count').textContent = P.doneCount(list.map(x => x.id)) + ' / ' + list.length;
    const box = $('puzzles-list');
    box.innerHTML = '';
    list.forEach((pz, i) => {
      const done = P.isDone(pz.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'puzzle-card' + (done ? ' done' : '');
      b.dataset.id = pz.id;
      b.innerHTML =
        '<span class="ps-no">' + (i + 1) + '</span>' +
        gridPreview(pz, 'pc' + pz.id) +
        '<span class="ps-badge">' + (done ? '⭐' : '🧩') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPlay(pz); });
      box.appendChild(b);
    });
    showScreen('scr-puzzles');
  }

  /* ─────────── 놀이(격자 채우기) ─────────── */
  let cur = null; // { pz, cells:[정답 id], placed:[놓은 id], locked }

  function openPlay(pz) {
    cur = { pz, cells: D.answerPieces(pz), placed: [], locked: false };
    $('play-title').textContent = D.levelDef(pz.level).icon + ' ' + D.levelDef(pz.level).name;
    renderBoard();
    renderTray();
    showScreen('scr-play');
    setTimeout(() => { if (cur && !cur.locked) A.speak('색이랑 방향을 보고 칸을 채워 볼까?'); }, 300);
  }

  // 다음에 채울 칸(정답 조각 id) — 행 우선 순서
  const nextIndex = () => cur.placed.length;
  const nextId = () => cur.cells[nextIndex()];

  /* 격자: 코너 + 방향 헤더(위) + 색 헤더(왼쪽) + 칸 */
  function renderBoard() {
    const pz = cur.pz;
    const rows = D.rowsOf(pz), cols = D.colsOf(pz);
    const board = $('board');
    board.className = 'board n' + pz.colors.length;
    board.style.gridTemplateColumns = 'var(--head) repeat(' + cols + ', var(--cell))';
    board.style.gridTemplateRows = 'var(--head) repeat(' + rows + ', var(--cell))';
    let html = '<span class="bd-corner">🧭</span>';
    // 방향 헤더(맨 윗줄)
    pz.dirs.forEach((dId, c) => {
      html += '<span class="bd-head bd-dir">' + D.drawArrow('hd' + c, D.dirDef(dId)) + '</span>';
    });
    // 각 행: 색 헤더 + 칸들
    for (let r = 0; r < rows; r++) {
      html += '<span class="bd-head bd-color">' + D.drawSwatch('hc' + r, D.colorDef(pz.colors[r])) + '</span>';
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        html += '<span class="bd-cell" data-idx="' + idx + '"></span>';
      }
    }
    board.innerHTML = html;
    paintCells();
  }

  // 채운 칸/다음 칸 표시 갱신
  function paintCells() {
    const next = nextIndex();
    $('board').querySelectorAll('.bd-cell').forEach(cell => {
      const idx = +cell.dataset.idx;
      cell.classList.toggle('next', idx === next && !cur.locked);
      if (idx < cur.placed.length && !cell.classList.contains('filled')) {
        cell.classList.add('filled');
        cell.innerHTML = D.piece(cur.placed[idx]).draw('cell' + idx);
        cell.firstElementChild && cell.firstElementChild.classList.add('drop');
      }
    });
  }

  // 트레이: 정답 조각(중복 없음) + 방해 조각(단계별 여유) 섞어서
  let trayIds = [];
  function renderTray() {
    const answer = cur.cells.slice();
    const used = new Set(answer);
    const distract = D.PIECE_IDS.filter(id => !used.has(id));
    shuffle(distract);
    const extra = distract.slice(0, D.levelDef(cur.pz.level).extra || 0);
    trayIds = shuffle(answer.concat(extra));
    const box = $('tray');
    box.innerHTML = '';
    trayIds.forEach(id => box.appendChild(makeTrayItem(id)));
  }

  function makeTrayItem(id) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tray-item';
    b.dataset.id = id;
    b.innerHTML = '<span class="ti-piece">' + D.piece(id).draw('ti' + id) + '</span>';
    b.setAttribute('aria-label', D.piece(id).name);
    b.addEventListener('pointerdown', ev => trayDown(ev, b));
    return b;
  }

  /* ─────────── 놓기 판정 ─────────── */
  function attemptPlace(id, itemEl) {
    if (!cur || cur.locked) return;
    if (id === nextId()) {
      cur.placed.push(id);
      if (itemEl) { itemEl.classList.add('used'); itemEl.disabled = true; }
      A.sfx.pop();
      paintCells();
      if (cur.placed.length === cur.cells.length) complete();
    } else {
      // 틀린 조각 — 무벌점, 부드럽게 튕기고 안내
      if (itemEl) wiggle(itemEl);
      A.sfx.tap();
      A.speak(hintFor(id));
    }
  }

  // 틀렸을 때 색·방향 중 무엇을 봐야 하는지 힌트
  function hintFor(id) {
    const need = D.piece(nextId());
    const got = D.piece(id);
    if (got.color === need.color) return D.colorDef(need.color).say + '은 맞아! 방향을 잘 봐!';
    if (got.dir === need.dir) return D.dirDef(need.dir).say + '은 맞아! 색을 잘 봐!';
    return '이번엔 ' + need.say + ' 조각이야!';
  }

  /* ─────────── 완성 ─────────── */
  function complete() {
    cur.locked = true;
    paintCells();
    const pz = cur.pz;
    const first = !P.isDone(pz.id);
    P.markDone(pz.id);
    P.addStar(cur.cells.length);
    if (window.Pet) Pet.awardSnack(1);
    // 단계를 처음으로 다 모으면 펫 식사 보상
    if (first && window.Pet) {
      const ids = D.puzzlesOf(pz.level).map(x => x.id);
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
    $('reward-grid').innerHTML = gridPreview(cur.pz, 'rw');
    $('reward').classList.add('on');
  }
  function nextPuzzle() {
    const list = D.puzzlesOf(cur.pz.level);
    const idx = list.findIndex(x => x.id === cur.pz.id);
    for (let k = 1; k <= list.length; k++) {
      const cand = list[(idx + k) % list.length];
      if (!P.isDone(cand.id)) { openPlay(cand); return; }
    }
    openPuzzles(D.levelDef(cur.pz.level));
  }

  /* ─────────── 드래그(포인터) ─────────── */
  let drag = null; // { id, el, sx, sy, moving }
  function trayDown(ev, item) {
    if (!cur || cur.locked || item.disabled) return;
    drag = { id: item.dataset.id, el: item, sx: ev.clientX, sy: ev.clientY, moving: false };
  }
  function onMove(ev) {
    if (!drag) return;
    const dx = ev.clientX - drag.sx, dy = ev.clientY - drag.sy;
    if (!drag.moving && Math.hypot(dx, dy) > 10) {
      drag.moving = true;
      drag.el.classList.add('lift');
      const g = $('drag-ghost');
      g.innerHTML = D.piece(drag.id).draw('gh' + drag.id);
      g.hidden = false;
    }
    if (drag.moving) {
      const g = $('drag-ghost');
      g.style.left = ev.clientX + 'px';
      g.style.top = ev.clientY + 'px';
    }
  }
  function onUp(ev) {
    if (!drag) return;
    const d = drag; drag = null;
    d.el.classList.remove('lift');
    $('drag-ghost').hidden = true;
    const overBoard = pointOverBoard(ev.clientX, ev.clientY);
    if (!d.moving || overBoard) attemptPlace(d.id, d.el);
  }
  function pointOverBoard(x, y) {
    const r = $('board').getBoundingClientRect();
    const pad = 24;
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  }

  /* ─────────── 색종이 축하 ─────────── */
  function burstConfetti() {
    const box = $('confetti');
    box.innerHTML = '';
    const colors = ['#EE5140', '#FFCE44', '#4FAAE8', '#68C566', '#B57CE0', '#FF8FB0'];
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

  /* ─────────── 잔심부름 ─────────── */
  function wiggle(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  /* ─────────── 초기화 ─────────── */
  function init() {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());

    document.querySelectorAll('[data-go]').forEach(b => {
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); showScreen(b.dataset.go); });
    });
    $('btn-play-back').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); openPuzzles(D.levelDef(cur.pz.level));
    });
    $('btn-listen').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      if (!cur) return;
      if (cur.placed.length >= cur.cells.length) A.speak('격자를 다 채웠어요!');
      else A.speak('이번엔 ' + D.piece(nextId()).say + ' 조각을 놓아 봐!');
    });
    $('reward-next').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on'); nextPuzzle();
    });
    $('reward-close').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on');
      openPuzzles(D.levelDef(cur.pz.level));
    });

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', () => { if (drag) { drag.el.classList.remove('lift'); $('drag-ghost').hidden = true; drag = null; } });

    renderHome();
  }
  init();

  /* ─────────── 종단 테스트용 ─────────── */
  function debug() {
    return {
      screen: screenId,
      stars: P.stars(),
      level: cur ? cur.pz.level : null,
      puzzleId: cur ? cur.pz.id : null,
      rows: cur ? D.rowsOf(cur.pz) : null,
      cols: cur ? D.colsOf(cur.pz) : null,
      total: cur ? cur.cells.length : null,
      cells: cur ? cur.cells.slice() : null,
      placed: cur ? cur.placed.slice() : null,
      nextId: cur && !cur.locked && cur.placed.length < cur.cells.length ? cur.cells[cur.placed.length] : null,
      trayIds: trayIds.slice(),
      locked: cur ? cur.locked : null,
      done: cur ? P.isDone(cur.pz.id) : null,
      filledCount: $('board').querySelectorAll('.bd-cell.filled').length,
    };
  }
  return { debug, _attempt: (id) => attemptPlace(id, document.querySelector('.tray-item[data-id="' + id + '"]:not(.used)')) };
})();
