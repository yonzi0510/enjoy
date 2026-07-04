/* ═══════════ 색칠 놀이터 엔진 (컬러 바이 넘버) ═══════════
 * 도안 계약: 각 도안은 PICTURES.push({id,name,emoji,category,vb:[x,y,w,h],palette:[hex...],regions:[...]})
 *  - region: {t:'rect',x,y,w,h,c} | {t:'circle',cx,cy,r,c} | {t:'ellipse',cx,cy,rx,ry,c}
 *            | {t:'poly',pts:[[x,y],...],c} | {t:'path',d,c}  (+선택: lx,ly 번호 위치 수동 지정)
 *  - c = palette 인덱스. 뒤에 오는 영역이 위에 그려진다(레이어).
 *  - transform 사용 금지(탭 판정이 루트 좌표 기준). 회전 도형은 poly/path로.
 * 번호 위치는 격자 샘플링 + isPointInFill + 상위 레이어 가림 검사로 자동 배치.
 */
(() => {
  const PICS = window.PICTURES || [];
  const $ = id => document.getElementById(id);
  const SVGNS = 'http://www.w3.org/2000/svg';

  const UNFILLED = '#f4f4f4';     // 미채색 기본
  const HIGHLIGHT = '#cfcfcf';    // 선택 색 미채색 강조
  const STROKE = '#c8c8c8';
  const MAX_ZOOM = 18;            // vb 대비 최대 확대 배율
  const TAP_SLOP = 9;             // px — 이보다 크게 움직이면 팬

  const CATS = {
    animal:  { emoji: '🐾', name: '동물' },
    nature:  { emoji: '🌿', name: '자연' },
    scenery: { emoji: '🏞️', name: '풍경' },
    vehicle: { emoji: '🚀', name: '탈것' },
    food:    { emoji: '🍦', name: '음식' }
  };

  const state = {
    pic: null,        // 현재 도안
    svg: null,
    meta: [],         // [{el, textEl, c, bbox, label:{x,y,r}|null}]
    filled: new Set(),
    sel: 0,           // 선택된 팔레트 인덱스
    view: null,       // {x,y,w,h} — viewBox
    playing: false,
    viewer: false,    // 완성작 감상 모드
    unreachable: []   // 번호를 놓을 수 없는(완전히 가려진) 영역 인덱스 — 검증용
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
    $('paint-mute').textContent = icon;
  }
  function toggleMute() { Sound.toggleMute(); updateMuteIcons(); }
  $('btn-mute').addEventListener('click', toggleMute);
  $('paint-mute').addEventListener('click', toggleMute);
  document.addEventListener('pointerdown', () => Sound.unlock(), { once: true });

  /* ─────────── 도형 생성 (DOM & 문자열 공용) ─────────── */
  function shapeAttrs(r) {
    switch (r.t) {
      case 'rect':    return ['rect', { x: r.x, y: r.y, width: r.w, height: r.h }];
      case 'circle':  return ['circle', { cx: r.cx, cy: r.cy, r: r.r }];
      case 'ellipse': return ['ellipse', { cx: r.cx, cy: r.cy, rx: r.rx, ry: r.ry }];
      case 'poly':    return ['polygon', { points: r.pts.map(p => p[0] + ',' + p[1]).join(' ') }];
      case 'path':    return ['path', { d: r.d }];
    }
    return null;
  }

  function makeRegionEl(r) {
    const s = shapeAttrs(r);
    if (!s) return null;
    const el = document.createElementNS(SVGNS, s[0]);
    for (const k in s[1]) el.setAttribute(k, s[1][k]);
    return el;
  }

  function shapeToStr(r, fill, stroke, sw) {
    const s = shapeAttrs(r);
    if (!s) return '';
    const attrs = Object.entries(s[1]).map(([k, v]) => k + '="' + v + '"').join(' ');
    return '<' + s[0] + ' ' + attrs + ' fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"/>';
  }

  /* ─────────── 썸네일 SVG 문자열 ─────────── */
  function buildThumb(pic, filledSet) {
    const [x, y, w, h] = pic.vb;
    let out = '<svg xmlns="' + SVGNS + '" viewBox="' + x + ' ' + y + ' ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet">';
    pic.regions.forEach((r, i) => {
      const on = filledSet.has(i);
      out += shapeToStr(r, on ? pic.palette[r.c] : '#f2f2f2', on ? pic.palette[r.c] : '#e2e2e2', w / 400);
    });
    return out + '</svg>';
  }

  /* ─────────── 홈 화면 ─────────── */
  let curCat = 'all';

  function renderChips() {
    const box = $('cat-chips');
    box.innerHTML = '';
    const cats = ['all', ...new Set(PICS.map(p => p.category))];
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
    PICS.filter(p => curCat === 'all' || p.category === curCat).forEach(pic => {
      const filled = Progress.getFilled(pic.id, pic.regions.length);
      const done = Progress.isDone(pic.id) && filled.size >= pic.regions.length;
      const pct = Math.round(filled.size / pic.regions.length * 100);
      const card = document.createElement('button');
      card.className = 'pic-card';
      card.innerHTML =
        '<div class="pic-thumb">' + buildThumb(pic, filled) + '</div>' +
        '<div class="pic-card-label"><span>' + pic.emoji + '</span><span>' + pic.name + '</span></div>' +
        (done ? '<div class="pic-card-badge done-badge">✨ 완성</div>'
              : pct > 0 ? '<div class="pic-card-badge">' + pct + '%</div>' : '');
      card.addEventListener('click', () => openPicture(pic));
      grid.appendChild(card);
    });
  }

  /* ─────────── 좌표 변환 ─────────── */
  function clientToSvg(cx, cy) {
    const svg = state.svg;
    const pt = svg.createSVGPoint();
    pt.x = cx; pt.y = cy;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }
  function svgToClient(x, y) {
    const svg = state.svg;
    const pt = svg.createSVGPoint();
    pt.x = x; pt.y = y;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm);
    return { x: p.x, y: p.y };
  }

  /* ─────────── 뷰(줌/팬) ─────────── */
  function applyView() {
    const v = state.view;
    state.svg.setAttribute('viewBox', v.x + ' ' + v.y + ' ' + v.w + ' ' + v.h);
  }

  function clampView() {
    const [vx, vy, vw, vh] = state.pic.vb;
    const v = state.view;
    const minW = vw / MAX_ZOOM;
    if (v.w > vw * 1.15) v.w = vw * 1.15;
    if (v.w < minW) v.w = minW;
    v.h = v.w * vh / vw;
    const mx = v.w * 0.3, my = v.h * 0.3; // 가장자리 여유
    v.x = Math.min(Math.max(v.x, vx - mx), vx + vw - v.w + mx);
    v.y = Math.min(Math.max(v.y, vy - my), vy + vh - v.h + my);
  }

  function fitView() {
    const [vx, vy, vw, vh] = state.pic.vb;
    state.view = { x: vx, y: vy, w: vw, h: vh };
    applyView();
  }

  // 커서/핀치 중심 고정 줌
  function zoomAt(clientX, clientY, factor) {
    const p = clientToSvg(clientX, clientY);
    const v = state.view;
    const nw = v.w * factor;
    v.x = p.x - (p.x - v.x) * (nw / v.w);
    v.y = p.y - (p.y - v.y) * (nw / v.w);
    v.w = nw;
    clampView();
    applyView();
  }

  // 부드러운 뷰 이동 (힌트·완성)
  let viewAnim = null;
  function animateViewTo(target, ms) {
    cancelAnimationFrame(viewAnim);
    const from = { ...state.view };
    const t0 = performance.now();
    function step(t) {
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3); // easeOutCubic
      state.view = {
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
        w: from.w + (target.w - from.w) * e,
        h: from.h + (target.h - from.h) * e
      };
      applyView();
      if (k < 1) viewAnim = requestAnimationFrame(step);
    }
    viewAnim = requestAnimationFrame(step);
  }

  /* ─────────── 번호 위치 자동 배치 ───────────
   * 영역 bbox에 격자를 깔고 isPointInFill + 상위 레이어 가림 검사로 "보이는" 칸을 찾은 뒤,
   * 보이지 않는 칸까지의 거리(여유 반경)가 가장 큰 칸을 고른다. */
  function computeLabel(i) {
    const r = state.pic.regions[i];
    const m = state.meta[i];
    const el = m.el, b = m.bbox;
    if (b.width <= 0 || b.height <= 0) return null;

    // 이 영역 위에 그려지는(=가리는) 영역들 — bbox 교차만 후보로
    const above = [];
    for (let j = i + 1; j < state.meta.length; j++) {
      const bj = state.meta[j].bbox;
      if (bj.width > 0 && bj.x < b.x + b.width && bj.x + bj.width > b.x &&
          bj.y < b.y + b.height && bj.y + bj.height > b.y) above.push(state.meta[j]);
    }
    const pt = state.svg.createSVGPoint();
    const [vbx, vby, vbw, vbh] = state.pic.vb;
    const visibleAt = (x, y) => {
      // 캔버스(viewBox) 밖은 클리핑되어 보이지도, 탭할 수도 없다
      if (x < vbx + 2 || x > vbx + vbw - 2 || y < vby + 2 || y > vby + vbh - 2) return false;
      pt.x = x; pt.y = y;
      if (!el.isPointInFill(pt)) return false;
      for (const a of above) {
        const bb = a.bbox;
        if (x >= bb.x && x <= bb.x + bb.width && y >= bb.y && y <= bb.y + bb.height && a.el.isPointInFill(pt)) return false;
      }
      return true;
    };

    if (r.lx != null && r.ly != null && visibleAt(r.lx, r.ly)) {
      return { x: r.lx, y: r.ly, r: Math.min(b.width, b.height) / 3 };
    }

    for (const n of [14, 26, 44]) {
      const cw = b.width / n, ch = b.height / n;
      const vis = new Uint8Array(n * n);
      let any = false;
      for (let gy = 0; gy < n; gy++) {
        for (let gx = 0; gx < n; gx++) {
          if (visibleAt(b.x + (gx + 0.5) * cw, b.y + (gy + 0.5) * ch)) { vis[gy * n + gx] = 1; any = true; }
        }
      }
      if (!any) continue;
      // 보이지 않는 칸/경계로부터의 격자 거리 변환 (BFS)
      const dist = new Int16Array(n * n).fill(-1);
      const q = [];
      for (let gy = 0; gy < n; gy++) {
        for (let gx = 0; gx < n; gx++) {
          const k = gy * n + gx;
          if (!vis[k]) { dist[k] = 0; q.push(k); }
          else if (gx === 0 || gy === 0 || gx === n - 1 || gy === n - 1) { dist[k] = 1; q.push(k); }
        }
      }
      let head = 0;
      while (head < q.length) {
        const k = q[head++];
        const gx = k % n, gy = (k - gx) / n;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = gx + dx, ny = gy + dy;
          if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
          const nk = ny * n + nx;
          if (dist[nk] === -1) { dist[nk] = dist[k] + 1; q.push(nk); }
        }
      }
      let best = -1, bestD = 0;
      const cx0 = (n - 1) / 2;
      for (let k = 0; k < n * n; k++) {
        if (!vis[k]) continue;
        const gx = k % n, gy = (k - gx) / n;
        // 여유 거리 우선, 동률이면 중심에 가까운 칸
        const d = dist[k] * 1000 - (Math.abs(gx - cx0) + Math.abs(gy - cx0));
        if (d > bestD || best === -1) { best = k; bestD = d; }
      }
      const gx = best % n, gy = (best - gx) / n;
      return {
        x: b.x + (gx + 0.5) * cw,
        y: b.y + (gy + 0.5) * ch,
        r: Math.max(dist[best] - 0.5, 0.5) * Math.min(cw, ch)
      };
    }
    return null; // 완전히 가려짐 — 검증 대상
  }

  /* ─────────── 도안 열기 ─────────── */
  function openPicture(pic) {
    state.pic = pic;
    state.filled = Progress.getFilled(pic.id, pic.regions.length);
    state.meta = [];
    state.unreachable = [];
    state.viewer = false;
    Sound.resetFillStep();

    $('paint-title').textContent = pic.emoji + ' ' + pic.name;
    showScreen('screen-paint');

    const wrap = $('canvas-wrap');
    wrap.innerHTML = '';
    const svg = document.createElementNS(SVGNS, 'svg');
    const [vx, vy, vw, vh] = pic.vb;
    svg.setAttribute('viewBox', vx + ' ' + vy + ' ' + vw + ' ' + vh);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    state.svg = svg;

    const gR = document.createElementNS(SVGNS, 'g');
    const gL = document.createElementNS(SVGNS, 'g');
    gL.setAttribute('class', 'labels-g');
    gL.setAttribute('pointer-events', 'none');
    const gFx = document.createElementNS(SVGNS, 'g');
    gFx.setAttribute('pointer-events', 'none');
    svg.appendChild(gR); svg.appendChild(gL); svg.appendChild(gFx);
    state.gFx = gFx;
    wrap.appendChild(svg);

    // 1) 영역 요소 생성 (bbox 계산을 위해 먼저 전부 삽입)
    pic.regions.forEach((r, i) => {
      const el = makeRegionEl(r);
      el.setAttribute('class', 'rg');
      el.setAttribute('data-idx', i);
      el.setAttribute('stroke-width', vw / 800);
      gR.appendChild(el);
      state.meta.push({ el, c: r.c, textEl: null, bbox: null, label: null });
    });
    state.meta.forEach(m => { m.bbox = m.el.getBBox(); });

    // 2) 번호 배치
    pic.regions.forEach((r, i) => {
      const m = state.meta[i];
      m.label = computeLabel(i);
      if (!m.label) { state.unreachable.push(i); return; }
      const t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('x', m.label.x);
      t.setAttribute('y', m.label.y);
      t.setAttribute('class', 'rg-label');
      t.setAttribute('dominant-baseline', 'central');
      const fs = Math.max(9, Math.min(m.label.r * 1.1, vw / 26));
      t.setAttribute('font-size', fs.toFixed(1));
      t.setAttribute('data-idx', i);
      t.setAttribute('data-c', r.c);
      t.textContent = r.c + 1;
      gL.appendChild(t);
      m.textEl = t;
    });

    // 3) 완성 여부에 따라 모드 결정
    const allDone = state.filled.size >= pic.regions.length;
    if (allDone) enterViewerMode();
    else {
      state.playing = true;
      $('viewer-bar').classList.add('hidden');
      $('palette-bar').classList.remove('hidden');
      $('paint-hint').classList.remove('hidden');
      state.sel = firstIncompleteColor();
      buildPalette();
      Sound.speak(pic.name + '! ' + (state.filled.size ? '이어서 색칠해 볼까요?' : '숫자를 따라 색칠해 보세요!'));
    }
    refreshFills();
    fitView();
    updateProgressLabel();
  }

  function enterViewerMode() {
    state.playing = false;
    state.viewer = true;
    state.svg.classList.add('done');
    $('palette-bar').classList.add('hidden');
    $('paint-hint').classList.add('hidden');
    $('viewer-bar').classList.remove('hidden');
    $('progress-label').textContent = '✨ ' + (Progress.doneAt(state.pic.id) || '') + ' 완성한 그림이에요';
  }

  /* ─────────── 색/채움 표시 ─────────── */
  function refreshFills() {
    const pal = state.pic.palette;
    state.meta.forEach((m, i) => {
      if (state.filled.has(i)) {
        m.el.setAttribute('fill', pal[m.c]);
        m.el.setAttribute('stroke', pal[m.c]);
        if (m.textEl) m.textEl.style.display = 'none';
      } else {
        m.el.setAttribute('fill', !state.viewer && m.c === state.sel ? HIGHLIGHT : UNFILLED);
        m.el.setAttribute('stroke', STROKE);
        if (m.textEl) {
          m.textEl.style.display = '';
          m.textEl.classList.toggle('sel-label', m.c === state.sel);
        }
      }
    });
  }

  function colorCounts() {
    const total = [], done = [];
    state.pic.palette.forEach(() => { total.push(0); done.push(0); });
    state.meta.forEach((m, i) => {
      total[m.c]++;
      if (state.filled.has(i)) done[m.c]++;
    });
    return { total, done };
  }

  function firstIncompleteColor() {
    const { total, done } = colorCounts();
    for (let c = 0; c < total.length; c++) if (done[c] < total[c]) return c;
    return 0;
  }

  function updateProgressLabel() {
    if (state.viewer) return;
    $('progress-label').textContent = state.filled.size + ' / ' + state.pic.regions.length;
  }

  /* ─────────── 팔레트 ─────────── */
  function luminance(hex) {
    const n = parseInt(hex.slice(1), 16);
    return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  }

  function buildPalette() {
    const bar = $('palette-bar');
    bar.innerHTML = '';
    const { total, done } = colorCounts();
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
      const pct = total[c] ? done[c] / total[c] * 100 : 0;
      btn.style.setProperty('--p', pct);
      btn.classList.toggle('sel', c === state.sel);
      btn.classList.toggle('done-c', done[c] >= total[c]);
      const inner = btn.querySelector('.pal-inner');
      inner.textContent = done[c] >= total[c] ? '' : (c + 1);
    });
  }

  function selectColor(c) {
    state.sel = c;
    updatePalette();
    refreshFills();
    // 선택 버튼이 보이도록 스크롤
    const btn = $('palette-bar').querySelector('.pal-btn[data-c="' + c + '"]');
    if (btn && btn.scrollIntoView) btn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }

  /* ─────────── 탭 → 채색 ─────────── */
  function regionAt(p) {
    // 최상위(뒤에 그려진) 영역부터
    for (let i = state.meta.length - 1; i >= 0; i--) {
      const m = state.meta[i], b = m.bbox;
      if (p.x < b.x || p.x > b.x + b.width || p.y < b.y || p.y > b.y + b.height) continue;
      const pt = state.svg.createSVGPoint();
      pt.x = p.x; pt.y = p.y;
      if (m.el.isPointInFill(pt)) return i;
    }
    return -1;
  }

  // 반환값: 'fill' | 'wrong' | null(아무 동작 없음 — 더블탭 줌 후보)
  function handleTap(clientX, clientY) {
    if (!state.playing) return null;
    const p = clientToSvg(clientX, clientY);
    const i = regionAt(p);
    if (i < 0) return null;
    if (state.filled.has(i)) return null;
    const m = state.meta[i];
    if (m.c === state.sel) { fillRegion(i, p); return 'fill'; }
    wrongFeedback(i);
    return 'wrong';
  }

  function fillRegion(i, p) {
    const m = state.meta[i];
    state.filled.add(i);
    Progress.addFilled(state.pic.id, i);
    m.el.setAttribute('fill', state.pic.palette[m.c]);
    m.el.setAttribute('stroke', state.pic.palette[m.c]);
    if (m.textEl) m.textEl.style.display = 'none';

    // 리플 효과
    const rp = p || (m.label ? { x: m.label.x, y: m.label.y } : null);
    if (rp) {
      const rippleR = Math.max(state.view.w / 40, 6);
      const c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', rp.x); c.setAttribute('cy', rp.y); c.setAttribute('r', rippleR);
      c.setAttribute('class', 'fill-ripple');
      state.gFx.appendChild(c);
      setTimeout(() => c.remove(), 500);
    }

    Sound.fill();
    updateProgressLabel();
    updatePalette();

    const { total, done } = colorCounts();
    if (state.filled.size >= state.pic.regions.length) { finishPicture(); return; }
    if (done[m.c] >= total[m.c]) {
      Sound.colorDone();
      Sound.resetFillStep();
      if (state.sel === m.c) selectColor(firstIncompleteColor());
    }
  }

  function wrongFeedback(i) {
    const m = state.meta[i];
    const flash = m.el.cloneNode(false);
    flash.removeAttribute('class');
    flash.removeAttribute('fill');
    flash.removeAttribute('stroke');
    flash.setAttribute('class', 'wrong-flash');
    state.gFx.appendChild(flash);
    setTimeout(() => flash.remove(), 480);
    Sound.pop();
  }

  /* ─────────── 완성 ─────────── */
  function finishPicture() {
    state.playing = false;
    Progress.markDone(state.pic.id);
    state.svg.classList.add('done');
    const [vx, vy, vw, vh] = state.pic.vb;
    animateViewTo({ x: vx, y: vy, w: vw, h: vh }, 700);
    setTimeout(() => {
      $('complete-thumb').innerHTML = buildThumb(state.pic, new Set(state.pic.regions.map((_, i) => i)));
      $('complete-name').textContent = state.pic.emoji + ' ' + state.pic.name;
      $('complete-next').style.display = nextPicture() ? '' : 'none';
      $('complete-overlay').classList.remove('hidden');
      launchConfetti();
      Sound.tada();
      Sound.speakDone();
    }, 950);
  }

  function nextPicture() {
    const idx = PICS.indexOf(state.pic);
    for (let i = 1; i <= PICS.length; i++) {
      const cand = PICS[(idx + i) % PICS.length];
      if (Progress.filledCount(cand.id, cand.regions.length) < cand.regions.length) return cand;
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

  /* ─────────── 힌트 ─────────── */
  function doHint() {
    if (!state.playing) return;
    // 선택 색의 남은 영역(없으면 아무 남은 영역) 중 하나
    let cands = [];
    state.meta.forEach((m, i) => {
      if (!state.filled.has(i) && m.label && m.c === state.sel) cands.push(i);
    });
    if (!cands.length) {
      state.meta.forEach((m, i) => { if (!state.filled.has(i) && m.label) cands.push(i); });
    }
    if (!cands.length) return;
    const i = cands[Math.floor(Math.random() * cands.length)];
    const m = state.meta[i];
    if (m.c !== state.sel) selectColor(m.c);

    // 영역이 화면의 1/3쯤 되도록 뷰 이동
    const [vx, vy, vw, vh] = state.pic.vb;
    const b = m.bbox;
    let w = Math.max(Math.max(b.width, b.height * vw / vh) * 3, vw / 6);
    w = Math.min(w, vw);
    const target = { x: m.label.x - w / 2, y: m.label.y - (w * vh / vw) / 2, w, h: w * vh / vw };
    animateViewTo(target, 550);

    setTimeout(() => {
      const ring = document.createElementNS(SVGNS, 'circle');
      ring.setAttribute('cx', m.label.x); ring.setAttribute('cy', m.label.y);
      ring.setAttribute('r', Math.max(m.label.r * 2.2, w / 14));
      ring.setAttribute('class', 'hint-ring');
      state.gFx.appendChild(ring);
      setTimeout(() => ring.remove(), 1800);
    }, 560);
    Sound.sparkle();
  }
  $('paint-hint').addEventListener('click', doHint);
  $('paint-fit').addEventListener('click', () => { if (state.pic) animateViewTo({ x: state.pic.vb[0], y: state.pic.vb[1], w: state.pic.vb[2], h: state.pic.vb[3] }, 400); });

  /* ─────────── 포인터: 탭 / 팬 / 핀치 / 휠 ─────────── */
  (() => {
    const wrap = $('canvas-wrap');
    const pointers = new Map();
    let mode = null;          // 'tap' | 'pan' | 'pinch'
    let start = null;         // 시작 포인터·뷰 스냅샷
    let pinch = null;
    let lastTap = { t: 0, x: 0, y: 0 };

    wrap.addEventListener('pointerdown', e => {
      if (!state.svg) return;
      wrap.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        mode = 'tap';
        start = { x: e.clientX, y: e.clientY, view: { ...state.view } };
      } else if (pointers.size === 2) {
        mode = 'pinch';
        const [a, b] = [...pointers.values()];
        pinch = {
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          midSvg: clientToSvg((a.x + b.x) / 2, (a.y + b.y) / 2),
          view: { ...state.view }
        };
      }
    });

    wrap.addEventListener('pointermove', e => {
      if (!pointers.has(e.pointerId) || !state.svg) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (mode === 'pinch' && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 8) return;
        const rect = wrap.getBoundingClientRect();
        const scalePerPx = pinch.view.w / rect.width;
        const nw = pinch.view.w * pinch.dist / d;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        // 핀치 시작점의 svg 좌표가 현재 mid에 오도록
        state.view.w = nw;
        state.view.h = nw * state.pic.vb[3] / state.pic.vb[2];
        const sc = state.view.w / rect.width;
        state.view.x = pinch.midSvg.x - (mid.x - rect.left) * sc;
        state.view.y = pinch.midSvg.y - (mid.y - rect.top) * (state.view.h / rect.height);
        clampView();
        applyView();
        return;
      }

      if (pointers.size === 1 && (mode === 'tap' || mode === 'pan')) {
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (mode === 'tap' && Math.hypot(dx, dy) > TAP_SLOP) mode = 'pan';
        if (mode === 'pan') {
          const rect = wrap.getBoundingClientRect();
          // meet 레터박스 감안: 실제 렌더 스케일은 CTM 기준이 정확하지만 근사로 충분
          const sc = state.view.w / rect.width;
          state.view.x = start.view.x - dx * sc;
          state.view.y = start.view.y - dy * (state.view.h / rect.height);
          clampView();
          applyView();
        }
      }
    });

    function endPointer(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (mode === 'tap' && pointers.size === 0) {
        const now = performance.now();
        const acted = handleTap(e.clientX, e.clientY);
        // 빈 곳/이미 칠한 곳 더블탭 = 확대 (색칠 동작이 항상 우선)
        if (!acted && now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
          zoomAt(e.clientX, e.clientY, 1 / 2.2);
          lastTap = { t: 0, x: 0, y: 0 };
        } else {
          lastTap = { t: now, x: e.clientX, y: e.clientY };
        }
      }
      if (pointers.size === 0) { mode = null; pinch = null; }
      else if (pointers.size === 1) {
        // 핀치에서 한 손가락만 남음 → 팬으로 전환
        const [p] = [...pointers.values()];
        mode = 'pan';
        start = { x: p.x, y: p.y, view: { ...state.view } };
      }
    }
    wrap.addEventListener('pointerup', endPointer);
    wrap.addEventListener('pointercancel', endPointer);

    wrap.addEventListener('wheel', e => {
      if (!state.svg) return;
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1 / 1.18 : 1.18);
    }, { passive: false });
  })();

  /* ─────────── 다시 색칠 ─────────── */
  $('btn-repaint').addEventListener('click', () => $('confirm-overlay').classList.remove('hidden'));
  $('confirm-cancel').addEventListener('click', () => $('confirm-overlay').classList.add('hidden'));
  $('confirm-ok').addEventListener('click', () => {
    $('confirm-overlay').classList.add('hidden');
    if (!state.pic) return;
    Progress.reset(state.pic.id);
    state.svg.classList.remove('done');
    openPicture(state.pic);
  });

  /* ─────────── 내 작품 ─────────── */
  function openWorks() {
    const grid = $('works-grid');
    grid.innerHTML = '';
    const doneList = PICS.filter(p => Progress.isDone(p.id) && Progress.filledCount(p.id, p.regions.length) >= p.regions.length);
    if (!doneList.length) {
      grid.innerHTML = '<div class="works-empty">아직 완성한 그림이 없어요.<br>그림을 끝까지 색칠하면 여기에 걸려요! 🖼️</div>';
    }
    doneList.forEach(pic => {
      const all = new Set(pic.regions.map((_, i) => i));
      const card = document.createElement('button');
      card.className = 'pic-card';
      card.innerHTML =
        '<div class="pic-thumb">' + buildThumb(pic, all) + '</div>' +
        '<div class="pic-card-label"><span>' + pic.emoji + '</span><span>' + pic.name + '</span></div>' +
        '<div class="works-date">🗓️ ' + Progress.doneAt(pic.id) + '</div>';
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
    if (window.speechSynthesis) speechSynthesis.cancel();
    renderHome();
    showScreen('screen-home');
  }
  $('paint-back').addEventListener('click', goHome);

  /* ─────────── 테스트/디버그 훅 ─────────── */
  window.__color = {
    pics: () => PICS.map(p => p.id),
    open: id => { const p = PICS.find(x => x.id === id); if (p) openPicture(p); },
    regions: () => state.meta.map((m, i) => ({
      i, c: m.c, filled: state.filled.has(i),
      lx: m.label ? m.label.x : null, ly: m.label ? m.label.y : null
    })),
    unreachable: () => state.unreachable.slice(),
    toClient: (x, y) => svgToClient(x, y),
    view: () => ({ ...state.view }),
    sel: () => state.sel,
    filledCount: () => state.filled.size,
    playing: () => state.playing
  };

  /* ─────────── 시작 ─────────── */
  updateMuteIcons();
  renderHome();
})();
