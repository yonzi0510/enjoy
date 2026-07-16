/* 오프라인 지원 서비스 워커 — 한 번 본 파일은 캐시에 담아 두고,
 * 다음부터는 캐시를 먼저 주면서 뒤에서 새 버전을 받아 갱신한다(stale-while-revalidate).
 * 순수 정적 사이트라 이 방식이면 비행기 모드에서도 이미 가 본 놀이터가 열린다.
 */
const CACHE = 'enjoy-cache-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // 예전 버전 캐시 정리
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
    const hit = await cache.match(req);
    const fetching = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(fetching); return hit; }
    const res = await fetching;
    if (res) return res;
    return new Response('오프라인이에요. 인터넷에 연결한 뒤 다시 열어 주세요.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  })());
});
