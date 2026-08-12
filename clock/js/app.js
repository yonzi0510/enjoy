/* 앱 셸 — 홈(방 셋) → 방① 단계 넷 → 판 목록(단계별 10) → 뻐꾸기 시계 놀이.
 *
 * 놀이는 하나뿐이다: **긴바늘을 돌려 목표 시각을 만든다.** 맞으면 문이 열리고
 * 새가 나와 「네 시!」 한마디를 한다. 그 한마디뿐이다 — 설명을 붙이지 않는다.
 *
 * ── 이번 차수에 없는 것 (다음 사람 몫) ──────────────────────────────
 * 방② 잠꾸러기 깨우기 · 방③ 내 하루 만들기는 홈에 카드만 두고 「곧 만들어요」다.
 * 얹을 때는 `openRoom()` 의 갈래만 늘리면 된다 — 시계 자체는 js/clock.js 가 다 한다.
 *
 * ── 무벌점 ──────────────────────────────────────────────────────────
 * 틀린 시각에 놓아도 잃는 것이 없다. 문이 안 열릴 뿐이고, 판이 잠기지도 별이 줄지도
 * 않으며 정답을 공개하고 넘기지도 않는다. 몇 번 빗나가면 **힌트가 커진다**:
 *   2번 — 목표 숫자가 반짝인다 · 4번 — 흐린 안내 바늘이 함께 선다.
 * 제한 시간·카운트다운은 넣지 않는다. 시계는 아이 세계에서 이미 「놀이를 끝내는 물건」이다.
 */
window.App = (() => {
  const D = window.ClockData;
  const E = window.ClockEngine;
  const A = window.Audio2;
  const P = window.Progress;
  const $ = id => document.getElementById(id);

  const ic = (id, cls) => '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#ck-' + id + '"/></svg>';

  /* ─────────── 화면 전환 ─────────── */
  let screenId = 'scr-home';
  function showScreen(id) {
    A.stop();
    screenId = id;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id === 'scr-home') renderHome();
    if (id === 'scr-stages') renderStages();
    if (id === 'scr-dex') renderDex();
  }

  /* ─────────── 홈: 방 셋 ─────────── */
  function renderHome() {
    $('home-stars').textContent = P.stars();
    const menu = $('menu');
    menu.innerHTML = '';
    D.ROOMS.forEach(rm => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-card ' + rm.cls + (rm.ready ? '' : ' soon');
      b.dataset.room = rm.id;
      // 아직 안 만든 방은 설명("곧 만들어요") 한 줄로 끝낸다 — 진행 줄까지 같은 말을 되풀이하면
      // 글을 못 읽는 아이에게도 어수선하고, 부모님 눈에는 오류처럼 보인다
      let prog = '';
      if (rm.ready) {
        const ids = D.BOARDS.map(x => x.id);
        const done = P.doneCount(ids);
        prog = done ? ic('star') + ' ' + done + ' / ' + ids.length : '처음이야!';
      }
      b.innerHTML =
        '<span class="mc-icon">' + roomIcon(rm) + '</span>' +
        '<span class="mc-name">' + rm.name + '</span>' +
        '<span class="mc-desc">' + rm.desc + '</span>' +
        (prog ? '<span class="mc-prog">' + prog + '</span>' : '');
      b.addEventListener('click', ev => { ev.preventDefault(); openRoom(rm); });
      menu.appendChild(b);
    });
  }
  // 방 카드 그림 — ① 은 진짜 시계판(3시), ②③ 은 잠긴 표시
  function roomIcon(rm) {
    if (!rm.ready) return ic('soon', 'ic-soon');
    return E.faceSVG({ total: 180, interactive: false });
  }

  function openRoom(rm) {
    if (!rm.ready) { A.sfx.tap(); toast('곧 만들어요'); return; }
    A.sfx.tap();
    curRoom = rm;
    showScreen('scr-stages');
  }

  /* ─────────── 방① : 단계 넷 ─────────── */
  let curRoom = D.ROOMS[0];
  function renderStages() {
    $('stages-title').innerHTML = ic('clock', 'ic-title') + ' ' + curRoom.name;
    $('dex-count').textContent = P.birdCount() + ' / 12';
    const box = $('stages');
    box.innerHTML = '';
    D.STAGES.forEach(st => {
      const ids = D.boardsOf(st.id).map(x => x.id);
      const done = P.doneCount(ids);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-card ' + st.cls;
      b.dataset.stage = st.id;
      b.innerHTML =
        '<span class="mc-icon">' + E.faceSVG({ total: D.boardsOf(st.id)[0].minutes, interactive: false }) + '</span>' +
        '<span class="mc-name">' + st.name + '</span>' +
        '<span class="mc-desc">' + st.desc + '</span>' +
        '<span class="mc-prog">' + (done ? ic('star') + ' ' + done + ' / ' + ids.length : '처음이야!') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openList(st); });
      box.appendChild(b);
    });
  }

  /* ─────────── 판 목록 ─────────── */
  let curStage = null;
  function openList(st) {
    curStage = st;
    $('list-title').innerHTML = ic('clock', 'ic-title') + ' ' + st.name;
    const list = D.boardsOf(st.id);
    $('list-count').textContent = P.doneCount(list.map(x => x.id)) + ' / ' + list.length;
    const box = $('list');
    box.innerHTML = '';
    list.forEach((bd, i) => {
      const done = P.isDone(bd.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'round-card' + (done ? ' done' : '');
      b.dataset.id = bd.id;
      b.innerHTML =
        '<span class="rd-no">' + (i + 1) + '</span>' +
        '<span class="rd-face">' + E.faceSVG({ total: bd.minutes, interactive: false, numbers: false }) + '</span>' +
        '<span class="rd-badge">' + (done ? ic('check') : ic('clock')) + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPlay(bd); });
      box.appendChild(b);
    });
    showScreen('scr-list');
  }

  /* ─────────── 놀이 ─────────── */
  let cur = null;   // { board, unit, ctrl, misses, locked }
  let winTimer = null;

  function openPlay(bd) {
    if (winTimer) { clearTimeout(winTimer); winTimer = null; }
    if (cur && cur.ctrl) cur.ctrl.destroy();
    const st = D.stageDef(bd.stage);
    cur = { board: bd, unit: st.unit, ctrl: null, misses: 0, locked: false };

    $('play-title').innerHTML = ic('clock', 'ic-title') + ' ' + st.name;

    // 목표 제시 — 1단계는 큰 시계 그림, 2단계 이후는 숫자(와 소리)
    const face = $('goal-face'), digit = $('goal-digit');
    if (bd.stage === 1) {
      face.innerHTML = E.faceSVG({ total: bd.minutes, interactive: false });
      face.style.display = '';
      digit.textContent = '';
      digit.style.display = 'none';
      $('goal-card').className = 'goal-card pic';
    } else {
      face.innerHTML = '';
      face.style.display = 'none';
      digit.textContent = D.digitOf(bd.minutes);
      digit.style.display = '';
      $('goal-card').className = 'goal-card num';
    }

    // 문을 닫고 새를 치운다
    $('door-box').classList.remove('open');
    $('door-bird').innerHTML = '';

    cur.ctrl = E.attach($('dial'), {
      unit: st.unit,
      total: D.startOf(bd),
      interactive: true,
      onTick: () => A.sfx.tick(),
      onChange: (total, info) => settle(total, info),
    });

    showScreen('scr-play');
    // 2단계 이후는 목표를 소리로도 준다 — **시각 한마디뿐이다**
    if (bd.stage > 1) setTimeout(() => { if (cur && !cur.locked) A.speak(D.readTime(bd.minutes)); }, 320);
  }

  // 손을 뗐다(또는 숫자를 눌렀다) — 여기서 판정한다
  function settle(total, info) {
    if (!cur || cur.locked) return;
    if (info && info.moved === false) return;    // 툭 건드리기만 한 것은 안 센다
    if (total === cur.board.minutes) { win(); return; }
    A.sfx.snap();
    miss();
  }

  /* 빗나감 — 잃는 것이 없다. 힌트만 커진다. */
  function miss() {
    cur.misses++;
    A.sfx.miss();
    if (cur.misses >= 2) cur.ctrl.setHint(D.hour12(cur.board.minutes));
    if (cur.misses >= 4) cur.ctrl.setGhost(cur.board.minutes);
  }

  /* ─────────── 맞췄다 — 문이 열리고 새가 나온다 ─────────── */
  function win() {
    cur.locked = true;
    cur.ctrl.setInteractive(false);
    cur.ctrl.setHint(null);
    cur.ctrl.setGhost(null);

    const bd = cur.board;
    const h = D.hour12(bd.minutes);
    const first = !P.isDone(bd.id);
    P.markDone(bd.id);
    P.addStar(1);
    P.meetBird(h);
    if (window.Pet) Pet.awardSnack(1);
    if (first && window.Pet) {
      const ids = D.boardsOf(bd.stage).map(x => x.id);
      if (P.doneCount(ids) >= ids.length) Pet.awardMeal(1);
    }

    A.sfx.snap();
    $('door-bird').innerHTML = D.birdSVG(h, 'door' + h);
    $('door-box').classList.add('open');
    setTimeout(() => A.sfx.door(), 60);
    setTimeout(() => { A.sfx.cuckoo(); A.sfx.bell(); }, 420);
    // 「네 시!」 — 이 앱이 하는 말은 이것뿐이다
    setTimeout(() => A.speak(D.readTime(bd.minutes) + '!'), 620);
    burstConfetti();
    winTimer = setTimeout(() => showReward(), 1700);
  }

  /* ─────────── 보상 오버레이 ─────────── */
  function showReward() {
    const bd = cur.board;
    const h = D.hour12(bd.minutes);
    $('reward-face').innerHTML = D.birdSVG(h, 'rw' + h);
    $('reward-praise').textContent = D.readTime(bd.minutes);
    $('reward').classList.add('on');
  }
  function nextBoard() {
    const list = D.boardsOf(cur.board.stage);
    const idx = list.findIndex(x => x.id === cur.board.id);
    for (let k = 1; k <= list.length; k++) {
      const cand = list[(idx + k) % list.length];
      if (!P.isDone(cand.id)) { openPlay(cand); return; }
    }
    openList(D.stageDef(cur.board.stage));
  }

  /* ─────────── 친구 도감 12칸 ─────────── */
  function renderDex() {
    const box = $('dex-grid');
    box.innerHTML = '';
    $('dex-total').textContent = P.birdCount() + ' / 12';
    for (let h = 1; h <= 12; h++) {
      const got = P.hasBird(h);
      const cell = document.createElement('div');
      cell.className = 'dex-cell' + (got ? ' got' : '');
      cell.dataset.h = h;
      cell.innerHTML =
        '<span class="dx-pic">' + (got ? D.birdSVG(h, 'dx' + h) : ic('soon', 'ic-soon')) + '</span>' +
        '<span class="dx-time">' + h + '시</span>';
      box.appendChild(cell);
    }
  }

  /* ─────────── 쪽지 ─────────── */
  let toastTimer = null;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('on');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('on'), 1600);
  }

  /* ─────────── 색종이 축하 ─────────── */
  function burstConfetti() {
    const box = $('confetti');
    box.innerHTML = '';
    const colors = ['#E8A33D', '#5FB26E', '#5CB8E8', '#FF8FB0', '#B57CE0', '#FFD34E'];
    for (let i = 0; i < 30; i++) {
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
      ev.preventDefault(); A.sfx.tap();
      if (winTimer) { clearTimeout(winTimer); winTimer = null; }
      openList(D.stageDef(cur.board.stage));
    });
    $('btn-dex').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); showScreen('scr-dex'); });
    $('btn-listen').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      if (!cur) return;
      // 말은 시각 한마디뿐 — 다 맞췄으면 느낌표를 붙일 뿐이다
      A.speak(D.readTime(cur.board.minutes) + (cur.locked ? '!' : ''));
    });
    $('reward-next').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on'); nextBoard();
    });
    $('reward-close').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on');
      openList(D.stageDef(cur.board.stage));
    });

    renderHome();
  }
  init();

  /* ─────────── 종단 테스트용 (읽기만 한다) ─────────── */
  function debug() {
    const t = cur && cur.ctrl ? cur.ctrl.total() : null;
    return {
      screen: screenId,
      stars: P.stars(),
      room: curRoom ? curRoom.id : null,
      stage: cur ? cur.board.stage : null,
      unit: cur ? cur.unit : null,
      boardId: cur ? cur.board.id : null,
      target: cur ? cur.board.minutes : null,
      total: t,
      minutes: t === null ? null : E.minuteOf(t),
      hour: t === null ? null : E.hourOf(t),
      hour12: t === null ? null : E.hour12(t),
      minuteAngle: t === null ? null : E.minuteAngle(t),
      hourAngle: t === null ? null : E.hourAngle(t),
      live: cur && cur.ctrl ? cur.ctrl.live() : null,
      dragging: cur && cur.ctrl ? cur.ctrl.dragging() : false,
      misses: cur ? cur.misses : null,
      locked: cur ? cur.locked : null,
      opened: document.getElementById('door-box').classList.contains('open'),
      done: cur ? P.isDone(cur.board.id) : null,
      birds: P.birdCount(),
      reward: document.getElementById('reward').classList.contains('on'),
    };
  }
  return { debug };
})();
