/* 오프라인 지원 서비스 워커
 *
 * ── 왜 방식을 바꿨나 (2026-08) ─────────────────────────────────
 * 예전에는 **캐시를 먼저 주고 새 파일은 뒤에서 받는** 방식(stale-while-revalidate)이었다.
 * 그 결과 배포를 해도 아이 기기에서는 **늘 한 발 늦은 화면**이 나왔다 —
 * 처음 열면 옛 파일, 두 번째 열어야 새 파일. 자주 안 여는 놀이는 몇 달 전 모습이
 * 그대로 남았다(햄버거 가게가 낙서장 개편 이전 모습으로 보여서 발견했다).
 * 게다가 캐시 이름이 고정이라 `activate` 의 옛 캐시 청소가 한 번도 일을 안 했다.
 *
 * 그래서 **인터넷이 되면 늘 새것을 준다**(network-first).
 * 못 받으면 그때 캐시를 준다 — 비행기 모드에서 이미 가 본 놀이터가 열리는 것은 그대로다.
 *
 * 배포가 잦고(`main` 에 푸시하면 자동) 파일이 작은 순수 정적 사이트라
 * 이 방식의 비용은 거의 없고, "고쳤는데 아이 화면은 그대로"를 원천 차단한다.
 *
 * **캐시 이름의 날짜를 바꾸면 옛 캐시가 통째로 청소된다.** 화면이 크게 바뀌는 배포에서는
 * 날짜를 올려 두면 기기에 남은 옛 파일이 확실히 사라진다.
 */
const CACHE = 'enjoy-cache-2026-08-09';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // 이름이 다른 옛 캐시는 전부 지운다
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return; // 외부 요청은 손대지 않는다 (원래도 없어야 정상)

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);

    // ① 새것을 먼저 받아 본다
    try {
      const res = await fetch(req);
      if (res && res.ok) {
        cache.put(req, res.clone());   // 다음 오프라인을 위해 담아 둔다
        return res;
      }
      // 서버가 4xx·5xx 를 주면 캐시라도 있으면 그걸 준다
      const stale = await cache.match(req);
      if (stale) return stale;
      return res;
    } catch (err) {
      // ② 인터넷이 없다 — 담아 둔 것을 준다
      const stale = await cache.match(req);
      if (stale) return stale;
      return new Response('오프라인이에요. 인터넷에 연결한 뒤 다시 열어 주세요.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
