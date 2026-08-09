/* 알파벳 획순 데이터 — 대문자 26자 + 소문자 26자
 * strokes: 100×100 정규화 좌표의 획 목록(각 획은 꺾은선 점 배열). 유아용 근사 획순.
 *   - 획순은 아이가 배우는 순서: 위→아래, 왼쪽→오른쪽. 세로 기둥이 먼저다.
 *   - 곡선은 아래 arc()·spline() 으로 코드에서 만든다. 손으로 꼭짓점만 찍으면
 *     따라쓰기 채점(js/trace.js 계열, STEP=3·TOL=15)이 곡선을 못 따라간다.
 *   - 한 획 안에서 급하게 꺾이면 채점기가 꺾임 너머 점을 먼저 잡아 획을 건너뛴다.
 *     그래서 A·M·W·K·Y 처럼 뾰족한 데는 획을 나눴다.
 * 자리 규격 (52자가 격자에서 고르게 보이도록 통일)
 *   대문자: 위 12 ~ 밑줄 88
 *   소문자: x-높이 40 ~ 밑줄 88, 위로 뻗는 획(b d f h k l t)은 12까지, 아래로 내려가는 획(g j p q y)은 98까지
 * name  : 글자 이름을 한글로 (A → 에이)
 * sound : 파닉스 소리를 한글로 (A → 애)
 * words : 그 글자로 시작하는 낱말 { w: 영어, k: 한국어 뜻, e: 이모지 }
 *         — js/dict/*.js 에 이미 있는 낱말(en 값)을 우선 골랐다. 대문자·소문자는 같은 낱말을 쓴다.
 */
window.AlphabetData = (() => {
  // 좌표는 소수점 한 자리까지, 0~100 밖으로는 못 나간다
  const R = v => Math.min(100, Math.max(0, Math.round(v * 10) / 10));

  /* 타원 호 생성 — 곡선 글자(O C S G Q U J a b c d e g o p q u …)의 뼈대
   * 각도는 도(°). y가 아래로 자라므로 0=오른쪽, 90=아래, 180=왼쪽, 270=위 이고
   * 각이 커지는 쪽이 화면에서 시계 방향이다.
   * n(마디 수)을 생략하면 호 길이에 맞춰 12~26점이 되도록 잡는다 —
   * 일본어 획순(획당 평균 50점)과 같은 결로, 꼭짓점만 찍어서는 채점이 안 되기 때문이다.
   */
  function arc(cx, cy, rx, ry, a0, a1, n) {
    const rad = Math.PI / 180;
    if (!n) {
      const len = Math.abs(a1 - a0) * rad * (rx + ry) / 2; // 호 길이 어림값
      n = Math.min(25, Math.max(11, Math.round(len / 6)));
    }
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = (a0 + (a1 - a0) * i / n) * rad;
      pts.push([R(cx + rx * Math.cos(a)), R(cy + ry * Math.sin(a))]);
    }
    return pts;
  }

  /* 조절점을 지나는 부드러운 곡선 (Catmull-Rom) — S·s 처럼 호 하나로 안 되는 글자용 */
  function spline(ctrl, seg) {
    seg = seg || 6;
    const p = [ctrl[0]].concat(ctrl, [ctrl[ctrl.length - 1]]);
    const out = [];
    for (let i = 1; i < p.length - 2; i++) {
      const a = p[i - 1], b = p[i], c = p[i + 1], d = p[i + 2];
      for (let j = 0; j < seg; j++) {
        const t = j / seg, t2 = t * t, t3 = t2 * t;
        const f = (q0, q1, q2, q3) =>
          0.5 * (2 * q1 + (-q0 + q2) * t + (2 * q0 - 5 * q1 + 4 * q2 - q3) * t2 + (-q0 + 3 * q1 - 3 * q2 + q3) * t3);
        out.push([R(f(a[0], b[0], c[0], d[0])), R(f(a[1], b[1], c[1], d[1]))]);
      }
    }
    const last = p[p.length - 2];
    out.push([R(last[0]), R(last[1])]);
    return out;
  }

  /* 여러 조각(직선+호)을 한 획으로 잇는다 — 겹치는 이음점은 하나만 남긴다 */
  function join(...parts) {
    const out = [];
    parts.forEach(part => part.forEach(pt => {
      const last = out[out.length - 1];
      if (!last || Math.hypot(last[0] - pt[0], last[1] - pt[1]) > 0.4) out.push([pt[0], pt[1]]);
    }));
    return out;
  }

  // ───────────────────────── 대문자 26자 ─────────────────────────
  const UPPER = [
    { ch: 'A', name: '에이', sound: '애',
      // 왼쪽 사선 → 오른쪽 사선 → 가로줄. 꼭대기가 뾰족해서 한 획으로 묶지 않는다
      strokes: [[[50, 12], [22, 88]], [[50, 12], [78, 88]], [[31, 64], [69, 64]]],
      words: [{ w: 'apple', k: '사과', e: '🍎' }, { w: 'ant', k: '개미', e: '🐜' }, { w: 'airplane', k: '비행기', e: '✈️' }] },

    { ch: 'B', name: '비', sound: '브',
      // 기둥 → 윗배 → 아랫배
      strokes: [[[30, 12], [30, 88]], arc(30, 31, 32, 19, -90, 90), arc(30, 69, 36, 19, -90, 90)],
      words: [{ w: 'bear', k: '곰', e: '🐻' }, { w: 'ball', k: '공', e: '⚽' }, { w: 'banana', k: '바나나', e: '🍌' }] },

    { ch: 'C', name: '씨', sound: '크',
      strokes: [arc(52, 50, 30, 38, -55, -305)],
      words: [{ w: 'cat', k: '고양이', e: '🐱' }, { w: 'car', k: '자동차', e: '🚗' }, { w: 'cake', k: '케이크', e: '🎂' }] },

    { ch: 'D', name: '디', sound: '드',
      strokes: [[[30, 12], [30, 88]], arc(30, 50, 40, 38, -90, 90)],
      words: [{ w: 'dog', k: '강아지', e: '🐶' }, { w: 'duck', k: '오리', e: '🦆' }, { w: 'donut', k: '도넛', e: '🍩' }] },

    { ch: 'E', name: '이', sound: '에',
      // 세로 → 위 → 가운데 → 아래
      strokes: [[[30, 12], [30, 88]], [[30, 12], [74, 12]], [[30, 50], [68, 50]], [[30, 88], [74, 88]]],
      words: [{ w: 'elephant', k: '코끼리', e: '🐘' }, { w: 'egg', k: '계란', e: '🥚' }, { w: 'eye', k: '눈', e: '👁️' }] },

    { ch: 'F', name: '에프', sound: '프',
      strokes: [[[30, 12], [30, 88]], [[30, 12], [74, 12]], [[30, 50], [66, 50]]],
      words: [{ w: 'fox', k: '여우', e: '🦊' }, { w: 'fish', k: '물고기', e: '🐟' }, { w: 'flower', k: '꽃', e: '💐' }] },

    { ch: 'G', name: '지', sound: '그',
      // C 를 그린 뒤 오른쪽에서 올라와 안으로 꺾는다
      strokes: [arc(52, 50, 30, 38, -55, -315), [[73, 77], [73, 54], [55, 54]]],
      words: [{ w: 'giraffe', k: '기린', e: '🦒' }, { w: 'grape', k: '포도', e: '🍇' }, { w: 'gift', k: '선물', e: '🎁' }] },

    { ch: 'H', name: '에이치', sound: '흐',
      strokes: [[[28, 12], [28, 88]], [[72, 12], [72, 88]], [[28, 50], [72, 50]]],
      words: [{ w: 'hat', k: '모자', e: '🎩' }, { w: 'horse', k: '말', e: '🐴' }, { w: 'house', k: '집', e: '🏠' }] },

    { ch: 'I', name: '아이', sound: '이',
      // 위 가로 → 세로 → 아래 가로 (세로 한 줄만이면 폭이 없어 격자에서 안 보인다)
      strokes: [[[32, 12], [68, 12]], [[50, 12], [50, 88]], [[32, 88], [68, 88]]],
      words: [{ w: 'ice cream', k: '아이스크림', e: '🍦' }, { w: 'ice', k: '얼음', e: '🧊' }, { w: 'island', k: '섬', e: '🏝️' }] },

    { ch: 'J', name: '제이', sound: '즈',
      strokes: [join([[62, 12], [62, 62]], arc(46, 62, 16, 26, 0, 145))],
      words: [{ w: 'juice', k: '주스', e: '🧃' }, { w: 'jelly', k: '젤리', e: '🍬' }, { w: 'jump', k: '점프', e: '🤸' }] },

    { ch: 'K', name: '케이', sound: '크',
      strokes: [[[30, 12], [30, 88]], [[72, 12], [32, 50]], [[32, 50], [72, 88]]],
      words: [{ w: 'key', k: '열쇠', e: '🔑' }, { w: 'kiwi', k: '키위', e: '🥝' }, { w: 'koala', k: '코알라', e: '🐨' }] },

    { ch: 'L', name: '엘', sound: '르',
      strokes: [[[32, 12], [32, 88], [74, 88]]],
      words: [{ w: 'lion', k: '사자', e: '🦁' }, { w: 'lemon', k: '레몬', e: '🍋' }, { w: 'leaf', k: '나뭇잎', e: '🍃' }] },

    { ch: 'M', name: '엠', sound: '므',
      strokes: [[[26, 12], [26, 88]], [[26, 12], [50, 58], [74, 12]], [[74, 12], [74, 88]]],
      words: [{ w: 'monkey', k: '원숭이', e: '🐵' }, { w: 'moon', k: '달', e: '🌙' }, { w: 'milk', k: '우유', e: '🥛' }] },

    { ch: 'N', name: '엔', sound: '느',
      strokes: [[[30, 12], [30, 88]], [[30, 12], [70, 88]], [[70, 12], [70, 88]]],
      words: [{ w: 'nose', k: '코', e: '👃' }, { w: 'notebook', k: '공책', e: '📓' }, { w: 'noodles', k: '국수', e: '🍜' }] },

    { ch: 'O', name: '오', sound: '아',
      // 12시에서 반시계 방향 한 바퀴
      strokes: [arc(50, 50, 28, 38, -90, -450)],
      words: [{ w: 'orange', k: '오렌지', e: '🍊' }, { w: 'owl', k: '부엉이', e: '🦉' }, { w: 'octopus', k: '문어', e: '🐙' }] },

    { ch: 'P', name: '피', sound: '프',
      strokes: [[[30, 12], [30, 88]], arc(30, 32, 34, 20, -90, 90)],
      words: [{ w: 'pizza', k: '피자', e: '🍕' }, { w: 'panda', k: '판다', e: '🐼' }, { w: 'pencil', k: '연필', e: '✏️' }] },

    { ch: 'Q', name: '큐', sound: '크',
      strokes: [arc(50, 50, 28, 36, -90, -450), [[58, 66], [80, 92]]],
      words: [{ w: 'queen', k: '여왕', e: '🫅' }, { w: 'quiet', k: '조용해', e: '🤫' }] },

    { ch: 'R', name: '알', sound: '르',
      strokes: [[[30, 12], [30, 88]], arc(30, 32, 34, 20, -90, 90), [[30, 52], [72, 88]]],
      words: [{ w: 'rabbit', k: '토끼', e: '🐰' }, { w: 'rainbow', k: '무지개', e: '🌈' }, { w: 'robot', k: '로봇', e: '🤖' }] },

    { ch: 'S', name: '에스', sound: '스',
      // 호 하나로 안 되는 겹곡선이라 조절점을 지나는 부드러운 곡선으로 만든다
      strokes: [spline([[70, 25], [60, 13], [44, 13], [34, 24], [38, 38], [52, 47], [64, 56], [67, 70], [57, 85], [40, 87], [28, 78]])],
      words: [{ w: 'sun', k: '해', e: '☀️' }, { w: 'star', k: '별', e: '⭐' }, { w: 'snake', k: '뱀', e: '🐍' }] },

    { ch: 'T', name: '티', sound: '트',
      strokes: [[[26, 12], [74, 12]], [[50, 12], [50, 88]]],
      words: [{ w: 'tiger', k: '호랑이', e: '🐯' }, { w: 'tomato', k: '토마토', e: '🍅' }, { w: 'train', k: '기차', e: '🚂' }] },

    { ch: 'U', name: '유', sound: '어',
      strokes: [join([[28, 12], [28, 58]], arc(50, 58, 22, 30, 180, 0), [[72, 58], [72, 12]])],
      words: [{ w: 'umbrella', k: '우산', e: '☂️' }, { w: 'unicorn', k: '유니콘', e: '🦄' }, { w: 'uncle', k: '삼촌', e: '👨‍🦱' }] },

    { ch: 'V', name: '브이', sound: '브',
      strokes: [[[24, 12], [50, 88], [76, 12]]],
      words: [{ w: 'violin', k: '바이올린', e: '🎻' }, { w: 'van', k: '승합차', e: '🚐' }, { w: 'vest', k: '조끼', e: '🦺' }] },

    { ch: 'W', name: '더블유', sound: '우',
      // V 두 개로 나눈다 — 한 획이면 골짜기에서 채점이 앞질러 간다
      strokes: [[[20, 12], [35, 88], [50, 32]], [[50, 32], [65, 88], [80, 12]]],
      words: [{ w: 'watermelon', k: '수박', e: '🍉' }, { w: 'whale', k: '고래', e: '🐳' }, { w: 'water', k: '물', e: '💧' }] },

    { ch: 'X', name: '엑스', sound: '크스',
      strokes: [[[26, 12], [74, 88]], [[74, 12], [26, 88]]],
      words: [{ w: 'xylophone', k: '실로폰', e: '🎵' }, { w: 'x-ray', k: '엑스레이', e: '🩻' }] },

    { ch: 'Y', name: '와이', sound: '이',
      strokes: [[[26, 12], [50, 52]], [[74, 12], [50, 52]], [[50, 52], [50, 88]]],
      words: [{ w: 'yellow', k: '노란색', e: '🟡' }, { w: 'yoyo', k: '요요', e: '🪀' }, { w: 'yacht', k: '요트', e: '⛵' }] },

    { ch: 'Z', name: '지', sound: '즈',
      strokes: [[[26, 12], [74, 12], [26, 88], [74, 88]]],
      words: [{ w: 'zebra', k: '얼룩말', e: '🦓' }, { w: 'zoo', k: '동물원', e: '🦁' }, { w: 'zero', k: '영', e: '🅾️' }] },
  ];

  // ───────────────────────── 소문자 26자 ─────────────────────────
  // 대문자의 축소판이 아니다. b·d 와 p·q 는 서로 거울상이라
  // 획순을 일부러 다르게 뒀다 — b·p 는 기둥 먼저, d·q 는 동그라미 먼저.
  const LOWER = [
    { ch: 'a', name: '에이', sound: '애',
      strokes: [arc(46, 64, 18, 24, -60, -420), [[64, 40], [64, 88]]],
      words: [{ w: 'apple', k: '사과', e: '🍎' }, { w: 'ant', k: '개미', e: '🐜' }, { w: 'airplane', k: '비행기', e: '✈️' }] },

    { ch: 'b', name: '비', sound: '브',
      strokes: [[[30, 12], [30, 88]], arc(30, 64, 34, 24, -90, 90)],
      words: [{ w: 'bear', k: '곰', e: '🐻' }, { w: 'ball', k: '공', e: '⚽' }, { w: 'banana', k: '바나나', e: '🍌' }] },

    { ch: 'c', name: '씨', sound: '크',
      strokes: [arc(50, 64, 20, 24, -55, -305)],
      words: [{ w: 'cat', k: '고양이', e: '🐱' }, { w: 'car', k: '자동차', e: '🚗' }, { w: 'cake', k: '케이크', e: '🎂' }] },

    { ch: 'd', name: '디', sound: '드',
      strokes: [arc(46, 64, 18, 24, -60, -420), [[64, 12], [64, 88]]],
      words: [{ w: 'dog', k: '강아지', e: '🐶' }, { w: 'duck', k: '오리', e: '🦆' }, { w: 'donut', k: '도넛', e: '🍩' }] },

    { ch: 'e', name: '이', sound: '에',
      // 가운데 가로줄을 먼저 긋고 그대로 왼쪽으로 감아 돈다
      strokes: [join([[31, 66], [66, 66]], arc(48, 64, 18, 24, 5, -310))],
      words: [{ w: 'elephant', k: '코끼리', e: '🐘' }, { w: 'egg', k: '계란', e: '🥚' }, { w: 'eye', k: '눈', e: '👁️' }] },

    { ch: 'f', name: '에프', sound: '프',
      strokes: [join(arc(46, 26, 16, 14, 0, -180), [[30, 26], [30, 88]]), [[16, 44], [46, 44]]],
      words: [{ w: 'fox', k: '여우', e: '🦊' }, { w: 'fish', k: '물고기', e: '🐟' }, { w: 'flower', k: '꽃', e: '💐' }] },

    { ch: 'g', name: '지', sound: '그',
      strokes: [arc(46, 64, 18, 24, -60, -420), join([[64, 40], [64, 86]], arc(50, 86, 14, 12, 0, 145))],
      words: [{ w: 'giraffe', k: '기린', e: '🦒' }, { w: 'grape', k: '포도', e: '🍇' }, { w: 'gift', k: '선물', e: '🎁' }] },

    { ch: 'h', name: '에이치', sound: '흐',
      strokes: [[[30, 12], [30, 88]], join(arc(48, 56, 18, 16, 180, 360), [[66, 56], [66, 88]])],
      words: [{ w: 'hat', k: '모자', e: '🎩' }, { w: 'horse', k: '말', e: '🐴' }, { w: 'house', k: '집', e: '🏠' }] },

    { ch: 'i', name: '아이', sound: '이',
      // 점은 아주 짧은 선분으로 — 점 하나짜리 획은 계약(점 2개 이상)에 걸린다
      strokes: [[[48, 44], [48, 88]], [[48, 25], [48, 31]]],
      words: [{ w: 'ice cream', k: '아이스크림', e: '🍦' }, { w: 'ice', k: '얼음', e: '🧊' }, { w: 'island', k: '섬', e: '🏝️' }] },

    { ch: 'j', name: '제이', sound: '즈',
      strokes: [join([[52, 44], [52, 86]], arc(38, 86, 14, 12, 0, 145)), [[52, 25], [52, 31]]],
      words: [{ w: 'juice', k: '주스', e: '🧃' }, { w: 'jelly', k: '젤리', e: '🍬' }, { w: 'jump', k: '점프', e: '🤸' }] },

    { ch: 'k', name: '케이', sound: '크',
      strokes: [[[30, 12], [30, 88]], [[62, 52], [32, 70]], [[32, 70], [64, 88]]],
      words: [{ w: 'key', k: '열쇠', e: '🔑' }, { w: 'kiwi', k: '키위', e: '🥝' }, { w: 'koala', k: '코알라', e: '🐨' }] },

    { ch: 'l', name: '엘', sound: '르',
      strokes: [[[48, 12], [48, 88]]],
      words: [{ w: 'lion', k: '사자', e: '🦁' }, { w: 'lemon', k: '레몬', e: '🍋' }, { w: 'leaf', k: '나뭇잎', e: '🍃' }] },

    { ch: 'm', name: '엠', sound: '므',
      strokes: [[[26, 40], [26, 88]],
                join(arc(38, 56, 12, 16, 180, 360), [[50, 56], [50, 88]]),
                join(arc(62, 56, 12, 16, 180, 360), [[74, 56], [74, 88]])],
      words: [{ w: 'monkey', k: '원숭이', e: '🐵' }, { w: 'moon', k: '달', e: '🌙' }, { w: 'milk', k: '우유', e: '🥛' }] },

    { ch: 'n', name: '엔', sound: '느',
      strokes: [[[30, 40], [30, 88]], join(arc(48, 56, 18, 16, 180, 360), [[66, 56], [66, 88]])],
      words: [{ w: 'nose', k: '코', e: '👃' }, { w: 'notebook', k: '공책', e: '📓' }, { w: 'noodles', k: '국수', e: '🍜' }] },

    { ch: 'o', name: '오', sound: '아',
      strokes: [arc(48, 64, 20, 24, -90, -450)],
      words: [{ w: 'orange', k: '오렌지', e: '🍊' }, { w: 'owl', k: '부엉이', e: '🦉' }, { w: 'octopus', k: '문어', e: '🐙' }] },

    { ch: 'p', name: '피', sound: '프',
      strokes: [[[30, 40], [30, 96]], arc(30, 64, 34, 24, -90, 90)],
      words: [{ w: 'pizza', k: '피자', e: '🍕' }, { w: 'panda', k: '판다', e: '🐼' }, { w: 'pencil', k: '연필', e: '✏️' }] },

    { ch: 'q', name: '큐', sound: '크',
      strokes: [arc(46, 64, 18, 24, -60, -420), [[64, 40], [64, 96]]],
      words: [{ w: 'queen', k: '여왕', e: '🫅' }, { w: 'quiet', k: '조용해', e: '🤫' }] },

    { ch: 'r', name: '알', sound: '르',
      strokes: [[[32, 40], [32, 88]], arc(46, 54, 14, 14, 180, 340)],
      words: [{ w: 'rabbit', k: '토끼', e: '🐰' }, { w: 'rainbow', k: '무지개', e: '🌈' }, { w: 'robot', k: '로봇', e: '🤖' }] },

    { ch: 's', name: '에스', sound: '스',
      strokes: [spline([[65, 48], [57, 41], [45, 41], [38, 48], [41, 56], [52, 62], [60, 68], [63, 77], [55, 86], [42, 87], [33, 82]])],
      words: [{ w: 'sun', k: '해', e: '☀️' }, { w: 'star', k: '별', e: '⭐' }, { w: 'snake', k: '뱀', e: '🐍' }] },

    { ch: 't', name: '티', sound: '트',
      strokes: [join([[50, 20], [50, 80]], arc(60, 80, 10, 8, 180, 45)), [[32, 40], [68, 40]]],
      words: [{ w: 'tiger', k: '호랑이', e: '🐯' }, { w: 'tomato', k: '토마토', e: '🍅' }, { w: 'train', k: '기차', e: '🚂' }] },

    { ch: 'u', name: '유', sound: '어',
      strokes: [join([[30, 40], [30, 72]], arc(48, 72, 18, 16, 180, 0)), [[66, 40], [66, 88]]],
      words: [{ w: 'umbrella', k: '우산', e: '☂️' }, { w: 'unicorn', k: '유니콘', e: '🦄' }, { w: 'uncle', k: '삼촌', e: '👨‍🦱' }] },

    { ch: 'v', name: '브이', sound: '브',
      strokes: [[[30, 40], [50, 88], [70, 40]]],
      words: [{ w: 'violin', k: '바이올린', e: '🎻' }, { w: 'van', k: '승합차', e: '🚐' }, { w: 'vest', k: '조끼', e: '🦺' }] },

    { ch: 'w', name: '더블유', sound: '우',
      strokes: [[[24, 40], [36, 88], [48, 50]], [[48, 50], [60, 88], [72, 40]]],
      words: [{ w: 'watermelon', k: '수박', e: '🍉' }, { w: 'whale', k: '고래', e: '🐳' }, { w: 'water', k: '물', e: '💧' }] },

    { ch: 'x', name: '엑스', sound: '크스',
      strokes: [[[30, 40], [68, 88]], [[68, 40], [30, 88]]],
      words: [{ w: 'xylophone', k: '실로폰', e: '🎵' }, { w: 'x-ray', k: '엑스레이', e: '🩻' }] },

    { ch: 'y', name: '와이', sound: '이',
      // 짧은 왼쪽 획 + 아래로 뻗는 긴 오른쪽 획
      strokes: [[[30, 40], [53, 78]], [[72, 40], [44, 96]]],
      words: [{ w: 'yellow', k: '노란색', e: '🟡' }, { w: 'yoyo', k: '요요', e: '🪀' }, { w: 'yacht', k: '요트', e: '⛵' }] },

    { ch: 'z', name: '지', sound: '즈',
      strokes: [[[30, 40], [68, 40], [30, 88], [68, 88]]],
      words: [{ w: 'zebra', k: '얼룩말', e: '🦓' }, { w: 'zoo', k: '동물원', e: '🦁' }, { w: 'zero', k: '영', e: '🅾️' }] },
  ];

  const ALL = UPPER.concat(LOWER);
  const byCh = {};
  ALL.forEach(l => { byCh[l.ch] = l; });

  return {
    UPPER,
    LOWER,
    all: ALL,
    find(ch) { return byCh[ch]; },
    isUpper(ch) { return /^[A-Z]$/.test(ch); },
  };
})();
