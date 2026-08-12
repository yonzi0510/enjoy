/* 진행도 — localStorage (서버·로그인 없음)
 * {
 *   stars: 숫자,
 *   done:  { 's1-1': true, … }   방① 완성한 판
 *   birds: { 4: true, … }        방① 만난 친구(1~12시)
 *   wdone: { 'w1-3': true, … }   방② 부탁한 시각에 깨운 판
 *   pals:  { 'bear': true, … }   방② 앨범에 담긴 잠꾸러기
 *   woke:  { 'bear': 3, … }      방② 친구를 깨운 횟수 — 다음에 다른 장면을 보여 주는 데 쓴다
 *   days:  [ { slots: {…}, at: 숫자 }, … ]  방③ 보관한 하루(최대 6벌)
 *   work:  { 7: 'breakfast', … }  방③ 지금 만들고 있는 하루 — 카드를 놓을 때마다 적는다.
 *          보관을 안 눌러도 새로고침 뒤에 그대로 있어야 한다(태블릿은 아무 때나 새로 뜬다).
 * }
 * 아이 프로필별 저장(은아=원래 키, 서하=p2: 접두어).
 *
 * ⚠️ **키를 늘리지 않는다.** 방②③ 을 얹으면서도 저장 키는 'clock-playground-v1' 그대로다.
 *    새 키를 만들면 부모님 페이지의 PROGRESS_KEYS 에 또 등록해야 하고, 빠뜨리면
 *    기기를 바꿀 때 그 방의 진행도만 통째로 사라진다(2026-08 이전에 29개 중 21개가 그랬다).
 * ⚠️ 옛 저장본에는 wdone·pals·woke·days 가 **없다.** 그래서 load() 는 없는 필드를
 *    빈 값으로 채운다 — 방① 만 하던 아이의 별·도감이 그대로 살아남아야 한다.
 * ⚠️ 어떤 경우에도 줄어들지 않는다: 별·도감·앨범·보관한 하루.
 */
window.Progress = (() => {
  const KEY = window.Profile ? Profile.key('clock-playground-v1') : 'clock-playground-v1';
  const DAY_MAX = 6;   // 보관하는 하루 벌 수 — 넘치면 가장 오래된 것부터 자리를 내준다

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object') {
        return {
          stars: raw.stars || 0,
          done: raw.done || {},
          birds: raw.birds || {},
          wdone: raw.wdone || {},
          pals: raw.pals || {},
          woke: raw.woke || {},
          days: Array.isArray(raw.days) ? raw.days : [],
          work: (raw.work && typeof raw.work === 'object') ? raw.work : {},
        };
      }
    } catch (e) { /* 손상 데이터 초기화 */ }
    return { stars: 0, done: {}, birds: {}, wdone: {}, pals: {}, woke: {}, days: [], work: {} };
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

    /* ─────────── 방② 잠꾸러기 깨우기 ─────────── */
    markWDone(id) { state.wdone[id] = true; save(); },
    isWDone(id) { return !!state.wdone[id]; },
    wdoneCount(ids) { return ids.reduce((c, id) => c + (state.wdone[id] ? 1 : 0), 0); },
    // 앨범 — 부탁한 시각에 깨웠을 때 담긴다. 빠지는 일은 없다.
    keepPal(id) { state.pals[id] = true; save(); },
    hasPal(id) { return !!state.pals[id]; },
    palCount() { return Object.keys(state.pals).length; },
    /* 몇 번째로 깨우는가 — 장면이 매번 달라지는 근거다.
     * 깨우기만 하면(시각이 달라도) 센다. 「맞춰야만 다음 장면」이면 벌점이 된다. */
    bumpWoke(palId) { state.woke[palId] = (state.woke[palId] || 0) + 1; save(); return state.woke[palId]; },
    wokeCount(palId) { return state.woke[palId] || 0; },

    /* ─────────── 방③ 내 하루 ───────────
     * 정답이 없으므로 점수도 완성도 없다. 아이가 만든 것을 그대로 담아 둘 뿐이다. */
    keepDay(slots) {
      if (!slots || !Object.keys(slots).length) return;
      state.days.unshift({ slots: Object.assign({}, slots), at: Date.now() });
      if (state.days.length > DAY_MAX) state.days.length = DAY_MAX;
      save();
    },
    dayList() { return state.days.map(d => ({ slots: Object.assign({}, d.slots), at: d.at })); },
    dayCount() { return state.days.length; },
    // 만들던 하루 — 보관을 안 눌러도 새로고침 뒤에 그대로 있다
    setWork(slots) { state.work = Object.assign({}, slots || {}); save(); },
    work() { return Object.assign({}, state.work); },
    DAY_MAX,
  };
})();
