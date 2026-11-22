// Immutable & heavy static asset Service Worker for subacute
// Intentionally does NOT cache '/', '/index.html', '/app.js', '/style.css',
// '/data/subjects_manifest.js', or '/api/*' so app updates roll out immediately.

const CACHE_NAME = 'subacute-static-v1';
const IMMUTABLE_PREFIXES = [
  '/data/subjects/',
  '/images_webp/',
  '/vendor/pdfjs/',
  '/original_pdf/'
];

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k.startsWith('subacute-static-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function shouldCachePath(pathname) {
  return IMMUTABLE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function pruneOldVersionedEntries(cache, url) {
  if (!url.search) return;
  if (!url.pathname.startsWith('/data/subjects/') && !url.pathname.startsWith('/images_webp/')) {
    return;
  }
  const keys = await cache.keys();
  const deletions = [];
  for (const req of keys) {
    try {
      const reqUrl = new URL(req.url);
      if (reqUrl.pathname === url.pathname && reqUrl.search !== url.search) {
        deletions.push(cache.delete(req));
      }
    } catch (_) {}
  }
  if (deletions.length > 0) {
    await Promise.all(deletions);
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (_) {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (!shouldCachePath(url.pathname)) return;

  event.respondWith((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }
      const networkResp = await fetch(request);
      if (networkResp && networkResp.ok && networkResp.type === 'basic') {
        cache.put(request, networkResp.clone())
          .then(() => pruneOldVersionedEntries(cache, url))
          .catch(() => {});
      }
      return networkResp;
    } catch (_) {
      return fetch(request);
    }
  })());
});
