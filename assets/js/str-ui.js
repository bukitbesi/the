/* STR and SARA calculator UI (BM + EN). Inputs map to TBBStr.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBStr;
  var form = document.getElementById('strForm');
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
    str: 'STR 2026 (tunai)', sara: 'SARA 2026 (barang asas, MyKad)', total: 'Jumlah setahun', vs: 'Berbanding STR tunai 2025', sus: 'SARA untuk Semua (setiap dewasa 18+)', moved: 'RM600 tunai pada 2025, kini dibayar sebagai SARA',
    saraNa: 'Belum disahkan', month: function (n) { return 'kira-kira ' + money(n) + ' sebulan'; },
    no: { income: function (r) { return r.cat === 'single' ? 'Tidak layak: bujang mesti berpendapatan RM2,500 ke bawah' : 'Tidak layak: pendapatan melebihi RM5,000 sebulan'; }, age: function (r) { return r.cat === 'single' ? 'Tidak layak: bujang mesti berumur 21 hingga 59 (OKU 19 hingga 59)' : 'Tidak layak: warga emas mesti berumur 60 ke atas'; }, senior: function () { return 'Umur 60 ke atas: pilih kategori warga emas tiada pasangan'; } },
    cap: 'Had pendapatan warga emas tidak jelas (RM2,500 atau RM5,000): semak dengan LHDN', status: 'Status',
    sub: function (r) { return r.cat === 'household' ? (r.band === 'low' ? 'Pendapatan RM2,500 ke bawah' : 'Pendapatan RM2,501 hingga RM5,000') + ' · ' + r.children + ' anak' : r.cat === 'single' ? 'Bujang · dibayar melalui SARA' : 'Warga emas tiada pasangan'; },
    live: function (r) { return 'Jumlah STR dan SARA ' + money(r.total) + ' setahun.'; }
  } : {
    str: 'STR 2026 (cash)', sara: 'SARA 2026 (basic goods, MyKad)', total: 'Total a year', vs: 'Compared with 2025 STR cash', sus: 'SARA untuk Semua (every adult 18+)', moved: 'RM600 cash in 2025, now paid as SARA',
    saraNa: 'Not confirmed', month: function (n) { return 'about ' + money(n) + ' a month'; },
    no: { income: function (r) { return r.cat === 'single' ? 'Not eligible: singles must earn RM2,500 or less' : 'Not eligible: income above RM5,000 a month'; }, age: function (r) { return r.cat === 'single' ? 'Not eligible: singles must be 21 to 59 (OKU 19 to 59)' : 'Not eligible: senior citizens must be 60 or older'; }, senior: function () { return 'Aged 60 or older: choose senior citizen without a spouse'; } },
    cap: 'Senior income cap unclear (RM2,500 or RM5,000): check with LHDN', status: 'Status',
    sub: function (r) { return r.cat === 'household' ? (r.band === 'low' ? 'Income up to RM2,500' : 'Income RM2,501 to RM5,000') + ' · ' + r.children + (r.children === 1 ? ' child' : ' children') : r.cat === 'single' ? 'Single · paid through SARA' : 'Senior citizen without a spouse'; },
    live: function (r) { return 'STR and SARA total ' + money(r.total) + ' a year.'; }
  };
  var sign = function (n) { return (n > 0 ? '+ ' : n < 0 ? '− ' : '') + money(Math.abs(n)); };

  function render(writeHash) {
    var cat = f('cat').value;
    $('fHouse').hidden = cat !== 'household'; $('fAge').hidden = cat === 'household';
    var r = X.calculate({ cat: cat, income: f('income').value, children: f('children').value, ekasih: f('ekasih').value, age: f('age').value, oku: f('oku').value });
    $('sMain').textContent = money(r.total);
    $('sSub').textContent = r.eligible === false ? T.no[r.reason](r) : T.sub(r);
    var list = [];
    if (r.eligible === false) list.push([T.status, T.no[r.reason](r)]);
    else {
      list.push([T.str, money(r.str)], [T.sara, r.sara === null ? T.saraNa : money(r.sara)], [T.total, money(r.total) + ' (' + T.month(r.total / 12) + ')', 'total']);
      if (r.change !== null) list.push([T.vs, sign(r.change)]);
      else if (r.cat === 'single') list.push([T.vs, T.moved]);
      if (r.eligible === 'unknown') list.push([T.status, T.cap]);
    }
    list.push([T.sus, money(X.FACTS.sus)]);
    rows($('sLines'), list);
    $('sLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'strPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
