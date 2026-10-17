// JSON Formatter core: agrees with JSON.parse on valid and invalid input, reports line and column, keeps big
// numbers exact, repairs common mistakes, formats like JSON.stringify, and exports paths, tree and CSV.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const J = require('../../assets/js/json-core.js');

const VALID = ['0', '-0', '1.5e-3', '"a\\u00e9\\n\\/"', 'true', 'null', '[]', '{}', ' [1, [2, [3, {}]], "x"] ', '{"a":{"b":[true,false,null]},"":""}',
  '{"__proto__": 1, "constructor": 2}', '{"a":1,"a":2}', '"\\ud83d\\ude00"', '[-1.25E+10, 0.0, 1e0]', '{"k":"tab\\tquote\\"slash\\\\"}'];
const INVALID = ['', ' ', '{', '[1,]', '{"a":1,}', "{'a':1}", '{a:1}', '01', '1.', '.5', '+1', '0x10', 'NaN', 'True', '[1 2]', '{"a" 1}', '"a\nb"',
  '"\\x41"', '"\\u12"', '{"a":1}{}', '[1]]', '{"a":1]', '[1}', '// c\n1', '1e', '-', 'undefined', '"open', '“q”', '[,1]', '{,}'];

test('Agrees with JSON.parse', () => {
  for (const s of VALID) {
    const p = J.parse(s);
    assert.ok(p.ok, s + ' ' + JSON.stringify(p.error));
    assert.deepEqual(J.toValue(p.ast), JSON.parse(s), s);
    const out = J.stringify(p.ast, { indent: '  ' });
    assert.deepEqual(JSON.parse(out), JSON.parse(s), s);
    // Numbers keep their written form (-0, 0.0, 1e0) and duplicate keys stay (with a warning), so only number-plain inputs match JSON.stringify byte for byte.
    if (!/-0|\.0|[eE]|"a":1,"a"/.test(s)) assert.equal(out, JSON.stringify(JSON.parse(s), null, 2), s);
  }
  for (const s of INVALID) {
    assert.throws(() => JSON.parse(s), undefined, 'JSON.parse accepted ' + s);
    assert.equal(J.parse(s).ok, false, 'accepted ' + JSON.stringify(s));
  }
});

test('Errors give line, column and a plain reason', () => {
  const e = J.parse('{\n  "name": "Ali",\n  "age": 30,\n}').error;
  assert.deepEqual([e.line, e.col, e.msg], [3, 12, 'Trailing comma: remove the comma before }.']);
  assert.match(J.parse("{'a': 1}").error.msg, /double quotes/);
  assert.match(J.parse('{a: 1}').error.msg, /Property names must be in double quotes/);
  assert.match(J.parse('{"a": 1 "b": 2}').error.msg, /Missing comma between properties/);
  assert.match(J.parse('[1, 2 3]').error.msg, /Missing comma between array items/);
  assert.match(J.parse('{"a": True}').error.msg, /Use lowercase true/);
  assert.match(J.parse('{"a": 1} // note').error.msg, /Comments are not allowed/);
  assert.match(J.parse('{"t": "one\ntwo"}').error.msg, /Line break inside a string/);
  assert.match(J.parse('[1, 2').error.msg, /array opened at line 1, column 1 is not closed/);
  assert.match(J.parse('{"n": 07}').error.msg, /leading zeros/);
  const v = J.parse('x'.repeat(200) ).error;
  assert.ok(v.snippet.length <= 45 && v.caret === 0);
  const far = J.parse('[' + '1,'.repeat(100) + 'x]').error;
  assert.equal(far.snippet[far.caret], 'x');
});

test('Keeps numbers exactly and warns about precision and duplicates', () => {
  const p = J.parse('{"id": 12345678901234567890, "price": 2.50, "id": 1}');
  assert.equal(J.stringify(p.ast, { indent: '' }), '{"id":12345678901234567890,"price":2.50,"id":1}');
  assert.deepEqual(p.warnings.map(w => w.kind), ['big', 'dup']);
  assert.match(p.warnings[0].msg, /reads it as 12345678901234567000/);
  assert.equal(J.parse('[9007199254740991]').warnings.length, 0);
  assert.equal(J.parse('﻿{}').warnings[0].kind, 'bom');
});

test('Formats, minifies and sorts keys', () => {
  const p = J.parse('{"b":1,"a":{"d":[],"c":{}},"B":[1,2]}');
  assert.equal(J.stringify(p.ast, { indent: '' }), '{"b":1,"a":{"d":[],"c":{}},"B":[1,2]}');
  assert.equal(J.stringify(p.ast, { indent: '\t', sortKeys: true }), '{\n\t"B": [\n\t\t1,\n\t\t2\n\t],\n\t"a": {\n\t\t"c": {},\n\t\t"d": []\n\t},\n\t"b": 1\n}');
  assert.deepEqual(J.stats(p.ast), { objects: 3, arrays: 2, keys: 5, values: 8, depth: 3 });
  assert.equal(J.bytes('é😀'), 6);
});

test('Repairs common mistakes', () => {
  const fix = s => { const r = J.repair(s); return [r.ok ? J.stringify(r.ast, { indent: '' }) : null, r.fixes]; };
  assert.deepEqual(fix('{"a": 1,}')[0], '{"a":1}');
  assert.deepEqual(fix("{'name': 'Ali', age: 30, ok: True, x: None, // note\n n: NaN}")[0], '{"name":"Ali","age":30,"ok":true,"x":null,"n":null}');
  assert.deepEqual(fix('{"a": 1 "b": 2}'), ['{"a":1,"b":2}', ['Added missing commas.']]);
  assert.deepEqual(fix('[1, 2, 3')[0], '[1,2,3]');
  assert.deepEqual(fix('{"a": [1, 2}')[0], '{"a":[1,2]}');
  assert.deepEqual(fix('{"a": +.5, "b": 007, "c": 0x1F, "d": 5.}')[0], '{"a":0.5,"b":7,"c":31,"d":5}');
  assert.deepEqual(fix('{"t": "one\ntwo", "q": “hi”}')[0], '{"t":"one\\ntwo","q":"hi"}');
  assert.deepEqual(fix('{"a":1}\n{"a":2}'), ['[{"a":1},{"a":2}]', ['Wrapped 2 separate values in an array.']]);
  assert.deepEqual(fix('callback({"a":1});')[0], '{"a":1}');
  assert.deepEqual(fix('"{\\"a\\":1}"'), ['{"a":1}', ['Unwrapped JSON that was saved as a string.']]);
  assert.deepEqual(fix('{"a": , "b":}')[0], '{"a":null,"b":null}');
  assert.deepEqual(fix('{"a":1}'), ['{"a":1}', []]);
  assert.equal(J.repair('').ok, false);
});

test('Paths, JSONPath queries and the tree view', () => {
  const p = J.parse('{"store":{"book":[{"title":"A","price":8},{"title":"B","price":12}]},"my key":"x"}').ast;
  assert.equal(J.pathOf(['store', 'book', 0, 'my key']), "$.store.book[0]['my key']");
  assert.deepEqual(J.query(p, '$.store.book[*].price').results.map(r => [r.path, r.node.v]), [['$.store.book[0].price', '8'], ['$.store.book[1].price', '12']]);
  assert.equal(J.query(p, 'store.book[-1].title').results[0].node.v, 'B');
  assert.equal(J.query(p, "$['my key']").results[0].node.v, 'x');
  assert.equal(J.query(p, '$.nope').results.length, 0);
  assert.match(J.query(p, '$..x').error, /Cannot read the path/);
  const html = J.views.treeHtml(p);
  assert.match(html, /data-p="\$\.store\.book\[1\]\.title"/);
  assert.match(J.views.treeHtml(J.parse('[' + '1,'.repeat(20) + '1]').ast, 5), /first 5 values/);
});

test('CSV export with nested keys, quoting and formula safety', () => {
  const p = J.parse('{"data":[{"name":"Ali, Abu","tags":["a","b"],"addr":{"city":"KL"},"n":1},{"name":"=SUM(A1)","note":"say \\"hi\\"","n":null}]}').ast;
  const c = J.csv(p);
  assert.equal(c.text, 'name,tags,addr.city,n,note\r\n"Ali, Abu",a; b,KL,1,\r\n\'=SUM(A1),,,,"say ""hi"""\r\n');
  assert.deepEqual([c.rows, c.cols, c.from], [2, 5, 'data']);
  assert.equal(J.csv(J.parse('[1,"x"]').ast).text, 'value\r\n1\r\nx\r\n');
  assert.equal(J.csv(J.parse('[{"n":-5}]').ast).text, 'n\r\n-5\r\n');
});

test('Escape and unescape JSON strings', () => {
  const t = '{"a": "line\nbreak"}';
  assert.equal(J.escapeText(t), JSON.stringify(t));
  assert.equal(J.unescapeText(J.escapeText(t)).text, t);
  assert.equal(J.unescapeText('{\\"a\\":1}').text, '{"a":1}');
  assert.equal(J.unescapeText('"bad\\q"').ok, false);
  assert.match(J.FACTS.verified, /^\d{4}-\d{2}-\d{2}$/);
});
