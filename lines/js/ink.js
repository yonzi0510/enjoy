/* 선 따라 그리기 — 안내선(점선) 트레이싱 캔버스 + 판정 엔진
 * write/js/ink.js(math/js/ink.js 와 같은 계열)의 포인터 캡처·래스터 겹침 채점 방식을
 * "글자" 대신 "임의의 안내선 경로({x,y} 점 배열의 배열)"에 맞게 일반화한 것.
 * - 이 앱은 손가락 트레이싱 앱이라 pointerType 을 가리지 않는다(펜슬 전용이 아님).
 * - 판정은 두 방향을 함께 본다 — coverage(안내선이 잉크로 얼마나 덮였는지) 와
 *   adherence(그은 잉크가 안내선 가까이에 얼마나 머물렀는지). 둘 다 문턱을 넘어야 완성 —
 *   화면을 아무 데나 크게 칠해서 겹침 픽셀 수만 채우는 편법을 막는다(coloring 앱의 교훈과 같은 원칙:
 *   "덮은 비율"만 보면 속아 넘어가므로, "안내선 위에서 벗어나지 않았는지"도 반드시 함께 봐야 한다).
 * - 잉크는 항상 무지개색(획마다 색상환을 돈다) — 색 고르기 UI 없이도 알록달록하고 손 궤적이 또렷하다.
 */
window.Ink = (() => {
  const W = 640, H = 640;   // 정사각 캔버스 논리 좌표계 (lines/js/data.js 와 반드시 같아야 한다)
  const INK_W = 16;         // 잉크 굵기 — 손가락으로 그리므로 굵게
  const JUDGE_R = 34;       // 안내선-잉크 겹침 판정 반경(너그러운 톨러런스)
  const DASH = [16, 14];    // 안내선 점선 패턴

  /* ─────────── 획 그리기 ─────────── */
  function segColor(base, i) { return 'hsl(' + ((base + i * 18) % 360) + ' 82% 56%)'; }
  function strokePath(ctx, p) {
    ctx.beginPath();
    if (p.length === 2) { ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + 0.5, p[1] + 0.5); }
    else {
      ctx.moveTo(p[0], p[1]);
      for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    }
    ctx.stroke();
  }
  function drawStroke(ctx, st) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = st.w || INK_W;
    ctx.globalAlpha = st.a || 1;
    for (let i = 2; i < st.p.length; i += 2) {
      ctx.strokeStyle = segColor(st.b || 0, i / 2);
      ctx.beginPath();
      ctx.moveTo(st.p[i - 2], st.p[i - 1]);
      ctx.lineTo(st.p[i], st.p[i + 1]);
      ctx.stroke();
    }
    if (st.p.length === 2) { ctx.strokeStyle = segColor(st.b || 0, 0); strokePath(ctx, st.p); }
    ctx.globalAlpha = 1;
  }
  function drawItems(ctx, items, cur) {
    for (const it of items) drawStroke(ctx, it);
    if (cur && cur.p && cur.p.length >= 2) drawStroke(ctx, cur);
  }
  function pathToFlat(p) {
    const a = [];
    p.forEach(pt => { a.push(pt.x, pt.y); });
    return a;
  }

  /* ─────────── 안내선 그리기 ─────────── */
  function drawGuidePaths(ctx, paths) {
    ctx.save();
    ctx.strokeStyle = 'rgba(120,140,185,.5)';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash(DASH);
    paths.forEach(p => {
      if (p.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(p[0].x, p[0].y);
      for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.restore();
  }
  function drawChar(ctx, guide) {
    const o = guide.origin;
    ctx.save();
    ctx.beginPath();
    ctx.arc(o.x, o.y, guide.faceR || 60, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.78)';
    ctx.fill();
    ctx.font = (guide.faceSize || 76) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(guide.char, o.x, o.y + 2);
    ctx.restore();
  }

  /* ─────────── 공용 포인터 캔버스 골격 ───────────
   * write/js/ink.js 의 pointerCanvas 를 텍스트 없이 그대로 가져오되, 손가락도 받는다. */
  function pointerCanvas(canvas, opts) {
    const ctx = canvas.getContext('2d');
    let items = [];
    let cur = null, pid = null;
    let strokeSeq = 0;

    function resize() {
      const r = canvas.getBoundingClientRect();
      if (!r.width) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.width * (H / W) * dpr);
      ctx.setTransform((r.width / W) * dpr, 0, 0, (r.width / W) * dpr, 0, 0);
      redraw();
    }
    function redraw() {
      ctx.clearRect(0, 0, W, H);
      opts.draw(ctx);
      drawItems(ctx, items, cur);
    }
    function toLogical(e) {
      const r = canvas.getBoundingClientRect();
      return [
        Math.max(0, Math.min(W, Math.round((e.clientX - r.left) / (r.width / W)))),
        Math.max(0, Math.min(H, Math.round((e.clientY - r.top) / (r.height / H)))),
      ];
    }
    function addPoint(e) {
      const [x, y] = toLogical(e);
      const p = cur.p, n = p.length;
      if (n >= 2 && Math.abs(x - p[n - 2]) < 2 && Math.abs(y - p[n - 1]) < 2) return;
      p.push(x, y);
      if (n >= 2) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = cur.w || INK_W;
        ctx.globalAlpha = cur.a || 1;
        ctx.strokeStyle = segColor(cur.b || 0, n / 2);
        ctx.beginPath();
        ctx.moveTo(p[n - 2], p[n - 1]);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    function forceFinish() {
      if (!cur) { pid = null; return; }
      if (cur.p.length >= 2) items.push(cur);
      cur = null; pid = null;
      redraw();
      if (opts.onChange) opts.onChange();
    }
    function finish(e) { if (!cur || e.pointerId !== pid) return; forceFinish(); }

    canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (cur) forceFinish(); // 이전 획이 덜 끝났으면 살려서 마무리
      pid = e.pointerId;
      try { canvas.setPointerCapture(pid); } catch (err) { /* 합성 이벤트는 캡처 불가 */ }
      cur = { p: [], w: INK_W, a: 1, b: (strokeSeq++ * 53) % 360 };
      addPoint(e);
    });
    canvas.addEventListener('pointermove', e => {
      if (e.pointerId !== pid || !cur) return;
      e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
      if (evs && evs.length) evs.forEach(addPoint); else addPoint(e);
    });
    canvas.addEventListener('pointerup', e => { if (cur) finish(e); else if (e.pointerId === pid) pid = null; });
    canvas.addEventListener('pointercancel', e => { if (cur) finish(e); else if (e.pointerId === pid) pid = null; });
    canvas.addEventListener('lostpointercapture', () => { if (cur) forceFinish(); });
    window.addEventListener('resize', resize);
    resize();

    return {
      resize, redraw,
      items() { return items; },
      pushStroke(flat) { // 프로그램적으로 획을 그대로 추가(디버그·e2e용 완벽 트레이스)
        items.push({ p: flat.slice(), w: INK_W, a: 1, b: (strokeSeq++ * 53) % 360 });
        redraw();
        if (opts.onChange) opts.onChange();
      },
      clear() { items = []; cur = null; redraw(); if (opts.onChange) opts.onChange(); },
      undo() { items.pop(); redraw(); if (opts.onChange) opts.onChange(); },
      count() { return items.length; },
    };
  }

  /* ─────────── 안내선 트레이싱 캔버스 ─────────── */
  function GuideCanvas(canvas, opts) { // opts: { onChange() }
    let guide = null; // { paths, origin, char, faceR, faceSize }
    const base = pointerCanvas(canvas, {
      onChange: opts.onChange,
      draw(ctx) {
        if (!guide) return;
        drawGuidePaths(ctx, guide.paths);
        drawChar(ctx, guide);
      },
    });

    function rasterAt(scale, drawFn) {
      const w = Math.round(W * scale), h = Math.round(H * scale);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const cx = c.getContext('2d', { willReadFrequently: true });
      cx.scale(scale, scale);
      drawFn(cx);
      return cx.getImageData(0, 0, w, h).data;
    }
    function guideRaster(cx, width) {
      cx.lineCap = 'round'; cx.lineJoin = 'round';
      cx.strokeStyle = '#000'; cx.lineWidth = width;
      guide.paths.forEach(p => {
        if (p.length < 2) return;
        cx.beginPath();
        cx.moveTo(p[0].x, p[0].y);
        for (let i = 1; i < p.length; i++) cx.lineTo(p[i].x, p[i].y);
        cx.stroke();
      });
    }
    function inkRaster(cx, width) {
      cx.lineCap = 'round'; cx.lineJoin = 'round';
      cx.strokeStyle = '#000'; cx.lineWidth = width;
      for (const st of base.items()) strokePath(cx, st.p);
    }

    return {
      resize: base.resize,
      setGuide(g) { guide = g; base.clear(); },
      strokeCount: base.count,
      undo: base.undo,
      clear: base.clear,
      inkLength() {
        let len = 0;
        for (const st of base.items()) {
          for (let i = 2; i < st.p.length; i += 2) len += Math.hypot(st.p[i] - st.p[i - 2], st.p[i + 1] - st.p[i - 1]);
        }
        return len;
      },
      // 안내선이 잉크로 덮인 비율 0~1 — "완주" 척도
      coverage() {
        if (!guide || base.count() === 0) return 0;
        const s = 0.5;
        const gd = rasterAt(s, cx => guideRaster(cx, 9));
        const kd = rasterAt(s, cx => inkRaster(cx, JUDGE_R * 2));
        let total = 0, hit = 0;
        const w = Math.round(W * s), h = Math.round(H * s);
        for (let y = 0; y < h; y += 3) {
          for (let x = 0; x < w; x += 3) {
            const a = (y * w + x) * 4 + 3;
            if (gd[a] > 60) { total++; if (kd[a] > 10) hit++; }
          }
        }
        return total ? hit / total : 0;
      },
      // 그은 잉크가 안내선 가까이에 머문 비율 0~1 — "엉뚱한 데 칠하기" 방지 척도
      adherence() {
        if (!guide || base.count() === 0) return 0;
        const s = 0.5;
        const gWide = rasterAt(s, cx => guideRaster(cx, JUDGE_R * 2));
        const kd = rasterAt(s, cx => inkRaster(cx, INK_W));
        let total = 0, hit = 0;
        const w = Math.round(W * s), h = Math.round(H * s);
        for (let y = 0; y < h; y += 3) {
          for (let x = 0; x < w; x += 3) {
            const a = (y * w + x) * 4 + 3;
            if (kd[a] > 60) { total++; if (gWide[a] > 10) hit++; }
          }
        }
        return total ? hit / total : 0;
      },
      // 안내선을 그대로 따라 그리기 — e2e/디버그용 완벽 트레이스 시뮬레이션
      traceGuide() {
        if (!guide) return;
        guide.paths.forEach(p => { if (p.length >= 2) base.pushStroke(pathToFlat(p)); });
      },
    };
  }

  return { GuideCanvas, W, H, INK_W, JUDGE_R };
})();
