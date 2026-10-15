/* Traffic summons compound UI (BM + EN). Inputs map to TBBSaman.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBSaman;
  var form = document.getElementById('samanForm');
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
  var now = new Date(), today = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
  var T = ms ? {
    court: 'Tiada kompaun', amount: 'Kompaun pada notis', save: 'Jimat jika bayar sekarang', courtRow: function (d) { return 'Mulai ' + day(d); }, courtTxt: 'Mahkamah atau senarai hitam',
    tier: { early: 'Bayar hingga {d} (50%)', mid: 'Bayar hingga {d} (kira-kira ⅓ kurang)', full: 'Bayar hingga {d} (penuh)' },
    sub: function (r) { return r.tier === 'court' ? 'Hari ke-' + r.day + ' · tawaran kompaun tamat ' + day(r.lastDay) : 'Hari ke-' + r.day + ' · kadar ini hingga ' + day(r.lastDay) + (r.daysLeft ? ' (' + r.daysLeft + ' hari lagi)' : ' (hari terakhir)'); },
    old: 'Notis sebelum 1 Januari 2026: kadar berperingkat tidak terpakai. Semak jumlah di MyJPJ atau MyBayar PDRM.',
    over: 'Kompaun maksimum ialah RM300 hingga 31 Disember 2028. Semak jumlah pada notis anda.',
    courtNote: 'Selepas 60 hari tiada lagi tawaran kompaun. Hubungi JPJ atau PDRM segera.',
    live: function (r) { return r.tier === 'court' ? 'Tiada kompaun, hari ke-' + r.day + '.' : 'Bayar ' + money(r.payable) + ', hari ke-' + r.day + '.'; }
  } : {
    court: 'No compound', amount: 'Compound on the notice', save: 'You save by paying now', courtRow: function (d) { return 'From ' + day(d); }, courtTxt: 'Court or blacklist',
    tier: { early: 'Pay by {d} (50% off)', mid: 'Pay by {d} (about ⅓ off)', full: 'Pay by {d} (full)' },
    sub: function (r) { return r.tier === 'court' ? 'Day ' + r.day + ' · the compound offer ended ' + day(r.lastDay) : 'Day ' + r.day + ' · this rate until ' + day(r.lastDay) + (r.daysLeft ? ' (' + r.daysLeft + (r.daysLeft === 1 ? ' day left)' : ' days left)') : ' (last day)'); },
    old: 'Notice before 1 January 2026: the tiered rates do not apply. Check the amount in MyJPJ or MyBayar PDRM.',
    over: 'The maximum compound is RM300 until 31 December 2028. Check the amount on your notice.',
    courtNote: 'After 60 days there is no compound offer. Contact JPJ or PDRM now.',
    live: function (r) { return r.tier === 'court' ? 'No compound, day ' + r.day + '.' : 'Pay ' + money(r.payable) + ', day ' + r.day + '.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ amount: f('amount').value, notice: f('notice').value, pay: f('pay').value, today: today });
    $('mPay').textContent = r.tier === 'court' ? T.court : money(r.payable);
    $('mSub').textContent = T.sub(r);
    var n = [[T.amount, money(r.amount)]];
    r.tiers.forEach(function (t) { n.push([T.tier[t.key].replace('{d}', day(t.last)), money(t.pay), t.key === r.tier ? 'total' : '']); });
    n.push([T.courtRow(r.courtFrom), T.courtTxt, r.tier === 'court' ? 'total' : '']);
    if (r.save) n.push([T.save, money(r.save)]);
    rows($('mLines'), n);
    var note = r.before2026 ? T.old : r.tier === 'court' ? T.courtNote : r.overMax ? T.over : '';
    $('mNote').textContent = note; $('mNote').hidden = !note;
    $('mLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'samanPrint');
  // The build date seeds the notice field; a visitor's default is the day they open the page.
  if (f('notice').value === f('notice').defaultValue) f('notice').defaultValue = f('notice').value = today;
  if (fromHash(form) || changed(form) || today !== form.getAttribute('data-built')) render(false);
})();
