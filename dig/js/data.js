/* 발굴 놀이터 데이터 — 어떤 그림을 어느 단계에 쓰고, 보기를 무엇으로 줄지만 담는다.
 *
 * ★ 그림은 여기서 그리지 않는다. 색칠공부의 밑그림(`coloring/js/pictures.js`)을
 *   그대로 불러 쓴다(window.Pictures). 여기 있는 것은 그 그림의 **id** 뿐이다.
 *   그래서 그림을 고치면 색칠공부와 발굴 놀이터가 함께 좋아진다.
 *
 * 판 30개(단계별 10):
 *   단계1 보기 2개 · 단계2 보기 3개 · 단계3 보기 4개
 *   단계가 올라갈수록 오답(헷갈리는 그림)을 같은 무리에서 고른다.
 *     단계1: 아주 다른 것끼리(강아지 ↔ 자동차)
 *     단계2: 조금 비슷한 것 섞기
 *     단계3: 같은 무리끼리(곰 ↔ 강아지·고양이·토끼)
 *
 * ⚠️ 판 id 는 아이 진행도(done 키)로 저장된다 — 함부로 바꾸지 않는다.
 * ⚠️ 보기 순서도 고정이다(랜덤 아님). e2e·validate 가 같은 화면을 보게 하기 위해서다.
 *    정답 자리는 판마다 다르게 흩어 두었다.
 */
window.DigData = (() => {

  /* ─────────── 단계 ─────────── */
  const LEVELS = [
    { id: 1, name: '살살 파기',   desc: '보기 2개 중에 골라요', cls: 'c-l1', choices: 2 },
    { id: 2, name: '조금 더 파기', desc: '보기 3개 중에 골라요', cls: 'c-l2', choices: 3 },
    { id: 3, name: '꼼꼼히 파기',  desc: '보기 4개 중에 골라요', cls: 'c-l3', choices: 4 },
  ];

  /* ─────────── 별·보기 기준 ───────────
   * 적게 파고 맞힐수록 별이 많다. 많이 파도 별은 반드시 하나는 준다(무벌점).
   * REVEAL: 이만큼 파내면 보기가 저절로 올라온다. 그 전에도 🔍 로 미리 볼 수 있다. */
  const REVEAL = 0.25;   // 25%
  const CUT3 = 0.40;     // 40% 이하 → 별 3
  const CUT2 = 0.65;     // 65% 이하 → 별 2

  /** 파낸 비율(0~1)과 틀린 횟수로 별 개수를 정한다. 최소 1개. */
  function starsFor(ratio, misses) {
    let s = ratio <= CUT3 ? 3 : (ratio <= CUT2 ? 2 : 1);
    s -= (misses || 0);
    return Math.max(1, s);
  }

  /* ─────────── 판 30개 ───────────
   * pic: 흙 아래 숨은 그림(정답) · choices: 보기(정답 하나 + 오답들, 화면에 나오는 순서) */
  const R = (id, level, pic, choices) => ({ id, level, pic, choices });

  const ROUNDS = [
    /* ── 단계1 · 보기 2개 (아주 다른 것끼리) ── */
    R('d1-1',  1, 'dog',      ['dog', 'car']),
    R('d1-2',  1, 'apple',    ['airplane', 'apple']),
    R('d1-3',  1, 'sun',      ['sun', 'fish']),
    R('d1-4',  1, 'cat',      ['banana', 'cat']),
    R('d1-5',  1, 'star',     ['star', 'boat']),
    R('d1-6',  1, 'rabbit',   ['cake', 'rabbit']),
    R('d1-7',  1, 'car',      ['car', 'duck']),
    R('d1-8',  1, 'balloon',  ['bear', 'balloon']),
    R('d1-9',  1, 'tree',     ['tree', 'donut']),
    R('d1-10', 1, 'fish',     ['house', 'fish']),

    /* ── 단계2 · 보기 3개 (조금 비슷한 것 섞기) ── */
    R('d2-1',  2, 'lion',       ['rabbit', 'lion', 'rocket']),
    R('d2-2',  2, 'butterfly',  ['butterfly', 'grapes', 'train']),
    R('d2-3',  2, 'icecream',   ['cloud', 'cat', 'icecream']),
    R('d2-4',  2, 'watermelon', ['watermelon', 'snowman', 'dog']),
    R('d2-5',  2, 'train',      ['flower', 'train', 'strawberry']),
    R('d2-6',  2, 'duck',       ['donut', 'rainbow', 'duck']),
    R('d2-7',  2, 'house',      ['house', 'star', 'lion']),
    R('d2-8',  2, 'grapes',     ['boat', 'grapes', 'sun']),
    R('d2-9',  2, 'snowman',    ['apple', 'butterfly', 'snowman']),
    R('d2-10', 2, 'rocket',     ['rocket', 'watermelon', 'tree']),

    /* ── 단계3 · 보기 4개 (같은 무리끼리 — 끝까지 봐야 안다) ── */
    R('d3-1',  3, 'bear',       ['dog', 'bear', 'cat', 'rabbit']),
    R('d3-2',  3, 'strawberry', ['apple', 'watermelon', 'strawberry', 'grapes']),
    R('d3-3',  3, 'rainbow',    ['rainbow', 'cloud', 'sun', 'star']),
    R('d3-4',  3, 'airplane',   ['rocket', 'boat', 'car', 'airplane']),
    R('d3-5',  3, 'cake',       ['donut', 'cake', 'icecream', 'banana']),
    R('d3-6',  3, 'flower',     ['tree', 'star', 'flower', 'butterfly']),
    R('d3-7',  3, 'boat',       ['boat', 'house', 'train', 'airplane']),
    R('d3-8',  3, 'donut',      ['cake', 'apple', 'donut', 'icecream']),
    R('d3-9',  3, 'cloud',      ['rainbow', 'snowman', 'cloud', 'sun']),
    R('d3-10', 3, 'banana',     ['grapes', 'strawberry', 'banana', 'fish']),
  ];

  const praises = [
    '우아! 찾았다!',
    '눈이 참 밝구나!',
    '조금만 파고도 알았네!',
    '멋진 발굴이야!',
    '척척박사님이네!',
    '아주 잘했어요!',
  ];

  function levelDef(id) { return LEVELS.find(l => l.id === id) || LEVELS[0]; }
  function roundsOf(level) { return ROUNDS.filter(r => r.level === level); }
  function roundById(id) { return ROUNDS.find(r => r.id === id) || null; }

  return {
    LEVELS, ROUNDS, praises,
    REVEAL, CUT3, CUT2, starsFor,
    levelDef, roundsOf, roundById,
  };
})();
