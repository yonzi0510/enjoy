/* 무지개 탱그램 데이터 — 고리 조각(annulus sector) 도안 라이브러리.
 * 실제 나무 장난감처럼 도넛을 부채꼴로 자른 "고리 조각"을 조합해 그림을 만든다.
 *
 * ── 조각 좌표계 ──
 * 조각 원형(ARC_SHAPES)은 {innerR, outerR, sweep} — 안쪽 반지름·바깥 반지름·부채꼴 각도.
 * 그림의 조각 배치는 {shape, x, y, rot, color}:
 *   (x,y) = 부채꼴이 잘려나온 "원래 원"의 중심(고리의 중심점) 위치,
 *   rot = 부채꼴 이등분선의 절대 각도(0°=위쪽, 시계방향 증가),
 *   color = COLOR_IDS 중 하나.
 * 각도 0 기준: pt(cx,cy,ang,r) = [cx + r·sin(ang), cy − r·cos(ang)] (시계 12시 방향이 0°).
 *
 * ── 눈·장식(deco) ──
 * 아이가 직접 옮기지 않는 고정 장식(눈알 스티커·단추·미소 등)은 deco 배열에 담는다.
 * { t:'eye', x,y,r? }·{ t:'dot', x,y,r,c }·{ t:'line', x1,y1,x2,y2,w?,c? }·{ t:'smile', x,y,w,h }
 *
 * ⚠️ 퍼즐 id·조각 구성은 아이 진행도(done 키)가 id로 저장되므로 함부로 바꾸지 않는다.
 */
window.TangramData = (() => {

  /* ─────────── 조각 원형(부채꼴) 라이브러리 ─────────── */
  const ARC_SHAPES = {
    hS: { innerR: 1.6, outerR: 3.4, sweep: 180 }, // 작은 반달 돔
    hM: { innerR: 2.4, outerR: 5.2, sweep: 180 }, // 중간 반달 돔
    hL: { innerR: 3.2, outerR: 7.0, sweep: 180 }, // 큰 반달 돔
    h2: { innerR: 2.2, outerR: 4.8, sweep: 180 }, // 반달(바퀴·해님용, 원 절반)
    qS: { innerR: 1.4, outerR: 3.2, sweep: 90 },  // 작은 사분 조각
    qM: { innerR: 2.2, outerR: 4.8, sweep: 90 },  // 중간 사분 조각(바퀴용)
    t3: { innerR: 2.2, outerR: 4.8, sweep: 120 }, // 부채꼴(120도, 바퀴용)
    e:  { innerR: 2.2, outerR: 4.8, sweep: 45 },  // 부채꼴(45도, 바퀴용)
    thin: { innerR: 3.6, outerR: 4.8, sweep: 50 },// 가는 팔다리
    s30: { innerR: 3.9, outerR: 4.9, sweep: 30 }, // 아주 가는 더듬이·다리
    w:  { innerR: 0.5, outerR: 4.6, sweep: 70 },  // 통통 쐐기(머리·모자 등)
    petal: { innerR: 2.6, outerR: 4.8, sweep: 22 },// 가는 꽃잎·리본
  };
  const hasShape = k => Object.prototype.hasOwnProperty.call(ARC_SHAPES, k);

  /* ─────────── 무지개 색 6종 ─────────── */
  const COLORS = {
    red:    { hex: '#FF5A5F', say: '빨강' },
    orange: { hex: '#FF9F40', say: '주황' },
    yellow: { hex: '#FFD93D', say: '노랑' },
    mint:   { hex: '#4ECDC4', say: '초록' },
    blue:   { hex: '#4FA3E8', say: '파랑' },
    navy:   { hex: '#3B5FC0', say: '남색' },
  };
  const COLOR_IDS = Object.keys(COLORS);
  const hasColor = c => Object.prototype.hasOwnProperty.call(COLORS, c);
  const colorMeta = c => COLORS[c];
  // 팔레트를 offset 만큼 돌려서 같은 도안도 다른 색 배합으로 쓴다
  const palette = offset => COLOR_IDS.map((_, i) => COLOR_IDS[(i + offset) % COLOR_IDS.length]);

  /* ─────────── 기하 도우미 (validate·app 공용) ───────────
   * 각도 0° = 12시 방향, 시계방향으로 증가 (CSS rotate()와 같은 방향). */
  function polar(cx, cy, angDeg, r) {
    const rad = angDeg * Math.PI / 180;
    return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
  }
  const rnd = n => Math.round(n * 1000) / 1000;
  // 고리 부채꼴 SVG path 문자열 (안쪽호 + 바깥호 + 두 직선)
  function arcPathD(cx, cy, tpl, rot) {
    const { innerR, outerR, sweep } = tpl;
    const a0 = rot - sweep / 2, a1 = rot + sweep / 2;
    const o0 = polar(cx, cy, a0, outerR), o1 = polar(cx, cy, a1, outerR);
    const large = sweep > 180 ? 1 : 0;
    if (innerR <= 0.05) {
      return 'M ' + rnd(cx) + ' ' + rnd(cy) +
        ' L ' + rnd(o0[0]) + ' ' + rnd(o0[1]) +
        ' A ' + rnd(outerR) + ' ' + rnd(outerR) + ' 0 ' + large + ' 1 ' + rnd(o1[0]) + ' ' + rnd(o1[1]) + ' Z';
    }
    const i0 = polar(cx, cy, a0, innerR), i1 = polar(cx, cy, a1, innerR);
    return 'M ' + rnd(i0[0]) + ' ' + rnd(i0[1]) +
      ' L ' + rnd(o0[0]) + ' ' + rnd(o0[1]) +
      ' A ' + rnd(outerR) + ' ' + rnd(outerR) + ' 0 ' + large + ' 1 ' + rnd(o1[0]) + ' ' + rnd(o1[1]) +
      ' L ' + rnd(i1[0]) + ' ' + rnd(i1[1]) +
      ' A ' + rnd(innerR) + ' ' + rnd(innerR) + ' 0 ' + large + ' 0 ' + rnd(i0[0]) + ' ' + rnd(i0[1]) + ' Z';
  }
  // 조각 하나의 대략적인 바운딩 박스(스케일·트레이 배치용, 부채꼴을 여러 각도로 샘플링)
  function pieceBBox(cx, cy, tpl, rot) {
    const { innerR, outerR, sweep } = tpl;
    const a0 = rot - sweep / 2, a1 = rot + sweep / 2;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const N = 10;
    for (let k = 0; k <= N; k++) {
      const a = a0 + (a1 - a0) * k / N;
      [outerR, innerR].forEach(r => {
        const [x, y] = polar(cx, cy, a, r);
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      });
    }
    return { x0, y0, x1, y1 };
  }
  // 그림 전체(조각+장식) 바운딩 박스
  function pictureBBox(pz) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    pz.pieces.forEach(pc => {
      const b = pieceBBox(pc.x, pc.y, ARC_SHAPES[pc.shape], pc.rot);
      x0 = Math.min(x0, b.x0); y0 = Math.min(y0, b.y0); x1 = Math.max(x1, b.x1); y1 = Math.max(y1, b.y1);
    });
    (pz.deco || []).forEach(d => {
      if (d.t === 'line') {
        [[d.x1, d.y1], [d.x2, d.y2]].forEach(([x, y]) => {
          x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        });
      } else {
        const pad = d.r || 1.3;
        x0 = Math.min(x0, d.x - pad); y0 = Math.min(y0, d.y - pad);
        x1 = Math.max(x1, d.x + pad); y1 = Math.max(y1, d.y + pad);
      }
    });
    return { x0, y0, x1, y1 };
  }

  /* ─────────── 조각 만들기 ─────────── */
  const round2 = n => Math.round(n * 100) / 100;
  function mkPiece(shape, x, y, rot, color, tag) {
    return { shape, x: round2(x), y: round2(y), rot: ((Math.round(rot) % 360) + 360) % 360, color, tag };
  }

  /* ─────────── 도안 생성기(재사용되는 10가지 그림 뼈대) ───────────
   * 같은 생성기를 개수·색만 바꿔 여러 단계 퍼즐에 재사용한다. */

  // 바퀴/해님 — 부채꼴 n개가 모여 완전한 원(고리)을 이룬다. n ∈ {2,3,4,8}
  function genWheel(n, colors, cx, cy) {
    cx = cx || 0; cy = cy || 0;
    const tpl = { 2: 'h2', 3: 't3', 4: 'qM', 8: 'e' }[n];
    const pieces = [];
    for (let i = 0; i < n; i++) pieces.push(mkPiece(tpl, cx, cy, i * (360 / n), colors[i % colors.length], 'w' + i));
    return pieces;
  }
  // 꽃 — 작은 돔 조각(qS)이 중심 둘레에 바깥을 향해 놓인다
  function genFlower(n, colors, cx, cy, dist) {
    cx = cx || 0; cy = cy || 0; dist = dist || 3.4;
    const pieces = [];
    for (let i = 0; i < n; i++) {
      const ang = i * (360 / n);
      const [x, y] = polar(cx, cy, ang, dist);
      pieces.push(mkPiece('qS', x, y, ang, colors[i % colors.length], 'f' + i));
    }
    return pieces;
  }
  // 지렁이 — 작은 반달 돔이 옆으로 줄지어 몸통을 이룬다(오른쪽 끝이 머리)
  function genWorm(n, colors) {
    const pieces = [];
    const spacing = 3.0;
    const startX = -((n - 1) * spacing) / 2;
    for (let i = 0; i < n; i++) {
      const x = startX + i * spacing;
      const y = (i % 2 === 0) ? 0 : -0.9;
      pieces.push(mkPiece('hS', x, y, 0, colors[i % colors.length], 'b' + i));
    }
    return pieces;
  }
  function wormHead(n) {
    const spacing = 3.0, startX = -((n - 1) * spacing) / 2;
    const x = startX + (n - 1) * spacing, y = (n - 1) % 2 === 0 ? 0 : -0.9;
    return { x, y };
  }
  // 게 — 등딱지 돔 + 집게 2 + 다리(쌍마다 2)
  function genCrab(legPairs, colors) {
    const pieces = [
      mkPiece('hM', 0, 0, 0, colors[0], 'shell'),
      mkPiece('qS', -4.4, -1.6, 300, colors[1], 'clawL'),
      mkPiece('qS', 4.4, -1.6, 60, colors[1], 'clawR'),
    ];
    for (let i = 0; i < legPairs; i++) {
      pieces.push(mkPiece('s30', -3.2 - i * 1.5, 2.2 + i * 0.7, 250 - i * 16, colors[2 + (i % 2)], 'legL' + i));
      pieces.push(mkPiece('s30', 3.2 + i * 1.5, 2.2 + i * 0.7, 110 + i * 16, colors[2 + (i % 2)], 'legR' + i));
    }
    return pieces;
  }
  // 물고기 — 몸 돔 + 꼬리 + 지느러미 2 (+옵션 장식 조각)
  function genFish(extra, colors) {
    const pieces = [
      mkPiece('hM', 0, 0, 90, colors[0], 'body'),
      mkPiece('t3', -6.2, 0, 270, colors[1], 'tail'),
      mkPiece('qS', -0.6, -3.6, 350, colors[2], 'finTop'),
      mkPiece('qS', -0.6, 3.4, 190, colors[2], 'finBottom'),
    ];
    for (let i = 0; i < extra; i++) pieces.push(mkPiece('petal', 1.6 + i * 1.2, -3.4 + i * 0.6, 40 + i * 10, colors[3 + (i % 2)], 'ext' + i));
    return pieces;
  }
  // 막대 위 새 — 몸 + 머리 + 날개 + 꼬리깃 2
  function genBird(colors) {
    return [
      mkPiece('hM', 0, 0, 0, colors[0], 'body'),
      mkPiece('qS', 0.2, -4.8, 340, colors[1], 'head'),
      mkPiece('t3', -3.6, 0.6, 260, colors[2], 'wing'),
      mkPiece('petal', 1.6, 3.4, 150, colors[3], 'tail1'),
      mkPiece('petal', -0.8, 3.7, 170, colors[4], 'tail2'),
    ];
  }
  // 고양이 얼굴 — 얼굴 돔 + 귀 2 + 턱 (+옵션 리본)
  function genCat(colors, fancy) {
    const pieces = [
      mkPiece('hL', 0, 1.2, 0, colors[0], 'face'),
      mkPiece('qS', -3.8, -3.4, 320, colors[1], 'earL'),
      mkPiece('qS', 3.8, -3.4, 40, colors[1], 'earR'),
      mkPiece('e', 0, 4.6, 180, colors[2], 'chin'),
    ];
    if (fancy) {
      pieces.push(mkPiece('petal', -1.8, 6.2, 210, colors[3], 'bowL'));
      pieces.push(mkPiece('petal', 1.8, 6.2, 150, colors[3], 'bowR'));
      pieces.push(mkPiece('s30', 0, 6.6, 180, colors[4], 'bowKnot'));
    }
    return pieces;
  }
  // 눈사람 — 몸 돔 3단 + 팔 2 (+옵션 모자·목도리)
  function genSnowman(colors, hat) {
    const pieces = [
      mkPiece('hL', 0, 4.4, 0, colors[0], 'bottom'),
      mkPiece('hM', 0, -0.6, 0, colors[1], 'middle'),
      mkPiece('hS', 0, -4.8, 0, colors[2], 'head'),
      mkPiece('s30', -4.6, -1.2, 260, colors[3], 'armL'),
      mkPiece('s30', 4.6, -1.2, 100, colors[3], 'armR'),
    ];
    if (hat) {
      pieces.push(mkPiece('t3', 0, -7.6, 0, colors[4], 'hatTop'));
      pieces.push(mkPiece('qS', 0, -6.0, 180, colors[5], 'hatBrim'));
      pieces.push(mkPiece('petal', 2.0, -5.6, 90, colors[0], 'scarf'));
    }
    return pieces;
  }
  // 광대 — 얼굴 돔 + 고깔모자 + 머리털 2 + 나비넥타이 2 + 옷깃
  function genClown(colors) {
    return [
      mkPiece('hL', 0, 1.2, 0, colors[0], 'face'),
      mkPiece('t3', 0, -7.0, 0, colors[1], 'hat'),
      mkPiece('s30', -4.4, -3.4, 300, colors[2], 'hairL'),
      mkPiece('s30', 4.4, -3.4, 60, colors[2], 'hairR'),
      mkPiece('petal', -2.0, 6.0, 210, colors[3], 'bowL'),
      mkPiece('petal', 2.0, 6.0, 150, colors[3], 'bowR'),
      mkPiece('e', 0, 5.2, 180, colors[4], 'collar'),
    ];
  }
  // 자전거 — 바퀴 2개(각 4조각)
  function genBike(colors) {
    const left = genWheel(4, colors.slice(0, 4), -5.4, 2.0).map((p, i) => Object.assign({}, p, { tag: 'wL' + i }));
    const rc = colors.slice(4, 6).concat(colors.slice(0, 2));
    const right = genWheel(4, rc, 5.4, 2.0).map((p, i) => Object.assign({}, p, { tag: 'wR' + i }));
    return left.concat(right);
  }

  /* ─────────── 고정 장식(눈·미소 등) ─────────── */
  const eye = (x, y, r) => ({ t: 'eye', x, y, r: r || 0.6 });
  const dot = (x, y, r, c) => ({ t: 'dot', x, y, r, c });
  const smile = (x, y, w, h) => ({ t: 'smile', x, y, w, h });
  const line = (x1, y1, x2, y2, w, c) => ({ t: 'line', x1, y1, x2, y2, w: w || 0.45, c: c || '#8A5A38' });

  function sunDeco() {
    const rays = [];
    for (let a = 0; a < 360; a += 60) {
      const [x0, y0] = polar(0, 0, a, 4.9), [x1, y1] = polar(0, 0, a, 6.3);
      rays.push(line(x0, y0, x1, y1, 0.5, '#FFC94D'));
    }
    return rays.concat([eye(-1.3, -1.0, 0.55), eye(1.3, -1.0, 0.55), smile(0, 1.0, 2.2, 1.0)]);
  }
  function wormDeco(n) {
    const h = wormHead(n);
    return [eye(h.x - 0.6, h.y - 2.2, 0.5), eye(h.x + 0.6, h.y - 2.2, 0.5), smile(h.x, h.y - 1.0, 1.6, 0.7),
      dot(-((n - 1) * 3.0) / 2 - 0.8, 0.4, 0.4, '#B5E655')];
  }
  function crabDeco() { return [eye(-1.4, -2.6, 0.55), eye(1.4, -2.6, 0.55)]; }
  function fishDeco() { return [eye(2.6, -0.6, 0.55), dot(6.6, 0, 0.5, '#FF9F40')]; }
  function birdDeco() { return [eye(1.4, -5.4, 0.5), dot(2.7, -4.9, 0.45, '#F2952A'),
    line(0, 3.8, 0, 9.5, 0.5, '#B08A5E'), dot(0, 9.6, 0.9, '#8D6E63')]; }
  function catDeco() { return [eye(-1.6, 0.6, 0.6), eye(1.6, 0.6, 0.6), dot(0, 2.0, 0.4, '#E0708F'),
    line(-3.4, 2.4, -6.4, 1.8, 0.28, '#333'), line(-3.4, 3.0, -6.4, 3.4, 0.28, '#333'),
    line(3.4, 2.4, 6.4, 1.8, 0.28, '#333'), line(3.4, 3.0, 6.4, 3.4, 0.28, '#333')]; }
  function snowmanDeco() { return [eye(-0.7, -4.9, 0.45), eye(0.7, -4.9, 0.45), dot(0, -3.9, 0.32, '#F2913B'),
    dot(0, -0.6, 0.38, '#333'), dot(0, 1.4, 0.38, '#333'), dot(0, 4.0, 0.38, '#333')]; }
  function clownDeco() { return [eye(-1.6, 0.4, 0.6), eye(1.6, 0.4, 0.6), dot(0, 2.0, 0.6, '#E0453A')]; }
  function bikeDeco() {
    return [line(-5.4, 2.0, 0, -2.4, 0.5, '#8D6E63'), line(0, -2.4, 5.4, 2.0, 0.5, '#8D6E63'),
      line(-5.4, 2.0, 5.4, 2.0, 0.5, '#8D6E63'), line(0, -2.4, 0, 0.6, 0.45, '#8D6E63'),
      dot(-5.4, 2.0, 0.5, '#607D8B'), dot(5.4, 2.0, 0.5, '#607D8B')];
  }

  /* ─────────── 퍼즐 30개(단계별 10) ───────────
   * PZ(level, id, name, emoji, pieces, deco) — rotate 는 단계3만 true. */
  function PZ(level, id, name, emoji, pieces, deco) {
    return { level, id, name, emoji, pieces, deco: deco || [], rotate: level === 3 };
  }

  const PUZZLES = [
    /* ── 단계1 — 조각 2~4개(시작해봐요) ── */
    PZ(1, 'l1-1', '해님', '🌞', genWheel(2, palette(0)), sunDeco()),
    PZ(1, 'l1-2', '해님', '🌞', genWheel(3, palette(2)), sunDeco()),
    PZ(1, 'l1-3', '바퀴', '🎡', genWheel(4, palette(0))),
    PZ(1, 'l1-4', '꽃',   '🌸', genFlower(4, palette(1))),
    PZ(1, 'l1-5', '꽃',   '🌼', genFlower(4, palette(3))),
    PZ(1, 'l1-6', '지렁이', '🐛', genWorm(3, palette(0)), wormDeco(3)),
    PZ(1, 'l1-7', '지렁이', '🐛', genWorm(3, palette(4)), wormDeco(3)),
    PZ(1, 'l1-8', '바퀴', '🎡', genWheel(4, palette(2))),
    PZ(1, 'l1-9', '해님', '🌞', genWheel(3, palette(5)), sunDeco()),
    PZ(1, 'l1-10', '꽃',  '🌸', genFlower(3, palette(2))),

    /* ── 단계2 — 조각 4~6개(중간 단계) ── */
    PZ(2, 'l2-1', '게', '🦀', genCrab(1, palette(0)), crabDeco()),
    PZ(2, 'l2-2', '게', '🦀', genCrab(1, palette(3)), crabDeco()),
    PZ(2, 'l2-3', '물고기', '🐟', genFish(0, palette(0)), fishDeco()),
    PZ(2, 'l2-4', '물고기', '🐟', genFish(1, palette(2)), fishDeco()),
    PZ(2, 'l2-5', '막대새', '🐦', genBird(palette(0)), birdDeco()),
    PZ(2, 'l2-6', '막대새', '🐦', genBird(palette(3)), birdDeco()),
    PZ(2, 'l2-7', '고양이', '🐱', genCat(palette(0), false), catDeco()),
    PZ(2, 'l2-8', '고양이', '🐱', genCat(palette(4), false), catDeco()),
    PZ(2, 'l2-9', '눈사람', '⛄', genSnowman(palette(1), false), snowmanDeco()),
    PZ(2, 'l2-10', '꽃', '🌻', genFlower(6, palette(2)).map(p => p), []),

    /* ── 단계3 — 조각 6~9개(높은 단계, 톡 눌러 돌리기) ── */
    PZ(3, 'l3-1', '지렁이', '🐛', genWorm(6, palette(1)), wormDeco(6)),
    PZ(3, 'l3-2', '지렁이', '🐛', genWorm(7, palette(4)), wormDeco(7)),
    PZ(3, 'l3-3', '지렁이', '🐛', genWorm(9, palette(2)), wormDeco(9)),
    PZ(3, 'l3-4', '꽃', '🌻', genFlower(8, palette(0)), []),
    PZ(3, 'l3-5', '게', '🦀', genCrab(2, palette(1)), crabDeco()),
    PZ(3, 'l3-6', '눈사람', '⛄', genSnowman(palette(0), true), snowmanDeco()),
    PZ(3, 'l3-7', '광대', '🤡', genClown(palette(0)), clownDeco()),
    PZ(3, 'l3-8', '광대', '🤡', genClown(palette(3)), clownDeco()),
    PZ(3, 'l3-9', '자전거', '🚲', genBike(palette(0)), bikeDeco()),
    PZ(3, 'l3-10', '무지개바퀴', '🎡', genWheel(8, palette(0)), []),
  ];

  const LEVELS = [
    { id: 1, icon: '🌈', name: '시작해봐요', desc: '조각 2~4개', cls: 'c-l1' },
    { id: 2, icon: '🌈', name: '중간 단계',   desc: '조각 4~6개', cls: 'c-l2' },
    { id: 3, icon: '🌈', name: '높은 단계',   desc: '조각 6~9개 · 돌리기', cls: 'c-l3' },
  ];
  const levelDef = id => LEVELS.find(l => l.id === id);
  const puzzlesOf = level => PUZZLES.filter(x => x.level === level);
  const puzzleById = id => PUZZLES.find(x => x.id === id) || null;

  const praises = ['우와, 완성했어요!', '멋지게 다 맞췄어요!', '색깔 박사님이네!', '참 잘했어요!', '반짝반짝 무지개 완성!'];

  return {
    ARC_SHAPES, hasShape, COLORS, COLOR_IDS, hasColor, colorMeta, palette,
    polar, arcPathD, pieceBBox, pictureBBox,
    PUZZLES, LEVELS, levelDef, puzzlesOf, puzzleById, praises,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = window.TangramData;
