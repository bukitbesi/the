// Unused CSS remover: selector scanning, keyword matching, safelists and structural pruning.
// Exact (DOM) matching runs in the browser and is covered by the page tests; here a fake matcher stands in.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../../assets/js/purge-core.js');
const C = require('../../assets/js/css-core.js');

const clean = (css, used, opts = {}) => {
  const set = new Set(used);
  const r = P.purge([{ name: 'a.css', css }], { match: sel => set.has(sel), ...opts });
  return { css: r.files[0].css, report: r.report };
};

test('Matchable selectors drop states and pseudo-elements but keep structure and escapes', () => {
  assert.equal(P.matchable('.nav > a:hover::after'), '.nav>a');
  assert.equal(P.matchable('ul li:nth-child(2n+1):not(.x)'), 'ul li');
  assert.equal(P.matchable('.md\\:flex .w-1\\/2'), '.md\\:flex .w-1\\/2');
  assert.equal(P.matchable('input[type="text"]:focus-visible'), 'input[type="text"]');
  assert.equal(P.matchable('a :hover'), 'a *');
  assert.equal(P.matchable('::selection'), '*');
  assert.deepEqual(P.names('#app .md\\:flex[data-x="a b"] > svg'), { classes: ['md:flex'], ids: ['app'], tags: ['svg'], attrs: ['data-x'] });
});

test('Keyword matching works like PurgeCSS, including Tailwind-style names', () => {
  const m = P.keywordMatcher(P.keywords(['<div class="md:flex w-1/2 card" id="main"><svg></svg></div>', 'el.classList.add("is-open")']));
  assert.equal(m('.md\\:flex'), true);
  assert.equal(m('.w-1\\/2'), true);
  assert.equal(m('#main .card svg'), true);
  assert.equal(m('.card.is-open'), true);
  assert.equal(m('.card .missing'), false);
  assert.equal(m('table'), false);
  // Selectors inside a page's own <style> block are not evidence that they are used.
  const own = P.keywordMatcher(P.keywords(['<style>.ghost{x:1}</style><p class="real">x</p>']));
  assert.equal(own('.ghost'), false);
  assert.equal(own('.real'), true);
});

test('Removes unused rules and unused selectors from lists, cleaning @media', () => {
  const css = '.a{color:red}.b,.c{color:blue}@media (min-width:1px){.c{x:1}.d{x:2}}@supports (display:grid){.d{y:1}}';
  assert.equal(clean(css, ['.a', '.b']).css, '.a{color:red}.b{color:blue}');
  assert.equal(clean(css, ['.a', '.b'], { partial: false }).css, '.a{color:red}.b,.c{color:blue}');
  const r = clean(css, ['.a', '.b']).report;
  assert.equal(r.selectors, 6);
  assert.equal(r.selectorsRemoved, 4);
  assert.deepEqual(r.removed.map(x => x.selector), ['.c', '.c', '.d', '.d']);
});

test('Global selectors, @layer order and special at-rules are always kept', () => {
  const css = '*,::before{box-sizing:border-box}html{x:1}:root{--a:1}::selection{y:1}@layer base,theme;@layer theme{.gone{z:1}}' +
    '@property --p{syntax:"<length>";inherits:false;initial-value:0px}@page{margin:1cm}@import url(x.css);';
  assert.equal(clean(css, []).css, '*,::before{box-sizing:border-box}html{x:1}:root{--a:1}::selection{y:1}@layer base,theme;@layer theme{}' +
    '@property --p{syntax:"<length>";inherits:false;initial-value:0px}@page{margin:1cm}@import url(x.css)');
});

test('A selector the matcher cannot judge is kept', () => {
  assert.equal(clean('.a{x:1}', [], { match: () => undefined }).css, '.a{x:1}');
});

test('Unused @keyframes and @font-face go; used ones stay', () => {
  const css = '.a{animation:fade 1s;font-family:"Inter",sans-serif}@keyframes fade{to{opacity:1}}@keyframes spin{to{x:1}}' +
    '@-webkit-keyframes spin{to{x:1}}@font-face{font-family:"Inter";src:url(a.woff2)}@font-face{font-family:Icons;src:url(i.woff2)}';
  const r = clean(css, ['.a']);
  assert.equal(r.css, '.a{animation:fade 1s;font-family:"Inter",sans-serif}@keyframes fade{to{opacity:1}}@font-face{font-family:"Inter";src:url(a.woff2)}');
  assert.deepEqual(r.report.keyframes.map(k => k.name), ['spin', 'spin']);
  assert.deepEqual(r.report.fonts.map(f => f.name), ['Icons']);
  // A keyframes name that is only a prefix of a used one is still removed.
  assert.equal(clean('.a{animation:fade-in 1s}@keyframes fade{to{x:1}}', ['.a']).css, '.a{animation:fade-in 1s}');
  assert.equal(clean(css, ['.a'], { keyframes: false, fontFace: false }).css.includes('spin'), true);
});

test('Unused CSS variables are removed when asked, following chains and content', () => {
  const css = ':root{--a:red;--b:var(--a);--c:blue;--d:green;--e:1px}.x{color:var(--b)}';
  assert.equal(clean(css, ['.x']).css, css);
  assert.equal(clean(css, ['.x'], { variables: true, content: ['<div style="width:var(--e)">', "el.style.getPropertyValue('--zz')"] }).css,
    ':root{--a:red;--b:var(--a);--e:1px}.x{color:var(--b)}');
  // Removing the only user of --b also frees --a, and the emptied :root rule goes too.
  assert.equal(clean(css, [], { variables: true }).css, '');
});

test('Safelist by name, regex and presets', () => {
  const css = '.menu-open{x:1}.swiper-slide{x:1}.is-active{x:1}.wp-block-image{x:1}#keep{x:1}.gone{x:1}';
  const r = P.purge([{ name: 'a.css', css }], { match: () => false, safelist: 'menu-open /^swiper-/ #keep', safePresets: ['state', 'wordpress'] });
  assert.equal(r.files[0].css, '.menu-open{x:1}.swiper-slide{x:1}.is-active{x:1}.wp-block-image{x:1}#keep{x:1}');
  assert.equal(r.report.safelisted, 5);
  assert.equal(P.safelist('/[/')('x'), false);
});

test('A safelisted name counts as present; the rest of the selector must still match', () => {
  const css = '.nav-link.active{x:1}.dropdown-item.active{x:1}.fade{x:1}.is-valid~.valid-feedback{x:1}.navbar .show{x:1}';
  const set = new Set(['.nav-link', '.navbar *']);
  const r = P.purge([{ name: 'a.css', css }], { match: sel => set.has(sel), safePresets: ['state'] });
  assert.equal(r.files[0].css, '.nav-link.active{x:1}.fade{x:1}.navbar .show{x:1}');
  assert.equal(r.report.safelisted, 3);
});

test('Nested rules stay with their parent; parse warnings are reported', () => {
  assert.equal(clean('.card{color:red;&:hover{color:blue}.title{x:1}}', ['.card']).css, '.card{color:red;&:hover{color:blue}.title{x:1}}');
  assert.deepEqual(clean('.a{x:1', ['.a']).report.warnings, [{ source: 'a.css', warning: 'missingBrace' }]);
});

test('The sample keeps exactly what its page uses', () => {
  const r = P.purge([{ name: 's.css', css: P.SAMPLE_CSS }], { match: P.keywordMatcher(P.keywords([P.SAMPLE_HTML])), safePresets: ['state'], variables: true, content: [P.SAMPLE_HTML] });
  const out = C.minify(r.files[0].css).css;
  assert.deepEqual(r.report.removed.map(x => x.selector), ['.sidebar', '.btn-danger', '.alert-danger', '.modal', '.modal-backdrop', '.sidebar']);
  assert.deepEqual(r.report.keyframes.map(k => k.name), ['spin']);
  assert.deepEqual(r.report.fonts.map(f => f.name), ['Old Icons']);
  assert.deepEqual(r.report.variables, ['--unused-color']);
  assert.ok(out.includes('.nav-link.active,.nav-link:hover') || out.includes('.nav-link:hover,.nav-link.active'));
  assert.ok(!out.includes('sidebar') && out.includes('@media (max-width:600px){.post-title{font-size:1.5rem}}'));
  assert.ok(P.reportHtml(r.report).summary.startsWith('Report: removed 6 selectors, 1 @keyframes, 1 @font-face, 1 variable'));
});
