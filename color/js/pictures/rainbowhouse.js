/* 도안: 무지개 집 (영역 ~43 · 색 11) */
(() => {
  const { arcBand, rays } = window.PicHelpers;
  const R = [];

  // 1 하늘, 2 풀밭, 3 노랑, 4 흰색, 5 빨강, 6 주황, 7 초록, 8 파랑, 9 보라, 10 벽 크림, 11 갈색
  const P = ['#C9ECFF', '#9FDB76', '#FFD93D', '#FFFFFF', '#FF5B5B', '#FF9D3A', '#4DC94D', '#4DA6FF', '#B48CF2', '#FFE9C8', '#8A5A44'];

  // 하늘·풀밭
  R.push({ t: 'rect', x: 0, y: 0, w: 800, h: 560, c: 0 });
  R.push({ t: 'rect', x: 0, y: 560, w: 800, h: 240, c: 1 });

  // 해 + 햇살
  rays(105, 100, 72, 112, 8).forEach(pts => R.push({ t: 'poly', pts, c: 2 }));
  R.push({ t: 'circle', cx: 105, cy: 100, r: 56, c: 2 });

  // 구름
  R.push({ t: 'ellipse', cx: 610, cy: 95, rx: 60, ry: 28, c: 3 });
  R.push({ t: 'ellipse', cx: 680, cy: 110, rx: 46, ry: 24, c: 3 });
  R.push({ t: 'ellipse', cx: 300, cy: 130, rx: 52, ry: 24, c: 3 });

  // 무지개 (윗반원 6색 띠)
  [[385, 355, 4], [355, 325, 5], [325, 295, 2], [295, 265, 6], [265, 235, 7], [235, 205, 8]].forEach(b =>
    R.push({ t: 'path', d: arcBand(400, 560, b[0], b[1], 180, 360), c: b[2] }));

  // 집: 굴뚝(지붕 뒤) → 벽 → 지붕 → 문·창문·길
  R.push({ t: 'rect', x: 450, y: 345, w: 38, h: 110, c: 10 });
  R.push({ t: 'rect', x: 300, y: 440, w: 200, h: 160, c: 9 });
  R.push({ t: 'poly', pts: [[278, 440], [522, 440], [400, 335]], c: 4 });
  R.push({ t: 'path', d: 'M368 600 L368 512 A32 32 0 0 1 432 512 L432 600 Z', c: 10 });
  R.push({ t: 'circle', cx: 420, cy: 562, r: 7, c: 2 });
  R.push({ t: 'rect', x: 318, y: 468, w: 44, h: 44, c: 7 });
  R.push({ t: 'rect', x: 438, y: 468, w: 44, h: 44, c: 7 });
  R.push({ t: 'poly', pts: [[364, 600], [436, 600], [472, 706], [328, 706]], c: 3 });

  // 나무
  R.push({ t: 'rect', x: 630, y: 480, w: 34, h: 120, c: 10 });
  R.push({ t: 'circle', cx: 612, cy: 452, r: 44, c: 6 });
  R.push({ t: 'circle', cx: 682, cy: 452, r: 44, c: 6 });
  R.push({ t: 'circle', cx: 647, cy: 405, r: 46, c: 6 });

  // 울타리 (왼쪽)
  [60, 108, 156, 204, 252].forEach(x => R.push({ t: 'rect', x, y: 528, w: 24, h: 84, c: 3 }));
  R.push({ t: 'rect', x: 48, y: 552, w: 240, h: 14, c: 3 });

  // 튤립 2송이
  R.push({ t: 'poly', pts: [[120, 680], [128, 740], [136, 680]], c: 6 });
  R.push({ t: 'poly', pts: [[100, 690], [156, 690], [148, 636], [128, 654], [108, 636]], c: 4 });
  R.push({ t: 'poly', pts: [[586, 700], [594, 756], [602, 700]], c: 6 });
  R.push({ t: 'poly', pts: [[566, 710], [622, 710], [614, 656], [594, 674], [574, 656]], c: 8 });

  window.PICTURES.push({
    id: 'rainbowhouse', name: '무지개 집', emoji: '🌈', category: 'scenery',
    vb: [0, 0, 800, 800], palette: P, regions: R
  });
})();
