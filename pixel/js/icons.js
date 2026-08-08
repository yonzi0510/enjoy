/* ═══════════ 픽셀 놀이터 — 손그림 아이콘 ═══════════
 * 「낙서장」 디자인에서 UI 단추는 이모지가 아니라 **아이가 그린 그림**이어야 한다.
 * 이모지는 기기마다 모양이 다르고(둥글둥글 매끈한 3D) 종이 위 크레용 결과 따로 논다.
 *
 * 그리는 규칙 — 굵고 고른 획(stroke-width 7~9), 둥근 끝, 색은 크게 한 덩어리씩.
 * 자로 그은 티가 나지 않게 획을 feTurbulence + feDisplacementMap 으로 실제로 떨리게 한다
 * (선례: shared/home-button.js 의 집 그림).
 *
 * 쓰는 법
 *   마크업:  <span class="ic" data-ic="works"></span>   ← 페이지가 뜨면 알아서 채워진다
 *   바뀌는 것: PixelIcons.set(slot, 'mute')             ← 소리 켬/끔처럼 상태가 바뀔 때
 */
const PixelIcons = (() => {
  const INK = '#2E2A24';
  const FID = 'pixel-ink-wobble';

  /* 아이콘 속살 — 100×100 칸 안에 그린다. 색을 채우는 획만 fill 을 따로 준다. */
  const ART = {
    /* 소리 켜짐 — 나팔 스피커에서 소리가 퍼진다 */
    sound:
      '<path d="M14 40 H31 L51 22 V78 L31 60 H14 Z" fill="#FFD166" stroke-width="7"/>' +
      '<path d="M63 38 Q73 50 63 62" stroke-width="7"/>' +
      '<path d="M77 27 Q93 50 77 73" stroke-width="7"/>',

    /* 소리 꺼짐 — 같은 스피커에 크게 가위표 */
    mute:
      '<path d="M14 40 H31 L51 22 V78 L31 60 H14 Z" fill="#E8E2D6" stroke-width="7"/>' +
      '<path d="M64 37 L89 63" stroke-width="8"/>' +
      '<path d="M89 37 L64 63" stroke-width="8"/>',

    /* 목소리 — 말풍선 (길게 누르면 목소리 고르기가 열린다) */
    voice:
      '<path d="M13 21 H87 V61 H45 L28 79 V61 H13 Z" fill="#BFE3FF" stroke-width="7"/>' +
      '<path d="M29 35 H71" stroke-width="6"/>' +
      '<path d="M29 47 H59" stroke-width="6"/>',

    /* 내 작품 — 액자에 걸린 그림 */
    works:
      '<path d="M12 18 H88 V79 H12 Z" fill="#FFFFFF" stroke-width="7"/>' +
      '<path d="M20 71 L38 46 L52 62 L64 49 L80 71 Z" fill="#9BD9A5" stroke-width="5"/>' +
      '<circle cx="66" cy="33" r="7" fill="#FFD166" stroke-width="5"/>',

    /* 그림 고르기 — 도안이 네 칸 놓인 갤러리 */
    gallery:
      '<path d="M14 14 H44 V44 H14 Z" fill="#FFE08A" stroke-width="7"/>' +
      '<path d="M56 14 H86 V44 H56 Z" fill="#FFB3C6" stroke-width="7"/>' +
      '<path d="M14 56 H44 V86 H14 Z" fill="#A9DDF2" stroke-width="7"/>' +
      '<path d="M56 56 H86 V86 H56 Z" fill="#9BD9A5" stroke-width="7"/>',

    /* 전체 보기 — 네 귀퉁이로 그림을 다 담는다 */
    fit:
      '<path d="M40 40 H60 V60 H40 Z" fill="#FFD166" stroke-width="6"/>' +
      '<path d="M16 34 V16 H34" stroke-width="8"/>' +
      '<path d="M66 16 H84 V34" stroke-width="8"/>' +
      '<path d="M84 66 V84 H66" stroke-width="8"/>' +
      '<path d="M34 84 H16 V66" stroke-width="8"/>',

    /* 폭탄 — 5×5 칸을 한 번에 칠해 주는 도우미 */
    bomb:
      '<circle cx="43" cy="63" r="26" fill="#4A4640" stroke-width="7"/>' +
      '<path d="M29 54 Q33 45 43 43" stroke="#FFFFFF" stroke-width="5"/>' +
      '<path d="M61 44 Q73 27 83 32" stroke-width="7"/>' +
      '<path d="M83 32 L92 24" stroke="#F0872B" stroke-width="6"/>' +
      '<path d="M83 32 L94 34" stroke="#F0872B" stroke-width="6"/>' +
      '<path d="M83 32 L81 20" stroke="#F0872B" stroke-width="6"/>',

    /* 마법봉 — 고른 색을 한 번에 칠해 주는 도우미 */
    wand:
      '<path d="M20 84 L61 43" stroke-width="9"/>' +
      '<path d="M71 15 V39" stroke="#F0A72B" stroke-width="7"/>' +
      '<path d="M59 27 H83" stroke="#F0A72B" stroke-width="7"/>' +
      '<path d="M87 51 V63" stroke="#F0A72B" stroke-width="6"/>' +
      '<path d="M81 57 H93" stroke="#F0A72B" stroke-width="6"/>',

    /* 다시 색칠하기 — 크레용 붓 */
    brush:
      '<path d="M18 85 L52 51" stroke-width="9"/>' +
      '<path d="M48 47 L66 26 L78 38 L59 58 Z" fill="#FF8FA3" stroke-width="6"/>',

    /* 다음 그림 — 오른쪽 화살표 */
    next:
      '<path d="M20 50 H72" stroke-width="9"/>' +
      '<path d="M52 27 L77 50 L52 73" stroke-width="9"/>'
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
      '<feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="5"/>' +
      '<feDisplacementMap in="SourceGraphic" scale="2.6"/>' +
      '</filter></defs></svg>';
    (document.body || document.documentElement).appendChild(holder);
  }

  function svg(name) {
    const art = ART[name];
    if (!art) return '';
    return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
      '<g filter="url(#' + FID + ')" fill="none" stroke="' + INK +
      '" stroke-linecap="round" stroke-linejoin="round">' + art + '</g></svg>';
  }

  function set(slot, name) {
    if (!slot) return;
    ensureDefs();
    slot.innerHTML = svg(name);
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
/* 최상위 const 는 window 에 붙지 않는다 — engine.js 가 `window.PixelIcons` 로 찾으므로 직접 걸어 준다 */
window.PixelIcons = PixelIcons;
