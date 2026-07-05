/* あいうえお 노래 — 글자가 행 순서대로 반짝이며 일본어 발음과 낱말을 들려준다 */
window.Song = (() => {
  const D = window.KanaData;
  const A = window.Audio2;

  let playing = false;
  let gridEl, btnEl;
  let mode = 'a'; // 'a' = あ~な행, 'b' = は~ん행

  function list() {
    const rows = mode === 'a' ? D.groupA : D.groupB;
    const out = [];
    rows.forEach(r => r.kana.forEach(k => out.push(k)));
    return out;
  }

  function buildGrid() {
    gridEl.innerHTML = '';
    list().forEach(k => {
      const d = document.createElement('div');
      d.className = 'song-cell';
      d.dataset.ch = k.ch;
      d.textContent = k.ch;
      gridEl.appendChild(d);
    });
  }

  function highlight(ch) {
    gridEl.querySelectorAll('.song-cell').forEach(c => {
      c.classList.toggle('lit', c.dataset.ch === ch);
    });
  }

  function play() {
    if (playing) { stop(); return; }
    playing = true;
    btnEl.textContent = '⏸️ 멈추기';
    const kanaList = list();
    let i = 0;
    function step() {
      if (!playing) return;
      if (i >= kanaList.length) { finish(); return; }
      const k = kanaList[i++];
      highlight(k.ch);
      A.sfx.tap();
      const word = k.words[0];
      A.speakSeq([
        { text: k.ch, lang: 'ja', rate: 0.8, pitch: 1.3 },
        { text: word.w, lang: 'ja', rate: 0.9, pitch: 1.2 },
      ], () => setTimeout(step, 150));
    }
    step();
  }

  function finish() {
    playing = false;
    highlight(null);
    btnEl.textContent = '▶️ 다시 듣기';
    A.sfx.fanfare();
    A.speakSeq([{ text: '참 잘했어요!', lang: 'ko' }]);
  }

  function stop() {
    playing = false;
    A.stop();
    if (btnEl) btnEl.textContent = '▶️ 노래 듣기';
    if (gridEl) highlight(null);
  }

  function setMode(m) {
    stop();
    mode = m;
    buildGrid();
    document.querySelectorAll('#scr-song .tab').forEach(t => {
      t.classList.toggle('on', t.dataset.mode === m);
    });
  }

  function enter() {
    gridEl = document.getElementById('song-grid');
    btnEl = document.getElementById('song-play');
    setMode(mode);
  }

  return { enter, play, stop, setMode, isPlaying: () => playing };
})();
