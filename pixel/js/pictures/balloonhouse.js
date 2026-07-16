/* 도안: 풍선 집 32×32 — 어려움 단계 (알록달록 풍선을 타고 두둥실) */
(() => {
  window.PIXELS = window.PIXELS || [];
  const W = 32, H = 32;
  // 1 하늘, 2 구름, 3 빨강 풍선, 4 노랑 풍선, 5 파랑 풍선(창문), 6 분홍 풍선,
  // 7 초록 풍선, 8 벽, 9 지붕, 10 갈색(줄·문)
  const P = ['#CDE9FF', '#FFFFFF', '#FF5D73', '#FFD15C', '#58AEE8', '#FF9FD6', '#66CC7E', '#FFE9C7', '#9C6BD4', '#8D5A2B'];
  const g = Array.from({ length: H }, () => new Array(W).fill(0));
  const disk = (cx, cy, r, c) => {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) g[y][x] = c;
  };
  const cloud = (cx, cy) => {
    for (let x = cx - 2; x <= cx + 2; x++) g[cy][x] = 1;
    for (let x = cx - 1; x <= cx + 1; x++) g[cy - 1][x] = 1;
  };

  // 구름 세 조각
  cloud(4, 9); cloud(28, 17); cloud(5, 28);

  // 풍선 다발 (뒤에 세 개, 앞에 두 개)
  disk(11, 5, 2.7, 2);
  disk(16, 3.5, 2.8, 3);
  disk(21, 5, 2.7, 4);
  disk(13.5, 8.5, 2.5, 5);
  disk(18.5, 8.5, 2.5, 6);

  // 풍선 줄 세 가닥
  g[12][13] = 9; g[13][14] = 9; g[14][15] = 9;
  g[12][16] = 9; g[13][16] = 9; g[14][16] = 9;
  g[12][19] = 9; g[13][18] = 9; g[14][17] = 9;

  // 세모 지붕
  [0, 2, 3, 5, 6].forEach((r, i) => {
    const y = 15 + i;
    for (let x = 15 - r; x <= 16 + r; x++) g[y][x] = 8;
  });

  // 벽
  for (let y = 20; y <= 28; y++)
    for (let x = 10; x <= 21; x++) g[y][x] = 7;

  // 창문 두 개 (파란 유리)
  for (let y = 21; y <= 23; y++) {
    for (let x = 12; x <= 14; x++) g[y][x] = 4;
    for (let x = 17; x <= 19; x++) g[y][x] = 4;
  }

  // 문 + 노란 손잡이
  for (let y = 25; y <= 28; y++)
    for (let x = 14; x <= 17; x++) g[y][x] = 9;
  g[26][16] = 3;

  PIXELS.push({
    id: 'balloonhouse', name: '풍선 집', emoji: '🎈', category: 'vehicle', level: 3,
    palette: P,
    rows: g.map(r => r.join(''))
  });
})();
