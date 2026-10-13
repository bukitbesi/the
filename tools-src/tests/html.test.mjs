// HTML beautifier, minifier presets, Blogger CDATA handling and the HTML checker.
// Loads the same vendored js-beautify and html-minifier-terser files the page serves.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const H = require('../../assets/js/html-core.js');

const ctx = { console, setTimeout, clearTimeout };
ctx.globalThis = ctx;
ctx.self = ctx;
vm.createContext(ctx);
for (const f of Object.values(H.VENDOR)) vm.runInContext(fs.readFileSync(new URL('../..' + f, import.meta.url), 'utf8'), ctx);
const libs = { minifier: ctx.HTMLMinifier, beautifier: ctx.jsBeautify };
const run = (code, o) => H.run(libs, code, o);
const rules = src => H.check(src).map(i => `${i.rule}@${i.line}`);

test('Beautify indents markup, inline CSS and JS with the chosen settings', async () => {
  const r = await run('<div><p>hi</p><script>if(a){b()}</script><style>a{color:red}</style></div>', { indent: '4' });
  assert.equal(r.code, '<div>\n    <p>hi</p>\n    <script>\n        if (a) {\n            b()\n        }\n    </script>\n    <style>\n        a {\n            color: red\n        }\n    </style>\n</div>\n');
  const tabs = await run('<ul><li>a</li></ul>', { indent: 'tab', endNewline: false });
  assert.equal(tabs.code, '<ul>\n\t<li>a</li>\n</ul>');
  const attrs = await run('<input type="text" name="q" id="q">', { wrapAttributes: 'force' });
  assert.equal(attrs.code, '<input type="text"\n  name="q"\n  id="q">\n');
});

test('Safe preset keeps one space between inline elements; Maximum removes optional tags and quotes', async () => {
  const src = '<p>\n  <a href="/">Home</a>\n  <a href="/blog">Blog</a>\n</p>\n<!-- note -->\n<ul>\n  <li>One</li>\n</ul>';
  // Safe never deletes whitespace, it only shortens it, so inline-block layouts cannot change.
  assert.equal((await run(src, { mode: 'minify' })).code, '<p> <a href="/">Home</a> <a href="/blog">Blog</a> </p> <ul> <li>One</li> </ul>');
  assert.equal((await run(src, { mode: 'minify', conservativeCollapse: false })).code, '<p><a href="/">Home</a> <a href="/blog">Blog</a></p><ul><li>One</li></ul>');
  assert.equal((await run(src, { mode: 'minify', preset: 'max' })).code, '<p><a href=/ >Home</a> <a href=/blog>Blog</a><ul><li>One</ul>');
  const fine = await run(src, { mode: 'minify', removeComments: false });
  assert.ok(fine.code.includes('<!-- note -->'));
});

test('Template tags and licence comments survive minification', async () => {
  const r = await run('<div>\n  {{ user.name }} <?php echo $x; ?> {% if a %}x{% endif %}\n  <!--! keep me -->\n</div>', { mode: 'minify' });
  assert.equal(r.code, '<div> {{ user.name }} <?php echo $x; ?> {% if a %}x{% endif %} <!--! keep me --> </div>');
});

test('Blogger preset keeps XML syntax and re-wraps scripts that contain < or &', async () => {
  const theme = "<b:skin><![CDATA[\nbody { color: red; }\n]]></b:skin>\n<b:widget id='Blog1' type='Blog'/>\n" +
    "<script>//<![CDATA[\nif (a && b < c) { go(); }\n//]]></script>\n<script>//<![CDATA[\nvar  x = 1;\n//]]></script>";
  const r = await run(theme, { mode: 'minify', preset: 'xml' });
  assert.equal(r.code, '<b:skin><![CDATA[\nbody { color: red; }\n]]></b:skin> <b:widget id="Blog1" type="Blog"/> ' +
    '<script>//<![CDATA[\na&&b<c&&go()\n//]]></script> <script>var x=1</script>');
  // Other presets drop the markers but never the code.
  assert.ok((await run(theme, { mode: 'minify' })).code.includes('<script>a&&b<c&&go()</script>'));
});

test('Email preset keeps Outlook conditional comments', async () => {
  const r = await run('<!--[if mso]><table><tr><td><![endif]-->\n<p>Hi</p>\n<!-- remove -->', { mode: 'minify', preset: 'email' });
  assert.equal(r.code, '<!--[if mso]><table><tr><td><![endif]--> <p>Hi</p> ');
});

test('Parse errors point at the line', async () => {
  const r = await run('<div><p>ok</p>\n<a href="x" <b>bad</b></div>', { mode: 'minify' });
  assert.equal(r.code, '');
  assert.equal(r.error.line, 2);
  assert.ok(r.error.message.startsWith('The minifier could not parse the HTML near: <a href="x"'));
});

test('Checker: unclosed, mismatched and stray tags with line numbers', () => {
  assert.deepEqual(rules('<div>\n<section>\n</div>'), ['unclosed@2']);
  assert.deepEqual(rules('<div>\n<p>x</p>\n</span>\n</div>'), ['unexpected-close@3']);
  assert.deepEqual(rules('<main>\n<div>'), ['unclosed@1', 'unclosed@2']);
  assert.deepEqual(rules('<div/>\n<span>'), ['unclosed@2', 'self-closing@1']);
});

test('Checker: follows HTML optional end tags and raw text', () => {
  assert.deepEqual(rules('<ul><li>a<li>b</ul><table><tr><td>1<td>2<tr><td>3</table><p>one<p>two<div>x</div>'), []);
  assert.deepEqual(rules('<script>if (a < b) { s = "</div><p>"; }</script><textarea aria-label="Notes"><b></textarea><br><img src=x alt="" width=1 height=1>'), []);
  assert.deepEqual(rules('<b:if cond="x"><data:post.title/><b:include name="y"/></b:if>'), []);
  assert.deepEqual(rules('<!-- <div> --><![CDATA[ <p> ]]><?php if ($a < 1) { ?>'), []);
});

test('Checker: accessibility, SEO and CLS problems', () => {
  const src = '<img src="a.png">\n<a href="/x"></a>\n<a href="/y"><img src="i.png" alt="Home" width="1" height="1"></a>\n' +
    '<button><svg></svg></button>\n<div id="a"></div><div id="a"></div>\n<input type="email">\n<label>Name <input type="text"></label>\n' +
    '<input id="q"><label for="q">Q</label>\n<iframe src="/v"></iframe>\n<center>x</center>';
  assert.deepEqual(rules(src), ['img-alt@1', 'empty-a@2', 'empty-button@4', 'duplicate-id@5', 'img-size@1', 'label@6', 'iframe-title@9', 'deprecated@10']);
});

test('Checker: page-level checks, skipped for Blogger templates', () => {
  assert.deepEqual(rules('<!DOCTYPE html><html><body><h1>a</h1><h1>b</h1></body></html>'),
    ['title@0', 'html-lang@1', 'viewport@0', 'description@0', 'h1@0']);
  assert.deepEqual(rules("<html xmlns:b='http://www.google.com/2005/gml/b'><head><b:skin></b:skin></head><body></body></html>"), []);
  assert.deepEqual(H.check(H.SAMPLE).map(i => i.rule), ['description', 'inline-handler']);
});

test('Options fall back to safe values', () => {
  const o = H.options({ mode: 'minify', preset: 'nope', indent: '3', removeComments: false });
  assert.equal(o.preset, 'safe');
  assert.equal(o.indent, '2');
  assert.equal(o.removeComments, false);
  assert.equal(o.collapseWhitespace, true);
  assert.equal(H.MINIFY_KEYS.length, 21);
  assert.deepEqual(H.summarize([{ level: 'error' }, { level: 'info' }, { level: 'info' }]), { text: 'HTML check: 1 error, 2 tips', state: 'error' });
});
