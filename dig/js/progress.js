/* 진행도 — localStorage (서버·로그인 없음)
 * { stars: 숫자, done: { 'd1-1': true, … } 완성한 판, best: { 'd1-1': 3 } 판마다 받은 최고 별 }
 * 아이 프로필별 저장(은아=원래 키, 서하=p2: 접두어).
 */
window.Progress = (() => {
  const KEY = window.Profile ? Profile.key('dig-playground-v1') : 'dig-playground-v1';

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object') {
        return { stars: raw.stars || 0, done: raw.done || {}, best: raw.best || {} };
      }
    } catch (e) { /* 손상 데이터 초기화 */ }
    return { stars: 0, done: {}, best: {} };
  }
  let state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  return {
    addStar(n) { state.stars += (n || 1); save(); },
    stars() { return state.stars; },
    markDone(id, stars) {
      state.done[id] = true;
      // 최고 기록만 남긴다 — 다시 놀아서 더 잘하면 올라가고, 못해도 내려가지 않는다
      if (!state.best[id] || stars > state.best[id]) state.best[id] = stars || 1;
      save();
    },
    isDone(id) { return !!state.done[id]; },
    bestOf(id) { return state.best[id] || 0; },
    doneCount(ids) { return ids.reduce((c, id) => c + (state.done[id] ? 1 : 0), 0); },
  };
})();
