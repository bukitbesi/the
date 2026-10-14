/* Fuel cost calculator UI (EN + BM). Prices come from the selected fuel option (baked in weekly); state is kept in the URL hash. */
(function () {
  'use strict';
  var F = window.TBBFuel;
  var form = document.getElementById('fuelForm');
  if (!F || !form) return;
  var ms = document.documentElement.lang === 'ms';
  var loc = ms ? 'ms-MY' : 'en-MY';
  var fmt2 = new Intl.NumberFormat(loc, { style: 'currency', currency: 'MYR' });
  var nf = function (n, d) { return new Intl.NumberFormat(loc, { maximumFractionDigits: d === undefined ? 2 : d }).format(n); };
  var money = function (n) { return fmt2.format(n); };
  var sen = function (n) { return nf(n * 100, 1) + ' sen'; };
  var $ = function (id) { return document.getElementById(id); };
  var f = function (n) { return form.elements[n]; };
  var T = ms ? {
    head: { trip: 'Kos minyak perjalanan', measure: 'Penggunaan minyak anda' },
    litres: 'Minyak diperlukan', fuel: 'Kos minyak', toll: 'Tol', total: 'Jumlah kos perjalanan', perKm: 'Kos sekilometer', person: 'Seorang',
    km: 'Jarak', cons: 'Penggunaan', cost: 'Kos isi penuh', monthly: 'Sebulan',
    live: function (r, m) { return m === 'trip' ? 'Kos perjalanan ' + money(r.total) + ', ' + sen(r.perKm) + ' sekilometer.' : 'Penggunaan ' + nf(r.l100, 1) + ' liter setiap 100 km.'; },
    sub: function (r) { return nf(r.litres) + ' liter · ' + sen(r.perKm) + '/km · ' + money(r.perPerson) + ' seorang'; },
    msub: function (r) { return nf(r.kml, 1) + ' km/liter · ' + sen(r.perKm) + '/km'; },
    budi: function (b) { return nf(b.subsidised, 0) + ' liter pada harga subsidi, ' + nf(b.over, 0) + ' liter melebihi kuota pada harga pasaran. Jimat ' + money(b.saving) + ' berbanding harga tanpa subsidi.'; }
  } : {
    head: { trip: 'Fuel cost for the trip', measure: 'Your fuel consumption' },
    litres: 'Fuel needed', fuel: 'Fuel cost', toll: 'Tolls', total: 'Total trip cost', perKm: 'Cost per km', person: 'Per person',
    km: 'Distance', cons: 'Consumption', cost: 'Cost of the fill-up', monthly: 'A month',
    live: function (r, m) { return m === 'trip' ? 'Trip cost ' + money(r.total) + ', ' + sen(r.perKm) + ' per km.' : 'Consumption ' + nf(r.l100, 1) + ' litres per 100 km.'; },
    sub: function (r) { return nf(r.litres) + ' litres · ' + sen(r.perKm) + '/km · ' + money(r.perPerson) + ' per person'; },
    msub: function (r) { return nf(r.kml, 1) + ' km/litre · ' + sen(r.perKm) + '/km'; },
    budi: function (b) { return nf(b.subsidised, 0) + ' litres at the subsidised price, ' + nf(b.over, 0) + ' litres over the quota at the market price. You save ' + money(b.saving) + ' against the unsubsidised price.'; }
  };

  function prices() {
    var p = {};
    Array.prototype.forEach.call(f('fuel').options, function (o) { p[o.value] = Number(o.getAttribute('data-price')); });
    return p;
  }
  var optPrice = function () { return f('fuel').options[f('fuel').selectedIndex].getAttribute('data-price'); };
  function mode() { var m = form.querySelector('input[name="mode"]:checked'); return m ? m.value : 'trip'; }
  function row(body, label, value, cls) {
    var tr = body.insertRow(), th = document.createElement('th');
    if (cls) tr.className = cls;
    th.scope = 'row'; th.textContent = label; tr.appendChild(th);
    tr.insertCell().textContent = value;
  }

  function render(writeHash) {
    var m = mode(), body = $('fLines'), price = f('price').value;
    $('fTrip').hidden = m !== 'trip';
    $('fMeasure').hidden = m !== 'measure';
    $('fHeadLabel').textContent = T.head[m];
    body.textContent = '';
    var r;
    if (m === 'trip') {
      r = F.trip({ distance: f('distance').value, roundTrip: f('roundTrip').value, consumption: f('consumption').value, unit: f('unit').value,
        price: price, passengers: f('passengers').value, toll: f('toll').value });
      $('fTotal').textContent = money(r.total);
      $('fSub').textContent = T.sub(r);
      row(body, T.km, nf(r.km, 1) + ' km');
      row(body, T.litres, nf(r.litres) + ' L');
      row(body, T.fuel, money(r.fuel));
      if (r.toll) row(body, T.toll, money(r.toll));
      row(body, T.perKm, sen(r.perKm));
      if (r.people > 1) row(body, T.person, money(r.perPerson));
      row(body, T.total, money(r.total), 'total');
      var trips = Number(f('trips').value) || 0, b = F.monthly(r.litres * trips, f('fuel').value, prices(), f('quota').value);
      $('fMonthWrap').hidden = !trips;
      $('fMonth').textContent = money(b.cost + r.toll * trips);
      $('fMonthLitres').textContent = nf(b.litres, 0) + ' L';
      $('fBudi').hidden = !b.quota || !trips;
      $('fBudi').textContent = b.quota ? T.budi(b) : '';
    } else {
      r = F.measure({ km: f('km').value, litres: f('litres').value, price: price });
      $('fTotal').textContent = nf(r.l100, 1) + ' L/100 km';
      $('fSub').textContent = T.msub(r);
      row(body, T.km, nf(r.km, 1) + ' km');
      row(body, T.cons, nf(r.l100, 2) + ' L/100 km · ' + nf(r.kml, 2) + ' km/L');
      row(body, T.cost, money(r.cost));
      row(body, T.perKm, sen(r.perKm), 'total');
      $('fMonthWrap').hidden = true;
      $('fBudi').hidden = true;
    }
    $('fLive').textContent = T.live(r, m);
    if (writeHash) {
      var parts = [];
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || (el.type === 'radio' && !el.checked)) return;
        if (el.name === 'price' && el.value === optPrice()) return;
        var def = el.type === 'radio' ? 'trip' : el.tagName === 'SELECT' ? (el.querySelector('option[selected]') || el.options[0]).value : el.defaultValue;
        if (el.value !== def) parts.push(el.name + '=' + encodeURIComponent(el.value));
      });
      history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
    }
  }

  function fromHash() {
    if (location.hash.length < 2) return false;
    var hasPrice = false;
    location.hash.slice(1).split('&').forEach(function (kv) {
      var i = kv.indexOf('='), k = kv.slice(0, i), v = decodeURIComponent(kv.slice(i + 1)), el = form.elements[k];
      if (!el) return;
      if (k === 'mode') { var radio = form.querySelector('input[name="mode"][value="' + (v === 'measure' ? 'measure' : 'trip') + '"]'); if (radio) radio.checked = true; return; }
      if (k === 'price') hasPrice = true;
      if (el.name) el.value = v;
    });
    if (!hasPrice) f('price').value = optPrice();
    return true;
  }

  var frame = 0;
  var schedule = function () { cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { render(true); }); };
  form.addEventListener('input', schedule);
  form.addEventListener('change', function (e) {
    if (e.target.name === 'fuel') f('price').value = optPrice();
    schedule();
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
  $('fuelPrint').addEventListener('click', function () { window.print(); });
  var restored = Array.prototype.some.call(form.elements, function (el) {
    if (!el.name) return false;
    if (el.type === 'radio') return el.checked !== el.defaultChecked;
    return el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected : el.value !== el.defaultValue;
  });
  if (fromHash() || restored) render(false);
})();
