/* 낱말 카드책 — 모은 카드는 앞면(+한국어 뜻), 아직 못 모은 낱말은 ? 로 표시 */
window.Cards = (() => {
  const D = window.KanaData;
  const A = window.Audio2;
  const P = window.Progress;

  function render() {
    const grid = document.getElementById('cards-grid');
    const countEl = document.getElementById('cards-count');
    const owned = {};
    P.cards().forEach(c => { owned[c.w] = c; });

    // 전체 낱말 풀 (데이터 순서 유지, 중복 낱말 제거)
    const all = [];
    const seen = {};
    D.all.forEach(k => k.words.forEach(w => {
      if (!seen[w.w]) { seen[w.w] = true; all.push(w); }
    }));

    countEl.textContent = Object.keys(owned).length + ' / ' + all.length;
    grid.innerHTML = '';
    all.forEach(w => {
      const has = !!owned[w.w];
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'wordcard' + (has ? '' : ' locked');
      el.innerHTML = has
        ? '<span class="wc-emoji">' + w.e + '</span><span class="wc-word">' + w.w + '</span><span class="wc-ko">' + w.ko + '</span>'
        : '<span class="wc-emoji">❓</span><span class="wc-word">???</span><span class="wc-ko">&nbsp;</span>';
      if (has) {
        el.addEventListener('click', ev => {
          ev.preventDefault();
          A.sfx.tap();
          A.speakSeq([
            { text: w.w, lang: 'ja', rate: 0.8 },
            { text: w.ko, lang: 'ko', rate: 0.95 },
          ]);
        });
      }
      grid.appendChild(el);
    });
  }

  return { render };
})();
