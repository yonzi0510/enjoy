/* ═══════════ 공용 하루 사용 시간 제한 ═══════════
 * 모든 앱이 하루 사용 시간을 함께 소진한다. 초과하면 잠금 화면이 뜨고,
 * 부모 확인 번호(ParentSettings.pin)를 누르면 30분 연장된다.
 * 사용 시간은 화면이 보이는 동안만 누적, 날짜가 바뀌면 자동 초기화.
 *
 * 저장: localStorage 'enjoy-timelimit-v1' — { date, used, extraMs }
 *   허용 시간 = ParentSettings.limitMin(분) + extraMs(연장 누적). limitMin 0 = 제한 없음.
 *   예전 play 전용 키 'chatgi-timelimit-v1'의 오늘 사용 시간을 이어받는다.
 *
 * 사용법 — 각 앱 index.html 끝에 (parent-settings.js 뒤에):
 *   <link rel="stylesheet" href="../shared/time-limit.css">
 *   <script src="../shared/time-limit.js"></script>
 * 앱이 window.EnjoyMuted(음소거 여부 함수)를 두면 잠금 안내 음성도 그것을 따른다.
 */
(() => {
  const KEY = 'enjoy-timelimit-v1';
  const LEGACY_KEY = 'chatgi-timelimit-v1';
  const EXTEND_MS = 30 * 60 * 1000;   // 연장 단위 30분
  const TICK_MS = 10000;

  function today() { return new Date().toISOString().slice(0, 10); }
  function limitMs() {
    const min = window.ParentSettings ? +ParentSettings.get('limitMin') : 30;
    return (isFinite(min) ? min : 30) * 60 * 1000;
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && raw.date === today()) return { date: raw.date, used: raw.used || 0, extraMs: raw.extraMs || 0 };
    } catch (e) {}
    // 예전 play 전용 시간제한을 이어받는다 (오늘 것만)
    try {
      const old = JSON.parse(localStorage.getItem(LEGACY_KEY));
      if (old && old.date === today()) {
        return { date: today(), used: old.used || 0, extraMs: Math.max(0, (old.allowed || 0) - 30 * 60 * 1000) };
      }
    } catch (e) {}
    return { date: today(), used: 0, extraMs: 0 };
  }
  let st = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  function isLocked() {
    const lim = limitMs();
    if (lim <= 0) return false; // 제한 없음
    return st.used >= lim + st.extraMs;
  }

  /* ─────────── 잠금 화면 (필요할 때 생성) ─────────── */
  let overlay = null, pinInput = '';

  function speak(text) {
    if (window.EnjoyMuted && window.EnjoyMuted()) return;
    if (!window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR';
      u.rate = 0.95 * (window.VoiceSettings ? VoiceSettings.rateFactor() : 1);
      u.pitch = 1.1;
      const v = window.VoiceSettings && VoiceSettings.koVoice();
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  function build() {
    overlay = document.createElement('div');
    overlay.id = 'tl-overlay';
    overlay.className = 'tl-overlay tl-hidden';
    overlay.innerHTML =
      '<div class="tl-card">' +
        '<div class="tl-emoji">😴</div>' +
        '<div class="tl-title">오늘은 많이 놀았어요!</div>' +
        '<div class="tl-sub">눈도 토끼도 쉬는 시간이에요.<br>내일 또 만나요! 👋</div>' +
        '<div class="tl-parent">' +
          '<div class="tl-parent-label">🔒 부모님 확인 (30분 더 놀기)</div>' +
          '<div class="tl-dots"><span></span><span></span><span></span><span></span></div>' +
          '<div class="tl-pad"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    const pad = overlay.querySelector('.tl-pad');
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '←', '0', '✓'].forEach(k => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tl-key' + (k === '✓' ? ' tl-ok' : '');
      b.textContent = k;
      b.addEventListener('click', () => pressKey(k));
      pad.appendChild(b);
    });
  }

  function renderDots() {
    const dots = overlay.querySelectorAll('.tl-dots span');
    dots.forEach((d, i) => d.classList.toggle('tl-filled', i < pinInput.length));
  }

  function showLock() {
    if (!overlay) build();
    pinInput = '';
    renderDots();
    overlay.classList.remove('tl-hidden');
    if (window.speechSynthesis) try { speechSynthesis.cancel(); } catch (e) {}
    speak('오늘은 많이 놀았어요! 눈도 쉬는 시간이에요. 내일 또 만나요!');
  }
  function hideLock() { if (overlay) overlay.classList.add('tl-hidden'); }

  function pressKey(k) {
    if (k === '←') { pinInput = pinInput.slice(0, -1); renderDots(); return; }
    if (k === '✓') { submitPin(); return; }
    if (pinInput.length >= 4) return;
    pinInput += k;
    renderDots();
    if (pinInput.length === 4) setTimeout(submitPin, 150);
  }

  function submitPin() {
    const ok = window.ParentSettings ? ParentSettings.checkPin(pinInput) : pinInput === '5815';
    if (ok) {
      st.extraMs += EXTEND_MS;
      save();
      hideLock();
      speak('30분 더 놀 수 있어요! 신난다!');
    } else {
      pinInput = '';
      renderDots();
      const dots = overlay.querySelector('.tl-dots');
      dots.classList.add('tl-wrong');
      setTimeout(() => dots.classList.remove('tl-wrong'), 500);
    }
  }

  /* ─────────── 시간 누적 ─────────── */
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (st.date !== today()) { st = { date: today(), used: 0, extraMs: 0 }; hideLock(); }
    if (isLocked()) return;
    st.used += TICK_MS;
    save();
    if (isLocked()) showLock();
  }, TICK_MS);

  function start() { if (isLocked()) showLock(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  // 테스트 훅 (play/js/nav.js도 isLocked를 사용)
  window.TimeLimit = {
    isLocked,
    usedMs() { return st.used; },
    _debug(usedMs) { st.used = usedMs; save(); if (isLocked()) showLock(); else hideLock(); }
  };
})();
