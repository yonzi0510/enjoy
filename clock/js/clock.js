/* ═══════════ 시계 엔진 ═══════════
 * 시계판을 그리고, 긴바늘을 손끝으로 돌리게 하고, 손을 뗄 때 눈금에 붙인다.
 * 방① 뻐꾸기 시계가 지금 쓰고 있고, **방② 깨우기·방③ 하루 만들기가 그대로 쓴다.**
 * 앱 로직(판·보상·진행도)은 여기 넣지 마라 — 여긴 「시계라는 물건」만 안다.
 *
 * ── 2026-08 개편: 시침·분침을 완전히 분리했다 ─────────────────────────
 * 부모님 지시: "작은바늘과 큰바늘이 따로 움직여서 아이가 시간 설정하기 쉽게 바꾸기".
 * 전에는 두 바늘이 「총 분」 하나에서 함께 나왔다 — 분침을 끌면 시침도 분마다 조금씩
 * 물려 돌고(실물 그대로의 톱니 맞물림), 분침이 60분을 넘어 돌면 시가 저절로 올라갔다.
 * 실물에 가장 가깝지만, 시를 하나 바꾸려면 분침을 한 바퀴 다 돌려야 했다.
 *
 * 지금은 **시(時)와 분(分)이 서로 다른 손짓에서 나온다**:
 *   - 시는 숫자를 톡 누르면 그 시각으로 **바로** 간다(분은 그대로 둔다).
 *   - 분은 긴바늘을 끄는 것으로만 바뀐다 — **그 시 안에서만** 0~59 를 돈다.
 *     한 바퀴를 넘게 돌려도 시는 더 이상 따라 오르지 않는다.
 *   - 짧은바늘은 그 시의 숫자에 **딱** 붙는다(분과 상관없이 늘 정수 위치) — 톱니
 *     맞물림은 포기했다. "3시 반인데 시침이 3에 딱 붙은 그림"은 이제 **의도된 모습**이다.
 * 상태는 여전히 총 분 하나(`hour*60+minute`)로 들고 다닌다 — 판의 목표(`board.minutes`)와
 * 채점(`total === target`)은 손대지 않았다. 바뀐 것은 그 값에 **손이 닿는 방식** 뿐이다.
 *
 * ── 공개 API ────────────────────────────────────────────────────────
 *  값 계산 (전부 순수 함수, node 에서도 부를 수 있다)
 *    norm720(t)              총 분을 0~719 로 접는다 (실수도 된다)
 *    hourOf(t) / minuteOf(t) / hour12(t)
 *    minuteAngle(t)          분침각 = (t % 60) * 6
 *    hourAngle(t)            시침각 = hourOf(t) * 30   ← 분과 무관하게 그 시에 딱 붙는다
 *    minutesToAngle(m)       m * 6
 *    angleToMinutes(a, unit) 각도 → 분(0~59). **반올림은 이 한 곳에서 한 번만.**
 *    snapTotal(t, unit)      손 뗄 때 붙는 총 분 (같은 반올림 규칙)
 *    fold(deg)               각도를 [-180,180) 로 접는다 ← 12시 경계
 *    pointAngle(cx,cy,x,y)   손끝의 절대각 0~360. **상태에 그대로 쓰지 마라**(11시간 점프)
 *    polar(cx,cy,r,deg)      중심 + 길이 × (sinθ, −cosθ)
 *    tapTotal(cur, n)        숫자 n 을 톡 눌렀을 때 갈 총 분 — **시만** 바꾼다(분은 그대로)
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
 * ① 상태는 「총 분」 하나(`hour*60+minute`)로 밖에 낸다 — 판정·저장은 이 값 하나만 본다.
 *    다만 **바뀌는 통로는 둘로 갈렸다**: 숫자 탭(시) · 긴바늘 끌기(분). 서로 남의 값을 안 건드린다.
 * ② 회전을 DOM 에 주지 마라(transform). 좌표를 계산해 <line> 에 직접 쓴다.
 *    회전을 걸면 손끝 좌표를 역행렬로 되돌려야 하고, 그게 이 저장소가 겪은
 *    「채점 좌표가 어긋난다」 사고의 정체다. 그래서 각 앱 e2e 가 시계판 전체에
 *    computed transform === 'none' 을 엄격하게 건다.
 * ③ 분침을 끄는 **동안에는 반올림하지 않는다.** 손끝을 그대로 따라간다.
 *    툭툭 끊기면 다섯 살은 「고장났다」고 느낀다. 붙이는 것은 손을 뗄 때 딱 한 번.
 * ④ 안 붙는 자리를 두지 마라. 놓으면 반드시 어딘가에 선다(지오보드의 CATCH 를 베끼지 말 것).
 * ⑤ 각도는 **직전 프레임과의 차이를 접어 누적**한다. atan2 절대값을 상태로 쓰면
 *    11:59 → 12:00 에서 11시간이 점프한다. 분은 **그 시 안에서만** 0↔59 로 접힌다 —
 *    시각으로 넘어가지 않는다(옛날에는 여기서 시가 따라 올랐다. 지금은 안 오른다).
 * ⑥ 잡히는 것은 **긴바늘뿐**이다. 짧은바늘은 직접 못 만진다(1시간 = 30°, 5세 정밀도를
 *    넘는다) — 시는 숫자를 눌러서만 바꾼다. 한복판(r<15)도 안 잡힌다 — 각도가 불안정하다.
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
  const hourAngle = t => norm360(hourOf(t) * 30);   // 분과 무관 — 그 시에 딱 붙는다(완전 분리)
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

  /* 숫자 n(1~12)을 톡 눌렀을 때 갈 자리 — **시(時)만** 바꾼다.
   * 분은 지금 값 그대로 둔다(완전 분리: 분은 오직 긴바늘을 끌어야 바뀐다).
   * 12시(0시)는 n=12 로 받는다. */
  function tapTotal(cur, n) {
    return norm720((n % 12) * 60 + minuteOf(cur));
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

    // { last:절대각, hourFixed:잡는 순간의 시(고정), liveMinute:실수 분(그 시 안에서만 0↔59), moved, step }
    let drag = null;
    // 끄는 동안의 실수 총분 — 시는 drag.hourFixed 로 고정, 분만 산다
    const dragLive = () => drag ? drag.hourFixed * 60 + drag.liveMinute : null;
    host.innerHTML = faceSVG({ total, interactive, hint, ghost, numbers: o.numbers });

    const q = sel => host.querySelector(sel);
    let svg = q('.ck-face');

    function rebuild() {
      host.innerHTML = faceSVG({ total, interactive, hint, ghost, numbers: o.numbers });
      svg = q('.ck-face');
      paint(drag ? dragLive() : total);
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
      // 숫자를 톡 눌렀나 — **시(時)만** 바뀐다, 분은 그대로 둔다
      if (t && t.classList && t.classList.contains('ck-numhit')) {
        ev.preventDefault();
        const n = parseInt(t.getAttribute('data-h'), 10);
        const next = tapTotal(total, n);
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
      /* 긴바늘은 **분만** 끈다 — 잡는 순간의 시(hourFixed)는 붙박이로 고정해 둔다.
       * 한 바퀴를 넘게 끌어도 분만 0↔59 로 돌 뿐, 시는 절대 따라 오르지 않는다
       * (완전 분리 — 시를 바꾸는 것은 숫자 탭뿐이다). */
      drag = {
        last: pointAngle(CX, CY, p[0], p[1]),
        hourFixed: hourOf(total),
        liveMinute: minuteOf(total),
        moved: 0,
        step: Math.round(minuteOf(total) / unit),
      };
      paint(drag.hourFixed * 60 + drag.liveMinute);
    }

    function onMove(ev) {
      if (!drag) return;
      const p = local(ev);
      if (!p) return;
      ev.preventDefault();
      const a = pointAngle(CX, CY, p[0], p[1]);
      const d = fold(a - drag.last);   // ← 매 프레임 접어 누적 (12시/59↔0 경계 안전)
      drag.last = a;
      drag.moved += Math.abs(d);
      // 끄는 동안에는 반올림하지 않는다 — 다만 **그 시 안에서만** 0↔59 로 돈다
      drag.liveMinute = ((drag.liveMinute + d / 6) % 60 + 60) % 60;
      const live = drag.hourFixed * 60 + drag.liveMinute;
      paint(live);
      const st = Math.round(drag.liveMinute / unit);
      if (st !== drag.step) { drag.step = st; if (o.onTick) o.onTick(); }
      if (o.onDrag) o.onDrag(live);
    }

    function onUp(ev) {
      if (!drag) return;
      try { host.releasePointerCapture(ev.pointerId); } catch (e) {}
      const moved = drag.moved > 1.5;   // 툭 건드린 것은 움직인 것으로 세지 않는다
      const hourFixed = drag.hourFixed, liveMinute = drag.liveMinute;
      drag = null;
      // 붙이는 것은 여기 한 번뿐 — 분만 눈금에 붙이고, 시는 그대로 둔다
      const snappedMinute = roundToUnit(liveMinute, unit) % 60;
      total = norm720(hourFixed * 60 + snappedMinute);
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
      live: () => (drag ? dragLive() : null),
      dragging: () => !!drag,
      unit: () => unit,
      setUnit(u) { unit = u || 1; },
      setTotal(t) { total = norm720(t); if (!drag) paint(total); },
      setHint(h) { hint = h || null; rebuild(); },
      setGhost(g) { ghost = (g === 0 || g) ? g : null; paint(drag ? dragLive() : total); },
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
