// Source template. tools-src/build.mjs writes the versioned root /sw.js.
'use strict';
const CACHE_PREFIX = 'bukit-tools-';
const CACHE_NAME = CACHE_PREFIX + '69331ba041e3b91b';
const PRECACHE = ["/","/kalkulator-gaji/","/privacy/","/salary-calculator-malaysia/","/terms/","/offline.html","/manifest.webmanifest","/assets/PWA/pwa.min.js","/assets/js/salary.js","/assets/favicon-image/bukit-besi-72.webp","/assets/favicon-image/favicon.ico","/assets/favicon-image/apple-touch-icon.png","/assets/favicon-image/favicon-96x96.png","/assets/favicon-image/bukit-besi-192.webp","/assets/PWA/icons/icon-192.png","/assets/PWA/icons/icon-512.png","/assets/PWA/icons/icon-maskable-512.png"];
// Pages are HTML routes (network first, saved copy offline); everything else is a static asset.
const PAGES = new Set(["/","/kalkulator-gaji/","/privacy/","/salary-calculator-malaysia/","/terms/"]);
const ASSETS = new Set(PRECACHE.filter(url => !PAGES.has(url)));

self.addEventListener('install', event => {
  // Updates wait until the user chooses Update, or all old app tabs close.
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(
    PRECACHE.map(url => new Request(url, { cache: 'reload' }))
  )));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const oldCaches = await caches.keys();
    await Promise.all(oldCaches.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});

async function offlinePage(cache) {
  const page = await cache.match('/offline.html');
  return new Response(page ? await page.text() : 'You are offline. Reconnect to open this page.', {
    status: 503,
    headers: { 'Content-Type': page ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
  });
}

async function navigate(event) {
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(event.request.url);
  // Only this site's own pages are stored, keyed by path so tracking queries share one entry.
  const key = url.pathname === '/index.html' ? '/' : url.pathname;
  const directory = PAGES.has(key);
  const network = (async () => {
    const response = await event.preloadResponse || await fetch(event.request);
    if (directory && response.ok && response.type === 'basic' &&
        response.headers.get('Content-Type')?.includes('text/html')) {
      // Storage failure must never prevent the live page from opening.
      await cache.put(key, response.clone()).catch(() => {});
    }
    return response;
  })();
  // A late response can refresh the directory even if the timeout used a fallback.
  event.waitUntil(network.then(() => {}, () => {}));
  let timer;
  try {
    return await Promise.race([network, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Navigation timeout')), 3500);
    })]);
  } catch {
    if (directory) {
      const saved = await cache.match(key);
      if (saved) return saved;
    }
    return offlinePage(cache);
  } finally {
    clearTimeout(timer);
  }
}

async function asset(request) {
  const cache = await caches.open(CACHE_NAME);
  const saved = await cache.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') await cache.put(request, response.clone()).catch(() => {});
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // Leave Blogger, API calls, analytics, ads, POSTs and worker update checks alone.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname === '/sw.js') return;
  if (request.mode === 'navigate') {
    event.respondWith(navigate(event));
  } else if (!url.search && ASSETS.has(url.pathname)) {
    event.respondWith(asset(request));
  }
});
