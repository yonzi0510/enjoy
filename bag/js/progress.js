/* 진행도 — localStorage (서버·로그인 없음)
 * { stars: 숫자, done: { '놀이:도안id': 완성 횟수, … } }
 * 키는 Profile.key()를 거쳐 은아·서하가 각자 저장한다.
 */
window.Progress = (() => {
  const KEY = window.Profile ? Profile.key('bag-playground-v1') : 'bag-playground-v1'; // 아이 프로필별 저장

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

    recordDone(mode, id) {
      const k = mode + ':' + id;
      state.done[k] = (state.done[k] || 0) + 1;
      save();
    },
    isDone(mode, id) { return !!state.done[mode + ':' + id]; },
    doneCount(mode, ids) { return ids.filter(id => this.isDone(mode, id)).length; },
  };
})();
