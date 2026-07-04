/* 도안: 바닷속 물고기 (영역 ~33 · 색 9) */
(() => {
  const { ellipsePoly, bar } = window.PicHelpers;
  const R = [];

  // 1 물 위, 2 물 중간, 3 물 깊은 곳, 4 모래, 5 해초, 6 주황, 7 흰색, 8 진한 주황, 9 남색
  const P = ['#A8DEFF', '#7CC7F5', '#58AFE8', '#F6E0A8', '#57B368', '#FF9D3A', '#FFFFFF', '#E8712C', '#33475E'];

  // 물 (3단)
  R.push({ t: 'rect', x: 0, y: 0, w: 800, h: 270, c: 0 });
  R.push({ t: 'rect', x: 0, y: 270, w: 800, h: 270, c: 1 });
  R.push({ t: 'rect', x: 0, y: 540, w: 800, h: 260, c: 2 });

  // 모래 바닥 + 모래 언덕
  R.push({ t: 'rect', x: 0, y: 695, w: 800, h: 105, c: 3 });
  R.push({ t: 'ellipse', cx: 170, cy: 700, rx: 130, ry: 32, c: 3 });
  R.push({ t: 'ellipse', cx: 640, cy: 705, rx: 150, ry: 36, c: 3 });

  // 바위
  R.push({ t: 'ellipse', cx: 540, cy: 692, rx: 55, ry: 34, c: 8 });
  R.push({ t: 'ellipse', cx: 600, cy: 700, rx: 40, ry: 26, c: 8 });

  // 해초 (왼쪽 3줄기 + 오른쪽 2줄기)
  R.push({ t: 'poly', pts: ellipsePoly(90, 620, 16, 95, -12), c: 4 });
  R.push({ t: 'poly', pts: ellipsePoly(135, 600, 15, 110, 8), c: 4 });
  R.push({ t: 'poly', pts: ellipsePoly(180, 635, 14, 82, 18), c: 4 });
  R.push({ t: 'poly', pts: ellipsePoly(710, 610, 16, 100, -8), c: 4 });
  R.push({ t: 'poly', pts: ellipsePoly(755, 640, 14, 80, 10), c: 4 });

  // 물방울
  R.push({ t: 'circle', cx: 590, cy: 240, r: 16, c: 6 });
  R.push({ t: 'circle', cx: 625, cy: 180, r: 12, c: 6 });
  R.push({ t: 'circle', cx: 600, cy: 120, r: 9, c: 6 });
  R.push({ t: 'circle', cx: 150, cy: 160, r: 13, c: 6 });
  R.push({ t: 'circle', cx: 185, cy: 105, r: 9, c: 6 });

  // 큰 물고기: 꼬리·등지느러미·배지느러미(몸 뒤) → 몸 → 무늬 → 옆지느러미 → 눈
  R.push({ t: 'poly', pts: [[540, 400], [665, 320], [645, 400], [665, 480]], c: 7 });
  R.push({ t: 'poly', pts: [[355, 330], [400, 250], [452, 328]], c: 7 });   // 등지느러미
  R.push({ t: 'poly', pts: [[368, 470], [400, 545], [438, 468]], c: 7 });   // 배지느러미
  R.push({ t: 'poly', pts: ellipsePoly(400, 400, 155, 98, -6), c: 5 });
  R.push({ t: 'poly', pts: bar(362, 328, 348, 474, 16), c: 6 });
  R.push({ t: 'poly', pts: bar(444, 330, 434, 470, 15), c: 6 });
  R.push({ t: 'poly', pts: ellipsePoly(415, 415, 42, 22, 30), c: 7 });      // 옆지느러미
  R.push({ t: 'circle', cx: 297, cy: 375, r: 22, c: 6 });                   // 눈 흰자
  R.push({ t: 'circle', cx: 291, cy: 375, r: 10, c: 8 });                   // 눈동자

  // 작은 물고기 친구 (왼쪽 위)
  R.push({ t: 'poly', pts: [[285, 165], [240, 140], [248, 165], [240, 190]], c: 5 });
  R.push({ t: 'poly', pts: ellipsePoly(330, 165, 52, 32, 0), c: 7 });
  R.push({ t: 'circle', cx: 356, cy: 158, r: 7, c: 8 });

  window.PICTURES.push({
    id: 'fish', name: '바닷속 물고기', emoji: '🐠', category: 'animal',
    vb: [0, 0, 800, 800], palette: P, regions: R
  });
})();
