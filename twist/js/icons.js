/* 손그림 아이콘 — 화면 틀의 이모지(⭐🎡🔊🗣️🎯✅◀▶)를 아이가 그린 듯한 인라인 SVG 로 바꾼다.
 *
 * 왜 — 「낙서장」 시안에서 이모지만 반질반질한 스티커처럼 남으면 종이 위에 붙은 이물질이 된다.
 * 그래서 굵고 고른 획 + 삐뚤한 선으로 다시 그린다.
 * 떨림은 공용 집 단추(shared/home-button.js)와 같은 방식 — feTurbulence + feDisplacementMap.
 * 필터는 문서에 딱 하나만 두고(#twist-kd) 모든 아이콘이 같은 것을 참조한다(저사양 기기 배려).
 *
 * ⚠️ 절대 만지지 않는 것 — **실린더 블록에 그려진 얼굴**(동물·공룡·도형 이모지).
 *    그 얼굴을 카드와 맞추는 것이 곧 놀이다. 얼굴은 js/data.js 의 이모지를 그대로 쓴다.
 *    여기서 만드는 것은 제목·단추·배지 같은 '화면 틀'뿐이다.
 *
 * 쓰는 법
 *   · 정적 화면: <span class="ic" data-icon="star"></span>   (이 스크립트가 읽어서 채운다)
 *   · 동적 생성: TwistIcons.html('star')                     (문자열을 그대로 innerHTML 에)
 */
window.TwistIcons = (() => {
  const INK = '#2E2A24';      /* 연필심 */
  const PAPER = '#FFFDF6';    /* 종이 — 획 안쪽을 살짝 채운다 */
  const GOLD = '#F6C453';     /* 별·블록의 노란 크레용 칠 */
  const GREEN = '#5DBE58';    /* 다 맞췄다는 표시 */

  /* 획을 실제로 떨리게 하는 필터 한 장 (문서 전체 공용) */
  const FILTER = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <filter id="twist-kd" x="-18%" y="-18%" width="136%" height="136%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="11"/>
      <feDisplacementMap in="SourceGraphic" scale="2.9"/>
    </filter>
  </defs>
</svg>`;

  /* 아이콘 속살 — 전부 viewBox 0 0 100 100, 굵기 고른 획.
     칠(fill)이 윤곽 밖으로 조금씩 삐져나가도록 일부러 크게 잡은 곳이 있다. */
  const PARTS = {
    /* ⭐ 별 — 별 개수·다 한 퍼즐 배지. 꼭짓점이 안 맞물리는 아이 손 별 */
    star: `<path d="M50,12 L62,38 L89,41 L68,60 L75,88 L50,73 L25,87 L31,59 L11,40 L38,37 Z"
             fill="${GOLD}" stroke="${INK}" stroke-width="7"/>`,

    /* 🎡 돌림 블록 — 이 놀이의 얼굴. 막대에 꽂힌 블록 하나 + 돌아가는 화살표 */
    twist: `<path d="M5,54 L95,53" stroke="${INK}" stroke-width="8"/>
            <path d="M29,31 L71,30 Q79,30 79,39 L79,68 Q79,76 71,76 L29,77 Q21,77 21,68 L21,39 Q21,31 29,31 Z"
              fill="${GOLD}" stroke="${INK}" stroke-width="7"/>
            <path d="M35,46 L65,45" stroke="${INK}" stroke-width="6"/>
            <path d="M36,62 L64,61" stroke="${INK}" stroke-width="6"/>
            <path d="M72,19 Q88,24 88,38" stroke="${INK}" stroke-width="6"/>
            <path d="M79,34 L89,40 L94,29" stroke="${INK}" stroke-width="6"/>`,

    /* 🎯 본보기 카드 — "이렇게 맞춰요" 안내. 종이 한 장에 블록 둘을 그려 둔 모양 */
    card: `<path d="M13,20 L87,18 L89,79 L14,81 Z"
             fill="${PAPER}" stroke="${INK}" stroke-width="7"/>
           <path d="M26,35 L45,34 L46,64 L27,65 Z" fill="${GOLD}" stroke="${INK}" stroke-width="6"/>
           <path d="M56,35 L75,34 L76,64 L57,65 Z" fill="${PAPER}" stroke="${INK}" stroke-width="6"/>`,

    /* ✅ 맞았어요 — 동그라미가 다 안 닫힌 채 그은 체크 */
    check: `<path d="M17,50 C17,28 33,14 51,14 C70,14 85,29 85,50 C85,71 69,86 50,86 C34,86 21,74 18,60"
              fill="${GREEN}" stroke="${INK}" stroke-width="7"/>
            <path d="M31,52 L45,67 L71,33" stroke="${PAPER}" stroke-width="9"/>`,

    /* 🔊 스피커 — 듣기 단추 */
    speaker: `<path d="M14,40 L32,40 L52,23 L52,77 L32,60 L14,60 Z"
                fill="${PAPER}" stroke="${INK}" stroke-width="7"/>
              <path d="M65,37 Q73,50 65,63" stroke="${INK}" stroke-width="7"/>
              <path d="M79,27 Q92,50 79,73" stroke="${INK}" stroke-width="7"/>`,

    /* 🗣️ 말하기 — 목소리 설정 단추 */
    voice: `<path d="M14,25 L86,24 L86,66 L47,66 L28,83 L31,66 L14,66 Z"
              fill="${PAPER}" stroke="${INK}" stroke-width="7"/>
            <circle cx="34" cy="45" r="5" fill="${INK}"/>
            <circle cx="50" cy="45" r="5" fill="${INK}"/>
            <circle cx="66" cy="45" r="5" fill="${INK}"/>`,

    /* ◀ 뒤로 — 화살표 하나 */
    back: `<path d="M63,17 L29,50 L63,83" stroke="${INK}" stroke-width="11"/>`,

    /* ▶ 다음 — 글씨 색을 따라간다(주황 단추 위에서도 보이게) */
    next: `<path d="M37,17 L71,50 L37,83" stroke="currentColor" stroke-width="11"/>`,
  };

  /* 제목에서 첫 놀이로 내려꽂는 점선 화살표 — 흩뿌린 칸 중 어디부터 할지 알려 준다.
     비율이 달라서(가로로 긴 그림) 위 아이콘들과 viewBox 가 다르다. */
  const START_ARROW =
    `<svg class="first-arrow" viewBox="0 0 160 80" aria-hidden="true">` +
    `<g filter="url(#twist-kd)" fill="none" stroke="${INK}" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M152 13 C121 5, 75 12, 46 32 C30 43, 22 56, 18 71" stroke-width="6" stroke-dasharray="2 13"/>` +
    `<path d="M5 54 L18 73 L33 58" stroke-width="6.4"/>` +
    `</g></svg>`;

  /* 아이콘 하나를 SVG 문자열로 */
  function html(name, cls) {
    const inner = PARTS[name];
    if (!inner) return '';
    return `<svg class="kd${cls ? ' ' + cls : ''}" viewBox="0 0 100 100" aria-hidden="true">` +
      `<g filter="url(#twist-kd)" fill="none" stroke-linecap="round" stroke-linejoin="round">` +
      inner + `</g></svg>`;
  }

  /* 아이콘을 자리 잡을 껍데기까지 붙여서 (동적으로 만드는 칸에 그대로 넣는다) */
  function span(name, cls) {
    return '<span class="ic' + (cls ? ' ' + cls : '') + '">' + html(name) + '</span>';
  }

  /* 화면에 이미 놓여 있는 자리표(<span data-icon="…">)를 전부 채운다 */
  function fill(root) {
    (root || document).querySelectorAll('[data-icon]').forEach(el => {
      if (el.firstElementChild) return;            // 이미 채웠으면 그대로
      el.innerHTML = html(el.dataset.icon);
    });
  }

  function boot() {
    if (!document.getElementById('twist-kd')) {
      const box = document.createElement('div');
      box.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      box.innerHTML = FILTER;
      (document.body || document.documentElement).appendChild(box);
    }
    fill(document);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  return { html, span, fill, startArrow: () => START_ARROW };
})();
