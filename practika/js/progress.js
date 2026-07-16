/* 진행도 · 게임화 — localStorage (서버·로그인 없음)
 * { streak:{count,lastDay}, xp, gems,
 *   lessons:{ 'travel-cafe':{stars,best,done} },
 *   learned:{ 'a coffee please':{en,ko,count,last} } }
 */
window.Progress = (() => {
  const KEY = window.Profile ? Profile.key('practika-playground-v1') : 'practika-playground-v1'; // 아이 프로필별 저장

  function today() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object') {
        return {
          streak: raw.streak || { count: 0, lastDay: 0 },
          xp: raw.xp || 0,
          gems: raw.gems || 0,
          lessons: raw.lessons || {},
          learned: raw.learned || {},
          lang: raw.lang || 'en',
        };
      }
    } catch (e) { /* 손상 데이터 초기화 */ }
    return { streak: { count: 0, lastDay: 0 }, xp: 0, gems: 0, lessons: {}, learned: {}, lang: 'en' };
  }

  let state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  function bumpStreak() {
    const t = today();
    const s = state.streak;
    if (s.lastDay === t) return;            // 오늘 이미 반영
    // 어제(달력상 -1일)면 이어감, 아니면 1로 리셋
    const y = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); })();
    s.count = (s.lastDay === y) ? s.count + 1 : 1;
    s.lastDay = t;
  }

  return {
    all() { return state; },
    totals() { return { xp: state.xp, gems: state.gems, streak: state.streak.count }; },

    lesson(id) { return state.lessons[id] || { stars: 0, best: 0, done: false }; },

    // 트랙 순서상 앞 레슨을 끝내야 다음 레슨이 열린다 (각 트랙 첫 레슨은 항상 열림)
    isUnlocked(id) {
      const order = (window.TRACK_LESSONS && window.TRACK_LESSONS[window.LESSONS[id].trackId]) || [];
      const i = order.indexOf(id);
      if (i <= 0) return true;
      const prev = order[i - 1];
      return !!(state.lessons[prev] && state.lessons[prev].done);
    },

    // 레슨 완주 결과 반영 → 별(정확도)·XP·젬·스트릭. 신규 완료면 젬 지급.
    completeLesson(id, avgAccuracy) {
      const stars = avgAccuracy >= 90 ? 3 : avgAccuracy >= 75 ? 2 : 1;
      const prev = state.lessons[id] || { stars: 0, best: 0, done: false };
      const firstDone = !prev.done;
      state.lessons[id] = {
        done: true,
        best: Math.max(prev.best, Math.round(avgAccuracy)),
        stars: Math.max(prev.stars, stars),
      };
      const xpGain = 20 + stars * 10;               // 30~50 XP
      const gemGain = firstDone ? 5 : Math.max(1, stars); // 첫 완주 보너스
      state.xp += xpGain;
      state.gems += gemGain;
      bumpStreak();
      save();
      return { stars, xpGain, gemGain, streak: state.streak.count };
    },

    // 선택 언어 유지
    getLang() { return state.lang || 'en'; },
    setLang(lang) { state.lang = lang; save(); },

    // 배운 표현 저장(복습용) — 언어별 구분
    learnPhrase(t, ko, lang) {
      const key = (lang || 'en') + '::' + String(t || '').trim();
      if (!String(t || '').trim()) return;
      const it = state.learned[key] || { t, ko, lang: lang || 'en', count: 0, last: 0 };
      it.t = t; it.ko = ko; it.lang = lang || 'en'; it.count += 1; it.last = Date.now();
      state.learned[key] = it;
      save();
    },
    learnedList(lang) {
      return Object.values(state.learned)
        .filter(v => !lang || v.lang === lang)
        .sort((a, b) => b.last - a.last);
    },
    learnedCount(lang) {
      return Object.values(state.learned).filter(v => !lang || v.lang === lang).length;
    },

    // 복습에서 젬 소량 지급
    rewardReview(correct) {
      state.xp += correct * 5;
      state.gems += Math.max(1, Math.round(correct / 2));
      bumpStreak();
      save();
    },

    reset() { state = { streak: { count: 0, lastDay: 0 }, xp: 0, gems: 0, lessons: {}, learned: {} }; save(); },
  };
})();
