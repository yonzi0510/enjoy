/* 음성 — 인식(STT ko-KR) + 합성(TTS en/ko) + Web Audio 효과음
 * 테스트 훅: window.__simulateSpeech('코끼리가 영어로 뭐야') — 마이크 없이 인식 결과 주입
 */
window.Speech = (() => {
  /* ─────────── 효과음 (Web Audio 합성) ─────────── */
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

  /* ─────────── TTS ─────────── */
  let koVoice, enVoice;
  function pickVoices() {
    if (!window.speechSynthesis) return;
    const vs = speechSynthesis.getVoices();
    if (!koVoice) koVoice = vs.find(v => v.lang && v.lang.indexOf('ko') === 0) || null;
    if (!enVoice) {
      enVoice = vs.find(v => v.lang === 'en-US') ||
        vs.find(v => v.lang && v.lang.indexOf('en') === 0) || null;
    }
  }
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = pickVoices;

  // 순차 재생: items = [{lang:'en'|'ko', text, rate?}], onDone?
  function speakSeq(items, onDone) {
    if (!window.speechSynthesis) { if (onDone) onDone(); return; }
    speechSynthesis.cancel();
    pickVoices();
    let i = 0;
    function next() {
      if (i >= items.length) { if (onDone) onDone(); return; }
      const it = items[i++];
      try {
        const u = new SpeechSynthesisUtterance(it.text);
        if (it.lang === 'en') {
          u.lang = 'en-US';
          if (enVoice) u.voice = enVoice;
          u.rate = it.rate || 0.85;
        } else {
          u.lang = 'ko-KR';
          if (koVoice) u.voice = koVoice;
          u.rate = it.rate || 0.95;
        }
        u.pitch = 1.1;
        u.onend = next;
        u.onerror = next;
        speechSynthesis.speak(u);
      } catch (e) { next(); }
    }
    next();
  }

  /* ─────────── STT ───────────
   * 아이가 말을 생각할 시간을 주기 위해, 브라우저의 짧은 무음 타임아웃(no-speech)이
   * 와도 실패로 처리하지 않고 조용히 인식을 재시작해 총 LISTEN_TOTAL_MS까지 기다린다.
   */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const LISTEN_TOTAL_MS = 25000; // 총 대기 시간 (생각할 시간 포함)
  let rec = null;
  let cb = null; // { onResult(alts[]), onInterim(text), onWaiting(), onFail(kind), onEnd() }
  let session = null; // { start, done }

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
    let sawSpeech = false;   // 이번 회차에서 소리를 감지했는지
    let hardError = null;
    try {
      rec = new SR();
      rec.lang = 'ko-KR';
      rec.interimResults = true;
      rec.maxAlternatives = 3;
      rec.onresult = e => {
        sawSpeech = true;
        const res = e.results[e.results.length - 1];
        if (res.isFinal) {
          const alts = [];
          for (let i = 0; i < res.length; i++) alts.push(res[i].transcript);
          finishSession('result', alts);
        } else if (cb.onInterim) {
          cb.onInterim(res[0].transcript);
        }
      };
      rec.onerror = e => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') hardError = 'denied';
        else if (e.error !== 'no-speech' && e.error !== 'aborted') hardError = 'error';
        // no-speech는 onend에서 재시작으로 이어감
      };
      rec.onend = () => {
        if (!session || session.done) return;
        if (hardError) { finishSession(hardError); return; }
        // 아직 시간 여유가 있으면 조용히 다시 듣기 (아이가 생각하는 중)
        if (Date.now() - session.start < LISTEN_TOTAL_MS) {
          if (cb.onWaiting && !sawSpeech) cb.onWaiting();
          startRec();
        } else {
          finishSession('nospeech');
        }
      };
      rec.start();
    } catch (e) {
      finishSession('error');
    }
  }

  function startListen(callbacks) {
    cb = callbacks || {};
    if (!SR) { if (cb.onFail) cb.onFail('unsupported'); return false; }
    session = { start: Date.now(), done: false };
    startRec();
    return true;
  }

  function stopListen() {
    if (session) session.done = true; // 사용자가 취소 → 실패 안내 생략
    try { if (rec) rec.abort(); } catch (e) {}
  }

  // 테스트 훅: 인식 결과를 코드로 주입
  window.__simulateSpeech = text => {
    if (cb && session && !session.done) {
      try { if (rec) rec.abort(); } catch (e) {}
      finishSession('result', [text]);
    } else if (window.App && window.App.handleSpeech) {
      window.App.handleSpeech([text]);
    }
  };

  return {
    unlock() { ac(); },
    sttSupported,
    startListen,
    stopListen,
    speakSeq,
    speakKo(text, onDone) { speakSeq([{ lang: 'ko', text }], onDone); },
    speakEn(text, rate, onDone) { speakSeq([{ lang: 'en', text, rate }], onDone); },
    stopSpeak() { if (window.speechSynthesis) speechSynthesis.cancel(); },
    // 효과음
    ding() { tone(784, 0, 0.18, 0.25, 'triangle'); tone(1175, 0.09, 0.3, 0.25, 'triangle'); },
    pop() { tone(330, 0, 0.12, 0.12, 'sine'); },
    listenStart() { tone(660, 0, 0.1, 0.18, 'sine'); tone(880, 0.1, 0.14, 0.18, 'sine'); },
    tada() {
      tone(523, 0, 0.16, 0.22, 'triangle'); tone(659, 0.12, 0.16, 0.22, 'triangle');
      tone(784, 0.24, 0.16, 0.22, 'triangle'); tone(1047, 0.36, 0.5, 0.26, 'triangle');
      tone(1319, 0.5, 0.6, 0.18, 'sine');
    }
  };
})();
