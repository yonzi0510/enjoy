/* 진행상황 저장 — localStorage (서버·로그인 없음)
 * stars: { 'farm_hidden_L1': 3, ... }  (구버전 'farm_hidden' 키는 L1로 읽음)
 *   짝꿍 카드는 'memory_L1'~'memory_L3', 동물의 집은 'habitat_animals'류 키를 같은 곳에 쓴다
 * stickers: { farm: 1|2|3 }  — 티어(1 쉬움, 2 보통, 3 어려움). 구버전 배열은 티어1로 이전
 * habitat: { animals: { fish: 1, ... }, vehicles: {...} }  — 집을 찾아 준 친구들 (필드 추가, 형식 유지)
 */
window.Progress = (() => {
  const KEY = window.Profile ? Profile.key('chatgi-playground-v1') : 'chatgi-playground-v1'; // 아이 프로필별 저장

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object') {
        let stickers = {};
        if (Array.isArray(raw.stickers)) {
          raw.stickers.forEach(id => { stickers[id] = 1; }); // 구버전 마이그레이션
        } else if (raw.stickers && typeof raw.stickers === 'object') {
          stickers = raw.stickers;
        }
        const habitat = (raw.habitat && typeof raw.habitat === 'object') ? raw.habitat : {};
        return { stars: raw.stars || {}, stickers, habitat };
      }
    } catch (e) { /* 손상된 데이터는 초기화 */ }
    return { stars: {}, stickers: {}, habitat: {} };
  }

  let state = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 저장 불가 환경 무시 */ }
  }

  return {
    // levelKey 예: 'farm_hidden_L1'
    getStars(levelKey) {
      if (state.stars[levelKey]) return state.stars[levelKey];
      // 구버전 키('farm_hidden')는 쉬움(L1) 기록으로 인정
      const legacy = levelKey.replace(/_L1$/, '');
      if (legacy !== levelKey && state.stars[legacy]) return state.stars[legacy];
      return 0;
    },
    setStars(levelKey, n) {
      if (n > this.getStars(levelKey)) { state.stars[levelKey] = n; save(); }
    },
    totalStars(themeId) {
      let sum = 0;
      ['hidden', 'diff'].forEach(m => {
        for (let lv = 1; lv <= 3; lv++) sum += this.getStars(themeId + '_' + m + '_L' + lv);
      });
      return sum;
    },
    getStickerTier(themeId) { return state.stickers[themeId] || 0; },
    // 티어가 올라갈 때만 저장하고 true 반환 (승급 연출용)
    upgradeStickerTier(themeId, tier) {
      if (tier > this.getStickerTier(themeId)) {
        state.stickers[themeId] = tier;
        save();
        return true;
      }
      return false;
    },

    /* ── 🏠 동물의 집 찾기: 집을 찾아 준 친구 기록 ── */
    isHabitatDone(topic, id) { return !!(state.habitat[topic] && state.habitat[topic][id]); },
    habitatDoneCount(topic) { return Object.keys(state.habitat[topic] || {}).length; },
    // 처음 집을 찾아 준 친구면 저장하고 true 반환 (주제 완주 판정용)
    markHabitatDone(topic, id) {
      if (!state.habitat[topic]) state.habitat[topic] = {};
      if (state.habitat[topic][id]) return false;
      state.habitat[topic][id] = 1;
      save();
      return true;
    }
  };
})();
