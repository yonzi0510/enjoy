/* 도넛 짝맞추기 데이터 — 도넛 9종(각기 다른 아이싱 색 + 무늬)과 퍼즐 30개(단계별 10).
 * 각 퍼즐은 자리판(빈 자리)에 놓아야 할 목표 도넛 목록 slots 와, 트레이에 흩어 놓을
 * 도넛(=목표 도넛을 섞은 것)으로 이루어진다. 도넛 그림은 인라인 SVG(외부 이미지 금지).
 * node 검증에서도 문자열만 다루므로 안전하다.
 * ⚠️ 도넛 id·퍼즐 id·자리 구성은 아이 진행도(done 키)가 id로 저장되므로 함부로 바꾸지 않는다.
 */
window.DonutData = (() => {

  /* 그라데이션 등 id 충돌을 막는 uid 카운터 (한 도넛을 자리판·트레이·미리보기에 여러 번 그린다) */
  let _uid = 0;
  const nextUid = () => 'd' + (_uid++);

  const f = n => Math.round(n * 10) / 10;      // SVG 문자열을 짧게 (소수 1자리)
  const cx = 60, cy = 60, RING = 37;           // 도넛 링 중심(120×120 뷰박스)·링 중심선 반지름

  /* 링 위 n개 지점(각도 균등, startDeg 부터). jitter 있으면 반지름을 조금씩 흔든다 */
  function ringPts(n, startDeg, jitter) {
    const a = [];
    for (let i = 0; i < n; i++) {
      const deg = startDeg + i * (360 / n);
      const rad = deg * Math.PI / 180;
      const r = RING + (jitter ? ((i * 7) % 3 - 1) * jitter : 0);
      a.push({ x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad), deg });
    }
    return a;
  }

  /* 무늬 조각들 — 아이싱 띠 위에 얹는다 */
  const SPRINKLE_COLORS = ['#FF6F91', '#FFD24C', '#5EC2E8', '#8ED96B', '#B57CE0', '#FF9F5A'];
  function dash(p, color, extraRot) {
    return `<rect x="-4.4" y="-1.8" width="8.8" height="3.6" rx="1.8" fill="${color}" transform="translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.deg + 90 + (extraRot || 0))})"/>`;
  }
  function sprinkles(colors) {
    return ringPts(14, 8, 8).map((p, i) => dash(p, colors[i % colors.length], (i % 2 ? 26 : -26))).join('');
  }
  function drizzle(color) {                    // 가는 흰 지그재그 (초코 도넛 위 드리즐)
    return ringPts(18, 0, 4).map((p, i) => `<rect x="-3.4" y="-1.2" width="6.8" height="2.4" rx="1.2" fill="${color}" transform="translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.deg + 90 + (i % 2 ? 34 : -34))})"/>`).join('');
  }
  function stripes(color) {                    // 링을 가로지르는 굵은 막대 (줄무늬)
    let s = '';
    for (let i = 0; i < 10; i++) {
      const deg = i * 36;
      const rad = deg * Math.PI / 180;
      const x = cx + RING * Math.cos(rad), y = cy + RING * Math.sin(rad);
      s += `<rect x="-3" y="-13.5" width="6" height="27" rx="3" fill="${color}" transform="translate(${f(x)} ${f(y)}) rotate(${f(deg - 90)})"/>`;
    }
    return s;
  }
  function dots(color) {
    return ringPts(12, 0).map(p => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="3.4" fill="${color}"/>`).join('');
  }
  function sugar(color) {                       // 자잘한 슈가 파우더 알갱이
    return ringPts(24, 5, 10).map((p, i) => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${i % 3 ? 1.5 : 1.9}" fill="${color}"/>`).join('');
  }
  function cherry() {                           // 위쪽에 얹힌 체리 한 알
    return `<g>
      <path d="M66,26 C70,16 78,12 84,14" fill="none" stroke="#6FA83C" stroke-width="2.6" stroke-linecap="round"/>
      <ellipse cx="83" cy="12" rx="4.2" ry="2.4" fill="#7CC24A" transform="rotate(24 83 12)"/>
      <circle cx="64" cy="30" r="9" fill="#E1424A"/>
      <circle cx="64" cy="30" r="9" fill="none" stroke="#B92B33" stroke-width="1.4"/>
      <circle cx="61" cy="27" r="2.6" fill="#FF9AA0" opacity=".85"/>
    </g>`;
  }

  /* 도넛 한 개 SVG — 도우 링 + 아이싱 링 + 흘러내린 방울 + 하이라이트 + 무늬 */
  const DOUGH_A = '#EEBC84', DOUGH_B = '#CB914F';
  function makeDraw(icA, icB, pat) {
    return (u) => {
      const drips = `<g fill="${icB}"><circle cx="41" cy="96" r="5.5"/><circle cx="60" cy="101" r="6.5"/><circle cx="80" cy="95" r="5"/><circle cx="27" cy="80" r="4.5"/></g>`;
      return `<svg viewBox="0 0 120 120" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${u}d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${DOUGH_A}"/><stop offset="1" stop-color="${DOUGH_B}"/></linearGradient>
          <linearGradient id="${u}i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${icA}"/><stop offset="1" stop-color="${icB}"/></linearGradient>
        </defs>
        <ellipse cx="60" cy="108" rx="40" ry="7.5" fill="#C98A4E" opacity=".18"/>
        <circle cx="60" cy="60" r="37" fill="none" stroke="url(#${u}d)" stroke-width="34"/>
        ${drips}
        <circle cx="60" cy="60" r="37" fill="none" stroke="url(#${u}i)" stroke-width="27"/>
        <path d="M40,44 A24,24 0 0 1 80,40" fill="none" stroke="#FFFFFF" stroke-width="3.4" stroke-linecap="round" opacity=".4"/>
        ${pat}
        <circle cx="60" cy="60" r="20" fill="none" stroke="${DOUGH_B}" stroke-width="3" opacity=".55"/>
        <circle cx="60" cy="60" r="20" fill="none" stroke="#FFFFFF" stroke-width="1.4" opacity=".35" stroke-dasharray="2 40" stroke-dashoffset="6"/>
      </svg>`;
    };
  }

  /* ─────────── 도넛 9종 ───────────
   * 각기 다른 아이싱 색 + 무늬로 뚜렷이 구분된다. say = TTS 로 읽어 줄 이름. */
  const DONUTS = {
    strawberry: { name: '딸기 도넛',   say: '딸기 도넛',   draw: makeDraw('#F7A6C4', '#EE7CA6', sprinkles(SPRINKLE_COLORS)) },
    choco:      { name: '초코 도넛',   say: '초코 도넛',   draw: makeDraw('#7A5230', '#583A1E', drizzle('#FFF6E8')) },
    vanilla:    { name: '바닐라 도넛', say: '바닐라 도넛', draw: makeDraw('#FBEFD3', '#E8CF9E', cherry()) },
    lemon:      { name: '레몬 도넛',   say: '레몬 도넛',   draw: makeDraw('#FFDE6A', '#F3BE2C', stripes('#FFFFFF')) },
    mint:       { name: '민트 도넛',   say: '민트 도넛',   draw: makeDraw('#9BE6D2', '#68CBB4', sprinkles(['#FF7FA6', '#FF9ABF', '#FF6F91'])) },
    blueberry:  { name: '블루베리 도넛', say: '블루베리 도넛', draw: makeDraw('#A7B2F0', '#7B89E0', dots('#FFFFFF')) },
    matcha:     { name: '말차 도넛',   say: '말차 도넛',   draw: makeDraw('#AFC96E', '#8AA948', sprinkles(['#FFE066', '#FFD24C', '#F6B93B'])) },
    caramel:    { name: '캐러멜 도넛', say: '캐러멜 도넛', draw: makeDraw('#E7A657', '#CE8437', stripes('#7A4A24')) },
    grape:      { name: '포도 도넛',   say: '포도 도넛',   draw: makeDraw('#C39BE0', '#A876CE', sugar('#FFFFFF')) },
  };

  const ID_LIST = Object.keys(DONUTS);
  const has = id => Object.prototype.hasOwnProperty.call(DONUTS, id);
  const meta = id => DONUTS[id];

  /* ─────────── 퍼즐 30개 (단계별 10) ───────────
   * slots: 자리판의 각 칸에 놓아야 할 목표 도넛(왼쪽 위 → 오른쪽 아래 순서).
   * 단계1=자리 4개(2×2), 단계2=6개(3×2), 단계3=9개(3×3).
   * 한 퍼즐 안에서 도넛은 서로 다르다(자리·도넛이 1:1 로 대응해 매칭이 또렷하다).
   * 퍼즐끼리 자리 배열이 겹치지 않는다. */
  const A = 'strawberry', C = 'choco', V = 'vanilla', L = 'lemon',
        M = 'mint', B = 'blueberry', T = 'matcha', R = 'caramel', G = 'grape';
  const p = (level, id, slots) => ({ level, id, slots });

  const PUZZLES = [
    /* 단계1 — 자리 4개 (2×2) */
    p(1, 'l1-a', [A, C, V, L]),
    p(1, 'l1-b', [M, B, T, R]),
    p(1, 'l1-c', [G, A, C, M]),
    p(1, 'l1-d', [V, L, B, T]),
    p(1, 'l1-e', [R, G, A, B]),
    p(1, 'l1-f', [C, M, L, G]),
    p(1, 'l1-g', [T, V, R, A]),
    p(1, 'l1-h', [B, G, M, C]),
    p(1, 'l1-i', [L, R, T, V]),
    p(1, 'l1-j', [A, M, B, G]),

    /* 단계2 — 자리 6개 (3×2) */
    p(2, 'l2-a', [A, C, V, L, M, B]),
    p(2, 'l2-b', [T, R, G, A, C, V]),
    p(2, 'l2-c', [L, M, B, T, R, G]),
    p(2, 'l2-d', [C, V, A, B, G, M]),
    p(2, 'l2-e', [R, T, L, V, A, C]),
    p(2, 'l2-f', [G, B, M, C, T, L]),
    p(2, 'l2-g', [V, A, R, G, M, B]),
    p(2, 'l2-h', [M, L, T, A, B, R]),
    p(2, 'l2-i', [B, G, C, V, L, T]),
    p(2, 'l2-j', [A, R, M, B, C, G]),

    /* 단계3 — 자리 9개 (3×3), 도넛 9종 전부 (자리 배열만 다르다) */
    p(3, 'l3-a', [A, C, V, L, M, B, T, R, G]),
    p(3, 'l3-b', [G, R, T, B, M, L, V, C, A]),
    p(3, 'l3-c', [C, A, L, V, B, M, R, T, G]),
    p(3, 'l3-d', [M, B, A, C, G, V, L, T, R]),
    p(3, 'l3-e', [T, V, G, R, A, B, M, C, L]),
    p(3, 'l3-f', [B, L, R, M, T, G, A, V, C]),
    p(3, 'l3-g', [V, G, M, A, C, T, B, L, R]),
    p(3, 'l3-h', [R, T, C, G, L, A, V, B, M]),
    p(3, 'l3-i', [L, M, B, T, R, C, G, A, V],),
    p(3, 'l3-j', [A, T, L, B, V, R, C, G, M]),
  ];

  const LEVELS = [
    { id: 1, icon: '🍩', name: '작은 도넛판', desc: '도넛 4개 맞추기', cls: 'c-l1', cols: 2, count: 4 },
    { id: 2, icon: '🍩', name: '보통 도넛판', desc: '도넛 6개 맞추기', cls: 'c-l2', cols: 3, count: 6 },
    { id: 3, icon: '🍩', name: '큰 도넛판',   desc: '도넛 9개 맞추기', cls: 'c-l3', cols: 3, count: 9 },
  ];
  const levelDef = id => LEVELS.find(l => l.id === id);
  const puzzlesOf = level => PUZZLES.filter(x => x.level === level);
  const puzzleById = id => PUZZLES.find(x => x.id === id) || null;

  // 트레이에 흩어 놓을 도넛 = 목표 도넛을 그대로 (섞기는 앱에서) — 정답이 반드시 포함된다
  const trayOf = puzzle => puzzle.slots.slice();

  const praises = ['우와, 도넛 다 맞췄어요!', '똑같은 도넛을 잘 찾았어요!', '참 잘했어요! 도넛 완성!', '멋져요! 짝을 다 찾았네요!', '냠냠! 맛있는 도넛 가게예요!'];

  return {
    DONUTS, ID_LIST, has, meta,
    PUZZLES, LEVELS, levelDef, puzzlesOf, puzzleById, trayOf, praises,
    nextUid,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = window.DonutData;
