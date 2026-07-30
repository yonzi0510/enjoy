/* 앱 셸 — 홈(단계 3개) → 퍼즐 목록(단계별 10) → 시험관 놀이.
 * 왼쪽 본보기 카드에 각 관의 아래→위 색 순서가 크게 나온다.
 * 오른쪽 빈 시험관들 중 "지금 채울 관"을 은은히 강조하고, 팔레트에서 색을 탭하면
 * 그 관 바닥부터 구슬이 쌓인다. 맞는 색이면 톡 담기고, 틀리면 부드럽게 튕기며 안내(무벌점).
 * 관을 다 채우면 다음 관, 모든 관을 카드대로 채우면 완성.
 * 완성: 색종이 축하 + TTS + 별 + 펫 간식. 진행도는 완성한 퍼즐 id로 저장한다. */
window.App = (() => {
  const D = window.TubesData;
  const A = window.Audio2;
  const P = window.Progress;
  const $ = id => document.getElementById(id);
  const uid = () => D.nextUid();

  /* ─────────── 화면 전환 ─────────── */
  let screenId = 'scr-home';
  function showScreen(id) {
    A.stop();
    screenId = id;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id === 'scr-home') renderHome();
  }

  /* ─────────── 시험관 그리기 (본보기·놀이 공용) ─────────── */
  // beads: 아래→위로 이미 담긴 색 배열, len: 관 길이, ti: 관 번호(0부터)
  function tubeHTML(beads, len, ti, opts) {
    opts = opts || {};
    let slots = '';
    for (let i = 0; i < len; i++) {
      const c = beads[i];
      slots += '<span class="slot">' +
        (c ? '<span class="bead c-' + c + '">' + D.beadDraw(c, 'b' + uid()) + '</span>' : '') +
        '</span>';
    }
    return '<div class="tube' + (opts.active ? ' active' : '') + (opts.done ? ' done' : '') +
        (opts.mini ? ' mini' : '') + '" data-ti="' + ti + '" style="--len:' + len + '">' +
      '<span class="tube-glass">' + D.glassDraw('g' + uid()) + '</span>' +
      '<span class="tube-beads">' + slots + '</span>' +
      (opts.no ? '<span class="tube-no">' + opts.no + '</span>' : '') +
    '</div>';
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
        '<span class="mc-icon">' + miniTubes(lv.id) + '</span>' +
        '<span class="mc-name">' + lv.name + '</span>' +
        '<span class="mc-desc">' + lv.desc + '</span>' +
        '<span class="mc-prog">' + (done ? '⭐ ' + done + ' / ' + ids.length : '처음이야!') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openList(lv); });
      menu.appendChild(b);
    });
  }

  // 단계 아이콘용 미니 시험관 미리보기 (대표 퍼즐의 관 몇 개)
  function miniTubes(level) {
    const pz = D.puzzlesOf(level)[0];
    const len = D.levelDef(level).len;
    return '<span class="mini-tubes">' +
      pz.tubes.map((t, i) => tubeHTML(t, len, i, { mini: true })).join('') +
    '</span>';
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
        '<span class="mini-tubes big">' +
          pz.tubes.map((t, k) => tubeHTML(t, lv.len, k, { mini: true })).join('') +
        '</span>' +
        '<span class="pz-badge">' + (done ? '⭐' : '🧪') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPlay(pz); });
      box.appendChild(b);
    });
    showScreen('scr-list');
  }

  /* ─────────── 시험관 놀이 ─────────── */
  let cur = null; // { pz, len, filled:[[],...], locked }

  function openPlay(pz) {
    const lv = D.levelDef(pz.level);
    cur = { pz, len: lv.len, filled: pz.tubes.map(() => []), locked: false };
    $('play-title').textContent = lv.icon + ' ' + lv.name;
    renderCard();
    renderTubes();
    renderPalette();
    showScreen('scr-play');
    setTimeout(() => { if (cur && !cur.locked) A.speak('카드를 보고 색깔을 담아 볼까?'); }, 300);
  }

  // 지금 채워야 할 관(첫 미완성 관)
  function activeTube() {
    if (!cur) return -1;
    for (let i = 0; i < cur.pz.tubes.length; i++) {
      if (cur.filled[i].length < cur.pz.tubes[i].length) return i;
    }
    return -1;
  }
  // 다음에 담아야 할 색
  function nextColor() {
    const ti = activeTube();
    if (ti < 0) return null;
    return cur.pz.tubes[ti][cur.filled[ti].length];
  }

  // 본보기 카드: 각 관을 가득 채운 목표 모습(글씨 없이 색만, 크게)
  function renderCard() {
    const box = $('card-tubes');
    box.innerHTML = cur.pz.tubes.map((t, i) =>
      tubeHTML(t, cur.len, i, { no: i + 1, done: true })
    ).join('');
  }

  // 놀이 시험관: 지금까지 담은 구슬 + 활성 관 강조
  function renderTubes() {
    const at = activeTube();
    const box = $('play-tubes');
    box.innerHTML = cur.pz.tubes.map((t, i) =>
      tubeHTML(cur.filled[i], cur.len, i, { no: i + 1, active: i === at, done: i < at || (at < 0) })
    ).join('');
    // 방금 담긴 구슬 톡 떨어지는 애니메이션
    const active = box.querySelector('.tube.active .bead:last-child');
    if (active) active.classList.add('drop');
  }

  // 색 팔레트 6종
  function renderPalette() {
    const box = $('palette');
    box.innerHTML = '';
    D.COLOR_IDS.forEach(id => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pal-bead c-' + id;
      b.dataset.color = id;
      b.innerHTML = '<span class="pb-ing">' + D.beadDraw(id, 'pl' + uid()) + '</span>';
      b.addEventListener('pointerdown', ev => palDown(ev, b));
      box.appendChild(b);
    });
  }

  /* ─────────── 담기 판정 ─────────── */
  function attemptPlace(color, btn) {
    if (!cur || cur.locked) return;
    const ti = activeTube();
    if (ti < 0) return;
    if (color === nextColor()) {
      cur.filled[ti].push(color);
      const filledTube = cur.filled[ti].length === cur.pz.tubes[ti].length;
      renderTubes();
      if (filledTube) A.sfx.ding(); else A.sfx.plink();
      if (activeTube() < 0) complete();
    } else {
      // 틀린 색 — 무벌점, 부드럽게 튕기고 안내
      if (btn) wiggle(btn);
      A.sfx.tap();
      const need = D.meta(nextColor());
      A.speak('다음은 ' + need.say + '이야!');
    }
  }

  /* ─────────── 완성 ─────────── */
  function complete() {
    cur.locked = true;
    const pz = cur.pz;
    const first = !P.isDone(pz.id);
    P.markDone(pz.id);
    P.addStar(D.beadTotal(pz));
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
  let drag = null; // { color, el, sx, sy, moving }
  function palDown(ev, btn) {
    if (!cur || cur.locked) return;
    drag = { color: btn.dataset.color, el: btn, sx: ev.clientX, sy: ev.clientY, moving: false };
  }
  function onMove(ev) {
    if (!drag) return;
    const dx = ev.clientX - drag.sx, dy = ev.clientY - drag.sy;
    if (!drag.moving && Math.hypot(dx, dy) > 10) {
      drag.moving = true;
      drag.el.classList.add('lift');
      const g = $('drag-ghost');
      g.innerHTML = D.beadDraw(drag.color, 'gh' + uid());
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
    const overTubes = pointOverTubes(ev.clientX, ev.clientY);
    if (!d.moving || overTubes) attemptPlace(d.color, d.el);
  }
  function pointOverTubes(x, y) {
    const r = $('play-tubes').getBoundingClientRect();
    const pad = 24;
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  }

  /* ─────────── 색종이 축하 ─────────── */
  function burstConfetti() {
    const box = $('confetti');
    box.innerHTML = '';
    const colors = ['#E24B3B', '#F39A2B', '#F6C744', '#57B24A', '#4C86D6', '#9B6FD0'];
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
      const nc = nextColor();
      if (!nc) A.speak('다 채웠어요!');
      else A.speak('다음은 ' + D.meta(nc).say + '이야!');
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
    const at = cur ? activeTube() : -1;
    return {
      screen: screenId,
      stars: P.stars(),
      level: cur ? cur.pz.level : null,
      puzzleId: cur ? cur.pz.id : null,
      tubes: cur ? cur.pz.tubes.map(t => t.slice()) : null,
      filled: cur ? cur.filled.map(t => t.slice()) : null,
      len: cur ? cur.len : null,
      activeTube: at,
      nextColor: cur && !cur.locked ? nextColor() : null,
      beadCount: cur ? cur.filled.reduce((n, t) => n + t.length, 0) : 0,
      beadTotal: cur ? D.beadTotal(cur.pz) : 0,
      locked: cur ? cur.locked : null,
      done: cur ? P.isDone(cur.pz.id) : null,
      tubeEls: $('play-tubes') ? $('play-tubes').querySelectorAll('.tube').length : 0,
      palette: $('palette') ? $('palette').querySelectorAll('.pal-bead').length : 0,
    };
  }
  return {
    debug,
    _attempt: (color) => attemptPlace(color, document.querySelector('.pal-bead[data-color="' + color + '"]')),
  };
})();
