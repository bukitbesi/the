/* CSS minifier and beautifier shared by the CSS Minifier page, the build and the tests.
   Tokenizes first, so strings, url() values and comments are never altered by accident, then parses
   into a light tree of blocks and declarations. Only transforms that cannot change rendering are applied:
   spaces around + and - are kept (calc()), units are never dropped from 0s / 0% / custom properties,
   and colours are shortened only in declaration values, never in selectors such as #aabbcc.
   Note: the build strips comment blocks from bundles, so comment delimiters are built from SL + ST. */
(function (root) {
  'use strict';

  var SL = '/', ST = '*';
  var OPEN = SL + ST, CLOSE = ST + SL;
  var PUNCT = '{};:,()>+~!/[]=*';
  var LENGTH = /^(-?)(?:0*\.?0+)(px|em|rem|ex|ch|vw|vh|vmin|vmax|cm|mm|in|pt|pc|q)$/i;
  // Values where a unitless 0 is not equivalent (or not valid) for a length.
  var KEEP_ZERO_UNIT = /^(?:flex|flex-basis|-webkit-flex|-ms-flex)$/i;

  function tokenize(src) {
    var t = [], i = 0, n = src.length, warn = [];
    while (i < n) {
      var c = src[i];
      if (c === SL && src[i + 1] === ST) {
        var e = src.indexOf(CLOSE, i + 2);
        if (e < 0) { warn.push('unclosedComment'); e = n; }
        t.push({ k: 'comment', v: src.slice(i, Math.min(n, e + 2)) });
        i = e + 2;
      } else if (c === '"' || c === "'") {
        var j = i + 1;
        while (j < n && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
        if (j >= n || src[j] !== c) warn.push('unclosedString');
        t.push({ k: 'str', v: src.slice(i, Math.min(n, j + 1)) });
        i = j + 1;
      } else if (/\s/.test(c)) {
        while (i < n && /\s/.test(src[i])) i++;
        t.push({ k: 'ws', v: ' ' });
      } else if (PUNCT.indexOf(c) >= 0) {
        t.push({ k: 'p', v: c });
        i++;
      } else {
        var s = i;
        while (i < n && !/\s/.test(src[i]) && PUNCT.indexOf(src[i]) < 0 && src[i] !== '"' && src[i] !== "'" && !(src[i] === SL && src[i + 1] === ST)) i += src[i] === '\\' ? 2 : 1;
        var word = src.slice(s, i);
        // Unquoted url(...) is one token: its contents may hold characters that look like punctuation.
        if (/^url$/i.test(word) && src[i] === '(') {
          var k = i + 1;
          while (k < n && /\s/.test(src[k])) k++;
          if (src[k] !== '"' && src[k] !== "'") {
            var close = src.indexOf(')', k);
            if (close < 0) { warn.push('unclosedUrl'); close = n; }
            t.push({ k: 'w', v: word + '(' + src.slice(k, close).trim() + ')' });
            i = close + 1;
            continue;
          }
        }
        t.push({ k: 'w', v: word });
      }
    }
    return { tokens: t, warnings: warn };
  }

  // Tree: { items: [...] } where an item is a block {prelude, items}, a declaration or statement {text}, or a kept comment.
  function parse(tokens, o) {
    var top = { items: [] }, stack = [top], buf = [], depth = 0, warn = [];
    var cur = function () { return stack[stack.length - 1]; };
    function flush(kind) {
      var hasContent = buf.some(function (x) { return x.k !== 'ws'; });
      if (hasContent) cur().items.push({ tokens: buf, end: kind });
      buf = [];
    }
    tokens.forEach(function (tk) {
      if (tk.k === 'comment') {
        if (o.keepComments || (o.keepImportant && tk.v.charAt(2) === '!')) { if (!buf.some(function (x) { return x.k !== 'ws'; })) cur().items.push({ comment: tk.v }); }
        else buf.push({ k: 'gap' });
        return;
      }
      if (tk.k === 'p' && tk.v === '(') depth++;
      if (tk.k === 'p' && tk.v === ')') depth = Math.max(0, depth - 1);
      if (tk.k === 'p' && depth === 0 && (tk.v === '{' || tk.v === '}' || tk.v === ';')) {
        if (tk.v === '{') {
          var block = { prelude: buf, items: [] };
          buf = [];
          cur().items.push(block);
          stack.push(block);
        } else if (tk.v === ';') {
          flush(';');
        } else {
          flush('}');
          if (stack.length > 1) stack.pop(); else warn.push('extraBrace');
        }
        return;
      }
      buf.push(tk);
    });
    flush('eof');
    if (stack.length > 1) warn.push('missingBrace');
    return { tree: top, warnings: warn };
  }

  // A removed comment between two words must still separate them.
  function clean(tokens) {
    var out = [];
    tokens.forEach(function (tk, i) {
      if (tk.k === 'gap') {
        var prev = out[out.length - 1], next = tokens[i + 1];
        if (prev && next && prev.k !== 'ws' && next.k !== 'ws') out.push({ k: 'ws', v: ' ' });
        return;
      }
      if (tk.k === 'ws' && out.length && out[out.length - 1].k === 'ws') return;
      out.push(tk);
    });
    while (out.length && out[0].k === 'ws') out.shift();
    while (out.length && out[out.length - 1].k === 'ws') out.pop();
    return out;
  }

  // Joins tokens, dropping a space only where the neighbour on either side is in `tight`.
  function join(tokens, tight, parenTight) {
    var s = '', depth = 0;
    tokens.forEach(function (tk, i) {
      if (tk.k === 'p' && tk.v === '(') depth++;
      if (tk.k === 'p' && tk.v === ')') depth--;
      if (tk.k !== 'ws') { s += tk.v; return; }
      var a = tokens[i - 1], b = tokens[i + 1];
      var set = depth > 0 && parenTight ? parenTight : tight;
      var drop = (a.k === 'p' && set.indexOf(a.v) >= 0 && a.v !== ')') || (b.k === 'p' && set.indexOf(b.v) >= 0 && b.v !== '(');
      // "and (" must keep its space or it becomes a function call; ") and" keeps its space too.
      if (b.k === 'p' && b.v === '(' && a.k === 'w') drop = false;
      if (a.k === 'p' && (a.v === '(' || a.v === '[' || a.v === '=')) drop = true;
      if (b.k === 'p' && (b.v === ')' || b.v === ']' || b.v === '=')) drop = true;
      if (!drop) s += ' ';
    });
    return s;
  }

  // Beautifier spacing: one space after commas, around selector combinators and before !important.
  function spaced(tokens, kind) {
    var s = '', depth = 0, gap = false, a = null;
    tokens.forEach(function (b) {
      if (b.k === 'ws') { gap = true; return; }
      if (a) {
        var sp = gap;
        var ap = a.k === 'p' ? a.v : '', bp = b.k === 'p' ? b.v : '';
        if (kind === 'sel' && ('>+~'.indexOf(ap) >= 0 && ap || '>+~'.indexOf(bp) >= 0 && bp)) sp = true;
        if (kind === 'val' && bp === '!') sp = true;
        if (kind === 'val' && ap === '!') sp = false;
        if (kind === 'at' && ap === ':' && depth > 0) sp = true;
        if (ap === ',') sp = true;
        if (bp === ',' || ap === '(' || ap === '[' || bp === ')' || bp === ']' || (kind === 'at' && bp === ':' && depth > 0)) sp = false;
        if (sp) s += ' ';
      }
      if (b.k === 'p' && (b.v === '(' || b.v === '[')) depth++;
      if (b.k === 'p' && (b.v === ')' || b.v === ']')) depth--;
      s += b.v;
      a = b;
      gap = false;
    });
    return s;
  }

  function shortNumber(w) {
    var m = /^([+-]?)(\d*)\.(\d+)([a-z%]*)$/i.exec(w);
    if (!m) return w;
    var int = m[2].replace(/^0+(?=\d)/, ''), frac = m[3].replace(/0+$/, '');
    if (int === '0') int = '';
    var num = int + (frac ? '.' + frac : '');
    if (!num) num = '0';
    return m[1] + num + m[4];
  }

  function shortColor(w) {
    var m = /^#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3$/i.exec(w);
    return (m ? '#' + m[1] + m[2] + m[3] : w).toLowerCase();
  }

  function declaration(tokens, o) {
    var colon = -1, depth = 0;
    for (var i = 0; i < tokens.length; i++) {
      var tk = tokens[i];
      if (tk.k === 'p' && tk.v === '(') depth++;
      if (tk.k === 'p' && tk.v === ')') depth--;
      if (tk.k === 'p' && tk.v === ':' && depth === 0) { colon = i; break; }
    }
    var custom = tokens[0] && tokens[0].k === 'w' && tokens[0].v.slice(0, 2) === '--';
    if (colon < 0 || tokens[0].k !== 'w' || /^@/.test(tokens[0].v)) return { text: join(tokens, ',;', ',;'), statement: true };
    var prop = clean(tokens.slice(0, colon)).map(function (x) { return x.v; }).join('');
    var value = clean(tokens.slice(colon + 1));
    // An empty custom property needs one space ("--x: ;"): older browsers reject "--x:;".
    if (custom) return { prop: prop, value: value.map(function (x) { return x.v; }).join('').trim() || ' ' };
    if (!/^--/.test(prop)) prop = prop.toLowerCase();
    if (o.optimize) {
      var d = 0;
      value = value.map(function (tk, idx) {
        if (tk.k === 'p' && tk.v === '(') d++;
        if (tk.k === 'p' && tk.v === ')') d--;
        if (tk.k !== 'w') return tk;
        var v = tk.v;
        if (/^#[0-9a-f]{3,8}$/i.test(v)) v = shortColor(v);
        else if (/^[+-]?\d*\.\d/.test(v)) v = shortNumber(v);
        // 0px -> 0 only outside functions (calc() needs units) and where 0 is a valid length.
        if (d === 0 && LENGTH.test(v) && !KEEP_ZERO_UNIT.test(prop)) v = '0';
        return { k: 'w', v: v };
      });
    }
    // Space before "!important" and around / , is never needed; + and - keep theirs for calc().
    var text = o.pretty ? spaced(value, 'val') : join(value, ',/!', ',/!*');
    return { prop: prop, value: text.replace(/!\s*important/i, '!important') };
  }

  // Returns the prelude split at top-level commas, so the beautifier can put one selector per line.
  function prelude(tokens, pretty) {
    var t = clean(tokens), at = t[0] && t[0].k === 'w' && t[0].v.charAt(0) === '@';
    var parts = [[]], depth = 0;
    t.forEach(function (tk) {
      if (tk.k === 'p' && (tk.v === '(' || tk.v === '[')) depth++;
      if (tk.k === 'p' && (tk.v === ')' || tk.v === ']')) depth--;
      if (tk.k === 'p' && tk.v === ',' && depth === 0) { parts.push([]); return; }
      parts[parts.length - 1].push(tk);
    });
    // Selectors: combinators need no spaces; a space before ":", "[", "." or "*" is a descendant combinator.
    // At-rules keep "@page :first" and "and (" intact, and tighten only inside parentheses.
    return parts.map(function (p) {
      p = clean(p);
      if (pretty) return spaced(p, at ? 'at' : 'sel');
      return at ? join(p, ',', ',:') : join(p, '>+~', ',>+~');
    });
  }

  function build(node, o) {
    var out = [];
    node.items.forEach(function (it) {
      if (it.comment) { out.push({ comment: it.comment }); return; }
      if (it.prelude) {
        var p = prelude(it.prelude, o.pretty), kids = build(it, o);
        var keepEmpty = /^@layer\b/i.test(p[0]);
        if (o.removeEmpty && !kids.length && !keepEmpty) return;
        out.push({ prelude: p, items: kids });
        return;
      }
      var t = clean(it.tokens);
      if (!t.length) return;
      out.push(declaration(t, o));
    });
    return out;
  }

  function serialize(items, indent, pretty) {
    var pad = pretty ? new Array(indent + 1).join('  ') : '';
    var out = '';
    items.forEach(function (it, i) {
      var prev = items[i - 1];
      if (pretty) {
        if (i) out += prev.prelude && !it.comment || it.prelude && !prev.comment ? '\n\n' : '\n';
      } else if (prev && !prev.prelude && !prev.comment) {
        // A semicolon only separates; the last one in a block is dropped.
        out += ';';
      }
      if (it.comment) out += pad + it.comment;
      else if (it.prelude) {
        var head = it.prelude.join(pretty ? ',\n' + pad : ',');
        if (!it.items.length) out += pad + head + (pretty ? ' {}' : '{}');
        else out += pretty ? pad + head + ' {\n' + serialize(it.items, indent + 1, true) + '\n' + pad + '}'
          : head + '{' + serialize(it.items, 0, false) + '}';
      } else {
        out += pad + (it.statement ? it.text : it.prop + (pretty ? ': ' : ':') + it.value) + (pretty ? ';' : '');
      }
    });
    return out;
  }

  function process(src, opts, pretty) {
    var o = { keepImportant: true, optimize: true, removeEmpty: true };
    for (var k in opts || {}) o[k] = opts[k];
    o.pretty = pretty;
    var tk = tokenize(String(src || ''));
    var parsed = parse(tk.tokens, o);
    var tree = build(parsed.tree, o);
    var css = serialize(tree, 0, pretty);
    return { css: pretty ? css + (css ? '\n' : '') : css, warnings: tk.warnings.concat(parsed.warnings) };
  }

  var minify = function (src, opts) { return process(src, opts, false); };
  var beautify = function (src, opts) { return process(src, Object.assign({ optimize: false, removeEmpty: false, keepComments: true }, opts), true); };
  var bytes = function (s) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s).length;
    return unescape(encodeURIComponent(s)).length;
  };
  var saving = function (before, after) {
    var a = bytes(before), b = bytes(after);
    return { before: a, after: b, saved: a - b, percent: a ? Math.round((a - b) / a * 1000) / 10 : 0 };
  };

  var SAMPLE = [
    OPEN + '! Theme v1.2 | MIT licence ' + CLOSE,
    OPEN + ' Header ' + CLOSE,
    '.site-header {',
    '  background-color: #FFFFFF;',
    '  padding: 0px 16px;',
    '  margin: 0.50em auto;',
    '  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);',
    '}',
    '',
    '.nav > li + li ,',
    '.nav a:hover {',
    '  color : #3366ff !important;',
    '  width: calc(100% - 2rem);',
    '}',
    '',
    '.unused { }',
    '',
    '@media screen and (min-width: 768px) {',
    '  .site-header {',
    '    padding: 0px 32px;',
    '  }',
    '}',
    ''
  ].join('\n');

  var api = { minify: minify, beautify: beautify, bytes: bytes, saving: saving, SAMPLE: SAMPLE };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBCss = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
