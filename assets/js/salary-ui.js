/* Salary calculator UI: reads the form, renders TBBSalary.calculate() and keeps the inputs in the URL hash
   so a result can be shared or bookmarked without creating new crawlable URLs. */
(function () {
  'use strict';
  var S = window.TBBSalary;
  var form = document.getElementById('salaryForm');
  if (!S || !form) return;
  var lang = document.documentElement.lang === 'ms' ? 'ms' : 'en';
  var fmt = new Intl.NumberFormat(lang === 'ms' ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR' });
  var $ = function (id) { return document.getElementById(id); };
  // form.elements avoids clashes with built-in properties such as form.children.
  var f = function (name) { return form.elements[name]; };
  var TEXT = {
    en: {
      min: 'Enter a monthly salary of at least RM1,000.',
      live: function (r) { return 'Take-home pay ' + fmt.format(r.net) + ' a month.'; },
      zero: 'No PCB is deducted: your estimated chargeable income is below the level where monthly tax reaches RM10.',
      tax: function (r) { return 'Estimated chargeable income ' + fmt.format(r.pcb.chargeable) + ' a year; top tax rate ' + Math.round(r.pcb.rate * 100) + '%.'; },
      copied: 'Link copied', copy: 'Copy link to this result'
    },
    ms: {
      min: 'Masukkan gaji bulanan sekurang-kurangnya RM1,000.',
      live: function (r) { return 'Gaji bersih ' + fmt.format(r.net) + ' sebulan.'; },
      zero: 'Tiada PCB dipotong: anggaran pendapatan bercukai anda di bawah paras PCB bulanan RM10.',
      tax: function (r) { return 'Anggaran pendapatan bercukai ' + fmt.format(r.pcb.chargeable) + ' setahun; kadar cukai tertinggi ' + Math.round(r.pcb.rate * 100) + '%.'; },
      copied: 'Pautan disalin', copy: 'Salin pautan keputusan ini'
    }
  }[lang];

  function read() {
    return {
      salary: f('salary').value,
      age60: f('age').value === '60',
      age57: f('age').value === '57',
      permanentResident: f('residency').value === 'pr',
      eisExempt: f('eisExempt').checked,
      status: f('status').value,
      children: f('children').value,
      otherRelief: f('otherRelief').value,
      zakat: f('zakat').value,
      lindung: f('lindung').checked
    };
  }
  function set(id, value) { $(id).textContent = fmt.format(value); }

  function render(writeHash) {
    var input = read();
    f('eisExempt').disabled = !input.age57;
    if (!input.age57) f('eisExempt').checked = false;
    input.eisExempt = f('eisExempt').checked;
    var r = S.calculate(input);
    var err = $('salaryError');
    f('salary').setAttribute('aria-invalid', r.valid ? 'false' : 'true');
    err.hidden = r.valid;
    err.textContent = r.valid ? '' : TEXT.min;
    if (!r.valid) {
      // Never leave figures on screen that no longer match the input.
      Array.prototype.forEach.call($('results').querySelectorAll('output,td'), function (el) { el.textContent = '–'; });
      $('rNote').textContent = '';
      return;
    }
    set('rNet', r.net); set('rNetYear', r.annual.net); set('rGross', r.input.salary);
    set('rEpf', r.epf.employee); set('rSocso', r.perkeso.socsoEmployee); set('rEis', r.perkeso.eisEmployee);
    set('rLindung', r.perkeso.lindung); set('rPcb', r.pcb.net); set('rZakat', r.zakat); set('rDed', r.deductions);
    set('rEpfEr', r.epf.employer); set('rSocsoEr', r.perkeso.socsoEmployer); set('rEisEr', r.perkeso.eisEmployer);
    set('rCost', r.employerCost); set('rTaxYear', r.annual.tax); set('rEpfYear', r.annual.epfTotal);
    $('rEpfRate').textContent = Math.round(r.epf.employeeRate * 100) + '% · ' + Math.round(r.epf.employerRate * 100) + '%';
    $('rowLindung').hidden = !r.input.lindung;
    $('rowZakat').hidden = !r.zakat;
    $('rNote').textContent = r.pcb.monthly ? TEXT.tax(r) : TEXT.zero;
    $('rLive').textContent = TEXT.live(r);
    if (writeHash) {
      var h = 'salary=' + r.input.salary + '&age=' + (r.input.age60 ? 60 : (r.input.age57 ? 57 : 0)) +
        '&residency=' + (r.input.permanentResident ? 'pr' : 'citizen') + '&eisExempt=' + (r.input.eisExempt ? 1 : 0) + '&status=' + r.input.status +
        '&children=' + r.input.children + '&relief=' + r.input.otherRelief + '&zakat=' + r.input.zakat + '&lindung=' + (r.input.lindung ? 1 : 0);
      history.replaceState(null, '', '#' + h);
    }
  }

  function fromHash() {
    if (location.hash.indexOf('salary=') < 0) return;
    var q = {};
    location.hash.slice(1).split('&').forEach(function (p) { var kv = p.split('='); q[kv[0]] = decodeURIComponent(kv[1] || ''); });
    if (q.salary) f('salary').value = q.salary;
    f('age').value = q.age === '60' ? '60' : (q.age === '57' ? '57' : '0');
    f('residency').value = q.residency === 'pr' ? 'pr' : 'citizen';
    f('eisExempt').checked = q.eisExempt === '1';
    if (/^(single|married|spouse)$/.test(q.status)) f('status').value = q.status;
    if (q.children) f('children').value = q.children;
    if (q.relief) f('otherRelief').value = q.relief;
    if (q.zakat) f('zakat').value = q.zakat;
    f('lindung').checked = q.lindung !== '0';
    if (Number(q.relief) || Number(q.zakat) || q.lindung === '0' || q.eisExempt === '1') $('moreOpts').open = true;
  }

  var frame = 0;
  form.addEventListener('input', function () {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(function () { render(true); });
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
  $('copyLink').addEventListener('click', function () {
    var btn = this;
    render(true);
    var done = function () { btn.textContent = TEXT.copied; setTimeout(function () { btn.textContent = TEXT.copy; }, 2000); };
    if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, function () {});
  });
  $('printBtn').addEventListener('click', function () { window.print(); });
  fromHash();
  // The page ships with results for the default inputs; recalculate only for a shared link or
  // values the browser restored (for example after Back), keeping start-up work off the main thread.
  var changed = Array.prototype.some.call(form.elements, function (el) {
    return el.type === 'checkbox' || el.type === 'radio' ? el.checked !== el.defaultChecked
      : el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected
      : 'defaultValue' in el && el.value !== el.defaultValue;
  });
  if (changed) render(false);
})();
