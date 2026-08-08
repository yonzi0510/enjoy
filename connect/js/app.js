/* 앱 셸 — 홈(단계 3개) → 퍼즐 목록(단계별 10) → 점 잇기 놀이.
 * 판에 흩어진 색 점을 정해진 순서(order)대로 탭(또는 드래그)해 선으로 잇는다.
 * 다음에 이을 점은 반짝 강조. 순서가 아닌 점을 탭하면 선이 안 그어지고 부드럽게 안내(무벌점).
 * 순서대로 다 이으면 색종이 축하 + TTS + 별 + 펫 간식. 진행도는 완성한 퍼즐 id로 저장한다. */
window.App = (() => {
  const D = window.ConnectData;
  const A = window.Audio2;
  const P = window.Progress;
  const $ = id => document.getElementById(id);
  const SVGNS = 'http://www.w3.org/2000/svg';
  // 손그림 아이콘 — 그림 자체는 index.html 의 <symbol> 에 있고 여기서는 갖다 쓰기만 한다
  const ICO = n => '<svg class="ico" aria-hidden="true"><use href="#ic-' + n + '"/></svg>';

  // 판 좌표계(0~100)에 여백을 둬 가장자리 점(점8)도 잘리지 않게 한다.
  const VB = { min: -8, size: 116 };
  const R = 6;            // 점 반지름(판 단위)
  const RING = 10;        // 다음 점 강조 링 반지름

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
        '<span class="mc-icon">' + miniBoard(lv.id) + '</span>' +
        '<span class="mc-name">' + lv.name + '</span>' +
        '<span class="mc-desc">' + lv.desc + '</span>' +
        '<span class="mc-prog">' + (done ? ICO('star') + ' ' + done + ' / ' + ids.length : '처음이야!') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openList(lv); });
      menu.appendChild(b);
    });
  }

  // 단계 아이콘: 대표 퍼즐을 다 이은 모습(작게)
  function miniBoard(level) {
    const pz = D.puzzlesOf(level)[0];
    return boardSVG(pz, pz.order.length, 'mini');
  }

  /* ─────────── 퍼즐 목록 ─────────── */
  let curLevel = null;
  function openList(lv) {
    curLevel = lv;
    $('list-title').innerHTML = ICO('pencil') + ' ' + lv.name;
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
        '<span class="pz-thumb">' + boardSVG(pz, done ? pz.order.length : 0, 'thumb') + '</span>' +
        '<span class="pz-badge">' + (done ? ICO('star') : ICO('pencil')) + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPlay(pz); });
      box.appendChild(b);
    });
    showScreen('scr-list');
  }

  /* ─────────── 판 SVG 그리기 ───────────
   * pz: 퍼즐 · upto: 이은 점 개수(그려진 경로 길이) · variant: 'mini'|'thumb'|'play' */
  function boardSVG(pz, upto, variant) {
    const dots = pz.dots, order = pz.order;
    const nextPos = (variant === 'play') ? upto : -1; // 다음 점 강조는 놀이 판에서만
    let path = '';
    for (let k = 0; k < upto && k < order.length; k++) {
      const d = dots[order[k]];
      path += (k === 0 ? 'M' : 'L') + d.x + ' ' + d.y + ' ';
    }
    const line = path
      ? '<path class="route" d="' + path.trim() + '" fill="none" stroke="#F2694B" ' +
        'stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
      : '';
    let ds = '';
    dots.forEach((d, i) => {
      const pos = order.indexOf(i);           // 이 점의 순서 위치
      const connected = pos < upto;           // 이미 이어진 점
      const isNext = (pos === nextPos);        // 다음에 이을 점
      const meta = D.colorMeta(d.c);
      let cls = 'dot' + (connected ? ' on' : '') + (isNext ? ' next' : '');
      let g = '<g class="' + cls + '" data-i="' + i + '">';
      // 넉넉한 투명 탭 영역
      g += '<circle class="hit" cx="' + d.x + '" cy="' + d.y + '" r="' + (R + 5) + '" fill="transparent"/>';
      if (isNext) g += '<circle class="ring" cx="' + d.x + '" cy="' + d.y + '" r="' + RING + '" fill="none" stroke="' + meta.hex + '" stroke-width="2.4"/>';
      g += '<circle class="face" cx="' + d.x + '" cy="' + d.y + '" r="' + R + '" fill="' + meta.hex + '" stroke="#fff" stroke-width="1.8"/>';
      if (variant === 'play') g += '<text class="num" x="' + d.x + '" y="' + (d.y + 0.4) + '" text-anchor="middle" dominant-baseline="central" fill="#fff">' + (pos + 1) + '</text>';
      g += '</g>';
      ds += g;
    });
    return '<svg class="board-svg" viewBox="' + VB.min + ' ' + VB.min + ' ' + VB.size + ' ' + VB.size +
      '" xmlns="' + SVGNS + '">' + line + ds + '</svg>';
  }

  // 순서 본보기 띠: 색 점을 순서대로 크게 + 화살표
  function renderGuide(pz) {
    const box = $('guide');
    box.innerHTML = '';
    pz.order.forEach((di, k) => {
      if (k > 0) {
        const ar = document.createElement('span');
        ar.className = 'g-arrow';
        ar.textContent = '›';
        box.appendChild(ar);
      }
      const meta = D.colorMeta(pz.dots[di].c);
      const s = document.createElement('span');
      s.className = 'g-dot';
      s.dataset.step = k;
      s.style.setProperty('--dc', meta.hex);
      s.innerHTML = '<b>' + (k + 1) + '</b>';
      box.appendChild(s);
    });
    markGuide(0);
  }
  function markGuide(upto) {
    document.querySelectorAll('#guide .g-dot').forEach(el => {
      const k = +el.dataset.step;
      el.classList.toggle('on', k < upto);
      el.classList.toggle('next', k === upto);
    });
  }

  /* ─────────── 놀이 ─────────── */
  let cur = null; // { pz, placed:[dot index...], locked }

  function openPlay(pz) {
    cur = { pz, placed: [], locked: false };
    $('play-title').innerHTML = ICO('pencil') + ' ' + D.levelDef(pz.level).name;
    renderGuide(pz);
    drawBoard();
    showScreen('scr-play');
    setTimeout(() => { if (cur && !cur.locked) A.speak('반짝이는 점부터 순서대로 이어 볼까?'); }, 300);
  }

  // 다음에 이어야 할 점의 "dot index" (없으면 null)
  function nextDot() {
    if (!cur || cur.locked) return null;
    if (cur.placed.length >= cur.pz.order.length) return null;
    return cur.pz.order[cur.placed.length];
  }

  function drawBoard() {
    $('board').innerHTML = boardSVG(cur.pz, cur.placed.length, 'play');
    markGuide(cur.placed.length);
  }

  /* ─────────── 잇기 판정 ─────────── */
  function attemptConnect(i) {
    if (!cur || cur.locked) return;
    const want = nextDot();
    if (i === want) {
      cur.placed.push(i);
      drawBoard();
      A.sfx.stroke();
      if (cur.placed.length === cur.pz.order.length) complete();
    } else {
      // 틀린 점 — 선을 긋지 않고(무벌점) 부드럽게 안내
      wiggleDot(i);
      A.sfx.tap();
      const need = D.colorMeta(cur.pz.dots[want].c);
      A.speak('다음은 ' + need.say + '이야!');
    }
  }

  function wiggleDot(i) {
    const g = $('board').querySelector('.dot[data-i="' + i + '"]');
    if (!g) return;
    g.classList.remove('wrong'); void g.getBoundingClientRect();
    g.classList.add('wrong');
    setTimeout(() => g.classList.remove('wrong'), 450);
  }

  /* ─────────── 완성 ─────────── */
  function complete() {
    cur.locked = true;
    const pz = cur.pz;
    const first = !P.isDone(pz.id);
    P.markDone(pz.id);
    P.addStar(1);
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
    $('reward-board').innerHTML = boardSVG(cur.pz, cur.pz.order.length, 'play');
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

  /* ─────────── 포인터(탭·드래그 공용) ─────────── */
  let dragging = false;
  function dotAt(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return -1;
    const g = el.closest ? el.closest('.dot') : null;
    return g ? +g.dataset.i : -1;
  }
  function boardDown(ev) {
    if (!cur || cur.locked) return;
    if (screenId !== 'scr-play') return;
    dragging = true;
    const i = dotAt(ev.clientX, ev.clientY);
    if (i >= 0) attemptConnect(i);
  }
  function boardMove(ev) {
    if (!dragging || !cur || cur.locked) return;
    const want = nextDot();
    if (want == null) return;
    const i = dotAt(ev.clientX, ev.clientY);
    if (i === want) attemptConnect(i); // 드래그로 다음 점에 닿으면 이어짐
  }
  function boardUp() { dragging = false; }

  /* ─────────── 색종이 축하 ─────────── */
  function burstConfetti() {
    const box = $('confetti');
    box.innerHTML = '';
    const colors = ['#EA5148', '#F2913B', '#F4C020', '#5DBE58', '#4FA3E8', '#A46FD6'];
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
      const want = nextDot();
      if (want == null) A.speak('길을 다 이었어요!');
      else A.speak('다음은 ' + D.colorMeta(cur.pz.dots[want].c).say + '이야!');
    });
    $('reward-next').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on'); nextPuzzle();
    });
    $('reward-close').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on');
      openList(D.levelDef(cur.pz.level));
    });

    const board = $('board');
    board.addEventListener('pointerdown', boardDown);
    window.addEventListener('pointermove', boardMove);
    window.addEventListener('pointerup', boardUp);
    window.addEventListener('pointercancel', boardUp);

    renderHome();
  }
  init();

  /* ─────────── 종단 테스트용 ─────────── */
  function debug() {
    return {
      screen: screenId,
      stars: P.stars(),
      level: cur ? cur.pz.level : null,
      puzzle: cur ? cur.pz.id : null,
      order: cur ? cur.pz.order.slice() : null,
      dotCount: cur ? cur.pz.dots.length : null,
      placed: cur ? cur.placed.slice() : null,
      nextId: nextDot(),
      lineCount: cur ? Math.max(0, cur.placed.length - 1) : 0,
      locked: cur ? cur.locked : null,
      done: cur ? P.isDone(cur.pz.id) : null,
    };
  }
  return { debug, _attempt: (i) => attemptConnect(i) };
})();
