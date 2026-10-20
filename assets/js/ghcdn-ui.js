/* GitHub to jsDelivr UI. Converts each pasted link as you type; links are kept only in this browser. */
(function () {
  'use strict';
  var G = window.TBBGhCdn;
  var form = document.getElementById('gcForm');
  if (!G || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'tbb-ghcdn', timer = 0;

  function run() {
    var links = $('gcIn').value.split(/\s+/).filter(Boolean).slice(0, 50);
    $('gcOut').innerHTML = links.map(function (l, i) { return G.views.resultHtml(G.convert(l), i); }).join('') || '<p class="help">Paste a GitHub file link above.</p>';
    var ok = links.filter(function (l) { return G.convert(l).ok; }).length;
    $('gcLive').textContent = links.length ? ok + ' of ' + links.length + (links.length === 1 ? ' link' : ' links') + ' converted.' : '';
    try { localStorage.setItem(KEY, $('gcIn').value); } catch (e) { /* storage blocked */ }
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); run(); });
  $('gcIn').addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 120); });
  $('gcOut').addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]');
    if (!b || !navigator.clipboard) return;
    navigator.clipboard.writeText(b.getAttribute('data-copy')).then(function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1500); }, function () {});
  });
  $('gcClear').addEventListener('click', function () { $('gcIn').value = ''; run(); $('gcIn').focus(); });

  try { var s = localStorage.getItem(KEY); if (s) { $('gcIn').value = s; run(); } } catch (e) { /* storage blocked */ }
})();
