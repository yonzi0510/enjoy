/* 혼색 엔진 — 물감 감산혼합 느낌 (RGB 평균 아님)
 * 빨강·노랑·파랑 물감은 RYB 색공간에서 평균한 뒤 삼선형 보간(Gossett–Chen 꼭짓점 표)으로
 * RGB로 바꾼다 → 빨+노=주황, 파+노=초록, 빨+파=보라가 자연스럽게 나온다.
 * 흰색·검정은 RYB 큐브에 넣으면 탁해지므로 밝기 혼합(흰색 쪽·검정 쪽으로 끌기)으로 따로 섞는다.
 */
window.Mix = (() => {
  // RYB 큐브 꼭짓점의 RGB 값 (0~1) — 물감 혼합 리플 테이블
  const CORNER = {
    w:   [1, 1, 1],          // (0,0,0) 아무것도 없음 = 흰 종이
    r:   [1, 0, 0],          // 빨강
    y:   [1, 1, 0],          // 노랑
    b:   [0.163, 0.373, 0.6],// 파랑 (물감 파랑은 살짝 탁하다)
    ry:  [1, 0.5, 0],        // 빨+노 = 주황
    rb:  [0.5, 0, 0.5],      // 빨+파 = 보라
    yb:  [0, 0.66, 0.2],     // 노+파 = 초록
    ryb: [0.2, 0.094, 0],    // 셋 다 = 거무튀튀한 갈색
  };
  function rybToRgb(r, y, b) {
    const out = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      out[i] = 255 * (
        CORNER.w[i]  * (1 - r) * (1 - y) * (1 - b) +
        CORNER.r[i]  * r       * (1 - y) * (1 - b) +
        CORNER.y[i]  * (1 - r) * y       * (1 - b) +
        CORNER.b[i]  * (1 - r) * (1 - y) * b +
        CORNER.ry[i] * r       * y       * (1 - b) +
        CORNER.rb[i] * r       * (1 - y) * b +
        CORNER.yb[i] * (1 - r) * y       * b +
        CORNER.ryb[i]* r       * y       * b);
    }
    return out;
  }

  const WHITE = [255, 255, 255]; // 흰 물감
  const BLACK = [45, 42, 46];    // 검정 물감 (완전 0이면 너무 죽어 보인다)

  /* 물감 방울 배열 → RGB [r,g,b]
   * drops: paint 객체 배열 ({ryb:[r,y,b]} 유채색 | {kind:'white'|'black'})
   * 방울이 없으면 null (맹물) */
  function mixDrops(drops) {
    if (!drops.length) return null;
    let w = 0, k = 0;
    const chroma = [];
    drops.forEach(p => {
      if (p.kind === 'white') w++;
      else if (p.kind === 'black') k++;
      else chroma.push(p.ryb);
    });
    const c = chroma.length;
    let base = null;
    if (c) {
      const avg = [0, 0, 0];
      chroma.forEach(v => { avg[0] += v[0]; avg[1] += v[1]; avg[2] += v[2]; });
      base = rybToRgb(avg[0] / c, avg[1] / c, avg[2] / c);
    }
    const out = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      out[i] = Math.round(((base ? base[i] * c : 0) + WHITE[i] * w + BLACK[i] * k) / (c + w + k));
    }
    return out;
  }

  /* 색 거리 — 사람 눈에 맞춘 가중 RGB('redmean') 거리. 0(같음) ~ 약 765(흑↔백) */
  function dist(a, b) {
    const rm = (a[0] + b[0]) / 2;
    const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
    return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
  }

  const hex = rgb => '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
  function parse(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }

  return { rybToRgb, mixDrops, dist, hex, parse };
})();
