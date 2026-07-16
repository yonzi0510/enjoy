/* 색깔 실험실 데이터 — 물감 5종, 미션 12색 도감, 자유 실험 색 이름표
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

  /* ─────────── 미션 12색 도감 ───────────
   * recipe: 물감 방울 순서, target: 그 레시피를 섞은 결과색(고정),
   * sayName: TTS 로 읽어 줄 이름 (갈색·회색·남색은 이미 '색'으로 끝난다) */
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
  ];

  /* 미션 판정 임계 — 목표색과의 가중 RGB 거리(redmean, 0~약 765)가 이만큼이면 성공.
   * 관대하게 잡되, 12색 목표끼리는 서로 이 거리보다 멀어야 한다 (validate-data.js 가 검사). */
  const THRESHOLD = 70;
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

  return { PAINTS, paintOf, MISSIONS, THRESHOLD, MAX_DROPS, COLOR_NAMES, nameOf, PRAISES };
})();
