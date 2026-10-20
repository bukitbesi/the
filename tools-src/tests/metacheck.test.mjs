// Meta Tag Checker core: head extraction without a browser, the checks, score and preview helpers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const M = require('../../assets/js/metacheck-core.js');

const GOOD = `<!doctype html><html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kalkulator Zakat Pendapatan 2026 &amp; KWSP</title>
<meta name="description" content="Kira zakat pendapatan 2026 dengan nisab terkini, kaedah tanpa tolakan atau dengan tolakan had kifayah dan KWSP, serta potongan gaji bulanan.">
<link rel="canonical" href="https://tool.example.com/kalkulator-zakat/"><link rel="icon" href="/f.ico">
<link rel="alternate" hreflang="en" href="https://tool.example.com/zakat/"><meta property="og:title" content="Zakat"><meta property="og:type" content="website">
<meta property='og:image' content='https://tool.example.com/og.jpg'><meta property="og:url" content="https://tool.example.com/kalkulator-zakat/"><meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage"},{"@type":["WebApplication"]}]}</script>
<script>var x = "<title>fake</title>";</script><!-- <title>comment</title> --></head>
<body><h1>Kalkulator <b>Zakat</b></h1><h2>a</h2><img src="a.jpg" alt=""><img src="b.jpg"></body></html>`;

test('Extracts head tags', () => {
  const i = M.extract(GOOD);
  assert.deepEqual([i.title, i.titles.length, i.lang, i.canonical, i.viewport, i.charset, i.icon], ['Kalkulator Zakat Pendapatan 2026 & KWSP', 1, 'ms', 'https://tool.example.com/kalkulator-zakat/', 'width=device-width,initial-scale=1', true, true]);
  assert.equal(i.og.image, 'https://tool.example.com/og.jpg');
  assert.deepEqual(i.hreflang, [{ lang: 'en', href: 'https://tool.example.com/zakat/' }]);
  assert.deepEqual(i.h1, ['Kalkulator Zakat']);
  assert.deepEqual([i.h2, i.images, i.noAlt], [1, 2, 1]);
  assert.deepEqual(i.ld, [{ ok: true, types: ['WebPage', 'WebApplication'] }]);
  assert.deepEqual(M.attrs('<meta name=robots content="noindex, follow" data-x>'), { name: 'robots', content: 'noindex, follow', 'data-x': '' });
});

test('Checks a good page', () => {
  const c = M.check(M.extract(GOOD), { keyword: 'zakat' });
  const st = Object.fromEntries(c.map(x => [x.id, x.status]));
  assert.deepEqual(st, { title: 'pass', description: 'pass', robots: 'pass', canonical: 'pass', viewport: 'pass', lang: 'pass', charset: 'pass', h1: 'pass', alt: 'warn', og: 'pass', twitter: 'pass', hreflang: 'info', jsonld: 'pass', icon: 'pass', keyword: 'pass' });
  assert.match(c.find(x => x.id === 'keyword').detail, /title, description, H1, URL/);
  assert.equal(M.score(c), 96);
});

test('Flags problems', () => {
  const bad = '<html><head><title>Hi</title><title>Again</title><meta name="robots" content="NOINDEX"><link rel="canonical" href="/x"><meta property="og:image" content="/i.jpg">' +
    '<script type="application/ld+json">{"@type": "X",}</script></head><body><h1>a</h1><h1>b</h1></body></html>';
  const c = Object.fromEntries(M.check(M.extract(bad)).map(x => [x.id, [x.status, x.detail]]));
  assert.equal(c.title[0], 'warn');
  assert.equal(c.titles[0], 'warn');
  assert.deepEqual(c.robots, ['fail', 'noindex: this page will not appear in Google.']);
  assert.deepEqual(c.canonical, ['warn', '/x: use a full URL.']);
  assert.equal(c.viewport[0], 'fail');
  assert.equal(c.description[0], 'warn');
  assert.equal(c.h1[0], 'info');
  assert.match(c.og[1], /Missing og:title, og:type, og:url/);
  assert.equal(c.ogimg[0], 'warn');
  assert.match(c.jsonld[1], /1 JSON-LD block\(s\) are invalid JSON/);
  const long = M.check(M.extract('<title>' + 'x'.repeat(70) + '</title><meta name="description" content="' + 'y'.repeat(200) + '">'));
  assert.match(long[0].detail, /70 characters: may be cut off/);
  assert.match(long[1].detail, /200 characters: will usually be cut off/);
  assert.equal(M.check(M.extract(''))[0].status, 'fail');
});

test('Preview helpers', () => {
  assert.equal(M.crumb('https://www.example.com/blog/kopi-o/?x=1'), 'example.com › blog › kopi-o');
  assert.equal(M.crumb('nope'), '');
  assert.match(M.views.serpHtml({ title: 'A <b>', url: 'https://kopi.my/menu' }), /<p class="mc-t">A &lt;b&gt;<\/p>/);
  assert.match(M.views.checksHtml([{ status: 'fail', label: 'X', detail: 'Y' }]), /class="mc-fail"/);
  assert.deepEqual(M.FACTS.title, [30, 60]);
  assert.match(M.FACTS.verified, /^\d{4}-\d{2}-\d{2}$/);
});
