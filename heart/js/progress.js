/* 진행도 — localStorage (서버·로그인 없음)
 * {
 *   stars: 숫자,
 *   done:  { 'h1': true, … }                       완성한 장면
 *   book:  { 'sad': {brow,eyes,mouth,scene} , … }  마음 도감 12칸 —
 *          예시 그림이 아니라 **아이가 그때 만든 얼굴 그대로** 담는다.
 *   free:  [ {brow,eyes,mouth}, … ]                자유 모드에서 저장한 얼굴 스티커
 * }
 * 아이 프로필별 저장(은아=원래 키, 서하=p2: 접두어).
 */
window.Progress = (() => {
  const KEY = window.Profile ? Profile.key('heart-playground-v1') : 'heart-playground-v1';
  const FREE_MAX = 24;   // 스티커 줄이 끝없이 늘어나지 않게

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object') {
        return {
          stars: raw.stars || 0,
          done: raw.done || {},
          book: raw.book || {},
          free: Array.isArray(raw.free) ? raw.free : [],
        };
      }
    } catch (e) { /* 손상 데이터 초기화 */ }
    return { stars: 0, done: {}, book: {}, free: [] };
  }
  let state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  return {
    addStar(n) { state.stars += (n || 1); save(); },
    stars() { return state.stars; },
    markDone(id) { state.done[id] = true; save(); },
    isDone(id) { return !!state.done[id]; },
    doneCount(ids) { return ids.reduce((c, id) => c + (state.done[id] ? 1 : 0), 0); },

    /* 마음 도감 — 그 장면이 다루는 마음 칸에, 아이가 만든 얼굴을 그대로 넣는다 */
    setFace(moodId, sel, sceneId) {
      if (!moodId || !sel) return;
      state.book[moodId] = { brow: sel.brow, eyes: sel.eyes, mouth: sel.mouth, scene: sceneId || null };
      save();
    },
    faceOf(moodId) { return state.book[moodId] || null; },
    bookCount() { return Object.keys(state.book).length; },

    /* 자유 모드 스티커 */
    addFree(sel) {
      if (!sel || !sel.brow || !sel.eyes || !sel.mouth) return;
      state.free.unshift({ brow: sel.brow, eyes: sel.eyes, mouth: sel.mouth });
      if (state.free.length > FREE_MAX) state.free.length = FREE_MAX;
      save();
    },
    freeList() { return state.free.slice(); },
  };
})();
