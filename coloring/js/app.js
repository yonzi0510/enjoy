/* 앱 셸 — 홈(그림 고르기)/색칠하기/갤러리 화면 전환과 흐름 */
window.App = (() => {
  const A = window.Audio2;
  const P = window.Progress;
  const PIC = window.Pictures;

  // 팔레트 12색 + 무지개
  const PALETTE = [
    { c: '#E8483F', name: '빨강' }, { c: '#FF8A3D', name: '주황' }, { c: '#FFD23D', name: '노랑' },
    { c: '#7BC043', name: '연두' }, { c: '#2F9E5B', name: '초록' }, { c: '#3DB6E8', name: '하늘' },
    { c: '#3B6FE0', name: '파랑' }, { c: '#8A5BD6', name: '보라' }, { c: '#E85D9A', name: '분홍' },
    { c: '#A9713C', name: '갈색' }, { c: '#8A8F99', name: '회색' }, { c: '#333844', name: '검정' },
    { c: 'rb', name: '무지개' },
  ];
  const SIZES = [{ w: 14, n: '가늘게' }, { w: 26, n: '보통' }, { w: 42, n: '굵게' }];

  const $ = id => document.getElementById(id);

  let painter = null;
  let cur = { pic: null, dirty: false };
  let color = PALETTE[0].c;
  let tool = 'fill';        // 'fill' | 'crayon' | 'erase'
  let sizeIdx = 1;
  let filterCat = 'all';
  let clearArmed = false;

  /* ─────────── 화면 전환 ─────────── */
  function showScreen(id) {
    A.stop();
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id === 'scr-home') renderHome();
    if (id === 'scr-gallery') renderGallery();
  }

  /* ─────────── 홈 ─────────── */
  function renderHome() {
    $('home-stars').textContent = P.stars();
    $('gallery-badge').textContent = P.galleryCount();
    // 카테고리 칩
    const chips = $('cat-chips');
    chips.innerHTML = '';
    const cats = [{ id: 'all', emoji: '🎨', name: '전체' }].concat(PIC.CATS);
    cats.forEach(cat => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cat-chip' + (cat.id === filterCat ? ' on' : '');
      b.innerHTML = '<span class="cc-emoji">' + cat.emoji + '</span><span>' + cat.name + '</span>';
      b.addEventListener('click', ev => {
        ev.preventDefault(); A.sfx.tap();
        filterCat = cat.id; renderHome();
      });
      chips.appendChild(b);
    });
    // 썸네일 그리드
    const grid = $('pic-grid');
    grid.innerHTML = '';
    PIC.PICTURES.filter(p => filterCat === 'all' || p.cat === filterCat).forEach(p => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pic-card';
      b.dataset.id = p.id;
      b.innerHTML =
        '<span class="pc-thumb">' + PIC.svg(p) + '</span>' +
        '<span class="pc-name">' + p.emoji + ' ' + p.name + '</span>' +
        (P.isDone(p.id) ? '<span class="pc-done">⭐</span>' : '');
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPaint(p); });
      grid.appendChild(b);
    });
  }

  /* ─────────── 색칠하기 ─────────── */
  function ensurePainter() {
    if (painter) return painter;
    painter = Paint.Painter($('paint-canvas'), {
      color: () => color,
      tool: () => tool,
      size: () => SIZES[sizeIdx].w,
      onChange: () => { cur.dirty = true; },
    });
    return painter;
  }

  function openPaint(pic) {
    cur = { pic, dirty: false };
    clearArmed = false;
    $('paint-title').textContent = pic.emoji + ' ' + pic.name;
    showScreen('scr-paint');
    ensurePainter().load(pic);
    updateClearBtn();
    setTimeout(() => A.speak(pic.name + '! 예쁘게 색칠해 볼까?'), 350);
  }

  function selectColor(c, btn) {
    color = c;
    // 색을 고르면 자동으로 칠하기 도구로 (지우개였다면 크레용/물통 복귀)
    if (tool === 'erase') setTool('fill');
    document.querySelectorAll('#palette .swatch').forEach(s => s.classList.toggle('on', s === btn));
  }
  function setTool(t) {
    tool = t;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
    $('size-row').classList.toggle('dim', t === 'fill'); // 물통엔 굵기 무의미
  }
  function setSize(i, btn) {
    sizeIdx = i;
    document.querySelectorAll('#size-row .size-btn').forEach(s => s.classList.toggle('on', s === btn));
  }

  function updateClearBtn() {
    const b = $('btn-clear');
    b.classList.toggle('armed', clearArmed);
    b.textContent = clearArmed ? '정말?' : '🗑️';
  }

  function doUndo() {
    A.sfx.pop();
    ensurePainter().undo();
    clearArmed = false; updateClearBtn();
  }
  function doClear() {
    if (!clearArmed) { // 한 번 더 눌러 확인 (실수 방지)
      clearArmed = true; updateClearBtn(); A.sfx.tap();
      setTimeout(() => { clearArmed = false; updateClearBtn(); }, 2500);
      return;
    }
    clearArmed = false; updateClearBtn();
    A.sfx.pop();
    ensurePainter().clearAll();
  }

  function doSave() {
    A.sfx.fanfare();
    const url = ensurePainter().toDataURL();
    const first = P.complete(cur.pic.id, { pic: cur.pic.id, name: cur.pic.name, emoji: cur.pic.emoji, url });
    cur.dirty = false;
    if (window.Pet) Pet.awardSnack(1);
    confetti();
    showReward(cur.pic.name + ' 완성! 참 잘했어요!', '갤러리 보기 🖼️', () => showScreen('scr-gallery'),
      () => showScreen('scr-home'));
    A.speak(cur.pic.name + ' 색칠 완성! 정말 멋져요!');
    return first;
  }

  /* ─────────── 갤러리 ─────────── */
  function renderGallery() {
    const arts = P.gallery();
    $('gallery-count').textContent = arts.length + '장';
    const grid = $('gallery-grid');
    grid.innerHTML = '';
    if (!arts.length) {
      grid.innerHTML = '<p class="gallery-empty">아직 완성한 그림이 없어요.<br>그림을 골라 색칠하고 💾 로 보관해요! 🎨</p>';
      return;
    }
    arts.forEach(a => {
      const card = document.createElement('div');
      card.className = 'art-card';
      const img = document.createElement('img');
      img.className = 'art-img';
      img.alt = a.name;
      img.src = a.url;
      const cap = document.createElement('div');
      cap.className = 'art-cap';
      cap.textContent = (a.emoji ? a.emoji + ' ' : '') + a.name;
      card.appendChild(img);
      card.appendChild(cap);
      card.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); A.speak(a.name); });
      grid.appendChild(card);
    });
  }

  /* ─────────── 보상 오버레이 ─────────── */
  let rewardNextFn = null, rewardCloseFn = null;
  function showReward(praise, nextLabel, onNext, onClose) {
    $('reward-praise').textContent = praise;
    $('reward-next').textContent = nextLabel;
    rewardNextFn = onNext;
    rewardCloseFn = onClose || null;
    $('reward-close').hidden = !onClose;
    $('reward').classList.add('on');
  }

  // 색종이 축하 — 잠깐 색 조각이 흩날린다 (외부 라이브러리 없음)
  function confetti() {
    const box = $('confetti');
    box.innerHTML = '';
    const cols = ['#E8483F', '#FF8A3D', '#FFD23D', '#7BC043', '#3DB6E8', '#8A5BD6', '#E85D9A'];
    for (let i = 0; i < 28; i++) {
      const s = document.createElement('span');
      s.className = 'confetti-bit';
      s.style.left = Math.random() * 100 + '%';
      s.style.background = cols[i % cols.length];
      s.style.animationDelay = (Math.random() * 0.3) + 's';
      s.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
      box.appendChild(s);
    }
    box.classList.add('on');
    setTimeout(() => { box.classList.remove('on'); box.innerHTML = ''; }, 1600);
  }

  /* ─────────── 초기화 ─────────── */
  function init() {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());

    // 팔레트
    const pal = $('palette');
    PALETTE.forEach((p, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch' + (p.c === 'rb' ? ' sw-rb' : '');
      b.setAttribute('aria-label', p.name);
      b.dataset.color = p.c;
      if (p.c !== 'rb') b.style.background = p.c;
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); selectColor(p.c, b); });
      pal.appendChild(b);
      if (i === 0) b.classList.add('on');
    });
    // 굵기
    const sr = $('size-row');
    SIZES.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'size-btn' + (i === sizeIdx ? ' on' : '');
      b.setAttribute('aria-label', s.n);
      b.innerHTML = '<span class="size-dot" style="width:' + (s.w / 2.6) + 'px;height:' + (s.w / 2.6) + 'px"></span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); setSize(i, b); });
      sr.appendChild(b);
    });
    // 도구
    document.querySelectorAll('.tool-btn').forEach(b => {
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); setTool(b.dataset.tool); });
    });
    setTool('fill');

    // 조작 버튼
    $('btn-undo').addEventListener('click', ev => { ev.preventDefault(); doUndo(); });
    $('btn-clear').addEventListener('click', ev => { ev.preventDefault(); doClear(); });
    $('btn-save').addEventListener('click', ev => { ev.preventDefault(); doSave(); });

    // 뒤로가기
    $('btn-paint-back').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); showScreen('scr-home'); });
    $('btn-gallery-back').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); showScreen('scr-home'); });
    $('btn-gallery').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); showScreen('scr-gallery'); });

    // 보상
    $('reward-next').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      $('reward').classList.remove('on');
      if (rewardNextFn) rewardNextFn();
    });
    $('reward-close').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      $('reward').classList.remove('on');
      if (rewardCloseFn) rewardCloseFn();
    });

    renderHome();
  }
  init();

  // 종단 테스트용
  function debug() {
    return {
      stars: P.stars(),
      tool, color, sizeIdx,
      picId: cur.pic ? cur.pic.id : null,
      dirty: cur.dirty,
      galleryCount: P.galleryCount(),
      doneCount: P.doneCount(),
      painted: painter ? painter.paintedCount() : 0,
      clearArmed,
    };
  }
  // 보이는 캔버스(색+선 합성)의 그림공간 좌표 픽셀 — 선이 남아있는지 검사용
  function canvasPixel(vbx, vby) {
    const c = $('paint-canvas');
    const ctx = c.getContext('2d');
    const s = c.width / PIC.VB;
    const d = ctx.getImageData(Math.round(vbx * s), Math.round(vby * s), 1, 1).data;
    return [d[0], d[1], d[2], d[3]];
  }

  return {
    showScreen, debug, canvasPixel,
    _painter: () => painter,
    _openFirst: () => openPaint(PIC.PICTURES[0]),
    _setTool: setTool, _setColor: c => { color = c; },
    _save: doSave, _undo: doUndo,
  };
})();
