/* EPF calculator UI (EN + BM). Inputs map to TBBEpf.project(); state is kept in the URL hash. */
(function () {
  'use strict';
  var E = window.TBBEpf;
  var form = document.getElementById('epfForm');
  if (!E || !form) return;
  var ms = document.documentElement.lang === 'ms';
  var fmt = new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 });
  var fmt2 = new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR' });
  var $ = function (id) { return document.getElementById(id); };
  var f = function (n) { return form.elements[n]; };
  var TIER = ms ? {
    below: function (r) { return 'Di bawah Simpanan Asas RM390,000. Kurang ' + fmt.format(r.gapToBasic) + '.'; },
    basic: function () { return 'Mencapai tahap Asas (RM390,000).'; },
    adequate: function () { return 'Mencapai tahap Mencukupi (RM650,000).'; },
    enhanced: function () { return 'Mencapai tahap Dipertingkat (RM1.3 juta).'; },
    live: function (r) { return 'Anggaran simpanan pada umur ' + r.retireAge + ': ' + fmt.format(r.final) + '.'; }
  } : {
    below: function (r) { return 'Below the RM390,000 Basic Savings level by ' + fmt.format(r.gapToBasic) + '.'; },
    basic: function () { return 'Reaches the Basic level (RM390,000).'; },
    adequate: function () { return 'Reaches the Adequate level (RM650,000).'; },
    enhanced: function () { return 'Reaches the Enhanced level (RM1.3 million).'; },
    live: function (r) { return 'Projected savings at ' + r.retireAge + ': ' + fmt.format(r.final) + '.'; }
  };

  function read() {
    var o = {};
    ['age', 'retireAge', 'salary', 'raise', 'persaraan', 'sejahtera', 'fleksibel', 'ownRate', 'topUp', 'inflation'].forEach(function (k) { o[k] = f(k).value; });
    o.dividend = f('divPreset').value === 'custom' ? f('dividend').value : f('divPreset').value;
    return o;
  }

  function render(writeHash) {
    $('divCustom').hidden = f('divPreset').value !== 'custom';
    var input = read();
    var r = E.project(input);
    $('eFinal').textContent = fmt.format(r.final);
    $('eAge').textContent = r.retireAge;
    $('eMonthly').textContent = fmt.format(r.monthlyFor20Years);
    $('eReal').textContent = fmt.format(r.real);
    $('eRealMonthly').textContent = fmt.format(r.realMonthlyFor20Years);
    $('ePersaraan').textContent = fmt.format(r.accounts.persaraan);
    $('eSejahtera').textContent = fmt.format(r.accounts.sejahtera);
    $('eFleksibel').textContent = fmt.format(r.accounts.fleksibel);
    $('eStart').textContent = fmt.format(r.start);
    $('eEmployee').textContent = fmt.format(r.totals.employee);
    $('eEmployer').textContent = fmt.format(r.totals.employer);
    $('eTopUp').textContent = fmt.format(r.totals.topUp);
    $('eDividend').textContent = fmt.format(r.totals.dividend);
    $('eFirstDiv').textContent = fmt2.format(r.firstYearDividend);
    $('rowTopUp').hidden = !r.totals.topUp;
    $('eTier').textContent = TIER[r.tier](r);
    $('eBar').style.width = Math.min(100, r.real / E.FACTS.ria.enhanced * 100).toFixed(1) + '%';
    $('eLive').textContent = TIER.live(r);
    var body = $('eYears');
    body.textContent = '';
    r.years.forEach(function (y) {
      var tr = body.insertRow(), th = document.createElement('th');
      th.scope = 'row'; th.textContent = y.age; tr.appendChild(th);
      [y.salary, y.employee + y.employer + y.topUp, y.dividend, y.balance].forEach(function (v) {
        tr.insertCell().textContent = fmt.format(v);
      });
    });
    if (writeHash) {
      var parts = [];
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name) return;
        var d = el.tagName === 'SELECT' ? (el.querySelector('option[selected]') || el.options[0]).value : el.defaultValue;
        if (el.value !== d) parts.push(el.name + '=' + encodeURIComponent(el.value));
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
    if (['persaraan', 'sejahtera', 'fleksibel', 'ownRate', 'topUp', 'inflation'].some(function (k) { return f(k).value !== f(k).defaultValue; })) $('epfMore').open = true;
    return true;
  }

  var frame = 0;
  var schedule = function () { cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { render(true); }); };
  form.addEventListener('input', schedule);
  form.addEventListener('change', schedule);
  form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
  $('epfPrint').addEventListener('click', function () { window.print(); });
  var restored = Array.prototype.some.call(form.elements, function (el) {
    if (!el.name) return false;
    return el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected : el.value !== el.defaultValue;
  });
  if (fromHash() || restored) render(false);
})();
