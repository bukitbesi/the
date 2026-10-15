/* Driving licence cost UI (BM + EN). Inputs map to TBBLesen.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBLesen;
  var form = document.getElementById('lesenForm');
  if (!X || !form) return;
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
  var T = ms ? {
    sub: function (r) { return 'Yuran JPJ ' + money(r.jpj) + ' · umur minimum ' + r.age; },
    ldl: function (r) { return 'Lesen L (LDL), ' + r.ldlMonths + ' bulan'; }, pdl: 'Lesen P (PDL), 2 tahun', jpj: 'Jumlah yuran JPJ', school: 'Pakej institut memandu', card: 'Cetak lesen fizikal', total: 'Jumlah untuk dapat lesen',
    renew: function (r) { return 'Lesen CDL, ' + r.years + ' tahun (' + money(r.perYear) + ' setahun)'; }, idp: 'Permit Memandu Antarabangsa', rtotal: 'Jumlah pembaharuan', free: 'Percuma',
    live: function (r) { return 'Jumlah ' + money(r.newTotal) + '.'; }
  } : {
    sub: function (r) { return 'JPJ fees ' + money(r.jpj) + ' · minimum age ' + r.age; },
    ldl: function (r) { return "Learner's licence (LDL), " + r.ldlMonths + ' months'; }, pdl: 'Probationary licence (PDL), 2 years', jpj: 'Total JPJ fees', school: 'Driving school package', card: 'Physical licence print', total: 'Total to get the licence',
    renew: function (r) { return 'CDL, ' + r.years + (r.years === 1 ? ' year (' : ' years (') + money(r.perYear) + ' a year)'; }, idp: 'International Driving Permit', rtotal: 'Total renewal', free: 'Free',
    live: function (r) { return 'Total ' + money(r.newTotal) + '.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ cls: f('cls').value, period: f('period').value, ldlCount: f('ldlCount').value, school: f('school').value, years: f('years').value, card: f('card').value, freeCard: f('freeCard').value, idp: f('idp').value });
    $('lNew').textContent = money(r.newTotal);
    $('lSub').textContent = T.sub(r);
    var n = [[T.ldl(r), money(r.ldl)], [T.pdl, money(r.pdl)], [T.jpj, money(r.jpj)]];
    if (r.school) n.push([T.school, money(r.school)]);
    if (f('card').value === 'yes') n.push([T.card, r.card ? money(r.card) : T.free]);
    n.push([T.total, money(r.newTotal), 'total']);
    rows($('lLines'), n);
    var rn = [[T.renew(r), money(r.renewal)]];
    if (f('card').value === 'yes') rn.push([T.card, r.card ? money(r.card) : T.free]);
    if (r.idp) rn.push([T.idp, money(r.idp)]);
    rn.push([T.rtotal, money(r.renewTotal), 'total']);
    rows($('lRenew'), rn);
    $('lLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'lesenPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
