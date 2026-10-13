/* Overtime calculator UI (EN + BM). Inputs map to TBBOvertime.calculate(); state is kept in the URL hash. */
(function () {
  'use strict';
  var O = window.TBBOvertime;
  var form = document.getElementById('otForm');
  if (!O || !form) return;
  var ms = document.documentElement.lang === 'ms', lang = ms ? 'ms' : 'en';
  var fmt2 = new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR' });
  var money = function (n) { return fmt2.format(n); };
  var $ = function (id) { return document.getElementById(id); };
  var f = function (n) { return form.elements[n]; };
  var T = ms ? {
    wage: { monthly: 'Gaji bulanan', daily: 'Gaji harian' },
    live: function (r) { return 'Jumlah bayaran lebih masa ' + money(r.total) + '.'; }
  } : {
    wage: { monthly: 'Monthly wages', daily: 'Daily wage' },
    live: function (r) { return 'Total overtime pay ' + money(r.total) + '.'; }
  };

  function render(writeHash) {
    var r = O.calculate({ wage: f('wage').value, basis: f('basis').value, hoursPerDay: f('hoursPerDay').value, specified: f('specified').value,
      normalOt: f('normalOt').value, restHalf: f('restHalf').value, restFull: f('restFull').value, restOt: f('restOt').value,
      holidayDays: f('holidayDays').value, holidayOt: f('holidayOt').value });
    $('wageLabel').textContent = T.wage[r.basis];
    $('oTotal').textContent = money(r.total);
    $('oOrp').textContent = money(r.orp);
    $('oHrp').textContent = money(r.hrp);
    $('oOt').textContent = money(r.lines[0].rate);
    var body = $('oLines');
    body.textContent = '';
    r.lines.forEach(function (l) {
      if (!l.qty && l.key !== 'normal') return;
      var tr = body.insertRow(), th = document.createElement('th'), small = document.createElement('small');
      th.scope = 'row'; th.textContent = O.LABELS[lang][l.key];
      small.textContent = O.detail(l, lang, money);
      th.appendChild(small); tr.appendChild(th);
      tr.insertCell().textContent = money(l.amount);
    });
    var tr = body.insertRow(), th = document.createElement('th');
    tr.className = 'total'; th.scope = 'row'; th.textContent = $('oTotalLabel').textContent; tr.appendChild(th);
    tr.insertCell().textContent = money(r.total);
    $('oCovered').hidden = r.covered;
    $('oCap').hidden = !r.overCap;
    $('oMin').hidden = !r.belowMinimum;
    $('oLive').textContent = T.live(r);
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
  $('otPrint').addEventListener('click', function () { window.print(); });
  var restored = Array.prototype.some.call(form.elements, function (el) {
    if (!el.name) return false;
    return el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected : el.value !== el.defaultValue;
  });
  if (fromHash() || restored) render(false);
})();
