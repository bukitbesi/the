/* EV vs petrol cost UI (BM + EN). Inputs map to TBBEv.calculate() with TBBTnb bills; state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBEv;
  var form = document.getElementById('evForm');
  if (!X || !form || !window.TBBTnb) return;
  var ms = document.documentElement.lang === 'ms';
  var fmt2 = new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR' });
  var money = function (n) { return fmt2.format(n); };
  var nf = function (n, d) { return new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { maximumFractionDigits: d === undefined ? 2 : d }).format(n); };
  var day = function (iso) { return new Date(iso + 'T00:00:00Z').toLocaleDateString(ms ? 'ms-MY' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); };
  var $ = function (id) { return document.getElementById(id); };
  var f = function (n) { return form.elements[n]; };
  function hashState(form, defaults) {
    var parts = [];
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || (el.type === 'radio' && !el.checked)) return;
      var def = el.tagName === 'SELECT' ? (el.querySelector('option[selected]') || el.options[0] || {}).value : el.defaultValue;
      if (defaults && el.name in defaults) def = defaults[el.name];
      if (el.value !== def) parts.push(el.name + '=' + encodeURIComponent(el.value));
    });
    history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
  }
  function fromHash(form, before) {
    if (location.hash.length < 2) return false;
    var kv = {};
    location.hash.slice(1).split('&').forEach(function (p) { var i = p.indexOf('='); if (i > 0) kv[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1)); });
    if (before) before(kv);
    Object.keys(kv).forEach(function (k) { var el = form.elements[k]; if (el && el.name) el.value = kv[k]; });
    return true;
  }
  function changed(form) {
    return Array.prototype.some.call(form.elements, function (el) {
      if (!el.name) return false;
      return el.tagName === 'SELECT' ? el.selectedIndex >= 0 && !el.options[el.selectedIndex].defaultSelected : el.value !== el.defaultValue;
    });
  }
  function rows(body, list) {
    body.textContent = '';
    list.forEach(function (x) {
      var tr = body.insertRow(), th = document.createElement('th');
      if (x[2]) tr.className = x[2];
      th.scope = 'row'; th.textContent = x[0]; tr.appendChild(th);
      tr.insertCell().textContent = x[1];
    });
  }
  function wire(form, render, printId) {
    var frame = 0;
    var schedule = function () { cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { render(true); }); };
    form.addEventListener('input', schedule);
    form.addEventListener('change', schedule);
    form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
    document.getElementById(printId).addEventListener('click', function () { window.print(); });
  }
  var now = new Date(), today = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
  var market = Number(form.getAttribute('data-market')), level = window.TBBTnb.protectionOn(today);
  var T = ms ? {
    cheaper: 'EV lebih murah', dearer: 'EV lebih mahal', kwh: 'Tenaga sebulan', home: function (r) { return 'Cas di rumah (' + nf(r.homeKwh, 0) + ' kWj, kenaikan bil TNB)'; },
    pub: function (r) { return 'Cas awam (' + nf(r.publicKwh, 0) + ' kWj)'; }, ev: 'Kos EV sebulan', litres: function (r) { return 'Petrol (' + nf(r.litres, 1) + ' liter)'; },
    year: 'Beza setahun', perKm: 'Kos setiap 100 km (EV / petrol)', payback: 'Tempoh pulang modal', years: ' tahun', none: 'Tiada (EV tidak lebih murah)',
    sub: function (r) { return 'EV ' + money(r.ev) + ' · petrol ' + money(r.petrol) + ' sebulan'; },
    over: 'Penggunaan rumah melebihi 1,500 kWj; kalkulator mengira hingga 1,500 kWj sahaja.',
    live: function (r) { return (r.save >= 0 ? 'EV jimat ' : 'EV lebih mahal ') + money(Math.abs(r.save)) + ' sebulan.'; }
  } : {
    cheaper: 'EV is cheaper', dearer: 'EV costs more', kwh: 'Energy a month', home: function (r) { return 'Home charging (' + nf(r.homeKwh, 0) + ' kWh, rise in TNB bill)'; },
    pub: function (r) { return 'Public charging (' + nf(r.publicKwh, 0) + ' kWh)'; }, ev: 'EV cost a month', litres: function (r) { return 'Petrol (' + nf(r.litres, 1) + ' litres)'; },
    year: 'Difference a year', perKm: 'Cost per 100 km (EV / petrol)', payback: 'Payback period', years: ' years', none: 'None (EV is not cheaper)',
    sub: function (r) { return 'EV ' + money(r.ev) + ' · petrol ' + money(r.petrol) + ' a month'; },
    over: 'Home use is above 1,500 kWh; the calculator counts up to 1,500 kWh only.',
    live: function (r) { return (r.save >= 0 ? 'EV saves ' : 'EV costs ') + money(Math.abs(r.save)) + (r.save >= 0 ? ' a month.' : ' more a month.'); }
  };
  form.addEventListener('change', function (e) {
    if (e.target.name === 'evModel' && e.target.value !== 'custom') f('evUse').value = e.target.value;
    if (e.target.name === 'carModel' && e.target.value !== 'custom') f('petrolUse').value = e.target.value;
  });
  form.addEventListener('input', function (e) {
    if (e.target.name === 'evUse') f('evModel').value = Array.prototype.some.call(f('evModel').options, function (o) { return o.value === e.target.value; }) ? e.target.value : 'custom';
    if (e.target.name === 'petrolUse') f('carModel').value = Array.prototype.some.call(f('carModel').options, function (o) { return o.value === e.target.value; }) ? e.target.value : 'custom';
  });

  function render(writeHash) {
    var r = X.calculate({ km: f('km').value, evUse: f('evUse').value, homeShare: f('homeShare').value, houseKwh: f('houseKwh').value, publicRate: f('publicRate').value,
      protection: level, petrolUse: f('petrolUse').value, budi: f('budi').value, marketPrice: market, evExtra: f('evExtra').value });
    $('eHead').textContent = r.save >= 0 ? T.cheaper : T.dearer;
    $('eSave').textContent = money(Math.abs(r.save));
    $('eSub').textContent = T.sub(r);
    var n = [[T.kwh, nf(r.evKwh, 0) + ' kWh'], [T.home(r), money(r.home)], [T.pub(r), money(r.pub)], [T.ev, money(r.ev), 'total'], [T.litres(r), money(r.petrol), 'total'],
      [T.year, money(Math.abs(r.yearly))], [T.perKm, money(r.evPerKm) + ' / ' + money(r.petrolPerKm)]];
    if (r.extra) n.push([T.payback, r.payback ? nf(r.payback, 1) + T.years : T.none]);
    rows($('eLines'), n);
    $('eNote').textContent = r.over ? T.over : ''; $('eNote').hidden = !r.over;
    $('eLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'evPrint');
  if (fromHash(form) || changed(form) || level !== Number(form.getAttribute('data-protection'))) render(false);
})();
