/* 도안: 꽃 화분 (영역 ~42 · 색 10) */
(() => {
  const { ellipsePoly, bar } = window.PicHelpers;
  const R = [];

  // 1 벽, 2 벽지 줄무늬, 3 탁자, 4 화분, 5 화분 테, 6 줄기·잎, 7 분홍 꽃, 8 노랑 중심, 9 보라 꽃, 10 흰색
  const P = ['#FFF1D6', '#FFE3B3', '#C98A5B', '#E8734A', '#C4552F', '#58B368', '#FF8FB2', '#FFD93D', '#B48CF2', '#FFFFFF'];

  // 벽 + 세로 줄무늬 벽지
  R.push({ t: 'rect', x: 0, y: 0, w: 800, h: 640, c: 0 });
  [70, 260, 490, 690].forEach(x => R.push({ t: 'rect', x, y: 0, w: 52, h: 640, c: 1 }));

  // 탁자 (윗면 테두리 + 몸) — 화분이 탁자 "위"에 놓이도록 라인을 화분 바닥 근처로
  R.push({ t: 'rect', x: 0, y: 640, w: 800, h: 160, c: 2 });
  R.push({ t: 'rect', x: 0, y: 640, w: 800, h: 24, c: 4 });

  // 줄기 3개 (화분보다 먼저 → 아래는 화분에 가려짐)
  R.push({ t: 'poly', pts: bar(400, 600, 400, 415, 7), c: 5 });
  R.push({ t: 'poly', pts: bar(392, 595, 318, 468, 6), c: 5 });
  R.push({ t: 'poly', pts: bar(408, 595, 482, 468, 6), c: 5 });

  // 잎 4장
  R.push({ t: 'poly', pts: ellipsePoly(352, 528, 40, 16, -38), c: 5 });
  R.push({ t: 'poly', pts: ellipsePoly(448, 528, 40, 16, 38), c: 5 });
  R.push({ t: 'poly', pts: ellipsePoly(360, 470, 34, 14, -30), c: 5 });
  R.push({ t: 'poly', pts: ellipsePoly(440, 470, 34, 14, 30), c: 5 });

  // 화분 (줄기 위에)
  R.push({ t: 'poly', pts: [[330, 606], [470, 606], [448, 742], [352, 742]], c: 3 });
  R.push({ t: 'rect', x: 314, y: 578, w: 172, h: 34, c: 4 });
  R.push({ t: 'circle', cx: 400, cy: 668, r: 22, c: 9 });   // 화분 장식 점

  // 가운데 큰 꽃: 분홍 꽃잎 8 + 노란 중심
  for (let k = 0; k < 8; k++) {
    const a = Math.PI * 2 * k / 8;
    R.push({ t: 'poly', pts: ellipsePoly(400 + Math.cos(a) * 54, 400 + Math.sin(a) * 54, 32, 19, 360 * k / 8), c: 6 });
  }
  R.push({ t: 'circle', cx: 400, cy: 400, r: 30, c: 7 });

  // 왼쪽 작은 꽃: 보라 꽃잎 6 + 노란 중심
  for (let k = 0; k < 6; k++) {
    const a = Math.PI * 2 * k / 6 + 0.3;
    R.push({ t: 'poly', pts: ellipsePoly(312 + Math.cos(a) * 36, 448 + Math.sin(a) * 36, 22, 14, 360 * k / 6 + 17), c: 8 });
  }
  R.push({ t: 'circle', cx: 312, cy: 448, r: 19, c: 7 });

  // 오른쪽 작은 꽃: 흰 꽃잎 6 + 보라 중심
  for (let k = 0; k < 6; k++) {
    const a = Math.PI * 2 * k / 6;
    R.push({ t: 'poly', pts: ellipsePoly(488 + Math.cos(a) * 36, 448 + Math.sin(a) * 36, 22, 14, 360 * k / 6), c: 9 });
  }
  R.push({ t: 'circle', cx: 488, cy: 448, r: 19, c: 8 });

  // 탁자에 떨어진 꽃잎 2장
  R.push({ t: 'poly', pts: ellipsePoly(210, 712, 26, 14, 20), c: 6 });
  R.push({ t: 'poly', pts: ellipsePoly(600, 728, 26, 14, -25), c: 8 });

  window.PICTURES.push({
    id: 'flowerpot', name: '꽃 화분', emoji: '🌸', category: 'nature',
    vb: [0, 0, 800, 800], palette: P, regions: R
  });
})();
