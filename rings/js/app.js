/* 앱 셸 — 홈(단계 3개) → 퍼즐 목록(단계별 10) → 놀이(고리 끼우기).
 * 왼쪽 본보기 카드(손+색 고리)를 보고, 오른쪽 빈 손의 손가락에 트레이의 색 고리를 똑같이 끼운다.
 * 색 고리를 손가락에 탭/드래그로 끼움(포인터 이벤트 공용, 고스트 따라다님).
 * 맞는 색이면 툭 끼워지고, 틀리면 부드럽게 튕기며 안내(무벌점). 손가락을 다시 탭하면 뺀다.
 * 다 맞추면 색종이 축하 + TTS + 별 + 펫 간식. 진행도는 완성한 퍼즐 id로 저장한다. */
window.App = (() => {
  const D = window.RingsData;
  const A = window.Audio2;
  const P = window.Progress;
  const $ = id => document.getElementById(id);
  const W = D.HAND.W, H = D.HAND.H;
  const pc = (v, total) => (v / total * 100);
  /* 손그림 아이콘 한 조각 — index.html 의 <symbol id="rg-…"> 를 가져다 쓴다(이모지 대신) */
  const ic = (name, cls) => '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#rg-' + name + '"/></svg>';

  /* ─────────── 화면 전환 ─────────── */
  let screenId = 'scr-home';
  function showScreen(id) {
    A.stop();
    screenId = id;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id === 'scr-home') renderHome();
  }

  /* 손 그림 뼈대(SVG + 고리 층 + [선택] 손가락 판정영역) */
  function handInner(uid, interactive) {
    let s = '<div class="hand-svg">' + D.handSVG(uid) + '</div><div class="ring-layer"></div>';
    if (interactive) {
      s += '<div class="zone-layer">' + D.FINGERS.map(f =>
        '<button type="button" class="fzone" data-finger="' + f.i + '" aria-label="' + f.name + '" style="' +
        'left:' + pc(f.zone[0], W) + '%;top:' + pc(f.zone[1], H) + '%;' +
        'width:' + pc(f.zone[2], W) + '%;height:' + pc(f.zone[3], H) + '%"></button>').join('') + '</div>';
    }
    return s;
  }

  // 손 위에 고리 하나 그리기 (밴드는 가운데가 비어 손가락이 비친다)
  function ringEl(colorId, finger, pos, kind) {
    const [x, y] = D.fingerDef(finger).slots[pos];
    const el = document.createElement('div');
    el.className = 'ring ' + kind + (colorId ? ' c-' + colorId : '');
    el.style.left = pc(x, W) + '%';
    el.style.top = pc(y, H) + '%';
    el.dataset.finger = finger;
    el.dataset.pos = pos;
    el.innerHTML = colorId ? D.ringSVG(colorId, D.nextUid()) : D.ghostSVG();
    return el;
  }

  /* ─────────── 홈: 단계 3개 ─────────── */
  function renderHome() {
    $('home-stars').textContent = P.stars();
    const menu = $('menu');
    // 제목 밑에서 첫 단계 칸으로 향하는 점선 화살표 — 글씨를 못 읽어도 "여기부터" 를 안다
    menu.innerHTML = '<svg class="start-arrow" aria-hidden="true"><use href="#rg-arrow"/></svg>';
    D.LEVELS.forEach(lv => {
      const ids = D.puzzlesOf(lv.id).map(x => x.id);
      const done = P.doneCount(ids);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-card ' + lv.cls;
      const box = document.createElement('span');
      box.className = 'mc-hand';
      box.innerHTML = handInner(D.nextUid(), false);
      fillTarget(box.querySelector('.ring-layer'), D.puzzlesOf(lv.id)[0]);
      b.innerHTML =
        '<span class="mc-name">' + lv.name + '</span>' +
        '<span class="mc-desc">' + lv.desc + '</span>' +
        '<span class="mc-prog">' + (done ? ic('star', 'ic-sm') + ' ' + done + ' / ' + ids.length : '처음이야!') + '</span>';
      b.insertBefore(box, b.firstChild);
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPuzzles(lv); });
      menu.appendChild(b);
    });
  }

  // 본보기(정답)대로 색 고리를 손에 채운다 — 카드·미리보기 공용(정적)
  function fillTarget(layer, pz) {
    layer.innerHTML = '';
    const t = D.target(pz);
    D.FINGERS.forEach(f => (t[f.i] || []).forEach((c, pos) => layer.appendChild(ringEl(c, f.i, pos, 'filled'))));
  }

  /* ─────────── 퍼즐 목록 ─────────── */
  let curLevel = null;
  function openPuzzles(lv) {
    curLevel = lv;
    $('puzzles-title').innerHTML = ic('ring', 'ic-h') + ' ' + lv.name;
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
      const hand = document.createElement('span');
      hand.className = 'mc-hand';
      hand.innerHTML = handInner(D.nextUid(), false);
      fillTarget(hand.querySelector('.ring-layer'), pz);
      b.innerHTML = '<span class="pz-no">' + (i + 1) + '</span>' +
        '<span class="pz-badge">' + ic(done ? 'star' : 'ring') + '</span>';
      b.insertBefore(hand, b.firstChild);
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPlay(pz); });
      box.appendChild(b);
    });
    showScreen('scr-puzzles');
  }

  /* ─────────── 놀이 ─────────── */
  let cur = null; // { pz, target, steps, total, placed:{finger:[colors]}, locked }
  let selColor = null;

  function openPlay(pz) {
    cur = { pz, target: D.target(pz), steps: D.steps(pz), total: pz.rings.length, placed: {}, locked: false };
    selColor = null;
    $('play-title').innerHTML = ic('ring', 'ic-h') + ' 똑같이 끼워요';
    // 본보기 카드
    $('card-hand').innerHTML = handInner(D.nextUid(), false);
    fillTarget($('card-hand').querySelector('.ring-layer'), pz);
    // 놀이 손
    $('play-hand').innerHTML = handInner(D.nextUid(), true);
    $('play-hand').querySelectorAll('.fzone').forEach(z =>
      z.addEventListener('click', ev => { ev.preventDefault(); fingerTap(+z.dataset.finger); }));
    renderTray();
    renderPlayHand();
    showScreen('scr-play');
    setTimeout(() => { if (cur && !cur.locked) A.speak('카드처럼 색 고리를 끼워 볼까?'); }, 300);
  }

  const placedOf = f => cur.placed[f] || [];
  const totalPlaced = () => D.FINGERS.reduce((n, f) => n + placedOf(f.i).length, 0);

  // 트레이 = 색 고리 팔레트 6종(여러 번 쓸 수 있어 소모되지 않는다)
  function renderTray() {
    const box = $('tray');
    box.innerHTML = '';
    D.COLOR_IDS.forEach(id => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tray-item c-' + id + (selColor === id ? ' sel' : '');
      b.dataset.id = id;
      b.innerHTML = '<span class="ti-ring">' + D.ringSVG(id, D.nextUid()) + '</span>';
      b.addEventListener('pointerdown', ev => trayDown(ev, b));
      box.appendChild(b);
    });
  }

  // 놀이 손: 손가락마다 끼운 고리(색) + 아직 빈 슬롯(점선). 다음 끼울 밑동 슬롯은 반짝.
  function renderPlayHand(animFinger) {
    const layer = $('play-hand').querySelector('.ring-layer');
    layer.innerHTML = '';
    D.FINGERS.forEach(f => {
      const need = cur.target[f.i] || [];
      const got = placedOf(f.i);
      for (let pos = 0; pos < need.length; pos++) {
        if (pos < got.length) {
          const r = ringEl(got[pos], f.i, pos, 'filled');
          if (animFinger === f.i && pos === got.length - 1) r.classList.add('drop');
          // 맨 위 고리만 탭으로 뺄 수 있다
          if (pos === got.length - 1) {
            r.classList.add('top');
            r.addEventListener('click', ev => { ev.preventDefault(); fingerTap(f.i); });
          }
          layer.appendChild(r);
        } else {
          const g = ringEl(null, f.i, pos, 'ghost');
          if (pos === got.length) g.classList.add('next');
          layer.appendChild(g);
        }
      }
    });
  }

  /* ─────────── 끼우기/빼기 판정 ─────────── */
  function attemptPlace(colorId, finger, viaTap) {
    if (!cur || cur.locked) return;
    const need = cur.target[finger] || [];
    const k = placedOf(finger).length;
    if (k < need.length && need[k] === colorId) {
      (cur.placed[finger] = cur.placed[finger] || []).push(colorId);
      A.sfx.pop();
      selColor = null;
      renderTray();
      renderPlayHand(finger);
      if (totalPlaced() === cur.total) complete();
    } else {
      // 틀린 색/자리 — 무벌점, 부드럽게 튕기고 안내
      bounceFinger(finger);
      A.sfx.tap();
      if (k < need.length) A.speak('여기엔 ' + D.COLORS[need[k]].say + '야!');
      else A.speak('여긴 다 끼웠어!');
    }
  }
  function removeRing(finger) {
    if (!cur || cur.locked) return;
    const got = placedOf(finger);
    if (!got.length) return;
    got.pop();
    A.sfx.tap();
    renderPlayHand();
  }
  // 손가락 탭: 색을 골랐으면 끼우고, 아니면 맨 위 고리를 뺀다
  function fingerTap(finger) {
    if (!cur || cur.locked) return;
    if (selColor) attemptPlace(selColor, finger, true);
    else removeRing(finger);
  }

  /* ─────────── 완성 ─────────── */
  function complete() {
    cur.locked = true;
    const pz = cur.pz;
    const first = !P.isDone(pz.id);
    P.markDone(pz.id);
    P.addStar(cur.total);
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
    openPuzzles(D.levelDef(cur.pz.level));
  }

  /* ─────────── 드래그(포인터) ─────────── */
  let drag = null; // { id, el, sx, sy, moving }
  let justDragged = false;
  function trayDown(ev, item) {
    if (!cur || cur.locked) return;
    drag = { id: item.dataset.id, el: item, sx: ev.clientX, sy: ev.clientY, moving: false };
  }
  function onMove(ev) {
    if (!drag) return;
    const dx = ev.clientX - drag.sx, dy = ev.clientY - drag.sy;
    if (!drag.moving && Math.hypot(dx, dy) > 10) {
      drag.moving = true;
      drag.el.classList.add('lift');
      const g = $('drag-ghost');
      g.innerHTML = D.ringSVG(drag.id, D.nextUid());
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
    if (!d.moving) {
      // 탭 = 색 고르기(토글). 고른 색으로 손가락을 탭하면 끼운다.
      selColor = (selColor === d.id) ? null : d.id;
      renderTray();
      if (selColor) A.speak(D.COLORS[selColor].say + '! 어느 손가락에?');
      return;
    }
    const finger = fingerAt(ev.clientX, ev.clientY);
    if (finger != null) {
      justDragged = true;
      setTimeout(() => { justDragged = false; }, 260);
      attemptPlace(d.id, finger, false);
    }
  }
  // 포인터 위치의 손가락 판정영역 찾기
  function fingerAt(x, y) {
    let hit = null;
    $('play-hand').querySelectorAll('.fzone').forEach(z => {
      const r = z.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) hit = +z.dataset.finger;
    });
    return hit;
  }

  /* ─────────── 색종이 축하 ─────────── */
  function burstConfetti() {
    const box = $('confetti');
    box.innerHTML = '';
    const colors = ['#EF4E4E', '#F5952E', '#F4CE2A', '#57BE4E', '#4DA6E8', '#A77CE0'];
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
  function bounceFinger(finger) {
    const z = $('play-hand').querySelector('.fzone[data-finger="' + finger + '"]');
    if (!z) return;
    z.classList.remove('bounce'); void z.offsetWidth; z.classList.add('bounce');
  }

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
      const st = cur.steps[totalPlaced()];
      if (!st) { A.speak('다 끼웠어요!'); return; }
      A.speak(D.fingerDef(st.finger).say + ' 손가락에 ' + D.COLORS[st.color].say + '!');
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
      rings: cur ? cur.total : null,
      placedCount: cur ? totalPlaced() : null,
      stacked: cur ? D.isStacked(cur.pz) : null,
      steps: cur ? cur.steps.slice() : null,
      remaining: cur ? cur.steps.slice(totalPlaced()) : null,
      locked: cur ? cur.locked : null,
      done: cur ? P.isDone(cur.pz.id) : null,
      ringCount: $('play-hand') ? $('play-hand').querySelectorAll('.ring.filled').length : 0,
    };
  }
  return {
    debug,
    _attempt: (colorId, finger) => attemptPlace(colorId, finger, false),
    _remove: (finger) => removeRing(finger),
  };
})();
