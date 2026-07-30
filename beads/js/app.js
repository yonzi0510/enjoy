/* 앱 셸 — 홈(단계 3개) → 퍼즐 목록(단계별 10) → 구슬 놀이.
 * 왼쪽 본보기 카드의 색·위치를 보고, 오른쪽 빈 격자 구멍에 팔레트 색 구슬을 똑같이 채운다.
 * 색을 고르고(팔레트) 구멍을 탭하면 그 색 구슬이 쏙 박힌다(탭·드래그, 포인터 이벤트 공용).
 * 맞는 색이면 반짝 박히고, 틀린 색이면 부드럽게 튕기며 안내(무벌점).
 * 카드와 똑같이 다 채우면 색종이 축하 + TTS + 별 + 펫 간식. 진행도는 완성한 퍼즐 id로 저장한다. */
window.App = (() => {
  const D = window.BeadsData;
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

  /* 격자 한 판 그리기 — cells 가 있으면 그 색 구슬을(카드·미리보기), 없으면 빈 구멍을(보드) */
  function buildGrid(size, cells, cls) {
    const g = document.createElement('div');
    g.className = 'bead-grid ' + (cls || '');
    g.style.setProperty('--n', size);
    for (let i = 0; i < size * size; i++) {
      const cell = document.createElement('div');
      const col = cells ? cells[i] : null;
      cell.className = 'cell' + (col ? ' filled' : ' empty');
      cell.dataset.i = i;
      if (col) cell.innerHTML = '<span class="bead">' + D.drawBead(col) + '</span>';
      g.appendChild(cell);
    }
    return g;
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
      const sample = D.puzzlesOf(lv.id)[0];
      const prev = buildGrid(sample.size, sample.cells, 'is-mini').outerHTML;
      b.innerHTML =
        '<span class="mc-icon">' + prev + '</span>' +
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
    $('list-title').textContent = '🔵 ' + lv.name;
    const list = D.puzzlesOf(lv.id);
    $('list-count').textContent = P.doneCount(list.map(x => x.id)) + ' / ' + list.length;
    const box = $('list-box');
    box.innerHTML = '';
    list.forEach((pz, i) => {
      const done = P.isDone(pz.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pz-card' + (done ? ' done' : '');
      b.dataset.id = pz.id;
      b.appendChild(mk('span', 'pz-no', String(i + 1)));
      const prev = buildGrid(pz.size, pz.cells, 'is-mini big');
      b.appendChild(prev);
      b.appendChild(mk('span', 'pz-badge', done ? '⭐' : '🔵'));
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPlay(pz); });
      box.appendChild(b);
    });
    showScreen('scr-list');
  }
  function mk(tag, cls, txt) { const e = document.createElement(tag); e.className = cls; if (txt != null) e.textContent = txt; return e; }

  /* ─────────── 구슬 놀이 ─────────── */
  let cur = null; // { pz, board:[], selected, locked }

  function openPlay(pz) {
    const firstColor = D.colorsIn(pz)[0] || D.COLOR_IDS[0];
    cur = { pz, board: new Array(pz.size * pz.size).fill(null), selected: firstColor, locked: false };
    $('play-title').textContent = '🔵 ' + D.levelDef(pz.level).name;
    renderSample();
    renderBoard();
    renderPalette();
    showScreen('scr-play');
    setTimeout(() => { if (cur && !cur.locked) A.speak('카드를 보고 똑같이 색 구슬을 채워 볼까?'); }, 300);
  }

  // 본보기 카드 — 색·위치를 크게. 글씨 없이 그림만
  function renderSample() {
    const box = $('sample-holder');
    box.innerHTML = '';
    box.appendChild(buildGrid(cur.pz.size, cur.pz.cells, 'is-card'));
  }

  // 오른쪽 빈 보드 — 구멍을 탭하면 고른 색이 박힌다
  let boardEl = null;
  function renderBoard() {
    const box = $('board-holder');
    box.innerHTML = '';
    boardEl = buildGrid(cur.pz.size, null, 'is-board');
    boardEl.querySelectorAll('.cell').forEach(cell => {
      cell.addEventListener('click', ev => { ev.preventDefault(); tapCell(+cell.dataset.i); });
    });
    box.appendChild(boardEl);
    refreshHints();
  }

  // 색 팔레트 6종 — 탭하면 고르고, 드래그해서 구멍에 떨어뜨릴 수도 있다
  function renderPalette() {
    const box = $('palette');
    box.innerHTML = '';
    D.COLOR_IDS.forEach(cid => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pal-bead' + (cid === cur.selected ? ' sel' : '');
      b.dataset.color = cid;
      b.innerHTML = '<span class="bead">' + D.drawBead(cid) + '</span>';
      b.addEventListener('pointerdown', ev => palDown(ev, b));
      box.appendChild(b);
    });
  }

  function selectColor(cid) {
    if (!cur) return;
    cur.selected = cid;
    $('palette').querySelectorAll('.pal-bead').forEach(b => b.classList.toggle('sel', b.dataset.color === cid));
    refreshHints();
  }

  // 고른 색이 들어갈 빈 구멍을 은은히 강조 (다음 채울 칸 안내 — 강요 아님)
  function refreshHints() {
    if (!boardEl || !cur) return;
    const t = cur.pz.cells;
    boardEl.querySelectorAll('.cell').forEach(cell => {
      const i = +cell.dataset.i;
      const hint = !cur.board[i] && t[i] === cur.selected;
      cell.classList.toggle('hint', hint);
    });
  }

  /* ─────────── 놓기 판정 ─────────── */
  function tapCell(i) {
    if (!cur || cur.locked) return;
    if (cur.board[i]) return;            // 이미 채워진 구멍
    const target = cur.pz.cells[i];
    const cell = boardEl.querySelector('.cell[data-i="' + i + '"]');
    if (target === cur.selected) {
      placeBead(i, cur.selected, cell);
      A.sfx.plink();
      if (filledCount() === D.beadCount(cur.pz)) complete();
    } else {
      // 틀린 색(또는 비워둘 칸) — 무벌점, 부드럽게 튕기고 가끔 안내
      A.sfx.nope();
      if (cell) wiggle(cell);
      maybeHint(i, target);
    }
  }

  function placeBead(i, color, cell) {
    cur.board[i] = color;
    if (cell) {
      cell.classList.remove('empty', 'hint');
      cell.classList.add('filled', 'pop');
      cell.innerHTML = '<span class="bead">' + D.drawBead(color) + '</span>';
    }
    refreshHints();
  }

  const filledCount = () => cur.board.reduce((n, c) => n + (c ? 1 : 0), 0);

  let hintAt = 0;
  function maybeHint(i, target) {
    const now = Date.now();
    if (now - hintAt < 1400) return;     // 너무 자주 말하지 않기
    hintAt = now;
    if (target) A.speak('여기는 ' + D.COLORS[target].say + ' 구슬이야!');
    else A.speak('여기는 비워 두자!');
  }

  /* ─────────── 완성 ─────────── */
  function complete() {
    cur.locked = true;
    const pz = cur.pz;
    const first = !P.isDone(pz.id);
    P.markDone(pz.id);
    P.addStar(D.beadCount(pz));
    if (window.Pet) Pet.awardSnack(1);
    // 단계를 처음으로 다 모으면 펫 식사 보상
    if (first && window.Pet) {
      const ids = D.puzzlesOf(pz.level).map(x => x.id);
      if (P.doneCount(ids) >= ids.length) Pet.awardMeal(1);
    }
    if (boardEl) boardEl.classList.add('done');
    burstConfetti();
    A.sfx.fanfare();
    const praise = D.praises[Math.floor(Math.random() * D.praises.length)];
    setTimeout(() => A.speak(praise), 250);
    setTimeout(() => showReward(praise), 700);
  }

  /* ─────────── 보상 오버레이 ─────────── */
  function showReward(praise) {
    $('reward-praise').textContent = praise;
    $('reward').classList.add('on');
  }
  function nextPuzzle() {
    const list = D.puzzlesOf(cur.pz.level);
    const idx = list.findIndex(x => x.id === cur.pz.id);
    for (let k = 1; k <= list.length; k++) {
      const cand = list[(idx + k) % list.length];
      if (!P.isDone(cand.id)) { openPlay(cand); return; }
    }
    openList(D.levelDef(cur.pz.level));
  }

  /* ─────────── 드래그(포인터) — 팔레트 색을 구멍으로 ─────────── */
  let drag = null; // { color, el, sx, sy, moving }
  function palDown(ev, item) {
    if (!cur || cur.locked) return;
    selectColor(item.dataset.color);     // 탭만 해도 색이 골라진다
    drag = { color: item.dataset.color, el: item, sx: ev.clientX, sy: ev.clientY, moving: false };
  }
  function onMove(ev) {
    if (!drag) return;
    const dx = ev.clientX - drag.sx, dy = ev.clientY - drag.sy;
    if (!drag.moving && Math.hypot(dx, dy) > 10) {
      drag.moving = true;
      drag.el.classList.add('lift');
      const g = $('drag-ghost');
      g.innerHTML = '<span class="bead">' + D.drawBead(drag.color) + '</span>';
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
    if (!d.moving) return;               // 제자리 탭은 이미 선택으로 처리됨
    const cell = cellAtPoint(ev.clientX, ev.clientY);
    if (cell) tapCell(+cell.dataset.i);
  }
  function cellAtPoint(x, y) {
    if (!boardEl) return null;
    const el = document.elementFromPoint(x, y);
    return el ? el.closest('.is-board .cell') : null;
  }

  /* ─────────── 색종이 축하 ─────────── */
  function burstConfetti() {
    const box = $('confetti');
    box.innerHTML = '';
    const colors = ['#E24B3B', '#F2872E', '#FDCB35', '#5CB85C', '#4FA3E8', '#A86BD8'];
    for (let i = 0; i < 34; i++) {
      const q = document.createElement('i');
      q.className = 'cf';
      q.style.left = (5 + Math.random() * 90) + '%';
      q.style.background = colors[i % colors.length];
      q.style.animationDelay = (Math.random() * 0.3) + 's';
      q.style.animationDuration = (1.1 + Math.random() * 0.9) + 's';
      q.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      q.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
      q.style.borderRadius = '50%';     // 동그란 구슬 색종이
      box.appendChild(q);
    }
    setTimeout(() => { box.innerHTML = ''; }, 2400);
  }

  /* ─────────── 잔심부름 ─────────── */
  function wiggle(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

  /* ─────────── 초기화 ─────────── */
  function init() {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());

    document.querySelectorAll('[data-go]').forEach(b => {
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); showScreen(b.dataset.go); });
    });
    $('btn-play-back').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); openList(D.levelDef(cur.pz.level));
    });
    $('btn-listen').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      if (!cur) return;
      if (cur.locked) { A.speak('다 만들었어요!'); return; }
      A.speak(D.COLORS[cur.selected].say + ' 구슬을 카드처럼 놓아 볼까?');
    });
    $('reward-next').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on'); nextPuzzle();
    });
    $('reward-close').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on');
      openList(D.levelDef(cur.pz.level));
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
      size: cur ? cur.pz.size : null,
      target: cur ? cur.pz.cells.slice() : null,
      board: cur ? cur.board.slice() : null,
      beadCount: cur ? D.beadCount(cur.pz) : null,
      filled: cur ? filledCount() : null,
      selected: cur ? cur.selected : null,
      locked: cur ? cur.locked : null,
      done: cur ? P.isDone(cur.pz.id) : null,
    };
  }
  // 색을 고르고 그 구멍을 놓아 본다 (탭 시뮬레이션)
  function _place(i, color) { if (color) selectColor(color); tapCell(i); }
  // 카드대로 전부 채운다
  function _solve() {
    if (!cur) return;
    cur.pz.cells.forEach((c, i) => { if (c && !cur.board[i]) _place(i, c); });
  }
  return { debug, _place, _solve };
})();
