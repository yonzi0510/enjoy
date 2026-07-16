/* 진행도 — localStorage (서버·로그인 없음)
 * { stars: 숫자, rounds: { 'level-1': 완료 판 수, … } }
 * 단계 해금은 rounds 로 판단한다 (앞 단계를 1판 이상 마치면 다음 가게가 열린다).
 */
window.Progress = (() => {
  const KEY = window.Profile ? Profile.key('market-playground-v1') : 'market-playground-v1'; // 아이 프로필별 저장

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object') {
        return { stars: raw.stars || 0, rounds: raw.rounds || {} };
      }
    } catch (e) { /* 손상 데이터 초기화 */ }
    return { stars: 0, rounds: {} };
  }
  let state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  return {
    addStar(n) { state.stars += (n || 1); save(); },
    stars() { return state.stars; },

    recordRound(key) {
      state.rounds[key] = (state.rounds[key] || 0) + 1;
      save();
    },
    rounds(key) { return state.rounds[key] || 0; },
  };
})();
