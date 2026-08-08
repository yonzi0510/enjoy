/* 손그림 아이콘 — 화면 틀의 이모지(🌈⭐🗣️◀▶)를 아이가 그린 듯한 인라인 SVG 로 바꾼다.
 *
 * 왜 — 「낙서장」 시안에서 이모지만 반질반질한 스티커처럼 남으면 종이 위에 붙은 이물질이 된다.
 * 그래서 굵고 고른 획 + 삐뚤한 선으로 다시 그린다.
 * 떨림은 공용 집 단추(shared/home-button.js)와 같은 방식 — feTurbulence + feDisplacementMap.
 * 필터는 문서에 딱 하나만 두고(#tg-kd) 모든 아이콘이 같은 것을 참조한다(저사양 기기 배려).
 * 다섯 살 손버릇을 흉내내려고 일부러: 동그라미를 끝까지 닫지 않고, 칠을 윤곽 밖으로 삐져나가게 둔다.
 *
 * ⚠️ 여기서 **놀이 조각(곡선 링 조각)은 절대 만들지 않는다.**
 *    조각의 색과 모양은 js/data.js 의 ARC_SHAPES·COLORS 가 그대로 그린다 —
 *    색과 곡선이 곧 놀이라서 손대면 놀이가 망가진다.
 *    아래 'arc' 아이콘은 색 없는 윤곽선(아직 안 한 퍼즐 표시)일 뿐이다.
 *
 * 쓰는 법
 *   · 정적 화면: <span class="ic" data-icon="star"></span>  (이 스크립트가 읽어서 채운다)
 *   · 동적 생성: TangramIcons.html('star')                   (문자열을 그대로 innerHTML 에)
 */
window.TangramIcons = (() => {
  const INK = '#2E2A24';      /* 연필심 */
  const PAPER = '#FFFDF6';    /* 종이 — 획 안쪽을 살짝 채운다 */
  const GOLD = '#F6C453';     /* 별의 노란 크레용 칠 */

  /* 획을 실제로 떨리게 하는 필터 한 장 (문서 전체 공용) */
  const FILTER = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <filter id="tg-kd" x="-18%" y="-18%" width="136%" height="136%">
      <feTurbulence type="fractalNoise" baseFrequency="0.036" numOctaves="2" seed="7"/>
      <feDisplacementMap in="SourceGraphic" scale="2.9"/>
    </filter>
  </defs>
</svg>`;

  /* 아이콘 속살 — 전부 viewBox 0 0 100 100, 굵기 고른 획 */
  const PARTS = {
    /* 🌈 무지개 — 제목·단계 이름 앞
       크레용 칠(아래 획)이 연필 윤곽(위 획)보다 살짝 어긋나 삐져나온다 */
    rainbow:
      `<path d="M12,80 A38,38 0 0 1 88,80" stroke="#FF5A5F" stroke-width="10" opacity=".9"
         transform="translate(1.6,-1.2)"/>
       <path d="M25,80 A25,25 0 0 1 75,80" stroke="#FFD93D" stroke-width="10" opacity=".9"
         transform="translate(-1.4,1.5)"/>
       <path d="M37,80 A13,13 0 0 1 63,80" stroke="#4FA3E8" stroke-width="9" opacity=".9"
         transform="translate(1.1,1.8)"/>
       <path d="M12,80 A38,38 0 0 1 88,80" stroke="${INK}" stroke-width="3.4"/>
       <path d="M25,80 A25,25 0 0 1 75,80" stroke="${INK}" stroke-width="3.4"/>
       <path d="M37,80 A13,13 0 0 1 63,80" stroke="${INK}" stroke-width="3.4"/>
       <path d="M9,81 L92,80" stroke="${INK}" stroke-width="4"/>`,

    /* ⭐ 별 — 별 개수·완성 배지. 칠이 윤곽 밖으로 조금 밀려나 있다 */
    star:
      `<path d="M50,14 L61,39 L88,42 L68,60 L74,87 L50,73 L26,87 L32,60 L12,42 L39,39 Z"
         fill="${GOLD}" stroke="none" transform="translate(2.4,-2)"/>
       <path d="M50,14 L61,39 L88,42 L68,60 L74,87 L50,73 L26,87 L32,60 L12,42 L39,39 Z"
         stroke="${INK}" stroke-width="6.5"/>`,

    /* 🗣️ 말하기 — 목소리 설정 단추 */
    voice:
      `<path d="M14,25 L86,25 L86,66 L47,66 L28,82 L31,66 L14,66 Z"
         fill="${PAPER}" stroke="${INK}" stroke-width="7"/>
       <path d="M33,45 h.6 M50,45 h.6 M67,45 h.6" stroke="${INK}" stroke-width="9"/>`,

    /* ◀ 뒤로 — 화살표 하나 */
    back: `<path d="M63,16 L29,50 L63,84" stroke="${INK}" stroke-width="11"/>`,

    /* ▶ 다음 — 뒤로의 거울 */
    next: `<path d="M37,16 L71,50 L37,84" stroke="${INK}" stroke-width="11"/>`,

    /* 아직 안 한 퍼즐 표시 — 색 없는 고리 조각 윤곽 (놀잇감 아님, 표시용)
       동그라미를 끝까지 닫지 않는 다섯 살 손버릇 */
    arc:
      `<path d="M16,74 A34,34 0 0 1 84,74" fill="${PAPER}" stroke="${INK}" stroke-width="7"/>
       <path d="M38,74 A12,12 0 0 1 62,74" fill="none" stroke="${INK}" stroke-width="6"/>
       <path d="M14,75 L40,75 M60,75 L86,75" stroke="${INK}" stroke-width="7"/>`,

    /* 제목 쪽에서 첫 단계 칸으로 내려꽂는 점선 화살표 — "여기부터 놀아 보자"
       viewBox 는 세로로 길다(0 0 100 120) */
    startArrow:
      `<path d="M12,9 C2,44 12,76 54,98" stroke="#E0577B" stroke-width="7.5"
         stroke-dasharray="10 12"/>
       <path d="M30,82 L58,100 L34,113" stroke="#E0577B" stroke-width="7.5"/>`,
  };

  /* 아이콘 하나를 SVG 문자열로 */
  function html(name, cls) {
    const inner = PARTS[name];
    if (!inner) return '';
    const vb = name === 'startArrow' ? '0 0 100 120' : '0 0 100 100';
    return '<svg class="kd' + (cls ? ' ' + cls : '') + '" viewBox="' + vb + '" aria-hidden="true">' +
      '<g filter="url(#tg-kd)" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
      inner + '</g></svg>';
  }

  /* 화면에 이미 놓여 있는 자리표(<span data-icon="…">)를 전부 채운다 */
  function fill(root) {
    (root || document).querySelectorAll('[data-icon]').forEach(el => {
      if (el.firstElementChild) return;            // 이미 채웠으면 그대로
      el.innerHTML = html(el.dataset.icon);
    });
  }

  /* 필터는 아이콘이 그려지기 '전에' 문서에 있어야 한다 —
     app.js 가 읽히자마자 홈을 그리므로 여기서 바로 넣는다. */
  function ensureFilter() {
    if (document.getElementById('tg-kd')) return;
    const host = document.body || document.documentElement;
    if (!host) return;
    const box = document.createElement('div');
    box.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    box.innerHTML = FILTER;
    host.appendChild(box);
  }
  ensureFilter();

  function boot() { ensureFilter(); fill(document); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  return { html, fill };
})();
