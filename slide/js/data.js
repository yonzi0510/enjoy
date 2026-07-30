/* 네 색 슬라이드 데이터 — 색 조각 4종(빨강·노랑·초록·파랑) + 퍼즐 30개(단계별 10).
 * 놀이: 4개의 세로 열에 색 조각이 섞여 있다. 열을 탭하면 맨 위 조각이 뜨고(선택),
 *       다른 열을 탭하면 그 위로 옮겨진다. 카드가 보여주는 색으로 각 열을 정렬하면 완성.
 * 규칙: from 열이 비었으면 못 집고, to 열이 가득(CAPACITY)이면 못 놓는다(부드럽게 무시·무벌점).
 * 각 퍼즐은 목표(target=열별 색) + 시작(start=아래→위 색 배열) + 정답 이동(solution=[from,to]…)을
 *   포함한다. solution 을 start 에 적용하면 반드시 target 에 도달한다(생성기가 보장, validate 가 재검증).
 * ⚠️ 색 id·퍼즐 id·시작 배치는 아이 진행도(done 키)가 id로 저장되므로 함부로 바꾸지 않는다.
 */
window.SlideData = (() => {

  /* ─────────── 놀이 규칙 상수 ─────────── */
  const NCOLS = 4;      // 열 4개(=색 4종)
  const CAP = 3;        // 목표: 열마다 같은 색 3개
  const CAPACITY = 4;   // 열이 담을 수 있는 최대(작업 여유 1칸)

  /* ─────────── 색 조각 4종 ───────────
   * shape: 색약 구분을 돕는 모양(원·별·세모·네모). light/base/dark 는 명암.
   * 각 draw(uid)는 반짝이는 둥근 색 조각 <svg> 문자열을 돌려준다 (viewBox 0 0 100 100). */
  const COLORS = {
    red:    { name: '빨강', say: '빨간색', shape: 'circle',   light: '#F58275', base: '#E24B3B', dark: '#B4301F' },
    yellow: { name: '노랑', say: '노란색', shape: 'star',     light: '#FFE58C', base: '#F6C744', dark: '#D6A014' },
    green:  { name: '초록', say: '초록색', shape: 'triangle', light: '#93D783', base: '#57B24A', dark: '#3B8330' },
    blue:   { name: '파랑', say: '파란색', shape: 'square',   light: '#8CB8EF', base: '#4C86D6', dark: '#2C5FAC' },
  };

  // 각 색의 구분용 모양(가운데 은은한 엠보스)
  function shapeSvg(shape) {
    switch (shape) {
      case 'circle':   return '<circle cx="50" cy="50" r="21"/>';
      case 'square':   return '<rect x="30" y="30" width="40" height="40" rx="8"/>';
      case 'triangle': return '<path d="M50 27 L73 69 L27 69 Z" stroke-linejoin="round"/>';
      case 'star':     return '<path d="M50 26 L57 44 L76 44 L61 56 L67 74 L50 63 L33 74 L39 56 L24 44 L43 44 Z" stroke-linejoin="round"/>';
      default:         return '';
    }
  }

  // 색 조각 SVG — 둥근 광택 타일 + 색약 구분 모양
  function chipDraw(colorId, u) {
    const c = COLORS[colorId];
    if (!c) return '';
    return `
      <svg viewBox="0 0 100 100" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="${u}" cx=".36" cy=".3" r=".85">
          <stop offset="0" stop-color="${c.light}"/><stop offset=".55" stop-color="${c.base}"/><stop offset="1" stop-color="${c.dark}"/>
        </radialGradient></defs>
        <rect x="6" y="6" width="88" height="88" rx="26" fill="url(#${u})"/>
        <rect x="6" y="6" width="88" height="88" rx="26" fill="none" stroke="${c.dark}" stroke-width="2" opacity=".4"/>
        <g fill="#FFFFFF" fill-opacity=".26" stroke="${c.dark}" stroke-opacity=".22" stroke-width="2">${shapeSvg(c.shape)}</g>
        <ellipse cx="34" cy="30" rx="18" ry="12" fill="#FFFFFF" opacity=".38"/>
      </svg>`;
  }

  const COLOR_IDS = Object.keys(COLORS);
  const has = id => Object.prototype.hasOwnProperty.call(COLORS, id);
  const meta = id => COLORS[id];

  /* ─────────── 퍼즐 30개 (단계별 10) ───────────
   * perm: 카드가 보여주는 열별 목표 색(왼→오). start: 열별 아래→위 색 배열.
   * solution: [from,to] 이동 목록 — start 에 순서대로 적용하면 target 완성.
   * 난이도 = 이동 수: 단계1=2수(거의 정렬), 단계2=4수, 단계3=6수. */
  const R = 'red', Y = 'yellow', G = 'green', B = 'blue';
  const q = (id, perm, start, solution) => ({
    level: +id[1], id, perm, start, target: perm.map(col => Array(CAP).fill(col)), solution,
  });

  const PUZZLES = [
    /* 단계1 — 2수 */
    q('l1-a', [B, G, R, Y], [[B,B,B], [G,G,G,Y], [R,R,R], [Y,Y]], [[1,2], [2,3]]),
    q('l1-b', [B, G, Y, R], [[B,B,B,Y], [G,G,G,R], [Y,Y], [R,R]], [[1,3], [0,2]]),
    q('l1-c', [Y, R, G, B], [[Y,Y,R], [R,R], [G,G,G,Y], [B,B,B]], [[0,1], [2,0]]),
    q('l1-d', [Y, G, B, R], [[Y,Y,Y], [G,G], [B,B,B,G], [R,R,R]], [[2,0], [0,1]]),
    q('l1-e', [R, Y, G, B], [[R,R,R], [Y,Y,B], [G,G,G,Y], [B,B]], [[1,3], [2,1]]),
    q('l1-f', [G, B, R, Y], [[G,G,G,Y], [B,B,B,R], [R,R], [Y,Y]], [[0,3], [1,2]]),
    q('l1-g', [G, B, Y, R], [[G,G,G], [B], [Y,Y,Y,B], [R,R,R,B]], [[3,1], [2,1]]),
    q('l1-h', [Y, R, B, G], [[Y,Y], [R,R,R], [B,B,B,G], [G,G,Y]], [[3,0], [2,3]]),
    q('l1-i', [G, R, B, Y], [[G,G], [R,R,R], [B,B,B,G], [Y,Y,Y]], [[2,3], [3,0]]),
    q('l1-j', [Y, G, R, B], [[Y,Y,Y,G], [G,G], [R,R,R,B], [B,B]], [[0,1], [2,3]]),
    /* 단계2 — 4수 */
    q('l2-a', [G, R, Y, B], [[G,G], [R,R,R], [Y,Y,Y,G], [B,B,B]], [[1,0], [0,3], [2,0], [3,1]]),
    q('l2-b', [B, Y, R, G], [[B,B,B,R], [Y,Y,Y,R], [], [G,G,G,R]], [[3,2], [0,2], [1,3], [3,2]]),
    q('l2-c', [Y, G, R, B], [[Y,Y], [G,G,G,R], [R,R,B], [B,B,Y]], [[3,2], [2,0], [2,3], [1,2]]),
    q('l2-d', [G, B, R, Y], [[G,G,G], [B], [R,R,R,B], [Y,Y,Y,B]], [[1,0], [3,1], [2,1], [0,1]]),
    q('l2-e', [G, B, Y, R], [[G,G,G], [B,B], [Y,Y,Y], [R,R,R,B]], [[1,2], [3,0], [2,1], [0,1]]),
    q('l2-f', [R, G, Y, B], [[R,R,R], [G,G,Y], [Y,Y], [B,B,B,G]], [[3,2], [2,0], [1,2], [0,1]]),
    q('l2-g', [R, B, G, Y], [[R,R,R,Y], [B,B,B], [G,G,G,Y], [Y]], [[0,3], [0,1], [2,3], [1,0]]),
    q('l2-h', [Y, B, R, G], [[Y,Y,Y], [B,B,G], [R,R,R], [G,G,B]], [[3,0], [1,2], [0,1], [2,3]]),
    q('l2-i', [G, Y, B, R], [[G,G,G,B], [Y,Y,Y,R], [B,B], [R,R]], [[1,3], [0,1], [1,3], [3,2]]),
    q('l2-j', [Y, B, G, R], [[Y,Y,Y,R], [B,B], [G,G], [R,R,G,B]], [[3,1], [3,1], [0,3], [1,2]]),
    /* 단계3 — 6수 */
    q('l3-a', [B, R, Y, G], [[B,B,B,Y], [R,R,Y,R], [Y], [G,G,G]], [[0,3], [1,0], [1,2], [3,2], [0,2], [2,1]]),
    q('l3-b', [Y, B, G, R], [[Y], [B,B,Y], [G,G,G,B], [R,R,R,Y]], [[1,0], [3,0], [2,1], [3,2], [2,1], [1,3]]),
    q('l3-c', [G, B, R, Y], [[G,G,B], [B,B,G], [R,R,R], [Y,Y,Y]], [[1,0], [0,2], [0,1], [0,1], [2,0], [1,0]]),
    q('l3-d', [Y, B, G, R], [[Y,Y,R], [B,B,B], [G,G,G,Y], [R,R]], [[1,0], [0,3], [3,1], [0,3], [2,3], [3,0]]),
    q('l3-e', [G, R, Y, B], [[G,G,G,R], [R,R,B], [Y,Y,Y], [B,B]], [[0,1], [1,3], [3,0], [0,2], [1,3], [2,1]]),
    q('l3-f', [G, Y, R, B], [[G,G,R,Y], [Y,Y], [R,R,B], [B,B,G]], [[2,3], [0,1], [0,2], [3,2], [3,0], [2,3]]),
    q('l3-g', [Y, G, B, R], [[Y,Y,Y,R], [G,G,R], [B,B,B,G], [R]], [[1,3], [2,1], [3,1], [1,2], [0,3], [2,3]]),
    q('l3-h', [Y, G, R, B], [[Y,Y,Y,R], [G,G,G], [R], [B,B,B,R]], [[0,1], [3,2], [3,2], [2,0], [0,3], [1,2]]),
    q('l3-i', [G, R, B, Y], [[G,G], [R,B], [B,B,R,G], [Y,Y,Y,R]], [[2,0], [1,2], [2,0], [2,1], [3,1], [0,2]]),
    q('l3-j', [B, R, G, Y], [[B,Y], [R,R,R,Y], [G,G,G,B], [Y,B]], [[0,3], [2,0], [3,2], [3,0], [1,3], [2,3]]),
  ];

  const LEVELS = [
    { id: 1, name: '쉬운 정리', desc: '두 번만 옮겨요', cls: 'c-l1' },
    { id: 2, name: '보통 정리', desc: '조금 섞였어요', cls: 'c-l2' },
    { id: 3, name: '어려운 정리', desc: '많이 섞였어요', cls: 'c-l3' },
  ];
  const levelDef = id => LEVELS.find(l => l.id === id);
  const puzzlesOf = level => PUZZLES.filter(x => x.level === level);
  const puzzleById = id => PUZZLES.find(x => x.id === id) || null;

  const praises = ['우와, 색을 다 정리했어요!', '알록달록 참 잘했어요!', '카드랑 똑같아졌어요!', '멋지게 맞췄어요!', '색깔 척척박사네요!'];

  return {
    NCOLS, CAP, CAPACITY,
    COLORS, COLOR_IDS, has, meta, chipDraw,
    PUZZLES, LEVELS, levelDef, puzzlesOf, puzzleById, praises,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = window.SlideData;
