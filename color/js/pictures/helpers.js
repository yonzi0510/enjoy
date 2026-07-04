/* 도안 공용 헬퍼 — 회전 타원·부채띠·햇살 등을 poly/path로 생성 (transform 금지 계약 대응) */
window.PICTURES = window.PICTURES || [];
window.PicHelpers = (() => {
  const rad = d => d * Math.PI / 180;
  const rnd1 = v => Math.round(v * 10) / 10;

  // 회전 타원 → 다각형 점 목록
  function ellipsePoly(cx, cy, rx, ry, rot = 0, n = 28) {
    const r = rad(rot), cos = Math.cos(r), sin = Math.sin(r);
    const pts = [];
    for (let k = 0; k < n; k++) {
      const a = 2 * Math.PI * k / n;
      const x = rx * Math.cos(a), y = ry * Math.sin(a);
      pts.push([rnd1(cx + x * cos - y * sin), rnd1(cy + x * sin + y * cos)]);
    }
    return pts;
  }

  // 고리 부채띠(무지개·미소 등) path d — 각도는 도(deg), 화면 좌표(y 아래) 기준
  function arcBand(cx, cy, rOut, rIn, a1, a2) {
    const px = (a, rr) => rnd1(cx + rr * Math.cos(rad(a))) + ' ' + rnd1(cy + rr * Math.sin(rad(a)));
    const large = Math.abs(a2 - a1) > 180 ? 1 : 0;
    return 'M' + px(a1, rOut) +
      ' A' + rOut + ' ' + rOut + ' 0 ' + large + ' 1 ' + px(a2, rOut) +
      ' L' + px(a2, rIn) +
      ' A' + rIn + ' ' + rIn + ' 0 ' + large + ' 0 ' + px(a1, rIn) + ' Z';
  }

  // 햇살: 삼각형 poly 목록 (rIn 밑변 → rOut 꼭짓점)
  function rays(cx, cy, rIn, rOut, count, baseHalfDeg = 7) {
    const out = [];
    for (let k = 0; k < count; k++) {
      const a = 360 / count * k;
      out.push([
        [rnd1(cx + rIn * Math.cos(rad(a - baseHalfDeg))), rnd1(cy + rIn * Math.sin(rad(a - baseHalfDeg)))],
        [rnd1(cx + rIn * Math.cos(rad(a + baseHalfDeg))), rnd1(cy + rIn * Math.sin(rad(a + baseHalfDeg)))],
        [rnd1(cx + rOut * Math.cos(rad(a))), rnd1(cy + rOut * Math.sin(rad(a)))]
      ]);
    }
    return out;
  }

  // 두 점을 잇는 굵은 선 → 사각 poly (더듬이·줄기 등)
  function bar(x1, y1, x2, y2, halfW) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len * halfW, ny = dx / len * halfW;
    return [
      [rnd1(x1 + nx), rnd1(y1 + ny)], [rnd1(x2 + nx), rnd1(y2 + ny)],
      [rnd1(x2 - nx), rnd1(y2 - ny)], [rnd1(x1 - nx), rnd1(y1 - ny)]
    ];
  }

  return { ellipsePoly, arcBand, rays, bar };
})();
