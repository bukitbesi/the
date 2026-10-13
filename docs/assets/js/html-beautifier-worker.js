(function (root) {
'use strict';
var VENDOR = { minifier: '/assets/vendor/html-minifier-terser-7.2.0.js', beautifier: '/assets/vendor/js-beautify-2.0.3.js' };
var OPEN_C = '<' + '!--', CLOSE_C = '--' + '>';
var FRAGMENTS = [/<%[\s\S]*?%>/, /<\?[\s\S]*?\?>/, /\{\{[\s\S]*?\}\}/, /\{%[\s\S]*?%\}/, /<!\[CDATA\[[\s\S]*?\]\]>/];
var MINIFY_KEYS = ['collapseWhitespace', 'conservativeCollapse', 'preserveLineBreaks', 'removeComments', 'keepConditional',
'minifyCSS', 'minifyJS', 'removeRedundantAttributes', 'removeScriptTypeAttributes', 'removeStyleLinkTypeAttributes',
'collapseBooleanAttributes', 'useShortDoctype', 'removeEmptyAttributes', 'removeAttributeQuotes', 'removeOptionalTags',
'sortAttributes', 'sortClassName', 'decodeEntities', 'keepClosingSlash', 'caseSensitive', 'protectTemplates'];
var off = function () { var o = {}; MINIFY_KEYS.forEach(function (k) { o[k] = false; }); return o; };
var with_ = function (base, extra) { var o = {}, k; for (k in base) o[k] = base[k]; for (k in extra) o[k] = extra[k]; return o; };
var SAFE = with_(off(), {
collapseWhitespace: true, conservativeCollapse: true, removeComments: true, keepConditional: true, minifyCSS: true, minifyJS: true,
removeRedundantAttributes: true, removeScriptTypeAttributes: true, removeStyleLinkTypeAttributes: true,
collapseBooleanAttributes: true, useShortDoctype: true, removeEmptyAttributes: true, protectTemplates: true
});
var PRESETS = {
safe: SAFE,
max: with_(SAFE, { conservativeCollapse: false, keepConditional: false, removeAttributeQuotes: true, removeOptionalTags: true,
sortAttributes: true, sortClassName: true, decodeEntities: true }),
xml: with_(SAFE, { useShortDoctype: false, removeRedundantAttributes: false, removeEmptyAttributes: false,
collapseBooleanAttributes: false, keepClosingSlash: true, caseSensitive: true }),
email: with_(SAFE, { removeRedundantAttributes: false, removeEmptyAttributes: false, useShortDoctype: false, minifyJS: false })
};
var DEFAULTS = {
mode: 'beautify', preset: 'safe',
indent: '2', wrap: '0', wrapAttributes: 'auto', innerHtml: false, preserveNewlines: true, maxNewlines: '1',
indentScripts: 'normal', endNewline: true
};
function options(o) {
var r = with_(DEFAULTS, {}), k;
r.mode = o && o.mode === 'minify' ? 'minify' : 'beautify';
r.preset = o && PRESETS[o.preset] ? o.preset : 'safe';
var p = PRESETS[r.preset];
for (k in p) r[k] = o && typeof o[k] === 'boolean' ? o[k] : p[k];
for (k in DEFAULTS) if (o && o[k] !== undefined && k !== 'mode' && k !== 'preset') r[k] = o[k];
if (['2', '4', '8', 'tab'].indexOf(String(r.indent)) < 0) r.indent = DEFAULTS.indent;
return r;
}
function beautifyOptions(o) {
var tab = String(o.indent) === 'tab';
return {
indent_size: tab ? 1 : Number(o.indent), indent_char: tab ? '\t' : ' ', indent_with_tabs: tab,
wrap_line_length: Number(o.wrap) || 0, wrap_attributes: o.wrapAttributes, indent_inner_html: !!o.innerHtml,
preserve_newlines: !!o.preserveNewlines, max_preserve_newlines: Number(o.maxNewlines) || 0,
indent_scripts: o.indentScripts, end_with_newline: !!o.endNewline, templating: ['auto'],
css: { indent_size: tab ? 1 : Number(o.indent), indent_char: tab ? '\t' : ' ', end_with_newline: false },
js: { indent_size: tab ? 1 : Number(o.indent), indent_char: tab ? '\t' : ' ', end_with_newline: false }
};
}
function minifyOptions(o) {
return {
collapseWhitespace: o.collapseWhitespace, conservativeCollapse: o.conservativeCollapse, preserveLineBreaks: o.preserveLineBreaks,
removeComments: o.removeComments,
ignoreCustomComments: o.keepConditional ? [/^!/, /^\s*#/, /^\[if\b/, /^<!\[endif\]/] : [/^!/, /^\s*#/],
minifyCSS: o.minifyCSS ? { level: 1, inline: ['none'] } : false, minifyJS: o.minifyJS,
removeRedundantAttributes: o.removeRedundantAttributes, removeScriptTypeAttributes: o.removeScriptTypeAttributes,
removeStyleLinkTypeAttributes: o.removeStyleLinkTypeAttributes, collapseBooleanAttributes: o.collapseBooleanAttributes,
useShortDoctype: o.useShortDoctype, removeEmptyAttributes: o.removeEmptyAttributes,
removeAttributeQuotes: o.removeAttributeQuotes, removeOptionalTags: o.removeOptionalTags,
sortAttributes: o.sortAttributes, sortClassName: o.sortClassName, decodeEntities: o.decodeEntities,
keepClosingSlash: o.keepClosingSlash, caseSensitive: o.caseSensitive,
ignoreCustomFragments: o.protectTemplates ? FRAGMENTS : [/<%[\s\S]*?%>/, /<\?[\s\S]*?\?>/],
continueOnParseError: false
};
}
var VOID = ' area base br col embed hr img input link meta param source track wbr ';
var OPTIONAL_END = ' p li dt dd option optgroup tr td th thead tbody tfoot colgroup caption rb rt rtc rp html head body ';
var RAW = ' script style textarea title ';
var DEPRECATED = ' acronym applet basefont big blink center dir font frame frameset isindex marquee nobr noframes strike tt xmp ';
var isIn = function (list, name) { return list.indexOf(' ' + name + ' ') >= 0; };
function attrs(s) {
var out = {}, re = /([^\s=/"'<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g, m;
while ((m = re.exec(s))) {
var k = m[1].toLowerCase();
if (!(k in out)) out[k] = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : '';
}
return out;
}
function lineAt(starts, pos) {
var lo = 0, hi = starts.length - 1;
while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (starts[mid] <= pos) lo = mid; else hi = mid - 1; }
return lo + 1;
}
function check(src) {
src = String(src || '');
var issues = [], starts = [0], i;
for (i = 0; i < src.length; i++) if (src.charCodeAt(i) === 10) starts.push(i + 1);
var add = function (level, rule, msg, pos) { issues.push({ level: level, rule: rule, message: msg, line: pos >= 0 ? lineAt(starts, pos) : 0 }); };
var stack = [], ids = {}, labelsFor = {}, controls = [], links = [], seen = {}, h1 = 0, inlineStyles = 0, handlers = 0;
var tagRe = /<(\/?)([A-Za-z][A-Za-z0-9:._-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g, m, pos = 0;
while (pos < src.length) {
var lt = src.indexOf('<', pos);
if (lt < 0) break;
if (src.startsWith(OPEN_C, lt)) { var ce = src.indexOf(CLOSE_C, lt + 4); if (ce < 0) { add('error', 'comment', 'Comment is never closed.', lt); break; } pos = ce + 3; continue; }
if (src.startsWith('<![CDATA[', lt)) { var cd = src.indexOf(']]>', lt); pos = cd < 0 ? src.length : cd + 3; continue; }
if (/^<!doctype/i.test(src.slice(lt, lt + 9))) { seen.doctype = true; pos = src.indexOf('>', lt) + 1 || src.length; continue; }
if (src[lt + 1] === '?' || src[lt + 1] === '%') { var te = src.indexOf(src[lt + 1] + '>', lt + 2); pos = te < 0 ? src.length : te + 2; continue; }
tagRe.lastIndex = lt;
m = tagRe.exec(src);
if (!m || m.index !== lt) { pos = lt + 1; continue; }
pos = tagRe.lastIndex;
var closing = m[1] === '/', raw = m[2], ns = raw.indexOf(':') > 0, name = ns ? raw : raw.toLowerCase();
var body = m[3], selfClose = /\/\s*$/.test(body);
if (closing) {
if (isIn(VOID, name)) continue;
var at = -1;
for (i = stack.length - 1; i >= 0; i--) if (stack[i].name === name) { at = i; break; }
if (at < 0) { add('error', 'unexpected-close', '</' + raw + '> has no matching opening tag.', lt); continue; }
for (i = stack.length - 1; i > at; i--) {
if (!isIn(OPTIONAL_END, stack[i].name)) add('error', 'unclosed', '<' + stack[i].raw + '> opened on line ' + lineAt(starts, stack[i].pos) + ' is closed by </' + raw + '> before its own end tag.', stack[i].pos);
}
var open = stack[at];
if (name === 'a' || name === 'button') {
var inner = src.slice(open.end, lt);
var text = inner.replace(/<[^>]*\balt\s*=\s*("[^"]+"|'[^']+')[^>]*>/g, ' x ').replace(/<[^>]*>/g, '').replace(/&nbsp;|\s/g, '');
if (!text && !open.a['aria-label'] && !open.a['aria-labelledby'] && !open.a.title) add('error', 'empty-' + name, '<' + name + '> has no text or accessible name, so screen readers and search engines get nothing.', open.pos);
}
stack.length = at;
continue;
}
var a = attrs(body.replace(/\/\s*$/, ''));
if (a.id !== undefined) {
if (a.id === '') add('warning', 'empty-id', 'Empty id attribute on <' + raw + '>.', lt);
else if (ids[a.id] !== undefined) add('error', 'duplicate-id', 'Duplicate id "' + a.id + '" (first used on line ' + ids[a.id] + ').', lt);
else ids[a.id] = lineAt(starts, lt);
}
if (a.style !== undefined) inlineStyles++;
for (var k in a) if (/^on[a-z]+$/.test(k)) handlers++;
if (isIn(DEPRECATED, name)) add('warning', 'deprecated', '<' + name + '> is obsolete in HTML; use CSS instead.', lt);
if (name === 'html') { seen.html = true; if (!a.lang && !a['expr:lang'] && !isTemplate(src)) add('warning', 'html-lang', '<html> has no lang attribute; screen readers and translators need it.', lt); }
else if (name === 'title') seen.title = true;
else if (name === 'meta' && (a.name || '').toLowerCase() === 'viewport') seen.viewport = true;
else if (name === 'meta' && (a.name || '').toLowerCase() === 'description') seen.description = true;
else if (name === 'h1') h1++;
else if (name === 'img') {
if (a.alt === undefined) add('error', 'img-alt', '<img> has no alt attribute. Use alt="" for decorative images.', lt);
if ((a.width === undefined || a.height === undefined) && !/aspect-ratio/.test(a.style || '')) add('warning', 'img-size', '<img> has no width and height, which causes layout shift (CLS) while it loads.', lt);
} else if (name === 'iframe' && !a.title) add('warning', 'iframe-title', '<iframe> has no title for screen readers.', lt);
else if (name === 'label' && a['for']) labelsFor[a['for']] = true;
else if ((name === 'input' && !/^(hidden|submit|button|reset|image)$/i.test(a.type || '')) || name === 'select' || name === 'textarea') {
var wrapped = stack.some(function (s) { return s.name === 'label'; });
controls.push({ id: a.id, named: wrapped || a['aria-label'] || a['aria-labelledby'] || a.title, raw: raw, pos: lt });
} else if (name === 'a' && a.target === '_blank' && /^https?:/i.test(a.href || '') && !/noopener|noreferrer/i.test(a.rel || '')) links.push(lt);
if (selfClose && !isIn(VOID, name) && !ns) add('warning', 'self-closing', '<' + raw + ' /> is not self-closing in HTML: the element stays open until </' + raw + '>.', lt);
if (isIn(VOID, name) || (selfClose && ns)) continue;
if (selfClose) continue;
if (isIn(RAW, name)) {
var endRe = new RegExp('</' + name + '\\s*>', 'ig');
endRe.lastIndex = pos;
var e = endRe.exec(src);
if (!e) { add('error', 'unclosed', '<' + raw + '> opened on line ' + lineAt(starts, lt) + ' is never closed.', lt); break; }
pos = endRe.lastIndex;
continue;
}
var top = stack[stack.length - 1];
if (top && ((name === 'p' || /^(div|ul|ol|table|h[1-6]|section|article|header|footer|nav|form|pre|blockquote)$/.test(name)) && top.name === 'p' ||
name === 'li' && top.name === 'li' || /^(td|th)$/.test(name) && /^(td|th)$/.test(top.name) || name === 'tr' && top.name === 'tr' ||
name === 'option' && top.name === 'option' || /^(dt|dd)$/.test(name) && /^(dt|dd)$/.test(top.name))) stack.pop();
stack.push({ name: name, raw: raw, pos: lt, end: pos, a: a });
}
stack.forEach(function (s) {
if (!isIn(OPTIONAL_END, s.name)) add('error', 'unclosed', '<' + s.raw + '> opened on line ' + lineAt(starts, s.pos) + ' is never closed.', s.pos);
});
controls.forEach(function (c) {
if (!c.named && !(c.id && labelsFor[c.id])) add('warning', 'label', '<' + c.raw + '> has no label (label for, a wrapping label, aria-label or title).', c.pos);
});
if (links.length) add('info', 'noopener', links.length + (links.length === 1 ? ' link opens' : ' links open') + ' a new tab without rel="noopener"; modern browsers add it, older ones do not.', links[0]);
if ((seen.html || seen.doctype) && !isTemplate(src)) {
if (!seen.doctype) add('warning', 'doctype', 'No <!DOCTYPE html>, so browsers use quirks mode.', -1);
if (!seen.title) add('error', 'title', 'No <title>: search engines show it as the result headline.', -1);
if (!seen.viewport) add('warning', 'viewport', 'No <meta name="viewport">, so phones show a zoomed-out desktop layout.', -1);
if (!seen.description) add('info', 'description', 'No <meta name="description"> for search result snippets.', -1);
if (h1 === 0) add('warning', 'h1', 'No <h1> heading on the page.', -1);
}
if (h1 > 1) add('info', 'h1', h1 + ' <h1> headings; one main heading per page is clearer for readers and search engines.', -1);
if (inlineStyles >= 10) add('info', 'inline-style', inlineStyles + ' inline style attributes; moving them to a stylesheet makes pages smaller and easier to cache.', -1);
if (handlers) add('info', 'inline-handler', handlers + ' inline event handler' + (handlers === 1 ? '' : 's') + ' (onclick=…); these block a strict Content Security Policy.', -1);
var order = { error: 0, warning: 1, info: 2 };
return issues.sort(function (x, y) { return order[x.level] - order[y.level] || (x.line || 1e9) - (y.line || 1e9); });
}
var escHtml = function (x) { return String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
function summarize(list) {
var n = { error: 0, warning: 0, info: 0 }, parts = [];
list.forEach(function (i) { n[i.level]++; });
if (n.error) parts.push(n.error + (n.error === 1 ? ' error' : ' errors'));
if (n.warning) parts.push(n.warning + (n.warning === 1 ? ' warning' : ' warnings'));
if (n.info) parts.push(n.info + (n.info === 1 ? ' tip' : ' tips'));
return { text: 'HTML check: ' + (parts.join(', ') || 'no problems found'), state: n.error ? 'error' : n.warning ? 'warning' : 'ok' };
}
function issuesHtml(list) {
return list.map(function (i) {
var where = i.line ? '<button type="button" class="link-btn" data-line="' + i.line + '">Line ' + i.line + '</button> ' : '';
return '<li class="issue issue-' + i.level + '"><span class="lvl">' + i.level + '</span> ' + where + escHtml(i.message) + '</li>';
}).join('');
}
function errorInfo(e, src) {
var msg = String(e && e.message || e).split('\n')[0];
var line = 0, col = 0, m = /^Parse Error:\s*([\s\S]{1,80})/.exec(msg);
if (m && src) {
var at = String(src).indexOf(m[1].slice(0, 40));
if (at >= 0) { var before = String(src).slice(0, at).split('\n'); line = before.length; col = before[before.length - 1].length; }
msg = 'The minifier could not parse the HTML near: ' + m[1].trim().slice(0, 60);
}
return { message: msg, line: line, col: col };
}
function offset(code, line, col) {
var lines = String(code).split('\n'), pos = 0;
for (var i = 0; i < line - 1 && i < lines.length; i++) pos += lines[i].length + 1;
return Math.min(code.length, pos + (col || 0));
}
var BODY_RE = /(<(script|style)\b[^>]*>)([\s\S]*?)(<\/\2\s*>)/gi;
var CD_OPEN = new RegExp('^\\s*(?:\\/\\/|\\/\\*)?\\s*<!\\[CDATA\\[(?:\\s*\\*\\/)?');
var CD_CLOSE = new RegExp('(?:\\/\\/|\\/\\*)?\\s*\\]\\]>(?:\\s*\\*\\/)?\\s*$');
var SL = '/', ST = '*';
function unwrapCdata(html) {
return html.replace(BODY_RE, function (all, open, tag, body, close) {
return CD_OPEN.test(body) && CD_CLOSE.test(body) ? open + body.replace(CD_OPEN, '').replace(CD_CLOSE, '') + close : all;
});
}
function wrapCdata(html) {
return html.replace(BODY_RE, function (all, open, tag, body, close) {
if (!/[<&]/.test(body) || body.indexOf('<![CDATA[') >= 0) return all;
return tag.toLowerCase() === 'script' ? open + SL + SL + '<![CDATA[\n' + body + '\n' + SL + SL + ']]>' + close
: open + SL + ST + '<![CDATA[' + ST + SL + body + SL + ST + ']]>' + ST + SL + close;
});
}
var isTemplate = function (src) { return /xmlns:b\s*=|<b:skin\b|<b:section\b/.test(src); };
function run(libs, code, opts) {
var o = options(opts), started = Date.now();
var done = function (r) { r.ms = Date.now() - started; return r; };
if (!String(code).trim()) return Promise.resolve(done({ code: '' }));
try {
if (o.mode === 'beautify') return Promise.resolve(done({ code: libs.beautifier.html(code, beautifyOptions(o)) }));
return Promise.resolve(libs.minifier.minify(unwrapCdata(code), minifyOptions(o))).then(function (out) {
return done({ code: o.keepClosingSlash ? wrapCdata(out) : out });
}, function (e) { return done({ code: '', error: errorInfo(e, code) }); });
} catch (e) {
return Promise.resolve(done({ code: '', error: errorInfo(e, code) }));
}
}
var bytes = function (s) {
if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s).length;
return unescape(encodeURIComponent(s)).length;
};
var saving = function (before, after) {
var a = bytes(before), b = bytes(after);
return { before: a, after: b, saved: a - b, percent: a ? Math.round((a - b) / a * 1000) / 10 : 0 };
};
var SAMPLE = [
'<!DOCTYPE html>',
'<html lang="en">',
'<head>',
'<meta charset="utf-8">',
'<meta name="viewport" content="width=device-width, initial-scale=1">',
'<title>Product card</title>',
'<style>',
'.card { border: 1px solid #ddd; padding: 16px; }',
'</style>',
'</head>',
'<body>',
OPEN_C + ' Product card ' + CLOSE_C,
'<div class="card" id="product">',
'<h1>Wireless Earbuds</h1>',
'<img src="earbuds.webp" alt="Wireless earbuds in a charging case" width="320" height="240">',
'<p>Up to <strong>30 hours</strong> of battery life.</p>',
'<ul><li>Bluetooth 5.3</li><li>Water resistant</li></ul>',
'<button type="button" onclick="addToCart()">Add to cart</button>',
'</div>',
'<script type="text/javascript">',
'function addToCart() { alert("Added"); }',
'</script>',
'</body>',
'</html>',
''
].join('\n');
var api = { VENDOR: VENDOR, PRESETS: PRESETS, DEFAULTS: DEFAULTS, MINIFY_KEYS: MINIFY_KEYS, options: options, summarize: summarize, issuesHtml: issuesHtml,
beautifyOptions: beautifyOptions, minifyOptions: minifyOptions, check: check, errorInfo: errorInfo, offset: offset,
run: run, bytes: bytes, saving: saving, SAMPLE: SAMPLE };
if (typeof module === 'object' && module.exports) module.exports = api;
else root.TBBHtml = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
(function () {
'use strict';
var H = self.TBBHtml;
var CHECK_MAX = 2000000;
self.onmessage = function (e) {
var job = e.data, minify = job.opts.mode === 'minify';
try {
if (minify && !self.HTMLMinifier) importScripts(H.VENDOR.minifier);
if (!minify && !self.jsBeautify) importScripts(H.VENDOR.beautifier);
} catch (err) {
self.postMessage({ id: job.id, code: '', ms: 0, issues: [], error: { message: 'The formatter could not load. Check your connection and try again.', line: 0, col: 0 } });
return;
}
if (job.warm) return;
H.run({ minifier: self.HTMLMinifier, beautifier: self.jsBeautify }, job.code, job.opts).then(function (r) {
r.id = job.id;
r.issues = job.code.length <= CHECK_MAX ? H.check(job.code) : null;
self.postMessage(r);
});
};
})();
