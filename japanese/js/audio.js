/* 소리 — TTS(ja-JP + ko-KR) + Web Audio 효과음 (외부 파일 없음) */
window.Audio2 = (() => {
  /* ─────────── 효과음 ─────────── */
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
  const sfx = {
    tap()     { tone(660, 0, 0.09, 0.25, 'triangle'); },
    pop()     { tone(520, 0, 0.06, 0.3, 'square'); tone(880, 0.05, 0.12, 0.25, 'sine'); },
    good()    { tone(523, 0, 0.12, 0.3); tone(659, 0.1, 0.12, 0.3); tone(784, 0.2, 0.2, 0.3); },
    bad()     { tone(330, 0, 0.15, 0.2, 'sawtooth'); tone(262, 0.13, 0.25, 0.2, 'sawtooth'); },
    fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, 0.3)); tone(1319, 0.5, 0.45, 0.3); },
    stroke()  { tone(740, 0, 0.1, 0.2, 'triangle'); tone(988, 0.08, 0.15, 0.2, 'triangle'); },
  };

  /* ─────────── TTS ─────────── */
  let jaVoice = null, koVoice = null;
  function pickVoices() {
    if (!window.speechSynthesis) return;
    const vs = speechSynthesis.getVoices();
    if (!jaVoice) jaVoice = vs.find(v => v.lang && v.lang.indexOf('ja') === 0) || null;
    if (!koVoice) koVoice = vs.find(v => v.lang && v.lang.indexOf('ko') === 0) || null;
  }
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = pickVoices;

  function stop() { if (window.speechSynthesis) speechSynthesis.cancel(); }

  // 순차 재생: items = 문자열(일본어) 또는 {text, lang:'ja'|'ko', rate?, pitch?} 배열
  let seqId = 0; // 새 재생이 시작되면 이전 onDone 무효화
  function speakSeq(items, onDone) {
    const my = ++seqId;
    if (!window.speechSynthesis) { if (onDone) setTimeout(onDone, 200); return; }
    speechSynthesis.cancel();
    pickVoices();
    let i = 0;
    function next() {
      if (my !== seqId) return;
      if (i >= items.length) { if (onDone) onDone(); return; }
      let it = items[i++];
      if (typeof it === 'string') it = { text: it };
      try {
        const u = new SpeechSynthesisUtterance(it.text);
        if (it.lang === 'ko') {
          u.lang = 'ko-KR';
          if (koVoice) u.voice = koVoice;
        } else {
          u.lang = 'ja-JP';
          if (jaVoice) u.voice = jaVoice;
        }
        u.rate = it.rate || 0.85;
        u.pitch = it.pitch || 1.15;
        // 음성 엔진이 없거나 멈춰도 흐름이 끊기지 않게 워치독으로 강제 진행
        let advanced = false;
        const step = () => { if (!advanced) { advanced = true; clearTimeout(wd); next(); } };
        const wd = setTimeout(step, 1000 + it.text.length * 450);
        u.onend = step;
        u.onerror = step;
        speechSynthesis.speak(u);
      } catch (e) { next(); }
    }
    next();
  }
  function speak(text, onDone) { speakSeq([text], onDone); }

  return { sfx, speak, speakSeq, stop };
})();
