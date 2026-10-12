/* "Near me" courier finder (EN + BM). Gets the visitor's location in the browser, or an area they type, and
   links to a Google Maps search for that courier around it. Nothing is stored or sent to this site; the
   location reaches Google only when the visitor opens the Maps link. */
(function () {
  'use strict';
  var K = window.TBBTracking;
  var form = document.getElementById('nearForm');
  if (!K || !form) return;
  var ms = document.documentElement.lang === 'ms';
  var $ = function (id) { return document.getElementById(id); };
  var queries = K.MAPS[form.getAttribute('data-courier')] || [];
  if (!queries.length) return;
  var msg = $('nearMsg'), out = $('nearLinks'), btn = $('nearLocate');
  var T = ms ? {
    finding: 'Mencari lokasi anda…',
    ready: 'Sedia. Buka Google Maps untuk melihat cawangan berhampiran anda.',
    area: function (a) { return 'Sedia. Buka Google Maps untuk melihat cawangan di ' + a + '.'; },
    denied: 'Lokasi tidak dibenarkan. Taip kawasan atau poskod di bawah.',
    failed: 'Lokasi tidak dapat dikesan. Taip kawasan atau poskod di bawah.',
    empty: 'Taip kawasan, bandar atau poskod.',
    open: function (q) { return 'Buka ' + q + ' di Google Maps'; },
    also: function (q) { return 'Cuba juga: ' + q; }
  } : {
    finding: 'Finding your location…',
    ready: 'Ready. Open Google Maps to see branches near you.',
    area: function (a) { return 'Ready. Open Google Maps to see branches in ' + a + '.'; },
    denied: 'Location permission was declined. Type an area or postcode below.',
    failed: 'Your location could not be found. Type an area or postcode below.',
    empty: 'Type an area, town or postcode.',
    open: function (q) { return 'Open ' + q + ' in Google Maps'; },
    also: function (q) { return 'Also try: ' + q; }
  };

  // A popup opened after the asynchronous location lookup would be blocked, so show links to tap instead.
  function show(where, text) {
    out.textContent = '';
    queries.forEach(function (q, i) {
      var li = document.createElement('li'), a = document.createElement('a');
      a.className = i ? 'btn ghost sm' : 'btn';
      a.href = K.mapsUrl(q, where); a.target = '_blank'; a.rel = 'noopener';
      a.textContent = i ? T.also(q) : T.open(q);
      li.appendChild(a); out.appendChild(li);
    });
    msg.className = 'note'; msg.textContent = text;
    out.hidden = false;
    out.querySelector('a').focus();
  }

  if (!navigator.geolocation) btn.hidden = true;
  btn.addEventListener('click', function () {
    msg.className = 'note'; msg.textContent = T.finding; btn.disabled = true;
    navigator.geolocation.getCurrentPosition(function (pos) {
      btn.disabled = false;
      show({ lat: pos.coords.latitude, lng: pos.coords.longitude }, T.ready);
    }, function (err) {
      btn.disabled = false;
      msg.className = 'error'; msg.textContent = err && err.code === 1 ? T.denied : T.failed;
      $('nearArea').focus();
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var area = $('nearArea').value.replace(/\s+/g, ' ').trim();
    if (!area) { msg.className = 'error'; msg.textContent = T.empty; $('nearArea').focus(); return; }
    show(area, T.area(area));
  });
})();
