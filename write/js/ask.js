/* 물어보고 쓰기 — "토끼는 어떻게 써?" 음성 인식(STT ko-KR) + 낱말 추출
 * STT 재시작 로직은 english/js/speech.js 방식: 짧은 무음(no-speech)은 실패로 치지 않고
 * 조용히 재시작해 아이가 생각할 시간을 준다.
 * 테스트 훅: window.__simulateAsk('토끼는 어떻게 써') — 마이크 없이 인식 결과 주입
 */
window.Ask = (() => {
  /* ─────────── 낱말 추출 ───────────
   * "토끼는 어떻게 써?", "구름 어떻게 쓰는 거야", "별" 처럼 말해도 낱말만 뽑는다.
   */
  function parseWord(said) {
    if (!said) return null;
    const t = String(said).replace(/[?!.,~'"]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) return null;
    // "<낱말>(조사)? 어떻게 (써|쓰…|적…)" 꼴
    const m = t.match(/^(.+?)\s*(?:은|는|이|가|을|를)?\s*(?:어떻게|어케)\s*(?:써|쓰|적)/);
    let word = m ? m[1] : (/(어떻게|어케|써|쓰는|적어)/.test(t) ? null : t);
    if (!word) return null;
    word = word.replace(/[^가-힣ㄱ-ㅎㅏ-ㅣ ]/g, '').replace(/\s+/g, ' ').trim();
    if (!word || word.length > 8) return null;
    return word;
  }
  // 인식 후보들 중 먼저 추출되는 낱말
  function parseAlts(alts) {
    for (const a of alts) { const w = parseWord(a); if (w) return w; }
    return null;
  }

  /* ─────────── STT ───────────
   * iOS 사파리 보강: isFinal 없이 interim만 주다가 onend로 끝나는 기기가 있다.
   * - interim은 세션에 저장해 두고, final 없이 끝나면 그 텍스트를 결과로 채택
   * - interim 뒤 1.3초 새 소리가 없으면 stop()을 불러 final을 강제로 끌어낸다
   * - 재시작 시 start()가 InvalidStateError를 던지면 잠깐 뒤 다시 시도
   */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const LISTEN_TOTAL_MS = 20000;
  const SILENCE_STOP_MS = 1300; // interim 후 이만큼 조용하면 stop()으로 결과를 끌어낸다
  let rec = null;
  let cb = null;     // { onResult(alts), onInterim(text), onFail(kind), onEnd() }
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
    let hardError = null;
    try {
      rec = new SR();
      rec.lang = 'ko-KR';
      rec.interimResults = true; // 미지원 기기는 그냥 final만 온다 — 어느 쪽이든 동작
      rec.maxAlternatives = 3;
      rec.onresult = e => {
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
      };
      // 알아듣지 못함 → no-speech처럼 onend의 재시도 흐름으로 (interim이 있으면 채택된다)
      rec.onnomatch = () => {};
      rec.onend = () => {
        clearSilenceTimer();
        if (!session || session.done) return;
        if (hardError) { finishSession(hardError); return; }
        // 사파리: final 없이 끝났어도 마지막 interim을 결과로 채택
        if (session.interim) { finishSession('result', [session.interim]); return; }
        if (Date.now() - session.start < LISTEN_TOTAL_MS) startRec(); // 생각할 시간
        else finishSession('nospeech');
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
    if (session) session.done = true; // 사용자가 접음 → 실패 안내 생략
    try { if (rec) rec.abort(); } catch (e) {}
  }

  // 테스트 훅: 인식 결과를 코드로 주입
  window.__simulateAsk = text => {
    if (cb && session && !session.done) {
      try { if (rec) rec.abort(); } catch (e) {}
      finishSession('result', [text]);
    } else if (window.App && window.App.askWord) {
      const w = parseWord(text);
      if (w) window.App.askWord(w);
    }
  };

  return { sttSupported, startListen, stopListen, parseWord, parseAlts };
})();
