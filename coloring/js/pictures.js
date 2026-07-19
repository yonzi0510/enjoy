/* 색칠공부 밑그림 30장 — 네 카테고리(동물·과일음식·탈것사물·자연계절)
 * 좌표계는 0~100 정사각. 각 그림은 SVG path 문자열의 배열(items)로 이루어진다.
 *   - 문자열       → 검은 선(윤곽)으로 그린다
 *   - {d, f:1}     → 검은색으로 채운다(눈·코 등 작은 점)
 * flood fill 이 영역별로 막히도록 큰 윤곽은 반드시 "닫힌 도형"을 쓴다.
 * 아래 프리미티브(원·타원·둥근네모·다각형)는 모두 Z로 닫힌 경로를 만든다.
 */
window.Pictures = (() => {
  const n = v => Math.round(v * 100) / 100;
  // 원
  function C(cx, cy, r) {
    return `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0Z`;
  }
  // 타원
  function E(cx, cy, rx, ry) {
    return `M${n(cx - rx)} ${n(cy)}a${n(rx)} ${n(ry)} 0 1 0 ${n(2 * rx)} 0a${n(rx)} ${n(ry)} 0 1 0 ${n(-2 * rx)} 0Z`;
  }
  // 둥근 네모
  function R(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    return `M${n(x + r)} ${n(y)}h${n(w - 2 * r)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(r)}` +
      `v${n(h - 2 * r)}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(r)}h${n(-(w - 2 * r))}` +
      `a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(-r)}v${n(-(h - 2 * r))}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(-r)}Z`;
  }
  // 다각형 (닫힘)
  function P(pts) { return 'M' + pts.map(p => n(p[0]) + ' ' + n(p[1])).join('L') + 'Z'; }
  // 열린 선(디테일 — 수염·입 등)
  function L(x1, y1, x2, y2) { return `M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`; }
  // 반원 아치 (무지개)
  function ARC(cx, cy, r) { return `M${n(cx - r)} ${n(cy)}A${n(r)} ${n(r)} 0 0 1 ${n(cx + r)} ${n(cy)}`; }
  // 별 (n각) — 닫힌 별 다각형
  function STAR(cx, cy, rO, rI, spikes) {
    const pts = [];
    for (let i = 0; i < spikes * 2; i++) {
      const rr = i % 2 ? rI : rO;
      const a = -Math.PI / 2 + i * Math.PI / spikes;
      pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
    return P(pts);
  }

  // ─────────── 동물 8 ───────────
  const dog = [
    E(22, 44, 9, 16), E(78, 44, 9, 16),           // 귀
    C(50, 54, 28),                                 // 얼굴
    { d: C(41, 50, 3), f: 1 }, { d: C(59, 50, 3), f: 1 }, // 눈
    { d: E(50, 62, 6, 5), f: 1 },                  // 코
    'M50 67Q43 76 35 70', 'M50 67Q57 76 65 70',    // 입
  ];
  const cat = [
    P([[26, 36], [18, 10], [44, 28]]), P([[74, 36], [82, 10], [56, 28]]), // 귀
    C(50, 56, 26),                                 // 얼굴
    { d: C(41, 52, 3.5), f: 1 }, { d: C(59, 52, 3.5), f: 1 }, // 눈
    { d: P([[47, 60], [53, 60], [50, 65]]), f: 1 }, // 코
    'M50 65Q45 71 40 68', 'M50 65Q55 71 60 68',    // 입
    L(18, 58, 40, 60), L(18, 64, 40, 63), L(82, 58, 60, 60), L(82, 64, 60, 63), // 수염
  ];
  const rabbit = [
    E(40, 24, 7, 20), E(60, 24, 7, 20),            // 긴 귀
    E(40, 24, 3, 13), E(60, 24, 3, 13),            // 귀 안쪽
    C(50, 58, 24),                                 // 얼굴
    { d: C(42, 55, 3), f: 1 }, { d: C(58, 55, 3), f: 1 }, // 눈
    { d: P([[47, 62], [53, 62], [50, 66]]), f: 1 }, // 코
    'M50 66Q45 71 41 68', 'M50 66Q55 71 59 68',
  ];
  const lion = [
    C(50, 52, 32),                                 // 갈기
    C(50, 54, 21),                                 // 얼굴
    C(30, 32, 7), C(70, 32, 7),                    // 귀
    { d: C(42, 50, 3), f: 1 }, { d: C(58, 50, 3), f: 1 }, // 눈
    { d: P([[46, 58], [54, 58], [50, 63]]), f: 1 }, // 코
    'M50 63Q44 70 38 65', 'M50 63Q56 70 62 65',
    L(24, 56, 40, 59), L(76, 56, 60, 59),
  ];
  const fish = [
    E(46, 52, 28, 20),                             // 몸
    P([[72, 52], [92, 34], [92, 70]]),             // 꼬리
    P([[42, 32], [54, 20], [58, 36]]),             // 등지느러미
    C(34, 46, 5), { d: C(34, 46, 2.4), f: 1 },     // 눈
    'M22 58Q32 66 44 60',                          // 입
    C(16, 34, 3), C(9, 26, 2),                     // 물방울
  ];
  const butterfly = [
    E(50, 52, 4, 22),                              // 몸통
    C(32, 38, 15), C(68, 38, 15),                  // 위 날개
    C(34, 66, 12), C(66, 66, 12),                  // 아래 날개
    C(30, 38, 5), C(70, 38, 5),                    // 날개 무늬
    'M50 32Q44 20 39 16', 'M50 32Q56 20 61 16',    // 더듬이
  ];
  const bear = [
    C(28, 32, 10), C(72, 32, 10),                  // 귀
    C(28, 32, 5), C(72, 32, 5),
    C(50, 55, 27),                                 // 얼굴
    { d: C(41, 51, 3), f: 1 }, { d: C(59, 51, 3), f: 1 }, // 눈
    E(50, 64, 12, 9),                              // 주둥이
    { d: E(50, 60, 4, 3), f: 1 },                  // 코
    'M50 63L50 67', 'M50 67Q45 71 42 69', 'M50 67Q55 71 58 69',
  ];
  const duck = [
    E(44, 66, 26, 18),                             // 몸
    E(42, 66, 12, 8),                              // 날개
    C(68, 42, 15),                                 // 머리
    P([[80, 39], [95, 43], [80, 47]]),             // 부리
    { d: C(70, 39, 2.6), f: 1 },                   // 눈
  ];

  // ─────────── 과일·음식 8 ───────────
  const apple = [
    'M50 34C30 30 22 50 30 70C36 84 50 84 50 78C50 84 64 84 70 70C78 50 70 30 50 34Z',
    L(50, 34, 50, 22),                             // 꼭지
    E(60, 26, 8, 4),                               // 잎
  ];
  const banana = [
    'M22 40C18 64 40 84 68 78C58 80 40 74 36 54C34 44 36 40 42 35C35 32 26 33 22 40Z',
    L(42, 35, 45, 30),
  ];
  const iceCream = [
    P([[38, 56], [62, 56], [50, 92]]),             // 콘
    C(42, 48, 14), C(58, 48, 14),                  // 두 스쿱
    C(50, 30, 5),                                  // 체리
    L(50, 35, 50, 30),
    L(42, 62, 48, 84), L(58, 62, 52, 84),          // 콘 빗금
  ];
  const cake = [
    E(50, 84, 34, 6),                              // 접시
    R(24, 52, 52, 32, 5),                          // 몸
    'M24 60Q31 54 38 60T52 60T66 60T76 60',        // 크림 물결
    R(47, 34, 6, 14, 2),                           // 초
    E(50, 30, 3, 5),                               // 불꽃
    { d: C(36, 72, 2.5), f: 1 }, { d: C(50, 72, 2.5), f: 1 }, { d: C(64, 72, 2.5), f: 1 }, // 장식
  ];
  const strawberry = [
    'M50 40C30 40 26 60 40 80C46 88 54 88 60 80C74 60 70 40 50 40Z',
    P([[42, 40], [50, 28], [58, 40], [53, 44], [47, 44]]), // 꼭지 잎
    { d: C(42, 56, 1.6), f: 1 }, { d: C(52, 54, 1.6), f: 1 }, { d: C(58, 64, 1.6), f: 1 },
    { d: C(46, 68, 1.6), f: 1 }, { d: C(56, 76, 1.6), f: 1 }, { d: C(40, 62, 1.6), f: 1 }, // 씨
  ];
  const watermelon = [
    'M14 44A38 38 0 0 0 86 44Z',                   // 겉껍질(반원)
    'M20 44A32 32 0 0 0 80 44',                    // 속 경계
    { d: C(40, 54, 2), f: 1 }, { d: C(52, 60, 2), f: 1 }, { d: C(62, 52, 2), f: 1 },
    { d: C(48, 50, 2), f: 1 }, { d: C(56, 68, 2), f: 1 }, // 씨
  ];
  const grapes = [
    C(50, 30, 8),                                  // 포도알 (삼각 배열)
    C(40, 44, 8), C(60, 44, 8),
    C(30, 58, 8), C(50, 58, 8), C(70, 58, 8),
    C(40, 72, 8), C(60, 72, 8),
    L(50, 22, 50, 12),                             // 줄기
    P([[50, 14], [64, 8], [66, 18], [54, 20]]),    // 잎
  ];
  const donut = [
    C(50, 52, 30), C(50, 52, 12),                  // 바깥·구멍
    L(30, 40, 34, 44), L(60, 36, 65, 40), L(70, 60, 66, 64),
    L(40, 74, 44, 70), L(28, 58, 33, 60), L(56, 70, 60, 66), // 스프링클
  ];

  // ─────────── 탈것·사물 7 ───────────
  const car = [
    R(12, 52, 76, 22, 9),                          // 몸체
    P([[30, 52], [40, 36], [66, 36], [76, 52]]),   // 지붕
    L(53, 36, 53, 52),                             // 창 사이
    C(30, 76, 9), C(70, 76, 9),                    // 바퀴
    { d: C(30, 76, 3), f: 1 }, { d: C(70, 76, 3), f: 1 },
  ];
  const rocket = [
    'M50 10C40 20 38 40 38 62L62 62C62 40 60 20 50 10Z', // 몸통
    C(50, 34, 8),                                  // 창문
    C(50, 34, 4),
    P([[38, 54], [26, 70], [38, 66]]),             // 날개
    P([[62, 54], [74, 70], [62, 66]]),
    P([[42, 62], [50, 82], [58, 62]]),             // 불꽃
  ];
  const house = [
    R(24, 50, 52, 34, 2),                          // 벽
    P([[16, 50], [50, 22], [84, 50]]),             // 지붕
    R(43, 64, 15, 20, 2),                          // 문
    R(30, 57, 11, 11, 1), R(59, 57, 11, 11, 1),    // 창
    R(63, 30, 8, 14, 1),                           // 굴뚝
  ];
  const boat = [
    P([[18, 64], [82, 64], [72, 82], [28, 82]]),   // 선체
    L(50, 24, 50, 64),                             // 돛대
    P([[50, 26], [50, 60], [76, 60]]),             // 돛
    'M12 84Q22 90 32 84T52 84T72 84T88 84',        // 물결
  ];
  const train = [
    R(16, 44, 54, 26, 4),                          // 몸체
    R(20, 30, 22, 16, 3),                          // 운전칸
    R(56, 28, 10, 18, 2),                          // 굴뚝
    C(28, 74, 7), C(50, 74, 7), C(62, 74, 7),      // 바퀴
    { d: C(28, 74, 2.4), f: 1 }, { d: C(50, 74, 2.4), f: 1 }, { d: C(62, 74, 2.4), f: 1 },
    C(66, 18, 5), C(74, 12, 4),                    // 연기
  ];
  const balloon = [
    E(50, 40, 26, 30),                             // 풍선
    P([[46, 69], [54, 69], [50, 76]]),             // 매듭
    'M50 76Q60 86 50 96',                          // 줄
  ];
  const airplane = [
    E(50, 52, 34, 10),                             // 동체
    P([[40, 48], [30, 30], [46, 46]]),             // 위 날개
    P([[40, 56], [30, 74], [46, 58]]),             // 아래 날개
    P([[84, 48], [92, 40], [80, 50]]),             // 꼬리
    { d: C(30, 52, 3), f: 1 }, { d: C(42, 52, 3), f: 1 }, { d: C(54, 52, 3), f: 1 }, // 창문
  ];

  // ─────────── 자연·계절 7 ───────────
  const flower = [
    C(50, 26, 11), C(74, 40, 11), C(66, 68, 11), C(34, 68, 11), C(26, 40, 11), // 꽃잎
    C(50, 48, 11),                                 // 꽃술
    L(50, 59, 50, 92),                             // 줄기
    E(38, 74, 9, 5), E(62, 80, 9, 5),              // 잎
  ];
  const tree = [
    R(44, 58, 12, 34, 2),                          // 줄기
    C(50, 36, 22), C(33, 48, 15), C(67, 48, 15),   // 잎덩이
  ];
  const sun = [
    C(50, 50, 22),                                 // 해
    P([[50, 6], [46, 22], [54, 22]]), P([[50, 94], [46, 78], [54, 78]]),
    P([[6, 50], [22, 46], [22, 54]]), P([[94, 50], [78, 46], [78, 54]]),
    P([[19, 19], [30, 30], [22, 34]]), P([[81, 19], [70, 30], [78, 34]]),
    P([[19, 81], [30, 70], [34, 78]]), P([[81, 81], [70, 70], [66, 78]]), // 햇살
    { d: C(42, 46, 2.6), f: 1 }, { d: C(58, 46, 2.6), f: 1 }, // 눈
    'M40 56Q50 66 60 56',                          // 미소
  ];
  const rainbow = [
    ARC(50, 66, 40), ARC(50, 66, 32), ARC(50, 66, 24), ARC(50, 66, 16), // 무지개 띠
    C(18, 66, 10), C(28, 68, 9),                   // 왼쪽 구름
    C(82, 66, 10), C(72, 68, 9),                   // 오른쪽 구름
  ];
  const snowman = [
    C(50, 74, 19), C(50, 46, 14), C(50, 24, 11),   // 세 덩이
    R(40, 8, 20, 8, 1), R(44, 0, 12, 10, 1),       // 모자
    { d: C(46, 22, 1.8), f: 1 }, { d: C(54, 22, 1.8), f: 1 }, // 눈
    P([[50, 25], [60, 27], [50, 29]]),             // 당근 코
    { d: C(50, 42, 2), f: 1 }, { d: C(50, 50, 2), f: 1 }, // 단추
    L(36, 44, 18, 36), L(64, 44, 82, 36),          // 팔
  ];
  const cloud = [
    R(28, 48, 46, 16, 8), C(40, 48, 13), C(58, 46, 15), C(50, 42, 13), // 구름 덩이
    L(38, 70, 34, 78), L(50, 70, 46, 80), L(62, 70, 58, 78),          // 빗방울
  ];
  const star = [
    STAR(50, 50, 38, 16, 5),                       // 별
    { d: C(42, 46, 2.4), f: 1 }, { d: C(58, 46, 2.4), f: 1 }, // 눈
    'M42 56Q50 64 58 56',                          // 미소
  ];

  const CATS = [
    { id: 'animal', emoji: '🐶', name: '동물' },
    { id: 'food', emoji: '🍎', name: '과일·음식' },
    { id: 'vehicle', emoji: '🚗', name: '탈것·사물' },
    { id: 'nature', emoji: '🌈', name: '자연·계절' },
  ];

  const PICTURES = [
    { id: 'dog', cat: 'animal', emoji: '🐶', name: '강아지', items: dog },
    { id: 'cat', cat: 'animal', emoji: '🐱', name: '고양이', items: cat },
    { id: 'rabbit', cat: 'animal', emoji: '🐰', name: '토끼', items: rabbit },
    { id: 'lion', cat: 'animal', emoji: '🦁', name: '사자', items: lion },
    { id: 'fish', cat: 'animal', emoji: '🐟', name: '물고기', items: fish },
    { id: 'butterfly', cat: 'animal', emoji: '🦋', name: '나비', items: butterfly },
    { id: 'bear', cat: 'animal', emoji: '🐻', name: '곰', items: bear },
    { id: 'duck', cat: 'animal', emoji: '🦆', name: '오리', items: duck },

    { id: 'apple', cat: 'food', emoji: '🍎', name: '사과', items: apple },
    { id: 'banana', cat: 'food', emoji: '🍌', name: '바나나', items: banana },
    { id: 'icecream', cat: 'food', emoji: '🍦', name: '아이스크림', items: iceCream },
    { id: 'cake', cat: 'food', emoji: '🍰', name: '케이크', items: cake },
    { id: 'strawberry', cat: 'food', emoji: '🍓', name: '딸기', items: strawberry },
    { id: 'watermelon', cat: 'food', emoji: '🍉', name: '수박', items: watermelon },
    { id: 'grapes', cat: 'food', emoji: '🍇', name: '포도', items: grapes },
    { id: 'donut', cat: 'food', emoji: '🍩', name: '도넛', items: donut },

    { id: 'car', cat: 'vehicle', emoji: '🚗', name: '자동차', items: car },
    { id: 'rocket', cat: 'vehicle', emoji: '🚀', name: '로켓', items: rocket },
    { id: 'house', cat: 'vehicle', emoji: '🏠', name: '집', items: house },
    { id: 'boat', cat: 'vehicle', emoji: '⛵', name: '배', items: boat },
    { id: 'train', cat: 'vehicle', emoji: '🚂', name: '기차', items: train },
    { id: 'balloon', cat: 'vehicle', emoji: '🎈', name: '풍선', items: balloon },
    { id: 'airplane', cat: 'vehicle', emoji: '✈️', name: '비행기', items: airplane },

    { id: 'flower', cat: 'nature', emoji: '🌸', name: '꽃', items: flower },
    { id: 'tree', cat: 'nature', emoji: '🌳', name: '나무', items: tree },
    { id: 'sun', cat: 'nature', emoji: '☀️', name: '해', items: sun },
    { id: 'rainbow', cat: 'nature', emoji: '🌈', name: '무지개', items: rainbow },
    { id: 'snowman', cat: 'nature', emoji: '⛄', name: '눈사람', items: snowman },
    { id: 'cloud', cat: 'nature', emoji: '☁️', name: '구름', items: cloud },
    { id: 'star', cat: 'nature', emoji: '⭐', name: '별', items: star },
  ];

  function byId(id) { return PICTURES.find(p => p.id === id) || null; }

  // 밑그림을 SVG 마크업으로 (홈 썸네일용)
  function svg(pic, opts) {
    opts = opts || {};
    const stroke = opts.stroke || '#3a3a44';
    const sw = opts.sw || 2.4;
    let body = '';
    for (const it of pic.items) {
      const d = typeof it === 'string' ? it : it.d;
      const f = (typeof it === 'object' && it.f) ? stroke : 'none';
      body += `<path d="${d}" fill="${f}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
    }
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  }

  return { PICTURES, CATS, byId, svg, VB: 100 };
})();
