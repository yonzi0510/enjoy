/* 진행도 — localStorage (서버·로그인 없음)
 * { traced: { 'ㄱ': 횟수 }, cards: { '가방': { e, from, at } }, stars: 숫자 }
 */
window.Progress = (() => {
  const KEY = window.Profile ? Profile.key('hangul-playground-v1') : 'hangul-playground-v1'; // 아이 프로필별 저장

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object') {
        return { traced: raw.traced || {}, cards: raw.cards || {}, stars: raw.stars || 0 };
      }
    } catch (e) { /* 손상 데이터 초기화 */ }
    return { traced: {}, cards: {}, stars: 0 };
  }

  let state = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  return {
    recordTrace(ch) {
      state.traced[ch] = (state.traced[ch] || 0) + 1;
      save();
    },
    tracedCount() { return Object.keys(state.traced).length; },
    hasTraced(ch) { return !!state.traced[ch]; },

    // 낱말 카드 지급. 새 카드면 true
    addCard(word, emoji, from) {
      const isNew = !state.cards[word];
      state.cards[word] = { e: emoji, from: from || '', at: Date.now() };
      save();
      return isNew;
    },
    cards() {
      return Object.entries(state.cards)
        .map(([w, v]) => ({ w, e: v.e, at: v.at }))
        .sort((a, b) => b.at - a.at);
    },
    cardCount() { return Object.keys(state.cards).length; },

    addStar(n) { state.stars += (n || 1); save(); },
    stars() { return state.stars; },
  };
})();
