/* 소리 — TTS(ko-KR) + Web Audio 효과음 (외부 파일 없음).
 * 한국어 안내는 공용 목소리 설정(VoiceSettings)으로 다듬어 부드럽게 읽는다. */
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
    // 구슬이 구멍에 쏙 박히는 소리 (똑 → 반짝)
    plink()   { tone(720, 0, 0.05, 0.28, 'sine'); tone(1120, 0.05, 0.14, 0.22, 'sine'); },
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
      const VS = window.VoiceSettings || null;
      try {
        // 이모지를 빼고 감탄사 뒤에 숨을 넣어 읽는다 (공용 다듬기)
        const u = new SpeechSynthesisUtterance(VS ? VS.say(it.text) : it.text);
        u.lang = 'ko-KR';
        const sel = (VS && VS.koVoice()) || koVoice;
        if (sel) u.voice = sel;
        u.rate = (it.rate || 0.9) * (VS ? VS.rateFactor() : 1);
        // 높낮이를 1.0 쪽으로 되돌린다 — 올릴수록 얇고 딱딱하게 들린다
        u.pitch = VS ? VS.pitchOf(it.pitch || 1.15) : (it.pitch || 1.15);
        // 음성 엔진이 없거나 멈춰도 흐름이 끊기지 않게 워치독으로 강제 진행
        let advanced = false;
        const step = () => { if (!advanced) { advanced = true; clearTimeout(wd); next(); } };
        const wd = setTimeout(step, 1000 + it.text.length * 450);
        u.onend = step;
        u.onerror = step;
        speechSynthesis.speak(u);
      } catch (e) { next(); }
    }
    // 첫 발화만 아주 잠깐 미룬다 — cancel() 직후 바로 speak() 하면 첫 글자가 잘린다
    const delay = window.VoiceSettings ? VoiceSettings.startDelay() : 0;
    if (delay) setTimeout(next, delay); else next();
  }
  // 통짜 문장은 두 마디로 나눠 읽는다 — 마디 사이가 자연스러운 쉼이 된다
  function speak(text, onDone) { speakSeq(window.VoiceSettings ? VoiceSettings.parts(text) : [text], onDone); }

  return { sfx, speak, speakSeq, stop };
})();
