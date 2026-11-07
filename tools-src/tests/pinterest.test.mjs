// Pinterest feeds: one board per category, items only with a pin image, links on the claimed domain, stable output.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pinItems, feed, pinHtml, imagePath, PIN } from '../pinterest.mjs';

const origin = 'https://tool.thebukitbesi.com';
const pages = [
  { path: '/unit-converter/', lang: 'en', cat: 'util', alternates: { ms: '/penukar-unit/' }, description: 'Convert units & more <fast>.', datePublished: '2026-11-05', dateModified: '2026-11-06',
    app: { name: 'Unit Converter', features: ['12 categories', 'Kati to kg', 'Dividend 6.15% this year', 'From RM 5', '{{X}} units', 'Offline'] } },
  { path: '/penukar-unit/', lang: 'ms', cat: 'util', alternates: { en: '/unit-converter/' }, description: 'Tukar unit.', datePublished: '2026-11-05', app: { name: 'Penukar Unit', features: [] } },
  { path: '/kalkulator-kwsp/', lang: 'ms', description: 'KWSP.', datePublished: '2026-10-01', app: { name: 'Kalkulator KWSP', features: [] } },
  { path: '/about/', lang: 'en', description: 'About', datePublished: '2026-01-01' },
  { path: '/waktu-solat-kedah/', lang: 'ms', solatState: true, description: 'x', datePublished: '2026-01-01', app: { name: 'x' } }
];
const tools = [{ url: origin + '/unit-converter/', icon: 'unit-converter' }, { url: 'https://www.thebukitbesi.com/p/x.html', icon: 'x' }];

test('Tool pages become pins with their board, icon (BM pages use the EN card) and no stale figures', () => {
  const items = pinItems(pages, tools, origin);
  assert.deepEqual(items.map(i => [i.path, i.cat, i.icon]), [['/unit-converter/', 'util', 'unit-converter'], ['/penukar-unit/', 'util', 'unit-converter'], ['/kalkulator-kwsp/', 'calc', '']]);
  assert.deepEqual(items[0].features, ['12 categories', 'Kati to kg', 'Offline']);
  assert.equal(imagePath(pages[0]), '/assets/pins/unit-converter.jpg');
});

test('A feed holds one category, skips pages without an image, escapes text and is deterministic', () => {
  const items = pinItems(pages, tools, origin);
  const sizes = new Map([['/assets/pins/unit-converter.jpg', 1234], ['/assets/pins/kalkulator-kwsp.jpg', 99]]);
  const opts = { origin, brand: 'The Bukit Besi', label: 'Free Online Utilities', blurb: 'Utilities & more', sizes };
  const x = feed('util', items, opts);
  assert.equal((x.match(/<item>/g) || []).length, 1);
  assert.ok(x.includes('<link>https://tool.thebukitbesi.com/unit-converter/?utm_source=pinterest&amp;utm_medium=social&amp;utm_campaign=util</link>'));
  assert.ok(x.includes('<description>Convert units &amp; more &lt;fast&gt;.</description>'));
  assert.ok(x.includes('<enclosure url="https://tool.thebukitbesi.com/assets/pins/unit-converter.jpg" length="1234" type="image/jpeg"/>'));
  assert.ok(x.includes(`width="${PIN.width}" height="${PIN.height}"`));
  assert.ok(x.includes('<pubDate>Thu, 05 Nov 2026 01:00:00 GMT</pubDate>'));
  assert.ok(x.includes('<lastBuildDate>Fri, 06 Nov 2026 01:00:00 GMT</lastBuildDate>'));
  assert.ok(x.includes('<atom:link href="https://tool.thebukitbesi.com/pinterest-util.xml"'));
  assert.ok(!x.includes('penukar-unit'));
  assert.equal(feed('util', items, opts), x);
  assert.equal((feed('calc', items, opts).match(/<item>/g) || []).length, 1);
  // Every tag that opens closes.
  for (const t of ['rss', 'channel', 'item', 'title', 'link', 'description', 'guid', 'pubDate', 'category']) assert.equal((x.match(new RegExp(`<${t}[ >]`, 'g')) || []).length, (x.match(new RegExp(`</${t}>`, 'g')) || []).length, t);
});

test('Pin artwork is in the page language', () => {
  const [en, ms] = pinItems(pages, tools, origin);
  const o = { label: 'Utilities', iconSvg: '<svg></svg>', logo: 'data:,', host: 'tool.thebukitbesi.com' };
  assert.ok(pinHtml(en, o).includes('Use it free') && pinHtml(en, o).includes('>Utilities<'));
  assert.ok(pinHtml(ms, o).includes('Guna percuma') && pinHtml(ms, o).includes('>Utiliti<'));
});
