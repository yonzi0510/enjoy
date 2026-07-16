/* 앱 셸 — 화면 전환, 글자 그리드/상세, 따라쓰기 흐름, 보상 오버레이 */
window.App = (() => {
  const D = window.HangulData;
  const A = window.Audio2;
  const P = window.Progress;

  let gridPurpose = 'learn';   // 'learn' | 'trace'
  let gridTab = 'consonants';  // 'consonants' | 'vowels'
  let curLetter = null;

  /* ─────────── 화면 전환 ─────────── */
  function showScreen(id) {
    // 떠나는 화면 정리
    window.Trace.stop();
    window.Games.bubble.stop();
    window.Games.first.stop();
    window.Song.stop();
    A.stop();

    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));

    if (id === 'scr-home') renderHome();
    if (id === 'scr-letters') renderGrid();
    if (id === 'scr-cards') window.Cards.render();
    if (id === 'scr-song') window.Song.enter();
    if (id === 'scr-bubble') window.Games.bubble.start();
    if (id === 'scr-first') window.Games.first.start();
  }

  /* ─────────── 홈 ─────────── */
  function renderHome() {
    document.getElementById('home-stars').textContent = P.stars();
    document.getElementById('home-cards').textContent = P.cardCount();
  }

  /* ─────────── 글자 그리드 ─────────── */
  function renderGrid() {
    const grid = document.getElementById('letters-grid');
    const title = document.getElementById('letters-title');
    title.textContent = gridPurpose === 'trace' ? '✏️ 따라쓰기' : '📖 글자 배우기';
    document.querySelectorAll('#scr-letters .tab').forEach(t => {
      t.classList.toggle('on', t.dataset.tab === gridTab);
    });
    const list = gridTab === 'consonants' ? D.consonants : D.vowels;
    grid.innerHTML = '';
    list.forEach(l => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'letter-cell' + (P.hasTraced(l.ch) ? ' traced' : '');
      b.dataset.ch = l.ch;
      b.innerHTML = '<span class="lc-ch">' + l.ch + '</span><span class="lc-name">' + l.name + '</span>' +
        (P.hasTraced(l.ch) ? '<span class="lc-star">⭐</span>' : '');
      b.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.tap();
        curLetter = l;
        if (gridPurpose === 'trace') openTrace();
        else openLetter();
      });
      grid.appendChild(b);
    });
  }

  /* ─────────── 글자 상세 ─────────── */
  function openLetter() {
    const l = curLetter;
    document.getElementById('letter-big').textContent = l.ch;
    document.getElementById('letter-name').textContent = l.name;
    const words = document.getElementById('letter-words');
    words.innerHTML = '';
    l.words.forEach(w => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'wordbtn';
      b.innerHTML = '<span class="wb-emoji">' + w.e + '</span><span class="wb-word">' + w.w + '</span>';
      b.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.tap();
        A.speakSeq([{ text: w.w, rate: 0.8 }]);
      });
      words.appendChild(b);
    });
    showScreen('scr-letter');
    A.speakSeq([{ text: l.name, rate: 0.85 }]);
  }

  /* ─────────── 따라쓰기 ─────────── */
  function openTrace() {
    const l = curLetter;
    showScreen('scr-trace');
    document.getElementById('trace-ch').textContent = l.ch;
    document.getElementById('trace-name').textContent = l.name;
    const cv = document.getElementById('trace-canvas');
    // 화면 크기에 맞춰 정사각형 캔버스
    const holder = document.getElementById('trace-holder');
    const size = Math.min(holder.clientWidth, holder.clientHeight, 560);
    cv.width = cv.height = Math.max(280, size) * (window.devicePixelRatio > 1 ? 2 : 1);
    cv.style.width = cv.style.height = Math.max(280, size) + 'px';
    updateStrokeDots(l.strokes.length, 0);
    A.speakSeq([{ text: l.name, rate: 0.85 }, { text: '반짝이는 점부터 따라 써 볼까요?', rate: 1.0 }]);
    window.Trace.start(cv, l, {
      onStroke(done, total) {
        A.sfx.stroke();
        updateStrokeDots(total, done);
      },
      onDone() {
        updateStrokeDots(l.strokes.length, l.strokes.length);
        P.recordTrace(l.ch);
        P.addStar(3);
        const w = l.words[Math.floor(Math.random() * l.words.length)];
        const isNew = P.addCard(w.w, w.e, 'trace');
        A.sfx.fanfare();
        A.speakSeq([
          { text: l.name + '! 다 썼어요!', rate: 0.95, pitch: 1.3 },
          { text: (isNew ? '낱말 카드 선물! ' : '') + w.w, rate: 0.85 },
        ]);
        // 가나다 순서(ㄱㄴㄷ… 그다음 ㅏㅑㅓ…)로 다음 글자 자동 진행
        const nxt = D.all[D.all.indexOf(l) + 1] || null;
        const toList = () => { gridPurpose = 'trace'; showScreen('scr-letters'); };
        setTimeout(() => showReward(w,
          () => { if (nxt) { curLetter = nxt; openTrace(); } else toList(); },
          { nextLabel: nxt ? '다음 글자 ' + nxt.ch + ' ✏️' : '좋아요!', onList: toList }), 600);
      },
    });
  }

  function updateStrokeDots(total, done) {
    const el = document.getElementById('trace-dots');
    el.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const d = document.createElement('span');
      d.className = 'dot' + (i < done ? ' on' : '');
      el.appendChild(d);
    }
  }

  /* ─────────── 보상 오버레이 ───────────
   * opts.nextLabel: 기본(다음) 버튼 문구, opts.onList: '목록으로' 버튼 콜백(있을 때만 표시)
   */
  let rewardNextCb = null, rewardListCb = null;
  function showReward(word, onNext, opts) {
    rewardNextCb = onNext;
    rewardListCb = (opts && opts.onList) || null;
    document.getElementById('reward-emoji').textContent = word.e;
    document.getElementById('reward-word').textContent = word.w;
    document.getElementById('reward-next').textContent = (opts && opts.nextLabel) || '좋아요!';
    document.getElementById('reward-list').hidden = !rewardListCb;
    document.getElementById('reward').classList.add('on');
  }
  function closeReward(which) {
    document.getElementById('reward').classList.remove('on');
    const cb = which === 'list' ? rewardListCb : rewardNextCb;
    rewardNextCb = rewardListCb = null;
    if (cb) cb();
  }

  /* ─────────── 초기화 ─────────── */
  function init() {
    // 홈 메뉴
    document.querySelectorAll('[data-go]').forEach(b => {
      b.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.tap();
        // 글을 못 읽는 아이를 위해 메뉴 이름을 말해 준다
        const nm = b.querySelector('.mc-name');
        if (nm) A.speakSeq([{ text: nm.textContent, rate: 1.0 }]);
        const go = b.dataset.go;
        if (go === 'learn') { gridPurpose = 'learn'; showScreen('scr-letters'); }
        else if (go === 'trace') { gridPurpose = 'trace'; showScreen('scr-letters'); }
        else showScreen(go);
      });
    });
    // 자음/모음 탭
    document.querySelectorAll('#scr-letters .tab').forEach(t => {
      t.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.tap();
        gridTab = t.dataset.tab;
        renderGrid();
      });
    });
    // 노래 탭·재생
    document.querySelectorAll('#scr-song .tab').forEach(t => {
      t.addEventListener('click', ev => {
        ev.preventDefault();
        window.Song.setMode(t.dataset.mode);
      });
    });
    document.getElementById('song-play').addEventListener('click', ev => {
      ev.preventDefault();
      window.Song.play();
    });
    // 글자 상세 → 소리·따라쓰기
    document.getElementById('letter-sound').addEventListener('click', ev => {
      ev.preventDefault();
      A.sfx.tap();
      A.speakSeq([{ text: curLetter.name, rate: 0.8 }]);
    });
    document.getElementById('letter-trace').addEventListener('click', ev => {
      ev.preventDefault();
      A.sfx.tap();
      openTrace();
    });
    // 보상 닫기 — 다음 글자 진행 / 목록으로
    document.getElementById('reward-next').addEventListener('click', ev => {
      ev.preventDefault();
      A.sfx.tap();
      closeReward('next');
    });
    document.getElementById('reward-list').addEventListener('click', ev => {
      ev.preventDefault();
      A.sfx.tap();
      closeReward('list');
    });

    showScreen('scr-home');
  }

  document.addEventListener('DOMContentLoaded', init);

  /* ─────────── 테스트 훅 ─────────── */
  window.__hangulTest = {
    tracePath: () => window.Trace.tracePath(),
    traceState: () => window.Trace.state(),
    bubbleTarget: () => window.Games.bubble.target(),
    firstTarget: () => window.Games.first.target(),
    curScreen: () => {
      const s = document.querySelector('.screen.on');
      return s ? s.id : null;
    },
  };

  return { showScreen, showReward };
})();
