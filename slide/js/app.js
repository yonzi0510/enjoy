/* 앱 셸 — 홈(단계 3개) → 퍼즐 목록(단계별 10) → 슬라이드 놀이.
 * 왼쪽 본보기 카드가 각 열의 목표 색을 크게 보여준다. 오른쪽 4개 세로 열엔 색 조각이 섞여 있다.
 * 열을 탭하면 맨 위 조각이 떠서 선택되고, 다른 열을 탭하면 그 위로 옮겨진다(포인터 이벤트).
 * 카드처럼 모든 열을 같은 색으로 정리하면 완성 — 색종이·팡파르·TTS·별·펫 간식.
 * 규칙 위반(빈 열 집기·가득 찬 열에 놓기)은 부드럽게 무시하고 벌점이 없다.
 * 진행도는 완성한 퍼즐 id 로 저장한다. */
window.App = (() => {
  const D = window.SlideData;
  const A = window.Audio2;
  const P = window.Progress;
  const $ = id => document.getElementById(id);

  let _uid = 0;
  const uid = () => 's' + (_uid++);
  const deep = cols => cols.map(c => c.slice());
  const matched = (cols, target) =>
    cols.every((c, i) => c.length === target[i].length && c.every((x, j) => x === target[i][j]));

  /* ─────────── 화면 전환 ─────────── */
  let screenId = 'scr-home';
  function showScreen(id) {
    A.stop();
    screenId = id;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id === 'scr-home') renderHome();
  }

  /* ─────────── 손그림 아이콘 (index.html 의 <symbol>) ───────────
   * 화면 틀에 쓰던 이모지를 아이가 그린 SVG 로 바꾼다.
   * 놀이 조각(chipDraw)은 색맹 대비로 색마다 모양이 달라서 그대로 둔다. */
  function ic(name, cls) {
    return '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#sl-' + name + '"/></svg>';
  }
  // 열(튜브)·본보기 열에 두르는 손그림 테두리. 절대배치라 안쪽 내용은 CSS 가 위로 올린다.
  const FRAME = cls => '<svg class="' + cls + '" preserveAspectRatio="none" aria-hidden="true"><use href="#sl-frame"/></svg>';

  /* 미니 본보기(목표 색 4열) — 홈·목록·카드에서 재사용 */
  function miniGoal(perm, keyPrefix, big) {
    return '<span class="mini-goal' + (big ? ' big' : '') + '">' +
      perm.map((cid, i) =>
        '<span class="mini-col"><span class="mini-chip">' + D.chipDraw(cid, keyPrefix + i) + '</span></span>'
      ).join('') + '</span>';
  }

  /* ─────────── 홈: 단계 3개 ─────────── */
  function renderHome() {
    $('home-stars').textContent = P.stars();
    const menu = $('menu');
    menu.innerHTML = '';
    D.LEVELS.forEach(lv => {
      const ids = D.puzzlesOf(lv.id).map(x => x.id);
      const done = P.doneCount(ids);
      const sample = D.puzzlesOf(lv.id)[0];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-card ' + lv.cls;
      // "여기부터" 를 알려 주는 시작 화살표는 shared/screen.css 가 첫 칸 안쪽에 얹는다
      b.innerHTML =
        '<span class="mc-icon">' + miniGoal(sample.perm, 'mn' + lv.id, false) + '</span>' +
        '<span class="mc-name">' + lv.name + '</span>' +
        '<span class="mc-desc">' + lv.desc + '</span>' +
        '<span class="mc-prog">' + (done ? ic('star', 'ic-sm') + ' ' + done + ' / ' + ids.length : '처음이야!') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openList(lv); });
      menu.appendChild(b);
    });
  }

  /* ─────────── 퍼즐 목록 ─────────── */
  let curLevel = null;
  function openList(lv) {
    curLevel = lv;
    $('list-title').innerHTML = ic('title') + ' ' + lv.name;
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
        miniGoal(pz.perm, 'pc' + pz.id, false) +
        '<span class="pz-badge">' + ic(done ? 'star' : 'palette') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPlay(pz); });
      box.appendChild(b);
    });
    showScreen('scr-list');
  }

  /* ─────────── 슬라이드 놀이 ─────────── */
  let cur = null; // { pz, cols:[[...]], selected:null|int, locked:bool }

  function openPlay(pz) {
    cur = { pz, cols: deep(pz.start), selected: null, locked: false };
    $('play-title').innerHTML = ic('title') + ' ' + D.levelDef(pz.level).name;
    renderCard();
    renderBoard();
    showScreen('scr-play');
    setTimeout(() => { if (cur && !cur.locked) A.speak('카드처럼 색을 정리해 볼까?'); }, 300);
  }

  // 본보기 카드 — 각 열의 목표 색을 크게
  function renderCard() {
    const box = $('goal-card-body');
    box.innerHTML = '';
    cur.pz.perm.forEach((cid, i) => {
      const col = document.createElement('div');
      col.className = 'gc-col';
      let chips = '';
      for (let k = 0; k < D.CAP; k++) chips += '<span class="gc-chip">' + D.chipDraw(cid, 'gc' + i + k + uid()) + '</span>';
      col.innerHTML = FRAME('gc-frame') + chips; // 손그림 테두리 + 목표 색 조각
      box.appendChild(col);
    });
  }

  // 놀이 판 — 4개의 세로 열
  function renderBoard() {
    const board = $('board');
    board.innerHTML = '';
    cur.cols.forEach((col, ci) => {
      const colEl = document.createElement('button');
      colEl.type = 'button';
      // 이 열이 목표색으로 정확히 CAP개 채워졌으면 초록 체크 느낌의 'ok'
      const colDone = col.length === D.CAP && col.every(x => x === cur.pz.target[ci][0]);
      colEl.className = 'col' + (cur.selected === ci ? ' sel' : '') + (colDone ? ' ok' : '');
      colEl.dataset.col = ci;
      colEl.setAttribute('aria-label', (ci + 1) + '번 열');
      // 손그림 테두리 — 절대배치·pointer-events:none 이라 탭 판정에는 끼어들지 않는다
      colEl.innerHTML = FRAME('col-frame');
      const stack = document.createElement('div');
      stack.className = 'col-stack';
      col.forEach((cid, i) => {
        const chip = document.createElement('span');
        const lifted = cur.selected === ci && i === col.length - 1;
        chip.className = 'chip' + (lifted ? ' lifted' : '');
        chip.innerHTML = D.chipDraw(cid, 'bd' + ci + i + uid());
        stack.appendChild(chip);
      });
      colEl.appendChild(stack);
      colEl.addEventListener('pointerdown', ev => { ev.preventDefault(); onColTap(ci); });
      board.appendChild(colEl);
    });
  }

  /* ─────────── 탭·이동 ─────────── */
  function onColTap(ci) {
    if (!cur || cur.locked) return;
    if (cur.selected === null) {
      // 첫 탭 — 조각이 있는 열이면 맨 위 조각 선택
      if (!cur.cols[ci].length) { A.sfx.nope(); return; } // 빈 열은 집을 게 없음(무벌점)
      cur.selected = ci;
      A.sfx.lift();
      renderBoard();
    } else if (cur.selected === ci) {
      // 같은 열 다시 탭 — 선택 해제
      cur.selected = null;
      A.sfx.tap();
      renderBoard();
    } else {
      attemptMove(cur.selected, ci);
    }
  }

  // 규칙: to 가 가득이면 못 놓는다(부드럽게 무시). 그 외엔 맨 위 조각을 옮긴다.
  function attemptMove(from, to) {
    if (!cur.cols[from].length) { cur.selected = null; renderBoard(); return; }
    if (cur.cols[to].length >= D.CAPACITY) {
      // 규칙 위반 — 무벌점, 살짝 흔들고 선택 유지
      A.sfx.nope();
      wiggleCol(to);
      return;
    }
    doMove(from, to);
    cur.selected = null;
    A.sfx.drop();
    renderBoard();
    markDrop(to);
    if (matched(cur.cols, cur.pz.target)) complete();
  }

  // 상태만 바꾸는 핵심 이동(검증·선택·연출 없음) — solution 재생·디버그용
  function doMove(from, to) {
    const piece = cur.cols[from].pop();
    cur.cols[to].push(piece);
  }

  // 방금 놓인 조각에 떨어지는 애니메이션
  function markDrop(ci) {
    const cols = document.querySelectorAll('.col');
    const col = cols[ci];
    if (!col) return;
    const chips = col.querySelectorAll('.chip');
    const top = chips[chips.length - 1];
    if (top) { top.classList.add('drop'); }
  }

  function wiggleCol(ci) {
    const col = document.querySelectorAll('.col')[ci];
    if (!col) return;
    col.classList.remove('shake'); void col.offsetWidth; col.classList.add('shake');
  }

  /* ─────────── 완성 ─────────── */
  function complete() {
    cur.locked = true;
    const pz = cur.pz;
    const first = !P.isDone(pz.id);
    P.markDone(pz.id);
    P.addStar(pz.level + 2); // 단계1=3, 단계2=4, 단계3=5
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

  /* ─────────── 색종이 축하 ─────────── */
  function burstConfetti() {
    const box = $('confetti');
    box.innerHTML = '';
    const colors = ['#E24B3B', '#F6C744', '#57B24A', '#4C86D6', '#FF8FB0', '#9B6FD0'];
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
    $('btn-listen').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      if (!cur) return;
      if (cur.locked) { A.speak('다 정리했어요!'); return; }
      const names = cur.pz.perm.map(cid => D.meta(cid).say).join(', ');
      A.speak(names + ' 순서로 정리해요.');
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

  /* ─────────── 종단 테스트·디버그용 ─────────── */
  function debug() {
    return {
      screen: screenId,
      stars: P.stars(),
      level: cur ? cur.pz.level : null,
      puzzleId: cur ? cur.pz.id : null,
      columns: cur ? deep(cur.cols) : null,
      target: cur ? cur.pz.target.map(c => c.slice()) : null,
      selected: cur ? cur.selected : null,
      matched: cur ? matched(cur.cols, cur.pz.target) : null,
      locked: cur ? cur.locked : null,
      done: cur ? P.isDone(cur.pz.id) : null,
      solutionLen: cur ? cur.pz.solution.length : null,
    };
  }
  // 이동 하나 적용(규칙 검증 포함) — 디버그·수동 조작용
  function _move(from, to) {
    if (!cur || cur.locked) return false;
    if (!cur.cols[from] || !cur.cols[to]) return false;
    if (!cur.cols[from].length || cur.cols[to].length >= D.CAPACITY || from === to) return false;
    doMove(from, to);
    cur.selected = null;
    renderBoard();
    if (matched(cur.cols, cur.pz.target)) complete();
    return true;
  }
  // 저장된 정답 이동을 순서대로 재생 → 완성
  function _solve() {
    if (!cur || cur.locked) return;
    const sol = cur.pz.solution.slice();
    let i = 0;
    (function step() {
      if (!cur || cur.locked || i >= sol.length) return;
      _move(sol[i][0], sol[i][1]);
      i++;
      if (i < sol.length) setTimeout(step, 240);
    })();
  }

  return { debug, _move, _solve };
})();
