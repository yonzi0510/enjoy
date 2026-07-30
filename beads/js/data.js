/* 구슬 보드 데이터 — 색 구슬 6종과 퍼즐 30개(단계별 10).
 * 카드 본보기의 색·위치를 보고 빈 격자 구멍에 똑같은 색 구슬을 채운다.
 * 구슬 그림은 인라인 SVG(반짝이는 하이라이트). node 검증에서도 문자열만 다루므로 안전하다.
 * ⚠️ 색 id·퍼즐 id·격자 배치는 아이 진행도(done 키)가 id로 저장되므로 함부로 바꾸지 않는다.
 */
window.BeadsData = (() => {

  /* 그라데이션 등 id 충돌을 막는 uid 카운터 (한 색을 카드·보드·팔레트에 여러 번 그린다) */
  let _uid = 0;
  const nextUid = () => 'd' + (_uid++);

  /* ─────────── 색 구슬 6종 ───────────
   * c0 밝은 윗면 · c1 몸통 · c2 테두리·그림자 (radialGradient 로 반짝이게)
   * say: TTS 로 읽을 이름 */
  const COLORS = {
    red:    { name: '빨강', say: '빨강',   c0: '#F58A72', c1: '#E24B3B', c2: '#B8321F' },
    orange: { name: '주황', say: '주황',   c0: '#FBB56A', c1: '#F2872E', c2: '#C96A15' },
    yellow: { name: '노랑', say: '노랑',   c0: '#FFE47A', c1: '#FDCB35', c2: '#DFA51C' },
    green:  { name: '초록', say: '초록',   c0: '#9BD86B', c1: '#5CB85C', c2: '#3E8E3E' },
    blue:   { name: '파랑', say: '파랑',   c0: '#8FD0F5', c1: '#4FA3E8', c2: '#2E77B0' },
    purple: { name: '보라', say: '보라',   c0: '#C9A0E8', c1: '#A86BD8', c2: '#7E45AD' },
  };
  const COLOR_IDS = Object.keys(COLORS);           // 팔레트 순서(빨-주-노-초-파-보)
  const hasColor = id => Object.prototype.hasOwnProperty.call(COLORS, id);

  /* 반짝이는 구슬 한 알 — viewBox 0 0 100 100, width 100%. uid 로 그라데이션 id 충돌 방지 */
  function drawBead(colorId, u) {
    const c = COLORS[colorId];
    if (!c) return '';
    u = u || nextUid();
    return `
      <svg viewBox="0 0 100 100" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="${u}" cx=".37" cy=".33" r=".75">
          <stop offset="0" stop-color="${c.c0}"/><stop offset=".55" stop-color="${c.c1}"/><stop offset="1" stop-color="${c.c2}"/>
        </radialGradient></defs>
        <circle cx="50" cy="50" r="43" fill="url(#${u})" stroke="${c.c2}" stroke-width="2.5"/>
        <circle cx="63" cy="64" r="12" fill="${c.c2}" opacity=".16"/>
        <ellipse cx="38" cy="34" rx="16" ry="11" fill="#FFFFFF" opacity=".55" transform="rotate(-24 38 34)"/>
        <circle cx="30" cy="28" r="3.2" fill="#FFFFFF" opacity=".8"/>
      </svg>`;
  }

  /* ─────────── 퍼즐 30개 (단계별 10) ───────────
   * rows: 글자 격자. R빨 O주 Y노 G초 B파 P보 · '.'=빈 구멍(구슬 없음).
   * 단계1=3×3, 단계2=4×4, 단계3=5×5. cells 는 행 우선(row-major) 색 id/null 배열로 편다. */
  const CH = { R: 'red', O: 'orange', Y: 'yellow', G: 'green', B: 'blue', P: 'purple', '.': null };
  const p = (level, id, size, rows) => {
    const cells = [];
    rows.forEach(r => r.split('').forEach(ch => cells.push(CH[ch])));
    return { level, id, size, rows: rows.slice(), cells };
  };

  const PUZZLES = [
    /* 단계1 — 3×3 : 알록달록 단순 무늬 */
    p(1, 'l1-bands',   3, ['RRR', 'YYY', 'BBB']),        // 가로 삼색 띠
    p(1, 'l1-cols',    3, ['RGB', 'RGB', 'RGB']),        // 세로 삼색 줄
    p(1, 'l1-check',   3, ['RYR', 'YRY', 'RYR']),        // 빨강·노랑 체크
    p(1, 'l1-x',       3, ['R.R', '.Y.', 'R.R']),        // 엑스 + 가운데 노랑
    p(1, 'l1-plus',    3, ['.G.', 'GGG', '.G.']),        // 초록 십자
    p(1, 'l1-frame',   3, ['BBB', 'B.B', 'BBB']),        // 파랑 액자
    p(1, 'l1-corners', 3, ['R.Y', '...', 'G.B']),        // 네 귀퉁이 색
    p(1, 'l1-heart',   3, ['P.P', 'PPP', '.P.']),        // 작은 보라 하트
    p(1, 'l1-sun',     3, ['.Y.', 'YOY', '.Y.']),        // 해님
    p(1, 'l1-rainbow', 3, ['RRR', 'OOO', 'YYY']),        // 빨-주-노 그라데이션

    /* 단계2 — 4×4 : 무늬 + 간단한 그림 */
    p(2, 'l2-bands',   4, ['RRRR', 'GGGG', 'BBBB', 'YYYY']),   // 네 가지 가로 띠
    p(2, 'l2-cols',    4, ['ROYG', 'ROYG', 'ROYG', 'ROYG']),   // 네 가지 세로 줄
    p(2, 'l2-check',   4, ['RBRB', 'BRBR', 'RBRB', 'BRBR']),   // 빨강·파랑 체크
    p(2, 'l2-frameB',  4, ['BBBB', 'B..B', 'B..B', 'BBBB']),   // 파랑 액자(속 비움)
    p(2, 'l2-diamond', 4, ['.RR.', 'RRRR', 'RRRR', '.RR.']),   // 빨강 마름모
    p(2, 'l2-onion',   4, ['YYYY', 'YGGY', 'YGGY', 'YYYY']),   // 노랑 테두리·초록 속
    p(2, 'l2-diag',    4, ['ROYG', 'OYGR', 'YGRO', 'GROY']),   // 대각선 무지개
    p(2, 'l2-frameG',  4, ['GGGG', 'GYYG', 'GYYG', 'GGGG']),   // 초록 액자·노랑 속
    p(2, 'l2-half',    4, ['RRBB', 'RRBB', 'RRBB', 'RRBB']),   // 반반 빨강·파랑
    p(2, 'l2-frameR',  4, ['RRRR', 'RYYR', 'RYYR', 'RRRR']),   // 빨강 액자·노랑 속

    /* 단계3 — 5×5 : 그림(하트·별·꽃·나무·집·얼굴·무지개·나비·보석·체크) */
    p(3, 'l3-heart',   5, ['.R.R.', 'RRRRR', 'RRRRR', '.RRR.', '..R..']),
    p(3, 'l3-star',    5, ['..Y..', '..Y..', 'YYYYY', '.YYY.', '.Y.Y.']),
    p(3, 'l3-flower',  5, ['.P.P.', 'PPPPP', '.PYP.', 'PPPPP', '.P.P.']),
    p(3, 'l3-tree',    5, ['..G..', '.GGG.', 'GGGGG', '..O..', '..O..']),
    p(3, 'l3-house',   5, ['..R..', '.RRR.', 'RRRRR', 'YYBYY', 'YYBYY']),
    p(3, 'l3-face',    5, ['.YYY.', 'YBYBY', 'YYYYY', 'YRRRY', '.YYY.']),
    p(3, 'l3-rainbow', 5, ['RRRRR', 'OOOOO', 'YYYYY', 'GGGGG', 'BBBBB']),
    p(3, 'l3-fly',     5, ['PP.PP', 'PPOPP', 'PPOPP', 'PPOPP', 'PP.PP']),
    p(3, 'l3-gem',     5, ['..B..', '.BGB.', 'BGYGB', '.BGB.', '..B..']),
    p(3, 'l3-check',   5, ['RBRBR', 'BRBRB', 'RBRBR', 'BRBRB', 'RBRBR']),
  ];

  const LEVELS = [
    { id: 1, size: 3, name: '작은 보드', desc: '3 × 3 구슬', cls: 'c-l1' },
    { id: 2, size: 4, name: '보통 보드', desc: '4 × 4 구슬', cls: 'c-l2' },
    { id: 3, size: 5, name: '큰 보드',   desc: '5 × 5 구슬', cls: 'c-l3' },
  ];
  const SIZES = { 1: 3, 2: 4, 3: 5 };

  const levelDef = id => LEVELS.find(l => l.id === id);
  const puzzlesOf = level => PUZZLES.filter(x => x.level === level);
  const puzzleById = id => PUZZLES.find(x => x.id === id) || null;

  // 퍼즐에 쓰인 서로 다른 색(팔레트 강조·미리보기용)
  const colorsIn = puzzle => COLOR_IDS.filter(c => puzzle.cells.indexOf(c) >= 0);
  // 채워야 할 구슬 수(빈칸 제외)
  const beadCount = puzzle => puzzle.cells.reduce((n, c) => n + (c ? 1 : 0), 0);

  const praises = ['우와, 구슬 보드 완성!', '색깔을 똑같이 맞췄어요!', '참 잘했어요, 반짝반짝!', '멋진 구슬 솜씨네요!', '냠냠 예쁘다! 최고예요!'];

  return {
    COLORS, COLOR_IDS, hasColor, drawBead, nextUid,
    PUZZLES, LEVELS, SIZES, levelDef, puzzlesOf, puzzleById,
    colorsIn, beadCount, praises,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = window.BeadsData;
