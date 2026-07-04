/* 도안: 버섯집 (영역 ~36 · 색 10) */
(() => {
  const { ellipsePoly, bar } = window.PicHelpers;
  const R = [];

  // 1 하늘, 2 언덕, 3 먼 언덕, 4 지붕 빨강, 5 흰색, 6 벽 크림, 7 문 갈색, 8 노랑, 9 풀, 10 분홍
  const P = ['#C9ECFF', '#A5DB7C', '#7CC257', '#FF5B5B', '#FFFFFF', '#FFF3DC', '#A5683F', '#FFD93D', '#58B368', '#FF8FB2'];

  // 하늘·언덕
  R.push({ t: 'rect', x: 0, y: 0, w: 800, h: 640, c: 0 });
  R.push({ t: 'ellipse', cx: 180, cy: 620, rx: 360, ry: 150, c: 2 });
  R.push({ t: 'ellipse', cx: 640, cy: 650, rx: 400, ry: 170, c: 1 });
  R.push({ t: 'rect', x: 0, y: 660, w: 800, h: 140, c: 1 });

  // 구름
  R.push({ t: 'ellipse', cx: 620, cy: 110, rx: 62, ry: 28, c: 4 });
  R.push({ t: 'ellipse', cx: 690, cy: 125, rx: 46, ry: 24, c: 4 });
  R.push({ t: 'ellipse', cx: 130, cy: 160, rx: 55, ry: 25, c: 4 });

  // 버섯집: 기둥(벽) → 굴뚝(지붕 뒤) → 지붕 → 점무늬 → 문·창문
  R.push({ t: 'poly', pts: [[305, 415], [495, 415], [478, 665], [322, 665]], c: 5 });
  R.push({ t: 'rect', x: 470, y: 285, w: 42, h: 100, c: 5 });               // 굴뚝
  R.push({ t: 'circle', cx: 492, cy: 245, r: 16, c: 4 });                   // 연기
  R.push({ t: 'circle', cx: 512, cy: 208, r: 11, c: 4 });
  R.push({ t: 'path', d: 'M235 428 A170 158 0 0 1 565 428 Z', c: 3 });      // 지붕(갓)
  R.push({ t: 'circle', cx: 320, cy: 372, r: 26, c: 4 });                   // 갓 점무늬
  R.push({ t: 'circle', cx: 420, cy: 315, r: 30, c: 4 });
  R.push({ t: 'circle', cx: 505, cy: 385, r: 22, c: 4 });
  R.push({ t: 'path', d: 'M362 665 L362 560 A38 38 0 0 1 438 560 L438 665 Z', c: 6 });  // 문
  R.push({ t: 'circle', cx: 424, cy: 615, r: 8, c: 7 });                    // 손잡이
  R.push({ t: 'circle', cx: 340, cy: 500, r: 27, c: 7 });                   // 둥근 창
  R.push({ t: 'circle', cx: 460, cy: 500, r: 27, c: 7 });

  // 풀숲
  R.push({ t: 'poly', pts: [[80, 700], [100, 640], [120, 700]], c: 8 });
  R.push({ t: 'poly', pts: [[112, 706], [132, 652], [152, 706]], c: 8 });
  R.push({ t: 'poly', pts: [[655, 712], [675, 650], [695, 712]], c: 8 });

  // 들꽃 2송이 (꽃잎 5 + 중심)
  [[200, 712], [590, 730]].forEach(f => {
    for (let k = 0; k < 5; k++) {
      const a = Math.PI * 2 * k / 5 - Math.PI / 2;
      R.push({ t: 'circle', cx: Math.round(f[0] + Math.cos(a) * 16), cy: Math.round(f[1] + Math.sin(a) * 16), r: 10, c: 9 });
    }
    R.push({ t: 'circle', cx: f[0], cy: f[1], r: 9, c: 7 });
  });

  // 나풀나풀 나비
  R.push({ t: 'circle', cx: 613, cy: 335, r: 17, c: 9 });
  R.push({ t: 'circle', cx: 647, cy: 335, r: 17, c: 9 });
  R.push({ t: 'poly', pts: ellipsePoly(630, 342, 6, 17, 0), c: 6 });

  window.PICTURES.push({
    id: 'mushroom', name: '버섯집', emoji: '🍄', category: 'nature',
    vb: [0, 0, 800, 800], palette: P, regions: R
  });
})();
