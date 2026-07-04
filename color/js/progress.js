/* 진행상황 저장 — localStorage (서버·로그인 없음)
 * pics: { butterfly: { filled: [0,3,7,...], done: 1, doneAt: '2026-07-04' } }
 * filled는 도안 regions 배열의 인덱스 목록. 도안 데이터는 뒤에만 추가(append-only)한다.
 */
window.Progress = (() => {
  const KEY = 'color-playground-v1';

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object' && raw.pics && typeof raw.pics === 'object') {
        return { pics: raw.pics };
      }
    } catch (e) { /* 손상된 데이터는 초기화 */ }
    return { pics: {} };
  }

  let state = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 저장 불가 환경 무시 */ }
  }

  function pic(id) {
    if (!state.pics[id]) state.pics[id] = { filled: [], done: 0, doneAt: '' };
    return state.pics[id];
  }

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  return {
    // 저장된 채색 인덱스 Set (regionCount 밖 인덱스는 무시 — 도안 변경 방어)
    getFilled(id, regionCount) {
      const p = state.pics[id];
      if (!p || !Array.isArray(p.filled)) return new Set();
      return new Set(p.filled.filter(i => Number.isInteger(i) && i >= 0 && i < regionCount));
    },
    addFilled(id, idx) {
      const p = pic(id);
      if (!p.filled.includes(idx)) { p.filled.push(idx); save(); }
    },
    isDone(id) { return !!(state.pics[id] && state.pics[id].done); },
    doneAt(id) { return (state.pics[id] && state.pics[id].doneAt) || ''; },
    markDone(id) {
      const p = pic(id);
      if (!p.done) { p.done = 1; p.doneAt = todayStr(); save(); }
    },
    reset(id) {
      state.pics[id] = { filled: [], done: 0, doneAt: '' };
      save();
    },
    filledCount(id, regionCount) { return this.getFilled(id, regionCount).size; }
  };
})();
