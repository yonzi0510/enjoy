/* 가나다 노래 — 글자가 순서대로 반짝이며 이름과 낱말을 리듬감 있게 들려준다 */
window.Song = (() => {
  const D = window.HangulData;
  const A = window.Audio2;

  let playing = false;
  let gridEl, btnEl;

  function buildGrid(list) {
    gridEl.innerHTML = '';
    list.forEach(l => {
      const d = document.createElement('div');
      d.className = 'song-cell';
      d.dataset.ch = l.ch;
      d.textContent = l.ch;
      gridEl.appendChild(d);
    });
  }

  function highlight(ch) {
    gridEl.querySelectorAll('.song-cell').forEach(c => {
      c.classList.toggle('lit', c.dataset.ch === ch);
    });
  }

  let mode = 'consonants'; // 'consonants' | 'vowels'

  function play() {
    if (playing) { stop(); return; }
    playing = true;
    btnEl.textContent = '⏸️ 멈추기';
    const list = mode === 'consonants' ? D.consonants : D.vowels;
    let i = 0;
    function step() {
      if (!playing) return;
      if (i >= list.length) { finish(); return; }
      const l = list[i++];
      highlight(l.ch);
      A.sfx.tap();
      const word = l.words[0];
      A.speakSeq([
        { text: l.name + '!', rate: 0.95, pitch: 1.3 },
        { text: word.w + '의 ' + l.name, rate: 1.0, pitch: 1.2 },
      ], () => setTimeout(step, 150));
    }
    step();
  }

  function finish() {
    playing = false;
    highlight(null);
    btnEl.textContent = '▶️ 다시 듣기';
    A.sfx.fanfare();
    A.speak('참 잘했어요!');
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
    buildGrid(m === 'consonants' ? D.consonants : D.vowels);
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
