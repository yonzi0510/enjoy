/* 색깔 실험실 데이터 — 물감 5종, 미션 30색 도감(기본 12색 + 확장 18색), 자유 실험 색 이름표
 * target 은 recipe 를 Mix.mixDrops 로 섞은 결과와 반드시 일치해야 한다 (tools/validate-data.js 가 검사).
 */
window.LabData = (() => {
  /* ─────────── 물감 방울 5종 ─────────── */
  const PAINTS = [
    { id: 'red',    name: '빨강', color: '#E8354D', ryb: [1, 0, 0] },
    { id: 'blue',   name: '파랑', color: '#2E6FD0', ryb: [0, 0, 1] },
    { id: 'yellow', name: '노랑', color: '#FFD400', ryb: [0, 1, 0] },
    { id: 'white',  name: '흰색', color: '#FFFFFF', kind: 'white' },
    { id: 'black',  name: '검정', color: '#3A3740', kind: 'black' },
  ];
  const paintOf = id => PAINTS.find(p => p.id === id);

  /* ─────────── 미션 30색 도감 ───────────
   * recipe: 물감 방울 순서, target: 그 레시피를 섞은 결과색(고정),
   * sayName: TTS 로 읽어 줄 이름 (갈색·회색·남색처럼 이미 '색'으로 끝나는 이름도 있다)
   * ⚠️ 앞 12색(기본 도감)의 id·순서는 바꾸지 않는다 — 아이 진행도(missions 키)가 id 로 저장된다. */
  const BASE_COUNT = 12; // 기본 도감 크기 — 앞 12색을 모두 모으면 펫 식사 보상
  const MISSIONS = [
    { id: 'orange',   name: '주황',   sayName: '주황색',   emoji: '🍊', recipe: ['red', 'yellow'],                   target: '#FF9F40' },
    { id: 'green',    name: '초록',   sayName: '초록색',   emoji: '🌲', recipe: ['blue', 'blue', 'yellow'],          target: '#67A588' },
    { id: 'purple',   name: '보라',   sayName: '보라색',   emoji: '🍇', recipe: ['red', 'blue', 'blue'],             target: '#846399' },
    { id: 'pink',     name: '분홍',   sayName: '분홍색',   emoji: '🌸', recipe: ['red', 'white', 'white'],           target: '#FFAAAA' },
    { id: 'sky',      name: '하늘',   sayName: '하늘색',   emoji: '☁️', recipe: ['blue', 'white', 'white'],          target: '#B8CADD' },
    { id: 'lgreen',   name: '연두',   sayName: '연두색',   emoji: '🌱', recipe: ['yellow', 'yellow', 'blue'],        target: '#AFDA55' },
    { id: 'brown',    name: '갈색',   sayName: '갈색',     emoji: '🐻', recipe: ['red', 'yellow', 'black'],          target: '#B9783A' },
    { id: 'gray',     name: '회색',   sayName: '회색',     emoji: '🐘', recipe: ['white', 'black'],                  target: '#969597' },
    { id: 'lavender', name: '연보라', sayName: '연보라색', emoji: '🔮', recipe: ['red', 'blue', 'white'],            target: '#C68FAE' },
    { id: 'peach',    name: '살구',   sayName: '살구색',   emoji: '🍑', recipe: ['red', 'yellow', 'white', 'white'], target: '#FFCF9F' },
    { id: 'navy',     name: '남색',   sayName: '남색',     emoji: '🌙', recipe: ['blue', 'black'],                   target: '#2B4564' },
    { id: 'mint',     name: '민트',   sayName: '민트색',   emoji: '🍬', recipe: ['blue', 'yellow', 'white'],         target: '#B1D6A2' },
    /* ── 확장 18색 — 쉬운 2방울부터 3~5방울 순서로 ── */
    { id: 'coral',     name: '산호',     sayName: '산호색',     emoji: '🪸', recipe: ['red', 'white'],                              target: '#FF8080' },
    { id: 'chick',     name: '병아리',   sayName: '병아리색',   emoji: '🐤', recipe: ['yellow', 'white'],                           target: '#FFFF80' },
    { id: 'cherry',    name: '체리',     sayName: '체리색',     emoji: '🍒', recipe: ['red', 'black'],                              target: '#961517' },
    { id: 'olive',     name: '올리브',   sayName: '올리브색',   emoji: '🫒', recipe: ['yellow', 'black'],                           target: '#969517' },
    { id: 'plum',      name: '자주',     sayName: '자주색',     emoji: '🍠', recipe: ['red', 'blue'],                               target: '#AA5886' },
    { id: 'sunflower', name: '해바라기', sayName: '해바라기색', emoji: '🌻', recipe: ['red', 'yellow', 'yellow'],                   target: '#FFC639' },
    { id: 'lgray',     name: '연회색',   sayName: '연회색',     emoji: '🐭', recipe: ['white', 'white', 'black'],                   target: '#B9B8B9' },
    { id: 'stone',     name: '돌멩이',   sayName: '돌멩이색',   emoji: '🪨', recipe: ['white', 'black', 'black'],                   target: '#737174' },
    { id: 'hotpink',   name: '진분홍',   sayName: '진분홍색',   emoji: '🌺', recipe: ['red', 'red', 'blue', 'white'],               target: '#D8728C' },
    { id: 'mustard',   name: '겨자',     sayName: '겨자색',     emoji: '🌭', recipe: ['red', 'yellow', 'yellow', 'black'],          target: '#CB9F36' },
    { id: 'chestnut',  name: '밤색',     sayName: '밤색',       emoji: '🌰', recipe: ['red', 'yellow', 'black', 'black'],           target: '#966537' },
    { id: 'dgreen',    name: '진초록',   sayName: '진초록색',   emoji: '🥦', recipe: ['yellow', 'blue', 'black', 'black'],          target: '#5B7650' },
    { id: 'eggplant',  name: '가지',     sayName: '가지색',     emoji: '🍆', recipe: ['red', 'blue', 'blue', 'black'],              target: '#6E557E' },
    { id: 'cream',     name: '크림',     sayName: '크림색',     emoji: '🍦', recipe: ['yellow', 'white', 'white', 'white'],         target: '#FFFFBF' },
    { id: 'teal',      name: '청록',     sayName: '청록색',     emoji: '🦚', recipe: ['yellow', 'blue', 'blue', 'blue', 'blue'],    target: '#4E8B93' },
    { id: 'khaki',     name: '카키',     sayName: '카키색',     emoji: '🥑', recipe: ['yellow', 'white', 'black', 'black', 'black'], target: '#817F4F' },
    { id: 'melon',     name: '멜론',     sayName: '멜론색',     emoji: '🍈', recipe: ['yellow', 'yellow', 'blue', 'white', 'white'], target: '#CFE999' },
    { id: 'peachy',    name: '복숭아',   sayName: '복숭아색',   emoji: '🧡', recipe: ['red', 'red', 'yellow', 'yellow', 'white'],   target: '#FFB366' },
  ];

  /* 미션 판정 임계 — 목표색과의 가중 RGB 거리(redmean, 0~약 765)가 이만큼이면 성공.
   * 관대하게 잡되, 30색 목표끼리는 서로 이 거리보다 멀어야 한다 (validate-data.js 가 검사).
   * 30색으로 늘리며 70→55 로 좁혔다 — 가장 가까운 두 목표(돌멩이↔가지)가 58.8 이라 55 가 상한. */
  const THRESHOLD = 55;
  const MAX_DROPS = 8; // 병에 담기는 최대 방울 수

  /* ─────────── 자유 실험: 만든 색의 귀여운 이름표 (가장 가까운 이름을 붙인다) ─────────── */
  const COLOR_NAMES = [
    { name: '딸기 빨강',     c: '#FF0000' },
    { name: '병아리 노랑',   c: '#FFFF00' },
    { name: '바다 파랑',     c: '#2A5F99' },
    { name: '하얀 구름',     c: '#FFFFFF' },
    { name: '까만 밤',       c: '#2D2A2E' },
    { name: '노을 주황',     c: '#FF9F40' },
    { name: '귤 주황',       c: '#FFC13E' },
    { name: '숲속 초록',     c: '#67A588' },
    { name: '새싹 초록',     c: '#8AC173' },
    { name: '풀잎 연두',     c: '#AFDA55' },
    { name: '포도 보라',     c: '#846399' },
    { name: '자두 자주',     c: '#AA5886' },
    { name: '벚꽃 분홍',     c: '#FFAAAA' },
    { name: '솜사탕 분홍',   c: '#FFC8C8' },
    { name: '맑은 하늘',     c: '#B8CADD' },
    { name: '비 오는 하늘',  c: '#94AFCC' },
    { name: '초코 갈색',     c: '#B9783A' },
    { name: '흙 갈색',       c: '#8A6A4B' },
    { name: '코끼리 회색',   c: '#969597' },
    { name: '은빛 회색',     c: '#C2C0C3' },
    { name: '라벤더 연보라', c: '#C68FAE' },
    { name: '복숭아 살구',   c: '#FFCF9F' },
    { name: '밤바다 남색',   c: '#2B4564' },
    { name: '민트 사탕',     c: '#B1D6A2' },
    { name: '산호 분홍',     c: '#FF8080' },
    { name: '병아리 연노랑', c: '#FFFF80' },
    { name: '체리 빨강',     c: '#961517' },
    { name: '올리브 열매',   c: '#969517' },
    { name: '해바라기 노랑', c: '#FFC639' },
    { name: '생쥐 연회색',   c: '#B9B8B9' },
    { name: '돌멩이 회색',   c: '#737174' },
    { name: '장미 진분홍',   c: '#D8728C' },
    { name: '겨자 노랑',     c: '#CB9F36' },
    { name: '알밤 갈색',     c: '#966537' },
    { name: '전나무 진초록', c: '#5B7650' },
    { name: '가지 보라',     c: '#6E557E' },
    { name: '달콤한 크림',   c: '#FFFFBF' },
    { name: '공작새 청록',   c: '#4E8B93' },
    { name: '수풀 카키',     c: '#817F4F' },
    { name: '멜론 연두',     c: '#CFE999' },
    { name: '복숭아 주황',   c: '#FFB366' },
  ];
  // 만든 색에 가장 가까운 이름 찾기
  function nameOf(rgb) {
    let best = COLOR_NAMES[0], bd = Infinity;
    COLOR_NAMES.forEach(n => {
      const d = window.Mix.dist(rgb, window.Mix.parse(n.c));
      if (d < bd) { bd = d; best = n; }
    });
    return best.name;
  }

  const PRAISES = ['참 잘했어요!', '우와, 멋진 색이야!', '꼬마 과학자님 최고!', '반짝반짝 예쁜 색!'];

  return { PAINTS, paintOf, MISSIONS, BASE_COUNT, THRESHOLD, MAX_DROPS, COLOR_NAMES, nameOf, PRAISES };
})();
