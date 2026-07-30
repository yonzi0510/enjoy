/* 소리 — TTS(ko-KR) + Web Audio 효과음 (외부 파일 없음) */
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
    tap()   { tone(660, 0, 0.09, 0.25, 'triangle'); },
    // 구슬이 관에 톡 떨어지는 소리 (또르르)
    plink() { tone(880, 0, 0.05, 0.28, 'sine'); tone(1240, 0.05, 0.1, 0.22, 'sine'); },
    // 관 하나 다 채웠을 때 딩동
    ding()  { tone(784, 0, 0.12, 0.28); tone(1047, 0.1, 0.2, 0.26); },
    good()  { tone(523, 0, 0.12, 0.3); tone(659, 0.1, 0.12, 0.3); tone(784, 0.2, 0.2, 0.3); },
    fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, 0.3)); tone(1319, 0.5, 0.45, 0.3); },
  };

  /* ─────────── TTS ─────────── */
  let koVoice = null;
  function pickVoice() {
    if (!window.speechSynthesis) return;
    const vs = speechSynthesis.getVoices();
    if (!koVoice) koVoice = vs.find(v => v.lang && v.lang.indexOf('ko') === 0) || null;
  }
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = pickVoice;

  function stop() { if (window.speechSynthesis) speechSynthesis.cancel(); }

  let seqId = 0;
  function speakSeq(items, onDone) {
    const my = ++seqId;
    if (!window.speechSynthesis) { if (onDone) setTimeout(onDone, 200); return; }
    speechSynthesis.cancel();
    pickVoice();
    let i = 0;
    function next() {
      if (my !== seqId) return;
      if (i >= items.length) { if (onDone) onDone(); return; }
      let it = items[i++];
      if (typeof it === 'string') it = { text: it };
      try {
        const u = new SpeechSynthesisUtterance(it.text);
        u.lang = 'ko-KR';
        const sel = (window.VoiceSettings && VoiceSettings.koVoice()) || koVoice;
        if (sel) u.voice = sel;
        u.rate = (it.rate || 0.9) * (window.VoiceSettings ? VoiceSettings.rateFactor() : 1);
        u.pitch = it.pitch || 1.15;
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
