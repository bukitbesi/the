(function (root) {
'use strict';
var SL = '/', ST = '*';
var OPEN = SL + ST, CLOSE = ST + SL;
var PUNCT = '{};:,()>+~!/[]=*';
var LENGTH = /^(-?)(?:0*\.?0+)(px|em|rem|ex|ch|vw|vh|vmin|vmax|cm|mm|in|pt|pc|q)$/i;
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
function join(tokens, tight, parenTight) {
var s = '', depth = 0;
tokens.forEach(function (tk, i) {
if (tk.k === 'p' && tk.v === '(') depth++;
if (tk.k === 'p' && tk.v === ')') depth--;
if (tk.k !== 'ws') { s += tk.v; return; }
var a = tokens[i - 1], b = tokens[i + 1];
var set = depth > 0 && parenTight ? parenTight : tight;
var drop = (a.k === 'p' && set.indexOf(a.v) >= 0 && a.v !== ')') || (b.k === 'p' && set.indexOf(b.v) >= 0 && b.v !== '(');
if (b.k === 'p' && b.v === '(' && a.k === 'w') drop = false;
if (a.k === 'p' && (a.v === '(' || a.v === '[' || a.v === '=')) drop = true;
if (b.k === 'p' && (b.v === ')' || b.v === ']' || b.v === '=')) drop = true;
if (!drop) s += ' ';
});
return s;
}
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
if (d === 0 && LENGTH.test(v) && !KEEP_ZERO_UNIT.test(prop)) v = '0';
return { k: 'w', v: v };
});
}
var text = o.pretty ? spaced(value, 'val') : join(value, ',/!', ',/!*');
return { prop: prop, value: text.replace(/!\s*important/i, '!important') };
}
function prelude(tokens, pretty) {
var t = clean(tokens), at = t[0] && t[0].k === 'w' && t[0].v.charAt(0) === '@';
var parts = [[]], depth = 0;
t.forEach(function (tk) {
if (tk.k === 'p' && (tk.v === '(' || tk.v === '[')) depth++;
if (tk.k === 'p' && (tk.v === ')' || tk.v === ']')) depth--;
if (tk.k === 'p' && tk.v === ',' && depth === 0) { parts.push([]); return; }
parts[parts.length - 1].push(tk);
});
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
(function () {
'use strict';
var C = window.TBBCss;
var form = document.getElementById('cssForm');
if (!C || !form) return;
var $ = function (id) { return document.getElementById(id); };
var input = $('cssIn'), output = $('cssOut'), stats = $('cssStats'), warn = $('cssWarn'), live = $('cssLive');
var STORE = 'tbb-css-opts', LIVE_MAX = 300000;
var fileName = 'style', timer = 0, gzRun = 0;
var WARN = {
unclosedComment: 'A comment is never closed.',
unclosedString: 'A quoted string is not closed.',
unclosedUrl: 'A url( is not closed with ).',
missingBrace: 'A { block is not closed; a closing } was added.',
extraBrace: 'An extra } was found and ignored.'
};
var kb = function (n) { return n < 1024 ? n + ' B' : (n / 1024).toFixed(n < 10240 ? 2 : 1) + ' KB'; };
function opts() {
var e = form.elements;
return { mode: e.mode.value, keepImportant: e.keepImportant.checked, optimize: e.optimize.checked, removeEmpty: e.removeEmpty.checked };
}
function save() { try { localStorage.setItem(STORE, JSON.stringify(opts())); } catch (err) {  } }
function restore() {
var o;
try { o = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (err) { o = null; }
if (!o) return;
var e = form.elements;
if (o.mode === 'beautify') e.mode.value = 'beautify';
['keepImportant', 'optimize', 'removeEmpty'].forEach(function (k) { if (typeof o[k] === 'boolean') e[k].checked = o[k]; });
}
function sync() {
var beauty = form.elements.mode.value === 'beautify';
$('cssGo').textContent = beauty ? 'Beautify CSS' : 'Minify CSS';
$('cssOutLabel').textContent = beauty ? 'Beautified CSS' : 'Minified CSS';
form.elements.optimize.disabled = beauty;
form.elements.removeEmpty.disabled = beauty;
}
function gzip(text, run) {
if (typeof CompressionStream === 'undefined' || !text) return;
var stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
new Response(stream).arrayBuffer().then(function (buf) {
if (run === gzRun) $('cssGz').textContent = ' · ' + kb(buf.byteLength) + ' gzipped';
}, function () {});
}
function run(announce) {
var o = opts(), src = input.value;
var r = o.mode === 'beautify' ? C.beautify(src) : C.minify(src, o);
output.value = r.css;
var w = r.warnings.filter(function (x, i, a) { return a.indexOf(x) === i; }).map(function (x) { return WARN[x]; });
warn.hidden = !w.length;
warn.textContent = w.join(' ');
var s = C.saving(src, r.css);
gzRun++;
if (!src.trim()) {
stats.innerHTML = 'Paste CSS above to see the result.';
} else {
var change = s.saved >= 0 ? s.percent + '% smaller' : Math.abs(s.percent) + '% larger';
stats.innerHTML = '<strong>' + kb(s.before) + ' → ' + kb(s.after) + '</strong> (' + change + ')<span id="cssGz"></span>';
gzip(r.css, gzRun);
if (announce) live.textContent = (o.mode === 'beautify' ? 'Beautified. ' : 'Minified. ') + kb(s.after) + ', ' + change + '.';
}
$('cssCopy').disabled = $('cssDownload').disabled = !r.css;
}
function flash(btn, text) {
var old = btn.getAttribute('data-label') || btn.textContent;
btn.setAttribute('data-label', old);
btn.textContent = text;
setTimeout(function () { btn.textContent = old; }, 1800);
}
function load(file) {
if (!file) return;
if (file.size > 5 * 1024 * 1024) { warn.hidden = false; warn.textContent = 'Files up to 5 MB are supported.'; return; }
fileName = file.name.replace(/(\.min)?\.css$/i, '') || 'style';
var reader = new FileReader();
reader.onload = function () { input.value = String(reader.result); run(true); };
reader.readAsText(file);
}
form.addEventListener('submit', function (e) { e.preventDefault(); run(true); });
form.addEventListener('change', function (e) {
if (e.target.id === 'cssFile') return;
sync(); save(); run(true);
});
input.addEventListener('input', function () {
clearTimeout(timer);
if (input.value.length <= LIVE_MAX) timer = setTimeout(function () { run(false); }, 200);
});
input.addEventListener('keydown', function (e) {
if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(true); }
});
input.addEventListener('dragover', function (e) { e.preventDefault(); });
input.addEventListener('drop', function (e) {
var f = e.dataTransfer && e.dataTransfer.files[0];
if (f) { e.preventDefault(); load(f); }
});
$('cssFile').addEventListener('change', function () { load(this.files[0]); this.value = ''; });
$('cssCopy').addEventListener('click', function () {
var btn = this;
var fallback = function () { output.select(); document.execCommand('copy'); flash(btn, 'Copied'); };
if (navigator.clipboard) navigator.clipboard.writeText(output.value).then(function () { flash(btn, 'Copied'); }, fallback);
else fallback();
live.textContent = 'Copied to clipboard.';
});
$('cssDownload').addEventListener('click', function () {
var beauty = form.elements.mode.value === 'beautify';
var a = document.createElement('a');
a.href = URL.createObjectURL(new Blob([output.value], { type: 'text/css' }));
a.download = fileName + (beauty ? '.css' : '.min.css');
document.body.appendChild(a);
a.click();
setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
});
$('cssClear').addEventListener('click', function () {
input.value = '';
fileName = 'style';
run(false);
input.focus();
});
$('cssSample').addEventListener('click', function () { input.value = C.SAMPLE; run(true); });
restore();
sync();
if (form.elements.mode.value !== 'minify' || !form.elements.optimize.checked || !form.elements.keepImportant.checked || !form.elements.removeEmpty.checked) run(false);
else gzip(output.value, gzRun);
})();
