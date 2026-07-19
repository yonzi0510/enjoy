/* 요리조리 풍선 줄 — 캔버스 운필력 엔진 (생각 놀이터 네 번째 놀이).
 * 본보기 카드(풍선+검은 줄)를 보고 내 카드의 풍선 꼭지부터 줄을 그려 따라간다.
 * - 손가락·펜슬·마우스 모두 입력(5세는 태블릿에 손가락으로 그린다)
 * - 좌표는 논리 공간(520×640)에 저장 — 화면 크기·기기가 달라도 다시 그릴 수 있다
 * - 판정(judge): 목표 곡선을 잉크가 "따라 그렸는지"를 재현율·정밀도 두 축으로 본다.
 *     coverage(재현율) = 목표 곡선을 잉크가 덮은 비율 (곡선을 빠짐없이 지나갔나)
 *     precision(정밀도) = 실제 펜 굵기로 친 잉크 중 목표 곡선밴드 안에 든 비율 (딴 데 칠하지 않았나)
 *   coverage만 보면 화면을 마구 칠해도 곡선이 덮여 통과되므로, precision을 함께 걸어
 *   ①마구 칠하기 ②곡선 무시 직선 ③점 몇 개 는 떨어지게 한다. */
window.Ink = (() => {
  const BW = 520, BH = 640;   // 풍선 카드 논리 좌표계
  const BKX = 260, BKY = 244; // 풍선 꼭지(줄 시작점)
  const INK_W = 13;           // 화면에 보이는 펜 굵기
  const INK_REAL = 26;        // 정밀도 판정용 실제 잉크 굵기(judge용, 화면과 별개)
  const ERASE_R = 30;         // 지우개 반경
  const FONT = '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';

  /* 풍선 6색 순환 — 본보기·내 카드가 같은 색을 쓴다 */
  const BALLOON_COLS = [
    { main: '#F2607A', dark: '#D6486B', lite: '#FBAABB' }, // 빨강
    { main: '#F2A03D', dark: '#D97F1E', lite: '#FBD9A6' }, // 주황
    { main: '#F0C93C', dark: '#CFA312', lite: '#FBE896' }, // 노랑
    { main: '#4DC98F', dark: '#2E9E6B', lite: '#A5E8C9' }, // 초록
    { main: '#5CA8F2', dark: '#3A7FD0', lite: '#ABD2FB' }, // 파랑
    { main: '#B07CE8', dark: '#8A55C4', lite: '#D8BCF6' }, // 보라
  ];

  /* ─────────── 획 그리기 ─────────── */
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
    ctx.strokeStyle = st.c;
    strokePath(ctx, st.p);
    ctx.globalAlpha = 1;
  }
  function drawItems(ctx, items, cur) {
    for (const it of items) drawStroke(ctx, it);
    if (cur && cur.p && cur.p.length >= 2) drawStroke(ctx, cur);
  }
  // 획에서 (x,y) 근처에 있는 것의 인덱스 (지우개용)
  function hitIndex(items, x, y) {
    for (let i = items.length - 1; i >= 0; i--) {
      const p = items[i].p;
      for (let j = 0; j < p.length; j += 2) {
        if (Math.hypot(p[j] - x, p[j + 1] - y) < ERASE_R) return i;
      }
    }
    return -1;
  }
  function itemsLength(items) {
    let len = 0;
    for (const st of items) {
      for (let i = 2; i < st.p.length; i += 2) {
        len += Math.hypot(st.p[i] - st.p[i - 2], st.p[i + 1] - st.p[i - 1]);
      }
    }
    return len;
  }

  /* ─────────── 풍선·곡선 그리기 ─────────── */
  function drawBalloon(ctx, colorIdx) {
    const col = BALLOON_COLS[(colorIdx || 0) % BALLOON_COLS.length];
    ctx.save();
    const g = ctx.createRadialGradient(BKX - 32, 96, 14, BKX, 130, 122);
    g.addColorStop(0, col.lite);
    g.addColorStop(0.55, col.main);
    g.addColorStop(1, col.dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(BKX, 130, 88, 100, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath();
    ctx.ellipse(BKX - 34, 92, 20, 30, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = col.dark;
    ctx.beginPath();
    ctx.moveTo(BKX, 226);
    ctx.lineTo(BKX - 13, BKY);
    ctx.lineTo(BKX + 13, BKY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  function drawBalloonCurve(ctx, p, color, width, dash) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (dash) ctx.setLineDash(dash);
    strokePath(ctx, p);
    ctx.restore();
  }

  /* ─────────── 공용 포인터 캔버스 골격 ─────────── */
  function pointerCanvas(canvas, opts) {
    const ctx = canvas.getContext('2d');
    const LW = opts.w, LH = opts.h;
    let items = [];
    let cur = null, pid = null;

    function resize() {
      const r = canvas.getBoundingClientRect();
      if (!r.width) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.width * (LH / LW) * dpr);
      ctx.setTransform((r.width / LW) * dpr, 0, 0, (r.width / LW) * dpr, 0, 0);
      redraw();
    }
    function redraw() {
      ctx.clearRect(0, 0, LW, LH);
      opts.draw(ctx);
      drawItems(ctx, items, cur);
    }
    function toLogical(e) {
      const r = canvas.getBoundingClientRect();
      return [
        Math.max(0, Math.min(LW, Math.round((e.clientX - r.left) / (r.width / LW)))),
        Math.max(0, Math.min(LH, Math.round((e.clientY - r.top) / (r.height / LH)))),
      ];
    }
    function eraseAt(x, y) {
      let hit = false, i;
      while ((i = hitIndex(items, x, y)) >= 0) { items.splice(i, 1); hit = true; }
      if (hit) { redraw(); if (opts.onChange) opts.onChange(); }
    }
    function addPoint(e) {
      const [x, y] = toLogical(e);
      const p = cur.p, n = p.length;
      if (n >= 2 && Math.abs(x - p[n - 2]) < 3 && Math.abs(y - p[n - 1]) < 3) return;
      p.push(x, y);
      if (n >= 2) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = cur.w || INK_W;
        ctx.globalAlpha = cur.a || 1;
        ctx.strokeStyle = cur.c;
        ctx.beginPath();
        ctx.moveTo(p[n - 2], p[n - 1]);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    function finish(e) {
      if (!cur || e.pointerId !== pid) return;
      forceFinish();
    }
    function forceFinish() {
      if (!cur) { pid = null; return; }
      if (cur.p.length >= 2) items.push(cur);
      cur = null; pid = null;
      redraw();
      if (opts.onChange) opts.onChange();
    }

    canvas.addEventListener('pointerdown', e => {
      // 손가락·펜슬·마우스 모두 그릴 수 있다 (5세는 태블릿에 손가락으로 그린다)
      e.preventDefault();
      if (cur) forceFinish();
      const tool = opts.tool ? opts.tool() : 'pen';
      const [x, y] = toLogical(e);
      if (tool === 'erase') { pid = e.pointerId; eraseAt(x, y); return; }
      pid = e.pointerId;
      try { canvas.setPointerCapture(pid); } catch (err) { /* 합성 이벤트는 캡처 불가 */ }
      const pen = opts.pen ? opts.pen() : { w: INK_W, a: 1 };
      cur = { c: opts.color(), p: [], w: pen.w, a: pen.a };
      addPoint(e);
    });
    canvas.addEventListener('pointermove', e => {
      if (e.pointerId !== pid) return;
      if (cur) {
        e.preventDefault();
        const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
        if (evs && evs.length) evs.forEach(addPoint);
        else addPoint(e);
      } else if (opts.tool && opts.tool() === 'erase') {
        e.preventDefault();
        const [x, y] = toLogical(e);
        eraseAt(x, y);
      }
    });
    canvas.addEventListener('pointerup', e => { if (cur) finish(e); else if (e.pointerId === pid) pid = null; });
    canvas.addEventListener('pointercancel', e => { if (cur) finish(e); else if (e.pointerId === pid) pid = null; });
    canvas.addEventListener('lostpointercapture', () => { if (cur) forceFinish(); });
    window.addEventListener('resize', resize);
    resize();

    return {
      resize, redraw,
      items() { return items; },
      setItems(arr) { items = (arr || []).map(it => ({ ...it, p: it.p.slice() })); redraw(); },
      clear() { items = []; cur = null; redraw(); if (opts.onChange) opts.onChange(); },
      undo() { items.pop(); redraw(); if (opts.onChange) opts.onChange(); },
      count() { return items.length; },
    };
  }

  /* ─────────── 풍선 줄 카드(입력 판) ─────────── */
  function BalloonPad(canvas, opts) { // opts: { color(), tool(), onChange(), onTouchReject() }
    let curve = null;
    let showGuide = true;
    let colorIdx = 0;
    const base = pointerCanvas(canvas, {
      w: BW, h: BH,
      color: opts.color, tool: opts.tool,
      pen: () => ({ w: INK_W, a: 1 }),
      onChange: opts.onChange, onTouchReject: opts.onTouchReject,
      draw(ctx) {
        drawBalloon(ctx, colorIdx);
        if (curve && showGuide) drawBalloonCurve(ctx, curve, '#C9D5E4', 13, [1, 24]);
      },
    });

    // 오프스크린 마스크 하나를 그린다 — drawFn(ctx)로 검게 칠하고 알파 데이터를 돌려준다
    function mask(w, h, s, drawFn) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const cc = c.getContext('2d', { willReadFrequently: true });
      cc.scale(s, s);
      cc.lineCap = 'round'; cc.lineJoin = 'round'; cc.strokeStyle = '#000'; cc.fillStyle = '#000';
      drawFn(cc);
      return cc.getImageData(0, 0, w, h).data;
    }

    return {
      resize: base.resize,
      // guide: 'show' 따라 그리기(안내선 표시) / 'hide' 보고 그리기(안내선 숨김, 판정 곡선은 동일)
      setCurve(p, guide, col) {
        curve = p || null;
        showGuide = guide !== 'hide';
        colorIdx = col || 0;
        base.setItems([]);
      },
      guideShown() { return showGuide; },
      setStrokes(arr) { base.setItems(arr); },
      strokes() { return base.items(); },
      strokeCount() { return base.count(); },
      clear: base.clear,
      undo: base.undo,
      inkLength() { return itemsLength(base.items()); },
      /* 판정 — band = 목표 곡선밴드 굵기(손떨림 허용 폭). 재현율·정밀도를 함께 돌려준다.
       *  coverage  = (목표 곡선 ∩ 잉크밴드) / 목표 곡선   — 곡선을 빠짐없이 지났나
       *  precision = (실제 잉크 ∩ 목표 곡선밴드) / 실제 잉크 — 잉크가 곡선 근처에 몰려 있나 */
      judge(band) {
        if (!curve) return { coverage: 1, precision: 1 };
        const B = band || 54;
        const s = 0.5, w = Math.round(BW * s), h = Math.round(BH * s);
        const items = base.items();
        // 목표: 가는 중심선(재현율 분모) + 곡선밴드(정밀도 판정 영역)
        const tThin = mask(w, h, s, cc => { cc.lineWidth = 14; strokePath(cc, curve); });
        const tBand = mask(w, h, s, cc => { cc.lineWidth = B; strokePath(cc, curve); });
        // 잉크: 실제 굵기(정밀도 분모) + 밴드 굵기(재현율 판정 — 손떨림 허용)
        const iReal = mask(w, h, s, cc => { cc.lineWidth = INK_REAL; for (const st of items) strokePath(cc, st.p); });
        const iBand = mask(w, h, s, cc => { cc.lineWidth = B; for (const st of items) strokePath(cc, st.p); });
        let totT = 0, hitT = 0, totI = 0, hitI = 0;
        for (let y = 0; y < h; y += 3) {
          for (let x = 0; x < w; x += 3) {
            const a = (y * w + x) * 4 + 3;
            if (tThin[a] > 60) { totT++; if (iBand[a] > 10) hitT++; }
            if (iReal[a] > 60) { totI++; if (tBand[a] > 10) hitI++; }
          }
        }
        return {
          coverage: totT ? hitT / totT : 1,
          precision: totI ? hitI / totI : 0,
        };
      },
    };
  }

  // 본보기 카드 — 풍선 + 검은 줄만 그린다 (입력 없음)
  function renderBalloonSample(canvas, p, colorIdx) {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.width * (BH / BW) * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform((r.width / BW) * dpr, 0, 0, (r.width / BW) * dpr, 0, 0);
    ctx.clearRect(0, 0, BW, BH);
    drawBalloon(ctx, colorIdx);
    drawBalloonCurve(ctx, p, '#3B3B4A', 10);
  }

  return {
    BalloonPad, renderBalloonSample,
    BW, BH, BALLOON_N: BALLOON_COLS.length,
  };
})();
