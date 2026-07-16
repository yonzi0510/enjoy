/* 소리 — Web Audio 합성 효과음 + 한국어 음성 안내(speechSynthesis). 오디오 파일 없음 */
window.Sound = (() => {
  const MUTE_KEY = 'chatgi-muted';
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

  // 단일 음 — 부드러운 사인/삼각파 + 페이드아웃
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

  const praises = ['참 잘했어요!', '우와, 찾았다!', '정말 대단해요!', '멋져요!', '와, 최고예요!'];
  const donePraises = ['와, 전부 다 찾았어요! 정말 멋져요!', '참 잘했어요! 최고예요!', '우와, 다 찾았네요! 대단해요!'];

  let koVoice;
  function pickVoice() {
    if (koVoice || !window.speechSynthesis) return koVoice;
    const vs = speechSynthesis.getVoices();
    koVoice = vs.find(v => v.lang && v.lang.indexOf('ko') === 0) || null;
    return koVoice;
  }
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = pickVoice;

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
        u.rate = 0.9 * (window.VoiceSettings ? VoiceSettings.rateFactor() : 1);
        u.pitch = 1.15;
        const v = (window.VoiceSettings && VoiceSettings.koVoice()) || pickVoice();
        if (v) u.voice = v;
        speechSynthesis.speak(u);
      } catch (e) {}
    },
    speakPraise() { this.speak(praises[Math.floor(Math.random() * praises.length)]); },
    speakDone() { this.speak(donePraises[Math.floor(Math.random() * donePraises.length)]); },

    // 정답: 밝은 두 음 "딩동!"
    correct() {
      if (muted) return;
      tone(784, 0, 0.18, 0.25, 'triangle');   // G5
      tone(1175, 0.09, 0.3, 0.25, 'triangle'); // D6
    },
    // 오답/빈 곳 탭: 아주 부드러운 "통" (부정적이지 않게)
    pop() {
      if (muted) return;
      tone(330, 0, 0.12, 0.12, 'sine');
    },
    // 힌트 반짝임
    sparkle() {
      if (muted) return;
      tone(1568, 0, 0.1, 0.12, 'sine');
      tone(2093, 0.08, 0.1, 0.12, 'sine');
      tone(2637, 0.16, 0.16, 0.12, 'sine');
    },
    // 레벨 완료 팡파레
    tada() {
      if (muted) return;
      tone(523, 0, 0.16, 0.22, 'triangle');   // C5
      tone(659, 0.12, 0.16, 0.22, 'triangle'); // E5
      tone(784, 0.24, 0.16, 0.22, 'triangle'); // G5
      tone(1047, 0.36, 0.5, 0.26, 'triangle'); // C6
      tone(1319, 0.5, 0.6, 0.18, 'sine');      // E6
    },
    // 스티커 획득
    fanfare() {
      if (muted) return;
      tone(659, 0, 0.14, 0.2, 'triangle');
      tone(784, 0.1, 0.14, 0.2, 'triangle');
      tone(988, 0.2, 0.14, 0.2, 'triangle');
      tone(1319, 0.3, 0.7, 0.26, 'triangle');
      tone(1976, 0.44, 0.5, 0.14, 'sine');
    }
  };
})();

// 공용 모듈(목소리 미리듣기·시간제한 안내)도 이 앱의 음소거를 따르게 한다
window.EnjoyMuted = () => Sound.isMuted();
