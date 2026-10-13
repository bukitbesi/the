/* CSS Minifier UI. Everything runs in the browser: the CSS is never uploaded, and only the chosen
   options (not the code) are remembered in localStorage. Output updates as you type for inputs up to
   300 KB; larger files update on the button or Ctrl+Enter so typing never stalls. */
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
  function save() { try { localStorage.setItem(STORE, JSON.stringify(opts())); } catch (err) { /* private mode */ } }
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

  // Compressed size as served by most hosts; skipped where CompressionStream is unavailable.
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
  // The page ships with the sample already minified and its gzip size; only redo it when stored options differ.
  if (form.elements.mode.value !== 'minify' || !form.elements.optimize.checked || !form.elements.keepImportant.checked || !form.elements.removeEmpty.checked) run(false);
})();
