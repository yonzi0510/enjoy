/* 손가락 고무줄 데이터 — 색 고리 6종 · 손(손가락 5개) 그림 · 퍼즐 30개(단계별 10).
 * 카드 본보기: 어느 손가락에 무슨 색 고리가 끼워졌는지. 아이는 화면 속 손에 똑같이 끼운다.
 * 그림은 인라인 SVG(외부 이미지 금지). node 검증에서도 문자열만 다루므로 안전하다.
 * ⚠️ 색 id·손가락 index(0~4)·퍼즐 id·배치는 아이 진행도(done 키)에 얽히므로 함부로 바꾸지 않는다.
 */
window.RingsData = (() => {

  /* 그라데이션 id 충돌을 막는 uid 카운터 (같은 그림을 카드·손·트레이에 여러 번 그린다) */
  let _uid = 0;
  const nextUid = () => 'r' + (_uid++);

  /* ─────────── 손 좌표 (viewBox 210 × 260) ───────────
   * 손가락 5개: 0 엄지 · 1 검지 · 2 중지 · 3 약지 · 4 새끼.
   * slots: [밑동(base), 손끝(tip)] 고리 중심 좌표 — 겹쳐 끼울 땐 base부터 채운다.
   * zone: 손가락을 덮는 사각형 [x,y,w,h] — 탭·드롭 판정용. */
  const HAND = { W: 210, H: 260 };
  const FINGERS = [
    { i: 0, name: '엄지', say: '엄지',   slots: [[41, 150], [41, 126]], zone: [22, 108, 38, 88] },
    { i: 1, name: '검지', say: '검지',   slots: [[78, 120], [78, 90]],  zone: [60, 62, 36, 120] },
    { i: 2, name: '중지', say: '가운데', slots: [[108, 112], [108, 80]], zone: [90, 46, 36, 132] },
    { i: 3, name: '약지', say: '약지',   slots: [[138, 120], [138, 90]], zone: [120, 62, 36, 120] },
    { i: 4, name: '새끼', say: '새끼',   slots: [[166, 138], [166, 112]], zone: [150, 88, 34, 98] },
  ];
  const fingerDef = i => FINGERS[i];

  /* 손 그림 — 아이가 크레용으로 그린 손(살구빛 손바닥 + 손가락 5개).
   * 손가락은 '자로 그은 네모'가 아니라 **한 획씩 그은 굵은 선**이다. 같은 획을 세 겹으로 쌓는다:
   *   1) 삐져나간 칠 — 조금 어긋나게(3,4) 더 굵게 깔아 윤곽 밖으로 색이 새 나오게
   *   2) 연필 윤곽 — 살보다 6 굵게 깔아 테두리로 보이게
   *   3) 살       — 맨 위. 손가락끼리는 살이 안 닿아서 그 틈이 곧 손가락 사이 선이 된다.
   * ⚠️ 손가락 중심선(41·78·108·138·166)과 끝 높이, 손바닥 자리는 예전 그림 그대로다 —
   *    고리 slot 좌표와 판정영역(zone)이 이 좌표에 맞춰져 있어 어긋나면 판정이 틀어진다.
   *    그래서 이 그림에는 **회전·확대 같은 변형을 절대 주지 않는다.**
   * (SVG 필터는 쓰지 않는다. 손 그림은 목록에서 열 개 넘게 동시에 그려져 느려진다 —
   *  떨림은 획 좌표에 직접 넣었다.) */
  const HAND_STROKES = [
    ['M41 190 C44 168, 38 148, 41 130', 30],      // 엄지
    ['M78 194 C81 162, 75 122, 78 88', 26],       // 검지
    ['M108 194 C111 158, 105 106, 108 72', 26],   // 중지
    ['M138 194 C135 160, 141 120, 138 88', 26],   // 약지
    ['M166 196 C169 170, 163 136, 166 112', 23],  // 새끼
    ['M76 199 C95 196, 115 202, 134 199', 96],    // 손바닥
  ];
  function handLayer(add, attrs) {
    return '<g ' + attrs + ' fill="none" stroke-linecap="round">' +
      HAND_STROKES.map(([d, w]) => '<path d="' + d + '" stroke-width="' + (w + add) + '"/>').join('') +
      '</g>';
  }
  function handSVG(u) {
    return `
    <svg viewBox="0 0 210 260" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFE7CD"/><stop offset="1" stop-color="#FFD6B0"/>
      </linearGradient></defs>
      ${handLayer(9, 'transform="translate(3,4)" stroke="#FFCEA0" opacity=".72"')}
      ${handLayer(6, 'stroke="#2E2A24" stroke-opacity=".86"')}
      ${handLayer(0, `stroke="url(#${u})"`)}
      <g fill="none" stroke="#D9A578" stroke-width="3" stroke-linecap="round" opacity=".55">
        <path d="M78 170 q1 9 -1 15"/><path d="M108 168 q-1 9 1 15"/><path d="M138 170 q1 9 -1 15"/>
      </g>
    </svg>`;
  }

  /* ─────────── 색 고리 6종 ─────────── */
  const COLORS = {
    red:    { name: '빨강', say: '빨강 고리', hex: '#EF4E4E', lt: '#FF9C90', dk: '#C42F2F' },
    orange: { name: '주황', say: '주황 고리', hex: '#F5952E', lt: '#FFC57A', dk: '#CE6E12' },
    yellow: { name: '노랑', say: '노랑 고리', hex: '#F4CE2A', lt: '#FCE885', dk: '#CBA200' },
    green:  { name: '초록', say: '초록 고리', hex: '#57BE4E', lt: '#A7E58C', dk: '#3E9636' },
    blue:   { name: '파랑', say: '파랑 고리', hex: '#4DA6E8', lt: '#9BD0F5', dk: '#2E7CC0' },
    purple: { name: '보라', say: '보라 고리', hex: '#A77CE0', lt: '#D3BAF3', dk: '#7E52C0' },
  };
  const COLOR_IDS = Object.keys(COLORS);           // 트레이 팔레트 순서(무지개)
  const hasColor = id => Object.prototype.hasOwnProperty.call(COLORS, id);

  /* 색 고리 SVG — 손가락을 감싸는 밴드(가운데 구멍으로 손가락이 비친다). */
  function ringSVG(id, u) {
    const c = COLORS[id];
    return `
    <svg viewBox="0 0 100 64" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c.lt}"/><stop offset="1" stop-color="${c.hex}"/>
      </linearGradient></defs>
      <ellipse cx="50" cy="37" rx="40" ry="22" fill="none" stroke="${c.dk}" stroke-width="20"/>
      <ellipse cx="50" cy="33" rx="40" ry="22" fill="none" stroke="url(#${u})" stroke-width="15"/>
      <path d="M20 26 Q50 10 80 26" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity=".55"/>
    </svg>`;
  }

  /* 빈 슬롯 안내(점선 고리) */
  function ghostSVG() {
    return `
    <svg viewBox="0 0 100 64" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="33" rx="39" ry="21" fill="none" stroke="#C8A98D" stroke-width="4" stroke-dasharray="6 7" stroke-linecap="round" opacity=".75"/>
    </svg>`;
  }

  /* ─────────── 퍼즐 30개 (단계별 10) ───────────
   * rings: [손가락index, 색id] 목록. 같은 손가락이 2번 나오면 겹쳐 끼움(앞=밑동, 뒤=손끝).
   * 단계1 = 고리 2~3개(손가락당 1개) · 단계2 = 4~5개(손가락당 1개) · 단계3 = 5~7개(일부 손가락에 2개). */
  const p = (level, id, rings) => ({ level, id, rings });

  const PUZZLES = [
    /* 단계1 — 고리 2~3개, 손가락당 1개 */
    p(1, 'l1-a', [[1, 'red'], [2, 'blue']]),
    p(1, 'l1-b', [[2, 'green'], [3, 'yellow']]),
    p(1, 'l1-c', [[1, 'purple'], [3, 'orange']]),
    p(1, 'l1-d', [[0, 'red'], [4, 'blue']]),
    p(1, 'l1-e', [[1, 'yellow'], [2, 'red'], [3, 'green']]),
    p(1, 'l1-f', [[0, 'green'], [2, 'purple'], [4, 'orange']]),
    p(1, 'l1-g', [[1, 'blue'], [2, 'yellow'], [3, 'red']]),
    p(1, 'l1-h', [[0, 'orange'], [1, 'green'], [2, 'blue']]),
    p(1, 'l1-i', [[2, 'red'], [3, 'purple'], [4, 'yellow']]),
    p(1, 'l1-j', [[0, 'purple'], [2, 'green'], [4, 'red']]),

    /* 단계2 — 고리 4~5개, 손가락당 1개 */
    p(2, 'l2-a', [[0, 'red'], [1, 'orange'], [2, 'yellow'], [3, 'green']]),
    p(2, 'l2-b', [[1, 'blue'], [2, 'purple'], [3, 'red'], [4, 'green']]),
    p(2, 'l2-c', [[0, 'green'], [1, 'yellow'], [2, 'blue'], [4, 'purple']]),
    p(2, 'l2-d', [[0, 'purple'], [2, 'red'], [3, 'orange'], [4, 'yellow']]),
    p(2, 'l2-e', [[0, 'blue'], [1, 'green'], [2, 'orange'], [3, 'purple']]),
    p(2, 'l2-f', [[0, 'red'], [1, 'blue'], [2, 'green'], [3, 'yellow'], [4, 'purple']]),
    p(2, 'l2-g', [[0, 'orange'], [1, 'purple'], [2, 'red'], [3, 'blue'], [4, 'green']]),
    p(2, 'l2-h', [[0, 'yellow'], [1, 'red'], [2, 'purple'], [3, 'green'], [4, 'blue']]),
    p(2, 'l2-i', [[0, 'green'], [1, 'orange'], [2, 'blue'], [3, 'red'], [4, 'yellow']]),
    p(2, 'l2-j', [[0, 'purple'], [1, 'yellow'], [2, 'green'], [3, 'orange'], [4, 'red']]),

    /* 단계3 — 일부 손가락에 2개 겹쳐 끼우기, 고리 5~7개 */
    p(3, 'l3-a', [[1, 'red'], [1, 'yellow'], [2, 'blue'], [2, 'green'], [3, 'purple']]),
    p(3, 'l3-b', [[0, 'green'], [0, 'orange'], [2, 'red'], [2, 'blue'], [4, 'yellow']]),
    p(3, 'l3-c', [[1, 'purple'], [1, 'red'], [2, 'green'], [3, 'yellow'], [3, 'blue']]),
    p(3, 'l3-d', [[0, 'red'], [1, 'blue'], [1, 'green'], [2, 'orange'], [2, 'purple'], [4, 'yellow']]),
    p(3, 'l3-e', [[1, 'yellow'], [1, 'red'], [2, 'green'], [2, 'purple'], [3, 'blue'], [3, 'orange']]),
    p(3, 'l3-f', [[0, 'purple'], [0, 'green'], [1, 'red'], [2, 'yellow'], [2, 'blue'], [4, 'orange']]),
    p(3, 'l3-g', [[0, 'green'], [1, 'orange'], [1, 'purple'], [2, 'red'], [2, 'yellow'], [3, 'blue']]),
    p(3, 'l3-h', [[0, 'blue'], [0, 'yellow'], [2, 'green'], [2, 'red'], [3, 'purple'], [3, 'orange']]),
    p(3, 'l3-i', [[0, 'red'], [0, 'green'], [1, 'yellow'], [1, 'purple'], [2, 'blue'], [3, 'orange'], [3, 'red']]),
    p(3, 'l3-j', [[0, 'purple'], [1, 'green'], [1, 'blue'], [2, 'red'], [2, 'orange'], [3, 'yellow'], [3, 'green']]),
  ];

  /* 퍼즐 → 손가락별 색 목록 {finger: [밑동색, 손끝색]} */
  function target(pz) {
    const t = {};
    pz.rings.forEach(([f, c]) => { (t[f] = t[f] || []).push(c); });
    return t;
  }
  /* 채우는 순서(손가락 0→4, 손가락 안에서 밑동→손끝) */
  function steps(pz) {
    const t = target(pz);
    const out = [];
    FINGERS.forEach(f => (t[f.i] || []).forEach(c => out.push({ finger: f.i, color: c })));
    return out;
  }
  const isStacked = pz => {
    const t = target(pz);
    return Object.keys(t).some(k => t[k].length > 1);
  };

  const LEVELS = [
    { id: 1, icon: '💍', name: '고리 두 개', desc: '고리 2~3개 끼우기', cls: 'c-l1' },
    { id: 2, icon: '💍', name: '고리 여러 개', desc: '고리 4~5개 끼우기', cls: 'c-l2' },
    { id: 3, icon: '💍', name: '겹쳐 끼우기', desc: '한 손가락에 두 개도!', cls: 'c-l3' },
  ];
  const levelDef = id => LEVELS.find(l => l.id === id);
  const puzzlesOf = level => PUZZLES.filter(x => x.level === level);
  const puzzleById = id => PUZZLES.find(x => x.id === id) || null;

  const praises = ['우와, 다 끼웠어요!', '색깔이 딱 맞았어요!', '멋지게 끼웠네요!', '반짝반짝 예뻐요!', '참 잘했어요!'];

  return {
    HAND, FINGERS, fingerDef, handSVG,
    COLORS, COLOR_IDS, hasColor, ringSVG, ghostSVG,
    PUZZLES, LEVELS, levelDef, puzzlesOf, puzzleById,
    target, steps, isStacked, praises, nextUid,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = window.RingsData;
