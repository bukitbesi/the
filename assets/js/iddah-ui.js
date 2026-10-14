/* Iddah calculator UI (BM + EN). Inputs map to TBBIddah.calculate(); dates are shown in Masihi and on Malaysia's Hijri takwim. */
(function () {
  'use strict';
  var I = window.TBBIddah, H = window.TBBHijri;
  var form = document.getElementById('iddahForm');
  if (!I || !H || !form) return;
  var lang = document.documentElement.lang === 'ms' ? 'ms' : 'en', ms = lang === 'ms';
  var $ = function (id) { return document.getElementById(id); };
  var f = function (n) { return form.elements[n]; };
  var both = function (iso) { return [H.formatGregorian(iso, lang), H.formatHijri(H.toHijri(iso), lang)]; };
  var T = ms ? {
    kind: { none: 'Tiada iddah', quru: 'Tiga kali suci (quru\')', months: 'Tiga bulan Hijrah', wafat: 'Empat bulan sepuluh hari', pregnant: 'Sehingga melahirkan anak' },
    type: 'Jenis iddah', start: 'Mula', end: 'Tamat', days: 'Tempoh', rujuk: 'Boleh rujuk hingga', ihdad: 'Ihdad (berkabung)', yes: 'Wajib sepanjang iddah', no: 'Tidak wajib',
    period: function (i) { return 'Haid ke-' + (i + 1) + ' selepas talak'; }, dayN: function (n) { return n + ' hari'; },
    none: 'Tiada iddah: talak sebelum persetubuhan.', due: 'Pada hari bersalin', quru: 'Bila haid ketiga selepas talak bermula',
    min: function (n) { return 'Sekurang-kurangnya ' + n + ' hari. Isi tarikh haid terakhir untuk anggaran tarikh.'; },
    live: function (r) { return r.end ? 'Iddah tamat ' + H.formatGregorian(r.end, 'ms') + '.' : 'Iddah: ' + T.kind[r.kind] + '.'; }
  } : {
    kind: { none: 'No iddah', quru: 'Three periods of purity (quru\')', months: 'Three Hijri months', wafat: 'Four months and ten days', pregnant: 'Until delivery' },
    type: 'Type of iddah', start: 'Starts', end: 'Ends', days: 'Length', rujuk: 'Reconciliation (rujuk) possible until', ihdad: 'Ihdad (mourning)', yes: 'Required for the whole iddah', no: 'Not required',
    period: function (i) { return 'Period ' + (i + 1) + ' after the talak'; }, dayN: function (n) { return n + (n === 1 ? ' day' : ' days'); },
    none: 'No iddah: divorce before consummation.', due: 'On the day of delivery', quru: 'When the third period after the talak begins',
    min: function (n) { return 'At least ' + n + ' days. Enter your last period to estimate the date.'; },
    live: function (r) { return r.end ? 'Iddah ends ' + H.formatGregorian(r.end, 'en') + '.' : 'Iddah: ' + T.kind[r.kind] + '.'; }
  };
  function row(body, label, value, cls) {
    var tr = body.insertRow(), th = document.createElement('th');
    if (cls) tr.className = cls;
    th.scope = 'row'; th.textContent = label; tr.appendChild(th);
    var td = tr.insertCell();
    if (typeof value === 'string') { td.textContent = value; return; }
    var small = document.createElement('small');
    td.textContent = value[0]; small.textContent = value[1]; td.appendChild(small);
  }

  function render(writeHash) {
    var event = f('event').value, divorce = event === 'divorce', state = f('state').value;
    $('iDivorce').hidden = !divorce;
    $('iCycle').hidden = !(state === 'haid' && divorce && f('consummated').value !== 'no');
    $('iDue').hidden = state !== 'pregnant';
    var r = I.calculate({ event: event, date: f('date').value, consummated: f('consummated').value, talak: f('talak').value, state: state,
      lastPeriod: f('lastPeriod').value, cycle: f('cycle').value, due: f('due').value });
    var body = $('iLines');
    body.textContent = '';
    $('iError').hidden = !r.error;
    if (r.error) { $('iEnd').textContent = '–'; $('iEndHijri').textContent = ''; $('iSub').textContent = ''; $('iLive').textContent = ''; return; }
    $('iEnd').textContent = r.kind === 'none' ? T.kind.none : r.end ? H.formatGregorian(r.end, lang, true) : r.kind === 'pregnant' ? T.due : T.quru;
    $('iEndHijri').textContent = r.end && r.kind !== 'none' ? H.formatHijri(r.endHijri, lang) : '';
    $('iSub').textContent = r.kind === 'none' ? T.none : r.days !== null ? T.kind[r.kind] + ' · ' + T.dayN(r.days) : r.minDays ? T.min(r.minDays) : T.kind[r.kind];
    row(body, T.type, T.kind[r.kind]);
    row(body, T.start, both(r.start));
    if (r.periods) r.periods.forEach(function (p, i) { row(body, T.period(i), both(p)); });
    if (r.end && r.kind !== 'none') row(body, T.end, both(r.end), 'total');
    if (r.days) row(body, T.days, T.dayN(r.days));
    if (r.rujuk && r.kind !== 'none') row(body, T.rujuk, r.end ? both(r.end) : T.kind[r.kind]);
    row(body, T.ihdad, r.ihdad ? T.yes : T.no);
    $('iIhdad').hidden = !r.ihdad;
    $('iEstimate').hidden = !r.estimate;
    $('iLive').textContent = T.live(r);
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
  $('iddahPrint').addEventListener('click', function () { window.print(); });
  var restored = Array.prototype.some.call(form.elements, function (el) {
    if (!el.name) return false;
    return el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected : el.value !== el.defaultValue;
  });
  if (fromHash() || restored) render(false);
})();
