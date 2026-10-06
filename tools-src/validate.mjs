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
assert.deepEqual(cards, tools.map(item => item.url), 'Cards match published tools');
const toolIcons = [...html.matchAll(/data-icon="([^"]+)"/g)].map(m => m[1]);
assert.deepEqual(toolIcons, tools.map(item => item.icon), 'Every card has its own icon');
assert.equal(new Set(toolIcons).size, tools.length, 'Unique icon keys');
assert.equal(new Set(tools.map(item => icons[item.icon])).size, tools.length, 'Distinct SVG artwork');
assert.equal((html.match(/<svg\b/g) || []).length, tools.length, 'One inline SVG per tool');
const faq = graph.find(item => item['@type'] === 'FAQPage');
assert.equal(faq.mainEntity.length, (html.match(/<details>/g) || []).length, 'FAQ schema matches visible questions');
for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(m[1]);
const llms = read('llms.txt');
for (const tool of tools) assert(llms.includes(`](${tool.url})`), `Missing LLM tool ${tool.name}`);
for (const tool of JSON.parse(read('tools-src/tools.json')).filter(t => !t.live)) assert(!llms.includes(tool.url), `Unpublished LLM link ${tool.name}`);
const locations = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
assert.deepEqual(locations, [site.origin + '/'], 'Only the canonical hosted directory belongs in this sitemap');
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
for (const resource of precache.filter(url => url !== '/')) assert(fs.statSync(path.join(root, resource)).size > 0, `Missing offline asset ${resource}`);
assert(precache.includes('/assets/PWA/pwa.min.js') && precache.includes('/offline.html'), 'Offline app assets');
assert(precache.every(url => url.startsWith('/') && !url.startsWith('//')), 'Same-origin precache only');
assert(!/<a\b[^>]*target="_blank"/.test(html), 'Directory links use the same tab');
console.log(`Validated ${tools.length} tools, SEO files, scripts, PWA manifest, icons and offline assets.`);
