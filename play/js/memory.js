/* 🃏 짝꿍 카드 — 같은 그림 두 장 찾기 (기억력 놀이)
 * 판이 시작되면 카드가 5초간 다 보였다가("잘 기억해!") 일제히 뒤집히고, 두 장을 눌러 짝을 맞춘다.
 * 맞으면 팡파르+카드 폴짝+그림 이름 소리, 틀리면 살짝 흔들리고 다시 뒤집힘(벌점 없음).
 * 1단계 8장(4쌍) → 2단계 16장(8쌍) → 3단계 24장(12쌍) → 4단계 36장(18쌍).
 * 그림은 과일·동물·탈것·사물을 섞은 한 벌(POOL)에서 판마다 겹치지 않게 뽑는다.
 * 판 완성 = 별 + 펫 간식, 4단계까지 모두 처음 완주하면 펫 식사.
 */
(() => {
  const $ = id => document.getElementById(id);

  // 서로 다른 그림 한 벌 — 4단계(18쌍)를 겹침 없이 채우려면 18종 이상 필요.
  // 과일·동물·탈것·사물을 섞어 두어 한 판 안에서 다양한 그림이 나온다.
  const POOL = [
    // 과일
    ['🍎', '사과'], ['🍌', '바나나'], ['🍇', '포도'], ['🍓', '딸기'],
    ['🍉', '수박'], ['🍊', '귤'], ['🍑', '복숭아'], ['🍍', '파인애플'],
    // 동물
    ['🐶', '강아지'], ['🐱', '고양이'], ['🐰', '토끼'], ['🐼', '판다'],
    ['🦁', '사자'], ['🐸', '개구리'], ['🐷', '돼지'], ['🐵', '원숭이'],
    // 탈것
    ['🚗', '자동차'], ['🚌', '버스'], ['🚂', '기차'], ['✈️', '비행기'],
    ['🚢', '배'], ['🚲', '자전거'], ['🚁', '헬리콥터'], ['🚀', '로켓'],
    // 사물
    ['⚽', '축구공'], ['🎈', '풍선'], ['🎁', '선물'], ['⭐', '별'],
    ['🌈', '무지개'], ['🌸', '꽃'], ['☂️', '우산'], ['🔔', '종']
  ];
  const PAIRS = { 1: 4, 2: 8, 3: 12, 4: 18 };  // 단계별 짝 수 (8·16·24·36장)
  const MAX_LEVEL = 4;
  const PEEK_MS = 5000;                         // 시작할 때 카드를 보여 주는 시간(5초)

  const st = { level: 1, pairs: 4, found: 0, wrongs: 0, picked: [], busy: false, peeking: false, playing: false };

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
  }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* ─────────── 완료 오버레이 (짝꿍 카드 전용) ─────────── */
  document.body.insertAdjacentHTML('beforeend', `
<div id="memory-done" class="overlay hidden">
  <div id="memory-confetti" class="letters-confetti"></div>
  <div class="complete-card">
    <div class="complete-title">참 잘했어요!</div>
    <div id="memory-stars" class="complete-stars"></div>
    <div class="complete-btns">
      <button id="memory-done-home" class="big-btn btn-soft">🏠</button>
      <button id="memory-done-next" class="big-btn btn-primary">다음 단계 ▶</button>
    </div>
  </div>
</div>`);

  /* ─────────── 단계 선택 ─────────── */
  function openLevelSelect() {
    document.querySelectorAll('#memory-overlay .letters-level-btn').forEach(btn => {
      const stars = Progress.getStars('memory_L' + btn.dataset.mlevel);
      btn.querySelector('.level-btn-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    });
    $('memory-overlay').classList.remove('hidden');
    Sound.speak('짝꿍 카드! 같은 그림 두 장을 찾는 놀이예요. 몇 단계를 해 볼까요?');
  }
  $('btn-memory').addEventListener('click', openLevelSelect);
  $('memory-close').addEventListener('click', () => $('memory-overlay').classList.add('hidden'));
  $('memory-overlay').addEventListener('click', e => {
    if (e.target === $('memory-overlay')) $('memory-overlay').classList.add('hidden');
  });
  document.querySelectorAll('#memory-overlay .letters-level-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $('memory-overlay').classList.add('hidden');
      startGame(+btn.dataset.mlevel);
    });
  });

  /* ─────────── 게임 ─────────── */
  function startGame(level) {
    st.level = level;
    st.pairs = PAIRS[level];
    st.found = 0;
    st.wrongs = 0;
    st.picked = [];
    st.busy = false;
    st.playing = true;

    $('memory-title').textContent = '🃏 짝꿍 카드 · ' + level + '단계';

    // 짝 카드 만들기: 한 벌에서 짝 수만큼 겹침 없이 뽑아 2장씩
    const chosen = shuffle(POOL.slice()).slice(0, st.pairs);
    const cards = shuffle(chosen.concat(chosen).map(it => ({ e: it[0], name: it[1] })));

    const board = $('memory-board');
    board.dataset.level = level;
    board.innerHTML = '';
    cards.forEach(c => {
      const b = document.createElement('button');
      b.className = 'mem-card up'; // 처음 5초는 다 보여 준다
      b.dataset.k = c.e;
      b.dataset.name = c.name;
      b.setAttribute('aria-label', '카드');
      b.innerHTML =
        '<span class="mem-inner">' +
        '  <span class="mem-face mem-back">❓</span>' +
        '  <span class="mem-face mem-front">' + c.e + '</span>' +
        '</span>';
      b.addEventListener('click', () => tapCard(b));
      board.appendChild(b);
    });

    // 진행 점 (짝 수만큼)
    const prog = $('memory-progress');
    prog.innerHTML = '';
    for (let i = 0; i < st.pairs; i++) {
      const dot = document.createElement('div');
      dot.className = 'diff-dot';
      prog.appendChild(dot);
    }

    showScreen('screen-memory');
    Sound.speak('카드 ' + (st.pairs * 2) + '장이에요! 잘 기억해!');

    // 5초 뒤 전부 뒤집기 → 놀이 시작
    st.peeking = true;
    setTimeout(() => {
      if (!st.playing) return;
      document.querySelectorAll('.mem-card').forEach(c => c.classList.remove('up'));
      st.peeking = false;
      Sound.sparkle();
    }, PEEK_MS);
  }

  function tapCard(card) {
    if (!st.playing || st.peeking || st.busy) return;
    if (card.classList.contains('up') || card.classList.contains('matched')) return;
    card.classList.add('up');
    Sound.pop();
    st.picked.push(card);
    if (st.picked.length < 2) return;

    const [a, b] = st.picked;
    st.picked = [];
    if (a.dataset.k === b.dataset.k) {
      // 짝! — 팡파르 + 폴짝 + 이름 부르기
      a.classList.add('matched');
      b.classList.add('matched');
      st.found++;
      const dots = document.querySelectorAll('#memory-progress .diff-dot');
      if (dots[st.found - 1]) dots[st.found - 1].classList.add('on');
      Sound.correct();
      if (st.found >= st.pairs) finish();
      else Sound.speak(a.dataset.name + '!');
    } else {
      // 다른 그림 — 살짝 흔들리고 다시 뒤집힘 (벌점 없음)
      st.busy = true;
      st.wrongs++;
      a.classList.add('wrong');
      b.classList.add('wrong');
      Sound.pop();
      setTimeout(() => {
        a.classList.remove('up', 'wrong');
        b.classList.remove('up', 'wrong');
        st.busy = false;
      }, 750);
    }
  }

  function calcStars() {
    if (st.wrongs === 0) return 3;
    if (st.wrongs <= st.pairs) return 2;
    return 1;
  }

  function finish() {
    st.playing = false;
    const stars = calcStars();
    const firstClear = Progress.getStars('memory_L' + st.level) === 0; // 이번이 첫 완주인지
    Progress.setStars('memory_L' + st.level, stars);

    // 펫 먹이: 판 완성 = 간식, 모든 단계를 처음 다 깨면 식사
    if (window.Pet) {
      Pet.awardSnack(1);
      const allCleared = [1, 2, 3, 4].every(l => Progress.getStars('memory_L' + l) > 0);
      if (firstClear && allCleared) Pet.awardMeal(1);
    }

    const starsEl = $('memory-stars');
    starsEl.innerHTML = '';
    for (let i = 1; i <= 3; i++) {
      const s = document.createElement('span');
      s.className = 'star' + (i <= stars ? ' on' : '');
      s.textContent = '⭐';
      starsEl.appendChild(s);
    }
    $('memory-done-next').textContent = st.level < MAX_LEVEL ? '다음 단계 ▶' : '한 번 더 ▶';

    setTimeout(() => {
      $('memory-done').classList.remove('hidden');
      confetti();
      Sound.tada();
      Sound.speak('와, 짝꿍을 다 찾았어요! 참 잘했어요!');
    }, 600);
  }

  function confetti() {
    const box = $('memory-confetti');
    box.innerHTML = '';
    const colors = ['#FF4D4D', '#FFB800', '#4DC94D', '#4DA6FF', '#C77DFF', '#FF8FC7'];
    for (let i = 0; i < 40; i++) {
      const p = document.createElement('div');
      p.className = 'confetti';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = colors[i % colors.length];
      p.style.width = p.style.height = (8 + Math.random() * 10) + 'px';
      p.style.borderRadius = Math.random() < 0.5 ? '50%' : '3px';
      p.style.animationDuration = (1.4 + Math.random() * 1.6) + 's';
      p.style.animationDelay = (Math.random() * 0.7) + 's';
      box.appendChild(p);
    }
    setTimeout(() => { box.innerHTML = ''; }, 4200);
  }

  function goHome() {
    st.playing = false;
    if (window.speechSynthesis) speechSynthesis.cancel();
    $('memory-done').classList.add('hidden');
    showScreen('screen-home');
  }
  $('memory-back').addEventListener('click', goHome);
  $('memory-done-home').addEventListener('click', goHome);
  $('memory-done-next').addEventListener('click', () => {
    $('memory-done').classList.add('hidden');
    startGame(st.level < MAX_LEVEL ? st.level + 1 : st.level);
  });

  // 테스트 훅
  window.MemoryGame = { startGame, state: st, POOL, MAX_LEVEL };
})();
