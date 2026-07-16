/* 🎨 스티커 놀이 — 모은 스티커를 보드에 붙이고 끌어서 꾸미기
 * 배경 3종 전환, 드래그 이동, 🗑️로 전체 지우기. 보드는 localStorage에 저장.
 */
(() => {
  const $ = id => document.getElementById(id);
  const KEY = window.Profile ? Profile.key('chatgi-stickerboard-v1') : 'chatgi-stickerboard-v1'; // 아이 프로필별 저장
  const BGS = ['spbg-meadow', 'spbg-sky', 'spbg-sea'];
  const SCENES = window.SCENES || [];

  let board = load(); // { bg: 0, items: [{t: themeId, x: %, y: %, s: px}] }
  let placedNow = 0;        // 이번 접속에서 붙인 스티커 수 (펫 간식 판정용)
  let snackGiven = false;   // 꾸미기 간식은 접속당 한 번만 (무한 반복 방지)

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && Array.isArray(raw.items)) return { bg: raw.bg || 0, items: raw.items };
    } catch (e) {}
    return { bg: 0, items: [] };
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(board)); } catch (e) {}
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
  }

  function open() {
    renderPalette();
    renderBoard();
    showScreen('screen-stickerplay');
    const earned = SCENES.filter(t => Progress.getStickerTier(t.id) > 0).length;
    Sound.speak(earned ? '스티커를 눌러서 붙이고, 손가락으로 끌어서 꾸며 보세요!' : '스티커를 먼저 모아 오세요! 놀이를 깨면 스티커를 받아요.');
  }

  /* ─────────── 팔레트 (모은 스티커만) ─────────── */
  function renderPalette() {
    const pal = $('sticker-palette');
    pal.innerHTML = '';
    const earned = SCENES.filter(t => Progress.getStickerTier(t.id) > 0);
    if (!earned.length) {
      pal.innerHTML = '<div class="palette-empty">아직 스티커가 없어요 — 놀이를 깨고 모아 보세요! 🏅</div>';
      return;
    }
    earned.forEach(t => {
      const b = document.createElement('button');
      b.className = 'palette-item';
      b.innerHTML = t.sticker.svg;
      b.setAttribute('aria-label', t.sticker.name + ' 붙이기');
      b.addEventListener('click', () => {
        // 가운데 근처 랜덤 위치에 새 스티커
        board.items.push({
          t: t.id,
          x: 32 + Math.random() * 36,
          y: 24 + Math.random() * 42,
          s: 84 + Math.round(Math.random() * 40)
        });
        if (board.items.length > 40) board.items.shift(); // 과다 방지
        save();
        renderBoard();
        Sound.correct();
        // 꾸미기 한 판(스티커 6장) 완성 = 펫 간식 (접속당 한 번)
        placedNow++;
        if (!snackGiven && placedNow >= 6 && window.Pet) {
          snackGiven = true;
          Pet.awardSnack(1);
        }
      });
      pal.appendChild(b);
    });
  }

  /* ─────────── 보드 ─────────── */
  function renderBoard() {
    const bd = $('sticker-board');
    bd.className = 'sticker-board ' + BGS[board.bg % BGS.length];
    bd.innerHTML = '';
    board.items.forEach((it, idx) => {
      const theme = SCENES.find(s => s.id === it.t);
      if (!theme) return;
      const el = document.createElement('div');
      el.className = 'board-sticker';
      el.style.left = it.x + '%';
      el.style.top = it.y + '%';
      el.style.width = it.s + 'px';
      el.style.height = it.s + 'px';
      el.innerHTML = theme.sticker.svg;
      attachDrag(el, it, bd);
      bd.appendChild(el);
    });
  }

  function attachDrag(el, it, bd) {
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.classList.add('dragging');
      const rect = bd.getBoundingClientRect();
      const move = ev => {
        it.x = Math.min(96, Math.max(-4, ((ev.clientX - rect.left) / rect.width) * 100 - (it.s / rect.width) * 50));
        it.y = Math.min(96, Math.max(-4, ((ev.clientY - rect.top) / rect.height) * 100 - (it.s / rect.height) * 50));
        el.style.left = it.x + '%';
        el.style.top = it.y + '%';
      };
      const up = () => {
        el.classList.remove('dragging');
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
        save();
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
    });
  }

  /* ─────────── 버튼 ─────────── */
  $('btn-stickerplay').addEventListener('click', open);
  $('stickerplay-back').addEventListener('click', () => showScreen('screen-stickers'));
  $('stickerplay-bg').addEventListener('click', () => {
    board.bg = (board.bg + 1) % BGS.length;
    save();
    renderBoard();
    Sound.sparkle();
  });
  $('stickerplay-clear').addEventListener('click', () => {
    if (!board.items.length) return;
    board.items = [];
    save();
    renderBoard();
    Sound.pop();
    Sound.speak('보드를 깨끗하게 지웠어요!');
  });

  window.StickerPlay = { open }; // 테스트 훅
})();
