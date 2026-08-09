/* 앱 셸 — 홈(단계 3개) → 퍼즐 목록(단계별 10) → 놀이(돌림 블록 맞추기).
 * 나무 막대에 꿰인 원통(실린더) 2~4개가 저마다 다른 그림 얼굴을 여러 개 갖고 있다.
 * 카드는 맞춰야 할 그림 줄(각 실린더의 정답 얼굴)을 그림만으로 크게 보여준다.
 * 아이가 실린더를 하나씩 탭하면 다음 얼굴로 톡 돌아간다(원통이 도는 애니메이션+효과음).
 * 잘못 돌려도 벌점 없음 — 그냥 계속 탭해서 맞으면 된다. 실린더 전부가 동시에
 * 정답 얼굴을 보이면 완성: 색종이 축하 + TTS + 별(= 실린더 수) + 펫 간식.
 * 진행도는 완성한 퍼즐 id로 저장한다. */
window.App = (() => {
  const D = window.TwistData;
  const A = window.Audio2;
  const P = window.Progress;
  const I = window.TwistIcons;   // 손그림 아이콘(화면 틀 전용 — 블록 얼굴은 건드리지 않는다)
  const $ = id => document.getElementById(id);

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
    menu.innerHTML = '';
    D.LEVELS.forEach((lv, li) => {
      const ids = D.puzzlesOf(lv.id).map(x => x.id);
      const done = P.doneCount(ids);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-card ' + lv.cls;
      b.innerHTML =
        // 첫 칸에만 "여기부터 해요" 점선 화살표 — 글을 못 읽는 아이에게 순서를 알려 준다
        '<span class="mc-cyl">' + miniCyl(lv.id) + '</span>' +
        '<span class="mc-name">' + lv.name + '</span>' +
        '<span class="mc-desc">' + lv.desc + '</span>' +
        '<span class="mc-prog">' + (done ? I.span('star') + ' ' + done + ' / ' + ids.length : '처음이야!') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openRounds(lv); });
      menu.appendChild(b);
    });
  }

  // 단계 아이콘용 작은 실린더 얼굴(대표 퍼즐의 첫 실린더 정답 얼굴)
  function miniCyl(level) {
    const pz = D.puzzlesOf(level)[0];
    const c0 = pz.cylinders[0];
    return '<span class="cyl-face mini">' + c0.faces[c0.target] + '</span>';
  }

  /* ─────────── 퍼즐 목록 ─────────── */
  let curLevel = null;
  function openRounds(lv) {
    curLevel = lv;
    $('rounds-title').innerHTML = I.span('twist', 'ic-title') + ' ' + lv.name;
    const list = D.puzzlesOf(lv.id);
    $('rounds-count').textContent = P.doneCount(list.map(x => x.id)) + ' / ' + list.length;
    const box = $('rounds-list');
    box.innerHTML = '';
    list.forEach((pz, i) => {
      const done = P.isDone(pz.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'round-card' + (done ? ' done' : '');
      b.dataset.id = pz.id;
      b.innerHTML =
        '<span class="rd-no">' + (i + 1) + '</span>' +
        '<span class="rd-finds">' +
          pz.cylinders.map(c => '<span class="cyl-face tiny">' + c.faces[c.target] + '</span>').join('') +
        '</span>' +
        '<span class="rd-badge">' + I.html(done ? 'star' : 'twist') + '</span>';
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); openPlay(pz); });
      box.appendChild(b);
    });
    showScreen('scr-rounds');
  }

  /* ─────────── 놀이(돌림 블록 맞추기) ─────────── */
  let cur = null; // { puzzle, cylinders:[{faces,target,current}], locked }

  function openPlay(pz) {
    cur = {
      puzzle: pz,
      cylinders: pz.cylinders.map(c => ({
        faces: c.faces.slice(),
        target: c.target,
        // 시작 얼굴은 정답에서 일부러 떨어뜨려 둔다(처음부터 맞아있지 않게, 고정 규칙)
        current: (c.target + Math.max(1, Math.floor(c.faces.length / 2))) % c.faces.length,
      })),
      locked: false,
    };
    $('play-title').innerHTML = I.span('twist', 'ic-title') + ' 돌려서 맞춰요';
    renderFindCard();
    renderCylRow();
    showScreen('scr-play');
    setTimeout(() => { if (cur && !cur.locked) A.speak('카드처럼 블록을 돌려 볼까?'); }, 400);
  }

  // 본보기 카드: 맞춰야 할 그림 줄(각 실린더의 정답 얼굴)을 그림만으로
  function renderFindCard() {
    const box = $('find-faces');
    box.innerHTML = '';
    cur.puzzle.cylinders.forEach(c => {
      const el = document.createElement('span');
      el.className = 'cyl-face find';
      el.textContent = c.faces[c.target];
      box.appendChild(el);
    });
  }

  // 돌림 블록 줄(나무 막대 위 실린더들)
  function renderCylRow(animIdx) {
    const box = $('cyl-row');
    box.className = 'cyl-row n' + cur.cylinders.length;
    box.innerHTML = '';
    cur.cylinders.forEach((c, i) => {
      const matched = c.current === c.target;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cyl-btn' + (matched ? ' match' : '');
      b.dataset.idx = i;
      b.innerHTML =
        '<span class="cyl-face' + (animIdx === i ? ' spin-anim' : '') + '">' + c.faces[c.current] + '</span>' +
        (matched ? '<span class="cyl-check">' + I.html('check') + '</span>' : '');
      b.addEventListener('click', ev => { ev.preventDefault(); doSpin(i); });
      box.appendChild(b);
    });
  }

  /* ─────────── 돌리기(탭할 때마다 다음 얼굴로) ─────────── */
  function doSpin(i) {
    if (!cur || cur.locked) return;
    const c = cur.cylinders[i];
    if (!c) return;
    c.current = (c.current + 1) % c.faces.length;
    A.sfx.spin();
    renderCylRow(i);
    if (c.current === c.target) A.sfx.match();
    checkComplete();
  }

  function checkComplete() {
    if (!cur || cur.locked) return;
    if (cur.cylinders.every(c => c.current === c.target)) complete();
  }

  /* ─────────── 완성 ─────────── */
  function complete() {
    cur.locked = true;
    const pz = cur.puzzle;
    const first = !P.isDone(pz.id);
    P.markDone(pz.id);
    P.addStar(pz.cylinders.length);
    if (window.Pet) Pet.awardSnack(1);
    // 단계를 처음으로 다 모으면 펫 식사 보상
    if (first && window.Pet) {
      const ids = D.puzzlesOf(pz.stage).map(x => x.id);
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
    const c0 = cur.puzzle.cylinders[0];
    $('reward-face').innerHTML = '<span class="cyl-face">' + c0.faces[c0.target] + '</span>';
    $('reward').classList.add('on');
  }
  function nextRound() {
    const list = D.puzzlesOf(cur.puzzle.stage);
    const idx = list.findIndex(x => x.id === cur.puzzle.id);
    for (let k = 1; k <= list.length; k++) {
      const cand = list[(idx + k) % list.length];
      if (!P.isDone(cand.id)) { openPlay(cand); return; }
    }
    openRounds(D.levelDef(cur.puzzle.stage));
  }

  /* ─────────── 색종이 축하 ─────────── */
  function burstConfetti() {
    const box = $('confetti');
    box.innerHTML = '';
    const colors = ['#E8963C', '#FFC63D', '#C97C2E', '#5CB8E8', '#FF8FB0', '#7CC242'];
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

  /* ─────────── 초기화 ─────────── */
  function init() {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());

    document.querySelectorAll('[data-go]').forEach(b => {
      b.addEventListener('click', ev => { ev.preventDefault(); A.sfx.tap(); showScreen(b.dataset.go); });
    });
    $('btn-play-back').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); openRounds(D.levelDef(cur.puzzle.stage));
    });
    $('btn-listen').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap();
      if (!cur) return;
      if (cur.locked) { A.speak('다 맞췄어요!'); return; }
      A.speak('카드처럼 블록을 돌려 볼까?');
    });
    $('reward-next').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on'); nextRound();
    });
    $('reward-close').addEventListener('click', ev => {
      ev.preventDefault(); A.sfx.tap(); $('reward').classList.remove('on');
      openRounds(D.levelDef(cur.puzzle.stage));
    });

    renderHome();
  }
  init();

  /* ─────────── 종단 테스트용 ─────────── */
  function debug() {
    return {
      screen: screenId,
      stars: P.stars(),
      stage: cur ? cur.puzzle.stage : null,
      puzzleId: cur ? cur.puzzle.id : null,
      cylinders: cur ? cur.cylinders.map(c => ({ faces: c.faces.slice(), target: c.target, current: c.current })) : null,
      cylinderCount: cur ? cur.cylinders.length : null,
      solved: cur ? cur.cylinders.every(c => c.current === c.target) : null,
      locked: cur ? cur.locked : null,
      done: cur ? P.isDone(cur.puzzle.id) : null,
    };
  }
  return {
    debug,
    _spin: (i) => doSpin(i),
    _solve: () => {
      if (!cur) return;
      cur.cylinders.forEach((c, i) => { while (c.current !== c.target) doSpin(i); });
    },
  };
})();
