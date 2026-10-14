/* Hijri ⇄ Gregorian converter UI (BM + EN) on Malaysia's takwim (TBBHijri). Today's date and the upcoming Islamic dates
   are refreshed from the visitor's clock; converter state is kept in the URL hash. */
(function () {
  'use strict';
  var H = window.TBBHijri;
  var form = document.getElementById('hijriForm');
  if (!H || !form) return;
  var lang = document.documentElement.lang === 'ms' ? 'ms' : 'en', ms = lang === 'ms';
  var $ = function (id) { return document.getElementById(id); };
  var f = function (n) { return form.elements[n]; };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var now = new Date(), today = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
  var T = ms ? {
    hijri: 'Tarikh Hijrah', greg: 'Tarikh Masihi', day: 'Hari', len: 'Bilangan hari bulan ini', from: 'Dari hari ini',
    rel: function (n) { return n === 0 ? 'Hari ini' : n > 0 ? n + ' hari lagi' : -n + ' hari lalu'; },
    sighted: 'tertakluk rukyah', live: function (a, b) { return a + ' bersamaan ' + b + '.'; }
  } : {
    hijri: 'Hijri date', greg: 'Gregorian date', day: 'Day', len: 'Days in this Hijri month', from: 'From today',
    rel: function (n) { return n === 0 ? 'Today' : n > 0 ? 'in ' + n + (n === 1 ? ' day' : ' days') : -n + (n === -1 ? ' day ago' : ' days ago'); },
    sighted: 'subject to moon sighting', live: function (a, b) { return a + ' is ' + b + '.'; }
  };
  function row(body, label, value, cls) {
    var tr = body.insertRow(), th = document.createElement('th');
    if (cls) tr.className = cls;
    th.scope = 'row'; th.textContent = label; tr.appendChild(th);
    tr.insertCell().textContent = value;
  }
  function dir() { var d = form.querySelector('input[name="dir"]:checked'); return d ? d.value : 'g2h'; }

  function renderToday() {
    var h = H.toHijri(today);
    if (!h) return;
    $('hTodayH').textContent = H.formatHijri(h, lang);
    $('hTodayG').textContent = H.formatGregorian(today, lang, true);
    var body = $('hUpcoming'), list = H.upcoming(today, body.rows.length || 8);
    body.textContent = '';
    list.forEach(function (e) {
      var tr = body.insertRow(), th = document.createElement('th'), small = document.createElement('small');
      th.scope = 'row'; th.textContent = H.EVENT_NAMES[lang][e.key];
      if (e.sighted) { small.textContent = T.sighted; th.appendChild(small); }
      tr.appendChild(th);
      tr.insertCell().textContent = e.d + ' ' + H.MONTHS[lang][e.m - 1] + ' ' + e.y;
      tr.insertCell().textContent = H.formatGregorian(e.date, lang, true);
      tr.insertCell().textContent = T.rel(H.daysBetween(today, e.date));
    });
  }

  function render(writeHash) {
    var d = dir(), iso, h;
    $('hG2h').hidden = d !== 'g2h';
    $('hH2g').hidden = d !== 'h2g';
    if (d === 'g2h') { iso = f('gdate').value; h = H.toHijri(iso); }
    else { iso = H.toGregorian(f('hy').value, f('hm').value, f('hd').value); h = iso && H.toHijri(iso); }
    var body = $('hLines');
    body.textContent = '';
    $('hError').hidden = !!h;
    if (!h) { $('hOut').textContent = '–'; $('hOutSub').textContent = ''; $('hLive').textContent = ''; }
    else {
      var hs = H.formatHijri(h, lang), gs = H.formatGregorian(iso, lang, false), wd = H.DAYS[lang][H.weekday(iso)];
      $('hOut').textContent = d === 'g2h' ? hs : gs;
      $('hOutSub').textContent = wd + ' · ' + (d === 'g2h' ? gs : hs);
      row(body, T.hijri, hs, d === 'g2h' ? 'total' : '');
      row(body, T.greg, gs, d === 'h2g' ? 'total' : '');
      row(body, T.day, wd);
      row(body, T.len, h.length);
      row(body, T.from, T.rel(H.daysBetween(today, iso)));
      $('hLive').textContent = d === 'g2h' ? T.live(gs, hs) : T.live(hs, gs);
    }
    if (writeHash) {
      var parts = [];
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || (el.type === 'radio' && !el.checked)) return;
        var def = el.type === 'radio' ? 'g2h' : el.tagName === 'SELECT' ? (el.querySelector('option[selected]') || el.options[0]).value : el.defaultValue;
        if (el.value !== def) parts.push(el.name + '=' + encodeURIComponent(el.value));
      });
      history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
    }
  }

  function fromHash() {
    if (location.hash.length < 2) return false;
    location.hash.slice(1).split('&').forEach(function (kv) {
      var i = kv.indexOf('='), k = kv.slice(0, i), v = decodeURIComponent(kv.slice(i + 1));
      if (k === 'dir') { var r = form.querySelector('input[name="dir"][value="' + (v === 'h2g' ? 'h2g' : 'g2h') + '"]'); if (r) r.checked = true; return; }
      var el = form.elements[k];
      if (el && el.name) el.value = v;
    });
    return true;
  }

  var frame = 0;
  var schedule = function () { cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { render(true); }); };
  form.addEventListener('input', schedule);
  form.addEventListener('change', schedule);
  form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
  $('hijriPrint').addEventListener('click', function () { window.print(); });
  $('hToday').addEventListener('click', function () {
    var t = H.toHijri(today);
    f('gdate').value = today;
    if (t) { f('hd').value = t.d; f('hm').value = t.m; f('hy').value = t.y; }
    render(true);
  });
  renderToday();
  var restored = Array.prototype.some.call(form.elements, function (el) {
    if (!el.name) return false;
    if (el.type === 'radio') return el.checked !== el.defaultChecked;
    return el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected : el.value !== el.defaultValue;
  });
  if (fromHash() || restored) render(false);
})();
