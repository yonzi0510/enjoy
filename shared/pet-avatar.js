/* ═══════════ 공용 펫 아바타 (직접 그린 SVG 캐릭터) ═══════════
 * 학습 펫(shared/pet.js)의 이모지 아이콘을 대신할 인라인 SVG 캐릭터 모듈.
 * 외부 의존 없음 — SVG 생성 + <style> 한 번 주입 + 클래스 토글로만 동작한다.
 *
 * 사용법:
 *   const av = PetAvatar.create(containerEl);   // 컨테이너에 SVG 장착 (width/height 100%)
 *   av.render({ species: 'puppy', stage: 2 });  // 종·성장단계 갱신 (다시 그려도 잔동작 유지)
 *   av.render({ species: 'egg', crack: 0.6 });  // 알 (crack 0~1: 커질수록 금이 늘어남)
 *   av.eat(done);       // 먹기 연출 (입 벌리기→오물오물→방긋), 끝나면 done()
 *   av.happy();         // 통통 뛰며 ^^ 눈 + 하트 파티클
 *   av.celebrate();     // 진화·축하 — 크게 점프 + 반짝 파티클
 *   av.startIdle();     // 잔동작 스케줄러 (숨쉬기·깜빡임은 CSS로 항상 돈다)
 *   av.stopIdle();
 *   av.destroy();       // 타이머 정리 + DOM 제거
 *
 * 종 id 16개는 pet.js의 SPECIES와 같다:
 *   chick puppy kitty rabbit bear panda koala fox frog turtle
 *   lion tiger pig hamster dolphin unicorn   (+ 특수 상태 'egg')
 *
 * 디자인: 공통 리그(둥근 몸 + 큰 머리 blob) 위에 종별 파라미터(귀·꼬리·색·특징)만 바꾼다.
 * 성장 단계(1 아기 / 2 어린이 / 3 어른)는 크기뿐 아니라 머리/몸 비율도 달라진다.
 */
window.PetAvatar = (() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const STYLE_ID = 'pet-avatar-style';

  /* ─────────── 전역 스타일 (문서에 한 번만 주입) ─────────── */
  const CSS = [
    '.pa-svg{width:100%;height:100%;display:block}',
    /* 항상 도는 idle — 펫은 숨쉬기, 알은 흔들흔들 */
    '.pa-pet{transform-box:fill-box;transform-origin:50% 92%;animation:pa-breathe 3.2s ease-in-out infinite}',
    '@keyframes pa-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.025,.965)}}',
    '.pa-egg{transform-box:fill-box;transform-origin:50% 96%;animation:pa-wobble 2.6s ease-in-out infinite}',
    '@keyframes pa-wobble{0%,55%,100%{transform:rotate(0)}12%{transform:rotate(-5deg)}26%{transform:rotate(4deg)}40%{transform:rotate(-2deg)}}',
    /* 눈 깜빡임 (JS 스케줄러가 .pa-blink 를 잠깐 붙인다) */
    '.pa-eye-open{transform-box:fill-box;transform-origin:center}',
    '.pa-blink .pa-eye-open{animation:pa-blink .24s ease-in-out}',
    '@keyframes pa-blink{50%{transform:scaleY(.06)}}',
    /* ^^ 눈은 happy 동안만 보인다 */
    '.pa-eye-happy{display:none}',
    '.pa-happy .pa-eye-open{display:none}',
    '.pa-happy .pa-eye-happy{display:inline}',
    /* 잔동작 — 귀 쫑긋 */
    '.pa-ear-l,.pa-ear-r{transform-box:fill-box;transform-origin:50% 85%}',
    '.pa-twitch .pa-ear-l{animation:pa-twitch .55s ease-in-out}',
    '.pa-twitch .pa-ear-r{animation:pa-twitch .55s ease-in-out .09s}',
    '@keyframes pa-twitch{30%{transform:rotate(-10deg)}70%{transform:rotate(7deg)}}',
    /* 잔동작 — 꼬리 살랑 */
    '.pa-tail{transform-box:fill-box;transform-origin:15% 85%}',
    '.pa-wag .pa-tail{animation:pa-wag .9s ease-in-out}',
    '@keyframes pa-wag{25%{transform:rotate(14deg)}55%{transform:rotate(-10deg)}80%{transform:rotate(6deg)}}',
    /* 잔동작 — 눈동자 좌우 보기 */
    '.pa-look .pa-eyes{animation:pa-look 1.7s ease-in-out}',
    '@keyframes pa-look{18%,40%{transform:translateX(4.5px)}60%,84%{transform:translateX(-4.5px)}}',
    /* 잔동작 — 폴짝 */
    '.pa-hop .pa-pet,.pa-hop .pa-egg{animation:pa-hop .6s ease-in-out}',
    '@keyframes pa-hop{30%{transform:translateY(-15px) scale(1.02,.98)}60%{transform:translateY(0) scale(1.05,.93)}80%{transform:scale(.99,1.01)}}',
    /* 먹기 — 오물오물 바운스 (입 모양은 JS가 바꾼다) */
    '.pa-eat .pa-pet{animation:pa-chew .3s ease-in-out infinite}',
    '@keyframes pa-chew{50%{transform:scale(1.02,.96) translateY(1.5px)}}',
    /* happy — 통통 뛰기 */
    '.pa-happy .pa-pet,.pa-happy .pa-egg{animation:pa-bounce .48s ease-in-out 3}',
    '@keyframes pa-bounce{35%{transform:translateY(-13px) scale(.99,1.02)}70%{transform:translateY(0) scale(1.04,.94)}}',
    /* celebrate — 크게 점프하며 갸웃갸웃 */
    '.pa-cele .pa-pet,.pa-cele .pa-egg{animation:pa-cele 1.5s ease-in-out}',
    '@keyframes pa-cele{12%{transform:scale(1.08,.86)}30%{transform:translateY(-34px) rotate(-9deg)}48%{transform:translateY(-30px) rotate(9deg)}66%{transform:translateY(0) scale(1.08,.9)}82%{transform:scale(.97,1.03)}}',
    /* 하트·반짝 파티클 */
    '.pa-particle{animation:pa-float 1.35s ease-out forwards;pointer-events:none}',
    '@keyframes pa-float{0%{opacity:0;transform:translateY(6px) scale(.5)}18%{opacity:1}100%{opacity:0;transform:translateY(-72px) scale(1.2)}}',
  ].join('\n');

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ─────────── 성장 단계별 비율 (아기는 머리가 크고 몸이 작다) ─────────── */
  const GEO = {
    1: { s: 0.78, hr: 44, brx: 30, bry: 26, sh: 40 }, // 아기
    2: { s: 0.92, hr: 42, brx: 38, bry: 34, sh: 50 }, // 어린이
    3: { s: 1.00, hr: 40, brx: 48, bry: 43, sh: 58 }, // 어른
  };

  /* ─────────── 종별 파라미터 (파스텔 톤) ─────────── */
  const SP = {
    chick:   { body: '#ffe082', belly: '#fff6cf', feetC: '#ffab4d', ear: 'none', tail: 'none', cheek: '#ffb59b', nose: 'beak', extra: 'chick' },
    puppy:   { body: '#e8c8a0', belly: '#f9ecd9', feetC: '#d9b088', ear: 'fold', earC: '#c79a6b', tail: 'curl', tailC: '#c79a6b', cheek: '#f7a8a0', nose: 'dog', muzzle: '#f9ecd9' },
    kitty:   { body: '#ccd7e4', belly: '#eef3f8', feetC: '#b9c7d8', ear: 'pointy', earIn: '#f9bcd0', tail: 'swish', cheek: '#f4a7b9', nose: 'cat', whiskers: '#93a3b5' },
    rabbit:  { body: '#fdeef3', belly: '#fffdfd', feetC: '#f6dbe4', ear: 'long', earIn: '#ffbfd3', tail: 'ball', tailC: '#ffffff', cheek: '#f9a8c0', nose: 'cat' },
    bear:    { body: '#c9996b', belly: '#eedcc4', feetC: '#b78a5e', ear: 'round', earIn: '#e8c9a4', tail: 'ball', tailC: '#b78a5e', cheek: '#e08e7a', nose: 'dog', muzzle: '#eedcc4' },
    panda:   { body: '#f1eee5', belly: '#faf8f2', feetC: '#454552', ear: 'round', earC: '#454552', tail: 'none', cheek: '#f4a7b9', nose: 'dog', extra: 'panda', eyeRing: true },
    koala:   { body: '#b9c6d2', belly: '#e6edf3', feetC: '#a5b3c1', ear: 'big', earIn: '#f2b8c6', tail: 'none', cheek: '#f0a4b4', nose: 'koala' },
    fox:     { body: '#ffb26b', belly: '#fff1df', feetC: '#f09a4e', ear: 'pointy', earIn: '#fff1df', earTip: '#8a5636', tail: 'fluffy', cheek: '#ff9d8a', nose: 'dog', muzzle: '#fff1df' },
    frog:    { body: '#a9d878', belly: '#e9f6cc', feetC: '#93c765', ear: 'none', tail: 'none', cheek: '#f2a78f', nose: 'dots', noseC: '#5e8f45', eyesTop: true, wideMouth: true, mouthY: 0.28 },
    turtle:  { body: '#9fd28c', belly: null, feetC: '#8cc07a', ear: 'none', tail: 'nub', cheek: '#eda283', nose: 'dots', noseC: '#6b9a58', extra: 'shell' },
    lion:    { body: '#f6cd6f', belly: '#fdeec7', feetC: '#e9b95a', ear: 'round', earIn: '#f0b25e', tail: 'tuft', cheek: '#f2a074', nose: 'dog', muzzle: '#fdeec7', extra: 'mane' },
    tiger:   { body: '#ffb066', belly: '#fff3e0', feetC: '#f59a4e', ear: 'round', earIn: '#ffd9ad', tail: 'stripe', cheek: '#ff9d8a', nose: 'dog', muzzle: '#fff3e0', extra: 'stripes' },
    pig:     { body: '#f9c3ce', belly: '#fde3e9', feetC: '#f3aebc', ear: 'droop', earC: '#f3a8b8', tail: 'pig', cheek: '#f59db4', nose: 'pig', mouthY: 0.58 },
    hamster: { body: '#f6d9a4', belly: '#fdf2da', feetC: '#e9c48d', ear: 'tiny', earIn: '#f0b98a', tail: 'none', cheek: '#f2ac96', nose: 'cat', pouches: true },
    dolphin: { body: '#8fc9ea', belly: '#eaf7ff', feetC: null, ear: 'none', tail: 'fluke', finC: '#6fb3d9', cheek: '#f4a7b9', nose: 'none', extra: 'dolphin' },
    unicorn: { body: '#fdf2f8', belly: '#ffffff', feetC: '#f2dbe8', ear: 'pointy', earIn: '#ffc9dd', tail: 'unicorn', cheek: '#f8b0ca', nose: 'none', extra: 'unicorn' },
  };
  const EYE = '#3a3a47';        // 눈동자
  const MOUTH_C = '#7c5648';    // 입 선
  const MOUTH_IN = '#9c5866';   // 벌린 입 속

  /* ─────────── SVG 문자열 도우미 ─────────── */
  const r1 = n => Math.round(n * 10) / 10;
  const C = (cx, cy, r, f, ex) => '<circle cx="' + r1(cx) + '" cy="' + r1(cy) + '" r="' + r1(r) + '" fill="' + f + '"' + (ex || '') + '/>';
  const E = (cx, cy, rx, ry, f, ex) => '<ellipse cx="' + r1(cx) + '" cy="' + r1(cy) + '" rx="' + r1(rx) + '" ry="' + r1(ry) + '" fill="' + f + '"' + (ex || '') + '/>';
  const PATH = (d, f, ex) => '<path d="' + d + '" fill="' + f + '"' + (ex || '') + '/>';
  const STROKE = (d, c, w, ex) => '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' + (ex || '') + '/>';
  const rot = (a, x, y) => ' transform="rotate(' + r1(a) + ' ' + r1(x) + ' ' + r1(y) + ')"';

  /* ─────────── 부위별 그리기 ─────────── */

  // 귀 (머리 뒤에 그리는 종류) — 좌우 각각 pa-ear-l/r 로 감싸 쫑긋 애니메이션 대상이 된다
  function earsBack(P, hx, hy, hr) {
    const t = P.ear;
    if (t === 'none' || t === 'fold' || t === 'droop') return '';
    let l = '', r = '';
    if (t === 'long') { // 토끼 — 길쭉 위로
      const cy = hy - hr * 0.9, ry = hr * 0.6, rx = hr * 0.2;
      l = E(hx - hr * 0.42, cy, rx, ry, P.body, rot(-12, hx - hr * 0.42, cy + ry)) +
          E(hx - hr * 0.42, cy + hr * 0.06, rx * 0.5, ry * 0.68, P.earIn, rot(-12, hx - hr * 0.42, cy + ry));
      r = E(hx + hr * 0.42, cy, rx, ry, P.body, rot(12, hx + hr * 0.42, cy + ry)) +
          E(hx + hr * 0.42, cy + hr * 0.06, rx * 0.5, ry * 0.68, P.earIn, rot(12, hx + hr * 0.42, cy + ry));
    } else if (t === 'pointy') { // 여우·고양이·유니콘 — 세모 (머리 위로 확실히 솟게)
      const mk = s => {
        const x = d => hx + d * s;
        let out = PATH('M ' + r1(x(-hr * 0.92)) + ' ' + r1(hy - hr * 0.2) +
          ' Q ' + r1(x(-hr * 0.9)) + ' ' + r1(hy - hr * 1.0) + ' ' + r1(x(-hr * 0.6)) + ' ' + r1(hy - hr * 1.3) +
          ' Q ' + r1(x(-hr * 0.28)) + ' ' + r1(hy - hr * 0.95) + ' ' + r1(x(-hr * 0.12)) + ' ' + r1(hy - hr * 0.55) + ' Z', P.body);
        if (P.earIn) out += E(x(-hr * 0.58), hy - hr * 0.82, hr * 0.13, hr * 0.28, P.earIn, rot(-30 * s, x(-hr * 0.58), hy - hr * 0.82));
        if (P.earTip) out += C(x(-hr * 0.62), hy - hr * 1.12, hr * 0.15, P.earTip);
        return out;
      };
      l = mk(1); r = mk(-1);
    } else if (t === 'round') { // 곰·판다·사자·호랑이 — 동글
      const cy = hy - hr * 0.62, cr = hr * 0.32;
      l = C(hx - hr * 0.62, cy, cr, P.earC || P.body) + (P.earIn ? C(hx - hr * 0.62, cy + cr * 0.12, cr * 0.55, P.earIn) : '');
      r = C(hx + hr * 0.62, cy, cr, P.earC || P.body) + (P.earIn ? C(hx + hr * 0.62, cy + cr * 0.12, cr * 0.55, P.earIn) : '');
    } else if (t === 'big') { // 코알라 — 크고 복슬
      const cy = hy - hr * 0.4, cr = hr * 0.46;
      l = C(hx - hr * 0.8, cy, cr, P.body) + C(hx - hr * 0.8, cy + cr * 0.1, cr * 0.55, P.earIn);
      r = C(hx + hr * 0.8, cy, cr, P.body) + C(hx + hr * 0.8, cy + cr * 0.1, cr * 0.55, P.earIn);
    } else if (t === 'tiny') { // 햄스터 — 조그맣게
      const cy = hy - hr * 0.82, cr = hr * 0.18;
      l = C(hx - hr * 0.5, cy, cr, P.body) + C(hx - hr * 0.5, cy + 1, cr * 0.55, P.earIn);
      r = C(hx + hr * 0.5, cy, cr, P.body) + C(hx + hr * 0.5, cy + 1, cr * 0.55, P.earIn);
    }
    return '<g class="pa-ear-l">' + l + '</g><g class="pa-ear-r">' + r + '</g>';
  }

  // 귀 (머리 앞에 그리는 종류 — 접힌 강아지 귀, 늘어진 돼지 귀)
  function earsFront(P, hx, hy, hr) {
    const t = P.ear;
    if (t === 'fold') { // 강아지 — 접혀 늘어진 귀
      const l = E(hx - hr * 0.68, hy - hr * 0.18, hr * 0.2, hr * 0.44, P.earC, rot(18, hx - hr * 0.68, hy - hr * 0.58));
      const r = E(hx + hr * 0.68, hy - hr * 0.18, hr * 0.2, hr * 0.44, P.earC, rot(-18, hx + hr * 0.68, hy - hr * 0.58));
      return '<g class="pa-ear-l">' + l + '</g><g class="pa-ear-r">' + r + '</g>';
    }
    if (t === 'droop') { // 돼지 — 앞으로 접힌 세모 귀
      const mk = s => {
        const x = d => hx + d * s;
        return PATH('M ' + r1(x(-hr * 0.82)) + ' ' + r1(hy - hr * 0.66) +
          ' L ' + r1(x(-hr * 0.3)) + ' ' + r1(hy - hr * 0.92) +
          ' L ' + r1(x(-hr * 0.42)) + ' ' + r1(hy - hr * 0.28) + ' Z', P.earC,
          ' stroke="' + P.earC + '" stroke-width="7" stroke-linejoin="round"');
      };
      return '<g class="pa-ear-l">' + mk(1) + '</g><g class="pa-ear-r">' + mk(-1) + '</g>';
    }
    return '';
  }

  // 꼬리 — pa-tail 로 감싸 살랑 애니메이션 대상이 된다
  function tail(P, bx, by, brx, bry) {
    const t = P.tail;
    if (t === 'none') return '';
    let s = '';
    const ex = bx + brx; // 몸 오른쪽 가장자리
    if (t === 'curl') { // 강아지 — 말린 꼬리
      s = STROKE('M ' + r1(ex - 6) + ' ' + r1(by + 2) + ' Q ' + r1(ex + 16) + ' ' + r1(by - 4) + ' ' + r1(ex + 8) + ' ' + r1(by - 24), P.tailC || P.body, 9);
    } else if (t === 'swish') { // 고양이 — 길게 휘어진 꼬리
      s = STROKE('M ' + r1(ex - 6) + ' ' + r1(by + bry * 0.4) + ' Q ' + r1(ex + 20) + ' ' + r1(by + bry * 0.3) + ' ' + r1(ex + 13) + ' ' + r1(by - bry * 0.75), P.body, 10) +
          C(ex + 13, by - bry * 0.75, 5.5, P.earIn || P.body);
    } else if (t === 'fluffy') { // 여우 — 복슬 꼬리 + 흰 끝
      s = E(ex + 7, by - 1, bry * 0.62, bry * 0.36, P.body, rot(-42, ex + 7, by - 1)) +
          C(ex + 18, by - 15, bry * 0.22, '#fff1df');
    } else if (t === 'ball') { // 토끼·곰 — 동글 꼬리
      s = C(ex + 4, by + bry * 0.25, 9, P.tailC || P.belly || P.body);
    } else if (t === 'pig') { // 돼지 — 돌돌 말린 꼬리
      s = STROKE('M ' + r1(ex - 2) + ' ' + r1(by) + ' q 12 -7 10 3 q -2 9 7 6', '#f29fb2', 5);
    } else if (t === 'tuft') { // 사자 — 끝에 털 뭉치
      s = STROKE('M ' + r1(ex - 4) + ' ' + r1(by + 4) + ' Q ' + r1(ex + 18) + ' ' + r1(by - 2) + ' ' + r1(ex + 14) + ' ' + r1(by - 20), P.body, 7) +
          C(ex + 14, by - 23, 7.5, '#e8975a');
    } else if (t === 'stripe') { // 호랑이 — 줄무늬 꼬리
      s = STROKE('M ' + r1(ex - 6) + ' ' + r1(by + 2) + ' Q ' + r1(ex + 17) + ' ' + r1(by - 3) + ' ' + r1(ex + 11) + ' ' + r1(by - 25), P.body, 9) +
          C(ex + 11, by - 25, 5, '#8a5636');
    } else if (t === 'fluke') { // 돌고래 — 꼬리 지느러미
      s = PATH('M ' + r1(ex - 8) + ' ' + r1(by + 10) +
        ' Q ' + r1(ex + 12) + ' ' + r1(by + 4) + ' ' + r1(ex + 20) + ' ' + r1(by - 9) +
        ' Q ' + r1(ex + 21) + ' ' + r1(by + 6) + ' ' + r1(ex + 27) + ' ' + r1(by + 15) +
        ' Q ' + r1(ex + 10) + ' ' + r1(by + 18) + ' ' + r1(ex - 8) + ' ' + r1(by + 10) + ' Z', P.finC);
    } else if (t === 'unicorn') { // 유니콘 — 파스텔 갈기 꼬리 (왼쪽으로 흘러내림)
      const sx = bx - brx + 3;
      s = STROKE('M ' + r1(sx) + ' ' + r1(by - 10) + ' Q ' + r1(sx - 18) + ' ' + r1(by - 4) + ' ' + r1(sx - 13) + ' ' + r1(by + 16), '#f9b8d6', 7) +
          STROKE('M ' + r1(sx + 2) + ' ' + r1(by - 4) + ' Q ' + r1(sx - 13) + ' ' + r1(by + 2) + ' ' + r1(sx - 8) + ' ' + r1(by + 20), '#cdb5f2', 6) +
          STROKE('M ' + r1(sx + 4) + ' ' + r1(by + 3) + ' Q ' + r1(sx - 8) + ' ' + r1(by + 9) + ' ' + r1(sx - 3) + ' ' + r1(by + 23), '#b5e8d8', 5);
      return '<g class="pa-tail" transform="translate(0 0)">' + s + '</g>'; // 왼쪽 꼬리도 살랑
    } else if (t === 'nub') { // 거북 — 뭉툭 꼬리
      s = C(ex + 2, by + bry * 0.4, 6, P.body);
    }
    return '<g class="pa-tail">' + s + '</g>';
  }

  // 종별 특징 (머리·몸 위에 얹는 것들)
  function extraBack(P, g) { // 머리 뒤 (귀보다 먼저)
    const { hx, hy, hr } = g;
    if (P.extra === 'mane') { // 사자 갈기 — 머리 둘레 복슬 원
      let s = '';
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2;
        s += C(hx + Math.cos(a) * hr * 1.0, hy + Math.sin(a) * hr * 1.0, hr * 0.33, '#ef9e56');
      }
      return s;
    }
    return '';
  }
  function extraBody(P, g) { // 몸 위 (머리보다 먼저)
    const { bx, by, brx, bry } = g;
    if (P.extra === 'shell') { // 거북 등껍질 — 몸을 덮는 돔
      return PATH('M ' + r1(bx - brx) + ' ' + r1(by + bry * 0.5) +
          ' Q ' + r1(bx - brx * 1.02) + ' ' + r1(by - bry * 1.35) + ' ' + r1(bx) + ' ' + r1(by - bry * 1.35) +
          ' Q ' + r1(bx + brx * 1.02) + ' ' + r1(by - bry * 1.35) + ' ' + r1(bx + brx) + ' ' + r1(by + bry * 0.5) + ' Z', '#c69a67') +
        E(bx, by + bry * 0.5, brx, bry * 0.26, '#a97c4f') +
        C(bx, by - bry * 0.55, bry * 0.24, '#a97c4f') +
        C(bx - brx * 0.48, by - bry * 0.05, bry * 0.2, '#a97c4f') +
        C(bx + brx * 0.48, by - bry * 0.05, bry * 0.2, '#a97c4f');
    }
    if (P.extra === 'chick') { // 병아리 날개
      return E(bx - brx * 0.95, by - bry * 0.1, brx * 0.28, bry * 0.5, '#f5c842', rot(18, bx - brx * 0.95, by - bry * 0.1)) +
             E(bx + brx * 0.95, by - bry * 0.1, brx * 0.28, bry * 0.5, '#f5c842', rot(-18, bx + brx * 0.95, by - bry * 0.1));
    }
    if (P.extra === 'dolphin') { // 돌고래 옆 지느러미
      return E(bx - brx * 0.92, by + bry * 0.05, brx * 0.3, bry * 0.42, P.finC, rot(28, bx - brx * 0.92, by + bry * 0.05)) +
             E(bx + brx * 0.92, by + bry * 0.05, brx * 0.3, bry * 0.42, P.finC, rot(-28, bx + brx * 0.92, by + bry * 0.05));
    }
    return '';
  }
  function extraHead(P, g) { // 머리 앞 (얼굴보다 먼저)
    const { hx, hy, hr } = g;
    if (P.extra === 'panda') { // 판다 눈 패치 (눈을 넉넉히 감싸게 크게)
      const ex = hr * 0.36, ey = hy + hr * 0.01;
      return E(hx - ex, ey, hr * 0.24, hr * 0.32, '#454552', rot(-16, hx - ex, ey)) +
             E(hx + ex, ey, hr * 0.24, hr * 0.32, '#454552', rot(16, hx + ex, ey));
    }
    if (P.extra === 'stripes') { // 호랑이 줄무늬
      const c = '#8a5636';
      return STROKE('M ' + r1(hx) + ' ' + r1(hy - hr * 0.98) + ' q 1.5 5 0 ' + r1(hr * 0.22), c, 4.5) +
        STROKE('M ' + r1(hx - hr * 0.4) + ' ' + r1(hy - hr * 0.86) + ' q 4 4 2.5 ' + r1(hr * 0.18), c, 4) +
        STROKE('M ' + r1(hx + hr * 0.4) + ' ' + r1(hy - hr * 0.86) + ' q -4 4 -2.5 ' + r1(hr * 0.18), c, 4) +
        STROKE('M ' + r1(hx - hr * 0.97) + ' ' + r1(hy + hr * 0.02) + ' h ' + r1(hr * 0.2), c, 4) +
        STROKE('M ' + r1(hx - hr * 0.93) + ' ' + r1(hy + hr * 0.2) + ' h ' + r1(hr * 0.16), c, 4) +
        STROKE('M ' + r1(hx + hr * 0.77) + ' ' + r1(hy + hr * 0.02) + ' h ' + r1(hr * 0.2), c, 4) +
        STROKE('M ' + r1(hx + hr * 0.77) + ' ' + r1(hy + hr * 0.2) + ' h ' + r1(hr * 0.16), c, 4);
    }
    if (P.extra === 'unicorn') { // 유니콘 뿔 + 갈기
      return PATH('M ' + r1(hx - hr * 0.14) + ' ' + r1(hy - hr * 0.76) + ' L ' + r1(hx + hr * 0.14) + ' ' + r1(hy - hr * 0.76) +
          ' L ' + r1(hx + hr * 0.02) + ' ' + r1(hy - hr * 1.52) + ' Z', '#f6c453') +
        STROKE('M ' + r1(hx - hr * 0.08) + ' ' + r1(hy - hr * 0.95) + ' L ' + r1(hx + hr * 0.11) + ' ' + r1(hy - hr * 1.02), '#e5a93a', 2.5) +
        STROKE('M ' + r1(hx - hr * 0.04) + ' ' + r1(hy - hr * 1.16) + ' L ' + r1(hx + hr * 0.08) + ' ' + r1(hy - hr * 1.21), '#e5a93a', 2.5) +
        C(hx - hr * 0.3, hy - hr * 0.86, hr * 0.26, '#f9b8d6') +
        C(hx - hr * 0.64, hy - hr * 0.58, hr * 0.24, '#cdb5f2') +
        C(hx - hr * 0.86, hy - hr * 0.2, hr * 0.2, '#b5e8d8') +
        C(hx - hr * 0.92, hy + hr * 0.18, hr * 0.16, '#f9b8d6');
    }
    if (P.extra === 'dolphin') { // 돌고래 등지느러미 — 정수리에서 뒤로 휘어진 날렵한 지느러미
      return PATH('M ' + r1(hx - hr * 0.16) + ' ' + r1(hy - hr * 0.92) +
        ' Q ' + r1(hx - hr * 0.02) + ' ' + r1(hy - hr * 1.55) + ' ' + r1(hx + hr * 0.5) + ' ' + r1(hy - hr * 1.28) +
        ' Q ' + r1(hx + hr * 0.28) + ' ' + r1(hy - hr * 1.12) + ' ' + r1(hx + hr * 0.22) + ' ' + r1(hy - hr * 0.78) + ' Z', P.finC);
    }
    if (P.extra === 'chick') { // 병아리 머리털
      return STROKE('M ' + r1(hx - 2) + ' ' + r1(hy - hr + 3) + ' Q ' + r1(hx - 7) + ' ' + r1(hy - hr - 9) + ' ' + r1(hx - 12) + ' ' + r1(hy - hr - 7), '#e8b93e', 3) +
             STROKE('M ' + r1(hx + 1) + ' ' + r1(hy - hr + 2) + ' Q ' + r1(hx + 3) + ' ' + r1(hy - hr - 11) + ' ' + r1(hx + 9) + ' ' + r1(hy - hr - 10), '#e8b93e', 3);
    }
    return '';
  }

  // 코
  function nose(P, hx, hy, hr) {
    const t = P.nose;
    if (t === 'dog') return E(hx, hy + hr * 0.16, hr * 0.11, hr * 0.085, '#6b4a3a');
    if (t === 'cat') return PATH('M ' + r1(hx - 4.5) + ' ' + r1(hy + hr * 0.13) + ' L ' + r1(hx + 4.5) + ' ' + r1(hy + hr * 0.13) + ' L ' + r1(hx) + ' ' + r1(hy + hr * 0.25) + ' Z', '#f2879f');
    if (t === 'pig') return E(hx, hy + hr * 0.26, hr * 0.26, hr * 0.18, '#f2a2b5') +
      E(hx - hr * 0.1, hy + hr * 0.26, 2.6, 3.6, '#d97b93') + E(hx + hr * 0.1, hy + hr * 0.26, 2.6, 3.6, '#d97b93');
    if (t === 'koala') return E(hx, hy + hr * 0.16, hr * 0.15, hr * 0.21, '#5b5560') + E(hx - hr * 0.05, hy + hr * 0.07, hr * 0.04, hr * 0.06, '#7d7787');
    if (t === 'beak') return PATH('M ' + r1(hx - hr * 0.15) + ' ' + r1(hy + hr * 0.1) + ' L ' + r1(hx) + ' ' + r1(hy + hr * 0.01) +
      ' L ' + r1(hx + hr * 0.15) + ' ' + r1(hy + hr * 0.1) + ' L ' + r1(hx) + ' ' + r1(hy + hr * 0.27) + ' Z', '#ff9f43',
      ' stroke="#f08a2e" stroke-width="1.5" stroke-linejoin="round"');
    if (t === 'dots') return C(hx - 3.5, hy + hr * 0.08, 1.8, P.noseC) + C(hx + 3.5, hy + hr * 0.08, 1.8, P.noseC);
    return '';
  }

  /* ─────────── 펫 전체 그리기 ─────────── */
  function petMarkup(spId, stage) {
    const P = SP[spId];
    const G = GEO[stage] || GEO[1];
    const hx = 100, bx = 100, hr = G.hr, brx = G.brx, bry = G.bry;
    const by = 172 - bry;                 // 몸 중심
    const hy = by - bry - hr * 0.5;       // 머리 중심 (몸과 반쯤 겹쳐 blob 느낌)
    const g = { hx, hy, hr, bx, by, brx, bry };
    const eyeX = P.eyesTop ? hr * 0.48 : hr * 0.36;
    const eyeY = P.eyesTop ? hy - hr * 0.82 : hy - hr * 0.05;
    const eyeR = hr * 0.15;
    const mw = P.wideMouth ? hr * 0.34 : hr * 0.19;
    const my = hy + hr * (P.mouthY || (P.muzzle ? 0.46 : 0.42));

    const b = [];
    // 그림자
    b.push(E(100, 184, G.sh, 7, 'rgba(93,74,60,.15)'));
    // 몸통 비율 래퍼 (성장 단계 크기) — CSS 애니메이션과 충돌하지 않게 바깥 그룹에 attr transform
    b.push('<g class="pa-scale" transform="translate(100 176) scale(' + G.s + ') translate(-100 -176)"><g class="pa-pet">');
    b.push(tail(P, bx, by, brx, bry));
    b.push(extraBack(P, g));
    b.push(earsBack(P, hx, hy, hr));
    if (P.extra === 'dolphin') { // 돌고래는 물 위에 떠 있다
      b.push(E(100, 172, brx + 22, 8, '#c9e9f8'));
      b.push(E(100, 172, brx + 8, 5, '#aadcf3'));
      b.push(C(bx - brx - 16, 158, 3, '#aadcf3'));
      b.push(C(bx + brx + 19, 154, 2.6, '#aadcf3'));
    }
    b.push(E(bx, by, brx, bry, P.body));                       // 몸
    if (P.feetC) {                                             // 발
      b.push(E(bx - brx * 0.5, 170, Math.max(9, brx * 0.3), 7, P.feetC));
      b.push(E(bx + brx * 0.5, 170, Math.max(9, brx * 0.3), 7, P.feetC));
    }
    b.push(extraBody(P, g));
    if (P.belly && P.extra !== 'shell') b.push(E(bx, by + bry * 0.18, brx * 0.6, bry * 0.58, P.belly)); // 배
    b.push(C(hx, hy, hr, P.body));                             // 머리
    b.push(earsFront(P, hx, hy, hr));
    b.push(extraHead(P, g));
    if (P.muzzle) b.push(E(hx, hy + hr * 0.32, hr * 0.42, hr * 0.3, P.muzzle)); // 주둥이
    // 볼 (햄스터는 볼주머니를 크게)
    if (P.pouches) {
      b.push(E(hx - hr * 0.58, hy + hr * 0.3, hr * 0.3, hr * 0.24, P.body));
      b.push(E(hx + hr * 0.58, hy + hr * 0.3, hr * 0.3, hr * 0.24, P.body));
      b.push(E(hx - hr * 0.58, hy + hr * 0.28, hr * 0.15, hr * 0.1, P.cheek, ' opacity=".7"'));
      b.push(E(hx + hr * 0.58, hy + hr * 0.28, hr * 0.15, hr * 0.1, P.cheek, ' opacity=".7"'));
    } else {
      b.push(E(hx - hr * 0.55, hy + hr * 0.28, hr * 0.17, hr * 0.11, P.cheek, ' opacity=".75"'));
      b.push(E(hx + hr * 0.55, hy + hr * 0.28, hr * 0.17, hr * 0.11, P.cheek, ' opacity=".75"'));
    }
    // 눈 (개구리는 머리 위 볼록 눈)
    let eyes = '';
    if (P.eyesTop) {
      eyes += C(hx - eyeX, eyeY, hr * 0.3, P.body) + C(hx + eyeX, eyeY, hr * 0.3, P.body);
    }
    const oneEye = ex =>
      (P.eyeRing ? C(ex, eyeY, eyeR + 3, '#fff') : '') +
      C(ex, eyeY, eyeR, EYE) +
      C(ex - eyeR * 0.32, eyeY - eyeR * 0.32, eyeR * 0.38, '#fff') +
      C(ex + eyeR * 0.3, eyeY + eyeR * 0.26, eyeR * 0.17, '#fff', ' opacity=".85"');
    const happyEye = ex =>
      STROKE('M ' + r1(ex - eyeR * 0.95) + ' ' + r1(eyeY + eyeR * 0.4) +
        ' Q ' + r1(ex) + ' ' + r1(eyeY - eyeR * 0.95) + ' ' + r1(ex + eyeR * 0.95) + ' ' + r1(eyeY + eyeR * 0.4), EYE, 3.5);
    eyes += '<g class="pa-eyes"><g class="pa-eye-open">' + oneEye(hx - eyeX) + oneEye(hx + eyeX) + '</g>' +
            '<g class="pa-eye-happy">' + happyEye(hx - eyeX) + happyEye(hx + eyeX) + '</g></g>';
    b.push(eyes);
    b.push(nose(P, hx, hy, hr));
    if (P.whiskers) { // 고양이 수염
      b.push(STROKE('M ' + r1(hx - hr * 0.62) + ' ' + r1(hy + hr * 0.1) + ' l ' + r1(-hr * 0.32) + ' -3', P.whiskers, 1.8));
      b.push(STROKE('M ' + r1(hx - hr * 0.62) + ' ' + r1(hy + hr * 0.22) + ' l ' + r1(-hr * 0.32) + ' 3', P.whiskers, 1.8));
      b.push(STROKE('M ' + r1(hx + hr * 0.62) + ' ' + r1(hy + hr * 0.1) + ' l ' + r1(hr * 0.32) + ' -3', P.whiskers, 1.8));
      b.push(STROKE('M ' + r1(hx + hr * 0.62) + ' ' + r1(hy + hr * 0.22) + ' l ' + r1(hr * 0.32) + ' 3', P.whiskers, 1.8));
    }
    // 입 (eat 연출이 d 를 바꾼다)
    b.push('<path class="pa-mouth" d="' + smileD(hx, my, mw) + '" fill="none" stroke="' + MOUTH_C +
           '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>');
    b.push('</g></g>');
    return { html: b.join(''), mouth: { x: hx, y: my, w: mw } };
  }

  /* ─────────── 입 모양 ─────────── */
  function smileD(x, y, w) {
    return 'M ' + r1(x - w) + ' ' + r1(y - w * 0.3) + ' Q ' + r1(x) + ' ' + r1(y + w * 0.7) + ' ' + r1(x + w) + ' ' + r1(y - w * 0.3);
  }
  const MOUTHS = {
    smile: (x, y, w) => ({ d: smileD(x, y, w), fill: 'none' }),
    open: (x, y, w) => ({ // 크게 벌린 입
      d: 'M ' + r1(x - w) + ' ' + r1(y - w * 0.5) + ' Q ' + r1(x) + ' ' + r1(y - w * 0.9) + ' ' + r1(x + w) + ' ' + r1(y - w * 0.5) +
         ' Q ' + r1(x + w * 1.05) + ' ' + r1(y + w * 1.2) + ' ' + r1(x) + ' ' + r1(y + w * 1.5) +
         ' Q ' + r1(x - w * 1.05) + ' ' + r1(y + w * 1.2) + ' ' + r1(x - w) + ' ' + r1(y - w * 0.5) + ' Z',
      fill: MOUTH_IN,
    }),
    chew1: (x, y, w) => ({ // 오물 (세로로)
      d: 'M ' + r1(x - w * 0.5) + ' ' + r1(y) + ' Q ' + r1(x) + ' ' + r1(y - w * 0.5) + ' ' + r1(x + w * 0.5) + ' ' + r1(y) +
         ' Q ' + r1(x) + ' ' + r1(y + w * 0.95) + ' ' + r1(x - w * 0.5) + ' ' + r1(y) + ' Z',
      fill: MOUTH_IN,
    }),
    chew2: (x, y, w) => ({ // 오물 (가로로)
      d: 'M ' + r1(x - w * 0.8) + ' ' + r1(y + w * 0.15) + ' Q ' + r1(x) + ' ' + r1(y - w * 0.15) + ' ' + r1(x + w * 0.8) + ' ' + r1(y + w * 0.15) +
         ' Q ' + r1(x) + ' ' + r1(y + w * 0.6) + ' ' + r1(x - w * 0.8) + ' ' + r1(y + w * 0.15) + ' Z',
      fill: MOUTH_IN,
    }),
    grin: (x, y, w) => ({ // 방긋
      d: 'M ' + r1(x - w * 1.15) + ' ' + r1(y - w * 0.5) + ' Q ' + r1(x) + ' ' + r1(y + w * 1.3) + ' ' + r1(x + w * 1.15) + ' ' + r1(y - w * 0.5),
      fill: 'none',
    }),
  };

  /* ─────────── 알 그리기 ─────────── */
  function eggMarkup(crack) {
    const c = Math.max(0, Math.min(1, Number(crack) || 0));
    const b = [];
    b.push(E(100, 184, 40, 7, 'rgba(93,74,60,.15)'));
    b.push('<g class="pa-egg">');
    b.push(PATH('M 100 62 C 128 62 140 96 140 126 C 140 156 122 172 100 172 C 78 172 60 156 60 126 C 60 96 72 62 100 62 Z',
      '#fdf6ea', ' stroke="#ecdcc4" stroke-width="2"'));
    // 파스텔 점박이
    b.push(E(86, 100, 7, 9, '#ffd9e4', rot(-15, 86, 100)));
    b.push(E(118, 138, 8, 10, '#cfe8ff', rot(12, 118, 138)));
    b.push(E(96, 151, 6, 7, '#ffeec2'));
    b.push(C(121, 98, 4, '#d9f0d3'));
    b.push(C(76, 132, 4.5, '#ffe1c9'));
    b.push(E(83, 86, 6, 11, '#fff', ' opacity=".65"' + rot(20, 83, 86)));
    // 금 (crack 이 커질수록 늘어난다)
    const cr = d => b.push(STROKE(d, '#c7b193', 2.5));
    if (c > 0.05) cr('M 96 74 L 103 82 L 97 90');
    if (c > 0.35) cr('M 103 82 L 112 88 L 106 97 L 115 104');
    if (c > 0.65) { cr('M 97 90 L 88 99 L 95 108'); cr('M 106 97 L 100 108 L 107 117'); }
    if (c > 0.9) { cr('M 95 108 L 90 120 L 99 128'); cr('M 78 102 L 86 110'); cr('M 115 104 L 122 114'); }
    b.push('</g>');
    return b.join('');
  }

  /* ─────────── 아바타 인스턴스 ─────────── */
  function create(container) {
    ensureStyle();
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 200 200');
    svg.setAttribute('class', 'pa-svg');
    svg.setAttribute('aria-hidden', 'true');
    container.appendChild(svg);

    let destroyed = false, eating = false, idleOn = false;
    let cur = null, mouth = null;
    let jitterT = null, blinkT = null;
    const timers = new Set();

    function after(ms, fn) {
      const t = setTimeout(() => { timers.delete(t); if (!destroyed) fn(); }, ms);
      timers.add(t);
      return t;
    }
    // 클래스를 잠깐 붙였다 떼서 CSS 애니메이션 한 번 재생
    function flash(cls, dur) {
      if (destroyed) return;
      svg.classList.remove(cls);
      void svg.getBoundingClientRect(); // 강제 리플로우 — 같은 클래스를 연달아 붙여도 애니메이션이 다시 돈다
      svg.classList.add(cls);
      after(dur, () => svg.classList.remove(cls));
    }
    function setMouth(kind) {
      const el = svg.querySelector('.pa-mouth');
      if (!el || !mouth) return;
      const m = MOUTHS[kind](mouth.x, mouth.y, mouth.w);
      el.setAttribute('d', m.d);
      el.setAttribute('fill', m.fill);
    }
    function spawnParticle(ch, x, y, size) {
      const fx = svg.querySelector('.pa-fx');
      if (!fx) return;
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', r1(x));
      t.setAttribute('y', r1(y));
      t.setAttribute('font-size', r1(size));
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('class', 'pa-particle');
      t.textContent = ch;
      fx.appendChild(t);
      after(1400, () => { if (t.parentNode) t.parentNode.removeChild(t); });
    }
    const isEgg = () => !cur || cur.species === 'egg' || !SP[cur.species];

    /* 그리기 — 다시 그려도 idle 스케줄러·CSS 애니메이션은 그대로 이어진다 */
    function render(opts) {
      if (destroyed) return;
      opts = opts || {};
      cur = { species: opts.species || 'egg', stage: opts.stage || 1, crack: opts.crack || 0 };
      mouth = null;
      let inner;
      if (isEgg()) inner = eggMarkup(cur.crack);
      else {
        const m = petMarkup(cur.species, Math.max(1, Math.min(3, cur.stage | 0)));
        inner = m.html;
        mouth = m.mouth;
      }
      svg.innerHTML = inner + '<g class="pa-fx"></g>';
    }

    /* 먹기: 크게 벌림 → 오물오물 (3번 바뀜) → 방긋 */
    function eat(done) {
      const fin = () => { if (typeof done === 'function') done(); };
      if (destroyed) { fin(); return; }
      if (eating) { fin(); return; }
      if (isEgg()) { flash('pa-hop', 650); after(700, fin); return; } // 알은 폴짝 흔들리기만
      eating = true;
      svg.classList.add('pa-eat');
      setMouth('open');
      after(400, () => setMouth('chew1'));
      after(600, () => setMouth('chew2'));
      after(800, () => setMouth('chew1'));
      after(1000, () => setMouth('chew2'));
      after(1180, () => { svg.classList.remove('pa-eat'); setMouth('grin'); });
      after(1750, () => { setMouth('smile'); eating = false; fin(); });
    }

    /* 하트 뿅뿅 + ^^ 눈으로 통통 */
    function happy() {
      if (destroyed) return;
      flash('pa-happy', 1700);
      const HEARTS = ['❤️', '💕', '💖', '💛'];
      for (let i = 0; i < 6; i++) {
        after(i * 130, () => spawnParticle(HEARTS[i % HEARTS.length], 100 + (Math.random() * 64 - 32), 92 + Math.random() * 40, 15 + Math.random() * 9));
      }
    }

    /* 진화·축하: 크게 점프 + 반짝 */
    function celebrate() {
      if (destroyed) return;
      flash('pa-cele', 1550);
      if (!isEgg() && !eating) { setMouth('grin'); after(1600, () => { if (!eating) setMouth('smile'); }); }
      const SPARKS = ['✨', '⭐', '🌟', '💫'];
      for (let i = 0; i < 8; i++) {
        after(i * 100, () => spawnParticle(SPARKS[i % SPARKS.length], 100 + (Math.random() * 90 - 45), 70 + Math.random() * 70, 13 + Math.random() * 10));
      }
    }

    /* 잔동작 스케줄러: 2~5초마다 귀 쫑긋/꼬리 살랑/두리번/폴짝 중 랜덤 */
    function doJitter() {
      if (destroyed || eating) return;
      if (isEgg()) { flash('pa-hop', 650); return; } // 알은 가끔 폴짝
      const acts = ['look', 'hop'];
      if (svg.querySelector('.pa-ear-l')) acts.push('twitch');
      if (svg.querySelector('.pa-tail')) acts.push('wag');
      const a = acts[Math.floor(Math.random() * acts.length)];
      flash('pa-' + a, a === 'look' ? 1750 : a === 'wag' ? 950 : 700);
    }
    function loopJitter() {
      if (!idleOn || destroyed) return;
      jitterT = after(2000 + Math.random() * 3000, () => { doJitter(); loopJitter(); });
    }
    function loopBlink() {
      if (!idleOn || destroyed) return;
      blinkT = after(1600 + Math.random() * 2600, () => {
        if (!isEgg()) flash('pa-blink', 300);
        loopBlink();
      });
    }
    function startIdle() {
      if (idleOn || destroyed) return;
      idleOn = true;
      loopJitter();
      loopBlink();
    }
    function stopIdle() {
      idleOn = false;
      if (jitterT) { clearTimeout(jitterT); timers.delete(jitterT); jitterT = null; }
      if (blinkT) { clearTimeout(blinkT); timers.delete(blinkT); blinkT = null; }
    }

    function destroy() {
      destroyed = true;
      idleOn = false;
      timers.forEach(clearTimeout);
      timers.clear();
      if (svg.parentNode) svg.parentNode.removeChild(svg);
    }

    startIdle(); // 만들자마자 살아 움직인다 (원하면 stopIdle 로 끈다)
    return { render, eat, happy, celebrate, startIdle, stopIdle, destroy };
  }

  return { create };
})();
