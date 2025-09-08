/* Simple PWA SW — cache-first for static, network-first fallback */
const VERSION = 'v1.0.0';
const CACHE_NAME = `landtax-${VERSION}`;
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192-v2.png',
  './icon-512-v2.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(CORE_ASSETS)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('landtax-') && k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // HTML: network-first with cache fallback
  if (req.headers.get('accept')?.includes('text/html')) {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, net.clone());
        return net;
      } catch {
        const cacheMatch = await caches.match(req, { ignoreSearch: true });
        return cacheMatch || caches.match('./index.html');
      }
    })());
    return;
  }

  // Others: cache-first
  e.respondWith((async () => {
    const cacheMatch = await caches.match(req);
    if (cacheMatch) return cacheMatch;
    try {
      const net = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, net.clone());
      return net;
    } catch {
      return new Response('', { status: 504 });
    }
  })());
});
