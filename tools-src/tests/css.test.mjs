// CSS minifier: safe whitespace removal, value shortening, and the cases that must never change.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../../assets/js/css-core.js');
const min = (s, o) => C.minify(s, o).css;

test('Removes comments, whitespace and the last semicolon', () => {
  assert.equal(min('/* x */\na {\n  color : red ;\n  margin: 0 auto;\n}\n'), 'a{color:red;margin:0 auto}');
  assert.equal(min('a{color:red;;}'), 'a{color:red}');
});

test('Keeps /*! licence comments unless asked not to', () => {
  assert.equal(min('/*! MIT */a{b:c}'), '/*! MIT */a{b:c}');
  assert.equal(min('/*! MIT */a{b:c}', { keepImportant: false }), 'a{b:c}');
});

test('Selectors keep descendant spaces and lose combinator spaces', () => {
  assert.equal(min('div :first-child{a:b}'), 'div :first-child{a:b}');
  assert.equal(min('a [href]{a:b}'), 'a [href]{a:b}');
  assert.equal(min('ul > li + li ~ p , .x{a:b}'), 'ul>li+li~p,.x{a:b}');
  assert.equal(min('li:nth-child( 2n + 1 ){a:b}'), 'li:nth-child(2n+1){a:b}');
  assert.equal(min('#aabbcc{color:#AABBCC}'), '#aabbcc{color:#abc}');
  assert.equal(min('[ type = "a, b" ] , p{a:b}'), '[type="a, b"],p{a:b}');
});

test('calc() keeps the spaces around + and -', () => {
  assert.equal(min('a{width:calc( 100% - 2rem );height:calc(1px + 2 * 3px)}'), 'a{width:calc(100% - 2rem);height:calc(1px + 2*3px)}');
});

test('Strings and url() are untouched', () => {
  assert.equal(min('a{content:" ;} /* x */ "}'), 'a{content:" ;} /* x */ "}');
  assert.equal(min('a{background:url( data:image/svg+xml;utf8,<svg a="1"> )}'), 'a{background:url(data:image/svg+xml;utf8,<svg a="1">)}');
  assert.equal(min("a{background:url( 'x y.png' )}"), "a{background:url('x y.png')}");
});

test('Numbers, zero lengths and colours are shortened only where safe', () => {
  assert.equal(min('a{margin:0px 0.50em 10.0px -0.5rem;opacity:1.0}'), 'a{margin:0 .5em 10px -.5rem;opacity:1}');
  assert.equal(min('a{transition:opacity 0s;width:0%;flex:1 1 0px;transform:translate(0px)}'),
    'a{transition:opacity 0s;width:0%;flex:1 1 0px;transform:translate(0px)}');
  assert.equal(min('a{color:#FFFFFF;background:#12345678}'), 'a{color:#fff;background:#12345678}');
  assert.equal(min('a{margin:0px}', { optimize: false }), 'a{margin:0px}');
});

test('Custom properties keep their value as written', () => {
  assert.equal(min(':root{ --Gap : 0px ;--c:#FFFFFF}'), ':root{--Gap:0px;--c:#FFFFFF}');
  assert.equal(min('a{--empty: ;color:red}'), 'a{--empty: ;color:red}');
});

test('At-rules: media queries, imports, layers, keyframes and nesting', () => {
  assert.equal(min('@media screen and (min-width : 768px) , print { a { b : c } }'), '@media screen and (min-width:768px),print{a{b:c}}');
  assert.equal(min('@supports not (display:grid){a{float:left}}'), '@supports not (display:grid){a{float:left}}');
  assert.equal(min('@import url("a.css") screen;\n@charset "UTF-8";a{b:c}'), '@import url("a.css") screen;@charset "UTF-8";a{b:c}');
  assert.equal(min('@layer base, theme;@layer base{}'), '@layer base,theme;@layer base{}');
  assert.equal(min('@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }'),
    '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}');
  assert.equal(min('.card { color: red; &:hover { color: blue } }'), '.card{color:red;&:hover{color:blue}}');
  assert.equal(min('@page :first { margin: 1in }'), '@page :first{margin:1in}');
});

test('Removes empty rules, including media blocks left empty', () => {
  assert.equal(min('a{}@media print{b{}}c{d:e}'), 'c{d:e}');
  assert.equal(min('a{}', { removeEmpty: false }), 'a{}');
});

test('!important and slashes', () => {
  assert.equal(min('a{color:red ! important;font:12px / 1.5 serif}'), 'a{color:red!important;font:12px/1.5 serif}');
});

test('Reports unbalanced input instead of failing', () => {
  assert.deepEqual(C.minify('a{color:red').warnings, ['missingBrace']);
  assert.equal(C.minify('a{color:red').css, 'a{color:red}');
  assert.ok(C.minify('a{b:c}}').warnings.includes('extraBrace'));
  assert.ok(C.minify('a{content:"x}').warnings.includes('unclosedString'));
});

test('Minifying twice gives the same result, and beautify round-trips', () => {
  const once = min(C.SAMPLE);
  assert.equal(min(once), once);
  assert.equal(min(C.beautify(once).css), once);
  assert.ok(C.beautify(once).css.includes('.nav > li + li,\n.nav a:hover {\n  color: #36f !important;'));
});

test('Byte savings', () => {
  assert.deepEqual(C.saving('a { b: c; }', 'a{b:c}'), { before: 11, after: 6, saved: 5, percent: 45.5 });
  assert.equal(C.bytes('é'), 2);
});
