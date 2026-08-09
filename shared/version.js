/* ═══════════ 배포 버전 알아내기 ═══════════
 *
 * 왜 필요한가 — "고쳤는데 아이 화면은 그대로"를 겪었다. 서비스 워커가 캐시를 먼저 주는
 * 방식이라 배포가 기기에 늦게 닿았다(자세한 경위는 `sw.js` 머리 주석).
 * 지금은 네트워크 우선으로 고쳤지만, **지금 기기에 무슨 버전이 깔려 있는지 눈으로 볼 수
 * 있어야** 같은 일을 또 겪었을 때 캐시 탓인지 아닌지 바로 가른다.
 *
 * 버전을 따로 적어 두지 않는다 — **`sw.js` 의 캐시 이름이 곧 버전**이다.
 * 두 군데에 적으면 한쪽만 올리는 실수가 난다. 여기서는 그것을 읽어 오기만 한다.
 *
 * 읽는 차례
 *   ① 기기에 담긴 캐시 이름 (`enjoy-cache-2026-08-09`) — **지금 기기가 쓰는 것**
 *   ② 서버의 `sw.js` 를 받아 파싱 — **서버에 올라간 것**
 * 둘이 다르면 기기가 아직 옛 버전이라는 뜻이라, 그것도 알려 준다.
 *
 * 사용법:
 *   <script src="../shared/version.js"></script>
 *   const v = await EnjoyVersion.get();
 *   // { device: '2026-08-09', server: '2026-08-09', stale: false }
 */
window.EnjoyVersion = (() => {
  const RE = /enjoy-cache-([0-9A-Za-z._-]+)/;

  // 기기에 담긴 캐시 이름에서
  async function fromCache() {
    try {
      if (!window.caches) return null;
      const keys = await caches.keys();
      for (const k of keys) {
        const m = RE.exec(k);
        if (m) return m[1];
      }
    } catch (e) {}
    return null;
  }

  // 서버의 sw.js 에서 (캐시를 거치지 않고 곧장)
  async function fromServer() {
    try {
      const url = new URL('/sw.js', location.origin);
      url.searchParams.set('_', Date.now());          // 중간 캐시도 피한다
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      const m = RE.exec(await res.text());
      return m ? m[1] : null;
    } catch (e) { return null; }
  }

  async function get() {
    const [device, server] = await Promise.all([fromCache(), fromServer()]);
    return {
      device: device || null,
      server: server || null,
      // 기기가 담아 둔 것이 서버 것과 다르면 아직 옛 버전을 쓰고 있다는 뜻
      stale: !!(device && server && device !== server),
    };
  }

  // 사람이 읽을 한 줄로
  async function text() {
    const v = await get();
    if (!v.device && !v.server) return '버전을 알 수 없어요';
    if (v.stale) return `${v.device} (새 버전 ${v.server} 있음)`;
    return v.device || v.server;
  }

  /* 싹 비우고 새로 받기 — 부모님 페이지의 「새로고침」이 부른다.
   * **아이 진행도(localStorage)는 건드리지 않는다.** 지우는 것은 받아 둔 파일뿐이다. */
  async function hardRefresh() {
    try {
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch (e) {}
    try {
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
    } catch (e) {}
    // 워커가 물러난 뒤 받아야 새것이 온다
    return new Promise(res => setTimeout(res, 300));
  }

  return { get, text, hardRefresh };
})();
