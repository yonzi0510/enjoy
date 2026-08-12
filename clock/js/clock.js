/* ═══════════ 시계 엔진 ═══════════
 * 시계판을 그리고, 긴바늘을 손끝으로 돌리게 하고, 손을 뗄 때 눈금에 붙인다.
 * 방① 뻐꾸기 시계가 지금 쓰고 있고, **방② 깨우기·방③ 하루 만들기가 그대로 쓴다.**
 * 앱 로직(판·보상·진행도)은 여기 넣지 마라 — 여긴 「시계라는 물건」만 안다.
 *
 * ── 공개 API ────────────────────────────────────────────────────────
 *  값 계산 (전부 순수 함수, node 에서도 부를 수 있다)
 *    norm720(t)              총 분을 0~719 로 접는다 (실수도 된다)
 *    hourOf(t) / minuteOf(t) / hour12(t)
 *    minuteAngle(t)          분침각 = (t % 60) * 6
 *    hourAngle(t)            시침각 = t * 0.5          ← 시침 맞물림(톱니)이 여기서 나온다
 *    minutesToAngle(m)       m * 6
 *    angleToMinutes(a, unit) 각도 → 분(0~59). **반올림은 이 한 곳에서 한 번만.**
 *    snapTotal(t, unit)      손 뗄 때 붙는 총 분 (같은 반올림 규칙)
 *    fold(deg)               각도를 [-180,180) 로 접는다 ← 12시 경계
 *    pointAngle(cx,cy,x,y)   손끝의 절대각 0~360. **상태에 그대로 쓰지 마라**(11시간 점프)
 *    polar(cx,cy,r,deg)      중심 + 길이 × (sinθ, −cosθ)
 *    tapTotal(cur, n, unit)  숫자 n 을 톡 눌렀을 때 갈 총 분
 *
 *  화면
 *    faceSVG(opt)            시계판 SVG 문자열 (opt: total, interactive, numbers, hint, ghost)
 *    attach(host, opt)       host 안에 시계판을 만들고 포인터를 배선한다 → 조종기
 *
 *  조종기(attach 가 돌려주는 것)
 *    total()                 지금 총 분(정수, 손을 뗀 뒤 값)
 *    live()                  끄는 중이면 실수 총 분, 아니면 null
 *    setTotal(t)             바늘을 옮긴다 (onChange 를 부르지 않는다)
 *    setHint(h12|null)       그 숫자를 반짝이게 (틀렸을 때 힌트를 키운다)
 *    setGhost(t|null)        흐린 안내 바늘
 *    setInteractive(bool)    잡히게/안 잡히게
 *    render()                다시 그린다
 *    destroy()               이벤트를 뗀다
 *
 *  opt 로 주는 갈고리: onChange(total, {snapped, moved}) · onDrag(liveTotal) ·
 *                     onTick() · onNumber(h12)
 *
 * ── 반드시 지킬 것 ──────────────────────────────────────────────────
 * ① 상태는 「총 분」 하나다. 분침·시침을 따로 두지 마라.
 * ② 회전을 DOM 에 주지 마라(transform). 좌표를 계산해 <line> 에 직접 쓴다.
 *    회전을 걸면 손끝 좌표를 역행렬로 되돌려야 하고, 그게 이 저장소가 겪은
 *    「채점 좌표가 어긋난다」 사고의 정체다. 그래서 각 앱 e2e 가 시계판 전체에
 *    computed transform === 'none' 을 엄격하게 건다.
 * ③ 끄는 **동안에는 반올림하지 않는다.** 손끝을 그대로 따라간다.
 *    툭툭 끊기면 다섯 살은 「고장났다」고 느낀다. 붙이는 것은 손을 뗄 때 딱 한 번.
 * ④ 안 붙는 자리를 두지 마라. 놓으면 반드시 어딘가에 선다(지오보드의 CATCH 를 베끼지 말 것).
 * ⑤ 각도는 **직전 프레임과의 차이를 접어 누적**한다. atan2 절대값을 상태로 쓰면
 *    11:59 → 12:00 에서 11시간이 점프한다.
 * ⑥ 잡히는 것은 **긴바늘뿐**이다. 시침은 따라 돌 뿐 직접 못 만진다(1시간 = 30°,
 *    5세 정밀도를 넘는다). 한복판(r<15)도 안 잡힌다 — 각도가 불안정하다.
 */
window.ClockEngine = (() => {
  const SVGNS = 'http://www.w3.org/2000/svg';

  /* ─────────── 시계판 규격 (viewBox 0 0 100 100) ─────────── */
  const CX = 50, CY = 50;
  const R_RIM = 45;        // 테두리
  const R_TICK_OUT = 42;   // 눈금 바깥
  const R_TICK_IN_M = 39;  // 분 눈금 안쪽
  const R_TICK_IN_H = 36;  // 5분 눈금 안쪽
  const R_NUM = 30;        // 숫자가 앉는 자리
  const R_NUMHIT = 8;      // 숫자 탭 반경 — 폰 세로 312px 판에서 지름 50px
  const R_MIN_TIP = 35;    // 긴바늘 끝
  const R_MIN_TAIL = -6;   // 긴바늘 꼬리(중심 뒤)
  const R_HOUR_TIP = 21;   // 짧은바늘 끝
  const R_HOUR_TAIL = -5;
  const R_GRAB_IN = 15;    // 잡히기 시작하는 반경 — 한복판은 안 잡힌다
  const R_GRAB_OUT = 39;
  const W_GRAB = 19;       // 잡는 굵기 — 312px 판에서 59px (터치 하한 46px 위)

  /* ─────────── 값 계산 ─────────── */
  const norm720 = t => ((t % 720) + 720) % 720;
  const norm360 = a => ((a % 360) + 360) % 360;
  const hourOf = t => Math.floor(norm720(t) / 60);
  const minuteOf = t => ((t % 60) + 60) % 60;
  const hour12 = t => { const h = hourOf(t); return h === 0 ? 12 : h; };

  const minuteAngle = t => norm360((t % 60) * 6);
  const hourAngle = t => norm360(norm720(t) * 0.5);
  const minutesToAngle = m => norm360(m * 6);

  /* 반올림은 여기 하나뿐이다. 각도 → 분에서 한 번, 손 뗄 때 한 번 —
   * **두 번 겹쳐 돌리지 마라.** 2단 반올림은 경계에서 1분씩 어긋난다. */
  const roundToUnit = (v, unit) => Math.round(v / unit) * unit;

  function angleToMinutes(angle, unit) {
    const u = unit || 1;
    return ((roundToUnit(norm360(angle) / 6, u) % 60) + 60) % 60;
  }
  function snapTotal(total, unit) {
    return norm720(roundToUnit(total, unit || 1));
  }

  // 각도 차이를 [-180,180) 로 접는다 — 12시 경계에서 되감기지 않게
  function fold(deg) {
    let d = ((deg % 360) + 540) % 360 - 180;
    return d;
  }

  // 12시가 0°, 시계 방향이 +. 상태로 그대로 쓰지 말고 fold 로 누적할 것.
  function pointAngle(cx, cy, x, y) {
    return norm360(Math.atan2(x - cx, cy - y) * 180 / Math.PI);
  }
  function polar(cx, cy, r, deg) {
    const t = deg * Math.PI / 180;
    return [cx + r * Math.sin(t), cy - r * Math.cos(t)];
  }

  /* 숫자 n(1~12)을 톡 눌렀을 때 갈 자리.
   * 눈금이 한 시간인 정각 단계에서는 「그 숫자의 시」로 간다 — 긴바늘이 12 로 가고
   * 시침이 그 숫자를 가리킨다. 다른 단계에서는 말 그대로 **긴바늘이 그 숫자로** 간다
   * (가까운 쪽으로 돈다). 어느 쪽이든 결과는 반드시 눈금 위에 선다. */
  function tapTotal(cur, n, unit) {
    const u = unit || 1;
    if (u >= 60) return norm720((n % 12) * 60);
    const want = (n % 12) * 5;                       // 긴바늘이 가리킬 분
    const now = norm720(cur);
    const base = Math.floor(now / 60) * 60;
    // 12시를 넘나드는 것까지 보려면 720 을 한 바퀴로 접어 견준다
    const fold720 = x => ((x % 720) + 1080) % 720 - 360;
    let best = null, bd = Infinity;
    // 차례가 곧 동점일 때의 우선순위다 — 꼭 같은 거리면 **지금 시 안**을 고른다
    [0, 60, -60].forEach(off => {
      const cand = base + off + want;
      const d = Math.abs(fold720(cand - now));
      if (d < bd) { bd = d; best = cand; }
    });
    return snapTotal(best, u);
  }

  /* ─────────── 시계판 그리기 ───────────
   * ⚠️ transform 을 한 군데도 쓰지 않는다. 전부 좌표다. */
  const f = n => (Math.round(n * 1000) / 1000);
  function line(cls, r0, r1, deg, extra) {
    const a = polar(CX, CY, r0, deg), b = polar(CX, CY, r1, deg);
    return '<line class="' + cls + '" x1="' + f(a[0]) + '" y1="' + f(a[1]) +
      '" x2="' + f(b[0]) + '" y2="' + f(b[1]) + '"' + (extra || '') + '/>';
  }

  function faceSVG(opt) {
    const o = opt || {};
    const total = norm720(o.total || 0);
    const ma = minuteAngle(total), ha = hourAngle(total);
    let s = '<svg class="ck-face" viewBox="0 0 100 100" xmlns="' + SVGNS + '">';

    // 판
    s += '<circle class="ck-rim" cx="50" cy="50" r="' + R_RIM + '"/>';

    // 눈금 — 1분마다, 5분마다는 길고 굵게
    for (let i = 0; i < 60; i++) {
      const big = i % 5 === 0;
      s += line('ck-tick' + (big ? ' big' : ''), big ? R_TICK_IN_H : R_TICK_IN_M, R_TICK_OUT, i * 6);
    }

    // 숫자 1~12
    if (o.numbers !== false) {
      for (let n = 1; n <= 12; n++) {
        const p = polar(CX, CY, R_NUM, n * 30);
        const hi = o.hint === n ? ' hint' : '';
        s += '<text class="ck-num' + hi + '" data-h="' + n + '" x="' + f(p[0]) + '" y="' + f(p[1]) +
          '" text-anchor="middle" dominant-baseline="central">' + n + '</text>';
      }
    }
    // 숫자를 톡 누르는 자리 (긴바늘 잡는 자리보다 **아래**에 깐다 —
    // 손잡이가 숫자 위에 겹칠 때 손잡이가 이겨야 한다)
    if (o.interactive) {
      for (let n = 1; n <= 12; n++) {
        const p = polar(CX, CY, R_NUM, n * 30);
        s += '<circle class="ck-numhit" data-h="' + n + '" cx="' + f(p[0]) + '" cy="' + f(p[1]) +
          '" r="' + R_NUMHIT + '" fill="rgba(0,0,0,0)" pointer-events="fill"/>';
      }
    }

    // 흐린 안내 바늘 (여러 번 빗나갔을 때만)
    const gv = (o.ghost === 0 || o.ghost) ? minuteAngle(o.ghost) : null;
    s += line('ck-ghost', 0, R_MIN_TIP, gv === null ? 0 : gv,
      gv === null ? ' visibility="hidden"' : '');

    // 짧은바늘 — 따라 돌 뿐 직접 못 만진다
    s += line('ck-hour', R_HOUR_TAIL, R_HOUR_TIP, ha);

    // 긴바늘 잡는 자리(투명) → 긴바늘 → 반짝임 → 손잡이
    if (o.interactive) {
      s += line('ck-grab', R_GRAB_IN, R_GRAB_OUT, ma,
        ' stroke="rgba(0,0,0,0)" stroke-width="' + W_GRAB + '" stroke-linecap="butt" pointer-events="stroke"');
    }
    s += line('ck-min', R_MIN_TAIL, R_MIN_TIP, ma);
    const tip = polar(CX, CY, R_MIN_TIP, ma);
    if (o.interactive) {
      s += '<circle class="ck-glow" cx="' + f(tip[0]) + '" cy="' + f(tip[1]) + '" r="8.4"/>';
    }
    s += '<circle class="ck-knob" cx="' + f(tip[0]) + '" cy="' + f(tip[1]) + '" r="5"/>';
    s += '<circle class="ck-cap" cx="50" cy="50" r="3.4"/>';
    s += '</svg>';
    return s;
  }

  /* ─────────── 포인터 배선 ─────────── */
  function attach(host, opt) {
    const o = opt || {};
    let unit = o.unit || 1;
    let total = norm720(o.total || 0);
    let interactive = o.interactive !== false;
    let hint = o.hint || null;
    let ghost = (o.ghost === 0 || o.ghost) ? o.ghost : null;

    let drag = null;   // { last:절대각, live:실수 총분, moved:움직인 각도합, step:눈금칸 }
    host.innerHTML = faceSVG({ total, interactive, hint, ghost, numbers: o.numbers });

    const q = sel => host.querySelector(sel);
    let svg = q('.ck-face');

    function rebuild() {
      host.innerHTML = faceSVG({ total, interactive, hint, ghost, numbers: o.numbers });
      svg = q('.ck-face');
      paint(drag ? drag.live : total);
    }
    // 바늘만 다시 놓는다 — 판·숫자는 그대로 둔다(끄는 동안 60번/초 다시 그리지 않게)
    function setL(el, r0, r1, deg) {
      if (!el) return;
      const a = polar(CX, CY, r0, deg), b = polar(CX, CY, r1, deg);
      el.setAttribute('x1', f(a[0])); el.setAttribute('y1', f(a[1]));
      el.setAttribute('x2', f(b[0])); el.setAttribute('y2', f(b[1]));
    }
    function paint(t) {
      const ma = minuteAngle(t), ha = hourAngle(t);
      setL(q('.ck-hour'), R_HOUR_TAIL, R_HOUR_TIP, ha);
      setL(q('.ck-min'), R_MIN_TAIL, R_MIN_TIP, ma);
      setL(q('.ck-grab'), R_GRAB_IN, R_GRAB_OUT, ma);
      const tip = polar(CX, CY, R_MIN_TIP, ma);
      [q('.ck-knob'), q('.ck-glow')].forEach(el => {
        if (!el) return;
        el.setAttribute('cx', f(tip[0])); el.setAttribute('cy', f(tip[1]));
      });
      const g = q('.ck-ghost');
      if (g) {
        if (ghost === null) g.setAttribute('visibility', 'hidden');
        else { g.removeAttribute('visibility'); setL(g, 0, R_MIN_TIP, minuteAngle(ghost)); }
      }
      if (host.classList) host.classList.toggle('dragging', !!drag);
    }

    // 화면 좌표 → viewBox 좌표 (판이 정사각이라 비율 계산으로 충분하다.
    // 판에 transform 이 없다는 계약이 이 계산을 옳게 만든다)
    function local(ev) {
      const r = svg.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      return [(ev.clientX - r.left) / r.width * 100, (ev.clientY - r.top) / r.height * 100];
    }

    function onDown(ev) {
      if (!interactive) return;
      const t = ev.target;
      // 숫자를 톡 눌렀나 — 끌기가 안 되는 아이를 위한 두 번째 길
      if (t && t.classList && t.classList.contains('ck-numhit')) {
        ev.preventDefault();
        const n = parseInt(t.getAttribute('data-h'), 10);
        const next = tapTotal(total, n, unit);
        const moved = next !== total;
        total = next;
        paint(total);
        if (o.onNumber) o.onNumber(n);
        if (o.onChange) o.onChange(total, { snapped: true, moved, tap: true });
        return;
      }
      /* 잡히는 것은 **잡는 자리(.ck-grab)와 손잡이(.ck-knob/.ck-glow)뿐**이다.
       * 그려진 바늘(.ck-min)은 잡히지 않는다 — 바늘은 중심을 지나가므로 그것까지 잡히게
       * 두면 한복판이 다시 잡히고, 거기서는 각도가 불안정하다. 나머지(판·눈금·숫자 글자·
       * 시침·가운데 못)는 CSS 에서 pointer-events:none 이라 여기까지 오지도 않는다. */
      if (!t || !t.classList ||
          !(t.classList.contains('ck-grab') ||
            t.classList.contains('ck-knob') || t.classList.contains('ck-glow'))) return;
      const p = local(ev);
      if (!p) return;
      ev.preventDefault();
      try { host.setPointerCapture(ev.pointerId); } catch (e) {}
      drag = {
        last: pointAngle(CX, CY, p[0], p[1]),
        live: total,
        moved: 0,
        step: Math.round(total / unit),
      };
      paint(drag.live);
    }

    function onMove(ev) {
      if (!drag) return;
      const p = local(ev);
      if (!p) return;
      ev.preventDefault();
      const a = pointAngle(CX, CY, p[0], p[1]);
      const d = fold(a - drag.last);   // ← 12시 경계는 여기서 접힌다
      drag.last = a;
      drag.moved += Math.abs(d);
      drag.live += d / 6;              // 끄는 동안에는 반올림하지 않는다
      paint(drag.live);
      const st = Math.round(drag.live / unit);
      if (st !== drag.step) { drag.step = st; if (o.onTick) o.onTick(); }
      if (o.onDrag) o.onDrag(drag.live);
    }

    function onUp(ev) {
      if (!drag) return;
      try { host.releasePointerCapture(ev.pointerId); } catch (e) {}
      const moved = drag.moved > 1.5;   // 툭 건드린 것은 움직인 것으로 세지 않는다
      const live = drag.live;
      drag = null;
      total = snapTotal(live, unit);    // 붙이는 것은 여기 한 번뿐
      paint(total);
      if (o.onChange) o.onChange(total, { snapped: true, moved });
    }

    host.addEventListener('pointerdown', onDown);
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerup', onUp);
    host.addEventListener('pointercancel', onUp);

    paint(total);

    return {
      el: host,
      total: () => total,
      live: () => (drag ? drag.live : null),
      dragging: () => !!drag,
      unit: () => unit,
      setUnit(u) { unit = u || 1; },
      setTotal(t) { total = norm720(t); if (!drag) paint(total); },
      setHint(h) { hint = h || null; rebuild(); },
      setGhost(g) { ghost = (g === 0 || g) ? g : null; paint(drag ? drag.live : total); },
      setInteractive(v) { interactive = !!v; rebuild(); },
      render: rebuild,
      destroy() {
        host.removeEventListener('pointerdown', onDown);
        host.removeEventListener('pointermove', onMove);
        host.removeEventListener('pointerup', onUp);
        host.removeEventListener('pointercancel', onUp);
      },
    };
  }

  return {
    CX, CY, R_MIN_TIP, R_GRAB_IN, R_GRAB_OUT, W_GRAB, R_NUM, R_NUMHIT,
    norm720, norm360, hourOf, minuteOf, hour12,
    minuteAngle, hourAngle, minutesToAngle, angleToMinutes, snapTotal,
    fold, pointAngle, polar, tapTotal,
    faceSVG, attach,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = window.ClockEngine;
