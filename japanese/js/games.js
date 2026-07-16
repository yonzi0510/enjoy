/* 히라가나 놀이 — 거품 놀이(글자 찾아 터뜨리기) + 첫소리 놀이(낱말의 첫 글자 고르기)
 * 테스트 훅: window.__kanaTest.bubbleTarget() / firstTarget()
 */
window.Games = (() => {
  const D = window.KanaData;
  const A = window.Audio2;
  const P = window.Progress;
  const ROUNDS = 5;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function sample(arr, n, exclude) {
    return shuffle(arr.filter(x => x !== exclude)).slice(0, n);
  }

  function setDots(el, total, done) {
    el.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const d = document.createElement('span');
      d.className = 'dot' + (i < done ? ' on' : '');
      el.appendChild(d);
    }
  }

  // 라운드 종료 보상 — 낱말 카드 1장 + 별
  function reward(fromGame, onNext) {
    const kana = D.all[Math.floor(Math.random() * D.all.length)];
    const word = kana.words[Math.floor(Math.random() * kana.words.length)];
    P.addCard(word.w, word.e, fromGame);
    if (window.Pet) Pet.awardSnack(1); // 놀이 한 판 = 펫 간식
    P.addStar(ROUNDS);
    A.sfx.fanfare();
    window.App.showReward(word, onNext);
  }

  /* ─────────── 거품 놀이 ─────────── */
  const bubble = (() => {
    let area, dotsEl, targetEl, target, round, rafId, bubbles, running;

    function announce() {
      targetEl.textContent = target.ch;
      A.speakSeq([
        { text: target.ch, lang: 'ja', rate: 0.75 },
        { text: "'" + target.ko + "' 거품을 터뜨려요!", lang: 'ko', rate: 0.95 },
      ]);
    }

    function spawnRound() {
      area.querySelectorAll('.bubble').forEach(b => b.remove());
      bubbles = [];
      target = D.all[Math.floor(Math.random() * D.all.length)];
      const others = sample(D.all, 4, target);
      const chars = shuffle([target].concat(others));
      const W = area.clientWidth, H = area.clientHeight;
      chars.forEach((l, i) => {
        const el = document.createElement('button');
        el.className = 'bubble';
        el.type = 'button';
        el.dataset.ch = l.ch;
        el.textContent = l.ch;
        const size = Math.max(64, Math.min(110, W / 5));
        el.style.width = el.style.height = size + 'px';
        const b = {
          el,
          x: (W / chars.length) * i + Math.random() * (W / chars.length - size),
          y: H * 0.15 + Math.random() * H, // 일부는 바로 보이고 일부는 아래에서 올라온다
          v: 0.5 + Math.random() * 0.5,
          size,
        };
        el.addEventListener('pointerdown', ev => { ev.preventDefault(); tap(b); });
        area.appendChild(el);
        bubbles.push(b);
      });
      announce();
    }

    function tap(b) {
      if (!running) return;
      if (b.el.dataset.ch === target.ch) {
        A.sfx.pop();
        b.el.classList.add('popped');
        running = false;
        round += 1;
        setDots(dotsEl, ROUNDS, round);
        A.speakSeq([{ text: '참 잘했어요!', lang: 'ko' }]);
        setTimeout(() => {
          if (round >= ROUNDS) {
            reward('bubble', () => window.App.showScreen('scr-games'));
          } else {
            running = true;
            spawnRound();
          }
        }, 900);
      } else {
        A.sfx.bad();
        b.el.classList.add('shake');
        setTimeout(() => b.el.classList.remove('shake'), 400);
      }
    }

    function loop() {
      const H = area.clientHeight;
      bubbles.forEach(b => {
        b.y -= b.v * 2;
        if (b.y < -b.size) b.y = H + 10; // 위로 나가면 아래에서 다시
        b.el.style.transform = 'translate(' + b.x + 'px,' + b.y + 'px)';
      });
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      area = document.getElementById('bubble-area');
      dotsEl = document.getElementById('bubble-dots');
      targetEl = document.getElementById('bubble-target');
      round = 0;
      running = true;
      setDots(dotsEl, ROUNDS, 0);
      spawnRound();
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(loop);
    }
    function stop() { cancelAnimationFrame(rafId); running = false; A.stop(); }
    return { start, stop, target: () => (target ? target.ch : null) };
  })();

  /* ─────────── 첫소리 놀이 ─────────── */
  const first = (() => {
    let emojiEl, wordEl, choicesEl, dotsEl, round, cur, busy;

    // 낱말이 그 글자로 시작하는 글자만 사용 (を·ん 제외)
    const POOL = [];
    D.all.forEach(k => {
      if (D.noFirstSound[k.ch]) return;
      k.words.forEach(w => {
        if (w.w.charAt(0) === k.ch) POOL.push({ w: w.w, e: w.e, ko: w.ko, j: k.ch });
      });
    });
    const CHOICE_POOL = D.all.filter(k => !D.noFirstSound[k.ch]).map(k => k.ch);

    function next() {
      busy = false;
      cur = POOL[Math.floor(Math.random() * POOL.length)];
      emojiEl.textContent = cur.e;
      wordEl.textContent = cur.w;
      const others = sample(CHOICE_POOL, 2, cur.j);
      const chs = shuffle([cur.j].concat(others));
      choicesEl.innerHTML = '';
      chs.forEach(ch => {
        const b = document.createElement('button');
        b.className = 'choice';
        b.type = 'button';
        b.dataset.ch = ch;
        b.textContent = ch;
        b.addEventListener('pointerdown', ev => { ev.preventDefault(); pick(b, ch); });
        choicesEl.appendChild(b);
      });
      A.speakSeq([
        { text: cur.w, lang: 'ja', rate: 0.75 },
        { text: cur.ko + '! 첫 글자를 골라요', lang: 'ko', rate: 0.95 },
      ]);
    }

    function pick(btn, ch) {
      if (busy) return;
      if (ch === cur.j) {
        busy = true;
        A.sfx.good();
        btn.classList.add('right');
        round += 1;
        setDots(dotsEl, ROUNDS, round);
        A.speakSeq([
          { text: ch, lang: 'ja', rate: 0.75 },
          { text: cur.w, lang: 'ja', rate: 0.8 },
        ]);
        setTimeout(() => {
          if (round >= ROUNDS) {
            reward('first', () => window.App.showScreen('scr-games'));
          } else next();
        }, 1100);
      } else {
        A.sfx.bad();
        btn.classList.add('shake');
        setTimeout(() => btn.classList.remove('shake'), 400);
      }
    }

    function start() {
      emojiEl = document.getElementById('first-emoji');
      wordEl = document.getElementById('first-word');
      choicesEl = document.getElementById('first-choices');
      dotsEl = document.getElementById('first-dots');
      round = 0;
      setDots(dotsEl, ROUNDS, 0);
      next();
    }
    function stop() { A.stop(); }
    return { start, stop, target: () => (cur ? cur.j : null) };
  })();

  return { bubble, first };
})();
