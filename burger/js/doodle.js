/* 손그림 UI 아이콘 — 「낙서장」 디자인용.
 *
 * 이모지(⭐ 🔊 ◀ ✅ …)는 기기마다 다른 그림이 나오고, 낙서장 종이 위에서는
 * 혼자 반질반질하게 튄다. 그래서 UI 표시는 다섯 살이 그린 것 같은 인라인 SVG로 바꾼다.
 * 굵고 고른 획 + feTurbulence·feDisplacementMap 으로 선을 실제로 떨리게 한다
 * (같은 방식: shared/home-button.js).
 *
 * ⚠️ 재료 그림(빵·패티·치즈…)은 여기에 넣지 않는다 — 아이가 순서를 외우는 놀잇감이라
 *    js/data.js 의 그림을 그대로 쓴다.
 *
 * 쓰는 법
 *   HTML:  <span class="dd-ic" data-dd="star"></span>   → 불러오면 자동으로 채워진다
 *   JS:    el.innerHTML = Doodle.icon('check');          → 통째로 만들어 넣는다
 */
window.Doodle = (() => {
  const INK = '#2E2A24';

  /* 떨림 필터 3종 — 아이콘마다 다른 씨앗을 줘서 같은 손이지만 매번 다르게 떨리게 */
  const DEFS = `
<svg class="dd-defs" width="0" height="0" aria-hidden="true" focusable="false"
     style="position:absolute;width:0;height:0;overflow:hidden">
  <defs>
    <filter id="bg-wob1" x="-25%" y="-25%" width="150%" height="150%">
      <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/>
      <feDisplacementMap in="SourceGraphic" scale="2.4"/>
    </filter>
    <filter id="bg-wob2" x="-25%" y="-25%" width="150%" height="150%">
      <feTurbulence type="fractalNoise" baseFrequency="0.026" numOctaves="2" seed="9"/>
      <feDisplacementMap in="SourceGraphic" scale="3"/>
    </filter>
    <filter id="bg-wob3" x="-25%" y="-25%" width="150%" height="150%">
      <feTurbulence type="fractalNoise" baseFrequency="0.038" numOctaves="2" seed="17"/>
      <feDisplacementMap in="SourceGraphic" scale="2"/>
    </filter>
  </defs>
</svg>`;

  // 아이콘 하나 = [떨림 필터 번호, 획 그림]
  const ART = {
    /* ⭐ 별 — 삐뚤빼뚤 다섯 꼭짓점 */
    star: [1, `
      <path d="M50 9 L62 37 L92 40 L69 60 L77 91 L50 74 L23 91 L31 60 L8 40 L38 37 Z"
            fill="#F6C453" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>`],

    /* 🗣️ 말하기 — 말풍선에 말 두 줄 */
    speak: [2, `
      <path d="M11 21 Q11 14 19 14 H81 Q89 14 89 21 V57 Q89 64 81 64 H45 L26 83 L30 64 H19 Q11 64 11 57 Z"
            fill="#FFF6E2" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
      <path d="M31 33 H70" stroke="#E24B3B" stroke-width="7" stroke-linecap="round"/>
      <path d="M31 47 H57" stroke="#E24B3B" stroke-width="7" stroke-linecap="round"/>`],

    /* ◀ 뒤로 — 왼쪽으로 꺾어 그은 화살표 */
    back: [3, `
      <path d="M64 13 L25 50 L64 87" fill="none" stroke="${INK}"
            stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`],

    /* 🔊 듣기 — 나팔에 소리 두 줄 */
    listen: [1, `
      <path d="M11 38 H31 L53 19 V81 L31 62 H11 Z"
            fill="#F6C453" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
      <path d="M66 34 Q77 50 66 66" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
      <path d="M80 21 Q96 50 80 79" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`],

    /* 🧑‍🍳 요리사 모자 */
    chef: [2, `
      <path d="M28 57 C9 55 9 32 27 31 C27 13 73 13 73 31 C91 32 91 55 72 57 Z"
            fill="#FFFDF6" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
      <path d="M28 57 H72 V81 H28 Z" fill="#FFFDF6" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
      <path d="M41 63 V75 M60 63 V75" stroke="${INK}" stroke-width="4" stroke-linecap="round" opacity=".45"/>`],

    /* ✅ 다 했어요 — 크게 그은 초록 체크 */
    check: [3, `
      <path d="M15 51 L40 77 L87 19" fill="none" stroke="#4FA83D"
            stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>`],

    /* 👉 이번 차례 — 오른쪽을 가리키는 화살표 */
    point: [1, `
      <path d="M9 50 H70" stroke="#E24B3B" stroke-width="12" stroke-linecap="round"/>
      <path d="M52 25 L87 50 L52 75" fill="none" stroke="#E24B3B"
            stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`],

    /* 🍽️ 아직 안 만든 미션 — 빈 접시 */
    plate: [2, `
      <circle cx="50" cy="50" r="36" fill="#FFFDF6" stroke="${INK}" stroke-width="7"/>
      <circle cx="50" cy="50" r="21" fill="none" stroke="${INK}" stroke-width="4" opacity=".5"/>`],

    /* ▶ 다음 — 오른쪽으로 꺾어 그은 화살표 (back 의 거울) */
    fwd: [3, `
      <path d="M36 13 L75 50 L36 87" fill="none" stroke="${INK}"
            stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`],

    /* 🍔 햄버거 — 제목·축하용 낙서 (놀이판의 재료 그림과는 별개) */
    burger: [2, `
      <path d="M13 46 C13 20 87 20 87 46 Z" fill="#F3B95F" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
      <g fill="#FFF3D6"><ellipse cx="37" cy="34" rx="4.2" ry="2.5"/><ellipse cx="56" cy="30" rx="4.2" ry="2.5"/><ellipse cx="70" cy="38" rx="4.2" ry="2.5"/></g>
      <path d="M9 53 Q20 44 30 53 Q40 62 50 53 Q60 44 70 53 Q80 62 91 53"
            fill="none" stroke="#6FB233" stroke-width="7" stroke-linecap="round"/>
      <path d="M17 64 H83" stroke="#8A5A33" stroke-width="10" stroke-linecap="round"/>
      <path d="M13 73 C13 87 87 87 87 73 Z" fill="#F3B95F" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`],
  };

  /* 동그라미 친 숫자 ①②③… — 기기마다 모양이 다른 기호 글자 대신 직접 그린다.
     쌓는 차례를 가리키므로 1~9 만 있으면 된다. */
  const DIGIT = {
    1: 'M39 33 L51 22 L51 78',
    2: 'M31 34 Q39 21 54 25 Q70 31 55 48 L33 76 H71',
    3: 'M33 27 Q56 17 61 33 Q64 47 45 51 Q65 54 62 68 Q57 83 31 74',
    4: 'M61 79 V21 L27 61 H72',
    5: 'M65 24 H38 L33 49 Q57 39 63 55 Q67 72 47 79 Q35 80 29 71',
    6: 'M62 23 Q33 33 31 57 Q31 79 50 79 Q67 79 67 63 Q67 48 50 48 Q35 49 32 61',
    7: 'M29 26 H71 L43 79',
    8: 'M50 22 Q31 22 32 35 Q33 47 50 50 Q68 53 68 66 Q68 79 50 79 Q32 79 32 66 Q32 53 50 50 Q67 47 68 35 Q68 22 50 22',
    9: 'M38 77 Q67 67 69 43 Q69 21 50 21 Q33 21 33 37 Q33 52 50 52 Q65 51 68 39',
  };
  function num(n) {
    const d = DIGIT[n];
    if (!d) return '';
    return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">' +
      '<g filter="url(#bg-wob1)" fill="none" stroke="#C0553E" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="50" cy="50" r="41" stroke-width="6"/>' +
      '<path d="' + d + '" stroke-width="9"/></g></svg>';
  }

  /** 아이콘 SVG 문자열. name 이 없으면 빈 문자열 */
  function svg(name) {
    const a = ART[name];
    if (!a) return '';
    return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">' +
      '<g filter="url(#bg-wob' + a[0] + ')">' + a[1] + '</g></svg>';
  }

  /** 글 사이에 끼워 넣을 아이콘 한 덩어리 (span 으로 감싼 것) */
  function icon(name, extraClass) {
    return '<span class="dd-ic' + (extraClass ? ' ' + extraClass : '') + '" aria-hidden="true">' + svg(name) + '</span>';
  }

  /** HTML 에 미리 적어 둔 <span data-dd="..."> 를 한꺼번에 채운다 */
  function fill(root) {
    (root || document).querySelectorAll('[data-dd]').forEach(el => {
      el.innerHTML = svg(el.dataset.dd);
      el.setAttribute('aria-hidden', 'true');
    });
  }

  // 떨림 필터는 문서에 딱 한 번만 심는다
  function mount() {
    if (document.querySelector('.dd-defs')) return;
    const box = document.createElement('div');
    box.innerHTML = DEFS;
    (document.body || document.documentElement).appendChild(box.firstElementChild);
  }
  mount();
  fill(document);

  return { svg, icon, num, fill };
})();
