/* 배운 단어·알파벳 기록 — localStorage (서버·로그인 없음)
 * {
 *   learned: { elephant: { count: 3, last: 1730000000000 } },  // 배운 단어
 *   misses:  { '뽀로로': { count: 1, last: … } },              // 못 알아들은 말(부모 확인용)
 *   traced:  { 'A': 2, 'a': 1 },                               // 따라 쓴 알파벳 (횟수)
 *   cards:   { apple: { e:'🍎', k:'사과', at: … } }             // 따라쓰기로 받은 낱말 카드
 * }
 * 알파벳을 더하면서 **키를 새로 만들지 않고 필드만 더했다** —
 * 새 키를 만들면 parent/index.html 의 백업 목록에서 빠지고, 이미 배운 단어 기록과
 * 갈라져 버린다. 옛 데이터에는 traced·cards 가 없으므로 load() 에서 빈 값으로 채운다.
 */
window.Progress = (() => {
  const KEY = window.Profile ? Profile.key('english-playground-v1') : 'english-playground-v1'; // 아이 프로필별 저장

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object') {
        return {
          learned: raw.learned || {},
          misses: raw.misses || {},
          traced: raw.traced || {},   // 옛 저장본에는 없다 — 그대로 이어 쓴다
          cards: raw.cards || {},
        };
      }
    } catch (e) { /* 손상 데이터 초기화 */ }
    return { learned: {}, misses: {}, traced: {}, cards: {} };
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
    },

    /* ─────────── 알파벳 따라쓰기 ─────────── */
    recordTrace(ch) {
      state.traced[ch] = (state.traced[ch] || 0) + 1;
      save();
    },
    hasTraced(ch) { return !!state.traced[ch]; },
    tracedCount() { return Object.keys(state.traced).length; },

    // 낱말 카드 지급. 처음 받는 카드면 true
    addCard(en, emoji, ko) {
      const isNew = !state.cards[en];
      state.cards[en] = { e: emoji, k: ko, at: Date.now() };
      save();
      return isNew;
    },
    cards() {
      return Object.entries(state.cards)
        .map(([en, v]) => ({ en, e: v.e, k: v.k, at: v.at }))
        .sort((a, b) => b.at - a.at);
    },
    cardCount() { return Object.keys(state.cards).length; },
  };
})();
