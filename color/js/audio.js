/* 소리 — Web Audio 합성 효과음 + 한국어 음성 안내(speechSynthesis). 오디오 파일 없음 */
window.Sound = (() => {
  const MUTE_KEY = 'color-muted';
  let muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) {}

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

  const colorPraises = ['좋아요!', '한 가지 색을 다 칠했어요!', '멋져요!', '잘하고 있어요!'];
  const donePraises = ['와, 그림을 완성했어요! 정말 멋져요!', '참 잘했어요! 완성이에요!', '우와, 다 칠했네요! 대단해요!'];

  let koVoice;
  function pickVoice() {
    if (koVoice || !window.speechSynthesis) return koVoice;
    const vs = speechSynthesis.getVoices();
    koVoice = vs.find(v => v.lang && v.lang.indexOf('ko') === 0) || null;
    return koVoice;
  }
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = pickVoice;

  let fillStep = 0;
  const FILL_NOTES = [523, 587, 659, 698, 784]; // C5 D5 E5 F5 G5 — 칠할 때마다 올라가는 느낌

  return {
    isMuted() { return muted; },
    toggleMute() {
      muted = !muted;
      try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) {}
      if (muted && window.speechSynthesis) speechSynthesis.cancel();
      return muted;
    },
    // 첫 터치 제스처에서 호출 — iOS 오디오 잠금 해제
    unlock() { if (!muted) ac(); },

    speak(text) {
      if (muted || !window.speechSynthesis) return;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'ko-KR';
        u.rate = 0.95;
        u.pitch = 1.1;
        const v = pickVoice();
        if (v) u.voice = v;
        speechSynthesis.speak(u);
      } catch (e) {}
    },
    speakColorDone() { this.speak(colorPraises[Math.floor(Math.random() * colorPraises.length)]); },
    speakDone() { this.speak(donePraises[Math.floor(Math.random() * donePraises.length)]); },

    // 영역 하나 채색: 짧고 경쾌한 블립 (연속으로 칠할 때 음이 올라감)
    fill() {
      if (muted) return;
      tone(FILL_NOTES[fillStep % FILL_NOTES.length], 0, 0.09, 0.16, 'triangle');
      fillStep++;
    },
    resetFillStep() { fillStep = 0; },
    // 한 색상 완료: 밝은 "딩동!"
    colorDone() {
      if (muted) return;
      tone(784, 0, 0.16, 0.22, 'triangle');
      tone(1175, 0.1, 0.28, 0.22, 'triangle');
    },
    // 오답 탭: 아주 부드러운 "통" (부정적이지 않게)
    pop() {
      if (muted) return;
      tone(300, 0, 0.11, 0.1, 'sine');
    },
    // 힌트 반짝임
    sparkle() {
      if (muted) return;
      tone(1568, 0, 0.1, 0.12, 'sine');
      tone(2093, 0.08, 0.1, 0.12, 'sine');
      tone(2637, 0.16, 0.16, 0.12, 'sine');
    },
    // 그림 완성 팡파레
    tada() {
      if (muted) return;
      tone(523, 0, 0.16, 0.22, 'triangle');
      tone(659, 0.12, 0.16, 0.22, 'triangle');
      tone(784, 0.24, 0.16, 0.22, 'triangle');
      tone(1047, 0.36, 0.5, 0.26, 'triangle');
      tone(1319, 0.5, 0.6, 0.18, 'sine');
    }
  };
})();
