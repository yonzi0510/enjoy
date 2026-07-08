/* 앱 셸 — 홈/목록/필사/받아쓰기/자유 낙서장/물어보기/갤러리 화면 전환과 흐름 */
window.App = (() => {
  const D = window.WriteData;
  const A = window.Audio2;
  const P = window.Progress;

  /* 크레용 색 (rb = 무지개) */
  const COLORS = ['#E8354D', '#F2762E', '#E5A800', '#3FBF77', '#31B7D8', '#4E6FE3', '#8B5BD6', '#F25CA2', '#8A5A3B', '#3B3B4A', 'rb'];
  const PENS = { thin: { w: 6, a: 1 }, mid: { w: 11, a: 1 }, thick: { w: 20, a: 1 }, hl: { w: 36, a: 0.45 } };
  const STICKERS = ['⭐', '🌈', '❤️', '🌸', '🦋', '🐰', '🐶', '🍓', '👑', '🚗', '🎈', '😊'];
  let writeColor = COLORS[7]; // 분홍
  let writeTool = 'pen';      // 'pen' | 'erase'

  /* 페이지 좌표: scope = pages를 가진 챕터 또는 items의 항목 */
  function pageId(scope, i) { return scope.id + '-' + i; }
  function doneIn(scope) {
    let n = 0;
    scope.pages.forEach((p, i) => { if (P.isDone(pageId(scope, i))) n++; });
    return n;
  }
  function chapterDone(ch) {
    if (ch.pages) return doneIn(ch);
    return ch.items.reduce((n, it) => n + doneIn(it), 0);
  }
  function chapterTotal(ch) {
    if (ch.pages) return ch.pages.length;
    return ch.items.reduce((n, it) => n + it.pages.length, 0);
  }
  // 긴 받아쓰기 문장은 가운데에 가까운 공백에서 두 줄로 나눈다
  function splitText(text) {
    const chars = Array.from(text);
    if (chars.length <= 8) return [text, null];
    let best = -1, mid = chars.length / 2;
    chars.forEach((ch, i) => {
      if (ch === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
    });
    if (best < 0) return [text, null];
    return [chars.slice(0, best).join(''), chars.slice(best + 1).join('')];
  }

  /* ─────────── 화면 전환 ─────────── */
  function showScreen(id) {
    A.stop();
    stopAsk();
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id === 'scr-home') renderHome();
    if (id === 'scr-gallery') renderGallery();
  }

  /* ─────────── 홈 ─────────── */
  function drawCount() { return P.galleryList().filter(a => a.id.indexOf('draw-') === 0).length; }
  function renderHome() {
    document.getElementById('home-stars').textContent = P.stars();
    const menu = document.getElementById('menu');
    menu.innerHTML = '';
    D.chapters.forEach(ch => {
      const done = chapterDone(ch), total = chapterTotal(ch);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-card c-' + ch.id;
      b.innerHTML =
        '<span class="mc-icon">' + ch.icon + '</span>' +
        '<span class="mc-name">' + ch.name + '</span>' +
        '<span class="mc-desc">' + ch.desc + '</span>' +
        '<span class="mc-prog">' + (done >= total ? '🏅 완성!' : '⭐ ' + done + ' / ' + total) + '</span>';
      b.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.tap();
        if (ch.items) openItems(ch);
        else openWrite(ch, null, firstTodo(ch));
      });
      menu.appendChild(b);
    });

    const draw = document.createElement('button');
    draw.type = 'button';
    draw.className = 'menu-card c-draw';
    draw.innerHTML =
      '<span class="mc-icon">🎨</span><span class="mc-name">자유 낙서장</span>' +
      '<span class="mc-desc">마음껏 그리고 꾸며요</span>' +
      '<span class="mc-prog">' + drawCount() + '장</span>';
    draw.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openDraw(); });
    menu.appendChild(draw);

    const ask = document.createElement('button');
    ask.type = 'button';
    ask.className = 'menu-card c-ask';
    const askedN = P.askedList().length;
    ask.innerHTML =
      '<span class="mc-icon">🎤</span><span class="mc-name">물어보고 쓰기</span>' +
      '<span class="mc-desc">"토끼는 어떻게 써?"</span>' +
      '<span class="mc-prog">' + (askedN ? '💬 ' + askedN + ' 낱말' : '뭐든 물어봐!') + '</span>';
    ask.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openAsk(); });
    menu.appendChild(ask);

    const g = document.createElement('button');
    g.type = 'button';
    g.className = 'menu-card c-gallery';
    g.innerHTML =
      '<span class="mc-icon">🖼️</span><span class="mc-name">내 글씨</span>' +
      '<span class="mc-desc">모은 작품 보기</span>' +
      '<span class="mc-prog">' + P.galleryCount() + '장</span>';
    g.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); showScreen('scr-gallery'); });
    menu.appendChild(g);
  }
  function firstTodo(scope) {
    for (let i = 0; i < scope.pages.length; i++) if (!P.isDone(pageId(scope, i))) return i;
    return 0;
  }

  /* ─────────── 항목 목록 (동요·동화·글자 줄·낱말·받아쓰기) ─────────── */
  let curChapter = null;
  function openItems(ch) {
    curChapter = ch;
    document.getElementById('items-title').textContent = ch.icon + ' ' + ch.name;
    const list = document.getElementById('items-list');
    list.innerHTML = '';
    ch.items.forEach(it => {
      const done = doneIn(it), total = it.pages.length;
      const row = document.createElement('div');
      row.className = 'item-row';
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'item-main';
      b.innerHTML =
        '<span class="it-emoji">' + it.e + '</span>' +
        '<span class="it-texts"><span class="it-name">' + it.name + '</span>' +
        '<span class="it-kind">' + it.kind + '</span></span>' +
        '<span class="it-prog">' + (done >= total ? '🏅' : '⭐ ' + done + ' / ' + total) + '</span>';
      b.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.tap();
        openWrite(it, ch, firstTodo(it));
      });
      row.appendChild(b);
      if (it.full) { // 전체 듣기 (받아쓰기는 정답이라 없음)
        const play = document.createElement('button');
        play.type = 'button';
        play.className = 'item-play';
        play.textContent = '▶️';
        play.setAttribute('aria-label', it.name + ' 전체 듣기');
        play.addEventListener('click', ev => {
          ev.preventDefault();
          A.sfx.tap();
          A.speakSeq(it.full.map(t => ({ text: t, rate: 0.85 })));
        });
        row.appendChild(play);
      }
      list.appendChild(row);
    });
    showScreen('scr-items');
  }

  /* ─────────── 물어보고 쓰기 ─────────── */
  let listening = false;
  function askStatus(msg) { document.getElementById('ask-status').textContent = msg; }

  function openAsk() {
    stopAsk();
    document.getElementById('ask-mic').style.display = Ask.sttSupported() ? '' : 'none';
    askStatus(Ask.sttSupported()
      ? '마이크를 누르고 "토끼는 어떻게 써?" 하고 물어보세요'
      : '이 브라우저는 마이크 듣기가 안 돼요. 아래에 낱말을 적어 주세요');
    renderAskRecent();
    showScreen('scr-ask');
  }
  function renderAskRecent() {
    const box = document.getElementById('ask-recent');
    box.innerHTML = '';
    P.askedList().forEach(w => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ask-chip';
      b.textContent = w;
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); askWord(w); });
      box.appendChild(b);
    });
    document.getElementById('ask-clear').hidden = !P.askedList().length;
  }
  function stopAsk() {
    if (!listening) return;
    listening = false;
    Ask.stopListen();
    document.getElementById('ask-mic').classList.remove('listening');
  }
  function startAsk() {
    if (listening) { stopAsk(); askStatus('다시 마이크를 누르고 물어보세요'); return; }
    listening = true;
    A.stop(); // 듣는 동안 TTS 정지
    document.getElementById('ask-mic').classList.add('listening');
    askStatus('👂 듣고 있어요…');
    Ask.startListen({
      onInterim(t) { askStatus('👂 ' + t); },
      onResult(alts) {
        listening = false;
        document.getElementById('ask-mic').classList.remove('listening');
        const w = Ask.parseAlts(alts);
        if (w) askWord(w);
        else {
          askStatus('무슨 낱말인지 잘 못 들었어요');
          A.speak('무슨 낱말인지 잘 못 들었어요. 다시 물어볼까?');
        }
      },
      onFail(kind) {
        listening = false;
        document.getElementById('ask-mic').classList.remove('listening');
        if (kind === 'denied') askStatus('마이크 사용을 허용해 주세요');
        else if (kind === 'nospeech') askStatus('아무 말도 안 들렸어요. 다시 눌러 보세요');
        else askStatus('마이크가 잘 안 돼요. 아래에 낱말을 적어 주세요');
      },
    });
  }
  // 물어본 낱말로 필사 페이지 열기 (음성·최근·직접 입력 공용)
  function askWord(word) {
    stopAsk();
    P.addAsked(word);
    openWrite({
      id: 'ask-' + word, icon: '🎤', name: '물어보고 쓰기', e: '💬', _back: 'scr-ask',
      pages: [{ text: word, say: word + '! 이렇게 써요.' }],
    }, null, 0);
  }

  /* ─────────── 필사·받아쓰기 화면 ─────────── */
  let traceLine = null, freeLine = null;
  let cur = null; // { scope, parent, idx, dict, l1, l2, revealed }

  function initLines() {
    const hint = penHint();
    const opts = {
      color: () => writeColor, tool: () => writeTool, onTouchReject: hint,
      onChange: () => { if (cur) { cur.dirty = true; scheduleDraft(); } },
    };
    traceLine = Ink.InkLine(document.getElementById('ink-trace'), opts);
    freeLine = Ink.InkLine(document.getElementById('ink-free'), opts);
  }

  // 손가락 필기 시도 안내 (펜슬 전용) — 말은 가끔만
  let lastPenSay = 0;
  function penHint() {
    return () => {
      const el = document.getElementById('pen-hint');
      el.classList.add('on');
      clearTimeout(penHint.t);
      penHint.t = setTimeout(() => el.classList.remove('on'), 1500);
      const now = Date.now();
      if (now - lastPenSay > 12000) { lastPenSay = now; A.speak('펜슬로 써 보세요!'); }
    };
  }

  function setWriteTool(tool) {
    writeTool = tool;
    document.getElementById('btn-eraser').classList.toggle('on', tool === 'erase');
  }

  /* 쓰는 중 자동 저장 — 완성하지 않아도 쓴 글씨가 남고, 다시 열면 그대로 보인다 */
  let draftTimer = null;
  function pageArt() {
    const page = cur.scope.pages[cur.idx];
    const art = {
      t: cur.l1, e: page.e || cur.scope.e || '',
      tr: traceLine.strokes(), fr: freeLine.strokes(),
    };
    if (cur.dict) { if (cur.l2) art.t2 = cur.l2; }
    else art.c2 = page.text;
    return art;
  }
  function saveDraftNow() {
    if (!cur || cur.dict) return; // 받아쓰기는 정답 확인으로만 저장 (정답 유출 방지)
    const pid = pageId(cur.scope, cur.idx);
    if (traceLine.strokeCount() + freeLine.strokeCount() === 0) {
      if (!P.isDone(pid)) P.removeArt(pid); // 다 지우고 나가면 빈 장으로 되돌리기
      return;
    }
    P.saveArt(pid, pageArt());
  }
  function scheduleDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraftNow, 900);
  }
  function flushDraft() {
    clearTimeout(draftTimer);
    if (cur && cur.dirty) saveDraftNow();
  }

  function openWrite(scope, parent, idx) {
    flushDraft(); // 직전에 쓰던 장 저장
    cur = { scope, parent, idx, dict: !!(parent && parent.dict) };
    document.getElementById('write-title').textContent = (scope.icon || scope.e) + ' ' + scope.name;
    setWriteTool('pen');
    showScreen('scr-write');
    traceLine.resize();
    freeLine.resize();
    openPage(idx);
  }

  function openPage(idx) {
    if (cur.idx !== idx) flushDraft(); // 장을 넘길 때 쓰던 글 저장 (cur.idx는 아직 이전 장)
    const scope = cur.scope;
    cur.idx = idx;
    const page = scope.pages[idx];
    const say = page.say || page.text;

    document.getElementById('write-emoji').textContent = page.e || scope.e || '✏️';
    document.getElementById('btn-prev').disabled = idx === 0;
    const dots = document.getElementById('write-dots');
    dots.innerHTML = '';
    if (scope.pages.length <= 12) {
      scope.pages.forEach((_, i) => {
        const d = document.createElement('span');
        d.className = 'dot' + (i === idx ? ' on' : '') + (P.isDone(pageId(scope, i)) ? ' done' : '');
        dots.appendChild(d);
      });
    } else { // 받아쓰기처럼 장수가 많으면 숫자로
      const t = document.createElement('span');
      t.className = 'page-count';
      t.textContent = (idx + 1) + ' / ' + scope.pages.length;
      dots.appendChild(t);
    }

    document.getElementById('dict-check').classList.remove('on');
    cur.revealed = false;
    cur.dirty = false;
    cur.failStamp = null;

    const note = document.querySelector('.note');
    const lineFree = document.getElementById('line-free');
    if (cur.dict) {
      // 받아쓰기: 정답을 숨긴 빈 칸. 긴 문장만 한 장처럼 이어지는 두 줄로, 짧으면 한 줄만
      const parts = splitText(page.text);
      cur.l1 = parts[0];
      cur.l2 = parts[1];
      note.classList.add('merged');
      lineFree.style.display = cur.l2 ? '' : 'none';
      traceLine.setText(cur.l1, 'hide');
      freeLine.setText(cur.l2 || '', 'hide');
      if (cur.l2) freeLine.resize();
      document.getElementById('tag-trace').textContent = '받아쓰기';
      setTimeout(() => A.speak('받아쓰기! ' + say), 350);
    } else {
      cur.l1 = page.text;
      cur.l2 = null;
      note.classList.remove('merged');
      lineFree.style.display = '';
      traceLine.setText(page.text, 'show');
      freeLine.setText(page.text, 'hide');
      freeLine.resize();
      document.getElementById('tag-trace').textContent = '따라 써요';
      document.getElementById('tag-free').textContent = '혼자 써요';
      const art = P.artOf(pageId(scope, idx));
      if (art) { // 전에 쓴 작품 다시 보여주기
        traceLine.setStrokes(art.tr);
        freeLine.setStrokes(art.fr);
      }
      cur.dirty = false; // 복원한 획은 새로 쓴 게 아님
      setTimeout(() => A.speak(say), 350);
    }
  }

  /* ▶ 화살표 = 다 썼어요 + 다음. 안 썼으면 그냥 넘기고, 썼으면 확인까지 이어진다.
   * 같은 상태로 두 번 누르면(고치지 않고 고집하면) 좌절하지 않게 그냥 보내 준다. */
  function inkStamp() {
    return traceLine.strokeCount() + ':' + freeLine.strokeCount() + ':' +
      Math.round(traceLine.inkLength() + freeLine.inkLength());
  }
  function navNext() {
    if (cur.idx < cur.scope.pages.length - 1) openPage(cur.idx + 1);
  }
  function stayWithHint(lineId, msg) {
    if (cur.failStamp === inkStamp()) { navNext(); return; } // 두 번째 누름 → 보내주기
    cur.failStamp = inkStamp();
    A.sfx.tap();
    wiggle(lineId);
    A.speak(msg);
  }
  function arrowNext() {
    if (!cur) return;
    const page = cur.scope.pages[cur.idx];
    const say = page.say || page.text;
    const empty = traceLine.strokeCount() === 0 && freeLine.strokeCount() === 0;

    if (cur.dict) {
      if (cur.revealed) { A.sfx.tap(); navNext(); return; } // 정답 확인 후 넘어가기
      if (!cur.dirty || empty) { A.sfx.tap(); navNext(); return; } // 안 썼으면 구경만
      if (traceLine.strokeCount() < 1 || (cur.l2 && freeLine.strokeCount() < 1)) {
        stayWithHint(traceLine.strokeCount() < 1 ? 'line-trace' : 'line-free', '들은 말을 빈 칸에 써 볼까?');
        return;
      }
      cur.revealed = true;
      traceLine.reveal();
      freeLine.reveal();
      document.getElementById('dict-check').classList.add('on');
      A.sfx.pop();
      A.speak('정답은, ' + say + '! 내 글씨랑 비교해 보자.');
      return;
    }

    if (empty) { A.sfx.tap(); navNext(); return; } // 안 썼으면 그냥 넘기기
    // 이미 완성한 장을 구경만 할 때는 다시 판정하지 않는다 (저장된 초안은 판정해서 별을 줌)
    if (!cur.dirty && P.isDone(pageId(cur.scope, cur.idx))) { A.sfx.tap(); navNext(); return; }
    if (traceLine.coverage() < 0.5) {
      stayWithHint('line-trace', '회색 글자 위를 따라 써 볼까?');
      return;
    }
    if (freeLine.strokeCount() < 1 || freeLine.inkLength() < 200) {
      stayWithHint('line-free', '아래 줄에도 혼자 써 보자!');
      return;
    }
    finishPage();
  }

  function finishPage() {
    const scope = cur.scope, idx = cur.idx;
    clearTimeout(draftTimer); // 완료 저장이 초안 저장을 대신한다
    P.completePage(pageId(scope, idx), pageArt());
    A.sfx.fanfare();
    const praise = D.praises[Math.floor(Math.random() * D.praises.length)];
    const isLast = idx >= scope.pages.length - 1;
    document.getElementById('reward-praise').textContent = praise;
    document.getElementById('reward-next').textContent = isLast ? '완성! 🎉' : '다음 ▶';
    document.getElementById('reward').classList.add('on');
    A.speak(praise);
  }

  function dictRetry() {
    document.getElementById('dict-check').classList.remove('on');
    cur.revealed = false;
    cur.dirty = false;
    cur.failStamp = null;
    traceLine.setText(cur.l1, 'hide');
    freeLine.setText(cur.l2 || '', 'hide');
    const page = cur.scope.pages[cur.idx];
    A.speak(page.say || page.text);
  }

  function wiggle(id) {
    const el = document.getElementById(id);
    el.classList.remove('wiggle');
    void el.offsetWidth; // 애니메이션 재시작
    el.classList.add('wiggle');
  }

  function rewardNext() {
    document.getElementById('reward').classList.remove('on');
    const scope = cur.scope;
    if (cur.idx < scope.pages.length - 1) { openPage(cur.idx + 1); return; }
    // 화면 전환이 A.stop()으로 말을 끊으므로, 전환을 먼저 하고 말한다
    if (scope._back) { openAsk(); A.speak('다 썼다! 또 물어봐도 돼요!'); return; }
    if (cur.parent) openItems(cur.parent);
    else showScreen('scr-home');
    A.speak(scope.name + ' 다 썼다! 정말 대단해요!');
  }

  /* ─────────── 자유 낙서장 ─────────── */
  let pad = null;
  let drawColor = COLORS[5]; // 파랑
  let drawTool = 'pen';      // 'pen' | 'erase' | 'sticker'
  let drawPen = 'mid';
  let drawSticker = STICKERS[0];

  function initDraw() {
    pad = Ink.FreePad(document.getElementById('draw-pad'), {
      color: () => drawColor,
      tool: () => drawTool,
      pen: () => PENS[drawPen],
      sticker: () => drawSticker,
      onTouchReject: penHint(),
    });
    makeSwatches(document.getElementById('draw-swatches'), drawColor, c => {
      drawColor = c;
      setDrawTool('pen');
    });
    const stickerRow = document.getElementById('sticker-row');
    STICKERS.forEach(s => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sticker-btn';
      b.textContent = s;
      b.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.pop();
        drawSticker = s;
        setDrawTool('sticker');
        stickerRow.querySelectorAll('.sticker-btn').forEach(x => x.classList.toggle('on', x === b));
      });
      stickerRow.appendChild(b);
    });
    document.querySelectorAll('.pen-btn').forEach(b => {
      b.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.tap();
        drawPen = b.dataset.pen;
        setDrawTool('pen');
        document.querySelectorAll('.pen-btn').forEach(x => x.classList.toggle('on', x === b));
      });
    });
    document.getElementById('btn-draw-eraser').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      setDrawTool(drawTool === 'erase' ? 'pen' : 'erase');
    });
    document.getElementById('btn-draw-sticker').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      setDrawTool(drawTool === 'sticker' ? 'pen' : 'sticker');
    });
    document.getElementById('btn-draw-undo').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); pad.undo();
    });
    document.getElementById('btn-draw-clear').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.pop(); pad.clear();
    });
    document.getElementById('btn-draw-save').addEventListener('click', ev => {
      ev.preventDefault();
      if (!pad.count()) { A.sfx.tap(); A.speak('먼저 마음껏 그려 보자!'); return; }
      P.completePage('draw-' + Date.now(), { t: '자유 그림', e: '🎨', k: 'free', items: pad.items() });
      A.sfx.fanfare();
      A.speak('멋진 그림을 보관했어요!');
      const btn = ev.currentTarget;
      btn.classList.remove('pulse');
      void btn.offsetWidth;
      btn.classList.add('pulse');
    });
  }
  function setDrawTool(tool) {
    drawTool = tool;
    document.getElementById('btn-draw-eraser').classList.toggle('on', tool === 'erase');
    document.getElementById('btn-draw-sticker').classList.toggle('on', tool === 'sticker');
    document.getElementById('sticker-row').hidden = tool !== 'sticker';
  }
  function openDraw() {
    showScreen('scr-draw');
    pad.resize();
  }

  /* ─────────── 갤러리 ─────────── */
  function renderGallery() {
    const arts = P.galleryList();
    document.getElementById('gallery-count').textContent = arts.length + '장';
    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = '';
    if (!arts.length) {
      grid.innerHTML = '<p class="gallery-empty">아직 작품이 없어요.<br>글씨를 쓰고 모아 보세요! ✏️</p>';
      return;
    }
    arts.forEach(art => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'art-card';
      const cv = document.createElement('canvas');
      cv.className = 'art-canvas';
      const cap = document.createElement('span');
      cap.className = 'art-cap';
      cap.textContent = (art.e ? art.e + ' ' : '') + art.t + (art.t2 ? ' ' + art.t2 : '');
      card.appendChild(cv);
      card.appendChild(cap);
      card.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.pop();
        if (art.k !== 'free') A.speak(art.t + (art.t2 ? ' ' + art.t2 : ''));
        card.classList.remove('pulse');
        void card.offsetWidth;
        card.classList.add('pulse');
      });
      grid.appendChild(card);
      Ink.renderArt(cv, art);
    });
  }

  /* ─────────── 색 견본 버튼 ─────────── */
  function makeSwatches(container, initial, onPick) {
    COLORS.forEach(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch' + (c === 'rb' ? ' sw-rb' : '') + (c === initial ? ' on' : '');
      if (c !== 'rb') b.style.background = c;
      b.setAttribute('aria-label', c === 'rb' ? '무지개 크레용' : '크레용 색');
      b.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.tap();
        onPick(c);
        container.querySelectorAll('.swatch').forEach(s => s.classList.toggle('on', s === b));
      });
      container.appendChild(b);
    });
  }

  /* ─────────── 초기화 ─────────── */
  function init() {
    // 길게 눌러도 복사·전체선택 메뉴가 뜨지 않게 (직접 입력창은 예외)
    document.addEventListener('contextmenu', e => { if (e.target.id !== 'ask-type') e.preventDefault(); });
    document.addEventListener('selectstart', e => { if (e.target.id !== 'ask-type') e.preventDefault(); });

    initLines();
    initDraw();
    makeSwatches(document.getElementById('swatches'), writeColor, c => {
      writeColor = c;
      setWriteTool('pen');
    });

    document.querySelectorAll('[data-go]').forEach(b => {
      b.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.tap();
        showScreen(b.dataset.go);
      });
    });
    document.getElementById('btn-write-back').addEventListener('click', ev => {
      ev.preventDefault();
      A.sfx.tap();
      flushDraft(); // 나가기 전에 쓰던 글 저장
      if (cur && cur.scope._back) openAsk();
      else if (cur && cur.parent) openItems(cur.parent);
      else showScreen('scr-home');
    });
    document.getElementById('btn-prev').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); if (cur.idx > 0) openPage(cur.idx - 1);
    });
    document.getElementById('btn-next').addEventListener('click', ev => {
      ev.preventDefault(); arrowNext();
    });
    document.getElementById('btn-listen').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      const p = cur.scope.pages[cur.idx];
      A.speak(p.say || p.text);
    });
    document.getElementById('btn-eraser').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      setWriteTool(writeTool === 'erase' ? 'pen' : 'erase');
    });
    document.getElementById('btn-undo').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      if (freeLine.strokeCount()) freeLine.undo();
      else traceLine.undo();
    });
    document.getElementById('clear-trace').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.pop(); traceLine.clear();
    });
    document.getElementById('clear-free').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.pop(); freeLine.clear();
    });
    document.getElementById('dict-ok').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      document.getElementById('dict-check').classList.remove('on');
      finishPage();
    });
    document.getElementById('dict-retry').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); dictRetry();
    });
    document.getElementById('reward-next').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); rewardNext();
    });
    document.getElementById('reward-again').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      document.getElementById('reward').classList.remove('on');
      if (cur.dict) { dictRetry(); return; }
      cur.dirty = false;
      cur.failStamp = null;
      traceLine.setText(cur.l1, 'show');
      freeLine.setText(cur.scope.pages[cur.idx].text, 'hide');
    });

    document.getElementById('ask-mic').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); startAsk();
    });
    document.getElementById('ask-clear').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.pop();
      P.clearAsked();
      renderAskRecent();
      A.speak('물어본 낱말을 깨끗이 지웠어요.');
    });
    document.getElementById('ask-type-go').addEventListener('click', ev => {
      ev.preventDefault();
      const input = document.getElementById('ask-type');
      const w = Ask.parseWord(input.value);
      if (w) { A.sfx.tap(); input.value = ''; askWord(w); }
      else { A.sfx.tap(); askStatus('한글 낱말을 1~8글자로 적어 주세요'); }
    });

    renderHome();
  }
  init();

  // 종단 테스트용 상태 확인
  function debug() {
    return {
      traceStrokes: traceLine.strokeCount(),
      freeStrokes: freeLine.strokeCount(),
      coverage: traceLine.coverage(),
      stars: P.stars(),
      pageText: cur ? cur.scope.pages[cur.idx].text : null,
      tool: writeTool,
      dict: cur ? cur.dict : false,
      revealed: cur ? !!cur.revealed : false,
      padItems: pad ? pad.count() : 0,
    };
  }

  return { showScreen, askWord, debug };
})();
