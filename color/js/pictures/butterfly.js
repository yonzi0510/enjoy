/* 도안: 나비 — 쉬움 (영역 ~40 · 색 7) */
(() => {
  const { ellipsePoly, rays, bar } = window.PicHelpers;
  const R = [];

  // 팔레트: 1 하늘, 2 풀밭, 3 노랑(해), 4 분홍 날개, 5 보라 날개, 6 몸통 갈색, 7 흰색, 8 진초록(줄기)
  const P = ['#BDE3FF', '#9FDB76', '#FFD93D', '#FF8FB2', '#C79BFF', '#8A5A44', '#FFFFFF', '#58B368'];

  // 배경
  R.push({ t: 'rect', x: 0, y: 0, w: 800, h: 520, c: 0 });
  R.push({ t: 'rect', x: 0, y: 520, w: 800, h: 280, c: 1 });

  // 해 + 햇살
  rays(110, 110, 82, 128, 8).forEach(pts => R.push({ t: 'poly', pts, c: 2 }));
  R.push({ t: 'circle', cx: 110, cy: 110, r: 68, c: 2 });

  // 구름
  R.push({ t: 'ellipse', cx: 560, cy: 105, rx: 58, ry: 30, c: 6 });
  R.push({ t: 'ellipse', cx: 625, cy: 118, rx: 46, ry: 26, c: 6 });
  R.push({ t: 'ellipse', cx: 690, cy: 210, rx: 52, ry: 25, c: 6 });

  // 나비 더듬이 (몸통보다 먼저)
  R.push({ t: 'poly', pts: bar(388, 310, 352, 242, 4), c: 5 });
  R.push({ t: 'poly', pts: bar(412, 310, 448, 242, 4), c: 5 });
  R.push({ t: 'circle', cx: 352, cy: 236, r: 11, c: 2 });
  R.push({ t: 'circle', cx: 448, cy: 236, r: 11, c: 2 });

  // 날개 (위 분홍 · 아래 보라)
  R.push({ t: 'poly', pts: ellipsePoly(305, 365, 100, 72, -35), c: 3 });
  R.push({ t: 'poly', pts: ellipsePoly(495, 365, 100, 72, 35), c: 3 });
  R.push({ t: 'poly', pts: ellipsePoly(320, 500, 74, 56, 28), c: 4 });
  R.push({ t: 'poly', pts: ellipsePoly(480, 500, 74, 56, -28), c: 4 });

  // 날개 안쪽 무늬
  R.push({ t: 'poly', pts: ellipsePoly(280, 350, 48, 33, -35), c: 4 });
  R.push({ t: 'poly', pts: ellipsePoly(520, 350, 48, 33, 35), c: 4 });
  R.push({ t: 'poly', pts: ellipsePoly(305, 512, 34, 25, 28), c: 3 });
  R.push({ t: 'poly', pts: ellipsePoly(495, 512, 34, 25, -28), c: 3 });

  // 날개 점무늬
  R.push({ t: 'circle', cx: 350, cy: 395, r: 12, c: 6 });
  R.push({ t: 'circle', cx: 450, cy: 395, r: 12, c: 6 });
  R.push({ t: 'circle', cx: 268, cy: 415, r: 9, c: 6 });
  R.push({ t: 'circle', cx: 532, cy: 415, r: 9, c: 6 });

  // 몸통·머리 (날개 위)
  R.push({ t: 'ellipse', cx: 400, cy: 445, rx: 25, ry: 88, c: 5 });
  R.push({ t: 'circle', cx: 400, cy: 330, r: 32, c: 5 });

  // 풀밭 꽃 1 (왼쪽): 흰 꽃잎 5 + 노란 중심
  [[130, 640], [104, 670], [156, 670], [114, 704], [146, 704]].forEach(p =>
    R.push({ t: 'circle', cx: p[0], cy: p[1], r: 17, c: 6 }));
  R.push({ t: 'circle', cx: 130, cy: 676, r: 16, c: 2 });

  // 풀밭 꽃 2 (오른쪽): 분홍 튤립 + 줄기·잎
  R.push({ t: 'poly', pts: bar(672, 660, 672, 748, 6), c: 7 });
  R.push({ t: 'poly', pts: ellipsePoly(646, 712, 26, 11, -35), c: 7 });
  R.push({ t: 'poly', pts: [[644, 668], [700, 668], [692, 612], [672, 632], [652, 612]], c: 3 });

  window.PICTURES.push({
    id: 'butterfly', name: '나비', emoji: '🦋', category: 'animal',
    vb: [0, 0, 800, 800], palette: P, regions: R
  });
})();
