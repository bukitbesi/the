/* Waktu solat UI (BM + EN): today's times for the chosen JAKIM zone, a live countdown to the next prayer, the month's
   timetable, and "use my location". The zone and clock format live in the URL hash and are remembered on this device. */
(function () {
  'use strict';
  var X = window.TBBSolat, H = window.TBBHijri;
  var form = document.getElementById('solatForm');
  if (!X || !form) return;
  var ms = document.documentElement.lang === 'ms', lang = ms ? 'ms' : 'en';
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'tbb-solat';
  var T = ms ? {
    next: 'Waktu solat seterusnya', tomorrow: 'esok', inT: 'lagi', now: 'Sekarang waktu ', none: 'Bukan waktu solat fardu',
    loading: 'Memuatkan waktu solat…', failed: 'Waktu solat tidak dapat dimuatkan. Semak sambungan internet anda.',
    loc: 'Mencari zon anda…', denied: 'Lokasi tidak dapat diperoleh. Pilih zon anda dari senarai.',
    outside: 'Lokasi anda di luar Malaysia. Pilih zon dari senarai.',
    found: function (p, z) { return 'Lokasi terdekat: ' + p + ' → zon ' + z + '. Jika salah, pilih zon anda dari senarai.'; },
    missing: 'Jadual bulan ini belum diterbitkan oleh JAKIM.', live: function (n, t) { return 'Seterusnya ' + n + ' pada ' + t + '.'; }
  } : {
    next: 'Next prayer', tomorrow: 'tomorrow', inT: 'to go', now: 'Now: ', none: 'Not an obligatory prayer time',
    loading: 'Loading prayer times…', failed: 'Prayer times could not load. Check your internet connection.',
    loc: 'Finding your zone…', denied: 'Could not get your location. Choose your zone from the list.',
    outside: 'Your location is outside Malaysia. Choose a zone from the list.',
    found: function (p, z) { return 'Nearest place: ' + p + ' → zone ' + z + '. If that is wrong, choose your zone from the list.'; },
    missing: 'JAKIM has not published this month yet.', live: function (n, t) { return 'Next is ' + n + ' at ' + t + '.'; }
  };
  var years = {};
  // Each page starts on its own zone (Kuala Lumpur on /waktu-solat/, the state's main zone on a state page).
  var select = form.elements.zone, defZone = (select.querySelector('option[selected]') || select.options[0]).value;
  var listed = function (z) { return !!select.querySelector('option[value="' + z + '"]'); };
  var state = { zone: defZone, h24: false, month: null, todayIso: null, nextKey: null };
  // Events for Google Tag Manager / GA4; a plain array until GTM loads, so nothing breaks without it.
  var track = function (name, params) { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: name }, params)); };
  var baseTitle = document.title;
  // The BM page defaults to the 24-hour clock (as JAKIM prints it), the English page to 12-hour.
  var h24Default = form.elements.h24.defaultChecked;

  function load(year) {
    var k = state.zone + year;
    if (!years[k]) years[k] = fetch('/assets/solat/' + year + '/' + state.zone + '.json')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(X.decodeYear).catch(function () { delete years[k]; return null; });
    return years[k];
  }
  function times(iso) { return load(+iso.slice(0, 4)).then(function (d) { return X.day(d, iso); }); }
  var fmt = function (m) { return X.time(m, state.h24); };
  var clock = function (s) { var h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return h + ':' + (m < 10 ? '0' : '') + m + ':' + (x < 10 ? '0' : '') + x; };

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ zone: state.zone, h24: state.h24 })); } catch (e) {}
    var parts = [];
    if (state.zone !== defZone) parts.push('zone=' + state.zone);
    if (state.h24 !== h24Default) parts.push('h24=' + (state.h24 ? 1 : 0));
    history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
  }
  function restore() {
    var saved = null, kv = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    location.hash.slice(1).split('&').forEach(function (p) { var i = p.indexOf('='); if (i > 0) kv[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1)); });
    // A saved zone from another state does not replace this page's state.
    var z = kv.zone || (saved && saved.zone);
    if (z && X.zone(z) && listed(z)) state.zone = z;
    state.h24 = 'h24' in kv ? kv.h24 === '1' : saved && typeof saved.h24 === 'boolean' ? saved.h24 : h24Default;
    select.value = state.zone;
    form.elements.h24.checked = state.h24;
  }

  function dateLine(iso) {
    var g = H ? H.formatGregorian(iso, lang, true) : iso;
    return H ? g + ' · ' + H.formatHijri(H.toHijri(iso), lang) : g;
  }
  function renderDay(today, tomorrow, now) {
    var z = X.zone(state.zone), cur = X.current(today, now.minute), nx = X.next(today, tomorrow, now.minute);
    $('sZone').textContent = z.code + ' · ' + z.areas + ', ' + z.state;
    $('sDate').textContent = dateLine(now.iso);
    var body = $('sToday');
    body.textContent = '';
    X.KEYS.forEach(function (k, i) {
      var tr = body.insertRow(), th = document.createElement('th');
      if (i === cur) tr.className = 'now';
      th.scope = 'row'; th.textContent = X.name(i, lang); tr.appendChild(th);
      tr.insertCell().textContent = fmt(today[i]);
    });
    $('sNow').textContent = cur >= 0 ? T.now + X.name(cur, lang) : T.none;
    if (nx) {
      $('sNext').textContent = X.name(nx.i, lang).split(' (')[0] + ' ' + fmt(nx.at) + (nx.tomorrow ? ' (' + T.tomorrow + ')' : '');
      var key = state.zone + now.iso + nx.i + nx.tomorrow;
      if (key !== state.nextKey) { $('sLive').textContent = T.live(X.name(nx.i, lang), fmt(nx.at)); state.nextKey = key; }
    }
    state.nx = nx;
    // Absolute instant of the next prayer, so the countdown survives midnight and sleeping tabs.
    state.target = nx ? (X.dayNumber(now.iso) + (nx.tomorrow ? 1 : 0)) * 86400000 - 8 * 3600000 + nx.at * 60000 : 0;
    tick();
  }
  function tick() {
    var nx = state.nx, now = X.myt(Date.now());
    if (!nx) { $('sCount').textContent = ''; return; }
    var left = Math.ceil((state.target - Date.now()) / 1000);
    if (left <= 0 || now.iso !== state.todayIso) return refresh();
    $('sCount').textContent = clock(left) + ' ' + T.inT;
    if (now.second === 0 || !document.title.startsWith('(')) document.title = '(' + X.duration(Math.ceil(left / 60), lang) + ') ' + X.name(nx.i, lang).split(' (')[0] + ' · ' + baseTitle;
  }
  function refresh() {
    var now = X.myt(Date.now());
    state.todayIso = now.iso;
    $('sMsg2').textContent = '';
    return Promise.all([times(now.iso), times(X.addDays(now.iso, 1))]).then(function (r) {
      if (!r[0]) { $('sMsg2').textContent = T.failed; return; }
      renderDay(r[0], r[1], now);
      if (!state.month) state.month = now.iso.slice(0, 7);
      return renderMonth();
    });
  }

  function renderMonth() {
    var first = state.month + '-01';
    $('sMonthName').textContent = H ? H.GMONTHS[lang][+state.month.slice(5) - 1] + ' ' + state.month.slice(0, 4) : state.month;
    return load(+state.month.slice(0, 4)).then(function (data) {
      var body = $('sMonth');
      body.textContent = '';
      $('sMonthMsg').textContent = data ? '' : T.missing;
      if (!data) return;
      X.month(data, first).forEach(function (row) {
        var tr = body.insertRow(), th = document.createElement('th');
        if (row[0] === state.todayIso) tr.className = 'now';
        th.scope = 'row'; th.textContent = H ? H.formatGregorian(row[0], lang).replace(/ \d{4}$/, '') : row[0]; tr.appendChild(th);
        [0, 1, 2, 4, 5, 6, 7].forEach(function (i) { tr.insertCell().textContent = X.hhmm(row[1][i]); });
      });
    });
  }
  function shiftMonth(n) {
    var y = +state.month.slice(0, 4), m = +state.month.slice(5) - 1 + n;
    y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    state.month = y + '-' + (m < 9 ? '0' : '') + (m + 1);
    renderMonth();
  }

  function change(method) {
    if (select.value !== state.zone) track('solat_zone', { solat_zone: select.value, solat_method: method === 'gps' ? 'gps' : 'select' });
    state.zone = select.value;
    state.h24 = form.elements.h24.checked;
    state.nextKey = null;
    save();
    refresh();
  }
  form.addEventListener('change', function () { change(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); change(); });
  $('mPrev').addEventListener('click', function () { shiftMonth(-1); });
  $('mNext').addEventListener('click', function () { shiftMonth(1); });
  $('solatPrint').addEventListener('click', function () { track('solat_print', { solat_zone: state.zone }); window.print(); });
  $('sLocate').addEventListener('click', function () {
    var msg = $('sMsg');
    if (!navigator.geolocation) { msg.textContent = T.denied; return; }
    msg.textContent = T.loc;
    navigator.geolocation.getCurrentPosition(function (pos) {
      var r = X.nearest(pos.coords.latitude, pos.coords.longitude);
      if (!r) { msg.textContent = T.outside; return; }
      // On a state page, a zone in another state opens the all-zones page on that zone.
      if (!listed(r.zone)) {
        track('solat_zone', { solat_zone: r.zone, solat_method: 'gps' });
        try { localStorage.setItem(KEY, JSON.stringify({ zone: r.zone, h24: state.h24 })); } catch (e) {}
        location.href = (ms ? '/waktu-solat/' : '/prayer-times-malaysia/') + '#zone=' + r.zone; return; }
      select.value = r.zone;
      msg.textContent = T.found(r.place, r.zone);
      change('gps');
    }, function () { msg.textContent = T.denied; }, { timeout: 15000, maximumAge: 600000 });
  });

  restore();
  refresh();
  setInterval(tick, 1000);
  // Coming back to a tab or app that slept: recompute from the real clock.
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
})();
