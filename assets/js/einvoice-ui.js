/* LHDN e-Invoice checker UI (BM + EN): answers "when must my business start e-invoicing, or am I exempt?" with
   TBBEinvoice.check, live on every change. Answers live in the URL hash so an accountant can share a result. */
(function () {
  'use strict';
  var E = window.TBBEinvoice;
  var form = document.getElementById('eiForm');
  if (!E || !form) return;
  var ms = document.documentElement.lang === 'ms', $ = function (id) { return document.getElementById(id); }, f = function (n) { return form.elements[n]; };
  function input() { return { started: f('started').value, rev2022: f('rev2022').value, reached: f('reached').value, group: form.querySelector('input[name=group]:checked').value === 'yes', commenced: f('commenced').value }; }
  function render() {
    var o = input(), d = E.describe(o, ms ? 'ms' : 'en', new Date().toISOString().slice(0, 10));
    $('eiRevF').hidden = o.started !== 'by2022';
    $('eiCommF').hidden = !(o.started === '2026+' && o.group);
    Array.prototype.forEach.call(f('reached').options, function (op) { if (op.value === 'YA2023-2025') op.hidden = op.disabled = o.started === '2026+'; });
    if (o.started === '2026+' && f('reached').value === 'YA2023-2025') { f('reached').value = ''; o.reached = ''; d = E.describe(o, ms ? 'ms' : 'en', new Date().toISOString().slice(0, 10)); }
    $('eiResult').className = 'ei-result ' + (d.must ? 'warn' : 'ok');
    $('eiBadge').textContent = d.badge; $('eiDate').textContent = d.date; $('eiRelax').textContent = d.relax; $('eiWhy').textContent = d.why;
    var ol = $('eiSteps'); ol.textContent = '';
    d.steps.forEach(function (s) { var li = document.createElement('li'); li.textContent = s; ol.appendChild(li); });
    $('eiLive').textContent = d.badge + '. ' + d.date + '. ' + d.why;
    hash(o);
  }
  function hash(o) {
    var parts = [];
    if (o.started !== 'by2022') parts.push('started=' + o.started);
    if (f('rev2022').value !== f('rev2022').defaultValue) parts.push('rev=' + encodeURIComponent(f('rev2022').value));
    if (o.reached) parts.push('reached=' + o.reached);
    if (o.group) parts.push('group=1');
    if (o.commenced) parts.push('commenced=' + o.commenced);
    history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
  }
  if (location.hash.length > 1) location.hash.slice(1).split('&').forEach(function (p) {
    var kv = p.split('='), v = decodeURIComponent(kv[1] || '');
    if (kv[0] === 'group') form.querySelector('input[name=group][value="' + (v === '1' ? 'yes' : 'no') + '"]').checked = true;
    else if (kv[0] === 'rev') f('rev2022').value = v;
    else if (f(kv[0])) f(kv[0]).value = v;
  });
  form.addEventListener('input', render);
  form.addEventListener('change', render);
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  $('eiPrint').addEventListener('click', function () { window.print(); });
  render();
})();
