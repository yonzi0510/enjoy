/* 앱 셸 — 홈(단계 3개) → 퍼즐 목록(단계별 10) → 놀이(빈칸 채우기).
 * 반복되는 도형 줄에서 빈칸(dashed 슬롯)에 알맞은 타일을 넣어 패턴을 완성한다.
 * 트레이의 타일을 탭 또는 드래그(포인터 이벤트 공용)해서 지금 차례인 빈칸에 놓는다.
 * 맞으면 툭 들어가고, 틀리면 부드럽게 튕기며 "무슨 모양이 올까?" 안내(무벌점).
 * 다 채우면 색종이 축하 + TTS + 별 + 펫 간식. 진행도는 완성한 퍼즐 id 로 저장한다. */
window.App = (() => {
  const D = window.PatternData;
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
        '<span class="mc-icon">' + miniPattern(lv.id) + '</span>' +
        '<span class="mc-name">' + lv.name + '</span>' +
        '<span class="mc-desc">' + lv.desc + '</span>' +
        '<span class="mc-prog">' + (done ? '⭐ ' + done + ' / ' + ids.length : '처음이야!') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openList(lv); });
      menu.appendChild(b);
    });
  }

  // 단계 아이콘 — 대표 퍼즐의 앞 3칸 미리보기
  function miniPattern(level) {
    const sample = D.puzzlesOf(level)[0];
    return '<span class="mini-row">' +
      sample.pattern.slice(0, 3).map((id, i) =>
        '<span class="mini-cell">' + D.tile(id).draw('mn' + level + i) + '</span>'
      ).join('') + '</span>';
  }

  /* ─────────── 퍼즐 목록 ─────────── */
  let curLevel = null;
  function openList(lv) {
    curLevel = lv;
    $('list-title').textContent = '🔁 ' + lv.name;
    const list = D.puzzlesOf(lv.id);
    $('list-count').textContent = P.doneCount(list.map(x => x.id)) + ' / ' + list.length;
    const box = $('list');
    box.innerHTML = '';
    list.forEach((pzl, i) => {
      const done = P.isDone(pzl.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'puzzle-card' + (done ? ' done' : '');
      b.dataset.id = pzl.id;
      b.innerHTML =
        '<span class="pz-no">' + (i + 1) + '</span>' +
        '<span class="mini-row big">' +
          pzl.pattern.slice(0, 4).map((id, k) =>
            '<span class="mini-cell' + (pzl.blanks.indexOf(k) >= 0 ? ' hole' : '') + '">' +
              (pzl.blanks.indexOf(k) >= 0 ? '' : D.tile(id).draw('pc' + pzl.id + k)) +
            '</span>'
          ).join('') +
        '</span>' +
        '<span class="pz-badge">' + (done ? '⭐' : '❓') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPlay(pzl); });
      box.appendChild(b);
    });
    showScreen('scr-list');
  }

  /* ─────────── 놀이 ─────────── */
  let cur = null; // { pz, answers:[], placed:[], locked:bool }

  function openPlay(pzl) {
    cur = { pz: pzl, answers: D.answersOf(pzl), placed: [], locked: false };
    $('play-title').textContent = '🔁 ' + D.levelDef(pzl.level).name;
    renderStrip();
    renderTray();
    showScreen('scr-play');
    setTimeout(() => { if (cur && !cur.locked) A.speak('빈칸에 알맞은 조각을 찾아 볼까?'); }, 350);
  }

  // 지금 차례인 빈칸의 정답 타일 id
  const nextId = () => cur.answers[cur.placed.length];
  // 지금 차례인 빈칸의 위치 인덱스
  const activeBlankPos = () => cur.pz.blanks[cur.placed.length];

  /* 패턴 줄 그리기 — 각 칸은 채워진 타일 또는 빈칸 슬롯 */
  function renderStrip() {
    const strip = $('strip');
    strip.innerHTML = '';
    const pz = cur.pz;
    const placedCount = cur.placed.length;
    pz.pattern.forEach((id, pos) => {
      const bIdx = pz.blanks.indexOf(pos); // 이 칸이 몇 번째 빈칸인지 (-1=일반칸)
      const cell = document.createElement('div');
      if (bIdx < 0) {
        cell.className = 'cell shown';
        cell.innerHTML = D.tile(id).draw('sp' + pz.id + pos);
      } else if (bIdx < placedCount) {
        // 이미 채운 빈칸
        cell.className = 'cell shown filled';
        cell.innerHTML = D.tile(id).draw('sp' + pz.id + pos);
      } else if (bIdx === placedCount) {
        cell.className = 'cell blank active';
        cell.innerHTML = '<span class="q">?</span>';
      } else {
        cell.className = 'cell blank';
        cell.innerHTML = '<span class="q">?</span>';
      }
      cell.dataset.pos = pos;
      strip.appendChild(cell);
    });
  }

  /* 트레이 — 정답 타일(빈칸마다 하나) + 방해 타일 섞어서 */
  let trayIds = [];
  function renderTray() {
    const answers = cur.answers.slice();
    const answerSet = new Set(answers);
    const pool = D.SOLID_IDS.filter(id => !answerSet.has(id));
    shuffle(pool);
    const extra = pool.slice(0, D.levelDef(cur.pz.level).extra || 0);
    trayIds = shuffle(answers.concat(extra));
    const box = $('tray');
    box.innerHTML = '';
    trayIds.forEach((id, k) => box.appendChild(makeTrayItem(id, k)));
  }

  function makeTrayItem(id, k) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile-item';
    b.dataset.id = id;
    b.dataset.k = k;
    b.innerHTML = '<span class="ti-shape">' + D.tile(id).draw('ti' + id + k) + '</span>';
    b.addEventListener('pointerdown', ev => trayDown(ev, b));
    return b;
  }

  /* ─────────── 놓기 판정 ─────────── */
  function attemptPlace(id, itemEl) {
    if (!cur || cur.locked) return;
    if (cur.placed.length >= cur.answers.length) return;
    if (id === nextId()) {
      const pos = activeBlankPos();
      cur.placed.push(id);
      if (itemEl) { itemEl.classList.add('used'); itemEl.disabled = true; }
      A.sfx.pop();
      renderStrip();
      const cell = $('strip').querySelector('.cell[data-pos="' + pos + '"]');
      if (cell) { cell.classList.add('drop'); }
      if (cur.placed.length === cur.answers.length) complete();
    } else {
      // 틀린 타일 — 무벌점, 부드럽게 튕기고 안내
      if (itemEl) wiggle(itemEl);
      A.sfx.tap();
      const hints = ['무슨 모양이 올까?', '규칙을 다시 볼까?', '어떤 조각이 어울릴까?'];
      A.speak(hints[Math.floor(Math.random() * hints.length)]);
    }
  }

  /* ─────────── 완성 ─────────── */
  function complete() {
    cur.locked = true;
    const pz = cur.pz;
    const first = !P.isDone(pz.id);
    P.markDone(pz.id);
    P.addStar(pz.level); // 단계 = 별 개수
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
    drag = { id: item.dataset.id, el: item, sx: ev.clientX, sy: ev.clientY, moving: false };
  }
  function onMove(ev) {
    if (!drag) return;
    const dx = ev.clientX - drag.sx, dy = ev.clientY - drag.sy;
    if (!drag.moving && Math.hypot(dx, dy) > 10) {
      drag.moving = true;
      drag.el.classList.add('lift');
      const g = $('drag-ghost');
      g.innerHTML = D.tile(drag.id).draw('gh' + drag.id);
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
    const overBlank = pointOverActiveBlank(ev.clientX, ev.clientY);
    if (!d.moving || overBlank) attemptPlace(d.id, d.el);
  }
  function pointOverActiveBlank(x, y) {
    // 활성 빈칸이든, 패턴 줄 어디든 떨어뜨리면 판정 (5세 관대하게)
    const strip = $('strip');
    if (!strip) return false;
    const r = strip.getBoundingClientRect();
    const pad = 24;
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  }

  /* ─────────── 색종이 축하 ─────────── */
  function burstConfetti() {
    const box = $('confetti');
    box.innerHTML = '';
    const colors = ['#E24B3B', '#FFC12E', '#2E8FE0', '#4FB84A', '#FF7FAA', '#9B6FD6'];
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
      ev.preventDefault(); A.sfx.tap(); openList(D.levelDef(cur.pz.level));
    });
    $('btn-listen').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      if (!cur) return;
      if (cur.locked || cur.placed.length >= cur.answers.length) A.speak('패턴을 다 완성했어요!');
      else A.speak('빈칸에 무슨 조각이 올까? 규칙을 잘 보자!');
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
      pattern: cur ? cur.pz.pattern.slice() : null,
      blanks: cur ? cur.pz.blanks.slice() : null,
      answers: cur ? cur.answers.slice() : null,
      placed: cur ? cur.placed.slice() : null,
      nextId: cur && !cur.locked && cur.placed.length < cur.answers.length ? cur.answers[cur.placed.length] : null,
      trayIds: trayIds.slice(),
      locked: cur ? cur.locked : null,
      done: cur ? P.isDone(cur.pz.id) : null,
      slotCount: $('strip') ? $('strip').children.length : 0,
      filledCount: $('strip') ? $('strip').querySelectorAll('.cell.filled').length : 0,
      blankCount: $('strip') ? $('strip').querySelectorAll('.cell.blank').length : 0,
    };
  }
  return { debug, _attempt: (id) => attemptPlace(id, document.querySelector('.tile-item[data-id="' + id + '"]:not(.used)')) };
})();
