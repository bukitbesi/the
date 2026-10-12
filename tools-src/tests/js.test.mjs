// JavaScript minifier: option mapping, behaviour-preserving output, errors with positions, obfuscation.
// Loads the same vendored Terser and javascript-obfuscator files the page serves.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const J = require('../../assets/js/js-core.js');

const ctx = { console, setTimeout, clearTimeout, setInterval, clearInterval };
ctx.globalThis = ctx;
ctx.self = ctx;
vm.createContext(ctx);
for (const f of Object.values(J.VENDOR)) vm.runInContext(fs.readFileSync(new URL('../..' + f, import.meta.url), 'utf8'), ctx);
const libs = { terser: ctx.Terser, obfuscator: ctx.JavaScriptObfuscator };
const run = (code, o) => J.run(libs, code, o);

// Runs the sample widget against a fake page and returns the label it inserts.
function widget(code) {
  const inserted = [];
  const post = { textContent: 'one two three four five', parentNode: { insertBefore: el => inserted.push(el) } };
  const sandbox = {
    console: { warn() {}, log() {} },
    // High obfuscation adds a debugger-protection timer; no-op timers keep the test from hanging.
    setInterval: () => 0, setTimeout: () => 0, clearInterval() {}, clearTimeout() {},
    document: {
      querySelector: () => post,
      createElement: tag => ({ tag }),
      addEventListener: (type, fn) => fn()
    }
  };
  vm.runInNewContext(code, sandbox, { timeout: 5000 });
  return inserted.map(el => `${el.tag}.${el.className}: ${el.textContent}`);
}
const expected = widget(J.SAMPLE);

test('Default minify keeps licence, global names and console; drops comments and debugger', async () => {
  const r = await run(J.SAMPLE);
  assert.equal(r.error, undefined);
  assert.ok(r.code.startsWith('/*! Reading time widget v1.0 | MIT */\n'));
  assert.ok(!r.code.includes('Estimate reading time') && !r.code.includes('debugger'));
  assert.ok(r.code.includes('function estimateReadingTime(') && r.code.includes('function showReadingTime('));
  assert.ok(r.code.includes('console.warn'));
  assert.ok(r.code.length < J.SAMPLE.length * 0.75);
  assert.deepEqual(widget(r.code), expected);
  assert.deepEqual(expected, ['p.reading-time: 1 min read (5 words)']);
});

test('Options change the output as labelled', async () => {
  const top = await run(J.SAMPLE, { toplevel: true, dropConsole: true, comments: false });
  assert.ok(!top.code.includes('estimateReadingTime') && !top.code.includes('console') && !top.code.includes('MIT'));
  assert.deepEqual(widget(top.code), expected);
  const plain = await run('function keep(longName){return longName*2}', { mangle: false });
  assert.ok(plain.code.includes('longName'));
  const names = await run('var f=function namedFn(){return 1};class Klass{};console.log(f.name,new Klass)', { keepNames: true, toplevel: true });
  assert.ok(names.code.includes('namedFn') && names.code.includes('Klass'));
  for (const passes of [1, 2, 3]) assert.deepEqual(widget((await run(J.SAMPLE, { passes })).code), expected);
});

test('ES modules and source maps', async () => {
  const m = await run('import x from "y";\nexport const answer = x * 2;', { module: true });
  assert.equal(m.code, 'import o from"y";export const answer=2*o;');
  const s = await run('function add(a, b) { return a + b }', { sourceMap: true, fileName: 'app' });
  assert.ok(s.code.endsWith('//# sourceMappingURL=app.min.js.map'));
  const map = JSON.parse(s.map);
  assert.equal(map.file, 'app.min.js');
  assert.deepEqual(map.names, ['add', 'a', 'b']);
});

test('Syntax errors report the line and column', async () => {
  const r = await run('var a = 1;\nfunction (\n');
  assert.equal(r.code, '');
  assert.deepEqual(r.error, { message: 'Unexpected token: punc (()', line: 2, col: 9 });
  assert.equal(J.offset('var a = 1;\nfunction (\n', 2, 9), 20);
  const o = await run('var ok = 1;\nvar a = ;', { mode: 'obfuscate' });
  assert.deepEqual(o.error, { message: 'Unexpected token', line: 2, col: 8 });
});

test('Beautify formats minified code', async () => {
  const r = await run('function a(b){if(b){return 1}else{return 2}}', { mode: 'beautify' });
  assert.equal(r.code, 'function a(b) {\n  if (b) {\n    return 1;\n  } else {\n    return 2;\n  }\n}');
});

test('Obfuscation hides names and strings but still runs, at every level', async () => {
  for (const level of ['low', 'medium', 'high']) {
    const r = await run(J.SAMPLE, { mode: 'obfuscate', level });
    assert.equal(r.error, undefined, level);
    assert.ok(r.code.startsWith('/*! Reading time widget v1.0 | MIT */\n'), level);
    assert.ok(!r.code.includes('wordsPerMinute') && !r.code.includes('min read'), level);
    // Low keeps strings readable inside its string array; medium and high encode them.
    if (level !== 'low') assert.ok(!r.code.includes('reading-time'), level);
    assert.deepEqual(widget(r.code), expected, level);
  }
});

test('Obfuscator options: console stays unless removed, domains are cleaned', () => {
  assert.equal(J.obfuscatorOptions(J.options({})).disableConsoleOutput, false);
  assert.equal(J.obfuscatorOptions(J.options({ dropConsole: true })).disableConsoleOutput, true);
  assert.deepEqual(J.domainList('https://www.thebukitbesi.com/p/x.html, .blogspot.com bad_domain localhost'), ['www.thebukitbesi.com', '.blogspot.com']);
  assert.equal(J.obfuscatorOptions(J.options({ level: 'high' })).optionsPreset, 'high-obfuscation');
  assert.equal(J.options({ level: 'extreme', passes: 9, ecma: 2017 }).level, 'low');
  assert.equal(J.options({ passes: 9 }).passes, 3);
  assert.equal(J.options({ ecma: 2017 }).ecma, 2015);
});

test('Blogger wrapper and helpers', () => {
  assert.deepEqual(J.bloggerWrap('a&&b<c'), { code: '<script>//<![CDATA[\na&&b<c\n//]]></script>', unsafe: false });
  assert.equal(J.bloggerWrap('x[y[0]]>1').unsafe, true);
  assert.equal(J.licenceComments('/*! a */ /* b */ /** @license c */'), '/*! a */\n/** @license c */');
  assert.deepEqual(J.saving('a  =  1', 'a=1'), { before: 7, after: 3, saved: 4, percent: 57.1 });
});

test('Empty input returns empty output', async () => {
  assert.equal((await run('   ')).code, '');
});
