/* 도안: 웃는 문어 20×20 — 쉬움 단계 (물방울 뽀글뽀글) */
(() => {
  window.PIXELS = window.PIXELS || [];
  const W = 20, H = 20;
  // 1 바닷물, 2 몸 분홍, 3 진분홍(그늘·볼), 4 흰색(눈·물방울), 5 짙은 남색(눈동자·입), 6 모래
  const P = ['#D7F0FF', '#FF9EBB', '#E4638C', '#FFFFFF', '#3B3B52', '#FFE29A'];
  const g = Array.from({ length: H }, () => new Array(W).fill(0));

  // 모래 바닥
  for (let y = 17; y < H; y++) for (let x = 0; x < W; x++) g[y][x] = 5;

  // 다리 4개 (지그재그로 살랑살랑, 발끝은 진분홍)
  [3, 7, 11, 15].forEach((base, i) => {
    for (let y = 12; y <= 17; y++) {
      const off = (y % 2 === 0) ? 0 : (i < 2 ? -1 : 1);
      const c = (y === 17) ? 2 : 1;
      g[y][base + off] = c; g[y][base + off + 1] = c;
    }
  });

  // 둥근 머리 (아랫부분은 그늘)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (Math.hypot(x + 0.5 - 10, y + 0.5 - 7.5) <= 5.4) g[y][x] = (y >= 11) ? 2 : 1;

  // 눈 (흰자 + 눈동자)
  g[6][7] = 3; g[6][8] = 3; g[7][7] = 3; g[7][8] = 3;
  g[6][12] = 3; g[6][13] = 3; g[7][12] = 3; g[7][13] = 3;
  g[7][8] = 4; g[7][12] = 4;

  // 방긋 웃는 입 + 볼
  g[9][8] = 4; g[10][9] = 4; g[10][10] = 4; g[10][11] = 4; g[9][12] = 4;
  g[8][5] = 2; g[8][15] = 2;

  // 물방울 (뽀글뽀글)
  g[3][16] = 3; g[3][17] = 3; g[4][16] = 3; g[4][17] = 3;
  g[1][15] = 3; g[2][2] = 3; g[5][1] = 3; g[13][18] = 3; g[12][1] = 3;

  PIXELS.push({
    id: 'octopus', name: '웃는 문어', emoji: '🐙', category: 'animal', level: 1,
    palette: P,
    rows: g.map(r => r.join(''))
  });
})();
