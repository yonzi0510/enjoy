/* 진행도 — localStorage (서버·로그인 없음)
 * { stars: 숫자, done: { 'l1-patty': true, … } 완성한 미션 }
 * 아이 프로필별 저장(은아=원래 키, 서하=p2: 접두어).
 */
window.Progress = (() => {
  const KEY = window.Profile ? Profile.key('burger-playground-v1') : 'burger-playground-v1';

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object') {
        return { stars: raw.stars || 0, done: raw.done || {} };
      }
    } catch (e) { /* 손상 데이터 초기화 */ }
    return { stars: 0, done: {} };
  }
  let state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  return {
    addStar(n) { state.stars += (n || 1); save(); },
    stars() { return state.stars; },
    markDone(id) { state.done[id] = true; save(); },
    isDone(id) { return !!state.done[id]; },
    doneCount(ids) { return ids.reduce((c, id) => c + (state.done[id] ? 1 : 0), 0); },
  };
})();
