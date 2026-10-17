/* JSON Formatter core. A strict RFC 8259 parser that reports the line and column of the first error in plain words,
   keeps numbers exactly as written (big integers are not rounded) and warns about duplicate keys; a repair pass for
   common mistakes (comments, trailing commas, single quotes, unquoted keys, Python literals, missing commas or
   brackets); formatting with key sorting; a tree view; JSONPath lookups; CSV export.
   UMD: module.exports in Node, window.TBBJson in the browser. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-17', safeInt: 9007199254740991, maxDepth: 1000 };
  var ESC = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
  var has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  var short = function (s) { s = String(s); return s.length > 30 ? s.slice(0, 30) + '…' : s; };

  // Line, column and a short excerpt with a caret, windowed so a one-line 1 MB file still gives a readable snippet.
  function context(src, pos) {
    var line = 1, start = 0;
    for (var i = 0; i < pos && i < src.length; i++) if (src.charCodeAt(i) === 10) { line++; start = i + 1; }
    var end = src.indexOf('\n', start);
    if (end < 0) end = src.length;
    var from = Math.max(start, pos - 40), to = Math.min(end, pos + 40);
    var pre = from > start ? '…' : '', snippet = pre + src.slice(from, to).replace(/[\t\r]/g, ' ') + (to < end ? '…' : '');
    return { line: line, col: pos - start + 1, snippet: snippet, caret: pos - from + pre.length };
  }

  function JsonError(msg, pos) { this.msg = msg; this.pos = pos; }

  function parse(src) {
    src = String(src == null ? '' : src);
    var i = 0, n = src.length, warnings = [];
    var NUM = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y, ID = /[A-Za-z_$][\w$]*/y;
    function warn(kind, pos, msg) { if (warnings.length < 50) { var c = context(src, pos); warnings.push({ kind: kind, pos: pos, line: c.line, col: c.col, msg: msg }); } }
    function fail(msg, pos) { throw new JsonError(msg, pos == null ? i : pos); }
    function where(p) { var c = context(src, p); return 'line ' + c.line + ', column ' + c.col; }
    function ws() { while (i < n) { var c = src.charCodeAt(i); if (c === 32 || c === 9 || c === 10 || c === 13) i++; else break; } }
    function unexpected(msg) {
      if (src[i] === '/' && (src[i + 1] === '/' || src[i + 1] === '*')) fail('Comments are not allowed in JSON.');
      fail(msg);
    }
    if (src.charCodeAt(0) === 0xFEFF) { i = 1; warn('bom', 0, 'A byte order mark (BOM) at the start was ignored. JSON sent between systems must not start with one.'); }

    function value(depth) {
      ws();
      if (i >= n) fail(depth ? 'The JSON ends too early: a value is missing or a bracket is not closed.' : 'The input is empty.');
      var c = src[i];
      if (c === '{') return obj(depth);
      if (c === '[') return arr(depth);
      if (c === '"') return { t: 's', v: str() };
      if (c === '-' || (c >= '0' && c <= '9')) return num();
      if (c === "'") fail('Strings must use double quotes ("), not single quotes.');
      if ('“”‘’'.indexOf(c) >= 0) fail('Curly quotes are not valid. Use straight double quotes (").');
      if (c === '+') fail('Numbers cannot start with "+".');
      if (c === '.') fail('Numbers need a digit before the decimal point (0.5, not .5).');
      ID.lastIndex = i;
      var m = ID.exec(src);
      if (m) {
        var w = m[0];
        if (w === 'true' || w === 'false' || w === 'null') { i += w.length; return { t: 'l', v: w }; }
        if (/^(true|false|null)$/i.test(w)) fail('"' + w + '" is not valid JSON. Use lowercase ' + w.toLowerCase() + '.');
        if (w === 'None') fail('"None" is not valid JSON. Use null.');
        if (w === 'undefined' || w === 'NaN' || w === 'Infinity') fail('"' + w + '" is not valid JSON. Use null or a number.');
        fail('Text must be in double quotes: "' + short(w) + '".');
      }
      if (c === '}' || c === ']') fail('Unexpected "' + c + '": a value is missing.');
      unexpected('Unexpected character "' + c + '".');
    }

    function obj(depth) {
      if (depth >= FACTS.maxDepth) fail('Nested more than ' + FACTS.maxDepth + ' levels deep.');
      var open = i++, keys = [], vals = [], seen = Object.create(null), comma = -1;
      ws();
      if (src[i] === '}') { i++; return { t: 'o', k: keys, v: vals }; }
      for (;;) {
        ws();
        if (i >= n) fail('The object opened at ' + where(open) + ' is not closed with }.');
        var c = src[i];
        if (c !== '"') {
          if (c === '}' && comma >= 0) fail('Trailing comma: remove the comma before }.', comma);
          if (c === "'") fail('Property names must use double quotes ("), not single quotes.');
          if (/[A-Za-z_$]/.test(c)) fail('Property names must be in double quotes.');
          if ('“”'.indexOf(c) >= 0) fail('Curly quotes are not valid. Use straight double quotes (").');
          unexpected('Expected a property name in double quotes.');
        }
        var kpos = i, key = str();
        if (seen[key]) warn('dup', kpos, 'Duplicate key "' + short(key) + '": most programs keep only the last value.');
        seen[key] = 1;
        ws();
        if (src[i] !== ':') {
          if (i >= n) fail('The object opened at ' + where(open) + ' is not closed with }.');
          unexpected('Expected ":" after the property name "' + short(key) + '".');
        }
        i++;
        keys.push(key);
        vals.push(value(depth + 1));
        ws();
        if (src[i] === ',') { comma = i++; continue; }
        if (src[i] === '}') { i++; return { t: 'o', k: keys, v: vals }; }
        if (i >= n) fail('The object opened at ' + where(open) + ' is not closed with }.');
        if (src[i] === '"') fail('Missing comma between properties.');
        if (src[i] === ']') fail('Expected } to close the object opened at ' + where(open) + ', found ].');
        unexpected('Expected "," or "}" after a property value.');
      }
    }

    function arr(depth) {
      if (depth >= FACTS.maxDepth) fail('Nested more than ' + FACTS.maxDepth + ' levels deep.');
      var open = i++, vals = [], comma = -1;
      ws();
      if (src[i] === ']') { i++; return { t: 'a', v: vals }; }
      for (;;) {
        ws();
        if (src[i] === ']' && comma >= 0) fail('Trailing comma: remove the comma before ].', comma);
        if (i >= n) fail('The array opened at ' + where(open) + ' is not closed with ].');
        vals.push(value(depth + 1));
        ws();
        if (src[i] === ',') { comma = i++; continue; }
        if (src[i] === ']') { i++; return { t: 'a', v: vals }; }
        if (i >= n) fail('The array opened at ' + where(open) + ' is not closed with ].');
        if (src[i] === '}') fail('Expected ] to close the array opened at ' + where(open) + ', found }.');
        if (/["{[\d-]|t|f|n/.test(src[i])) fail('Missing comma between array items.');
        unexpected('Expected "," or "]" after an array item.');
      }
    }

    function str() {
      var start = i++, out = '', from = i;
      for (;;) {
        if (i >= n) fail('The string that starts at ' + where(start) + ' is not closed with ".', start);
        var c = src.charCodeAt(i);
        if (c === 34) { out += src.slice(from, i); i++; return out; }
        if (c === 92) {
          out += src.slice(from, i);
          var e = src[i + 1];
          if (e === 'u') {
            var h = src.slice(i + 2, i + 6);
            if (!/^[0-9a-fA-F]{4}$/.test(h)) fail('Invalid \\u escape: it needs exactly 4 hex digits.');
            out += String.fromCharCode(parseInt(h, 16));
            i += 6;
          } else if (e !== undefined && has(ESC, e)) { out += ESC[e]; i += 2; }
          else fail(e === "'" ? 'Invalid escape \\\' : a single quote needs no backslash in JSON.' : 'Invalid escape "\\' + (e || '') + '" in a string.');
          from = i;
          continue;
        }
        if (c < 32) fail(c === 10 || c === 13 ? 'Line break inside a string. Write it as \\n.' : c === 9 ? 'Tab inside a string. Write it as \\t.' : 'Control character inside a string must be escaped.');
        i++;
      }
    }

    function num() {
      var s = i;
      if (src[i] === '-' && !/\d/.test(src[i + 1] || '')) {
        if (src.substr(i + 1, 8) === 'Infinity') fail('"-Infinity" is not valid JSON. Use null or a number.');
        fail('A minus sign must be followed by a digit.');
      }
      NUM.lastIndex = i;
      var raw = NUM.exec(src)[0], nx = src[i + raw.length];
      i += raw.length;
      if (nx >= '0' && nx <= '9') fail('Numbers cannot have leading zeros (write 7, not 07).', s);
      if (nx === 'x' || nx === 'X') fail('Hexadecimal numbers are not valid JSON. Use a decimal number.', s);
      if (nx === '.') fail('A decimal point must be followed by a digit.', s);
      if (nx === 'e' || nx === 'E') fail('An exponent needs digits (1e5, not 1e).', s);
      if (/^-?\d{16,}$/.test(raw) && Math.abs(Number(raw)) > FACTS.safeInt) {
        warn('big', s, raw + ' is bigger than 2^53, so JavaScript (JSON.parse) reads it as ' + String(Number(raw)) + '. This tool keeps it exact; send it as a string if other programs must keep every digit.');
      }
      return { t: 'n', v: raw };
    }

    try {
      var ast = value(0);
      ws();
      if (i < n) unexpected(src[i] === ',' ? 'Unexpected comma after the end of the JSON.' : 'Unexpected text after the end of the JSON. Only one top-level value is allowed; Fix JSON wraps several values in an array.');
      return { ok: true, ast: ast, warnings: warnings };
    } catch (e) {
      if (!(e instanceof JsonError)) throw e;
      var c = context(src, e.pos);
      return { ok: false, warnings: warnings, error: { msg: e.msg, pos: e.pos, line: c.line, col: c.col, snippet: c.snippet, caret: c.caret } };
    }
  }

  // ---------------------------------------------------------------- output
  function stringify(node, o) {
    o = o || {};
    var ind = o.indent == null ? '  ' : o.indent, nl = ind ? '\n' : '', sep = ind ? ': ' : ':', out = [];
    (function w(x, pad) {
      if (x.t === 'o' || x.t === 'a') {
        var obj = x.t === 'o', b = obj ? '{}' : '[]';
        if (!x.v.length) { out.push(b); return; }
        var idx = x.v.map(function (_, j) { return j; }), inner = pad + ind;
        if (obj && o.sortKeys) idx.sort(function (a, c) { return x.k[a] < x.k[c] ? -1 : x.k[a] > x.k[c] ? 1 : a - c; });
        out.push(b[0] + nl);
        idx.forEach(function (j, m) {
          out.push(inner + (obj ? JSON.stringify(x.k[j]) + sep : ''));
          w(x.v[j], inner);
          out.push((m < idx.length - 1 ? ',' : '') + nl);
        });
        out.push(pad + b[1]);
      } else out.push(x.t === 's' ? JSON.stringify(x.v) : x.v);
    })(node, '');
    return out.join('');
  }

  function toValue(x) {
    if (x.t === 'o') {
      var o = {};
      x.k.forEach(function (k, j) { Object.defineProperty(o, k, { value: toValue(x.v[j]), enumerable: true, writable: true, configurable: true }); });
      return o;
    }
    if (x.t === 'a') return x.v.map(toValue);
    if (x.t === 'n') return Number(x.v);
    if (x.t === 'l') return x.v === 'null' ? null : x.v === 'true';
    return x.v;
  }

  function stats(ast) {
    var s = { objects: 0, arrays: 0, keys: 0, values: 0, depth: 0 }, stack = [[ast, 1]];
    while (stack.length) {
      var p = stack.pop(), x = p[0];
      s.values++;
      if (p[1] > s.depth) s.depth = p[1];
      if (x.t === 'o' || x.t === 'a') {
        if (x.t === 'o') { s.objects++; s.keys += x.k.length; } else s.arrays++;
        for (var j = 0; j < x.v.length; j++) stack.push([x.v[j], p[1] + 1]);
      }
    }
    return s;
  }

  function bytes(s) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s).length;
    return unescape(encodeURIComponent(s)).length;
  }

  // ---------------------------------------------------------------- repair
  var LIT = { 'true': 'true', 'false': 'false', 'null': 'null', True: 'true', False: 'false', None: 'null', TRUE: 'true', FALSE: 'false', NULL: 'null', undefined: 'null', NaN: 'null', Infinity: 'null' };

  function normNum(r, fx) {
    var x = r;
    if (/^[+-]?0[xX]/.test(x)) {
      var neg = x[0] === '-', hex = x.replace(/^[+-]/, '');
      x = (neg ? '-' : '') + (typeof BigInt === 'function' ? BigInt(hex).toString() : String(parseInt(hex, 16)));
    }
    x = x.replace(/^\+/, '').replace(/^(-?)\./, '$10.').replace(/\.(?=[eE]|$)/, '').replace(/^(-?)0+(?=\d)/, '$1');
    if (x !== r) fx('Fixed number formats (leading +, . or zeros, hex).');
    return x;
  }

  // Tokens for the repair pass: values arrive as finished JSON text; punctuation as itself.
  function lex(s, fx) {
    var t = [], i = 0, n = s.length, e, m;
    var NUM = /[+-]?(?:0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/y, ID = /[A-Za-z_$À-‗†-￿][\w$À-‗†-￿]*/y;
    while (i < n) {
      var c = s[i];
      if (/\s/.test(c) || c === '﻿') { i++; continue; }
      if ((c === '/' && s[i + 1] === '/') || c === '#') { e = s.indexOf('\n', i); i = e < 0 ? n : e; fx('Removed comments.'); continue; }
      if (c === '/' && s[i + 1] === '*') { e = s.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; fx('Removed comments.'); continue; }
      if ('{}[]:,'.indexOf(c) >= 0) { t.push({ k: c }); i++; continue; }
      var curlyD = c === '“' || c === '”', curlyS = c === '‘' || c === '’';
      if (c === '"' || c === "'" || c === '`' || curlyD || curlyS) {
        var ends = curlyD ? '“”' : curlyS ? '‘’' : c, v = '', j = i + 1;
        if (c === "'") fx('Changed single quotes to double quotes.');
        else if (c === '`') fx('Changed backticks to double quotes.');
        else if (c !== '"') fx('Changed curly quotes to straight double quotes.');
        while (j < n && ends.indexOf(s[j]) < 0) {
          if (s[j] === '\\' && j + 1 < n) {
            var x = s[j + 1];
            if (x === 'u' && /^[0-9a-fA-F]{4}$/.test(s.substr(j + 2, 4))) { v += String.fromCharCode(parseInt(s.substr(j + 2, 4), 16)); j += 6; continue; }
            if (x === 'x' && /^[0-9a-fA-F]{2}$/.test(s.substr(j + 2, 2))) { v += String.fromCharCode(parseInt(s.substr(j + 2, 2), 16)); j += 4; fx('Fixed invalid escapes.'); continue; }
            if (has(ESC, x)) v += ESC[x];
            else { v += x; if (x !== "'" && x !== '`') fx('Fixed invalid escapes.'); }
            j += 2;
            continue;
          }
          if (s.charCodeAt(j) < 32) fx('Escaped line breaks and tabs inside strings.');
          v += s[j++];
        }
        if (j >= n) fx('Closed an unclosed string.');
        t.push({ k: 'v', x: JSON.stringify(v), str: true });
        i = j + 1;
        continue;
      }
      if (c === '-' && s.substr(i + 1, 8) === 'Infinity') { t.push({ k: 'v', x: 'null' }); i += 9; fx('Replaced NaN, Infinity and undefined with null.'); continue; }
      NUM.lastIndex = i;
      if (/[-+.\d]/.test(c) && (m = NUM.exec(s))) { t.push({ k: 'v', x: normNum(m[0], fx) }); i += m[0].length; continue; }
      ID.lastIndex = i;
      if ((m = ID.exec(s))) {
        var w = m[0], after = s.slice(i + w.length).match(/^\s*(.)/);
        if (has(LIT, w) && !(after && after[1] === ':')) {
          if (LIT[w] !== w) fx(LIT[w] === 'null' && w !== 'NULL' && w !== 'None' ? 'Replaced NaN, Infinity and undefined with null.' : 'Changed True, False and None to true, false and null.');
          t.push({ k: 'v', x: LIT[w] });
        } else { t.push({ k: 'v', x: JSON.stringify(w), str: true }); fx('Put double quotes around unquoted names.'); }
        i += w.length;
        continue;
      }
      fx('Removed stray characters.');
      i++;
    }
    return t;
  }

  function repair(src) {
    src = String(src == null ? '' : src);
    var fixes = [], fx = function (m) { if (fixes.indexOf(m) < 0) fixes.push(m); };
    var jp = /^\s*[A-Za-z_$][\w$.]*\s*\(([\s\S]*)\)\s*;?\s*$/.exec(src);
    if (jp) { src = jp[1]; fx('Removed the JSONP callback around the data.'); }
    var toks = lex(src, fx), out = [], st = [{ t: 'r', s: 'v', c: 0 }], roots = 0;
    var top = function () { return st[st.length - 1]; };
    var missing = function () { fx('Added null where a value was missing.'); };
    function close(f, want) {
      if (f.t === '{' && f.s === 'c') { out.push(':null'); missing(); } else if (f.t === '{' && f.s === 'v') { out.push('null'); missing(); }
      if (f.c) fx('Removed trailing commas.');
      out.push(f.t === '{' ? '}' : ']');
      if (want && want !== (f.t === '{' ? '}' : ']')) fx('Fixed mismatched brackets.');
      st.pop();
      top().s = 'a';
    }
    toks.forEach(function (k) {
      var f = top();
      if (k.k === 'v' || k.k === '{' || k.k === '[') {
        if (f.s === 'a') { if (f.t !== 'r') fx('Added missing commas.'); f.s = f.t === '{' ? 'k' : 'v'; f.c = 1; }
        if (f.c) { out.push(','); f.c = 0; if (f.t === 'r') roots++; }
        if (f.t === '{' && f.s === 'k') {
          if (k.k === 'v') { out.push(k.str ? k.x : JSON.stringify(k.x)); f.s = 'c'; return; }
          out.push('"":');
          fx('Added missing property names.');
          f.s = 'v';
        } else if (f.t === '{' && f.s === 'c') { out.push(':'); fx('Added missing colons.'); f.s = 'v'; }
        if (k.k === 'v') { out.push(k.x); f.s = 'a'; return; }
        out.push(k.k);
        st.push({ t: k.k, s: k.k === '{' ? 'k' : 'v', c: 0 });
      } else if (k.k === ',') {
        if (f.s === 'a') { f.s = f.t === '{' ? 'k' : 'v'; f.c = 1; }
        else if (f.t === '{' && f.s !== 'k') { out.push(f.s === 'c' ? ':null' : 'null'); missing(); f.s = 'k'; f.c = 1; }
        else fx('Removed extra commas.');
      } else if (k.k === ':') {
        if (f.t === '{' && f.s === 'c') { out.push(':'); f.s = 'v'; } else fx('Removed stray colons.');
      } else if (f.t === 'r') fx('Removed extra closing brackets.');
      else close(f, k.k);
    });
    if (st.length > 1) fx('Closed unclosed brackets.');
    while (st.length > 1) close(top());
    if (roots) fx('Wrapped ' + (roots + 1) + ' separate values in an array.');
    var text = roots ? '[' + out.join('') + ']' : out.join(''), p = parse(text);
    if (p.ok && p.ast.t === 's') {
      var inner = parse(p.ast.v);
      if (inner.ok && (inner.ast.t === 'o' || inner.ast.t === 'a')) { p = inner; fx('Unwrapped JSON that was saved as a string.'); }
    }
    return { ok: p.ok, ast: p.ast, error: p.error, warnings: p.warnings, fixes: fixes };
  }

  // ---------------------------------------------------------------- paths, tree, CSV, string escaping
  function pathOf(parts) {
    return '$' + parts.map(function (p) {
      return typeof p === 'number' ? '[' + p + ']' : /^[A-Za-z_$][\w$]*$/.test(p) ? '.' + p : "['" + p.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "']";
    }).join('');
  }

  function query(ast, expr) {
    expr = String(expr || '').trim();
    if (!expr) return null;
    if (expr[0] !== '$') expr = '$' + (expr[0] === '[' ? '' : '.') + expr;
    var rest = expr.slice(1), steps = [], m;
    var RX = /^(?:\.([A-Za-z_$][\w$]*|\*)|\[\s*(-?\d+|\*|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*\])/;
    while (rest) {
      if (!(m = RX.exec(rest))) return { error: 'Cannot read the path at "' + short(rest) + '". Use $.key, [0], [\'key name\'] or *.' };
      var s = m[1] != null ? m[1] : m[2];
      steps.push(s === '*' ? { all: 1 } : /^['"]/.test(s) ? { key: s.slice(1, -1).replace(/\\(.)/g, '$1') } : m[2] != null ? { idx: +s } : { key: s });
      rest = rest.slice(m[0].length);
    }
    var cur = [{ node: ast, parts: [] }];
    steps.forEach(function (st) {
      var next = [];
      cur.forEach(function (c) {
        var x = c.node;
        if (x.t !== 'o' && x.t !== 'a') return;
        if (st.all) x.v.forEach(function (v, j) { next.push({ node: v, parts: c.parts.concat([x.t === 'o' ? x.k[j] : j]) }); });
        else if (st.idx != null && x.t === 'a') { var j = st.idx < 0 ? x.v.length + st.idx : st.idx; if (x.v[j]) next.push({ node: x.v[j], parts: c.parts.concat([j]) }); }
        else if (st.key != null && x.t === 'o') { var k = x.k.lastIndexOf(st.key); if (k >= 0) next.push({ node: x.v[k], parts: c.parts.concat([st.key]) }); }
      });
      cur = next.slice(0, 1000);
    });
    return { results: cur.map(function (c) { return { path: pathOf(c.parts), node: c.node }; }) };
  }

  function cellText(x) { return x.t === 's' ? x.v : x.t === 'n' ? x.v : x.v === 'null' ? '' : x.v; }

  // Rows come from a top-level array, or the first array of objects inside a top-level object (e.g. {"data":[…]}).
  function csv(ast) {
    var rows = [ast], from = '';
    if (ast.t === 'a') rows = ast.v;
    else if (ast.t === 'o') {
      for (var j = 0; j < ast.v.length; j++) if (ast.v[j].t === 'a' && ast.v[j].v.length && ast.v[j].v.every(function (r) { return r.t === 'o'; })) { rows = ast.v[j].v; from = ast.k[j]; break; }
    }
    var cols = [], seen = Object.create(null), recs = rows.map(function (r) {
      var rec = Object.create(null);
      (function flat(x, pre) {
        if (x.t === 'o') { if (!x.v.length && pre) rec[pre] = { v: '' }; x.k.forEach(function (k, j) { flat(x.v[j], pre ? pre + '.' + k : k); }); return; }
        var key = pre || 'value';
        if (x.t === 'a') rec[key] = { v: x.v.every(function (y) { return y.t !== 'o' && y.t !== 'a'; }) ? x.v.map(cellText).join('; ') : stringify(x, { indent: '' }), s: true };
        else rec[key] = { v: cellText(x), s: x.t === 's' };
      })(r, '');
      Object.keys(rec).forEach(function (k) { if (!seen[k]) { seen[k] = 1; cols.push(k); } });
      return rec;
    });
    // Text that starts with = + - @ is prefixed with ' so spreadsheet apps do not run it as a formula (OWASP CSV injection).
    var cell = function (v, isStr) {
      v = String(v);
      if (isStr && /^[=+\-@\t\r]/.test(v)) v = "'" + v;
      return /[",\r\n]|^\s|\s$/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    var lines = [cols.map(function (c) { return cell(c, true); }).join(',')].concat(recs.map(function (r) {
      return cols.map(function (c) { return r[c] ? cell(r[c].v, r[c].s) : ''; }).join(',');
    }));
    return { text: lines.join('\r\n') + '\r\n', rows: recs.length, cols: cols.length, from: from };
  }

  function escapeText(text) { return JSON.stringify(String(text)); }
  function unescapeText(text) {
    var t = String(text).trim();
    if (t[0] !== '"') t = '"' + t + '"';
    var p = parse(t);
    if (p.ok && p.ast.t === 's') return { ok: true, text: p.ast.v };
    return { ok: false, error: p.ok ? { msg: 'This is not a single JSON string.' } : p.error };
  }

  // ---------------------------------------------------------------- HTML views shared by the build and the page
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var kb = function (n) { return n < 1024 ? n + ' B' : (n / 1024).toFixed(n < 10240 ? 2 : 1) + ' KB'; };

  function statusHtml(s, before, after) {
    return '<strong class="rb-yes">✓ Valid JSON</strong> · ' + s.keys + (s.keys === 1 ? ' key' : ' keys') + ', ' + s.values + ' values, depth ' + s.depth +
      ' · <strong>' + kb(before) + ' → ' + kb(after) + '</strong>';
  }
  function errorHtml(e) {
    return '<strong>' + (e.line ? 'Line ' + e.line + ', column ' + e.col + ': ' : '') + '</strong>' + esc(e.msg) +
      (e.snippet != null ? '<pre class="jf-snip">' + esc(e.snippet) + '\n' + new Array(e.caret + 1).join(' ') + '^</pre>' : '');
  }
  function warnHtml(list) {
    return list.map(function (w) { return '<li><strong>Line ' + w.line + ', column ' + w.col + ':</strong> ' + esc(w.msg) + '</li>'; }).join('');
  }
  // Small documents open fully; bigger ones open the first openDepth levels.
  function treeHtml(ast, max, openDepth) {
    max = max || 3000;
    if (openDepth == null) openDepth = stats(ast).values <= 300 ? 99 : 2;
    var count = 0, cut = false, out = [];
    (function w(x, label, parts, depth) {
      if (count++ >= max) return;
      var p = esc(pathOf(parts)), lab = label == null ? '' : '<span class="jt-k">' + esc(typeof label === 'number' ? label : JSON.stringify(label)) + '</span>: ';
      if (x.t === 'o' || x.t === 'a') {
        var n = x.v.length, b = x.t === 'o' ? '{}' : '[]';
        if (!n) { out.push('<div class="jt-row" data-p="' + p + '">' + lab + '<span class="jt-c">' + b + '</span></div>'); return; }
        out.push('<details' + (depth < openDepth ? ' open' : '') + '><summary data-p="' + p + '">' + lab + '<span class="jt-c">' + b[0] + ' ' + n + (x.t === 'o' ? (n === 1 ? ' key ' : ' keys ') : (n === 1 ? ' item ' : ' items ')) + b[1] + '</span></summary><div class="jt-in">');
        for (var j = 0; j < n && count < max; j++) w(x.v[j], x.t === 'o' ? x.k[j] : j, parts.concat([x.t === 'o' ? x.k[j] : j]), depth + 1);
        if (j < n) cut = true;
        out.push('</div></details>');
      } else {
        var t = x.t === 's' ? JSON.stringify(x.v) : x.v;
        out.push('<div class="jt-row" data-p="' + p + '">' + lab + '<span class="jt-' + x.t + '">' + esc(t.length > 300 ? t.slice(0, 300) + '…' : t) + '</span></div>');
      }
    })(ast, null, [], 0);
    if (cut) out.push('<p class="help">Showing the first ' + max + ' values. Use Format to see everything.</p>');
    return out.join('');
  }

  var api = {
    FACTS: FACTS, parse: parse, stringify: stringify, toValue: toValue, stats: stats, bytes: bytes, repair: repair, pathOf: pathOf, query: query,
    csv: csv, escapeText: escapeText, unescapeText: unescapeText, context: context,
    views: { statusHtml: statusHtml, errorHtml: errorHtml, warnHtml: warnHtml, treeHtml: treeHtml, esc: esc, kb: kb }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBJson = api;
})(typeof self !== 'undefined' ? self : this);
