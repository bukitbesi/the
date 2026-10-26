/* UPU merit calculator UI (BM + EN). Text comes from TBBMerit.view, the same function the build uses, so the first
   result never shifts. State in the URL hash. */
(function () {
  'use strict';
  var M = window.TBBMerit;
  var form = document.getElementById('mtForm');
  if (!M || !form) return;
  var lang = document.documentElement.lang === 'ms' ? 'ms' : 'en', $ = function (id) { return document.getElementById(id); }, f = function (n) { return form.elements[n].value; };
  var list = function (p) { return [1, 2, 3, 4].map(function (i) { return f(p + i); }); };

  function rows(body, items) {
    body.textContent = '';
    items.forEach(function (x) { var tr = body.insertRow(), th = document.createElement('th'); th.scope = 'row'; th.textContent = x[0]; tr.appendChild(th); tr.insertCell().textContent = x[1]; });
  }
  function hash() {
    var parts = [];
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      var def = el.tagName === 'SELECT' ? (el.querySelector('option[selected]') || el.options[0]).value : el.defaultValue;
      if (el.value !== def) parts.push(el.name + '=' + encodeURIComponent(el.value));
    });
    history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
  }
  function fromHash() {
    location.hash.slice(1).split('&').forEach(function (p) {
      var i = p.indexOf('='), el = i > 0 && form.elements[p.slice(0, i)];
      if (el && el.name) try { el.value = decodeURIComponent(p.slice(i + 1)); } catch (e) { /* malformed hash part */ }
    });
  }

  function render(write) {
    var mode = f('mode');
    $('mtSpm').hidden = mode !== 'spm'; $('mtCg').hidden = mode !== 'cgpa'; $('mtStam').hidden = mode !== 'stam';
    var v = M.view({ mode: mode, pkg: f('pkg'), universal: list('u'), package: list('p'), others: list('o'), cgpa: f('cgpa'), stam: f('stam'), koko: f('koko') }, lang);
    $('mtBig').textContent = v.big; $('mtSub').textContent = v.sub; rows($('mtRows'), v.rows); $('mtNote').textContent = v.note;
    $('mtLive').textContent = v.big + '. ' + v.sub + '.';
    if (write) hash();
  }
  var frame = 0, later = function () { cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { render(true); }); };
  form.addEventListener('input', later);
  form.addEventListener('change', later);
  form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
  $('mtPrint').addEventListener('click', function () { window.print(); });
  if (location.hash.length > 1) { fromHash(); render(false); }
})();
