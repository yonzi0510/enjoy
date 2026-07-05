/* 어휘 복습 — 배운 표현을 카드로 모아, 한국어 뜻을 보고 영어로 말해보는 모드.
 * 배운 표현이 부족하면 전체 레슨 어휘에서 채워 넣는다.
 */
window.Review = (() => {
  let s = null; // { rounds:[{en,ko}], idx, correct, results:[] }

  function allVocab() {
    const out = [];
    for (const id in window.LESSONS) {
      for (const v of window.LESSONS[id].vocab) out.push({ en: v.en, ko: v.ko });
    }
    return out;
  }

  function shuffle(a) {
    // 결정적 테스트를 위해 Math.random 대신 간단한 순환 셔플
    const arr = a.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (i * 7 + 3) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function begin(size) {
    let pool = window.Progress.learnedList().map(v => ({ en: v.en, ko: v.ko }));
    if (pool.length < 4) {
      // 배운 게 적으면 전체 어휘로 보충 (중복 제거)
      const seen = new Set(pool.map(v => v.en.toLowerCase()));
      for (const v of allVocab()) {
        if (!seen.has(v.en.toLowerCase())) { pool.push(v); seen.add(v.en.toLowerCase()); }
      }
    }
    const rounds = shuffle(pool).slice(0, size || 6);
    s = { rounds, idx: 0, correct: 0, results: [] };
    return s;
  }

  function round() { return s && s.rounds[s.idx]; }
  function index() { return s ? s.idx : 0; }
  function total() { return s ? s.rounds.length : 0; }
  function atEnd() { return !s || s.idx >= s.rounds.length; }

  function evaluate(said) {
    const r = round();
    if (!r) return null;
    return window.Match.evaluate(said, { model: r.en, expect: [r.en] });
  }

  function commit(result) {
    if (!s) return;
    if (result.pass) s.correct++;
    s.results.push(result);
    s.idx++;
  }

  function summary() { return { correct: s.correct, total: s.rounds.length }; }

  return { begin, round, index, total, atEnd, evaluate, commit, summary, current() { return s; } };
})();
