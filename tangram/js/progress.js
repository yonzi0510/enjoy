/* 진행도 — localStorage (서버·로그인 없음)
 * { stars: 숫자, done: { '퍼즐id': true, … }, stageMeal: { 단계: true } 첫 완주 식사 보상 지급 여부 }
 * 아이 프로필별 저장(은아=원래 키, 서하=p2: 접두어).
 */
window.Progress = (() => {
  const KEY = window.Profile ? Profile.key('tangram-playground-v1') : 'tangram-playground-v1';

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object') {
        return { stars: raw.stars || 0, done: raw.done || {}, stageMeal: raw.stageMeal || {} };
      }
    } catch (e) { /* 손상 데이터 초기화 */ }
    return { stars: 0, done: {}, stageMeal: {} };
  }
  let state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  return {
    addStar(n) { state.stars += (n || 1); save(); },
    stars() { return state.stars; },
    markDone(id) { state.done[id] = true; save(); },
    isDone(id) { return !!state.done[id]; },
    doneCount(ids) { return ids.reduce((c, id) => c + (state.done[id] ? 1 : 0), 0); },
    // 단계를 처음으로 다 모았을 때만 true (펫 식사 보상 중복 방지)
    markStageMealOnce(level) {
      if (state.stageMeal[level]) return false;
      state.stageMeal[level] = true; save(); return true;
    },
  };
})();
