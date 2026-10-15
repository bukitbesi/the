/* Shoe size converter UI (BM + EN). Inputs map to TBBKasut.convert(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBKasut;
  var form = document.getElementById('kasutForm');
  if (!X || !form) return;
  var ms = document.documentElement.lang === 'ms';
  var fmt2 = new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { style: 'currency', currency: 'MYR' });
  var money = function (n) { return fmt2.format(n); };
  var nf = function (n, d) { return new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { maximumFractionDigits: d === undefined ? 2 : d }).format(n); };
  var day = function (iso) { return new Date(iso + 'T00:00:00Z').toLocaleDateString(ms ? 'ms-MY' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); };
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
    uk: function (r) { return r.kids ? 'UK kanak-kanak' : 'UK'; }, eu: 'EU', usM: 'US lelaki', usW: 'US wanita', mm: 'Mondopoint (mm)', foot: 'Panjang kaki',
    sub: function (r) { return 'EU ' + nf(r.eu, 1) + ' · US lelaki ' + (r.usM === null ? '–' : nf(r.usM, 1)) + ' · kaki ' + nf(r.foot, 1) + ' cm'; }, kidsSub: function (r) { return 'Saiz kanak-kanak · EU ' + nf(r.eu, 1) + ' · kaki ' + nf(r.foot, 1) + ' cm'; },
    bad: 'Masukkan panjang kaki atau saiz', live: function (r) { return 'Saiz UK ' + r.uk + '.'; }
  } : {
    uk: function (r) { return r.kids ? 'UK kids' : 'UK'; }, eu: 'EU', usM: 'US men', usW: 'US women', mm: 'Mondopoint (mm)', foot: 'Foot length',
    sub: function (r) { return 'EU ' + nf(r.eu, 1) + ' · US men ' + (r.usM === null ? '–' : nf(r.usM, 1)) + ' · foot ' + nf(r.foot, 1) + ' cm'; }, kidsSub: function (r) { return "Children's size · EU " + nf(r.eu, 1) + ' · foot ' + nf(r.foot, 1) + ' cm'; },
    bad: 'Enter a foot length or size', live: function (r) { return 'UK size ' + r.uk + '.'; }
  };

  function render(writeHash) {
    var mode = f('mode').value;
    $('fFoot').hidden = mode !== 'foot'; $('fSize').hidden = mode === 'foot';
    var r = X.convert({ mode: mode, foot: f('foot').value, system: f('system').value, size: f('size').value });
    if (!r) { $('sUk').textContent = '–'; $('sSub').textContent = T.bad; rows($('sLines'), []); return; }
    $('sUk').textContent = (r.kids ? 'UK ' + nf(r.uk, 1) + (ms ? ' (kanak-kanak)' : ' (kids)') : 'UK ' + nf(r.uk, 1));
    $('sSub').textContent = r.kids ? T.kidsSub(r) : T.sub(r);
    var list = [[T.uk(r), nf(r.uk, 1)], [T.eu, nf(r.eu, 1)]];
    if (r.usM !== null) list.push([T.usM, nf(r.usM, 1)]);
    if (r.usW !== null) list.push([T.usW, nf(r.usW, 1)]);
    list.push([T.mm, String(r.mm)], [T.foot, nf(r.foot, 1) + ' cm', 'total']);
    rows($('sLines'), list);
    $('sLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'kasutPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
