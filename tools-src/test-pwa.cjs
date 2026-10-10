// Browser regression checks in a disposable local fixture and browser profile.
// Requires puppeteer-core. PUPPETEER_MODULE may point to an existing installation.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const puppeteer = require(process.env.PUPPETEER_MODULE || 'puppeteer-core');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name));
const tools = JSON.parse(read('tools-src/tools.json')).filter(tool => tool.live);
let worker = read('sw.js').toString();
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain' };
const fixture = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let name = url.pathname === '/' || url.pathname === '/index.html' ? 'tool.html' : url.pathname.slice(1);
  // Generated pages and bundles are served from dist/, as on the deployed site.
  const built = path.join('dist', name.endsWith('/') ? name + 'index.html' : name);
  if (name !== 'tool.html' && fs.existsSync(path.join(root, built)) && fs.statSync(path.join(root, built)).isFile()) name = built;
  const absolute = path.resolve(root, name);
  if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
  try {
    assert(absolute.startsWith(root + path.sep));
    const body = name === 'sw.js' ? worker : fs.readFileSync(absolute);
    res.writeHead(200, { 'Content-Type': mime[path.extname(name)] || 'text/plain', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html' }); res.end(read('404.html'));
  }
});

(async () => {
  await new Promise(resolve => fixture.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${fixture.address().port}`;
  let browser;
  try {
    browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || undefined,
      headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 360, height: 800 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.evaluateOnNewDocument(() => sessionStorage.setItem('loads', String(Number(sessionStorage.getItem('loads') || 0) + 1)));
    await page.goto(origin, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, { timeout: 20000 });
    assert.equal(await page.evaluate(() => sessionStorage.getItem('loads')), '1', 'First activation never reloads');
    const client = await page.createCDPSession();
    assert.equal((await client.send('Page.getAppManifest')).errors.length, 0, 'Valid browser manifest');
    assert.equal((await client.send('Page.getInstallabilityErrors')).installabilityErrors.length, 0, 'Chrome installability');
    const cached = await page.evaluate(async () => {
      const names = await caches.keys();
      const cache = await caches.open(names.find(name => name.startsWith('bukit-tools-')));
      return (await cache.keys()).map(request => new URL(request.url).pathname);
    });
    const expected = JSON.parse(worker.match(/const PRECACHE = (\[[^;]+\]);/)[1]);
    assert.deepEqual(cached.sort(), expected.sort(), 'Complete public app precache');
    console.log('Install and precache passed.');
    assert.equal(await page.evaluate(async () => (await fetch('/test-api', { method: 'POST', body: 'test' })).status), 405);

    await page.setOfflineMode(true);
    await page.goto(origin, { waitUntil: 'networkidle0' });
    // Explicitly set navigator state too: CDP separates it from request emulation.
    await client.send('Network.overrideNetworkState', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    assert.equal(await page.evaluate(() => navigator.onLine), false);
    assert.equal(await page.$$eval('.card-link', elements => elements.length), tools.length);
    await page.locator('.chip[data-filter="calc"]').click();
    assert.equal(await page.$$eval('#toolsGrid>li:not([hidden])', elements => elements.length), tools.filter(tool => tool.cat === 'calc').length);
    await page.locator('.chip[data-filter="all"]').click();
    await page.locator('.card-link').click();
    assert.equal(page.url(), origin + '/', 'Offline Blogger click keeps the directory open');
    assert((await page.$eval('#pwaMessage', element => element.textContent)).includes('needs internet'));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const offline = await page.goto(origin + '/not-saved', { waitUntil: 'networkidle0' });
    console.log('Offline fallback loaded.');
    assert.equal(offline.status(), 503);
    assert.equal(await page.$eval('h1', element => element.textContent), "You're offline");
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.locator('a[href="/"]').click()]);
    assert.equal(await page.$$eval('.card-link', elements => elements.length), tools.length);

    await page.setOfflineMode(false);
    await client.send('Network.overrideNetworkState', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    assert.equal((await page.goto(origin + '/not-saved', { waitUntil: 'networkidle0' })).status(), 404);
    await page.goto(origin, { waitUntil: 'networkidle0' });
    console.log('Online recovery passed.');
    await page.evaluate(async () => { await caches.open('unrelated-app-cache'); await caches.open('bukit-tools-obsolete-test'); });
    const loadCount = await page.evaluate(() => Number(sessionStorage.getItem('loads')));
    worker = worker.replace(/const CACHE_NAME = CACHE_PREFIX \+ '[^']+';/, "const CACHE_NAME = CACHE_PREFIX + 'pwa-lifecycle-test';");
    await page.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration('/'); await registration.update(); });
    await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration('/')).waiting, { timeout: 20000 });
    await page.waitForFunction(() => !document.getElementById('pwaUpdate').hidden);
    assert.equal(await page.evaluate(() => Number(sessionStorage.getItem('loads'))), loadCount, 'Update waits for user');
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.locator('#pwaUpdate').click()]);
    const names = await page.evaluate(() => caches.keys());
    assert(names.includes('unrelated-app-cache'), 'Unrelated app caches retained');
    assert(names.includes('bukit-tools-pwa-lifecycle-test'));
    assert.equal(names.filter(name => name.startsWith('bukit-tools-')).length, 1, 'Old app revisions removed');
    assert.equal(await page.evaluate(() => Number(sessionStorage.getItem('loads'))), loadCount + 1, 'Single update reload');
    assert.deepEqual(errors, []);
    console.log('PWA browser checks passed: installability, precache, offline navigation and filters, fallback, 404 handling, POST bypass, update consent, single reload and selective cache cleanup.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => fixture.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
