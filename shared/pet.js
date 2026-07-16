/* ═══════════ 공용 학습 펫 (다마고치) ═══════════
 * 학습 보상으로 받은 간식·식사를 먹여 펫을 키우는 공용 모듈.
 * - 알 → 아기 → 어린이 → 어른으로 자라고, 다 크면 📖 도감에 등록 + 새 알 도착 (16종 수집)
 * - 부화하면 이름을 지어 줄 수 있고(추천 칩 + 직접 입력), 언제든 ✏️ 로 바꾼다
 * - 먹이를 8번 줄 때마다 🎁 꾸미기 선물(모자·리본 등 12종)을 받아 입혀 준다
 * - 나쁜 상태(배고픔·죽음)는 없다 — 5세 앱이므로 자라기만 한다
 *
 * 저장: localStorage 'enjoy-pet-v1' (Profile.key 적용 — 은아·서하 각자 키움)
 * { g 현재 펫 성장점수, meals, snacks, species 종 id(null=알), name,
 *   fed 지금까지 먹인 총 횟수(선물 기준), collection [{sp,name,at}], acc {head,side}, accOwned [id] }
 * 예전 형식 { g, meals, snacks } 는 읽어와 이어받는다 (마이그레이션).
 *
 * 사용법 — 각 앱에서:
 *   <link rel="stylesheet" href="../shared/pet.css">
 *   헤더에 <span id="pet-slot"></span>  (없으면 화면 오른쪽 아래 떠 있는 버튼)
 *   <script src="../shared/pet.js"></script>  (profile.js 뒤)
 * 학습 보상 지점에서:
 *   if (window.Pet) Pet.awardSnack(1);   // 작은 완료 (페이지·카드 등)
 *   if (window.Pet) Pet.awardMeal(1);    // 큰 완료 (챕터·도안 등)
 */
window.Pet = (() => {
  // 아이 프로필별로 각자 펫을 키운다 (은아 = 원래 키, 서하 = p2: 접두어)
  const KEY = window.Profile ? Profile.key('enjoy-pet-v1') : 'enjoy-pet-v1';
  const MEAL_PTS = 3, SNACK_PTS = 1;
  const HATCH = 3, KID = 10, ADULT = 18, DONE = 24; // 성장 문턱 (성장점수)
  const GIFT_EVERY = 8; // 먹이 8번마다 꾸미기 선물

  /* ─────────── 펫 도감 (16종) ─────────── */
  const SPECIES = [
    { id: 'chick',   e: '🐥', name: '병아리', def: '삐약이' },
    { id: 'puppy',   e: '🐶', name: '강아지', def: '멍멍이' },
    { id: 'kitty',   e: '🐱', name: '고양이', def: '나비' },
    { id: 'rabbit',  e: '🐰', name: '토끼',   def: '토실이' },
    { id: 'bear',    e: '🐻', name: '곰',     def: '곰돌이' },
    { id: 'panda',   e: '🐼', name: '판다',   def: '푸푸' },
    { id: 'koala',   e: '🐨', name: '코알라', def: '코코' },
    { id: 'fox',     e: '🦊', name: '여우',   def: '여우비' },
    { id: 'frog',    e: '🐸', name: '개구리', def: '폴짝이' },
    { id: 'turtle',  e: '🐢', name: '거북이', def: '엉금이' },
    { id: 'lion',    e: '🦁', name: '사자',   def: '어흥이' },
    { id: 'tiger',   e: '🐯', name: '호랑이', def: '호야' },
    { id: 'pig',     e: '🐷', name: '돼지',   def: '꿀꿀이' },
    { id: 'hamster', e: '🐹', name: '햄스터', def: '햄햄이' },
    { id: 'dolphin', e: '🐬', name: '돌고래', def: '퐁퐁이' },
    { id: 'unicorn', e: '🦄', name: '유니콘', def: '유니' },
  ];
  const spOf = id => SPECIES.find(s => s.id === id) || null;

  /* ─────────── 꾸미기 (12종: 머리 6 + 곁 6) ─────────── */
  const ACCS = [
    { id: 'crown',  e: '👑', name: '왕관',   slot: 'head' },
    { id: 'hat',    e: '🎩', name: '모자',   slot: 'head' },
    { id: 'cap',    e: '🧢', name: '캡모자', slot: 'head' },
    { id: 'ribbon', e: '🎀', name: '리본',   slot: 'head' },
    { id: 'flower', e: '🌸', name: '꽃',     slot: 'head' },
    { id: 'star',   e: '⭐', name: '별핀',   slot: 'head' },
    { id: 'balloon', e: '🎈', name: '풍선',   slot: 'side' },
    { id: 'candy',   e: '🍭', name: '사탕',   slot: 'side' },
    { id: 'note',    e: '🎵', name: '음표',   slot: 'side' },
    { id: 'fly',     e: '🦋', name: '나비 친구', slot: 'side' },
    { id: 'ball',    e: '⚽', name: '공',     slot: 'side' },
    { id: 'teddy',   e: '🧸', name: '곰인형', slot: 'side' },
  ];
  const accOf = id => ACCS.find(a => a.id === id) || null;

  const NAME_CHIPS = ['별이', '콩이', '솜사탕', '복덩이', '반짝이', '초코'];
  const PRAISES = ['냠냠! 맛있다!', '고마워!', '냠냠, 힘이 나요!', '우와, 잘 먹을게!'];

  /* ─────────── 저장 (+ 예전 형식 마이그레이션) ─────────── */
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object') {
        if (!('fed' in raw)) { // 예전 형식 {g, meals, snacks} — 성장·먹이를 이어받는다
          const g = Math.min(raw.g || 0, DONE - 1);
          return {
            g, meals: raw.meals || 0, snacks: raw.snacks || 0,
            species: g >= HATCH ? 'chick' : null, name: '',
            fed: g, collection: [], acc: {}, accOwned: [],
          };
        }
        return {
          g: raw.g || 0, meals: raw.meals || 0, snacks: raw.snacks || 0,
          species: raw.species || null, name: raw.name || '',
          fed: raw.fed || 0, collection: raw.collection || [],
          acc: raw.acc || {}, accOwned: raw.accOwned || [],
        };
      }
    } catch (e) { /* 손상 데이터 초기화 */ }
    return { g: 0, meals: 0, snacks: 0, species: null, name: '', fed: 0, collection: [], acc: {}, accOwned: [] };
  }
  let state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  function stageName() {
    if (!state.species) return '알';
    if (state.g < KID) return '아기';
    if (state.g < ADULT) return '어린이';
    return '어른';
  }
  function petEmoji() { return state.species ? spOf(state.species).e : '🥚'; }
  function petName() {
    if (!state.species) return '알';
    return state.name || spOf(state.species).def;
  }
  function collectedIds() {
    const ids = state.collection.map(c => c.sp);
    if (state.species) ids.push(state.species);
    return ids;
  }

  /* ─────────── 소리 (독립 WebAudio + 공용 목소리) ─────────── */
  let ctx = null;
  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, startAt, dur, vol, type) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + startAt;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
  const sfxMunch = () => { tone(340, 0, 0.08, 0.2, 'square'); tone(300, 0.1, 0.08, 0.2, 'square'); tone(420, 0.22, 0.12, 0.2, 'sine'); };
  const sfxGrow = () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.22, 0.25)); tone(1319, 0.5, 0.45, 0.25); };
  const sfxGift = () => { tone(880, 0, 0.12, 0.2); tone(1175, 0.12, 0.12, 0.2); tone(1568, 0.24, 0.25, 0.2); };
  const sfxTap = () => tone(660, 0, 0.09, 0.2);

  function speak(text) {
    if (!window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR';
      u.rate = 0.95 * (window.VoiceSettings ? VoiceSettings.rateFactor() : 1);
      u.pitch = 1.2;
      const v = (window.VoiceSettings && VoiceSettings.koVoice()) ||
        speechSynthesis.getVoices().find(x => x.lang && x.lang.replace('_', '-').toLowerCase().indexOf('ko') === 0);
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  /* ─────────── UI ─────────── */
  let btn = null, mounted = false;
  const $ = id => document.getElementById(id);

  function html() {
    const box = document.createElement('div');
    box.innerHTML =
      '<div class="pet-overlay" id="pet-overlay">' +
      '  <div class="pet-card">' +
      '    <button type="button" class="pet-close" id="pet-close" aria-label="닫기">✕</button>' +
      '    <div class="pet-stage-name" id="pet-stage-name"></div>' +
      '    <div class="pet-name-row">' +
      '      <span class="pet-name" id="pet-name"></span>' +
      '      <button type="button" class="pet-rename" id="pet-rename" aria-label="이름 바꾸기">✏️</button>' +
      '    </div>' +
      '    <div class="pet-avatar">' +
      '      <span class="pet-emoji" id="pet-emoji"></span>' +
      '      <span class="pet-acc-head" id="pet-acc-head"></span>' +
      '      <span class="pet-acc-side" id="pet-acc-side"></span>' +
      '    </div>' +
      '    <div class="pet-naming" id="pet-naming" hidden>' +
      '      <div class="pet-naming-title">💛 이름을 지어 줄래?</div>' +
      '      <div class="pet-name-chips" id="pet-name-chips"></div>' +
      '      <div class="pet-name-form">' +
      '        <input type="text" id="pet-name-input" maxlength="6" placeholder="직접 짓기" autocomplete="off">' +
      '        <button type="button" id="pet-name-ok">좋아!</button>' +
      '      </div>' +
      '    </div>' +
      '    <div class="pet-bar"><div class="pet-bar-fill" id="pet-bar-fill"></div></div>' +
      '    <div class="pet-bar-label" id="pet-bar-label"></div>' +
      '    <div class="pet-foods">' +
      '      <button type="button" class="pet-food" id="pet-feed-meal">🍚<span>식사</span><b id="pet-meal-n">0</b></button>' +
      '      <button type="button" class="pet-food" id="pet-feed-snack">🍪<span>간식</span><b id="pet-snack-n">0</b></button>' +
      '    </div>' +
      '    <div class="pet-dressup-box">' +
      '      <div class="pet-dressup-title" id="pet-gift-label">🎁 꾸미기</div>' +
      '      <div class="pet-dressup" id="pet-dressup"></div>' +
      '    </div>' +
      '    <button type="button" class="pet-book-btn" id="pet-book-btn">📖 펫 도감 <b id="pet-book-n"></b></button>' +
      '    <div class="pet-hint" id="pet-hint"></div>' +
      '  </div>' +
      '</div>' +
      '<div class="pet-overlay" id="pet-book-overlay">' +
      '  <div class="pet-card">' +
      '    <button type="button" class="pet-close" id="pet-book-close" aria-label="닫기">✕</button>' +
      '    <div class="pet-stage-name">📖 펫 도감</div>' +
      '    <div class="pet-book-grid" id="pet-book-grid"></div>' +
      '  </div>' +
      '</div>' +
      '<div class="pet-toast" id="pet-toast"></div>';
    while (box.firstChild) document.body.appendChild(box.firstChild);
  }

  function render() {
    if (btn) {
      btn.querySelector('.pet-btn-emoji').textContent = petEmoji();
      const pantry = state.meals + state.snacks;
      const badge = btn.querySelector('.pet-badge');
      badge.textContent = pantry;
      badge.style.display = pantry > 0 ? '' : 'none';
    }
    if (!$('pet-overlay')) return;

    const sp = state.species ? spOf(state.species) : null;
    $('pet-stage-name').textContent = sp ? (stageName() + ' ' + sp.name) : '🥚 신비한 알';
    $('pet-name').textContent = petName();
    $('pet-rename').hidden = !sp;
    const emojiEl = $('pet-emoji');
    emojiEl.textContent = petEmoji();
    // 애니메이션 클래스(pet-munch 등)를 지우지 않게 크기 클래스만 갈아 끼운다
    emojiEl.classList.remove('pet-sz-0', 'pet-sz-1', 'pet-sz-2', 'pet-sz-3');
    emojiEl.classList.add('pet-sz-' + (sp ? (state.g < KID ? 1 : state.g < ADULT ? 2 : 3) : 0));
    // 착용한 꾸미기
    const head = accOf(state.acc.head), side = accOf(state.acc.side);
    $('pet-acc-head').textContent = sp && head ? head.e : '';
    $('pet-acc-side').textContent = sp && side ? side.e : '';

    $('pet-meal-n').textContent = state.meals;
    $('pet-snack-n').textContent = state.snacks;

    const next = !sp ? HATCH : state.g < KID ? KID : state.g < ADULT ? ADULT : DONE;
    const prev = !sp ? 0 : state.g < KID ? HATCH : state.g < ADULT ? KID : ADULT;
    $('pet-bar-fill').style.width = Math.min(100, (state.g - prev) / (next - prev) * 100) + '%';
    $('pet-bar-label').textContent = !sp
      ? '태어날 때까지 ' + (HATCH - state.g) + ' 🌱'
      : state.g < ADULT ? '다음 모습까지 ' + (next - state.g) + ' 🌱'
      : '도감 등록까지 ' + (DONE - state.g) + ' ✨';

    // 꾸미기 목록 (받은 것만) + 다음 선물 안내
    const dress = $('pet-dressup');
    dress.innerHTML = '';
    state.accOwned.forEach(id => {
      const a = accOf(id);
      if (!a) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pet-acc-btn' + (state.acc[a.slot] === id ? ' on' : '');
      b.textContent = a.e;
      b.setAttribute('aria-label', a.name);
      b.addEventListener('click', () => {
        sfxTap();
        state.acc[a.slot] = state.acc[a.slot] === id ? null : id; // 다시 누르면 벗기
        save();
        render();
        if (state.acc[a.slot]) speak(a.name + '! 잘 어울려!');
      });
      dress.appendChild(b);
    });
    const toGift = GIFT_EVERY - (state.fed % GIFT_EVERY);
    $('pet-gift-label').textContent = state.accOwned.length >= ACCS.length
      ? '🎁 꾸미기 (다 모았어요!)'
      : '🎁 꾸미기 · 다음 선물까지 ' + toGift;

    $('pet-book-n').textContent = state.collection.length + ' / ' + SPECIES.length;
    $('pet-hint').textContent =
      (state.meals + state.snacks) > 0 ? '먹이를 눌러서 냠냠!' : '공부하면 간식과 식사가 생겨요!';

    // 이름 짓기: 갓 태어났는데 아직 이름이 없으면 보여준다
    $('pet-naming').hidden = !(sp && !state.name);
    if (sp && !state.name) renderNameChips();
  }

  function renderNameChips() {
    const box = $('pet-name-chips');
    box.innerHTML = '';
    const chips = [spOf(state.species).def].concat(NAME_CHIPS.filter(n => n !== spOf(state.species).def)).slice(0, 6);
    chips.forEach(n => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pet-name-chip';
      b.textContent = n;
      b.addEventListener('click', () => setName(n));
      box.appendChild(b);
    });
  }

  function setName(n) {
    const name = String(n || '').replace(/[^가-힣a-zA-Z0-9 ]/g, '').trim().slice(0, 6);
    if (!name) { speak('이름을 골라 줄래?'); return; }
    state.name = name;
    save();
    sfxGift();
    speak(name + '! 정말 예쁜 이름이야!');
    render();
  }

  function bounce(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function open() {
    if (!mounted) return;
    sfxTap();
    $('pet-overlay').classList.add('on');
    render();
    speak(state.species ? petName() + '가 기다리고 있어요!' : '알이 콕콕! 먹이를 주면 태어날 거예요!');
  }
  function close() {
    $('pet-overlay').classList.remove('on');
    if (window.speechSynthesis) speechSynthesis.cancel();
  }

  /* ─────────── 먹이기 → 부화·성장·선물·도감 ─────────── */
  function maybeGift() { // 호출부에서 fed가 8의 배수일 때만 부른다
    const unowned = ACCS.filter(a => state.accOwned.indexOf(a.id) < 0);
    if (!unowned.length) return;
    const a = unowned[Math.floor(Math.random() * unowned.length)];
    state.accOwned.push(a.id);
    if (!state.acc[a.slot]) state.acc[a.slot] = a.id; // 첫 선물은 바로 입혀 준다
    save();
    setTimeout(() => {
      sfxGift();
      toast('🎁 선물! ' + a.e + ' ' + a.name + '을 받았어요!');
      speak('선물이 왔어요! ' + a.name + '!');
      render();
    }, 900);
  }

  function feed(kind) {
    const isMeal = kind === 'meal';
    if ((isMeal ? state.meals : state.snacks) <= 0) {
      sfxTap();
      bounce($(isMeal ? 'pet-feed-meal' : 'pet-feed-snack'), 'pet-shake');
      speak('공부하고 ' + (isMeal ? '식사' : '간식') + '를 가져다줄래?');
      return;
    }
    const gBefore = state.g;
    if (isMeal) { state.meals--; state.g += MEAL_PTS; }
    else { state.snacks--; state.g += SNACK_PTS; }
    state.fed++;
    save();
    const petEl = $('pet-emoji');
    bounce(petEl, 'pet-munch');
    sfxMunch();

    if (!state.species && state.g >= HATCH) { // 🐣 부화 — 아직 없는 종 중에서 태어난다
      const have = collectedIds();
      const pool = SPECIES.filter(s => have.indexOf(s.id) < 0);
      const sp = (pool.length ? pool : SPECIES)[Math.floor(Math.random() * (pool.length ? pool.length : SPECIES.length))];
      state.species = sp.id;
      state.name = '';
      save();
      setTimeout(() => {
        render();
        bounce($('pet-emoji'), 'pet-evolve');
        sfxGrow();
        speak('우와! ' + sp.name + '가 태어났어요! 이름을 지어 줄래?');
      }, 500);
    } else if (state.g >= DONE) { // 🎓 다 컸다 — 도감 등록 + 새 알
      const sp = spOf(state.species);
      state.collection.push({ sp: state.species, name: petName(), at: Date.now() });
      const grownName = petName();
      state.g = 0;
      state.species = null;
      state.name = '';
      state.acc = {}; // 다음 펫에게 새로 입혀 준다 (받은 선물은 그대로 보관)
      save();
      setTimeout(() => {
        render();
        bounce($('pet-emoji'), 'pet-evolve');
        sfxGrow();
        speak('와! ' + grownName + '가 다 컸어요! 도감에 쏙! 새로운 알이 도착했어요!');
        toast('📖 ' + sp.e + ' ' + grownName + ' 도감 등록!');
      }, 600);
    } else if ((state.g >= KID && gBefore < KID) || (state.g >= ADULT && gBefore < ADULT)) { // 성장
      setTimeout(() => {
        render();
        bounce($('pet-emoji'), 'pet-evolve');
        sfxGrow();
        speak('우와! ' + petName() + '가 ' + stageName() + '가 됐어요!');
      }, 500);
    } else {
      speak(PRAISES[Math.floor(Math.random() * PRAISES.length)]);
    }
    if (state.accOwned.length < ACCS.length && state.fed % GIFT_EVERY === 0) maybeGift();
    render();
  }

  /* ─────────── 도감 ─────────── */
  function openBook() {
    sfxTap();
    const grid = $('pet-book-grid');
    grid.innerHTML = '';
    SPECIES.forEach(sp => {
      const got = state.collection.filter(c => c.sp === sp.id);
      const isCur = state.species === sp.id;
      const cell = document.createElement('div');
      cell.className = 'pet-book-cell' + (got.length || isCur ? ' got' : '');
      cell.innerHTML =
        '<span class="pb-emoji">' + (got.length || isCur ? sp.e : '❓') + '</span>' +
        '<span class="pb-name">' + (got.length ? got[0].name : isCur ? petName() + ' (키우는 중)' : '???') + '</span>';
      if (got.length || isCur) {
        cell.addEventListener('click', () => { sfxTap(); speak(sp.name + ', ' + (got.length ? got[0].name : petName()) + '!'); });
      }
      grid.appendChild(cell);
    });
    $('pet-book-overlay').classList.add('on');
    speak('펫 도감! ' + state.collection.length + '마리를 다 키웠어요.');
  }

  let toastTimer = null;
  function toast(msg) {
    const el = $('pet-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('on'), 2200);
  }

  function award(kind, n) {
    if (kind === 'meal') state.meals += n;
    else state.snacks += n;
    save();
    render();
    toast(kind === 'meal' ? '🍚 펫 식사가 생겼어요!' : '🍪 펫 간식이 생겼어요!');
  }

  function mount() {
    if (mounted) return;
    mounted = true;
    html();
    const slot = $('pet-slot');
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = slot ? 'pet-btn' : 'pet-btn pet-fab';
    btn.setAttribute('aria-label', '내 펫');
    btn.innerHTML = '<span class="pet-btn-emoji"></span><b class="pet-badge"></b>';
    btn.addEventListener('click', ev => { ev.preventDefault(); open(); });
    if (slot) slot.appendChild(btn);
    else document.body.appendChild(btn);

    $('pet-close').addEventListener('click', close);
    $('pet-overlay').addEventListener('click', ev => { if (ev.target.id === 'pet-overlay') close(); });
    $('pet-feed-meal').addEventListener('click', () => feed('meal'));
    $('pet-feed-snack').addEventListener('click', () => feed('snack'));
    $('pet-rename').addEventListener('click', () => {
      sfxTap();
      state.name = ''; // 이름 짓기 화면을 다시 연다 (지어 줄 때까지 기본 이름 사용)
      save();
      render();
      speak('새 이름을 지어 줄래?');
    });
    $('pet-name-ok').addEventListener('click', () => setName($('pet-name-input').value));
    $('pet-book-btn').addEventListener('click', openBook);
    $('pet-book-close').addEventListener('click', () => $('pet-book-overlay').classList.remove('on'));
    $('pet-book-overlay').addEventListener('click', ev => {
      if (ev.target.id === 'pet-book-overlay') $('pet-book-overlay').classList.remove('on');
    });
    render();
  }

  // 스크립트가 body 끝에서 로드되므로 바로 붙인다
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  return {
    awardSnack(n) { award('snack', n || 1); },
    awardMeal(n) { award('meal', n || 1); },
    open,
    // 종단 테스트용
    state: () => ({
      g: state.g, meals: state.meals, snacks: state.snacks,
      species: state.species, name: petName(), fed: state.fed,
      stage: stageName(), collection: state.collection.length, accOwned: state.accOwned.length,
    }),
  };
})();
