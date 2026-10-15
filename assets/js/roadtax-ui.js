/* Road tax calculator UI (BM + EN). Inputs map to TBBRoadTax.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBRoadTax;
  var form = document.getElementById('roadForm');
  if (!X || !form) return;
  var ms = document.documentElement.lang === 'ms';
  var fmt2 = new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR' });
  var fmt0 = new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 });
  var money = function (n) { return fmt2.format(n); };
  var rm0 = function (n) { return fmt0.format(n); };
  var nf = function (n, d) { return new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { maximumFractionDigits: d === undefined ? 2 : d }).format(n); };
  var $ = function (id) { return document.getElementById(id); };
  var f = function (n) { return form.elements[n]; };
  function hashState(form, defaults) {
    var parts = [];
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || (el.type === 'radio' && !el.checked)) return;
      var def = el.tagName === 'SELECT' ? (el.querySelector('option[selected]') || el.options[0] || {}).value : el.defaultValue;
      if (defaults && el.name in defaults) def = defaults[el.name];
      if (el.value !== def) parts.push(el.name + '=' + encodeURIComponent(el.value));
    });
    history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
  }
  function fromHash(form, before) {
    if (location.hash.length < 2) return false;
    var kv = {};
    location.hash.slice(1).split('&').forEach(function (p) { var i = p.indexOf('='); if (i > 0) kv[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1)); });
    if (before) before(kv);
    Object.keys(kv).forEach(function (k) { var el = form.elements[k]; if (el && el.name) el.value = kv[k]; });
    return true;
  }
  function changed(form) {
    return Array.prototype.some.call(form.elements, function (el) {
      if (!el.name) return false;
      return el.tagName === 'SELECT' ? el.selectedIndex >= 0 && !el.options[el.selectedIndex].defaultSelected : el.value !== el.defaultValue;
    });
  }
  function rows(body, list) {
    body.textContent = '';
    list.forEach(function (x) {
      var tr = body.insertRow(), th = document.createElement('th');
      if (x[2]) tr.className = x[2];
      th.scope = 'row'; th.textContent = x[0]; tr.appendChild(th);
      tr.insertCell().textContent = x[1];
    });
  }
  function wire(form, render, printId) {
    var frame = 0;
    var schedule = function () { cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { render(true); }); };
    form.addEventListener('input', schedule);
    form.addEventListener('change', schedule);
    form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
    document.getElementById(printId).addEventListener('click', function () { window.print(); });
  }
  var T = ms ? {
    region: { peninsular: 'Semenanjung', east: 'Sabah dan Sarawak', labuan: 'Labuan', langkawi: 'Langkawi atau Pangkor' },
    type: { car: 'Kereta', ev: 'Kereta elektrik', moto: 'Motosikal', emoto: 'Motosikal elektrik' },
    body: { saloon: 'saloon', nonSaloon: 'bukan saloon' }, owner: { individual: 'persendirian', company: 'syarikat' },
    group: 'Kumpulan', y: '12 bulan', h: '6 bulan', m: 'Purata sebulan', band: 'Jalur', calc: 'Kiraan', island: 'Diskaun pulau (50%)',
    flat: function (b) { return 'RM' + nf(b.base) + ' tetap'; }, per: function (b) { return 'RM' + nf(b.base) + ' + ' + nf(b.over, 0) + ' cc × RM' + b.perCc.toFixed(2); },
    evCalc: function (e) { return e.blocks ? 'RM' + nf(e.base) + ' + ' + e.blocks + ' × RM' + nf(e.perBlock) : 'RM' + nf(e.base) + ' tetap'; },
    why: { companyEast: 'Kadar kereta saloon syarikat di Sabah, Sarawak dan pulau bebas cukai belum disahkan oleh dua sumber. Semak di MyJPJ.', evRegion: 'Kadar kereta elektrik di luar Semenanjung belum disahkan (sumber bercanggah). Semak di MyJPJ.', moto500: 'Kadar motosikal 251–500 cc di Semenanjung bercanggah antara sumber (RM100 atau RM180). Semak di MyJPJ.', motoIsland: 'Kadar motosikal di Labuan, Langkawi dan Pangkor belum disahkan. Semak di MyJPJ.', emotoRegion: 'Kadar motosikal elektrik di luar Semenanjung belum disahkan. Semak di MyJPJ.' },
    none: '—', sub: function (r, d) { return (r.months === 6 ? '6 bulan' : '12 bulan') + ' · ' + d; },
    live: function (r) { return r.tax === null ? 'Kadar belum disahkan.' : 'Cukai jalan ' + money(r.tax) + '.'; }
  } : {
    region: { peninsular: 'Peninsular', east: 'Sabah and Sarawak', labuan: 'Labuan', langkawi: 'Langkawi or Pangkor' },
    type: { car: 'Car', ev: 'Electric car', moto: 'Motorcycle', emoto: 'Electric motorcycle' },
    body: { saloon: 'saloon', nonSaloon: 'non-saloon' }, owner: { individual: 'private', company: 'company' },
    group: 'Group', y: '12 months', h: '6 months', m: 'Average a month', band: 'Band', calc: 'Calculation', island: 'Island discount (50%)',
    flat: function (b) { return 'RM' + nf(b.base) + ' flat'; }, per: function (b) { return 'RM' + nf(b.base) + ' + ' + nf(b.over, 0) + ' cc × RM' + b.perCc.toFixed(2); },
    evCalc: function (e) { return e.blocks ? 'RM' + nf(e.base) + ' + ' + e.blocks + ' × RM' + nf(e.perBlock) : 'RM' + nf(e.base) + ' flat'; },
    why: { companyEast: 'Company saloon rates in Sabah, Sarawak and the duty-free islands are not confirmed by two sources. Check on MyJPJ.', evRegion: 'Electric car rates outside the Peninsula are not confirmed (sources conflict). Check on MyJPJ.', moto500: 'Peninsular rates for 251–500 cc motorcycles conflict between sources (RM100 or RM180). Check on MyJPJ.', motoIsland: 'Motorcycle rates in Labuan, Langkawi and Pangkor are not confirmed. Check on MyJPJ.', emotoRegion: 'Electric motorcycle rates outside the Peninsula are not confirmed. Check on MyJPJ.' },
    none: '—', sub: function (r, d) { return (r.months === 6 ? '6 months' : '12 months') + ' · ' + d; },
    live: function (r) { return r.tax === null ? 'Rate not confirmed.' : 'Road tax ' + money(r.tax) + '.'; }
  };

  function render(writeHash) {
    var type = f('type').value;
    $('rtCar').hidden = type !== 'car';
    $('rtCc').hidden = type !== 'car' && type !== 'moto';
    $('rtKw').hidden = type !== 'ev';
    $('rtW').hidden = type !== 'emoto';
    var r = X.calculate({ type: type, region: f('region').value, body: f('body').value, owner: f('owner').value, cc: f('cc').value, kw: f('kw').value, watts: f('watts').value, months: f('months').value });
    var d = T.type[type] + (type === 'car' ? ' ' + T.owner[f('owner').value] + ' ' + T.body[f('body').value] : '') + ' · ' + T.region[f('region').value];
    $('rtTax').textContent = r.tax === null ? T.none : money(r.tax);
    $('rtSub').textContent = T.sub(r, d);
    var list = [];
    if (r.band) {
      list.push([T.band, nf(r.band.from, 0) + '–' + (r.band.to === Infinity ? '' : nf(r.band.to, 0)) + ' cc'], [T.calc, r.band.perCc ? T.per(r.band) : T.flat(r.band)]);
      if (r.island) list.push([T.island, '÷ 2']);
    } else if (r.ev) list.push([T.band, T.group + ' ' + r.ev.group + ' · ' + nf(r.kw, 1) + ' kW'], [T.calc, T.evCalc(r.ev)]);
    else if (r.motoBand) list.push([T.band, r.motoBand[0] + '–' + (r.motoBand[1] === Infinity ? '' : r.motoBand[1]) + ' cc']);
    else if (r.emotoBand) list.push([T.band, nf(r.emotoBand[0], 0) + '–' + (r.emotoBand[1] === Infinity ? '' : nf(r.emotoBand[1], 0)) + ' W']);
    if (r.tax !== null && r.annual !== undefined) list.push([T.y, money(r.annual), 'total'], [T.h, money(r.half)], [T.m, money(r.monthly)]);
    rows($('rtLines'), list);
    $('rtWhy').textContent = r.reason ? T.why[r.reason] : '';
    $('rtWhy').hidden = !r.reason;
    $('rtLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'rtPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
