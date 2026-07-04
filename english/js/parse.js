/* 질문 파싱 — 인식된 한국어 문장에서 사전 단어를 찾는다
 * 전략: 질문 표현 제거 → 사전 ko/alt 중 문장에 포함된 가장 긴 단어 매칭
 * (조사는 단어 뒤에 붙으므로 부분 문자열 매칭으로 자연 처리, 1글자 단어는 경계 검사)
 */
window.Parse = (() => {
  const QUESTION_PATTERNS = [
    /영어로는?/g,
    /뭐라고\s*(해|해요|하지|할까|불러|말해)?/g,
    /뭐(야|예요|에요|지|게|니|죠|임)?/g,
    /무엇(이야|인가요|일까)?/g,
    /뭘까(요)?/g,
    /알려\s*(줘|줄래|주세요)?/g,
    /말해\s*(줘|줄래|주세요|봐)?/g,
    /가르쳐\s*(줘|줄래|주세요)?/g,
    /궁금해(요)?/g,
    /(이|가)?\s*영어(로|론)?/g,
    /^(음+|어+|그+)\s*/g
  ];

  function clean(text) {
    let t = String(text || '').trim();
    QUESTION_PATTERNS.forEach(p => { t = t.replace(p, ' '); });
    return t.replace(/[?？!.,~]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // 1글자 단어는 앞뒤 경계(+선택적 조사)까지 확인해 오탐 방지
  function hasBoundaryMatch(text, word) {
    const re = new RegExp('(^|[\\s])' + word + '(이|가|은|는|을|를|도|이요|요)?([\\s]|$)');
    return re.test(text);
  }

  function matchIn(text) {
    const cleaned = clean(text);
    const noSpace = cleaned.replace(/\s+/g, '');
    let best = null, bestLen = 0;
    (window.WORDS || []).forEach(w => {
      const keys = [w.ko].concat(w.alt || []);
      keys.forEach(k => {
        if (!k || k.length < bestLen) return;
        let hit = false;
        if (k.length === 1) {
          hit = hasBoundaryMatch(cleaned, k) || cleaned === k || noSpace === k;
        } else {
          hit = cleaned.indexOf(k) !== -1 || noSpace.indexOf(k.replace(/\s+/g, '')) !== -1;
        }
        if (hit && k.length > bestLen) { best = w; bestLen = k.length; }
      });
    });
    return best;
  }

  return {
    clean,
    // 인식 대안 배열에서 첫 매칭 단어 반환 (없으면 null)
    findWord(alternatives) {
      const alts = Array.isArray(alternatives) ? alternatives : [alternatives];
      for (const a of alts) {
        const w = matchIn(a);
        if (w) return w;
      }
      return null;
    }
  };
})();
