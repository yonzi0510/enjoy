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
 *   u.pitch = VoiceSettings.pitchOf(원래값);          // 높낮이는 1.0 가 제 소리다
 *   speechSynthesis.speak(new SpeechSynthesisUtterance(VoiceSettings.say(글)));
 *   VoiceSettings.parts(글)                           // 긴 말은 두 마디로 나눠 읽는다
 *
 * ── 왜 이렇게 하나 (부모님이 "말이 딱딱하다"고 하셔서 고친 것) ─────────────
 * 1) 목소리를 **고른다.** 예전에는 기기에 있는 한국어 목소리 중 맨 앞의 것을 그냥 썼는데,
 *    안드로이드에서는 그게 대개 용량을 줄인 기계음이다. 이제 점수를 매겨 자연스러운 쪽을
 *    고른다(`pickScore`). 부모님이 설정에서 직접 고른 목소리가 있으면 **그게 언제나 우선**이다.
 * 2) 높낮이는 **1.0**. 올릴수록 얇고 인공적으로 들린다. 앱마다 1.0~1.2로 흩어져 있던 것을 모은다.
 * 3) **숨 쉴 자리**를 만든다. 브라우저는 억양 태그(SSML)를 무시하므로, 문장부호와 문장 나누기로만
 *    호흡을 만들 수 있다. 감탄사 뒤 느낌표를 쉼표로 바꾸고, 긴 말은 두 마디로 나눈다.
 * 4) 이모지는 **읽지 않는다.** 그냥 두면 "쿠키" 처럼 엉뚱하게 읽거나 버벅인다.
 * 5) 말을 끊고 **아주 잠깐 뒤에** 시작한다(`startDelay`). 크롬에서 cancel 직후 speak 하면
 *    첫 글자가 잘리는 일이 잦다.
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
  /* 자연스러울 법한 목소리에 점수를 준다.
   * 네트워크 목소리는 대개 훨씬 자연스럽다 — 읽을 문장이 제조사 서버로 가지만,
   * 나가는 것은 우리가 앱에 써 둔 안내 문구뿐이고 아이 목소리·이름·진행도는 나가지 않는다
   * (마이크 허용과는 전혀 다른 이야기다). 부모님 확인을 받고 켜 뒀다. */
  function pickScore(v) {
    const n = (v.name || '') + ' ' + (v.voiceURI || '');
    let s = 0;
    if (!v.localService) s += 4;                                  // 네트워크
    if (/neural|natural|enhanced|premium|wavenet/i.test(n)) s += 4;
    if (/google/i.test(n)) s += 3;
    if (/yuna|유나|siri|sora|나리|heami|해미/i.test(n)) s += 2;
    if (/compact|eloquence|espeak/i.test(n)) s -= 5;              // 용량 줄인 기계음
    return s;
  }
  // 선택한 목소리 — 부모님이 고른 것이 있으면 그것, 없으면 가장 자연스러울 법한 것
  function koVoice() {
    const vs = koVoices();
    if (!vs.length) return null;
    const uri = savedURI();
    const chosen = vs.find(v => v.voiceURI === uri);
    if (chosen) return chosen;
    // 점수가 같으면 기기가 준 차례를 지킨다 (기기마다 결과가 뒤집히지 않게)
    let best = vs[0], bestScore = pickScore(vs[0]);
    for (let i = 1; i < vs.length; i++) {
      const s = pickScore(vs[i]);
      if (s > bestScore) { best = vs[i]; bestScore = s; }
    }
    return best;
  }

  /* ─────────── 부드럽게 말하기 (시안 「나」) ─────────── */
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{FE0F}\u{20E3}]/gu;
  // 뒤에서 숨을 쉬면 자연스러운 감탄사들
  const EXCLAIM = /^(우와|와|앗|어라|짠|딩동댕|쓱싹|냠냠|아이고|야호|오|어머|헉)!/;

  // 읽기 좋게 다듬는다 — 이모지를 빼고, 감탄사 뒤에 숨을 넣는다
  function say(text) {
    return String(text == null ? '' : text)
      .replace(EMOJI, ' ')
      .replace(EXCLAIM, '$1,')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // 긴 말은 두 마디로 나눠 읽는다 — 사이가 자연스러운 쉼이 된다.
  // (뒤돌아보기 정규식은 옛 사파리가 파일 전체를 못 읽게 만들어서 쓰지 않는다)
  function parts(text) {
    const t = say(text);
    if (t.length <= 14) return [t];                 // 짧은 말은 나누지 않는다
    const out = [];
    const seg = t.split(/([.!?])\s+/);
    for (let i = 0; i < seg.length; i += 2) {
      const piece = (seg[i] || '') + (seg[i + 1] || '');
      if (piece.trim()) out.push(piece.trim());
    }
    return out.length ? out : [t];
  }

  // 높낮이 — 1.0 이 그 목소리의 제 소리다. 앱이 올려 둔 값은 살짝만 남긴다.
  function pitchOf(p) {
    const n = parseFloat(p);
    if (!n || n <= 1) return 1;
    return Math.min(1.05, 1 + (n - 1) * 0.25);
  }

  // 말을 끊은 뒤 이만큼 있다가 시작한다 (크롬에서 첫 글자가 잘리는 것을 막는다)
  function startDelay() { return 90; }
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
      setTimeout(() => {
        parts('안녕하세요! 이 목소리로 말해 드릴게요.').forEach(p => {
          const u = new SpeechSynthesisUtterance(p);
          u.lang = 'ko-KR';
          u.rate = 0.92 * rateFactor();
          u.pitch = 1;
          const v = koVoice();
          if (v) u.voice = v;
          speechSynthesis.speak(u);
        });
      }, startDelay());
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

  return { koVoices, koVoice, rateFactor, preview, open, init, say, parts, pitchOf, startDelay };
})();
