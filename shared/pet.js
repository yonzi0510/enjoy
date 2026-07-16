/* ═══════════ 공용 학습 펫 (다마고치) ═══════════
 * 학습 보상으로 받은 간식·식사를 먹여 펫을 키우는 공용 모듈.
 * 저장: localStorage 'enjoy-pet-v1' { g 성장점수, meals 식사, snacks 간식 }
 * 나쁜 상태(배고픔·죽음)는 없다 — 5세 앱이므로 자라기만 한다.
 *
 * 사용법 — 각 앱에서:
 *   <link rel="stylesheet" href="../shared/pet.css">
 *   헤더에 <span id="pet-slot"></span>  (없으면 화면 오른쪽 아래 떠 있는 버튼)
 *   <script src="../shared/pet.js"></script>
 * 학습 보상 지점에서:
 *   if (window.Pet) Pet.awardSnack(1);   // 작은 완료 (페이지·카드 등)
 *   if (window.Pet) Pet.awardMeal(1);    // 큰 완료 (챕터·도안 등)
 */
window.Pet = (() => {
  // 아이 프로필별로 각자 펫을 키운다 (은아 = 원래 키, 서하 = p2: 접두어)
  const KEY = window.Profile ? Profile.key('enjoy-pet-v1') : 'enjoy-pet-v1';
  const MEAL_PTS = 3, SNACK_PTS = 1;

  // 성장 단계 — min: 필요한 성장점수
  const STAGES = [
    { min: 0,  e: '🥚', name: '알',   say: '알' },
    { min: 3,  e: '🐣', name: '콕콕이', say: '콕콕이' },
    { min: 10, e: '🐥', name: '삐약이', say: '삐약이' },
    { min: 22, e: '🐤', name: '통통이', say: '통통이' },
    { min: 40, e: '🐰', name: '토실이', say: '토실이' },
    { min: 70, e: '🦄', name: '유니',  say: '유니콘 유니' },
  ];
  const PRAISES = ['냠냠! 맛있다!', '고마워!', '냠냠, 힘이 나요!', '우와, 잘 먹을게!'];

  /* ─────────── 저장 ─────────── */
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object') {
        return { g: raw.g || 0, meals: raw.meals || 0, snacks: raw.snacks || 0 };
      }
    } catch (e) { /* 손상 데이터 초기화 */ }
    return { g: 0, meals: 0, snacks: 0 };
  }
  let state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  function stageIdx(g) {
    let idx = 0;
    STAGES.forEach((s, i) => { if (g >= s.min) idx = i; });
    return idx;
  }
  const stage = () => STAGES[stageIdx(state.g)];
  const nextStage = () => STAGES[stageIdx(state.g) + 1] || null;

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

  function html() {
    const box = document.createElement('div');
    box.innerHTML =
      '<div class="pet-overlay" id="pet-overlay">' +
      '  <div class="pet-card">' +
      '    <button type="button" class="pet-close" id="pet-close" aria-label="닫기">✕</button>' +
      '    <div class="pet-stage-name" id="pet-stage-name"></div>' +
      '    <div class="pet-emoji" id="pet-emoji"></div>' +
      '    <div class="pet-bar"><div class="pet-bar-fill" id="pet-bar-fill"></div></div>' +
      '    <div class="pet-bar-label" id="pet-bar-label"></div>' +
      '    <div class="pet-foods">' +
      '      <button type="button" class="pet-food" id="pet-feed-meal">🍚<span>식사</span><b id="pet-meal-n">0</b></button>' +
      '      <button type="button" class="pet-food" id="pet-feed-snack">🍪<span>간식</span><b id="pet-snack-n">0</b></button>' +
      '    </div>' +
      '    <div class="pet-hint" id="pet-hint"></div>' +
      '  </div>' +
      '</div>' +
      '<div class="pet-toast" id="pet-toast"></div>';
    while (box.firstChild) document.body.appendChild(box.firstChild);
  }

  function render() {
    const s = stage(), n = nextStage();
    if (btn) {
      btn.querySelector('.pet-btn-emoji').textContent = s.e;
      const pantry = state.meals + state.snacks;
      const badge = btn.querySelector('.pet-badge');
      badge.textContent = pantry;
      badge.style.display = pantry > 0 ? '' : 'none';
    }
    if (!document.getElementById('pet-overlay')) return;
    document.getElementById('pet-stage-name').textContent = s.e + ' ' + s.name;
    document.getElementById('pet-emoji').textContent = s.e;
    document.getElementById('pet-meal-n').textContent = state.meals;
    document.getElementById('pet-snack-n').textContent = state.snacks;
    const fill = document.getElementById('pet-bar-fill');
    const label = document.getElementById('pet-bar-label');
    if (n) {
      const pct = Math.min(100, (state.g - s.min) / (n.min - s.min) * 100);
      fill.style.width = pct + '%';
      label.textContent = '다음 모습까지 ' + (n.min - state.g) + ' 🌱';
    } else {
      fill.style.width = '100%';
      label.textContent = '최고로 자랐어요! ✨';
    }
    document.getElementById('pet-hint').textContent =
      (state.meals + state.snacks) > 0 ? '먹이를 눌러서 냠냠!' : '공부하면 간식과 식사가 생겨요!';
  }

  function bounce(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function open() {
    if (!mounted) return;
    sfxTap();
    document.getElementById('pet-overlay').classList.add('on');
    render();
    const s = stage();
    speak(s.name === '알' ? '알이 콕콕! 먹이를 주면 태어날 거예요!' : s.say + '가 기다리고 있어요!');
  }
  function close() {
    document.getElementById('pet-overlay').classList.remove('on');
    if (window.speechSynthesis) speechSynthesis.cancel();
  }

  function feed(kind) {
    const isMeal = kind === 'meal';
    if ((isMeal ? state.meals : state.snacks) <= 0) {
      sfxTap();
      bounce(document.getElementById(isMeal ? 'pet-feed-meal' : 'pet-feed-snack'), 'pet-shake');
      speak('공부하고 ' + (isMeal ? '식사' : '간식') + '를 가져다줄래?');
      return;
    }
    const before = stageIdx(state.g);
    if (isMeal) { state.meals--; state.g += MEAL_PTS; }
    else { state.snacks--; state.g += SNACK_PTS; }
    save();
    const petEl = document.getElementById('pet-emoji');
    bounce(petEl, 'pet-munch');
    sfxMunch();
    if (stageIdx(state.g) > before) { // 진화!
      setTimeout(() => {
        render();
        bounce(petEl, 'pet-evolve');
        sfxGrow();
        speak('우와! ' + stage().say + '로 자랐어요! 정말 고마워!');
      }, 500);
    } else {
      speak(PRAISES[Math.floor(Math.random() * PRAISES.length)]);
    }
    render();
  }

  let toastTimer = null;
  function toast(msg) {
    const el = document.getElementById('pet-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('on'), 1800);
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
    const slot = document.getElementById('pet-slot');
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = slot ? 'pet-btn' : 'pet-btn pet-fab';
    btn.setAttribute('aria-label', '내 펫');
    btn.innerHTML = '<span class="pet-btn-emoji"></span><b class="pet-badge"></b>';
    btn.addEventListener('click', ev => { ev.preventDefault(); open(); });
    if (slot) slot.appendChild(btn);
    else document.body.appendChild(btn);
    document.getElementById('pet-close').addEventListener('click', close);
    document.getElementById('pet-overlay').addEventListener('click', ev => {
      if (ev.target.id === 'pet-overlay') close();
    });
    document.getElementById('pet-feed-meal').addEventListener('click', () => feed('meal'));
    document.getElementById('pet-feed-snack').addEventListener('click', () => feed('snack'));
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
    state: () => ({ ...state, stage: stage().name }),
  };
})();
