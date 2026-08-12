/* 지오보드 데이터 — 못(핀) 6×6 격자 · 고무줄 색 5종 · 퍼즐 30개(단계별 10).
 *
 * ── 2026-08 개편: 선분에서 **고무줄(닫힌 고리)** 로 ──────────────────
 * 예전에는 퍼즐이 「못 두 개를 잇는 선분」 목록이었다. 그런데 진짜 고무줄은 **늘 닫힌 고리**라,
 * 끝이 열린 선(산 모양 ^·기역자·지그재그)이나 한 못에서 여러 갈래로 뻗는 모양은 만들 수가 없다.
 * 30개 중 **27개가 실물 고무줄로는 불가능한 그림**이었고, 그래서 조작이 아무리 바뀌어도
 * 「선 그리기」로 보일 수밖에 없었다(부모님 지적: "지금은 선그리기랑 다를바가 없어서").
 *
 * 지금은 퍼즐 하나가 **고무줄 몇 가닥**이고, 가닥 하나는 **못들을 두르는 닫힌 고리**다.
 * 실물 지오보드에서 만들 수 있는 그림만 들어 있다.
 *
 *   band('red', [[0,5],[0,3],[2,1],[4,3],[4,5]])   ← 못 다섯 개를 두른 집 모양 고무줄 하나
 *
 * ── 2026-08 보강: 한 가닥은 **볼록해야 한다** ────────────────────
 * 위 개편에서 「닫힌 고리인가」는 검사하게 만들었는데 **「볼록한가」를 빼먹었다.**
 * 그 틈으로 다섯 가닥이 남아 있었다(부모님 지적: "이 도안은 고무줄을 늘려서 만들 수가 없어").
 *
 * 고무줄에는 **당기는 힘밖에 없다.** 바깥으로 볼록한 꼭짓점은 줄이 못을 바깥으로 밀어붙여
 * 못이 버텨 주지만, **안으로 파인 꼭짓점**에서는 양쪽 줄이 둘 다 안쪽으로 당긴다.
 * 못은 당기지를 못하니 줄이 미끄러져 빠지고 이웃 두 못을 잇는 곧은 줄로 튕겨 나간다.
 *
 * 그래서 **한 가닥은 언제나 볼록**하다. 파인 그림(화살표·자동차·왕관)은 실물에서 그러듯
 * **볼록한 조각 여러 가닥으로 나눠** 만든다. `validate-data.js` 의 계약 ⑤ 가 이것을 막는다.
 *
 * ⚠️ 퍼즐 id 는 아이 진행도(done 키)라서 **그대로 둔다**. 그림만 바뀌었고 번호·단계·개수는 같다.
 * ⚠️ `segments` 는 고리에서 자동으로 뽑는 **파생값**이다(고리의 변 목록). 별 개수가
 *    예전처럼 「세그먼트 수」로 계산되고 단계별 범위(1=2~4·2=5~8·3=9~14)도 그대로 유지된다.
 *    직접 적지 마라 — `p()` 가 만들어 준다.
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

  /* 고무줄 색 견본 SVG(트레이·본보기 공용) — 고리 모양으로 그린다(선이 아니라) */
  function bandSwatchSVG(id, u) {
    const c = COLORS[id];
    return `
    <svg viewBox="0 0 100 76" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c.lt}"/><stop offset="1" stop-color="${c.hex}"/>
      </linearGradient></defs>
      <ellipse cx="50" cy="40" rx="34" ry="26" fill="none" stroke="${c.dk}" stroke-width="15"/>
      <ellipse cx="50" cy="38" rx="34" ry="26" fill="none" stroke="url(#${u})" stroke-width="11"/>
      <path d="M26 26 Q36 15 54 14" fill="none" stroke="#FFFFFF" stroke-width="3.4" stroke-linecap="round" opacity=".55"/>
    </svg>`;
  }

  /* ─────────── 고무줄 한 가닥 ───────────
   * pegs: 고리가 두르는 못들을 **차례대로** 적은 것([gx,gy], 0~GRID-1 정수).
   * 마지막 못은 첫 못과 이어진다(닫힌 고리라 따로 안 적는다). 못 3개 이상, 서로 겹치지 않는 단순 도형. */
  const band = (color, pegs) => ({ color, pegs });

  // 고리 → 변 목록 (별 개수·단계 범위가 이걸로 계산된다)
  function bandSegments(b) {
    const out = [];
    for (let i = 0; i < b.pegs.length; i++) {
      const a = b.pegs[i], c = b.pegs[(i + 1) % b.pegs.length];
      out.push({ from: [a[0], a[1]], to: [c[0], c[1]], color: b.color });
    }
    return out;
  }
  const allSegments = bands => bands.reduce((acc, b) => acc.concat(bandSegments(b)), []);

  // 못 인덱스로 세그먼트 endpoint 비교(순서 무관)
  function sameSeg(s, p1, p2) {
    const eq = (a, b) => a[0] === b[0] && a[1] === b[1];
    return (eq(s.from, p1) && eq(s.to, p2)) || (eq(s.from, p2) && eq(s.to, p1));
  }
  const colorsOf = pz => Array.from(new Set(pz.bands.map(b => b.color)));

  /* 두 고리가 같은 모양인가 — 시작 못이 달라도, 반대로 돌았어도 같다.
   * (아이가 어디서부터 어느 쪽으로 걸든 맞다고 해 줘야 한다) */
  function sameLoop(a, b) {
    const n = a.length;
    if (n !== b.length) return false;
    for (let s = 0; s < n; s++) {
      let fwd = true, bwd = true;
      for (let k = 0; k < n; k++) {
        if (a[(s + k) % n] !== b[k]) fwd = false;
        if (a[(s - k + n * n) % n] !== b[k]) bwd = false;
      }
      if (fwd || bwd) return true;
    }
    return false;
  }

  const p = (stage, id, bands) => ({ stage, id, bands, segments: allSegments(bands) });

  /* ─────────── 퍼즐 30개(단계별 10) ───────────
   * 전부 실물 고무줄로 만들 수 있는 그림이다(닫힌 고리·자기끼리 안 겹침).
   * 단계1 = 고무줄 1가닥(못 3~4개) · 단계2 = 1~2가닥(변 5~8) · 단계3 = 2~3가닥(변 9~14) */
  const PUZZLES = [
    /* ── 단계1 — 고무줄 한 가닥, 못 3~4개. 기본 도형 ── */
    p(1, 's1-01', [band('red',    [[2, 1], [4, 4], [0, 4]])]),                          // 세모
    p(1, 's1-02', [band('blue',   [[1, 1], [4, 1], [4, 4], [1, 4]])]),                  // 네모
    p(1, 's1-03', [band('green',  [[2, 0], [4, 2], [2, 4], [0, 2]])]),                  // 마름모
    p(1, 's1-04', [band('yellow', [[0, 1], [0, 4], [4, 4]])]),                          // 직각 세모
    p(1, 's1-05', [band('orange', [[0, 2], [5, 2], [5, 4], [0, 4]])]),                  // 기다란 네모
    p(1, 's1-06', [band('blue',   [[2, 1], [4, 3], [0, 3]])]),                          // 작은 세모
    p(1, 's1-07', [band('red',    [[1, 1], [4, 1], [5, 4], [0, 4]])]),                  // 사다리꼴
    p(1, 's1-08', [band('green',  [[2, 0], [4, 0], [4, 5], [2, 5]])]),                  // 세로로 긴 네모
    p(1, 's1-09', [band('orange', [[2, 0], [5, 5], [0, 5]])]),                          // 큰 세모
    p(1, 's1-10', [band('yellow', [[1, 1], [5, 1], [4, 4], [0, 4]])]),                  // 평행사변형

    /* ── 단계2 — 변 5~8개. 알아볼 수 있는 그림 ── */
    p(2, 's2-01', [band('red',    [[0, 5], [0, 3], [2, 1], [4, 3], [4, 5]])]),          // 집 (고무줄 하나!)
    p(2, 's2-02', [band('red',    [[0, 5], [0, 3], [2, 1], [4, 3], [4, 5]]),
                   band('yellow', [[2, 5], [3, 5], [3, 4]])]),                          // 집 + 문
    p(2, 's2-03', [band('blue',   [[0, 3], [5, 3], [4, 5], [1, 5]]),
                   band('orange', [[2, 2], [2, 0], [4, 2]])]),                          // 배 + 돛
    p(2, 's2-04', [band('green',  [[0, 2], [2, 2], [2, 4], [0, 4]]),
                   band('green',  [[2, 1], [5, 3], [2, 5]])]),                          // 화살표 (꼬리 네모 + 머리 세모)
    p(2, 's2-05', [band('green',  [[2, 0], [4, 3], [0, 3]]),
                   band('orange', [[2, 3], [3, 3], [3, 5], [2, 5]])]),                  // 나무
    p(2, 's2-06', [band('blue',   [[1, 2], [4, 2], [4, 4], [1, 4]]),
                   band('yellow', [[1, 3], [0, 2], [0, 4]])]),                          // 물고기
    p(2, 's2-07', [band('blue',   [[0, 5], [0, 3], [5, 3], [5, 5]]),
                   band('blue',   [[1, 3], [2, 1], [3, 1], [4, 3]])]),                  // 자동차 (몸체 + 지붕)
    p(2, 's2-08', [band('red',    [[0, 1], [4, 1], [4, 3], [0, 3]]),
                   band('yellow', [[1, 3], [3, 3], [2, 5]])]),                          // 아이스크림 (스쿱 + 콘)
    p(2, 's2-09', [band('orange', [[2, 0], [4, 1], [4, 4], [2, 5], [0, 4], [0, 1]])]),  // 육각형
    p(2, 's2-10', [band('red',    [[2, 0], [4, 2], [2, 4], [0, 2]]),
                   band('red',    [[1, 5], [3, 5], [2, 4]])]),                          // 연 (마름모 + 꼬리)

    /* ── 단계3 — 변 9~14개. 고무줄 2~3가닥이 겹친 그림 ── */
    p(3, 's3-01', [band('red',    [[0, 5], [0, 2], [2, 0], [5, 2], [5, 5]]),
                   band('blue',   [[2, 5], [2, 3], [3, 3], [3, 5]]),
                   band('green',  [[3, 1], [4, 1], [4, 2], [3, 2]])]),                  // 큰 집 + 문 + 굴뚝
    p(3, 's3-02', [band('blue',   [[0, 3], [5, 3], [4, 5], [1, 5]]),
                   band('red',    [[2, 3], [2, 0], [4, 3]]),
                   band('yellow', [[1, 3], [1, 1], [0, 3]])]),                          // 돛 두 개 배
    p(3, 's3-03', [band('red',    [[0, 0], [5, 0], [5, 5], [0, 5]]),
                   band('blue',   [[1, 1], [4, 1], [4, 4], [1, 4]]),
                   band('yellow', [[2, 2], [3, 2], [3, 3], [2, 3]])]),                  // 겹겹 네모 세 개
    p(3, 's3-04', [band('yellow', [[0, 4], [0, 2], [4, 2], [4, 4]]),
                   band('red',    [[0, 2], [1, 0], [2, 2]]),
                   band('red',    [[2, 2], [3, 0], [4, 2]])]),                          // 왕관 (받침 + 뿔 둘)
    p(3, 's3-05', [band('green',  [[2, 0], [4, 2], [0, 2]]),
                   band('green',  [[2, 1], [4, 3], [0, 3]]),
                   band('orange', [[2, 3], [3, 3], [3, 5], [2, 5]])]),                  // 커다란 나무
    p(3, 's3-06', [band('red',    [[2, 0], [4, 2], [2, 4], [0, 2]]),
                   band('yellow', [[2, 1], [3, 2], [2, 3], [1, 2]]),
                   band('green',  [[2, 4], [3, 5], [1, 5]])]),                          // 꽃
    p(3, 's3-07', [band('red',    [[2, 2], [0, 0], [0, 4]]),
                   band('blue',   [[3, 2], [5, 0], [5, 4]]),
                   band('orange', [[2, 2], [3, 2], [3, 3], [2, 3]])]),                  // 나비 (날개 둘 + 몸통)
    p(3, 's3-08', [band('red',    [[1, 1], [4, 1], [4, 4], [1, 4]]),
                   band('blue',   [[2, 1], [3, 1], [3, 4], [2, 4]]),
                   band('yellow', [[1, 2], [4, 2], [4, 3], [1, 3]])]),                  // 선물 상자
    p(3, 's3-09', [band('yellow', [[0, 0], [5, 0], [5, 5], [0, 5]]),
                   band('red',    [[2, 1], [4, 4], [0, 4]]),
                   band('blue',   [[2, 4], [4, 1], [0, 1]])]),                          // 육각 별 + 테두리
    p(3, 's3-10', [band('green',  [[2, 0], [4, 2], [0, 2]]),
                   band('green',  [[2, 1], [4, 3], [0, 3]]),
                   band('green',  [[2, 2], [4, 4], [0, 4]]),
                   band('orange', [[2, 4], [3, 4], [3, 5], [2, 5]])]),                  // 겹세모 트리
  ];

  const LEVELS = [
    { id: 1, icon: '📌', name: '쉬운 모양', desc: '고무줄 하나', cls: 'c-l1' },
    { id: 2, icon: '📌', name: '겹친 모양', desc: '고무줄 하나~둘', cls: 'c-l2' },
    { id: 3, icon: '📌', name: '복잡한 모양', desc: '고무줄 둘~셋', cls: 'c-l3' },
  ];
  const levelDef = id => LEVELS.find(l => l.id === id);
  const puzzlesOf = stage => PUZZLES.filter(x => x.stage === stage);
  const puzzleById = id => PUZZLES.find(x => x.id === id) || null;

  const praises = ['우와, 똑같이 걸었어요!', '고무줄 모양이 딱 맞았어요!', '멋진 모양이 됐네요!', '반짝반짝 잘했어요!', '참 잘했어요!'];

  return {
    GRID, pegCount, pegIndex, pegOf,
    COLORS, COLOR_IDS, hasColor, colorMeta, bandSwatchSVG,
    band, bandSegments, allSegments, sameSeg, sameLoop, colorsOf,
    PUZZLES, LEVELS, levelDef, puzzlesOf, puzzleById, praises,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = window.GeoboardData;
