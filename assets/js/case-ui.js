/* Case Converter UI. Case buttons change the text in place (Undo steps back); the developer-case table updates
   as you type. Text stays in this browser (localStorage) and is never uploaded. */
(function () {
  'use strict';
  var C = window.TBBCase;
  var form = document.getElementById('ccForm');
  if (!C || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var text = $('ccText'), KEY = 'tbb-case', history = [], timer = 0;

  function opts() { return { keepAcronyms: $('ccKeep').checked }; }
  function refresh() {
    var t = text.value;
    $('ccCount').textContent = C.views.countsText(C.counts(t));
    $('ccDev').innerHTML = C.views.devRows(t);
    $('ccUndo').disabled = !history.length;
    try { localStorage.setItem(KEY, JSON.stringify({ t: t, keep: $('ccKeep').checked })); } catch (e) { /* storage blocked */ }
  }
  function apply(next, label) {
    if (next === text.value) { $('ccLive').textContent = 'No change: the text is already ' + label + '.'; return; }
    history.push(text.value);
    if (history.length > 50) history.shift();
    text.value = next;
    refresh();
    $('ccLive').textContent = 'Converted to ' + label + '.';
  }
  function copy(value, btn) {
    var done = function () { var o = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = o; }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(value).then(done, function () { text.select(); document.execCommand('copy'); done(); });
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var k = b.getAttribute('data-case');
    if (k) { var c = C.CASES.filter(function (x) { return x.key === k; })[0]; apply(C.convert(text.value, k, opts()), c.label); return; }
    k = b.getAttribute('data-copy');
    if (k) copy(C.convert(text.value, k, opts()), b);
  });
  text.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(refresh, 120); });
  $('ccKeep').addEventListener('change', refresh);
  $('ccClean').addEventListener('click', function () { apply(C.clean(text.value), 'cleaned up'); });
  $('ccUndo').addEventListener('click', function () { if (history.length) { text.value = history.pop(); refresh(); $('ccLive').textContent = 'Undone.'; } });
  $('ccCopy').addEventListener('click', function () { copy(text.value, this); });
  $('ccClear').addEventListener('click', function () { if (text.value) history.push(text.value); text.value = ''; refresh(); text.focus(); });

  try {
    var s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && typeof s.t === 'string' && s.t) { text.value = s.t; $('ccKeep').checked = s.keep !== false; refresh(); }
  } catch (e) { /* storage blocked */ }
})();
