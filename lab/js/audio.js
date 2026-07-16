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
  function tone(freq, startAt, dur, vol, type, glide) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + startAt;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t + dur);
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
    fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, 0.3)); tone(1319, 0.5, 0.45, 0.3); },
    // 뽀글뽀글 — 물감 방울이 물에 퍼지는 소리 (위로 미끄러지는 짧은 음 여러 개)
    bubble() {
      for (let i = 0; i < 5; i++) {
        const f = 320 + Math.random() * 260;
        tone(f, i * 0.07, 0.12, 0.16, 'sine', f * 2.4);
      }
    },
    // 콸콸 — 물 비우는 소리 (아래로 흐르는 음 연속)
    pour() {
      for (let i = 0; i < 6; i++) {
        const f = 520 - i * 55 + Math.random() * 40;
        tone(f, i * 0.09, 0.16, 0.18, 'triangle', f * 0.55);
      }
    },
    // 반짝 — 병이 목표색으로 빛날 때
    sparkle() { [1320, 1760, 2093].forEach((f, i) => tone(f, i * 0.08, 0.2, 0.18, 'sine')); },
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

  // 순차 재생: items = 문자열 또는 {text, rate?, pitch?} 배열
  let seqId = 0; // 새 재생이 시작되면 이전 onDone 무효화
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
