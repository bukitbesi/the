/* RPGT calculator UI (EN + BM). Inputs map to TBBRpgt.calculate(); state is kept in the URL hash. */
(function () {
  'use strict';
  var R = window.TBBRpgt;
  var form = document.getElementById('rpgtForm');
  if (!R || !form) return;
  var ms = document.documentElement.lang === 'ms', loc = ms ? 'ms-MY' : 'en-MY';
  var fmt2 = new Intl.NumberFormat(loc, { style: 'currency', currency: 'MYR' });
  var $ = function (id) { return document.getElementById(id); };
  var f = function (n) { return form.elements[n]; };
  var T = ms ? {
    year: function (r) { return r.year ? (r.year <= 3 ? 'Dalam 3 tahun' : 'Tahun ke-' + r.year + (r.year >= 6 ? ' dan seterusnya' : '')) + ' · ' + r.rate + '%' : 'Semak tarikh'; },
    refund: { pos: 'Baki tahanan dipulangkan', neg: 'Baki cukai perlu dibayar' },
    live: function (r) { return 'RPGT ' + fmt2.format(r.tax) + '.'; }
  } : {
    year: function (r) { return r.year ? (r.year <= 3 ? 'Within 3 years' : 'Year ' + r.year + (r.year >= 6 ? ' or later' : '')) + ' · ' + r.rate + '%' : 'Check the dates'; },
    refund: { pos: 'Retention refunded to you', neg: 'Tax still to pay' },
    live: function (r) { return 'RPGT ' + fmt2.format(r.tax) + '.'; }
  };

  function render(writeHash) {
    var r = R.calculate({ owner: f('owner').value, acquired: f('acquired').value, disposed: f('disposed').value, purchase: f('purchase').value,
      acqCosts: f('acqCosts').value, enhance: f('enhance').value, sale: f('sale').value, saleCosts: f('saleCosts').value, residence: f('residence').value });
    $('rResidenceField').hidden = f('owner').value !== 'citizen';
    $('rTax').textContent = fmt2.format(r.tax);
    $('rYear').textContent = T.year(r);
    $('rNet').textContent = fmt2.format(r.net);
    $('rCost').textContent = fmt2.format(r.cost);
    $('rGain').textContent = fmt2.format(r.gain);
    $('rExempt').textContent = fmt2.format(r.exemption);
    $('rCharge').textContent = fmt2.format(r.chargeable);
    $('rRetPct').textContent = r.retentionPct;
    $('rRet').textContent = fmt2.format(r.retention);
    $('rRefundLabel').textContent = r.refund >= 0 ? T.refund.pos : T.refund.neg;
    $('rRefund').textContent = fmt2.format(Math.abs(r.refund));
    $('rLive').textContent = T.live(r);
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
  $('rpgtPrint').addEventListener('click', function () { window.print(); });
  var restored = Array.prototype.some.call(form.elements, function (el) {
    if (!el.name) return false;
    return el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected : el.value !== el.defaultValue;
  });
  if (fromHash() || restored) render(false);
})();
