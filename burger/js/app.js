/* 앱 셸 — 홈(단계 3개) → 미션 목록(단계별 10) → 쌓기 놀이.
 * 미션 카드에 적힌 순서대로 트레이의 재료를 꼬치에 올린다(탭 또는 드래그, 포인터 이벤트 공용).
 * 맞는 다음 재료면 툭 얹히고, 틀리면 부드럽게 튕기며 "다음은 ○○야!" 안내(무벌점).
 * 다 쌓으면 색종이 축하 + TTS + 별 + 펫 간식. 진행도는 완성한 미션 id로 저장한다. */
window.App = (() => {
  const D = window.BurgerData;
  const A = window.Audio2;
  const P = window.Progress;
  const $ = id => document.getElementById(id);

  const CIRC = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨'];

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
      const ids = D.missionsOf(lv.id).map(x => x.id);
      const done = P.doneCount(ids);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-card ' + lv.cls;
      b.innerHTML =
        '<span class="mc-icon">' + miniBurger(lv.id) + '</span>' +
        '<span class="mc-name">' + lv.name + '</span>' +
        '<span class="mc-desc">' + lv.desc + '</span>' +
        '<span class="mc-prog">' + (done ? '⭐ ' + done + ' / ' + ids.length : '처음이야!') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openMissions(lv); });
      menu.appendChild(b);
    });
  }

  // 단계 아이콘용 작은 햄버거 미리보기 (대표 미션의 층으로)
  function miniBurger(level) {
    const sample = D.missionsOf(level)[0];
    return '<span class="mini-burger">' +
      sample.layers.slice().reverse().map(id =>
        '<span class="mini-layer ml-' + D.meta(id).role + '">' + D.ING[id].draw('mn' + level + id) + '</span>'
      ).join('') + '</span>';
  }

  /* ─────────── 미션 목록 ─────────── */
  let curLevel = null;
  function openMissions(lv) {
    curLevel = lv;
    $('missions-title').textContent = '🍔 ' + lv.name;
    const list = D.missionsOf(lv.id);
    $('missions-count').textContent = P.doneCount(list.map(x => x.id)) + ' / ' + list.length;
    const box = $('missions-list');
    box.innerHTML = '';
    list.forEach((ms, i) => {
      const done = P.isDone(ms.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mission-card' + (done ? ' done' : '');
      b.dataset.id = ms.id;
      b.innerHTML =
        '<span class="ms-no">' + (i + 1) + '</span>' +
        '<span class="mini-burger big">' +
          ms.layers.slice().reverse().map(id =>
            '<span class="mini-layer ml-' + D.meta(id).role + '">' + D.ING[id].draw('mc' + ms.id + id) + '</span>'
          ).join('') +
        '</span>' +
        '<span class="ms-badge">' + (done ? '⭐' : '🍽️') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPlay(ms); });
      box.appendChild(b);
    });
    showScreen('scr-missions');
  }

  /* ─────────── 쌓기 놀이 ─────────── */
  let cur = null; // { ms, placed:[], locked:bool }

  function openPlay(ms) {
    cur = { ms, placed: [], locked: false };
    $('play-title').textContent = '🍔 ' + D.levelDef(ms.level).name;
    renderRecipe();
    renderTray();
    resetPeg();
    showScreen('scr-play');
    // 처음 안내 (가볍게)
    setTimeout(() => { if (cur && !cur.locked) A.speak('카드 순서대로 쌓아 볼까?'); }, 300);
  }

  const nextId = () => cur.ms.layers[cur.placed.length]; // 다음에 올려야 할 재료

  // 미션 카드: 위(마지막)에서 아래(처음)로. 아래가 ① — "아래부터 위로" 쌓는 순서
  function renderRecipe() {
    const box = $('recipe-list');
    box.innerHTML = '';
    const layers = cur.ms.layers;
    for (let i = layers.length - 1; i >= 0; i--) {
      const id = layers[i];
      const row = document.createElement('div');
      row.className = 'rc-row' + (i < cur.placed.length ? ' placed' : '') + (i === cur.placed.length ? ' next' : '');
      row.dataset.step = i;
      row.innerHTML =
        '<span class="rc-num">' + CIRC[i] + '</span>' +
        '<span class="rc-ing ml-' + D.meta(id).role + '">' + D.ING[id].draw('rc' + id + i) + '</span>' +
        '<span class="rc-mark">' + (i < cur.placed.length ? '✅' : (i === cur.placed.length ? '👉' : '')) + '</span>';
      box.appendChild(row);
    }
  }

  // 트레이: 미션 재료 + 딴 재료(방해) 섞어서
  let trayIds = [];
  function renderTray() {
    const used = cur.ms.layers.slice();
    const distract = D.FILLS.filter(id => used.indexOf(id) < 0);
    shuffle(distract);
    const extra = distract.slice(0, D.levelDef(cur.ms.level).extra || 0);
    trayIds = shuffle(used.concat(extra));
    const box = $('tray');
    box.innerHTML = '';
    trayIds.forEach(id => box.appendChild(makeTrayItem(id)));
  }

  function makeTrayItem(id) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tray-item ml-' + D.meta(id).role;
    b.dataset.id = id;
    b.innerHTML = '<span class="ti-ing">' + D.ING[id].draw('ti' + id) + '</span>';
    b.addEventListener('pointerdown', ev => trayDown(ev, b));
    return b;
  }

  function resetPeg() {
    $('peg-stack').innerHTML = '';
    $('peg-wrap').classList.remove('done');
  }

  /* ─────────── 놓기 판정 ─────────── */
  function attemptPlace(id, itemEl) {
    if (!cur || cur.locked) return;
    if (id === nextId()) {
      placeLayer(id);
      cur.placed.push(id);
      if (itemEl) { itemEl.classList.add('used'); itemEl.disabled = true; }
      A.sfx.pop();
      renderRecipe();
      if (cur.placed.length === cur.ms.layers.length) complete();
    } else {
      // 틀린 재료 — 무벌점, 부드럽게 튕기고 안내
      if (itemEl) wiggle(itemEl);
      A.sfx.tap();
      const need = D.ING[nextId()];
      A.speak('다음은 ' + need.say + '야!');
    }
  }

  function placeLayer(id) {
    const stack = $('peg-stack');
    const el = document.createElement('div');
    el.className = 'layer ml-' + D.meta(id).role;
    el.innerHTML = D.ING[id].draw('pg' + id + stack.children.length);
    stack.appendChild(el);
    // 떨어지며 얹히는 애니메이션
    el.classList.add('drop');
    if (D.meta(id).role === 'top') $('peg-wrap').classList.add('done');
  }

  /* ─────────── 완성 ─────────── */
  function complete() {
    cur.locked = true;
    const ms = cur.ms;
    const first = !P.isDone(ms.id);
    P.markDone(ms.id);
    P.addStar(ms.layers.length);
    if (window.Pet) Pet.awardSnack(1);
    // 단계를 처음으로 다 모으면 펫 식사 보상
    if (first && window.Pet) {
      const ids = D.missionsOf(ms.level).map(x => x.id);
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
  function nextMission() {
    const list = D.missionsOf(cur.ms.level);
    const idx = list.findIndex(x => x.id === cur.ms.id);
    // 다음 미완성 미션을 찾는다 (없으면 목록으로)
    for (let k = 1; k <= list.length; k++) {
      const cand = list[(idx + k) % list.length];
      if (!P.isDone(cand.id)) { openPlay(cand); return; }
    }
    openMissions(D.levelDef(cur.ms.level));
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
      g.innerHTML = D.ING[drag.id].draw('gh' + drag.id);
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
    if (!d.moving || overPeg) attemptPlace(d.id, d.el);
  }
  function pointOverPeg(x, y) {
    const r = $('peg-wrap').getBoundingClientRect();
    const pad = 30;
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  }

  /* ─────────── 색종이 축하 ─────────── */
  function burstConfetti() {
    const box = $('confetti');
    box.innerHTML = '';
    const colors = ['#E24B3B', '#FFC63D', '#7CC242', '#5CB8E8', '#FF8FB0', '#B57CE0'];
    for (let i = 0; i < 34; i++) {
      const p = document.createElement('i');
      p.className = 'cf';
      p.style.left = (5 + Math.random() * 90) + '%';
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = (Math.random() * 0.3) + 's';
      p.style.animationDuration = (1.1 + Math.random() * 0.9) + 's';
      p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      p.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
      if (Math.random() < 0.5) p.style.borderRadius = '50%';
      box.appendChild(p);
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
      ev.preventDefault(); A.sfx.tap(); openMissions(D.levelDef(cur.ms.level));
    });
    $('btn-listen').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      if (!cur) return;
      const need = D.ING[nextId ? cur.ms.layers[cur.placed.length] : cur.ms.layers[0]];
      if (cur.placed.length >= cur.ms.layers.length) A.speak('다 만들었어요!');
      else A.speak('다음은 ' + need.say + '야!');
    });
    $('reward-next').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on'); nextMission();
    });
    $('reward-close').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on');
      openMissions(D.levelDef(cur.ms.level));
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
      level: cur ? cur.ms.level : null,
      missionId: cur ? cur.ms.id : null,
      layers: cur ? cur.ms.layers.slice() : null,
      placed: cur ? cur.placed.slice() : null,
      nextId: cur && !cur.locked && cur.placed.length < cur.ms.layers.length ? cur.ms.layers[cur.placed.length] : null,
      trayIds: trayIds.slice(),
      locked: cur ? cur.locked : null,
      done: cur ? P.isDone(cur.ms.id) : null,
      pegCount: $('peg-stack').children.length,
    };
  }
  return { debug, _attempt: (id) => attemptPlace(id, document.querySelector('.tray-item[data-id="' + id + '"]:not(.used)')) };
})();
