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
    tap()     { tone(660, 0, 0.09, 0.25, 'triangle'); },
    pick()    { tone(880, 0, 0.07, 0.2, 'triangle'); },                                   // 조각 집기
    pop()     { tone(520, 0, 0.06, 0.3, 'square'); tone(880, 0.05, 0.12, 0.25, 'sine'); }, // 착! 스냅
    spin()    { tone(740, 0, 0.06, 0.2, 'triangle'); tone(990, 0.05, 0.08, 0.18, 'triangle'); }, // 톡 돌리기
    nope()    { tone(392, 0, 0.12, 0.18, 'sine'); tone(330, 0.1, 0.16, 0.15, 'sine'); },   // 부드러운 "아니야"
    good()    { tone(523, 0, 0.12, 0.3); tone(659, 0.1, 0.12, 0.3); tone(784, 0.2, 0.2, 0.3); },
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

  function speak(text, onDone) {
    if (!window.speechSynthesis) { if (onDone) setTimeout(onDone, 200); return; }
    try {
      speechSynthesis.cancel();
      pickVoice();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR';
      const sel = (window.VoiceSettings && VoiceSettings.koVoice()) || koVoice;
      if (sel) u.voice = sel;
      u.rate = 0.92 * (window.VoiceSettings ? VoiceSettings.rateFactor() : 1);
      u.pitch = 1.12;
      let advanced = false;
      const step = () => { if (!advanced) { advanced = true; clearTimeout(wd); if (onDone) onDone(); } };
      const wd = setTimeout(step, 1000 + text.length * 450);
      u.onend = step;
      u.onerror = step;
      speechSynthesis.speak(u);
    } catch (e) { if (onDone) onDone(); }
  }

  return { sfx, speak, stop };
})();
