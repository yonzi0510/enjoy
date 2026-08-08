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

  // 긴 말은 두 마디로 나눠 차례로 읽는다 — 그 사이가 자연스러운 쉼이 된다
  let seqId = 0; // 새 발화가 시작되면 앞선 마디는 이어 읽지 않는다
  function speak(text, onDone) {
    if (!window.speechSynthesis) { if (onDone) setTimeout(onDone, 200); return; }
    const VS = window.VoiceSettings;
    const parts = VS ? VS.parts(text) : [text];   // 이모지를 빼고 감탄사 뒤에 숨을 넣어 나눈다
    const my = ++seqId;
    try {
      speechSynthesis.cancel();
      pickVoice();
      let i = 0;
      function next() {
        // 새 발화가 끼어들었으면 멈추되, 기다리던 쪽이 막히지 않게 onDone은 그대로 부른다(예전과 같음)
        if (my !== seqId || i >= parts.length) { if (onDone) onDone(); return; }
        const txt = parts[i++];
        const u = new SpeechSynthesisUtterance(txt);
        u.lang = 'ko-KR';
        const sel = (VS && VS.koVoice()) || koVoice;
        if (sel) u.voice = sel;
        u.rate = 0.92 * (VS ? VS.rateFactor() : 1);
        u.pitch = VS ? VS.pitchOf(1.12) : 1.12; // 높낮이는 1.0 쪽이 제 소리
        let advanced = false;
        const step = () => { if (!advanced) { advanced = true; clearTimeout(wd); next(); } };
        const wd = setTimeout(step, 1000 + txt.length * 450);
        u.onend = step;
        u.onerror = step;
        speechSynthesis.speak(u);
      }
      // cancel() 직후 바로 speak() 하면 크롬에서 첫 글자가 잘린다 — 아주 잠깐 두고 시작
      const wait = VS ? VS.startDelay() : 0;
      if (wait) setTimeout(next, wait); else next();
    } catch (e) { if (onDone) onDone(); }
  }

  return { sfx, speak, stop };
})();
