/* Zakat pendapatan UI (EN + BM). Inputs map to TBBZakat.income(); state is kept in the URL hash. */
(function () {
  'use strict';
  var Z = window.TBBZakat;
  var form = document.getElementById('zakatForm');
  if (!Z || !form) return;
  var ms = document.documentElement.lang === 'ms', loc = ms ? 'ms-MY' : 'en-MY';
  var fmt2 = new Intl.NumberFormat(loc, { style: 'currency', currency: 'MYR' });
  var $ = function (id) { return document.getElementById(id); };
  var f = function (n) { return form.elements[n]; };
  var T = ms ? {
    ded: { workingAdult: 'Dewasa bekerja', otherAdult: 'Dewasa tidak bekerja', child7: 'Anak 7–17 tahun', child6: 'Anak 6 tahun ke bawah', ipt: 'Tanggungan di IPT', epf: 'Caruman KWSP' },
    due: 'Wajib zakat: pendapatan melebihi nisab.', notDue: function (r) { return 'Belum wajib: kurang ' + fmt2.format(r.shortOfNisab) + ' daripada nisab.'; },
    live: function (r) { return 'Zakat setahun ' + fmt2.format(r.zakat) + '.'; }
  } : {
    ded: { workingAdult: 'Working adults', otherAdult: 'Non-working adults', child7: 'Children aged 7–17', child6: 'Children aged 6 and under', ipt: 'Dependants in higher education', epf: 'EPF contributions' },
    due: 'Zakat is due: your income is above the nisab.', notDue: function (r) { return 'Not yet due: ' + fmt2.format(r.shortOfNisab) + ' below the nisab.'; },
    live: function (r) { return 'Zakat for the year ' + fmt2.format(r.zakat) + '.'; }
  };

  function render(writeHash) {
    var net = f('method').value === 'net';
    $('zakatNet').hidden = !net;
    var r = Z.income({ salary: f('salary').value, period: f('period').value, other: f('other').value, method: f('method').value, nisab: f('nisab').value,
      adults: f('adults').value, others: f('others').value, kids7: f('kids7').value, kids6: f('kids6').value, ipt: f('ipt').value, epf: f('epf').value, tax: f('tax').value });
    $('zYear').textContent = fmt2.format(r.zakat);
    $('zMonth').textContent = fmt2.format(r.monthly);
    $('zIncome').textContent = fmt2.format(r.yearly);
    $('zDeducted').textContent = fmt2.format(r.deducted);
    $('zBase').textContent = fmt2.format(r.base);
    $('zNisab').textContent = fmt2.format(r.nisab);
    $('zStatus').textContent = r.due ? T.due : T.notDue(r);
    var body = $('zDedRows');
    body.textContent = '';
    r.deductions.forEach(function (d) {
      var tr = body.insertRow(), th = document.createElement('th');
      th.scope = 'row'; th.textContent = T.ded[d.key] + (d.key === 'epf' ? '' : ' × ' + d.count); tr.appendChild(th);
      tr.insertCell().textContent = fmt2.format(d.amount);
    });
    $('zDedWrap').hidden = !r.deductions.length;
    $('zTaxRows').hidden = !r.tax;
    $('zRebate').textContent = fmt2.format(r.rebate);
    $('zTaxAfter').textContent = fmt2.format(r.taxAfter);
    $('zLive').textContent = T.live(r);
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
  $('zakatPrint').addEventListener('click', function () { window.print(); });
  var restored = Array.prototype.some.call(form.elements, function (el) {
    if (!el.name) return false;
    return el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected : el.value !== el.defaultValue;
  });
  if (fromHash() || restored) render(false);
})();
