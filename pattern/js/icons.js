/* ═══════════ 패턴 놀이터 — 손그림 아이콘 ═══════════
 * 「낙서장」 디자인에서 UI 단추는 이모지가 아니라 **아이가 그린 그림**이어야 한다.
 * 이모지는 기기마다 모양이 다르고(둥글둥글 매끈한 3D) 종이 위 크레용 결과 따로 논다.
 *
 * 그리는 규칙 — 굵고 고른 획(stroke-width 6~9), 둥근 끝, 색은 크게 한 덩어리씩.
 * 자로 그은 티가 나지 않게 획을 feTurbulence + feDisplacementMap 으로 실제로 떨리게 한다
 * (선례: shared/home-button.js 의 집 그림).
 *
 * ⚠️ 이 파일이 그리는 것은 **UI 단추**뿐이다. 놀잇감 타일(js/data.js 의 도형 SVG)은
 *    절대 건드리지 않는다 — 타일이 떨리거나 기울면 반복 규칙이 안 보인다.
 *
 * 쓰는 법
 *   마크업:  <span class="ic" data-ic="star"></span>   ← 페이지가 뜨면 알아서 채워진다
 *   JS 안:   PatternIcons.svg('star')                  ← 문자열로 받아 innerHTML 에 끼운다
 *            PatternIcons.svg('question', 'currentColor')  ← 획 색을 글자색에 맡길 때
 */
window.PatternIcons = (() => {
  const INK = '#2E2A24';
  const FID = 'pattern-ink-wobble';

  /* 아이콘 속살 — 100×100 칸 안에 그린다. 색을 채우는 획만 fill 을 따로 준다. */
  const ART = {
    /* 반복 — 되돌아오는 고리 화살표. 이 놀이 자체가 "되풀이"다 */
    repeat:
      '<path d="M22 44 Q23 23 50 22 Q72 21 79 37" stroke-width="8"/>' +
      '<path d="M67 28 L81 38 L70 50" stroke-width="8"/>' +
      '<path d="M78 57 Q77 78 50 79 Q28 80 21 64" stroke-width="8"/>' +
      '<path d="M33 73 L19 63 L30 51" stroke-width="8"/>',

    /* 별 — 잘한 만큼 모이는 상. 노란 덩어리 하나 */
    star:
      '<path d="M50 11 L61 39 L91 40 L67 59 L77 88 L50 70 L23 88 L33 59 L9 40 L39 39 Z" ' +
      'fill="#FFC12E" stroke-width="6"/>',

    /* 물음표 — 아직 안 푼 퍼즐, 그리고 줄에 뚫린 빈칸 */
    question:
      '<path d="M31 35 Q33 16 52 16 Q71 16 71 33 Q71 47 55 54 Q49 57 49 69" stroke-width="9"/>' +
      '<path d="M49 84 L49 85" stroke-width="12"/>',

    /* 목소리 — 말풍선. 길게 누르면 목소리 고르기가 열린다 */
    voice:
      '<path d="M13 22 H87 V60 H45 L28 79 V60 H13 Z" fill="#C8EDE8" stroke-width="7"/>' +
      '<path d="M28 35 H72" stroke-width="6"/>' +
      '<path d="M28 47 H58" stroke-width="6"/>',

    /* 듣기 — 나팔 스피커에서 소리가 퍼진다 */
    listen:
      '<path d="M12 39 H30 L50 20 V80 L30 61 H12 Z" fill="#FFD166" stroke-width="7"/>' +
      '<path d="M64 39 Q73 50 64 61" stroke-width="7"/>' +
      '<path d="M79 28 Q94 50 79 72" stroke-width="7"/>',

    /* 되돌아가기 — 왼쪽 화살표 */
    back:
      '<path d="M79 50 H26" stroke-width="9"/>' +
      '<path d="M47 26 L21 50 L47 74" stroke-width="9"/>',

    /* 다음 — 오른쪽 화살표 */
    next:
      '<path d="M21 50 H74" stroke-width="9"/>' +
      '<path d="M53 26 L79 50 L53 74" stroke-width="9"/>',

    /* 집 — 놀이터 홈으로. 평소엔 공용 집 단추(shared/home-button.js)가 가려 주지만,
       그 스크립트가 못 뜬 기기에서는 이 그림이 대신 보인다 */
    home:
      '<path d="M11 51 L50 14 L89 51" stroke-width="8"/>' +
      '<path d="M22 46 L23 84 L78 83 L77 45" stroke-width="8"/>' +
      '<path d="M41 84 L40 60 L60 59 L61 83" fill="#F6C453" stroke-width="6"/>',

    /* 축하 — 고깔에서 색종이가 터진다 */
    party:
      '<path d="M11 89 L43 33 L71 59 Z" fill="#FF8FA3" stroke-width="7"/>' +
      '<circle cx="74" cy="22" r="7" fill="#FFC12E" stroke-width="5"/>' +
      '<path d="M55 16 L59 6" stroke="#2E8FE0" stroke-width="6"/>' +
      '<path d="M85 43 L96 38" stroke="#4FB84A" stroke-width="6"/>' +
      '<path d="M85 64 L96 69" stroke="#9B6FD6" stroke-width="6"/>',
  };

  /* 떨리는 획을 만드는 필터는 문서에 한 번만 둔다 */
  function ensureDefs() {
    if (document.getElementById(FID)) return;
    const holder = document.createElement('div');
    holder.setAttribute('aria-hidden', 'true');
    holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    holder.innerHTML =
      '<svg width="0" height="0"><defs>' +
      '<filter id="' + FID + '" x="-18%" y="-18%" width="136%" height="136%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.042" numOctaves="2" seed="7"/>' +
      '<feDisplacementMap in="SourceGraphic" scale="2.6"/>' +
      '</filter></defs></svg>';
    (document.body || document.documentElement).appendChild(holder);
  }

  /* 아이콘 하나를 SVG 문자열로. ink 를 'currentColor' 로 주면 글자색을 따라간다 */
  function svg(name, ink) {
    const art = ART[name];
    if (!art) return '';
    ensureDefs();   // 문자열로 먼저 뽑아 쓰는 곳(app.js)도 있으니 여기서 챙긴다
    /* ic-svg 클래스 덕분에 .ic 껍데기 없이 문자열로 바로 끼워 넣어도 글자 크기를 따라간다 */
    return '<svg class="ic-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
      '<g filter="url(#' + FID + ')" fill="none" stroke="' + (ink || INK) +
      '" stroke-linecap="round" stroke-linejoin="round">' + art + '</g></svg>';
  }

  function set(slot, name, ink) {
    if (!slot) return;
    ensureDefs();
    slot.innerHTML = svg(name, ink);
  }

  /* data-ic 가 붙은 자리를 모두 채운다 */
  function apply(root) {
    ensureDefs();
    (root || document).querySelectorAll('[data-ic]').forEach(el => {
      if (!el.firstElementChild) set(el, el.getAttribute('data-ic'));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => apply());
  else apply();

  return { svg, set, apply };
})();
