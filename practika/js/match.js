/* 퍼지 매칭 · 정확도 채점
 * 사용자가 말한 텍스트를 레슨의 기대 표현들과 비교해 0~100점으로 환산하고,
 * 모범 답안의 단어별로 "맞음/놓침"을 표시할 정보를 만든다.
 * 실제 발음 평가 엔진이 없으므로, 인식된 텍스트 기준의 관대한(초급자 친화) 채점을 쓴다.
 */
window.Match = (() => {
  const CONTRACTIONS = {
    "i'm": 'i am', "it's": 'it is', "that's": 'that is', "let's": 'let us',
    "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "can't": 'can not',
    "won't": 'will not', "i've": 'i have', "we've": 'we have', "you've": 'you have',
    "i'll": 'i will', "we'll": 'we will', "you'll": 'you will', "i'd": 'i would',
    "you're": 'you are', "we're": 'we are', "they're": 'they are',
    "what's": 'what is', "he's": 'he is', "she's": 'she is', "there's": 'there is',
    "wi-fi": 'wifi', "o'clock": 'oclock',
  };
  // 채점에서 무시해도 되는 사소한 기능어 (놓쳐도 감점 적게)
  const FILLER = new Set(['a', 'an', 'the', 'to', 'please', 'well', 'so', 'um', 'uh', 'oh']);

  function normalize(s) {
    s = String(s || '').toLowerCase().replace(/[‘’]/g, "'");
    for (const k in CONTRACTIONS) {
      s = s.replace(new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g'), CONTRACTIONS[k]);
    }
    s = s.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    return s;
  }

  function tokens(s) { return normalize(s).split(' ').filter(Boolean); }

  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      let cur = [i];
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      }
      prev = cur;
    }
    return prev[n];
  }

  // 단어 하나가 대략 일치하는가 (짧은 단어는 정확히, 긴 단어는 오타 1~2 허용)
  function wordMatch(a, b) {
    if (a === b) return true;
    if (b.length >= 6) return lev(a, b) <= 2;
    if (b.length >= 4) return lev(a, b) <= 1;
    return false;
  }

  // 기대 표현 exp 의 단어들이 said 안에 얼마나 있는지 (순서 무관, 중복 소비)
  function recall(said, exp) {
    const s = tokens(said), e = tokens(exp);
    const pool = s.slice();
    const matched = [], missed = [];
    let gotW = 0, totW = 0;
    for (const w of e) {
      const weight = FILLER.has(w) ? 0.25 : 1;
      totW += weight;
      const idx = pool.findIndex(x => wordMatch(x, w));
      if (idx >= 0) { pool.splice(idx, 1); matched.push(w); gotW += weight; }
      else missed.push(w);
    }
    return { score: totW ? gotW / totW : 0, matched, missed, expTokens: e };
  }

  function stringSim(a, b) {
    a = normalize(a); b = normalize(b);
    if (!a || !b) return 0;
    if (a === b) return 1;
    return 1 - lev(a, b) / Math.max(a.length, b.length);
  }

  function variantScore(said, exp) {
    const r = recall(said, exp);
    const sim = stringSim(said, exp);
    return Math.round(100 * (0.7 * r.score + 0.3 * sim));
  }

  /* turn: { model, expect:[...] }  →  { score, model, matched[], missed[], said, perfect, pass } */
  function evaluate(said, turn) {
    const variants = (turn.expect && turn.expect.length) ? turn.expect : [turn.model];
    let best = 0;
    for (const v of variants) best = Math.max(best, variantScore(said, v));
    // 단어 하이라이트는 항상 모범 답안(model) 기준 — 무엇을 말해야 했는지 가르쳐 준다
    const r = recall(said, turn.model);
    return {
      score: best,
      model: turn.model,
      matched: r.matched,
      missed: r.missed.filter(w => !FILLER.has(w)),
      said: said,
      perfect: best >= 90,
      pass: best >= 60,
    };
  }

  return { normalize, tokens, evaluate, variantScore, stringSim };
})();
