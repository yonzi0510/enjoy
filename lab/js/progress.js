/* 진행도 — localStorage (서버·로그인 없음)
 * 키: 'lab-playground-v1' (Profile.key 적용 — 은아·서하 각자 저장)
 * { stars: 숫자, missions: { orange: 완성 횟수, … }, shelf: [{ c:'#hex', name, at }] }
 */
window.Progress = (() => {
  const KEY = window.Profile ? Profile.key('lab-playground-v1') : 'lab-playground-v1'; // 아이 프로필별 저장
  const SHELF_MAX = 30; // 선반이 넘치면 가장 오래된 병부터 정리

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object') {
        return {
          stars: raw.stars || 0,
          missions: raw.missions || {},
          shelf: Array.isArray(raw.shelf) ? raw.shelf : [],
        };
      }
    } catch (e) { /* 손상 데이터 초기화 */ }
    return { stars: 0, missions: {}, shelf: [] };
  }
  let state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  return {
    addStar(n) { state.stars += (n || 1); save(); },
    stars() { return state.stars; },

    recordMission(id) {
      state.missions[id] = (state.missions[id] || 0) + 1;
      save();
    },
    missionDone(id) { return !!state.missions[id]; },
    missionCount() { return Object.keys(state.missions).length; },

    addShelf(c, name) {
      state.shelf.push({ c, name, at: Date.now() });
      if (state.shelf.length > SHELF_MAX) state.shelf = state.shelf.slice(-SHELF_MAX);
      save();
    },
    shelf() { return state.shelf.slice(); },
  };
})();
