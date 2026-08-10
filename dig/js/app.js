/* 앱 셸 — 홈(단계 3개) → 판 목록(단계별 10) → 발굴 놀이.
 *
 * 놀이 — 흙에 덮인 그림을 손가락으로 **쓸어서 걷어낸다**.
 *   흙판은 캔버스 두 장이다. 아래(pic-canvas)에 그림, 위(dirt-canvas)에 흙.
 *   문지른 자리는 위 캔버스에서 `globalCompositeOperation='destination-out'` 으로 지운다.
 *   그러면 아래 그림이 그 자리만 드러난다.
 *
 *   파낸 비율이 25%(DigData.REVEAL)를 넘으면 보기가 아래에서 올라온다.
 *   그 전에도 「알겠어」(돋보기)를 누르면 미리 볼 수 있다 — **더 팔지 지금 맞힐지 아이가 정한다.**
 *   적게 파고 맞힐수록 별이 많다(40% 이하 ⭐⭐⭐ / 65% 이하 ⭐⭐ / 그 위 ⭐).
 *
 * 무벌점 — 틀려도 잃는 것이 없다. 흙을 조금 더 걷어 주고 다시 고르면 된다.
 *   되돌아가기도, 다시 시작도, 별 0개도 없다. 별은 언제나 최소 1개.
 *
 * ⚠️ 흙 아래 그림은 색칠공부 밑그림(window.Pictures)을 그대로 쓴다 — 여기서 새로 그리지 않는다.
 * ⚠️ 캔버스에는 border 를 주지 않는다(테두리는 감싸는 상자의 box-shadow).
 *    border 가 있으면 getBoundingClientRect 가 밀려 파는 자리가 어긋난다.
 */
window.App = (() => {
  const D = window.DigData;
  const A = window.Audio2;
  const P = window.Progress;
  const PIC = window.Pictures;
  const $ = id => document.getElementById(id);

  const RES = 480;                 // 캔버스 속 해상도(화면 크기와 무관)
  const VB = 100;                  // 그림 좌표계 한 변
  const BRUSH = RES * 0.075;       // 손가락 붓 반지름
  const SAMPLE = 6;                // 파낸 비율을 잴 때 몇 픽셀마다 볼지
  const MEASURE_MS = 60;           // 문지르는 동안 비율 재는 간격

  // 무리별 옅은 색 — 드러난 그림이 흙 위에서 또렷하게 보이도록 닫힌 도형을 옅게 칠한다
  const TINT = { animal: '#FFEFD8', food: '#FFE6E6', vehicle: '#E4EEFB', nature: '#E6F5E2' };

  /* 손그림 아이콘 — index.html <defs> 의 <symbol> 을 가져다 쓴다 */
  const ic = (id, cls) => '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#dg-' + id + '"/></svg>';

  let picCanvas = null, pctx = null, dirtCanvas = null, dctx = null;

  /* ─────────── 화면 전환 ─────────── */
  let screenId = 'scr-home';
  function showScreen(id) {
    A.stop();
    screenId = id;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id === 'scr-home') renderHome();
  }

  /* ─────────── 홈: 단계 3개 ─────────── */
  function renderHome() {
    $('home-stars').textContent = P.stars();
    const menu = $('menu');
    menu.innerHTML = '';
    D.LEVELS.forEach(lv => {
      const ids = D.roundsOf(lv.id).map(x => x.id);
      const done = P.doneCount(ids);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-card ' + lv.cls;
      b.innerHTML =
        '<span class="mc-pic">' + miniMound(lv.id) + '</span>' +
        '<span class="mc-name">' + lv.name + '</span>' +
        '<span class="mc-desc">' + lv.desc + '</span>' +
        '<span class="mc-prog">' + (done ? ic('star') + ' ' + done + ' / ' + ids.length : '처음이야!') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openList(lv); });
      menu.appendChild(b);
    });
  }

  // 단계 그림 — 흙더미에서 그림이 반쯤 드러난 모습(단계마다 다른 그림으로)
  function miniMound(level) {
    const list = D.roundsOf(level);
    const pic = PIC.byId(list[(level - 1) % list.length].pic);
    return '<span class="mound">' +
      '<span class="mound-pic">' + (pic ? PIC.svg(pic) : '') + '</span>' +
      '<span class="mound-dirt">' + ic('mound') + '</span>' +
      '</span>';
  }

  /* ─────────── 판 목록 ─────────── */
  let curLevel = null;
  function openList(lv) {
    curLevel = lv;
    $('list-title').innerHTML = ic('shovel', 'ic-title') + ' ' + lv.name;
    const list = D.roundsOf(lv.id);
    $('list-count').textContent = P.doneCount(list.map(x => x.id)) + ' / ' + list.length;
    const box = $('list');
    box.innerHTML = '';
    list.forEach((rd, i) => {
      const done = P.isDone(rd.id);
      const best = P.bestOf(rd.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'puzzle-card' + (done ? ' done' : '');
      b.dataset.id = rd.id;
      // ⚠️ 목록에는 숨은 그림을 보여 주지 않는다 — 흙더미만 보인다(미리 알면 재미가 없다)
      b.innerHTML =
        '<span class="pz-no">' + (i + 1) + '</span>' +
        '<span class="pz-mound">' + ic('mound') + '</span>' +
        '<span class="pz-badge">' +
          (done ? new Array(Math.max(1, best)).fill(ic('star')).join('') : ic('shovel')) +
        '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPlay(rd); });
      box.appendChild(b);
    });
    showScreen('scr-list');
  }

  /* ─────────── 흙판 만들기 ─────────── */
  function ensureCanvas() {
    if (dctx) return;
    picCanvas = $('pic-canvas');
    dirtCanvas = $('dirt-canvas');
    picCanvas.width = picCanvas.height = RES;
    dirtCanvas.width = dirtCanvas.height = RES;
    pctx = picCanvas.getContext('2d');
    dctx = dirtCanvas.getContext('2d', { willReadFrequently: true });
    bindDigging();
  }

  // 아래 캔버스: 색칠공부 밑그림을 그대로 그린다(0~100 좌표 → 캔버스)
  function drawPicture(pic) {
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.clearRect(0, 0, RES, RES);
    pctx.fillStyle = '#FFFDF6';
    pctx.fillRect(0, 0, RES, RES);
    pctx.save();
    pctx.scale(RES / VB, RES / VB);
    pctx.lineJoin = 'round';
    pctx.lineCap = 'round';
    pctx.lineWidth = 1.8;
    const tint = TINT[pic.cat] || '#FFF3E2';
    for (const it of pic.items) {
      const d = typeof it === 'string' ? it : it.d;
      const p = new Path2D(d);
      if (typeof it === 'object' && it.f) {
        pctx.fillStyle = '#3A2E26';           // 눈·코 같은 작은 점은 검게
        pctx.fill(p);
      } else if (/z\s*$/i.test(d)) {
        pctx.fillStyle = tint;                // 닫힌 도형만 옅게 칠한다(열린 선은 칠하면 뭉갠다)
        pctx.fill(p);
      }
      pctx.strokeStyle = '#3A2E26';
      pctx.stroke(p);
    }
    pctx.restore();
  }

  // 위 캔버스: 흙 (결정적 난수 — 판마다 같은 모습이 나온다)
  function drawDirt(seed) {
    dctx.setTransform(1, 0, 0, 1, 0, 0);
    dctx.globalCompositeOperation = 'source-over';
    dctx.clearRect(0, 0, RES, RES);
    const g = dctx.createLinearGradient(0, 0, RES, RES);
    g.addColorStop(0, '#9A7550');
    g.addColorStop(0.55, '#7E5C3C');
    g.addColorStop(1, '#6A4B2F');
    dctx.fillStyle = g;
    dctx.fillRect(0, 0, RES, RES);
    let s = (seed || 1) * 7919 + 12345;
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    // 흙 알갱이
    for (let i = 0; i < 1100; i++) {
      const x = rnd() * RES, y = rnd() * RES, r = 1 + rnd() * 3.4;
      const dark = rnd() < 0.5;
      dctx.fillStyle = dark ? 'rgba(58,40,24,.30)' : 'rgba(214,182,146,.34)';
      dctx.beginPath();
      dctx.arc(x, y, r, 0, Math.PI * 2);
      dctx.fill();
    }
    // 굵은 돌멩이 몇 개
    for (let i = 0; i < 16; i++) {
      const x = rnd() * RES, y = rnd() * RES, r = 5 + rnd() * 9;
      dctx.fillStyle = 'rgba(120,104,86,.45)';
      dctx.beginPath();
      dctx.ellipse(x, y, r, r * (0.6 + rnd() * 0.5), rnd() * 3, 0, Math.PI * 2);
      dctx.fill();
    }
    dctx.globalCompositeOperation = 'destination-out';
  }

  /* ─────────── 파내기 ─────────── */
  function eraseDot(x, y, r) {
    dctx.globalCompositeOperation = 'destination-out';
    dctx.fillStyle = '#000';
    dctx.beginPath();
    dctx.arc(x, y, r || BRUSH, 0, Math.PI * 2);
    dctx.fill();
  }
  function eraseLine(x0, y0, x1, y1, w) {
    dctx.globalCompositeOperation = 'destination-out';
    dctx.strokeStyle = '#000';
    dctx.lineCap = 'round';
    dctx.lineJoin = 'round';
    dctx.lineWidth = w || BRUSH * 2;
    dctx.beginPath();
    dctx.moveTo(x0, y0);
    dctx.lineTo(x1, y1);
    dctx.stroke();
  }

  /** 지금 얼마나 파냈나 (0~1) — 흙 캔버스의 투명해진 픽셀 비율을 실제로 센다 */
  function measure() {
    if (!dctx) return 0;
    const img = dctx.getImageData(0, 0, RES, RES).data;
    let total = 0, clear = 0;
    for (let y = 0; y < RES; y += SAMPLE) {
      for (let x = 0; x < RES; x += SAMPLE) {
        total++;
        if (img[(y * RES + x) * 4 + 3] < 40) clear++;
      }
    }
    return total ? clear / total : 0;
  }

  /* ─────────── 놀이 상태 ─────────── */
  let cur = null;   // { round, pic, ratio, answerRatio, misses, revealed, locked, stars }
  let lastMeasure = 0;

  function openPlay(rd) {
    ensureCanvas();
    const pic = PIC.byId(rd.pic);
    cur = {
      round: rd, pic,
      ratio: 0, answerRatio: null,
      misses: 0, revealed: false, locked: false, stars: 0, dug: false,
    };
    $('play-title').innerHTML = ic('shovel', 'ic-title') + ' ' + D.levelDef(rd.level).name;
    drawPicture(pic);
    drawDirt(rd.id.length + rd.level * 31 + rd.id.charCodeAt(rd.id.length - 1));
    $('rub-hint').classList.remove('gone');
    $('choice-bar').classList.remove('on');
    $('choice-bar').innerHTML = '';
    $('btn-peek').disabled = false;
    renderChoices();
    updateStarHint();
    showScreen('scr-play');
    setTimeout(() => { if (cur && !cur.locked) A.speak('무엇이 숨어 있을까? 손가락으로 쓱쓱 문질러 봐!'); }, 350);
  }

  // 보기 단추 — 흙을 어느 정도 파야 올라온다(그 전에는 상자째 감춰 둔다)
  function renderChoices() {
    const box = $('choice-bar');
    box.innerHTML = '';
    cur.round.choices.forEach(cid => {
      const p = PIC.byId(cid);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice-btn';
      b.dataset.pic = cid;
      b.innerHTML =
        '<span class="cb-pic">' + (p ? PIC.svg(p) : '') + '</span>' +
        '<span class="cb-name">' + (p ? p.name : cid) + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); pick(cid, b); });
      box.appendChild(b);
    });
  }

  function showChoices(byPeek) {
    if (!cur || cur.revealed) return;
    cur.revealed = true;
    $('choice-bar').classList.add('on');
    $('btn-peek').disabled = true;
    A.sfx.reveal();
    if (byPeek) setTimeout(() => { if (cur && !cur.locked) A.speak('무엇일까? 골라 볼까?'); }, 200);
  }

  function updateStarHint() {
    const n = D.starsFor(cur ? cur.ratio : 0, cur ? cur.misses : 0);
    let html = '';
    for (let i = 1; i <= 3; i++) html += '<span class="sh' + (i <= n ? '' : ' off') + '">' + ic('star') + '</span>';
    $('star-hint').innerHTML = html;
  }

  // 문지른 뒤 — 비율을 다시 재고 보기 등장·별 표시를 갱신한다
  function afterDig(force) {
    if (!cur || cur.locked) return;
    const now = Date.now();
    if (!force && now - lastMeasure < MEASURE_MS) return;
    lastMeasure = now;
    cur.ratio = measure();
    updateStarHint();
    if (cur.ratio >= D.REVEAL) showChoices(false);
  }

  /* ─────────── 손가락 배선 ─────────── */
  function bindDigging() {
    let drawing = false, lx = 0, ly = 0;
    const at = ev => {
      const r = dirtCanvas.getBoundingClientRect();
      return {
        x: (ev.clientX - r.left) / r.width * RES,
        y: (ev.clientY - r.top) / r.height * RES,
      };
    };
    dirtCanvas.addEventListener('pointerdown', ev => {
      if (!cur || cur.locked) return;
      ev.preventDefault();
      drawing = true;
      try { dirtCanvas.setPointerCapture(ev.pointerId); } catch (e) {}
      const p = at(ev);
      lx = p.x; ly = p.y;
      eraseDot(p.x, p.y);
      cur.dug = true;
      $('rub-hint').classList.add('gone');
      A.sfx.dig();
      afterDig(true);
    });
    dirtCanvas.addEventListener('pointermove', ev => {
      if (!drawing || !cur || cur.locked) return;
      ev.preventDefault();
      const p = at(ev);
      eraseLine(lx, ly, p.x, p.y, BRUSH * 2);
      lx = p.x; ly = p.y;
      A.sfx.dig();
      afterDig(false);
    });
    const end = () => { if (!drawing) return; drawing = false; afterDig(true); };
    dirtCanvas.addEventListener('pointerup', end);
    dirtCanvas.addEventListener('pointercancel', end);
    dirtCanvas.addEventListener('pointerleave', end);
  }

  /* ─────────── 보기 고르기 ─────────── */
  function pick(cid, btn) {
    if (!cur || cur.locked) return;
    if (cid === cur.round.pic) { complete(); return; }
    // 틀림 — 벌점 없음. 흙만 조금 더 걷어 주고 다시 고르게 한다.
    cur.misses++;
    if (btn) { btn.classList.add('miss'); btn.disabled = true; }
    A.sfx.soft();
    A.speak('음… 조금 더 파 볼까?');
    digMore(0.16);
    updateStarHint();
  }

  /** 흙을 조금 더 걷어낸다 — 아직 안 판 자리를 골라 부드럽게 벗긴다 */
  function digMore(amount) {
    const want = Math.min(0.98, measure() + amount);
    let s = 20250810;
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    for (let i = 0; i < 400 && measure() < want; i++) {
      eraseDot(rnd() * RES, rnd() * RES, BRUSH * 1.15);
    }
    afterDig(true);
  }

  /* ─────────── 완성 ─────────── */
  function complete() {
    const rd = cur.round;
    cur.locked = true;
    cur.answerRatio = cur.ratio = measure();          // 별은 **맞힌 순간까지 판 양**으로 정한다
    const stars = cur.stars = D.starsFor(cur.answerRatio, cur.misses);
    const first = !P.isDone(rd.id);
    P.markDone(rd.id, stars);
    P.addStar(stars);
    if (window.Pet) Pet.awardSnack(1);
    // 한 단계를 처음으로 다 깨면 펫 식사 보상
    if (first && window.Pet) {
      const ids = D.roundsOf(rd.level).map(x => x.id);
      if (P.doneCount(ids) >= ids.length) Pet.awardMeal(1);
    }
    A.sfx.good();
    revealAll(() => {
      burstConfetti();
      A.sfx.fanfare();
      const praise = D.praises[Math.floor(Math.random() * D.praises.length)];
      setTimeout(() => A.speak(cur.pic.name + '! ' + praise), 200);
      setTimeout(() => showReward(praise), 520);
    });
  }

  // 남은 흙을 스르륵 걷어 그림을 다 보여 준다
  function revealAll(done) {
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const r = BRUSH * (1.2 + step * 0.9);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + step;
        eraseDot(RES / 2 + Math.cos(a) * r * 0.9, RES / 2 + Math.sin(a) * r * 0.9, r);
      }
      eraseDot(RES / 2, RES / 2, r);
      if (step >= 6) {
        clearInterval(timer);
        dctx.setTransform(1, 0, 0, 1, 0, 0);
        dctx.clearRect(0, 0, RES, RES);
        if (done) done();
      }
    }, 55);
  }

  /* ─────────── 보상 오버레이 ─────────── */
  function showReward(praise) {
    $('reward-praise').textContent = praise;
    $('reward-face').innerHTML = '<span class="rw-pic">' + PIC.svg(cur.pic) + '</span>' +
      '<span class="rw-name">' + cur.pic.name + '</span>';
    let st = '';
    for (let i = 1; i <= 3; i++) st += '<span class="sh' + (i <= cur.stars ? '' : ' off') + '">' + ic('star') + '</span>';
    $('reward-stars').innerHTML = st;
    $('reward').classList.add('on');
  }
  function nextRound() {
    const list = D.roundsOf(cur.round.level);
    const idx = list.findIndex(x => x.id === cur.round.id);
    for (let k = 1; k <= list.length; k++) {
      const cand = list[(idx + k) % list.length];
      if (!P.isDone(cand.id)) { openPlay(cand); return; }
    }
    openList(D.levelDef(cur.round.level));
  }

  /* ─────────── 색종이 축하 ─────────── */
  function burstConfetti() {
    const box = $('confetti');
    box.innerHTML = '';
    const colors = ['#C99A5B', '#FFC63D', '#7CC242', '#5CB8E8', '#FF8FB0', '#B57CE0'];
    for (let i = 0; i < 34; i++) {
      const p = document.createElement('i');
      p.className = 'cf';
      p.style.left = (5 + Math.random() * 90) + '%';
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = (Math.random() * 0.3) + 's';
      p.style.animationDuration = (1.1 + Math.random() * 0.9) + 's';
      p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      p.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
      if (Math.random() < 0.5) p.style.borderRadius = '50%';
      box.appendChild(p);
    }
    setTimeout(() => { box.innerHTML = ''; }, 2400);
  }

  /* ─────────── 초기화 ─────────── */
  function init() {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());

    document.querySelectorAll('[data-go]').forEach(b => {
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); showScreen(b.dataset.go); });
    });
    $('btn-play-back').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      openList(D.levelDef(cur ? cur.round.level : 1));
    });
    $('btn-peek').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      if (!cur || cur.locked) return;
      showChoices(true);
    });
    $('btn-listen').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      if (!cur) return;
      if (cur.locked) { A.speak(cur.pic.name + ' 이었어요!'); return; }
      if (cur.revealed) A.speak('무엇이 숨어 있었을까? 하나 골라 봐!');
      else A.speak('손가락으로 쓱쓱 문질러 흙을 걷어 봐!');
    });
    $('reward-next').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on'); nextRound();
    });
    $('reward-close').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on');
      openList(D.levelDef(cur.round.level));
    });

    renderHome();
  }
  init();

  /* ─────────── 종단 테스트용 ─────────── */
  function debug() {
    return {
      screen: screenId,
      stars: P.stars(),
      level: cur ? cur.round.level : null,
      roundId: cur ? cur.round.id : null,
      answer: cur ? cur.round.pic : null,
      choices: cur ? cur.round.choices.slice() : null,
      ratio: cur ? cur.ratio : null,
      measured: cur ? measure() : null,
      answerRatio: cur ? cur.answerRatio : null,
      revealed: cur ? cur.revealed : null,
      misses: cur ? cur.misses : null,
      locked: cur ? cur.locked : null,
      lastStars: cur ? cur.stars : null,
      done: cur ? P.isDone(cur.round.id) : null,
      dug: cur ? cur.dug : null,
    };
  }
  // 목표 비율까지 판다 (검사용 — 손가락 대신 줄무늬로 걷어낸다)
  function digTo(target) {
    if (!cur || cur.locked) return 0;
    const step = BRUSH * 1.4;
    let y = BRUSH, guard = 0;
    while (measure() < target && guard++ < 300) {
      eraseLine(0, y, RES, y, BRUSH * 2);
      y += step;
      if (y > RES + BRUSH) y = BRUSH * (0.4 + (guard % 4) * 0.25);
    }
    cur.dug = true;
    afterDig(true);
    return cur.ratio;
  }
  return {
    debug,
    _digTo: digTo,
    _pick: (cid) => pick(cid, document.querySelector('.choice-btn[data-pic="' + cid + '"]')),
    _peek: () => showChoices(true),
    _measure: () => measure(),
  };
})();
