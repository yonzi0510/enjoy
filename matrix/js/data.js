/* 방향·색 놀이터 데이터 — 색 4종 × 방향 4종 = 조각 16개, 퍼즐 30개(단계별 10).
 * 나무 교구처럼: 격자의 맨 윗줄=방향(화살표), 맨 왼쪽 열=색.
 * 각 칸에는 "그 행의 색 + 그 열의 방향"을 가진 얼굴 달린 삼각형 조각을 놓는다.
 * 그림은 인라인 SVG(외부 이미지 금지). node 검증에서도 문자열만 다루므로 안전하다.
 * ⚠️ 색·방향·조각 id·퍼즐 id 는 아이 진행도(done 키)가 id 로 저장되므로 함부로 바꾸지 않는다.
 */
window.MatrixData = (() => {

  /* ─────────── 색 4종 ───────────
   * hex/hex2: 위→아래 그라데이션, line: 진한 테두리, name/say: TTS 용 */
  const COLORS = [
    { id: 'red',    name: '빨강', say: '빨강', hex: '#EE5140', hex2: '#C7382A', line: '#A9271B' },
    { id: 'yellow', name: '노랑', say: '노랑', hex: '#FFCE44', hex2: '#F1A620', line: '#CF8410' },
    { id: 'blue',   name: '파랑', say: '파랑', hex: '#4FAAE8', hex2: '#2C84C8', line: '#1D6AA4' },
    { id: 'green',  name: '초록', say: '초록', hex: '#68C566', hex2: '#43A244', line: '#2C8531' },
  ];

  /* ─────────── 방향 4종 ───────────
   * rot: 삼각형·화살표 회전각(위=0, 오른쪽=90, 아래=180, 왼쪽=270) */
  const DIRS = [
    { id: 'up',    name: '위',    say: '위쪽',   rot: 0   },
    { id: 'down',  name: '아래',  say: '아래쪽', rot: 180 },
    { id: 'left',  name: '왼쪽',  say: '왼쪽',   rot: 270 },
    { id: 'right', name: '오른쪽', say: '오른쪽', rot: 90  },
  ];

  const colorDef = id => COLORS.find(c => c.id === id) || null;
  const dirDef   = id => DIRS.find(d => d.id === id) || null;

  /* ─────────── 조각 그림 (얼굴 달린 삼각형) ───────────
   * 위를 가리키는 둥근 삼각형을 색으로 칠하고, dir 회전각만큼 통째로 돌린다.
   * 얼굴(눈·미소)은 삼각형과 함께 돌아 방향이 뚜렷이 보인다. */
  function drawTriangle(u, color, rot) {
    return `
      <svg viewBox="0 0 100 100" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${color.hex}"/><stop offset="1" stop-color="${color.hex2}"/>
        </linearGradient></defs>
        <g transform="rotate(${rot} 50 50)">
          <path d="M50 12 C54 12 57 15 59 19 L86 74 C90 82 85 90 76 90 L24 90 C15 90 10 82 14 74 L41 19 C43 15 46 12 50 12 Z"
                fill="url(#${u})" stroke="${color.line}" stroke-width="4" stroke-linejoin="round"/>
          <path d="M50 18 L58 34 C52 31 48 31 42 34 Z" fill="#FFFFFF" opacity=".28"/>
          <ellipse cx="41" cy="60" rx="7" ry="8.5" fill="#FFFFFF"/>
          <ellipse cx="59" cy="60" rx="7" ry="8.5" fill="#FFFFFF"/>
          <circle cx="42" cy="61" r="3.6" fill="#3A2233"/>
          <circle cx="60" cy="61" r="3.6" fill="#3A2233"/>
          <circle cx="40.6" cy="59.4" r="1.3" fill="#fff"/>
          <circle cx="58.6" cy="59.4" r="1.3" fill="#fff"/>
          <path d="M43 74 Q50 80 57 74" fill="none" stroke="#3A2233" stroke-width="3" stroke-linecap="round"/>
          <ellipse cx="34" cy="70" rx="4" ry="3" fill="#fff" opacity=".28"/>
          <ellipse cx="66" cy="70" rx="4" ry="3" fill="#fff" opacity=".28"/>
        </g>
      </svg>`;
  }

  /* 방향 헤더용 화살표 */
  function drawArrow(u, dir) {
    return `
      <svg viewBox="0 0 100 100" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <g transform="rotate(${dir.rot} 50 50)">
          <path d="M50 16 L78 50 L62 50 L62 84 L38 84 L38 50 L22 50 Z"
                fill="#5A6B7A" stroke="#31424F" stroke-width="4" stroke-linejoin="round"/>
        </g>
      </svg>`;
  }

  /* 색 헤더용 스와치(동그라미) */
  function drawSwatch(u, color) {
    return `
      <svg viewBox="0 0 100 100" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="${u}" cx=".4" cy=".35" r=".75">
          <stop offset="0" stop-color="${color.hex}"/><stop offset="1" stop-color="${color.hex2}"/>
        </radialGradient></defs>
        <circle cx="50" cy="50" r="36" fill="url(#${u})" stroke="${color.line}" stroke-width="4"/>
        <ellipse cx="40" cy="38" rx="12" ry="8" fill="#fff" opacity=".35"/>
      </svg>`;
  }

  /* ─────────── 조각 16개 (색4 × 방향4) ─────────── */
  const pieceId = (colorId, dirId) => colorId + '-' + dirId;
  const PIECES = {};
  COLORS.forEach(c => DIRS.forEach(d => {
    const id = pieceId(c.id, d.id);
    PIECES[id] = {
      id, color: c.id, dir: d.id,
      name: c.name + ' ' + d.name, say: c.say + ' ' + d.say,
      draw(u) { return drawTriangle(u, c, d.rot); },
    };
  }));
  const PIECE_IDS = Object.keys(PIECES);
  const hasPiece = id => Object.prototype.hasOwnProperty.call(PIECES, id);
  const piece = id => PIECES[id];

  /* ─────────── 퍼즐 30개 (단계별 10) ───────────
   * colors: 위→아래 색 헤더 순서 / dirs: 왼→오른쪽 방향 헤더 순서.
   * 격자 크기 = colors.length × dirs.length. 칸(r,c) 정답 = pieceId(colors[r], dirs[c]).
   * 헤더 색·방향은 서로 겹치지 않고, 순서를 바꿔 퍼즐마다 다르게 만든다. */
  const p = (level, id, colors, dirs) => ({ level, id, colors, dirs });

  const PUZZLES = [
    /* 단계1 — 2×2 (색2 × 방향2) */
    p(1, 'l1-a', ['red', 'blue'],     ['up', 'down']),
    p(1, 'l1-b', ['yellow', 'green'], ['left', 'right']),
    p(1, 'l1-c', ['red', 'yellow'],   ['up', 'right']),
    p(1, 'l1-d', ['blue', 'green'],   ['down', 'left']),
    p(1, 'l1-e', ['red', 'green'],    ['up', 'left']),
    p(1, 'l1-f', ['yellow', 'blue'],  ['down', 'right']),
    p(1, 'l1-g', ['green', 'red'],    ['right', 'up']),
    p(1, 'l1-h', ['blue', 'yellow'],  ['left', 'down']),
    p(1, 'l1-i', ['green', 'blue'],   ['up', 'right']),
    p(1, 'l1-j', ['yellow', 'red'],   ['down', 'left']),

    /* 단계2 — 3×3 (색3 × 방향3) */
    p(2, 'l2-a', ['red', 'yellow', 'blue'],   ['up', 'down', 'left']),
    p(2, 'l2-b', ['yellow', 'blue', 'green'], ['down', 'left', 'right']),
    p(2, 'l2-c', ['red', 'blue', 'green'],    ['up', 'left', 'right']),
    p(2, 'l2-d', ['red', 'yellow', 'green'],  ['up', 'down', 'right']),
    p(2, 'l2-e', ['blue', 'green', 'red'],    ['left', 'right', 'up']),
    p(2, 'l2-f', ['green', 'red', 'yellow'],  ['right', 'up', 'down']),
    p(2, 'l2-g', ['yellow', 'green', 'blue'], ['down', 'right', 'left']),
    p(2, 'l2-h', ['green', 'blue', 'red'],    ['left', 'up', 'down']),
    p(2, 'l2-i', ['blue', 'red', 'yellow'],   ['right', 'down', 'up']),
    p(2, 'l2-j', ['red', 'green', 'blue'],    ['down', 'up', 'left']),

    /* 단계3 — 4×4 (색4 × 방향4, 참고 교구와 동일) */
    p(3, 'l3-a', ['red', 'yellow', 'blue', 'green'],  ['up', 'down', 'left', 'right']),
    p(3, 'l3-b', ['green', 'blue', 'yellow', 'red'],  ['right', 'left', 'down', 'up']),
    p(3, 'l3-c', ['yellow', 'red', 'green', 'blue'],  ['down', 'up', 'right', 'left']),
    p(3, 'l3-d', ['blue', 'green', 'red', 'yellow'],  ['left', 'right', 'up', 'down']),
    p(3, 'l3-e', ['red', 'blue', 'yellow', 'green'],  ['up', 'left', 'down', 'right']),
    p(3, 'l3-f', ['green', 'red', 'blue', 'yellow'],  ['right', 'up', 'left', 'down']),
    p(3, 'l3-g', ['yellow', 'green', 'red', 'blue'],  ['down', 'right', 'up', 'left']),
    p(3, 'l3-h', ['blue', 'yellow', 'green', 'red'],  ['left', 'down', 'right', 'up']),
    p(3, 'l3-i', ['red', 'green', 'blue', 'yellow'],  ['up', 'right', 'left', 'down']),
    p(3, 'l3-j', ['yellow', 'blue', 'red', 'green'],  ['down', 'left', 'up', 'right']),
  ];

  const LEVELS = [
    { id: 1, n: 2, icon: '🟢', name: '작은 격자', desc: '2 x 2 맞추기', cls: 'c-l1', extra: 2 },
    { id: 2, n: 3, icon: '🔵', name: '보통 격자', desc: '3 x 3 맞추기', cls: 'c-l2', extra: 2 },
    { id: 3, n: 4, icon: '🟣', name: '큰 격자',   desc: '4 x 4 맞추기', cls: 'c-l3', extra: 0 },
  ];
  const levelDef   = id => LEVELS.find(l => l.id === id) || null;
  const puzzlesOf  = level => PUZZLES.filter(x => x.level === level);
  const puzzleById = id => PUZZLES.find(x => x.id === id) || null;

  /* 퍼즐 헬퍼 — 격자 크기·칸 정답·정답 조각 목록 */
  const rowsOf = pz => pz.colors.length;
  const colsOf = pz => pz.dirs.length;
  const cellPiece = (pz, r, c) => pieceId(pz.colors[r], pz.dirs[c]); // 칸(r,c) 정답 조각 id
  function answerPieces(pz) {                                        // 채우는 순서(행 우선)
    const out = [];
    for (let r = 0; r < rowsOf(pz); r++)
      for (let c = 0; c < colsOf(pz); c++) out.push(cellPiece(pz, r, c));
    return out;
  }

  const praises = ['우와, 격자 완성!', '색이랑 방향 다 맞췄어요!', '참 잘했어요!', '멋져요, 척척박사!', '냠냠! 최고예요!'];

  return {
    COLORS, DIRS, colorDef, dirDef,
    PIECES, PIECE_IDS, hasPiece, piece, pieceId,
    drawArrow, drawSwatch,
    PUZZLES, LEVELS, levelDef, puzzlesOf, puzzleById,
    rowsOf, colsOf, cellPiece, answerPieces, praises,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = window.MatrixData;
