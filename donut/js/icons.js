/* 손그림 UI 아이콘 — 「낙서장」 시안
 *
 * 왜 만들었나 — 화면 틀에 쓰던 이모지(⭐ 🔊 🗣️ ◀ 🍩)는 기기마다 제각각
 * 반들반들한 스티커 그림으로 그려진다. 모눈 공책 위에 크레용으로 그린 화면에
 * 그것만 붙인 스티커처럼 떠 보여서, 다섯 살이 그린 듯한 굵은 획 SVG 로 바꾼다.
 *
 * 손그림 티를 내는 세 가지 (shared/home-button.js 와 같은 방식)
 *   1) feTurbulence + feDisplacementMap 으로 획을 실제로 떨리게 한다
 *   2) 동그라미를 끝까지 안 닫는다 — 한 바퀴 돌다 시작점을 살짝 지나친다
 *   3) 칠을 윤곽에서 조금 비켜 칠한다 — 색연필이 선 밖으로 삐져나간 자국
 *
 * ⚠️ **도넛 무늬(js/data.js 의 DONUTS[*].draw)는 절대 여기로 가져오지 않는다.**
 *    같은 무늬를 찾아 놓는 것이 곧 이 놀이라, 놀잇감 그림을 바꾸면 놀이가 망가진다.
 *    여기 있는 'donut' 아이콘은 색이 아예 없는 윤곽선(제목·배지용 표시)일 뿐이라
 *    아홉 가지 색 도넛 어느 것과도 헷갈리지 않는다.
 *
 * 쓰는 법
 *   · 정적 화면: <span class="ic" data-icon="star"></span>  (이 스크립트가 채운다)
 *   · 동적 생성: DonutIcons.html('star')                    (SVG 문자열)
 */
window.DonutIcons = (() => {
  const INK = '#2E2A24';     /* 연필심 */
  const PAPER = '#FFFDF6';   /* 종이 — 획 안쪽 칠 */
  const GOLD = '#F6C453';    /* 별의 노란 크레용 칠 */
  const DOUGH = '#F0D9B4';   /* 도넛 아이콘의 도우 색 — 아이싱 색이 없어 아홉 도넛과 안 헷갈린다 */

  /* 획을 떨리게 하는 필터 — 큰 그림용/작은 그림용 두 벌.
     저사양 기기를 생각해 문서에 딱 한 번만 두고 모든 아이콘이 같은 id 를 가리킨다. */
  const FILTER = `
<svg width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute">
  <defs>
    <filter id="dn-kid" x="-18%" y="-18%" width="136%" height="136%">
      <feTurbulence type="fractalNoise" baseFrequency="0.034" numOctaves="2" seed="11"/>
      <feDisplacementMap in="SourceGraphic" scale="3"/>
    </filter>
    <filter id="dn-kid-sm" x="-18%" y="-18%" width="136%" height="136%">
      <feTurbulence type="fractalNoise" baseFrequency="0.052" numOctaves="2" seed="4"/>
      <feDisplacementMap in="SourceGraphic" scale="2"/>
    </filter>
  </defs>
</svg>`;

  /* 별 — 다섯 살이 그리는 삐뚤한 별. 노란 칠이 윤곽에서 살짝 어긋나 있다. */
  const STAR_D = 'M50,13 L61,38 L88,41 L68,60 L74,87 L50,73 L26,87 L32,60 L12,41 L39,38 Z';

  const PARTS = {
    star: {
      w: 7,
      d: `<path d="${STAR_D}" fill="${GOLD}" stroke="none" transform="translate(3.4,-2.6)"/>` +
         `<path d="${STAR_D}"/>`,
    },

    /* 도넛 — 색 없는 윤곽선. 놀잇감이 아니라 가게 간판 그림이다.
       바깥 동그라미도 가운데 구멍도 끝을 안 닫고 살짝 지나쳐 그린다. */
    donut: {
      w: 8,
      d: /* 크레용 칠이 윤곽에서 비켜 나간 자국 — 도우 색 하나뿐, 아이싱 색은 없다 */
         `<circle cx="53.5" cy="49" r="34" fill="${DOUGH}" stroke="none"/>` +
         `<circle cx="50" cy="52" r="13" fill="${PAPER}" stroke="none"/>` +
         `<path d="M50 17 A35 35 0 1 1 43.5 17.7"/>` +
         `<path d="M50 39 A13 13 0 1 1 45.8 39.7" stroke-width="7"/>` +
         /* 설탕 가루 몇 알 — 색 없이 연필 자국으로만 */
         `<path d="M28 35 L33.5 30" stroke-width="6.5"/>` +
         `<path d="M67 30 L72 35.5" stroke-width="6.5"/>` +
         `<path d="M26 68 L31.5 72" stroke-width="6.5"/>`,
    },

    /* 소리 — 네모 나팔에 소리 줄 둘 */
    speaker: {
      w: 7,
      d: `<path d="M16 41 L33 40 L52 23 L53 78 L33 61 L15 60 Z" fill="${GOLD}" stroke="none" transform="translate(-2.5,2.5)"/>` +
         `<path d="M16 41 L33 40 L52 23 L53 78 L33 61 L15 60 Z"/>` +
         `<path d="M67 36 C78 46 77 55 66 65"/>` +
         `<path d="M80 24 C96 43 96 58 79 76"/>`,
    },

    /* 목소리 — 말주머니에 점 셋 */
    voice: {
      w: 7,
      d: `<path d="M14 25 L86 25 L86 66 L47 66 L28 82 L31 66 L14 66 Z" fill="${PAPER}" stroke="none" transform="translate(3,-3)"/>` +
         `<path d="M14 25 L86 25 L86 66 L47 66 L28 82 L31 66 L14 66 Z"/>` +
         `<circle cx="34" cy="46" r="4.6" fill="${INK}"/>` +
         `<circle cx="50" cy="46" r="4.6" fill="${INK}"/>` +
         `<circle cx="66" cy="46" r="4.6" fill="${INK}"/>`,
    },

    /* 뒤로 — 왼쪽으로 꺾어 그은 화살표 하나 */
    back: { w: 11, sm: true, d: '<path d="M63 16 L29 50 L63 84"/>' },
  };

  /* 아이콘 하나를 SVG 문자열로 */
  function html(name, cls) {
    const p = PARTS[name];
    if (!p) return '';
    return '<svg class="dn-ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
      '<g filter="url(#' + (p.sm ? 'dn-kid-sm' : 'dn-kid') + ')" fill="none" stroke="' + INK + '" ' +
      'stroke-width="' + p.w + '" stroke-linecap="round" stroke-linejoin="round">' +
      p.d + '</g></svg>';
  }

  /* 화면에 이미 놓여 있는 자리표(<span data-icon="…">)를 전부 채운다 */
  function fill(root) {
    (root || document).querySelectorAll('[data-icon]').forEach(el => {
      if (el.firstElementChild) return;     // 이미 채웠으면 그대로
      const svg = html(el.dataset.icon);
      if (svg) el.innerHTML = svg;
    });
  }

  /* 필터 정의는 **지금 바로** 넣는다 — app.js 가 그리기 시작하기 전에 있어야
     아이콘의 filter="url(#dn-kid)" 참조가 처음부터 살아 있다. */
  if (!document.getElementById('dn-kid')) {
    const box = document.createElement('div');
    box.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    box.innerHTML = FILTER;
    (document.body || document.documentElement).appendChild(box);
  }

  /* data-icon 자리 채우기는 문서를 다 읽은 뒤 */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => fill(document));
  else fill(document);

  return { html, fill };
})();
