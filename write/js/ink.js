/* 펜 잉크 캔버스 — 깍두기노트(원고지 칸) 필기 엔진 + 자유 그림판
 * - 펜슬 전용: pointerType 'touch'는 무시(손바닥 리젝션), 'pen'과 'mouse'(데스크톱·테스트)만 필기
 * - 글자마다 네모 칸 + 점선 십자를 그리고, 공백도 빈 칸으로 둔다(띄어쓰기 연습)
 * - 좌표는 논리 공간으로 저장해 화면 크기·기기가 달라도 다시 그릴 수 있다
 * - 판정: 회색 안내 글자를 래스터로 깔고, 획을 굵게 그린 레이어와 겹쳐 덮인 비율 (느슨한 겹침 판정)
 * - 무지개 색: 획의 c 가 'rb'면 선분마다 색상환을 돌며 칠한다
 * - 지우개: 닿은 획(스티커)만 지운다 — 전체 지우기와 별개
 */
window.Ink = (() => {
  const W = 1000, H = 260;    // 줄노트 한 줄 논리 좌표계
  const FW = 1000, FH = 620;  // 자유 그림판 논리 좌표계
  const INK_W = 10;           // 잉크 굵기
  const JUDGE_R = 26;         // 너그러운 겹침 판정 반경
  const ERASE_R = 30;         // 지우개 반경
  const RB = 'rb';            // 무지개 색 표시자
  const FONT = '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';

  /* ─────────── 원고지 칸 배치 ─────────── */
  function layout(text) {
    const chars = Array.from(text || '');
    const n = Math.max(chars.length, 1);
    const s = Math.min(H - 30, (W - 28) / n, 205); // 칸 한 변
    return { chars, n, s, x0: (W - s * n) / 2, y0: (H - s) / 2 - 4 };
  }
  function drawCells(ctx, text) {
    const L = layout(text);
    for (let i = 0; i < L.n; i++) {
      const x = L.x0 + i * L.s, y = L.y0, s = L.s;
      ctx.save();
      // 점선 십자 (깍두기 안내선)
      ctx.strokeStyle = '#E2EEF6';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([7, 8]);
      ctx.beginPath();
      ctx.moveTo(x + s / 2, y + 8); ctx.lineTo(x + s / 2, y + s - 8);
      ctx.moveTo(x + 8, y + s / 2); ctx.lineTo(x + s - 8, y + s / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // 칸 테두리
      ctx.strokeStyle = '#B9D7EA';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x + 3, y + 3, s - 6, s - 6, 10);
      else ctx.rect(x + 3, y + 3, s - 6, s - 6);
      ctx.stroke();
      ctx.restore();
    }
  }
  function drawGuideChars(ctx, text, color) {
    const L = layout(text);
    ctx.save();
    ctx.font = '700 ' + (L.s * 0.66) + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    L.chars.forEach((ch, i) => {
      if (ch !== ' ') ctx.fillText(ch, L.x0 + i * L.s + L.s / 2, L.y0 + L.s * 0.53);
    });
    ctx.restore();
  }

  /* ─────────── 획 그리기 ─────────── */
  function segColor(base, i) { return 'hsl(' + ((base + i * 16) % 360) + ' 85% 55%)'; }
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
    if (st.c === RB) { // 무지개: 선분마다 색을 돌린다
      for (let i = 2; i < st.p.length; i += 2) {
        ctx.strokeStyle = segColor(st.b || 0, i / 2);
        ctx.beginPath();
        ctx.moveTo(st.p[i - 2], st.p[i - 1]);
        ctx.lineTo(st.p[i], st.p[i + 1]);
        ctx.stroke();
      }
      if (st.p.length === 2) { ctx.strokeStyle = segColor(st.b || 0, 0); strokePath(ctx, st.p); }
    } else {
      ctx.strokeStyle = st.c;
      strokePath(ctx, st.p);
    }
    ctx.globalAlpha = 1;
  }
  function drawSticker(ctx, it) {
    ctx.save();
    ctx.font = it.k + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(it.s, it.x, it.y);
    ctx.restore();
  }
  function drawItems(ctx, items, cur) {
    for (const it of items) { if (it.s) drawSticker(ctx, it); else drawStroke(ctx, it); }
    if (cur && cur.p && cur.p.length >= 2) drawStroke(ctx, cur);
  }

  // 획·스티커에서 (x,y) 근처에 있는 것의 인덱스 (지우개용)
  function hitIndex(items, x, y) {
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (it.s) {
        if (Math.hypot(it.x - x, it.y - y) < it.k * 0.6) return i;
      } else {
        const p = it.p;
        for (let j = 0; j < p.length; j += 2) {
          if (Math.hypot(p[j] - x, p[j + 1] - y) < ERASE_R) return i;
        }
      }
    }
    return -1;
  }

  /* ─────────── 공용 포인터 캔버스 골격 ───────────
   * opts: { w, h, color(), tool() -> 'pen'|'erase'|'sticker',
   *         pen() -> {w, a}, sticker(), onChange(), onTouchReject(), draw(ctx) }
   */
  function pointerCanvas(canvas, opts) {
    const ctx = canvas.getContext('2d');
    const LW = opts.w, LH = opts.h;
    let items = [];
    let cur = null, pid = null;
    let strokeSeq = 0;

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
      let hit = false;
      let i;
      while ((i = hitIndex(items, x, y)) >= 0) { items.splice(i, 1); hit = true; }
      if (hit) { redraw(); if (opts.onChange) opts.onChange(); }
    }
    function addPoint(e) {
      const [x, y] = toLogical(e);
      const p = cur.p, n = p.length;
      if (n >= 2 && Math.abs(x - p[n - 2]) < 3 && Math.abs(y - p[n - 1]) < 3) return;
      p.push(x, y);
      if (n >= 2) { // 마지막 선분만 바로 그려 부드럽게
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = cur.w || INK_W;
        ctx.globalAlpha = cur.a || 1;
        ctx.strokeStyle = cur.c === RB ? segColor(cur.b || 0, n / 2) : cur.c;
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
    // 펜이 캔버스 밖에서 떨어지는 등 up 이벤트를 놓쳐도 획을 잃지 않고 마무리한다
    function forceFinish() {
      if (!cur) { pid = null; return; }
      if (cur.p.length >= 2) items.push(cur);
      cur = null; pid = null;
      redraw();
      if (opts.onChange) opts.onChange();
    }

    canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') { if (opts.onTouchReject) opts.onTouchReject(); return; }
      e.preventDefault();
      if (cur) forceFinish(); // 이전 획이 덜 끝났으면 살려서 마무리 (안 하면 새 획이 무시됨)
      const tool = opts.tool ? opts.tool() : 'pen';
      const [x, y] = toLogical(e);
      if (tool === 'erase') { pid = e.pointerId; eraseAt(x, y); return; }
      if (tool === 'sticker') {
        items.push({ s: opts.sticker(), x, y, k: 88 });
        redraw();
        if (opts.onChange) opts.onChange();
        return;
      }
      pid = e.pointerId;
      try { canvas.setPointerCapture(pid); } catch (err) { /* 합성 이벤트는 캡처 불가 */ }
      const pen = opts.pen ? opts.pen() : { w: INK_W, a: 1 };
      cur = { c: opts.color(), p: [], w: pen.w, a: pen.a };
      if (cur.c === RB) cur.b = (strokeSeq++ * 47) % 360;
      addPoint(e);
    });
    canvas.addEventListener('pointermove', e => {
      if (e.pointerId !== pid) return;
      if (cur) {
        e.preventDefault();
        // 빠른 필기에서 브라우저가 합쳐 버린 중간 좌표까지 모두 살린다
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
      setItems(arr) { items = (arr || []).map(it => it.s ? { ...it } : { ...it, p: it.p.slice() }); redraw(); },
      clear() { items = []; cur = null; redraw(); if (opts.onChange) opts.onChange(); },
      undo() { items.pop(); redraw(); if (opts.onChange) opts.onChange(); },
      count() { return items.length; },
    };
  }

  /* ─────────── 원고지 한 줄 ─────────── */
  function InkLine(canvas, opts) { // opts: { color(), tool(), onChange(), onTouchReject() }
    let text = '';
    let showChars = false;
    const base = pointerCanvas(canvas, {
      w: W, h: H,
      color: opts.color, tool: opts.tool,
      onChange: opts.onChange, onTouchReject: opts.onTouchReject,
      draw(ctx) {
        if (text) {
          drawCells(ctx, text);
          if (showChars) drawGuideChars(ctx, text, '#C7C7D6');
        }
      },
    });

    return {
      resize: base.resize,
      // 페이지 준비 — 칸을 깔고 획을 비운다. chars: 'show' 따라쓰기 / 'hide' 받아쓰기(정답 숨김)
      setText(t, chars) {
        text = t || '';
        showChars = chars !== 'hide' && !!text;
        base.setItems([]);
      },
      reveal() { showChars = !!text; base.redraw(); }, // 획은 그대로 두고 정답만 보이기
      revealed() { return showChars; },
      setStrokes(arr) { base.setItems(arr); },
      strokes() { return base.items(); },
      strokeCount() { return base.count(); },
      clear: base.clear,
      undo: base.undo,
      inkLength() {
        let len = 0;
        for (const st of base.items()) {
          if (st.s) continue;
          for (let i = 2; i < st.p.length; i += 2) {
            len += Math.hypot(st.p[i] - st.p[i - 2], st.p[i + 1] - st.p[i - 1]);
          }
        }
        return len;
      },
      // 안내 글자를 잉크가 얼마나 덮었는지 0~1 (안내 글자가 없으면 1)
      coverage() {
        if (!text || !showChars) return 1;
        const s = 0.5, w = W * s, h = H * s;
        const g = document.createElement('canvas'); g.width = w; g.height = h;
        const gc = g.getContext('2d', { willReadFrequently: true });
        gc.scale(s, s);
        drawGuideChars(gc, text, '#000');
        const gd = gc.getImageData(0, 0, w, h).data;
        const k = document.createElement('canvas'); k.width = w; k.height = h;
        const kc = k.getContext('2d', { willReadFrequently: true });
        kc.scale(s, s);
        kc.lineCap = 'round'; kc.lineJoin = 'round';
        kc.lineWidth = JUDGE_R * 2; kc.strokeStyle = '#000';
        for (const st of base.items()) if (!st.s) strokePath(kc, st.p);
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

  /* ─────────── 자유 그림판 ─────────── */
  function FreePad(canvas, opts) { // opts: { color(), tool(), pen(), sticker(), onChange(), onTouchReject() }
    const base = pointerCanvas(canvas, {
      w: FW, h: FH,
      color: opts.color, tool: opts.tool, pen: opts.pen, sticker: opts.sticker,
      onChange: opts.onChange, onTouchReject: opts.onTouchReject,
      draw() { /* 흰 도화지 — 배경은 CSS */ },
    });
    return base;
  }

  /* ─────────── 갤러리 미리보기 ─────────── */
  function renderArt(canvas, art) {
    const dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    const cw = r.width || canvas.clientWidth || 300;
    const ctx = canvas.getContext('2d');
    if (art.k === 'free') { // 자유 그림
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(cw * (FH / FW) * dpr);
      const s = (cw / FW) * dpr;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      drawItems(ctx, art.items || [], null);
      return;
    }
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(cw * ((H * 2) / W) * dpr); // 두 줄을 위아래로
    const s = (cw / W) * dpr;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    drawCells(ctx, art.t);
    drawGuideChars(ctx, art.t, '#DFDFE8');
    drawItems(ctx, art.tr || [], null);
    ctx.setTransform(s, 0, 0, s, 0, s * H);
    if (art.t2) { drawCells(ctx, art.t2); drawGuideChars(ctx, art.t2, '#DFDFE8'); }
    else if (art.c2) drawCells(ctx, art.c2); // 혼자 쓴 줄은 빈 칸만
    drawItems(ctx, art.fr || [], null);
  }

  return {
    InkLine, FreePad, renderArt, W, H, FW, FH, RB,
  };
})();
