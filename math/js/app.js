/* 앱 셸 — 홈/숫자 따라쓰기/그림 셈/덧셈·뺄셈 문제 화면 전환과 흐름 */
window.App = (() => {
  const D = window.MathData;
  const A = window.Audio2;
  const P = window.Progress;

  const INK_COLORS = ['#F25CA2', '#4E6FE3', '#3FBF77', '#E5A800', 'rb'];
  let inkColor = INK_COLORS[0];

  /* ─────────── 화면 전환 ─────────── */
  function showScreen(id) {
    A.stop();
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id === 'scr-home') renderHome();
  }
  const $ = id => document.getElementById(id);

  /* ─────────── 홈 ─────────── */
  const MODES = [
    { id: 'trace', icon: '✏️', name: '숫자 따라쓰기', desc: '1부터 100까지', cls: 'c-trace' },
    { id: 'stones', icon: '🐸', name: '숫자 징검다리', desc: '폴짝폴짝 수 개념 익히기', cls: 'c-stones' },
    { id: 'add-visual', icon: '🍎', name: '그림 덧셈', desc: '그림을 세면서 배워요', cls: 'c-addv', mode: 'add', visual: true },
    { id: 'sub-visual', icon: '🍏', name: '그림 뺄셈', desc: '먹은 건 몇 개?', cls: 'c-subv', mode: 'sub', visual: true },
    { id: 'add', icon: '➕', name: '덧셈 문제', desc: '3 + 4 = ?', cls: 'c-add', mode: 'add', visual: false },
    { id: 'sub', icon: '➖', name: '뺄셈 문제', desc: '5 - 2 = ?', cls: 'c-sub', mode: 'sub', visual: false },
  ];
  // 징검다리 전용 단계 (돌 1~10, 작은 걸음 1~3칸)
  const STONE_LEVELS = [
    { id: 'add', name: '앞으로 폴짝', desc: '더하기 배우기', emoji: '➡️' },
    { id: 'sub', name: '뒤로 폴짝', desc: '빼기 배우기', emoji: '⬅️' },
    { id: 'mix', name: '섞어서 폴짝', desc: '더하기·빼기 함께', emoji: '🔀' },
  ];
  function renderHome() {
    $('home-stars').textContent = P.stars();
    const menu = $('menu');
    menu.innerHTML = '';
    MODES.forEach(m => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-card ' + m.cls;
      let prog;
      if (m.id === 'trace') {
        prog = '⭐ ' + P.tracedCount(1, 100) + ' / 100';
      } else {
        const total = modeLevels(m).reduce((s, lv) => s + P.rounds(m.id + '-' + lv.id), 0);
        prog = total ? '🎮 ' + total + '판' : '처음이야!';
      }
      b.innerHTML =
        '<span class="mc-icon">' + m.icon + '</span>' +
        '<span class="mc-name">' + m.name + '</span>' +
        '<span class="mc-desc">' + m.desc + '</span>' +
        '<span class="mc-prog">' + prog + '</span>';
      b.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.tap();
        if (m.id === 'trace') openGroups();
        else openLevels(m);
      });
      menu.appendChild(b);
    });
  }
  function modeLevels(modeDef) { return modeDef.id === 'stones' ? STONE_LEVELS : D.LEVELS; }

  /* ─────────── 숫자 따라쓰기: 묶음 목록 ─────────── */
  function openGroups() {
    const list = $('groups-list');
    list.innerHTML = '';
    D.traceGroups.forEach(g => {
      const done = P.tracedCount(g.from, g.to);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'item-main';
      b.innerHTML =
        '<span class="it-emoji">' + g.from + '</span>' +
        '<span class="it-texts"><span class="it-name">' + g.from + ' ~ ' + g.to + '</span>' +
        '<span class="it-kind">숫자 열 개</span></span>' +
        '<span class="it-prog">' + (done >= 10 ? '🏅' : '⭐ ' + done + ' / 10') + '</span>';
      b.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.tap();
        let idx = 0;
        for (let i = 0; i < 10; i++) if (!P.isTraced(g.from + i)) { idx = i; break; }
        openTrace(g, idx);
      });
      list.appendChild(b);
    });
    showScreen('scr-groups');
  }

  /* ─────────── 숫자 따라쓰기 ─────────── */
  let traceLine = null;
  let tr = null; // { group, idx, dirty, failStamp }

  // 손가락 필기 시도 안내 (펜슬 전용)
  let lastPenSay = 0;
  function penHint() {
    const el = $('pen-hint');
    el.classList.add('on');
    clearTimeout(penHint.t);
    penHint.t = setTimeout(() => el.classList.remove('on'), 1500);
    const now = Date.now();
    if (now - lastPenSay > 12000) { lastPenSay = now; A.speak('펜슬로 써 보세요!'); }
  }

  function initTrace() {
    traceLine = Ink.InkLine($('ink-trace'), {
      color: () => inkColor,
      tool: () => 'pen',
      onTouchReject: penHint,
      onChange: () => { if (tr) tr.dirty = true; },
    });
  }

  function curNum() { return tr.group.from + tr.idx; }

  // 십 묶음(🧺)과 낱개로 수를 그림으로 보여준다
  function renderCountVisual(n, obj) {
    const box = $('trace-visual');
    box.innerHTML = '';
    const tens = Math.floor(n / 10), units = n % 10;
    for (let i = 0; i < tens; i++) {
      const b = document.createElement('span');
      b.className = 'ten-bundle';
      b.innerHTML = '🧺<b>10</b>';
      box.appendChild(b);
    }
    for (let i = 0; i < units; i++) {
      const s = document.createElement('span');
      s.className = 'count-obj';
      s.textContent = obj;
      box.appendChild(s);
    }
  }

  function openTrace(group, idx) {
    tr = { group, idx, dirty: false, failStamp: null };
    showScreen('scr-trace');
    traceLine.resize();
    openTracePage(idx);
  }
  function openTracePage(idx) {
    tr.idx = idx;
    tr.dirty = false;
    tr.failStamp = null;
    const n = curNum();
    $('trace-title').textContent = '✏️ ' + n + ' 쓰기';
    $('trace-count').textContent = (idx + 1) + ' / 10';
    $('btn-tprev').disabled = idx === 0;
    renderCountVisual(n, D.OBJECTS[n % D.OBJECTS.length]);
    traceLine.setText(String(n), 'show');
    setTimeout(() => A.speak(n + '! ' + D.traceSay(n)), 350);
  }
  function traceNext() {
    const idx = tr.idx;
    if (traceLine.strokeCount() === 0) { A.sfx.tap(); if (idx < 9) openTracePage(idx + 1); return; }
    if (!tr.dirty && P.isTraced(curNum())) { A.sfx.tap(); if (idx < 9) openTracePage(idx + 1); return; }
    if (traceLine.coverage() < 0.5) {
      const stamp = traceLine.strokeCount() + ':' + Math.round(traceLine.inkLength());
      if (tr.failStamp === stamp) { A.sfx.tap(); if (idx < 9) openTracePage(idx + 1); return; } // 두 번 누르면 보내주기
      tr.failStamp = stamp;
      A.sfx.tap();
      wiggle('trace-holder');
      A.speak('회색 숫자 위를 따라 써 볼까?');
      return;
    }
    // 통과!
    const n = curNum();
    const first = !P.isTraced(n);
    P.recordTrace(n);
    P.addStar(1);
    if (window.Pet) {
      Pet.awardSnack(1);
      if (first && P.tracedCount(tr.group.from, tr.group.to) >= 10) Pet.awardMeal(1); // 묶음 완주 = 식사
    }
    A.sfx.fanfare();
    const praise = D.praises[Math.floor(Math.random() * D.praises.length)];
    showReward(praise, idx >= 9 ? '완성! 🎉' : '다음 ▶', () => {
      if (tr.idx < 9) openTracePage(tr.idx + 1);
      else { openGroups(); A.speak(tr.group.from + '부터 ' + tr.group.to + '까지 다 썼다! 대단해요!'); }
    });
    A.speak(praise);
  }

  /* ─────────── 문제 (그림 셈 + 숫자 문제) ─────────── */
  let qz = null; // { modeDef, level, qIdx, a, b, ans, hinted, lock }

  function openLevels(modeDef) {
    qz = { modeDef };
    $('levels-title').textContent = modeDef.icon + ' ' + modeDef.name;
    const list = $('levels-list');
    list.innerHTML = '';
    modeLevels(modeDef).forEach(lv => {
      const n = P.rounds(modeDef.id + '-' + lv.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'item-main lv-' + lv.id;
      b.innerHTML =
        '<span class="it-emoji">' + lv.emoji + '</span>' +
        '<span class="it-texts"><span class="it-name">' + lv.name + '</span>' +
        '<span class="it-kind">' + lv.desc + '</span></span>' +
        '<span class="it-prog">' + (n ? '🎮 ' + n + '판' : '') + '</span>';
      b.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.tap();
        if (modeDef.id === 'stones') startStoneRound(lv);
        else startRound(lv);
      });
      list.appendChild(b);
    });
    showScreen('scr-levels');
  }

  function rnd(n) { return Math.floor(Math.random() * n); }

  function startRound(level) {
    qz = { modeDef: qz.modeDef, level, qIdx: 0 };
    $('quiz-title').textContent = qz.modeDef.icon + ' ' + qz.modeDef.name;
    showScreen('scr-quiz');
    nextProblem();
  }

  function nextProblem() {
    clearCountTimers();
    $('btn-qnext').hidden = true;
    const { modeDef, level } = qz;
    const max = level.max;
    let a, b;
    if (modeDef.mode === 'add') {
      a = 1 + rnd(max - 1);
      b = 1 + rnd(max - a);
    } else {
      a = 2 + rnd(max - 1);
      b = 1 + rnd(a - 1);
    }
    qz.a = a; qz.b = b;
    qz.ans = modeDef.mode === 'add' ? a + b : a - b;
    qz.hinted = false;
    qz.lock = false;
    qz.obj = D.OBJECTS[rnd(D.OBJECTS.length)];

    // 진행 점
    const dots = $('quiz-dots');
    dots.innerHTML = '';
    for (let i = 0; i < D.ROUND; i++) {
      const d = document.createElement('span');
      d.className = 'dot' + (i < qz.qIdx ? ' done' : i === qz.qIdx ? ' on' : '');
      dots.appendChild(d);
    }

    // 식 — 그림 셈은 풀 때 식을 숨긴다 (아이가 그림 세기에 집중, 정답 후에 짠! 하고 연결)
    const op = modeDef.mode === 'add' ? '+' : '−';
    const expr = $('quiz-expr');
    expr.innerHTML =
      '<b>' + a + '</b> <span class="q-op">' + op + '</span> <b>' + b + '</b> <span class="q-op">=</span> <span class="q-what">?</span>';
    expr.hidden = !!modeDef.visual;
    expr.classList.remove('expr-pop');

    // 그림 (그림 셈은 항상·크게, 숫자 문제는 힌트 때만)
    $('quiz-visual').classList.toggle('big', !!modeDef.visual);
    renderQuizVisual(modeDef.visual);
    $('btn-hint').hidden = modeDef.visual;

    // 보기 3개
    const set = new Set([qz.ans]);
    while (set.size < 3) {
      const d = qz.ans + (rnd(7) - 3);
      if (d >= 0 && d !== qz.ans && d <= max + 3) set.add(d);
    }
    const choices = [...set].sort(() => Math.random() - 0.5);
    const box = $('quiz-choices');
    box.innerHTML = '';
    choices.forEach(c => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice-btn';
      btn.textContent = c;
      btn.addEventListener('click', ev => { ev.preventDefault(); answer(btn, c); });
      box.appendChild(btn);
    });

    // 읽어 주기
    const say = modeDef.visual
      ? (modeDef.mode === 'add'
        ? a + '개하고 ' + b + '개! 모두 몇 개일까?'
        : a + '개에서 ' + b + '개를 먹었어요! 몇 개 남았을까?')
      : D.numName(a) + (modeDef.mode === 'add' ? ' 더하기 ' : ' 빼기 ') + D.numName(b) + '는?';
    setTimeout(() => A.speak(say), 300);
  }

  function renderQuizVisual(show) {
    const box = $('quiz-visual');
    box.innerHTML = '';
    box.hidden = !show;
    if (!show) return;
    const { modeDef, a, b, obj } = qz;
    const row1 = document.createElement('div');
    row1.className = 'q-row';
    if (modeDef.mode === 'add') {
      for (let i = 0; i < a; i++) row1.insertAdjacentHTML('beforeend', '<span class="count-obj">' + obj + '</span>');
      const plus = document.createElement('span');
      plus.className = 'q-row-op';
      plus.textContent = '➕';
      const row2 = document.createElement('div');
      row2.className = 'q-row';
      for (let i = 0; i < b; i++) row2.insertAdjacentHTML('beforeend', '<span class="count-obj">' + obj + '</span>');
      box.appendChild(row1);
      box.appendChild(plus);
      box.appendChild(row2);
    } else {
      // 뺄셈: a개 중 뒤의 b개가 냠! 사라진 모습
      for (let i = 0; i < a; i++) {
        row1.insertAdjacentHTML('beforeend',
          '<span class="count-obj' + (i >= a - b ? ' eaten' : '') + '">' + obj + '</span>');
      }
      box.appendChild(row1);
    }
  }

  // 세는 말: 10까지는 순우리말, 그 위는 한자어
  function countWord(n) { return n <= 10 ? D.NATIVE[n] : D.numName(n); }
  function clearCountTimers() {
    (qz && qz.timers || []).forEach(clearTimeout);
    if (qz) qz.timers = [];
  }

  /* 정답 후 이해 단계 — 그림을 하나씩 반짝이며 같이 세고, 아이가 ▶ 를 눌러야 넘어간다 */
  function celebrateCount() {
    const objs = [...document.querySelectorAll('#quiz-visual .count-obj:not(.eaten)')];
    const { modeDef } = qz;
    const full = D.numName(qz.a) + (modeDef.mode === 'add' ? ' 더하기 ' : ' 빼기 ') + D.numName(qz.b) + '는 ' + D.numName(qz.ans) + '!';
    qz.timers = [];
    objs.forEach((o, i) => {
      qz.timers.push(setTimeout(() => {
        o.classList.add('counted');
        o.insertAdjacentHTML('beforeend', '<b class="cnt">' + (i + 1) + '</b>');
        A.speak(countWord(i + 1));
      }, 700 + i * 800));
    });
    qz.timers.push(setTimeout(() => {
      A.speak('모두 ' + qz.ans + '개! ' + full + ' 참 잘했어요!');
      const nb = $('btn-qnext');
      nb.classList.remove('wiggle');
      void nb.offsetWidth;
      nb.classList.add('wiggle');
    }, 700 + objs.length * 800 + 300));
  }

  function answer(btn, c) {
    if (qz.lock) return;
    if (c === qz.ans) {
      qz.lock = true;
      btn.classList.add('ok');
      A.sfx.good();
      // 식에 정답을 채우고 (1 + 3 = 4), 그림을 보여 주며 함께 센다 — 이해하고 넘어가는 시간
      const what = document.querySelector('#quiz-expr .q-what');
      what.textContent = qz.ans;
      what.classList.add('q-ans');
      const expr = $('quiz-expr');
      if (expr.hidden) { // 그림 셈: 이제 산수식이 짠! 나타나며 "아하" 연결
        expr.hidden = false;
        expr.classList.add('expr-pop');
      }
      renderQuizVisual(true);
      $('btn-hint').hidden = true;
      $('btn-qnext').hidden = false;
      A.speak('정답!');
      celebrateCount();
    } else {
      btn.classList.add('no');
      setTimeout(() => btn.classList.remove('no'), 500);
      A.sfx.tap();
      if (!qz.modeDef.visual && !qz.hinted) { // 숫자 문제: 틀리면 그림 힌트가 저절로
        qz.hinted = true;
        renderQuizVisual(true);
        A.speak('괜찮아요! 그림을 보면서 다시 세어 볼까?');
      } else {
        A.speak('다시 한번 세어 볼까?');
      }
    }
  }

  // ▶ 아이가 직접 눌러야 다음 문제로 (스스로 이해할 시간을 준다)
  function quizNext() {
    clearCountTimers();
    $('btn-qnext').hidden = true;
    qz.qIdx++;
    if (qz.qIdx < D.ROUND) { nextProblem(); return; }
    // 한 판 끝!
    const { modeDef } = qz;
    P.recordRound(modeDef.id + '-' + qz.level.id);
    P.addStar(D.ROUND);
    if (window.Pet) Pet.awardSnack(1);
    A.sfx.fanfare();
    showReward('다섯 문제 모두 정답!', '한 판 더 🎮', () => startRound(qz.level), () => {
      openLevels(qz.modeDef);
    });
    A.speak('와, 다섯 문제를 모두 맞혔어요! 정말 똑똑해요!');
  }

  /* ─────────── 숫자 징검다리 — 폴짝 이동으로 더하기·빼기 개념 익히기 ─────────── */
  let st = null; // { level, qIdx, a, b, dir, target, lock, timers }

  function stoneClearTimers() {
    (st && st.timers || []).forEach(clearTimeout);
    if (st) st.timers = [];
  }
  function placeFrog(n, hop) {
    const stone = document.querySelector('#stones-row .stone[data-n="' + n + '"]');
    const frog = $('frog');
    if (!stone) return;
    frog.style.left = (stone.offsetLeft + stone.offsetWidth / 2) + 'px';
    if (hop) {
      frog.classList.remove('hop');
      void frog.offsetWidth;
      frog.classList.add('hop');
    }
  }
  function startStoneRound(level) {
    st = { level, qIdx: 0, timers: [] };
    showScreen('scr-stones');
    // 돌 1~10 깔기
    const row = $('stones-row');
    row.innerHTML = '';
    for (let n = 1; n <= 10; n++) {
      const s = document.createElement('button');
      s.type = 'button';
      s.className = 'stone';
      s.dataset.n = n;
      s.textContent = n;
      s.addEventListener('click', ev => { ev.preventDefault(); tapStone(n); });
      row.appendChild(s);
    }
    nextStone();
  }
  function nextStone() {
    stoneClearTimers();
    st.lock = false;
    $('stones-expr').hidden = true;
    $('btn-snext').hidden = true;
    document.querySelectorAll('#stones-row .stone').forEach(s => s.classList.remove('landed', 'start'));

    // 진행 점
    const dots = $('stones-dots');
    dots.innerHTML = '';
    for (let i = 0; i < D.ROUND; i++) {
      const d = document.createElement('span');
      d.className = 'dot' + (i < st.qIdx ? ' done' : i === st.qIdx ? ' on' : '');
      dots.appendChild(d);
    }

    // 문제: 작은 걸음(1~3칸)으로 이동
    const kind = st.level.id === 'mix' ? (rnd(2) ? 'add' : 'sub') : st.level.id;
    st.dir = kind === 'add' ? 1 : -1;
    if (kind === 'add') {
      st.a = 1 + rnd(9);                       // 1~9
      st.b = 1 + rnd(Math.min(3, 10 - st.a));  // 1~3, 10 넘지 않게
    } else {
      st.a = 2 + rnd(9);                       // 2~10
      st.b = 1 + rnd(Math.min(3, st.a - 1));   // 1~3, 1 아래로 안 내려가게
    }
    st.target = st.a + st.dir * st.b;

    const dirWord = st.dir > 0 ? '앞으로' : '뒤로';
    $('stones-task').innerHTML =
      '🐸 <b>' + st.a + '</b>번 돌에서 ' + dirWord + ' <b>' + st.b + '</b>칸 폴짝!';
    document.querySelector('#stones-row .stone[data-n="' + st.a + '"]').classList.add('start');
    requestAnimationFrame(() => placeFrog(st.a));
    setTimeout(() => A.speak(
      '개구리가 ' + st.a + '번 돌에 있어요. ' + dirWord + ' ' + st.b + '칸 뛰면 몇 번 돌일까? 도착할 돌을 눌러 봐!'), 350);
  }
  function tapStone(n) {
    if (!st || st.lock) return;
    if (n !== st.target) {
      const s = document.querySelector('#stones-row .stone[data-n="' + n + '"]');
      s.classList.remove('wiggle');
      void s.offsetWidth;
      s.classList.add('wiggle');
      A.sfx.tap();
      A.speak('다시! ' + st.a + '번 돌에서 ' + (st.dir > 0 ? '앞으로' : '뒤로') + ' ' + st.b + '칸이야!');
      return;
    }
    // 정답 — 개구리가 한 칸씩 폴짝폴짝 이동하며 보여준다
    st.lock = true;
    A.sfx.good();
    for (let i = 1; i <= st.b; i++) {
      st.timers.push(setTimeout(() => {
        const at = st.a + st.dir * i;
        placeFrog(at, true);
        A.sfx.pop();
        A.speak(String(at)); // 지나는 돌 번호를 세어 준다
      }, i * 650));
    }
    st.timers.push(setTimeout(() => {
      document.querySelector('#stones-row .stone[data-n="' + st.target + '"]').classList.add('landed');
      const op = st.dir > 0 ? '+' : '−';
      const expr = $('stones-expr');
      expr.innerHTML =
        '<b>' + st.a + '</b> <span class="q-op">' + op + '</span> <b>' + st.b + '</b> <span class="q-op">=</span> <span class="q-what q-ans">' + st.target + '</span>';
      expr.hidden = false;
      expr.classList.remove('expr-pop');
      void expr.offsetWidth;
      expr.classList.add('expr-pop');
      $('btn-snext').hidden = false;
      A.sfx.fanfare();
      A.speak(D.numName(st.a) + (st.dir > 0 ? ' 더하기 ' : ' 빼기 ') + D.numName(st.b) + '는 ' + D.numName(st.target) + '! ' +
        st.a + '번 돌에서 ' + (st.dir > 0 ? '앞으로' : '뒤로') + ' ' + st.b + '칸 가면 ' + st.target + '번!');
    }, st.b * 650 + 500));
  }
  function stoneNext() {
    stoneClearTimers();
    st.qIdx++;
    if (st.qIdx < D.ROUND) { nextStone(); return; }
    // 한 판 끝!
    P.recordRound('stones-' + st.level.id);
    P.addStar(D.ROUND);
    if (window.Pet) Pet.awardSnack(1);
    A.sfx.fanfare();
    showReward('폴짝폴짝 다섯 번 모두 성공!', '한 판 더 🐸', () => startStoneRound(st.level), () => {
      openLevels(MODES.find(m => m.id === 'stones'));
    });
    A.speak('와, 징검다리를 다 건넜어요! 정말 대단해요!');
  }

  /* ─────────── 보상 오버레이 ─────────── */
  let rewardNextFn = null, rewardCloseFn = null;
  function showReward(praise, nextLabel, onNext, onClose) {
    $('reward-praise').textContent = praise;
    $('reward-next').textContent = nextLabel;
    rewardNextFn = onNext;
    rewardCloseFn = onClose || null;
    $('reward-close').hidden = !onClose;
    $('reward').classList.add('on');
  }
  function wiggle(id) {
    const el = $(id);
    el.classList.remove('wiggle');
    void el.offsetWidth;
    el.classList.add('wiggle');
  }

  /* ─────────── 초기화 ─────────── */
  function init() {
    // 길게 눌러도 복사·전체선택 풍선이 뜨지 않게
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());

    initTrace();

    document.querySelectorAll('[data-go]').forEach(b => {
      b.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.tap();
        showScreen(b.dataset.go);
      });
    });
    $('btn-groups-back').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openGroups(); });
    $('btn-levels-back').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); clearCountTimers(); openLevels(qz.modeDef);
    });
    $('btn-qnext').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); quizNext();
    });
    $('btn-stones-back').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); stoneClearTimers();
      openLevels(MODES.find(m => m.id === 'stones'));
    });
    $('btn-snext').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); stoneNext();
    });
    window.addEventListener('resize', () => { // 화면이 돌아가면 개구리 자리 다시 맞추기
      if (st && document.getElementById('scr-stones').classList.contains('on')) {
        placeFrog(st.lock ? st.target : st.a);
      }
    });
    $('btn-tprev').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); if (tr.idx > 0) openTracePage(tr.idx - 1);
    });
    $('btn-tnext').addEventListener('click', ev => { ev.preventDefault(); traceNext(); });
    $('btn-tlisten').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      const n = curNum();
      A.speak(n + '! ' + D.traceSay(n));
    });
    $('btn-tclear').addEventListener('click', ev => { ev.preventDefault(); A.sfx.pop(); traceLine.clear(); });
    $('btn-tundo').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); traceLine.undo(); });
    $('btn-hint').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      qz.hinted = true;
      renderQuizVisual(true);
      A.speak('그림을 보면서 세어 볼까?');
    });
    $('reward-next').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      $('reward').classList.remove('on');
      if (rewardNextFn) rewardNextFn();
    });
    $('reward-close').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      $('reward').classList.remove('on');
      if (rewardCloseFn) rewardCloseFn();
    });
    document.querySelectorAll('#swatches .swatch').forEach((b, i) => {
      if (INK_COLORS[i] !== 'rb') b.style.background = INK_COLORS[i];
      b.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.tap();
        inkColor = INK_COLORS[i];
        document.querySelectorAll('#swatches .swatch').forEach(s => s.classList.toggle('on', s === b));
      });
    });
    document.querySelector('#swatches .swatch').classList.add('on');

    renderHome();
  }
  init();

  // 종단 테스트용 상태 확인
  function debug() {
    return {
      stars: P.stars(),
      traceNum: tr ? curNum() : null,
      traceStrokes: traceLine.strokeCount(),
      coverage: traceLine.coverage(),
      answer: qz && qz.ans != null ? qz.ans : null,
      qIdx: qz ? qz.qIdx : null,
      hinted: qz ? !!qz.hinted : null,
      stone: st ? { a: st.a, b: st.b, dir: st.dir, target: st.target, qIdx: st.qIdx } : null,
    };
  }

  return { showScreen, debug };
})();
