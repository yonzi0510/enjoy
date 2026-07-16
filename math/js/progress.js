/* 진행도 — localStorage (서버·로그인 없음)
 * { stars: 숫자, traced: { '7': 완료 횟수 }, rounds: { 'add-visual-1': 완료 판 수, … } }
 */
window.Progress = (() => {
  const KEY = window.Profile ? Profile.key('math-playground-v1') : 'math-playground-v1'; // 아이 프로필별 저장

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object') {
        return { stars: raw.stars || 0, traced: raw.traced || {}, rounds: raw.rounds || {} };
      }
    } catch (e) { /* 손상 데이터 초기화 */ }
    return { stars: 0, traced: {}, rounds: {} };
  }
  let state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  return {
    addStar(n) { state.stars += (n || 1); save(); },
    stars() { return state.stars; },

    recordTrace(n) {
      state.traced[n] = (state.traced[n] || 0) + 1;
      save();
    },
    isTraced(n) { return !!state.traced[n]; },
    tracedCount(from, to) {
      let c = 0;
      for (let n = from; n <= to; n++) if (state.traced[n]) c++;
      return c;
    },

    recordRound(key) {
      state.rounds[key] = (state.rounds[key] || 0) + 1;
      save();
    },
    rounds(key) { return state.rounds[key] || 0; },
  };
})();
