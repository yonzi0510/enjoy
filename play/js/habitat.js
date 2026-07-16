/* 🏠 동물의 집 찾기 — 사는 곳으로 끌어다 주는 분류 놀이
 * 세 구역(SVG 배경) 위로 동물이 하나씩 나타나 "나는 어디에 살까~?" 하고 물으면,
 * 맞는 구역으로 드래그해 데려다준다. 맞으면 그 구역에서 헤엄치고/뛰놀고/날며 확인 멘트,
 * 틀리면 갸웃하고 다시 기회 (벌점 없음).
 * 주제: 동물(바다·숲·하늘 18종) + 탈것(도로·바다·하늘 12종). 한 판 6마리.
 * 판 완성 = 별 + 펫 간식, 주제의 모든 친구를 처음 데려다주면 펫 식사.
 */
(() => {
  const $ = id => document.getElementById(id);

  /* ─────────── 구역 SVG 배경 ─────────── */
  const BG = {
    sea:
      '<svg class="hz-bg" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<rect width="300" height="200" fill="#7BC8E8"/>' +
      '<path d="M0 46 Q25 32 50 46 T100 46 T150 46 T200 46 T250 46 T300 46 V200 H0 Z" fill="#54AEDB"/>' +
      '<path d="M0 100 Q25 86 50 100 T100 100 T150 100 T200 100 T250 100 T300 100 V200 H0 Z" fill="#3B92C6"/>' +
      '<circle cx="58" cy="150" r="6" fill="#A8DFF2" opacity=".7"/>' +
      '<circle cx="224" cy="128" r="8" fill="#A8DFF2" opacity=".6"/>' +
      '<circle cx="150" cy="172" r="5" fill="#A8DFF2" opacity=".7"/>' +
      '<path d="M250 178 q10 -14 20 0 q-10 6 -20 0" fill="#2E7BA8"/>' +
      '</svg>',
    forest:
      '<svg class="hz-bg" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<rect width="300" height="200" fill="#DFF3C8"/>' +
      '<ellipse cx="70" cy="215" rx="160" ry="105" fill="#9BD97B"/>' +
      '<ellipse cx="250" cy="230" rx="170" ry="115" fill="#84C765"/>' +
      '<rect x="52" y="70" width="12" height="34" rx="5" fill="#9A6B3F"/>' +
      '<circle cx="58" cy="52" r="26" fill="#5FAE46"/>' +
      '<rect x="150" y="96" width="14" height="40" rx="6" fill="#8A5D34"/>' +
      '<circle cx="157" cy="70" r="32" fill="#4E9E3C"/>' +
      '<rect x="242" y="82" width="12" height="34" rx="5" fill="#9A6B3F"/>' +
      '<circle cx="248" cy="62" r="26" fill="#5FAE46"/>' +
      '<circle cx="110" cy="168" r="6" fill="#FF8FB0"/><circle cx="205" cy="180" r="6" fill="#FFD93D"/>' +
      '</svg>',
    sky:
      '<svg class="hz-bg" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<rect width="300" height="200" fill="#AEE3FF"/>' +
      '<circle cx="252" cy="42" r="24" fill="#FFE066"/>' +
      '<g fill="#FFFFFF" opacity=".92">' +
      '<ellipse cx="70" cy="70" rx="34" ry="16"/><ellipse cx="94" cy="60" rx="24" ry="13"/>' +
      '<ellipse cx="180" cy="130" rx="38" ry="17"/><ellipse cx="206" cy="120" rx="26" ry="13"/>' +
      '<ellipse cx="60" cy="160" rx="28" ry="13"/>' +
      '</g>' +
      '</svg>',
    road:
      '<svg class="hz-bg" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<rect width="300" height="200" fill="#C8E8F8"/>' +
      '<rect x="30" y="26" width="34" height="60" rx="4" fill="#B9AEDD"/>' +
      '<rect x="80" y="14" width="40" height="72" rx="4" fill="#F0B8C8"/>' +
      '<rect x="190" y="30" width="36" height="56" rx="4" fill="#A8D8C0"/>' +
      '<rect y="86" width="300" height="16" fill="#8BCF6B"/>' +
      '<rect y="102" width="300" height="98" fill="#8D9199"/>' +
      '<g fill="#FFF7D6"><rect x="14" y="144" width="42" height="11" rx="5"/>' +
      '<rect x="90" y="144" width="42" height="11" rx="5"/>' +
      '<rect x="166" y="144" width="42" height="11" rx="5"/>' +
      '<rect x="242" y="144" width="42" height="11" rx="5"/></g>' +
      '</svg>'
  };

  /* ─────────── 주제 데이터 ─────────── */
  const TOPICS = {
    animals: {
      id: 'animals', name: '동물의 집', emoji: '🐾',
      question: '나는 어디에 살까~?',
      zones: [
        { id: 'sea',    name: '바다', emoji: '🌊', anim: 'swim', svg: BG.sea },
        { id: 'forest', name: '숲',   emoji: '🌳', anim: 'hop',  svg: BG.forest },
        { id: 'sky',    name: '하늘', emoji: '☁️', anim: 'fly',  svg: BG.sky }
      ],
      items: [
        { id: 'fish',     e: '🐟', name: '물고기',  zone: 'sea',    fact: '물고기는 바다에 살아요!' },
        { id: 'octopus',  e: '🐙', name: '문어',    zone: 'sea',    fact: '문어는 바다에 살아요!' },
        { id: 'crab',     e: '🦀', name: '게',      zone: 'sea',    fact: '게는 바다에 살아요!' },
        { id: 'dolphin',  e: '🐬', name: '돌고래',  zone: 'sea',    fact: '돌고래는 바다에 살아요!' },
        { id: 'whale',    e: '🐳', name: '고래',    zone: 'sea',    fact: '고래는 바다에 살아요!' },
        { id: 'shark',    e: '🦈', name: '상어',    zone: 'sea',    fact: '상어는 바다에 살아요!' },
        { id: 'rabbit',   e: '🐰', name: '토끼',    zone: 'forest', fact: '토끼는 숲에 살아요!' },
        { id: 'fox',      e: '🦊', name: '여우',    zone: 'forest', fact: '여우는 숲에 살아요!' },
        { id: 'bear',     e: '🐻', name: '곰',      zone: 'forest', fact: '곰은 숲에 살아요!' },
        { id: 'deer',     e: '🦌', name: '사슴',    zone: 'forest', fact: '사슴은 숲에 살아요!' },
        { id: 'squirrel', e: '🐿️', name: '다람쥐',  zone: 'forest', fact: '다람쥐는 숲에 살아요!' },
        { id: 'boar',     e: '🐗', name: '멧돼지',  zone: 'forest', fact: '멧돼지는 숲에 살아요!' },
        { id: 'bird',     e: '🐦', name: '새',      zone: 'sky',    fact: '새는 하늘을 날아다녀요!' },
        { id: 'eagle',    e: '🦅', name: '독수리',  zone: 'sky',    fact: '독수리는 하늘을 날아다녀요!' },
        { id: 'owl',      e: '🦉', name: '부엉이',  zone: 'sky',    fact: '부엉이는 하늘을 날아다녀요!' },
        { id: 'butterfly', e: '🦋', name: '나비',   zone: 'sky',    fact: '나비는 하늘을 날아다녀요!' },
        { id: 'bee',      e: '🐝', name: '꿀벌',    zone: 'sky',    fact: '꿀벌은 하늘을 날아다녀요!' },
        { id: 'bat',      e: '🦇', name: '박쥐',    zone: 'sky',    fact: '박쥐는 하늘을 날아다녀요!' }
      ]
    },
    vehicles: {
      id: 'vehicles', name: '탈것의 길', emoji: '🚗',
      question: '나는 어디로 다닐까~?',
      zones: [
        { id: 'road', name: '도로', emoji: '🛣️', anim: 'drive', svg: BG.road },
        { id: 'sea',  name: '바다', emoji: '🌊', anim: 'swim',  svg: BG.sea },
        { id: 'sky',  name: '하늘', emoji: '☁️', anim: 'fly',   svg: BG.sky }
      ],
      items: [
        { id: 'car',        e: '🚗', name: '자동차',   zone: 'road', fact: '자동차는 도로에서 달려요!' },
        { id: 'bus',        e: '🚌', name: '버스',     zone: 'road', fact: '버스는 도로에서 달려요!' },
        { id: 'firetruck',  e: '🚒', name: '소방차',   zone: 'road', fact: '소방차는 도로에서 달려요!' },
        { id: 'police',     e: '🚓', name: '경찰차',   zone: 'road', fact: '경찰차는 도로에서 달려요!' },
        { id: 'sailboat',   e: '⛵', name: '돛단배',   zone: 'sea',  fact: '돛단배는 바다에서 떠다녀요!' },
        { id: 'ship',       e: '🚢', name: '큰 배',    zone: 'sea',  fact: '큰 배는 바다에서 떠다녀요!' },
        { id: 'boat',       e: '🛥️', name: '보트',     zone: 'sea',  fact: '보트는 바다에서 떠다녀요!' },
        { id: 'canoe',      e: '🛶', name: '카누',     zone: 'sea',  fact: '카누는 바다에서 떠다녀요!' },
        { id: 'plane',      e: '✈️', name: '비행기',   zone: 'sky',  fact: '비행기는 하늘을 날아요!' },
        { id: 'helicopter', e: '🚁', name: '헬리콥터', zone: 'sky',  fact: '헬리콥터는 하늘을 날아요!' },
        { id: 'balloon',    e: '🎈', name: '열기구',   zone: 'sky',  fact: '열기구는 하늘을 날아요!' },
        { id: 'rocket',     e: '🚀', name: '로켓',     zone: 'sky',  fact: '로켓은 하늘을 날아요!' }
      ]
    }
  };
  const ROUND = 6; // 한 판에 데려다줄 친구 수

  const st = { topic: null, queue: [], idx: 0, cur: null, wrongs: 0, newDone: false, busy: false, playing: false };

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

  /* ─────────── 완료 오버레이 (동물의 집 전용) ─────────── */
  document.body.insertAdjacentHTML('beforeend', `
<div id="habitat-done" class="overlay hidden">
  <div id="habitat-confetti" class="letters-confetti"></div>
  <div class="complete-card">
    <div class="complete-title">참 잘했어요!</div>
    <div id="habitat-stars" class="complete-stars"></div>
    <div id="habitat-done-count" class="habitat-done-count"></div>
    <div class="complete-btns">
      <button id="habitat-done-home" class="big-btn btn-soft">🏠</button>
      <button id="habitat-done-next" class="big-btn btn-primary">한 번 더 ▶</button>
    </div>
  </div>
</div>`);

  /* ─────────── 주제 선택 ─────────── */
  function openTopicSelect() {
    document.querySelectorAll('.habitat-topic-btn').forEach(btn => {
      const t = TOPICS[btn.dataset.topic];
      const stars = Progress.getStars('habitat_' + t.id);
      btn.querySelector('.level-btn-stars').textContent =
        '★'.repeat(stars) + '☆'.repeat(3 - stars) + ' · ' + Progress.habitatDoneCount(t.id) + '/' + t.items.length;
    });
    $('habitat-overlay').classList.remove('hidden');
    Sound.speak('집 찾기 놀이! 동물 친구랑 탈것 친구, 누구를 도와줄까요?');
  }
  $('btn-habitat').addEventListener('click', openTopicSelect);
  $('habitat-close').addEventListener('click', () => $('habitat-overlay').classList.add('hidden'));
  $('habitat-overlay').addEventListener('click', e => {
    if (e.target === $('habitat-overlay')) $('habitat-overlay').classList.add('hidden');
  });
  document.querySelectorAll('.habitat-topic-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $('habitat-overlay').classList.add('hidden');
      startGame(btn.dataset.topic);
    });
  });

  /* ─────────── 게임 ─────────── */
  function startGame(topicId) {
    const topic = TOPICS[topicId];
    if (!topic) return;
    st.topic = topic;
    st.idx = 0;
    st.wrongs = 0;
    st.newDone = false;
    st.busy = false;
    st.playing = true;

    // 아직 집을 못 찾은 친구 먼저 (주제 완주를 향해 가도록)
    const undone = shuffle(topic.items.filter(i => !Progress.isHabitatDone(topic.id, i.id)));
    const done = shuffle(topic.items.filter(i => Progress.isHabitatDone(topic.id, i.id)));
    st.queue = shuffle(undone.concat(done).slice(0, ROUND));

    $('habitat-title').textContent = '🏠 ' + topic.name + ' 찾기';

    // 구역 그리기
    const wrap = $('habitat-zones');
    wrap.innerHTML = '';
    topic.zones.forEach(z => {
      const el = document.createElement('div');
      el.className = 'habitat-zone hz-' + z.id;
      el.dataset.zone = z.id;
      el.innerHTML = z.svg +
        '<div class="hz-guests"></div>' +
        '<div class="hz-label">' + z.emoji + ' ' + z.name + '</div>';
      wrap.appendChild(el);
    });

    // 진행 점
    const prog = $('habitat-progress');
    prog.innerHTML = '';
    for (let i = 0; i < st.queue.length; i++) {
      const dot = document.createElement('div');
      dot.className = 'diff-dot';
      prog.appendChild(dot);
    }

    showScreen('screen-habitat');
    Sound.speak(topic.name + ' 찾기! 친구를 손가락으로 끌어서 집에 데려다주세요!');
    setTimeout(showItem, 1200);
  }

  function showItem() {
    if (!st.playing) return;
    st.cur = st.queue[st.idx];
    const actor = $('habitat-actor');
    actor.classList.remove('gone', 'tilt');
    actor.innerHTML =
      '<span class="habitat-actor-emoji">' + st.cur.e + '</span>' +
      '<span class="habitat-actor-name">' + st.cur.name + '</span>';
    actor.classList.remove('pop-in');
    void actor.offsetWidth;
    actor.classList.add('pop-in');
    $('habitat-question').textContent = '💬 ' + st.topic.question;
    sayQuestion();
  }

  function sayQuestion() {
    if (!st.cur) return;
    Sound.speak('나는 ' + st.cur.name + '! ' + st.topic.question);
  }
  $('habitat-say').addEventListener('click', () => { if (st.playing && !st.busy) sayQuestion(); });

  /* ─────────── 드래그 ─────────── */
  const drag = { on: false, sx: 0, sy: 0 };
  function zoneAt(x, y) {
    let found = null;
    document.querySelectorAll('.habitat-zone').forEach(z => {
      const r = z.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) found = z;
    });
    return found;
  }
  function clearHover() {
    document.querySelectorAll('.habitat-zone.hover').forEach(z => z.classList.remove('hover'));
  }

  const actorEl = document.getElementById('habitat-actor');
  actorEl.addEventListener('pointerdown', e => {
    if (!st.playing || st.busy || !st.cur) return;
    e.preventDefault();
    try { actorEl.setPointerCapture(e.pointerId); } catch (err) {}
    drag.on = true;
    drag.sx = e.clientX;
    drag.sy = e.clientY;
    actorEl.classList.add('dragging');
  });
  actorEl.addEventListener('pointermove', e => {
    if (!drag.on) return;
    actorEl.style.transform = 'translate(' + (e.clientX - drag.sx) + 'px,' + (e.clientY - drag.sy) + 'px)';
    clearHover();
    const z = zoneAt(e.clientX, e.clientY);
    if (z) z.classList.add('hover');
  });
  actorEl.addEventListener('pointerup', e => {
    if (!drag.on) return;
    drag.on = false;
    actorEl.classList.remove('dragging');
    actorEl.style.transform = '';
    clearHover();
    const z = zoneAt(e.clientX, e.clientY);
    if (!z) return; // 구역 밖 — 조용히 제자리로
    if (z.dataset.zone === st.cur.zone) correct(z, e.clientX, e.clientY);
    else wrong();
  });
  actorEl.addEventListener('pointercancel', () => {
    drag.on = false;
    actorEl.classList.remove('dragging');
    actorEl.style.transform = '';
    clearHover();
  });

  function correct(zoneEl, x, y) {
    st.busy = true;
    const item = st.cur;
    const zone = st.topic.zones.find(z => z.id === item.zone);
    if (Progress.markHabitatDone(st.topic.id, item.id)) st.newDone = true;

    // 그 구역에서 잠깐 헤엄치고/뛰놀고/날기 — 판이 끝날 때까지 머문다
    const guests = zoneEl.querySelector('.hz-guests');
    const g = document.createElement('span');
    g.className = 'hz-guest anim-' + zone.anim;
    g.textContent = item.e;
    const r = zoneEl.getBoundingClientRect();
    g.style.left = Math.min(78, Math.max(8, ((x - r.left) / r.width) * 100 - 8)) + '%';
    g.style.top = Math.min(72, Math.max(18, ((y - r.top) / r.height) * 100 - 8)) + '%';
    guests.appendChild(g);

    const actor = $('habitat-actor');
    actor.classList.add('gone');
    const dots = document.querySelectorAll('#habitat-progress .diff-dot');
    if (dots[st.idx]) dots[st.idx].classList.add('on');

    Sound.correct();
    Sound.speak(item.fact);

    setTimeout(() => {
      st.busy = false;
      st.idx++;
      if (st.idx >= st.queue.length) finish();
      else showItem();
    }, 1700);
  }

  function wrong() {
    st.busy = true;
    st.wrongs++;
    const actor = $('habitat-actor');
    actor.classList.add('tilt'); // 갸웃
    Sound.pop();
    Sound.speak('갸웃! 여기는 아닌가 봐. 다시 한번 찾아볼까?');
    setTimeout(() => {
      actor.classList.remove('tilt');
      st.busy = false;
    }, 950);
  }

  function finish() {
    st.playing = false;
    st.cur = null;
    const stars = st.wrongs === 0 ? 3 : (st.wrongs <= 2 ? 2 : 1);
    Progress.setStars('habitat_' + st.topic.id, stars);

    const doneCount = Progress.habitatDoneCount(st.topic.id);
    const total = st.topic.items.length;

    // 펫 먹이: 판 완성 = 간식, 주제의 모든 친구를 처음 다 데려다주면 식사
    if (window.Pet) {
      Pet.awardSnack(1);
      if (st.newDone && doneCount >= total) Pet.awardMeal(1);
    }

    const starsEl = $('habitat-stars');
    starsEl.innerHTML = '';
    for (let i = 1; i <= 3; i++) {
      const s = document.createElement('span');
      s.className = 'star' + (i <= stars ? ' on' : '');
      s.textContent = '⭐';
      starsEl.appendChild(s);
    }
    $('habitat-done-count').textContent =
      doneCount >= total ? '🏆 친구 ' + total + '명을 모두 집에 데려다줬어요!'
        : '🏠 지금까지 ' + doneCount + ' / ' + total + ' 친구를 데려다줬어요';

    setTimeout(() => {
      $('habitat-done').classList.remove('hidden');
      confetti();
      Sound.tada();
      Sound.speak(doneCount >= total
        ? '우와! ' + st.topic.name + ' 친구들을 모두 데려다줬어요! 정말 최고예요!'
        : '와, 친구들이 모두 집을 찾았어요! 참 잘했어요!');
    }, 700);
  }

  function confetti() {
    const box = $('habitat-confetti');
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
    st.cur = null;
    if (window.speechSynthesis) speechSynthesis.cancel();
    $('habitat-done').classList.add('hidden');
    showScreen('screen-home');
  }
  $('habitat-back').addEventListener('click', goHome);
  $('habitat-done-home').addEventListener('click', goHome);
  $('habitat-done-next').addEventListener('click', () => {
    $('habitat-done').classList.add('hidden');
    startGame(st.topic.id);
  });

  // 테스트 훅
  window.Habitat = { startGame, state: st, TOPICS };
})();
