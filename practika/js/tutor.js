/* 대화 엔진 — 레슨 대본을 턴 단위로 진행하고, 유저 응답을 평가한다.
 * 상태를 들고 있고, 화면 전환/음성은 app.js 가 담당한다.
 */
window.Tutor = (() => {
  let s = null; // { id, lesson, idx, results:[] }

  function begin(id) {
    const lesson = window.LESSONS[id];
    s = { id, lesson, idx: 0, results: [] };
    return s;
  }

  function lesson() { return s && s.lesson; }
  function turn() { return s && s.lesson.turns[s.idx]; }
  function index() { return s ? s.idx : 0; }
  function total() { return s ? s.lesson.turns.length : 0; }
  function atEnd() { return !s || s.idx >= s.lesson.turns.length; }
  function isUserTurn() { const t = turn(); return !!t && t.speaker === 'user'; }
  function advance() { if (s) s.idx++; }

  // 유저 응답 평가 (advance 는 호출하지 않음 — app 이 통과 여부로 결정)
  function evaluate(said) {
    const t = turn();
    if (!t || t.speaker !== 'user') return null;
    return window.Match.evaluate(said, t, s.lesson.lang);
  }

  // 이 유저 턴을 확정 (통과 시 호출). 결과 누적 + 배운 표현 저장.
  function commit(result) {
    if (!s) return;
    s.results.push(result);
  }

  // 유저 턴 개수 / 진행 (프로그레스 바)
  function userTurnStats() {
    const turns = s.lesson.turns;
    const totalUser = turns.filter(t => t.speaker === 'user').length;
    return { done: s.results.length, total: totalUser };
  }

  function summary() {
    const scores = s.results.map(r => r.score);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { avg, count: scores.length, results: s.results };
  }

  return {
    begin, lesson, turn, index, total, atEnd, isUserTurn, advance,
    evaluate, commit, userTurnStats, summary,
    current() { return s; },
  };
})();
