/* 진행상황 저장 — localStorage (서버·로그인 없음)
 * pics: { heart: { cells: [-1,0,2,...], done: 1, doneAt: '2026-07-04', bomb: 3, wand: 1 } }
 * cells는 칠한 팔레트 인덱스(-1 = 안 칠함). 길이가 도안과 다르면 무시(도안 변경 방어).
 */
window.Progress = (() => {
  const KEY = window.Profile ? Profile.key('pixel-playground-v1') : 'pixel-playground-v1'; // 아이 프로필별 저장
  const BOMBS = 3, WANDS = 1; // 기본값 (엔진이 난이도별 기본값을 넘겨줌)

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
    if (!state.pics[id]) state.pics[id] = { cells: null, done: 0, doneAt: '' };
    return state.pics[id];
  }

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  return {
    DEFAULT_BOMBS: BOMBS,
    DEFAULT_WANDS: WANDS,
    getCells(id, total) {
      const p = state.pics[id];
      if (!p || !Array.isArray(p.cells) || p.cells.length !== total) return null;
      return p.cells.slice();
    },
    setCells(id, cells) { pic(id).cells = cells; save(); },
    // def = 도안 난이도별 기본 부스터 (저장된 값이 없으면 기본값)
    getBoosters(id, def) {
      const d = def || { bomb: BOMBS, wand: WANDS };
      const p = state.pics[id];
      if (!p) return { ...d };
      return { bomb: Number.isInteger(p.bomb) ? p.bomb : d.bomb, wand: Number.isInteger(p.wand) ? p.wand : d.wand };
    },
    setBoosters(id, b) { const p = pic(id); p.bomb = b.bomb; p.wand = b.wand; save(); },
    isDone(id) { return !!(state.pics[id] && state.pics[id].done); },
    doneAt(id) { return (state.pics[id] && state.pics[id].doneAt) || ''; },
    markDone(id) {
      const p = pic(id);
      if (!p.done) { p.done = 1; p.doneAt = todayStr(); save(); }
    },
    reset(id) {
      delete state.pics[id]; // 부스터는 getBoosters의 난이도별 기본값으로 복원
      save();
    },
    // 홈 진행률 뱃지용: 올바르게 칠한 칸 수 (target 배열과 비교)
    correctCount(id, target) {
      const p = state.pics[id];
      if (!p || !Array.isArray(p.cells) || p.cells.length !== target.length) return 0;
      let n = 0;
      for (let i = 0; i < target.length; i++) if (p.cells[i] === target[i]) n++;
      return n;
    }
  };
})();
