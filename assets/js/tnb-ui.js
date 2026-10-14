/* TNB bill calculator UI (BM + EN). Inputs map to TBBTnb.calculate(); the protection level follows today's date unless set; state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBTnb;
  var form = document.getElementById('tnbForm');
  if (!X || !form) return;
  var ms = document.documentElement.lang === 'ms', lang = ms ? 'ms' : 'en';
  var fmt2 = new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR' });
  var money = function (n) { return fmt2.format(n); };
  var nf = function (n, d) { return new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { maximumFractionDigits: d === undefined ? 2 : d }).format(n); };
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
  var T = ms ? {
    energy: 'Caj tenaga (27.03 sen)', capacity: 'Caj kapasiti (4.55 sen)', network: 'Caj rangkaian (12.85 sen)', eei: 'Rebat EEI', afa: 'AFA', retail: 'Caj peruncitan',
    kwtbb: 'KWTBB 1.6%', sst: 'SST 8%', total: 'Jumlah bil',
    sub: function (r) { return nf(r.perKwh, 1) + ' sen/kWj purata · ' + (r.protected ? 'dilindungi: tiada AFA, caj peruncitan dan SST' : 'melebihi ' + r.level + ' kWj'); },
    live: function (r) { return 'Anggaran bil ' + money(r.total) + ' bagi ' + r.kwh + ' kWj.'; }
  } : {
    energy: 'Energy charge (27.03 sen)', capacity: 'Capacity charge (4.55 sen)', network: 'Network charge (12.85 sen)', eei: 'EEI rebate', afa: 'AFA', retail: 'Retail charge',
    kwtbb: 'KWTBB 1.6%', sst: 'SST 8%', total: 'Total bill',
    sub: function (r) { return nf(r.perKwh, 1) + ' sen/kWh on average · ' + (r.protected ? 'protected: no AFA, retail charge or SST' : 'above ' + r.level + ' kWh'); },
    live: function (r) { return 'Estimated bill ' + money(r.total) + ' for ' + r.kwh + ' kWh.'; }
  };
  var today = new Date().toISOString().slice(0, 10);

  function render(writeHash) {
    if (f('mode').value === 'appliance') f('kwh').value = Math.round(X.applianceKwh(f('watts').value, f('hours').value, 30) + Number(f('base').value || 0));
    $('tAppliance').hidden = f('mode').value !== 'appliance';
    var r = X.calculate({ kwh: f('kwh').value, afa: f('afa').value, protection: f('protection').value });
    $('tTotal').textContent = money(r.total);
    $('tSub').textContent = T.sub(r);
    var list = [[T.energy, money(r.energy)], [T.capacity, money(r.capacity)], [T.network, money(r.network)], [T.eei + ' (' + nf(r.eeiRate, 1) + ' sen)', '− ' + money(r.eei)]];
    if (!r.protected) list.push([T.afa + ' (' + nf(r.afaRate, 2) + ' sen)', money(r.afa)], [T.retail, money(r.retail)]);
    if (r.kwtbb) list.push([T.kwtbb, money(r.kwtbb)]);
    if (r.sst) list.push([T.sst, money(r.sst)]);
    list.push([T.total, money(r.total), 'total']);
    rows($('tLines'), list);
    $('tLive').textContent = T.live(r);
    if (writeHash) hashState(form, { protection: String(X.protectionOn(today)) });
  }
  wire(form, render, 'tnbPrint');
  var fromUrl = fromHash(form);
  if (!fromUrl) f('protection').value = String(X.protectionOn(today));
  if (fromUrl || changed(form)) render(false);
})();
