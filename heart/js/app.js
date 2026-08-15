/* 앱 셸 — 홈(묶음 3 + 자유 얼굴 + 마음 도감) → 장면 목록(묶음별 9) → 마음 놀이.
 *
 * 흐름:  장면을 본다 → 친구가 어떤 마음일지 짐작해 **얼굴을 만들어 준다**(눈썹·눈·입을
 *        끌어다 붙인다) → 세 부품이 다 붙으면 **도움 카드 4장**이 펼쳐진다 →
 *        한 장을 친구에게 끌어다 준다 → 친구 표정이 밝아지고 한마디 한다(TTS).
 *
 * ⚠️ **맞고 틀림이 없다.** 어떤 얼굴을 만들어도, 어떤 카드를 줘도 전부 통한다.
 *    - 채점 함수도, 오답 처리도, 흔들기(무벌점 안내)도 두지 마라 — 틀릴 것이 없다.
 *    - 완성의 감각은 **마음 도감 12칸**이 맡는다. 도감에 켜지는 얼굴은 예시 그림이 아니라
 *      **아이가 그때 만든 얼굴 그대로**다(Progress.setFace).
 */
window.App = (() => {
  const D = window.HeartData;
  const A = window.Audio2;
  const P = window.Progress;
  const $ = id => document.getElementById(id);

  const ic = (id, cls) => '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#ht-' + id + '"/></svg>';

  /* ─────────── 화면 전환 ─────────── */
  let screenId = 'scr-home';
  function showScreen(id) {
    A.stop();
    screenId = id;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id === 'scr-home') renderHome();
    if (id === 'scr-book') renderBook();
    if (id === 'scr-free') openFree();
  }

  /* ─────────── 홈 ───────────
   * 묶음 3개 + 자유 얼굴 + 마음 도감 = 다섯 칸. 첫 칸(집)이 크고 노랗다(shared/screen.css). */
  function renderHome() {
    $('home-stars').textContent = P.stars();
    const menu = $('menu');
    menu.innerHTML = '';
    D.GROUPS.forEach(g => {
      const ids = D.scenesOf(g.id).map(s => s.id);
      const done = P.doneCount(ids);
      menu.appendChild(card({
        cls: 'menu-card ' + g.cls, icon: 'g-' + g.id, name: g.name, desc: g.desc,
        prog: done ? ic('heart') + ' ' + done + ' / ' + ids.length : '처음이야!',
        go: () => openList(g),
      }));
    });
    menu.appendChild(card({
      cls: 'menu-card c-free', icon: 'g-free', name: '내 마음 얼굴', desc: '마음대로 만들기',
      prog: P.freeList().length ? ic('heart') + ' ' + P.freeList().length + '개' : '만들어 볼까?',
      go: () => showScreen('scr-free'),
    }));
    menu.appendChild(card({
      cls: 'menu-card c-book', icon: 'g-book', name: '마음 도감', desc: '모은 마음 보기',
      prog: P.bookCount() + ' / 12',
      go: () => showScreen('scr-book'),
    }));
  }
  function card(o) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = o.cls;
    b.innerHTML =
      '<span class="mc-icon">' + ic(o.icon, 'ic-menu') + '</span>' +
      '<span class="mc-name">' + o.name + '</span>' +
      '<span class="mc-desc">' + o.desc + '</span>' +
      '<span class="mc-prog">' + o.prog + '</span>';
    b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); o.go(); });
    return b;
  }

  /* ─────────── 장면 목록 ─────────── */
  let curGroup = null;
  function openList(g) {
    curGroup = g;
    $('list-title').innerHTML = ic('g-' + g.id, 'ic-title') + ' ' + g.name;
    const list = D.scenesOf(g.id);
    $('list-count').textContent = P.doneCount(list.map(x => x.id)) + ' / ' + list.length;
    const box = $('list');
    box.innerHTML = '';
    list.forEach((sc, i) => {
      const done = P.isDone(sc.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'scene-card-btn' + (done ? ' done' : '');
      b.dataset.id = sc.id;
      b.innerHTML =
        '<span class="sc-no">' + (i + 1) + '</span>' +
        '<span class="sc-pic">' + D.sceneSvg(sc, sc.look, D.nextUid()) + '</span>' +
        '<span class="sc-badge">' + (done ? ic('check') : ic('heart')) + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPlay(sc); });
      box.appendChild(b);
    });
    showScreen('scr-list');
  }

  /* ─────────── 놀이 ───────────
   * cur = { scene, sel:{brow,eyes,mouth}, helped:cardId|null, locked }
   * sel 에는 '맞는 값' 이 없다. 아이가 고른 것이 그대로 그 아이의 답이다. */
  let cur = null;

  function openPlay(sc) {
    cur = { scene: sc, sel: { brow: null, eyes: null, mouth: null }, helped: null, locked: false };
    $('play-title').innerHTML = ic('g-' + sc.group, 'ic-title') + ' ' + D.groupDef(sc.group).name;
    $('scene-line').textContent = sc.line;
    renderScene();
    renderFace();
    renderParts();
    $('parts').hidden = false;
    $('help-cards').hidden = true;
    $('help-cards').innerHTML = '';
    showScreen('scr-play');
    setTimeout(() => { if (cur === null) return; A.speak(sc.line + ' 지금 어떤 마음일까?'); }, 260);
  }

  /* 장면 속 친구 얼굴 — 들어가자마자 표정을 보여 주면 아이가 그걸 그대로 베낀다는
   * 지적(2026-08)에 **다 만들기 전에는 빈 얼굴**로 둔다. 완성되면(3/3) 그제야
   * 아이가 고른 얼굴이 여기에도 옮겨 붙는다 — 예시가 아니라 결과가 된다. */
  function renderScene() {
    const sel = cur.helped ? D.HAPPY : (filledCount(cur.sel) === 3 ? cur.sel : {});
    $('scene-pic').innerHTML = D.sceneSvg(cur.scene, sel, D.nextUid());
  }

  /* 아이가 만드는 얼굴 — 붙인 부품만 그린다. 몸통을 붙였다(2026-08) —
   * 원 안에 머리만 떠 있으면 "이게 얼굴인가?" 헷갈린다는 지적에 답했다. */
  function renderFace() {
    const box = $('face-box');
    box.innerHTML = D.bodySvg(cur.sel, { cls: 'big-face' });
    box.dataset.filled = filledCount(cur.sel);
    const left = D.SLOTS.filter(s => !cur.sel[s]);
    $('face-hint').textContent = left.length
      ? '아직 ' + left.map(s => D.PARTS[s].name).join('과 ') + '이 없어'
      : (cur.helped ? '마음을 나눠 줬어!' : '무엇을 해 줄까?');
  }
  function filledCount(sel) { return D.SLOTS.filter(s => sel[s]).length; }

  /* 부품 띠 — 부위마다 한 줄 */
  function renderParts() { buildTray($('parts'), cur.sel, (slot, id) => putPart(slot, id)); }

  function buildTray(box, sel, onPick) {
    box.innerHTML = '';
    D.SLOTS.forEach(slot => {
      const g = D.PARTS[slot];
      const row = document.createElement('div');
      row.className = 'parts-row';
      row.dataset.slot = slot;
      g.list.forEach(p => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'part-item' + (sel[slot] === p.id ? ' on' : '');
        b.dataset.slot = slot;
        b.dataset.part = p.id;
        b.setAttribute('aria-label', p.name);
        b.innerHTML = partChipSvg(slot, p.id);
        b.addEventListener('pointerdown', ev => partDown(ev, b, onPick));
        row.appendChild(b);
      });
      box.appendChild(row);
    });
  }
  // 부품 띠 한 칸 — 그 부위만 잘라 크게 보여 준다. 부위 색을 입힌다(눈썹·눈·입 구별,
  // 2026-08) — 완성된 얼굴(renderFace)은 이 색을 안 쓰고 항상 검정이다.
  function partChipSvg(slot, id) {
    return '<svg class="chip-svg" viewBox="' + D.PARTS[slot].vb + '" width="100%" xmlns="http://www.w3.org/2000/svg">' +
      D.partPaths(slot, id, D.SLOT_COLOR[slot]) + '</svg>';
  }

  /* 부품 붙이기 — 어떤 부품이든 그대로 붙는다(고를 것만 있고 맞출 것은 없다) */
  function putPart(slot, id) {
    if (!cur || cur.locked) return;
    const was = filledCount(cur.sel);
    cur.sel[slot] = id;
    renderFace();
    renderScene();
    markChosen($('parts'), cur.sel);
    A.sfx.stick();
    const now = filledCount(cur.sel);
    if (now === 3 && was < 3) faceReady();
  }
  function markChosen(box, sel) {
    box.querySelectorAll('.part-item').forEach(el => {
      el.classList.toggle('on', sel[el.dataset.slot] === el.dataset.part);
    });
  }

  /* 세 부품이 다 붙었다 — 도움 카드 4장이 펼쳐진다 */
  function faceReady() {
    A.sfx.face();
    renderHelpCards();
    const line = D.facePraises[Math.floor(Math.random() * D.facePraises.length)];
    setTimeout(() => A.speak(line + ' 이제 무엇을 해 줄까?'), 200);
  }

  function renderHelpCards() {
    const box = $('help-cards');
    box.innerHTML = '';
    cur.scene.cards.forEach(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'help-card';
      b.dataset.card = c.id;
      b.innerHTML = '<span class="hc-pic">' + D.iconSvg(c.icon) + '</span>' +
                    '<span class="hc-name">' + c.name + '</span>';
      b.addEventListener('pointerdown', ev => cardDown(ev, b));
      box.appendChild(b);
    });
    box.hidden = false;
    // 부품 띠와 카드가 같이 있으면 폰 세로에서 아래가 넘친다 — 자리를 물려준다
    $('parts').hidden = true;
  }

  /* 카드를 건넸다 — 어느 카드든 통한다. 달라지는 것은 친구의 대답뿐이다. */
  function giveCard(cardId) {
    if (!cur || cur.locked) return;
    const c = cur.scene.cards.find(x => x.id === cardId);
    if (!c) return;
    cur.helped = cardId;
    cur.locked = true;
    renderScene();
    renderFace();
    document.querySelectorAll('#help-cards .help-card').forEach(el => {
      el.classList.toggle('given', el.dataset.card === cardId);
      el.disabled = true;
    });
    A.sfx.give();
    complete(c);
  }

  function complete(c) {
    const sc = cur.scene;
    const first = !P.isDone(sc.id);
    P.markDone(sc.id);
    P.addStar(1);
    // 도감에는 **아이가 만든 얼굴 그대로** 들어간다
    P.setFace(sc.mood, cur.sel, sc.id);
    if (window.Pet) Pet.awardSnack(1);
    if (first && window.Pet) {
      const ids = D.scenesOf(sc.group).map(x => x.id);
      if (P.doneCount(ids) >= ids.length) Pet.awardMeal(1);
    }
    burstConfetti();
    A.sfx.heart();
    const reply = c.reply.join(' ');
    setTimeout(() => A.speak(reply), 300);
    setTimeout(() => showReward(c), 900);
  }

  /* ─────────── 보상 오버레이 ─────────── */
  function showReward(c) {
    const m = D.moodMeta(cur.scene.mood);
    $('reward-face').innerHTML = D.faceSvg(cur.sel, { cls: 'big-face' });
    $('reward-mood').innerHTML = '<span class="rm-chip" style="background:' + (m ? m.color : '#FFE0BF') + '">' +
      (m ? m.name : '') + '</span> 도감에 담았어!';
    $('reward-praise').textContent = c.reply[0];
    $('reward').classList.add('on');
  }
  function nextScene() {
    const list = D.scenesOf(cur.scene.group);
    const idx = list.findIndex(x => x.id === cur.scene.id);
    for (let k = 1; k <= list.length; k++) {
      const cand = list[(idx + k) % list.length];
      if (!P.isDone(cand.id)) { openPlay(cand); return; }
    }
    openList(D.groupDef(cur.scene.group));
  }

  /* ─────────── 자유 모드 ─────────── */
  let freeSel = { brow: null, eyes: null, mouth: null };
  function openFree() {
    freeSel = { brow: null, eyes: null, mouth: null };
    renderFreeFace();
    buildTray($('free-parts'), freeSel, (slot, id) => {
      freeSel[slot] = id;
      renderFreeFace();
      markChosen($('free-parts'), freeSel);
      A.sfx.stick();
      if (filledCount(freeSel) === 3) { A.sfx.face(); setTimeout(() => A.speak('멋진 얼굴이야! 담아 둘까?'), 180); }
    });
  }
  function renderFreeFace() {
    const box = $('free-face');
    box.innerHTML = D.faceSvg(freeSel, { cls: 'big-face' });
    box.dataset.filled = filledCount(freeSel);
    $('free-hint').textContent = filledCount(freeSel) === 3 ? '담기를 눌러 봐!' : '눈썹, 눈, 입을 붙여 봐';
  }
  function saveFree() {
    if (filledCount(freeSel) < 3) { A.speak('눈썹과 눈과 입을 붙여 볼까?'); return; }
    P.addFree(freeSel);
    A.sfx.heart();
    A.speak('마음 도감 옆에 담아 뒀어!');
    freeSel = { brow: null, eyes: null, mouth: null };
    renderFreeFace();
    markChosen($('free-parts'), freeSel);
  }

  /* ─────────── 마음 도감 ─────────── */
  function renderBook() {
    $('book-count').textContent = P.bookCount() + ' / 12';
    const grid = $('book-grid');
    grid.innerHTML = '';
    D.MOODS.forEach(m => {
      const face = P.faceOf(m.id);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'book-cell' + (face ? ' got' : '');
      cell.dataset.mood = m.id;
      cell.style.setProperty('--mood', m.color);
      cell.innerHTML = '<span class="bc-face">' +
          (face ? D.faceSvg(face, { cls: 'mini-face' })
                : '<svg class="mini-face empty" viewBox="0 0 100 100" width="100%" xmlns="http://www.w3.org/2000/svg">' +
                  '<path d="M12 52 a38 38 0 1 0 76 0 a38 38 0 1 0 -76 0" fill="none" stroke="#B9AEA1" stroke-width="3" stroke-dasharray="7 7"/></svg>') +
        '</span><span class="bc-name">' + m.name + '</span>';
      cell.addEventListener('click', ev => {
        ev.preventDefault(); A.sfx.tap();
        A.speak(face ? m.say + '이야. 네가 만든 얼굴이야!' : m.say + '은 아직 비어 있어. 만들러 가 볼까?');
      });
      grid.appendChild(cell);
    });
    const row = $('sticker-row');
    const free = P.freeList();
    row.innerHTML = free.length
      ? '<span class="sr-cap">' + ic('g-free') + ' 내가 만든 얼굴</span>' +
        free.map(f => '<span class="sticker">' + D.faceSvg(f, { cls: 'mini-face' }) + '</span>').join('')
      : '<span class="sr-cap">' + ic('g-free') + ' 내 마음 얼굴에서 만들면 여기 담겨</span>';
  }

  /* ─────────── 끌어 놓기 (부품·카드 공용) ───────────
   * 탭만 해도 붙는다(다섯 살에게 드래그를 강요하지 않는다).
   * 끌어서 놓으면 놓은 자리를 본다 — 얼굴 밖/친구 밖에 놓으면 그냥 제자리, 잃는 것은 없다. */
  let drag = null; // { kind, slot, id, el, sx, sy, moving, onPick }
  function partDown(ev, el, onPick) {
    drag = { kind: 'part', slot: el.dataset.slot, id: el.dataset.part, el, sx: ev.clientX, sy: ev.clientY, moving: false, onPick };
  }
  function cardDown(ev, el) {
    if (!cur || cur.locked) return;
    drag = { kind: 'card', id: el.dataset.card, el, sx: ev.clientX, sy: ev.clientY, moving: false };
  }
  function onMove(ev) {
    if (!drag) return;
    const dx = ev.clientX - drag.sx, dy = ev.clientY - drag.sy;
    if (!drag.moving && Math.hypot(dx, dy) > 10) {
      drag.moving = true;
      drag.el.classList.add('lift');
      const g = $('drag-ghost');
      g.innerHTML = drag.kind === 'part'
        ? '<span class="ghost-part">' + partChipSvg(drag.slot, drag.id) + '</span>'
        : '<span class="ghost-card">' + drag.el.innerHTML + '</span>';
      g.hidden = false;
    }
    if (drag.moving) {
      const g = $('drag-ghost');
      g.style.left = ev.clientX + 'px';
      g.style.top = ev.clientY + 'px';
      hoverTarget(drag.kind, ev.clientX, ev.clientY);
    }
  }
  function onUp(ev) {
    if (!drag) return;
    const d = drag; drag = null;
    d.el.classList.remove('lift');
    $('drag-ghost').hidden = true;
    clearHover();
    if (!d.moving) {                       // 탭 — 그대로 붙는다
      if (d.kind === 'part') d.onPick(d.slot, d.id); else giveCard(d.id);
      return;
    }
    if (d.kind === 'part') {
      if (overTarget('face', ev.clientX, ev.clientY)) d.onPick(d.slot, d.id);
    } else {
      if (overTarget('friend', ev.clientX, ev.clientY)) giveCard(d.id);
    }
  }
  function targetEl(kind) {
    if (kind === 'friend') return $('scene-card');
    return screenId === 'scr-free' ? $('free-face') : $('face-box');
  }
  function overTarget(kind, x, y) {
    const el = targetEl(kind);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }
  function hoverTarget(kind, x, y) {
    const el = targetEl(kind === 'part' ? 'face' : 'friend');
    if (el) el.classList.toggle('hover', overTarget(kind === 'part' ? 'face' : 'friend', x, y));
  }
  function clearHover() { document.querySelectorAll('.hover').forEach(el => el.classList.remove('hover')); }

  /* ─────────── 색종이 축하 ─────────── */
  function burstConfetti() {
    const box = $('confetti');
    box.innerHTML = '';
    const colors = ['#F79EB4', '#FFE08A', '#9FD3E8', '#C8E6C2', '#D5CDF0', '#FFD3E4'];
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

  /* ─────────── 초기화 ─────────── */
  function init() {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());

    document.querySelectorAll('[data-go]').forEach(b => {
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); showScreen(b.dataset.go); });
    });
    $('btn-play-back').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); openList(D.groupDef(cur.scene.group));
    });
    $('btn-listen').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      if (!cur) return;
      if (cur.locked) {
        const c = cur.scene.cards.find(x => x.id === cur.helped);
        A.speak(c ? c.reply.join(' ') : cur.scene.line);
        return;
      }
      if (filledCount(cur.sel) < 3) { A.speak(cur.scene.line + ' 지금 어떤 마음일까?'); return; }
      A.speak('무엇을 해 줄까? 카드를 하나 골라 친구에게 줘 봐.');
    });
    $('btn-free-save').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); saveFree(); });
    $('reward-next').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on'); nextScene();
    });
    $('reward-close').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on');
      openList(D.groupDef(cur.scene.group));
    });

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', () => {
      if (drag) { drag.el.classList.remove('lift'); $('drag-ghost').hidden = true; clearHover(); drag = null; }
    });

    renderHome();
  }
  init();

  /* ─────────── 종단 테스트용 ─────────── */
  function debug() {
    return {
      screen: screenId,
      stars: P.stars(),
      group: cur ? cur.scene.group : null,
      sceneId: cur ? cur.scene.id : null,
      mood: cur ? cur.scene.mood : null,
      sel: cur ? Object.assign({}, cur.sel) : null,
      filled: cur ? filledCount(cur.sel) : null,
      cardCount: document.querySelectorAll('#help-cards .help-card').length,
      cardsShown: !$('help-cards').hidden,
      helped: cur ? cur.helped : null,
      locked: cur ? cur.locked : null,
      done: cur ? P.isDone(cur.scene.id) : null,
      bookFace: cur ? P.faceOf(cur.scene.mood) : null,
      bookCount: P.bookCount(),
      freeSel: Object.assign({}, freeSel),
      freeCount: P.freeList().length,
    };
  }
  return {
    debug,
    _openScene: (id) => { const s = D.sceneById(id); if (s) openPlay(s); },
    _put: (slot, id) => putPart(slot, id),
    _give: (cardId) => giveCard(cardId),
    _freePut: (slot, id) => {
      freeSel[slot] = id; renderFreeFace(); markChosen($('free-parts'), freeSel);
    },
  };
})();
