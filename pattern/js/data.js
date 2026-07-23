/* 패턴 놀이터 데이터 — 알록달록 도형 타일과 "빈칸 채우기" 퍼즐 30개(단계별 10).
 * 타일 = { 도형 6종 × 색 6종 } + 어려운 단계용 대각 2색 분할 타일 몇 종.
 * 퍼즐은 반복 규칙(period)이 있는 완성된 줄(pattern)에서 일부 칸을 빈칸(blanks)으로 뚫는다.
 * 그림은 인라인 SVG(외부 이미지 금지). node 검증에서도 문자열만 다루므로 안전하다.
 * ⚠️ 퍼즐 id 는 아이 진행도(done 키)로 저장되므로 함부로 바꾸지 않는다.
 *   (타일 id 는 내부용 — 저장에 쓰지 않는다.)
 */
window.PatternData = (() => {

  /* ─────────── 도형 6종 ───────────
   * body(fill, stroke) 는 100×100 박스 안의 도형 SVG 조각(문자열)을 돌려준다. */
  const SHAPES = {
    tri:    { name: '세모',   body: (f, s) => `<path d="M50 13 L89 84 L11 84 Z" fill="${f}" stroke="${s}" stroke-width="6" stroke-linejoin="round"/>` },
    heart:  { name: '하트',   body: (f, s) => `<path d="M50 85 C18 62 10 39 27 26 C39 17 50 25 50 35 C50 25 61 17 73 26 C90 39 82 62 50 85 Z" fill="${f}" stroke="${s}" stroke-width="6" stroke-linejoin="round"/>` },
    diamond:{ name: '마름모', body: (f, s) => `<path d="M50 8 L90 50 L50 92 L10 50 Z" fill="${f}" stroke="${s}" stroke-width="6" stroke-linejoin="round"/>` },
    circle: { name: '동그라미', body: (f, s) => `<circle cx="50" cy="50" r="37" fill="${f}" stroke="${s}" stroke-width="6"/>` },
    square: { name: '네모',   body: (f, s) => `<rect x="15" y="15" width="70" height="70" rx="14" fill="${f}" stroke="${s}" stroke-width="6" stroke-linejoin="round"/>` },
    star:   { name: '별',     body: (f, s) => `<path d="M50 10 L61 39 L91 39 L66 58 L77 87 L50 68 L23 87 L34 58 L9 39 L39 39 Z" fill="${f}" stroke="${s}" stroke-width="6" stroke-linejoin="round"/>` },
  };

  /* ─────────── 색 6종 (보드게임처럼 선명·플랫) ─────────── */
  const COLORS = {
    r: { name: '빨강', hex: '#E24B3B', dark: '#A82A1D' },
    y: { name: '노랑', hex: '#FFC12E', dark: '#C98A08' },
    b: { name: '파랑', hex: '#2E8FE0', dark: '#1A5FA8' },
    g: { name: '초록', hex: '#4FB84A', dark: '#2E8028' },
    p: { name: '분홍', hex: '#FF7FAA', dark: '#D64C7C' },
    v: { name: '보라', hex: '#9B6FD6', dark: '#6A44A8' },
  };

  const SHAPE_IDS = Object.keys(SHAPES);
  const COLOR_IDS = Object.keys(COLORS);

  function svgWrap(inner) {
    return `<svg viewBox="0 0 100 100" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  }

  /* ─────────── 타일 정의 ───────────
   * 일반 타일 id = `${shape}-${color}` (예: 'tri-r' = 빨강 세모)
   * 분할 타일 id = `${shape}-${c1}${c2}` (예: 'tri-rb' = 빨강·파랑 세모) */
  const TILES = {};

  // 일반 타일 36종
  SHAPE_IDS.forEach(sh => COLOR_IDS.forEach(co => {
    const id = sh + '-' + co;
    TILES[id] = {
      id, shape: sh, color: co, split: false,
      name: COLORS[co].name + ' ' + SHAPES[sh].name,
      say: COLORS[co].name + ' ' + SHAPES[sh].name,
      draw() { const c = COLORS[co]; return svgWrap(SHAPES[sh].body(c.hex, c.dark)); },
    };
  }));

  // 대각 2색 분할 타일 (어려운 단계용)
  const SPLITS = [
    ['tri', 'r', 'b'],
    ['circle', 'y', 'g'],
    ['square', 'p', 'v'],
    ['circle', 'r', 'y'],
  ];
  SPLITS.forEach(([sh, c1, c2]) => {
    const id = sh + '-' + c1 + c2;
    TILES[id] = {
      id, shape: sh, split: true, colors: [c1, c2],
      name: COLORS[c1].name + COLORS[c2].name + ' ' + SHAPES[sh].name,
      say: COLORS[c1].name + ' ' + COLORS[c2].name + ' ' + SHAPES[sh].name,
      draw(u) {
        u = u || ('s' + id);
        const defs = `<defs><linearGradient id="${u}" x1="0" y1="0" x2="1" y2="1">` +
          `<stop offset="0.5" stop-color="${COLORS[c1].hex}"/><stop offset="0.5" stop-color="${COLORS[c2].hex}"/>` +
          `</linearGradient></defs>`;
        return svgWrap(defs + SHAPES[sh].body('url(#' + u + ')', '#3A2740'));
      },
    };
  });

  const TILE_IDS = Object.keys(TILES);
  const SOLID_IDS = TILE_IDS.filter(id => !TILES[id].split);   // 방해 타일은 일반 타일에서만 뽑는다
  const has = id => Object.prototype.hasOwnProperty.call(TILES, id);
  const tile = id => TILES[id];

  /* ─────────── 퍼즐 빌더 ───────────
   * base: 한 주기(period) 타일 배열 · len: 전체 줄 길이 · blanks: 빈칸 인덱스 배열
   * pattern 은 base 를 len 만큼 반복해 만든다(반복 규칙 그대로). */
  function rep(base, len) {
    const out = [];
    for (let i = 0; i < len; i++) out.push(base[i % base.length]);
    return out;
  }
  const pz = (level, id, base, len, blanks) => ({
    level, id, period: base.length,
    pattern: rep(base, len), blanks: blanks.slice(),
  });

  /* 짧은 표기 도우미 */
  const T = id => id; // 가독성용 (그냥 문자열)

  const PUZZLES = [
    /* ─────────── 단계1 (쉬움·이어가기) ───────────
     * 단순 AB·ABC 반복, 빈칸 1개가 줄 끝(다음에 올 것 고르기). 보이는 타일 3~4 + 빈칸 1. */
    pz(1, 'l1-01', ['tri-r', 'circle-b'],            4, [3]),
    pz(1, 'l1-02', ['star-y', 'heart-v'],            4, [3]),
    pz(1, 'l1-03', ['square-g', 'diamond-p'],        5, [4]),
    pz(1, 'l1-04', ['circle-r', 'circle-y'],         4, [3]),   // 색만 바뀌는 패턴
    pz(1, 'l1-05', ['heart-p', 'star-b'],            5, [4]),
    pz(1, 'l1-06', ['tri-b', 'square-y', 'circle-g'],5, [4]),   // ABCA_ → B
    pz(1, 'l1-07', ['diamond-r', 'heart-v', 'star-p'],5, [4]),
    pz(1, 'l1-08', ['circle-g', 'tri-y', 'square-b'],5, [4]),
    pz(1, 'l1-09', ['diamond-v', 'tri-g'],           4, [3]),
    pz(1, 'l1-10', ['star-r', 'circle-p', 'heart-b'],5, [4]),

    /* ─────────── 단계2 (중간·가운데 채우기) ───────────
     * ABB·ABC·AB 반복, 빈칸이 가운데(끝이 아님). 타일 5~6. */
    pz(2, 'l2-01', ['tri-r', 'circle-b', 'circle-b'],   6, [3]),   // ABB
    pz(2, 'l2-02', ['star-y', 'heart-p', 'diamond-g'],  6, [4]),   // ABC
    pz(2, 'l2-03', ['square-v', 'star-y', 'star-y'],    6, [2]),   // ABB
    pz(2, 'l2-04', ['circle-r', 'diamond-b'],           6, [3]),   // AB
    pz(2, 'l2-05', ['heart-g', 'star-p'],               5, [2]),   // AB
    pz(2, 'l2-06', ['diamond-v', 'circle-y', 'tri-b'],  6, [2]),   // ABC
    pz(2, 'l2-07', ['circle-g', 'square-p', 'square-p'],6, [3]),   // ABB
    pz(2, 'l2-08', ['heart-b', 'diamond-r', 'diamond-r'],6, [3]),  // ABB
    pz(2, 'l2-09', ['star-y', 'tri-v'],                 5, [2]),   // AB
    pz(2, 'l2-10', ['tri-p', 'square-g', 'circle-r'],   6, [3]),   // ABC

    /* ─────────── 단계3 (어려움) ───────────
     * 더 긴 반복(ABCD·AABB) 또는 2색 분할 타일 섞기, 빈칸 1~2개. 타일 6~8. */
    pz(3, 'l3-01', ['tri-r', 'circle-y', 'square-b', 'heart-g'],   8, [5]),        // ABCD
    pz(3, 'l3-02', ['diamond-p', 'star-v', 'circle-g', 'square-r'],8, [3, 6]),     // ABCD, 빈칸 2
    pz(3, 'l3-03', ['tri-y', 'circle-b', 'heart-p'],               6, [1, 5]),     // ABC, 빈칸 2
    pz(3, 'l3-04', ['tri-rb', 'circle-yg', 'star-p'],              6, [4]),         // 분할 타일 섞기
    pz(3, 'l3-05', ['star-g', 'star-g', 'tri-v', 'tri-v'],         8, [3]),         // AABB
    pz(3, 'l3-06', ['heart-r', 'square-pv', 'diamond-b'],          6, [1]),         // 분할 타일 섞기
    pz(3, 'l3-07', ['circle-p', 'heart-y', 'square-g', 'tri-b'],   8, [1, 6]),      // ABCD, 빈칸 2
    pz(3, 'l3-08', ['diamond-g', 'star-r', 'circle-y'],            7, [2, 4]),      // ABC, 빈칸 2
    pz(3, 'l3-09', ['tri-y', 'circle-r', 'star-b', 'heart-v'],     8, [5]),         // ABCD
    pz(3, 'l3-10', ['square-r', 'circle-ry', 'tri-b', 'diamond-g'],8, [6]),         // ABCD + 분할 타일
  ];

  /* 각 퍼즐의 빈칸 정답(빈칸 순서대로) */
  function answersOf(p) { return p.blanks.map(i => p.pattern[i]); }

  const LEVELS = [
    { id: 1, name: '이어가기', desc: '다음에 올 조각은?', cls: 'c-l1', extra: 2 },
    { id: 2, name: '가운데 채우기', desc: '빈칸에 알맞은 조각', cls: 'c-l2', extra: 3 },
    { id: 3, name: '어려운 패턴', desc: '길고 알록달록한 규칙', cls: 'c-l3', extra: 3 },
  ];
  const levelDef = id => LEVELS.find(l => l.id === id);
  const puzzlesOf = level => PUZZLES.filter(x => x.level === level);
  const puzzleById = id => PUZZLES.find(x => x.id === id) || null;

  const praises = ['우와, 패턴 완성!', '딱 맞았어요! 참 잘했어요!', '규칙을 척척 찾았네요!', '멋진 눈썰미예요!', '반짝반짝! 최고예요!'];

  return {
    SHAPES, COLORS, TILES, TILE_IDS, SOLID_IDS, has, tile,
    PUZZLES, LEVELS, levelDef, puzzlesOf, puzzleById, answersOf, praises,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = window.PatternData;
