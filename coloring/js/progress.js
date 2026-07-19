/* 진행도 + 완성작 갤러리 — localStorage (서버·로그인 없음)
 * { stars: 별 수, done: { 그림id: 완성 횟수 }, gallery: [ { id, pic, name, emoji, url(PNG dataURL), at } ] }
 * 완성작은 최신 24장만 보관(용량 한정). 새 완성작은 앞에 쌓인다.
 * 아이 프로필별 저장 — 은아는 원래 키, 서하는 p2: 접두어 (Profile.key).
 */
window.Progress = (() => {
  const KEY = window.Profile ? Profile.key('coloring-playground-v1') : 'coloring-playground-v1';
  const MAX_ART = 24;

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object') {
        return { stars: raw.stars || 0, done: raw.done || {}, gallery: Array.isArray(raw.gallery) ? raw.gallery : [] };
      }
    } catch (e) { /* 손상 데이터 초기화 */ }
    return { stars: 0, done: {}, gallery: [] };
  }

  let state = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) {
      // 용량 초과 시 가장 오래된 작품부터 지우고 재시도 (별·완성 기록은 지키기)
      while (state.gallery.length) {
        state.gallery.pop();
        try { localStorage.setItem(KEY, JSON.stringify(state)); return; } catch (e2) {}
      }
    }
  }

  return {
    stars() { return state.stars; },
    isDone(picId) { return !!state.done[picId]; },
    doneCount() { return Object.keys(state.done).length; },

    // 완성작 보관 — 별 지급 + 갤러리에 추가. 그 그림을 처음 완성했으면 true
    complete(picId, art) {
      const first = !state.done[picId];
      state.done[picId] = (state.done[picId] || 0) + 1;
      state.stars += 1;
      state.gallery.unshift(Object.assign({ id: picId + '-' + Date.now() }, art, { at: Date.now() }));
      while (state.gallery.length > MAX_ART) state.gallery.pop();
      save();
      return first;
    },

    gallery() { return state.gallery.slice(); },
    galleryCount() { return state.gallery.length; },
    removeArt(artId) {
      const i = state.gallery.findIndex(a => a.id === artId);
      if (i >= 0) { state.gallery.splice(i, 1); save(); }
    },
  };
})();
