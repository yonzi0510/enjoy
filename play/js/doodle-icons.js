/* ═══════════ 손그림 아이콘 — 찾기 놀이터 ═══════════
 *
 * 부모님이 고르신 「낙서장」 시안에 맞춰, 화면 '틀'에 쓰이던 이모지를
 * 아이가 크레용으로 그린 듯한 SVG 로 바꾼다.
 *
 * 그리는 규칙 (다섯 살의 손):
 *   · 획은 굵고 고르게(stroke-width 8), 끝은 동그랗게
 *   · 동그라미는 끝을 안 맞추고 살짝 열어 둔다
 *   · 색칠은 윤곽보다 조금 어긋나게 칠해 밖으로 삐져나가게 한다
 *   · feTurbulence + feDisplacementMap 으로 획 자체를 떨리게 한다
 *
 * ※ 놀잇감(씬·스티커·글자 방울·짝꿍 카드 그림)은 절대 여기서 건드리지 않는다.
 *   이 파일이 바꾸는 것은 단추·배너·머리글 같은 '틀'뿐이다.
 *
 * 쓰는 법:
 *   <span class="di" data-di="find"></span>   ← 자동으로 채워진다
 *   DoodleIcons.set(el, 'sound-off')          ← 코드에서 바꿔 끼울 때
 */
(() => {
  'use strict';

  const INK = '#2E2A24';

  /* 획 묶음 — 모든 아이콘이 같은 손으로 그린 것처럼 보이게 하는 공통 껍데기 */
  const S = (d, w) =>
    `<g fill="none" stroke="${INK}" stroke-width="${w || 8}" stroke-linecap="round" stroke-linejoin="round">${d}</g>`;

  /* 아이콘 속살. 색칠(fill)을 먼저, 윤곽(stroke)을 나중에 —
     칠이 살짝 어긋나 있어야 선 밖으로 삐져나온 것처럼 보인다. */
  const ICONS = {
    /* 🔍 돋보기 — 첫 화면 제목·숨은그림찾기 */
    find:
      `<circle cx="43" cy="38" r="24" fill="#BFE9FF"/>` +
      S(`<path d="M62 30 A22 22 0 1 0 59 59"/><path d="M60 61 L83 83"/>`),

    /* 👀 눈 — 다른그림찾기 */
    eyes:
      `<ellipse cx="25" cy="49" rx="18" ry="14" fill="#BFE9FF"/>` +
      `<ellipse cx="76" cy="54" rx="18" ry="14" fill="#FFD3E6"/>` +
      S(`<path d="M6 51 Q26 27 46 51 Q26 73 6 51 Z"/><path d="M54 51 Q74 27 94 51 Q74 73 54 51 Z"/>`) +
      S(`<path d="M26 50 L26 52"/><path d="M74 50 L74 52"/>`, 17),

    /* 🔊 소리 켜짐 */
    'sound-on':
      `<path d="M10 33 L32 33 L56 13 L56 81 L32 61 L10 61 Z" fill="#FFD93D"/>` +
      S(`<path d="M16 38 L36 38 L58 20 L58 80 L36 62 L16 62 Z"/>` +
        `<path d="M70 36 Q80 50 70 64"/><path d="M84 26 Q96 50 84 74"/>`),

    /* 🔇 소리 꺼짐 */
    'sound-off':
      `<path d="M10 33 L32 33 L56 13 L56 81 L32 61 L10 61 Z" fill="#D8D2C4"/>` +
      S(`<path d="M16 38 L36 38 L58 20 L58 80 L36 62 L16 62 Z"/>` +
        `<path d="M70 36 L92 62"/><path d="M92 36 L70 62"/>`),

    /* 🗣️ 목소리 설정 */
    voice:
      `<circle cx="39" cy="47" r="26" fill="#FFC9A8"/>` +
      S(`<path d="M56 25 A26 26 0 1 0 54 71"/>` +
        `<path d="M30 57 Q42 70 54 55"/>` +
        `<path d="M74 36 Q84 50 74 64"/><path d="M86 27 Q96 50 86 73"/>`) +
      S(`<path d="M33 41 L33 43"/>`, 10),

    /* 🏅 스티커북 (메달) */
    medal:
      `<path d="M28 6 L46 6 L57 42 L38 47 Z" fill="#FF8FA8"/>` +
      `<path d="M72 6 L54 6 L43 42 L62 47 Z" fill="#7DD8FF"/>` +
      `<circle cx="48" cy="66" r="24" fill="#FFD93D"/>` +
      S(`<path d="M30 8 L48 8 L58 44 L40 49 Z"/><path d="M70 8 L52 8 L42 44 L60 49 Z"/>`, 6) +
      S(`<path d="M67 52 A22 22 0 1 0 70 80"/>`) +
      `<path d="M50 55 L54 64 L63 64 L56 70 L58 79 L50 74 L42 79 L44 70 L37 64 L46 64 Z" fill="#FF9A5C"/>`,

    /* 🔤 가 — 글자 찾기 */
    letters:
      `<ellipse cx="46" cy="52" rx="40" ry="36" fill="#CFE9FF"/>` +
      S(`<path d="M12 26 L44 26 L34 76"/><path d="M64 12 L64 88"/><path d="M64 50 L88 50"/>`),

    /* ✏️ 연필 */
    pencil:
      `<path d="M20 82 L29 53 L65 17 L83 35 L47 71 Z" fill="#FFD93D"/>` +
      S(`<path d="M24 78 L32 54 L66 20 L80 34 L46 68 Z"/><path d="M32 54 L46 68"/>`),

    /* 🃏 짝꿍 카드 */
    cards:
      `<path d="M18 32 L52 23 L63 74 L29 83 Z" fill="#FFB3D2"/>` +
      S(`<path d="M22 34 L54 26 L64 72 L32 80 Z"/><path d="M52 22 L84 28 L78 70 L62 73"/>`) +
      `<path d="M42 40 L45 48 L53 48 L47 53 L49 61 L42 56 L36 61 L38 53 L32 48 L40 48 Z" fill="#FFD93D"/>`,

    /* 🏠 집 */
    house:
      `<path d="M12 54 L50 17 L88 54 L80 86 L20 86 Z" fill="#FFD1A8"/>` +
      S(`<path d="M11 51 L50 14 L89 51"/><path d="M22 46 L23 84 L78 83 L77 45"/>`) +
      `<path d="M39 86 L38 58 L62 57 L63 85 Z" fill="#F6C453"/>` +
      S(`<path d="M41 84 L40 60 L60 59 L61 83"/>`, 6),

    /* 💡 힌트 */
    hint:
      `<circle cx="48" cy="43" r="23" fill="#FFE9A8"/>` +
      S(`<path d="M34 54 A20 20 0 1 1 66 54"/><path d="M37 56 L41 74 L59 74 L63 56"/>` +
        `<path d="M43 82 L57 82"/><path d="M50 5 L50 13"/><path d="M15 23 L22 29"/><path d="M85 23 L78 29"/>`),

    /* 🔁 다시 듣기 */
    replay:
      `<circle cx="47" cy="53" r="26" fill="#CFE9FF"/>` +
      S(`<path d="M76 44 A30 30 0 1 0 80 66"/>`) +
      S(`<path d="M62 32 L78 43 L90 27"/>`, 9),

    /* ◀ 뒤로 */
    back:
      `<path d="M61 15 L25 51 L61 87 Z" fill="#CFE9FF"/>` +
      S(`<path d="M64 18 L30 50 L64 82"/>`),

    /* ✕ 닫기 */
    close:
      `<circle cx="48" cy="52" r="30" fill="#F0E4E0"/>` +
      S(`<path d="M30 30 L70 70"/><path d="M70 30 L30 70"/>`),

    /* 🗑️ 모두 지우기 */
    trash:
      `<path d="M26 36 L33 86 L67 86 L74 36 Z" fill="#CFE0EA"/>` +
      S(`<path d="M16 30 L84 30"/><path d="M40 30 L40 18 L60 18 L60 30"/>` +
        `<path d="M28 34 L34 84 L66 84 L72 34"/>`) +
      S(`<path d="M44 46 L45 72"/><path d="M57 46 L56 72"/>`, 6),

    /* 🌈 배경 바꾸기 */
    rainbow:
      S(`<path d="M6 82 A44 44 0 0 1 94 82"/>`, 5) +
      `<g fill="none" stroke-linecap="round" stroke-width="10">` +
      `<path d="M12 80 A38 38 0 0 1 88 80" stroke="#FF8FA8"/>` +
      `<path d="M26 80 A24 24 0 0 1 74 80" stroke="#FFD93D"/>` +
      `<path d="M40 80 A10 10 0 0 1 60 80" stroke="#7DD8FF"/></g>`,

    /* 🎨 물감 판 */
    palette:
      `<path d="M48 12 C20 12 8 33 10 53 C12 74 32 85 48 85 C58 85 56 75 62 71 C70 65 84 71 86 55 C90 31 74 12 48 12 Z" fill="#FFF0C2"/>` +
      S(`<path d="M50 14 C22 14 10 35 12 55 C14 76 34 87 50 87 C60 87 58 77 64 73 C72 67 86 73 88 57 C92 33 76 14 50 14 Z"/>`, 7) +
      `<circle cx="33" cy="35" r="7" fill="#FF8FA8"/><circle cx="58" cy="30" r="7" fill="#7DD8FF"/>` +
      `<circle cx="26" cy="60" r="7" fill="#9BDB6B"/>` +
      S(`<path d="M50 62 A9 9 0 1 0 52 72"/>`, 6),

    /* 🌱 쉬움 */
    sprout:
      `<path d="M48 58 C31 60 21 49 21 36 C38 34 48 45 48 58 Z" fill="#9BDB6B"/>` +
      `<path d="M52 52 C69 54 79 43 79 30 C62 28 52 39 52 52 Z" fill="#9BDB6B"/>` +
      S(`<path d="M50 88 L50 48"/>` +
        `<path d="M50 58 C34 58 24 48 24 36 C40 34 50 44 50 58 Z"/>` +
        `<path d="M50 50 C66 52 76 42 76 30 C60 28 50 38 50 50 Z"/>`, 7),

    /* 🌟 보통 */
    star:
      `<path d="M47 14 L56 38 L82 39 L62 55 L69 80 L48 65 L27 80 L34 55 L14 39 L39 38 Z" fill="#FFD93D"/>` +
      S(`<path d="M50 16 L58.8 39.9 L84.2 40.9 L64.3 56.6 L71.2 81.1 L50 67 L28.8 81.1 L35.7 56.6 L15.8 40.9 L41.2 39.9 Z"/>`, 7),

    /* 🔥 어려움 */
    fire:
      `<path d="M48 9 C62 29 76 39 74 57 C72 76 62 87 48 87 C34 87 24 76 22 57 C20 41 34 33 48 9 Z" fill="#FF9A5C"/>` +
      S(`<path d="M50 10 C64 30 78 40 76 58 C74 77 64 88 50 88 C36 88 26 77 24 58 C22 42 36 34 50 10 Z"/>`, 7) +
      `<path d="M50 46 C58 56 62 62 60 70 C58 78 54 82 50 82 C46 82 42 78 40 70 C38 62 42 56 50 46 Z" fill="#FFD93D"/>`
  };

  /* 획을 떨리게 하는 필터는 문서에 딱 하나만 둔다 */
  const FILTER_ID = 'play-di-shake';
  function ensureFilter() {
    if (document.getElementById(FILTER_ID)) return;
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    host.innerHTML =
      `<svg width="0" height="0"><defs>` +
      `<filter id="${FILTER_ID}" x="-25%" y="-25%" width="150%" height="150%">` +
      `<feTurbulence type="fractalNoise" baseFrequency="0.038" numOctaves="2" seed="7"/>` +
      `<feDisplacementMap in="SourceGraphic" scale="2.6"/>` +
      `</filter></defs></svg>`;
    (document.body || document.documentElement).appendChild(host);
  }

  function svg(name) {
    const body = ICONS[name];
    if (!body) return '';
    return `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">` +
           `<g filter="url(#${FILTER_ID})">${body}</g></svg>`;
  }

  function set(el, name) {
    if (!el) return;
    const markup = svg(name);
    if (!markup) return;
    el.classList.add('di');
    el.dataset.di = name;
    el.innerHTML = markup;
  }

  /* data-di 가 붙었는데 아직 안 그려진 칸을 채운다 */
  function scan(root) {
    ensureFilter();
    (root || document).querySelectorAll('[data-di]').forEach(el => {
      if (el.firstElementChild && el.firstElementChild.tagName.toLowerCase() === 'svg') return;
      set(el, el.dataset.di);
    });
  }

  window.DoodleIcons = { svg, set, scan, has: n => !!ICONS[n] };

  scan();

  /* 놀이 중에 새로 만들어지는 화면(끝맺음 오버레이 등)도 자동으로 채워 준다 */
  if (window.MutationObserver) {
    new MutationObserver(muts => {
      for (const m of muts) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.hasAttribute('data-di')) set(node, node.dataset.di);
          if (node.querySelector && node.querySelector('[data-di]')) scan(node);
        }
      }
    }).observe(document.body || document.documentElement, { childList: true, subtree: true });
  }
})();
