/* ═══════════ 공용 목소리 설정 ═══════════
 * enjoy의 모든 앱이 같은 한국어 목소리·말 빠르기를 쓰도록 하는 공용 모듈.
 * 저장: localStorage 'enjoy-voice-ko'(voiceURI), 'enjoy-rate-factor'(0.8|1|1.2)
 *
 * 사용법 — 각 앱에서:
 *   <link rel="stylesheet" href="../shared/voice-settings.css">
 *   <button id="btn-voice" ...>🗣️</button>
 *   <script src="../shared/voice-settings.js"></script>   (앱 스크립트 뒤에)
 * TTS 모듈에서는 한국어 발화 시:
 *   const v = (window.VoiceSettings && VoiceSettings.koVoice()) || 기존값;
 *   u.rate = 기본빠르기 * (window.VoiceSettings ? VoiceSettings.rateFactor() : 1);
 */
window.VoiceSettings = (() => {
  const VOICE_KEY = 'enjoy-voice-ko';
  const RATE_KEY = 'enjoy-rate-factor';

  function koVoices() {
    if (!window.speechSynthesis) return [];
    return speechSynthesis.getVoices()
      .filter(v => v.lang && v.lang.replace('_', '-').toLowerCase().indexOf('ko') === 0);
  }
  function savedURI() {
    try {
      // 예전 픽셀 놀이터 개별 설정도 이어받는다
      return localStorage.getItem(VOICE_KEY) || localStorage.getItem('pixel-voice') || null;
    } catch (e) { return null; }
  }
  // 선택한 목소리 (없으면 기기의 첫 한국어 목소리)
  function koVoice() {
    const vs = koVoices();
    if (!vs.length) return null;
    const uri = savedURI();
    return vs.find(v => v.voiceURI === uri) || vs[0];
  }
  // 말 빠르기 배수 — 각 앱의 기본 빠르기에 곱해 쓴다
  function rateFactor() {
    try {
      const f = parseFloat(localStorage.getItem(RATE_KEY));
      if (f) return f;
      const legacy = parseFloat(localStorage.getItem('pixel-rate'));
      if (legacy) return legacy < 0.9 ? 0.8 : legacy > 1.05 ? 1.2 : 1;
    } catch (e) {}
    return 1;
  }
  function setVoice(uri) { try { localStorage.setItem(VOICE_KEY, uri); } catch (e) {} }
  function setRateFactor(f) { try { localStorage.setItem(RATE_KEY, String(f)); } catch (e) {} }

  // 미리 듣기 — 앱이 음소거 상태(window.EnjoyMuted)면 내지 않는다
  function preview() {
    if (window.EnjoyMuted && window.EnjoyMuted()) return;
    if (!window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance('안녕하세요! 이 목소리로 말해 드릴게요.');
      u.lang = 'ko-KR';
      u.rate = 0.95 * rateFactor();
      u.pitch = 1.1;
      const v = koVoice();
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  /* ─────────── 설정 화면 (처음 열 때 생성) ─────────── */
  let overlay = null;

  function render() {
    const list = overlay.querySelector('.vs-list');
    list.innerHTML = '';
    const vs = koVoices();
    if (!vs.length) {
      list.innerHTML = '<div class="vs-empty">이 기기에는 한국어 목소리가 없어요.<br>기기 설정에서 한국어 음성을 설치하면 나타나요.</div>';
    } else {
      const cur = koVoice();
      vs.forEach(v => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'vs-voice' + (cur && v.voiceURI === cur.voiceURI ? ' vs-sel' : '');
        // "Microsoft Heami - Korean (Korean)" 같은 긴 이름을 보기 좋게
        b.textContent = '🗣️ ' + v.name.replace(/^(Microsoft|Google|Apple)\s*/i, '').replace(/\s*[-(].*$/, '');
        b.addEventListener('click', () => { setVoice(v.voiceURI); render(); preview(); });
        list.appendChild(b);
      });
    }
    const f = rateFactor();
    overlay.querySelectorAll('.vs-rate').forEach(b =>
      b.classList.toggle('vs-sel', Math.abs(parseFloat(b.dataset.f) - f) < 0.01));
  }

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'vs-overlay vs-hidden';
    overlay.innerHTML =
      '<div class="vs-card">' +
        '<div class="vs-title">🗣️ 목소리 설정</div>' +
        '<div class="vs-label">목소리 고르기 <span class="vs-note">(누르면 바로 들려요)</span></div>' +
        '<div class="vs-list"></div>' +
        '<div class="vs-label">말 빠르기</div>' +
        '<div class="vs-rates">' +
          '<button type="button" data-f="0.8" class="vs-rate">🐢 천천히</button>' +
          '<button type="button" data-f="1" class="vs-rate">보통</button>' +
          '<button type="button" data-f="1.2" class="vs-rate">🐇 빠르게</button>' +
        '</div>' +
        '<div class="vs-actions">' +
          '<button type="button" class="vs-preview">🔊 들어보기</button>' +
          '<button type="button" class="vs-ok">확인</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector('.vs-ok').addEventListener('click', close);
    overlay.querySelector('.vs-preview').addEventListener('click', preview);
    overlay.querySelectorAll('.vs-rate').forEach(b =>
      b.addEventListener('click', () => { setRateFactor(parseFloat(b.dataset.f)); render(); preview(); }));
    // 목소리 목록이 늦게 로드되는 브라우저 대응 — 앱의 기존 핸들러를 보존하며 덧붙인다
    if (window.speechSynthesis) {
      const prev = speechSynthesis.onvoiceschanged;
      speechSynthesis.onvoiceschanged = function () {
        if (prev) try { prev.apply(this, arguments); } catch (e) {}
        if (overlay && !overlay.classList.contains('vs-hidden')) render();
      };
    }
  }

  function open() {
    if (!overlay) build();
    render();
    overlay.classList.remove('vs-hidden');
  }
  function close() {
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (overlay) overlay.classList.add('vs-hidden');
  }

  // 부모용 설정이라 아이가 실수로 못 열게 "길게 누르기(0.6초)"로만 연다
  function init(btn) {
    if (!btn) return;
    btn.title = '길게 누르면 열려요';
    let timer = null, fired = false;
    const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
    btn.addEventListener('pointerdown', () => {
      fired = false;
      cancel();
      timer = setTimeout(() => { fired = true; open(); }, 600);
    });
    btn.addEventListener('pointerup', () => {
      cancel();
      if (!fired && btn.animate) { // 짧은 탭: 살짝 움츠렸다 펴며 "아니야" 신호만
        btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(.85)' }, { transform: 'scale(1)' }], { duration: 220 });
      }
    });
    btn.addEventListener('pointerleave', cancel);
    btn.addEventListener('pointercancel', cancel);
    btn.addEventListener('click', e => e.preventDefault());
  }
  function autoInit() { init(document.getElementById('btn-voice')); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoInit);
  else autoInit();

  return { koVoices, koVoice, rateFactor, preview, open, init };
})();
