/* Land size converter UI (EN + BM). Inputs map to TBBLand; state is kept in the URL hash. */
(function () {
  'use strict';
  var L = window.TBBLand;
  var form = document.getElementById('landForm');
  if (!L || !form) return;
  var ms = document.documentElement.lang === 'ms', lang = ms ? 'ms' : 'en', loc = ms ? 'ms-MY' : 'en-MY';
  var rm = new Intl.NumberFormat(loc, { style: 'currency', currency: 'MYR', maximumFractionDigits: 2 });
  var $ = function (id) { return document.getElementById(id); };
  var f = function (n) { return form.elements[n]; };
  var fmt = function (n) {
    var d = n >= 1000 ? 0 : n >= 100 ? 2 : 4;
    return new Intl.NumberFormat(loc, { maximumFractionDigits: d }).format(n);
  };
  var T = ms ? { per: { sqft: 'sekaki persegi', sqm: 'semeter persegi', acre: 'seekar', relung: 'serelung' }, live: 'Keluasan ' }
    : { per: { sqft: 'per sq ft', sqm: 'per m²', acre: 'per acre', relung: 'per relung' }, live: 'Area ' };

  function sqft() {
    var mode = f('mode').value;
    if (mode === 'arp') return L.fromArp(f('a').value, f('r').value, f('p').value);
    if (mode === 'rect') return L.rect(f('len').value, f('wid').value, f('side').value);
    return L.convert(f('value').value, f('unit').value);
  }

  function render(writeHash) {
    var mode = f('mode').value;
    ['area', 'arp', 'rect'].forEach(function (m) { $('landBy-' + m).hidden = m !== mode; });
    var s = sqft(), all = L.all(s), arp = L.toArp(s);
    $('lMain').textContent = fmt(all.sqft) + ' ' + L.SHORT.sqft;
    $('lSub').textContent = fmt(all.acre) + ' ' + L.NAMES[lang].acre.toLowerCase() + ' · ' + fmt(all.sqm) + ' m² · ' + fmt(all.relung) + ' relung';
    L.ORDER.forEach(function (u) { $('lu-' + u).textContent = fmt(all[u]); });
    $('lArp').textContent = arp.a + 'a ' + arp.r + 'r ' + arp.p + 'p';
    var p = L.price(f('price').value, s);
    $('lPriceRows').hidden = !p;
    if (p) ['sqft', 'sqm', 'acre', 'relung'].forEach(function (k) { $('lp-' + k).textContent = rm.format(p[k]); });
    $('lLive').textContent = T.live + $('lMain').textContent + '.';
    if (writeHash) {
      var parts = [];
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name) return;
        var def = el.tagName === 'SELECT' ? (el.querySelector('option[selected]') || el.options[0]).value : el.defaultValue;
        if (el.value !== def) parts.push(el.name + '=' + encodeURIComponent(el.value));
      });
      history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
    }
  }

  function fromHash() {
    if (location.hash.length < 2) return false;
    location.hash.slice(1).split('&').forEach(function (kv) {
      var i = kv.indexOf('='), el = form.elements[kv.slice(0, i)];
      if (el && el.name) el.value = decodeURIComponent(kv.slice(i + 1));
    });
    return true;
  }

  // Unit links in the content ("1 relung", "1 ekar") load that conversion.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-land]');
    if (!a) return;
    e.preventDefault();
    var kv = a.getAttribute('data-land').split(':');
    f('mode').value = 'area'; f('value').value = kv[1]; f('unit').value = kv[0];
    render(true);
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  var frame = 0;
  var schedule = function () { cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { render(true); }); };
  form.addEventListener('input', schedule);
  form.addEventListener('change', schedule);
  form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
  $('landPrint').addEventListener('click', function () { window.print(); });
  var restored = Array.prototype.some.call(form.elements, function (el) {
    if (!el.name) return false;
    return el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected : el.value !== el.defaultValue;
  });
  if (fromHash() || restored) render(false);
})();
