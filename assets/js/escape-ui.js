/* Parse HTML / Encoder-Decoder UI. Converts as you type; mode and direction live in the URL hash (#mode=…&dir=…),
   the text only in this browser. */
(function () {
  'use strict';
  var E = window.TBBEscape;
  var form = document.getElementById('esForm');
  if (!E || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'tbb-escape', timer = 0;
  var OPTS = { html: ['quotes', 'nonAscii', 'block'], url: ['whole', 'plus'], base64: ['urlSafe'], js: ['single'], unicode: [] };

  function state() { var e = form.elements; return { mode: e.mode.value, dir: e.dir.value }; }
  function run() {
    var s = state(), e = form.elements, o = { quotes: e.quotes.checked, nonAscii: e.nonAscii.checked, whole: e.whole.checked, plus: e.plus.checked, urlSafe: e.urlSafe.checked, single: e.single.checked };
    [].forEach.call(form.querySelectorAll('[data-opt]'), function (l) {
      var k = l.getAttribute('data-opt'), dirs = l.getAttribute('data-dir');
      l.hidden = OPTS[s.mode].indexOf(k) < 0 || (dirs && dirs !== s.dir);
    });
    var r = s.mode === 'html' && s.dir === 'encode' && e.block.checked ? { ok: true, text: E.codeBlock($('esIn').value) } : E.run(s.mode, s.dir, $('esIn').value, o);
    $('esOut').value = r.ok ? r.text : '';
    $('esErr').hidden = r.ok;
    $('esErr').textContent = r.ok ? '' : r.error;
    $('esGo').textContent = (s.dir === 'decode' ? 'Decode ' : 'Encode ') + E.MODES[s.mode].label;
    $('esStats').textContent = r.ok && r.text ? Array.from($('esIn').value).length.toLocaleString('en-US') + ' → ' + Array.from(r.text).length.toLocaleString('en-US') + ' characters' : '';
    try { history.replaceState(null, '', '#mode=' + s.mode + '&dir=' + s.dir); localStorage.setItem(KEY, $('esIn').value); } catch (x) { /* file:// or storage blocked */ }
  }
  function flash(btn, t) { var o = btn.textContent; btn.textContent = t; setTimeout(function () { btn.textContent = o; }, 1500); }

  form.addEventListener('submit', function (e) { e.preventDefault(); run(); });
  form.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 80); });
  form.addEventListener('change', run);
  $('esSwap').addEventListener('click', function () {
    var e = form.elements;
    $('esIn').value = $('esOut').value;
    e.dir.value = e.dir.value === 'encode' ? 'decode' : 'encode';
    run();
    $('esLive').textContent = 'Output moved to input; now ' + e.dir.value + 'ing.';
  });
  $('esCopy').addEventListener('click', function () { var b = this; if (navigator.clipboard) navigator.clipboard.writeText($('esOut').value).then(function () { flash(b, 'Copied'); }, function () {}); });
  $('esClear').addEventListener('click', function () { $('esIn').value = ''; run(); $('esIn').focus(); });

  var m = /mode=(html|url|base64|js|unicode)&dir=(encode|decode)/.exec(location.hash), saved = null;
  try { saved = localStorage.getItem(KEY); } catch (x) { saved = null; }
  if (m) { form.elements.mode.value = m[1]; form.elements.dir.value = m[2]; }
  if (saved) $('esIn').value = saved;
  if (m || saved) run();
})();
