/* ⏰ 하루 30분 시간제한 — 초과 시 잠금, 관리자번호(부모)로 30분 연장
 * 사용 시간은 앱이 화면에 보이는 동안만 누적. 날짜가 바뀌면 자동 초기화.
 */
(() => {
  const $ = id => document.getElementById(id);
  const KEY = 'chatgi-timelimit-v1';
  const LIMIT_MS = 30 * 60 * 1000;   // 기본 30분
  const PIN = '5815';                 // 관리자번호
  const TICK_MS = 10000;

  function today() { return new Date().toISOString().slice(0, 10); }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && raw.date === today()) return raw;
    } catch (e) {}
    return { date: today(), used: 0, allowed: LIMIT_MS };
  }
  let st = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  let pinInput = '';

  function isLocked() { return st.used >= st.allowed; }

  function showLock() {
    pinInput = '';
    renderDots();
    $('lock-overlay').classList.remove('hidden');
    if (window.speechSynthesis) speechSynthesis.cancel();
    Sound.speak('오늘은 많이 놀았어요! 눈도 쉬는 시간이에요. 내일 또 만나요!');
  }
  function hideLock() { $('lock-overlay').classList.add('hidden'); }

  /* ─────────── 숫자패드 ─────────── */
  function renderDots() {
    const dots = $('pin-dots').children;
    for (let i = 0; i < 4; i++) dots[i].classList.toggle('filled', i < pinInput.length);
  }

  function buildPad() {
    const pad = $('pin-pad');
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '←', '0', '✓'].forEach(k => {
      const b = document.createElement('button');
      b.className = 'pin-key' + (k === '✓' ? ' pin-ok' : '');
      b.textContent = k;
      b.addEventListener('click', () => pressKey(k));
      pad.appendChild(b);
    });
  }

  function pressKey(k) {
    if (k === '←') { pinInput = pinInput.slice(0, -1); renderDots(); return; }
    if (k === '✓') { submitPin(); return; }
    if (pinInput.length >= 4) return;
    pinInput += k;
    renderDots();
    if (pinInput.length === 4) setTimeout(submitPin, 150);
  }

  function submitPin() {
    if (pinInput === PIN) {
      st.allowed += LIMIT_MS; // 30분 연장
      save();
      hideLock();
      Sound.tada();
      Sound.speak('30분 더 놀 수 있어요! 신난다!');
    } else {
      pinInput = '';
      renderDots();
      $('pin-dots').classList.add('pin-wrong');
      setTimeout(() => $('pin-dots').classList.remove('pin-wrong'), 500);
      Sound.pop();
    }
  }

  /* ─────────── 시간 누적 ─────────── */
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (st.date !== today()) { st = { date: today(), used: 0, allowed: LIMIT_MS }; hideLock(); }
    if (isLocked()) return;
    st.used += TICK_MS;
    save();
    if (isLocked()) showLock();
  }, TICK_MS);

  buildPad();
  if (isLocked()) showLock();

  // 테스트 훅
  window.TimeLimit = {
    isLocked,
    _debug(usedMs) { st.used = usedMs; save(); if (isLocked()) showLock(); else hideLock(); }
  };
})();
