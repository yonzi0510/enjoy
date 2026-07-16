/* 배운 단어 기록 — localStorage (서버·로그인 없음)
 * { learned: { elephant: { count: 3, last: 1730000000000 } } }
 */
window.Progress = (() => {
  const KEY = window.Profile ? Profile.key('english-playground-v1') : 'english-playground-v1'; // 아이 프로필별 저장

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object') return { learned: raw.learned || {}, misses: raw.misses || {} };
    } catch (e) { /* 손상 데이터 초기화 */ }
    return { learned: {}, misses: {} };
  }

  let state = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  return {
    // 단어를 들었을 때 기록 (en 키 기준)
    record(en) {
      const item = state.learned[en] || { count: 0, last: 0 };
      item.count += 1;
      item.last = Date.now();
      state.learned[en] = item;
      save();
    },
    count() { return Object.keys(state.learned).length; },
    // 최근 순 [{en, count, last}]
    list() {
      return Object.entries(state.learned)
        .map(([en, v]) => ({ en, count: v.count, last: v.last }))
        .sort((a, b) => b.last - a.last);
    },
    knows(en) { return !!state.learned[en]; },
    // 못 알아들은 말 기록 — 부모가 보고 사전에 추가 요청할 수 있게
    recordMiss(text) {
      const t = String(text || '').trim().slice(0, 30);
      if (!t) return;
      const item = state.misses[t] || { count: 0, last: 0 };
      item.count += 1;
      item.last = Date.now();
      state.misses[t] = item;
      // 최근 30개만 유지
      const keys = Object.keys(state.misses);
      if (keys.length > 30) {
        keys.sort((a, b) => state.misses[a].last - state.misses[b].last);
        delete state.misses[keys[0]];
      }
      save();
    },
    listMisses() {
      return Object.entries(state.misses)
        .map(([text, v]) => ({ text, count: v.count, last: v.last }))
        .sort((a, b) => b.last - a.last);
    }
  };
})();
