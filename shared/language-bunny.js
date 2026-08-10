/* ═══════════ 언어 토끼 (공용) ═══════════
 * 홈 화면에 늘 앉아 있는 토끼. 아이가 궁금한 것을 아무 때나 물어본다 — 한글도, 영어도, 일본어도.
 * 짝 파일: shared/language-bunny.css
 *
 *   "코끼리가 영어로 뭐야?"   → elephant  (영어 목소리 en-US)
 *   "코끼리가 일본어로 뭐야?" → ぞう      (일본어 목소리 ja-JP)
 *   "토끼는 어떻게 써?"       → 낱말 카드 (한글 크게 + 영어·일본어가 있으면 함께)
 *   갈래를 못 알아들었으면    → 아는 낱말이면 셋 다 보여 준다 (가장 친절한 쪽)
 *
 * ── 지켜야 하는 것 ────────────────────────────────────────────
 * 1) **발화 언어를 정확히 가른다.** 한국어 안내만 공용 목소리 설정(VoiceSettings)을 거치고,
 *    영어는 en-US, 일본어는 ja-JP 로 읽는다. 영·일 낱말이 한국어 목소리로 새면 발음이 망가진다.
 * 2) `speakSeq` 에는 **워치독 타이머와 순서 무효화(seqId)** 가 있다
 *    (english/js/speech.js 에는 없어서, 발화가 끊기면 다음 말이 영영 안 나왔다).
 * 3) **새 localStorage 키를 만들지 않는다.** 못 알아들은 말은 부모 확인용으로
 *    메모리에만 남기고(`LanguageBunny.misses()`) 콘솔에 적는다 — 아이 진행도 백업 목록을
 *    건드리지 않기 위해서다.
 * 4) 마이크는 부모 설정(`ParentSettings.get('stt')`)이 켜져 있을 때만 쓴다.
 *    꺼져 있거나 기기가 음성 인식을 못 하면 **골라서 물어보는 길**을 준다.
 *
 * 사전은 **처음 토끼를 누를 때** 받아 온다(영어 959낱말 112KB + 일본어 492낱말 72KB).
 * 홈 첫 화면에 184KB를 얹지 않으려는 것이다 — 홈은 아이가 하루에도 몇 번씩 여는 화면이다.
 *
 * 테스트 훅: window.__simulateBunny('코끼리가 영어로 뭐야') — 마이크 없이 인식 결과 주입(Promise)
 */
window.LanguageBunny = (() => {
  const $ = s => document.querySelector(s);

  /* 이 파일 위치에서 저장소 뿌리를 찾는다 (홈이 아닌 곳에서 불러도 사전 경로가 맞게) */
  const SELF = (document.currentScript && document.currentScript.src) || '';
  const ROOT = SELF ? SELF.replace(/shared\/language-bunny\.js.*$/, '') : './';

  const DICT_FILES = ['animals', 'food', 'colors-numbers', 'vehicles', 'body-family',
                      'nature', 'home-things', 'clothes-actions', 'places', 'opposites'];

  /* ─────────── 그림 (전부 인라인 SVG — 이모지 토끼는 쓰지 않는다) ─────────── */
  // 마이크를 든 토끼. 마이크가 "누르면 말할 수 있다"를 알려 준다.
  function bunnySvg(cls) {
    return '<svg class="' + cls + '" viewBox="0 0 200 220" aria-hidden="true">' +
      '<g><ellipse cx="66" cy="52" rx="20" ry="46" transform="rotate(-14 66 52)" fill="#FF7FAE"/>' +
      '<ellipse cx="67" cy="58" rx="10" ry="31" transform="rotate(-14 67 58)" fill="#FFDCE9"/></g>' +
      '<g><ellipse cx="134" cy="52" rx="20" ry="46" transform="rotate(14 134 52)" fill="#FF7FAE"/>' +
      '<ellipse cx="133" cy="58" rx="10" ry="31" transform="rotate(14 133 58)" fill="#FFDCE9"/></g>' +
      '<circle cx="100" cy="128" r="62" fill="#FFA8C8"/>' +
      '<circle cx="78" cy="116" r="7" fill="#4A2B3A"/><circle cx="122" cy="116" r="7" fill="#4A2B3A"/>' +
      '<circle cx="80.5" cy="113.5" r="2.4" fill="#FFFFFF"/><circle cx="124.5" cy="113.5" r="2.4" fill="#FFFFFF"/>' +
      '<circle cx="60" cy="136" r="10" fill="#FF7FA8" opacity="0.5"/><circle cx="140" cy="136" r="10" fill="#FF7FA8" opacity="0.5"/>' +
      '<ellipse cx="100" cy="131" rx="7" ry="5" fill="#E85C8C"/>' +
      '<path d="M100 136 Q100 145 91 147 M100 136 Q100 145 109 147" stroke="#B84A6E" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M52 128 L34 122 M52 136 L34 138 M148 128 L166 122 M148 136 L166 138" stroke="#E88CB0" stroke-width="3" stroke-linecap="round"/>' +
      '<g transform="rotate(14 118 172)">' +
      '<rect x="112" y="158" width="13" height="40" rx="6.5" fill="#5A6078"/>' +
      '<circle cx="118.5" cy="150" r="17" fill="#8A90A8"/>' +
      '<path d="M106 144 L131 144 M104 150 L133 150 M106 156 L131 156" stroke="#6E7590" stroke-width="2.5"/></g>' +
      '<circle cx="72" cy="186" r="13" fill="#FFA8C8" stroke="#E88CB0" stroke-width="3.5"/>' +
      '<circle cx="112" cy="188" r="13" fill="#FFA8C8" stroke="#E88CB0" stroke-width="3.5"/></svg>';
  }

  // 손으로 그은 테두리·마이크. 이 파일만으로 서게 자기 <defs> 를 심는다.
  function injectDefs() {
    if (document.getElementById('lb-defs')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML =
      '<svg id="lb-defs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
      '<filter id="lb-hand" x="-14%" y="-14%" width="128%" height="128%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7"/>' +
      '<feDisplacementMap in="SourceGraphic" scale="2.6"/></filter>' +
      '<symbol id="lb-crayon" viewBox="0 0 200 100" preserveAspectRatio="none">' +
      '<path d="M30 5 C90 1, 130 2, 172 6 C188 8, 197 26, 196 52 C195 78, 186 94, 168 96 ' +
      'C118 100, 70 99, 28 95 C10 93, 3 74, 4 48 C5 22, 14 7, 30 5 Z" fill="none" ' +
      'stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" ' +
      'vector-effect="non-scaling-stroke"/></symbol>' +
      '<symbol id="lb-mic" viewBox="0 0 44 44"><g filter="url(#lb-hand)" fill="none" stroke="currentColor" ' +
      'stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="16" y="6" width="12" height="21" rx="6"/><path d="M11 21 a11 11 0 0 0 22 0"/>' +
      '<path d="M22 32 v6 M16 38 h12"/></g></symbol>' +
      '</defs></svg>';
    document.body.appendChild(wrap.firstChild);
  }

  /* ─────────── 효과음 (Web Audio 합성) ─────────── */
  let ctx = null;
  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, at, dur, vol, type) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + at;
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  const sfx = {
    listen() { tone(660, 0, 0.1, 0.18, 'sine'); tone(880, 0.1, 0.14, 0.18, 'sine'); },
    ding()   { tone(784, 0, 0.18, 0.22, 'triangle'); tone(1175, 0.09, 0.3, 0.22, 'triangle'); },
    pop()    { tone(330, 0, 0.12, 0.12, 'sine'); }
  };

  /* ─────────── TTS — 언어별로 확실히 가른다 ───────────
   * ko : 공용 목소리 설정(VoiceSettings) 파이프라인
   * en : en-US · ja : ja-JP — 손대지 않는다(다듬으면 발음이 달라진다)
   */
  let koVoice = null, enVoice = null, jaVoice = null;
  function pickVoices() {
    if (!window.speechSynthesis) return;
    let vs = [];
    try { vs = speechSynthesis.getVoices() || []; } catch (e) { vs = []; }
    if (!koVoice) koVoice = vs.find(v => v.lang && v.lang.indexOf('ko') === 0) || null;
    if (!enVoice) enVoice = vs.find(v => v.lang === 'en-US') ||
                            vs.find(v => v.lang && v.lang.indexOf('en') === 0) || null;
    if (!jaVoice) jaVoice = vs.find(v => v.lang === 'ja-JP') ||
                            vs.find(v => v.lang && v.lang.indexOf('ja') === 0) || null;
  }
  if (window.speechSynthesis) {
    try { speechSynthesis.onvoiceschanged = pickVoices; } catch (e) {}
  }

  const spoken = []; // 테스트 확인용 — 무엇을 어느 언어로 읽었는지
  let seqId = 0;

  // items = [{lang:'ko'|'en'|'ja', text, rate?}]
  function speakSeq(items, onDone) {
    const my = ++seqId;                       // 새 재생이 시작되면 앞의 흐름은 무효
    if (!window.speechSynthesis) { if (onDone) setTimeout(onDone, 150); return; }
    try { speechSynthesis.cancel(); } catch (e) {}
    pickVoices();
    let i = 0;
    function next() {
      if (my !== seqId) return;
      if (i >= items.length) { if (onDone) onDone(); return; }
      const it = items[i++];
      try {
        const VS = window.VoiceSettings;
        const lang = it.lang || 'ko';
        // 한국어 안내만 다듬는다. say()가 빈 글을 낼 수 있으니(순수 이모지) 원래 글로 되돌린다
        const text = (lang === 'ko' && VS) ? (VS.say(it.text) || it.text) : it.text;
        const u = new SpeechSynthesisUtterance(text);
        if (lang === 'en') {
          u.lang = 'en-US'; if (enVoice) u.voice = enVoice;
          u.rate = it.rate || 0.85; u.pitch = 1.1;
        } else if (lang === 'ja') {
          u.lang = 'ja-JP'; if (jaVoice) u.voice = jaVoice;
          u.rate = it.rate || 0.82; u.pitch = 1.05;
        } else {
          u.lang = 'ko-KR';
          const sel = (VS && VS.koVoice()) || koVoice;
          if (sel) u.voice = sel;
          u.rate = (it.rate || 0.92) * (VS ? VS.rateFactor() : 1);
          u.pitch = VS ? VS.pitchOf(1.1) : 1.1;   // 높낮이는 1.0 쪽이 제 소리
        }
        // 워치독 — 음성 엔진이 없거나 중간에 끊겨도 다음 말로 넘어간다
        let advanced = false;
        const step = () => { if (advanced) return; advanced = true; clearTimeout(wd); next(); };
        const wd = setTimeout(step, 1200 + String(text).length * 450);
        u.onend = step; u.onerror = step;
        spoken.push({ lang: u.lang, text: u.text });
        if (spoken.length > 40) spoken.shift();
        speechSynthesis.speak(u);
      } catch (e) { next(); }
    }
    // cancel() 직후 바로 speak() 하면 크롬에서 첫 글자가 잘린다 — 아주 잠깐 두고 시작
    const d = window.VoiceSettings ? VoiceSettings.startDelay() : 0;
    if (d) setTimeout(next, d); else next();
  }
  function stopSpeak() { seqId++; try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {} }

  /* ─────────── 사전 — 영어와 일본어를 ko 로 맞물린다 ─────────── */
  let dictReady = false, dictLoading = null;
  const INDEX = [];                 // [{ ko, keys:[], emoji, cat, en:{en,read}, ja:{ja,kanji,read} }]
  const BY_KO = Object.create(null);

  function loadScript(src) {
    return new Promise(res => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => res(true);
      s.onerror = () => res(false);   // 한 갈래를 못 받아도 나머지로 답한다
      document.head.appendChild(s);
    });
  }

  function ensureDict() {
    if (dictReady) return Promise.resolve(true);
    if (dictLoading) return dictLoading;
    const t0 = (window.performance && performance.now()) || Date.now();
    const jobs = [];
    if (!window.WORDS) DICT_FILES.forEach(f => jobs.push(loadScript(ROOT + 'english/js/dict/' + f + '.js')));
    if (!window.WORDS_JA) DICT_FILES.forEach(f => jobs.push(loadScript(ROOT + 'shared/dict-ja/' + f + '.js')));
    dictLoading = Promise.all(jobs).then(() => {
      buildIndex();
      dictReady = true;
      const ms = ((window.performance && performance.now()) || Date.now()) - t0;
      loadMs = Math.round(ms);
      return true;
    });
    return dictLoading;
  }
  let loadMs = 0;

  function entryOf(ko) {
    let e = BY_KO[ko];
    if (!e) { e = { ko, keys: [ko], emoji: '', cat: '', en: null, ja: null }; BY_KO[ko] = e; INDEX.push(e); }
    return e;
  }
  function addKeys(e, alt) {
    (alt || []).forEach(a => { if (a && e.keys.indexOf(a) === -1) e.keys.push(a); });
  }
  function buildIndex() {
    INDEX.length = 0;
    for (const k in BY_KO) delete BY_KO[k];
    (window.WORDS || []).forEach(w => {
      const e = entryOf(w.ko);
      addKeys(e, w.alt);
      if (!e.emoji) e.emoji = w.emoji || '';
      if (!e.cat) e.cat = w.cat || '';
      e.en = { en: w.en, read: w.read };
    });
    (window.WORDS_JA || []).forEach(w => {
      const e = entryOf(w.ko);
      addKeys(e, w.alt);
      if (!e.emoji) e.emoji = w.emoji || '';
      if (!e.cat) e.cat = w.cat || '';
      e.ja = { ja: w.ja, kanji: w.kanji || '', read: w.read };
    });
  }

  /* ─────────── 무엇을 물었나 — 갈래와 낱말 ───────────
   * 갈래는 "영어로 / 일본어로" 라는 말이 있는지로 가른다.
   * 그 말이 없으면(= "어떻게 써?", "뭐야?", 못 알아들음) 낱말 카드를 준다 —
   * 아는 낱말이면 영어·일본어를 함께 얹는 것이 가장 친절하다.
   */
  const PAT_JA = /(일본어|일본말|일어로|일본\s*말|재팬|japanese)/;
  const PAT_EN = /(영어|잉글리시|english)/;
  const PAT_WRITE = /(어떻게|어케)\s*(써|쓰|적)/;

  const STRIP = [
    // '일어' 는 반드시 '일어로' 로만 지운다 — 그냥 지우면 낱말 '일어나기' 가 잘린다
    /(이|가|은|는)?\s*(일본어|일본말|일어로|영어)\s*(로|론|는)?/g,
    /(어떻게|어케)\s*(써|쓰는지|쓰는\s*거야|쓰는거야|쓰|적는지|적어|적)?/g,
    /뭐라고\s*(해|해요|하지|할까|불러|말해)?/g,
    /뭐(야|예요|에요|지|게|니|죠|임)?/g,
    /무엇(이야|인가요|일까)?/g,
    /뭘까(요)?/g,
    /알려\s*(줘|줄래|주세요)?/g,
    /말해\s*(줘|줄래|주세요|봐)?/g,
    /가르쳐\s*(줘|줄래|주세요)?/g,
    /궁금해(요)?/g,
    /^(음+|어+|그+)\s*/g
  ];

  function intentOf(text) {
    const t = String(text || '');
    if (PAT_JA.test(t)) return 'ja';
    if (PAT_EN.test(t)) return 'en';
    if (PAT_WRITE.test(t)) return 'word';
    return 'word';                       // 갈래를 모르면 낱말 카드(영어·일본어까지 함께)
  }

  function clean(text) {
    let t = String(text || '').trim();
    STRIP.forEach(p => { t = t.replace(p, ' '); });
    return t.replace(/[?？!.,~'"]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // 1글자 낱말은 앞뒤 경계(+조사)까지 확인해 오탐을 막는다
  function boundary(text, w) {
    return new RegExp('(^|\\s)' + w + '(이|가|은|는|을|를|도|이요|요)?(\\s|$)').test(text);
  }

  function findWord(text) {
    const c = clean(text);
    if (!c) return null;
    const flat = c.replace(/\s+/g, '');
    let best = null, len = 0;
    for (let i = 0; i < INDEX.length; i++) {
      const e = INDEX[i];
      for (let j = 0; j < e.keys.length; j++) {
        const k = e.keys[j];
        if (!k || k.length <= len) continue;
        const hit = k.length === 1
          ? (boundary(c, k) || c === k || flat === k)
          : (c.indexOf(k) !== -1 || flat.indexOf(k.replace(/\s+/g, '')) !== -1);
        if (hit) { best = e; len = k.length; }
      }
    }
    return best;
  }

  function readAlts(alts) {
    const list = Array.isArray(alts) ? alts : [alts];
    for (const a of list) {
      const w = findWord(a);
      if (w) return { word: w, intent: intentOf(a), heard: a };
    }
    return { word: null, intent: intentOf(list[0] || ''), heard: list[0] || '' };
  }

  /* ─────────── 음성 인식 (english/js/speech.js 와 같은 방식) ───────────
   * 짧은 무음(no-speech)은 실패로 치지 않고 조용히 다시 듣는다 — 아이가 생각할 시간.
   * iOS 사파리: final 없이 interim 만 주고 끝나는 기기가 있어 마지막 interim 을 결과로 채택하고,
   * interim 뒤 1.3초 조용하면 stop() 으로 final 을 끌어낸다.
   */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const LISTEN_TOTAL_MS = 25000;
  const SILENCE_STOP_MS = 1300;
  let rec = null, cb = null, session = null, silenceTimer = null;

  function sttSupported() { return !!SR; }
  function clearSilence() { clearTimeout(silenceTimer); silenceTimer = null; }

  function finishSession(kind, payload) {
    clearSilence();
    if (!session || session.done) return;
    session.done = true;
    if (kind === 'result') { if (cb.onResult) cb.onResult(payload); }
    else if (cb.onFail) cb.onFail(kind);
  }

  function startRec() {
    if (!session || session.done) return;
    let sawSpeech = false, hardError = null;
    try {
      rec = new SR();
      rec.lang = 'ko-KR';
      rec.interimResults = true;
      rec.maxAlternatives = 3;
      rec.onresult = e => {
        sawSpeech = true;
        const res = e.results[e.results.length - 1];
        if (res.isFinal) {
          clearSilence();
          const alts = [];
          for (let i = 0; i < res.length; i++) alts.push(res[i].transcript);
          finishSession('result', alts);
        } else {
          const t = res[0] && res[0].transcript;
          if (t && t.trim()) session.interim = t;
          clearSilence();
          silenceTimer = setTimeout(() => { try { if (rec) rec.stop(); } catch (err) {} }, SILENCE_STOP_MS);
          if (cb.onInterim && t) cb.onInterim(t);
        }
      };
      rec.onerror = e => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') hardError = 'denied';
        else if (e.error !== 'no-speech' && e.error !== 'aborted') hardError = 'error';
      };
      rec.onnomatch = () => {};
      rec.onend = () => {
        clearSilence();
        if (!session || session.done) return;
        if (hardError) { finishSession(hardError); return; }
        if (session.interim) { finishSession('result', [session.interim]); return; }
        if (Date.now() - session.start < LISTEN_TOTAL_MS) {
          if (cb.onWaiting && !sawSpeech) cb.onWaiting();
          startRec();
        } else finishSession('nospeech');
      };
      try {
        rec.start();
        session.startFails = 0;
      } catch (err) {                     // 앞 인식이 아직 닫히는 중 — 잠깐 뒤 다시
        session.startFails = (session.startFails || 0) + 1;
        if (session.startFails > 3) { finishSession('error'); return; }
        setTimeout(() => { if (session && !session.done) startRec(); }, 300);
      }
    } catch (e) { finishSession('error'); }
  }

  function startListen(callbacks) {
    cb = callbacks || {};
    if (!SR) { if (cb.onFail) cb.onFail('unsupported'); return false; }
    session = { start: Date.now(), done: false, interim: null, startFails: 0 };
    startRec();
    return true;
  }
  function stopListen() {
    clearSilence();
    if (session) session.done = true;
    try { if (rec) rec.abort(); } catch (e) {}
  }

  /* ─────────── 화면 ─────────── */
  let ov = null, stage = null;
  let last = null;    // 마지막으로 답한 것 (테스트·다시 듣기용)

  function buildOverlay() {
    if (ov) return;
    ov = document.createElement('div');
    ov.className = 'lb-ov';
    ov.id = 'lb-overlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', '토끼에게 물어보기');
    ov.innerHTML = '<div class="lb-sheet"><button class="lb-close" type="button" aria-label="닫기">✕</button>' +
                   '<div class="lb-stage" id="lb-stage"></div></div>';
    document.body.appendChild(ov);
    stage = ov.querySelector('#lb-stage');
    ov.querySelector('.lb-close').addEventListener('click', close);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && ov.classList.contains('on')) close(); });
  }

  function open() {
    buildOverlay();
    ov.classList.add('on');
  }
  function close() {
    stopListen();
    stopSpeak();
    if (ov) ov.classList.remove('on');
  }

  function actBtns(list) {
    return '<div class="lb-btns">' + list.join('') + '</div>';
  }
  const BTN_ASK  = '<button class="lb-act" id="lb-again" type="button"><span>' + bunnySvg('lb-mini') + '</span><span>또 물어보기</span></button>';
  const BTN_PICK = '<button class="lb-act plain" id="lb-pick" type="button"><span>📖</span><span>골라서 물어보기</span></button>';

  function bind(id, fn) { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); }

  function showLoading() {
    stage.innerHTML = bunnySvg('lb-listen-bunny') +
      '<div class="lb-label">준비하고 있어요…</div>' +
      '<div class="lb-dots"><i></i><i></i><i></i></div>';
  }

  function showListening() {
    stage.innerHTML = bunnySvg('lb-listen-bunny') +
      '<div class="lb-label" id="lb-label">듣고 있어요…</div>' +
      '<div class="lb-dots"><i></i><i></i><i></i></div>' +
      '<div class="lb-interim" id="lb-interim"></div>' +
      actBtns([BTN_PICK]);
    bind('lb-pick', () => { stopListen(); showPickCats(); });
  }

  /* 답 카드 — focus 로 어느 줄을 크게 볼지 정한다 ('en' | 'ja' | 'word') */
  function showAnswer(e, focus) {
    last = { entry: e, focus };
    const chips = focus === 'word'
      ? '<div class="lb-chips">' + e.ko.split('').map(c => '<span>' + c + '</span>').join('') + '</div>'
      : '<div class="lb-ko">' + e.ko + '</div>';
    let html = '<div class="lb-emoji">' + (e.emoji || '🐰') + '</div>' + chips;
    if (e.en) {
      html += '<button class="lb-row en' + (focus === 'en' ? ' big' : '') + '" id="lb-row-en" type="button">' +
        '<span class="lb-flag">🇺🇸</span><span class="lb-main">' +
        '<span class="lb-word">' + e.en.en.toUpperCase() + '</span>' +
        '<span class="lb-read">' + e.en.read + '</span></span><span class="lb-speak">🔊</span></button>';
    }
    if (e.ja) {
      html += '<button class="lb-row ja' + (focus === 'ja' ? ' big' : '') + '" id="lb-row-ja" type="button">' +
        '<span class="lb-flag">🇯🇵</span><span class="lb-main">' +
        '<span class="lb-word">' + e.ja.ja + (e.ja.kanji ? ' <small>' + e.ja.kanji + '</small>' : '') + '</span>' +
        '<span class="lb-read">' + e.ja.read + '</span></span><span class="lb-speak">🔊</span></button>';
    }
    const acts = [BTN_ASK, BTN_PICK];
    if (focus === 'word') {
      // 낱말을 실어 보낸다 — 그냥 `write/` 로 보내면 아이가 첫 화면 메뉴를 만나고,
      // 거기서 🎤 물어보고 쓰기를 다시 찾아 낱말을 또 말해야 한다. 받는 쪽은 write/js/app.js 의 openFromUrl.
      const href = ROOT + 'write/?word=' + encodeURIComponent(e.ko);
      acts.splice(1, 0, '<a class="lb-act plain" href="' + href + '">✍️ 글씨 놀이터에서 써 보기</a>');
    }
    stage.innerHTML = html + actBtns(acts);

    bind('lb-row-en', () => speakSeq([{ lang: 'en', text: e.en.en }, { lang: 'en', text: e.en.en, rate: 0.6 }]));
    bind('lb-row-ja', () => speakSeq([{ lang: 'ja', text: e.ja.ja }, { lang: 'ja', text: e.ja.ja, rate: 0.6 }]));
    bind('lb-again', startAsk);
    bind('lb-pick', showPickCats);

    sfx.ding();
    setTimeout(() => speakSeq(answerScript(e, focus)), 320);
  }

  // 무엇을 어떤 목소리로 읽을지 — 언어가 섞이지 않게 항목마다 lang 을 못 박는다
  function answerScript(e, focus) {
    if (focus === 'en' && e.en) {
      return [{ lang: 'en', text: e.en.en },
              { lang: 'en', text: e.en.en, rate: 0.6 },
              { lang: 'ko', text: e.ko + '는 영어로 ' + e.en.read + '!' }];
    }
    if (focus === 'ja' && e.ja) {
      return [{ lang: 'ja', text: e.ja.ja },
              { lang: 'ja', text: e.ja.ja, rate: 0.6 },
              { lang: 'ko', text: e.ko + '는 일본어로 ' + e.ja.read + '!' }];
    }
    const seq = [{ lang: 'ko', text: e.ko + '!' }];
    if (e.en) { seq.push({ lang: 'ko', text: '영어로는' }); seq.push({ lang: 'en', text: e.en.en }); }
    if (e.ja) { seq.push({ lang: 'ko', text: '일본어로는' }); seq.push({ lang: 'ja', text: e.ja.ja }); }
    return seq;
  }

  /* 못 알아들었을 때 — 혼내지 않는다. 다시 해 보자고만 한다. */
  const misses = [];
  function showUnknown(heard) {
    last = { entry: null, focus: 'unknown', heard };
    if (heard) {
      misses.push({ t: Date.now(), heard });
      if (misses.length > 30) misses.shift();
      // 부모 확인용 기록 — 새 저장 키를 만들지 않으려고 메모리와 콘솔에만 남긴다
      try { console.info('[언어토끼] 못 알아들은 말:', heard); } catch (e) {}
    }
    stage.innerHTML = bunnySvg('lb-listen-bunny') +
      '<div class="lb-label">다시 한번 말해 줄래?</div>' +
      (heard ? '<div class="lb-interim">「 ' + heard + ' 」</div>' : '<div class="lb-interim"></div>') +
      actBtns([BTN_ASK, BTN_PICK]);
    bind('lb-again', startAsk);
    bind('lb-pick', showPickCats);
    speakSeq([{ lang: 'ko', text: '음, 다시 한번 말해 줄래?' }]);
  }

  /* 골라서 물어보기 — 마이크를 못 쓰거나 부모님이 꺼 두었을 때의 길 */
  function cats() {
    const src = (window.CATS && window.CATS.length ? window.CATS : window.CATS_JA) || [];
    return src.filter(c => INDEX.some(e => e.cat === c.id));
  }
  function showPickCats(msg) {
    stopListen();
    const list = cats();
    stage.innerHTML = '<div class="lb-label">' + (msg || '무엇이 궁금해?') + '</div>' +
      '<div class="lb-grid lb-scroll">' + list.map(c =>
        '<button class="lb-pick" type="button" data-cat="' + c.id + '">' +
        '<span class="e">' + (c.emoji || '❓') + '</span>' +
        '<span class="n">' + String(c.name).replace(/^[^\wㄱ-힣]+\s*/, '') + '</span></button>').join('') +
      '</div>' + actBtns(sttUsable() ? [BTN_ASK] : []);
    stage.querySelectorAll('.lb-pick').forEach(b =>
      b.addEventListener('click', () => { sfx.pop(); showPickWords(b.dataset.cat); }));
    bind('lb-again', startAsk);
  }
  function showPickWords(cat) {
    const list = INDEX.filter(e => e.cat === cat);
    stage.innerHTML = '<div class="lb-label">궁금한 걸 눌러 봐</div>' +
      '<div class="lb-grid lb-scroll">' + list.map((e, i) =>
        '<button class="lb-pick" type="button" data-i="' + i + '">' +
        '<span class="e">' + (e.emoji || '❓') + '</span>' +
        '<span class="n">' + e.ko + '</span></button>').join('') +
      '</div>' + actBtns(['<button class="lb-act plain" id="lb-back" type="button"><span>◀</span><span>갈래 고르기</span></button>']);
    stage.querySelectorAll('.lb-pick').forEach(b =>
      b.addEventListener('click', () => { sfx.pop(); showAnswer(list[+b.dataset.i], 'word'); }));
    bind('lb-back', () => showPickCats());
  }

  /* ─────────── 흐름 ─────────── */
  function sttUsable() {
    const off = window.ParentSettings && !ParentSettings.get('stt');
    return sttSupported() && !off;
  }

  function handleResult(alts) {
    const r = readAlts(alts);
    if (r.word) showAnswer(r.word, r.intent);
    else showUnknown(r.heard);
    return r;
  }

  async function startAsk() {
    ac();                       // 첫 터치에서 소리 잠금 해제
    stopSpeak();
    open();
    if (!dictReady) { showLoading(); await ensureDict(); }
    if (!sttUsable()) {
      const off = window.ParentSettings && !ParentSettings.get('stt');
      showPickCats('무엇이 궁금해?');
      speakSeq([{ lang: 'ko', text: off
        ? '오늘은 그림에서 골라 볼까? 궁금한 그림을 눌러 봐!'
        : '이 기기에서는 마이크를 쓸 수 없어. 그림에서 골라 볼까?' }]);
      return;
    }
    showListening();
    sfx.listen();
    startListen({
      onInterim(t) { const el = document.getElementById('lb-interim'); if (el) el.textContent = t; },
      onWaiting() { const el = document.getElementById('lb-label'); if (el) el.textContent = '천천히 생각해도 돼'; },
      onResult(alts) { handleResult(alts); },
      onFail(kind) {
        if (kind === 'denied') {
          showPickCats('그림에서 골라 볼까?');
          speakSeq([{ lang: 'ko', text: '마이크를 쓰려면 허락이 필요해. 그동안 그림에서 골라 볼까?' }]);
        } else showUnknown('');
      }
    });
  }

  /* ─────────── 홈에 앉히기 ─────────── */
  function mount() {
    if (document.getElementById('lb-bar')) return;
    injectDefs();
    const bar = document.createElement('div');
    bar.className = 'lb-bar';
    bar.id = 'lb-bar';
    bar.innerHTML =
      '<button id="lb-btn" class="lb-btn" type="button" aria-label="토끼에게 물어보기">' +
      '<svg class="lb-fr" preserveAspectRatio="none"><use href="#lb-crayon"></use></svg>' +
      '<div class="lb-fill"></div>' +
      bunnySvg('lb-bunny') +
      '<span class="lb-words"><span class="lb-say">궁금한 거 물어봐!</span>' +
      '<span class="lb-sub">한국말·영어·일본말 다 알려 줄게</span></span>' +
      '<svg class="lb-mic-ico" aria-hidden="true"><use href="#lb-mic"></use></svg>' +
      '</button>';
    // 놀이 묶음 **바로 위**에 놓는다 — 흐름 안이라 아코디언을 덮을 일이 없다
    const groups = document.querySelector('.groups');
    if (groups && groups.parentNode) groups.parentNode.insertBefore(bar, groups);
    else (document.querySelector('.page') || document.body).appendChild(bar);
    document.getElementById('lb-btn').addEventListener('click', startAsk);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  /* 테스트 훅 — 마이크 없이 인식 결과를 넣는다 */
  window.__simulateBunny = async text => {
    if (cb && session && !session.done) {
      try { if (rec) rec.abort(); } catch (e) {}
      const alts = [text];
      clearSilence();
      session.done = true;
      return handleResult(alts);
    }
    open();
    if (!dictReady) { buildOverlay(); showLoading(); await ensureDict(); }
    return handleResult([text]);
  };

  return {
    open: startAsk, close, mount,
    ask: window.__simulateBunny,
    sttUsable, ensureDict,
    intentOf, findWord, clean,
    misses: () => misses.slice(),
    // 아래는 검사용
    _spoken: () => spoken.slice(),
    _clearSpoken: () => { spoken.length = 0; },
    _last: () => last,
    _loadMs: () => loadMs,
    _size: () => INDEX.length
  };
})();
