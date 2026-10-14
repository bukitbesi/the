/* Qibla direction calculator UI (BM + EN). Inputs map to TBBQibla.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBQibla;
  var form = document.getElementById('qiblaForm');
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
  var lang = ms ? 'ms' : 'en';
  var T = ms ? {
    dec: 'Arah kiblat (darjah)', west: 'Dari arah barat', pt: 'Mata angin', km: 'Jarak ke Kaabah', coord: 'Koordinat', loc: 'Mendapatkan lokasi…', denied: 'Lokasi tidak dapat diperoleh. Pilih bandar atau masukkan koordinat.',
    westText: function (d) { return nf(d, 2) + '° ke utara dari barat'; },
    sub: function (r) { return nf(r.bearing, 2) + '° dari utara benar · ' + X.point(r.bearing, 'ms') + ' · ' + nf(r.km, 0) + ' km ke Kaabah'; },
    live: function (r) { return 'Arah kiblat ' + r.dm + ' dari utara benar.'; }
  } : {
    dec: 'Qibla bearing (degrees)', west: 'From due west', pt: 'Compass point', km: 'Distance to the Kaaba', coord: 'Coordinates', loc: 'Getting your location…', denied: 'Could not get your location. Choose a town or enter coordinates.',
    westText: function (d) { return nf(d, 2) + '° north of west'; },
    sub: function (r) { return nf(r.bearing, 2) + '° from true north · ' + X.point(r.bearing, 'en') + ' · ' + nf(r.km, 0) + ' km to the Kaaba'; },
    live: function (r) { return 'Qibla ' + r.dm + ' from true north.'; }
  };
  var coords = function (p) { for (var i = 0; i < X.PLACES.length; i++) if (X.PLACES[i][0] === p) return X.PLACES[i]; return null; };

  function render(writeHash) {
    var p = coords(f('place').value);
    if (p) { f('lat').value = p[2]; f('lon').value = p[3]; }
    var r = X.calculate({ place: f('place').value, lat: f('lat').value, lon: f('lon').value });
    if (!r) return;
    $('qBearing').textContent = r.dm;
    $('qSub').textContent = T.sub(r);
    $('qArrow').setAttribute('transform', 'rotate(' + r.bearing.toFixed(2) + ' 60 60)');
    rows($('qLines'), [[T.dec, nf(r.bearing, 2) + '°', 'total'], [T.west, T.westText(r.fromWest)], [T.pt, X.point(r.bearing, lang)], [T.km, nf(r.km, 0) + ' km'], [T.coord, nf(r.lat, 4) + ', ' + nf(r.lon, 4)]]);
    $('qLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  ['lat', 'lon'].forEach(function (n) { f(n).addEventListener('input', function () { f('place').value = 'custom'; }); });
  $('qLocate').addEventListener('click', function () {
    var msg = $('qMsg');
    if (!navigator.geolocation) { msg.textContent = T.denied; return; }
    msg.textContent = T.loc;
    navigator.geolocation.getCurrentPosition(function (pos) {
      f('place').value = 'custom';
      f('lat').value = pos.coords.latitude.toFixed(5); f('lon').value = pos.coords.longitude.toFixed(5);
      msg.textContent = '';
      render(true);
    }, function () { msg.textContent = T.denied; }, { enableHighAccuracy: true, timeout: 15000 });
  });
  wire(form, render, 'qiblaPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
