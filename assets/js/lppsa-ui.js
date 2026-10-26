/* LPPSA financing calculator UI (BM + EN). Text comes from TBBLppsa.view, the same function the build uses, so the
   first result never shifts. State in the URL hash. */
(function () {
  'use strict';
  var L = window.TBBLppsa;
  var form = document.getElementById('lpForm');
  if (!L || !form) return;
  var lang = document.documentElement.lang === 'ms' ? 'ms' : 'en', $ = function (id) { return document.getElementById(id); }, f = function (n) { return form.elements[n].value; };
  var d = new Date(), today = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);

  function rows(body, list) {
    body.textContent = '';
    list.forEach(function (x) { var tr = body.insertRow(), th = document.createElement('th'); th.scope = 'row'; th.textContent = x[0]; tr.appendChild(th); tr.insertCell().textContent = x[1]; });
  }
  function grid(box, list) {
    box.textContent = '';
    list.forEach(function (x) { var el = document.createElement('div'), s = document.createElement('span'), b = document.createElement('b'); s.textContent = x[0]; b.textContent = x[1]; el.appendChild(s); el.appendChild(b); box.appendChild(el); });
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
    var second = f('second') === 'yes';
    $('lpFirst').hidden = !second; $('lpRetire').hidden = f('scheme') !== 'kwsp';
    var v = L.view({ basic: f('basic'), allowances: f('allow'), mandatory: f('mand'), debts: f('debts'), others: f('others'), age: f('age'), scheme: f('scheme'), retireAge: f('retire'),
      second: second, firstUsed: f('first'), price: f('price'), amount: f('amount'), today: today }, lang);
    $('lpBig').textContent = v.big; $('lpSub').textContent = v.sub; grid($('lpGrid'), v.grid); rows($('lpRows'), v.rows); $('lpNote').textContent = v.note;
    $('lpLive').textContent = v.big + '. ' + v.sub + '.';
    if (write) hash();
  }
  var frame = 0, later = function () { cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { render(true); }); };
  form.addEventListener('input', later);
  form.addEventListener('change', later);
  form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
  $('lpPrint').addEventListener('click', function () { window.print(); });
  if (location.hash.length > 1) fromHash();
  render(false);
})();
