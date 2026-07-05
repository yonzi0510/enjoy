/* 어휘 복습 — 배운 표현을 카드로 모아, 한국어 뜻을 보고 목표 언어로 말해보는 모드.
 * 현재 선택된 언어(lang)의 표현만 대상으로 하며, 부족하면 그 언어의 레슨 어휘로 채운다.
 */
window.Review = (() => {
  let s = null; // { lang, rounds:[{t,ko}], idx, correct, results:[] }

  function langVocab(lang) {
    const out = [];
    for (const id in window.LESSONS) {
      const les = window.LESSONS[id];
      if (les.lang !== lang) continue;
      for (const v of les.vocab) out.push({ t: v.t, ko: v.ko });
    }
    return out;
  }
  function shuffle(a) {
    const arr = a.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (i * 7 + 3) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function begin(lang, size) {
    let pool = window.Progress.learnedList(lang).map(v => ({ t: v.t, ko: v.ko }));
    if (pool.length < 4) {
      const seen = new Set(pool.map(v => v.t));
      for (const v of langVocab(lang)) if (!seen.has(v.t)) { pool.push(v); seen.add(v.t); }
    }
    const rounds = shuffle(pool).slice(0, size || 6);
    s = { lang, rounds, idx: 0, correct: 0, results: [] };
    return s;
  }
  function round() { return s && s.rounds[s.idx]; }
  function index() { return s ? s.idx : 0; }
  function total() { return s ? s.rounds.length : 0; }
  function atEnd() { return !s || s.idx >= s.rounds.length; }
  function evaluate(said) {
    const r = round();
    if (!r) return null;
    return window.Match.evaluate(said, { model: r.t, expect: [r.t] }, s.lang);
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
