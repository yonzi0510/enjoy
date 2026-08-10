/* 🤖 로봇 심부름 — 홈(단계 3개) → 판 목록(단계별 10) → 놀이.
 *
 * 저장소에서 유일한 「짜기 → 실행 → 관찰」 구조다. 다른 놀이는 누르면 그 자리에서 채점하지만
 * 여기서는 아이가 **먼저 명령을 다 짜고**, ▶ 를 눌러야 결과를 본다.
 * 그래서 이 앱의 배려는 전부 "실행이 빗나갔을 때 아이가 어떻게 되는가"에 걸려 있다:
 *
 *   ① **실패해도 명령 줄을 지우지 않는다.** 로봇만 처음 자리로 돌아온다.
 *      다섯 살은 열 장을 다시 놓으라고 하면 그 자리에서 그만둔다. 고칠 카드는 대개 하나다.
 *   ② **벽·웅덩이에 부딪혀도 벌점이 없다.** 쿵! 별이 뱅뱅 돌고 코를 문지르고 멈출 뿐,
 *      잃는 것이 하나도 없다. 부딪히는 것도 관찰이다.
 *   ③ **회전 명령(↰↱)은 없다.** 절대 방향 화살표뿐이라 로봇이 어디를 보고 있는지 몰라도 된다.
 *
 * ⚠️ 로봇의 이동은 **left/top** 으로만 한다. transform 을 쓰면 격자 좌표와 탭 자리가 틀어진다
 *    (CLAUDE.md 「놀이 화면」). 각 앱 e2e 의 「놀이판 무변형」 검사가 이걸 지킨다.
 */
window.App = (() => {
  const D = window.RobotData;
  const A = window.Audio2;
  const P = window.Progress;
  const $ = id => document.getElementById(id);

  const STEP_MS = 430;   // 한 칸 걷는 데 걸리는 시간 — 다섯 살이 눈으로 따라갈 만큼 느리게
  const MAX_CMDS = 12;   // 명령 줄에 놓을 수 있는 카드 수 (가장 긴 판이 10개)

  const ic = (id, cls) => '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#rb-' + id + '"/></svg>';
  const icCell = id => '<svg class="ic-cell" aria-hidden="true"><use href="#rb-' + id + '"/></svg>';

  /* ─────────── 화면 전환 ─────────── */
  let screenId = 'scr-home';
  function showScreen(id) {
    A.stop();
    stopRun();
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
        '<span class="mc-mini">' + miniBoard(D.puzzlesOf(lv.id)[0]) + '</span>' +
        '<span class="mc-name">' + lv.name + '</span>' +
        '<span class="mc-desc">' + lv.desc + '</span>' +
        '<span class="mc-prog">' + (done ? ic('star') + ' ' + done + ' / ' + ids.length : '처음이야!') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openList(lv); });
      menu.appendChild(b);
    });
  }

  // 작은 마당 그림 — 격자 크기·장애물 자리를 줄여 보여 준다(격자 크기가 곧 단계다)
  function miniBoard(pz) {
    let html = '<span class="mini-grid" style="--n:' + pz.n + '">';
    for (let y = 0; y < pz.n; y++) {
      for (let x = 0; x < pz.n; x++) {
        const kind = D.cellKind(pz, x, y);
        let cls = 'mini-cell';
        if (kind) cls += ' k-' + kind;
        if (D.isStart(pz, x, y)) cls += ' k-start';
        html += '<span class="' + cls + '"></span>';
      }
    }
    return html + '</span>';
  }

  /* ─────────── 판 목록 ─────────── */
  let curLevel = null;
  function openList(lv) {
    curLevel = lv;
    $('list-title').innerHTML = ic('robot', 'ic-title') + ' ' + lv.name;
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
        '<span class="pz-mini">' + miniBoard(pz) + '</span>' +
        '<span class="pz-badge">' + (done ? ic('star') : ic('play')) + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPlay(pz); });
      box.appendChild(b);
    });
    showScreen('scr-list');
  }

  /* ─────────── 놀이 ─────────── */
  // cur = { pz, cmds:[dir], x, y, hasKey, running, locked, bumped, tries }
  let cur = null;
  let runTimer = null;

  function openPlay(pz) {
    stopRun();
    cur = { pz, cmds: [], x: pz.start[0], y: pz.start[1], hasKey: false, running: false, locked: false, bumped: null, tries: 0 };
    $('play-title').innerHTML = ic('robot', 'ic-title') + ' ' + D.levelDef(pz.level).name;
    renderBoard();
    renderStrip();
    placeRobot(false);
    setRunning(false);
    $('reward').classList.remove('on');
    showScreen('scr-play');
    setTimeout(() => { if (cur) speakIntro(); }, 400);
  }

  function renderBoard() {
    const pz = cur.pz;
    const board = $('board');
    board.style.setProperty('--n', pz.n);
    const cells = $('cells');
    cells.innerHTML = '';
    for (let y = 0; y < pz.n; y++) {
      for (let x = 0; x < pz.n; x++) {
        const c = document.createElement('div');
        c.className = 'cell';
        c.dataset.x = x; c.dataset.y = y;
        const kind = D.cellKind(pz, x, y);
        if (kind === 'wall') c.innerHTML = icCell('wall');
        else if (kind === 'puddle') c.innerHTML = icCell('puddle');
        else if (kind === 'key') { c.innerHTML = icCell('key'); c.classList.add('cell-key'); }
        else if (kind === 'goal') {
          c.innerHTML = icCell(pz.key ? 'door' : 'home');
          c.classList.add('cell-goal');
          if (pz.key) c.classList.add('locked', 'locked-view');
        }
        if (kind) c.classList.add('has-' + kind);
        if (D.isStart(pz, x, y)) c.classList.add('cell-start');
        cells.appendChild(c);
      }
    }
    $('robot-key').classList.remove('on');
  }

  // 로봇 자리 — **left/top 으로만** 옮긴다 (transform 금지)
  function placeRobot(animate) {
    const r = $('robot');
    r.classList.toggle('nomove', animate === false);
    r.style.setProperty('--x', cur.x);
    r.style.setProperty('--y', cur.y);
    if (animate === false) {
      // 즉시 이동(처음 자리로 되돌릴 때) — 다음 프레임에 다시 애니메이션을 켠다
      void r.offsetWidth;
      requestAnimationFrame(() => r.classList.remove('nomove'));
    }
  }

  /* ─────────── 명령 줄 ─────────── */
  function renderStrip() {
    const strip = $('cmd-strip');
    strip.querySelectorAll('.cmd-card').forEach(el => el.remove());
    $('strip-hint').classList.toggle('hide', cur.cmds.length > 0);
    cur.cmds.forEach((dir, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cmd-card';
      b.dataset.i = i;
      b.dataset.dir = dir;
      b.setAttribute('aria-label', D.DIRS[dir].name + ' ' + (i + 1) + '번째 — 누르면 뺍니다');
      b.innerHTML = '<span class="cc-no">' + (i + 1) + '</span>' +
        '<svg class="ic-cell" aria-hidden="true"><use href="#' + D.DIRS[dir].sym + '"/></svg>' +
        '<span class="cc-x">' + icCell('x') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); removeCmd(i); });
      strip.appendChild(b);
    });
  }

  function addCmd(dir) {
    if (!cur || cur.running || cur.locked) return;
    if (!D.isDir(dir)) return;
    if (cur.cmds.length >= MAX_CMDS) { A.sfx.soft(); A.speak('카드가 가득 찼어. 하나 빼고 놓아 볼까?'); return; }
    cur.cmds.push(dir);
    renderStrip();
    A.sfx.card();
    A.speak(D.DIRS[dir].say);
    const strip = $('cmd-strip');
    const last = strip.querySelector('.cmd-card:last-of-type');
    if (last) last.classList.add('pop');
  }

  // 카드를 누르면 그 카드만 빠진다 — 「전부 지우기」는 두지 않는다(다섯 살이 포기한다)
  function removeCmd(i) {
    if (!cur || cur.running || cur.locked) return;
    if (i < 0 || i >= cur.cmds.length) return;
    cur.cmds.splice(i, 1);
    renderStrip();
    A.sfx.undo();
  }

  /* ─────────── 실행 ─────────── */
  function setRunning(on) {
    const r = $('btn-run');
    r.disabled = !!on || (cur && cur.locked);
    $('pad').classList.toggle('off', !!on);
    $('cmd-strip').classList.toggle('off', !!on);
    document.querySelectorAll('.pad-btn').forEach(b => { b.disabled = !!on || (cur && cur.locked); });
  }

  function stopRun() {
    if (runTimer) { clearTimeout(runTimer); runTimer = null; }
    if (cur) cur.running = false;
  }

  function run() {
    if (!cur || cur.running || cur.locked) return;
    if (!cur.cmds.length) { A.sfx.soft(); A.speak('화살표를 눌러서 길을 먼저 만들어 줘!'); return; }
    /* 부딪힘·빗나감 뒤에 걸어 둔 「로봇을 처음 자리로」 타이머를 먼저 걷는다.
     * 아이가 곧바로 ▶ 를 다시 누르면 그 타이머가 걷는 도중에 터져 로봇을 시작 칸으로
     * 되돌려 버린다(실행이 통째로 어긋난다). */
    if (runTimer) { clearTimeout(runTimer); runTimer = null; }
    // 실행할 때마다 로봇만 처음 자리로 — **명령 줄은 그대로 둔다**
    cur.x = cur.pz.start[0]; cur.y = cur.pz.start[1];
    cur.hasKey = false; cur.bumped = null;
    $('robot-key').classList.remove('on');
    $('robot').classList.remove('bumped');
    $('robot-dizzy').classList.remove('on');
    document.querySelectorAll('#cells .cell-key').forEach(c => c.classList.remove('taken'));
    document.querySelectorAll('#cells .cell-goal.locked').forEach(c => c.classList.add('locked-view'));
    placeRobot(false);
    cur.running = true;
    cur.tries++;
    setRunning(true);
    A.speak('출발!');
    let i = 0;
    const tick = () => {
      if (!cur || !cur.running) return;
      markCard(i - 1, false);
      if (i >= cur.cmds.length) { finishRun(); return; }
      markCard(i, true);
      const dir = cur.cmds[i++];
      const r = D.step(cur.pz, cur.x, cur.y, cur.hasKey, dir);
      if (r.blocked) { bump(r.blocked); return; }
      cur.x = r.x; cur.y = r.y;
      $('robot').classList.add('walking');
      placeRobot(true);
      A.sfx.step();
      if (!cur.hasKey && r.hasKey) pickKey();
      if (D.isGoal(cur.pz, cur.x, cur.y)) { runTimer = setTimeout(success, STEP_MS); return; }
      runTimer = setTimeout(tick, STEP_MS);
    };
    runTimer = setTimeout(tick, 320);
  }

  function markCard(i, on) {
    const el = $('cmd-strip').querySelector('.cmd-card[data-i="' + i + '"]');
    if (el) el.classList.toggle('on', !!on);
  }

  function pickKey() {
    cur.hasKey = true;
    A.sfx.key();
    $('robot-key').classList.add('on');
    const c = document.querySelector('#cells .cell-key');
    if (c) c.classList.add('taken');
    document.querySelectorAll('#cells .cell-goal').forEach(g => g.classList.remove('locked-view'));
    A.speak('열쇠를 주웠어!');
  }

  /* 부딪힘 — 쿵! 별이 뱅뱅, 코를 문지르고 그 자리에 멈춘다. 남은 명령은 건너뛴다.
   * **벌점 없음**: 별도 안 깎이고 카드도 안 지워진다. */
  function bump(why) {
    cur.running = false;
    cur.bumped = why;
    $('robot').classList.remove('walking');
    $('robot').classList.add('bumped');
    $('robot-dizzy').classList.add('on');
    setRunning(false);
    if (why === 'puddle') { A.sfx.splash(); A.speak('앗, 물웅덩이야!'); }
    else if (why === 'door') { A.sfx.locked(); A.speak('문이 잠겼네. 열쇠를 먼저 주워 볼까?'); }
    else if (why === 'edge') { A.sfx.bump(); A.speak('앗, 마당 끝이야!'); }
    else { A.sfx.bump(); A.speak('앗, 벽이야!'); }
    // 잠깐 보여 주고 로봇만 처음 자리로 (카드는 그대로)
    runTimer = setTimeout(() => {
      if (!cur || cur.locked) return;
      $('robot').classList.remove('bumped');
      $('robot-dizzy').classList.remove('on');
      backToStart();
    }, 1500);
  }

  /* 명령을 다 썼는데 목표에 못 닿음 — 격려하고 로봇만 되돌린다. 카드는 그대로. */
  function finishRun() {
    cur.running = false;
    $('robot').classList.remove('walking');
    setRunning(false);
    A.sfx.soft();
    A.speak('조금만 더 가면 돼! 화살표를 바꿔 볼까?');
    runTimer = setTimeout(() => { if (cur && !cur.locked) backToStart(); }, 1100);
  }

  function backToStart() {
    cur.x = cur.pz.start[0]; cur.y = cur.pz.start[1];
    cur.hasKey = false;
    $('robot-key').classList.remove('on');
    document.querySelectorAll('#cells .cell-key').forEach(c => c.classList.remove('taken'));
    document.querySelectorAll('#cells .cell-goal.locked').forEach(g => g.classList.add('locked-view'));
    placeRobot(false);
    markCard(-1, false);
    $('cmd-strip').querySelectorAll('.cmd-card.on').forEach(el => el.classList.remove('on'));
  }

  /* ─────────── 완성 ─────────── */
  function success() {
    if (!cur || cur.locked) return;
    cur.running = false;
    cur.locked = true;
    $('robot').classList.remove('walking');
    $('robot').classList.add('arrived');
    setRunning(false);
    const pz = cur.pz;
    const first = !P.isDone(pz.id);
    P.markDone(pz.id);
    P.addStar(1);
    if (window.Pet) Pet.awardSnack(1);
    // 단계를 처음으로 다 깨면 펫 식사 보상
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

  /* ─────────── 안내 목소리 ─────────── */
  function speakIntro() {
    if (!cur) return;
    if (cur.pz.key) A.speak('열쇠를 먼저 줍고 문으로 가야 해! 화살표를 눌러 길을 만들어 줘.');
    else A.speak('로봇을 집까지 데려다줘! 화살표를 눌러 길을 만들어 줘.');
  }

  /* ─────────── 색종이 축하 ─────────── */
  function burstConfetti() {
    const box = $('confetti');
    box.innerHTML = '';
    const colors = ['#5FB26E', '#FFC63D', '#7CC242', '#5CB8E8', '#FF8FB0', '#B57CE0'];
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
      ev.preventDefault(); A.sfx.tap(); openList(D.levelDef(cur.pz.level));
    });
    document.querySelectorAll('.pad-btn').forEach(b => {
      b.addEventListener('click', ev => { ev.preventDefault(); addCmd(b.dataset.dir); });
    });
    $('btn-run').addEventListener('click', ev => { ev.preventDefault(); run(); });
    $('btn-listen').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      if (!cur) return;
      if (cur.locked) { A.speak('심부름 성공!'); return; }
      speakIntro();
    });
    $('reward-next').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on'); nextPuzzle();
    });
    $('reward-close').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on');
      openList(D.levelDef(cur.pz.level));
    });

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
      n: cur ? cur.pz.n : null,
      cmds: cur ? cur.cmds.slice() : null,
      robot: cur ? { x: cur.x, y: cur.y } : null,
      start: cur ? cur.pz.start.slice() : null,
      goal: cur ? cur.pz.goal.slice() : null,
      key: cur ? (cur.pz.key ? cur.pz.key.slice() : null) : null,
      hasKey: cur ? cur.hasKey : null,
      running: cur ? cur.running : null,
      locked: cur ? cur.locked : null,
      bumped: cur ? cur.bumped : null,
      tries: cur ? cur.tries : null,
      done: cur ? P.isDone(cur.pz.id) : null,
    };
  }
  return { debug, _run: () => run() };
})();
