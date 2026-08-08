/* 손그림 아이콘 — 도형 놀이터의 UI 이모지를 아이가 그린 그림으로 바꾼다
 *
 * 왜 — 이모지는 기기마다 생김새가 다르고, 매끈한 그림이라 「낙서장」 종이 위에서 혼자 붕 뜬다.
 * 그래서 굵고 고른 획으로 그린 뒤 feTurbulence + feDisplacementMap 으로 선을 살짝 떨게 한다
 * (같은 방식의 본보기: shared/home-button.js 의 집 그림).
 *
 * 쓰는 법 두 가지
 *   1) 붙박이 자리 — index.html 요소에 data-dood="이름" 을 달아 두면 이 파일이 채운다
 *   2) 그때그때 만드는 자리 — ShapeDoodle.svg('이름') 이 마크업 문자열을 준다 (app.js 에서 사용)
 *
 * ※ 놀이판(#stage)의 조각·자리에는 절대 쓰지 않는다. 끌어 놓기 좌표가 틀어진다.
 */
window.ShapeDoodle = (() => {
  const INK = '#2E2A24';
  const FID = 'shape-dood-ink'; // 획을 떨게 하는 필터 id (문서에 하나만 둔다)

  /* 아이가 그린 그림들 — 모두 100×100 칸 안에, 획 굵기는 고르게 */
  const ART = {
    /* 파란 마름모 — 앱 이름 앞에 붙는 표식 */
    logo:
      '<path d="M50 11 L87 50 L50 89 L13 50 Z" fill="#7EE7D7" stroke-width="8"/>',

    /* 별 — 모은 별 개수 표시, 축하 화면 */
    star:
      '<path d="M50 12 L60.0 38.2 L88.0 39.6 L66.2 57.3 L73.5 84.4 L50 69 ' +
      'L26.5 84.4 L33.8 57.3 L12.0 39.6 L40.0 38.2 Z" fill="#F6C453" stroke-width="7"/>',

    /* 메달 — 다 푼 도안 표시 */
    medal:
      '<path d="M38 8 L46 42" stroke-width="9"/>' +
      '<path d="M64 8 L56 42" stroke-width="9"/>' +
      '<circle cx="51" cy="64" r="27" fill="#F6C453" stroke-width="8"/>' +
      '<circle cx="51" cy="64" r="11" fill="#FFE9B0" stroke-width="6"/>',

    /* 빙글빙글 — 조각을 돌려야 하는 단계 표시 (동그란 화살표) */
    spin:
      '<path d="M70 26 A30 30 0 1 0 77 63" fill="none" stroke-width="9"/>' +
      '<path d="M58 16 L78 16 L62 37 Z" fill="#2E2A24" stroke-width="5"/>',

    /* 뒤로 — 왼쪽 꺾쇠 */
    back:
      '<path d="M63 18 L31 50 L63 82" fill="none" stroke-width="13"/>',

    /* 목소리 — 말하는 얼굴과 퍼져 나가는 소리 */
    voice:
      '<circle cx="35" cy="50" r="26" fill="#FFD9A0" stroke-width="8"/>' +
      '<circle cx="29" cy="41" r="4" fill="#2E2A24" stroke-width="0"/>' +
      '<path d="M25 58 Q36 70 48 56" fill="none" stroke-width="7"/>' +
      '<path d="M72 30 Q82 50 72 70" fill="none" stroke-width="8"/>' +
      '<path d="M89 18 Q102 50 89 82" fill="none" stroke-width="8"/>',

    /* 칠교놀이 — 네모를 대각선으로 자른 두 조각 */
    tan:
      '<path d="M18 18 L82 18 L82 82 Z" fill="#4FC3F7" stroke-width="8"/>' +
      '<path d="M18 18 L82 82 L18 82 Z" fill="#FF8A80" stroke-width="8"/>',

    /* 블록 퍼즐 — 쌓아 놓은 블록 세 개 */
    block:
      '<path d="M14 62 L58 62 L58 88 L14 88 Z" fill="#6FD489" stroke-width="8"/>' +
      '<path d="M44 34 L88 34 L88 62 L44 62 Z" fill="#4FC3F7" stroke-width="8"/>' +
      '<path d="M18 10 L52 10 L52 34 L18 34 Z" fill="#FFD54F" stroke-width="8"/>',

    /* 도형 맞추기 — 동그라미·세모·네모 한 가족 */
    shape:
      '<circle cx="28" cy="28" r="16" fill="#FF8A80" stroke-width="8"/>' +
      '<path d="M70 10 L92 46 L48 46 Z" fill="#4FC3F7" stroke-width="8"/>' +
      '<path d="M24 60 L80 60 L80 90 L24 90 Z" fill="#FFD54F" stroke-width="8"/>',
  };

  /* 떨리는 획 필터를 문서에 딱 한 번 심는다 */
  function ensureFilter() {
    if (document.getElementById(FID)) return;
    const host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    host.setAttribute('aria-hidden', 'true');
    host.setAttribute('width', '0');
    host.setAttribute('height', '0');
    host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    host.innerHTML =
      '<defs><filter id="' + FID + '" x="-18%" y="-18%" width="136%" height="136%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7"/>' +
      '<feDisplacementMap in="SourceGraphic" scale="3"/>' +
      '</filter></defs>';
    (document.body || document.documentElement).appendChild(host);
  }

  /* 그림 하나를 <svg> 마크업 문자열로 */
  function svg(name) {
    const art = ART[name];
    if (!art) return '';
    ensureFilter();
    return '<svg class="dood dood-' + name + '" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
      '<g filter="url(#' + FID + ')" fill="none" stroke="' + INK + '" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + art + '</g></svg>';
  }

  /* index.html 에 미리 표시해 둔 자리를 채운다 */
  function paint(root) {
    (root || document).querySelectorAll('[data-dood]').forEach(el => {
      const m = svg(el.dataset.dood);
      if (m) el.innerHTML = m;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => paint());
  else paint();

  return { svg, paint };
})();
