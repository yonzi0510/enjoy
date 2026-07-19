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
    { id: 'count', icon: '🔢', name: '수 세기', desc: '몇 개인지 맞혀요', cls: 'c-count' },
    { id: 'chart', icon: '💯', name: '숫자표 채우기', desc: '빈칸에 쏙!', cls: 'c-chart' },
    { id: 'dots', icon: '✨', name: '점 잇기', desc: '순서대로 콕콕', cls: 'c-dots' },
    { id: 'pattern', icon: '🚂', name: '패턴 이어가기', desc: '다음 칸은 뭘까?', cls: 'c-pattern' },
    { id: 'dice', icon: '🎲', name: '주사위 수 놀이', desc: '점을 세어 숫자 칸에', cls: 'c-dice' },
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
      } else if (m.id === 'dots') {
        const pics = window.MathDots.PICTURES;
        const done = pics.filter(p => P.rounds('dots-' + p.id)).length;
        prog = done ? '🎨 ' + done + ' / ' + pics.length : '처음이야!';
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
  function modeLevels(modeDef) {
    if (modeDef.id === 'stones') return STONE_LEVELS;
    if (modeDef.id === 'pattern') return D.PATTERN_LEVELS;
    if (modeDef.id === 'count') return D.COUNT_LEVELS;
    if (modeDef.id === 'dice') return D.DICE_LEVELS;
    if (modeDef.id === 'chart') return D.CHART_LEVELS;
    if (modeDef.id === 'dots') { // 점 잇기는 단계 대신 그림 목록
      return window.MathDots.PICTURES.map(p => ({ id: p.id, name: p.name, desc: '점 ' + p.dots.length + '개', emoji: p.emoji }));
    }
    return D.LEVELS;
  }

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
        '<span class="it-prog">' + (modeDef.id === 'dots' ? (n ? '🏅' : '') : (n ? '🎮 ' + n + '판' : '')) + '</span>';
      b.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.tap();
        if (modeDef.id === 'stones') startStoneRound(lv);
        else if (modeDef.id === 'pattern') startPatternRound(lv);
        else if (modeDef.id === 'count') startCountRound(lv);
        else if (modeDef.id === 'dice') startDiceRound(lv);
        else if (modeDef.id === 'chart') startChart(lv);
        else if (modeDef.id === 'dots') startDots(window.MathDots.PICTURES.find(p => p.id === lv.id));
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

  /* ─────────── 패턴 이어가기 — 기차 칸의 규칙을 찾아 다음 칸을 채운다 ─────────── */
  let pt = null; // { level, qIdx, q, lock, timers }

  function patternClearTimers() {
    (pt && pt.timers || []).forEach(clearTimeout);
    if (pt) pt.timers = [];
  }
  function startPatternRound(level) {
    pt = { level, qIdx: 0, timers: [] };
    showScreen('scr-pattern');
    nextPattern();
  }
  function nextPattern() {
    patternClearTimers();
    pt.lock = false;
    pt.q = D.makePattern(pt.level);
    $('btn-pnext').hidden = true;

    // 진행 점
    const dots = $('pattern-dots');
    dots.innerHTML = '';
    for (let i = 0; i < D.ROUND; i++) {
      const d = document.createElement('span');
      d.className = 'dot' + (i < pt.qIdx ? ' done' : i === pt.qIdx ? ' on' : '');
      dots.appendChild(d);
    }

    // 기차: 기관차 + 패턴 칸들 + 마지막 ❓ 칸
    const train = $('train');
    train.classList.remove('go');
    train.innerHTML = '';
    const eng = document.createElement('span');
    eng.className = 'train-engine';
    eng.textContent = '🚂';
    train.appendChild(eng);
    pt.q.shown.forEach(it => {
      const c = document.createElement('span');
      c.className = 'train-car';
      c.textContent = it.e;
      train.appendChild(c);
    });
    const qc = document.createElement('span');
    qc.className = 'train-car q-car';
    qc.textContent = '❓';
    train.appendChild(qc);

    // 큰 보기 버튼 3개 (이모지)
    const box = $('pattern-choices');
    box.innerHTML = '';
    pt.q.choices.forEach(it => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice-btn';
      btn.textContent = it.e;
      btn.addEventListener('click', ev => { ev.preventDefault(); answerPattern(btn, it); });
      box.appendChild(btn);
    });

    setTimeout(() => readPattern(), 350);
  }
  // 패턴을 리듬 있게 읽어 준다: "사과, 바나나, 사과, 바나나… 다음은?"
  function readPattern(prefix) {
    const items = pt.q.shown.map(it => ({ text: it.name, rate: 1.05 }));
    items.push({ text: '다음은 뭘까?' });
    if (prefix) items.unshift({ text: prefix });
    A.speakSeq(items);
  }
  function answerPattern(btn, it) {
    if (pt.lock) return;
    if (it.e !== pt.q.answer.e) { // 오답 — 부드럽게 흔들고 패턴을 한 번 더 읽어 준다
      btn.classList.add('no');
      setTimeout(() => btn.classList.remove('no'), 500);
      const qc = document.querySelector('#train .q-car');
      qc.classList.remove('wiggle');
      void qc.offsetWidth;
      qc.classList.add('wiggle');
      A.sfx.tap();
      readPattern('다시 잘 보자~');
      return;
    }
    // 정답 — ❓ 칸이 채워지고 기차가 칙칙폭폭 출발!
    pt.lock = true;
    btn.classList.add('ok');
    A.sfx.good();
    const qc = document.querySelector('#train .q-car');
    qc.textContent = it.e;
    qc.classList.add('filled');
    A.speak('정답! ' + it.name + '! 칙칙폭폭, 출발!');
    pt.timers.push(setTimeout(() => {
      A.sfx.train();
      $('train').classList.add('go');
    }, 500));
    pt.timers.push(setTimeout(() => {
      $('btn-pnext').hidden = false;
      wiggle('btn-pnext');
    }, 1400));
  }
  function patternNext() {
    patternClearTimers();
    $('btn-pnext').hidden = true;
    pt.qIdx++;
    if (pt.qIdx < D.ROUND) { nextPattern(); return; }
    // 한 판 끝!
    const first = P.rounds('pattern-' + pt.level.id) === 0;
    P.recordRound('pattern-' + pt.level.id);
    P.addStar(D.ROUND);
    if (window.Pet) {
      Pet.awardSnack(1);
      // 3단계를 모두 한 번씩 완주하면 식사 보상
      if (first && D.PATTERN_LEVELS.every(lv => P.rounds('pattern-' + lv.id) > 0)) Pet.awardMeal(1);
    }
    A.sfx.fanfare();
    showReward('패턴 다섯 개 모두 성공!', '한 판 더 🚂', () => startPatternRound(pt.level), () => {
      openLevels(MODES.find(m => m.id === 'pattern'));
    });
    A.speak('와, 패턴 박사님이네! 정말 잘했어요!');
  }

  /* ─────────── 수 세기 맞춤 — 몇 개인지 고르고, 하나씩 탭하며 같이 센다 ─────────── */
  let ct = null; // { level, qIdx, n, obj, lock, counted }

  function startCountRound(level) {
    ct = { level, qIdx: 0 };
    showScreen('scr-count');
    nextCount();
  }
  function nextCount() {
    ct.lock = false;
    ct.counted = 0;
    $('btn-cnext').hidden = true;
    const max = ct.level.max;
    ct.n = 1 + rnd(max);
    ct.obj = D.OBJECTS[rnd(D.OBJECTS.length)];

    // 진행 점
    const dots = $('count-dots');
    dots.innerHTML = '';
    for (let i = 0; i < D.ROUND; i++) {
      const d = document.createElement('span');
      d.className = 'dot' + (i < ct.qIdx ? ' done' : i === ct.qIdx ? ' on' : '');
      dots.appendChild(d);
    }

    // 물건들 — 정답 후 하나씩 탭하면 번호 배지가 붙으며 같이 센다
    const box = $('count-visual');
    box.innerHTML = '';
    for (let i = 0; i < ct.n; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'count-obj count-tap';
      b.textContent = ct.obj;
      b.addEventListener('click', ev => { ev.preventDefault(); tapCountObj(b); });
      box.appendChild(b);
    }

    // 보기 3개 (1~max 안에서, 정답 포함)
    const pool = [];
    for (let v = 1; v <= max; v++) if (v !== ct.n) pool.push(v);
    pool.sort(() => Math.random() - 0.5);
    const choices = [ct.n, pool[0], pool[1]].sort(() => Math.random() - 0.5);
    const cbox = $('count-choices');
    cbox.innerHTML = '';
    choices.forEach(c => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice-btn';
      btn.textContent = c;
      btn.addEventListener('click', ev => { ev.preventDefault(); answerCount(btn, c); });
      cbox.appendChild(btn);
    });
    setTimeout(() => A.speak('모두 몇 개일까? 세어 보고 숫자를 눌러 봐!'), 300);
  }
  function tapCountObj(el) {
    if (!ct) return;
    if (!ct.lock) { // 아직 푸는 중 — 통통 튀며 세는 걸 도와준다 (판정 없음)
      A.sfx.pop();
      el.classList.remove('boing');
      void el.offsetWidth;
      el.classList.add('boing');
      return;
    }
    if (el.classList.contains('counted')) return;
    ct.counted++;
    el.classList.add('counted');
    el.insertAdjacentHTML('beforeend', '<b class="cnt">' + ct.counted + '</b>');
    A.sfx.pop();
    if (ct.counted >= ct.n) {
      A.speak(countWord(ct.counted) + '! 모두 ' + ct.n + '개! 참 잘했어요!');
      wiggle('btn-cnext');
    } else {
      A.speak(countWord(ct.counted));
    }
  }
  function answerCount(btn, c) {
    if (ct.lock) return;
    if (c === ct.n) {
      ct.lock = true;
      btn.classList.add('ok');
      A.sfx.good();
      $('btn-cnext').hidden = false;
      A.speak('정답! ' + ct.n + '개! 하나씩 눌러서 같이 세어 볼까?');
    } else { // 오답도 벌점 없이 부드럽게 다시
      btn.classList.add('no');
      setTimeout(() => btn.classList.remove('no'), 500);
      A.sfx.tap();
      A.speak('다시 한번 세어 볼까? 물건을 눌러 봐도 돼!');
    }
  }
  function countNext() {
    $('btn-cnext').hidden = true;
    ct.qIdx++;
    if (ct.qIdx < D.ROUND) { nextCount(); return; }
    // 한 판 끝!
    P.recordRound('count-' + ct.level.id);
    P.addStar(D.ROUND);
    if (window.Pet) Pet.awardSnack(1);
    A.sfx.fanfare();
    showReward('숫자 세기 다섯 번 모두 성공!', '한 판 더 🎮', () => startCountRound(ct.level), () => {
      openLevels(MODES.find(m => m.id === 'count'));
    });
    A.speak('와, 수 세기 박사님이네! 정말 잘했어요!');
  }

  /* ─────────── 숫자표 빈칸 채우기 — 빈칸을 골라 알맞은 숫자를 넣는다 ─────────── */
  let ch = null; // { level, cells, blankNs, sel, left, timer }

  function startChart(level) {
    if (ch && ch.timer) clearTimeout(ch.timer);
    ch = { level, cells: {}, blankNs: [], sel: null, left: level.blanks, timer: null };
    showScreen('scr-chart');
    const total = level.to - level.from + 1;
    const idxs = new Set();
    while (idxs.size < level.blanks) idxs.add(rnd(total));
    const grid = $('chart-grid');
    grid.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const n = level.from + i;
      if (idxs.has(i)) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chart-cell blank';
        b.dataset.n = n;
        b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); selectBlank(n); });
        grid.appendChild(b);
        ch.cells[n] = b;
        ch.blankNs.push(n);
      } else {
        const s = document.createElement('span');
        s.className = 'chart-cell' + (n % 10 === 0 ? ' ten' : ''); // 십의 자리는 주황으로 (십묶음 감각)
        s.textContent = n;
        grid.appendChild(s);
      }
    }
    $('chart-left').textContent = '빈칸 ' + ch.left;
    selectBlank(ch.blankNs[0]);
    setTimeout(() => A.speak('숫자표에 빈칸이 있어요! 반짝이는 칸에 올 숫자를 찾아 줘!'), 300);
  }
  function selectBlank(n) {
    if (!ch || !ch.cells[n] || ch.cells[n].classList.contains('filled')) return;
    ch.sel = n;
    ch.blankNs.forEach(m => ch.cells[m].classList.toggle('sel', m === n));
    renderChartChoices(n);
  }
  function renderChartChoices(n) {
    const set = new Set([n]);
    while (set.size < 3) {
      const d = n + (rnd(9) - 4); // 앞뒤 가까운 숫자로 보기 구성
      if (d >= 1 && d <= 100 && d !== n) set.add(d);
    }
    const choices = [...set].sort(() => Math.random() - 0.5);
    const box = $('chart-choices');
    box.hidden = false;
    box.innerHTML = '';
    choices.forEach(c => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice-btn';
      btn.textContent = c;
      btn.addEventListener('click', ev => { ev.preventDefault(); answerChart(btn, c); });
      box.appendChild(btn);
    });
  }
  function answerChart(btn, c) {
    if (!ch || ch.sel == null) return;
    if (c !== ch.sel) { // 오답 — 벌점 없이 다시
      btn.classList.add('no');
      setTimeout(() => btn.classList.remove('no'), 500);
      A.sfx.tap();
      A.speak('음, 다시 볼까? 앞뒤 숫자를 보면 알 수 있어!');
      return;
    }
    // 정답 — 칸이 채워지며 반짝!
    const cell = ch.cells[ch.sel];
    cell.textContent = c;
    cell.classList.remove('blank', 'sel');
    cell.classList.add('filled');
    cell.disabled = true;
    ch.sel = null;
    ch.left--;
    $('chart-left').textContent = '빈칸 ' + ch.left;
    $('chart-choices').hidden = true;
    A.sfx.good();
    if (ch.left > 0) {
      A.speak(c + '! 맞았어요!');
      const next = ch.blankNs.find(m => !ch.cells[m].classList.contains('filled'));
      ch.timer = setTimeout(() => selectBlank(next), 700); // 다음 빈칸을 이어서 짚어 준다
      return;
    }
    // 표 완성!
    P.recordRound('chart-' + ch.level.id);
    P.addStar(ch.level.blanks);
    if (window.Pet) Pet.awardSnack(1);
    A.sfx.fanfare();
    showReward('숫자표를 다 채웠어요!', '한 판 더 💯', () => startChart(ch.level), () => {
      openLevels(MODES.find(m => m.id === 'chart'));
    });
    A.speak('와, 숫자표를 다 채웠어요! 정말 대단해요!');
  }

  /* ─────────── 점 잇기 — 1부터 순서대로 이으면 그림이 짠! ─────────── */
  let dt = null; // { pic, next, lock, timer }
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // 받침 유무에 따라 '이야/야' — TTS가 숫자를 한자어로 읽는 것에 맞춘다 (오→야, 십→이야)
  function iya(n) {
    const name = D.numName(n);
    const code = name.charCodeAt(name.length - 1) - 0xAC00;
    return code % 28 ? '이야' : '야';
  }
  function startDots(pic) {
    if (dt && dt.timer) clearTimeout(dt.timer);
    // drawing: 지금 선을 긋는 중인지 / justConnected: 방금 포인터로 이어서 뒤따르는 click을 무시
    dt = { pic, next: 1, lock: false, timer: null, drawing: false, justConnected: false };
    $('dots-title').textContent = pic.emoji + ' ' + pic.name + ' 점 잇기';
    showScreen('scr-dots');
    const svg = $('dots-svg');
    svg.innerHTML = '';
    // 완성되면 색이 채워질 도형 + 이어지는 선 (점들 아래에 깔린다)
    const fill = document.createElementNS(SVG_NS, 'polygon');
    fill.setAttribute('points', pic.dots.map(p => p.join(',')).join(' '));
    fill.setAttribute('class', 'dots-fill');
    fill.setAttribute('fill', pic.color);
    svg.appendChild(fill);
    const line = document.createElementNS(SVG_NS, 'polyline');
    line.setAttribute('points', '');
    line.setAttribute('class', 'dots-line');
    line.setAttribute('stroke', pic.color);
    svg.appendChild(line);
    // 손가락을 따라오는 고무줄 안내선 (마지막 이은 점 → 현재 위치). 안 그릴 땐 숨긴다
    const rubber = document.createElementNS(SVG_NS, 'line');
    rubber.setAttribute('class', 'dots-rubber');
    rubber.setAttribute('stroke', pic.color);
    rubber.style.display = 'none';
    svg.appendChild(rubber);
    // 번호표는 그림 무게중심에서 바깥쪽으로 밀어 붙인다 (선과 겹치지 않게)
    const cx = pic.dots.reduce((s, p) => s + p[0], 0) / pic.dots.length;
    const cy = pic.dots.reduce((s, p) => s + p[1], 0) / pic.dots.length;
    pic.dots.forEach(([x, y], i) => {
      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('class', 'dot-g' + (i === 0 ? ' next' : ''));
      g.setAttribute('data-n', i + 1);
      let dx = x - cx, dy = y - cy;
      const len = Math.hypot(dx, dy) || 1;
      dx = dx / len * 8; dy = dy / len * 8;
      const hit = document.createElementNS(SVG_NS, 'circle'); // 큰 투명 터치 영역
      hit.setAttribute('class', 'dot-hit');
      hit.setAttribute('cx', x); hit.setAttribute('cy', y); hit.setAttribute('r', 6.5);
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('class', 'dot-c');
      c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 3);
      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('class', 'dot-num');
      t.setAttribute('x', x + dx); t.setAttribute('y', y + dy + 2.4);
      t.textContent = i + 1;
      g.appendChild(hit); g.appendChild(c); g.appendChild(t);
      g.addEventListener('click', ev => { ev.preventDefault(); tapDot(i + 1); });
      svg.appendChild(g);
    });
    $('dots-count').textContent = '0 / ' + pic.dots.length;
    setTimeout(() => A.speak('1번 점에 콕 대고 쭉 이어 봐! 무슨 그림이 나올까?'), 350);
  }

  // 다음 순번 점 하나를 실제로 잇는다 (탭·드래그 공용). 마지막 점이면 완성 처리까지.
  function connectDot(n) {
    const svg = $('dots-svg');
    const g = svg.querySelector('.dot-g[data-n="' + n + '"]');
    const [x, y] = dt.pic.dots[n - 1];
    const line = svg.querySelector('.dots-line');
    line.setAttribute('points', (line.getAttribute('points') + ' ' + x + ',' + y).trim());
    g.classList.remove('next');
    g.classList.add('done');
    A.sfx.pop();
    dt.next++;
    $('dots-count').textContent = n + ' / ' + dt.pic.dots.length;
    if (dt.next <= dt.pic.dots.length) {
      svg.querySelector('.dot-g[data-n="' + dt.next + '"]').classList.add('next');
      A.speak(String(n)); // 점 번호를 세어 준다
      return;
    }
    // 마지막 점! 처음 점과 이어서 그림이 색으로 채워진다
    dt.lock = true;
    hideRubber();
    const [x0, y0] = dt.pic.dots[0];
    line.setAttribute('points', line.getAttribute('points') + ' ' + x0 + ',' + y0);
    svg.querySelector('.dots-fill').classList.add('on');
    A.sfx.fanfare();
    P.recordRound('dots-' + dt.pic.id);
    P.addStar(2);
    if (window.Pet) Pet.awardSnack(1);
    A.speak('우와! ' + dt.pic.name + ' 완성! 참 잘했어요!');
    dt.timer = setTimeout(() => { // 채워진 그림을 잠깐 감상한 뒤 보상
      showReward(dt.pic.emoji + ' ' + dt.pic.name + ' 완성!', '다른 그림 🎨', () => {
        openLevels(MODES.find(m => m.id === 'dots'));
      });
    }, 1400);
  }

  // 탭 폴백 — 드래그가 서툰 아이를 위해 다음 점을 그냥 탭해도 이어진다.
  // 포인터로 방금 이은 경우(justConnected) 뒤따라오는 click은 무시(중복 방지).
  function tapDot(n) {
    if (!dt || dt.lock) return;
    if (dt.justConnected) { dt.justConnected = false; return; }
    if (n === dt.next) { connectDot(n); return; }
    // 틀린 점 — 부드럽게 흔들고 다음 번호를 알려준다
    const g = $('dots-svg').querySelector('.dot-g[data-n="' + n + '"]');
    g.classList.remove('shake');
    void g.getBoundingClientRect();
    g.classList.add('shake');
    A.sfx.tap();
    A.speak('다음은 ' + dt.next + iya(dt.next) + '!');
  }

  /* 선 긋기 — 점 1(또는 마지막 이은 점) 근처에서 시작해, 지나가는 점을 순서대로 잇는다 */
  const DOT_HIT = 7; // 히트 반경(SVG 좌표, 점 간격 9보다 작아 오연결 방지). dot-hit(r=6.5)과 비슷
  function svgPointOf(svg, ev) { // 화면 좌표 → SVG 로컬 좌표 (getScreenCTM 역행렬)
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    return pt.matrixTransform(ctm.inverse());
  }
  function dotDist(p, i) { // 포인터 p 와 i번째(0기준) 점 사이 거리
    const d = dt.pic.dots[i];
    return Math.hypot(p.x - d[0], p.y - d[1]);
  }
  function showRubber(p) { // 마지막 이은 점 → 현재 위치 고무줄 선
    if (dt.next < 2) return; // 아직 이은 점이 없으면 그리지 않는다
    const [x0, y0] = dt.pic.dots[dt.next - 2];
    const r = $('dots-svg').querySelector('.dots-rubber');
    r.setAttribute('x1', x0); r.setAttribute('y1', y0);
    r.setAttribute('x2', p.x); r.setAttribute('y2', p.y);
    r.style.display = '';
  }
  function hideRubber() {
    const r = $('dots-svg').querySelector('.dots-rubber');
    if (r) r.style.display = 'none';
  }
  // 포인터가 지금 위치에서 이을 수 있는 다음 점들을 순서대로 잇는다
  function reachDots(p) {
    let guard = 0;
    while (!dt.lock && dt.next <= dt.pic.dots.length &&
           dotDist(p, dt.next - 1) <= DOT_HIT && guard++ < 40) {
      dt.justConnected = true;
      connectDot(dt.next);
    }
  }
  function dotsDown(ev) {
    if (!dt || dt.lock) return;
    dt.justConnected = false; // 새 제스처 시작 — 이전 플래그를 씻어낸다
    const svg = $('dots-svg');
    const p = svgPointOf(svg, ev);
    if (!p) return;
    // 시작은 다음 순번 점(dt.next) 또는 마지막 이은 점(dt.next-1) 근처에서만 — 아무 데서나면 무시
    const nearNext = dt.next <= dt.pic.dots.length && dotDist(p, dt.next - 1) <= DOT_HIT;
    const nearLast = dt.next > 1 && dotDist(p, dt.next - 2) <= DOT_HIT;
    if (!nearNext && !nearLast) return;
    ev.preventDefault();
    dt.drawing = true;
    if (svg.setPointerCapture) { try { svg.setPointerCapture(ev.pointerId); } catch (e) {} }
    if (nearNext) reachDots(p); // 시작점이 곧 다음 점이면 바로 잇는다
    if (!dt.lock) showRubber(p);
  }
  function dotsMove(ev) {
    if (!dt || !dt.drawing || dt.lock) return;
    const p = svgPointOf($('dots-svg'), ev);
    if (!p) return;
    ev.preventDefault();
    reachDots(p);
    if (!dt.lock) showRubber(p);
  }
  function dotsUp() {
    if (!dt || !dt.drawing) return;
    dt.drawing = false;
    hideRubber(); // 이은 데까지는 유지, 고무줄만 지운다
  }

  /* ─────────── 주사위 수 놀이 — 점을 세어 같은 숫자 칸에 끌어다 놓기 ─────────── */
  let dc = null;     // { level, board, cells:[{n,el,filled}], pieces:[{n,color,el,placed}], placedCount, lock }
  let dcDrag = null; // { p, ph, offX, offY, w, h }

  // 주사위 눈 얼굴 — 색 사각형 + 흰 점(표준 주사위 배치)
  function diceFaceSVG(n, color) {
    const pips = D.pipPoints(n)
      .map(([x, y]) => '<circle cx="' + x + '" cy="' + y + '" r="9" fill="#fff"/>').join('');
    return '<svg viewBox="0 0 100 100" class="dice-svg" aria-hidden="true">' +
      '<rect x="6" y="6" width="88" height="88" rx="20" fill="' + color + '"/>' + pips + '</svg>' +
      '<b class="dice-num">' + n + '</b>';
  }
  function updateDiceCount() {
    $('dice-count').textContent = dc.placedCount + ' / ' + dc.pieces.length;
  }

  function startDiceRound(level) {
    dcDrag = null;
    dc = { level, cells: [], pieces: [], placedCount: 0, lock: false };
    showScreen('scr-dice');
    const board = D.makeDiceBoard(level);
    dc.board = board;

    // 보드 — 목표 숫자가 적힌 칸 + 빈 칸(장식). 목표 칸에만 조각을 놓을 수 있다
    const boardEl = $('dice-board');
    boardEl.style.gridTemplateColumns = 'repeat(' + board.cols + ', 1fr)';
    boardEl.innerHTML = '';
    board.slots.forEach(slot => {
      const cell = document.createElement('div');
      if (!slot) { cell.className = 'dice-cell blank'; boardEl.appendChild(cell); return; }
      cell.className = 'dice-cell';
      cell.dataset.n = slot.n;
      cell.innerHTML = '<span class="dice-goal">' + slot.n + '</span>';
      boardEl.appendChild(cell);
      dc.cells.push({ n: slot.n, el: cell, filled: false });
    });

    // 트레이 — 알록달록 주사위 점 조각 (순서는 칸과 무관하게 섞임)
    const trayEl = $('dice-tray');
    trayEl.innerHTML = '';
    board.pieces.forEach(pc => {
      const el = document.createElement('div');
      el.className = 'dice-piece';
      el.dataset.n = pc.n;
      el.innerHTML = diceFaceSVG(pc.n, pc.color);
      trayEl.appendChild(el);
      dc.pieces.push({ n: pc.n, color: pc.color, el, placed: false });
    });

    updateDiceCount();
    setTimeout(() => A.speak('주사위 점을 세어 볼까? 같은 숫자가 적힌 칸에 쏙 넣어 줘!'), 350);
  }

  // 드래그 (손가락·마우스·펜 공통 — 포인터 이벤트)
  function diceStageDown(ev) {
    if (!dc || dc.lock || dcDrag) return;
    const el = ev.target.closest && ev.target.closest('.dice-piece');
    if (!el) return;
    const p = dc.pieces.find(q => q.el === el);
    if (!p || p.placed) return;
    ev.preventDefault();
    const r = el.getBoundingClientRect();
    // 자리를 지키는 대체 요소 — 조각을 들어 올려도 트레이가 흐트러지지 않게
    const ph = document.createElement('div');
    ph.className = 'dice-ph';
    ph.style.width = r.width + 'px';
    ph.style.height = r.height + 'px';
    el.parentNode.insertBefore(ph, el);
    el.classList.add('grab');
    el.style.position = 'fixed';
    el.style.margin = '0';
    el.style.width = r.width + 'px';
    el.style.height = r.height + 'px';
    el.style.left = r.left + 'px';
    el.style.top = r.top + 'px';
    dcDrag = { p, ph, offX: ev.clientX - r.left, offY: ev.clientY - r.top, w: r.width, h: r.height };
    A.sfx.pop();
  }
  function diceMove(ev) {
    if (!dcDrag) return;
    ev.preventDefault();
    dcDrag.p.el.style.left = (ev.clientX - dcDrag.offX) + 'px';
    dcDrag.p.el.style.top = (ev.clientY - dcDrag.offY) + 'px';
  }
  function diceUp() {
    if (!dcDrag) return;
    const d = dcDrag; dcDrag = null;
    const p = d.p;
    const pr = p.el.getBoundingClientRect();
    const pcx = pr.left + pr.width / 2, pcy = pr.top + pr.height / 2;
    // 가장 가까운 빈 목표 칸을 관대하게 찾는다
    let best = null, bd = 1e9;
    dc.cells.forEach(c => {
      if (c.filled) return;
      const cr = c.el.getBoundingClientRect();
      const dist = Math.hypot(pcx - (cr.left + cr.width / 2), pcy - (cr.top + cr.height / 2));
      const reach = Math.max(cr.width, cr.height) * 0.85 + 10; // 관대한 스냅 반경
      if (dist < bd && dist < reach) { bd = dist; best = c; }
    });
    if (best && best.n === p.n) return diceSnap(p, d, best);
    if (best) { // 틀린 칸 — 부드럽게 튕겨 돌아오고 격려 (무벌점)
      diceReturn(p, d);
      A.sfx.tap();
      A.speak('점을 세어 볼까? 같은 숫자 칸을 찾아봐!');
      return;
    }
    diceReturn(p, d); // 아무 칸도 아니면 조용히 제자리
  }
  function clearFixed(el) {
    ['position', 'left', 'top', 'width', 'height', 'margin'].forEach(k => el.style.removeProperty(k));
  }
  function animFixed(el, x, y, done) {
    const x0 = parseFloat(el.style.left) || 0, y0 = parseFloat(el.style.top) || 0;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.left = x + 'px'; el.style.top = y + 'px'; if (done) done(); return;
    }
    const t0 = performance.now(), dur = 220;
    (function step(t) {
      let f = Math.min(1, (t - t0) / dur); f = 1 - (1 - f) * (1 - f);
      el.style.left = (x0 + (x - x0) * f) + 'px';
      el.style.top = (y0 + (y - y0) * f) + 'px';
      if (f < 1) requestAnimationFrame(step); else if (done) done();
    })(performance.now());
  }
  function diceReturn(p, d) {
    const to = d.ph.getBoundingClientRect();
    animFixed(p.el, to.left, to.top, () => {
      if (d.ph.parentNode) d.ph.parentNode.insertBefore(p.el, d.ph);
      d.ph.remove();
      clearFixed(p.el);
      p.el.classList.remove('grab');
    });
  }
  function diceSnap(p, d, cell) {
    dc.lock = true;
    p.placed = true;
    cell.filled = true;
    d.ph.remove();
    const cr = cell.el.getBoundingClientRect();
    animFixed(p.el, cr.left + (cr.width - d.w) / 2, cr.top + (cr.height - d.h) / 2, () => {
      p.el.classList.remove('grab');
      clearFixed(p.el);
      cell.el.classList.add('filled');
      cell.el.appendChild(p.el);       // 칸 안으로 착!
      p.el.classList.add('placed');    // 절대 채움 + 숫자 뿅
      A.sfx.good();
      diceCelebrate(p);                // 점을 하나씩 세어 준다
      dc.placedCount++;
      updateDiceCount();
      dc.lock = false;
      if (dc.placedCount >= dc.pieces.length) setTimeout(diceComplete, 700);
    });
  }
  // 이해 단계 — 점을 하나씩 짚으며 세어 준다 ("하나, 둘, 셋… 모두 셋!")
  function diceCelebrate(p) {
    const items = [];
    for (let i = 1; i <= p.n; i++) items.push({ text: countWord(i), rate: 1.05 });
    items.push({ text: '모두 ' + p.n + '개!' });
    A.speakSeq(items);
  }
  function diceComplete() {
    const lv = dc.level;
    const first = P.rounds('dice-' + lv.id) === 0;
    P.recordRound('dice-' + lv.id);
    P.addStar(dc.pieces.length);
    if (window.Pet) {
      Pet.awardSnack(1);
      // 3단계를 모두 한 번씩 완주하면 식사 보상
      if (first && D.DICE_LEVELS.every(l => P.rounds('dice-' + l.id) > 0)) Pet.awardMeal(1);
    }
    A.sfx.fanfare();
    showReward('주사위 칸을 다 채웠어요!', '한 판 더 🎲', () => startDiceRound(dc.level), () => {
      openLevels(MODES.find(m => m.id === 'dice'));
    });
    A.speak('와, 점을 다 세어서 숫자 칸에 쏙쏙 넣었어요! 정말 잘했어요!');
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
    $('btn-pattern-back').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); patternClearTimers();
      openLevels(MODES.find(m => m.id === 'pattern'));
    });
    $('btn-pnext').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); patternNext(); });
    $('btn-pread').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); readPattern(); });
    $('btn-count-back').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); openLevels(MODES.find(m => m.id === 'count'));
    });
    $('btn-cnext').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); countNext(); });
    $('btn-chart-back').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      if (ch && ch.timer) clearTimeout(ch.timer);
      openLevels(MODES.find(m => m.id === 'chart'));
    });
    $('btn-dots-back').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      if (dt && dt.timer) clearTimeout(dt.timer);
      openLevels(MODES.find(m => m.id === 'dots'));
    });
    $('btn-dice-back').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      dcDrag = null; // 잡은 조각이 있으면 조용히 놓아준다
      openLevels(MODES.find(m => m.id === 'dice'));
    });
    // 점 잇기 — SVG에서 눌러 시작하고, 창 전체에서 끌기·놓기를 듣는다 (손가락·펜·마우스 공통)
    $('dots-svg').addEventListener('pointerdown', dotsDown);
    window.addEventListener('pointermove', dotsMove);
    window.addEventListener('pointerup', dotsUp);
    window.addEventListener('pointercancel', dotsUp);
    // 주사위 조각 드래그 — stage 에서 눌러 잡고, 창 전체에서 끌기·놓기를 듣는다 (합성 이벤트도 따라오게)
    $('dice-stage').addEventListener('pointerdown', diceStageDown);
    window.addEventListener('pointermove', diceMove);
    window.addEventListener('pointerup', diceUp);
    window.addEventListener('pointercancel', diceUp);
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
      pattern: pt && pt.q ? { answer: pt.q.answer.e, unit: pt.q.unit, shownLen: pt.q.shown.length, qIdx: pt.qIdx } : null,
      count: ct ? { n: ct.n, qIdx: ct.qIdx, counted: ct.counted } : null,
      chart: ch ? { sel: ch.sel, left: ch.left } : null,
      dot: dt ? { next: dt.next, total: dt.pic.dots.length } : null,
      dice: dc ? {
        level: dc.level.id,
        placed: dc.placedCount,
        total: dc.pieces.length,
        cells: dc.cells.map(c => ({ n: c.n, filled: c.filled })),
        pieces: dc.pieces.map(p => ({ n: p.n, placed: p.placed })),
      } : null,
    };
  }

  return { showScreen, debug };
})();
