// Blogger Template Generator core: theme parsing, palette and WCAG guard, XML output, preview and theme audit.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const B = require('../../assets/js/blogger-core.js');
const C = require('../../assets/js/contrast-core.js');
const LITE = fs.readFileSync(new URL('../../assets/blogger/tbb-lite.xml', import.meta.url), 'utf8');
const theme = B.parseTheme(LITE);
const D = B.defaults(theme);

// Well-formedness without a dependency: every tag opens and closes in order (CDATA, comments and declarations skipped).
function wellFormed(xml) {
  const body = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<\?[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[^>]*>/i, '');
  const stack = [];
  for (const m of body.matchAll(/<(\/?)([\w:.-]+)((?:\s+[\w:.-]+=(?:'[^']*'|"[^"]*"))*)\s*(\/?)>/g)) {
    if (m[1]) { if (stack.pop() !== m[2]) return false; } else if (!m[4]) stack.push(m[2]);
  }
  if (/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)/i.test(body.replace(/<[^>]*>/g, ''))) return false;
  return stack.length === 0;
}

test('reads all 18 Theme Designer variables of TBB Lite 1.0.1 with defaults and groups', () => {
  assert.equal(theme.vars.length, 18);
  assert.deepEqual(theme.vars.map(v => v.name).slice(0, 3), ['brand.color', 'brand.ink', 'link.color']);
  assert.equal(D['brand.color'], '#e5002b');
  assert.equal(D['dark.link'], '#ff2d54');
  assert.equal(theme.vars.find(v => v.name === 'content.width').min, '960px');
  assert.equal(theme.vars.find(v => v.name === 'dark.bg').group, 'Dark mode colours');
  assert.match(LITE, /TBB Lite 1\.0\.1/);
  assert.equal(B.FACTS.theme, 'TBB Lite 1.0.1');
});

test('default colours pass WCAG AA for all 13 text pairs; the FAQ figures', () => {
  const rows = B.checks(D);
  assert.equal(rows.length, 13);
  assert.ok(rows.every(r => r.pass));
  const by = (fg, bg) => rows.find(r => r.fg === fg && r.bg === bg).text;
  assert.equal(by('link.color', 'surface.bg'), '4.73');
  assert.equal(by('dark.link', 'dark.surface'), '4.70');
  assert.equal(by('text.color', 'page.bg'), '17.71');
  // The pre-1.0.1 defaults the FAQ quotes: brand red as link text on the dark background and on light cards.
  assert.equal(C.check('#e5002b', '#0f0f12').text, '3.97');
  assert.equal(C.check('#e5002b', '#f6f6f7').text, '4.45');
});

test('palette from one brand colour: every pair passes, hue kept, button text picked or brand darkened', () => {
  for (const brand of ['#e5002b', '#2563eb', '#16a34a', '#f59e0b', '#ffeb3b', '#8b5cf6', '#06b6d4', '#ec4899', '#000000', '#ffffff', '#888888']) {
    const p = B.palette(brand);
    const fails = B.checks(p).filter(r => !r.pass);
    assert.deepEqual(fails, [], brand + ' fails ' + fails.map(f => f.label).join(', '));
  }
  const blue = B.palette('#2563eb');
  assert.equal(blue['brand.color'], '#2563eb');
  assert.equal(blue['brand.ink'], '#ffffff');
  assert.equal(B.palette('#f59e0b')['brand.ink'], '#000000');
  // Yellow links would be unreadable on white, so the light link colour is darkened in the same hue.
  const y = B.palette('#ffeb3b');
  assert.ok(C.check(y['link.color'], '#ffffff').ratio >= 4.5);
  assert.ok(Math.abs(C.rgbToHsl(C.parse(y['link.color'])).h - C.rgbToHsl(C.parse('#ffeb3b')).h) < 6);
  assert.equal(B.palette('not a colour'), null);
});

test('fixAll repairs failing pairs and lists what it changed', () => {
  const bad = { ...D, 'muted.color': '#aaaaaa', 'dark.link': '#5a0010', 'brand.ink': '#ffff00', 'brand.color': '#ffcc00' };
  const before = B.checks(bad).filter(r => !r.pass).length;
  assert.ok(before >= 4);
  const r = B.fixAll(bad);
  assert.deepEqual(B.checks(r.values).filter(x => !x.pass), []);
  assert.deepEqual(r.changed.sort(), ['brand.ink', 'dark.link', 'muted.color'].sort());
  assert.equal(r.values['brand.ink'], '#000000');
  assert.equal(B.fixAll(D).changed.length, 0);
});

test('fonts: system stacks only, size and weight kept, key read back', () => {
  assert.equal(B.fontValue('serif', 18), "normal 400 18px Charter, 'Bitstream Charter', 'Sitka Text', Cambria, Georgia, serif");
  assert.equal(B.fontKey(B.fontValue('mono', 16, 700)), 'mono');
  assert.equal(B.fontKey(D['body.font']), 'system');
  assert.equal(B.fontPx(D['body.font']), 17);
  assert.ok(B.FONTS.every(f => !/googleapis|url\(/.test(f.stack)));
});

test('menu links: label | URL, unsafe or empty lines rejected, limit applied', () => {
  const r = B.parseLinks('Home | /\nShop & Deals | /p/shop.html\nX | javascript:alert(1)\nNo url\nBlog | example.com/blog\n | /empty\nMail | mailto:a@b.co', 8);
  assert.deepEqual(r.links.map(l => l.url), ['/', '/p/shop.html', 'https://example.com/blog', 'mailto:a@b.co']);
  assert.equal(r.bad.length, 3);
  assert.equal(B.parseLinks(Array.from({ length: 12 }, (_, i) => `L${i} | /${i}`).join('\n'), 8).links.length, 8);
  assert.equal(B.safeUrl('//evil.example'), null);
});

test('build: variables, menu, pages and about text written into valid Blogger XML; credit kept', () => {
  const pal = B.palette('#2563eb');
  const out = B.build(LITE, {
    values: { ...pal, 'body.font': B.fontValue('serif', 18), 'content.width': '1200px' },
    menu: B.parseLinks('Home | /\nShop & Deals | /p/shop.html', 8).links, pages: [{ label: 'Privacy', url: '/p/privacy.html' }],
    about: 'Run by <Ali> & friends', date: '2026-11-07'
  });
  assert.ok(wellFormed(out));
  assert.ok(!wellFormed(LITE.replace('</b:section>', '')));
  assert.match(out, /<Variable name="brand\.color"[^>]*default="#2563eb" value="#2563eb"\/>/);
  assert.match(out, /<Variable name="body\.font"[^>]*value="normal 400 18px Charter, 'Bitstream Charter'/);
  assert.match(out, /<Variable name="content\.width"[^>]*default="1200px" value="1200px" min="960px" max="1400px"|<Variable name="content\.width"[^>]*min="960px" max="1400px" value="1200px"/);
  assert.match(out, /<b:widget-setting name='text-1'>Shop &amp; Deals<\/b:widget-setting>/);
  assert.doesNotMatch(out, /name='text-2'>Contact<\/b:widget-setting>\s*<b:widget-setting name='link-2'>\/p\/contact\.html<\/b:widget-setting>\s*<\/b:widget-settings>\s*<b:includable id='main' var='this'>\s*<nav/);
  assert.match(out, /Run by &lt;Ali&gt; &amp; friends/);
  assert.match(out, /Customised with the Blogger Template Generator .* on 2026-11-07/);
  assert.match(out, /rel='nofollow'>TBB Lite<\/a>/);
  assert.equal(B.parseTheme(out).vars.length, 18);
  assert.equal(B.build(LITE, { values: {} }).replace(/\n  Customised[^\n]*/, ''), LITE);
});

test('preview: real theme CSS with chosen values; dark mode applied without the media query', () => {
  const v = { ...D, 'brand.color': '#123456' };
  const light = B.previewCss(theme, v, false), dark = B.previewCss(theme, v, true);
  assert.match(light, /--tbb-brand:#123456/);
  assert.match(dark, /--tbb-bg:#0f0f12/);
  assert.doesNotMatch(dark, /prefers-color-scheme:dark/);
  assert.doesNotMatch(light, /\$\(/);
  const doc = B.previewDoc(light, { title: 'Kedai <Ali>', lang: 'ms', view: 'post' });
  assert.match(doc, /Kedai &lt;Ali&gt;/);
  assert.match(doc, /Cara merancang bajet bulanan/);
  assert.doesNotMatch(doc, /<script/);
});

test('audit: TBB Lite scores 100; a legacy theme is graded with fixes', () => {
  const lite = B.audit(LITE);
  assert.equal(lite.score, 100);
  assert.equal(lite.grade, 'A');
  assert.equal(lite.items.length, 13);
  assert.equal(lite.items.reduce((t, i) => t + i.weight, 0), 100);
  const legacy = B.audit(`<?xml version="1.0"?><html b:version='2' xmlns:b='http://www.google.com/2005/gml/b'><head>
<b:include data='blog' name='all-head-content'/><link rel='canonical' href='x'/>
<script src='https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js'></script><script src='https://example.com/slider.js'></script>
<link href='https://fonts.googleapis.com/css2?family=Poppins' rel='stylesheet'/><link href='https://use.fontawesome.com/releases/v6/css/all.css' rel='stylesheet'/>
<b:skin><![CDATA[body{}]]></b:skin></head><body></body></html>`);
  const st = Object.fromEntries(legacy.items.map(i => [i.id, i.status]));
  assert.deepEqual(st, { size: 'pass', blocking: 'fail', jquery: 'fail', iconfont: 'warn', css: 'warn', canonical: 'fail', description: 'pass', viewport: 'fail', schema: 'warn', noindex: 'warn', lazy: 'warn', layouts: 'warn', bcss: 'warn' });
  assert.equal(legacy.score, 35);
  assert.deepEqual(B.audit(B.LEGACY_SAMPLE).items.map(i => i.status), legacy.items.map(i => i.status));
  assert.equal(B.audit(B.LEGACY_SAMPLE).score, 35);
  assert.equal(legacy.grade, 'F');
  assert.match(legacy.items.find(i => i.id === 'canonical').fix, /all-head-content include already prints one/);
  assert.deepEqual(legacy.hosts.map(h => h[0]).sort(), ['ajax.googleapis.com', 'example.com', 'fonts.googleapis.com', 'use.fontawesome.com']);
  // Deferred and JSON-LD scripts are not render-blocking.
  assert.equal(B.audit(`<html xmlns:b='x'><head><script defer='defer' src='a.js'></script><script async='async' src='b.js'></script><b:skin><![CDATA[]]></b:skin></head></html>`).items.find(i => i.id === 'blocking').value, 0);
  assert.equal(B.audit('<html><body>not a theme</body></html>').valid, false);
  assert.equal(B.audit(LITE, { wellFormed: false }).valid, false);
});

test('views: contrast rows, summary and audit report in English and Malay', () => {
  const rows = B.checks({ ...D, 'dark.link': '#5a0010' });
  assert.match(B.views.checksHtml(rows, 'en'), /<td class="rb-no">Fail<\/td>/);
  assert.match(B.views.checksSummary(rows, 'en'), /^2 of 13 text pairs fail/);
  assert.match(B.views.checksHtml(rows, 'ms'), /Pautan pada kad/);
  assert.match(B.views.checksSummary(B.checks(D), 'ms'), /Kesemua 13 pasangan/);
  const html = B.views.auditHtml(B.audit(LITE), 'en');
  assert.match(html, /<b>100<\/b>\/100/);
  assert.match(B.views.auditHtml(B.audit(LITE), 'ms'), /Skor kelajuan dan SEO/);
  assert.equal(B.bytes('é😀'), 6);
});
