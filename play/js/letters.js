/* 🔤 가나다 글자 찾기 — 한글 단계별 찾기 게임
 * 1단계 자음·모음 → 2단계 글자(받침X) → 3단계 쉬운 단어 → 4단계 받침 단어
 * 매 판 5라운드, 라운드마다 목표 글자가 3개 숨어 있음 (비슷한 글자들 사이에서)
 */
(() => {
  const $ = id => document.getElementById(id);

  const POOLS = {
    1: 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ'.split(''),
    2: ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하',
        '거', '너', '더', '러', '고', '노', '도', '로', '구', '누', '두', '루', '기', '니', '리', '비'],
    3: ['나비', '우주', '나무', '바다', '포도', '오리', '아기', '여우', '기차', '모자',
        '사자', '고래', '파도', '두부', '지구', '개미', '나라', '머리', '노래', '치즈'],
    4: ['책', '별', '달', '곰', '산', '강', '꽃', '눈', '문', '밥', '집', '손', '발',
        '책상', '연필', '딸기', '김밥', '수박', '당근', '풍선']
  };
  const LEVEL_NAME = { 1: '자음·모음', 2: '글자', 3: '쉬운 단어', 4: '받침 단어' };
  // 자음·모음 이름 (음성 안내용)
  const JAMO_NAME = {
    'ㄱ': '기역', 'ㄴ': '니은', 'ㄷ': '디귿', 'ㄹ': '리을', 'ㅁ': '미음', 'ㅂ': '비읍', 'ㅅ': '시옷',
    'ㅇ': '이응', 'ㅈ': '지읒', 'ㅊ': '치읓', 'ㅋ': '키읔', 'ㅌ': '티읕', 'ㅍ': '피읖', 'ㅎ': '히읗',
    'ㅏ': '아', 'ㅑ': '야', 'ㅓ': '어', 'ㅕ': '여', 'ㅗ': '오', 'ㅛ': '요', 'ㅜ': '우', 'ㅠ': '유', 'ㅡ': '으', 'ㅣ': '이'
  };
  const ROUNDS = 5;
  const COPIES = 3;   // 라운드마다 목표 글자 개수
  const CELLS = 18;   // 보드의 글자 방울 수
  const BUBBLE_COLORS = 6;

  const st = { level: 1, round: 0, remain: 0, hintCount: 0, playing: false, target: '' };

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
  }
  function speakName(t) { return JAMO_NAME[t] || t; }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* ─────────── 완료 오버레이 (글자 찾기 전용) ─────────── */
  document.body.insertAdjacentHTML('beforeend', `
<div id="letters-done" class="overlay hidden">
  <div id="letters-confetti" class="letters-confetti"></div>
  <div class="complete-card">
    <div class="complete-title">참 잘했어요!</div>
    <div id="letters-stars" class="complete-stars"></div>
    <div class="complete-btns">
      <button id="letters-done-home" class="big-btn btn-soft">🏠</button>
      <button id="letters-done-next" class="big-btn btn-primary">다음 단계 ▶</button>
    </div>
  </div>
</div>`);

  /* ─────────── 단계 선택 ─────────── */
  function openLevelSelect() {
    document.querySelectorAll('.letters-level-btn').forEach(btn => {
      const stars = Progress.getStars('letters_L' + btn.dataset.llevel);
      btn.querySelector('.level-btn-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    });
    $('letters-overlay').classList.remove('hidden');
    Sound.speak('글자 찾기! 몇 단계를 해 볼까요?');
  }
  $('btn-letters').addEventListener('click', openLevelSelect);
  $('letters-close').addEventListener('click', () => $('letters-overlay').classList.add('hidden'));
  $('letters-overlay').addEventListener('click', e => {
    if (e.target === $('letters-overlay')) $('letters-overlay').classList.add('hidden');
  });
  document.querySelectorAll('.letters-level-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $('letters-overlay').classList.add('hidden');
      startGame(+btn.dataset.llevel);
    });
  });

  /* ─────────── 게임 ─────────── */
  function startGame(level) {
    st.level = level;
    st.round = 0;
    st.hintCount = 0;
    st.playing = true;
    st.usedTargets = [];
    showScreen('screen-letters');
    Sound.speak(LEVEL_NAME[level] + ' 단계! 시작해 볼까요?');
    setTimeout(nextRound, 900);
  }

  function nextRound() {
    if (!st.playing) return;
    const pool = POOLS[st.level];
    // 이번 판에서 안 나온 목표 뽑기
    let target;
    do { target = pool[Math.floor(Math.random() * pool.length)]; }
    while (st.usedTargets.includes(target));
    st.usedTargets.push(target);
    st.target = target;
    st.remain = COPIES;

    // 진행 점
    const prog = $('letters-progress');
    prog.innerHTML = '';
    for (let i = 0; i < ROUNDS; i++) {
      const dot = document.createElement('div');
      dot.className = 'diff-dot' + (i < st.round ? ' on' : '');
      prog.appendChild(dot);
    }

    updateTargetLabel();

    // 보드: 목표 3개 + 헷갈리는 글자들
    const decoyPool = pool.filter(x => x !== target);
    const cells = [];
    for (let i = 0; i < COPIES; i++) cells.push(target);
    while (cells.length < CELLS) {
      cells.push(decoyPool[Math.floor(Math.random() * decoyPool.length)]);
    }
    shuffle(cells);

    const board = $('letters-board');
    board.innerHTML = '';
    cells.forEach((ch, i) => {
      const b = document.createElement('button');
      b.className = 'letter-bubble lb-c' + (i % BUBBLE_COLORS) + (ch.length > 1 ? ' lb-word' : '');
      b.textContent = ch;
      b.dataset.ch = ch;
      b.style.setProperty('--jx', (Math.random() * 16 - 8).toFixed(1) + 'px');
      b.style.setProperty('--jy', (Math.random() * 14 - 7).toFixed(1) + 'px');
      b.style.setProperty('--jr', (Math.random() * 10 - 5).toFixed(1) + 'deg');
      b.addEventListener('click', () => tapBubble(b, ch));
      board.appendChild(b);
    });

    Sound.speak(speakName(target) + '! ' + speakName(target) + '를 ' + COPIES + '개 찾아보세요!');
  }

  function updateTargetLabel() {
    $('letters-target-big').textContent = st.target;
    $('letters-target-count').textContent = (COPIES - st.remain) + ' / ' + COPIES;
  }

  function tapBubble(b, ch) {
    if (!st.playing || b.classList.contains('found')) return;
    if (ch === st.target) {
      b.classList.add('found');
      st.remain--;
      updateTargetLabel();
      Sound.correct();
      if (st.remain <= 0) {
        st.round++;
        if (st.round >= ROUNDS) { finish(); return; }
        Sound.speak('딩동댕! 다음 글자!');
        setTimeout(nextRound, 1100);
      }
    } else {
      b.classList.add('wrong');
      Sound.pop();
      setTimeout(() => b.classList.remove('wrong'), 500);
    }
  }

  function hint() {
    if (!st.playing) return;
    const targets = Array.from(document.querySelectorAll('.letter-bubble:not(.found)'))
      .filter(b => b.dataset.ch === st.target);
    if (!targets.length) return;
    const b = targets[Math.floor(Math.random() * targets.length)];
    b.classList.add('hinting');
    setTimeout(() => b.classList.remove('hinting'), 1900);
    st.hintCount++;
    Sound.sparkle();
    Sound.speak('여기를 잘 보세요!');
  }
  $('letters-hint').addEventListener('click', hint);

  function finish() {
    st.playing = false;
    const stars = st.hintCount === 0 ? 3 : (st.hintCount <= 2 ? 2 : 1);
    Progress.setStars('letters_L' + st.level, stars);

    const starsEl = $('letters-stars');
    starsEl.innerHTML = '';
    for (let i = 1; i <= 3; i++) {
      const s = document.createElement('span');
      s.className = 'star' + (i <= stars ? ' on' : '');
      s.textContent = '⭐';
      starsEl.appendChild(s);
    }
    $('letters-done-next').textContent = st.level < 4 ? '다음 단계 ▶' : '한 번 더 ▶';

    setTimeout(() => {
      $('letters-done').classList.remove('hidden');
      confetti();
      Sound.tada();
      Sound.speak('와, ' + LEVEL_NAME[st.level] + ' 단계를 다 찾았어요! 참 잘했어요!');
    }, 500);
  }

  function confetti() {
    const box = $('letters-confetti');
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
    $('letters-done').classList.add('hidden');
    showScreen('screen-home');
  }
  $('letters-back').addEventListener('click', goHome);
  $('letters-done-home').addEventListener('click', goHome);
  $('letters-done-next').addEventListener('click', () => {
    $('letters-done').classList.add('hidden');
    startGame(st.level < 4 ? st.level + 1 : st.level);
  });

  // 테스트 훅
  window.Letters = { startGame, state: st };
})();
