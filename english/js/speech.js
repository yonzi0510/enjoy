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
          const sel = (window.VoiceSettings && VoiceSettings.koVoice()) || koVoice;
          if (sel) u.voice = sel;
          u.rate = (it.rate || 0.95) * (window.VoiceSettings ? VoiceSettings.rateFactor() : 1);
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
   * iOS 사파리 보강 (write/js/ask.js와 같은 패턴):
   * - isFinal 없이 interim만 주다가 onend로 끝나는 기기 → 마지막 interim을 결과로 채택
   * - interim 뒤 1.3초 새 소리가 없으면 stop()을 불러 final을 강제로 끌어낸다
   * - 재시작 시 start()가 InvalidStateError를 던지면 잠깐 뒤 다시 시도
   */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const LISTEN_TOTAL_MS = 25000; // 총 대기 시간 (생각할 시간 포함)
  const SILENCE_STOP_MS = 1300;  // interim 후 이만큼 조용하면 stop()으로 결과를 끌어낸다
  let rec = null;
  let cb = null; // { onResult(alts[]), onInterim(text), onWaiting(), onFail(kind), onEnd() }
  let session = null; // { start, done, interim, startFails }
  let silenceTimer = null;

  function sttSupported() { return !!SR; }

  function clearSilenceTimer() { clearTimeout(silenceTimer); silenceTimer = null; }

  function finishSession(kind, payload) {
    clearSilenceTimer();
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
      rec.interimResults = true; // 미지원 기기는 그냥 final만 온다 — 어느 쪽이든 동작
      rec.maxAlternatives = 3;
      rec.onresult = e => {
        sawSpeech = true;
        const res = e.results[e.results.length - 1];
        if (res.isFinal) {
          clearSilenceTimer();
          const alts = [];
          for (let i = 0; i < res.length; i++) alts.push(res[i].transcript);
          finishSession('result', alts);
        } else {
          // interim: final 없이 끝나는 사파리 대비로 저장하고, 침묵 타이머를 되감는다
          const t = res[0] && res[0].transcript;
          if (t && t.trim()) session.interim = t;
          clearSilenceTimer();
          silenceTimer = setTimeout(() => {
            try { if (rec) rec.stop(); } catch (err) {} // stop()이 final(또는 onend)을 만들어 준다
          }, SILENCE_STOP_MS);
          if (cb.onInterim && t) cb.onInterim(t);
        }
      };
      rec.onerror = e => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') hardError = 'denied';
        else if (e.error !== 'no-speech' && e.error !== 'aborted') hardError = 'error';
        // no-speech는 onend에서 재시작으로 이어감
      };
      // 알아듣지 못함 → no-speech처럼 onend의 재시도 흐름으로 (interim이 있으면 채택된다)
      rec.onnomatch = () => {};
      rec.onend = () => {
        clearSilenceTimer();
        if (!session || session.done) return;
        if (hardError) { finishSession(hardError); return; }
        // 사파리: final 없이 끝났어도 마지막 interim을 결과로 채택
        if (session.interim) { finishSession('result', [session.interim]); return; }
        // 아직 시간 여유가 있으면 조용히 다시 듣기 (아이가 생각하는 중)
        if (Date.now() - session.start < LISTEN_TOTAL_MS) {
          if (cb.onWaiting && !sawSpeech) cb.onWaiting();
          startRec();
        } else {
          finishSession('nospeech');
        }
      };
      try {
        rec.start();
        session.startFails = 0;
      } catch (err) { // 이전 인식이 아직 닫히는 중(InvalidStateError) — 잠깐 뒤 재시도
        session.startFails = (session.startFails || 0) + 1;
        if (session.startFails > 3) { finishSession('error'); return; }
        setTimeout(() => { if (session && !session.done) startRec(); }, 300);
      }
    } catch (e) {
      finishSession('error');
    }
  }

  function startListen(callbacks) {
    cb = callbacks || {};
    if (!SR) { if (cb.onFail) cb.onFail('unsupported'); return false; }
    session = { start: Date.now(), done: false, interim: null, startFails: 0 };
    startRec();
    return true;
  }

  function stopListen() {
    clearSilenceTimer();
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
