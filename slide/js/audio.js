/* 소리 — TTS(ko-KR, 공용 목소리 설정) + Web Audio 효과음 (외부 파일 없음) */
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
    lift()    { tone(560, 0, 0.08, 0.22, 'sine'); tone(820, 0.05, 0.1, 0.18, 'sine'); },
    drop()    { tone(520, 0, 0.06, 0.3, 'square'); tone(880, 0.05, 0.12, 0.25, 'sine'); },
    nope()    { tone(300, 0, 0.12, 0.16, 'sine'); },
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
        const VS = window.VoiceSettings;
        // 이모지를 빼고 감탄사 뒤에 숨을 넣어 읽는다 (그냥 두면 이모지를 엉뚱하게 읽는다)
        const txt = VS ? VS.say(it.text) : it.text;
        const u = new SpeechSynthesisUtterance(txt);
        u.lang = 'ko-KR';
        const sel = (VS && VS.koVoice()) || koVoice;
        if (sel) u.voice = sel;
        u.rate = (it.rate || 0.9) * (VS ? VS.rateFactor() : 1);
        u.pitch = VS ? VS.pitchOf(it.pitch || 1.15) : (it.pitch || 1.15); // 높낮이는 1.0 쪽이 제 소리
        let advanced = false;
        const step = () => { if (!advanced) { advanced = true; clearTimeout(wd); next(); } };
        const wd = setTimeout(step, 1000 + txt.length * 450);
        u.onend = step;
        u.onerror = step;
        speechSynthesis.speak(u);
      } catch (e) { next(); }
    }
    // cancel() 직후 바로 speak() 하면 크롬에서 첫 글자가 잘린다 — 아주 잠깐 두고 시작
    const wait = window.VoiceSettings ? VoiceSettings.startDelay() : 0;
    if (wait) setTimeout(next, wait); else next();
  }
  // 통짜 문장은 두 마디로 나눠 읽는다 — 그 사이가 자연스러운 쉼이 된다
  function speak(text, onDone) {
    speakSeq(window.VoiceSettings ? VoiceSettings.parts(text) : [text], onDone);
  }

  return { sfx, speak, speakSeq, stop };
})();
