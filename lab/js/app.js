/* 앱 셸 — 홈/미션 실험/자유 실험/색깔 도감 화면 전환과 혼색 실험 흐름 */
window.App = (() => {
  const D = window.LabData;
  const M = window.Mix;
  const A = window.Audio2;
  const P = window.Progress;

  const $ = id => document.getElementById(id);
  const WATER = [206, 234, 244]; // 맹물 색
  const BASE_LEVEL = 0.4;        // 기본 물 높이
  const LEVEL_PER_DROP = 0.06;

  /* ─────────── 화면 전환 ─────────── */
  function showScreen(id) {
    A.stop();
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id === 'scr-home') renderHome();
  }

  /* ─────────── 홈 ─────────── */
  const MODES = [
    { id: 'mission', icon: '🎯', name: '미션 실험', desc: '목표 색을 만들어라!', cls: 'c-mission' },
    { id: 'free', icon: '🌈', name: '자유 실험', desc: '마음껏 섞어 보자', cls: 'c-free' },
    { id: 'book', icon: '📖', name: '색깔 도감', desc: '모은 색 구경하기', cls: 'c-book' },
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
      if (m.id === 'free') {
        const n = P.shelf().length;
        prog = n ? '🧴 병 ' + n + '개' : '처음이야!';
      } else {
        const n = P.missionCount();
        prog = n ? '🎨 ' + n + ' / ' + D.MISSIONS.length : '처음이야!';
      }
      b.innerHTML =
        '<span class="mc-icon">' + m.icon + '</span>' +
        '<span class="mc-name">' + m.name + '</span>' +
        '<span class="mc-desc">' + m.desc + '</span>' +
        '<span class="mc-prog">' + prog + '</span>';
      b.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.tap();
        if (m.id === 'mission') openMissions();
        else if (m.id === 'free') openLab('free', null);
        else openBook();
      });
      menu.appendChild(b);
    });
  }

  /* ─────────── 미션 목록 ─────────── */
  function openMissions() {
    $('missions-count').textContent = '🎨 ' + P.missionCount() + ' / ' + D.MISSIONS.length;
    const list = $('missions-list');
    list.innerHTML = '';
    D.MISSIONS.forEach(ms => {
      const done = P.missionDone(ms.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mission-card' + (done ? ' done' : '');
      b.dataset.id = ms.id;
      b.innerHTML =
        '<span class="mi-swatch" style="background:' + ms.target + '"></span>' +
        '<span class="mi-name">' + ms.emoji + ' ' + ms.name + '</span>' +
        '<span class="mi-state">' + (done ? '🦋 완성!' : '만들어 보자!') + '</span>';
      b.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.tap();
        openLab('mission', ms);
      });
      list.appendChild(b);
    });
    showScreen('scr-missions');
  }

  /* ─────────── 색깔 도감 ─────────── */
  function openBook() {
    $('book-count').textContent = P.missionCount() + ' / ' + D.MISSIONS.length;
    const grid = $('book-grid');
    grid.innerHTML = '';
    D.MISSIONS.forEach(ms => {
      const done = P.missionDone(ms.id);
      const cell = document.createElement('div');
      cell.className = 'book-cell' + (done ? ' done' : '');
      cell.innerHTML = done
        ? '<span class="bk-jar" style="background:' + ms.target + '">🧪</span>' +
          '<span class="bk-name">' + ms.emoji + ' ' + ms.name + '</span>'
        : '<span class="bk-jar empty">❓</span><span class="bk-name">아직 몰라요</span>';
      grid.appendChild(cell);
    });
    showScreen('scr-book');
  }

  /* ─────────── 실험대 (미션·자유 공용) ─────────── */
  // lab = { mode:'mission'|'free', mission, drops:[paint], lock, hinted, judgeTimer, rewardTimer }
  let lab = null;

  function openLab(mode, mission) {
    clearLabTimers();
    lab = { mode, mission, drops: [], lock: false, hinted: false, judgeTimer: null, rewardTimer: null };
    $('lab-title').textContent = mode === 'mission'
      ? '🎯 ' + mission.name + ' 만들기'
      : '🌈 자유 실험';
    $('target-chip').hidden = mode !== 'mission';
    $('mix-name').hidden = mode !== 'free';
    $('btn-keep').hidden = mode !== 'free';
    $('shelf').hidden = mode !== 'free';
    if (mode === 'mission') {
      $('target-swatch').style.background = mission.target;
      $('target-name').textContent = mission.name;
    } else {
      $('mix-name').textContent = '💧 맹물';
      renderShelf();
    }
    showScreen('scr-lab');
    jar.reset();
    jar.start();
    setTimeout(() => sayIntro(), 350);
  }
  function sayIntro() {
    if (!lab) return;
    if (lab.mode === 'mission') {
      A.speak(lab.mission.sayName + '을 만들어 볼까? 물감 방울을 병에 떨어뜨려 봐!');
    } else {
      A.speak('물감을 마음껏 섞어 보자! 예쁜 색이 나오면 병에 담아서 모을 수 있어!');
    }
  }
  function clearLabTimers() {
    if (lab && lab.judgeTimer) clearTimeout(lab.judgeTimer);
    if (lab && lab.rewardTimer) clearTimeout(lab.rewardTimer);
  }
  function closeLab() {
    clearLabTimers();
    jar.stop();
    if (lab && lab.mode === 'mission') openMissions();
    else showScreen('scr-home');
    lab = null;
  }

  function curMixRgb() { return M.mixDrops(lab.drops); }

  /* ─────────── 유리병 캔버스 — 출렁이는 물 + 뽀글 거품 ─────────── */
  const jar = (() => {
    const cv = $('jar-canvas');
    const ctx = cv.getContext('2d');
    const VW = 200, VH = 250;            // SVG viewBox 와 같은 좌표계
    const IX0 = 34, IX1 = 166;           // 병 안쪽 가로 범위
    const IY_TOP = 104, IY_BOT = 226;    // 물 표면이 오갈 수 있는 세로 범위
    let running = false;
    let t = 0, amp = 0;                  // 시간·출렁임 세기
    let level = BASE_LEVEL, levelTo = BASE_LEVEL;
    let col = WATER.slice(), colTo = WATER.slice();
    let bubbles = [];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) return;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    function surfaceY() { return IY_BOT - level * (IY_BOT - IY_TOP); }

    function draw() {
      if (!running) return;
      t += 1 / 60;
      amp *= 0.965; // 출렁임이 서서히 잦아든다
      level += (levelTo - level) * 0.08;
      for (let i = 0; i < 3; i++) col[i] += (colTo[i] - col[i]) * 0.07;

      const w = cv.width, h = cv.height;
      if (!w || !h) { requestAnimationFrame(draw); return; }
      ctx.setTransform(w / VW, 0, 0, h / VH, 0, 0);
      ctx.clearRect(0, 0, VW, VH);

      // 물 — 표면은 사인파 두 개를 겹쳐 출렁이게
      const sy = surfaceY();
      const a = 1.4 + amp * 9;
      ctx.beginPath();
      ctx.moveTo(IX0, IY_BOT);
      ctx.lineTo(IX0, sy);
      for (let x = IX0; x <= IX1; x += 4) {
        const y = sy + Math.sin(x * 0.055 + t * 3.1) * a + Math.sin(x * 0.11 - t * 2.3) * a * 0.6;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(IX1, IY_BOT);
      // 바닥 모서리는 둥글게
      ctx.quadraticCurveTo(IX1, IY_BOT + 14, IX1 - 18, IY_BOT + 14);
      ctx.lineTo(IX0 + 18, IY_BOT + 14);
      ctx.quadraticCurveTo(IX0, IY_BOT + 14, IX0, IY_BOT);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, sy, 0, IY_BOT + 14);
      const c = col.map(Math.round);
      g.addColorStop(0, 'rgba(' + Math.min(255, c[0] + 34) + ',' + Math.min(255, c[1] + 34) + ',' + Math.min(255, c[2] + 34) + ',.92)');
      g.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',.95)');
      ctx.fillStyle = g;
      ctx.fill();

      // 뽀글뽀글 거품
      bubbles = bubbles.filter(b => b.life > 0);
      bubbles.forEach(b => {
        b.y -= b.vy;
        b.x += Math.sin(t * 5 + b.seed) * 0.35;
        b.life -= 0.013;
        if (b.y < sy + 4) b.life -= 0.08; // 표면에 닿으면 톡 터진다
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,' + Math.max(0, Math.min(0.7, b.life)) + ')';
        ctx.fill();
      });

      requestAnimationFrame(draw);
    }

    return {
      start() { resize(); if (!running) { running = true; requestAnimationFrame(draw); } },
      stop() { running = false; },
      resize,
      reset() {
        level = levelTo = BASE_LEVEL;
        col = WATER.slice(); colTo = WATER.slice();
        amp = 0; bubbles = [];
      },
      splash(rgb, nDrops) { // 방울이 떨어졌다 — 색·높이 갱신 + 출렁 + 거품
        colTo = rgb.slice();
        levelTo = Math.min(BASE_LEVEL + nDrops * LEVEL_PER_DROP, 0.88);
        amp = 1;
        for (let i = 0; i < 7; i++) {
          bubbles.push({
            x: IX0 + 20 + Math.random() * (IX1 - IX0 - 40),
            y: IY_BOT - Math.random() * 30,
            r: 2 + Math.random() * 3.5,
            vy: 0.5 + Math.random() * 0.7,
            life: 0.65 + Math.random() * 0.3,
            seed: Math.random() * 9,
          });
        }
      },
      drain() { colTo = WATER.slice(); levelTo = BASE_LEVEL; amp = 0.7; bubbles = []; },
      color() { return col.map(Math.round); },
    };
  })();

  /* ─────────── 물감 방울 팔레트 + 드래그 ─────────── */
  function renderPalette() {
    const box = $('palette');
    box.innerHTML = '';
    D.PAINTS.forEach(p => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'drop' + (p.id === 'white' ? ' drop-white' : '');
      b.dataset.paint = p.id;
      b.style.setProperty('--drop-color', p.color);
      b.setAttribute('aria-label', p.name + ' 물감');
      b.addEventListener('pointerdown', ev => startDrag(ev, p));
      box.appendChild(b);
    });
  }

  let drag = null; // { paint, ghost, id, moved, sx, sy }
  function startDrag(ev, paint) {
    if (!lab || lab.lock || drag) return;
    ev.preventDefault();
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost' + (paint.id === 'white' ? ' drop-white' : '');
    ghost.style.setProperty('--drop-color', paint.color);
    document.body.appendChild(ghost);
    drag = { paint, ghost, id: ev.pointerId, moved: false, sx: ev.clientX, sy: ev.clientY };
    moveGhost(ev.clientX, ev.clientY);
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragUp);
    window.addEventListener('pointercancel', onDragUp);
  }
  function moveGhost(x, y) {
    drag.ghost.style.left = x + 'px';
    drag.ghost.style.top = y + 'px';
    $('jar-wrap').classList.toggle('over', overJar(x, y));
  }
  function overJar(x, y) {
    const r = $('jar-wrap').getBoundingClientRect();
    return x > r.left - 24 && x < r.right + 24 && y > r.top - 24 && y < r.bottom + 24;
  }
  function onDragMove(ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    if (Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) > 12) drag.moved = true;
    moveGhost(ev.clientX, ev.clientY);
  }
  function onDragUp(ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    const { paint, ghost, moved } = drag;
    const drop = ev.type === 'pointerup' && overJar(ev.clientX, ev.clientY);
    ghost.remove();
    $('jar-wrap').classList.remove('over');
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragUp);
    window.removeEventListener('pointercancel', onDragUp);
    drag = null;
    if (drop) addDrop(paint);
    else if (!moved) { A.sfx.tap(); A.speak('물감 방울을 병까지 끌어다 놓아 봐!'); } // 톡 누르기만 했다
  }

  function addDrop(paint) {
    if (!lab || lab.lock) return;
    if (lab.drops.length >= D.MAX_DROPS) {
      wiggle('jar-wrap');
      A.sfx.tap();
      A.speak('병이 가득 찼어! 물을 비우고 다시 섞어 보자.');
      return;
    }
    lab.drops.push(paint);
    const rgb = curMixRgb();
    jar.splash(rgb, lab.drops.length);
    A.sfx.bubble();
    if (lab.mode === 'free') $('mix-name').textContent = '🎨 ' + D.nameOf(rgb);
    if (lab.judgeTimer) clearTimeout(lab.judgeTimer);
    if (lab.mode === 'mission') lab.judgeTimer = setTimeout(judge, 900); // 출렁임을 본 뒤 판정
  }

  /* ─────────── 미션 판정 + 힌트 ─────────── */
  function judge() {
    if (!lab || lab.mode !== 'mission' || lab.lock || !lab.drops.length) return;
    const rgb = curMixRgb();
    const target = M.parse(lab.mission.target);
    if (M.dist(rgb, target) <= D.THRESHOLD) { succeed(rgb); return; }
    if (lab.drops.length < 2) { A.speak('좋아! 물감을 더 넣어서 섞어 보자!'); return; }
    // 어떤 물감을 한 방울 더 넣으면 목표에 가장 가까워질까?
    lab.hinted = true;
    const now = M.dist(rgb, target);
    let best = null, bd = now;
    D.PAINTS.forEach(p => {
      const d = M.dist(M.mixDrops(lab.drops.concat([p])), target);
      if (d < bd) { bd = d; best = p; }
    });
    if (best && lab.drops.length < D.MAX_DROPS) {
      A.speak('음, 조금 다르네? 조금 더 ' + best.name + '을 넣어 볼까?');
    } else {
      A.speak('음, 조금 다르네? 물을 비우고 처음부터 다시 섞어 볼까?');
    }
  }

  function succeed(rgb) {
    lab.lock = true;
    const ms = lab.mission;
    const first = !P.missionDone(ms.id);
    P.recordMission(ms.id);
    P.addStar(1);
    if (window.Pet) Pet.awardSnack(1);
    // 두 가지 도감 잔치: 기본 12색을 다 모으면 식사, 30색 전체를 다 모으면 또 식사 + 특별 축하
    const base = D.MISSIONS.slice(0, D.BASE_COUNT);
    const baseFirst = first && base.some(m => m.id === ms.id) && base.every(m => P.missionDone(m.id));
    const allFirst = first && P.missionCount() >= D.MISSIONS.length;
    if (baseFirst && window.Pet) Pet.awardMeal(1); // 기본 12색 도감 완성 = 특별 식사
    if (allFirst && window.Pet) Pet.awardMeal(1);  // 30색 전체 완성 = 특별 식사 한 번 더
    $('jar-sparkle').hidden = false;
    $('jar-wrap').classList.add('glow');
    A.sfx.sparkle();
    A.sfx.fanfare();
    flyButterfly(M.hex(rgb));
    A.speak(allFirst
      ? '우와! ' + ms.sayName + ' 완성! 서른 가지 색 도감을 전부 모았어요! 정말 최고의 꼬마 과학자야!'
      : baseFirst
        ? '우와! ' + ms.sayName + ' 완성! 열두 가지 기본 색 도감을 모두 모았어요! 정말 대단한 꼬마 과학자야!'
        : '우와! ' + ms.sayName + ' 완성! ' + D.PRAISES[Math.floor(Math.random() * D.PRAISES.length)]);
    lab.rewardTimer = setTimeout(() => {
      $('jar-sparkle').hidden = true;
      $('jar-wrap').classList.remove('glow');
      const next = D.MISSIONS.find(m => !P.missionDone(m.id));
      $('reward-icon').textContent = allFirst ? '🏆' : baseFirst ? '🌈' : '🦋';
      showReward(
        allFirst ? '30색 도감 완성! 🏆' : baseFirst ? '12색 도감 완성! 🌈' : ms.emoji + ' ' + ms.name + ' 완성!',
        next ? '다음 미션 ▶' : '도감 보기 📖',
        () => { if (next) openLab('mission', next); else openBook(); },
        () => openMissions());
    }, 1600);
  }

  /* 그 색 나비가 날아간다 — 병 위에서 위로 팔랑팔랑 */
  function flyButterfly(hexColor) {
    const r = $('jar-wrap').getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'butterfly';
    el.style.left = (r.left + r.width / 2) + 'px';
    el.style.top = (r.top + r.height * 0.25) + 'px';
    el.innerHTML =
      '<svg viewBox="0 0 100 80" aria-hidden="true">' +
      '<g class="bf-wings">' +
      '<path d="M50 40 C20 5 2 14 8 34 C12 48 32 52 50 46 Z" fill="' + hexColor + '" stroke="#5A4632" stroke-width="2.5"/>' +
      '<path d="M50 40 C80 5 98 14 92 34 C88 48 68 52 50 46 Z" fill="' + hexColor + '" stroke="#5A4632" stroke-width="2.5"/>' +
      '<path d="M50 42 C28 66 16 70 18 58 C20 48 36 44 50 46 Z" fill="' + hexColor + '" opacity=".8" stroke="#5A4632" stroke-width="2"/>' +
      '<path d="M50 42 C72 66 84 70 82 58 C80 48 64 44 50 46 Z" fill="' + hexColor + '" opacity=".8" stroke="#5A4632" stroke-width="2"/>' +
      '</g>' +
      '<ellipse cx="50" cy="44" rx="4.5" ry="14" fill="#5A4632"/>' +
      '<path d="M47 32 Q42 22 38 20 M53 32 Q58 22 62 20" fill="none" stroke="#5A4632" stroke-width="2" stroke-linecap="round"/>' +
      '</svg>';
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('fly'));
    setTimeout(() => el.remove(), 2600);
  }

  /* ─────────── 물 비우기 · 병에 담기 · 선반 ─────────── */
  function emptyJar(silent) {
    if (!lab || lab.lock) return;
    if (lab.judgeTimer) clearTimeout(lab.judgeTimer);
    lab.drops = [];
    lab.hinted = false;
    jar.drain();
    A.sfx.pour();
    if (lab.mode === 'free') $('mix-name').textContent = '💧 맹물';
    if (!silent) A.speak('콸콸! 깨끗한 물로 다시 시작!');
  }

  function keepColor() {
    if (!lab || lab.mode !== 'free') return;
    if (!lab.drops.length) {
      wiggle('btn-keep');
      A.sfx.tap();
      A.speak('먼저 물감을 섞어서 색을 만들어 봐!');
      return;
    }
    const rgb = curMixRgb();
    const name = D.nameOf(rgb);
    P.addShelf(M.hex(rgb), name);
    P.addStar(1);
    renderShelf();
    A.sfx.good();
    A.speak(name + ' 완성! 선반에 놓았어요!');
    emptyJar(true); // 새 실험 준비
  }

  function renderShelf() {
    const row = $('shelf-row');
    row.innerHTML = '';
    const items = P.shelf();
    if (!items.length) {
      row.innerHTML = '<span class="shelf-empty">아직 비어 있어요</span>';
      return;
    }
    items.slice().reverse().forEach(it => {
      const s = document.createElement('span');
      s.className = 'shelf-jar';
      s.innerHTML = '<span class="sj-body" style="background:' + it.c + '"></span><span class="sj-name">' + it.name + '</span>';
      row.appendChild(s);
    });
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

    renderPalette();

    document.querySelectorAll('[data-go]').forEach(b => {
      b.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.tap();
        showScreen(b.dataset.go);
      });
    });
    $('btn-lab-back').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); closeLab(); });
    $('btn-empty').addEventListener('click', ev => { ev.preventDefault(); emptyJar(); });
    $('btn-keep').addEventListener('click', ev => { ev.preventDefault(); keepColor(); });
    $('btn-say').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); sayIntro(); });
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
    window.addEventListener('resize', () => jar.resize());

    renderHome();
  }
  init();

  // 종단 테스트용 상태 확인
  function debug() {
    const rgb = lab && lab.drops.length ? curMixRgb() : null;
    return {
      stars: P.stars(),
      mode: lab ? lab.mode : null,
      mission: lab && lab.mission ? lab.mission.id : null,
      drops: lab ? lab.drops.map(p => p.id) : null,
      hex: rgb ? M.hex(rgb) : null,
      dist: rgb && lab.mission ? M.dist(rgb, M.parse(lab.mission.target)) : null,
      hinted: lab ? lab.hinted : null,
      lock: lab ? lab.lock : null,
      jarColor: M.hex(jar.color()),
      shelfLen: P.shelf().length,
      bookCount: P.missionCount(),
    };
  }

  return { showScreen, debug };
})();
