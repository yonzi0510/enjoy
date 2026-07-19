/* 소리 — TTS(ko-KR) + Web Audio 효과음 (외부 파일 없음).
 * 공용 목소리 설정(VoiceSettings)을 따른다. */
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
    pick()    { tone(880, 0, 0.07, 0.2, 'triangle'); },                                   // 집기
    slide()   { tone(520, 0, 0.05, 0.14, 'sine'); },                                      // 슬라이더 미끄러짐
    pop()     { tone(520, 0, 0.06, 0.3, 'square'); tone(880, 0.05, 0.12, 0.25, 'sine'); }, // 착! 스냅
    spin()    { tone(740, 0, 0.06, 0.2, 'triangle'); tone(990, 0.05, 0.08, 0.18, 'triangle'); }, // 빙글 회전
    nope()    { tone(392, 0, 0.12, 0.18, 'sine'); tone(330, 0.1, 0.16, 0.15, 'sine'); },  // 부드러운 "아니야"
    fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, 0.3)); tone(1319, 0.5, 0.45, 0.3); },
  };
  // 실로폰 — 높이(0~1) 배열을 낮은음→높은음 종소리로 (빨대 완성 축하)
  function xylo(fracs) {
    fracs.forEach((h, i) => tone(392 + Math.max(0, Math.min(1, h)) * 660, i * 0.16, 0.4, 0.26, 'sine'));
  }

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

  return { sfx, xylo, speak, speakSeq, stop };
})();
