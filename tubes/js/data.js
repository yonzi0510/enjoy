/* 시험관 구슬 데이터 — 색 구슬 6종 + 시험관 유리(인라인 SVG) + 퍼즐 30개(단계별 10).
 * 각 퍼즐은 시험관 여러 개, 관마다 아래→위 색 순서. node 검증에서도 문자열만 다루므로 안전하다.
 * ⚠️ 색 id·퍼즐 id·순서는 아이 진행도(done 키)가 id로 저장되므로 함부로 바꾸지 않는다.
 */
window.TubesData = (() => {

  /* 그라데이션 id 충돌을 막는 uid 카운터 (한 구슬을 카드·관·팔레트에 여러 번 그린다) */
  let _uid = 0;
  const nextUid = () => 't' + (_uid++);

  /* ─────────── 색 구슬 6종 ───────────
   * 각 draw(uid)는 반짝이는 구슬 <svg> 문자열을 돌려준다 (viewBox 0 0 40 40). */
  const COLORS = {
    red:    { name: '빨강', say: '빨간색', light: '#F58275', base: '#E24B3B', dark: '#B4301F' },
    orange: { name: '주황', say: '주황색', light: '#FFC069', base: '#F39A2B', dark: '#CC760F' },
    yellow: { name: '노랑', say: '노란색', light: '#FFE58C', base: '#F6C744', dark: '#D6A014' },
    green:  { name: '초록', say: '초록색', light: '#93D783', base: '#57B24A', dark: '#3B8330' },
    blue:   { name: '파랑', say: '파란색', light: '#8CB8EF', base: '#4C86D6', dark: '#2C5FAC' },
    purple: { name: '보라', say: '보라색', light: '#C6A6E9', base: '#9B6FD0', dark: '#6F44A8' },
  };

  // 구슬 SVG — 라디얼 하이라이트로 반짝이게
  function beadDraw(colorId, u) {
    const c = COLORS[colorId];
    if (!c) return '';
    return `
      <svg viewBox="0 0 40 40" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="${u}" cx=".37" cy=".32" r=".78">
          <stop offset="0" stop-color="${c.light}"/><stop offset=".55" stop-color="${c.base}"/><stop offset="1" stop-color="${c.dark}"/>
        </radialGradient></defs>
        <circle cx="20" cy="20" r="18.6" fill="url(#${u})"/>
        <circle cx="20" cy="20" r="18.6" fill="none" stroke="${c.dark}" stroke-width="1.1" opacity=".45"/>
        <ellipse cx="14" cy="12.5" rx="6.6" ry="4.6" fill="#FFFFFF" opacity=".6"/>
        <circle cx="26" cy="27" r="3.2" fill="#FFFFFF" opacity=".18"/>
      </svg>`;
  }

  // 시험관 유리 SVG — 세로로 늘여도 선 두께가 유지되도록 non-scaling-stroke.
  function glassDraw(u) {
    return `
      <svg class="glass-svg" viewBox="0 0 100 340" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="${u}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#FBFDFF" stop-opacity=".55"/>
          <stop offset=".18" stop-color="#FFFFFF" stop-opacity=".9"/>
          <stop offset=".5" stop-color="#DCE7F8" stop-opacity=".28"/>
          <stop offset="1" stop-color="#C6D5EF" stop-opacity=".45"/>
        </linearGradient></defs>
        <path d="M20,14 L20,278 Q20,322 50,322 Q80,322 80,278 L80,14"
          fill="url(#${u})" stroke="#AEC0E4" stroke-width="4" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
        <ellipse cx="50" cy="14" rx="30" ry="7.5" fill="#E7EEFB" stroke="#AEC0E4" stroke-width="4" vector-effect="non-scaling-stroke"/>
        <ellipse cx="50" cy="14" rx="24" ry="5" fill="#F4F8FE"/>
        <rect x="30" y="30" width="7" height="260" rx="3.5" fill="#FFFFFF" opacity=".55"/>
      </svg>`;
  }

  const COLOR_IDS = Object.keys(COLORS);
  const has = id => Object.prototype.hasOwnProperty.call(COLORS, id);
  const meta = id => COLORS[id];

  /* ─────────── 퍼즐 30개 (단계별 10) ───────────
   * tubes: 시험관 배열. 각 관은 아래→위 색 id 배열.
   * 단계1=관 2개·길이 3, 단계2=관 3개·길이 4, 단계3=관 4개·길이 5.
   * 퍼즐끼리 서로 겹치지 않는다(전체 배치가 유일). */
  const p = (level, id, tubes) => ({ level, id, tubes });

  const R = 'red', O = 'orange', Y = 'yellow', G = 'green', B = 'blue', P = 'purple';

  const PUZZLES = [
    /* 단계1 — 관 2개, 길이 3 */
    p(1, 'l1-a', [[R, Y, B], [G, O, P]]),
    p(1, 'l1-b', [[B, G, R], [Y, P, O]]),
    p(1, 'l1-c', [[P, R, G], [B, O, Y]]),
    p(1, 'l1-d', [[O, B, Y], [R, G, P]]),
    p(1, 'l1-e', [[G, P, R], [Y, B, O]]),
    p(1, 'l1-f', [[R, O, Y], [G, B, P]]),
    p(1, 'l1-g', [[Y, R, P], [O, G, B]]),
    p(1, 'l1-h', [[B, Y, G], [P, R, O]]),
    p(1, 'l1-i', [[P, G, B], [O, Y, R]]),
    p(1, 'l1-j', [[G, R, O], [B, P, Y]]),

    /* 단계2 — 관 3개, 길이 4 */
    p(2, 'l2-a', [[R, O, Y, G], [B, P, R, O], [Y, G, B, P]]),
    p(2, 'l2-b', [[B, G, Y, O], [R, P, B, G], [Y, O, R, P]]),
    p(2, 'l2-c', [[P, B, G, Y], [O, R, P, B], [G, Y, O, R]]),
    p(2, 'l2-d', [[G, Y, O, R], [P, B, G, Y], [O, R, P, B]]),
    p(2, 'l2-e', [[R, B, R, B], [G, Y, G, Y], [P, O, P, O]]),
    p(2, 'l2-f', [[Y, P, G, R], [B, O, Y, P], [G, R, B, O]]),
    p(2, 'l2-g', [[O, Y, B, G], [R, P, O, Y], [B, G, R, P]]),
    p(2, 'l2-h', [[P, G, R, Y], [B, O, P, G], [R, Y, B, O]]),
    p(2, 'l2-i', [[R, R, G, G], [B, B, Y, Y], [P, P, O, O]]),
    p(2, 'l2-j', [[G, B, P, R], [Y, O, G, B], [P, R, Y, O]]),

    /* 단계3 — 관 4개, 길이 5 */
    p(3, 'l3-a', [[R, O, Y, G, B], [P, R, O, Y, G], [B, P, R, O, Y], [G, B, P, R, O]]),
    p(3, 'l3-b', [[B, G, Y, O, R], [P, B, G, Y, O], [R, P, B, G, Y], [O, R, P, B, G]]),
    p(3, 'l3-c', [[P, B, G, Y, O], [R, P, B, G, Y], [O, R, P, B, G], [Y, O, R, P, B]]),
    p(3, 'l3-d', [[G, Y, O, R, P], [B, G, Y, O, R], [P, B, G, Y, O], [R, P, B, G, Y]]),
    p(3, 'l3-e', [[R, B, R, B, R], [G, Y, G, Y, G], [P, O, P, O, P], [B, R, B, R, B]]),
    p(3, 'l3-f', [[Y, P, G, R, O], [B, O, Y, P, G], [R, G, B, O, Y], [P, Y, R, G, B]]),
    p(3, 'l3-g', [[O, Y, B, G, R], [P, O, Y, B, G], [R, P, O, Y, B], [G, R, P, O, Y]]),
    p(3, 'l3-h', [[P, G, R, Y, B], [O, P, G, R, Y], [B, O, P, G, R], [Y, B, O, P, G]]),
    p(3, 'l3-i', [[R, R, G, G, B], [B, Y, Y, P, P], [O, O, R, G, B], [Y, P, O, R, G]]),
    p(3, 'l3-j', [[G, B, P, R, Y], [O, G, B, P, R], [Y, O, G, B, P], [R, Y, O, G, B]]),
  ];

  const LEVELS = [
    { id: 1, icon: '🧪', name: '쉬운 관', desc: '관 2개 · 구슬 3개', cls: 'c-l1', tubes: 2, len: 3 },
    { id: 2, icon: '⚗️', name: '보통 관', desc: '관 3개 · 구슬 4개', cls: 'c-l2', tubes: 3, len: 4 },
    { id: 3, icon: '🔬', name: '어려운 관', desc: '관 4개 · 구슬 5개', cls: 'c-l3', tubes: 4, len: 5 },
  ];
  const levelDef = id => LEVELS.find(l => l.id === id);
  const puzzlesOf = level => PUZZLES.filter(x => x.level === level);
  const puzzleById = id => PUZZLES.find(x => x.id === id) || null;
  // 퍼즐에 담긴 구슬 총 개수(별점·완성 판정용)
  const beadTotal = pz => pz.tubes.reduce((n, t) => n + t.length, 0);

  const praises = ['우와, 다 채웠어요!', '색깔 순서 척척! 참 잘했어요!', '알록달록 예쁘다!', '멋진 과학자네요!', '반짝반짝 최고예요!'];

  return {
    COLORS, COLOR_IDS, has, meta, beadDraw, glassDraw,
    PUZZLES, LEVELS, levelDef, puzzlesOf, puzzleById, beadTotal, praises, nextUid,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = window.TubesData;
