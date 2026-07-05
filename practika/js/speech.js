/* 음성 — 인식(STT) + 합성(TTS) + Web Audio 효과음 (다국어)
 * 목표 언어(영어·일본어·중국어)는 Speech.setTarget(tts, stt) 로 전환한다.
 * 튜터 대사는 목표 언어, 힌트는 한국어로 읽는다.
 * 테스트 훅: window.__simulateSpeech('...') — 마이크 없이 인식 결과 주입
 */
window.Speech = (() => {
  /* ─────────── 효과음 (Web Audio) ─────────── */
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
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /* ─────────── 목표 언어 ─────────── */
  let targetTts = 'en-US', targetStt = 'en-US';
  function setTarget(tts, stt) { targetTts = tts || 'en-US'; targetStt = stt || targetTts; }

  /* ─────────── TTS ─────────── */
  const voiceCache = {};
  function refreshVoices() {
    if (!window.speechSynthesis) return [];
    return speechSynthesis.getVoices() || [];
  }
  function voiceFor(langCode) {
    const pref = (langCode || 'en').slice(0, 2);
    if (voiceCache[pref]) return voiceCache[pref];
    const vs = refreshVoices();
    const v = vs.find(x => x.lang && x.lang.toLowerCase().replace('_', '-') === langCode.toLowerCase()) ||
      vs.find(x => x.lang && x.lang.slice(0, 2).toLowerCase() === pref) || null;
    if (v) voiceCache[pref] = v;
    return v;
  }
  if (window.speechSynthesis) {
    speechSynthesis.onvoiceschanged = () => { for (const k in voiceCache) delete voiceCache[k]; };
  }

  function ttsSupported() { return !!window.speechSynthesis; }
  function hasVoices() { return refreshVoices().length > 0; }

  // items = [{lang:'ko'|'target', text, rate?}]
  function speakSeq(items, onDone) {
    if (!window.speechSynthesis) { if (onDone) onDone(); return; }
    speechSynthesis.cancel();
    let i = 0;
    function next() {
      if (i >= items.length) { if (onDone) onDone(); return; }
      const it = items[i++];
      try {
        const u = new SpeechSynthesisUtterance(it.text);
        if (it.lang === 'ko') {
          u.lang = 'ko-KR';
          const v = voiceFor('ko-KR'); if (v) u.voice = v;
          u.rate = it.rate || 0.98; u.pitch = 1.05;
        } else {
          u.lang = targetTts;
          const v = voiceFor(targetTts); if (v) u.voice = v;
          u.rate = it.rate || 0.9; u.pitch = 1.0;
        }
        u.onend = next;
        u.onerror = next;
        speechSynthesis.speak(u);
      } catch (e) { next(); }
    }
    next();
  }

  /* ─────────── STT ─────────── */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const LISTEN_TOTAL_MS = 15000;
  let rec = null, cb = null, session = null;

  function sttSupported() { return !!SR; }

  function finishSession(kind, payload) {
    if (!session || session.done) return;
    session.done = true;
    if (kind === 'result') { if (cb.onResult) cb.onResult(payload); }
    else if (cb.onFail) cb.onFail(kind);
    if (cb.onEnd) cb.onEnd();
  }
  function startRec() {
    if (!session || session.done) return;
    let sawSpeech = false, hardError = null;
    try {
      rec = new SR();
      rec.lang = targetStt;
      rec.interimResults = true;
      rec.maxAlternatives = 3;
      rec.onresult = e => {
        sawSpeech = true;
        const res = e.results[e.results.length - 1];
        if (res.isFinal) {
          const alts = [];
          for (let i = 0; i < res.length; i++) alts.push(res[i].transcript);
          finishSession('result', alts);
        } else if (cb.onInterim) cb.onInterim(res[0].transcript);
      };
      rec.onerror = e => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') hardError = 'denied';
        else if (e.error !== 'no-speech' && e.error !== 'aborted') hardError = 'error';
      };
      rec.onend = () => {
        if (!session || session.done) return;
        if (hardError) { finishSession(hardError); return; }
        if (Date.now() - session.start < LISTEN_TOTAL_MS) {
          if (cb.onWaiting && !sawSpeech) cb.onWaiting();
          startRec();
        } else finishSession('nospeech');
      };
      rec.start();
    } catch (e) { finishSession('error'); }
  }
  function startListen(callbacks) {
    cb = callbacks || {};
    if (!SR) { if (cb.onFail) cb.onFail('unsupported'); return false; }
    session = { start: Date.now(), done: false };
    startRec();
    return true;
  }
  function stopListen() {
    if (session) session.done = true;
    try { if (rec) rec.abort(); } catch (e) {}
  }

  window.__simulateSpeech = text => {
    if (cb && session && !session.done) {
      try { if (rec) rec.abort(); } catch (e) {}
      finishSession('result', [text]);
    } else if (window.App && window.App.handleSpeech) {
      window.App.handleSpeech([text]);
    }
  };

  /* ─────────── 인앱 브라우저 감지 (소리가 안 나는 흔한 원인) ─────────── */
  function inAppBrowser() {
    const ua = (navigator.userAgent || '').toLowerCase();
    const hints = ['kakaotalk', 'instagram', 'fban', 'fbav', 'line/', ' naver', 'daumapps', 'everytimeapp', 'trill', 'snapchat'];
    return hints.some(h => ua.indexOf(h.trim()) >= 0);
  }

  return {
    unlock() { ac(); refreshVoices(); },
    setTarget,
    sttSupported, ttsSupported, hasVoices, inAppBrowser,
    startListen, stopListen, speakSeq,
    speakKo(text, onDone) { speakSeq([{ lang: 'ko', text }], onDone); },
    speakTarget(text, rate, onDone) { speakSeq([{ lang: 'target', text, rate }], onDone); },
    stopSpeak() { if (window.speechSynthesis) speechSynthesis.cancel(); },
    ding() { tone(784, 0, 0.18, 0.25, 'triangle'); tone(1175, 0.09, 0.3, 0.25, 'triangle'); },
    pop() { tone(330, 0, 0.12, 0.12, 'sine'); },
    listenStart() { tone(660, 0, 0.1, 0.18, 'sine'); tone(880, 0.1, 0.14, 0.18, 'sine'); },
    buzz() { tone(220, 0, 0.16, 0.16, 'sawtooth'); tone(180, 0.12, 0.2, 0.14, 'sawtooth'); },
    tada() {
      tone(523, 0, 0.16, 0.22, 'triangle'); tone(659, 0.12, 0.16, 0.22, 'triangle');
      tone(784, 0.24, 0.16, 0.22, 'triangle'); tone(1047, 0.36, 0.5, 0.26, 'triangle');
      tone(1319, 0.5, 0.6, 0.18, 'sine');
    },
  };
})();
