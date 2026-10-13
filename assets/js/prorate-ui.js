/* Prorated salary calculator UI (EN + BM). Inputs map to TBBProrate.calculate(); state is kept in the URL hash. */
(function () {
  'use strict';
  var P = window.TBBProrate;
  var form = document.getElementById('proForm');
  if (!P || !form) return;
  var ms = document.documentElement.lang === 'ms';
  var fmt2 = new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR' });
  var $ = function (id) { return document.getElementById(id); };
  var f = function (n) { return form.elements[n]; };
  var T = ms ? {
    method: { calendar: 'Hari kalendar (seksyen 18A)', working: 'Hari bekerja', fixed26: '26 hari (kadar gaji biasa)' },
    date: { join: 'Tarikh mula bekerja', leave: 'Hari terakhir bekerja' }, days: 'hari', day: 'sehari',
    live: function (r) { return 'Gaji prorata ' + fmt2.format(r.pay) + '.'; }
  } : {
    method: { calendar: 'Calendar days (section 18A)', working: 'Working days', fixed26: '26 days (ordinary rate of pay)' },
    date: { join: 'First day of work', leave: 'Last day of work' }, days: 'days', day: 'a day',
    live: function (r) { return 'Prorated salary ' + fmt2.format(r.pay) + '.'; }
  };

  function sync() {
    var full = f('case').value === 'full';
    $('proDateField').hidden = full;
    $('proMonthField').hidden = !full;
    if (!full) $('proDateLabel').textContent = T.date[f('case').value];
  }

  function render(writeHash) {
    sync();
    var r = P.calculate({ salary: f('salary').value, case: f('case').value, date: f('date').value, month: f('month').value,
      unpaid: f('unpaid').value, workdays: f('workdays').value });
    $('pPay').textContent = fmt2.format(r.pay);
    $('pDays').textContent = r.days;
    $('pBase').textContent = r.calendarDays;
    $('pPeriod').textContent = r.label[ms ? 'ms' : 'en'];
    $('pDeduct').textContent = fmt2.format(r.deduction);
    $('pLive').textContent = T.live(r);
    var body = $('pMethods');
    body.textContent = '';
    r.methods.forEach(function (m) {
      var tr = body.insertRow(), th = document.createElement('th'), small = document.createElement('small');
      if (m.key === 'calendar') tr.className = 'total';
      th.scope = 'row'; th.textContent = T.method[m.key];
      small.textContent = m.days + ' / ' + m.base + ' ' + T.days + ' · ' + fmt2.format(m.daily) + ' ' + T.day;
      th.appendChild(small); tr.appendChild(th);
      tr.insertCell().textContent = fmt2.format(m.pay);
    });
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
  $('proPrint').addEventListener('click', function () { window.print(); });
  var restored = Array.prototype.some.call(form.elements, function (el) {
    if (!el.name) return false;
    return el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected : el.value !== el.defaultValue;
  });
  if (fromHash() || restored) render(false);
})();
