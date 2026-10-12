(function (root) {
'use strict';
var VENDOR = { terser: '/assets/vendor/terser-5.51.2.js', obfuscator: '/assets/vendor/javascript-obfuscator-5.9.0.js' };
var DEFAULTS = {
mode: 'minify', ecma: 2015, passes: 2, mangle: true, toplevel: false, module: false,
dropConsole: false, dropDebugger: true, keepNames: false, comments: true, sourceMap: false,
level: 'low', domains: '', fileName: 'script', seed: 0
};
var LEVELS = { low: 'low-obfuscation', medium: 'medium-obfuscation', high: 'high-obfuscation' };
function options(o) {
var r = {};
for (var k in DEFAULTS) r[k] = o && o[k] !== undefined ? o[k] : DEFAULTS[k];
r.ecma = [5, 2015, 2020].indexOf(Number(r.ecma)) >= 0 ? Number(r.ecma) : DEFAULTS.ecma;
r.passes = Math.min(3, Math.max(1, Number(r.passes) || DEFAULTS.passes));
if (!LEVELS[r.level]) r.level = DEFAULTS.level;
return r;
}
function terserOptions(o) {
if (o.mode === 'beautify') {
return { compress: false, mangle: false, module: o.module, format: { beautify: true, comments: 'all', indent_level: 2, ecma: o.ecma } };
}
var t = {
ecma: o.ecma, module: o.module, toplevel: o.toplevel,
keep_classnames: o.keepNames, keep_fnames: o.keepNames,
compress: { passes: o.passes, drop_console: o.dropConsole, drop_debugger: o.dropDebugger },
mangle: o.mangle ? { toplevel: o.toplevel || o.module } : false,
format: { comments: o.comments ? 'some' : false, ecma: o.ecma }
};
if (o.sourceMap) t.sourceMap = { filename: o.fileName + '.min.js', url: o.fileName + '.min.js.map' };
return t;
}
function domainList(s) {
return String(s || '').split(/[\s,]+/).map(function (d) {
return d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[/:].*$/, '');
}).filter(function (d) { return /^\.?[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d); });
}
function obfuscatorOptions(o) {
var domains = domainList(o.domains);
return {
optionsPreset: LEVELS[o.level], target: 'browser', sourceMap: false, seed: Number(o.seed) || 0,
disableConsoleOutput: o.dropConsole,
renameGlobals: o.toplevel, domainLock: domains, domainLockRedirectUrl: 'about:blank'
};
}
function licenceComments(code) {
var out = [], re = /\/\*([\s\S]*?)\*\//g, m;
while ((m = re.exec(code))) if (m[1].charAt(0) === '!' || /@(license|preserve)\b/.test(m[1])) out.push(m[0]);
return out.join('\n');
}
function errorInfo(e) {
var msg = String(e && e.message || e).split('\n')[0];
var line = e && e.line, col = e && e.col;
var m = /\((\d+):(\d+)\)\s*$/.exec(msg);
if (!line && m) { line = Number(m[1]); col = Number(m[2]); }
msg = msg.replace(/^ERROR(?: at line \d+)?:\s*/, '').replace(/\s*\(\d+:\d+\)\s*$/, '');
return { message: msg, line: line || 0, col: col || 0 };
}
function offset(code, line, col) {
var lines = String(code).split('\n'), pos = 0;
for (var i = 0; i < line - 1 && i < lines.length; i++) pos += lines[i].length + 1;
return Math.min(code.length, pos + (col || 0));
}
function run(libs, code, opts) {
var o = options(opts), started = Date.now();
var done = function (r) { r.ms = Date.now() - started; return r; };
if (!String(code).trim()) return Promise.resolve(done({ code: '', map: '' }));
try {
if (o.mode === 'obfuscate') {
var out = libs.obfuscator.obfuscate(code, obfuscatorOptions(o)).getObfuscatedCode();
var keep = o.comments ? licenceComments(code) : '';
return Promise.resolve(done({ code: (keep ? keep + '\n' : '') + out, map: '' }));
}
return libs.terser.minify(code, terserOptions(o)).then(function (r) {
return done({ code: r.code || '', map: typeof r.map === 'string' ? r.map : '' });
}, function (e) { return done({ code: '', map: '', error: errorInfo(e) }); });
} catch (e) {
return Promise.resolve(done({ code: '', map: '', error: errorInfo(e) }));
}
}
function bloggerWrap(code) {
return { code: '<script>//<![CDATA[\n' + code + '\n//]]></script>', unsafe: code.indexOf(']]>') >= 0 };
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
'/' + '*! Reading time widget v1.0 | MIT *' + '/',
'// Estimate reading time for a blog post and show it above the post.',
'function estimateReadingTime(text, wordsPerMinute) {',
'  const words = text.trim().split(/\\s+/).filter(Boolean).length;',
'  const minutes = Math.max(1, Math.round(words / (wordsPerMinute || 200)));',
'  return { words: words, minutes: minutes };',
'}',
'',
'function showReadingTime(selector) {',
'  const post = document.querySelector(selector);',
'  if (!post) {',
"    console.warn('Post body not found: ' + selector);",
'    return;',
'  }',
'  debugger;',
'  const result = estimateReadingTime(post.textContent);',
"  const label = document.createElement('p');",
"  label.className = 'reading-time';",
"  label.textContent = result.minutes + ' min read (' + result.words + ' words)';",
'  post.parentNode.insertBefore(label, post);',
'}',
'',
"document.addEventListener('DOMContentLoaded', function () {",
"  showReadingTime('.post-body');",
'});',
''
].join('\n');
var api = { VENDOR: VENDOR, DEFAULTS: DEFAULTS, options: options, terserOptions: terserOptions, obfuscatorOptions: obfuscatorOptions,
domainList: domainList, licenceComments: licenceComments, errorInfo: errorInfo, offset: offset, run: run,
bloggerWrap: bloggerWrap, bytes: bytes, saving: saving, SAMPLE: SAMPLE };
if (typeof module === 'object' && module.exports) module.exports = api;
else root.TBBJs = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
(function () {
'use strict';
var J = window.TBBJs;
var form = document.getElementById('jsForm');
if (!J || !form) return;
var $ = function (id) { return document.getElementById(id); };
var input = $('jsIn'), output = $('jsOut'), stats = $('jsStats'), err = $('jsErr'), live = $('jsLive');
var STORE = 'tbb-js-opts', LIVE_MAX = 150000;
var worker = null, jobId = 0, jobSrc = '', jobAnnounce = false, timer = 0, gzRun = 0, fileName = 'script', map = '', lastError = null;
var CHECKS = ['mangle', 'toplevel', 'dropConsole', 'dropDebugger', 'comments', 'blogger', 'module', 'keepNames', 'sourceMap'];
var SELECTS = ['ecma', 'passes', 'level'];
var GO = { minify: 'Minify JavaScript', obfuscate: 'Obfuscate JavaScript', beautify: 'Beautify JavaScript' };
var OUT = { minify: 'Minified JavaScript', obfuscate: 'Obfuscated JavaScript', beautify: 'Beautified JavaScript' };
var kb = function (n) { return n < 1024 ? n + ' B' : (n / 1024).toFixed(n < 10240 ? 2 : 1) + ' KB'; };
function opts() {
var e = form.elements, o = { mode: e.mode.value, domains: e.domains.value, fileName: fileName };
CHECKS.forEach(function (k) { o[k] = e[k].checked; });
SELECTS.forEach(function (k) { o[k] = e[k].value; });
return o;
}
function save() {
var o = opts();
delete o.fileName;
try { localStorage.setItem(STORE, JSON.stringify(o)); } catch (x) { return; }
}
function restore() {
var o, changed = false, e = form.elements;
try { o = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (x) { o = null; }
if (!o) return false;
if (GO[o.mode] && o.mode !== e.mode.value) { e.mode.value = o.mode; changed = true; }
CHECKS.forEach(function (k) { if (typeof o[k] === 'boolean' && e[k].checked !== o[k]) { e[k].checked = o[k]; changed = true; } });
SELECTS.forEach(function (k) {
var ok = [].some.call(e[k].options, function (x) { return x.value === String(o[k]); });
if (ok && e[k].value !== String(o[k])) { e[k].value = String(o[k]); changed = true; }
});
if (typeof o.domains === 'string') e.domains.value = o.domains;
return changed;
}
function sync() {
var mode = form.elements.mode.value, beauty = mode === 'beautify', obf = mode === 'obfuscate';
$('jsGo').textContent = GO[mode];
$('jsOutLabel').textContent = OUT[mode];
$('jsObf').hidden = !obf;
['mangle', 'dropConsole', 'dropDebugger', 'comments', 'passes', 'ecma', 'keepNames', 'sourceMap', 'blogger'].forEach(function (k) {
form.elements[k].disabled = beauty || (obf && ['mangle', 'dropDebugger', 'passes', 'ecma', 'keepNames', 'sourceMap'].indexOf(k) >= 0);
});
}
function start() {
if (worker) return worker;
try {
worker = new Worker($('jsForm').getAttribute('data-worker'));
} catch (x) {
showError({ message: 'Your browser blocked the minifier worker. Open this page over https and try again.', line: 0, col: 0 });
return null;
}
worker.onmessage = function (e) { if (e.data.id === jobId) done(e.data); };
worker.onerror = function () { showError({ message: 'The minifier stopped unexpectedly. Reload the page and try again.', line: 0, col: 0 }); busy(false); };
worker.postMessage({ id: 0, warm: true, code: '', opts: { mode: form.elements.mode.value } });
return worker;
}
function busy(on) {
output.setAttribute('aria-busy', on ? 'true' : 'false');
form.classList.toggle('is-busy', on);
}
function run(announce) {
clearTimeout(timer);
if (!start()) return;
jobId++;
jobSrc = input.value;
jobAnnounce = !!announce;
busy(true);
worker.postMessage({ id: jobId, code: jobSrc, opts: opts() });
}
function showError(e) {
lastError = e;
err.hidden = !e;
if (!e) return;
$('jsErrText').textContent = (e.line ? 'Line ' + e.line + ', column ' + (e.col + 1) + ': ' : '') + e.message;
$('jsJump').hidden = !e.line;
}
function gzip(text, run) {
if (typeof CompressionStream === 'undefined' || !text) return;
var stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
new Response(stream).arrayBuffer().then(function (buf) {
var el = $('jsGz');
if (run === gzRun && el) el.textContent = ' · ' + kb(buf.byteLength) + ' gzipped';
}, function () {});
}
function done(r) {
busy(false);
var o = opts(), src = jobSrc;
showError(r.error || null);
map = r.map || '';
var code = r.code, warnCdata = false;
if (code && o.blogger && o.mode !== 'beautify') {
var w = J.bloggerWrap(code);
code = w.code;
warnCdata = w.unsafe;
}
if (!r.error) output.value = code;
$('jsMap').hidden = !map || r.error;
$('jsCdata').hidden = !warnCdata;
gzRun++;
if (r.error) {
stats.textContent = 'Fix the error to see the result.';
} else if (!src.trim()) {
stats.textContent = 'Paste JavaScript above to see the result.';
} else {
var s = J.saving(src, r.code);
var change = s.saved >= 0 ? s.percent + '% smaller' : Math.abs(s.percent) + '% larger';
stats.innerHTML = '<strong>' + kb(s.before) + ' → ' + kb(s.after) + '</strong> (' + change + ')<span id="jsGz"></span> · ' + r.ms + ' ms';
gzip(r.code, gzRun);
if (jobAnnounce) live.textContent = (o.mode === 'beautify' ? 'Beautified. ' : o.mode === 'obfuscate' ? 'Obfuscated. ' : 'Minified. ') + kb(s.after) + ', ' + change + '.';
}
$('jsCopy').disabled = $('jsDownload').disabled = !output.value || !!r.error;
}
function flash(btn, text) {
var old = btn.getAttribute('data-label') || btn.textContent;
btn.setAttribute('data-label', old);
btn.textContent = text;
setTimeout(function () { btn.textContent = old; }, 1800);
}
function download(text, name, type) {
var a = document.createElement('a');
a.href = URL.createObjectURL(new Blob([text], { type: type }));
a.download = name;
document.body.appendChild(a);
a.click();
setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}
function load(file) {
if (!file) return;
if (file.size > 5 * 1024 * 1024) { showError({ message: 'Files up to 5 MB are supported.', line: 0, col: 0 }); return; }
fileName = file.name.replace(/(\.min)?\.(m?js|cjs|txt)$/i, '') || 'script';
var reader = new FileReader();
reader.onload = function () { input.value = String(reader.result); run(true); };
reader.readAsText(file);
}
form.addEventListener('submit', function (e) { e.preventDefault(); run(true); });
form.addEventListener('change', function (e) {
if (e.target.id === 'jsFile' || e.target.id === 'jsIn') return;
sync(); save(); run(true);
});
form.addEventListener('focusin', start, { once: true });
form.addEventListener('pointerdown', start, { once: true });
input.addEventListener('input', function () {
clearTimeout(timer);
if (input.value.length <= LIVE_MAX) timer = setTimeout(run, 600);
});
input.addEventListener('keydown', function (e) {
if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(true); }
});
input.addEventListener('dragover', function (e) { e.preventDefault(); });
input.addEventListener('drop', function (e) {
var f = e.dataTransfer && e.dataTransfer.files[0];
if (f) { e.preventDefault(); load(f); }
});
$('jsFile').addEventListener('change', function () { load(this.files[0]); this.value = ''; });
$('jsJump').addEventListener('click', function () {
if (!lastError || !lastError.line) return;
var at = J.offset(input.value, lastError.line, lastError.col);
input.focus();
input.setSelectionRange(at, Math.min(input.value.length, at + 1));
var lh = parseFloat(getComputedStyle(input).lineHeight) || 20;
input.scrollTop = Math.max(0, (lastError.line - 3) * lh);
});
$('jsCopy').addEventListener('click', function () {
var btn = this;
var fallback = function () { output.select(); document.execCommand('copy'); flash(btn, 'Copied'); };
if (navigator.clipboard) navigator.clipboard.writeText(output.value).then(function () { flash(btn, 'Copied'); }, fallback);
else fallback();
live.textContent = 'Copied to clipboard.';
});
$('jsDownload').addEventListener('click', function () {
var o = opts();
var ext = o.blogger && o.mode !== 'beautify' ? '.blogger.html' : { minify: '.min.js', obfuscate: '.obf.js', beautify: '.js' }[o.mode];
download(output.value, fileName + ext, o.blogger ? 'text/html' : 'text/javascript');
});
$('jsMap').addEventListener('click', function () { download(map, fileName + '.min.js.map', 'application/json'); });
$('jsClear').addEventListener('click', function () {
input.value = '';
fileName = 'script';
run(false);
input.focus();
});
$('jsSample').addEventListener('click', function () { input.value = J.SAMPLE; fileName = 'script'; run(true); });
var changed = restore();
sync();
if (changed) run(false);
else gzip(output.value, gzRun);
})();
