/* 도안: 멋쟁이 파인애플 26×26 — 보통 단계 (선글라스 끼고 해변에서) */
(() => {
  window.PIXELS = window.PIXELS || [];
  const W = 26, H = 26;
  // 1 하늘, 2 바다, 3 모래, 4 몸 노랑, 5 무늬 갈색, 6 잎 초록, 7 짙은 잎, 8 선글라스, 9 웃는 입
  const P = ['#CBEDFF', '#7FD9EA', '#FFE3A9', '#FFC24D', '#D6902F', '#4FBF6B', '#2F9152', '#35323E', '#FF6B81'];
  const g = Array.from({ length: H }, () => new Array(W).fill(0));
  const ell = (x, y, cx, cy, rx, ry) => {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    return dx * dx + dy * dy;
  };

  // 바다와 모래 해변
  for (let y = 19; y <= 20; y++) for (let x = 0; x < W; x++) g[y][x] = 1;
  for (let y = 21; y < H; y++) for (let x = 0; x < W; x++) g[y][x] = 2;

  // 파인애플 몸통 (달걀 모양)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (ell(x, y, 13, 16.5, 5.9, 7.4) <= 1) g[y][x] = 3;

  // 몸통의 격자 점무늬
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (g[y][x] === 3 && ((x % 4 === 0 && y % 4 === 0) || (x % 4 === 2 && y % 4 === 2))) g[y][x] = 4;

  // 뾰족뾰족 잎사귀 (가운데는 짙은 초록)
  [[13, 2], [13, 3], [13, 4], [13, 5], [12, 6], [13, 6], [14, 6], [12, 7], [13, 7], [14, 7], [12, 8], [13, 8], [14, 8]]
    .forEach(([x, y]) => { g[y][x] = 6; });
  [[10, 3], [10, 4], [11, 5], [11, 6], [11, 7], [16, 3], [16, 4], [15, 5], [15, 6], [15, 7]]
    .forEach(([x, y]) => { g[y][x] = 5; });
  [[8, 5], [8, 6], [9, 7], [10, 8], [18, 5], [18, 6], [17, 7], [16, 8]]
    .forEach(([x, y]) => { g[y][x] = 5; });

  // 선글라스 (알 두 개 + 다리)
  for (let y = 12; y <= 14; y++) {
    for (let x = 9; x <= 11; x++) g[y][x] = 7;
    for (let x = 15; x <= 17; x++) g[y][x] = 7;
  }
  for (let x = 8; x <= 18; x++) g[13][x] = 7;

  // 방긋 웃는 입
  g[18][10] = 8;
  for (let x = 11; x <= 15; x++) g[19][x] = 8;
  g[18][16] = 8;

  PIXELS.push({
    id: 'pineapple', name: '멋쟁이 파인애플', emoji: '🍍', category: 'food', level: 2,
    palette: P,
    rows: g.map(r => r.join(''))
  });
})();
