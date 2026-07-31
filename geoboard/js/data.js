/* 지오보드 데이터 — 못(핀) 6×6 격자 · 고무줄 색 5종 · 퍼즐 30개(단계별 10).
 * 실제 나무 지오보드 장난감처럼, 못과 못 사이에 색 고무줄을 걸어 본보기 카드와 똑같은 모양을 만든다.
 * 세그먼트는 못 두 개(격자좌표 [gx,gy], 0~GRID-1 정수)를 잇는 직선 — 이웃한 못뿐 아니라
 * 대각선으로 멀리 떨어진 못끼리도 이을 수 있다(장난감 실물과 동일).
 * 그림은 좌표·색만으로 SVG를 그리므로 node 검증에서도 문자열/숫자만 다뤄 안전하다.
 * ⚠️ 퍼즐 id·세그먼트 배치는 아이 진행도(done 키)가 id 로 저장되므로 함부로 바꾸지 않는다.
 */
window.GeoboardData = (() => {

  const GRID = 6; // 못 6×6 (좌표 0~5)
  const pegCount = GRID * GRID;
  const pegIndex = (gx, gy) => gy * GRID + gx;
  const pegOf = (i) => [i % GRID, Math.floor(i / GRID)];

  /* ─────────── 고무줄 색 5종 ─────────── */
  const COLORS = {
    red:    { name: '빨강', say: '빨강 고무줄', hex: '#EF4E4E', lt: '#FF9C90', dk: '#C42F2F' },
    blue:   { name: '파랑', say: '파랑 고무줄', hex: '#4DA6E8', lt: '#9BD0F5', dk: '#2E7CC0' },
    yellow: { name: '노랑', say: '노랑 고무줄', hex: '#F4CE2A', lt: '#FCE885', dk: '#CBA200' },
    green:  { name: '초록', say: '초록 고무줄', hex: '#57BE4E', lt: '#A7E58C', dk: '#3E9636' },
    orange: { name: '주황', say: '주황 고무줄', hex: '#F5952E', lt: '#FFC57A', dk: '#CE6E12' },
  };
  const COLOR_IDS = Object.keys(COLORS);
  const hasColor = id => Object.prototype.hasOwnProperty.call(COLORS, id);
  const colorMeta = id => COLORS[id];

  /* 고무줄 색 견본 SVG(트레이·본보기 공용) */
  function bandSwatchSVG(id, u) {
    const c = COLORS[id];
    return `
    <svg viewBox="0 0 100 44" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c.lt}"/><stop offset="1" stop-color="${c.hex}"/>
      </linearGradient></defs>
      <line x1="10" y1="30" x2="90" y2="14" stroke="${c.dk}" stroke-width="13" stroke-linecap="round"/>
      <line x1="10" y1="28" x2="90" y2="12" stroke="url(#${u})" stroke-width="9" stroke-linecap="round"/>
      <line x1="18" y1="24" x2="55" y2="17" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>
    </svg>`;
  }

  /* ─────────── 세그먼트 만들기 헬퍼 ───────────
   * seg: 못 (x1,y1) → (x2,y2) 사이 색 고무줄 하나.
   * rectSegs: 네모(4변) · polySegs: 꺾은선(열림/닫힘) · starSegs: 점 5개를 하나 건너 잇는 별. */
  const seg = (x1, y1, x2, y2, color) => ({ from: [x1, y1], to: [x2, y2], color });
  function rectSegs(x1, y1, x2, y2, color) {
    return [seg(x1, y1, x2, y1, color), seg(x2, y1, x2, y2, color), seg(x2, y2, x1, y2, color), seg(x1, y2, x1, y1, color)];
  }
  function polySegs(points, color, closed) {
    const out = [];
    for (let i = 0; i < points.length - 1; i++) out.push(seg(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], color));
    if (closed) out.push(seg(points[points.length - 1][0], points[points.length - 1][1], points[0][0], points[0][1], color));
    return out;
  }
  // 못 인덱스로 세그먼트 endpoint 비교(순서 무관)
  function sameSeg(s, p1, p2) {
    const eq = (a, b) => a[0] === b[0] && a[1] === b[1];
    return (eq(s.from, p1) && eq(s.to, p2)) || (eq(s.from, p2) && eq(s.to, p1));
  }
  const colorsOf = pz => Array.from(new Set(pz.segments.map(s => s.color)));

  const p = (stage, id, segments) => ({ stage, id, segments });

  /* ─────────── 퍼즐 30개(단계별 10) ─────────── */
  const PUZZLES = [
    /* ── 단계1 — 세그먼트 2~4개, 색 1~2종. 열린 선·세모·화살 같은 단순 모양 ── */
    p(1, 's1-01', [seg(0, 0, 5, 5, 'red'), seg(5, 0, 0, 5, 'blue')]),                                   // 큰 X
    p(1, 's1-02', polySegs([[1, 1], [4, 1], [2, 4]], 'green', true)),                                   // 세모
    p(1, 's1-03', polySegs([[0, 4], [2, 1], [4, 4]], 'yellow')),                                        // 산 모양(^)
    p(1, 's1-04', polySegs([[1, 0], [1, 4], [4, 4]], 'blue')),                                          // 기역자
    p(1, 's1-05', polySegs([[0, 0], [4, 0], [0, 4], [4, 4]], 'orange')),                                // 지그재그(Z)
    p(1, 's1-06', polySegs([[4, 0], [1, 0], [1, 4], [4, 4]], 'red')),                                   // 대괄호([)
    p(1, 's1-07', [seg(0, 1, 3, 1, 'green'), seg(0, 3, 3, 3, 'blue')]),                                 // 나란한 두 줄
    p(1, 's1-08', [seg(0, 3, 1, 3, 'red'), seg(1, 3, 4, 3, 'red'), seg(4, 3, 3, 1, 'blue'), seg(4, 3, 3, 5, 'blue')]), // 화살표
    p(1, 's1-09', polySegs([[0, 1], [2, 4], [4, 1]], 'orange')),                                        // 계곡 모양(v)
    p(1, 's1-10', polySegs([[2, 0], [5, 2], [2, 5]], 'blue', true)),                                    // 오른쪽 세모

    /* ── 단계2 — 세그먼트 5~8개, 색 2~3종. 집·배·별·봉투 같은 겹친 모양 ── */
    p(2, 's2-01', [...rectSegs(0, 3, 4, 5, 'red'), ...polySegs([[0, 3], [2, 1], [4, 3]], 'orange')]),   // 집(벽+지붕)
    p(2, 's2-02', [...rectSegs(1, 2, 4, 5, 'red'), ...polySegs([[1, 2], [2, 0], [4, 2]], 'orange'),
      seg(2, 5, 2, 4, 'yellow'), seg(3, 5, 3, 4, 'yellow')]),                                            // 집(문기둥까지)
    p(2, 's2-03', [...polySegs([[0, 4], [1, 1], [2, 4], [3, 1], [4, 4]], 'blue'),
      seg(4, 4, 5, 3, 'red'), seg(4, 4, 5, 5, 'red')]),                                                  // 지그재그 화살표
    p(2, 's2-04', [...polySegs([[1, 4], [4, 4], [3, 5], [2, 5]], 'blue', true),
      seg(2, 4, 2, 1, 'red'), ...polySegs([[2, 1], [4, 3], [2, 3]], 'yellow')]),                         // 돛단배
    p(2, 's2-05', [seg(2, 0, 3, 5, 'yellow'), seg(3, 5, 0, 2, 'orange'), seg(0, 2, 4, 2, 'yellow'),
      seg(4, 2, 1, 5, 'orange'), seg(1, 5, 2, 0, 'yellow')]),                                            // 별(한 붓 그리기)
    p(2, 's2-06', [...rectSegs(0, 2, 5, 5, 'red'), ...polySegs([[0, 2], [2, 3], [5, 2]], 'blue')]),      // 편지봉투
    p(2, 's2-07', [seg(0, 1, 3, 1, 'red'), seg(0, 3, 3, 3, 'red'), seg(0, 1, 0, 3, 'red'),
      seg(3, 0, 5, 2, 'blue'), seg(3, 4, 5, 2, 'blue')]),                                                // 화살표 표지판
    p(2, 's2-08', [...polySegs([[2, 0], [4, 2], [2, 4], [0, 2]], 'red', true),
      seg(2, 0, 2, 4, 'blue'), seg(0, 2, 4, 2, 'blue')]),                                                // 마름모+십자
    p(2, 's2-09', [...rectSegs(1, 2, 4, 4, 'green'), ...polySegs([[1, 2], [0, 3], [1, 4]], 'blue')]),    // 물고기
    p(2, 's2-10', [...polySegs([[0, 3], [2, 1], [4, 3]], 'red'), seg(2, 1, 2, 5, 'blue'),
      ...polySegs([[2, 5], [3, 5], [3, 4]], 'blue')]),                                                   // 우산

    /* ── 단계3 — 세그먼트 9~14개, 색 3~4종. 겹겹이 쌓인 복잡한 모양 ── */
    p(3, 's3-01', [...rectSegs(0, 2, 5, 5, 'red'), ...polySegs([[0, 2], [2, 0], [5, 2]], 'orange'),
      ...polySegs([[2, 5], [2, 4], [3, 4], [3, 5]], 'blue'),
      seg(0, 3, 1, 4, 'green'), seg(1, 3, 0, 4, 'green')]),                                              // 큰 집(문+창문)
    p(3, 's3-02', [seg(2, 0, 4, 2, 'red'), seg(4, 2, 3, 5, 'blue'), seg(3, 5, 1, 5, 'red'),
      seg(1, 5, 0, 2, 'blue'), seg(0, 2, 2, 0, 'red'),
      seg(2, 0, 3, 5, 'yellow'), seg(3, 5, 0, 2, 'orange'), seg(0, 2, 4, 2, 'yellow'),
      seg(4, 2, 1, 5, 'orange'), seg(1, 5, 2, 0, 'yellow')]),                                            // 별+오각테두리
    p(3, 's3-03', [...rectSegs(0, 0, 5, 5, 'red'), ...rectSegs(1, 1, 4, 4, 'blue'),
      seg(1, 1, 4, 4, 'yellow'), seg(4, 1, 1, 4, 'green')]),                                             // 겹네모+엑스
    p(3, 's3-04', [seg(1, 4, 4, 4, 'red'), seg(1, 4, 1, 3, 'red'), seg(4, 4, 4, 3, 'red'),
      ...polySegs([[1, 3], [2, 1], [3, 3], [4, 1], [4, 3]], 'yellow'),
      seg(2, 1, 2, 0, 'green'), seg(4, 1, 4, 0, 'blue')]),                                               // 왕관
    p(3, 's3-05', [...polySegs([[0, 4], [5, 4], [4, 5], [1, 5]], 'blue', true),
      seg(2, 4, 2, 0, 'red'), seg(4, 4, 4, 1, 'red'),
      ...polySegs([[2, 0], [4, 2], [2, 2]], 'yellow'), ...polySegs([[4, 1], [5, 3], [4, 3]], 'green')]), // 돛단배(돛 2개)
    p(3, 's3-06', [seg(2, 2, 2, 0, 'red'), seg(2, 2, 4, 0, 'yellow'), seg(2, 2, 5, 2, 'orange'),
      seg(2, 2, 4, 5, 'green'), seg(2, 2, 2, 5, 'red'), seg(2, 2, 0, 5, 'yellow'),
      seg(2, 2, 0, 2, 'orange'), seg(2, 2, 0, 0, 'green'),
      seg(1, 2, 2, 1, 'red'), seg(2, 1, 3, 2, 'red'), seg(3, 2, 2, 3, 'red'), seg(2, 3, 1, 2, 'red')]),  // 꽃(꽃잎 8+가운데)
    p(3, 's3-07', [seg(0, 0, 5, 0, 'red'), seg(0, 5, 5, 5, 'red'), seg(0, 0, 5, 5, 'blue'), seg(5, 0, 0, 5, 'blue'),
      ...rectSegs(0, 0, 1, 1, 'yellow'), ...rectSegs(4, 4, 5, 5, 'green')]),                             // 모래시계+모서리 네모
    p(3, 's3-08', [...rectSegs(1, 1, 4, 4, 'red'), seg(2, 1, 2, 4, 'blue'), seg(3, 1, 3, 4, 'blue'),
      seg(1, 2, 4, 2, 'yellow'), ...polySegs([[1, 0], [2, 1], [3, 0]], 'green')]),                       // 선물상자
    p(3, 's3-09', [...polySegs([[2, 0], [5, 4], [0, 4]], 'red', true), ...polySegs([[2, 5], [5, 1], [0, 1]], 'blue', true),
      ...rectSegs(0, 0, 5, 5, 'yellow')]),                                                               // 육각별+테두리
    p(3, 's3-10', [...polySegs([[2, 0], [5, 5], [0, 5]], 'red', true), ...polySegs([[2, 1], [4, 4], [1, 4]], 'blue', true),
      ...polySegs([[2, 2], [3, 3], [1, 3]], 'yellow', true), seg(2, 0, 2, 2, 'green')]),                 // 겹세모(트리)
  ];

  const LEVELS = [
    { id: 1, icon: '📌', name: '쉬운 모양', desc: '고무줄 2~4개', cls: 'c-l1' },
    { id: 2, icon: '📌', name: '겹친 모양', desc: '고무줄 5~8개', cls: 'c-l2' },
    { id: 3, icon: '📌', name: '복잡한 모양', desc: '고무줄 9~14개', cls: 'c-l3' },
  ];
  const levelDef = id => LEVELS.find(l => l.id === id);
  const puzzlesOf = stage => PUZZLES.filter(x => x.stage === stage);
  const puzzleById = id => PUZZLES.find(x => x.id === id) || null;

  const praises = ['우와, 똑같이 걸었어요!', '고무줄 모양이 딱 맞았어요!', '멋진 모양이 됐네요!', '반짝반짝 잘했어요!', '참 잘했어요!'];

  return {
    GRID, pegCount, pegIndex, pegOf,
    COLORS, COLOR_IDS, hasColor, colorMeta, bandSwatchSVG,
    seg, rectSegs, polySegs, sameSeg, colorsOf,
    PUZZLES, LEVELS, levelDef, puzzlesOf, puzzleById, praises,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = window.GeoboardData;
