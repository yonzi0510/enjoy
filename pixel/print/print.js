/* ═══════════ 픽셀 도안 인쇄 툴 ═══════════
 * 기존 도안(js/pictures/*.js)을 A4/A3 종이에 숫자 도안(문제지) + 번호별 색 범례로 출력.
 * 어르신 인지학습용 — 칸과 숫자를 용지에 최대한 크게 배치한다.
 * 화면에는 실제 인쇄 모습 그대로 미리보기를 보여 준다.
 */
(() => {
  const PICS = window.PIXELS || [];
  const $ = id => document.getElementById(id);
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const PAPERS = { A4: [210, 297], A3: [297, 420] };   // [짧은 변, 긴 변] mm
  const PAD = 12;                                       // 시트 여백 mm (print.css와 동일)

  const LEVELS = {
    1: { name: '쉬움', emoji: '🌱' },
    2: { name: '보통', emoji: '🌟' },
    3: { name: '어려움', emoji: '🔥' }
  };
  const picLevel = pic => LEVELS[pic.level] ? pic.level : 1;

  const state = {
    picId: PICS.length ? PICS[0].id : null,
    paper: 'A4',
    orient: 'auto',        // auto | portrait | landscape
    nameDate: true
  };

  /* ─────────── 도안 파싱 · 썸네일 (엔진과 동일 규칙) ─────────── */
  function parsePic(pic) {
    const H = pic.rows.length, W = pic.rows[0].length;
    const target = new Uint8Array(W * H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        target[y * W + x] = pic.rows[y].charCodeAt(x) - 48;
    return { W, H, target };
  }

  function makeThumb(pic) {
    const { W, H, target } = parsePic(pic);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    for (let i = 0; i < W * H; i++) {
      g.fillStyle = pic.palette[target[i]];
      g.fillRect(i % W, (i / W) | 0, 1, 1);
    }
    return c;
  }

  /* ─────────── 도안 선택 목록 ─────────── */
  function renderList() {
    const box = $('pic-list');
    box.innerHTML = '';
    [1, 2, 3].forEach(lv => {
      const pics = PICS.filter(p => picLevel(p) === lv);
      if (!pics.length) return;
      const head = document.createElement('div');
      head.className = 'level-head';
      head.textContent = LEVELS[lv].emoji + ' ' + LEVELS[lv].name;
      box.appendChild(head);
      const row = document.createElement('div');
      row.className = 'pic-row';
      pics.forEach(pic => {
        const { W, H } = parsePic(pic);
        const card = document.createElement('div');
        card.className = 'pic-card' + (pic.id === state.picId ? ' sel' : '');
        card.dataset.pic = pic.id;
        card.setAttribute('role', 'button');
        card.tabIndex = 0;
        const thumb = document.createElement('div');
        thumb.className = 'pic-thumb';
        thumb.appendChild(makeThumb(pic));
        card.appendChild(thumb);
        card.insertAdjacentHTML('beforeend',
          '<div class="pic-card-label">' + pic.emoji + ' ' + pic.name + '</div>' +
          '<div class="pic-card-size">' + W + '×' + H + ' · 색 ' + pic.palette.length + '개</div>');
        const pick = () => { state.picId = pic.id; renderList(); renderSheet(); };
        card.addEventListener('click', pick);
        card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
        row.appendChild(card);
      });
      box.appendChild(row);
    });
  }

  /* ─────────── 레이아웃 계산 (mm) ─────────── */
  // 격자 위에 놓이는 고정 요소들의 높이 추정 — 실제 인쇄와 살짝 달라도
  // 격자는 flex로 남은 공간에 들어가므로 넘치지 않는다.
  function fixedHeights(pic, innerW) {
    const headH = 11;                                    // 제목/이름·날짜 줄
    const hintH = 8;                                     // 안내 문구
    const perRow = Math.max(1, Math.floor((innerW + 5) / 24));   // 범례 1개 ≈ 19mm + 간격 5mm
    const rows = Math.ceil(pic.palette.length / perRow);
    const legendH = rows * 10 + (rows - 1) * 2.5 + 3;
    const footH = 6.5;
    const gridGap = 3;
    return headH + hintH + legendH + footH + gridGap;
  }

  // 주어진 용지 방향에서 칸 크기(mm)
  function cellSize(pic, pw, ph) {
    const { W, H } = parsePic(pic);
    const innerW = pw - PAD * 2, innerH = ph - PAD * 2;
    const availH = innerH - fixedHeights(pic, innerW);
    return Math.min(innerW / W, availH / H);
  }

  // 자동 방향: 칸이 더 커지는 쪽
  function paperDims(pic) {
    const [s, l] = PAPERS[state.paper];
    if (state.orient === 'portrait') return [s, l];
    if (state.orient === 'landscape') return [l, s];
    return cellSize(pic, s, l) >= cellSize(pic, l, s) ? [s, l] : [l, s];
  }

  /* ─────────── 숫자 격자 SVG ─────────── */
  function buildGridSvg(pic, cellMm) {
    const { W, H, target } = parsePic(pic);
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', (cellMm * W) + 'mm');
    svg.setAttribute('height', (cellMm * H) + 'mm');

    const bg = document.createElementNS(SVG_NS, 'rect');
    bg.setAttribute('width', W); bg.setAttribute('height', H);
    bg.setAttribute('fill', '#fff');
    svg.appendChild(bg);

    // 칸 숫자 (팔레트 인덱스 + 1 — 앱과 동일)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const num = target[y * W + x] + 1;
        const t = document.createElementNS(SVG_NS, 'text');
        t.setAttribute('x', x + 0.5);
        t.setAttribute('y', y + 0.5);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('dominant-baseline', 'central');
        t.setAttribute('font-size', num >= 10 ? 0.44 : 0.55);
        t.setAttribute('font-weight', '700');
        t.setAttribute('font-family', "'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif");
        t.setAttribute('fill', '#111');
        t.textContent = num;
        svg.appendChild(t);
      }
    }

    // 격자선: 얇은 선 + 5칸마다 굵은 선(위치 찾기 도움) + 외곽선
    const thin = [], major = [];
    for (let x = 1; x < W; x++) (x % 5 ? thin : major).push('M' + x + ' 0V' + H);
    for (let y = 1; y < H; y++) (y % 5 ? thin : major).push('M0 ' + y + 'H' + W);
    const mkPath = (d, w, color) => {
      const p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('stroke', color);
      p.setAttribute('stroke-width', w);
      p.setAttribute('fill', 'none');
      return p;
    };
    if (thin.length) svg.appendChild(mkPath(thin.join(''), 0.03, '#b5b5b5'));
    if (major.length) svg.appendChild(mkPath(major.join(''), 0.07, '#7a7a7a'));
    const border = document.createElementNS(SVG_NS, 'rect');
    border.setAttribute('width', W); border.setAttribute('height', H);
    border.setAttribute('fill', 'none');
    border.setAttribute('stroke', '#222');
    border.setAttribute('stroke-width', 0.12);
    svg.appendChild(border);
    return svg;
  }

  /* ─────────── 시트(종이) 렌더 ─────────── */
  function renderSheet() {
    const pic = PICS.find(p => p.id === state.picId);
    if (!pic) return;
    const [pw, ph] = paperDims(pic);

    // @page 크기 주입 → 브라우저 인쇄 대화상자가 용지·방향을 따라감
    $('page-style').textContent =
      '@page { size: ' + pw + 'mm ' + ph + 'mm; margin: 0; }';

    const sheet = $('sheet');
    sheet.style.width = pw + 'mm';
    sheet.style.height = ph + 'mm';
    sheet.innerHTML = '';

    // 제목 + 이름/날짜
    const head = document.createElement('div');
    head.className = 'sheet-head';
    const title = document.createElement('div');
    title.className = 'sheet-title';
    title.textContent = pic.emoji + ' ' + pic.name;
    head.appendChild(title);
    if (state.nameDate) {
      const fields = document.createElement('div');
      fields.className = 'sheet-fields';
      fields.innerHTML = '이름<span class="blank"></span>' +
        '날짜<span class="blank short"></span>월 <span class="blank short"></span>일';
      head.appendChild(fields);
    }
    sheet.appendChild(head);

    const hint = document.createElement('div');
    hint.className = 'sheet-hint';
    hint.textContent = '칸에 적힌 번호와 같은 색을 찾아 칠해 보세요.';
    sheet.appendChild(hint);

    // 번호별 색 범례
    const legend = document.createElement('div');
    legend.className = 'legend';
    pic.palette.forEach((hex, i) => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML = '<span class="legend-num">' + (i + 1) + '</span>' +
        '<span class="legend-swatch" style="background:' + hex + '"></span>';
      legend.appendChild(item);
    });
    sheet.appendChild(legend);

    // 숫자 격자 — 남은 공간에 최대 크기
    const cell = cellSize(pic, pw, ph);
    const box = document.createElement('div');
    box.className = 'grid-box';
    box.appendChild(buildGridSvg(pic, cell));
    sheet.appendChild(box);

    const foot = document.createElement('div');
    foot.className = 'sheet-foot';
    foot.textContent = '픽셀 놀이터 — yonzi0510.github.io/enjoy/pixel';
    sheet.appendChild(foot);

    fitPreview(pw, ph);
  }

  /* ─────────── 화면 미리보기 배율 ─────────── */
  function fitPreview(pw, ph) {
    const wrap = $('preview-wrap');
    const sheet = $('sheet');
    const pxPerMm = 96 / 25.4;
    const availW = Math.max(280, wrap.clientWidth - 32);
    const s = Math.min(1, availW / (pw * pxPerMm));
    sheet.style.transform = 'scale(' + s + ')';
    wrap.style.height = (ph * pxPerMm * s + 46) + 'px';
  }

  /* ─────────── 컨트롤 ─────────── */
  function bindSeg(boxId, dataKey, apply) {
    $(boxId).addEventListener('click', e => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      $(boxId).querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('sel', b === btn));
      apply(btn.dataset[dataKey]);
      renderSheet();
    });
  }
  bindSeg('paper-btns', 'paper', v => { state.paper = v; });
  bindSeg('orient-btns', 'orient', v => { state.orient = v; });
  bindSeg('namedate-btns', 'namedate', v => { state.nameDate = v === 'on'; });

  $('btn-print').addEventListener('click', () => window.print());
  window.addEventListener('resize', () => {
    const pic = PICS.find(p => p.id === state.picId);
    if (pic) { const [pw, ph] = paperDims(pic); fitPreview(pw, ph); }
  });

  renderList();
  renderSheet();
})();
