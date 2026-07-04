/* 안드로이드 뒤로가기(제스처/버튼) — 앱을 끄지 않고 한 단계씩 뒤로
 * 열린 오버레이 닫기 → 게임/글자찾기/스티커 화면에서 홈으로 → 홈에서 한 번 더 누르면 종료
 */
(() => {
  const $ = id => document.getElementById(id);

  function clickIf(id) {
    const b = $(id);
    if (b) { b.click(); return true; }
    return false;
  }

  function backOne() {
    // 시간제한 잠금 중엔 뒤로가기로 빠져나갈 수 없음
    if ($('lock-overlay') && !$('lock-overlay').classList.contains('hidden')) return true;

    // 1) 열린 오버레이 닫기
    const overlays = [
      ['complete-overlay', 'complete-home'],
      ['letters-done', 'letters-done-home'],
      ['mode-overlay', 'mode-close'],
      ['letters-overlay', 'letters-close']
    ];
    for (const [ov, btn] of overlays) {
      const el = $(ov);
      if (el && !el.classList.contains('hidden')) return clickIf(btn);
    }

    // 2) 화면 단계 뒤로
    const active = document.querySelector('.screen.active');
    if (!active) return false;
    switch (active.id) {
      case 'screen-game': return clickIf('game-back');
      case 'screen-letters': return clickIf('letters-back');
      case 'screen-stickerplay': return clickIf('stickerplay-back');
      case 'screen-stickers': return clickIf('stickers-back');
      default: return false; // 홈: 브라우저 기본 동작(종료/이전 페이지)
    }
  }

  try { history.pushState({ app: 1 }, ''); } catch (e) {}
  window.addEventListener('popstate', () => {
    if (backOne()) {
      try { history.pushState({ app: 1 }, ''); } catch (e) {} // 다음 뒤로가기 대비 재장전
    }
  });
})();
