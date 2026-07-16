/* 산수 데이터 — 숫자 이름·세기 물건·문제 레벨
 * 숫자 이름은 한자어(일이삼…)와 순우리말(하나둘셋…, 10까지)을 함께 쓴다.
 */
window.MathData = (() => {
  const UNITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const NATIVE = ['', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];

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
    ROUND: 5, // 한 판 문제 수
  };
})();
