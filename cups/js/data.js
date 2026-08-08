/* 컵 쌓기 데이터 — 색 컵 6종과 퍼즐 30개(단계별 10).
 * 각 퍼즐은 피라미드 모양(아래 넓고 위 좁은 줄)의 목표 색 배치다.
 *   rows: 아래줄 → 위줄 순서의 색 배열. rows[0]=맨 아래줄.
 *   단계1=2+1(3컵), 단계2=3+2+1(6컵), 단계3=4+3+2+1(10컵).
 * 컵 그림은 인라인 SVG(외부 이미지 금지). node 검증에서도 문자열만 다루므로 안전하다.
 * ⚠️ 색 id·퍼즐 id·색 배치는 아이 진행도(done 키)가 id로 저장되므로 함부로 바꾸지 않는다.
 */
window.CupsData = (() => {

  /* 그라데이션 id 충돌을 막는 uid 카운터 (한 색을 카드·슬롯·트레이에 여러 번 그린다) */
  let _uid = 0;
  const nextUid = () => 'c' + (_uid++);

  /* ─────────── 색 컵 6종 ───────────
   * lite/dark: 위→아래 그라데이션 · rim: 컵 입구 안쪽 · hi: 밝은 반사
   * say: 한국어 TTS 로 읽어줄 색 이름 */
  const COLORS = {
    red:    { name: '빨강', say: '빨강', lite: '#FF7D6E', dark: '#E23B2E', rim: '#B72A1E', hi: '#FFB3A8' },
    orange: { name: '주황', say: '주황', lite: '#FFB84E', dark: '#F2892A', rim: '#C86E17', hi: '#FFD79A' },
    yellow: { name: '노랑', say: '노랑', lite: '#FFE066', dark: '#F4BE12', rim: '#C99705', hi: '#FFF0AA' },
    green:  { name: '초록', say: '초록', lite: '#83D96F', dark: '#4CA832', rim: '#37811F', hi: '#BEECAF' },
    blue:   { name: '파랑', say: '파랑', lite: '#5FB9F0', dark: '#2E86D6', rim: '#1F65A8', hi: '#AEDCFA' },
    purple: { name: '보라', say: '보라', lite: '#BB86E4', dark: '#8A4FC0', rim: '#663596', hi: '#DCC2F2' },
  };
  const ORDER = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
  const has = k => Object.prototype.hasOwnProperty.call(COLORS, k);
  const meta = k => COLORS[k];

  /* 색 컵 하나 그리기 — 위가 넓고 아래가 좁은 사다리꼴 컵, 입구·명암·반사 */
  function cupSVG(colorKey, uid) {
    const c = COLORS[colorKey];
    const u = uid || nextUid();
    return `
      <svg viewBox="0 0 100 96" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${c.lite}"/><stop offset="1" stop-color="${c.dark}"/>
        </linearGradient></defs>
        <!-- 컵 몸통 (사다리꼴, 둥근 밑) -->
        <path d="M12,16 L88,16 L76,84 Q75,90 69,90 L31,90 Q25,90 24,84 Z" fill="url(#${u})"/>
        <!-- 왼쪽 세로 반사 -->
        <path d="M31,22 L38,22 L33,84 L27,84 Z" fill="#FFFFFF" opacity=".22"/>
        <!-- 밑바닥 그늘 -->
        <ellipse cx="50" cy="86" rx="22" ry="4" fill="${c.rim}" opacity=".45"/>
        <!-- 컵 입구 -->
        <ellipse cx="50" cy="16" rx="38" ry="8" fill="${c.dark}"/>
        <ellipse cx="50" cy="15" rx="38" ry="7.4" fill="${c.lite}"/>
        <ellipse cx="50" cy="15.5" rx="30" ry="5.2" fill="${c.rim}"/>
        <ellipse cx="50" cy="14.6" rx="30" ry="4.8" fill="${c.dark}"/>
        <!-- 입구 반짝 -->
        <path d="M28,13 a24 6 0 0 1 21 -5" fill="none" stroke="${c.hi}" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>
      </svg>`;
  }

  /* 빈 슬롯 — 연필로 그려 둔 점선 컵 자리 (색·글씨 없음).
     낙서장 시안에 맞춰 선 색만 연필심으로 바꿨다 — 모양·좌표는 그대로라 자리 판정에 영향이 없다. */
  function slotSVG() {
    return `
      <svg viewBox="0 0 100 96" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <path d="M12,16 L88,16 L76,84 Q75,90 69,90 L31,90 Q25,90 24,84 Z"
          fill="rgba(255,255,255,.45)" stroke="rgba(46,42,36,.62)" stroke-width="2.8" stroke-dasharray="5 5" stroke-linejoin="round"/>
        <ellipse cx="50" cy="16" rx="38" ry="7.4" fill="none" stroke="rgba(46,42,36,.62)" stroke-width="2.8" stroke-dasharray="5 5"/>
      </svg>`;
  }

  /* ─────────── 퍼즐 30개 (단계별 10) ───────────
   * rows: 아래줄→위줄. flat() 로 펼치면 "아래줄 왼→오, 다음 줄 …, 꼭대기" 쌓기 순서.
   * 한 퍼즐이 쓰는 색은 5종 이하 → 6색 트레이에 항상 방해(안 쓰는) 색이 남는다.
   * 퍼즐끼리 색 배치(펼친 순서)는 서로 겹치지 않는다. */
  const p = (level, id, rows) => ({ level, id, rows });

  const PUZZLES = [
    /* 단계1 — 2+1 (3컵) */
    p(1, 'l1-a', [['red', 'red'], ['yellow']]),
    p(1, 'l1-b', [['blue', 'green'], ['red']]),
    p(1, 'l1-c', [['yellow', 'orange'], ['green']]),
    p(1, 'l1-d', [['green', 'blue'], ['purple']]),
    p(1, 'l1-e', [['red', 'yellow'], ['blue']]),
    p(1, 'l1-f', [['purple', 'purple'], ['orange']]),
    p(1, 'l1-g', [['orange', 'green'], ['yellow']]),
    p(1, 'l1-h', [['blue', 'red'], ['green']]),
    p(1, 'l1-i', [['yellow', 'purple'], ['red']]),
    p(1, 'l1-j', [['green', 'orange'], ['blue']]),

    /* 단계2 — 3+2+1 (6컵) */
    p(2, 'l2-a', [['red', 'orange', 'yellow'], ['orange', 'red'], ['yellow']]),
    p(2, 'l2-b', [['blue', 'green', 'blue'], ['green', 'blue'], ['green']]),
    p(2, 'l2-c', [['purple', 'blue', 'purple'], ['blue', 'purple'], ['blue']]),
    p(2, 'l2-d', [['red', 'yellow', 'green'], ['yellow', 'red'], ['green']]),
    p(2, 'l2-e', [['orange', 'green', 'orange'], ['red', 'yellow'], ['orange']]),
    p(2, 'l2-f', [['green', 'blue', 'purple'], ['green', 'blue'], ['purple']]),
    p(2, 'l2-g', [['yellow', 'orange', 'red'], ['yellow', 'orange'], ['red']]),
    p(2, 'l2-h', [['purple', 'red', 'purple'], ['yellow', 'green'], ['purple']]),
    p(2, 'l2-i', [['blue', 'yellow', 'blue'], ['orange', 'green'], ['blue']]),
    p(2, 'l2-j', [['red', 'green', 'blue'], ['yellow', 'purple'], ['red']]),

    /* 단계3 — 4+3+2+1 (10컵) */
    p(3, 'l3-a', [['red', 'orange', 'yellow', 'orange'], ['red', 'orange', 'yellow'], ['red', 'orange'], ['red']]),
    p(3, 'l3-b', [['blue', 'green', 'blue', 'green'], ['blue', 'green', 'blue'], ['green', 'blue'], ['green']]),
    p(3, 'l3-c', [['purple', 'red', 'purple', 'red'], ['purple', 'red', 'purple'], ['red', 'purple'], ['red']]),
    p(3, 'l3-d', [['red', 'orange', 'yellow', 'green'], ['orange', 'yellow', 'green'], ['yellow', 'green'], ['green']]),
    p(3, 'l3-e', [['yellow', 'green', 'blue', 'purple'], ['green', 'blue', 'purple'], ['blue', 'purple'], ['purple']]),
    p(3, 'l3-f', [['red', 'yellow', 'blue', 'green'], ['red', 'yellow', 'blue'], ['red', 'yellow'], ['red']]),
    p(3, 'l3-g', [['orange', 'purple', 'orange', 'purple'], ['orange', 'purple', 'orange'], ['purple', 'orange'], ['purple']]),
    p(3, 'l3-h', [['green', 'yellow', 'orange', 'red'], ['green', 'yellow', 'orange'], ['green', 'yellow'], ['green']]),
    p(3, 'l3-i', [['blue', 'purple', 'red', 'yellow'], ['blue', 'purple', 'red'], ['blue', 'purple'], ['blue']]),
    p(3, 'l3-j', [['red', 'green', 'blue', 'yellow'], ['orange', 'red', 'green'], ['blue', 'yellow'], ['orange']]),
  ];

  const LEVELS = [
    { id: 1, icon: '🥤', name: '꼬마 탑', desc: '컵 3개 쌓기', cls: 'c-l1' },
    { id: 2, icon: '🥤', name: '중간 탑', desc: '컵 6개 쌓기', cls: 'c-l2' },
    { id: 3, icon: '🥤', name: '왕 탑',   desc: '컵 10개 쌓기', cls: 'c-l3' },
  ];

  /* rows(아래→위) 를 쌓기 순서 배열로 펼친다: 아래줄 왼→오 먼저 */
  const flat = pz => pz.rows.reduce((a, r) => a.concat(r), []);
  const cupCount = pz => flat(pz).length;
  const colorsUsed = pz => { const s = new Set(); flat(pz).forEach(k => s.add(k)); return [...s]; };

  const levelDef = id => LEVELS.find(l => l.id === id);
  const puzzlesOf = level => PUZZLES.filter(x => x.level === level);
  const puzzleById = id => PUZZLES.find(x => x.id === id) || null;

  const praises = ['우와, 탑 완성! 종을 울려요!', '똑같이 쌓았어요! 참 잘했어요!', '색깔을 딱 맞췄네요!', '멋진 컵 탑이에요!', '딩동! 최고예요!'];

  return {
    COLORS, ORDER, has, meta, cupSVG, slotSVG,
    PUZZLES, LEVELS, levelDef, puzzlesOf, puzzleById,
    flat, cupCount, colorsUsed, praises,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = window.CupsData;
