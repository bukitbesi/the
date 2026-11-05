/* Unit converter UI (EN + BM). Text comes from TBBUnit.view, the same function the build uses, so the first result
   never shifts. State in the URL hash (#cat=mass&from=kati&to=kg&v=2). */
(function () {
  'use strict';
  var U = window.TBBUnit;
  var form = document.getElementById('uForm');
  if (!U || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var lang = document.documentElement.lang === 'ms' ? 'ms' : 'en', el = form.elements;
  var DEF = { cat: el.cat.value, from: el.from.value, to: el.to.value, v: el.v.value };

  function fill(sel, cat, value) {
    sel.textContent = '';
    U.CATS[cat].units.forEach(function (u) { var o = document.createElement('option'); o.value = u[0]; o.textContent = U.name(u, lang) + ' (' + u[4] + ')'; sel.appendChild(o); });
    sel.value = value;
  }
  function rows(list) {
    var body = $('uRows');
    body.textContent = '';
    list.forEach(function (x) { var tr = body.insertRow(), th = document.createElement('th'); th.scope = 'row'; th.textContent = x[0]; tr.appendChild(th); tr.insertCell().textContent = x[1]; });
  }
  function render(write) {
    var v = U.view({ cat: el.cat.value, from: el.from.value, to: el.to.value, value: el.v.value }, lang);
    $('uBig').textContent = v.big; $('uSub').textContent = v.sub; $('uRule').textContent = v.rule; rows(v.rows);
    $('uLive').textContent = v.sub;
    if (write) {
      var s = { cat: v.cat, from: v.from, to: v.to, v: el.v.value }, parts = Object.keys(s).filter(function (k) { return s[k] !== DEF[k]; }).map(function (k) { return k + '=' + encodeURIComponent(s[k]); });
      history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
    }
  }
  function setCat(cat, from, to) {
    var d = U.DEFAULTS[cat];
    fill(el.from, cat, U.unit(cat, from) ? from : d[0]);
    fill(el.to, cat, U.unit(cat, to) ? to : d[1]);
  }

  var frame = 0, later = function () { cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { render(true); }); };
  el.cat.addEventListener('change', function () { setCat(el.cat.value); render(true); });
  form.addEventListener('input', function (e) { if (e.target !== el.cat) later(); });
  form.addEventListener('change', function (e) { if (e.target !== el.cat) later(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
  $('uSwap').addEventListener('click', function () { var a = el.from.value; el.from.value = el.to.value; el.to.value = a; render(true); });
  $('uPrint').addEventListener('click', function () { window.print(); });
  // Quick links in the reference tables load that pair into the converter.
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-u]');
    if (!a) return;
    e.preventDefault();
    var p = a.getAttribute('data-u').split(' ');
    el.cat.value = p[0]; setCat(p[0], p[1], p[2]); el.v.value = p[3] || '1'; render(true);
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  if (location.hash.length > 1) {
    var h = {};
    location.hash.slice(1).split('&').forEach(function (p) { var i = p.indexOf('='); if (i > 0) try { h[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1)); } catch (e) { /* malformed */ } });
    if (U.CATS[h.cat]) { el.cat.value = h.cat; setCat(h.cat, h.from, h.to); }
    if (h.v != null) el.v.value = h.v;
    render(false);
  }
})();
