/* 앱 셸 — 홈/목록/필사/갤러리 화면 전환과 필사 흐름 */
window.App = (() => {
  const D = window.WriteData;
  const A = window.Audio2;
  const P = window.Progress;

  const COLORS = ['#F25CA2', '#4E8DF5', '#3FBF77']; // 분홍·파랑·초록 크레용
  let color = COLORS[0];

  /* 페이지 좌표: scope = pages를 가진 챕터 또는 items의 항목 */
  function pagesOf(scope) { return scope.pages; }
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

  /* ─────────── 화면 전환 ─────────── */
  function showScreen(id) {
    A.stop();
    stopAsk();
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id === 'scr-home') renderHome();
    if (id === 'scr-gallery') renderGallery();
  }

  /* ─────────── 홈 ─────────── */
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

  /* ─────────── 동요·동화 목록 ─────────── */
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
      row.appendChild(b);
      row.appendChild(play);
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

  /* ─────────── 필사 화면 ─────────── */
  let traceLine = null, freeLine = null;
  let cur = null; // { scope, parent, idx }

  function initLines() {
    const hint = penHint();
    traceLine = Ink.InkLine(document.getElementById('ink-trace'), {
      guide: '', color: () => color, onTouchReject: hint,
    });
    freeLine = Ink.InkLine(document.getElementById('ink-free'), {
      guide: null, color: () => color, onTouchReject: hint,
    });
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

  function openWrite(scope, parent, idx) {
    cur = { scope, parent, idx };
    document.getElementById('write-title').textContent = (scope.icon || scope.e) + ' ' + scope.name;
    showScreen('scr-write');
    traceLine.resize();
    freeLine.resize();
    openPage(idx);
  }

  function openPage(idx) {
    const scope = cur.scope;
    cur.idx = idx;
    const page = scope.pages[idx];
    const say = page.say || page.text;

    document.getElementById('write-emoji').textContent = page.e || scope.e || '✏️';
    document.getElementById('btn-prev').disabled = idx === 0;
    document.getElementById('btn-next').disabled = idx >= scope.pages.length - 1;
    const dots = document.getElementById('write-dots');
    dots.innerHTML = '';
    scope.pages.forEach((_, i) => {
      const d = document.createElement('span');
      d.className = 'dot' + (i === idx ? ' on' : '') + (P.isDone(pageId(scope, i)) ? ' done' : '');
      dots.appendChild(d);
    });

    traceLine.setGuide(page.text);
    freeLine.setGuide(null);
    const art = P.artOf(pageId(scope, idx));
    if (art) { // 전에 쓴 작품 다시 보여주기
      traceLine.setStrokes(art.tr);
      freeLine.setStrokes(art.fr);
    }
    setTimeout(() => A.speak(say), 350);
  }

  function checkDone() {
    const scope = cur.scope, idx = cur.idx;
    const page = scope.pages[idx];
    if (traceLine.coverage() < 0.5) {
      A.sfx.tap();
      wiggle('line-trace');
      A.speak('회색 글자 위를 따라 써 볼까?');
      return;
    }
    if (freeLine.strokeCount() < 1 || freeLine.inkLength() < 200) {
      A.sfx.tap();
      wiggle('line-free');
      A.speak('아래 줄에도 혼자 써 보자!');
      return;
    }
    P.completePage(pageId(scope, idx), {
      t: page.text, e: page.e || scope.e || '',
      tr: traceLine.strokes(), fr: freeLine.strokes(),
    });
    A.sfx.fanfare();
    const praise = D.praises[Math.floor(Math.random() * D.praises.length)];
    const isLast = idx >= scope.pages.length - 1;
    document.getElementById('reward-praise').textContent = praise;
    document.getElementById('reward-next').textContent = isLast ? '완성! 🎉' : '다음 ▶';
    document.getElementById('reward').classList.add('on');
    A.speak(praise);
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
      cap.textContent = (art.e ? art.e + ' ' : '') + art.t;
      card.appendChild(cv);
      card.appendChild(cap);
      card.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.pop();
        A.speak(art.t);
        card.classList.remove('pulse');
        void card.offsetWidth;
        card.classList.add('pulse');
      });
      grid.appendChild(card);
      Ink.renderArt(cv, art);
    });
  }

  /* ─────────── 초기화 ─────────── */
  function init() {
    initLines();

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
      if (cur && cur.scope._back) openAsk();
      else if (cur && cur.parent) openItems(cur.parent);
      else showScreen('scr-home');
    });
    document.getElementById('btn-prev').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); if (cur.idx > 0) openPage(cur.idx - 1);
    });
    document.getElementById('btn-next').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      if (cur.idx < cur.scope.pages.length - 1) openPage(cur.idx + 1);
    });
    document.getElementById('btn-listen').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      const p = cur.scope.pages[cur.idx];
      A.speak(p.say || p.text);
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
    document.getElementById('btn-done').addEventListener('click', ev => {
      ev.preventDefault(); checkDone();
    });
    document.getElementById('reward-next').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); rewardNext();
    });
    document.getElementById('reward-again').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      document.getElementById('reward').classList.remove('on');
      traceLine.setGuide(cur.scope.pages[cur.idx].text);
      freeLine.setGuide(null);
    });
    document.getElementById('ask-mic').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); startAsk();
    });
    document.getElementById('ask-type-go').addEventListener('click', ev => {
      ev.preventDefault();
      const input = document.getElementById('ask-type');
      const w = Ask.parseWord(input.value);
      if (w) { A.sfx.tap(); input.value = ''; askWord(w); }
      else { A.sfx.tap(); askStatus('한글 낱말을 1~8글자로 적어 주세요'); }
    });

    document.querySelectorAll('.swatch').forEach((b, i) => {
      b.style.background = COLORS[i];
      b.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.tap();
        color = COLORS[i];
        document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('on', s === b));
      });
    });
    document.querySelector('.swatch').classList.add('on');

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
    };
  }

  return { showScreen, askWord, debug };
})();
