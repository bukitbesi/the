/* Hajj cost and Tabung Haji calculator UI (BM + EN). Inputs map to TBBHaji.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBHaji;
  var form = document.getElementById('hajiForm');
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
  var mon = function (ym) { return new Date(ym + '-01T00:00:00Z').toLocaleDateString(ms ? 'ms-MY' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }); };
  var now = new Date(), today = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
  var T = ms ? {
    sub: function (r) { return r.cat + ' · bantuan ' + money(r.subsidy) + ' (' + (100 - r.share) + '%) · kos sebenar ' + money(r.cost); },
    cost: 'Kos sebenar haji Muassasah', aid: 'Bantuan Kewangan Haji', gov: 'termasuk bantuan kerajaan', pay: 'Anda bayar', total: function (n) { return 'Jumlah untuk ' + n + ' orang'; },
    bal: 'Baki Tabung Haji sekarang', dep: 'Simpanan sebulan', offer: 'Capai RM15,000 (layak tawaran)', full: function (r) { return 'Capai bayaran haji ' + money(r.pay); },
    when: function (x, ym) { return x.months === 0 ? 'Sudah dicapai' : x.months + ' bulan (' + mon(ym) + ')'; }, never: 'Tidak tercapai: tambah simpanan bulanan',
    hib: 'Hibah hingga RM15,000', dl: 'Tarikh akhir 31 Disember 2028', ok: 'Tercapai sebelum tarikh akhir', need: function (n) { return 'Simpan ' + money(n) + ' sebulan untuk capai'; },
    five: 'Baki selepas 5 tahun', fiveHib: 'Hibah dalam 5 tahun',
    live: function (r) { return 'Bayaran haji ' + r.cat + ' ' + money(r.pay) + '.'; }
  } : {
    sub: function (r) { return r.cat + ' · subsidy ' + money(r.subsidy) + ' (' + (100 - r.share) + '%) · actual cost ' + money(r.cost); },
    cost: 'Actual Muassasah hajj cost', aid: 'Hajj financial assistance', gov: 'including government aid', pay: 'You pay', total: function (n) { return 'Total for ' + n + ' pilgrims'; },
    bal: 'Tabung Haji balance now', dep: 'Monthly saving', offer: 'Reach RM15,000 (offer threshold)', full: function (r) { return 'Reach the hajj payment ' + money(r.pay); },
    when: function (x, ym) { return x.months === 0 ? 'Already reached' : x.months + ' months (' + mon(ym) + ')'; }, never: 'Not reached: raise the monthly saving',
    hib: 'Hibah until RM15,000', dl: 'Deadline 31 December 2028', ok: 'Reached before the deadline', need: function (n) { return 'Save ' + money(n) + ' a month to make it'; },
    five: 'Balance after 5 years', fiveHib: 'Hibah over 5 years',
    live: function (r) { return r.cat + ' hajj payment ' + money(r.pay) + '.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ cat: f('cat').value, people: f('people').value, balance: f('balance').value, monthly: f('monthly').value, rate: f('rate').value, today: today });
    $('hPay').textContent = money(r.pay);
    $('hSub').textContent = T.sub(r);
    var cost = [[T.cost, money(r.cost)], [T.aid, '− ' + money(r.subsidy)]];
    if (r.gov) cost.push([T.gov, money(r.gov)]);
    cost.push([T.pay, money(r.pay), 'total']);
    if (r.people > 1) cost.push([T.total(r.people), money(r.total), 'total']);
    rows($('hCost'), cost);
    var save = [[T.bal, money(r.balance)], [T.dep, money(r.monthly)],
      [T.offer, r.toOffer ? T.when(r.toOffer, r.offerMonth) : T.never, r.toOffer ? 'total' : ''],
      [T.full(r), r.toPay ? T.when(r.toPay, r.payMonth) : T.never]];
    if (r.toOffer && r.toOffer.hibah) save.push([T.hib, money(r.toOffer.hibah)]);
    if (f('registered').value === 'yes') save.push([T.dl, r.meetsDeadline ? T.ok : r.needDeadline === null ? T.never : T.need(r.needDeadline)]);
    save.push([T.five, money(r.fiveYears.balance)], [T.fiveHib, money(r.fiveYears.hibah)]);
    rows($('hSave'), save);
    $('hLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'hajiPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
