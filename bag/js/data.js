/* 가방 놀이터 데이터 — 세 놀이(숟가락·빨대·네모 조각) 도안을 규칙에 따라 생성한다.
 *
 * ── 숟가락(방향·위치 맞추기) 좌표계 ──
 * 100×100 놀이판. 물건은 { type, x, y, rot }:
 *   type = 물건 종류(spoon 숟가락·fork 포크·pencil 연필·brush 붓·key 열쇠·tooth 칫솔),
 *   (x,y) = 물건 가운데가 놓일 자리(판 안 5~95),
 *   rot   = 시계방향 회전각(0~315). 단계별로 0°(회전 없음)·90°·45° 배수.
 *   단계: 1=물건 3개(회전 없음), 2=4개(90°), 3=5개(45°).
 *
 * ── 빨대(높이 맞추기) 좌표계 ──
 * 세로 끈 여러 개에 색 슬라이더가 하나씩. 슬라이더는 { color, target }:
 *   target = 목표 높이(0=맨 아래 ~ 1=맨 위). ±0.08 안이면 착!
 *   단계: 1=3개(성긴 높이), 2=5개(성긴 높이), 3=5개(미세한 높이).
 *
 * ── 네모 조각(회전 맞추기) 좌표계 ──
 * 정사각 조각(각 조각은 2×2 칸)을 판의 고정 자리에 두고 톡 눌러 90°씩 돌린다.
 * 조각은 { cells: [TL,TR,BL,BR](0/1 주황), startRot: 처음 각도(90·180·270) }.
 *   본보기 = 모든 조각이 rot 0(제자리)일 때의 4×4(또는 2×2) 무늬.
 *   조각 무늬는 네 방향이 모두 다른 것만 쓰므로(대각선·꽉참·빈칸 제외) 해답 각도는 rot 0 하나뿐 —
 *   회전만으로 반드시 풀리고, 톡톡 돌려 제자리(rot 0)로 되돌리면 본보기와 똑같아진다.
 *   단계: 1=2×2판 조각 1개(주황 1칸), 2=4×4 조각 4개(주황 1~2칸), 3=4×4 조각 4개(주황 2~3칸).
 *
 * 도안은 씨앗 고정 난수로 만들어 늘 같은 결과가 나온다(브라우저·node 동일).
 */
(function (root) {
  /* 씨앗 고정 난수 (mulberry32) — 브라우저·node 어디서나 같은 도안 */
  function rngOf(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ─────────── 숟가락 놀이 ─────────── */
  // 방향이 뚜렷한 물건 여섯 종 (각자 위를 향해 그려진다)
  const SPOON_TYPES = ['spoon', 'fork', 'pencil', 'brush', 'key', 'tooth'];
  // 물건별 색 (트레이·조각에 쓰는 파스텔 색)
  const OBJ_COLORS = {
    spoon: '#FF8A80', fork: '#4FC3F7', pencil: '#FFD54F',
    brush: '#81C784', key: '#BA68C8', tooth: '#FF9E58',
  };
  const NAME_EMOJI = ['🎒', '🧺', '👜', '🛍️', '💼', '🎁', '📦', '🧳', '🪣', '🗃️'];

  // 물건이 겹치지 않도록 3×3 격자에서 자리를 고른다(칸 25 간격, 물건은 22 정도)
  const GRID_X = [28, 50, 72], GRID_Y = [30, 52, 74];
  function pickCells(n, rng) {
    const cells = [];
    GRID_X.forEach(x => GRID_Y.forEach(y => cells.push({ x, y })));
    return shuffle(cells, rng).slice(0, n).map(c => ({
      x: Math.round(c.x + (rng() * 8 - 4)),
      y: Math.round(c.y + (rng() * 8 - 4)),
    }));
  }

  function genSpoon() {
    const list = [];
    const LEVELS = [{ n: 3, step: 0 }, { n: 4, step: 90 }, { n: 5, step: 45 }];
    LEVELS.forEach((lv, li) => {
      for (let k = 0; k < 10; k++) {
        const rng = rngOf(1000 + li * 100 + k);
        const types = shuffle(SPOON_TYPES, rng).slice(0, lv.n);
        const cells = pickCells(lv.n, rng);
        const objs = types.map((t, i) => {
          let rot = 0;
          if (lv.step > 0) {
            const mult = 360 / lv.step;            // 90 → 4가지, 45 → 8가지
            rot = (lv.step * (1 + Math.floor(rng() * (mult - 1)))) % 360; // 0°은 피해 회전이 필요하게
          }
          return { type: t, x: cells[i].x, y: cells[i].y, rot };
        });
        list.push({
          id: 'sp' + (li + 1) + '-' + (k + 1),
          name: (li + 1) + '단계 ' + (k + 1) + '번',
          emoji: NAME_EMOJI[k],
          level: li + 1, rotStep: lv.step, objs,
        });
      }
    });
    return list;
  }

  /* ─────────── 빨대 놀이 ─────────── */
  // 무지개 색 슬라이더 (한 도안 안에서 색은 서로 다르다)
  const STRAW_COLORS = ['#FF5A5A', '#FF9F40', '#FFD400', '#4CC36E', '#3FA9F5', '#7B6CF6', '#E863C8'];

  function genStraw() {
    const list = [];
    const LEVELS = [{ n: 3, fine: false }, { n: 5, fine: false }, { n: 5, fine: true }];
    const COARSE = [0.2, 0.35, 0.5, 0.65, 0.8];
    LEVELS.forEach((lv, li) => {
      for (let k = 0; k < 10; k++) {
        const rng = rngOf(5000 + li * 100 + k);
        const colors = shuffle(STRAW_COLORS, rng).slice(0, lv.n);
        const steps = shuffle(COARSE, rng);
        // 미세 단계: 0.12~0.88을 슬라이더 수만큼 띠로 나눠 각 띠 안에서 살짝 흔든다
        // (±8% 스냅과 겹치지 않게 목표끼리 0.1 이상 벌어지도록). 성김 단계는 정해진 다섯 높이.
        const fine = [];
        if (lv.fine) {
          const lo = 0.12, band = (0.88 - lo) / lv.n;
          for (let i = 0; i < lv.n; i++) {
            fine.push(+(lo + (i + 0.5) * band + (rng() - 0.5) * band * 0.2).toFixed(2));
          }
        }
        const order = shuffle(fine.map((_, i) => i), rng); // 색 순서와 높이 순서를 섞는다
        const sliders = colors.map((c, i) => ({
          color: c,
          target: lv.fine ? fine[order[i]] : steps[i % steps.length],
        }));
        list.push({
          id: 'st' + (li + 1) + '-' + (k + 1),
          name: (li + 1) + '단계 ' + (k + 1) + '번',
          emoji: NAME_EMOJI[k],
          level: li + 1, sliders,
        });
      }
    });
    return list;
  }

  /* ─────────── 네모 조각 놀이 ─────────── */
  // 주황 칸 색 / 빈 칸 색
  const SQ_ORANGE = '#FF8C1A', SQ_EMPTY = '#F3E7D3';
  // 2×2 조각 무늬 후보 — 네 방향이 모두 달라 해답 각도가 하나뿐인 것만(대각선·꽉참·빈칸 제외).
  // 칸 순서: [TL, TR, BL, BR]
  const SQ_PATTERNS = {
    1: [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]],       // 주황 1칸(모서리)
    2: [[1, 1, 0, 0], [0, 0, 1, 1], [1, 0, 1, 0], [0, 1, 0, 1]],       // 주황 2칸(변, 대각선 제외)
    3: [[1, 1, 1, 0], [1, 1, 0, 1], [1, 0, 1, 1], [0, 1, 1, 1]],       // 주황 3칸(ㄱ자)
  };
  // 2×2 칸을 시계방향 90° 돌린 결과 — [a,b,c,d] → [c,a,d,b]
  function rotCells(c) { return [c[2], c[0], c[3], c[1]]; }
  function rotN(cells, deg) { let c = cells.slice(); for (let i = 0; i < (deg / 90) % 4; i++) c = rotCells(c); return c; }
  function sameCells(a, b) { return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]; }

  function genSquare() {
    const list = [];
    // size=판 한 변 칸수, oranges=조각마다 고를 주황 칸 수 후보
    const LEVELS = [
      { size: 2, oranges: [1] },       // 1단계: 2×2 판(조각 1개)
      { size: 4, oranges: [1, 2] },    // 2단계: 4×4 판(조각 4개)
      { size: 4, oranges: [2, 3] },    // 3단계: 4×4 판(조각 4개)
    ];
    LEVELS.forEach((lv, li) => {
      for (let k = 0; k < 10; k++) {
        const rng = rngOf(9000 + li * 100 + k);
        const nPieces = (lv.size / 2) * (lv.size / 2); // 2×2판=1개, 4×4판=4개
        const pieces = [];
        for (let pi = 0; pi < nPieces; pi++) {
          const kOr = lv.oranges[Math.floor(rng() * lv.oranges.length)];
          const pool = SQ_PATTERNS[kOr];
          const cells = pool[Math.floor(rng() * pool.length)].slice();
          // 처음 각도 — 제자리(rot 0)와 다른 무늬가 되도록(반드시 돌려야 풀리게)
          const opts = [90, 180, 270].filter(d => !sameCells(rotN(cells, d), cells));
          const startRot = opts[Math.floor(rng() * opts.length)];
          pieces.push({ cells, startRot });
        }
        list.push({
          id: 'sq' + (li + 1) + '-' + (k + 1),
          name: (li + 1) + '단계 ' + (k + 1) + '번',
          emoji: NAME_EMOJI[k],
          level: li + 1, size: lv.size, pieces,
        });
      }
    });
    return list;
  }

  const praises = [
    '참 잘했어요!', '우아, 똑같아요!', '멋지다!', '척척박사네!',
    '눈이 반짝반짝!', '최고예요!', '와, 딱 맞췄어요!', '대단해요!',
  ];

  root.BagData = {
    SPOON_TYPES, OBJ_COLORS, STRAW_COLORS,
    SQ_ORANGE, SQ_EMPTY, rotCells, rotN, sameCells,
    spoons: genSpoon(),
    straws: genStraw(),
    squares: genSquare(),
    praises,
  };
})(typeof window !== 'undefined' ? window : this);
