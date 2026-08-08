/* 손그림 아이콘 — 「낙서장」 시안용.
 *
 * UI 이모지(⭐ ◀ 🔊 🗣️ 🧑‍🔬 🧪)를 아이가 크레용으로 그린 듯한 인라인 SVG로 바꾼다.
 * 굵고 고른 획 + feTurbulence·feDisplacementMap 으로 선을 삐뚤게 흔든다
 * (흔드는 필터 정의는 index.html 맨 위 `#dd-wobble` 하나를 모두가 함께 쓴다).
 *
 * ⚠️ 놀이에 쓰는 구슬·시험관 그림(js/data.js 의 beadDraw·glassDraw)은 건드리지 않는다.
 *    구슬 색 순서가 곧 놀이라서, 색도 모양도 그대로 두어야 한다.
 *    여기 아이콘 안의 동그라미는 장식이며, 색은 놀이와 같은 팔레트에서 빌려 쓴다.
 *
 * 쓰는 법
 *   · HTML: <span data-ico="star"></span>  — 이 파일이 읽히면 알아서 채운다
 *   · JS  : Doodle.icon('star')            — SVG 문자열을 돌려준다
 */
window.Doodle = (() => {
  const INK = '#2E2A24';                 // 크레용 검정
  const F = 'filter="url(#dd-wobble)"';  // 손떨림

  // 아이콘 한 장 껍데기 — 획이 흔들려도 잘리지 않게 넉넉한 viewBox
  const svg = inner =>
    '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" ' +
    'xmlns="http://www.w3.org/2000/svg" style="overflow:visible">' + inner + '</svg>';

  // 시험관 한 자루 — 구슬 n개를 아래부터 채워 그린다 (단계 표시용)
  function tube(n) {
    const dots = ['#E24B3B', '#F6C744', '#4C86D6'];  // 놀이 팔레트에서 빌린 색
    let beads = '';
    for (let i = 0; i < n; i++) {
      beads += '<circle cx="50" cy="' + (76 - i * 19) + '" r="10.5" fill="' + dots[i % 3] +
        '" stroke="' + INK + '" stroke-width="5"/>';
    }
    return svg('<g ' + F + ' fill="none" stroke="' + INK +
      '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M33 18 L33 70 Q33 88 50 88 Q67 88 67 70 L67 18" fill="#F0F6FE"/>' +
      beads +
      '<path d="M23 17 L77 16"/>' +
      '</g>');
  }

  const ICONS = {
    // 별 — 진행도·완성 표시
    star: svg('<g ' + F + '><path d="M50 12 L62 38 L90 42 L69 61 L75 88 L50 75 L25 88 L31 61 L10 42 L38 38 Z"' +
      ' fill="#F6C744" stroke="' + INK + '" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/></g>'),

    // 뒤로 가기 화살표
    back: svg('<g ' + F + ' fill="none" stroke="' + INK +
      '" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M63 15 L29 50 L63 85"/></g>'),

    // 듣기 — 나팔 스피커에서 소리가 퍼진다
    listen: svg('<g ' + F + ' stroke="' + INK + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 39 L31 38 L52 18 L53 82 L31 63 L12 62 Z" fill="#F6C744"/>' +
      '<path d="M66 34 Q77 50 66 67" fill="none"/>' +
      '<path d="M80 22 Q96 50 80 78" fill="none"/></g>'),

    // 목소리 설정 — 말풍선
    voice: svg('<g ' + F + ' stroke="' + INK + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 21 L88 20 L87 62 L45 63 L26 82 L30 62 L12 63 Z" fill="#FFFFFF"/>' +
      '<path d="M29 35 L71 34" fill="none"/>' +
      '<path d="M29 49 L58 48" fill="none"/></g>'),

    // 본보기 카드 — 과학자 아이 얼굴
    kid: svg('<g ' + F + ' stroke="' + INK + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="50" cy="55" r="30" fill="#FFE3C2"/>' +
      '<path d="M22 40 Q33 15 50 23 Q67 13 78 38" fill="none" stroke-width="8"/>' +
      '<path d="M37 69 Q50 80 64 68" fill="none" stroke-width="6"/>' +
      '<circle cx="39" cy="52" r="4.6" fill="' + INK + '" stroke="none"/>' +
      '<circle cx="62" cy="51" r="4.6" fill="' + INK + '" stroke="none"/></g>'),

    // 축하 — 색을 다 담은 시험관
    reward: svg('<g ' + F + ' stroke="' + INK + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M27 16 L27 66 Q27 88 50 88 Q73 88 73 66 L73 15" fill="#F0F6FE"/>' +
      '<circle cx="50" cy="73" r="11.5" fill="#E24B3B" stroke-width="5"/>' +
      '<circle cx="50" cy="50" r="11.5" fill="#F6C744" stroke-width="5"/>' +
      '<circle cx="50" cy="30" r="11.5" fill="#4C86D6" stroke-width="5"/>' +
      '<path d="M16 15 L84 14" fill="none"/></g>'),

    // 다음으로 — 오른쪽 화살표
    fwd: svg('<g ' + F + ' fill="none" stroke="' + INK +
      '" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M37 15 L71 50 L37 85"/></g>'),
  };

  ICONS.tube1 = tube(1);
  ICONS.tube2 = tube(2);
  ICONS.tube3 = tube(3);

  /* 글줄 안에 넣을 아이콘 한 조각 */
  function icon(name, cls) {
    const s = ICONS[name];
    if (!s) return '';
    return '<span class="ico' + (cls ? ' ' + cls : '') + '">' + s + '</span>';
  }

  /* HTML 에 미리 놓아 둔 <span data-ico="…"> 자리를 채운다 */
  function fill(root) {
    (root || document).querySelectorAll('[data-ico]').forEach(el => {
      const s = ICONS[el.dataset.ico];
      if (!s) return;
      el.classList.add('ico');
      el.innerHTML = s;
    });
  }

  fill();
  return { icon, fill, ICONS };
})();
