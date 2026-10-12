/* JavaScript Minifier UI. Terser and the obfuscator run in a Web Worker that is started on the first
   interaction, so the page itself loads no minifier code and typing never waits on a large file.
   The code never leaves the browser; only the chosen options are remembered in localStorage. */
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
  // True when stored options differ from the defaults the page was rendered with.
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
    // Stats compare the result with the code that produced it, not with whatever is typed meanwhile.
    jobSrc = input.value;
    // Live results while typing are not read out; button, option and file runs are.
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

  // Compressed size as served by most hosts; skipped where CompressionStream is unavailable.
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
    // Scroll the error line into view: textareas do not scroll to a selection set by script in every browser.
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
  // The page ships with the sample already minified with the default options.
  if (changed) run(false);
  else gzip(output.value, gzRun);
})();
