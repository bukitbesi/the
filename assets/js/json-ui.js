/* JSON Formatter UI. Runs in the browser: the JSON is never uploaded; only the chosen options are remembered in
   localStorage. Output updates as you type up to 300 KB; larger files update on the button or Ctrl+Enter. */
(function () {
  'use strict';
  var J = window.TBBJson;
  var form = document.getElementById('jfForm');
  if (!J || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var V = J.views, input = $('jfIn'), output = $('jfOut'), tree = $('jfTree'), status = $('jfStatus'), err = $('jfErr'), live = $('jfLive');
  var STORE = 'tbb-json-opts', LIVE_MAX = 300000, fileName = 'data', timer = 0, last = null;

  function opts() {
    var e = form.elements;
    return { mode: e.mode.value, indent: e.indent.value, sortKeys: e.sortKeys.checked };
  }
  function indent(o) { return o.mode === 'minify' ? '' : o.indent === 'tab' ? '\t' : o.indent === '4' ? '    ' : '  '; }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(opts())); } catch (x) { /* private mode */ } }
  function restore() {
    var o;
    try { o = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (x) { o = null; }
    if (!o) return;
    var e = form.elements;
    if (/^(format|minify|tree)$/.test(o.mode)) e.mode.value = o.mode;
    if (/^(2|4|tab)$/.test(o.indent)) e.indent.value = o.indent;
    e.sortKeys.checked = !!o.sortKeys;
  }
  function sync() {
    var m = form.elements.mode.value;
    $('jfOutLabel').textContent = m === 'minify' ? 'Minified JSON' : m === 'tree' ? 'Tree view' : 'Formatted JSON';
    output.hidden = m === 'tree';
    tree.hidden = m !== 'tree';
    form.elements.indent.disabled = m === 'minify';
  }
  function showError(e) {
    err.hidden = !e;
    err.innerHTML = e ? V.errorHtml(e) + (e.pos != null ? ' <button type="button" class="btn ghost sm" id="jfGoto">Go to error</button> <button type="button" class="btn ghost sm" data-fix>Fix JSON</button>' : '') : '';
  }
  function showWarnings(list) {
    $('jfWarn').hidden = !list.length;
    $('jfWarn').innerHTML = V.warnHtml(list);
  }

  function run(announce) {
    var o = opts(), src = input.value;
    $('jfFixed').hidden = true;
    if (!src.trim()) {
      last = null; output.value = ''; tree.innerHTML = ''; showError(null); showWarnings([]);
      status.innerHTML = 'Paste JSON above to check and format it.';
      enable(false);
      return;
    }
    var p = J.parse(src);
    showWarnings(p.warnings);
    if (!p.ok) {
      last = null;
      showError(p.error);
      status.innerHTML = '<strong class="rb-no">✗ Invalid JSON</strong>';
      enable(false);
      if (announce) live.textContent = 'Invalid JSON. Line ' + p.error.line + ', column ' + p.error.col + ': ' + p.error.msg;
      return;
    }
    last = p.ast;
    showError(null);
    var out = J.stringify(p.ast, { indent: indent(o), sortKeys: o.sortKeys });
    output.value = out;
    if (o.mode === 'tree') tree.innerHTML = V.treeHtml(o.sortKeys ? J.parse(out).ast : p.ast);
    status.innerHTML = V.statusHtml(J.stats(p.ast), J.bytes(src), J.bytes(out));
    enable(true);
    if (announce) live.textContent = 'Valid JSON.';
    pathRun();
  }
  function enable(on) { ['jfCopy', 'jfDownload', 'jfCsv'].forEach(function (id) { $(id).disabled = !on; }); }

  function fix() {
    var r = J.repair(input.value);
    if (!r.ok) { showError(r.error || { msg: 'Nothing to fix: the input is empty.' }); live.textContent = 'Could not fix this JSON automatically.'; return; }
    input.value = J.stringify(r.ast, { indent: indent(opts()) || '  ', sortKeys: false });
    run(false);
    var msg = r.fixes.length ? 'Fixed: ' + r.fixes.join(' ') : 'No fixes needed: the JSON was already valid.';
    $('jfFixed').hidden = false;
    $('jfFixed').textContent = msg;
    live.textContent = msg;
  }

  function pathRun() {
    var q = $('jfPath').value, out = $('jfPathOut');
    if (!q.trim() || !last) { out.hidden = true; return; }
    var r = J.query(last, q);
    out.hidden = false;
    if (r.error) { out.textContent = r.error; return; }
    out.textContent = r.results.length ? r.results.slice(0, 50).map(function (x) { return x.path + ' = ' + J.stringify(x.node, { indent: '' }).slice(0, 500); }).join('\n') + (r.results.length > 50 ? '\n… ' + r.results.length + ' matches' : '') : 'No match.';
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
    if (file.size > 20 * 1024 * 1024) { showError({ msg: 'Files up to 20 MB are supported.' }); return; }
    fileName = file.name.replace(/(\.min)?\.(json|geojson|txt|map)$/i, '') || 'data';
    file.text().then(function (t) { input.value = t; run(true); });
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); run(true); });
  form.addEventListener('change', function (e) {
    if (e.target === input || e.target.id === 'jfFile' || e.target.id === 'jfPath') return;
    sync(); save(); run(false);
  });
  form.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-fix]')) { fix(); return; }
    if (t.id === 'jfGoto') {
      var p = J.parse(input.value);
      if (p.ok) return;
      input.focus();
      input.setSelectionRange(p.error.pos, Math.min(input.value.length, p.error.pos + 1));
      var lh = parseFloat(getComputedStyle(input).lineHeight) || 20;
      input.scrollTop = Math.max(0, (p.error.line - 3) * lh);
      return;
    }
    var row = t.closest('#jfTree [data-p]');
    if (row) { $('jfPath').value = row.getAttribute('data-p'); pathRun(); }
  });
  input.addEventListener('input', function () {
    clearTimeout(timer);
    if (input.value.length <= LIVE_MAX) timer = setTimeout(function () { run(false); }, 250);
  });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(true); } });
  input.addEventListener('dragover', function (e) { e.preventDefault(); });
  input.addEventListener('drop', function (e) { var f = e.dataTransfer && e.dataTransfer.files[0]; if (f) { e.preventDefault(); load(f); } });
  $('jfFile').addEventListener('change', function () { load(this.files[0]); this.value = ''; });
  $('jfPath').addEventListener('input', pathRun);
  $('jfSample').addEventListener('click', function () { input.value = input.defaultValue; fileName = 'data'; run(true); });
  $('jfClear').addEventListener('click', function () { input.value = ''; run(false); input.focus(); });
  $('jfCopy').addEventListener('click', function () {
    var btn = this, fallback = function () { output.hidden = false; output.select(); document.execCommand('copy'); sync(); flash(btn, 'Copied'); };
    if (navigator.clipboard) navigator.clipboard.writeText(output.value).then(function () { flash(btn, 'Copied'); }, fallback);
    else fallback();
    live.textContent = 'Copied to clipboard.';
  });
  $('jfDownload').addEventListener('click', function () {
    download(output.value + '\n', fileName + (opts().mode === 'minify' ? '.min.json' : '.json'), 'application/json');
  });
  $('jfCsv').addEventListener('click', function () {
    if (!last) return;
    var c = J.csv(last);
    download('﻿' + c.text, fileName + '.csv', 'text/csv');
    live.textContent = 'CSV with ' + c.rows + ' rows and ' + c.cols + ' columns' + (c.from ? ' from "' + c.from + '"' : '') + '.';
    status.insertAdjacentHTML('beforeend', ' · CSV: ' + c.rows + ' rows, ' + c.cols + ' columns');
  });
  $('jfEscape').addEventListener('click', function () {
    var p = J.parse(input.value);
    output.value = J.escapeText(p.ok ? J.stringify(p.ast, { indent: '' }) : input.value);
    form.elements.mode.value = 'format'; sync(); enable(true);
    status.innerHTML = 'Escaped as one JSON string (for JSON inside JSON or code).';
    live.textContent = 'Escaped.';
  });
  $('jfUnescape').addEventListener('click', function () {
    var r = J.unescapeText(input.value);
    if (!r.ok) { showError(r.error); return; }
    var p = J.parse(r.text);
    input.value = p.ok ? J.stringify(p.ast, { indent: indent(opts()) || '  ' }) : r.text;
    run(true);
  });

  restore();
  sync();
  if (form.elements.mode.value !== 'format' || form.elements.indent.value !== '2' || form.elements.sortKeys.checked) run(false);
})();
