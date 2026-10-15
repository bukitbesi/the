/* Mas kahwin calculator UI (BM + EN). Inputs map to TBBMasKahwin.calculate(); today's pure-gold price per gram is
   rendered into data-gram at build time (daily rebuild); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBMasKahwin;
  var form = document.getElementById('mkForm');
  if (!X || !form) return;
  var ms = document.documentElement.lang === 'ms';
  var gram = Number(form.getAttribute('data-gram')) || 0;
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
    head: { min: 'Mas kahwin minimum', rate: 'Kadar mas kahwin', none: 'Tiada kadar negeri', unconfirmed: 'Belum disahkan secara rasmi' },
    sub: function (r) {
      if (r.status === 'min') return r.name + (r.announced ? ' · diumumkan ' : ' · berkuat kuasa ') + day(r.since) + (r.before !== null ? ' · dahulu ' + money(r.before) : '');
      if (r.status === 'rate') return r.name + ' · borang perkahwinan ' + r.by;
      if (r.status === 'none') return r.name + ' · sebarang nilai dipersetujui';
      return r.name + ' · semak dengan pejabat agama Islam daerah';
    },
    rule: 'Peraturan negeri', yours: 'Mas kahwin anda', check: { ok: 'Memenuhi kadar negeri', below: function (s) { return 'Kurang ' + money(s) + ' daripada kadar'; }, free: 'Sah: tiada kadar minimum', unknown: 'Semak kadar dengan pejabat agama' },
    status: 'Semakan', paid: { tunai: 'Dibayar tunai', hutang: 'Hutang (ditangguh): catat dalam borang nikah' }, payment: 'Cara bayar',
    g999: 'Dalam emas 999', g916: 'Dalam emas 916', dinar: 'Dalam dinar emas (4.25 g, 917)',
    plan: { mahar: 'Mas kahwin', hantaran: 'Wang hantaran', gifts: 'Cincin dan barang hantaran', catering: function (n) { return 'Kenduri (' + nf(n, 0) + ' tetamu)'; }, other: 'Pelamin, pakaian, foto dan lain-lain', fees: 'Fi nikah dan pendaftaran' },
    auto: ' (kadar rasmi negeri)', missing: ' (tidak diterbitkan: masukkan fi anda)', total: 'Jumlah kos perkahwinan', month: function (n) { return 'Simpan sebulan (' + n + ' bulan)'; },
    live: function (r, h) { return h + ': ' + (r.amount === null ? '' : money(r.amount) + '. ') + 'Jumlah kos ' + money(r.total) + '.'; }
  } : {
    head: { min: 'Minimum mas kahwin', rate: 'Mas kahwin rate', none: 'No state rate', unconfirmed: 'Not officially confirmed' },
    sub: function (r) {
      if (r.status === 'min') return r.name + (r.announced ? ' · announced ' : ' · in force ') + day(r.since) + (r.before !== null ? ' · was ' + money(r.before) : '');
      if (r.status === 'rate') return r.name + ' · ' + r.by + ' marriage form';
      if (r.status === 'none') return r.name + ' · any agreed value';
      return r.name + ' · check with the district religious office';
    },
    rule: 'State rule', yours: 'Your mas kahwin', check: { ok: 'Meets the state rate', below: function (s) { return money(s) + ' below the rate'; }, free: 'Valid: no minimum', unknown: 'Check the rate with the religious office' },
    status: 'Check', paid: { tunai: 'Paid in cash', hutang: 'Deferred (debt): record it on the nikah form' }, payment: 'Payment',
    g999: 'In 999 gold', g916: 'In 916 gold', dinar: 'In gold dinars (4.25 g, 917)',
    plan: { mahar: 'Mas kahwin', hantaran: 'Wang hantaran', gifts: 'Rings and hantaran gifts', catering: function (n) { return 'Reception (' + nf(n, 0) + ' guests)'; }, other: 'Dais, attire, photos and other', fees: 'Nikah and registration fees' },
    auto: ' (official state rate)', missing: ' (not published: enter yours)', total: 'Total wedding cost', month: function (n) { return 'Save a month (' + n + ' months)'; },
    live: function (r, h) { return h + ': ' + (r.amount === null ? '' : money(r.amount) + '. ') + 'Total cost ' + money(r.total) + '.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ state: f('state').value, bride: f('bride').value, kind: f('kind').value, qty: f('qty').value, paid: f('paid').value, gram: gram,
      hantaran: f('hantaran').value, gifts: f('gifts').value, guests: f('guests').value, perHead: f('perHead').value, other: f('other').value, fees: f('fees').value, months: f('months').value });
    var head = T.head[r.status];
    $('mHead').textContent = head;
    $('mRate').textContent = r.amount === null ? '–' : money(r.amount);
    $('mSub').textContent = T.sub(r);
    var list = [[T.yours, money(r.mahar)], [T.status, r.check === 'below' ? T.check.below(r.short) : T.check[r.check], r.check === 'ok' || r.check === 'free' ? 'total' : ''], [T.payment, T.paid[r.deferred ? 'hutang' : 'tunai']]];
    if (r.gold) list.push([T.g999, nf(r.gold.g999, 3) + ' g'], [T.g916, nf(r.gold.g916, 3) + ' g'], [T.dinar, nf(r.gold.dinar, 3)]);
    rows($('mLines'), list);
    rows($('mPlan'), r.plan.map(function (x) {
      var label = x[0] === 'catering' ? T.plan.catering(r.guests) : T.plan[x[0]] + (x[0] === 'fees' ? (r.feesAuto ? T.auto : r.feesMissing ? T.missing : '') : '');
      return [label, money(x[1])];
    }).concat([[T.total, money(r.total), 'total'], [T.month(r.months), money(r.monthly)]]));
    $('mTotal').textContent = money(r.total);
    $('mLive').textContent = T.live(r, head);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'mkPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
