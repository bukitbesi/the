/* Text to HTML Converter UI. Converts as you type; mode and options live in the URL hash (#mode=…), the text only in
   this browser. The preview shows HTML this page generated itself (every character of your text is escaped). */
(function () {
  'use strict';
  var H = window.TBBTextHtml;
  var form = document.getElementById('thForm');
  if (!H || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'tbb-texthtml', OPTS = ['breaks', 'links', 'lists', 'newTab', 'nofollow', 'indent'], timer = 0;

  function opts() { var o = {}; OPTS.forEach(function (k) { o[k] = form.elements[k].checked; }); return o; }
  function mode() { return form.elements.mode.value; }
  function run() {
    var m = mode(), out = H.convert($('thIn').value, m, opts());
    $('thOut').value = out;
    $('thOutLabel').textContent = m === 'html2text' ? 'Plain text' : 'HTML code';
    $('thOpts').hidden = m !== 'text';
    $('thPreviewWrap').hidden = m === 'html2text';
    // Markdown headings are shifted down two levels in the preview only, so the page keeps one h1.
    if (m !== 'html2text') $('thPreview').innerHTML = m === 'markdown' && window.TBBNotes ? window.TBBNotes.html($('thIn').value, { shift: 2 }) : out;
    $('thStats').textContent = out ? Array.from(out).length.toLocaleString('en-US') + ' characters' : '';
    try {
      history.replaceState(null, '', '#mode=' + m + (m === 'text' ? '&o=' + OPTS.map(function (k) { return form.elements[k].checked ? 1 : 0; }).join('') : ''));
      localStorage.setItem(KEY, $('thIn').value);
    } catch (e) { /* file:// or storage blocked */ }
  }
  function flash(btn, t) { var o = btn.textContent; btn.textContent = t; setTimeout(function () { btn.textContent = o; }, 1500); }

  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 100); });
  form.addEventListener('change', run);
  $('thCopy').addEventListener('click', function () { var b = this; if (navigator.clipboard) navigator.clipboard.writeText($('thOut').value).then(function () { flash(b, 'Copied'); }, function () {}); });
  $('thDownload').addEventListener('click', function () {
    var html = mode() !== 'html2text', a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html ? H.page($('thOut').value, 'Converted text') : $('thOut').value], { type: html ? 'text/html' : 'text/plain' }));
    a.download = html ? 'converted.html' : 'converted.txt';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  });
  $('thClear').addEventListener('click', function () { $('thIn').value = ''; run(); $('thIn').focus(); });

  var m = /mode=(text|markdown|html2text)(?:&o=([01]{6}))?/.exec(location.hash), saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; }
  if (m) { form.elements.mode.value = m[1]; if (m[2]) OPTS.forEach(function (k, i) { form.elements[k].checked = m[2][i] === '1'; }); }
  if (saved) $('thIn').value = saved;
  if (m || saved) run();
})();
