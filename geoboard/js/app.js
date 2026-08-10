/* 앱 셸 — 홈(단계 3개) → 퍼즐 목록(단계별 10) → 놀이(고무줄 주무르기).
 *
 * ── 2026-08 개편: 「못 찍기」에서 「고무줄 당기기」로 ────────────────────
 * 예전에는 색을 고르고 **못 두 개를 차례로 탭**하면 그 사이에 선이 하나 생겼다. 부모님 지적:
 * "지금은 선그리기랑 다를바가 없어서", "유연하게 다양한 모양으로 늘어나면서 모양이 잡혀가는,
 * 그게 지오보드의 핵심이잖아".
 *
 * 지금은 판에 **고무줄 한 가닥이 걸려 있고**, 아이는 그 줄의 **아무 데나 집어 새 못으로 당긴다**.
 * 당긴 자리에 못이 있으면 통! 걸려 고리가 그만큼 커지고, 못이 없으면 탁 되돌아간다.
 * 걸린 못을 집어 밖으로 빼면 다시 빠진다. 고리 모양이 본보기와 같아지면 그 고무줄이 완성된다.
 * 못을 하나씩 지정하는 게 아니라 **있는 모양을 주물러 다음 모양으로** 만드는 것 —
 * 이것이 지오보드다.
 *
 * 무벌점은 그대로다. 틀린 모양이라는 것 자체가 없고, 본보기와 같아지면 완성일 뿐이다.
 * 별 = 그 퍼즐의 세그먼트 수(= 고리들의 변 개수 합). 진행도는 완성한 퍼즐 id로 저장한다. */
window.App = (() => {
  const D = window.GeoboardData;
  const A = window.Audio2;
  const P = window.Progress;
  const $ = id => document.getElementById(id);
  const SVGNS = 'http://www.w3.org/2000/svg';

  const GRID = D.GRID;
  const BMIN = 10, BMAX = 90; // 못판 여백(0~100 좌표계) — 가장자리 못도 잘리지 않게
  const STEP = (BMAX - BMIN) / (GRID - 1);
  const pegPx = (gx, gy) => [BMIN + gx * STEP, BMIN + gy * STEP];

  /* ─────────── 화면 전환 ─────────── */
  let screenId = 'scr-home';
  function showScreen(id) {
    A.stop();
    screenId = id;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id === 'scr-home') renderHome();
  }

  /* ─────────── 고무줄 그리기 ───────────
   * 고무줄은 선이 아니라 **못들을 두르는 닫힌 고리**다. 꼭짓점을 바깥으로 밀어
   * 못을 감싸고 도는 모양을 만들고, 둘레가 길수록 얇게 그린다(늘어난 고무줄).
   * 실물 사진과 같은 결이 나오도록 어두운 테두리 + 본색 + 위쪽 하이라이트 세 겹으로 긋는다. */
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const vlen = a => Math.hypot(a[0], a[1]) || 1e-6;
  const vnorm = a => { const L = vlen(a); return [a[0] / L, a[1] / L]; };

  function outset(pts, d) {
    const n = pts.length;
    if (n < 2) return pts.slice();
    return pts.map((p, i) => {
      const prev = pts[(i - 1 + n) % n], next = pts[(i + 1) % n];
      const u = vnorm(sub(p, prev)), v = vnorm(sub(p, next));
      let b = [u[0] + v[0], u[1] + v[1]];
      if (vlen(b) < 0.08) b = [-u[1], u[0]];              // 일직선이면 옆으로 민다
      b = vnorm(b);
      const half = Math.max(0.42, vlen([u[0] + v[0], u[1] + v[1]]) / 2);
      const k = Math.min(2.1, 1 / half);
      return [p[0] + b[0] * d * k, p[1] + b[1] * d * k];
    });
  }
  function loopPerim(pts) {
    let L = 0;
    for (let i = 0; i < pts.length; i++) L += vlen(sub(pts[(i + 1) % pts.length], pts[i]));
    return L;
  }
  const pathD = pts => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ') + ' Z';

  /* pts = 고무줄이 지나는 자리들(못 좌표 + 끌고 있는 손끝). 한 가닥을 <g class="band"> 로 낸다. */
  function bandSVG(pts, color, cls) {
    const c = D.colorMeta(color) || D.COLORS.red;
    const w = Math.max(1.9, 3.6 - loopPerim(pts) * 0.0055);
    let inner = '';
    if (pts.length === 1) {                                // 못 하나에 걸쳐진 동그란 고무줄
      const r = 3.4 + 2.6;
      inner =
        '<circle cx="' + pts[0][0] + '" cy="' + pts[0][1] + '" r="' + r + '" fill="none" stroke="' + c.dk + '" stroke-width="' + (w + 1.15) + '"/>' +
        '<circle cx="' + pts[0][0] + '" cy="' + pts[0][1] + '" r="' + r + '" fill="none" stroke="' + c.hex + '" stroke-width="' + w + '"/>';
    } else {
      const d = pathD(outset(pts, 2.6 + w * 0.55));
      inner =
        '<path d="' + d + '" fill="none" stroke="' + c.dk + '" stroke-width="' + (w + 1.15) + '" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<path d="' + d + '" fill="none" stroke="' + c.hex + '" stroke-width="' + w + '" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<path d="' + d + '" fill="none" stroke="' + c.lt + '" stroke-width="' + (w * 0.34) + '" stroke-linejoin="round" stroke-linecap="round" opacity=".5"/>';
    }
    return '<g class="band c-' + color + (cls ? ' ' + cls : '') + '">' + inner + '</g>';
  }

  /* 아직 안 만든 고무줄은 흐린 점선 고리로 「여기에 걸어요」를 보여 준다 */
  function guideSVG(pts) {
    const d = pathD(outset(pts, 3.6));
    return '<path class="guide-line" d="' + d + '" fill="none" stroke="#B6AECC" stroke-width="1.6" ' +
      'stroke-dasharray="3 4.5" stroke-linejoin="round" stroke-linecap="round" opacity=".6"/>';
  }

  function pegSVG(gx, gy, hi) {
    const [x, y] = pegPx(gx, gy);
    const idx = gy * GRID + gx;
    let s = '<g class="peg' + (hi ? ' hi' : '') + '" data-i="' + idx + '" data-x="' + gx + '" data-y="' + gy + '">';
    s += '<circle class="hit" cx="' + x + '" cy="' + y + '" r="7.2" fill="transparent"/>';
    if (hi) s += '<circle class="ring" cx="' + x + '" cy="' + y + '" r="5.6" fill="none" stroke="#6C5CE7" stroke-width="1.8"/>';
    s += '<circle class="dot" cx="' + x + '" cy="' + y + '" r="2.6"/>';
    s += '</g>';
    return s;
  }

  const pegsToPts = pegs => pegs.map(p => pegPx(p[0], p[1]));
  const idxToPts  = list => list.map(i => pegPx(i % GRID, Math.floor(i / GRID)));

  /* variant: 'card'/'thumb'(본보기 — 전부 완성 모습) · 'play'(놀이판) */
  function boardSVG(pz, state, variant) {
    let guide = '', bands = '', pegs = '';
    if (variant === 'play') {
      pz.bands.forEach((b, i) => {
        if (state.made[i]) bands += bandSVG(idxToPts(state.made[i]), b.color);
        else guide += guideSVG(pegsToPts(b.pegs));
      });
      if (state.active) bands += bandSVG(activePts(state.active), state.active.color, 'live');
    } else {
      pz.bands.forEach(b => { bands += bandSVG(pegsToPts(b.pegs), b.color); });
    }
    const hot = variant === 'play' ? hotPegs(state) : [];
    for (let gy = 0; gy < GRID; gy++) for (let gx = 0; gx < GRID; gx++) {
      pegs += pegSVG(gx, gy, hot.indexOf(gy * GRID + gx) >= 0);
    }
    return '<svg class="board-svg" viewBox="0 0 100 100" xmlns="' + SVGNS + '">' + guide + bands + pegs + '</svg>';
  }

  // 지금 주무르는 고무줄이 실제로 지나는 자리 (집은 데가 있으면 손끝을 끼워 넣는다)
  function activePts(a) {
    const pts = idxToPts(a.verts);
    if (!a.grab || !a.grab.tip) return pts;
    if (a.grab.kind === 'edge') { const out = pts.slice(); out.splice(a.grab.at + 1, 0, a.grab.tip); return out; }
    const out = pts.slice(); out[a.grab.at] = a.grab.tip; return out;
  }
  // 당기는 동안 「여기 걸면 돼」로 반짝일 못 — 아직 안 만든 본보기 고무줄의 못들
  function hotPegs(state) {
    if (!state.active || !state.active.grab || !state.active.grab.tip) return [];
    const out = [];
    state.pz.bands.forEach((b, i) => {
      if (state.made[i] || b.color !== state.active.color) return;
      b.pegs.forEach(p => {
        const idx = p[1] * GRID + p[0];
        if (state.active.verts.indexOf(idx) < 0) out.push(idx);
      });
    });
    return out;
  }

  /* 손그림 아이콘 한 조각 — index.html 의 <symbol> 을 가리킨다(이모지 대신) */
  const ico = (name, cls) => '<svg class="ico' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#gb-' + name + '"/></svg>';

  /* ─────────── 홈: 단계 3개 ─────────── */
  function renderHome() {
    $('home-stars').textContent = P.stars();
    const menu = $('menu');
    menu.innerHTML = '';
    D.LEVELS.forEach(lv => {
      const ids = D.puzzlesOf(lv.id).map(x => x.id);
      const done = P.doneCount(ids);
      const pz = D.puzzlesOf(lv.id)[0];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-card ' + lv.cls;
      // 첫 칸을 가리키는 시작 화살표는 shared/screen.css 가 얹는다 — 앱에서 그리지 않는다
      b.innerHTML =
        '<span class="mc-icon">' + boardSVG(pz, null, 'thumb') + '</span>' +
        '<span class="mc-name">' + lv.name + '</span>' +
        '<span class="mc-desc">' + lv.desc + '</span>' +
        '<span class="mc-prog">' + (done ? ico('star') + ' ' + done + ' / ' + ids.length : '처음이야!') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openList(lv); });
      menu.appendChild(b);
    });
  }

  /* ─────────── 퍼즐 목록 ─────────── */
  let curLevel = null;
  function openList(lv) {
    curLevel = lv;
    $('list-title').innerHTML = ico('pin') + ' ' + lv.name;
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
        '<span class="pz-thumb">' + boardSVG(pz, null, 'thumb') + '</span>' +
        '<span class="pz-badge">' + (done ? ico('star') : ico('pin')) + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPlay(pz); });
      box.appendChild(b);
    });
    showScreen('scr-list');
  }

  /* ─────────── 놀이 ─────────── */
  let cur = null; // { pz, made:[verts|null...], active:{color,verts,grab}|null, locked }

  /* 못에 걸리는 거리. 못 간격이 16 이라 절반이 8 인데, 8 로 두면 **판 위 어디에 놓아도**
   * 어딘가에 걸려서 「탁 되돌아가기」가 아예 일어나지 않는다. 못과 못 사이에 안 걸리는
   * 자리를 남겨야 고무줄이 고무줄답다. */
  const CATCH = 6.4;

  function openPlay(pz) {
    cur = { pz, made: pz.bands.map(() => null), active: null, locked: false };
    $('play-title').innerHTML = ico('pin') + ' 똑같이 걸어요';
    $('card-board').innerHTML = boardSVG(pz, null, 'card');
    renderTray();
    renderBoard();
    showScreen('scr-play');
    setTimeout(() => { if (cur && !cur.locked) A.speak('고무줄을 잡아당겨 볼까?'); }, 300);
  }

  const madeCount = () => cur.made.filter(Boolean).length;
  const placedSegments = () =>
    cur.pz.bands.reduce((acc, b, i) => acc.concat(cur.made[i] ? D.bandSegments(b) : []), []);
  const totalMatched = () => placedSegments().length;

  function renderBoard() { $('board').innerHTML = boardSVG(cur.pz, cur, 'play'); }

  /* 트레이 — 이 퍼즐에 필요한 색만 낸다. 다 만든 색은 완성 표시.
   * (없는 색을 골라 봐야 아무 데도 안 맞으니, 다섯 살에게는 막다른 길이 된다) */
  function trayColors() {
    const out = [];
    cur.pz.bands.forEach(b => { if (out.indexOf(b.color) < 0) out.push(b.color); });
    return out;
  }
  const colorDone = id =>
    cur.pz.bands.every((b, i) => b.color !== id || cur.made[i]);

  function renderTray() {
    const box = $('tray');
    box.innerHTML = '';
    trayColors().forEach(id => {
      const done = colorDone(id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tray-item c-' + id +
        (cur.active && cur.active.color === id ? ' sel' : '') + (done ? ' done' : '');
      b.dataset.id = id;
      b.innerHTML = '<span class="ti-band">' + D.bandSwatchSVG(id, 'sw-' + id) + '</span>' +
        (done ? '<span class="ti-done">' + ico('star') + '</span>' : '');
      b.addEventListener('click', ev => { ev.preventDefault(); trayPick(id); });
      box.appendChild(b);
    });
  }

  // 그 색으로 아직 안 만든 본보기 고무줄 (여러 개면 첫 번째)
  const nextTarget = color => cur.pz.bands.findIndex((b, i) => !cur.made[i] && b.color === color);

  /* 색을 고르면 그 색 고무줄이 **판에 걸려 나온다** — 본보기의 첫 두 못에 걸쳐서.
   * 빈 판에서 시작하지 않는 것은 실물과 같고(고무줄은 늘 어딘가 걸려 있다),
   * 다섯 살이 「이걸 잡아당기면 되는구나」를 바로 알게 한다. */
  function trayPick(id) {
    if (!cur || cur.locked) return;
    const t = nextTarget(id);
    if (t < 0) { A.sfx.tap(); A.speak(D.COLORS[id].say + '은 다 걸었어!'); return; }
    if (cur.active && cur.active.color === id) { cur.active = null; A.sfx.tap(); renderTray(); renderBoard(); return; }
    const pegs = cur.pz.bands[t].pegs;
    cur.active = {
      color: id,
      verts: [pegs[0][1] * GRID + pegs[0][0], pegs[1][1] * GRID + pegs[1][0]],
      grab: null,
    };
    A.sfx.tap();
    renderTray();
    renderBoard();
    A.speak(D.COLORS[id].say + '! 잡아당겨 봐.');
  }

  /* ─────────── 집어서 당기기 ─────────── */
  function boardPoint(ev) {
    const svg = $('board').querySelector('.board-svg');
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return [(ev.clientX - r.left) / r.width * 100, (ev.clientY - r.top) / r.height * 100];
  }
  function nearestPeg(x, y, within) {
    let best = null, bd = Infinity;
    for (let gy = 0; gy < GRID; gy++) for (let gx = 0; gx < GRID; gx++) {
      const [cx, cy] = pegPx(gx, gy);
      const d = Math.hypot(x - cx, y - cy);
      if (d < bd) { bd = d; best = gy * GRID + gx; }
    }
    return bd <= within ? best : null;
  }
  function distToSeg(p, a, b) {
    const ab = sub(b, a), ap = sub(p, a);
    const den = ab[0] * ab[0] + ab[1] * ab[1] || 1e-6;
    const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1]) / den));
    return vlen(sub(p, [a[0] + ab[0] * t, a[1] + ab[1] * t]));
  }

  function grabAt(p) {
    const a = cur.active;
    if (!a) return null;
    const pts = idxToPts(a.verts);
    // ① 걸린 못을 집었나 — 그대로 빼거나 다른 못으로 옮길 수 있다
    let vi = -1, vd = Infinity;
    pts.forEach((q, i) => { const d = vlen(sub(p, q)); if (d < vd) { vd = d; vi = i; } });
    if (vd <= 6.5 && a.verts.length > 2) return { kind: 'vert', at: vi, tip: p };
    // ② 줄 위 아무 데나 — 못이 아니어도 집힌다(손가락이 정확할 필요가 없다)
    let ei = -1, ed = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const d = distToSeg(p, pts[i], pts[(i + 1) % pts.length]);
      if (d < ed) { ed = d; ei = i; }
    }
    return ed <= 7.5 ? { kind: 'edge', at: ei, tip: p } : null;
  }

  function releaseGrab() {
    const a = cur.active;
    if (!a || !a.grab) return;
    const { kind, at, tip } = a.grab;
    a.grab = null;
    const peg = tip ? nearestPeg(tip[0], tip[1], CATCH) : null;
    const fresh = peg !== null && a.verts.indexOf(peg) < 0;

    if (kind === 'edge') {
      if (fresh) { a.verts.splice(at + 1, 0, peg); A.sfx.twang(); }
      else A.sfx.hmm();                                   // 탁 되돌아간다 (무벌점)
    } else {
      if (fresh) { a.verts[at] = peg; A.sfx.twang(); }
      else if (peg === null && a.verts.length > 2) { a.verts.splice(at, 1); A.sfx.hmm(); }
      else A.sfx.hmm();
    }
    checkBand();
    renderBoard();
  }

  /* 지금 모양이 본보기의 어느 고무줄과 같아졌나 — 시작 못·도는 방향이 달라도 같다고 본다 */
  function checkBand() {
    const a = cur.active;
    if (!a) return;
    const t = cur.pz.bands.findIndex((b, i) =>
      !cur.made[i] && b.color === a.color &&
      D.sameLoop(a.verts, b.pegs.map(p => p[1] * GRID + p[0])));
    if (t < 0) return;
    cur.made[t] = a.verts.slice();
    cur.active = null;
    A.sfx.twang();
    renderTray();
    renderBoard();
    if (madeCount() === cur.pz.bands.length) complete();
    else setTimeout(() => { if (cur && !cur.locked) A.speak('좋아! 다음 고무줄.'); }, 260);
  }

  /* ─────────── 완성 ─────────── */
  function complete() {
    cur.locked = true;
    const pz = cur.pz;
    const first = !P.isDone(pz.id);
    P.markDone(pz.id);
    P.addStar(pz.segments.length); // 별 = 세그먼트 수
    if (window.Pet) Pet.awardSnack(1);
    if (first && window.Pet) {
      const ids = D.puzzlesOf(pz.stage).map(x => x.id);
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
    $('reward-board').innerHTML = boardSVG(cur.pz, null, 'card');
    $('reward').classList.add('on');
  }
  function nextPuzzle() {
    const list = D.puzzlesOf(cur.pz.stage);
    const idx = list.findIndex(x => x.id === cur.pz.id);
    for (let k = 1; k <= list.length; k++) {
      const cand = list[(idx + k) % list.length];
      if (!P.isDone(cand.id)) { openPlay(cand); return; }
    }
    openList(D.levelDef(cur.pz.stage));
  }

  /* ─────────── 색종이 축하 ─────────── */
  function burstConfetti() {
    const box = $('confetti');
    box.innerHTML = '';
    const colors = ['#EF4E4E', '#4DA6E8', '#F4CE2A', '#57BE4E', '#F5952E', '#A77CE0'];
    for (let i = 0; i < 34; i++) {
      const c = document.createElement('i');
      c.className = 'cf';
      c.style.left = (5 + Math.random() * 90) + '%';
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = (Math.random() * 0.3) + 's';
      c.style.animationDuration = (1.1 + Math.random() * 0.9) + 's';
      c.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      c.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
      if (Math.random() < 0.5) c.style.borderRadius = '50%';
      box.appendChild(c);
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
      ev.preventDefault(); A.sfx.tap(); openList(D.levelDef(cur.pz.stage));
    });
    $('btn-listen').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      if (!cur) return;
      const left = cur.pz.bands.filter((b, i) => !cur.made[i]);
      if (!left.length) { A.speak('다 걸었어요!'); return; }
      if (cur.active) A.speak('잡아당겨서 본보기랑 똑같이 만들어 봐!');
      else A.speak(D.COLORS[left[0].color].say + '이 아직 남았어!');
    });
    $('reward-next').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on'); nextPuzzle();
    });
    $('reward-close').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on');
      openList(D.levelDef(cur.pz.stage));
    });

    const board = $('board');
    board.addEventListener('pointerdown', ev => {
      if (!cur || cur.locked || !cur.active) return;
      const p = boardPoint(ev);
      if (!p) return;
      const g = grabAt(p);
      if (!g) return;
      ev.preventDefault();
      try { board.setPointerCapture(ev.pointerId); } catch (e) {}
      cur.active.grab = g;
      A.sfx.tap();
      renderBoard();
    });
    board.addEventListener('pointermove', ev => {
      if (!cur || cur.locked || !cur.active || !cur.active.grab) return;
      ev.preventDefault();
      const p = boardPoint(ev);
      if (!p) return;
      cur.active.grab.tip = p;
      renderBoard();
    });
    const letGo = ev => {
      if (!cur || !cur.active || !cur.active.grab) return;
      try { board.releasePointerCapture(ev.pointerId); } catch (e) {}
      releaseGrab();
    };
    board.addEventListener('pointerup', letGo);
    board.addEventListener('pointercancel', letGo);

    renderHome();
  }
  init();

  /* ─────────── 종단 테스트용 ─────────── */

  /* 아이가 하듯 「줄의 한 곳을 집어 그 못으로 당기기」를 한 번 한다.
   * 집는 자리는 그 못에 가장 가까운 변 — 실제 손가락이 고르는 자리와 같다. */
  function pullTo(pegIdx) {
    if (!cur || cur.locked || !cur.active) return false;
    const a = cur.active;
    if (a.verts.indexOf(pegIdx) >= 0) return false;
    const target = pegPx(pegIdx % GRID, Math.floor(pegIdx / GRID));
    const pts = idxToPts(a.verts);
    let ei = 0, ed = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const m = [(pts[i][0] + pts[(i + 1) % pts.length][0]) / 2,
                 (pts[i][1] + pts[(i + 1) % pts.length][1]) / 2];
      const d = vlen(sub(m, target));
      if (d < ed) { ed = d; ei = i; }
    }
    a.grab = { kind: 'edge', at: ei, tip: target };
    releaseGrab();
    return true;
  }

  function solveAll() {
    if (!cur || cur.locked) return;
    // 색마다 그 색 고무줄을 하나씩 꺼내 본보기 못을 차례로 걸어 준다
    for (let guard = 0; guard < 40 && madeCount() < cur.pz.bands.length; guard++) {
      const t = cur.pz.bands.findIndex((b, i) => !cur.made[i]);
      if (t < 0) break;
      trayPick(cur.pz.bands[t].color);
      if (!cur.active) break;
      const want = cur.pz.bands[t].pegs.map(p => p[1] * GRID + p[0]);
      want.forEach(idx => { if (cur.active) pullTo(idx); });
      if (cur.active) { cur.active = null; renderTray(); renderBoard(); }  // 못 맞추면 접고 다음으로
    }
  }
  function debug() {
    return {
      screen: screenId,
      stars: P.stars(),
      stage: cur ? cur.pz.stage : null,
      puzzleId: cur ? cur.pz.id : null,
      segments: cur ? cur.pz.segments.slice() : null,
      total: cur ? cur.pz.segments.length : null,
      placed: cur ? placedSegments() : null,
      placedCount: cur ? totalMatched() : null,
      colorsCount: cur ? D.colorsOf(cur.pz).length : null,
      locked: cur ? cur.locked : null,
      done: cur ? P.isDone(cur.pz.id) : null,
      bandCount: $('board') ? $('board').querySelectorAll('.band').length : 0,
      bands: cur ? cur.pz.bands.length : null,
      madeCount: cur ? madeCount() : null,
      activeColor: cur && cur.active ? cur.active.color : null,
      activeVerts: cur && cur.active ? cur.active.verts.slice() : null,
    };
  }
  return {
    debug,
    _pick: trayPick,
    _pullTo: pullTo,
    _solve: solveAll,
  };
})();
