/* Income tax calculator UI. Every named form field maps to a tax-core input; state is kept in the URL hash. */
(function () {
  'use strict';
  var T = window.TBBTax;
  var form = document.getElementById('taxForm');
  if (!T || !form) return;
  var ms = document.documentElement.lang === 'ms';
  var fmt = new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR' });
  var $ = function (id) { return document.getElementById(id); };
  var TEXT = ms ? {
    refund: 'Anggaran bayaran balik', owe: 'Baki cukai perlu dibayar', even: 'PCB anda sama dengan cukai',
    save: function (x) { return 'Jimat ' + fmt.format(x) + ' di bawah cadangan Bajet 2027 (TT2027).'; },
    more: function (x) { return 'Tambah ' + fmt.format(x) + ' di bawah cadangan Bajet 2027 (TT2027).'; },
    same: 'Tiada perubahan di bawah cadangan Bajet 2027.',
    live: function (r) { return 'Cukai perlu dibayar ' + fmt.format(r.payable) + ' setahun.'; }
  } : {
    refund: 'Estimated refund', owe: 'Balance to pay', even: 'Your PCB matches your tax',
    save: function (x) { return 'You would pay ' + fmt.format(x) + ' less under the Budget 2027 proposal (YA2027).'; },
    more: function (x) { return 'You would pay ' + fmt.format(x) + ' more under the Budget 2027 proposal (YA2027).'; },
    same: 'No change under the Budget 2027 proposal.',
    live: function (r) { return 'Tax payable ' + fmt.format(r.payable) + ' a year.'; }
  };
  var names = {};
  Array.prototype.forEach.call(form.querySelectorAll('[data-name]'), function (el) { names[el.name] = el.getAttribute('data-name'); });
  names.self = $('reliefRows').getAttribute('data-self');

  function read() {
    var input = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      input[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return input;
  }
  function money(id, v) { $(id).textContent = fmt.format(v); }

  function render(writeHash) {
    var input = read();
    var r = T.calculate(input, 2026);
    var p = T.calculate(input, 2027);
    money('tPayable', r.payable); money('tMonthly', r.monthly); money('tIncome', r.income);
    money('tReliefs', r.reliefTotal); money('tDonations', r.donations); money('tChargeable', r.chargeable);
    money('tGross', r.grossTax); money('tRebate', r.rebate); money('tZakat', r.zakat);
    $('tRates').textContent = r.effectiveRate + '% · ' + r.marginalRate + '%';
    $('rowDonations').hidden = !r.donations; $('rowZakat').hidden = !r.zakat; $('rowRebate').hidden = !r.rebate;
    var bal = $('tBalanceRow');
    bal.hidden = !r.pcb;
    if (r.pcb) {
      $('tBalanceLabel').textContent = r.balance < 0 ? TEXT.refund : r.balance > 0 ? TEXT.owe : TEXT.even;
      money('tBalance', Math.abs(r.balance));
    }
    var diff = Math.round((r.payable - p.payable) * 100) / 100;
    $('tCompare').textContent = diff > 0 ? TEXT.save(diff) : diff < 0 ? TEXT.more(-diff) : TEXT.same;
    money('tProposal', p.payable);
    var body = $('reliefRows');
    body.textContent = '';
    r.reliefs.forEach(function (x) {
      var tr = body.insertRow(), th = document.createElement('th');
      th.scope = 'row'; th.textContent = names[x.id] || x.id;
      tr.appendChild(th);
      tr.insertCell().textContent = fmt.format(x.amount);
    });
    $('tLive').textContent = TEXT.live(r);
    if (writeHash) {
      var parts = [];
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name) return;
        var v = el.type === 'checkbox' ? (el.checked ? '1' : '') : el.value;
        var d = el.type === 'checkbox' ? (el.defaultChecked ? '1' : '') : el.tagName === 'SELECT' ? el.querySelector('option[selected]') && el.querySelector('option[selected]').value : el.defaultValue;
        if (v !== (d || '')) parts.push(el.name + '=' + encodeURIComponent(v));
      });
      history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
    }
  }

  function fromHash() {
    if (location.hash.length < 2) return false;
    location.hash.slice(1).split('&').forEach(function (kv) {
      var i = kv.indexOf('='), k = kv.slice(0, i), v = decodeURIComponent(kv.slice(i + 1));
      var el = form.elements[k];
      if (!el || !el.name) return;
      if (el.type === 'checkbox') el.checked = v === '1'; else el.value = v;
      var group = el.closest('details');
      if (group) group.open = true;
    });
    return true;
  }

  var frame = 0;
  var schedule = function () { cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { render(true); }); };
  form.addEventListener('input', schedule);
  form.addEventListener('change', schedule);
  form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
  $('taxPrint').addEventListener('click', function () { window.print(); });
  // Results for the example inputs ship in the HTML; recalculate only for a shared link or restored inputs.
  var restored = Array.prototype.some.call(form.elements, function (el) {
    if (!el.name) return false;
    return el.type === 'checkbox' ? el.checked !== el.defaultChecked
      : el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected : el.value !== el.defaultValue;
  });
  if (fromHash() || restored) render(false);
})();
