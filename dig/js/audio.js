/* 소리 — TTS(ko-KR) + Web Audio 효과음 (외부 파일 없음).
 * 한국어 안내는 공용 목소리 설정(VoiceSettings)으로 다듬어 부드럽게 읽는다.
 * VoiceSettings 가 없으면 예전과 똑같이(원래 값으로) 동작한다. */
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
  // 흙을 쓸 때 나는 '사각사각' — 짧은 잡음 한 조각(합성, 외부 파일 아님)
  let lastScrape = 0;
  function scrape() {
    const c = ac(); if (!c) return;
    const now = c.currentTime;
    if (now - lastScrape < 0.12) return;   // 너무 자주 나면 시끄럽다
    lastScrape = now;
    const len = Math.floor(c.sampleRate * 0.14);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const fade = 1 - i / len;
      data[i] = (Math.random() * 2 - 1) * fade * fade * 0.5;
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1500, now);
    bp.Q.value = 0.8;
    const g = c.createGain();
    g.gain.setValueAtTime(0.22, now);
    src.connect(bp).connect(g).connect(c.destination);
    src.start(now);
    src.stop(now + 0.16);
  }

  const sfx = {
    tap()     { tone(660, 0, 0.09, 0.25, 'triangle'); },
    pop()     { tone(520, 0, 0.06, 0.3, 'square'); tone(880, 0.05, 0.12, 0.25, 'sine'); },
    dig()     { scrape(); },
    reveal()  { [392, 523, 659].forEach((f, i) => tone(f, i * 0.08, 0.18, 0.22, 'sine')); },
    good()    { tone(523, 0, 0.12, 0.3); tone(659, 0.1, 0.12, 0.3); tone(784, 0.2, 0.2, 0.3); },
    // 틀렸을 때 — 벌 주는 소리가 아니라 "어라?" 하는 부드러운 두 음
    soft()    { tone(440, 0, 0.14, 0.18, 'sine'); tone(392, 0.12, 0.2, 0.16, 'sine'); },
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
        const said = VS ? VS.say(it.text) : it.text;
        const u = new SpeechSynthesisUtterance(said || it.text);   // 순수 이모지면 원래 글로
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
    // 첫 발화만 아주 잠깐 미룬다 — cancel() 직후 바로 speak() 하면 첫 글자가 잘린다
    const delay = window.VoiceSettings ? VoiceSettings.startDelay() : 0;
    if (delay) setTimeout(next, delay); else next();
  }
  // 통짜 문장은 두 마디로 나눠 읽는다 — 마디 사이가 자연스러운 쉼이 된다
  function speak(text, onDone) { speakSeq(window.VoiceSettings ? VoiceSettings.parts(text) : [text], onDone); }

  return { sfx, speak, speakSeq, stop };
})();
