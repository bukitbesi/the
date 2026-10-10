// Validate generated SEO files and local resources without third-party packages.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { icons } from './icons.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const site = JSON.parse(read('tools-src/site.json'));
const tools = JSON.parse(read('tools-src/tools.json')).filter(t => t.live);
const html = read('tool.html');
assert(!/\{\{[A-Z0-9_]+\}\}/.test(html), 'Unresolved template placeholders');
assert.equal((html.match(/<h1\b/g) || []).length, 1, 'Exactly one main heading');
assert(html.includes(`<link rel="canonical" href="${site.origin}/">`), 'Canonical URL');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'Unique element IDs');
for (const m of html.matchAll(/\bhref="#([^"]+)"/g)) assert(ids.includes(m[1]), `Missing fragment ${m[1]}`);
for (const m of html.matchAll(/\b(?:src|href)="(\/assets\/[^"?#]+)"/g)) {
  assert(fs.statSync(path.join(root, m[1])).size > 0, `Missing or empty resource ${m[1]}`);
}
const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
const list = graph.find(item => item['@type'] === 'ItemList');
assert.equal(list.numberOfItems, tools.length, 'Schema count matches published tools');
assert.deepEqual(list.itemListElement.map(item => item.url), tools.map(item => item.url));
const cards = [...html.matchAll(/class="card-link" href="([^"]+)"/g)].map(m => m[1]);
// Cards on this host use root-relative links.
assert.deepEqual(cards, tools.map(item => item.url.replace(site.origin, '')), 'Cards match published tools');
const toolIcons = [...html.matchAll(/data-icon="([^"]+)"/g)].map(m => m[1]);
assert.deepEqual(toolIcons, tools.map(item => item.icon), 'Every card has its own icon');
assert.equal(new Set(toolIcons).size, tools.length, 'Unique icon keys');
assert.equal(new Set(tools.map(item => icons[item.icon])).size, tools.length, 'Distinct SVG artwork');
assert.equal((html.match(/data-icon="[^"]+" aria-hidden="true"><svg\b/g) || []).length, tools.length, 'One inline SVG per tool');
const faq = graph.find(item => item['@type'] === 'FAQPage');
assert.equal(faq.mainEntity.length, (html.match(/<details>/g) || []).length, 'FAQ schema matches visible questions');
for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(m[1]);
const llms = read('llms.txt');
for (const tool of tools) assert(llms.includes(`](${tool.url})`), `Missing LLM tool ${tool.name}`);
for (const tool of JSON.parse(read('tools-src/tools.json')).filter(t => !t.live)) assert(!llms.includes(tool.url), `Unpublished LLM link ${tool.name}`);
// ---- generated pages in dist/
const pageDirs = fs.readdirSync(path.join(root, 'dist'), { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name !== 'assets').map(d => '/' + d.name + '/');
const pageHtml = new Map(pageDirs.map(p => [p, read('dist' + p + 'index.html')]));
const locations = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
assert.deepEqual(locations.sort(), [site.origin + '/', ...pageDirs.map(p => site.origin + p)].sort(), 'Sitemap lists the home page and every generated page');
const routeExists = href => href === '/' || pageHtml.has(href) || fs.existsSync(path.join(root, href)) || fs.existsSync(path.join(root, 'dist', href));
for (const [p, page] of pageHtml) {
  const where = ` on ${p}`;
  assert(!/\{\{[A-Z0-9_]+\}\}/.test(page), 'Unresolved placeholders' + where);
  assert.equal((page.match(/<h1\b/g) || []).length, 1, 'One h1' + where);
  assert(page.includes(`<link rel="canonical" href="${site.origin + p}">`), 'Canonical' + where);
  const title = page.match(/<title>([^<]+)<\/title>/)[1];
  assert(title.length <= 70, `Title under 70 characters${where}: ${title.length}`);
  const pids = [...page.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(pids).size, pids.length, 'Unique IDs' + where);
  for (const m of page.matchAll(/\bhref="#([^"]+)"/g)) assert(pids.includes(m[1]), `Missing fragment ${m[1]}${where}`);
  for (const m of page.matchAll(/aria-(?:labelledby|describedby)="([^"]+)"/g)) for (const id of m[1].split(' ')) assert(pids.includes(id), `Missing ARIA target ${id}${where}`);
  for (const m of page.matchAll(/\b(?:src|href)="(\/[^"?#]*)/g)) assert(routeExists(m[1]), `Broken internal link ${m[1]}${where}`);
  const g = JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  assert(g.some(n => n['@type'] === 'BreadcrumbList'), 'Breadcrumb schema' + where);
  const pf = g.find(n => n['@type'] === 'FAQPage');
  assert.equal(pf ? pf.mainEntity.length : 0, (page.match(/<details>/g) || []).length, 'FAQ schema matches visible questions' + where);
  for (const m of page.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)) {
    const other = m[2].replace(site.origin, '');
    assert(other === '/' || pageHtml.has(other), `hreflang target exists${where}`);
    assert(pageHtml.get(other)?.includes(`href="${site.origin + p}"`) ?? true, `hreflang is reciprocal${where}`);
  }
  for (const m of page.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(m[1]);
}
for (const f of fs.readdirSync(path.join(root, 'dist/assets/js'))) new vm.Script(read('dist/assets/js/' + f));
assert(read('sitemap.xml').includes('xmlns:xhtml'), 'Sitemap carries hreflang alternates');
assert(read('robots.txt').includes(`Sitemap: ${site.origin}/sitemap.xml`), 'Robots sitemap URL');
assert(!read('robots.txt').includes('Disallow:'), 'Public resources and noindex 404 remain crawlable');
assert(read('404.html').includes('content="noindex,follow"'), '404 indexing directive');

const manifest = JSON.parse(read('manifest.webmanifest'));
assert.deepEqual(JSON.parse(read('src/manifest.json')), manifest, 'Legacy source manifest stays valid');
assert.equal(manifest.id, '/');
assert.equal(manifest.scope, '/');
assert.equal(manifest.start_url, '/');
assert.equal(manifest.display, 'standalone');
assert(html.includes('<link rel="manifest" href="/manifest.webmanifest">'), 'Manifest linked in page');
for (const icon of manifest.icons) {
  const bytes = fs.readFileSync(path.join(root, icon.src));
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG', 'Manifest icons are PNGs');
  const size = `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
  assert.equal(size, icon.sizes, 'Declared icon dimensions match image');
}
assert(manifest.icons.some(icon => icon.sizes === '192x192' && icon.purpose === 'any'));
assert(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'any'));
assert(manifest.icons.some(icon => icon.purpose === 'maskable'));
assert(read('offline.html').includes('content="noindex,follow"'), 'Offline fallback cannot be indexed');
const worker = read('sw.js');
assert(!worker.includes('__CACHE_VERSION__') && !worker.includes('__PRECACHE_JSON__'), 'Worker template compiled');
new vm.Script(worker);
new vm.Script(read('assets/PWA/pwa.min.js'));
const precache = JSON.parse(worker.match(/const PRECACHE = (\[[^;]+\]);/)[1]);
const builtFile = url => url === '/' ? path.join(root, 'tool.html')
  : url.endsWith('/') ? path.join(root, 'dist', url, 'index.html')
  : fs.existsSync(path.join(root, 'dist', url)) ? path.join(root, 'dist', url) : path.join(root, url);
for (const resource of precache) assert(fs.statSync(builtFile(resource)).size > 0, `Missing offline asset ${resource}`);
const workerPages = JSON.parse(worker.match(/const PAGES = new Set\((\[[^;]+\])\);/)[1]);
assert.deepEqual(workerPages.sort(), ['/', ...pageDirs].sort(), 'Every page is available offline');
assert(!worker.includes('__PAGES_JSON__'), 'Worker page list compiled');
assert(precache.includes('/assets/PWA/pwa.min.js') && precache.includes('/offline.html'), 'Offline app assets');
assert(precache.every(url => url.startsWith('/') && !url.startsWith('//')), 'Same-origin precache only');
assert(!/<a\b[^>]*target="_blank"/.test(html), 'Directory links use the same tab');
// JPEG dimensions come from the first start-of-frame marker.
const jpegSize = file => {
  const b = fs.readFileSync(path.join(root, file));
  assert.equal(b.readUInt16BE(0), 0xffd8, `${file} is a JPEG`);
  for (let i = 2; i < b.length;) {
    const marker = b.readUInt16BE(i);
    if (marker >= 0xffc0 && marker <= 0xffc3) return `${b.readUInt16BE(i + 7)}x${b.readUInt16BE(i + 5)}`;
    i += 2 + b.readUInt16BE(i + 2);
  }
  assert.fail(`${file} has no frame header`);
};
assert.equal(jpegSize(site.ogImage.url), `${site.ogImage.width}x${site.ogImage.height}`, 'Social image matches declared size');
assert(html.includes('content="summary_large_image"'), 'Large social card for a wide image');
for (const shot of manifest.screenshots) assert.equal(jpegSize(shot.src), shot.sizes, `Screenshot ${shot.src} size`);
assert(manifest.screenshots.some(s => s.form_factor === 'wide') && manifest.screenshots.some(s => s.form_factor === 'narrow'), 'Rich install screenshots');
assert.equal(read(site.indexNowKey + '.txt').trim(), site.indexNowKey, 'IndexNow key file');
assert(!html.includes('{count}') && !llms.includes('{count}'), 'FAQ count placeholders resolved');
const ads = site.adsense || {};
if (ads.client) {
  assert.equal((html.match(/<ins class="adsbygoogle"/g) || []).length, 3, 'Three ad units');
  assert(!/<script[^>]+adsbygoogle\.js/.test(html), 'AdSense library is lazy-loaded, never render-blocking');
  assert(read('ads.txt').includes(ads.client.replace('ca-', '')), 'ads.txt names the publisher');
} else {
  assert(!html.includes('adsbygoogle'), 'No ad markup without a publisher ID');
}
assert(html.includes('id="themeToggle"'), 'Theme toggle present');
assert(read('CNAME').trim() === new URL(site.origin).hostname, 'CNAME matches canonical host');
console.log(`Validated ${tools.length} tools, SEO files, scripts, PWA manifest, icons and offline assets.`);
