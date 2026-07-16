/* 도안: 돛단배 18×18 — 쉬움 단계 (파도 위 돛단배와 해님) */
(() => {
  window.PIXELS = window.PIXELS || [];
  const W = 18, H = 18;
  // 1 하늘, 2 바다, 3 물결, 4 뱃몸 빨강, 5 흰 돛, 6 주황 돛, 7 돛대 갈색, 8 해님 노랑
  const P = ['#C9ECFF', '#4FA8E0', '#9BD9F7', '#FF6B6B', '#FFFFFF', '#FFA45B', '#8D5A2B', '#FFD93D'];
  const g = Array.from({ length: H }, () => new Array(W).fill(0));

  // 해님 (왼쪽 위)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (Math.hypot(x + 0.5 - 3.5, y + 0.5 - 3.5) <= 2.6) g[y][x] = 7;

  // 바다 + 밝은 물결 줄무늬
  for (let y = 13; y < H; y++) for (let x = 0; x < W; x++) g[y][x] = 1;
  for (let x = 0; x < W; x++) {
    if ((x + 1) % 5 < 2) g[13][x] = 2;
    if ((x + 3) % 5 < 2) g[15][x] = 2;
    if (x % 6 < 2) g[17][x] = 2;
  }

  // 돛대 + 깃발
  for (let y = 1; y <= 10; y++) g[y][9] = 6;
  g[1][10] = 3; g[1][11] = 3;

  // 왼쪽 흰 돛 (아래로 넓어지는 삼각형)
  for (let y = 3; y <= 10; y++)
    for (let x = Math.max(3, 9 - (y - 2)); x <= 8; x++) g[y][x] = 4;

  // 오른쪽 주황 돛
  for (let y = 4; y <= 10; y++)
    for (let x = 10; x <= Math.min(W - 1, 10 + Math.floor((y - 3) * 0.7)); x++) g[y][x] = 5;

  // 뱃몸 (사다리꼴)
  for (let x = 4; x <= 13; x++) g[11][x] = 3;
  for (let x = 5; x <= 12; x++) g[12][x] = 3;

  PIXELS.push({
    id: 'sailboat', name: '돛단배', emoji: '⛵', category: 'vehicle', level: 1,
    palette: P,
    rows: g.map(r => r.join(''))
  });
})();
