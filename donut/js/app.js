/* 앱 셸 — 홈(단계 3개) → 퍼즐 목록(단계별 10) → 짝맞추기 놀이.
 * 자리판의 각 칸에는 목표 도넛의 연한 그림자(윤곽)가 보인다. 트레이의 도넛을
 * 탭(고르고→자리 탭) 또는 드래그해서 같은 무늬 칸에 놓는다(포인터 이벤트 공용).
 * 맞으면 툭 얹히고, 틀리면 부드럽게 튕기며 안내(무벌점). 다 채우면 색종이 축하 +
 * TTS + 별 + 펫 간식. 진행도는 완성한 퍼즐 id 로 저장한다. */
window.App = (() => {
  const D = window.DonutData;
  const A = window.Audio2;
  const P = window.Progress;
  const $ = id => document.getElementById(id);
  // 화면 틀의 손그림 아이콘 (js/icons.js). 도넛 무늬는 여기서 만들지 않는다 — D.meta().draw 그대로.
  const ico = (name) => (window.DonutIcons ? DonutIcons.html(name) : '');

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
        '<span class="mc-icon">' + miniBoard(lv.id) + '</span>' +
        '<span class="mc-name">' + lv.name + '</span>' +
        '<span class="mc-desc">' + lv.desc + '</span>' +
        '<span class="mc-prog">' + (done ? '<span class="ic">' + ico('star') + '</span> ' + done + ' / ' + ids.length : '처음이야!') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openList(lv); });
      menu.appendChild(b);
    });
  }

  // 단계 아이콘용 작은 도넛판 미리보기 (대표 퍼즐의 도넛들)
  function miniBoard(level) {
    const lv = D.levelDef(level);
    const sample = D.puzzlesOf(level)[0];
    return '<span class="mini-board" style="--cols:' + lv.cols + '">' +
      sample.slots.map(id => '<span class="mini-donut">' + D.meta(id).draw(D.nextUid()) + '</span>').join('') +
      '</span>';
  }

  /* ─────────── 퍼즐 목록 ─────────── */
  let curLevel = null;
  function openList(lv) {
    curLevel = lv;
    $('list-title').innerHTML = '<span class="ic">' + ico('donut') + '</span>' + lv.name;
    const list = D.puzzlesOf(lv.id);
    $('list-count').textContent = P.doneCount(list.map(x => x.id)) + ' / ' + list.length;
    const box = $('puzzle-list');
    box.innerHTML = '';
    // 아직 안 한 것 중 첫 번째 하나만 크게 그린다 — 어디부터 누를지 글자 없이 알려 준다
    const nextIdx = list.findIndex(x => !P.isDone(x.id));
    list.forEach((pz, i) => {
      const done = P.isDone(pz.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'puzzle-card' + (done ? ' done' : '') + (i === nextIdx ? ' next' : '');
      b.dataset.id = pz.id;
      b.innerHTML =
        '<span class="pz-no">' + (i + 1) + '</span>' +
        '<span class="mini-board" style="--cols:' + lv.cols + '">' +
          pz.slots.map(id => '<span class="mini-donut">' + D.meta(id).draw(D.nextUid()) + '</span>').join('') +
        '</span>' +
        '<span class="pz-badge">' + ico(done ? 'star' : 'donut') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPlay(pz); });
      box.appendChild(b);
    });
    showScreen('scr-list');
  }

  /* ─────────── 짝맞추기 놀이 ─────────── */
  // cur = { pz, lv, slots:[{target, placed}], trayIds:[], selected, locked }
  let cur = null;

  function openPlay(pz) {
    const lv = D.levelDef(pz.level);
    cur = {
      pz, lv,
      slots: pz.slots.map(t => ({ target: t, placed: false })),
      trayIds: shuffle(D.trayOf(pz)),
      selected: null,
      locked: false,
    };
    $('play-title').innerHTML = '<span class="ic">' + ico('donut') + '</span>' + lv.name;
    renderBoard();
    renderTray();
    showScreen('scr-play');
    setTimeout(() => { if (cur && !cur.locked) A.speak('같은 도넛을 찾아 자리에 놓아 볼까?'); }, 300);
  }

  // 자리판 — 각 칸에 목표 도넛의 연한 그림자 + 채워지면 진짜 도넛
  function renderBoard() {
    const board = $('board');
    board.style.setProperty('--cols', cur.lv.cols);
    board.innerHTML = '';
    cur.slots.forEach((s, i) => {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'slot' + (s.placed ? ' filled' : '');
      cell.dataset.i = i;
      cell.innerHTML =
        '<span class="slot-ghost">' + D.meta(s.target).draw(D.nextUid()) + '</span>' +
        '<span class="slot-fill">' + (s.placed ? D.meta(s.target).draw(D.nextUid()) : '') + '</span>';
      cell.addEventListener('click', ev => { ev.preventDefault(); slotTap(i); });
      board.appendChild(cell);
    });
  }

  function renderTray() {
    const box = $('tray');
    box.innerHTML = '';
    cur.trayIds.forEach((id, i) => box.appendChild(makeTrayItem(id, i)));
  }

  function makeTrayItem(id, i) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tray-item';
    b.dataset.id = id;
    b.dataset.slot = i;              // 트레이 안 위치(같은 퍼즐엔 도넛이 중복 없어 id 로 충분하지만 안전하게)
    b.innerHTML = '<span class="ti-donut">' + D.meta(id).draw(D.nextUid()) + '</span>';
    b.addEventListener('pointerdown', ev => trayDown(ev, b));
    return b;
  }

  // 트레이에서 아직 안 놓은 도넛을 찾는다 (도넛이 퍼즐 안에서 유일하므로 id 로 특정)
  function trayItemEl(id) {
    return document.querySelector('.tray-item[data-id="' + id + '"]:not(.used)');
  }

  function setSelected(id) {
    cur.selected = id;
    document.querySelectorAll('.tray-item').forEach(el => el.classList.toggle('sel', el.dataset.id === id && !el.classList.contains('used')));
  }

  /* ─────────── 판정 ─────────── */
  function slotTap(i) {
    if (!cur || cur.locked) return;
    if (cur.slots[i].placed) return;         // 이미 채워진 칸
    if (!cur.selected) {                      // 아무 도넛도 안 골랐으면 안내만
      A.sfx.tap();
      A.speak('먼저 도넛을 하나 골라 볼까?');
      return;
    }
    attemptPlace(cur.selected, i);
  }

  function attemptPlace(id, slotIndex) {
    if (!cur || cur.locked) return;
    const slot = cur.slots[slotIndex];
    if (!slot || slot.placed) return;
    const item = trayItemEl(id);
    if (id === slot.target) {
      // 맞는 도넛 — 자리에 툭
      slot.placed = true;
      const cell = document.querySelector('.slot[data-i="' + slotIndex + '"]');
      if (cell) {
        cell.classList.add('filled');
        cell.querySelector('.slot-fill').innerHTML = D.meta(id).draw(D.nextUid());
        cell.classList.remove('drop'); void cell.offsetWidth; cell.classList.add('drop');
      }
      if (item) { item.classList.add('used'); item.disabled = true; }
      if (cur.selected === id) setSelected(null);
      A.sfx.pop();
      if (cur.slots.every(s => s.placed)) complete();
    } else {
      // 틀린 칸 — 무벌점, 부드럽게 튕기고 안내
      const cell = document.querySelector('.slot[data-i="' + slotIndex + '"]');
      if (cell) wiggle(cell);
      if (item) wiggle(item);
      A.sfx.bad();
      A.speak(D.meta(id).say + ' 자리는 여기가 아니야!');
    }
  }

  /* ─────────── 완성 ─────────── */
  function complete() {
    cur.locked = true;
    const pz = cur.pz;
    const first = !P.isDone(pz.id);
    P.markDone(pz.id);
    P.addStar(cur.slots.length);
    if (window.Pet) Pet.awardSnack(1);
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

  /* ─────────── 드래그(포인터) ─────────── */
  let drag = null; // { id, el, sx, sy, moving }
  function trayDown(ev, item) {
    if (!cur || cur.locked || item.disabled) return;
    setSelected(item.dataset.id);            // 탭이든 드래그든 일단 이 도넛을 고른 상태로
    A.sfx.tap();
    drag = { id: item.dataset.id, el: item, sx: ev.clientX, sy: ev.clientY, moving: false };
  }
  function onMove(ev) {
    if (!drag) return;
    const dx = ev.clientX - drag.sx, dy = ev.clientY - drag.sy;
    if (!drag.moving && Math.hypot(dx, dy) > 10) {
      drag.moving = true;
      drag.el.classList.add('lift');
      const g = $('drag-ghost');
      g.innerHTML = D.meta(drag.id).draw(D.nextUid());
      g.hidden = false;
    }
    if (drag.moving) {
      const g = $('drag-ghost');
      g.style.left = ev.clientX + 'px';
      g.style.top = ev.clientY + 'px';
      highlightSlotUnder(ev.clientX, ev.clientY);
    }
  }
  function onUp(ev) {
    if (!drag) return;
    const d = drag; drag = null;
    d.el.classList.remove('lift');
    $('drag-ghost').hidden = true;
    clearSlotHover();
    if (d.moving) {
      const i = slotIndexUnder(ev.clientX, ev.clientY);
      if (i >= 0) attemptPlace(d.id, i);
    }
    // 움직이지 않았으면(탭) 선택만 유지 — 이어서 자리 칸을 탭하면 놓인다
  }
  function slotIndexUnder(x, y) {
    const cells = document.querySelectorAll('#board .slot');
    for (const c of cells) {
      if (c.classList.contains('filled')) continue;
      const r = c.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return +c.dataset.i;
    }
    return -1;
  }
  function highlightSlotUnder(x, y) {
    const i = slotIndexUnder(x, y);
    document.querySelectorAll('#board .slot').forEach(c => c.classList.toggle('hover', +c.dataset.i === i));
  }
  function clearSlotHover() { document.querySelectorAll('#board .slot.hover').forEach(c => c.classList.remove('hover')); }

  /* ─────────── 색종이 축하 ─────────── */
  function burstConfetti() {
    const box = $('confetti');
    box.innerHTML = '';
    const colors = ['#F48FB1', '#FFD24C', '#7ED9C3', '#8E9BE8', '#B07AD1', '#E7A657'];
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
      ev.preventDefault(); A.sfx.tap(); openList(D.levelDef(cur.pz.level));
    });
    $('btn-listen').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      if (!cur) return;
      if (cur.slots.every(s => s.placed)) { A.speak('도넛을 다 맞췄어요!'); return; }
      const left = cur.slots.filter(s => !s.placed).length;
      A.speak('같은 도넛을 찾아 자리에 놓아요. ' + left + '개 남았어요!');
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
    window.addEventListener('pointercancel', () => { if (drag) { drag.el.classList.remove('lift'); $('drag-ghost').hidden = true; clearSlotHover(); drag = null; } });

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
      slots: cur ? cur.slots.map(s => ({ target: s.target, placed: s.placed })) : null,
      placedCount: cur ? cur.slots.filter(s => s.placed).length : null,
      total: cur ? cur.slots.length : null,
      trayIds: cur ? cur.trayIds.slice() : null,
      selected: cur ? cur.selected : null,
      locked: cur ? cur.locked : null,
      done: cur ? P.isDone(cur.pz.id) : null,
    };
  }
  return {
    debug,
    _attempt: (id, slotIndex) => attemptPlace(id, slotIndex),
    _select: (id) => setSelected(id),
  };
})();
