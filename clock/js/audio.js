/* 소리 — Web Audio 합성 효과음(째깍·종·문) + 한국어 TTS. 외부 파일 없음.
 *
 * ⚠️ 이 앱이 말하는 것은 **시각 한마디뿐**이다 — "네 시!" · "네 시 반".
 * 설명("노는 시간이야" 같은 것)을 붙이지 마라. 부모님이 "헷갈린다"고 하셨고,
 * tools/e2e.mjs 가 발화 전부를 훑어 시각 읽기가 아닌 말이 섞이면 실패한다.
 * 한국어 발화는 공용 목소리 설정(VoiceSettings)을 거친다. */
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
    gain.gain.linearRampToValueAtTime(vol, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
  // 나무 문이 삐걱 열리는 소리 — 주파수를 훑어 올린다
  function creak(startAt, from, to, dur, vol) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + startAt;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
  const sfx = {
    tap()  { tone(660, 0, 0.08, 0.22, 'triangle'); },
    // 째깍 — 눈금 하나를 지날 때. 아주 짧고 작게(끄는 내내 울린다)
    tick() { tone(1180, 0, 0.028, 0.09, 'square'); },
    // 붙는 소리 — 손을 뗄 때 눈금에 톡
    snap() { tone(880, 0, 0.06, 0.16, 'triangle'); tone(1320, 0.05, 0.08, 0.1, 'sine'); },
    // 빗나감 — 야단이 아니라 "아직이야" 정도의 낮은 두 음(무벌점)
    miss() { tone(392, 0, 0.11, 0.13, 'sine'); tone(349, 0.1, 0.16, 0.11, 'sine'); },
    // 문이 열린다
    door() { creak(0, 220, 520, 0.34, 0.1); tone(196, 0.3, 0.1, 0.1, 'sine'); },
    // 뻐꾹 — 두 음이 내려온다
    cuckoo() { tone(784, 0, 0.16, 0.24, 'sine'); tone(622, 0.17, 0.26, 0.22, 'sine'); },
    // 시계 종
    bell() { [523, 659, 784, 1047].forEach((fq, i) => tone(fq, i * 0.11, 0.5, 0.16, 'sine')); },
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
      const VS = window.VoiceSettings || null;
      try {
        const said = VS ? VS.say(it.text) : it.text;
        // say() 가 빈 글을 낼 수 있다(순수 이모지) — 그때는 원래 글로 되돌린다
        const u = new SpeechSynthesisUtterance(said || it.text);
        u.lang = 'ko-KR';
        const sel = (VS && VS.koVoice()) || koVoice;
        if (sel) u.voice = sel;
        // 기본 빠르기 0.92 — 시각은 짧은 말이라 또박또박 읽는다
        u.rate = (it.rate || 0.92) * (VS ? VS.rateFactor() : 1);
        u.pitch = VS ? VS.pitchOf(it.pitch || 1) : (it.pitch || 1);
        let advanced = false;
        const step = () => { if (!advanced) { advanced = true; clearTimeout(wd); next(); } };
        const wd = setTimeout(step, 1000 + it.text.length * 450);
        u.onend = step;
        u.onerror = step;
        speechSynthesis.speak(u);
      } catch (e) { next(); }
    }
    // cancel() 뒤 바로 speak() 하면 크롬에서 첫 글자가 잘린다
    const delay = window.VoiceSettings ? VoiceSettings.startDelay() : 0;
    if (delay) setTimeout(next, delay); else next();
  }
  function speak(text, onDone) { speakSeq(window.VoiceSettings ? VoiceSettings.parts(text) : [text], onDone); }

  return { sfx, speak, speakSeq, stop };
})();
