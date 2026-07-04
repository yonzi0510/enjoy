/* 도안: 우주 로켓 (영역 ~33 · 색 9) */
(() => {
  const { ellipsePoly } = window.PicHelpers;
  const R = [];

  // 1 우주, 2 별 크림, 3 주황 행성, 4 보라, 5 로켓 몸, 6 빨강, 7 하늘색, 8 불꽃 주황, 9 노랑
  const P = ['#2B3A67', '#FFF3B8', '#FF9D3A', '#C79BFF', '#E8EEF7', '#FF5B5B', '#7CC7F5', '#FF7A00', '#FFD93D'];

  // 우주 배경
  R.push({ t: 'rect', x: 0, y: 0, w: 800, h: 800, c: 0 });

  // 작은 별들
  [[80, 90, 9], [210, 180, 7], [640, 90, 8], [730, 300, 7], [90, 420, 8], [160, 620, 9], [700, 500, 8], [620, 720, 9]].forEach(s =>
    R.push({ t: 'circle', cx: s[0], cy: s[1], r: s[2], c: 1 }));

  // 반짝 큰 별 2개 (네 꼭짓점 별)
  [[275, 80], [80, 720]].forEach(s => {
    const [cx, cy] = s;
    R.push({ t: 'poly', pts: [[cx, cy - 26], [cx + 7, cy - 7], [cx + 26, cy], [cx + 7, cy + 7], [cx, cy + 26], [cx - 7, cy + 7], [cx - 26, cy], [cx - 7, cy - 7]], c: 8 });
  });

  // 달 (노랑) + 분화구
  R.push({ t: 'circle', cx: 120, cy: 140, r: 62, c: 8 });
  R.push({ t: 'circle', cx: 98, cy: 122, r: 14, c: 2 });
  R.push({ t: 'circle', cx: 140, cy: 165, r: 10, c: 2 });
  R.push({ t: 'circle', cx: 122, cy: 92, r: 7, c: 2 });

  // 고리 행성 (고리 → 행성)
  R.push({ t: 'poly', pts: ellipsePoly(655, 190, 98, 24, -18), c: 3 });
  R.push({ t: 'circle', cx: 655, cy: 190, r: 52, c: 2 });

  // 작은 하늘색 행성
  R.push({ t: 'circle', cx: 690, cy: 630, r: 38, c: 6 });

  // 로켓: 몸 → 코 → 창문 → 줄무늬 → 날개 → 노즐 → 불꽃
  R.push({ t: 'poly', pts: [[332, 350], [332, 442], [258, 464]], c: 5 });   // 왼 날개
  R.push({ t: 'poly', pts: [[468, 350], [468, 442], [542, 464]], c: 5 });   // 오른 날개
  R.push({ t: 'path', d: 'M400 118 C462 178 470 300 470 425 L330 425 C330 300 338 178 400 118 Z', c: 4 });
  R.push({ t: 'path', d: 'M400 118 C432 149 447 190 455 232 L345 232 C353 190 368 149 400 118 Z', c: 5 });
  R.push({ t: 'circle', cx: 400, cy: 300, r: 46, c: 5 });                   // 창 테두리
  R.push({ t: 'circle', cx: 400, cy: 300, r: 33, c: 6 });                   // 창 유리
  R.push({ t: 'rect', x: 338, y: 372, w: 124, h: 38, c: 5 });               // 줄무늬
  R.push({ t: 'rect', x: 362, y: 425, w: 76, h: 20, c: 5 });                // 노즐
  R.push({ t: 'poly', pts: [[352, 445], [448, 445], [400, 566]], c: 7 });   // 불꽃 바깥
  R.push({ t: 'poly', pts: [[374, 445], [426, 445], [400, 522]], c: 8 });   // 불꽃 안쪽

  // 연기 구름
  R.push({ t: 'circle', cx: 330, cy: 560, r: 24, c: 4 });
  R.push({ t: 'circle', cx: 470, cy: 566, r: 22, c: 4 });
  R.push({ t: 'circle', cx: 400, cy: 615, r: 26, c: 4 });

  window.PICTURES.push({
    id: 'rocket', name: '우주 로켓', emoji: '🚀', category: 'vehicle',
    vb: [0, 0, 800, 800], palette: P, regions: R
  });
})();
