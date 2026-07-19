/* 색칠 엔진 — 물통 채우기(flood fill) + 크레용(자유 브러시)
 * 두 레이어를 분리해 밑그림 선이 채색에 덮이지 않게 한다:
 *   pcanvas(색 레이어) : 흰 바탕 + 물통 채우기 + 크레용. 아이가 칠하는 곳.
 *   lcanvas(선 레이어) : 검은 밑그림 선. 항상 색 위에 겹쳐 그려 늘 보이게 한다.
 * flood fill 은 색 레이어 래스터에서 BFS 로 번지되, 선 레이어 알파를 "벽(barrier)"으로
 *   삼아 어두운 윤곽에서 멈춘다. 안티에일리어싱 새는 것은 벽 알파 문턱을 낮춰 선을 조금
 *   두껍게 인식시켜 막는다.
 * 좌표는 그림 공간(0~VB)으로 받아 내부 래스터(RES)로 환산한다 — 화면 크기와 무관.
 */
window.Paint = (() => {
  const RES = 500;                 // 내부 래스터 한 변(px)
  const VB = 100;                  // 그림 좌표계 한 변
  const SCALE = RES / VB;          // 5
  const LINE_W = 1.1;              // 선 굵기(그림 공간) → 래스터 5.5px 벽
  const BARRIER_A = 50;            // 이 알파를 넘으면 벽으로 본다
  const TOL = 100;                 // flood fill 색 비교 임계(3채널 절대차 합)
  const MAX_UNDO = 16;

  function makeCanvas() {
    const c = document.createElement('canvas');
    c.width = RES; c.height = RES;
    return c;
  }
  function hexToRgb(hex) {
    if (hex === 'rb') { // 무지개 채우기 — 밝은 임의 색
      const h = Math.floor(Math.random() * 360);
      return hslToRgb(h, 80, 60);
    }
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return [0, 0, 0];
    const v = parseInt(m[1], 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  }

  function Painter(canvas, opts) {
    opts = opts || {};
    const vctx = canvas.getContext('2d');
    const pcanvas = makeCanvas(), pctx = pcanvas.getContext('2d', { willReadFrequently: true });
    const lcanvas = makeCanvas(), lctx = lcanvas.getContext('2d', { willReadFrequently: true });
    let mask = new Uint8Array(RES * RES);
    let undoStack = [];
    let cur = null, pid = null, rbBase = 0;

    canvas.width = RES; canvas.height = RES;

    function blit() {
      vctx.clearRect(0, 0, RES, RES);
      vctx.drawImage(pcanvas, 0, 0);
      vctx.drawImage(lcanvas, 0, 0);
    }

    // 밑그림 선 레이어 + 벽 마스크를 만든다
    function drawLines(pic) {
      lctx.clearRect(0, 0, RES, RES);
      lctx.save();
      lctx.scale(SCALE, SCALE);
      lctx.lineJoin = 'round';
      lctx.lineCap = 'round';
      lctx.strokeStyle = '#2c2c34';
      lctx.fillStyle = '#2c2c34';
      lctx.lineWidth = LINE_W;
      for (const it of pic.items) {
        const d = typeof it === 'string' ? it : it.d;
        const p = new Path2D(d);
        if (typeof it === 'object' && it.f) lctx.fill(p);
        lctx.stroke(p);
      }
      lctx.restore();
      const ld = lctx.getImageData(0, 0, RES, RES).data;
      mask = new Uint8Array(RES * RES);
      for (let i = 0; i < mask.length; i++) mask[i] = ld[i * 4 + 3] > BARRIER_A ? 1 : 0;
    }

    function clearColor() {
      pctx.setTransform(1, 0, 0, 1, 0, 0);
      pctx.fillStyle = '#ffffff';
      pctx.fillRect(0, 0, RES, RES);
    }

    function load(pic) {
      clearColor();
      drawLines(pic);
      undoStack = [];
      cur = null; pid = null;
      blit();
    }

    function pushUndo() {
      undoStack.push(pctx.getImageData(0, 0, RES, RES));
      if (undoStack.length > MAX_UNDO) undoStack.shift();
    }

    function toRaster(e) {
      const r = canvas.getBoundingClientRect();
      return [
        Math.round((e.clientX - r.left) / r.width * RES),
        Math.round((e.clientY - r.top) / r.height * RES),
      ];
    }

    // ── 물통 채우기 ──
    function fillRaster(sx, sy, rgb) {
      if (sx < 0 || sy < 0 || sx >= RES || sy >= RES) return false;
      const start = sy * RES + sx;
      if (mask[start]) return false;                 // 선 위를 눌렀으면 무시
      const img = pctx.getImageData(0, 0, RES, RES);
      const d = img.data;
      const o0 = start * 4;
      const sr = d[o0], sg = d[o0 + 1], sb = d[o0 + 2];
      if (Math.abs(sr - rgb[0]) + Math.abs(sg - rgb[1]) + Math.abs(sb - rgb[2]) < 8) return false; // 이미 그 색
      const seen = new Uint8Array(RES * RES);
      const stack = [start];
      seen[start] = 1;
      let filled = 0;
      while (stack.length) {
        const p = stack.pop();
        const o = p * 4;
        const diff = Math.abs(d[o] - sr) + Math.abs(d[o + 1] - sg) + Math.abs(d[o + 2] - sb);
        if (diff > TOL) continue;
        d[o] = rgb[0]; d[o + 1] = rgb[1]; d[o + 2] = rgb[2]; d[o + 3] = 255;
        filled++;
        const x = p % RES, y = (p - x) / RES;
        const push = q => { if (!seen[q] && !mask[q]) { seen[q] = 1; stack.push(q); } };
        if (x > 0) push(p - 1);
        if (x < RES - 1) push(p + 1);
        if (y > 0) push(p - RES);
        if (y < RES - 1) push(p + RES);
      }
      if (!filled) return false;
      pctx.putImageData(img, 0, 0);
      blit();
      return true;
    }

    function fillAt(e) {
      const [rx, ry] = toRaster(e);
      pushUndo();
      const ok = fillRaster(rx, ry, hexToRgb(opts.color()));
      if (!ok) undoStack.pop();
      if (ok && opts.onChange) opts.onChange();
      return ok;
    }

    // ── 크레용 / 지우개 ──
    function penColor() {
      const tool = opts.tool();
      if (tool === 'erase') return '#ffffff';
      return opts.color();
    }
    function beginStroke(e) {
      const [rx, ry] = toRaster(e);
      pushUndo();
      const c = penColor();
      cur = { c, rb: c === 'rb', w: opts.size ? opts.size() : 26, last: [rx, ry], i: 0 };
      if (cur.rb) rbBase = Math.floor(Math.random() * 360);
      dot(rx, ry);
    }
    function strokeStyleFor() {
      if (cur.rb) return 'hsl(' + ((rbBase + cur.i * 8) % 360) + ' 82% 58%)';
      return cur.c;
    }
    function dot(x, y) {
      pctx.setTransform(1, 0, 0, 1, 0, 0);
      pctx.fillStyle = strokeStyleFor();
      pctx.beginPath();
      pctx.arc(x, y, cur.w / 2, 0, Math.PI * 2);
      pctx.fill();
    }
    function lineTo(x, y) {
      pctx.setTransform(1, 0, 0, 1, 0, 0);
      pctx.strokeStyle = strokeStyleFor();
      pctx.lineWidth = cur.w;
      pctx.lineCap = 'round';
      pctx.lineJoin = 'round';
      pctx.beginPath();
      pctx.moveTo(cur.last[0], cur.last[1]);
      pctx.lineTo(x, y);
      pctx.stroke();
    }
    function extendStroke(e) {
      const [rx, ry] = toRaster(e);
      if (Math.abs(rx - cur.last[0]) < 1 && Math.abs(ry - cur.last[1]) < 1) return;
      cur.i++;
      lineTo(rx, ry);
      cur.last = [rx, ry];
      blit();
    }
    function endStroke() {
      if (!cur) return;
      const moved = cur.i > 0;
      cur = null; pid = null;
      blit();
      if (moved && opts.onChange) opts.onChange();
    }

    // ── 포인터 ──
    canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      const tool = opts.tool();
      if (tool === 'fill') { fillAt(e); return; }
      pid = e.pointerId;
      try { canvas.setPointerCapture(pid); } catch (err) { /* 합성 이벤트 */ }
      beginStroke(e);
    });
    canvas.addEventListener('pointermove', e => {
      if (pid === null || e.pointerId !== pid || !cur) return;
      e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
      if (evs && evs.length) evs.forEach(extendStroke);
      else extendStroke(e);
    });
    const up = e => { if (cur && e.pointerId === pid) endStroke(); else if (e.pointerId === pid) pid = null; };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('lostpointercapture', () => { if (cur) endStroke(); });

    return {
      load,
      redraw: blit,
      undo() {
        if (!undoStack.length) return false;
        pctx.putImageData(undoStack.pop(), 0, 0);
        blit();
        if (opts.onChange) opts.onChange();
        return true;
      },
      clearAll() {
        pushUndo();
        clearColor();
        blit();
        if (opts.onChange) opts.onChange();
      },
      canUndo() { return undoStack.length > 0; },
      // 완성작을 PNG dataURL 로 (색 + 선 합성, 흰 바탕)
      toDataURL() {
        const t = makeCanvas();
        const tc = t.getContext('2d');
        tc.fillStyle = '#ffffff';
        tc.fillRect(0, 0, RES, RES);
        tc.drawImage(pcanvas, 0, 0);
        tc.drawImage(lcanvas, 0, 0);
        return t.toDataURL('image/png');
      },
      // 그림 공간 좌표의 색 레이어 픽셀 (테스트용) [r,g,b,a]
      pixelAt(vbx, vby) {
        const x = Math.round(vbx * SCALE), y = Math.round(vby * SCALE);
        const d = pctx.getImageData(x, y, 1, 1).data;
        return [d[0], d[1], d[2], d[3]];
      },
      // 흰색이 아닌(=칠해진) 픽셀 수 (테스트용)
      paintedCount() {
        const d = pctx.getImageData(0, 0, RES, RES).data;
        let c = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] < 248 || d[i + 1] < 248 || d[i + 2] < 248) c++;
        }
        return c;
      },
      // 테스트용 직접 채우기 (그림 공간 좌표)
      fillAtVB(vbx, vby) {
        pushUndo();
        const ok = fillRaster(Math.round(vbx * SCALE), Math.round(vby * SCALE), hexToRgb(opts.color()));
        if (!ok) undoStack.pop();
        else if (opts.onChange) opts.onChange();
        return ok;
      },
      RES, VB,
    };
  }

  return { Painter, RES, VB };
})();
