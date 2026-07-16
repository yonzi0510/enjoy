/* ═══════════ 찾기 놀이터 게임 엔진 ═══════════
 * 씬 계약: 각 테마는 SCENES.push({id,name,emoji,bg,buildScene(variant,level),hidden[],sticker})
 *  - buildScene('A'|'B', 1|2|3) → viewBox="0 0 1200 800" SVG 문자열
 *  - 숨은그림 대상: <g data-find="id" data-label="이름" data-level="2">
 *    (data-level 없으면 1. 모든 레벨 대상이 항상 그려지고, 현재 레벨 것만 찾기 대상)
 *  - 다른그림 차이: <g data-diff="n" data-level="2" data-cx data-cy data-r>
 *    (해당 레벨의 B에서만 내용이 달라짐. A/B 동일 좌표. L1 5개·L2 6개·L3 7개)
 */
(() => {
  const SCENES = window.SCENES || [];
  const $ = id => document.getElementById(id);

  // 난이도별 설정: 판정 반경(viewBox px)·자동 힌트 대기(0=끔)
  const LEVELS = {
    1: { name: '쉬움',   icon: '🌱', hitR: 55, diffHitR: 70, autoHintMs: 12000 },
    2: { name: '보통',   icon: '🌟', hitR: 45, diffHitR: 55, autoHintMs: 20000 },
    3: { name: '어려움', icon: '🔥', hitR: 36, diffHitR: 45, autoHintMs: 0 }
  };
  const TIER_BADGE = { 1: '🏅', 2: '🥇', 3: '💎' };
  const TIER_NAME = { 1: '', 2: '금빛 ', 3: '보석 ' };

  const state = {
    theme: null,       // 현재 테마 객체
    mode: null,        // 'hidden' | 'diff'
    level: 1,          // 1 쉬움 | 2 보통 | 3 어려움
    foundCount: 0,
    total: 0,
    hintCount: 0,      // 전구 버튼 사용 횟수 (별 계산용)
    idleTimer: null,
    playing: false
  };

  /* ─────────── 화면 전환 ─────────── */
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
  }

  /* ─────────── 소리 버튼 ─────────── */
  function updateMuteIcons() {
    const icon = Sound.isMuted() ? '🔇' : '🔊';
    $('btn-mute').textContent = icon;
    $('game-mute').textContent = icon;
  }
  function toggleMute() { Sound.toggleMute(); updateMuteIcons(); }
  $('btn-mute').addEventListener('click', toggleMute);
  $('game-mute').addEventListener('click', toggleMute);

  // 첫 터치에서 iOS/안드로이드 오디오 잠금 해제
  document.addEventListener('pointerdown', () => Sound.unlock(), { once: true });

  /* ─────────── 홈 화면 ─────────── */
  function starStr(n) { return '★'.repeat(n) + '☆'.repeat(3 - n); }

  function renderHome() {
    const grid = $('theme-grid');
    grid.innerHTML = '';
    SCENES.forEach(theme => {
      const total = Progress.totalStars(theme.id);
      const tier = Progress.getStickerTier(theme.id);
      const card = document.createElement('button');
      card.className = 'theme-card';
      card.style.background = theme.bg || '#fff';
      card.innerHTML =
        '<div class="theme-thumb">' + theme.buildScene('A', 1) + '</div>' +
        '<div class="theme-card-label"><span>' + theme.emoji + '</span><span>' + theme.name + '</span></div>' +
        '<div class="theme-card-stars"><span>⭐ ' + total + ' / 18</span></div>' +
        (tier ? '<div class="theme-card-sticker-badge">' + TIER_BADGE[tier] + '</div>' : '');
      card.addEventListener('click', () => openModeSelect(theme));
      grid.appendChild(card);
    });
  }

  /* ─────────── 모드·난이도 선택 ─────────── */
  function openModeSelect(theme) {
    state.theme = theme;
    $('mode-theme-name').textContent = theme.emoji + ' ' + theme.name;
    document.querySelectorAll('.level-btn').forEach(btn => {
      const stars = Progress.getStars(theme.id + '_' + btn.dataset.mode + '_L' + btn.dataset.level);
      btn.querySelector('.level-btn-stars').textContent = starStr(stars);
    });
    $('mode-overlay').classList.remove('hidden');
    // 글을 못 읽는 아이를 위해 무엇이 있는지 말로 알려준다
    Sound.speak('무슨 놀이를 할까요? 위는 숨은그림찾기, 아래는 다른그림찾기예요!');
  }
  $('mode-close').addEventListener('click', () => $('mode-overlay').classList.add('hidden'));
  $('mode-overlay').addEventListener('click', e => {
    if (e.target === $('mode-overlay')) $('mode-overlay').classList.add('hidden');
  });
  document.querySelectorAll('.level-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $('mode-overlay').classList.add('hidden');
      startGame(state.theme, btn.dataset.mode, +btn.dataset.level);
    });
  });

  /* ─────────── SVG 유틸 ─────────── */
  const SVGNS = 'http://www.w3.org/2000/svg';

  // 화면 좌표 → SVG viewBox 좌표
  function svgPoint(svg, clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  function addCircle(svg, cx, cy, r, className) {
    const c = document.createElementNS(SVGNS, 'circle');
    c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r);
    c.setAttribute('class', className);
    svg.appendChild(c);
    return c;
  }

  function ripple(svg, x, y) {
    const c = addCircle(svg, x, y, 42, 'tap-ripple');
    setTimeout(() => c.remove(), 550);
  }

  // 탭 판정 — 세로 화면 확대 모드에선 손가락으로 그림을 밀어 볼 수 있으므로
  // 12px 이상 움직이거나 오래 누른 경우(패닝)는 탭으로 치지 않는다
  function addTapHandler(svg, fn) {
    let dx = 0, dy = 0, dt = 0;
    svg.addEventListener('pointerdown', e => { dx = e.clientX; dy = e.clientY; dt = Date.now(); });
    svg.addEventListener('pointerup', e => {
      if (Math.hypot(e.clientX - dx, e.clientY - dy) > 12 || Date.now() - dt > 700) return;
      fn(e);
    });
  }

  // 가로 스크롤 씬에서 특정 viewBox x좌표가 화면 가운데 오도록
  function scrollToPoint(wrap, svg, cx) {
    if (wrap.scrollWidth <= wrap.clientWidth + 4) return;
    const scale = svg.getBoundingClientRect().width / 1200;
    wrap.scrollTo({ left: cx * scale - wrap.clientWidth / 2, behavior: 'smooth' });
  }
  function centerScroll(wrap) {
    wrap.scrollLeft = (wrap.scrollWidth - wrap.clientWidth) / 2;
  }
  function syncScroll(a, b) {
    let lock = false;
    const link = (x, y) => x.addEventListener('scroll', () => {
      if (lock) return;
      lock = true;
      y.scrollLeft = x.scrollLeft;
      requestAnimationFrame(() => { lock = false; });
    });
    link(a, b); link(b, a);
  }

  function groupCenter(g, minR) {
    const b = g.getBBox();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2, r: Math.max(minR, Math.max(b.width, b.height) / 2 + 14) };
  }

  /* ─────────── 게임 시작 ─────────── */
  function startGame(theme, mode, level) {
    state.theme = theme;
    state.mode = mode;
    state.level = level || 1;
    state.foundCount = 0;
    state.hintCount = 0;
    state.playing = true;

    const lv = LEVELS[state.level];
    $('game-title').textContent = theme.emoji + ' ' + theme.name + ' · ' + (mode === 'hidden' ? '숨은그림' : '다른그림') + ' ' + lv.icon + lv.name;
    $('hidden-layout').classList.toggle('hidden', mode !== 'hidden');
    $('diff-layout').classList.toggle('hidden', mode !== 'diff');
    showScreen('screen-game');

    if (mode === 'hidden') setupHidden(theme);
    else setupDiff(theme);

    resetIdleTimer();
  }

  /* ─────────── 숨은그림찾기 ─────────── */
  function setupHidden(theme) {
    const lv = LEVELS[state.level];
    const wrap = $('hidden-scene');
    wrap.style.background = theme.bg || '#fff'; // 레터박스 여백을 테마 색으로
    wrap.innerHTML = theme.buildScene('A', state.level);
    const svg = wrap.querySelector('svg');

    // 현재 레벨의 대상만 찾기 목록에 오름 (다른 레벨 대상은 장식)
    const targets = Array.from(svg.querySelectorAll('[data-find]'))
      .filter(g => (g.dataset.level || '1') === String(state.level));
    const trayItems = theme.hidden.filter(h => (h.level || 1) === state.level);
    state.total = targets.length;

    // 찾기 목록 트레이
    const tray = $('hidden-tray');
    tray.innerHTML = '';
    trayItems.forEach(h => {
      const item = document.createElement('div');
      item.className = 'tray-item';
      item.dataset.target = h.id;
      item.innerHTML = h.icon + '<span class="tray-check">✅</span>';
      tray.appendChild(item);
    });

    // 손가락 대응 — 대상별 판정 원(난이도별 최소 반경). 씬 z-order와 무관하게
    // 탭 지점에서 "가장 가까운 미발견 대상"을 거리로 판정한다 (겹침 오인식 방지)
    const finds = targets.map(g => {
      const c = groupCenter(g, lv.hitR);
      const hit = document.createElementNS(SVGNS, 'circle');
      hit.setAttribute('cx', c.x); hit.setAttribute('cy', c.y); hit.setAttribute('r', c.r);
      hit.setAttribute('fill', 'none');
      hit.setAttribute('pointer-events', 'none'); // 판정은 거리 계산으로 (스모크·힌트 좌표용)
      hit.setAttribute('data-findhit', g.dataset.find);
      svg.appendChild(hit);
      return { g, x: c.x, y: c.y, r: c.r };
    });

    addTapHandler(svg, e => {
      if (!state.playing) return;
      resetIdleTimer();
      const p = svgPoint(svg, e.clientX, e.clientY);
      let best = null, bestD = Infinity;
      finds.forEach(f => {
        if (f.g.dataset.found) return;
        const d = Math.hypot(p.x - f.x, p.y - f.y);
        if (d <= f.r && d < bestD) { best = f; bestD = d; }
      });
      if (best) {
        best.g.dataset.found = '1';
        state.foundCount++;
        addCircle(svg, best.x, best.y, best.r, 'found-ring');
        const trayItem = tray.querySelector('[data-target="' + best.g.dataset.find + '"]');
        if (trayItem) trayItem.classList.add('found');
        Sound.correct();
        if (state.foundCount >= state.total) finishLevel();
        else Sound.speak((best.g.dataset.label || '') + ' 찾았다!');
      } else {
        ripple(svg, p.x, p.y);
        Sound.pop();
      }
    });

    centerScroll(wrap); // 세로 화면 확대 모드: 가운데부터 보기
    Sound.speak(theme.name + ' ' + lv.name + ' 단계! 숨은 그림 ' + state.total + '개를 찾아보세요!');
  }

  function hintHidden(auto) {
    const svg = $('hidden-scene').querySelector('svg');
    if (!svg) return;
    // 히트영역이 곧 현재 레벨 대상 목록
    const remaining = Array.from(svg.querySelectorAll('[data-findhit]'))
      .filter(h => {
        const g = svg.querySelector('[data-find="' + h.dataset.findhit + '"]');
        return g && !g.dataset.found;
      });
    if (!remaining.length) return;
    const h = remaining[Math.floor(Math.random() * remaining.length)];
    const cx = +h.getAttribute('cx'), cy = +h.getAttribute('cy'), r = +h.getAttribute('r');
    scrollToPoint($('hidden-scene'), svg, cx); // 화면 밖이면 스크롤해서 보여주기
    const ring = addCircle(svg, cx, cy, r + 8, 'hint-ring');
    setTimeout(() => ring.remove(), 1800);
    Sound.sparkle();
    if (!auto) {
      state.hintCount++;
      Sound.speak('여기를 잘 보세요!');
    }
  }

  /* ─────────── 다른그림찾기 ─────────── */
  function setupDiff(theme) {
    const lv = LEVELS[state.level];
    const wrapA = $('diff-scene-a');
    const wrapB = $('diff-scene-b');
    wrapA.style.background = theme.bg || '#fff';
    wrapB.style.background = theme.bg || '#fff';
    wrapA.innerHTML = theme.buildScene('A', state.level);
    wrapB.innerHTML = theme.buildScene('B', state.level);
    const svgA = wrapA.querySelector('svg');
    const svgB = wrapB.querySelector('svg');

    // 차이 마커는 B에서, 현재 레벨 것만 (양쪽 동일 좌표 계약)
    const markers = Array.from(svgB.querySelectorAll('[data-diff]'))
      .filter(g => (g.dataset.level || '1') === String(state.level))
      .map(g => ({
        id: g.dataset.diff,
        cx: +g.dataset.cx, cy: +g.dataset.cy,
        r: Math.max(lv.diffHitR, +(g.dataset.r || 0))
      }));
    state.total = markers.length;
    state.diffFound = {};

    // 진행 점
    const prog = $('diff-progress');
    prog.innerHTML = '';
    markers.forEach(m => {
      const dot = document.createElement('div');
      dot.className = 'diff-dot';
      dot.dataset.diffId = m.id;
      prog.appendChild(dot);
    });

    // 양쪽 그림에 판정 좌표 주입 (스모크·힌트 좌표용) + 거리 기반 판정 (겹침 오인식 방지)
    [svgA, svgB].forEach(svg => {
      markers.forEach(m => {
        const hit = document.createElementNS(SVGNS, 'circle');
        hit.setAttribute('cx', m.cx); hit.setAttribute('cy', m.cy); hit.setAttribute('r', m.r);
        hit.setAttribute('fill', 'none');
        hit.setAttribute('pointer-events', 'none');
        hit.setAttribute('data-diffhit', m.id);
        svg.appendChild(hit);
      });

      addTapHandler(svg, e => {
        if (!state.playing) return;
        resetIdleTimer();
        const p = svgPoint(svg, e.clientX, e.clientY);
        let best = null, bestD = Infinity;
        markers.forEach(m => {
          if (state.diffFound[m.id]) return;
          const d = Math.hypot(p.x - m.cx, p.y - m.cy);
          if (d <= m.r && d < bestD) { best = m; bestD = d; }
        });
        if (best) {
          state.diffFound[best.id] = true;
          state.foundCount++;
          // 양쪽 모두에 표시
          addCircle(svgA, best.cx, best.cy, best.r - 6, 'found-ring');
          addCircle(svgB, best.cx, best.cy, best.r - 6, 'found-ring');
          const dot = prog.querySelector('[data-diff-id="' + best.id + '"]');
          if (dot) dot.classList.add('on');
          Sound.correct();
          if (state.foundCount >= state.total) finishLevel();
          else Sound.speakPraise();
        } else {
          ripple(svg, p.x, p.y);
          Sound.pop();
        }
      });
    });

    centerScroll(wrapA); centerScroll(wrapB);
    syncScroll(wrapA, wrapB); // 한쪽을 밀면 두 그림이 같이 움직임
    Sound.speak(lv.name + ' 단계! 두 그림에서 서로 다른 곳 ' + state.total + '개를 찾아보세요!');
  }

  function hintDiff(auto) {
    const svgA = $('diff-scene-a').querySelector('svg');
    const svgB = $('diff-scene-b').querySelector('svg');
    if (!svgA || !svgB) return;
    const remaining = Array.from(svgB.querySelectorAll('[data-diffhit]'))
      .filter(h => !state.diffFound[h.dataset.diffhit]);
    if (!remaining.length) return;
    const h = remaining[Math.floor(Math.random() * remaining.length)];
    const cx = +h.getAttribute('cx'), cy = +h.getAttribute('cy'), r = +h.getAttribute('r');
    scrollToPoint($('diff-scene-a'), svgA, cx); // 동기화로 B도 함께 이동
    [svgA, svgB].forEach(svg => {
      const ring = addCircle(svg, cx, cy, r, 'hint-ring');
      setTimeout(() => ring.remove(), 1800);
    });
    Sound.sparkle();
    if (!auto) {
      state.hintCount++;
      Sound.speak('여기를 잘 보세요!');
    }
  }

  /* ─────────── 힌트 & 무입력 자동 힌트 ─────────── */
  function doHint(auto) {
    if (!state.playing) return;
    if (state.mode === 'hidden') hintHidden(auto);
    else hintDiff(auto);
    resetIdleTimer();
  }
  $('game-hint').addEventListener('click', () => doHint(false));

  function resetIdleTimer() {
    clearTimeout(state.idleTimer);
    if (!state.playing) return;
    const ms = LEVELS[state.level].autoHintMs;
    if (!ms) return; // 어려움: 자동 힌트 없음
    state.idleTimer = setTimeout(() => doHint(true), ms); // 자동 힌트는 별 감점 없음
  }

  /* ─────────── 레벨 완료 ─────────── */
  function calcStars() {
    if (state.hintCount === 0) return 3;
    if (state.hintCount <= 2) return 2;
    return 1;
  }

  function finishLevel() {
    state.playing = false;
    clearTimeout(state.idleTimer);
    const stars = calcStars();
    const lvNum = state.level;
    const firstClear = Progress.getStars(state.theme.id + '_' + state.mode + '_L' + lvNum) === 0; // 이번이 첫 완주인지
    Progress.setStars(state.theme.id + '_' + state.mode + '_L' + lvNum, stars);

    // 펫 먹이: 판(씬) 완료 = 간식, 테마의 여섯 판(두 놀이 × 3단계)을 처음 모두 깨면 식사
    if (window.Pet) {
      Pet.awardSnack(1);
      if (firstClear) {
        let allDone = true;
        ['hidden', 'diff'].forEach(m => {
          for (let lv = 1; lv <= 3; lv++) {
            if (!Progress.getStars(state.theme.id + '_' + m + '_L' + lv)) allDone = false;
          }
        });
        if (allDone) Pet.awardMeal(1);
      }
    }

    // 별 연출
    const starsEl = $('complete-stars');
    starsEl.innerHTML = '';
    for (let i = 1; i <= 3; i++) {
      const s = document.createElement('span');
      s.className = 'star' + (i <= stars ? ' on' : '');
      s.textContent = '⭐';
      starsEl.appendChild(s);
    }

    // 스티커 티어: 해당 난이도의 두 게임 모두 완료 시 승급
    const reveal = $('sticker-reveal');
    reveal.classList.add('hidden');
    const bothDone =
      Progress.getStars(state.theme.id + '_hidden_L' + lvNum) > 0 &&
      Progress.getStars(state.theme.id + '_diff_L' + lvNum) > 0;
    let gotTier = 0;
    if (bothDone && Progress.upgradeStickerTier(state.theme.id, lvNum)) {
      gotTier = lvNum;
      $('sticker-reveal-label').textContent = '🎁 ' + (gotTier > 1 ? TIER_BADGE[gotTier] + ' 스티커 승급!' : '새 스티커!');
      $('sticker-reveal-art').innerHTML = state.theme.sticker.svg;
      $('sticker-reveal-art').className = 'sticker-art tier-' + gotTier;
      $('sticker-reveal-name').textContent = TIER_NAME[gotTier] + state.theme.sticker.name;
    }

    setTimeout(() => {
      $('complete-overlay').classList.remove('hidden');
      launchConfetti();
      Sound.tada();
      Sound.speakDone();
      if (gotTier) {
        setTimeout(() => {
          reveal.classList.remove('hidden');
          Sound.fanfare();
          Sound.speak(gotTier > 1 ? '스티커가 더 멋지게 변했어요! ' + TIER_NAME[gotTier] + state.theme.sticker.name + '!' : '새 스티커를 받았어요! ' + state.theme.sticker.name + '!');
        }, 1600);
      }
    }, 600);
  }

  function launchConfetti() {
    const box = $('confetti-box');
    box.innerHTML = '';
    const colors = ['#FF4D4D', '#FFB800', '#4DC94D', '#4DA6FF', '#C77DFF', '#FF8FC7'];
    for (let i = 0; i < 44; i++) {
      const p = document.createElement('div');
      p.className = 'confetti';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = colors[i % colors.length];
      p.style.width = p.style.height = (8 + Math.random() * 10) + 'px';
      p.style.borderRadius = Math.random() < 0.5 ? '50%' : '3px';
      p.style.animationDuration = (1.4 + Math.random() * 1.6) + 's';
      p.style.animationDelay = (Math.random() * 0.7) + 's';
      box.appendChild(p);
    }
    setTimeout(() => { box.innerHTML = ''; }, 4200);
  }

  function closeComplete() {
    $('complete-overlay').classList.add('hidden');
    $('confetti-box').innerHTML = '';
  }

  $('complete-home').addEventListener('click', () => { closeComplete(); goHome(); });
  $('complete-next').addEventListener('click', () => {
    closeComplete();
    const next = pickNextLevel();
    if (next) startGame(next.theme, next.mode, next.level);
    else goHome();
  });

  // 다음 놀이: 같은 테마 다른 게임(같은 난이도) → 다른 테마(같은 난이도) → 다음 난이도
  function pickNextLevel() {
    const t = state.theme;
    const lv = state.level;
    const otherMode = state.mode === 'hidden' ? 'diff' : 'hidden';
    if (!Progress.getStars(t.id + '_' + otherMode + '_L' + lv)) return { theme: t, mode: otherMode, level: lv };
    const idx = SCENES.indexOf(t);
    for (let i = 1; i <= SCENES.length; i++) {
      const cand = SCENES[(idx + i) % SCENES.length];
      if (!Progress.getStars(cand.id + '_hidden_L' + lv)) return { theme: cand, mode: 'hidden', level: lv };
      if (!Progress.getStars(cand.id + '_diff_L' + lv)) return { theme: cand, mode: 'diff', level: lv };
    }
    if (lv < 3) return { theme: t, mode: 'hidden', level: lv + 1 };
    return { theme: SCENES[(idx + 1) % SCENES.length], mode: 'hidden', level: 3 };
  }

  /* ─────────── 뒤로가기 / 스티커북 ─────────── */
  function goHome() {
    state.playing = false;
    clearTimeout(state.idleTimer);
    if (window.speechSynthesis) speechSynthesis.cancel();
    renderHome();
    showScreen('screen-home');
  }
  $('game-back').addEventListener('click', goHome);

  function renderStickers() {
    const grid = $('sticker-grid');
    grid.innerHTML = '';
    SCENES.forEach(theme => {
      const tier = Progress.getStickerTier(theme.id);
      const slot = document.createElement('div');
      slot.className = 'sticker-slot' + (tier ? '' : ' locked');
      slot.innerHTML =
        '<div class="sticker-art tier-' + tier + '">' + theme.sticker.svg + '</div>' +
        '<div class="sticker-name">' + (tier ? (tier > 1 ? TIER_BADGE[tier] + ' ' : '') + TIER_NAME[tier] + theme.sticker.name : '???') + '</div>' +
        (tier === 3 ? '' : '<div class="sticker-hint-text">' + theme.emoji + ' ' + theme.name + ' ' +
          (tier ? LEVELS[tier + 1].name + ' 단계 2개를 깨면 더 멋져져요' : '놀이 2개를 모두 깨면 받아요') + '</div>');
      grid.appendChild(slot);
    });
  }
  $('btn-stickers').addEventListener('click', () => {
    renderStickers();
    showScreen('screen-stickers');
    Sound.speak('내 스티커북이에요!');
  });
  $('stickers-back').addEventListener('click', goHome);

  /* ─────────── 시작 ─────────── */
  updateMuteIcons();
  renderHome();
})();
