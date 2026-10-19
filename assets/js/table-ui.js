/* HTML Table Generator UI. Edit cells in the grid (pasting from Excel or Google Sheets fills several cells), import
   CSV or Markdown, and the preview and code update as you type. The table is kept only in this browser. */
(function () {
  'use strict';
  var T = window.TBBTable;
  var form = document.getElementById('tgForm');
  if (!T || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'tbb-table', rows = [], timer = 0, MAX = 60;

  function opts() {
    var e = form.elements;
    return { header: e.header.checked, firstCol: e.firstCol.checked, caption: e.caption.value.trim(), theme: e.theme.value, inline: e.inline.checked, responsive: e.responsive.checked, alignNumbers: e.alignNumbers.checked };
  }
  function grid() {
    var h = T.views.gridHtml(rows, opts());
    $('tgGrid').innerHTML = h;
    $('tgSize').textContent = rows.length + ' × ' + (rows[0] ? rows[0].length : 0);
  }
  function output() {
    var o = opts(), kind = form.elements.out.value, html = T.html(rows, o);
    $('tgCode').value = kind === 'md' ? T.markdown(rows, o) : kind === 'csv' ? T.csv(rows) : html;
    $('tgPreview').innerHTML = html;
    try { localStorage.setItem(KEY, JSON.stringify({ rows: rows, o: o })); } catch (e) { /* storage blocked */ }
  }
  function resize(r, c) {
    r = Math.max(1, Math.min(MAX, r)); c = Math.max(1, Math.min(20, c));
    rows = rows.slice(0, r).map(function (x) { return x.slice(0, c); });
    while (rows.length < r) rows.push([]);
    rows = rows.map(function (x) { while (x.length < c) x.push(''); return x; });
    grid(); output();
  }
  function load(data, msg) {
    if (!data.length) { $('tgLive').textContent = 'Nothing to import.'; return; }
    rows = T.pad(data.slice(0, MAX).map(function (r) { return r.slice(0, 20); }));
    grid(); output();
    $('tgLive').textContent = msg || 'Imported ' + rows.length + ' rows and ' + rows[0].length + ' columns.';
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.addEventListener('input', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-r')) { rows[+t.getAttribute('data-r')][+t.getAttribute('data-c')] = t.value; }
    if (t.id === 'tgImport') return;
    clearTimeout(timer); timer = setTimeout(output, 120);
  });
  form.addEventListener('change', function (e) { if (/^(header|firstCol)$/.test(e.target.name)) grid(); output(); });
  // Pasting several cells (tabs or line breaks) into the grid fills from the cell you paste into.
  $('tgGrid').addEventListener('paste', function (e) {
    var t = e.target, text = (e.clipboardData || window.clipboardData).getData('text');
    if (!t.hasAttribute('data-r') || !/[\t\n]/.test(text)) return;
    e.preventDefault();
    var data = T.parse(text), r0 = +t.getAttribute('data-r'), c0 = +t.getAttribute('data-c');
    resize(Math.max(rows.length, r0 + data.length), Math.max(rows[0].length, c0 + (data[0] || []).length));
    data.forEach(function (r, i) { r.forEach(function (v, j) { rows[r0 + i][c0 + j] = v; }); });
    grid(); output();
    $('tgLive').textContent = 'Pasted ' + data.length + ' rows.';
  });
  form.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var c = rows[0] ? rows[0].length : 1;
    if (b.id === 'tgAddRow') resize(rows.length + 1, c);
    else if (b.id === 'tgDelRow') resize(rows.length - 1, c);
    else if (b.id === 'tgAddCol') resize(rows.length, c + 1);
    else if (b.id === 'tgDelCol') resize(rows.length, c - 1);
    else if (b.id === 'tgDoImport') load(T.parse($('tgImport').value));
    else if (b.id === 'tgClear') { rows = [['', '', ''], ['', '', ''], ['', '', '']]; grid(); output(); }
    else if (b.id === 'tgCopy') { var btn = b; if (navigator.clipboard) navigator.clipboard.writeText($('tgCode').value).then(function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy code'; }, 1500); }, function () {}); }
    else if (b.id === 'tgDownload') {
      var kind = form.elements.out.value, a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([$('tgCode').value], { type: kind === 'csv' ? 'text/csv' : kind === 'md' ? 'text/markdown' : 'text/html' }));
      a.download = 'table.' + (kind === 'csv' ? 'csv' : kind === 'md' ? 'md' : 'html');
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    }
  });

  // Start from the rows the page was built with, or the visitor's saved table.
  rows = [].map.call(document.querySelectorAll('#tgGrid tr'), function (tr) { return [].map.call(tr.querySelectorAll('input'), function (i) { return i.value; }); });
  try {
    var s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && s.rows && s.rows.length) {
      rows = T.pad(s.rows);
      var e = form.elements;
      ['header', 'firstCol', 'inline', 'responsive', 'alignNumbers'].forEach(function (k) { if (typeof s.o[k] === 'boolean') e[k].checked = s.o[k]; });
      e.caption.value = s.o.caption || '';
      if (T.THEMES[s.o.theme]) e.theme.value = s.o.theme;
      grid(); output();
    }
  } catch (x) { /* storage blocked */ }
})();
