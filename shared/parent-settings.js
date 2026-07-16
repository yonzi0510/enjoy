/* ═══════════ 공용 부모 설정 ═══════════
 * 부모가 정하는 놀이터 전체 설정. 저장: localStorage 'enjoy-parent-v1'
 *   pin            부모 확인 번호 4자리 (기본 1234 — 부모님 페이지에서 변경 가능)
 *   limitMin       하루 사용 시간(분). 0이면 제한 없음. shared/time-limit.js가 읽는다.
 *   stt            음성 인식(마이크) 사용 허용 — 브라우저 음성 인식은 아이 목소리가
 *                  브라우저 회사 서버로 전송될 수 있어 부모가 끌 수 있게 한다.
 *   showPractika   프랙티카 놀이터를 홈에 보일지 (기본 숨김 — 회화 내용이 5세엔 어려움)
 *   showJapanese   일본어 놀이터 열기 (꺼져 있어도 한글 낱말 카드 10장을 모으면 자동 열림)
 *   showWorksheets 픽셀 놀이터의 활동지 도안 노출
 *   showDictHard   글씨 놀이터 받아쓰기 6~7단계 노출
 *
 * 사용법: <script src="../shared/parent-settings.js"></script> (앱 스크립트보다 먼저)
 *   ParentSettings.get('stt') / ParentSettings.set('limitMin', 45)
 *   ParentSettings.checkPin('1234') / ParentSettings.japaneseUnlocked()
 */
window.ParentSettings = (() => {
  const KEY = 'enjoy-parent-v1';
  const DEF = {
    pin: '1234',
    limitMin: 30,
    stt: true,
    showPractika: false,
    showJapanese: false,
    showWorksheets: false,
    showDictHard: false
  };

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object') return Object.assign({}, DEF, raw);
    } catch (e) {}
    return Object.assign({}, DEF);
  }
  function save(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  function get(k) { return load()[k]; }
  function set(k, v) { const st = load(); st[k] = v; save(st); }
  function checkPin(p) { return String(p) === String(load().pin); }

  // 일본어 놀이터 열림 여부 — 부모가 허용했거나, 한글 낱말 카드를 10장 모았으면 열림
  function japaneseUnlocked() {
    if (load().showJapanese) return true;
    try {
      const h = JSON.parse(localStorage.getItem('hangul-playground-v1'));
      return !!h && !!h.cards && Object.keys(h.cards).length >= 10;
    } catch (e) { return false; }
  }

  return { get, set, checkPin, japaneseUnlocked, all: load };
})();
