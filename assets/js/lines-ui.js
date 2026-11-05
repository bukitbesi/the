/* UI shared by List to Paragraph, Remove Duplicate Lines and Sort Lines. The form's data-tool picks the job in
   TBBLines.run, the same function the build uses for the first result. Options live in the URL hash; the text stays
   in this browser (localStorage) and is never uploaded. */
(function () {
  'use strict';
  var L = window.TBBLines;
  var form = document.getElementById('lnForm');
  if (!L || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var tool = form.getAttribute('data-tool'), input = $('lnIn'), output = $('lnOut'), KEY = 'tbb-lines-' + tool, timer = 0;
  var D = L.DEFAULTS[tool];

  function opts() {
    var o = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || !(el.name in D)) return;
      if (el.type === 'checkbox') o[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
      else o[el.name] = el.value;
    });
    return o;
  }
  function hash(o) {
    var parts = Object.keys(o).filter(function (k) { return String(o[k]) !== String(D[k]); }).map(function (k) { return k + '=' + encodeURIComponent(o[k]); });
    history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
  }
  function fromHash() {
    location.hash.slice(1).split('&').forEach(function (p) {
      var i = p.indexOf('='), k = p.slice(0, i), v;
      if (i < 1 || !(k in D)) return;
      try { v = decodeURIComponent(p.slice(i + 1)); } catch (e) { return; }
      Array.prototype.forEach.call(form.querySelectorAll('[name="' + k + '"]'), function (el) {
        if (el.type === 'checkbox') el.checked = v === 'true';
        else if (el.type === 'radio') el.checked = el.value === v;
        else el.value = v;
      });
    });
  }
  function toggle(o) {
    // Option groups shown only for one mode, or one value of another option: data-show="mode=p2l".
    Array.prototype.forEach.call(form.querySelectorAll('[data-show]'), function (el) {
      var c = el.getAttribute('data-show').split('='); el.hidden = String(o[c[0]]) !== c[1];
    });
  }
  function render(write) {
    var o = opts(), r = L.run(tool, input.value, o), s = L.stats(input.value);
    toggle(o);
    output.value = r.text;
    $('lnSummary').textContent = r.summary;
    $('lnInStats').textContent = L.plural(s.lines, 'line', 'lines') + ' · ' + L.plural(s.words, 'word', 'words') + ' · ' + L.plural(s.chars, 'character', 'characters');
    $('lnLive').textContent = r.summary;
    if (write) hash(o);
    try { localStorage.setItem(KEY, input.value); } catch (e) { /* storage blocked */ }
  }
  var later = function () { clearTimeout(timer); timer = setTimeout(function () { render(true); }, 120); };
  function flash(btn, text) { var o = btn.textContent; btn.textContent = text; setTimeout(function () { btn.textContent = o; }, 1500); }

  form.addEventListener('input', later);
  form.addEventListener('change', later);
  form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
  $('lnCopy').addEventListener('click', function () {
    var b = this;
    if (navigator.clipboard) navigator.clipboard.writeText(output.value).then(function () { flash(b, 'Copied'); }, function () { output.select(); document.execCommand('copy'); flash(b, 'Copied'); });
    else { output.select(); document.execCommand('copy'); flash(b, 'Copied'); }
  });
  $('lnUse').addEventListener('click', function () { input.value = output.value; render(true); input.focus(); });
  $('lnDl').addEventListener('click', function () {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([output.value], { type: 'text/plain;charset=utf-8' }));
    a.download = tool + '-result.txt';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  $('lnClear').addEventListener('click', function () { input.value = ''; render(true); input.focus(); });
  var shuffle = $('lnShuffle');
  if (shuffle) shuffle.addEventListener('click', function () {
    var r = L.sort(input.value, { order: 'random', removeEmpty: form.elements.removeEmpty.checked, dedupe: form.elements.dedupe.checked });
    output.value = r.text; $('lnLive').textContent = 'Lines shuffled.';
  });

  try { var saved = localStorage.getItem(KEY); if (saved) input.value = saved; } catch (e) { /* storage blocked */ }
  if (location.hash.length > 1) fromHash();
  render(false);
})();
