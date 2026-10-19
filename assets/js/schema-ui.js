/* Schema Markup Generator UI. Pick a type, fill the form, and the JSON-LD and Google's required/recommended checks
   update as you type. The chosen type is in the URL hash (#type=video); answers are kept per type in this browser. */
(function () {
  'use strict';
  var S = window.TBBSchema;
  var form = document.getElementById('scForm');
  if (!S || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'tbb-schema', saved = {}, type = 'article', timer = 0, result = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { saved = {}; }

  function values() {
    var o = { tz: $('scTz').value };
    S.TYPES[type].fields.forEach(function (f) { var el = form.elements[f[0]]; if (el) o[f[0]] = el.value; });
    return o;
  }
  function show(t, keepFocus) {
    if (!S.TYPES[t]) t = 'article';
    type = t;
    [].forEach.call(form.querySelectorAll('[data-type]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-type') === t ? 'true' : 'false'); });
    $('scFields').innerHTML = S.views.formHtml(t, Object.assign(S.defaults(t), saved[t] || {}));
    $('scRich').textContent = S.TYPES[t].rich;
    $('scFieldsH').textContent = S.TYPES[t].label + ' details';
    try { history.replaceState(null, '', '#type=' + t); } catch (e) { /* file:// */ }
    run();
    if (!keepFocus) $('scLive').textContent = S.TYPES[t].label + ' form loaded.';
  }
  function run() {
    var v = values();
    result = S.generate(type, v);
    $('scOut').value = S.scriptTag(result.text);
    $('scChecks').innerHTML = S.views.checksHtml(result);
    saved[type] = v;
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) { /* storage blocked */ }
  }
  function flash(btn, t) { var o = btn.textContent; btn.textContent = t; setTimeout(function () { btn.textContent = o; }, 1500); }

  form.addEventListener('submit', function (e) { e.preventDefault(); run(); });
  form.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 120); });
  form.addEventListener('change', run);
  form.addEventListener('click', function (e) {
    var b = e.target.closest('[data-type]');
    if (b) show(b.getAttribute('data-type'));
  });
  $('scCopy').addEventListener('click', function () {
    var btn = this;
    if (navigator.clipboard) navigator.clipboard.writeText($('scOut').value).then(function () { flash(btn, 'Copied'); }, function () {});
  });
  $('scDownload').addEventListener('click', function () {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([result.text + '\n'], { type: 'application/ld+json' }));
    a.download = type + '-schema.json';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  });
  $('scReset').addEventListener('click', function () { delete saved[type]; show(type, true); });

  var m = /type=([a-z]+)/.exec(location.hash);
  if (m && S.TYPES[m[1]] && m[1] !== 'article') show(m[1], true);
  else if (saved.article) show('article', true);
})();
