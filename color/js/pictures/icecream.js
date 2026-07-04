/* 도안: 아이스크림 (영역 ~30 · 색 10) */
(() => {
  const { ellipsePoly, bar } = window.PicHelpers;
  const R = [];

  // 1 배경, 2 콘, 3 콘 무늬, 4 초코, 5 딸기, 6 민트, 7 체리, 8 크림 흰색, 9 파랑, 10 노랑
  const P = ['#FFE3EE', '#F0B45C', '#C98A3A', '#9C6B4A', '#FF9FBB', '#A8E8C0', '#FF4D6D', '#FFFFFF', '#7CC7F5', '#FFD93D'];

  // 배경 + 색종이 조각
  R.push({ t: 'rect', x: 0, y: 0, w: 800, h: 800, c: 0 });
  [[110, 130, 8], [680, 110, 9], [720, 400, 4], [90, 480, 9], [140, 690, 8], [670, 660, 4], [620, 250, 8], [70, 300, 4]].forEach(s =>
    R.push({ t: 'circle', cx: s[0], cy: s[1], r: 15, c: s[2] }));

  // 콘 + 와플 무늬
  R.push({ t: 'poly', pts: [[318, 468], [482, 468], [400, 724]], c: 1 });
  R.push({ t: 'circle', cx: 400, cy: 515, r: 11, c: 2 });
  R.push({ t: 'circle', cx: 368, cy: 552, r: 9, c: 2 });
  R.push({ t: 'circle', cx: 432, cy: 552, r: 9, c: 2 });
  R.push({ t: 'circle', cx: 400, cy: 600, r: 8, c: 2 });
  R.push({ t: 'circle', cx: 400, cy: 652, r: 6, c: 2 });

  // 콘 테두리 + 흘러내리는 초코
  R.push({ t: 'poly', pts: ellipsePoly(400, 468, 88, 22, 0), c: 2 });
  R.push({ t: 'poly', pts: ellipsePoly(360, 495, 14, 26, 4), c: 3 });
  R.push({ t: 'poly', pts: ellipsePoly(438, 492, 12, 22, -5), c: 3 });

  // 스쿱: 초코(아래) → 딸기(왼) → 민트(오른) → 크림(위)
  R.push({ t: 'circle', cx: 400, cy: 415, r: 88, c: 3 });
  R.push({ t: 'circle', cx: 342, cy: 335, r: 74, c: 4 });
  R.push({ t: 'circle', cx: 458, cy: 335, r: 74, c: 5 });
  R.push({ t: 'circle', cx: 400, cy: 262, r: 62, c: 7 });

  // 체리 + 꼭지
  R.push({ t: 'poly', pts: bar(400, 196, 428, 148, 4), c: 2 });
  R.push({ t: 'circle', cx: 400, cy: 200, r: 25, c: 6 });

  // 스프링클 (스쿱 위)
  R.push({ t: 'poly', pts: ellipsePoly(330, 310, 11, 4, 30), c: 9 });
  R.push({ t: 'poly', pts: ellipsePoly(360, 360, 11, 4, -20), c: 8 });
  R.push({ t: 'poly', pts: ellipsePoly(310, 360, 11, 4, 70), c: 7 });
  R.push({ t: 'poly', pts: ellipsePoly(452, 306, 11, 4, -35), c: 8 });
  R.push({ t: 'poly', pts: ellipsePoly(482, 355, 11, 4, 15), c: 9 });
  R.push({ t: 'poly', pts: ellipsePoly(430, 362, 11, 4, 60), c: 7 });
  R.push({ t: 'poly', pts: ellipsePoly(400, 300, 11, 4, 0), c: 9 });

  window.PICTURES.push({
    id: 'icecream', name: '아이스크림', emoji: '🍦', category: 'food',
    vb: [0, 0, 800, 800], palette: P, regions: R
  });
})();
