/* 앱 셸 — 홈(단계 3개) → 라운드 목록(단계별 10) → 주사위 찾기 놀이.
 * 주사위들이 또르르 굴러 각자 동물 얼굴을 보이고, 카드가 "찾을 동물"을 크게 보여준다.
 * 아이가 그 동물이 나온 주사위를 모두 탭하면 반짝·효과음, 다 찾으면 카드 획득(완성).
 * 엉뚱한 주사위를 탭하면 부드럽게 흔들며 안내(무벌점).
 * 다 찾으면 색종이 축하 + TTS + 별 + 펫 간식. 진행도는 완성한 라운드 id로 저장한다. */
window.App = (() => {
  const D = window.DiceData;
  const A = window.Audio2;
  const P = window.Progress;
  const $ = id => document.getElementById(id);

  const ROLL_MS = 480; // 주사위 굴리는 애니메이션 길이

  /* 손그림 아이콘 — index.html <defs> 의 <symbol> 을 가져다 쓴다.
   * 이모지가 있던 자리에 그대로 들어가도록 크기는 CSS(.ic)가 글자 크기(em)로 맞춘다.
   * ⚠️ 주사위에 그려진 동물 얼굴은 놀잇감이라 손대지 않는다 — 여기 있는 건 화면 틀뿐. */
  const ic = (id, cls) => '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#dc-' + id + '"/></svg>';

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
    // 어디부터 놀면 되는지 알려 주는 시작 화살표는 shared/screen.css 가 첫 칸 안쪽에 얹는다
    menu.innerHTML = '';
    D.LEVELS.forEach(lv => {
      const ids = D.roundsOf(lv.id).map(x => x.id);
      const done = P.doneCount(ids);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-card ' + lv.cls;
      b.innerHTML =
        '<span class="mc-die">' + miniDie(lv.id) + '</span>' +
        '<span class="mc-name">' + lv.name + '</span>' +
        '<span class="mc-desc">' + lv.desc + '</span>' +
        '<span class="mc-prog">' + (done ? ic('star') + ' ' + done + ' / ' + ids.length : '처음이야!') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openRounds(lv); });
      menu.appendChild(b);
    });
  }

  // 단계 아이콘용 작은 주사위 (대표 라운드의 찾을 동물로)
  // 단계마다 다른 라운드를 대표로 삼는다 — 세 칸이 같은 동물이면 무엇이 다른지 안 보인다
  function miniDie(level) {
    const list = D.roundsOf(level);
    const round = list[(level - 1) % list.length];
    const aid = round.find[0];
    return '<span class="die mini">' + D.ANIMALS[aid].draw('mn' + level + aid) + '</span>';
  }

  /* ─────────── 라운드 목록 ─────────── */
  let curLevel = null;
  function openRounds(lv) {
    curLevel = lv;
    $('rounds-title').innerHTML = ic('die', 'ic-title') + ' ' + lv.name;
    const list = D.roundsOf(lv.id);
    $('rounds-count').textContent = P.doneCount(list.map(x => x.id)) + ' / ' + list.length;
    const box = $('rounds-list');
    box.innerHTML = '';
    list.forEach((rd, i) => {
      const done = P.isDone(rd.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'round-card' + (done ? ' done' : '');
      b.dataset.id = rd.id;
      b.innerHTML =
        '<span class="rd-no">' + (i + 1) + '</span>' +
        '<span class="rd-finds">' +
          rd.find.map(aid => '<span class="die tiny">' + D.ANIMALS[aid].draw('rc' + rd.id + aid) + '</span>').join('') +
        '</span>' +
        '<span class="rd-badge">' + (done ? ic('star') : ic('lens')) + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPlay(rd); });
      box.appendChild(b);
    });
    showScreen('scr-rounds');
  }

  /* ─────────── 놀이(찾기) ─────────── */
  let cur = null; // { round, targets, targetIdx:[], found:Set, rolled, locked }
  let rollTimer = null;

  function openPlay(rd) {
    if (rollTimer) { clearTimeout(rollTimer); rollTimer = null; }
    cur = {
      round: rd,
      targets: rd.find.slice(),
      targetIdx: D.targetIndices(rd),
      found: new Set(),
      rolled: false,
      locked: false,
    };
    $('play-title').innerHTML = ic('die', 'ic-title') + ' ' + D.levelDef(rd.level).name;
    renderFindCard();
    renderDice();
    $('btn-roll').disabled = false;
    $('btn-roll').classList.add('waiting');
    showScreen('scr-play');
    // 잠깐 뒤 자동으로 굴러간다 (아이가 굴리기를 눌러도 됨)
    rollTimer = setTimeout(() => { if (cur && !cur.rolled) roll(); }, 900);
  }

  // 본보기 카드: 찾을 동물을 크게
  function renderFindCard() {
    const box = $('find-faces');
    box.innerHTML = '';
    cur.targets.forEach(aid => {
      const el = document.createElement('span');
      el.className = 'die find';
      el.innerHTML = D.ANIMALS[aid].draw('fc' + aid);
      box.appendChild(el);
    });
    $('find-cap').innerHTML = ic('lens') + (cur.targets.length > 1 ? ' 이 동물들을 찾아요!' : ' 이 동물을 찾아요!');
  }

  // 주사위들
  function renderDice() {
    const box = $('dice-grid');
    box.className = 'dice-grid n' + cur.round.dice.length;
    box.innerHTML = '';
    cur.round.dice.forEach((aid, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'die-btn';
      b.dataset.idx = i;
      if (cur.rolled) {
        b.innerHTML = '<span class="die">' + D.ANIMALS[aid].draw('dg' + cur.round.id + i) + '</span>' +
                      '<span class="die-check">' + ic('check') + '</span>';
        if (cur.found.has(i)) b.classList.add('found');
      } else {
        b.innerHTML = '<span class="die cover">' + ic('pips', 'ic-pips') + '</span>';
      }
      b.addEventListener('click', ev => { ev.preventDefault(); tapDie(i, b); });
      box.appendChild(b);
    });
  }

  // 굴리기 — 또르르 구르고 얼굴을 보인다 (얼굴은 고정 데이터)
  function roll() {
    if (!cur || cur.rolled || cur.locked) return;
    if (rollTimer) { clearTimeout(rollTimer); rollTimer = null; }
    A.sfx.roll();
    $('btn-roll').disabled = true;
    $('btn-roll').classList.remove('waiting');
    // 구르는 애니메이션
    document.querySelectorAll('#dice-grid .die-btn .die.cover').forEach(el => el.classList.add('tumble'));
    rollTimer = setTimeout(() => {
      if (!cur) return;
      cur.rolled = true;
      renderDice();
      rollTimer = null;
      setTimeout(() => { if (cur && !cur.locked) speakFind(); }, 150);
    }, ROLL_MS);
  }

  function speakFind() {
    const names = cur.targets.map(id => D.ANIMALS[id].say);
    const list = names.join('하고 ');
    A.speak(list + ' 있는 주사위를 모두 찾아 볼까?');
  }

  /* ─────────── 탭 판정 ─────────── */
  function tapDie(i, el) {
    if (!cur || cur.locked) return;
    if (!cur.rolled) { roll(); return; } // 안 굴렸으면 먼저 굴린다
    if (cur.found.has(i)) { A.sfx.tap(); return; } // 이미 찾음
    const aid = cur.round.dice[i];
    if (cur.targets.indexOf(aid) >= 0) {
      // 맞는 주사위 — 반짝
      cur.found.add(i);
      if (el) { el.classList.add('found', 'sparkle'); }
      A.sfx.pop();
      if (cur.found.size === cur.targetIdx.length) complete();
    } else {
      // 엉뚱한 주사위 — 무벌점, 부드럽게 흔들고 안내
      if (el) wiggle(el);
      A.sfx.tap();
      const names = cur.targets.map(id => D.ANIMALS[id].say).join('하고 ');
      A.speak(names + '를 찾아봐!');
    }
  }

  /* ─────────── 완성 ─────────── */
  function complete() {
    cur.locked = true;
    const rd = cur.round;
    const first = !P.isDone(rd.id);
    P.markDone(rd.id);
    P.addStar(cur.targetIdx.length);
    if (window.Pet) Pet.awardSnack(1);
    // 단계를 처음으로 다 모으면 펫 식사 보상
    if (first && window.Pet) {
      const ids = D.roundsOf(rd.level).map(x => x.id);
      if (P.doneCount(ids) >= ids.length) Pet.awardMeal(1);
    }
    burstConfetti();
    A.sfx.fanfare();
    const praise = D.praises[Math.floor(Math.random() * D.praises.length)];
    setTimeout(() => A.speak(praise), 250);
    setTimeout(() => showReward(praise), 700);
  }

  /* ─────────── 보상 오버레이 ─────────── */
  function showReward(praise) {
    $('reward-praise').textContent = praise;
    // 찾은 동물 하나를 크게 축하 얼굴로
    $('reward-face').innerHTML = '<span class="die">' + D.ANIMALS[cur.targets[0]].draw('rw' + cur.targets[0]) + '</span>';
    $('reward').classList.add('on');
  }
  function nextRound() {
    const list = D.roundsOf(cur.round.level);
    const idx = list.findIndex(x => x.id === cur.round.id);
    for (let k = 1; k <= list.length; k++) {
      const cand = list[(idx + k) % list.length];
      if (!P.isDone(cand.id)) { openPlay(cand); return; }
    }
    openRounds(D.levelDef(cur.round.level));
  }

  /* ─────────── 색종이 축하 ─────────── */
  function burstConfetti() {
    const box = $('confetti');
    box.innerHTML = '';
    const colors = ['#5FB26E', '#FFC63D', '#7CC242', '#5CB8E8', '#FF8FB0', '#B57CE0'];
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

  /* ─────────── 잔심부름 ─────────── */
  function wiggle(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

  /* ─────────── 초기화 ─────────── */
  function init() {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());

    document.querySelectorAll('[data-go]').forEach(b => {
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); showScreen(b.dataset.go); });
    });
    $('btn-play-back').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); openRounds(D.levelDef(cur.round.level));
    });
    $('btn-roll').addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); roll(); });
    $('btn-listen').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      if (!cur) return;
      if (cur.locked) { A.speak('다 찾았어요!'); return; }
      if (!cur.rolled) { roll(); return; }
      speakFind();
    });
    $('reward-next').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on'); nextRound();
    });
    $('reward-close').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on');
      openRounds(D.levelDef(cur.round.level));
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
      targets: cur ? cur.targets.slice() : null,
      diceAnimals: cur ? cur.round.dice.slice() : null,
      diceCount: cur ? cur.round.dice.length : null,
      targetIndices: cur ? cur.targetIdx.slice() : null,
      foundCount: cur ? cur.found.size : null,
      rolled: cur ? cur.rolled : null,
      locked: cur ? cur.locked : null,
      done: cur ? P.isDone(cur.round.id) : null,
    };
  }
  return {
    debug,
    _roll: () => roll(),
    _attempt: (i) => tapDie(i, document.querySelector('.die-btn[data-idx="' + i + '"]')),
  };
})();
