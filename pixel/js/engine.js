/* ═══════════ 픽셀 놀이터 엔진 (픽셀 컬러 바이 넘버) ═══════════
 * 도안 계약: 각 도안은 PIXELS.push({id,name,emoji,category,palette:[hex...],rows:['0120...',...]})
 *  - rows: 문자 '0'~'9' = palette 인덱스. 모든 행 길이 동일. 모든 칸이 채색 대상.
 * 렌더링: <canvas>. 칸이 충분히 클 때만 숫자 표시. 한 손가락/마우스 드래그 = 연속 채색,
 * 두 손가락 = 핀치 줌/이동, 휠 = 커서 기준 줌. 오답은 washed(연한) 색으로 표시되어 고칠 수 있다.
 */
(() => {
  const PICS = window.PIXELS || [];
  const $ = id => document.getElementById(id);

  const NUM_MIN_PX = 13;   // 칸 크기가 이보다 크면 숫자 표시
  const GRID_MIN_PX = 7;   // 칸 크기가 이보다 크면 격자선 표시
  const MAX_CELL_PX = 90;

  const CATS = {
    shape:   { emoji: '✨', name: '모양' },
    animal:  { emoji: '🐾', name: '동물' },
    nature:  { emoji: '🌿', name: '자연' },
    vehicle: { emoji: '🚀', name: '탈것' },
    food:    { emoji: '🍦', name: '음식' },
    work:    { emoji: '🖍️', name: '활동지' }
  };

  // 난이도: 격자가 클수록 부스터를 넉넉히
  const LEVELS = {
    1: { name: '쉬움', emoji: '🌱', boosters: { bomb: 3, wand: 1 } },
    2: { name: '보통', emoji: '🌟', boosters: { bomb: 4, wand: 2 } },
    3: { name: '어려움', emoji: '🔥', boosters: { bomb: 6, wand: 2 } }
  };
  const picLevel = pic => LEVELS[pic.level] ? pic.level : 1;
  const boosterDefaults = pic => ({ ...LEVELS[picLevel(pic)].boosters });

  const state = {
    pic: null, W: 0, H: 0, total: 0,
    target: null,     // Uint8Array — 정답 팔레트 인덱스
    painted: null,    // Int16Array — 칠한 인덱스(-1 = 안 칠함)
    sel: 0,
    view: { s: 20, ox: 0, oy: 0 },
    fitS: 20,
    playing: false,
    viewer: false,
    boosters: { bomb: 0, wand: 0 },
    bombArmed: false,
    correct: 0
  };

  const canvas = $('paint-canvas');
  const ctx = canvas.getContext('2d');
  const wrap = $('canvas-wrap');

  /* ─────────── 화면 전환 ─────────── */
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
  }

  /* ─────────── 소리 버튼 ─────────── */
  function updateMuteIcons() {
    const icon = Sound.isMuted() ? '🔇' : '🔊';
    $('btn-mute').textContent = icon;
    $('paint-mute').textContent = icon;
  }
  function toggleMute() { Sound.toggleMute(); updateMuteIcons(); }
  $('btn-mute').addEventListener('click', toggleMute);
  $('paint-mute').addEventListener('click', toggleMute);
  document.addEventListener('pointerdown', () => Sound.unlock(), { once: true });


  /* ─────────── 색 유틸 ─────────── */
  function hexRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  }
  function washed(hex) {
    const [r, g, b] = hexRgb(hex);
    const m = v => Math.round(v + (255 - v) * 0.62);
    return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')';
  }
  function luminance(hex) {
    const [r, g, b] = hexRgb(hex);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  /* ─────────── 도안 파싱 ─────────── */
  function parsePic(pic) {
    const H = pic.rows.length, W = pic.rows[0].length;
    const target = new Uint8Array(W * H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        target[y * W + x] = pic.rows[y].charCodeAt(x) - 48;
    return { W, H, target };
  }

  /* ─────────── 썸네일 (1칸 = 1px 캔버스 + pixelated) ─────────── */
  function makeThumb(pic, paintedArr) {
    const { W, H, target } = parsePic(pic);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    for (let i = 0; i < W * H; i++) {
      if (paintedArr) {
        const p = paintedArr[i];
        if (p === target[i]) g.fillStyle = pic.palette[p];
        else if (p >= 0) g.fillStyle = washed(pic.palette[p]);
        else g.fillStyle = '#efefef';
      } else {
        g.fillStyle = pic.palette[target[i]];
      }
      g.fillRect(i % W, (i / W) | 0, 1, 1);
    }
    return c;
  }

  /* ─────────── 홈 화면 ─────────── */
  let curCat = 'all';

  // 활동지(work) 도안은 5세가 혼자 하기 어려워 부모가 허용할 때만 보여준다
  function visiblePics() {
    const showWork = !!(window.ParentSettings && ParentSettings.get('showWorksheets'));
    return showWork ? PICS : PICS.filter(p => p.category !== 'work');
  }

  function renderChips() {
    const box = $('cat-chips');
    box.innerHTML = '';
    const cats = ['all', ...new Set(visiblePics().map(p => p.category))];
    if (cats.indexOf(curCat) < 0) curCat = 'all';
    cats.forEach(cat => {
      const chip = document.createElement('button');
      chip.className = 'cat-chip' + (cat === curCat ? ' sel' : '');
      chip.textContent = cat === 'all' ? '✨ 전체' : (CATS[cat] ? CATS[cat].emoji + ' ' + CATS[cat].name : cat);
      chip.addEventListener('click', () => { curCat = cat; renderHome(); });
      box.appendChild(chip);
    });
  }

  function renderHome() {
    renderChips();
    const grid = $('pic-grid');
    grid.innerHTML = '';
    // 난이도 단계별 섹션
    [1, 2, 3].forEach(lv => {
      const pics = visiblePics().filter(p => (curCat === 'all' || p.category === curCat) && picLevel(p) === lv);
      if (!pics.length) return;
      const head = document.createElement('div');
      head.className = 'level-head';
      head.textContent = LEVELS[lv].emoji + ' ' + LEVELS[lv].name;
      grid.appendChild(head);
      pics.forEach(pic => {
        const { W, H, target } = parsePic(pic);
        const correct = Progress.correctCount(pic.id, Array.from(target));
        const done = Progress.isDone(pic.id) && correct >= W * H;
        const pct = Math.round(correct / (W * H) * 100);
        const card = document.createElement('div');
        card.className = 'pic-card';
        card.setAttribute('role', 'button');
        card.tabIndex = 0;
        const thumbBox = document.createElement('div');
        thumbBox.className = 'pic-thumb';
        thumbBox.appendChild(makeThumb(pic)); // 완성 모습 미리보기 (실제 앱과 동일)
        card.appendChild(thumbBox);
        card.insertAdjacentHTML('beforeend',
          '<div class="pic-card-label"><span>' + pic.emoji + '</span><span>' + pic.name + '</span></div>' +
          '<div class="pic-card-size">' + W + '×' + H + '</div>' +
          (done ? '<div class="pic-card-badge done-badge">✨ 완성</div>'
                : pct > 0 ? '<div class="pic-card-badge">' + pct + '%</div>' : ''));
        card.addEventListener('click', () => openPicture(pic));
        grid.appendChild(card);
      });
    });
  }

  /* ─────────── 캔버스 크기/뷰 ─────────── */
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', () => { if (state.pic) { resizeCanvas(); clampView(); draw(); } });

  function fitView() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    state.fitS = Math.min(w / state.W, h / state.H) * 0.95;
    state.view.s = state.fitS;
    state.view.ox = (w - state.W * state.fitS) / 2;
    state.view.oy = (h - state.H * state.fitS) / 2;
  }

  function clampView() {
    const v = state.view;
    const w = wrap.clientWidth, h = wrap.clientHeight;
    v.s = Math.min(Math.max(v.s, state.fitS * 0.85), MAX_CELL_PX);
    // 격자가 항상 화면 중앙을 지나가도록
    v.ox = Math.min(Math.max(v.ox, w * 0.5 - state.W * v.s), w * 0.5);
    v.oy = Math.min(Math.max(v.oy, h * 0.5 - state.H * v.s), h * 0.5);
  }

  function zoomAt(cx, cy, factor) {
    const v = state.view;
    const rect = wrap.getBoundingClientRect();
    const px = cx - rect.left, py = cy - rect.top;
    const wx = (px - v.ox) / v.s, wy = (py - v.oy) / v.s;
    v.s *= factor;
    clampView();
    v.ox = px - wx * v.s;
    v.oy = py - wy * v.s;
    clampView();
    draw();
  }

  let viewAnim = null;
  function animateFit(ms) {
    cancelAnimationFrame(viewAnim);
    const from = { ...state.view };
    const w = wrap.clientWidth, h = wrap.clientHeight;
    const to = { s: state.fitS, ox: (w - state.W * state.fitS) / 2, oy: (h - state.H * state.fitS) / 2 };
    const t0 = performance.now();
    function step(t) {
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      state.view.s = from.s + (to.s - from.s) * e;
      state.view.ox = from.ox + (to.ox - from.ox) * e;
      state.view.oy = from.oy + (to.oy - from.oy) * e;
      draw();
      if (k < 1) viewAnim = requestAnimationFrame(step);
    }
    viewAnim = requestAnimationFrame(step);
  }
  $('paint-fit').addEventListener('click', () => { if (state.pic) animateFit(400); });

  /* ─────────── 렌더링 ─────────── */
  function draw() {
    if (!state.pic) return;
    const { s, ox, oy } = state.view;
    const w = wrap.clientWidth, h = wrap.clientHeight;
    const pal = state.pic.palette;
    const done = state.viewer || state.correct >= state.total;
    ctx.clearRect(0, 0, w, h);

    const x0 = Math.max(0, Math.floor((0 - ox) / s));
    const x1 = Math.min(state.W - 1, Math.ceil((w - ox) / s));
    const y0 = Math.max(0, Math.floor((0 - oy) / s));
    const y1 = Math.min(state.H - 1, Math.ceil((h - oy) / s));

    const showNum = s >= NUM_MIN_PX && !done;
    if (showNum) {
      ctx.font = '700 ' + (s * 0.42).toFixed(1) + 'px "Apple SD Gothic Neo", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
    }

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * state.W + x;
        const t = state.target[i], p = state.painted[i];
        const px = ox + x * s, py = oy + y * s;
        let num = null, numColor = '#8f8f8f';
        if (p === t) {
          ctx.fillStyle = pal[t];
        } else if (p >= 0) {
          ctx.fillStyle = washed(pal[p]);
          num = t + 1; numColor = '#C0392B';
        } else {
          ctx.fillStyle = (!done && t === state.sel) ? '#d0d0d0' : '#f1f1f1';
          num = t + 1;
          if (t === state.sel) numColor = '#4a4a4a';
        }
        ctx.fillRect(px, py, s + 0.5, s + 0.5);
        if (showNum && num !== null) {
          ctx.fillStyle = numColor;
          ctx.fillText(num, px + s / 2, py + s / 2 + s * 0.02);
        }
      }
    }

    // 격자선
    if (s >= GRID_MIN_PX && !done) {
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = x0; x <= x1 + 1; x++) {
        const px = Math.round(ox + x * s) + 0.5;
        ctx.moveTo(px, oy + y0 * s); ctx.lineTo(px, oy + (y1 + 1) * s);
      }
      for (let y = y0; y <= y1 + 1; y++) {
        const py = Math.round(oy + y * s) + 0.5;
        ctx.moveTo(ox + x0 * s, py); ctx.lineTo(ox + (x1 + 1) * s, py);
      }
      ctx.stroke();
    }

    // 완성작/전체 테두리
    ctx.strokeStyle = done ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.2)';
    ctx.lineWidth = done ? 1 : 1.5;
    ctx.strokeRect(ox, oy, state.W * s, state.H * s);
  }

  /* ─────────── 진행/팔레트 ─────────── */
  function colorCounts() {
    const total = new Array(state.pic.palette.length).fill(0);
    const done = new Array(state.pic.palette.length).fill(0);
    for (let i = 0; i < state.total; i++) {
      total[state.target[i]]++;
      if (state.painted[i] === state.target[i]) done[state.target[i]]++;
    }
    return { total, done };
  }

  function mistakeCount() {
    let m = 0;
    for (let i = 0; i < state.total; i++)
      if (state.painted[i] >= 0 && state.painted[i] !== state.target[i]) m++;
    return m;
  }

  function firstIncompleteColor() {
    const { total, done } = colorCounts();
    for (let c = 0; c < total.length; c++) if (done[c] < total[c]) return c;
    return 0;
  }

  function updateProgressLabel() {
    if (state.viewer) {
      $('progress-label').textContent = '✨ ' + (Progress.doneAt(state.pic.id) || '') + ' 완성한 그림이에요';
      return;
    }
    const m = mistakeCount();
    $('progress-label').textContent = state.correct + ' / ' + state.total +
      (m > 0 ? ' · 앗, 틀린 칸 ' + m + '개!' : '');
  }

  function buildPalette() {
    const bar = $('palette-bar');
    bar.innerHTML = '';
    state.pic.palette.forEach((hex, c) => {
      const btn = document.createElement('button');
      btn.className = 'pal-btn';
      btn.dataset.c = c;
      btn.style.setProperty('--c', hex);
      btn.style.setProperty('--rc', luminance(hex) > 0.75 ? '#e0a800' : hex);
      const inner = document.createElement('span');
      inner.className = 'pal-inner';
      inner.style.color = luminance(hex) > 0.6 ? '#333333' : '#fff';
      inner.textContent = c + 1;
      btn.appendChild(inner);
      btn.addEventListener('click', () => selectColor(c));
      bar.appendChild(btn);
    });
    updatePalette();
  }

  function updatePalette() {
    const { total, done } = colorCounts();
    $('palette-bar').querySelectorAll('.pal-btn').forEach(btn => {
      const c = +btn.dataset.c;
      const pct = total[c] ? done[c] / total[c] * 100 : 100;
      btn.style.setProperty('--p', pct);
      btn.classList.toggle('sel', c === state.sel);
      btn.classList.toggle('done-c', done[c] >= total[c]);
      btn.querySelector('.pal-inner').textContent = done[c] >= total[c] ? '' : (c + 1);
    });
  }

  function selectColor(c) {
    state.sel = c;
    updatePalette();
    draw();
    const btn = $('palette-bar').querySelector('.pal-btn[data-c="' + c + '"]');
    if (btn && btn.scrollIntoView) btn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }

  function updateBoosterUI() {
    $('bomb-count').textContent = state.boosters.bomb;
    $('wand-count').textContent = state.boosters.wand;
    $('btn-bomb').classList.toggle('spent', state.boosters.bomb <= 0);
    $('btn-wand').classList.toggle('spent', state.boosters.wand <= 0);
    $('btn-bomb').classList.toggle('armed', state.bombArmed);
    $('bomb-hint').classList.toggle('hidden', !state.bombArmed);
  }

  /* ─────────── 도안 열기 ─────────── */
  function openPicture(pic) {
    state.pic = pic;
    const parsed = parsePic(pic);
    state.W = parsed.W; state.H = parsed.H;
    state.target = parsed.target;
    state.total = state.W * state.H;

    const saved = Progress.getCells(pic.id, state.total);
    state.painted = new Int16Array(state.total).fill(-1);
    if (saved) for (let i = 0; i < state.total; i++) state.painted[i] = saved[i];
    state.correct = 0;
    for (let i = 0; i < state.total; i++) if (state.painted[i] === state.target[i]) state.correct++;

    state.boosters = Progress.getBoosters(pic.id, boosterDefaults(pic));
    state.bombArmed = false;
    Sound.resetFillStep();

    $('paint-title').textContent = pic.emoji + ' ' + pic.name;
    showScreen('screen-paint');
    resizeCanvas();

    const allDone = state.correct >= state.total;
    state.viewer = allDone;
    state.playing = !allDone;
    document.querySelector('.palette-row').classList.toggle('hidden', allDone);
    $('viewer-bar').classList.toggle('hidden', !allDone);
    if (!allDone) {
      state.sel = firstIncompleteColor();
      buildPalette();
      updateBoosterUI();
      Sound.speak(pic.name + '! ' + (state.correct ? '이어서 칠해 볼까요?' : '숫자 칸을 콕콕 칠해 보세요!'));
    }
    fitView();
    draw();
    updateProgressLabel();
  }

  /* ─────────── 채색 ─────────── */
  let lastFillSound = 0;
  function fillSound() {
    const now = performance.now();
    if (now - lastFillSound > 60) { Sound.fill(); lastFillSound = now; }
  }
  let lastRejectSound = 0;
  function rejectSound() {
    const now = performance.now();
    if (now - lastRejectSound > 90) { Sound.pop(); lastRejectSound = now; }
  }

  function cellAtClient(cx, cy) {
    const rect = wrap.getBoundingClientRect();
    const v = state.view;
    const x = Math.floor((cx - rect.left - v.ox) / v.s);
    const y = Math.floor((cy - rect.top - v.oy) / v.s);
    if (x < 0 || y < 0 || x >= state.W || y >= state.H) return null;
    return { x, y };
  }

  // 한 칸 칠하기. 선택한 색 번호가 그 칸의 정답 번호가 아니면 칠해지지 않는다
  // (아이가 다른 번호 칸을 실수로 건드려도 그림이 망가지지 않게).
  // 반환: 상태가 바뀌었으면 true
  function paintCell(x, y, c) {
    const i = y * state.W + x;
    if (state.painted[i] === state.target[i]) return false; // 맞게 칠한 칸은 고정
    if (c !== state.target[i]) { rejectSound(); return false; } // 번호가 다르면 무시
    if (state.painted[i] === c) return false;
    state.painted[i] = c;
    state.correct++;
    fillSound();
    return true;
  }

  function afterPaint(changedColor) {
    updateProgressLabel();
    updatePalette();
    draw();
    if (state.correct >= state.total) { persist(); finishPicture(); return; }
    if (changedColor != null) {
      const { total, done } = colorCounts();
      if (done[changedColor] >= total[changedColor]) {
        Sound.colorDone();
        Sound.resetFillStep();
        if (state.sel === changedColor) selectColor(firstIncompleteColor());
      }
    }
  }

  function persist() {
    Progress.setCells(state.pic.id, Array.from(state.painted));
    Progress.setBoosters(state.pic.id, state.boosters);
  }

  /* ─────────── 부스터 ─────────── */
  $('btn-bomb').addEventListener('click', () => {
    if (!state.playing || state.boosters.bomb <= 0) return;
    state.bombArmed = !state.bombArmed;
    updateBoosterUI();
    if (state.bombArmed) Sound.speak('어디를 채울까요?');
  });

  function bombAt(cell) {
    state.bombArmed = false;
    state.boosters.bomb--;
    let n = 0;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = cell.x + dx, y = cell.y + dy;
        if (x < 0 || y < 0 || x >= state.W || y >= state.H) continue;
        const i = y * state.W + x;
        if (state.painted[i] !== state.target[i]) {
          state.painted[i] = state.target[i];
          state.correct++;
          n++;
        }
      }
    }
    Sound.tada();
    updateBoosterUI();
    persist();
    updateProgressLabel();
    updatePalette();
    draw();
    if (state.correct >= state.total) finishPicture();
  }

  $('btn-wand').addEventListener('click', () => {
    if (!state.playing || state.boosters.wand <= 0) return;
    state.boosters.wand--;
    const c = state.sel;
    for (let i = 0; i < state.total; i++) {
      if (state.target[i] === c && state.painted[i] !== c) {
        state.painted[i] = c;
        state.correct++;
      }
    }
    Sound.colorDone();
    updateBoosterUI();
    persist();
    afterPaint(c);
  });

  /* ─────────── 포인터: 드래그 채색 / 핀치 / 휠 ─────────── */
  (() => {
    const pointers = new Map();
    let painting = false;
    let lastCell = null;
    let pinch = null;
    let strokeColor = null; // 이 스트로크에서 바뀐 색 (자동 다음 색은 스트로크 끝에)

    wrap.addEventListener('pointerdown', e => {
      if (!state.pic) return;
      wrap.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 1) {
        if (!state.playing) return; // 감상 모드: 드래그로 팬
        const cell = cellAtClient(e.clientX, e.clientY);
        if (!cell) return;
        if (state.bombArmed) { bombAt(cell); return; }
        painting = true;
        lastCell = cell;
        strokeColor = state.sel;
        if (paintCell(cell.x, cell.y, state.sel)) {
          updateProgressLabel(); updatePalette(); draw();
          if (state.correct >= state.total) { painting = false; persist(); finishPicture(); }
        }
      } else if (pointers.size === 2) {
        painting = false;
        const [a, b] = [...pointers.values()];
        const rect = wrap.getBoundingClientRect();
        pinch = {
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          view: { ...state.view },
          wx: ((a.x + b.x) / 2 - rect.left - state.view.ox) / state.view.s,
          wy: ((a.y + b.y) / 2 - rect.top - state.view.oy) / state.view.s
        };
      }
    });

    wrap.addEventListener('pointermove', e => {
      if (!pointers.has(e.pointerId) || !state.pic) return;
      const prev = pointers.get(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pinch && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 8) return;
        const rect = wrap.getBoundingClientRect();
        const mid = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
        state.view.s = pinch.view.s * (d / pinch.dist);
        clampView();
        state.view.ox = mid.x - pinch.wx * state.view.s;
        state.view.oy = mid.y - pinch.wy * state.view.s;
        clampView();
        draw();
        return;
      }

      if (painting && pointers.size === 1) {
        const cell = cellAtClient(e.clientX, e.clientY);
        if (!cell || !lastCell) { if (cell) lastCell = cell; return; }
        // 이전 칸 → 현재 칸 사이 보간 (빠른 스와이프에도 빈틈 없이)
        const steps = Math.max(Math.abs(cell.x - lastCell.x), Math.abs(cell.y - lastCell.y));
        let changed = false;
        for (let k = 1; k <= steps; k++) {
          const x = Math.round(lastCell.x + (cell.x - lastCell.x) * k / steps);
          const y = Math.round(lastCell.y + (cell.y - lastCell.y) * k / steps);
          if (paintCell(x, y, state.sel)) changed = true;
        }
        lastCell = cell;
        if (changed) {
          updateProgressLabel(); updatePalette(); draw();
          if (state.correct >= state.total) { painting = false; persist(); finishPicture(); }
        }
        return;
      }

      // 감상 모드: 한 손가락 드래그 = 팬
      if (!state.playing && pointers.size === 1) {
        state.view.ox += e.clientX - prev.x;
        state.view.oy += e.clientY - prev.y;
        clampView();
        draw();
      }
    });

    function endPointer(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (painting && pointers.size === 0) {
        painting = false;
        persist();
        if (state.playing && strokeColor != null) {
          const { total, done } = colorCounts();
          if (done[strokeColor] >= total[strokeColor]) {
            Sound.colorDone();
            Sound.resetFillStep();
            if (state.sel === strokeColor) selectColor(firstIncompleteColor());
          }
        }
        strokeColor = null;
      }
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 1) {
        // 핀치에서 한 손가락 남음 → 채색 재개 방지 (다음 pointerdown부터)
        painting = false;
        lastCell = null;
      }
    }
    wrap.addEventListener('pointerup', endPointer);
    wrap.addEventListener('pointercancel', endPointer);

    wrap.addEventListener('wheel', e => {
      if (!state.pic) return;
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.18 : 1 / 1.18);
    }, { passive: false });
  })();

  /* ─────────── 완성 ─────────── */
  function drawFullTo(canvasEl) {
    canvasEl.width = state.W; canvasEl.height = state.H;
    const g = canvasEl.getContext('2d');
    for (let i = 0; i < state.total; i++) {
      g.fillStyle = state.pic.palette[state.target[i]];
      g.fillRect(i % state.W, (i / state.W) | 0, 1, 1);
    }
  }

  function finishPicture() {
    if (state.viewer) return;
    state.playing = false;
    state.viewer = true;
    Progress.markDone(state.pic.id);
    document.querySelector('.palette-row').classList.add('hidden');
    $('viewer-bar').classList.remove('hidden');
    state.bombArmed = false;
    updateBoosterUI();
    animateFit(700);
    updateProgressLabel();
    setTimeout(() => {
      drawFullTo($('complete-canvas'));
      $('complete-name').textContent = state.pic.emoji + ' ' + state.pic.name;
      $('complete-next').style.display = nextPicture() ? '' : 'none';
      $('complete-overlay').classList.remove('hidden');
      launchConfetti();
      Sound.tada();
      Sound.speakDone();
    }, 950);
  }

  function nextPicture() {
    // "다음 그림"도 숨겨진 활동지는 건너뛴다 (지금 칠하던 그림이 활동지면 목록에 포함)
    const pics = visiblePics().indexOf(state.pic) >= 0 ? visiblePics() : [state.pic].concat(visiblePics());
    const idx = pics.indexOf(state.pic);
    for (let i = 1; i <= pics.length; i++) {
      const cand = pics[(idx + i) % pics.length];
      const { W, H, target } = parsePic(cand);
      if (Progress.correctCount(cand.id, Array.from(target)) < W * H) return cand;
    }
    return null;
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
  $('complete-works').addEventListener('click', () => { closeComplete(); openWorks(); });
  $('complete-next').addEventListener('click', () => {
    closeComplete();
    const next = nextPicture();
    if (next) openPicture(next);
    else goHome();
  });

  /* ─────────── 다시 색칠 ─────────── */
  $('btn-repaint').addEventListener('click', () => $('confirm-overlay').classList.remove('hidden'));
  $('confirm-cancel').addEventListener('click', () => $('confirm-overlay').classList.add('hidden'));
  $('confirm-ok').addEventListener('click', () => {
    $('confirm-overlay').classList.add('hidden');
    if (!state.pic) return;
    Progress.reset(state.pic.id);
    openPicture(state.pic);
  });

  /* ─────────── 내 작품 ─────────── */
  function openWorks() {
    const grid = $('works-grid');
    grid.innerHTML = '';
    const doneList = PICS.filter(p => {
      if (!Progress.isDone(p.id)) return false;
      const { W, H, target } = parsePic(p);
      return Progress.correctCount(p.id, Array.from(target)) >= W * H;
    });
    if (!doneList.length) {
      grid.innerHTML = '<div class="works-empty">아직 완성한 그림이 없어요.<br>픽셀을 끝까지 칠하면 여기에 걸려요! 🖼️</div>';
    }
    doneList.forEach(pic => {
      const card = document.createElement('div');
      card.className = 'pic-card';
      card.setAttribute('role', 'button');
      card.tabIndex = 0;
      const thumbBox = document.createElement('div');
      thumbBox.className = 'pic-thumb';
      thumbBox.appendChild(makeThumb(pic));
      card.appendChild(thumbBox);
      card.insertAdjacentHTML('beforeend',
        '<div class="pic-card-label"><span>' + pic.emoji + '</span><span>' + pic.name + '</span></div>' +
        '<div class="works-date">🗓️ ' + Progress.doneAt(pic.id) + '</div>');
      card.addEventListener('click', () => openPicture(pic));
      grid.appendChild(card);
    });
    showScreen('screen-works');
  }
  $('btn-works').addEventListener('click', openWorks);
  $('works-back').addEventListener('click', goHome);

  /* ─────────── 뒤로가기 ─────────── */
  function goHome() {
    state.playing = false;
    state.bombArmed = false;
    if (window.speechSynthesis) speechSynthesis.cancel();
    renderHome();
    showScreen('screen-home');
  }
  $('paint-back').addEventListener('click', goHome);

  /* ─────────── 테스트/디버그 훅 ─────────── */
  window.__pixel = {
    pics: () => PICS.map(p => p.id),
    open: id => { const p = PICS.find(x => x.id === id); if (p) openPicture(p); },
    size: () => ({ W: state.W, H: state.H }),
    target: (x, y) => state.target[y * state.W + x],
    painted: (x, y) => state.painted[y * state.W + x],
    cellToClient: (x, y) => {
      const rect = wrap.getBoundingClientRect();
      return {
        x: rect.left + state.view.ox + (x + 0.5) * state.view.s,
        y: rect.top + state.view.oy + (y + 0.5) * state.view.s
      };
    },
    correct: () => state.correct,
    total: () => state.total,
    mistakes: () => mistakeCount(),
    boosters: () => ({ ...state.boosters }),
    sel: () => state.sel,
    view: () => ({ ...state.view }),
    playing: () => state.playing
  };

  /* ─────────── 시작 ─────────── */
  updateMuteIcons();
  renderHome();
})();
