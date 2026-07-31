/* 선 따라 그리기 데이터 — 안내선(점선 경로)을 매개변수로 그때그때 계산해 낸다.
 * 실제 페이지 도안집("펀펜컨트롤")처럼 귀여운 캐릭터 얼굴 옆에서 뻗어나가는 점선을
 * 아이가 손가락(또는 펜)으로 따라 그린다 — 곧은 햇살(rays) · 물결(wave) · 지그재그(zigzag) ·
 * 돌돌 말린 소용돌이(spiral) 네 가지.
 * 좌표계는 정사각 640×640 논리 캔버스(lines/js/ink.js 의 W,H 와 반드시 같아야 한다).
 * guideOf(퍼즐) → 경로 배열(경로 하나 = {x,y} 점 배열) — ink.js 가 그대로 그리고 채점한다.
 * ⚠️ 퍼즐 id 는 아이 진행도(done 키)로 저장되므로 함부로 바꾸지 않는다.
 */
window.LinesData = (() => {
  const W = 640, H = 640; // 캔버스 논리 좌표계(정사각)

  // 캐릭터 얼굴 — 이모지만 쓴다(글자 없음, 5세 원칙)
  const CHARS = ['🐼', '🐰', '🦊', '🐻', '🐱', '🐨', '🐶', '🐹'];

  /* ─────────── 안내선 점 생성기(매개변수 → 경로 배열) ─────────── */

  // 햇살: 한 점에서 여러 방향으로 뻗는 곧은 선 다발. p: { cx, cy, len, angles:[도, …] }
  function genRays(p) {
    const steps = 14;
    return p.angles.map(deg => {
      const rad = deg * Math.PI / 180;
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        pts.push({ x: p.cx + Math.cos(rad) * p.len * t, y: p.cy + Math.sin(rad) * p.len * t });
      }
      return pts;
    });
  }

  // 소용돌이: 극좌표 나선 r = a + b·θ. p: { cx, cy, turns(바퀴 수), a(시작 반지름), maxR(끝 반지름), dir(1|-1) }
  function genSpiral(p) {
    const steps = 140;
    const totalAngle = p.turns * Math.PI * 2;
    const b = (p.maxR - p.a) / totalAngle;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const theta = t * totalAngle * (p.dir || 1);
      const r = p.a + b * t * totalAngle;
      pts.push({ x: p.cx + Math.cos(theta) * r, y: p.cy + Math.sin(theta) * r });
    }
    return [pts];
  }

  // 물결: y = amp·sin(x·freq). p: { x0, y0, len, amp, freq(구간 안 반복 수), vertical(세로로 쓸지) }
  function genWave(p) {
    const steps = 90;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const along = p.len * t;
      const off = Math.sin(t * Math.PI * 2 * p.freq) * p.amp;
      pts.push(p.vertical ? { x: p.x0 + off, y: p.y0 + along } : { x: p.x0 + along, y: p.y0 + off });
    }
    return [pts];
  }

  // 지그재그: 위아래로 꺾이는 곧은 선 이어붙이기. p: { x0, y0, len, amp, count(꺾임 수), vertical }
  function genZigzag(p) {
    const pts = [{ x: p.x0, y: p.y0 }];
    const step = p.len / p.count;
    for (let i = 1; i <= p.count; i++) {
      const along = step * i;
      const off = (i % 2 === 1 ? -1 : 1) * p.amp;
      pts.push(p.vertical ? { x: p.x0 + off, y: p.y0 + along } : { x: p.x0 + along, y: p.y0 + off });
    }
    return pts.length ? [pts] : [];
  }

  function guideOf(pz) {
    if (pz.type === 'ray') return genRays(pz.p);
    if (pz.type === 'spiral') return genSpiral(pz.p);
    if (pz.type === 'wave') return genWave(pz.p);
    if (pz.type === 'zigzag') return genZigzag(pz.p);
    return [];
  }
  // 캐릭터 얼굴을 놓을 기준점(안내선이 시작되는 자리)
  function originOf(pz) {
    if (pz.type === 'ray' || pz.type === 'spiral') return { x: pz.p.cx, y: pz.p.cy };
    return { x: pz.p.x0, y: pz.p.y0 };
  }

  /* ─────────── 단계 3개 ─────────── */
  const STAGES = [
    { id: 1, type: 'ray', icon: '☀️', name: '반짝반짝 선', desc: '뻗어나가는 곧은 선', cls: 'c-s1' },
    { id: 2, type: 'mix', icon: '🌊', name: '구불구불 선', desc: '물결·지그재그 선', cls: 'c-s2' },
    { id: 3, type: 'spiral', icon: '🌀', name: '돌돌 말린 선', desc: '소용돌이 선', cls: 'c-s3' },
  ];

  /* ─────────── 퍼즐 30개(단계별 10) ───────────
   * P(레벨, id, 종류, 매개변수) — CHARS 는 순서대로 돌려 쓴다. */
  let charSeq = 0;
  const P = (level, id, type, p) => ({ level, id, type, p, char: CHARS[(charSeq++) % CHARS.length] });

  const PUZZLES = [
    /* ── 단계1 — 햇살(rays), 점 하나에서 뻗는 곧은 선 ── */
    P(1, 'r1', 'ray', { cx: 320, cy: 320, len: 240, angles: [0, 72, 144, 216, 288] }),                 // 5줄기 온바퀴
    P(1, 'r2', 'ray', { cx: 320, cy: 320, len: 210, angles: [0, 60, 120, 180, 240, 300] }),            // 6줄기
    P(1, 'r3', 'ray', { cx: 320, cy: 320, len: 260, angles: [0, 90, 180, 270] }),                      // 4줄기 십자
    P(1, 'r4', 'ray', { cx: 320, cy: 320, len: 200, angles: [0, 45, 90, 135, 180, 225, 270, 315] }),   // 8줄기
    P(1, 'r5', 'ray', { cx: 320, cy: 320, len: 180, angles: [30, 90, 150, 210, 270, 330] }),           // 6줄기(기울임)
    P(1, 'r6', 'ray', { cx: 320, cy: 320, len: 230, angles: [10, 60, 110, 160, 210, 260, 310] }),      // 7줄기
    P(1, 'r7', 'ray', { cx: 320, cy: 520, len: 260, angles: [-150, -120, -90, -60, -30] }),            // 아래→위 부채꼴
    P(1, 'r8', 'ray', { cx: 320, cy: 120, len: 260, angles: [30, 60, 90, 120, 150] }),                 // 위→아래 부채꼴
    P(1, 'r9', 'ray', { cx: 520, cy: 320, len: 260, angles: [120, 150, 180, 210, 240] }),               // 오→왼 부채꼴
    P(1, 'r10', 'ray', { cx: 320, cy: 320, len: 250, angles: [90, 210, 330] }),                        // 3줄기 큰 세모

    /* ── 단계2 — 물결·지그재그, 이어지는 구불구불한 한 줄 (다섯 개씩 번갈아) ── */
    P(2, 'w1', 'wave', { x0: 90, y0: 320, len: 460, amp: 90, freq: 2, vertical: false }),
    P(2, 'z1', 'zigzag', { x0: 90, y0: 320, len: 460, amp: 90, count: 6, vertical: false }),
    P(2, 'w2', 'wave', { x0: 90, y0: 300, len: 460, amp: 120, freq: 1.5, vertical: false }),
    P(2, 'z2', 'zigzag', { x0: 90, y0: 300, len: 460, amp: 120, count: 4, vertical: false }),
    P(2, 'w3', 'wave', { x0: 90, y0: 340, len: 460, amp: 70, freq: 3, vertical: false }),
    P(2, 'z3', 'zigzag', { x0: 90, y0: 340, len: 460, amp: 70, count: 8, vertical: false }),
    P(2, 'w4', 'wave', { x0: 320, y0: 90, len: 460, amp: 100, freq: 2, vertical: true }),
    P(2, 'z4', 'zigzag', { x0: 320, y0: 90, len: 460, amp: 100, count: 5, vertical: true }),
    P(2, 'w5', 'wave', { x0: 300, y0: 90, len: 460, amp: 130, freq: 2.5, vertical: true }),
    P(2, 'z5', 'zigzag', { x0: 300, y0: 90, len: 460, amp: 130, count: 7, vertical: true }),

    /* ── 단계3 — 소용돌이(spiral), 계속 돌돌 말리는 한 줄 ── */
    P(3, 's1', 'spiral', { cx: 320, cy: 320, turns: 1.5, a: 14, maxR: 230, dir: 1 }),
    P(3, 's2', 'spiral', { cx: 320, cy: 320, turns: 1.75, a: 18, maxR: 240, dir: -1 }),
    P(3, 's3', 'spiral', { cx: 320, cy: 320, turns: 2, a: 12, maxR: 250, dir: 1 }),
    P(3, 's4', 'spiral', { cx: 320, cy: 320, turns: 2.25, a: 20, maxR: 260, dir: -1 }),
    P(3, 's5', 'spiral', { cx: 320, cy: 320, turns: 2.5, a: 16, maxR: 265, dir: 1 }),
    P(3, 's6', 'spiral', { cx: 320, cy: 320, turns: 2.75, a: 22, maxR: 270, dir: -1 }),
    P(3, 's7', 'spiral', { cx: 320, cy: 320, turns: 3, a: 14, maxR: 275, dir: 1 }),
    P(3, 's8', 'spiral', { cx: 320, cy: 320, turns: 1.75, a: 26, maxR: 245, dir: -1 }),
    P(3, 's9', 'spiral', { cx: 320, cy: 320, turns: 2.25, a: 18, maxR: 255, dir: 1 }),
    P(3, 's10', 'spiral', { cx: 320, cy: 320, turns: 2.5, a: 24, maxR: 260, dir: -1 }),
  ];

  const stageDef = id => STAGES.find(s => s.id === id);
  const puzzlesOf = level => PUZZLES.filter(x => x.level === level);
  const puzzleById = id => PUZZLES.find(x => x.id === id) || null;

  const praises = ['우와, 선을 예쁘게 그었어요!', '멋지게 다 그렸어요!', '길을 따라 척척!', '참 잘했어요!', '반짝반짝 예쁜 선이네요!'];
  const nudges = ['안내선을 따라 다시 그려 볼까?', '점선 위를 살살 따라가 보자!'];

  return {
    W, H, CHARS, STAGES, PUZZLES,
    genRays, genSpiral, genWave, genZigzag,
    guideOf, originOf, stageDef, puzzlesOf, puzzleById, praises, nudges,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = window.LinesData;
