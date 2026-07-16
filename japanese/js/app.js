/* 앱 셸 — 화면 전환, 글자 그리드/상세, 따라쓰기 흐름, 보상 오버레이 */
window.App = (() => {
  const D = window.KanaData;
  const A = window.Audio2;
  const P = window.Progress;

  let gridPurpose = 'learn'; // 'learn' | 'trace'
  let gridTab = 'a';         // 'a' = あ~な행 | 'b' = は~ん행
  let curKana = null;

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
    const rows = gridTab === 'a' ? D.groupA : D.groupB;
    grid.innerHTML = '';
    rows.forEach(r => r.kana.forEach(k => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'letter-cell' + (P.hasTraced(k.ch) ? ' traced' : '');
      b.dataset.ch = k.ch;
      b.innerHTML = '<span class="lc-ch">' + k.ch + '</span><span class="lc-name">' + k.ko + '</span>' +
        (P.hasTraced(k.ch) ? '<span class="lc-star">⭐</span>' : '');
      b.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.tap();
        curKana = k;
        if (gridPurpose === 'trace') openTrace();
        else openLetter();
      });
      grid.appendChild(b);
    }));
  }

  /* ─────────── 글자 상세 ─────────── */
  function openLetter() {
    const k = curKana;
    document.getElementById('letter-big').textContent = k.ch;
    document.getElementById('letter-name').textContent = k.ch + ' · ' + k.ko + ' (' + k.romaji + ')';
    const words = document.getElementById('letter-words');
    words.innerHTML = '';
    k.words.forEach(w => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'wordbtn';
      b.innerHTML = '<span class="wb-emoji">' + w.e + '</span><span class="wb-word">' + w.w + '</span><span class="wb-ko">' + w.ko + '</span>';
      b.addEventListener('click', ev => {
        ev.preventDefault();
        A.sfx.tap();
        A.speakSeq([
          { text: w.w, lang: 'ja', rate: 0.75 },
          { text: w.ko, lang: 'ko', rate: 0.95 },
        ]);
      });
      words.appendChild(b);
    });
    showScreen('scr-letter');
    A.speakSeq([{ text: k.ch, lang: 'ja', rate: 0.7 }, { text: k.ko, lang: 'ko', rate: 0.95 }]);
  }

  /* ─────────── 따라쓰기 ─────────── */
  function openTrace() {
    const k = curKana;
    showScreen('scr-trace');
    document.getElementById('trace-ch').textContent = k.ch;
    document.getElementById('trace-name').textContent = k.ko;
    const cv = document.getElementById('trace-canvas');
    // 화면 크기에 맞춰 정사각형 캔버스
    const holder = document.getElementById('trace-holder');
    const size = Math.min(holder.clientWidth, holder.clientHeight, 560);
    cv.width = cv.height = Math.max(280, size) * (window.devicePixelRatio > 1 ? 2 : 1);
    cv.style.width = cv.style.height = Math.max(280, size) + 'px';
    updateStrokeDots(k.strokes.length, 0);
    A.speakSeq([
      { text: k.ch, lang: 'ja', rate: 0.7 },
      { text: '반짝이는 점부터 따라 써 볼까요?', lang: 'ko', rate: 1.0 },
    ]);
    window.Trace.start(cv, k, {
      onStroke(done, total) {
        A.sfx.stroke();
        updateStrokeDots(total, done);
      },
      onDone() {
        updateStrokeDots(k.strokes.length, k.strokes.length);
        P.recordTrace(k.ch);
        P.addStar(3);
        const w = k.words[Math.floor(Math.random() * k.words.length)];
        const isNew = P.addCard(w.w, w.e, 'trace');
        A.sfx.fanfare();
        A.speakSeq([
          { text: k.ch, lang: 'ja', rate: 0.75, pitch: 1.3 },
          { text: '다 썼어요!' + (isNew ? ' 낱말 카드 선물!' : ''), lang: 'ko', rate: 0.95 },
          { text: w.w, lang: 'ja', rate: 0.8 },
        ]);
        // 오십음도 순서(あいうえお…)로 다음 글자 자동 진행
        const nxt = D.all[D.all.indexOf(k) + 1] || null;
        const toList = () => { gridPurpose = 'trace'; showScreen('scr-letters'); };
        setTimeout(() => showReward(w,
          () => { if (nxt) { curKana = nxt; openTrace(); } else toList(); },
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
    document.getElementById('reward-word').textContent = word.w + ' · ' + word.ko;
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
        if (nm) A.speakSeq([{ text: nm.textContent, lang: 'ko', rate: 1.0 }]);
        const go = b.dataset.go;
        if (go === 'learn') { gridPurpose = 'learn'; showScreen('scr-letters'); }
        else if (go === 'trace') { gridPurpose = 'trace'; showScreen('scr-letters'); }
        else showScreen(go);
      });
    });
    // あ~な / は~ん 탭
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
      A.speakSeq([{ text: curKana.ch, lang: 'ja', rate: 0.7 }, { text: curKana.ko, lang: 'ko', rate: 0.95 }]);
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
  window.__kanaTest = {
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
