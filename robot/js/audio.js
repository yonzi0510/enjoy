/* 소리 — TTS(ko-KR) + Web Audio 합성 효과음 (외부 파일 없음).
 * 한국어 안내는 공용 목소리 설정(VoiceSettings)으로 다듬어 부드럽게 읽는다.
 * VoiceSettings 가 없으면 예전과 똑같이 동작한다(폴백은 이 파일의 원래 값). */
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
  // 미끄러지는 소리 (첨벙·꽝 같은 것에)
  function slide(f1, f2, startAt, dur, vol, type) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + startAt;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(f1, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, f2), t + dur);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  const sfx = {
    tap()   { tone(660, 0, 0.09, 0.25, 'triangle'); },
    card()  { tone(520, 0, 0.06, 0.26, 'square'); tone(780, 0.05, 0.1, 0.2, 'triangle'); },
    undo()  { tone(520, 0, 0.07, 0.2, 'triangle'); tone(360, 0.06, 0.1, 0.18, 'triangle'); },
    step()  { tone(300, 0, 0.05, 0.2, 'square'); tone(430, 0.05, 0.06, 0.14, 'triangle'); }, // 뒤뚱 한 걸음
    bump()  { slide(200, 70, 0, 0.28, 0.3, 'sawtooth'); tone(120, 0.02, 0.2, 0.22, 'square'); }, // 쿵!
    splash(){ slide(700, 220, 0, 0.3, 0.22, 'sine'); tone(1200, 0.06, 0.14, 0.12, 'triangle'); }, // 첨벙
    locked(){ tone(300, 0, 0.09, 0.22, 'square'); tone(240, 0.1, 0.14, 0.2, 'square'); }, // 덜컹(잠긴 문)
    key()   { tone(880, 0, 0.09, 0.25); tone(1175, 0.08, 0.14, 0.24); },
    soft()  { tone(392, 0, 0.12, 0.18, 'triangle'); tone(440, 0.1, 0.18, 0.16, 'triangle'); }, // 괜찮아, 다시
    fanfare(){ [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, 0.3)); tone(1319, 0.5, 0.45, 0.3); },
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
      const VS = window.VoiceSettings || null;
      try {
        // 이모지를 빼고 감탄사 뒤에 숨을 넣어 읽는다 (공용 다듬기)
        const text = VS ? (VS.say(it.text) || it.text) : it.text;
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'ko-KR';
        const sel = (VS && VS.koVoice()) || koVoice;
        if (sel) u.voice = sel;
        u.rate = (it.rate || 0.92) * (VS ? VS.rateFactor() : 1);
        // 높낮이는 1.0 이 제 소리다 — 올릴수록 얇고 인공적으로 들린다
        u.pitch = VS ? VS.pitchOf(it.pitch || 1.0) : (it.pitch || 1.0);
        let advanced = false;
        const step = () => { if (!advanced) { advanced = true; clearTimeout(wd); next(); } };
        const wd = setTimeout(step, 1000 + it.text.length * 450);
        u.onend = step;
        u.onerror = step;
        speechSynthesis.speak(u);
      } catch (e) { next(); }
    }
    // cancel() 직후 바로 speak() 하면 크롬에서 첫 글자가 잘린다
    const delay = window.VoiceSettings ? VoiceSettings.startDelay() : 0;
    if (delay) setTimeout(next, delay); else next();
  }
  // 통짜 문장은 두 마디로 나눠 읽는다 — 마디 사이가 자연스러운 쉼이 된다
  function speak(text, onDone) { speakSeq(window.VoiceSettings ? VoiceSettings.parts(text) : [text], onDone); }

  return { sfx, speak, speakSeq, stop };
})();
