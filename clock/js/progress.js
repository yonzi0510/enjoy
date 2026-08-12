/* 진행도 — localStorage (서버·로그인 없음)
 * { stars: 숫자, done: { 's1-1': true, … } 완성한 판, birds: { 4: true, … } 만난 친구(1~12시) }
 * 아이 프로필별 저장(은아=원래 키, 서하=p2: 접두어).
 *
 * ⚠️ 새 진행도 키라 부모님 페이지의 PROGRESS_KEYS 에도 'clock-playground-v1' 을 넣어야
 *    백업 파일에 이 앱이 담긴다(parent/ 는 이번 차수의 작업 범위 밖이라 통합 담당 몫).
 */
window.Progress = (() => {
  const KEY = window.Profile ? Profile.key('clock-playground-v1') : 'clock-playground-v1';

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object') {
        return { stars: raw.stars || 0, done: raw.done || {}, birds: raw.birds || {} };
      }
    } catch (e) { /* 손상 데이터 초기화 */ }
    return { stars: 0, done: {}, birds: {} };
  }
  let state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  return {
    addStar(n) { state.stars += (n || 1); save(); },
    stars() { return state.stars; },
    markDone(id) { state.done[id] = true; save(); },
    isDone(id) { return !!state.done[id]; },
    doneCount(ids) { return ids.reduce((c, id) => c + (state.done[id] ? 1 : 0), 0); },
    // 친구 도감 — 어떤 경우에도 줄어들지 않는다
    meetBird(h12) { state.birds[h12] = true; save(); },
    hasBird(h12) { return !!state.birds[h12]; },
    birdCount() { return Object.keys(state.birds).length; },
  };
})();
