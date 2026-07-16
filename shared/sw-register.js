/* 오프라인용 서비스 워커 등록 — 어느 앱에서 불러도 저장소 루트의 sw.js를 등록한다.
 * 사용법: <script src="../shared/sw-register.js"></script> (루트에서는 ./shared/...)
 */
(() => {
  if (!('serviceWorker' in navigator)) return;
  const cur = document.currentScript;
  if (!cur || !cur.src) return;
  const root = cur.src.replace(/shared\/sw-register\.js.*$/, '');
  navigator.serviceWorker.register(root + 'sw.js', { scope: root }).catch(() => {});
})();
