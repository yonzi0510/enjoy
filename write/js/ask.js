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

  /* ─────────── STT ─────────── */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const LISTEN_TOTAL_MS = 20000;
  let rec = null;
  let cb = null;     // { onResult(alts), onInterim(text), onFail(kind), onEnd() }
  let session = null;

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
    let hardError = null;
    try {
      rec = new SR();
      rec.lang = 'ko-KR';
      rec.interimResults = true;
      rec.maxAlternatives = 3;
      rec.onresult = e => {
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
      };
      rec.onend = () => {
        if (!session || session.done) return;
        if (hardError) { finishSession(hardError); return; }
        if (Date.now() - session.start < LISTEN_TOTAL_MS) startRec(); // 생각할 시간
        else finishSession('nospeech');
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
