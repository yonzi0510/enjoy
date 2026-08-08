/* 프랙티카 놀이터 — 아이가 그린 손그림 아이콘
 *
 * 낙서장 화면에서 UI 이모지(⭐💎🎤🔊💡🔒🏠…)는 시스템 글꼴이 그린 매끈한 그림이라
 * 손그림 종이 위에서 혼자 튄다. 그래서 같은 뜻의 그림을 아이 손으로 다시 그렸다.
 *
 * 그리는 규칙 셋 —
 *  1) 굵고 고른 획 — stroke-width 5~8, 끝은 둥글게(round). 가늘어졌다 굵어졌다 하지 않는다.
 *  2) 삐뚤한 선 — feTurbulence + feDisplacementMap 으로 획을 실제로 떨리게 한다
 *     (선례: shared/home-button.js). 자로 그은 티가 사라진다.
 *  3) 칠은 선 밖으로 — 색 덩어리를 윤곽선에서 몇 픽셀 밀고 살짝 돌려 색이 삐져나오게 한다.
 *
 * 쓰는 법 —
 *   HTML: <span data-ico="star"></span>       이 파일이 읽어 들여 채운다
 *   JS:   el.innerHTML = PkIcons.svg('lock');
 *
 * 놀잇감 그림(트랙·레슨 이모지)은 레슨 데이터라서 손대지 않는다. UI 부품만 바꾼다.
 */
(() => {
  const INK = '#2E2A24';

  /* 깃발 천 — 국기 세 장이 같은 모양을 쓴다 (clipPath 도 이 모양으로 한 번만 만든다) */
  const CLOTH = 'M24 20H86V54Q68 62 46 56Q34 52 24 58Z';

  /* 획을 떨게 하는 필터 셋 — 아이콘마다 다른 걸 써야 같은 손버릇이 되풀이되지 않는다.
     문서에 한 번만 심어 두고 모든 아이콘이 url(#…) 로 함께 쓴다. */
  const DEFS = `<svg class="pk-defs" aria-hidden="true" focusable="false"><defs>
  <clipPath id="pk-cloth"><path d="${CLOTH}"/></clipPath>
  <filter id="pk-wob1" x="-22%" y="-22%" width="144%" height="144%">
    <feTurbulence type="fractalNoise" baseFrequency="0.036" numOctaves="2" seed="3"/>
    <feDisplacementMap in="SourceGraphic" scale="3.2"/>
  </filter>
  <filter id="pk-wob2" x="-22%" y="-22%" width="144%" height="144%">
    <feTurbulence type="fractalNoise" baseFrequency="0.044" numOctaves="2" seed="8"/>
    <feDisplacementMap in="SourceGraphic" scale="2.8"/>
  </filter>
  <filter id="pk-wob3" x="-22%" y="-22%" width="144%" height="144%">
    <feTurbulence type="fractalNoise" baseFrequency="0.030" numOctaves="2" seed="12"/>
    <feDisplacementMap in="SourceGraphic" scale="3.6"/>
  </filter>
</defs></svg>`;

  /* 아이콘 한 장 = [삐져나온 칠, 떨리는 윤곽선] 두 겹.
     wob 은 쓸 필터 번호, w 는 기본 획 굵기. */
  const ICONS = {
    /* ⭐ 별 — 모은 별(XP). 아이가 그린 별은 잘 안 닫혀서 끝을 조금 지나치게 그었다 */
    star: { wob: 2, w: 6.5, fill:
      `<path d="M50 16L58.8 39.9L84.2 40.9L64.3 56.6L71.2 81.1L50 67L28.8 81.1L35.7 56.6L15.8 40.9L41.2 39.9Z"
             fill="#FFD34D" transform="translate(4 6) rotate(5 50 52)"/>`,
      line: `<path d="M50 16L58.8 39.9L84.2 40.9L64.3 56.6L71.2 81.1L50 67L28.8 81.1L35.7 56.6L15.8 40.9L41.2 39.9L46.4 20"/>` },

    /* 💎 보석 — 모은 젬 */
    gem: { wob: 1, w: 6, fill:
      `<path d="M50 20L80 42L50 84L20 42Z" fill="#8FE0F0" transform="translate(-5 6) rotate(-4 50 52)"/>`,
      line: `<path d="M50 20L80 42L50 84L20 42Z"/>
             <path d="M20 42H80" stroke-width="4.5"/>
             <path d="M50 20L37 42M50 20L63 42" stroke-width="4.5"/>` },

    /* 🎤 마이크 — 말하기 단추와 제목에 쓴다 */
    mic: { wob: 1, w: 6, fill:
      `<rect x="36" y="16" width="28" height="42" rx="14" fill="#FFA8C8" transform="translate(-5 6) rotate(-4 50 40)"/>`,
      line: `<rect x="36" y="16" width="28" height="42" rx="14"/>
             <path d="M26 46a24 24 0 0 0 48 0"/>
             <path d="M50 70v14"/>
             <path d="M34 86h32" stroke-width="5.5"/>` },

    /* 🔊 스피커 — 다시 듣기 */
    speaker: { wob: 2, w: 6, fill:
      `<path d="M20 40h14l16-14v48L34 60H20z" fill="#9FD8F0" transform="translate(-5 6) rotate(-3 46 50)"/>`,
      line: `<path d="M21 41h13l16-14v46L34 59H21z"/>
             <path d="M62 38q10 12 0 24M75 30q14 20 0 40" stroke-width="5"/>` },

    /* 💡 전구 — 힌트 보기 */
    bulb: { wob: 3, w: 6, fill:
      `<circle cx="50" cy="44" r="21" fill="#FFE07A" transform="translate(-5 6) rotate(-3 50 44)"/>`,
      line: `<path d="M31 50a19 19 0 1 1 38 0c0 8-5 12-6 18H37c-1-6-6-10-6-18z"/>
             <path d="M39 78h22M43 86h14" stroke-width="5"/>` },

    /* 🗂️ 낱말 카드 두 장 — 어휘 복습 */
    cards: { wob: 1, w: 5.5, fill:
      `<rect x="30" y="34" width="52" height="46" rx="8" fill="#C7B9F2" transform="translate(-6 6) rotate(5 56 57)"/>`,
      line: `<rect x="20" y="20" width="52" height="46" rx="8" transform="rotate(-9 46 43)"/>
             <rect x="30" y="34" width="52" height="46" rx="8" transform="rotate(5 56 57)"/>
             <path d="M42 52h28M42 64h18" stroke-width="4.5" transform="rotate(5 56 57)"/>` },

    /* 🔒 자물쇠 — 아직 안 열린 레슨 */
    lock: { wob: 2, w: 6, fill:
      `<rect x="26" y="46" width="48" height="38" rx="9" fill="#FFD98A" transform="translate(-5 6) rotate(-3 50 65)"/>`,
      line: `<rect x="26" y="46" width="48" height="38" rx="9"/>
             <path d="M38 46V36a12 12 0 0 1 24 0v10"/>
             <path d="M50 62v10" stroke-width="5"/>
             <circle cx="50" cy="60" r="4.5" fill="${INK}"/>` },

    /* 🏠 집 — 코스로·처음으로 (shared/home-button.js 의 집과 같은 손) */
    house: { wob: 3, w: 8, fill: '',
      line: `<path d="M11 51L50 14L89 51"/>
             <path d="M22 46L23 84L78 83L77 45"/>
             <path d="M41 84L40 60L60 59L61 83" fill="#F6C453" stroke-width="6"/>` },

    /* ◀ 뒤로 */
    back: { wob: 2, w: 8, fill: '', line: `<path d="M64 20L34 50L64 80"/>` },

    /* 🗣️ 말풍선 — 목소리 설정 */
    speak: { wob: 3, w: 6, fill:
      `<path d="M16 24h68v40H44L28 82V64H16z" fill="#C9C0F5" transform="translate(-5 6) rotate(-3 50 50)"/>`,
      line: `<path d="M18 26h64v38H45L30 80V64H18z"/>
             <path d="M32 40h36M32 52h22" stroke-width="5"/>` },
  };

  /* 국기 — 언어 고르기 칸. 깃대에 매단 천 한 장으로 단순하게 그린다.
     데이터(lessons.js)의 flag 이모지는 그대로 두고, 화면에만 손그림을 쓴다. */
  const FLAGS = {
    en: `<path d="${CLOTH}" fill="#FFFFFF"/>
         <g clip-path="url(#pk-cloth)">
           <path d="M24 26H86M24 37H86M24 48H86" stroke="#E23A3A" stroke-width="6" fill="none"/>
           <path d="M24 20H52V40H24z" fill="#3A5BC7"/>
           <circle cx="33" cy="28" r="2.6" fill="#fff"/><circle cx="44" cy="28" r="2.6" fill="#fff"/>
           <circle cx="38" cy="35" r="2.6" fill="#fff"/>
         </g>`,
    ja: `<path d="${CLOTH}" fill="#FFFFFF"/><circle cx="56" cy="38" r="13" fill="#E23A3A"/>`,
    zh: `<path d="${CLOTH}" fill="#E23A3A"/>
         <path d="M42 24L44.7 31.3L52.5 31.6L46.4 36.4L48.5 43.9L42 39.6L35.5 43.9L37.6 36.4L31.5 31.6L39.3 31.3Z" fill="#FFD34D"/>
         <circle cx="61" cy="29" r="2.6" fill="#FFD34D"/><circle cx="65" cy="36" r="2.6" fill="#FFD34D"/>
         <circle cx="61" cy="43" r="2.6" fill="#FFD34D"/>`,
  };

  function wrap(inner, extraClass) {
    return `<svg class="pk-ico${extraClass ? ' ' + extraClass : ''}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${inner}</svg>`;
  }

  function svg(name) {
    const ic = ICONS[name];
    if (!ic) return '';
    return wrap(
      (ic.fill || '') +
      `<g filter="url(#pk-wob${ic.wob})" fill="none" stroke="${INK}" stroke-width="${ic.w}"` +
      ` stroke-linecap="round" stroke-linejoin="round">${ic.line}</g>`);
  }

  function flag(lang) {
    const cloth = FLAGS[lang];
    if (!cloth) return '';
    return wrap(
      `<g transform="translate(-4 5) rotate(-3 55 40)">${cloth}</g>` +
      `<g filter="url(#pk-wob2)" fill="none" stroke="${INK}" stroke-width="5.5"` +
      ` stroke-linecap="round" stroke-linejoin="round">` +
      `<path d="M18 14v76"/><path d="${CLOTH}"/></g>`, 'pk-flag');
  }

  /* HTML 에 심어 둔 <span data-ico="…"> 자리를 채운다 */
  function paint(root) {
    (root || document).querySelectorAll('[data-ico]').forEach(el => {
      const m = svg(el.dataset.ico);
      if (m) el.innerHTML = m;
    });
  }

  window.PkIcons = { svg, flag, paint };

  const host = document.createElement('div');
  host.className = 'pk-defs-host';
  host.innerHTML = DEFS;
  (document.body || document.documentElement).appendChild(host);
  paint(document);
})();
