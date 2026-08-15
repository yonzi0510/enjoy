/* 앱 셸 — 홈(방 셋) → 방마다 제 갈래.
 *
 *   방① 뻐꾸기 시계   단계 넷 → 판 40 → 긴바늘을 돌려 목표 시각을 만든다.
 *                     맞으면 문이 열리고 새가 나와 「네 시!」 한마디를 한다.
 *   방② 잠꾸러기 깨우기  단계 둘 → 판 24 → 알람 바늘을 맞추고 큰 단추를 누른다.
 *                     밤이 되고 바늘이 째깍째깍 돌다가 알람에 닿으면 따르릉, 친구가 깬다.
 *   방③ 내 하루 만들기  판이 없다. 하루 카드를 시계 둘레 열두 자리에 놓고 ▶ 로 재생한다.
 *
 * ── 세 방의 성질이 다르다 (섞지 마라) ────────────────────────────────
 *   ① 은 **맞고 틀림이 있다**(단, 틀려도 잃는 것이 없다 — 힌트만 커진다).
 *   ② 는 **틀린 시각이 아예 없다**. 어디에 맞춰도 종은 울리고 친구는 깨어난다.
 *      카드와 같으면 폭죽이 더 터지고 앨범에 담길 뿐이다.
 *      "늦었어"·"지각이야" 류의 말은 데이터에도 코드에도 없다.
 *   ③ 은 **정답이 없다**(heart/ 와 같은 결). answer·correct·score 를 만들지 마라.
 *      이상하게 놓을수록 웃긴 장면이 나오는 것이 이 방의 전부다.
 *
 * ── 시간은 아이가 눌렀을 때만 흐른다 ────────────────────────────────
 * 방②의 째깍째깍도 방③의 재생도 **단추를 눌러야** 시작한다. 저절로 흐르는
 * 카운트다운·제한 시간은 어디에도 없다. 시계는 아이 세계에서 이미
 * 「놀이를 끝내는 물건」이라, 여기서까지 재촉하면 안 된다.
 *
 * ── 말 ──────────────────────────────────────────────────────────────
 * 시각을 알려 주는 자리에서는 **시각 한마디뿐**이다(부모님 요청). 친구 대사·카드 이름은
 * 시각 안내가 아니라 **장면의 일부**라서 따로 발화한다. 계약은 ClockData.SPEECH 에 있다.
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
    // 화면을 떠나면 흐르던 것은 멈춘다 — 안 보이는 데서 시간이 흐르면 안 된다
    if (id !== 'scr-wake') stopWakeRun();
    if (id !== 'scr-day') stopDayPlay();
    screenId = id;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id === 'scr-home') renderHome();
    if (id === 'scr-stages') renderStages();
    if (id === 'scr-dex') renderDex();
    if (id === 'scr-pals') renderPals();
    if (id === 'scr-days') renderDays();
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
      // 방마다 세는 것이 다르다 — ③ 은 정답이 없으니 「몇 벌 만들었나」만 센다
      const prog = rm.ready ? roomProgress(rm) : '';
      b.innerHTML =
        '<span class="mc-icon">' + roomIcon(rm) + '</span>' +
        '<span class="mc-name">' + rm.name + '</span>' +
        '<span class="mc-desc">' + rm.desc + '</span>' +
        (prog ? '<span class="mc-prog">' + prog + '</span>' : '');
      b.addEventListener('click', ev => { ev.preventDefault(); openRoom(rm); });
      menu.appendChild(b);
    });
  }
  /* 방마다 세는 것 — ③ 에는 완성이 없다.
   * 「몇 개 맞췄나」를 방③ 에도 붙이면 그 순간 정답이 생긴다. 그래서 만든 벌 수만 센다. */
  function roomProgress(rm) {
    if (rm.id === 'cuckoo') {
      const ids = D.BOARDS.map(x => x.id);
      const done = P.doneCount(ids);
      return done ? ic('star') + ' ' + done + ' / ' + ids.length : '처음이야!';
    }
    if (rm.id === 'wake') {
      const ids = D.WAKE_BOARDS.map(x => x.id);
      const done = P.wdoneCount(ids);
      return done ? ic('star') + ' ' + done + ' / ' + ids.length : '처음이야!';
    }
    const n = P.dayCount();
    return n ? ic('keep') + ' ' + n + ' 벌' : '처음이야!';
  }

  // 방 카드 그림 — ① 진짜 시계판(3시) · ② 알람 종 · ③ 해와 달 한 바퀴
  function roomIcon(rm) {
    if (!rm.ready) return ic('soon', 'ic-soon');
    if (rm.id === 'wake') return ic('bell', 'ic-room');
    if (rm.id === 'day') return ic('daily', 'ic-room');
    return E.faceSVG({ total: 180, interactive: false });
  }

  function openRoom(rm) {
    if (!rm.ready) { A.sfx.tap(); toast('곧 만들어요'); return; }
    A.sfx.tap();
    curRoom = rm;
    // 방③ 에는 단계도 판도 없다 — 바로 하루를 만들러 간다
    if (rm.id === 'day') { openDay(); return; }
    showScreen('scr-stages');
  }

  /* ─────────── 단계 고르기 (방① 넷 · 방② 둘) ─────────── */
  let curRoom = D.ROOMS[0];
  const isWake = () => curRoom && curRoom.id === 'wake';
  function renderStages() {
    const wake = isWake();
    $('stages-title').innerHTML = ic(wake ? 'bell' : 'clock', 'ic-title') + ' ' + curRoom.name;
    $('dex-count').textContent = wake ? (P.palCount() + ' / ' + D.SLEEPERS.length) : (P.birdCount() + ' / 12');
    const box = $('stages');
    box.innerHTML = '';
    (wake ? D.WAKE_STAGES : D.STAGES).forEach(st => {
      const list = wake ? D.wakeBoardsOf(st.id) : D.boardsOf(st.id);
      const ids = list.map(x => x.id);
      const done = wake ? P.wdoneCount(ids) : P.doneCount(ids);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-card ' + st.cls;
      b.dataset.stage = st.id;
      b.innerHTML =
        '<span class="mc-icon">' + E.faceSVG({ total: wake ? list[0].ask : list[0].minutes, interactive: false }) + '</span>' +
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
    const wake = isWake();
    $('list-title').innerHTML = ic(wake ? 'bell' : 'clock', 'ic-title') + ' ' + st.name;
    const list = wake ? D.wakeBoardsOf(st.id) : D.boardsOf(st.id);
    const ids = list.map(x => x.id);
    $('list-count').textContent = (wake ? P.wdoneCount(ids) : P.doneCount(ids)) + ' / ' + list.length;
    const box = $('list');
    box.innerHTML = '';
    list.forEach((bd, i) => {
      const done = wake ? P.isWDone(bd.id) : P.isDone(bd.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'round-card' + (done ? ' done' : '');
      b.dataset.id = bd.id;
      // 방② 칸에는 **자는 친구**가 앉는다 — 시계 그림만 스물넷이면 아이가 판을 못 가린다
      const pic = wake
        ? '<span class="rd-pal">' + D.sleeperSVG(bd.pal, 'sleep', 'ls' + bd.id) + '</span>' +
          '<span class="rd-ask">' + D.digitOf(bd.ask) + '</span>'
        : '<span class="rd-face">' + E.faceSVG({ total: bd.minutes, interactive: false, numbers: false }) + '</span>';
      b.innerHTML =
        '<span class="rd-no">' + (i + 1) + '</span>' + pic +
        '<span class="rd-badge">' + (done ? ic('check') : ic(wake ? 'bell' : 'clock')) + '</span>';
      b.addEventListener('click', ev => {
        ev.preventDefault(); A.sfx.tap();
        if (wake) openWake(bd); else openPlay(bd);
      });
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
    // 목표를 소리로도 준다(1단계도 포함) — **시각 한마디뿐이다**.
    // 전에는 2단계 이후만 말해 줬다 — 1단계는 그림만 보여주고 말이 없어서
    // 아이가 「듣기」 단추를 직접 눌러야만 시각을 들을 수 있었다(부모님 지적).
    setTimeout(() => { if (cur && !cur.locked) A.speak(D.readTime(bd.minutes)); }, 320);
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

  /* ══════════════════════════════════════════════════════════════════
   *                방② ⏰ 잠꾸러기 깨우기
   * ══════════════════════════════════════════════════════════════════
   * ⚠️ **여기에는 판정이 없다.** 아이가 알람을 어디에 맞추든 종은 울리고 친구는 깬다.
   *    카드와 같은지는 「폭죽을 더 터뜨리고 앨범에 담을지」만 가른다.
   *    맞추지 못했다고 잠기는 것도, 줄어드는 것도, 넘겨 버리는 것도 없다.
   * ⚠️ 시간은 **단추를 눌렀을 때만** 흐른다. 저절로 도는 시계를 만들지 마라.
   */
  let wcur = null;        // { board, unit, ctrl, phase, alarm, matched, scene, seq }
  let wakeRaf = null, wakeTickTimer = null, wakeT1 = null, wakeT2 = null;

  function stopWakeRun() {
    if (wakeRaf) { cancelAnimationFrame(wakeRaf); wakeRaf = null; }
    if (wakeTickTimer) { clearInterval(wakeTickTimer); wakeTickTimer = null; }
    if (wakeT1) { clearTimeout(wakeT1); wakeT1 = null; }
    if (wakeT2) { clearTimeout(wakeT2); wakeT2 = null; }
  }

  function openWake(bd) {
    stopWakeRun();
    if (wcur && wcur.ctrl) wcur.ctrl.destroy();
    const st = D.wakeStageDef(bd.stage);
    wcur = { board: bd, unit: st.unit, ctrl: null, phase: 'set', alarm: null, matched: false, scene: null, seq: null };

    $('wake-title').innerHTML = ic('bell', 'ic-title') + ' ' + st.name;
    $('pals-count').textContent = P.palCount();

    // 그림 카드 — 시계 그림에 그 시각이 굵게. 친구가 놓고 잔 부탁이다.
    $('ask-face').innerHTML = E.faceSVG({ total: bd.ask, interactive: false });
    $('ask-digit').textContent = D.digitOf(bd.ask);

    const room = $('wake-room');
    room.className = 'wake-room';
    $('wake-pal').innerHTML = D.sleeperSVG(bd.pal, 'sleep', 'wk-sleep');
    $('wake-say').textContent = '';
    $('btn-ring').hidden = false;
    $('btn-ring').disabled = false;
    $('btn-wake-again').hidden = true;
    $('btn-wake-next').hidden = true;

    /* 알람 바늘 — 시계 엔진 그대로다. 손을 떼도 **아무 판정을 하지 않는다.** */
    wcur.ctrl = E.attach($('wdial'), {
      unit: st.unit,
      total: D.wakeStartOf(bd),
      interactive: true,
      onTick: () => A.sfx.tick(),
      onChange: () => A.sfx.snap(),
    });

    showScreen('scr-wake');
  }

  /* 큰 단추 — 여기서만 시간이 흐르기 시작한다 */
  function wakeRing() {
    if (!wcur || wcur.phase !== 'set') return;
    const alarm = wcur.ctrl.total();
    wcur.alarm = alarm;
    wcur.phase = 'run';
    wcur.ctrl.setInteractive(false);
    wcur.ctrl.setGhost(alarm);          // 알람 자리에 흐린 표식이 남는다
    $('btn-ring').disabled = true;
    $('wake-room').classList.add('night');
    A.sfx.night();

    const from = D.wakeRunFrom(alarm);  // 알람보다 세 시간 앞에서 출발
    wcur.ctrl.setTotal(from);
    const t0 = (window.performance && performance.now) ? performance.now() : Date.now();
    const dur = 2200;
    const step = () => {
      if (!wcur || wcur.phase !== 'run') return;
      const now = (window.performance && performance.now) ? performance.now() : Date.now();
      const k = Math.min(1, (now - t0) / dur);
      wcur.ctrl.setTotal(from + D.WAKE_RUN * k);
      if (k < 1) { wakeRaf = requestAnimationFrame(step); return; }
      wakeRaf = null;
      wcur.ctrl.setTotal(alarm);
      wakeBell();
    };
    wakeRaf = requestAnimationFrame(step);
    wakeTickTimer = setInterval(() => A.sfx.tick(), 130);
  }

  // 따르릉!
  function wakeBell() {
    if (!wcur) return;
    wcur.phase = 'ring';
    if (wakeTickTimer) { clearInterval(wakeTickTimer); wakeTickTimer = null; }
    A.sfx.ring();
    const room = $('wake-room');
    room.classList.remove('night');
    room.classList.add('morning');
    wakeT1 = setTimeout(() => { A.sfx.morning(); wakeWokeUp(); }, 820);
  }

  /* 친구가 깨어난다 — **언제나** 깨어난다.
   * 몇 번째로 깨우는가에 따라 장면이 다르다(놀람 → 대비 → 기다림 → 신남). */
  function wakeWokeUp() {
    if (!wcur) return;
    wcur.phase = 'awake';
    const bd = wcur.board;
    const seq = P.wokeCount(bd.pal);          // 0 부터 — 이번이 몇 번째인가
    const scene = D.wakeSceneOf(bd.pal, seq);
    P.bumpWoke(bd.pal);
    wcur.scene = scene;
    wcur.seq = seq;

    $('wake-pal').innerHTML = D.sleeperSVG(bd.pal, scene.pose, 'wk-' + seq);
    $('wake-say').textContent = scene.say;
    A.sfx.yawn();
    /* 말 — 시각 한마디, 그리고 **따로** 친구의 한마디.
     * 둘을 한 문장으로 붙이지 마라("일곱 시에 일어났어!"). 시각 안내는 언제나 시각뿐이다. */
    wakeT2 = setTimeout(() => A.speakSeq([D.readTime(wcur.alarm), scene.say]), 300);

    // 카드와 같은 시각이면 — 폭죽이 더 터지고 앨범에 담긴다. 다르면 그것이 없을 뿐이다.
    const matched = wcur.alarm === bd.ask;
    wcur.matched = matched;
    if (matched) {
      const first = !P.isWDone(bd.id);
      P.markWDone(bd.id);
      P.addStar(1);
      P.keepPal(bd.pal);
      if (window.Pet) Pet.awardSnack(1);
      if (first && window.Pet) {
        const ids = D.wakeBoardsOf(bd.stage).map(x => x.id);
        if (P.wdoneCount(ids) >= ids.length) Pet.awardMeal(1);
      }
      burstConfetti();
      A.sfx.bell();
      $('pals-count').textContent = P.palCount();
    }
    $('btn-ring').hidden = true;
    $('btn-wake-again').hidden = false;
    $('btn-wake-next').hidden = false;
  }

  // 다음 판 — 아직 카드 시각으로 못 깨운 판을 먼저 준다(잠그는 것이 아니라 고르는 순서다)
  function nextWakeBoard() {
    const list = D.wakeBoardsOf(wcur.board.stage);
    const idx = list.findIndex(x => x.id === wcur.board.id);
    for (let k = 1; k <= list.length; k++) {
      const cand = list[(idx + k) % list.length];
      if (!P.isWDone(cand.id)) { openWake(cand); return; }
    }
    openList(D.wakeStageDef(wcur.board.stage));
  }

  /* ─────────── 방② 앨범 ─────────── */
  function renderPals() {
    const box = $('pals-grid');
    box.innerHTML = '';
    $('pals-total').textContent = P.palCount() + ' / ' + D.SLEEPERS.length;
    D.SLEEPERS.forEach(p => {
      const got = P.hasPal(p.id);
      const cell = document.createElement('div');
      cell.className = 'dex-cell' + (got ? ' got' : '');
      cell.dataset.pal = p.id;
      cell.innerHTML =
        '<span class="dx-pic">' + (got ? D.sleeperSVG(p.id, 'dance', 'pl' + p.id) : ic('soon', 'ic-soon')) + '</span>' +
        '<span class="dx-time">' + p.name + '</span>';
      box.appendChild(cell);
    });
  }

  /* ══════════════════════════════════════════════════════════════════
   *                방③ 🍚 내 하루 만들기
   * ══════════════════════════════════════════════════════════════════
   * ⚠️ **정답이 없다.** 이 아래에 「맞나 보는」 코드를 넣지 마라 —
   *    어떤 카드를 어느 자리에 놓아도 그냥 놓인다. 별도 점수도 없다.
   *    tools/validate-data.js 와 tools/e2e.mjs 가 둘 다 그것을 지킨다.
   * 웃음은 daySceneSVG 가 만든다: 낮 것을 밤 자리에 놓으면 캄캄해지고 부엉이가 오고,
   * 잠을 낮에 놓으면 해가 쨍쨍하고, 밥을 여러 자리에 놓으면 배가 빵빵해진다.
   */
  let dcur = null;      // { slots, ctrl, playing, sel, awarded }
  let dayRaf = null, dayTimer = null, dayDrag = null;
  const hourTotal = h => (h % 12) * 60;

  function stopDayPlay() {
    if (dayRaf) { cancelAnimationFrame(dayRaf); dayRaf = null; }
    if (dayTimer) { clearTimeout(dayTimer); dayTimer = null; }
    if (dcur && dcur.playing) {
      dcur.playing = false;
      A.stop();                        // 하던 말도 함께 멈춘다
      $('day-show').hidden = true;
      $('ds-pic').innerHTML = '';
      $('day-tray').hidden = false;
      setPlayLabel(false);
      document.querySelectorAll('#day-ring .day-slot').forEach(el => el.classList.remove('now'));
    }
  }

  function openDay() {
    stopDayPlay();
    if (dcur && dcur.ctrl) dcur.ctrl.destroy();
    dcur = { slots: P.work(), ctrl: null, playing: false, sel: null, awarded: '' };
    $('day-title').innerHTML = ic('daily', 'ic-title') + ' 내 하루';
    $('days-count').textContent = P.dayCount();

    dcur.ctrl = E.attach($('day-dial'), { total: hourTotal(D.DAY_ORDER[0]), interactive: false });
    buildDayRing();
    buildDayTray();
    $('day-show').hidden = true;
    $('day-tray').hidden = false;
    showScreen('scr-day');
  }

  /* 시계 둘레 열두 자리 — 자리는 좌표로 놓는다(회전을 쓰지 않는다). */
  function buildDayRing() {
    const ring = $('day-ring');
    ring.querySelectorAll('.day-slot').forEach(el => el.remove());
    for (let h = 1; h <= 12; h++) {
      const p = E.polar(50, 50, 40, h * 30);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'day-slot' + (D.isNightHour(h) ? ' night' : '');
      b.dataset.h = h;
      b.style.left = p[0] + '%';
      b.style.top = p[1] + '%';
      b.addEventListener('click', ev => { ev.preventDefault(); slotTap(h); });
      ring.appendChild(b);
    }
    paintDayRing();
  }
  function paintDayRing() {
    document.querySelectorAll('#day-ring .day-slot').forEach(el => {
      const h = +el.dataset.h;
      const id = dcur.slots[h];
      el.classList.toggle('filled', !!id);
      el.innerHTML = id
        ? '<span class="dsl-pic">' + dayIcon(id) + '</span>'
        : '<span class="dsl-num">' + h + '</span>';
    });
  }
  // 카드 그림 한 개 — 장면 그림에서 소품만 잘라 쓴다(같은 그림을 두 번 그리지 않게)
  function dayIcon(id) {
    return '<svg viewBox="68 30 52 52" width="100%" xmlns="http://www.w3.org/2000/svg">' + D.dayPropSVG(id) + '</svg>';
  }

  function buildDayTray() {
    const box = $('day-tray');
    box.innerHTML = '';
    D.DAY_CARDS.forEach(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'day-card';
      b.dataset.id = c.id;
      b.innerHTML = '<span class="dc-pic">' + dayIcon(c.id) + '</span><span class="dc-name">' + c.name + '</span>';
      b.addEventListener('pointerdown', ev => cardDown(ev, b));
      b.addEventListener('click', ev => ev.preventDefault());
      box.appendChild(b);
    });
  }
  function setDaySel(id) {
    dcur.sel = id;
    document.querySelectorAll('#day-tray .day-card').forEach(el => el.classList.toggle('sel', el.dataset.id === id));
  }

  /* 놓기 — **언제나 놓인다.** 맞는 자리도 틀린 자리도 없다. */
  function placeCard(h, id) {
    if (!dcur || dcur.playing) return;
    dcur.slots[h] = id;
    P.setWork(dcur.slots);
    paintDayRing();
    A.sfx.pop();
  }
  function slotTap(h) {
    if (!dcur || dcur.playing) return;
    if (dcur.sel) { placeCard(h, dcur.sel); return; }
    if (dcur.slots[h]) {           // 고른 카드가 없으면 그 자리를 비운다
      delete dcur.slots[h];
      P.setWork(dcur.slots);
      paintDayRing();
      A.sfx.off();
    } else A.sfx.tap();
  }

  function cardDown(ev, el) {
    if (!dcur || dcur.playing) return;
    ev.preventDefault();          // 그림을 브라우저가 끌어가지 않게
    setDaySel(el.dataset.id);
    A.sfx.tap();
    dayDrag = { id: el.dataset.id, el, sx: ev.clientX, sy: ev.clientY, moving: false };
  }
  function dayMove(ev) {
    if (!dayDrag) return;
    const dx = ev.clientX - dayDrag.sx, dy = ev.clientY - dayDrag.sy;
    if (!dayDrag.moving && Math.hypot(dx, dy) > 10) {
      dayDrag.moving = true;
      dayDrag.el.classList.add('lift');
      const g = $('day-ghost');
      g.innerHTML = dayIcon(dayDrag.id);
      g.hidden = false;
    }
    if (dayDrag.moving) {
      const g = $('day-ghost');
      g.style.left = ev.clientX + 'px';
      g.style.top = ev.clientY + 'px';
      const h = slotUnder(ev.clientX, ev.clientY);
      document.querySelectorAll('#day-ring .day-slot').forEach(el => el.classList.toggle('over', +el.dataset.h === h));
    }
  }
  function dayUp(ev) {
    if (!dayDrag) return;
    const d = dayDrag; dayDrag = null;
    d.el.classList.remove('lift');
    $('day-ghost').hidden = true;
    document.querySelectorAll('#day-ring .day-slot').forEach(el => el.classList.remove('over'));
    if (!d.moving) return;                    // 톡 눌렀을 뿐 — 고른 상태만 남는다
    const h = slotUnder(ev.clientX, ev.clientY);
    if (h) placeCard(h, d.id);
    /* 끌어다 놓는 것은 그 자체로 끝난 몸짓이다 — 놓고 나면 고른 상태를 푼다.
     * 안 풀면 그다음에 자리를 눌러 **빼려고 할 때 도로 놓여** 아이가 못 지운다.
     * (톡 눌러 고른 경우는 그대로 둔다 — 같은 카드를 여러 자리에 톡톡 놓을 수 있게) */
    setDaySel(null);
  }
  // 손끝 아래의 자리 — 가장 가까운 자리에 쑥 붙는다(칸을 정확히 맞출 필요가 없다)
  function slotUnder(x, y) {
    let best = 0, bd = Infinity;
    document.querySelectorAll('#day-ring .day-slot').forEach(el => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const d = Math.hypot(x - cx, y - cy);
      if (d < bd) { bd = d; best = +el.dataset.h; }
    });
    // 자리 크기의 1.2배 안쪽이면 붙는다
    const one = document.querySelector('#day-ring .day-slot');
    const lim = one ? one.getBoundingClientRect().width * 1.2 : 60;
    return bd <= lim ? best : 0;
  }

  /* ─────────── ▶ 재생 — 바늘이 돌고 장면이 차례로 뜬다 ─────────── */
  function dayPlay() {
    if (!dcur) return;
    if (dcur.playing) { stopDayPlay(); return; }
    const seq = D.DAY_ORDER.filter(h => dcur.slots[h]).map(h => ({ h, id: dcur.slots[h] }));
    if (!seq.length) { A.sfx.tap(); toast('카드를 놓아 볼까?'); return; }

    dcur.playing = true;
    setDaySel(null);
    $('day-tray').hidden = true;
    $('day-show').hidden = false;
    $('ds-pic').innerHTML = '';
    $('ds-time').textContent = '';
    setPlayLabel(true);

    let cursor = hourTotal(D.DAY_ORDER[0]);   // 다섯 시에서 시작해 한 바퀴
    let tummy = 0, i = 0;
    dcur.ctrl.setTotal(cursor);

    const glide = (to, ms, done) => {
      const from = cursor;
      const fwd = ((to - from) % 720 + 720) % 720;
      const t0 = (window.performance && performance.now) ? performance.now() : Date.now();
      const step = () => {
        if (!dcur || !dcur.playing) return;
        const now = (window.performance && performance.now) ? performance.now() : Date.now();
        const k = Math.min(1, (now - t0) / ms);
        dcur.ctrl.setTotal(from + fwd * k);
        if (k < 1) { dayRaf = requestAnimationFrame(step); return; }
        dayRaf = null;
        cursor = to;
        done();
      };
      dayRaf = requestAnimationFrame(step);
    };

    const next = () => {
      if (!dcur || !dcur.playing) return;
      if (i >= seq.length) {
        // 마지막으로 한 바퀴를 마저 돌고 끝낸다
        glide(hourTotal(D.DAY_ORDER[0]), 700, () => dayPlayEnd(seq));
        return;
      }
      const it = seq[i++];
      glide(hourTotal(it.h), 620, () => {
        if (!dcur || !dcur.playing) return;
        const card = D.dayCardOf(it.id);
        if (card.food) tummy++;
        document.querySelectorAll('#day-ring .day-slot').forEach(el => el.classList.toggle('now', +el.dataset.h === it.h));
        $('ds-pic').innerHTML = D.daySceneSVG(it.id, { hour: it.h, tummy });
        $('ds-time').textContent = D.digitOf(hourTotal(it.h));
        // 소리 — 웃음 자리는 소리로도 알려 준다
        if (D.isNightHour(it.h) && card.kind === 'day') A.sfx.owl();
        else if (card.food && tummy >= 3) A.sfx.tummy();
        else A.sfx.pop();
        /* 말 — 시각 한마디, 그리고 **따로** 카드 이름. 한 문장으로 붙이지 않는다. */
        A.speakSeq([D.readTime(hourTotal(it.h)), card.say]);
        dayTimer = setTimeout(next, 1900);
      });
    };
    next();
  }

  /* ▶ 단추는 재생 중에 「멈춤」이 된다 — 색만 바꾸면 다섯 살은 같은 단추로 읽는다 */
  function setPlayLabel(playing) {
    const b = $('btn-day-play');
    b.classList.toggle('playing', !!playing);
    b.innerHTML = playing
      ? '<svg class="ic" aria-hidden="true"><use href="#ck-stop"/></svg> 멈춤'
      : '<svg class="ic" aria-hidden="true"><use href="#ck-play"/></svg> 재생';
  }

  function dayPlayEnd(seq) {
    if (!dcur) return;
    dcur.playing = false;
    setPlayLabel(false);
    document.querySelectorAll('#day-ring .day-slot').forEach(el => el.classList.remove('now'));
    $('day-show').hidden = true;
    $('ds-pic').innerHTML = '';
    $('day-tray').hidden = false;
    // 하루를 만들어 끝까지 본 것에 대한 보상 — 잘 만들었나를 재는 것이 아니다
    const sig = seq.map(s => s.h + ':' + s.id).join(',');
    if (seq.length >= 3 && sig !== dcur.awarded) {
      dcur.awarded = sig;
      if (window.Pet) Pet.awardSnack(1);
      if (seq.length >= 12 && window.Pet) Pet.awardMeal(1);
    }
  }

  /* ─────────── 보관함 ───────────
   * 담으면 판이 비워지고 새 하루를 시작한다. 여섯 벌이 차면 가장 오래된 것이 자리를 내준다.
   * 지우는 단추는 두지 않는다 — 다섯 살이 실수로 눌러 없앨 것을 만들지 않는다. */
  function dayKeep(quiet) {
    if (!dcur || dcur.playing) return false;
    if (!Object.keys(dcur.slots).length) { if (!quiet) { A.sfx.tap(); toast('카드를 놓아 볼까?'); } return false; }
    P.keepDay(dcur.slots);
    dcur.slots = {};
    dcur.awarded = '';
    P.setWork(dcur.slots);
    paintDayRing();
    $('days-count').textContent = P.dayCount();
    if (!quiet) { A.sfx.keep(); toast('보관했어!'); }
    return true;
  }

  function renderDays() {
    const box = $('days-grid');
    box.innerHTML = '';
    const list = P.dayList();
    $('days-total').textContent = list.length + ' / ' + P.DAY_MAX;
    if (!list.length) {
      box.innerHTML = '<div class="days-empty">' + ic('keep') + ' 아직 보관한 하루가 없어</div>';
      return;
    }
    list.forEach((d, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'day-keepcard';
      b.dataset.i = i;
      const hours = D.DAY_ORDER.filter(h => d.slots[h]);
      b.innerHTML =
        '<span class="dk-no">' + (i + 1) + '</span>' +
        '<span class="dk-row">' + hours.slice(0, 6).map(h =>
          '<span class="dk-pic">' + dayIcon(d.slots[h]) + '</span>').join('') + '</span>' +
        '<span class="dk-count">' + hours.length + ' 가지</span>';
      b.addEventListener('click', ev => {
        ev.preventDefault(); A.sfx.tap();
        dayKeep(true);                    // 만들던 것은 잃지 않게 먼저 담아 둔다
        dcur.slots = Object.assign({}, d.slots);
        P.setWork(dcur.slots);
        paintDayRing();
        showScreen('scr-day');
      });
      box.appendChild(b);
    });
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
    // 같은 자리의 단추가 방에 따라 다른 곳으로 간다 (① 새 도감 · ② 잠꾸러기 앨범)
    $('btn-dex').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); showScreen(isWake() ? 'scr-pals' : 'scr-dex');
    });
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

    /* ── 방② ── */
    $('btn-wake-back').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      openList(D.wakeStageDef(wcur.board.stage));
    });
    $('btn-ring').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); wakeRing(); });
    $('btn-wake-again').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); openWake(wcur.board);
    });
    $('btn-wake-next').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); nextWakeBoard(); });
    $('btn-pals').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); showScreen('scr-pals'); });

    /* ── 방③ ── */
    $('btn-day-play').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); dayPlay(); });
    $('btn-day-keep').addEventListener('click', ev => { ev.preventDefault(); dayKeep(false); });
    $('btn-days').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); showScreen('scr-days'); });
    window.addEventListener('pointermove', dayMove);
    window.addEventListener('pointerup', dayUp);
    window.addEventListener('pointercancel', () => {
      if (!dayDrag) return;
      dayDrag.el.classList.remove('lift');
      $('day-ghost').hidden = true;
      document.querySelectorAll('#day-ring .day-slot').forEach(el => el.classList.remove('over'));
      dayDrag = null;
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
      dragKind: cur && cur.ctrl ? cur.ctrl.dragKind() : null,
      misses: cur ? cur.misses : null,
      locked: cur ? cur.locked : null,
      opened: document.getElementById('door-box').classList.contains('open'),
      done: cur ? P.isDone(cur.board.id) : null,
      birds: P.birdCount(),
      reward: document.getElementById('reward').classList.contains('on'),
      wake: wakeDebug(),
      day: dayDebug(),
    };
  }
  /* 방② — 「판정」에 해당하는 값이 하나도 없다는 것을 밖에서도 보게 한다.
   * matched 는 폭죽·앨범을 가를 뿐이고, 깨어남(awake)은 그것과 무관하다. */
  function wakeDebug() {
    if (!wcur) return null;
    const t = wcur.ctrl ? wcur.ctrl.total() : null;
    return {
      boardId: wcur.board.id,
      stage: wcur.board.stage,
      unit: wcur.unit,
      pal: wcur.board.pal,
      ask: wcur.board.ask,
      total: t,
      hour: t === null ? null : E.hourOf(t),
      minutes: t === null ? null : E.minuteOf(t),
      alarm: wcur.alarm,
      phase: wcur.phase,
      matched: wcur.matched,
      awake: wcur.phase === 'awake',
      pose: wcur.scene ? wcur.scene.pose : null,
      say: wcur.scene ? wcur.scene.say : null,
      seq: wcur.seq,
      wokeCount: P.wokeCount(wcur.board.pal),
      done: P.isWDone(wcur.board.id),
      pals: P.palCount(),
      dragging: wcur.ctrl ? wcur.ctrl.dragging() : false,
      minuteAngle: t === null ? null : E.minuteAngle(t),
    };
  }
  /* 방③ — 여기에는 「맞았다」에 해당하는 값이 **없어야 한다.**
   * e2e 가 이 객체의 열쇠 이름을 훑어 answer·correct·score 류가 생기면 실패한다. */
  function dayDebug() {
    if (!dcur) return null;
    return {
      slots: Object.assign({}, dcur.slots),
      placed: Object.keys(dcur.slots).length,
      sel: dcur.sel,
      playing: dcur.playing,
      kept: P.dayCount(),
      hand: dcur.ctrl ? dcur.ctrl.total() : null,
      // 장면이 「떴다」는 것은 상자가 열린 것이 아니라 **그림이 실제로 그려진 것**이다
      showing: !!document.querySelector('#ds-pic svg'),
      showTime: document.getElementById('ds-time').textContent,
    };
  }
  return { debug };
})();
