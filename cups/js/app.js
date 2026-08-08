/* 앱 셸 — 홈(단계 3개) → 퍼즐 목록(단계별 10) → 컵 쌓기 놀이.
 * 왼쪽 본보기 카드(목표 피라미드)를 보고, 오른쪽 빈 피라미드 슬롯을 아래부터 위로 채운다.
 * 트레이의 색 컵을 탭 또는 드래그해 "다음 슬롯"에 놓는다(포인터 이벤트 공용).
 * 색이 맞으면 툭 얹히고, 틀리면 부드럽게 튕기며 "다음은 ○○ 컵이야!" 안내(무벌점).
 * 다 쌓으면 🔔 종소리 + 색종이 + 팡파르 + TTS + 별 + 펫 간식. 진행도는 완성 퍼즐 id로 저장. */
window.App = (() => {
  const D = window.CupsData;
  const A = window.Audio2;
  const P = window.Progress;
  const $ = id => document.getElementById(id);
  /* 화면 틀에 쓰는 손그림 아이콘 (js/icons.js). 컵 색과는 무관한 표시용이다. */
  const ic = (name, cls) => (window.CupsIcons ? CupsIcons.html(name, cls) : '');

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
        '<span class="mc-icon">' + miniPyramid(D.puzzlesOf(lv.id)[0], 'mn' + lv.id) + '</span>' +
        '<span class="mc-name">' + lv.name + '</span>' +
        '<span class="mc-desc">' + lv.desc + '</span>' +
        '<span class="mc-prog">' + (done ? '<span class="ic">' + ic('star') + '</span> ' + done + ' / ' + ids.length : '처음이야!') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPuzzles(lv); });
      menu.appendChild(b);
    });
  }

  // 작은 피라미드 미리보기 (홈·목록) — 목표 색을 그대로 그린다
  function miniPyramid(pz, tag, cls) {
    const rows = pz.rows;
    let html = '<span class="mini-pyr ' + (cls || '') + '">';
    for (let r = rows.length - 1; r >= 0; r--) {
      html += '<span class="mini-row">';
      rows[r].forEach((col, c) => {
        html += '<span class="mini-cup">' + D.cupSVG(col, tag + pz.id + r + '_' + c) + '</span>';
      });
      html += '</span>';
    }
    return html + '</span>';
  }

  /* ─────────── 퍼즐 목록 ─────────── */
  let curLevel = null;
  function openPuzzles(lv) {
    curLevel = lv;
    $('puzzles-title').innerHTML = '<span class="ic">' + ic('cup') + '</span>' + lv.name;
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
        '<span class="pz-no">' + (i + 1) + '</span>' +
        miniPyramid(pz, 'pc', 'big') +
        '<span class="pz-badge">' + ic(done ? 'star' : 'cup') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPlay(pz); });
      box.appendChild(b);
    });
    showScreen('scr-puzzles');
  }

  /* ─────────── 쌓기 놀이 ─────────── */
  let cur = null; // { pz, flat:[], placed:[], slotEls:[], locked:bool }

  function openPlay(pz) {
    cur = { pz, flat: D.flat(pz), placed: [], slotEls: [], locked: false };
    $('play-title').innerHTML = '<span class="ic">' + ic('cup') + '</span>' + D.levelDef(pz.level).name;
    renderSample();
    renderTray();
    buildPyramid();
    showScreen('scr-play');
    setTimeout(() => { if (cur && !cur.locked) A.speak('카드처럼 컵을 쌓아 볼까?'); }, 300);
  }

  const nextColor = () => cur.flat[cur.placed.length]; // 다음에 놓아야 할 색

  // 본보기 카드: 목표 피라미드를 크게 (글씨 없이 색만)
  function renderSample() {
    $('sample-pyr').innerHTML = miniPyramid(cur.pz, 'sm', 'card');
  }

  // 트레이: 항상 6색 팔레트(정답 색 + 방해 색). 컵은 팔레트라 없어지지 않는다.
  function renderTray() {
    const box = $('tray');
    box.innerHTML = '';
    D.ORDER.forEach(k => box.appendChild(makeTrayItem(k)));
  }
  function makeTrayItem(colorKey) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tray-item';
    b.dataset.color = colorKey;
    b.innerHTML = '<span class="ti-cup">' + D.cupSVG(colorKey, 'ti' + colorKey) + '</span>';
    b.addEventListener('pointerdown', ev => trayDown(ev, b));
    return b;
  }

  // 빈 피라미드 슬롯을 아래→위로 짓는다. slotEls[globalIndex] 로 참조 보관.
  function belowLen(rows, r) { let n = 0; for (let i = 0; i < r; i++) n += rows[i].length; return n; }
  function buildPyramid() {
    const rows = cur.pz.rows;
    const stack = $('pyr-play');
    stack.innerHTML = '';
    cur.slotEls = [];
    for (let r = rows.length - 1; r >= 0; r--) { // DOM 은 위줄 먼저(꼭대기가 맨 위)
      const rowEl = document.createElement('div');
      rowEl.className = 'pyr-row';
      const below = belowLen(rows, r);
      rows[r].forEach((col, c) => {
        const gi = below + c;
        const cell = document.createElement('div');
        cell.className = 'pyr-cell';
        cell.innerHTML = D.slotSVG();
        cur.slotEls[gi] = cell;
        rowEl.appendChild(cell);
      });
      stack.appendChild(rowEl);
    }
    highlightNext();
  }
  function highlightNext() {
    const n = cur.placed.length;
    cur.slotEls.forEach((el, i) => el.classList.toggle('next', i === n));
  }

  /* ─────────── 놓기 판정 ─────────── */
  function attemptPlace(color, itemEl) {
    if (!cur || cur.locked) return;
    if (color === nextColor()) {
      fillSlot(cur.placed.length, color);
      cur.placed.push(color);
      A.sfx.pop();
      highlightNext();
      if (cur.placed.length === cur.flat.length) complete();
    } else {
      // 틀린 색 — 무벌점, 부드럽게 튕기고 안내
      if (itemEl) wiggle(itemEl);
      A.sfx.tap();
      const need = D.meta(nextColor());
      A.speak('다음은 ' + need.say + ' 컵이야!');
    }
  }
  function fillSlot(gi, color) {
    const el = cur.slotEls[gi];
    el.classList.remove('next');
    el.classList.add('full');
    el.innerHTML = D.cupSVG(color, 'pg' + cur.pz.id + gi);
    el.classList.add('drop');
  }

  /* ─────────── 완성 ─────────── */
  function complete() {
    cur.locked = true;
    const pz = cur.pz;
    const first = !P.isDone(pz.id);
    P.markDone(pz.id);
    P.addStar(D.cupCount(pz));
    if (window.Pet) Pet.awardSnack(1);
    // 단계를 처음으로 다 모으면 펫 식사 보상
    if (first && window.Pet) {
      const ids = D.puzzlesOf(pz.level).map(x => x.id);
      if (P.doneCount(ids) >= ids.length) Pet.awardMeal(1);
    }
    burstConfetti();
    A.sfx.bell();
    A.sfx.fanfare();
    const praise = D.praises[Math.floor(Math.random() * D.praises.length)];
    setTimeout(() => A.speak(praise), 300);
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
    openPuzzles(D.levelDef(cur.pz.level));
  }

  /* ─────────── 드래그(포인터) ─────────── */
  let drag = null; // { color, el, sx, sy, moving }
  function trayDown(ev, item) {
    if (!cur || cur.locked) return;
    drag = { color: item.dataset.color, el: item, sx: ev.clientX, sy: ev.clientY, moving: false };
  }
  function onMove(ev) {
    if (!drag) return;
    const dx = ev.clientX - drag.sx, dy = ev.clientY - drag.sy;
    if (!drag.moving && Math.hypot(dx, dy) > 10) {
      drag.moving = true;
      drag.el.classList.add('lift');
      const g = $('drag-ghost');
      g.innerHTML = D.cupSVG(drag.color, 'gh' + drag.color);
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
    const overPeg = pointOverPeg(ev.clientX, ev.clientY);
    if (!d.moving || overPeg) attemptPlace(d.color, d.el);
  }
  function pointOverPeg(x, y) {
    const r = $('pyr-play').getBoundingClientRect();
    const pad = 36;
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  }

  /* ─────────── 색종이 축하 ─────────── */
  function burstConfetti() {
    const box = $('confetti');
    box.innerHTML = '';
    const colors = ['#E23B2E', '#F2892A', '#F4BE12', '#4CA832', '#2E86D6', '#8A4FC0', '#FF8FB0'];
    for (let i = 0; i < 36; i++) {
      const q = document.createElement('i');
      q.className = 'cf';
      q.style.left = (5 + Math.random() * 90) + '%';
      q.style.background = colors[i % colors.length];
      q.style.animationDelay = (Math.random() * 0.3) + 's';
      q.style.animationDuration = (1.1 + Math.random() * 0.9) + 's';
      q.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      q.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
      if (Math.random() < 0.5) q.style.borderRadius = '50%';
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
      ev.preventDefault(); A.sfx.tap(); openPuzzles(D.levelDef(cur.pz.level));
    });
    $('btn-listen').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      if (!cur) return;
      if (cur.placed.length >= cur.flat.length) A.speak('다 쌓았어요!');
      else A.speak('다음은 ' + D.meta(nextColor()).say + ' 컵이야!');
    });
    $('reward-next').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on'); nextPuzzle();
    });
    $('reward-close').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on');
      openPuzzles(D.levelDef(cur.pz.level));
    });

    // 드래그는 창 전체에서 듣는다 (손가락·펜·마우스 공통)
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
      flat: cur ? cur.flat.slice() : null,
      placed: cur ? cur.placed.slice() : null,
      nextColor: cur && !cur.locked && cur.placed.length < cur.flat.length ? cur.flat[cur.placed.length] : null,
      cupCount: cur ? cur.flat.length : null,
      filled: cur ? cur.placed.length : null,
      locked: cur ? cur.locked : null,
      done: cur ? P.isDone(cur.pz.id) : null,
    };
  }
  return {
    debug,
    _attempt: (color) => attemptPlace(color, document.querySelector('.tray-item[data-color="' + color + '"]')),
  };
})();
