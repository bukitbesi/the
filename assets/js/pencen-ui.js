/* Civil service pension calculator UI (BM + EN). All text comes from TBBPencen.view/viewAdjusted, the same functions
   the build uses, so the first result never shifts. State in the URL hash. */
(function () {
  'use strict';
  var P = window.TBBPencen;
  var form = document.getElementById('pcForm');
  if (!P || !form) return;
  var lang = document.documentElement.lang === 'ms' ? 'ms' : 'en', $ = function (id) { return document.getElementById(id); }, f = function (n) { return form.elements[n].value; };

  function rows(body, list) {
    body.textContent = '';
    list.forEach(function (x) { var tr = body.insertRow(), th = document.createElement('th'); th.scope = 'row'; th.textContent = x[0]; tr.appendChild(th); tr.insertCell().textContent = x[1]; });
  }
  function grid(box, list) {
    box.textContent = '';
    list.forEach(function (x) { var d = document.createElement('div'), s = document.createElement('span'), b = document.createElement('b'); s.textContent = x[0]; b.textContent = x[1]; d.appendChild(s); d.appendChild(b); box.appendChild(d); });
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
    var v = P.view({ birth: f('birth'), appointed: f('appointed'), retire: f('retire'), salary: f('salary'), allowances: f('allow'), gcrDays: f('gcr'), gender: f('gender') }, lang);
    $('pcBig').textContent = v.big; $('pcSub').textContent = v.sub; grid($('pcGrid'), v.grid); rows($('pcRows'), v.rows); $('pcNote').textContent = v.note;
    var a = P.viewAdjusted({ salary: f('psalary'), months: f('pmonths'), retired: f('pretired'), jusa: f('pgroup') === 'jusa', pkkp: f('pkkp') }, lang);
    $('paBig').textContent = a.big; $('paSub').textContent = a.sub; rows($('paRows'), a.rows); $('paNote').textContent = a.note;
    $('pcLive').textContent = v.big + ', ' + v.sub + '. ' + v.grid[2][0] + ' ' + v.grid[2][1] + '.';
    if (write) hash();
  }
  var frame = 0, later = function () { cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { render(true); }); };
  form.addEventListener('input', later);
  form.addEventListener('change', later);
  form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
  $('pcPrint').addEventListener('click', function () { window.print(); });
  if (location.hash.length > 1) { fromHash(); render(false); }
})();
