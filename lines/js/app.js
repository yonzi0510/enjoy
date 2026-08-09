/* 앱 셸 — 홈(단계 3개) → 퍼즐 목록(단계별 10) → 선 따라 그리기 놀이.
 * 캐릭터 얼굴 옆에서 뻗어나가는 점선 안내를 손가락(또는 펜)으로 따라 그으면,
 * 안내선을 충분히 덮었고(coverage) 그은 잉크가 안내선 가까이에 머물렀으면(adherence)
 * 자동으로 완성 처리 — 색종이 축하 + TTS + 별 + 펫 간식. 무벌점: 못 따라가도 그냥 다시 그으면 된다.
 */
window.App = (() => {
  const D = window.LinesData;
  const A = window.Audio2;
  const P = window.Progress;
  const $ = id => document.getElementById(id);
  const SVGNS = 'http://www.w3.org/2000/svg';

  const COV_THRESH = 0.62;   // 안내선을 얼마나 덮었는지 문턱
  const ADH_THRESH = 0.55;   // 그은 잉크가 안내선 가까이 머문 비율 문턱
  const IDLE_MS = 15000;     // 이만큼 그리지 않고 머물면 살짝 다시 권한다

  /* 손그림 아이콘 — index.html <defs> 의 <symbol> 을 가져다 쓴다.
     화면 틀(별·연필·해·물결·소용돌이)만 손그림으로 바꾸고,
     캔버스 위 캐릭터 얼굴(pz.char)은 놀잇감이라 이모지 그대로 둔다. */
  const ic = (name, cls) =>
    '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#' + name + '"/></svg>';
  const STAGE_ICON = { 1: 'ln-sun', 2: 'ln-wave', 3: 'ln-swirl' };

  /* ─────────── 화면 전환 ─────────── */
  let screenId = 'scr-home';
  function showScreen(id) {
    A.stop();
    clearTimeout(idleTimer);
    screenId = id;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id === 'scr-home') renderHome();
  }

  /* ─────────── 안내선 미리보기 SVG(정적) — 홈 대표 아이콘·목록 카드 공용 ─────────── */
  function guideSVG(pz, opts) {
    opts = opts || {};
    const paths = D.guideOf(pz);
    const o = D.originOf(pz);
    let lines = '';
    paths.forEach(p => {
      if (p.length < 2) return;
      const pts = p.map(pt => pt.x + ',' + pt.y).join(' ');
      lines += '<polyline points="' + pts + '" fill="none" stroke="' + (opts.stroke || '#7C93CF') +
        '" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="20 16"/>';
    });
    const face = '<circle cx="' + o.x + '" cy="' + o.y + '" r="78" fill="rgba(255,255,255,.85)"/>' +
      '<text x="' + o.x + '" y="' + (o.y + 4) + '" font-size="96" text-anchor="middle" dominant-baseline="middle">' + pz.char + '</text>';
    return '<svg class="guide-svg" viewBox="0 0 ' + D.W + ' ' + D.H + '" xmlns="' + SVGNS + '">' + lines + face + '</svg>';
  }

  /* ─────────── 홈: 단계 3개 ─────────── */
  function renderHome() {
    $('home-stars').textContent = P.stars();
    const menu = $('menu');
    // "여기부터" 를 가리키는 시작 화살표는 shared/screen.css 가 첫 칸 안쪽에 얹는다 — 여기서 그리지 않는다
    menu.innerHTML = '';
    D.STAGES.forEach(st => {
      const ids = D.puzzlesOf(st.id).map(x => x.id);
      const done = P.doneCount(ids);
      const rep = D.puzzlesOf(st.id)[0];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-card ' + st.cls;
      b.innerHTML =
        '<span class="mc-icon">' + guideSVG(rep) + '</span>' +
        '<span class="mc-name">' + ic(STAGE_ICON[st.id]) + ' ' + st.name + '</span>' +
        '<span class="mc-desc">' + st.desc + '</span>' +
        '<span class="mc-prog">' + (done ? ic('ln-star') + ' ' + done + ' / ' + ids.length : '처음이야!') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openList(st); });
      menu.appendChild(b);
    });
  }

  /* ─────────── 퍼즐 목록 ─────────── */
  let curStage = null;
  function openList(st) {
    curStage = st;
    $('list-title').innerHTML = ic(STAGE_ICON[st.id], 'ic-title') + ' ' + st.name;
    const list = D.puzzlesOf(st.id);
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
        '<span class="pz-thumb">' + guideSVG(pz) + '</span>' +
        '<span class="pz-badge">' + ic(done ? 'ln-star' : 'ln-pencil') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPlay(pz); });
      box.appendChild(b);
    });
    showScreen('scr-list');
  }

  /* ─────────── 놀이 ─────────── */
  let cur = null;        // { pz, locked }
  let canvasEl = null;   // Ink.GuideCanvas 인스턴스
  let idleTimer = null;

  function faceSizeFor(pz) {
    // 퍼즐 크기에 비례해 얼굴을 적당히 — 너무 크면 안내선을 가린다
    return pz.type === 'spiral' ? { r: 46, size: 60 } : { r: 60, size: 76 };
  }

  function openPlay(pz) {
    cur = { pz, locked: false };
    $('play-title').textContent = pz.char + ' ' + D.stageDef(pz.level).name;
    const fs = faceSizeFor(pz);
    canvasEl.setGuide({
      paths: D.guideOf(pz), origin: D.originOf(pz), char: pz.char,
      faceR: fs.r, faceSize: fs.size,
    });
    // 화면이 아직 display:none 인 동안 resize() 를 부르면 캔버스 실제 폭이 0으로 읽혀
    // (getBoundingClientRect) 안내선·얼굴이 전혀 그려지지 않는다 — 반드시 화면을 보이게 한 뒤에 크기를 맞춘다.
    showScreen('scr-play');
    canvasEl.resize();
    resetIdle();
    setTimeout(() => { if (cur && !cur.locked) A.speak('점선을 따라 선을 그어 볼까?'); }, 300);
  }

  function resetIdle() {
    clearTimeout(idleTimer);
    if (!cur || cur.locked) return;
    idleTimer = setTimeout(() => {
      if (!cur || cur.locked || screenId !== 'scr-play') return;
      A.speak(D.nudges[Math.floor(Math.random() * D.nudges.length)]);
      resetIdle();
    }, IDLE_MS);
  }

  function onCanvasChange() {
    resetIdle();
    checkComplete();
  }

  function checkComplete() {
    if (!cur || cur.locked) return;
    if (canvasEl.strokeCount() === 0) return;
    const cov = canvasEl.coverage();
    const adh = canvasEl.adherence();
    if (cov >= COV_THRESH && adh >= ADH_THRESH) complete();
  }

  function complete() {
    cur.locked = true;
    clearTimeout(idleTimer);
    const pz = cur.pz;
    const first = !P.isDone(pz.id);
    P.markDone(pz.id);
    P.addStar(1);
    if (window.Pet) Pet.awardSnack(1);
    if (first && window.Pet) {
      const ids = D.puzzlesOf(pz.level).map(x => x.id);
      if (P.doneCount(ids) >= ids.length) Pet.awardMeal(1);
    }
    burstConfetti();
    A.sfx.fanfare();
    const praise = D.praises[Math.floor(Math.random() * D.praises.length)];
    setTimeout(() => A.speak(praise), 250);
    setTimeout(() => showReward(praise), 650);
  }

  function showReward(praise) {
    $('reward-praise').textContent = praise;
    $('reward-face').textContent = cur.pz.char;
    $('reward').classList.add('on');
  }
  function nextPuzzle() {
    const list = D.puzzlesOf(cur.pz.level);
    const idx = list.findIndex(x => x.id === cur.pz.id);
    for (let k = 1; k <= list.length; k++) {
      const cand = list[(idx + k) % list.length];
      if (!P.isDone(cand.id)) { openPlay(cand); return; }
    }
    openList(D.stageDef(cur.pz.level));
  }

  /* ─────────── 색종이 축하 (connect 앱과 같은 방식) ─────────── */
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

    canvasEl = Ink.GuideCanvas($('play-canvas'), { onChange: onCanvasChange });

    document.querySelectorAll('[data-go]').forEach(b => {
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); showScreen(b.dataset.go); });
    });
    $('btn-play-back').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); openList(D.stageDef(cur.pz.level));
    });
    $('btn-listen').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); A.speak('점선을 따라 선을 그어 볼까?');
    });
    $('btn-clear').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.pop(); canvasEl.clear(); resetIdle();
    });
    $('reward-next').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on'); nextPuzzle();
    });
    $('reward-close').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on');
      openList(D.stageDef(cur.pz.level));
    });

    renderHome();
  }
  init();

  /* ─────────── 종단 테스트용 ─────────── */
  function debug() {
    return {
      screen: screenId,
      stars: P.stars(),
      stage: cur ? cur.pz.level : null,
      puzzle: cur ? cur.pz.id : null,
      type: cur ? cur.pz.type : null,
      strokeCount: canvasEl ? canvasEl.strokeCount() : 0,
      coveragePct: canvasEl ? canvasEl.coverage() : 0,
      adherencePct: canvasEl ? canvasEl.adherence() : 0,
      done: cur ? cur.locked : null,
    };
  }
  // 안내선을 그대로 따라 그리는 완벽한 트레이스를 시뮬레이션 — e2e 가 실제 드래그 없이 완성시킬 때 쓴다
  function _trace() {
    if (!cur || cur.locked) return;
    canvasEl.traceGuide();
  }
  return { debug, _solve: _trace, _trace };
})();
