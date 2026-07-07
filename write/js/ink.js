/* 펜 잉크 캔버스 — 줄노트 한 줄짜리 필기 엔진
 * - 펜슬 전용: pointerType 'touch'는 무시(손바닥 리젝션), 'pen'과 'mouse'(데스크톱·테스트)만 필기
 * - 좌표는 논리 공간(1000×260)으로 저장해 화면 크기·기기가 달라도 다시 그릴 수 있다
 * - 판정: 회색 안내 글자를 래스터로 깔고, 획을 굵게 그린 레이어와 겹쳐 덮인 비율을 잰다 (느슨한 겹침 판정)
 */
window.Ink = (() => {
  const W = 1000, H = 260;   // 논리 좌표계 (한 줄)
  const INK_W = 10;          // 잉크 굵기
  const JUDGE_R = 26;        // 이 반경 안을 지나면 "덮었다"고 봐주는 너그러운 판정 반경
  const FONT = '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';

  function units(text) { // 글자폭 어림치 (공백은 반 칸)
    let u = 0;
    for (const ch of text) u += ch === ' ' ? 0.45 : 1;
    return Math.max(u, 1);
  }
  function fontSize(text) { return Math.min(H * 0.6, (W * 0.94) / units(text)); }

  function drawGuideText(ctx, text, color) {
    ctx.font = '700 ' + fontSize(text) + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, W / 2, H * 0.52);
  }

  function strokePath(ctx, p) {
    ctx.beginPath();
    if (p.length === 2) { // 점 하나 = 짧은 획으로
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(p[0] + 0.5, p[1] + 0.5);
    } else {
      ctx.moveTo(p[0], p[1]);
      for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    }
    ctx.stroke();
  }

  function drawRuling(ctx) { // 줄노트 괘선: 가운데 점선 + 아래 실선
    ctx.save();
    ctx.strokeStyle = '#DCEcF5';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 14]);
    ctx.beginPath(); ctx.moveTo(14, H * 0.52); ctx.lineTo(W - 14, H * 0.52); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#AFD9EC';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(10, H - 8); ctx.lineTo(W - 10, H - 8); ctx.stroke();
    ctx.restore();
  }

  function drawAll(ctx, guide, strokes, cur) {
    ctx.clearRect(0, 0, W, H);
    drawRuling(ctx);
    if (guide) drawGuideText(ctx, guide, '#C7C7D6');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = INK_W;
    for (const st of strokes) { ctx.strokeStyle = st.c; strokePath(ctx, st.p); }
    if (cur && cur.p.length >= 2) { ctx.strokeStyle = cur.c; strokePath(ctx, cur.p); }
  }

  /* ─────────── 한 줄 필기 캔버스 ─────────── */
  function InkLine(canvas, opts) { // opts: { guide, color(), onChange(), onTouchReject() }
    const ctx = canvas.getContext('2d');
    let guide = opts.guide || null;
    let strokes = [];        // [{c, p:[x,y,...]}]
    let cur = null, pid = null;
    let scale = 1;

    function resize() {
      const r = canvas.getBoundingClientRect();
      if (!r.width) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.width * (H / W) * dpr);
      scale = r.width / W;
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
      redraw();
    }
    function redraw() { drawAll(ctx, guide, strokes, cur); }

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
      if (n >= 2 && Math.abs(x - p[n - 2]) < 3 && Math.abs(y - p[n - 1]) < 3) return;
      p.push(x, y);
      if (n >= 2) { // 마지막 선분만 바로 그려 부드럽게
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.lineWidth = INK_W; ctx.strokeStyle = cur.c;
        ctx.beginPath(); ctx.moveTo(p[n - 2], p[n - 1]); ctx.lineTo(x, y); ctx.stroke();
      }
    }
    function finish(e) {
      if (!cur || e.pointerId !== pid) return;
      if (cur.p.length >= 2) strokes.push(cur);
      cur = null; pid = null;
      redraw();
      if (opts.onChange) opts.onChange();
    }

    canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') { if (opts.onTouchReject) opts.onTouchReject(); return; }
      e.preventDefault();
      if (cur) return;
      pid = e.pointerId;
      try { canvas.setPointerCapture(pid); } catch (err) { /* 합성 이벤트는 캡처 불가 */ }
      cur = { c: opts.color(), p: [] };
      addPoint(e);
    });
    canvas.addEventListener('pointermove', e => {
      if (cur && e.pointerId === pid) { e.preventDefault(); addPoint(e); }
    });
    canvas.addEventListener('pointerup', finish);
    canvas.addEventListener('pointercancel', finish);
    window.addEventListener('resize', resize);

    resize();

    return {
      resize,
      setGuide(g) { guide = g || null; strokes = []; cur = null; redraw(); },
      setStrokes(arr) { strokes = (arr || []).map(s => ({ c: s.c, p: s.p.slice() })); redraw(); },
      strokes() { return strokes.map(s => ({ c: s.c, p: s.p.slice() })); },
      strokeCount() { return strokes.length; },
      clear() { strokes = []; cur = null; redraw(); if (opts.onChange) opts.onChange(); },
      undo() { strokes.pop(); redraw(); if (opts.onChange) opts.onChange(); },
      inkLength() {
        let len = 0;
        for (const st of strokes) {
          for (let i = 2; i < st.p.length; i += 2) {
            len += Math.hypot(st.p[i] - st.p[i - 2], st.p[i + 1] - st.p[i - 1]);
          }
        }
        return len;
      },
      // 안내 글자를 잉크가 얼마나 덮었는지 0~1 (안내 글자가 없으면 1)
      coverage() {
        if (!guide) return 1;
        const s = 0.5, w = W * s, h = H * s;
        const g = document.createElement('canvas'); g.width = w; g.height = h;
        const gc = g.getContext('2d', { willReadFrequently: true });
        gc.scale(s, s);
        drawGuideText(gc, guide, '#000');
        const gd = gc.getImageData(0, 0, w, h).data;
        const k = document.createElement('canvas'); k.width = w; k.height = h;
        const kc = k.getContext('2d', { willReadFrequently: true });
        kc.scale(s, s);
        kc.lineCap = 'round'; kc.lineJoin = 'round';
        kc.lineWidth = JUDGE_R * 2; kc.strokeStyle = '#000';
        for (const st of strokes) strokePath(kc, st.p);
        const kd = kc.getImageData(0, 0, w, h).data;
        let total = 0, hit = 0;
        for (let y = 0; y < h; y += 3) {
          for (let x = 0; x < w; x += 3) {
            const a = (y * w + x) * 4 + 3;
            if (gd[a] > 60) { total++; if (kd[a] > 10) hit++; }
          }
        }
        return total ? hit / total : 1;
      },
    };
  }

  // 갤러리 미리보기 — 저장된 작품(안내 글자 + 두 줄 획)을 작은 캔버스에 다시 그린다
  function renderArt(canvas, art) {
    const dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    const cw = r.width || canvas.clientWidth || 300;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(cw * ((H * 2) / W) * dpr); // 두 줄을 위아래로
    const ctx = canvas.getContext('2d');
    const s = (cw / W) * dpr;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    drawAll(ctx, art.t, art.tr || [], null);
    ctx.setTransform(s, 0, 0, s, 0, s * H);
    drawAll(ctx, null, art.fr || [], null);
  }

  return { InkLine, renderArt, W, H };
})();
