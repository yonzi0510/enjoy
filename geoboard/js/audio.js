/* 소리 — TTS(ko-KR) + Web Audio 효과음 (외부 파일 없음)
 * twang = 고무줄이 못에 걸릴 때 "통!" 튕기는 소리 · hmm = 잘못 걸었을 때 부드러운 안내음(무벌점) */
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
  // 고무줄 튕기는 소리 — 빠른 글리산도 + 진동
  function twangTone(startAt) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + startAt;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(620, t + 0.09);
    osc.frequency.exponentialRampToValueAtTime(340, t + 0.22);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.28, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }
  const sfx = {
    tap()     { tone(660, 0, 0.09, 0.25, 'triangle'); },
    twang()   { twangTone(0); },
    hmm()     { tone(330, 0, 0.14, 0.18, 'sine'); tone(280, 0.11, 0.18, 0.16, 'sine'); },
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

  /* 통짜 문장을 두 마디로 나눠 차례로 읽는다 — 마디 사이가 자연스러운 쉼이 된다.
   * 이모지를 빼고 감탄사 뒤에 숨을 넣는 다듬기는 공용 VoiceSettings 가 맡는다. */
  let seqId = 0; // 새 발화가 시작되면 이전 onDone 무효화
  function speak(text, onDone) {
    const my = ++seqId;
    if (!window.speechSynthesis) { if (onDone) setTimeout(onDone, 200); return; }
    speechSynthesis.cancel();
    pickVoice();
    const VS = window.VoiceSettings || null;
    const items = VS ? VS.parts(text) : [text];
    let i = 0;
    function next() {
      if (my !== seqId) return;
      if (i >= items.length) { if (onDone) onDone(); return; }
      const t = items[i++];
      try {
        const u = new SpeechSynthesisUtterance(t);
        u.lang = 'ko-KR';
        const sel = (VS && VS.koVoice()) || koVoice;
        if (sel) u.voice = sel;
        u.rate = 0.92 * (VS ? VS.rateFactor() : 1);   // 0.95 는 조금 서둘러 들려 0.92 로 낮춤
        u.pitch = VS ? VS.pitchOf(1.1) : 1.1;         // 높낮이를 1.0 쪽으로 — 얇고 딱딱한 소리를 줄인다
        // 음성 엔진이 없거나 멈춰도 흐름이 끊기지 않게 워치독으로 강제 진행
        let advanced = false;
        const step = () => { if (!advanced) { advanced = true; clearTimeout(wd); next(); } };
        const wd = setTimeout(step, 1000 + String(t).length * 450);
        u.onend = step;
        u.onerror = step;
        speechSynthesis.speak(u);
      } catch (e) { next(); }
    }
    // 첫 발화만 아주 잠깐 미룬다 — cancel() 직후 바로 speak() 하면 첫 글자가 잘린다
    const delay = VS ? VS.startDelay() : 0;
    if (delay) setTimeout(next, delay); else next();
  }

  return { sfx, speak, stop };
})();
