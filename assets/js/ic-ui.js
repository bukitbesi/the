/* MyKad number decoder UI (BM + EN). Decodes as you type with TBBIc. For privacy nothing is saved: no URL hash, no
   storage, no network. The list mode decodes many numbers at once (class or staff lists) and exports a CSV that
   keeps only the masked number. */
(function () {
  'use strict';
  var C = window.TBBIc;
  var form = document.getElementById('icForm');
  if (!C || !form) return;
  var ms = document.documentElement.lang === 'ms', lang = ms ? 'ms' : 'en', $ = function (id) { return document.getElementById(id); }, f = function (n) { return form.elements[n]; };
  var MON = (ms ? 'Januari Februari Mac April Mei Jun Julai Ogos September Oktober November Disember' : 'January February March April May June July August September October November December').split(' ');
  var DAY = ms ? ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'] : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var T = ms ? { male: 'Lelaki', female: 'Perempuan', years: ' tahun', state: 'Lahir di Malaysia', abroad: 'Lahir di luar Malaysia', region: 'Kumpulan rantau', amb: function (a, b) { return 'Tahun lahir boleh jadi ' + a + ' atau ' + b + '; tukar abad di atas jika perlu.'; },
    err: { empty: 'Taip 12 digit nombor MyKad.', length: 'Nombor MyKad ada 12 digit.', chars: 'Gunakan digit sahaja (sempang dan jarak dibenarkan).', date: 'Enam digit pertama bukan tarikh yang sah.', future: 'Tarikh lahir ini belum tiba bagi abad yang dipilih.', code: 'Kod tempat lahir ini tiada dalam senarai JPN.' }, hdr: 'Nombor (bertopeng),Tarikh lahir,Umur,Tempat lahir,Jantina,Kod' }
    : { male: 'Male', female: 'Female', years: ' years', state: 'Born in Malaysia', abroad: 'Born outside Malaysia', region: 'Regional group', amb: function (a, b) { return 'The birth year could be ' + a + ' or ' + b + '; switch the century above if needed.'; },
    err: { empty: 'Type the 12-digit MyKad number.', length: 'A MyKad number has 12 digits.', chars: 'Use digits only (dashes and spaces are fine).', date: 'The first six digits are not a valid date.', future: 'That birth date has not happened yet for the chosen century.', code: 'This place-of-birth code is not on JPN\'s list.' }, hdr: 'Number (masked),Date of birth,Age,Place of birth,Gender,Code' };
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  var long = function (iso) { var p = iso.split('-').map(Number), w = new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay(); return DAY[w] + ', ' + p[2] + ' ' + MON[p[1] - 1] + ' ' + p[0]; };
  var where = function (r) { return r.place ? r.place.name : '–'; };

  function render() {
    var r = C.decode(f('ic').value, lang, today(), f('century').value), rows = $('icRows').rows;
    if (!r.ok) {
      $('icBirth').textContent = '–'; $('icSub').textContent = T.err[r.error] || T.err.empty;
      Array.prototype.forEach.call(rows, function (tr) { tr.cells[1].textContent = '–'; });
      $('icNote').textContent = ''; $('icLive').textContent = $('icSub').textContent; return;
    }
    var kind = r.place.kind === 'state' ? T.state : r.place.kind === 'region' ? T.region : r.place.kind === 'unknown' ? T.state : T.abroad;
    $('icBirth').textContent = long(r.birth);
    $('icSub').textContent = r.age + T.years + ' · ' + where(r) + ' · ' + (r.gender === 'male' ? T.male : T.female);
    var vals = [long(r.birth), r.age + T.years, where(r) + ' (' + kind + ')', String(r.pb).padStart(2, '0'), (r.gender === 'male' ? T.male : T.female) + ' (' + r.digits[11] + ')', C.mask(r.digits)];
    Array.prototype.forEach.call(rows, function (tr, i) { tr.cells[1].textContent = vals[i]; });
    var y = Number(r.birth.slice(0, 4));
    $('icNote').textContent = r.ambiguous ? T.amb(y, y === Number('19' + r.digits.slice(0, 2)) ? 2000 + y % 100 : 1900 + y % 100) : '';
    $('icLive').textContent = $('icBirth').textContent + ', ' + $('icSub').textContent;
  }

  var last = [];
  function renderList() {
    last = C.decodeMany(f('list').value, lang, today());
    var body = $('icList'); body.textContent = '';
    last.forEach(function (r) {
      var tr = body.insertRow(), th = document.createElement('th'); th.scope = 'row'; th.textContent = C.mask(r.digits) || '–'; tr.appendChild(th);
      if (r.ok) [r.birth, r.age, where(r), r.gender === 'male' ? T.male : T.female].forEach(function (v) { tr.insertCell().textContent = v; });
      else { var td = tr.insertCell(); td.colSpan = 4; td.className = 'muted'; td.textContent = T.err[r.error]; }
    });
    $('icListBox').hidden = !last.length; $('icCsv').disabled = !last.length;
  }
  $('icCsv').addEventListener('click', function () {
    var q = function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var csv = T.hdr + '\n' + last.map(function (r) { return [C.mask(r.digits), r.birth || '', r.age == null ? '' : r.age, r.ok ? where(r) : T.err[r.error], r.ok ? (r.gender === 'male' ? T.male : T.female) : '', r.ok ? r.pb : ''].map(q).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = ms ? 'semakan-ic.csv' : 'ic-check.csv';
    document.body.appendChild(a); a.click(); a.remove();
  });
  $('icClear').addEventListener('click', function () { f('ic').value = ''; f('list').value = ''; render(); renderList(); f('ic').focus(); });
  $('icPrint').addEventListener('click', function () { window.print(); });
  form.addEventListener('input', function (e) { if (e.target.name === 'list') renderList(); else render(); });
  form.addEventListener('change', function (e) { if (e.target.name === 'century') { render(); } });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  render();
})();
