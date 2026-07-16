/* 산수 데이터 — 숫자 이름·세기 물건·문제 레벨·패턴 이어가기
 * 숫자 이름은 한자어(일이삼…)와 순우리말(하나둘셋…, 10까지)을 함께 쓴다.
 */
window.MathData = (() => {
  const UNITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const NATIVE = ['', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];

  /* ─────────── 패턴 이어가기 ───────────
   * 계약(validate-data.js가 검사):
   *  - forms[].unit: 'A'로 시작하고 글자가 순서대로 등장하는 반복 단위(길이 2~4, 종류 2가지 이상)
   *  - forms[].shown: 기차에 보여줄 칸 수(❓ 앞까지, 폰 화면에 맞게 최대 6칸)
   *  - 소재 묶음은 4개 이상, 묶음마다 이모지 4개 이상(서로 중복 없음)
   *  - makePattern()은 보기 3개가 서로 다르고 그중 정답이 정확히 하나가 되게 만든다
   */
  const PATTERN_SETS = [
    { id: 'fruit', items: [
      { e: '🍎', name: '사과' }, { e: '🍌', name: '바나나' }, { e: '🍇', name: '포도' },
      { e: '🍓', name: '딸기' }, { e: '🍊', name: '귤' }, { e: '🍉', name: '수박' },
    ] },
    { id: 'animal', items: [
      { e: '🐶', name: '강아지' }, { e: '🐱', name: '고양이' }, { e: '🐰', name: '토끼' },
      { e: '🐸', name: '개구리' }, { e: '🐥', name: '병아리' }, { e: '🐼', name: '판다' },
    ] },
    { id: 'shape', items: [
      { e: '⭐', name: '별' }, { e: '❤️', name: '하트' }, { e: '🔺', name: '세모' },
      { e: '🟦', name: '네모' }, { e: '🌙', name: '달' }, { e: '⚡', name: '번개' },
    ] },
    { id: 'circle', items: [
      { e: '🔴', name: '빨강' }, { e: '🔵', name: '파랑' }, { e: '🟡', name: '노랑' },
      { e: '🟢', name: '초록' }, { e: '🟣', name: '보라' }, { e: '🟠', name: '주황' },
    ] },
  ];
  const PATTERN_LEVELS = [
    { id: 1, name: '1단계', desc: '둘이 번갈아 (🍎🍌🍎🍌…)', emoji: '🚂',
      forms: [{ unit: 'AB', shown: [4, 5] }] },
    { id: 2, name: '2단계', desc: '셋이 함께 (🍎🍌🍇·🍎🍎🍌)', emoji: '🚃',
      forms: [{ unit: 'ABC', shown: [6] }, { unit: 'AAB', shown: [6] }] },
    { id: 3, name: '3단계', desc: '둘씩 짝꿍 (🍎🍎🍌🍌·🍎🍌🍌🍎)', emoji: '🚄',
      forms: [{ unit: 'AABB', shown: [6] }, { unit: 'ABBA', shown: [6] }] },
  ];
  // 패턴 문제 하나를 랜덤 생성 — { unit, shown:[{e,name}…], answer:{e,name}, choices:[{e,name}×3] }
  function makePattern(level, rand) {
    const rnd = rand || (n => Math.floor(Math.random() * n));
    const form = level.forms[rnd(level.forms.length)];
    const unit = form.unit;
    const count = form.shown[rnd(form.shown.length)];
    const set = PATTERN_SETS[rnd(PATTERN_SETS.length)];
    const letters = [...new Set(unit)]; // 등장 순서대로 A, B, (C)
    const pool = set.items.slice();
    for (let i = pool.length - 1; i > 0; i--) { // 소재 섞기
      const j = rnd(i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const map = {};
    letters.forEach((ch, i) => { map[ch] = pool[i]; });
    const shown = [];
    for (let i = 0; i < count; i++) shown.push(map[unit[i % unit.length]]);
    const answer = map[unit[count % unit.length]];
    // 오답 보기: 패턴에 나온 다른 소재 먼저, 모자라면 패턴에 없는 소재로 (같은 이모지 중복 금지)
    const wrongs = letters.map(ch => map[ch]).filter(it => it.e !== answer.e);
    for (let i = letters.length; wrongs.length < 2; i++) wrongs.push(pool[i]);
    const choices = [answer, wrongs[0], wrongs[1]];
    for (let i = choices.length - 1; i > 0; i--) { // 보기 순서 섞기
      const j = rnd(i + 1);
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return { unit, shown, answer, choices };
  }

  // 1~100 한자어 읽기: 칠, 십칠, 사십칠, 백
  function numName(n) {
    if (n === 100) return '백';
    const t = Math.floor(n / 10), u = n % 10;
    return (t >= 2 ? UNITS[t] : '') + (t >= 1 ? '십' : '') + UNITS[u];
  }
  // 따라쓰기 안내말: "칠! 일곱!" (10 이하는 순우리말도 함께)
  function traceSay(n) {
    return numName(n) + (n <= 10 ? '! ' + NATIVE[n] : '');
  }

  return {
    numName, traceSay,
    NATIVE,
    // 세기 그림에 쓰는 물건 (문제마다 랜덤)
    OBJECTS: ['🍎', '🍓', '🐤', '⭐', '🎈', '🍪', '🐟', '🌸', '🚗', '🧸'],
    praises: ['정답! 참 잘했어요!', '딩동댕! 맞았어요!', '우와, 대단해요!', '정답이에요! 멋져요!'],
    // 숫자 따라쓰기 묶음: 1~10, 11~20, … 91~100
    traceGroups: Array.from({ length: 10 }, (_, i) => ({
      id: 'g' + (i + 1),
      from: i * 10 + 1,
      to: i * 10 + 10,
    })),
    // 문제 레벨 — add: a+b ≤ max, sub: a−b (a ≤ max, 답 ≥ 1)
    LEVELS: [
      { id: 1, name: '1단계', desc: '5까지', emoji: '🌱', max: 5 },
      { id: 2, name: '2단계', desc: '10까지', emoji: '🌟', max: 10 },
      { id: 3, name: '3단계', desc: '20까지', emoji: '🔥', max: 20 },
    ],
    // 수 세기 맞춤 단계 — 물건 1~max개를 보고 개수를 고른다
    COUNT_LEVELS: [
      { id: 1, name: '쉬움', desc: '1부터 5까지', emoji: '🐣', max: 5 },
      { id: 2, name: '보통', desc: '1부터 10까지', emoji: '🐥', max: 10 },
    ],
    // 숫자표 빈칸 채우기 단계 — from~to 표에서 blanks개가 비어 있다 (칸 수는 10의 배수: 한 줄 10칸)
    CHART_LEVELS: [
      { id: 1, name: '1부터 30', desc: '빈칸 4개', emoji: '🐛', from: 1, to: 30, blanks: 4 },
      { id: 2, name: '1부터 50', desc: '빈칸 6개', emoji: '🦋', from: 1, to: 50, blanks: 6 },
      { id: 3, name: '51부터 100', desc: '빈칸 6개', emoji: '🦖', from: 51, to: 100, blanks: 6 },
    ],
    // 패턴 이어가기 — 단계·소재·생성기
    PATTERN_LEVELS, PATTERN_SETS, makePattern,
    ROUND: 5, // 한 판 문제 수
  };
})();
