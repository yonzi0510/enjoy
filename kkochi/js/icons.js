/* 손그림 UI 아이콘 — 「낙서장」 시안
 *
 * 왜 만들었나 — 화면 틀에 쓰던 이모지(⭐ 🔊 ◀ ✅ 👉 🧑‍🍳 🗣️ 🍢)는 기기마다
 * 제각각 반들반들한 그림으로 그려진다. 종이 위에 크레용으로 그린 화면에
 * 그것만 스티커처럼 떠 보여서, 아이가 그린 것 같은 굵은 획 SVG 로 바꾼다.
 *
 * 삐뚤한 선은 feTurbulence + feDisplacementMap 으로 낸다(shared/home-button.js 와 같은 방식).
 * 필터 정의는 문서에 딱 한 번만 넣고 모든 아이콘이 같은 id 를 가리킨다.
 *
 * ⚠️ **재료 그림(js/data.js 의 ING.draw)은 절대 여기로 가져오지 않는다.**
 *    재료는 화면 틀이 아니라 아이가 순서를 외우는 놀잇감이라 그대로 둔다.
 *
 * 쓰는 법
 *   HTML: <span data-ico="star"></span>  → 문서가 뜰 때 자동으로 채워진다
 *   JS  : KkochiIcons.get('star')        → SVG 문자열
 */
window.KkochiIcons = (() => {
  const INK = '#2E2A24';

  /* 획을 떨리게 하는 필터 — 큰 아이콘용/작은 아이콘용 두 벌 */
  const DEFS = `
<svg class="kk-defs" aria-hidden="true" focusable="false"
     style="position:absolute;width:0;height:0;overflow:hidden">
  <defs>
    <filter id="kk-kid" x="-18%" y="-18%" width="136%" height="136%">
      <feTurbulence type="fractalNoise" baseFrequency="0.032" numOctaves="2" seed="7"/>
      <feDisplacementMap in="SourceGraphic" scale="3.1"/>
    </filter>
    <filter id="kk-kid-sm" x="-18%" y="-18%" width="136%" height="136%">
      <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="3"/>
      <feDisplacementMap in="SourceGraphic" scale="2"/>
    </filter>
  </defs>
</svg>`;

  /* 아이콘 한 장 — 획 굵기·마감을 고르게 해서 "굵고 고른 손획"으로 보이게 한다 */
  function wrap(inner, opt) {
    const o = opt || {};
    return '<svg class="kk-ico' + (o.cls ? ' ' + o.cls : '') + '" viewBox="0 0 100 100" ' +
      'aria-hidden="true" focusable="false">' +
      '<g filter="url(#' + (o.sm ? 'kk-kid-sm' : 'kk-kid') + ')" fill="none" stroke="' + INK + '" ' +
      'stroke-width="' + (o.w || 7) + '" stroke-linecap="round" stroke-linejoin="round">' +
      inner + '</g></svg>';
  }

  /* 낙서장 아이콘들 — 자를 대지 않고 그은 듯 좌우가 살짝 어긋나 있다 */
  const ART = {
    /* ⭐ 별 — 다섯 살이 그리는 삐뚤한 별 */
    star: () => wrap(
      '<path d="M50 11 L61 38 L90 40 L67 58 L75 88 L50 71 L25 87 L33 58 L11 40 L39 38 Z" fill="#FFD34E"/>',
      { w: 7 }),

    /* 🍢 꼬치 — 막대에 알 셋 (놀이 안의 '재료'가 아니라 가게 간판 그림이다) */
    skewer: () => wrap(
      '<path d="M50 5 L51 95" stroke-width="6"/>' +
      '<circle cx="50" cy="24" r="15" fill="#F4A24A"/>' +
      '<path d="M35 45 L66 44 L67 68 L34 69 Z" fill="#8FC94B"/>' +
      '<circle cx="50" cy="84" r="14" fill="#EE7B5A"/>',
      { w: 6.5 }),

    /* 🧑‍🍳 요리사 모자 */
    chef: () => wrap(
      '<path d="M26 55 C10 51 13 27 30 29 C34 12 68 12 71 29 C88 27 91 51 75 55 Z" fill="#FFFFFF"/>' +
      '<path d="M28 55 L28 80 L73 80 L73 55" fill="#FFFFFF"/>' +
      '<path d="M29 68 L72 68" stroke-width="5"/>',
      { w: 6.5 }),

    /* 🔊 소리 — 네모 나팔에 소리 줄 둘 */
    speaker: () => wrap(
      '<path d="M16 40 L33 39 L52 22 L53 79 L33 61 L15 60 Z" fill="#FFD34E"/>' +
      '<path d="M66 36 C77 46 76 55 65 65"/>' +
      '<path d="M79 24 C95 43 95 58 78 76"/>',
      { w: 7 }),

    /* ◀ 뒤로 — 왼쪽으로 꺾어 그은 화살표 */
    back: () => wrap('<path d="M64 15 L29 50 L64 85"/>', { w: 10, sm: true }),

    /* ▶ 다음 — 오른쪽으로 꺾어 그은 화살표 */
    next: () => wrap(
      '<path d="M13 50 L84 51" stroke="#C96A16"/>' +
      '<path d="M58 24 L85 50 L57 76" stroke="#C96A16"/>',
      { w: 10, sm: true }),

    /* ✅ 다 했어요 */
    check: () => wrap('<path d="M18 53 L41 78 L83 24" stroke="#3E9E4B"/>', { w: 11, sm: true }),

    /* 👉 여기야 — 다음에 꿸 재료를 가리키는 화살표(왼쪽 = 그림 쪽) */
    arrow: () => wrap(
      '<path d="M88 50 L16 51" stroke="#E1852C"/>' +
      '<path d="M42 24 L15 50 L43 76" stroke="#E1852C"/>',
      { w: 10, sm: true }),

    /* 🗣️ 목소리 — 얼굴 옆모습에 소리 줄 */
    voice: () => wrap(
      '<circle cx="38" cy="47" r="25" fill="#FFDCAB"/>' +
      '<circle cx="30" cy="40" r="3" fill="' + INK + '" stroke="none"/>' +
      '<path d="M28 58 C36 68 50 64 52 55" stroke-width="5.5"/>' +
      '<path d="M72 33 C82 44 82 55 71 66" stroke-width="6"/>' +
      '<path d="M86 22 C99 41 99 58 85 77" stroke-width="6"/>',
      { w: 6.5 }),
  };

  const get = name => (ART[name] ? ART[name]() : '');

  /* data-ico 를 단 자리를 전부 채운다 */
  function paint(root) {
    (root || document).querySelectorAll('[data-ico]').forEach(el => {
      const svg = get(el.dataset.ico);
      if (svg) el.innerHTML = svg;
    });
  }

  /* 필터 정의는 **지금 바로** 넣는다 — app.js 가 그리기 시작하기 전에 있어야
     아이콘의 filter="url(#kk-kid)" 참조가 처음부터 살아 있다. */
  const host = document.body || document.documentElement;
  if (!document.querySelector('.kk-defs')) host.insertAdjacentHTML('afterbegin', DEFS);

  /* data-ico 자리 채우기는 문서를 다 읽은 뒤 */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => paint(document));
  else paint(document);

  return { get, paint };
})();
