/* 손그림 아이콘 — 화면 틀의 이모지(⭐🔔🔊🗣️◀🥤)를 아이가 그린 듯한 인라인 SVG 로 바꾼다.
 *
 * 왜 — 「낙서장」 시안에서 이모지만 반질반질한 스티커처럼 남으면 종이 위에 붙은 이물질이 된다.
 * 그래서 굵고 고른 획 + 삐뚤한 선으로 다시 그린다.
 * 떨림은 공용 집 단추(shared/home-button.js)와 같은 방식 — feTurbulence + feDisplacementMap.
 * 필터는 문서에 딱 하나만 두고(#cups-kd) 모든 아이콘이 같은 것을 참조한다(저사양 기기 배려).
 *
 * ⚠️ 여기서 **컵 색은 절대 만들지 않는다.** 색 컵은 js/data.js 의 cupSVG 가 그대로 그린다 —
 *    색 맞추기가 곧 놀이라서 색을 바꾸면 놀이가 망가진다.
 *    이 파일의 컵 아이콘은 색 없는 윤곽선(제목·배지용 표시)일 뿐이다.
 *
 * 쓰는 법
 *   · 정적 화면: <span data-icon="star"></span>  (이 스크립트가 읽어서 채운다)
 *   · 동적 생성: CupsIcons.html('star')          (문자열을 그대로 innerHTML 에)
 */
window.CupsIcons = (() => {
  const INK = '#2E2A24';      /* 연필심 */
  const PAPER = '#FFFDF6';    /* 종이 — 획 안쪽을 살짝 채운다 */
  const GOLD = '#F6C453';     /* 별·종의 노란 크레용 칠 */

  /* 획을 실제로 떨리게 하는 필터 한 장 (문서 전체 공용) */
  const FILTER = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <filter id="cups-kd" x="-16%" y="-16%" width="132%" height="132%">
      <feTurbulence type="fractalNoise" baseFrequency="0.038" numOctaves="2" seed="5"/>
      <feDisplacementMap in="SourceGraphic" scale="2.8"/>
    </filter>
  </defs>
</svg>`;

  /* 아이콘 속살 — 전부 viewBox 0 0 100 100, 굵기 고른 획 */
  const PARTS = {
    /* ⭐ 별 — 별 개수·완성 배지 */
    star: `<path d="M50,13 L61,38 L88,41 L68,60 L74,87 L50,73 L26,87 L32,60 L12,41 L39,38 Z"
             fill="${GOLD}" stroke="${INK}" stroke-width="7"/>`,

    /* 🔔 종 — 완성 축하·본보기 카드 머리 */
    bell: `<path d="M50,16 L50,9" stroke="${INK}" stroke-width="7"/>
           <circle cx="50" cy="10" r="6" fill="${GOLD}" stroke="${INK}" stroke-width="6"/>
           <path d="M26,70 C26,36 35,20 50,20 C65,20 74,36 74,70 Z"
             fill="${GOLD}" stroke="${INK}" stroke-width="7"/>
           <path d="M19,71 L81,71" stroke="${INK}" stroke-width="8"/>
           <circle cx="50" cy="83" r="7" fill="${PAPER}" stroke="${INK}" stroke-width="6"/>`,

    /* 🔊 스피커 — 듣기 단추 */
    speaker: `<path d="M14,40 L32,40 L52,23 L52,77 L32,60 L14,60 Z"
                fill="${PAPER}" stroke="${INK}" stroke-width="7"/>
              <path d="M65,37 Q73,50 65,63" stroke="${INK}" stroke-width="7"/>
              <path d="M79,27 Q92,50 79,73" stroke="${INK}" stroke-width="7"/>`,

    /* 🗣️ 말하기 — 목소리 설정 단추 */
    voice: `<path d="M14,25 L86,25 L86,66 L47,66 L28,82 L31,66 L14,66 Z"
              fill="${PAPER}" stroke="${INK}" stroke-width="7"/>
            <circle cx="34" cy="46" r="5" fill="${INK}"/>
            <circle cx="50" cy="46" r="5" fill="${INK}"/>
            <circle cx="66" cy="46" r="5" fill="${INK}"/>`,

    /* ◀ 뒤로 — 화살표 하나 */
    back: `<path d="M63,17 L30,50 L63,83" stroke="${INK}" stroke-width="11"/>`,

    /* 🥤 컵 — 제목·아직 안 한 퍼즐 배지. 색 없는 윤곽선(놀잇감 아님) */
    cup: `<path d="M22,25 L78,25 L69,80 Q68,87 61,87 L39,87 Q32,87 31,80 Z"
            fill="${PAPER}" stroke="${INK}" stroke-width="7"/>
          <path d="M22,25 Q50,36 78,25" fill="none" stroke="${INK}" stroke-width="6"/>`,
  };

  /* 아이콘 하나를 SVG 문자열로 */
  function html(name, cls) {
    const inner = PARTS[name];
    if (!inner) return '';
    return `<svg class="kd${cls ? ' ' + cls : ''}" viewBox="0 0 100 100" aria-hidden="true">` +
      `<g filter="url(#cups-kd)" fill="none" stroke-linecap="round" stroke-linejoin="round">` +
      inner + `</g></svg>`;
  }

  /* 화면에 이미 놓여 있는 자리표(<span data-icon="…">)를 전부 채운다 */
  function fill(root) {
    (root || document).querySelectorAll('[data-icon]').forEach(el => {
      if (el.firstElementChild) return;            // 이미 채웠으면 그대로
      el.innerHTML = html(el.dataset.icon);
    });
  }

  function boot() {
    if (!document.getElementById('cups-kd')) {
      const box = document.createElement('div');
      box.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      box.innerHTML = FILTER;
      (document.body || document.documentElement).appendChild(box);
    }
    fill(document);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  return { html, fill };
})();
