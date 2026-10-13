/* HTML Beautifier & Minifier UI. js-beautify and html-minifier-terser run in a Web Worker started on the first
   interaction, so the page loads no formatter code. The worker also checks the input and returns issues with
   line numbers. Code never leaves the browser; only the chosen options are remembered in localStorage. */
(function () {
  'use strict';
  var H = window.TBBHtml;
  var form = document.getElementById('htmlForm');
  if (!H || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var input = $('htmlIn'), output = $('htmlOut'), stats = $('htmlStats'), err = $('htmlErr'), live = $('htmlLive');
  var STORE = 'tbb-html-opts', LIVE_MAX = 300000;
  var worker = null, jobId = 0, jobSrc = '', jobAnnounce = false, timer = 0, gzRun = 0, fileName = 'page', lastError = null;
  var BEAUTY = ['indent', 'wrap', 'wrapAttributes', 'maxNewlines', 'indentScripts'];
  var BEAUTY_CHECKS = ['innerHtml', 'preserveNewlines', 'endNewline'];
  var kb = function (n) { return n < 1024 ? n + ' B' : (n / 1024).toFixed(n < 10240 ? 2 : 1) + ' KB'; };

  function opts() {
    var e = form.elements, o = { mode: e.mode.value, preset: e.preset.value };
    BEAUTY.forEach(function (k) { o[k] = e[k].value; });
    BEAUTY_CHECKS.concat(H.MINIFY_KEYS).forEach(function (k) { o[k] = e[k].checked; });
    return o;
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(opts())); } catch (x) { return; } }
  function applyPreset(name) {
    var p = H.PRESETS[name];
    H.MINIFY_KEYS.forEach(function (k) { form.elements[k].checked = p[k]; });
  }
  // True when stored options differ from the defaults the page was rendered with.
  function restore() {
    var o, before = JSON.stringify(opts()), e = form.elements;
    try { o = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (x) { o = null; }
    if (!o) return false;
    if (o.mode === 'minify' || o.mode === 'beautify') e.mode.value = o.mode;
    if (H.PRESETS[o.preset]) e.preset.value = o.preset;
    BEAUTY.forEach(function (k) {
      if ([].some.call(e[k].options, function (x) { return x.value === String(o[k]); })) e[k].value = String(o[k]);
    });
    BEAUTY_CHECKS.concat(H.MINIFY_KEYS).forEach(function (k) { if (typeof o[k] === 'boolean') e[k].checked = o[k]; });
    return JSON.stringify(opts()) !== before;
  }
  function sync() {
    var min = form.elements.mode.value === 'minify';
    $('htmlGo').textContent = min ? 'Minify HTML' : 'Beautify HTML';
    $('htmlOutLabel').textContent = min ? 'Minified HTML' : 'Beautified HTML';
    $('htmlBeautyOpts').hidden = min;
    $('htmlMinOpts').hidden = !min;
  }

  function start() {
    if (worker) return worker;
    try {
      worker = new Worker(form.getAttribute('data-worker'));
    } catch (x) {
      showError({ message: 'Your browser blocked the formatter worker. Open this page over https and try again.', line: 0, col: 0 });
      return null;
    }
    worker.onmessage = function (e) { if (e.data.id === jobId) done(e.data); };
    worker.onerror = function () { showError({ message: 'The formatter stopped unexpectedly. Reload the page and try again.', line: 0, col: 0 }); busy(false); };
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
    // Stats and checks describe the code that produced them, not whatever is typed meanwhile.
    jobSrc = input.value;
    jobAnnounce = !!announce;
    busy(true);
    worker.postMessage({ id: jobId, code: jobSrc, opts: opts() });
  }

  function showError(e) {
    lastError = e;
    err.hidden = !e;
    if (!e) return;
    $('htmlErrText').textContent = (e.line ? 'Line ' + e.line + ': ' : '') + e.message;
    $('htmlJump').hidden = !e.line;
  }
  function jump(line, col) {
    var at = H.offset(input.value, line, col || 0);
    input.focus();
    input.setSelectionRange(at, at);
    var lh = parseFloat(getComputedStyle(input).lineHeight) || 20;
    input.scrollTop = Math.max(0, (line - 3) * lh);
  }

  function renderIssues(list) {
    if (!list) { $('htmlIssuesSum').textContent = 'HTML check skipped for files over 2 MB'; $('htmlIssueList').innerHTML = ''; return; }
    var sum = H.summarize(list);
    $('htmlIssuesSum').textContent = sum.text;
    $('htmlIssues').setAttribute('data-state', sum.state);
    $('htmlIssueList').innerHTML = H.issuesHtml(list);
  }

  // Compressed size as served by most hosts; skipped where CompressionStream is unavailable.
  function gzip(text, run) {
    if (typeof CompressionStream === 'undefined' || !text) return;
    var stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
    new Response(stream).arrayBuffer().then(function (buf) {
      var el = $('htmlGz');
      if (run === gzRun && el) el.textContent = ' · ' + kb(buf.byteLength) + ' gzipped';
    }, function () {});
  }

  // Scripts never run in the sandboxed preview; removing them and inline handlers first keeps the console free of block notices.
  var previewDoc = function () {
    return output.value.replace(/<script\b[\s\S]*?<\/script\s*>/gi, '').replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  };
  function preview() {
    var frame = $('htmlFrame');
    if (!frame.hidden) frame.srcdoc = previewDoc();
  }

  function done(r) {
    busy(false);
    var o = opts(), src = jobSrc;
    showError(r.error || null);
    if (!r.error) output.value = r.code;
    renderIssues(r.issues);
    gzRun++;
    if (r.error) {
      stats.textContent = 'Fix the error to see the result.';
    } else if (!src.trim()) {
      stats.textContent = 'Paste HTML above to see the result.';
    } else {
      var s = H.saving(src, r.code);
      var change = s.saved >= 0 ? s.percent + '% smaller' : Math.abs(s.percent) + '% larger';
      stats.innerHTML = '<strong>' + kb(s.before) + ' → ' + kb(s.after) + '</strong> (' + change + ')<span id="htmlGz"></span> · ' + r.ms + ' ms';
      gzip(r.code, gzRun);
      if (jobAnnounce) live.textContent = (o.mode === 'minify' ? 'Minified. ' : 'Beautified. ') + kb(s.after) + ', ' + change + '. ' + $('htmlIssuesSum').textContent + '.';
    }
    $('htmlCopy').disabled = $('htmlDownload').disabled = $('htmlPreview').disabled = !output.value || !!r.error;
    preview();
  }

  function flash(btn, text) {
    var old = btn.getAttribute('data-label') || btn.textContent;
    btn.setAttribute('data-label', old);
    btn.textContent = text;
    setTimeout(function () { btn.textContent = old; }, 1800);
  }
  function load(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showError({ message: 'Files up to 5 MB are supported.', line: 0, col: 0 }); return; }
    fileName = file.name.replace(/(\.min)?\.(html?|xml|php|txt)$/i, '') || 'page';
    var reader = new FileReader();
    reader.onload = function () { input.value = String(reader.result); run(true); };
    reader.readAsText(file);
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); run(true); });
  form.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'htmlFile' || t.id === 'htmlIn') return;
    if (t.name === 'preset') applyPreset(t.value);
    sync(); save(); run(true);
  });
  form.addEventListener('focusin', start, { once: true });
  form.addEventListener('pointerdown', start, { once: true });
  input.addEventListener('input', function () {
    clearTimeout(timer);
    if (input.value.length <= LIVE_MAX) timer = setTimeout(run, 500);
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(true); }
  });
  input.addEventListener('dragover', function (e) { e.preventDefault(); });
  input.addEventListener('drop', function (e) {
    var f = e.dataTransfer && e.dataTransfer.files[0];
    if (f) { e.preventDefault(); load(f); }
  });
  $('htmlFile').addEventListener('change', function () { load(this.files[0]); this.value = ''; });
  $('htmlJump').addEventListener('click', function () { if (lastError && lastError.line) jump(lastError.line, lastError.col); });
  $('htmlIssueList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-line]');
    if (b) jump(Number(b.getAttribute('data-line')), 0);
  });
  $('htmlCopy').addEventListener('click', function () {
    var btn = this;
    var fallback = function () { output.select(); document.execCommand('copy'); flash(btn, 'Copied'); };
    if (navigator.clipboard) navigator.clipboard.writeText(output.value).then(function () { flash(btn, 'Copied'); }, fallback);
    else fallback();
    live.textContent = 'Copied to clipboard.';
  });
  $('htmlDownload').addEventListener('click', function () {
    var o = opts(), xml = o.mode === 'minify' && o.keepClosingSlash;
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([output.value], { type: xml ? 'application/xml' : 'text/html' }));
    a.download = fileName + (o.mode === 'minify' ? '.min' : '') + (xml ? '.xml' : '.html');
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  });
  // The preview frame is sandboxed without scripts, so pasted code cannot run or reach this page.
  $('htmlPreview').addEventListener('click', function () {
    var frame = $('htmlFrame'), show = frame.hidden;
    frame.hidden = !show;
    this.setAttribute('aria-expanded', show ? 'true' : 'false');
    this.textContent = show ? 'Hide preview' : 'Preview';
    if (show) frame.srcdoc = previewDoc(); else frame.removeAttribute('srcdoc');
  });
  $('htmlClear').addEventListener('click', function () {
    input.value = '';
    fileName = 'page';
    run(false);
    input.focus();
  });
  $('htmlSample').addEventListener('click', function () { input.value = H.SAMPLE; fileName = 'page'; run(true); });

  var changed = restore();
  sync();
  // The page ships with the sample already beautified and checked with the default options.
  if (changed) run(false);
})();
