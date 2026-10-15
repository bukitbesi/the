// Source template. tools-src/build.mjs writes the versioned root /sw.js.
'use strict';
const CACHE_PREFIX = 'bukit-tools-';
const CACHE_NAME = CACHE_PREFIX + '597b713fece58594';
const PRECACHE = ["/","/age-calculator-malaysia/","/ai-prompt-generator/","/annual-leave-calculator-malaysia/","/ar-rahnu-calculator-malaysia/","/arah-kiblat/","/asb-dividend-calculator/","/bmi-calculator-malaysia/","/bursa-share-fee-calculator/","/calorie-calculator-malaysia/","/car-loan-calculator-malaysia/","/cgpa-calculator/","/cgpa-to-percentage/","/citylink-tracking/","/css-minifier/","/currency-converter-malaysia/","/debt-consolidation-calculator-malaysia/","/driving-licence-cost-malaysia/","/due-date-calculator-malaysia/","/education-cost-calculator-malaysia/","/eis-calculator-malaysia/","/employer-cost-calculator-malaysia/","/epf-calculator/","/faraid-calculator/","/fidyah-calculator/","/fixed-deposit-calculator-malaysia/","/freelance-rate-calculator-malaysia/","/fuel-cost-calculator-malaysia/","/gambar-ke-prompt/","/gdex-tracking/","/gold-price-malaysia/","/gold-zakat-calculator-malaysia/","/hajj-cost-calculator-malaysia/","/harga-emas-hari-ini/","/hijri-date-converter/","/home-loan-calculator-malaysia/","/html-beautifier/","/iddah-calculator/","/image-to-prompt/","/income-tax-calculator-malaysia/","/javascript-minifier/","/jnt-near-me/","/jnt-terdekat/","/jnt-tracking/","/kalkulator-ar-rahnu/","/kalkulator-bil-air/","/kalkulator-bil-elektrik-tnb/","/kalkulator-bmi/","/kalkulator-caj-freelance/","/kalkulator-cukai-pendapatan/","/kalkulator-cuti-tahunan/","/kalkulator-dividen-asb/","/kalkulator-duti-setem-sewa/","/kalkulator-faedah-penamatan/","/kalkulator-faraid/","/kalkulator-fidyah/","/kalkulator-fixed-deposit/","/kalkulator-gabung-hutang/","/kalkulator-gaji-prorata/","/kalkulator-gaji-sspa/","/kalkulator-gaji/","/kalkulator-hari-bekerja/","/kalkulator-iddah/","/kalkulator-kalori/","/kalkulator-kos-pekerja/","/kalkulator-kos-pendidikan-anak/","/kalkulator-kwsp/","/kalkulator-loan-kereta/","/kalkulator-margin-untung/","/kalkulator-mas-kahwin/","/kalkulator-minyak/","/kalkulator-ncd/","/kalkulator-ot/","/kalkulator-pinjaman-peribadi/","/kalkulator-pinjaman-perumahan/","/kalkulator-ptptn/","/kalkulator-refinance-rumah/","/kalkulator-roadtax/","/kalkulator-roas/","/kalkulator-rpgt/","/kalkulator-saham-bursa/","/kalkulator-saiz-kasut/","/kalkulator-sewa-atau-beli-rumah/","/kalkulator-simpanan-persaraan/","/kalkulator-sip-perkeso/","/kalkulator-solar/","/kalkulator-sspn/","/kalkulator-sst/","/kalkulator-str/","/kalkulator-tabung-haji/","/kalkulator-tarikh-bersalin/","/kalkulator-ukuran-tanah/","/kalkulator-umur-bersara/","/kalkulator-umur/","/kalkulator-unit-trust/","/kalkulator-zakat-emas/","/kalkulator-zakat-pendapatan/","/kos-lesen-memandu/","/land-size-converter-malaysia/","/mas-kahwin-malaysia/","/ncd-calculator-malaysia/","/ninja-van-near-me/","/ninja-van-terdekat/","/ninja-van-tracking/","/overtime-calculator-malaysia/","/parcel-tracking-malaysia/","/penjana-prompt-ai/","/penukar-mata-wang/","/personal-loan-calculator-malaysia/","/pos-laju-near-me/","/pos-laju-terdekat/","/pos-laju-tracking/","/privacy/","/profit-margin-calculator-malaysia/","/prorated-salary-calculator-malaysia/","/ptptn-repayment-calculator/","/qibla-direction-malaysia/","/refinance-calculator-malaysia/","/rent-vs-buy-calculator-malaysia/","/retirement-age-calculator-malaysia/","/retirement-savings-calculator-malaysia/","/road-tax-calculator-malaysia/","/roas-calculator/","/rpgt-calculator-malaysia/","/salary-calculator-malaysia/","/semak-tracking-citylink/","/semak-tracking-gdex/","/semak-tracking-jnt/","/semak-tracking-ninja-van/","/semak-tracking-parcel/","/semak-tracking-pos-laju/","/shoe-size-converter/","/solar-calculator-malaysia/","/sspa-salary-calculator/","/sspn-calculator/","/sst-calculator-malaysia/","/str-calculator-malaysia/","/tenancy-stamp-duty-calculator-malaysia/","/termination-benefits-calculator-malaysia/","/terms/","/tnb-bill-calculator/","/tukar-tarikh-hijrah/","/unit-trust-calculator-malaysia/","/unused-css-remover/","/water-bill-calculator-malaysia/","/working-days-calculator-malaysia/","/zakat-calculator-malaysia/","/offline.html","/manifest.webmanifest","/assets/PWA/pwa.min.js","/assets/js/salary.js","/assets/js/cgpa-percent.js","/assets/js/cgpa.js","/assets/js/tax.js","/assets/js/epf.js","/assets/js/loan.js","/assets/js/carloan.js","/assets/js/asb.js","/assets/js/prorate.js","/assets/js/overtime.js","/assets/js/land.js","/assets/js/personal-loan.js","/assets/js/rpgt.js","/assets/js/bmi.js","/assets/js/zakat.js","/assets/js/zakat-emas.js","/assets/js/harga-emas.js","/assets/js/prompt-generator.js","/assets/js/image-to-prompt.js","/assets/js/fuel.js","/assets/js/ncd.js","/assets/js/iddah.js","/assets/js/hijri.js","/assets/js/tnb.js","/assets/js/ptptn.js","/assets/js/fidyah.js","/assets/js/debt.js","/assets/js/refinance.js","/assets/js/rent-vs-buy.js","/assets/js/fixed-deposit.js","/assets/js/employer-cost.js","/assets/js/profit-margin.js","/assets/js/roas.js","/assets/js/freelance-rate.js","/assets/js/working-days.js","/assets/js/retirement-age.js","/assets/js/sspn.js","/assets/js/unit-trust.js","/assets/js/education-cost.js","/assets/js/water-bill.js","/assets/js/qibla.js","/assets/js/retirement-savings.js","/assets/js/annual-leave.js","/assets/js/termination-benefits.js","/assets/js/road-tax.js","/assets/js/sst.js","/assets/js/bursa-fees.js","/assets/js/tenancy-stamp-duty.js","/assets/js/eis.js","/assets/js/maskahwin.js","/assets/js/haji.js","/assets/js/str.js","/assets/js/sspa.js","/assets/js/rahnu.js","/assets/js/umur.js","/assets/js/bersalin.js","/assets/js/solar.js","/assets/js/lesen.js","/assets/js/faraid.js","/assets/js/fx.js","/assets/js/kalori.js","/assets/js/kasut.js","/assets/js/tracking.js","/assets/js/near.js","/assets/js/css-minifier.js","/assets/js/js-minifier.js","/assets/js/js-minifier-worker.js","/assets/js/html-beautifier.js","/assets/js/html-beautifier-worker.js","/assets/js/unused-css.js","/assets/favicon-image/bukit-besi-72.webp","/assets/favicon-image/favicon.ico","/assets/favicon-image/apple-touch-icon.png","/assets/favicon-image/favicon-96x96.png","/assets/favicon-image/bukit-besi-192.webp","/assets/PWA/icons/icon-192.png","/assets/PWA/icons/icon-512.png","/assets/PWA/icons/icon-maskable-512.png"];
// Pages are HTML routes (network first, saved copy offline); everything else is a static asset.
const PAGES = new Set(["/","/age-calculator-malaysia/","/ai-prompt-generator/","/annual-leave-calculator-malaysia/","/ar-rahnu-calculator-malaysia/","/arah-kiblat/","/asb-dividend-calculator/","/bmi-calculator-malaysia/","/bursa-share-fee-calculator/","/calorie-calculator-malaysia/","/car-loan-calculator-malaysia/","/cgpa-calculator/","/cgpa-to-percentage/","/citylink-tracking/","/css-minifier/","/currency-converter-malaysia/","/debt-consolidation-calculator-malaysia/","/driving-licence-cost-malaysia/","/due-date-calculator-malaysia/","/education-cost-calculator-malaysia/","/eis-calculator-malaysia/","/employer-cost-calculator-malaysia/","/epf-calculator/","/faraid-calculator/","/fidyah-calculator/","/fixed-deposit-calculator-malaysia/","/freelance-rate-calculator-malaysia/","/fuel-cost-calculator-malaysia/","/gambar-ke-prompt/","/gdex-tracking/","/gold-price-malaysia/","/gold-zakat-calculator-malaysia/","/hajj-cost-calculator-malaysia/","/harga-emas-hari-ini/","/hijri-date-converter/","/home-loan-calculator-malaysia/","/html-beautifier/","/iddah-calculator/","/image-to-prompt/","/income-tax-calculator-malaysia/","/javascript-minifier/","/jnt-near-me/","/jnt-terdekat/","/jnt-tracking/","/kalkulator-ar-rahnu/","/kalkulator-bil-air/","/kalkulator-bil-elektrik-tnb/","/kalkulator-bmi/","/kalkulator-caj-freelance/","/kalkulator-cukai-pendapatan/","/kalkulator-cuti-tahunan/","/kalkulator-dividen-asb/","/kalkulator-duti-setem-sewa/","/kalkulator-faedah-penamatan/","/kalkulator-faraid/","/kalkulator-fidyah/","/kalkulator-fixed-deposit/","/kalkulator-gabung-hutang/","/kalkulator-gaji-prorata/","/kalkulator-gaji-sspa/","/kalkulator-gaji/","/kalkulator-hari-bekerja/","/kalkulator-iddah/","/kalkulator-kalori/","/kalkulator-kos-pekerja/","/kalkulator-kos-pendidikan-anak/","/kalkulator-kwsp/","/kalkulator-loan-kereta/","/kalkulator-margin-untung/","/kalkulator-mas-kahwin/","/kalkulator-minyak/","/kalkulator-ncd/","/kalkulator-ot/","/kalkulator-pinjaman-peribadi/","/kalkulator-pinjaman-perumahan/","/kalkulator-ptptn/","/kalkulator-refinance-rumah/","/kalkulator-roadtax/","/kalkulator-roas/","/kalkulator-rpgt/","/kalkulator-saham-bursa/","/kalkulator-saiz-kasut/","/kalkulator-sewa-atau-beli-rumah/","/kalkulator-simpanan-persaraan/","/kalkulator-sip-perkeso/","/kalkulator-solar/","/kalkulator-sspn/","/kalkulator-sst/","/kalkulator-str/","/kalkulator-tabung-haji/","/kalkulator-tarikh-bersalin/","/kalkulator-ukuran-tanah/","/kalkulator-umur-bersara/","/kalkulator-umur/","/kalkulator-unit-trust/","/kalkulator-zakat-emas/","/kalkulator-zakat-pendapatan/","/kos-lesen-memandu/","/land-size-converter-malaysia/","/mas-kahwin-malaysia/","/ncd-calculator-malaysia/","/ninja-van-near-me/","/ninja-van-terdekat/","/ninja-van-tracking/","/overtime-calculator-malaysia/","/parcel-tracking-malaysia/","/penjana-prompt-ai/","/penukar-mata-wang/","/personal-loan-calculator-malaysia/","/pos-laju-near-me/","/pos-laju-terdekat/","/pos-laju-tracking/","/privacy/","/profit-margin-calculator-malaysia/","/prorated-salary-calculator-malaysia/","/ptptn-repayment-calculator/","/qibla-direction-malaysia/","/refinance-calculator-malaysia/","/rent-vs-buy-calculator-malaysia/","/retirement-age-calculator-malaysia/","/retirement-savings-calculator-malaysia/","/road-tax-calculator-malaysia/","/roas-calculator/","/rpgt-calculator-malaysia/","/salary-calculator-malaysia/","/semak-tracking-citylink/","/semak-tracking-gdex/","/semak-tracking-jnt/","/semak-tracking-ninja-van/","/semak-tracking-parcel/","/semak-tracking-pos-laju/","/shoe-size-converter/","/solar-calculator-malaysia/","/sspa-salary-calculator/","/sspn-calculator/","/sst-calculator-malaysia/","/str-calculator-malaysia/","/tenancy-stamp-duty-calculator-malaysia/","/termination-benefits-calculator-malaysia/","/terms/","/tnb-bill-calculator/","/tukar-tarikh-hijrah/","/unit-trust-calculator-malaysia/","/unused-css-remover/","/water-bill-calculator-malaysia/","/working-days-calculator-malaysia/","/zakat-calculator-malaysia/"]);
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
