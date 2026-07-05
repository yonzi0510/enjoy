/* 퍼지 매칭 · 정확도 채점 (다국어)
 * - 영어(en): 단어 토큰 기준(오타·어순 관대) 채점
 * - 일본어/중국어(ja·zh): 공백이 없으므로 문자 단위 편집거리 채점
 * 인식된 텍스트 기준의 관대한(초급자 친화) 채점을 쓴다. (실제 발음 평가 엔진 없음)
 *
 * evaluate() 반환: { score, model, said, pass, perfect, segments:[{text, ok}] }
 *   segments = 모범 답안을 조각(영어=단어, 일·중=문자)으로 나눠 맞음/놓침을 표시한 것.
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
  const FILLER = new Set(['a', 'an', 'the', 'to', 'please', 'well', 'so', 'um', 'uh', 'oh']);

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

  /* ─────────── 영어 채점 ─────────── */
  function enNorm(s) {
    s = String(s || '').toLowerCase().replace(/[‘’]/g, "'");
    for (const k in CONTRACTIONS) {
      s = s.replace(new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g'), CONTRACTIONS[k]);
    }
    return s.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function enTokens(s) { return enNorm(s).split(' ').filter(Boolean); }
  function enWordMatch(a, b) {
    if (a === b) return true;
    if (b.length >= 6) return lev(a, b) <= 2;
    if (b.length >= 4) return lev(a, b) <= 1;
    return false;
  }
  function enRecall(said, exp) {
    const s = enTokens(said), e = enTokens(exp);
    const pool = s.slice();
    const matched = new Set(); let got = 0, tot = 0;
    e.forEach((w, i) => {
      const weight = FILLER.has(w) ? 0.25 : 1; tot += weight;
      const idx = pool.findIndex(x => enWordMatch(x, w));
      if (idx >= 0) { pool.splice(idx, 1); matched.add(i); got += weight; }
    });
    return { score: tot ? got / tot : 0, matched };
  }
  function enSim(a, b) {
    a = enNorm(a); b = enNorm(b);
    if (!a || !b) return 0; if (a === b) return 1;
    return 1 - lev(a, b) / Math.max(a.length, b.length);
  }
  function enScoreVariant(said, exp) {
    const r = enRecall(said, exp);
    return Math.round(100 * (0.7 * r.score + 0.3 * enSim(said, exp)));
  }
  function enEvaluate(said, turn) {
    const variants = (turn.expect && turn.expect.length) ? turn.expect : [turn.model];
    let best = 0;
    for (const v of variants) best = Math.max(best, enScoreVariant(said, v));
    // 세그먼트: 모범 답안 단어별 맞음 표시
    const words = turn.model.split(/\s+/).filter(Boolean);
    const rec = enRecall(said, turn.model);
    const modelWords = enTokens(turn.model);
    // 원본 단어 ↔ 정규화 토큰 인덱스 매핑(대략 1:1; 축약형은 앞 토큰 기준)
    let ti = 0;
    const segments = words.map(w => {
      const subs = enNorm(w).split(' ').filter(Boolean);
      let ok = subs.length > 0;
      for (let k = 0; k < subs.length; k++) {
        const isFiller = FILLER.has(modelWords[ti]);
        if (!(rec.matched.has(ti) || isFiller)) ok = false;
        ti++;
      }
      return { text: w, ok };
    });
    return finalize(best, turn.model, said, segments);
  }

  /* ─────────── 일본어/중국어(CJK) 채점 ─────────── */
  function cjkNorm(s) {
    return String(s || '')
      .replace(/[、。，．・！？!?.,'"“”‘’（）()「」『』〜~…\-—:;：；\s]/g, '')
      .toLowerCase();
  }
  function cjkSim(a, b) {
    a = cjkNorm(a); b = cjkNorm(b);
    if (!a || !b) return 0; if (a === b) return 1;
    return 1 - lev(a, b) / Math.max(a.length, b.length);
  }
  function cjkEvaluate(said, turn) {
    const variants = (turn.expect && turn.expect.length) ? turn.expect : [turn.model];
    let best = 0;
    for (const v of variants) best = Math.max(best, Math.round(100 * cjkSim(said, v)));
    // 세그먼트: 모범 답안 문자별로, 말한 문자 집합에 있으면 맞음
    const saidChars = cjkNorm(said);
    const segments = Array.from(turn.model).map(ch => {
      if (/\s/.test(ch)) return { text: ch, ok: true };
      const isPunct = cjkNorm(ch) === '';
      return { text: ch, ok: isPunct || saidChars.indexOf(ch) >= 0 };
    });
    return finalize(best, turn.model, said, segments);
  }

  function finalize(score, model, said, segments) {
    return { score, model, said, segments, perfect: score >= 90, pass: score >= 60 };
  }

  function evaluate(said, turn, lang) {
    return (lang === 'ja' || lang === 'zh') ? cjkEvaluate(said, turn) : enEvaluate(said, turn);
  }

  return { evaluate, enNorm, cjkNorm };
})();
