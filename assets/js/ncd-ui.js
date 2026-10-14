/* NCD calculator UI (EN + BM). Inputs map to TBBNcd.calculate(); the gross premium can be estimated with TBBCarLoan.insurance(). */
(function () {
  'use strict';
  var N = window.TBBNcd, C = window.TBBCarLoan;
  var form = document.getElementById('ncdForm');
  if (!N || !form) return;
  var ms = document.documentElement.lang === 'ms';
  var fmt2 = new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR' });
  var money = function (n) { return fmt2.format(n); };
  var pct = function (n) { return Number(n.toFixed(2)) + '%'; };
  var $ = function (id) { return document.getElementById(id); };
  var f = function (n) { return form.elements[n]; };
  var T = ms ? {
    gross: 'Premium kasar (sebelum NCD)', ncd: 'Diskaun NCD', net: 'Premium selepas NCD', sst: 'SST 8%', stamp: 'Duti setem', total: 'Jumlah dibayar',
    years: function (y) { return y >= 5 ? '5 tahun atau lebih' : y + ' tahun'; }, renewal: function (k) { return 'Pembaharuan ke-' + k; },
    sub: function (r) { return 'Anda jimat ' + money(r.premium.discount) + ' · NCD tahun depan ' + pct(r.next) + ' jika tiada tuntutan'; },
    pay: function (r) { return 'Bayar sendiri: kos baiki ' + money(r.repair) + ' lebih rendah daripada ' + money(r.claim.total) + ' premium tambahan akibat kehilangan NCD.'; },
    claim: function (r) { return 'Tuntut insurans: kos baiki ' + money(r.repair) + ' melebihi ' + money(r.claim.total) + ' premium tambahan akibat kehilangan NCD.'; },
    live: function (r) { return 'NCD ' + pct(r.ncd) + ', premium ' + money(r.premium.total) + '.'; }
  } : {
    gross: 'Gross premium (before NCD)', ncd: 'NCD discount', net: 'Premium after NCD', sst: 'SST 8%', stamp: 'Stamp duty', total: 'Total to pay',
    years: function (y) { return y >= 5 ? '5 years or more' : y + (y === 1 ? ' year' : ' years'); }, renewal: function (k) { return 'Renewal ' + k; },
    sub: function (r) { return 'You save ' + money(r.premium.discount) + ' · next year ' + pct(r.next) + ' if you make no claim'; },
    pay: function (r) { return 'Pay it yourself: the ' + money(r.repair) + ' repair costs less than the ' + money(r.claim.total) + ' extra premium from losing your NCD.'; },
    claim: function (r) { return 'Claim: the ' + money(r.repair) + ' repair costs more than the ' + money(r.claim.total) + ' extra premium from losing your NCD.'; },
    live: function (r) { return 'NCD ' + pct(r.ncd) + ', premium ' + money(r.premium.total) + '.'; }
  };
  function cell(tr, text, head) {
    var c = head ? document.createElement('th') : tr.insertCell();
    if (head) { c.scope = 'row'; tr.appendChild(c); }
    c.textContent = text;
    return c;
  }

  function gross() {
    if (f('basis').value !== 'estimate' || !C) return f('gross').value;
    return C.insurance(f('sumInsured').value, f('cc').value, 0).gross;
  }

  function render(writeHash) {
    var est = f('basis').value === 'estimate';
    $('nGrossField').hidden = est;
    $('nEstimate').hidden = !est;
    var r = N.calculate({ type: f('type').value, years: f('years').value, gross: gross(), repair: f('repair').value }), p = r.premium;
    $('nRate').textContent = pct(r.ncd);
    $('nTotal').textContent = money(p.total);
    $('nSub').textContent = T.sub(r);
    $('nEstGross').textContent = money(p.gross);
    var body = $('nLines');
    body.textContent = '';
    [[T.gross, money(p.gross)], [T.ncd + ' (' + pct(r.ncd) + ')', '− ' + money(p.discount)], [T.net, money(p.net)], [T.sst, money(p.sst)], [T.stamp, money(p.stamp)]]
      .forEach(function (x) { var tr = body.insertRow(); cell(tr, x[0], true); cell(tr, x[1]); });
    var tr = body.insertRow(); tr.className = 'total'; cell(tr, T.total, true); cell(tr, money(p.total));
    var lad = $('nLadder');
    lad.textContent = '';
    r.ladder.forEach(function (l) {
      var t = lad.insertRow();
      if (l.years === r.years) t.className = 'total';
      cell(t, T.years(l.years), true); cell(t, pct(l.ncd)); cell(t, money(l.total));
    });
    var cl = $('nClaim');
    cl.textContent = '';
    r.claim.rows.forEach(function (x) { var t = cl.insertRow(); cell(t, T.renewal(x.renewal), true); cell(t, pct(x.keep)); cell(t, pct(x.after)); cell(t, money(x.extra)); });
    $('nClaimTotal').textContent = money(r.claim.total);
    $('nAdvice').hidden = !r.advice;
    $('nAdvice').textContent = r.advice ? T[r.advice](r) : '';
    $('nLive').textContent = T.live(r);
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

  var frame = 0;
  var schedule = function () { cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { render(true); }); };
  form.addEventListener('input', schedule);
  form.addEventListener('change', schedule);
  form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
  $('ncdPrint').addEventListener('click', function () { window.print(); });
  var restored = Array.prototype.some.call(form.elements, function (el) {
    if (!el.name) return false;
    return el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected : el.value !== el.defaultValue;
  });
  if (fromHash() || restored) render(false);
})();
