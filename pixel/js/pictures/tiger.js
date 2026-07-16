/* 도안: 아기 호랑이 26×26 — 보통 단계 (동그란 호랑이 얼굴) */
(() => {
  window.PIXELS = window.PIXELS || [];
  const W = 26, H = 26;
  // 1 배경, 2 주황 털, 3 짙은 밤색(줄무늬·눈·입), 4 흰색(주둥이), 5 분홍 코, 6 연분홍 귓속
  const P = ['#E3F2FF', '#FF9F40', '#453734', '#FFFFFF', '#FF7E9D', '#FFD1DC'];
  const g = Array.from({ length: H }, () => new Array(W).fill(0));
  const disk = (cx, cy, r, c) => {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) g[y][x] = c;
  };
  const ell = (x, y, cx, cy, rx, ry) => {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    return dx * dx + dy * dy;
  };

  // 귀 (머리보다 먼저) + 귓속
  disk(7, 6.5, 3.5, 1); disk(19, 6.5, 3.5, 1);
  disk(7, 6.5, 1.9, 5); disk(19, 6.5, 1.9, 5);

  // 얼굴
  disk(13, 15, 9.6, 1);

  // 이마 줄무늬 (가운데 하나 + 양옆)
  for (let y = 7; y <= 9; y++) g[y][13] = 2;
  for (let y = 8; y <= 9; y++) { g[y][10] = 2; g[y][16] = 2; }

  // 옆 줄무늬 (양쪽 볼가)
  for (let x = 4; x <= 6; x++) g[15][x] = 2;
  for (let x = 20; x <= 22; x++) g[15][x] = 2;
  for (let x = 4; x <= 5; x++) g[17][x] = 2;
  for (let x = 21; x <= 22; x++) g[17][x] = 2;

  // 흰 주둥이
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (ell(x, y, 13, 19.5, 4.8, 3.4) <= 1) g[y][x] = 3;

  // 눈
  g[13][9] = 2; g[13][10] = 2; g[14][9] = 2; g[14][10] = 2;
  g[13][16] = 2; g[13][17] = 2; g[14][16] = 2; g[14][17] = 2;

  // 분홍 코 + 입
  g[17][12] = 4; g[17][13] = 4; g[17][14] = 4; g[18][13] = 4;
  g[19][13] = 2; g[20][12] = 2; g[20][14] = 2;

  PIXELS.push({
    id: 'tiger', name: '아기 호랑이', emoji: '🐯', category: 'animal', level: 2,
    palette: P,
    rows: g.map(r => r.join(''))
  });
})();
