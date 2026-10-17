// Robots.txt generator and tester: RFC 9309 matching (longest rule, Allow on ties, * and $), Google's group
// selection, the presets and the audit warnings. Examples are the ones in RFC 9309 and Google's documentation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../../assets/js/robots-core.js');
const allowed = (txt, url, ua = 'Googlebot') => R.test(txt, url, ua).allowed;

test('Longest match wins and Allow wins a tie (RFC 9309 2.2.2)', () => {
  const t = 'User-agent: *\nAllow: /p\nDisallow: /\n';
  assert.equal(allowed(t, '/page'), true);
  assert.equal(allowed(t, '/other'), false);
  assert.equal(allowed('User-agent: *\nAllow: /folder\nDisallow: /folder\n', '/folder/page'), true);
  assert.equal(allowed('User-agent: *\nAllow: /page\nDisallow: /*.htm\n', '/page.htm'), false);
  assert.equal(allowed('User-agent: *\nAllow: /$\nDisallow: /\n', '/'), true);
  assert.equal(allowed('User-agent: *\nAllow: /$\nDisallow: /\n', '/page.htm'), false);
});

test('Wildcards and end anchors follow Google\'s examples', () => {
  const fish = 'User-agent: *\nDisallow: /fish*\n';
  for (const u of ['/fish', '/fish.html', '/fish/salmon.html', '/fishheads', '/fish.php?id=anything']) assert.equal(allowed(fish, u), false, u);
  for (const u of ['/Fish.asp', '/catfish', '/?id=fish', '/desert/fish']) assert.equal(allowed(fish, u), true, u);
  const php = 'User-agent: *\nDisallow: /*.php$\n';
  assert.equal(allowed(php, '/filename.php'), false);
  assert.equal(allowed(php, '/folder/filename.php'), false);
  assert.equal(allowed(php, '/filename.php?parameters'), true);
  assert.equal(allowed(php, '/filename.php/'), true);
  assert.equal(allowed('User-agent: *\nDisallow: /fish/\n', '/fish'), true);
  assert.equal(allowed('User-agent: *\nDisallow: /fish/\n', '/fish/salmon.htm'), false);
});

test('Empty Disallow blocks nothing; /robots.txt is always allowed', () => {
  assert.equal(allowed('User-agent: *\nDisallow:\n', '/anything'), true);
  assert.equal(allowed('User-agent: *\nDisallow: /\n', '/robots.txt'), true);
  assert.equal(R.test('User-agent: *\nDisallow: /\n', 'https://example.com/a?b=c#frag').path, '/a?b=c');
});

test('Group selection: most specific agent, merged duplicates, * fallback, case-insensitive', () => {
  const t = 'User-agent: googlebot\nDisallow: /a\n\nUser-agent: Googlebot-News\nDisallow: /b\n\nUser-agent: *\nDisallow: /c\n\nUser-agent: GOOGLEBOT\nDisallow: /d\n';
  assert.equal(allowed(t, '/a', 'Googlebot-Image'), false, 'falls back to googlebot');
  assert.equal(allowed(t, '/d', 'Googlebot'), false, 'same-agent groups merge');
  assert.equal(allowed(t, '/c', 'Googlebot'), true, '* is not used when a specific group exists');
  assert.equal(allowed(t, '/a', 'Googlebot-News'), true);
  assert.equal(allowed(t, '/b', 'Googlebot-News'), false);
  assert.equal(allowed(t, '/c', 'Bingbot'), false);
  const two = 'User-agent: a\nUser-agent: b\nDisallow: /x\n';
  assert.equal(allowed(two, '/x', 'b'), false, 'consecutive agents share one group');
  assert.equal(R.test('User-agent: a\nDisallow: /\n', '/', 'z').reason, 'noGroup');
});

test('Percent-encoding and non-ASCII paths compare as octets', () => {
  assert.equal(allowed('User-agent: *\nDisallow: /foo/bar/ツ\n', '/foo/bar/%E3%83%84'), false);
  assert.equal(allowed('User-agent: *\nDisallow: /foo/bar/%e3%83%84\n', '/foo/bar/ツ'), false);
});

test('Blogger preset matches Blogger\'s default robots.txt plus the pages sitemap', () => {
  const txt = R.generate(R.fromPreset('blogger', 'https://www.thebukitbesi.com/'));
  assert.equal(txt, 'User-agent: Mediapartners-Google\nDisallow:\n\nUser-agent: *\nDisallow: /search\nAllow: /\n\nSitemap: https://www.thebukitbesi.com/sitemap.xml\nSitemap: https://www.thebukitbesi.com/sitemap-pages.xml\n');
  assert.equal(allowed(txt, '/search/label/SEO'), false);
  assert.equal(allowed(txt, '/2026/10/post.html'), true);
  assert.equal(allowed(txt, '/search?q=x', 'Mediapartners-Google'), true);
  assert.deepEqual(R.audit(txt, 'https://www.thebukitbesi.com').notes, []);
});

test('WordPress preset keeps admin-ajax.php open', () => {
  const txt = R.generate(R.fromPreset('wordpress', 'https://example.com'));
  assert.equal(allowed(txt, '/wp-admin/options.php'), false);
  assert.equal(allowed(txt, '/wp-admin/admin-ajax.php'), true);
  assert.ok(txt.includes('Sitemap: https://example.com/wp-sitemap.xml'));
});

test('AI crawler blocking adds one group and leaves search crawlers alone', () => {
  const cfg = R.fromPreset('open', 'https://example.com', { GPTBot: 'block', 'Google-Extended': 'block', CCBot: 'block' });
  const txt = R.generate(cfg);
  assert.ok(txt.includes('User-agent: GPTBot\nUser-agent: Google-Extended\nUser-agent: CCBot\nDisallow: /\n'));
  assert.equal(allowed(txt, '/post', 'GPTBot'), false);
  assert.equal(allowed(txt, '/post', 'Google-Extended'), false);
  assert.equal(allowed(txt, '/post', 'Googlebot'), true);
  assert.equal(allowed(txt, '/post', 'OAI-SearchBot'), true);
  assert.equal(R.BOTS.length, 12);
  assert.equal(new Set(R.BOTS.map(b => b.token.toLowerCase())).size, 12);
});

test('Audit flags the mistakes that cost traffic', () => {
  const codes = t => R.audit(t, 'https://example.com').notes.map(n => n.code);
  assert.ok(codes('User-agent: *\nDisallow: /\n').includes('blocksAll'));
  assert.ok(codes('User-agent: *\nDisallow: /*.css$\nDisallow: /*.js$\n').includes('blocksAssets'));
  assert.ok(codes('User-agent: *\nDisallow: /wp-content/\n').includes('blocksAssets'));
  assert.ok(codes('User-agent: Mediapartners-Google\nDisallow: /\n').includes('blocksAdsense'));
  assert.ok(codes('User-agent: *\nNoindex: /x\nCrawl-delay: 10\n').includes('noindex'));
  assert.ok(codes('User-agent: *\nCrawl-delay: 10\n').includes('crawlDelay'));
  assert.ok(codes('Sitemap: /sitemap.xml\n').includes('sitemapRelative'));
  assert.ok(codes('Disallow: /x\n').includes('noAgent'));
  assert.ok(codes('User-agent *\n').includes('syntax'));
  assert.ok(codes('User-agent: *\nDisallow: /x\nSitemap: https://other.com/s.xml\n').includes('sitemapHost'));
  assert.ok(codes('User-agent: *\nDisallow:\n' + '#'.repeat(600 * 1024)).includes('tooBig'));
  for (const c of new Set(Object.keys(R.NOTE))) assert.ok(R.NOTE[c].length > 10);
});

test('Generator writes Allow, crawl-delay and absolute sitemaps', () => {
  const txt = R.generate({ site: 'https://a.com/', groups: [{ agents: ['Bingbot'], disallow: ['/tmp/'], allow: ['/tmp/ok'], crawlDelay: 5 }], sitemaps: ['sitemap.xml', 'https://cdn.a.com/s.xml'] });
  assert.equal(txt, 'User-agent: Bingbot\nDisallow: /tmp/\nAllow: /tmp/ok\nCrawl-delay: 5\n\nSitemap: https://a.com/sitemap.xml\nSitemap: https://cdn.a.com/s.xml\n');
  assert.match(R.FACTS.verified, /^\d{4}-\d{2}-\d{2}$/);
});
