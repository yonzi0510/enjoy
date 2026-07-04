/* 따라쓰기 — 캔버스 획순 엔진
 * 회색 안내선 위를 손가락으로 따라 그리면 색이 채워진다.
 * 획 좌표는 data.js의 100×100 정규화 좌표. 리샘플 후 근접 판정으로 진행.
 * 테스트 훅: window.__hangulTest.tracePath() — 현재 획의 화면(client) 좌표 목록
 */
window.Trace = (() => {
  const STEP = 3;        // 리샘플 간격 (정규화 단위)
  const TOL = 15;        // 허용 거리 (정규화 단위)
  const LOOKAHEAD = 8;   // 한 번에 건너뛸 수 있는 점 수

  let cv, cx, letter, strokes, cur, idx, drawing, done, onStrokeEnd, onAllDone, rafId;
  let scale = 1, pad = 0;

  // 꺾은선을 일정 간격 점으로 리샘플
  function resample(poly) {
    const pts = [];
    for (let i = 0; i < poly.length - 1; i++) {
      const [x1, y1] = poly[i], [x2, y2] = poly[i + 1];
      const d = Math.hypot(x2 - x1, y2 - y1);
      const n = Math.max(1, Math.round(d / STEP));
      for (let j = 0; j < n; j++) {
        pts.push([x1 + (x2 - x1) * j / n, y1 + (y2 - y1) * j / n]);
      }
    }
    pts.push(poly[poly.length - 1].slice());
    return pts;
  }

  function toPx(p) { return [pad + p[0] * scale, pad + p[1] * scale]; }

  function drawPoly(pts, from, to, color, width) {
    if (to - from < 1) {
      // 점 하나만 채워졌을 때도 둥근 점을 찍어준다
      const [x, y] = toPx(pts[from]);
      cx.beginPath(); cx.arc(x, y, width / 2, 0, Math.PI * 2); cx.fillStyle = color; cx.fill();
      return;
    }
    cx.beginPath();
    const [x0, y0] = toPx(pts[from]);
    cx.moveTo(x0, y0);
    for (let i = from + 1; i <= to; i++) {
      const [x, y] = toPx(pts[i]);
      cx.lineTo(x, y);
    }
    cx.strokeStyle = color;
    cx.lineWidth = width;
    cx.lineCap = 'round';
    cx.lineJoin = 'round';
    cx.stroke();
  }

  function render(t) {
    cx.clearRect(0, 0, cv.width, cv.height);
    const guideW = 22 * scale / 3.2, inkW = 16 * scale / 3.2;

    // 안내선(전체 회색)
    strokes.forEach(s => drawPoly(s, 0, s.length - 1, '#E4DAF0', guideW));
    // 완성한 획
    for (let i = 0; i < cur; i++) drawPoly(strokes[i], 0, strokes[i].length - 1, '#FF8FB6', inkW);
    if (done) { drawPoly(strokes[cur - 1] || strokes[0], 0, (strokes[cur - 1] || strokes[0]).length - 1, '#FF8FB6', inkW); return; }

    const s = strokes[cur];
    // 현재 획: 진행분 채우기
    if (idx > 0) drawPoly(s, 0, idx, '#FF6FA5', inkW);

    // 시작점 깜빡이는 안내 점 + 방향 화살표
    const target = s[Math.min(idx, s.length - 1)];
    const [tx, ty] = toPx(target);
    const pulse = 1 + 0.18 * Math.sin((t || 0) / 180);
    cx.beginPath();
    cx.arc(tx, ty, 9 * pulse * scale / 3.2, 0, Math.PI * 2);
    cx.fillStyle = '#FFB300';
    cx.fill();
    cx.lineWidth = 3;
    cx.strokeStyle = '#fff';
    cx.stroke();

    const nxt = s[Math.min(idx + 4, s.length - 1)];
    const ang = Math.atan2(nxt[1] - target[1], nxt[0] - target[0]);
    if (nxt !== target) {
      const ax = tx + Math.cos(ang) * 22 * scale / 3.2, ay = ty + Math.sin(ang) * 22 * scale / 3.2;
      cx.save();
      cx.translate(ax, ay); cx.rotate(ang);
      cx.beginPath(); cx.moveTo(-7, -6); cx.lineTo(6, 0); cx.lineTo(-7, 6); cx.closePath();
      cx.fillStyle = '#FFB300'; cx.fill();
      cx.restore();
    }
  }

  function loop(t) { render(t); if (!done) rafId = requestAnimationFrame(loop); }

  function ptFromEvent(ev) {
    const r = cv.getBoundingClientRect();
    const x = (ev.clientX - r.left) * (cv.width / r.width);
    const y = (ev.clientY - r.top) * (cv.height / r.height);
    return [(x - pad) / scale, (y - pad) / scale]; // 정규화 좌표로 환원
  }

  function near(p, q, tol) { return Math.hypot(p[0] - q[0], p[1] - q[1]) <= tol; }

  function advance(p) {
    const s = strokes[cur];
    // 앞쪽 몇 점까지 살펴 가장 멀리 도달한 지점으로 진행
    let moved = false;
    for (let k = Math.min(idx + LOOKAHEAD, s.length - 1); k > idx; k--) {
      if (near(p, s[k], TOL)) { idx = k; moved = true; break; }
    }
    if (!moved && !near(p, s[Math.min(idx, s.length - 1)], TOL * 1.6)) return; // 너무 벗어나면 무시
    if (idx >= s.length - 1) strokeDone();
  }

  function strokeDone() {
    cur += 1;
    idx = 0;
    drawing = false;
    if (cur >= strokes.length) {
      done = true;
      render();
      if (onAllDone) onAllDone(letter);
    } else if (onStrokeEnd) {
      onStrokeEnd(cur, strokes.length);
    }
  }

  function down(ev) {
    if (done) return;
    ev.preventDefault();
    const p = ptFromEvent(ev);
    if (near(p, strokes[cur][idx], TOL * 1.4)) {
      drawing = true;
      cv.setPointerCapture && cv.setPointerCapture(ev.pointerId);
      advance(p);
    }
  }
  function move(ev) {
    if (!drawing || done) return;
    ev.preventDefault();
    // coalesced events가 있으면 모두 반영해 빠른 드래그도 놓치지 않는다
    const evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev];
    (evs.length ? evs : [ev]).forEach(e => advance(ptFromEvent(e)));
  }
  function up() { drawing = false; }

  function start(canvas, letterData, cb) {
    stop();
    cv = canvas;
    cx = cv.getContext('2d');
    letter = letterData;
    // 캔버스 크기에 맞춰 배율 계산 (여백 8%)
    pad = cv.width * 0.08;
    scale = (cv.width - pad * 2) / 100;
    strokes = letter.strokes.map(resample);
    cur = 0; idx = 0; drawing = false; done = false;
    onStrokeEnd = cb && cb.onStroke;
    onAllDone = cb && cb.onDone;
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (cv) {
      cv.removeEventListener('pointerdown', down);
      cv.removeEventListener('pointermove', move);
      cv.removeEventListener('pointerup', up);
      cv.removeEventListener('pointercancel', up);
    }
    done = true;
  }

  // 테스트 훅 — 현재 획의 화면(client) 좌표 목록
  function tracePath() {
    if (!cv || done || !strokes || cur >= strokes.length) return null;
    const r = cv.getBoundingClientRect();
    return strokes[cur].map(p => {
      const [px, py] = toPx(p);
      return [r.left + px * (r.width / cv.width), r.top + py * (r.height / cv.height)];
    });
  }
  function state() { return { cur, total: strokes ? strokes.length : 0, done }; }

  return { start, stop, tracePath, state };
})();
