// Source template. tools-src/build.mjs writes the versioned root /sw.js.
'use strict';
const CACHE_PREFIX = 'bukit-tools-';
const CACHE_NAME = CACHE_PREFIX + 'd27da9b3976d31d1';
const PRECACHE = ["/","/asb-dividend-calculator/","/bmi-calculator-malaysia/","/car-loan-calculator-malaysia/","/cgpa-calculator/","/cgpa-to-percentage/","/citylink-tracking/","/css-minifier/","/epf-calculator/","/gdex-tracking/","/gold-price-malaysia/","/gold-zakat-calculator-malaysia/","/harga-emas-hari-ini/","/home-loan-calculator-malaysia/","/html-beautifier/","/income-tax-calculator-malaysia/","/javascript-minifier/","/jnt-near-me/","/jnt-terdekat/","/jnt-tracking/","/kalkulator-bmi/","/kalkulator-cukai-pendapatan/","/kalkulator-dividen-asb/","/kalkulator-gaji-prorata/","/kalkulator-gaji/","/kalkulator-kwsp/","/kalkulator-loan-kereta/","/kalkulator-ot/","/kalkulator-pinjaman-peribadi/","/kalkulator-pinjaman-perumahan/","/kalkulator-rpgt/","/kalkulator-ukuran-tanah/","/kalkulator-zakat-emas/","/kalkulator-zakat-pendapatan/","/land-size-converter-malaysia/","/ninja-van-near-me/","/ninja-van-terdekat/","/ninja-van-tracking/","/overtime-calculator-malaysia/","/parcel-tracking-malaysia/","/personal-loan-calculator-malaysia/","/pos-laju-near-me/","/pos-laju-terdekat/","/pos-laju-tracking/","/privacy/","/prorated-salary-calculator-malaysia/","/rpgt-calculator-malaysia/","/salary-calculator-malaysia/","/semak-tracking-citylink/","/semak-tracking-gdex/","/semak-tracking-jnt/","/semak-tracking-ninja-van/","/semak-tracking-parcel/","/semak-tracking-pos-laju/","/terms/","/unused-css-remover/","/zakat-calculator-malaysia/","/offline.html","/manifest.webmanifest","/assets/PWA/pwa.min.js","/assets/js/salary.js","/assets/js/cgpa-percent.js","/assets/js/cgpa.js","/assets/js/tax.js","/assets/js/epf.js","/assets/js/loan.js","/assets/js/carloan.js","/assets/js/asb.js","/assets/js/prorate.js","/assets/js/overtime.js","/assets/js/land.js","/assets/js/personal-loan.js","/assets/js/rpgt.js","/assets/js/bmi.js","/assets/js/zakat.js","/assets/js/zakat-emas.js","/assets/js/harga-emas.js","/assets/js/tracking.js","/assets/js/near.js","/assets/js/css-minifier.js","/assets/js/js-minifier.js","/assets/js/js-minifier-worker.js","/assets/js/html-beautifier.js","/assets/js/html-beautifier-worker.js","/assets/js/unused-css.js","/assets/favicon-image/bukit-besi-72.webp","/assets/favicon-image/favicon.ico","/assets/favicon-image/apple-touch-icon.png","/assets/favicon-image/favicon-96x96.png","/assets/favicon-image/bukit-besi-192.webp","/assets/PWA/icons/icon-192.png","/assets/PWA/icons/icon-512.png","/assets/PWA/icons/icon-maskable-512.png"];
// Pages are HTML routes (network first, saved copy offline); everything else is a static asset.
const PAGES = new Set(["/","/asb-dividend-calculator/","/bmi-calculator-malaysia/","/car-loan-calculator-malaysia/","/cgpa-calculator/","/cgpa-to-percentage/","/citylink-tracking/","/css-minifier/","/epf-calculator/","/gdex-tracking/","/gold-price-malaysia/","/gold-zakat-calculator-malaysia/","/harga-emas-hari-ini/","/home-loan-calculator-malaysia/","/html-beautifier/","/income-tax-calculator-malaysia/","/javascript-minifier/","/jnt-near-me/","/jnt-terdekat/","/jnt-tracking/","/kalkulator-bmi/","/kalkulator-cukai-pendapatan/","/kalkulator-dividen-asb/","/kalkulator-gaji-prorata/","/kalkulator-gaji/","/kalkulator-kwsp/","/kalkulator-loan-kereta/","/kalkulator-ot/","/kalkulator-pinjaman-peribadi/","/kalkulator-pinjaman-perumahan/","/kalkulator-rpgt/","/kalkulator-ukuran-tanah/","/kalkulator-zakat-emas/","/kalkulator-zakat-pendapatan/","/land-size-converter-malaysia/","/ninja-van-near-me/","/ninja-van-terdekat/","/ninja-van-tracking/","/overtime-calculator-malaysia/","/parcel-tracking-malaysia/","/personal-loan-calculator-malaysia/","/pos-laju-near-me/","/pos-laju-terdekat/","/pos-laju-tracking/","/privacy/","/prorated-salary-calculator-malaysia/","/rpgt-calculator-malaysia/","/salary-calculator-malaysia/","/semak-tracking-citylink/","/semak-tracking-gdex/","/semak-tracking-jnt/","/semak-tracking-ninja-van/","/semak-tracking-parcel/","/semak-tracking-pos-laju/","/terms/","/unused-css-remover/","/zakat-calculator-malaysia/"]);
const ASSETS = new Set(PRECACHE.filter(url => !PAGES.has(url)));
// Large libraries (code minifiers) are cached on first use, not on install.
const LAZY = new Set(["/assets/vendor/html-minifier-terser-7.2.0.js","/assets/vendor/javascript-obfuscator-5.9.0.js","/assets/vendor/js-beautify-2.0.3.js","/assets/vendor/terser-5.51.2.js"]);

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
  } else if (!url.search && (ASSETS.has(url.pathname) || LAZY.has(url.pathname))) {
    event.respondWith(asset(request));
  }
});
