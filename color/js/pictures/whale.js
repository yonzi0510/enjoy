/* 도안: 아기 고래 (영역 ~27 · 색 8) */
(() => {
  const { ellipsePoly, arcBand } = window.PicHelpers;
  const R = [];

  // 1 하늘, 2 해, 3 흰색(구름·물보라), 4 바다, 5 깊은 바다, 6 고래, 7 배, 8 진남색
  const P = ['#CFEBFF', '#FFD93D', '#FFFFFF', '#6FC3F0', '#3E9BD6', '#5C7FD6', '#C9DBFF', '#2E4A7A'];

  // 하늘·해
  R.push({ t: 'rect', x: 0, y: 0, w: 800, h: 430, c: 0 });
  R.push({ t: 'circle', cx: 690, cy: 105, r: 58, c: 1 });

  // 구름
  R.push({ t: 'ellipse', cx: 150, cy: 110, rx: 62, ry: 30, c: 2 });
  R.push({ t: 'ellipse', cx: 220, cy: 122, rx: 48, ry: 26, c: 2 });
  R.push({ t: 'ellipse', cx: 460, cy: 80, rx: 55, ry: 26, c: 2 });

  // 바다 (2단) + 물결 거품
  R.push({ t: 'rect', x: 0, y: 430, w: 800, h: 370, c: 3 });
  R.push({ t: 'rect', x: 0, y: 630, w: 800, h: 170, c: 4 });
  R.push({ t: 'ellipse', cx: 90, cy: 432, rx: 75, ry: 16, c: 2 });
  R.push({ t: 'ellipse', cx: 700, cy: 432, rx: 85, ry: 16, c: 2 });
  R.push({ t: 'ellipse', cx: 420, cy: 640, rx: 90, ry: 14, c: 3 });

  // 물 뿜기 (고래 머리 위)
  R.push({ t: 'ellipse', cx: 330, cy: 258, rx: 46, ry: 20, c: 2 });
  R.push({ t: 'circle', cx: 285, cy: 292, r: 15, c: 2 });
  R.push({ t: 'circle', cx: 372, cy: 290, r: 15, c: 2 });

  // 고래: 꼬리 → 몸 → 배 → 지느러미 → 눈·볼·미소
  R.push({ t: 'poly', pts: [[560, 470], [640, 380], [660, 452], [700, 430], [688, 520], [590, 520]], c: 5 });
  R.push({ t: 'poly', pts: ellipsePoly(370, 480, 215, 125, 0), c: 5 });
  R.push({ t: 'poly', pts: ellipsePoly(355, 552, 185, 62, 0), c: 6 });
  R.push({ t: 'poly', pts: ellipsePoly(400, 545, 70, 34, 35), c: 5 });      // 옆지느러미
  R.push({ t: 'circle', cx: 235, cy: 440, r: 16, c: 7 });                   // 눈
  R.push({ t: 'circle', cx: 241, cy: 434, r: 5, c: 2 });                    // 눈 반짝
  R.push({ t: 'circle', cx: 268, cy: 486, r: 17, c: 6 });                   // 볼
  R.push({ t: 'path', d: arcBand(215, 470, 46, 36, 35, 110), c: 7 });       // 미소

  // 갈매기 2마리
  R.push({ t: 'poly', pts: [[120, 250], [155, 232], [190, 250], [186, 262], [155, 246], [124, 262]], c: 7 });
  R.push({ t: 'poly', pts: [[520, 190], [548, 176], [576, 190], [573, 200], [548, 187], [523, 200]], c: 7 });

  window.PICTURES.push({
    id: 'whale', name: '아기 고래', emoji: '🐳', category: 'animal',
    vb: [0, 0, 800, 800], palette: P, regions: R
  });
})();
