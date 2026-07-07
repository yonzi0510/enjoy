/* 진행도 + 작품 갤러리 — localStorage (서버·로그인 없음)
 * { stars: 숫자, done: { 페이지id: 완료 횟수 },
 *   gallery: { 페이지id: { t 글, e 이모지, tr 따라쓴 획, fr 혼자 쓴 획, at } } }
 * 획은 [{c:색, p:[x,y,x,y,...]}] 논리 좌표(정수) — 이미지 대신 선 데이터로 저장해 용량을 아낀다.
 * 페이지마다 최신 작품 1개만 보관하므로 저장 용량이 페이지 수로 한정된다.
 */
window.Progress = (() => {
  const KEY = 'write-playground-v1';

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object') {
        return { stars: raw.stars || 0, done: raw.done || {}, gallery: raw.gallery || {} };
      }
    } catch (e) { /* 손상 데이터 초기화 */ }
    return { stars: 0, done: {}, gallery: {} };
  }

  let state = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) {
      // 용량 초과 시 가장 오래된 작품부터 지우고 재시도 (진행도·별은 지키기)
      const olds = Object.entries(state.gallery).sort((a, b) => a[1].at - b[1].at);
      for (const [id] of olds) {
        delete state.gallery[id];
        try { localStorage.setItem(KEY, JSON.stringify(state)); return; } catch (e2) {}
      }
    }
  }

  return {
    // 페이지 완료 — 별 지급 + 작품 보관. 처음 완료면 true
    completePage(pageId, art) {
      const isFirst = !state.done[pageId];
      state.done[pageId] = (state.done[pageId] || 0) + 1;
      state.stars += 1;
      state.gallery[pageId] = { t: art.t, e: art.e || '', tr: art.tr, fr: art.fr, at: Date.now() };
      save();
      return isFirst;
    },
    isDone(pageId) { return !!state.done[pageId]; },
    stars() { return state.stars; },

    artOf(pageId) { return state.gallery[pageId] || null; },
    galleryList() {
      return Object.entries(state.gallery)
        .map(([id, v]) => ({ id, t: v.t, e: v.e, tr: v.tr, fr: v.fr, at: v.at }))
        .sort((a, b) => b.at - a.at);
    },
    galleryCount() { return Object.keys(state.gallery).length; },
  };
})();
