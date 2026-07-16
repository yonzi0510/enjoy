/* ═══════════ 공용 사용자(아이) 프로필 ═══════════
 * 은아·서하 두 아이가 한 기기에서 각자 진행도를 갖도록 하는 모듈.
 * 선택은 localStorage 'enjoy-profile'('eunah'|'seoha', 기본 은아)에 저장.
 *
 * 진행도 키 규칙 — 기존 진행도 보존:
 *   은아 = 원래 키 그대로 (예: 'hangul-playground-v1')  ← 예전 데이터를 그대로 물려받음
 *   서하 = 'p2:' 접두어    (예: 'p2:hangul-playground-v1')
 * 목소리·음소거·시간제한·부모 설정은 기기 공용이라 접두어를 붙이지 않는다.
 *
 * 사용법 — 각 앱 index.html의 "첫 번째" 스크립트로:
 *   <script src="../shared/profile.js"></script>
 * 진행도 모듈에서: const KEY = window.Profile ? Profile.key('xxx-v1') : 'xxx-v1';
 * 루트 홈처럼 배지가 필요 없으면 포함 전에 window.EnjoyProfileBadge = false;
 */
window.Profile = (() => {
  const KEY = 'enjoy-profile';
  const LIST = [
    { id: 'eunah', name: '은아', emoji: '🐰' },
    { id: 'seoha', name: '서하', emoji: '🐻' }
  ];

  function current() {
    try {
      const v = localStorage.getItem(KEY);
      if (LIST.some(p => p.id === v)) return v;
    } catch (e) {}
    return 'eunah';
  }
  function meta(id) { return LIST.find(p => p.id === (id || current())) || LIST[0]; }
  function set(id) {
    if (!LIST.some(p => p.id === id)) return;
    try { localStorage.setItem(KEY, id); } catch (e) {}
  }
  function key(base) { return current() === 'seoha' ? 'p2:' + base : base; }

  // 앱 화면 구석에 지금 누가 노는지 작게 표시 (조작 불가 — 바꾸는 곳은 홈)
  function badge() {
    if (window.EnjoyProfileBadge === false) return;
    const m = meta();
    const el = document.createElement('div');
    el.textContent = m.emoji + ' ' + m.name;
    el.style.cssText =
      'position:fixed;left:10px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:50;' +
      'background:rgba(255,255,255,.85);border-radius:999px;padding:4px 12px;' +
      'font-size:13px;font-weight:900;color:#6E4A8C;box-shadow:0 2px 6px rgba(0,0,0,.15);' +
      "pointer-events:none;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif;";
    document.body.appendChild(el);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', badge);
  else badge();

  return { LIST, current, meta, set, key };
})();
