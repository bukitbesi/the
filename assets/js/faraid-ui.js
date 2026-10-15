/* Faraid calculator UI (BM + EN). Inputs map to TBBFaraid.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBFaraid;
  var form = document.getElementById('faraidForm');
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
  var LB = X.LABELS[ms ? 'ms' : 'en'];
  var fr = function (x) { return x.n + '/' + x.d; };
  var T = ms ? {
    net: 'Harta bersih untuk faraid', gross: 'Jumlah harta', sep: 'Harta sepencarian', funeral: 'Kos pengurusan jenazah', debts: 'Hutang', wasiat: 'Wasiat (maksimum 1/3)', cut: ' (dihadkan kepada 1/3)',
    persons: function (n) { return n > 1 ? ' (' + n + ' orang)' : ''; }, each: ' seorang', blocked: 'Terhalang (mahjub)', bm: 'Baitulmal (Majlis Agama Islam Negeri)',
    sub: function (r) { return 'Asal masalah ' + r.asal + (r.awl ? ', aul kepada ' + r.awlBase : '') + ' · ' + r.D + ' bahagian'; },
    notes: { awl: 'Aul: jumlah bahagian tetap melebihi harta, jadi setiap bahagian dikurangkan secara berkadar.', umariyyah: 'Umariyyatain: ibu mendapat 1/3 daripada baki selepas bahagian suami atau isteri.', musytarakah: 'Musytarakah: saudara seibu sebapa berkongsi 1/3 dengan saudara seibu.', baitulmal: 'Baki tanpa asabah diserahkan kepada Baitulmal, amalan di Malaysia.', radd: 'Radd (fatwa Perlis): baki dikembalikan kepada waris fardu selain suami atau isteri.' },
    special: 'Kes datuk bersama adik-beradik seibu sebapa atau sebapa (muqasamah) mempunyai beberapa kaedah dalam mazhab Syafie. Sila dapatkan Sijil Faraid daripada Mahkamah Syariah.', none: 'Masukkan sekurang-kurangnya seorang waris',
    live: function (r) { return 'Harta bersih ' + money(r.money.net) + ' dibahagikan kepada ' + r.D + ' bahagian.'; }
  } : {
    net: 'Net estate for faraid', gross: 'Total estate', sep: 'Harta sepencarian (matrimonial share)', funeral: 'Funeral costs', debts: 'Debts', wasiat: 'Bequest (wasiat, at most 1/3)', cut: ' (capped at 1/3)',
    persons: function (n) { return n > 1 ? ' (' + n + ' persons)' : ''; }, each: ' each', blocked: 'Excluded (mahjub)', bm: 'Baitulmal (State Islamic Religious Council)',
    sub: function (r) { return 'Base ' + r.asal + (r.awl ? ", 'awl to " + r.awlBase : '') + ' · ' + r.D + ' parts'; },
    notes: { awl: "'Awl: the fixed shares add up to more than the estate, so each is reduced in proportion.", umariyyah: 'Umariyyatain: the mother takes 1/3 of what is left after the spouse.', musytarakah: 'Musytarakah: the full siblings share the 1/3 with the uterine siblings.', baitulmal: 'A residue with no residuary heir goes to Baitulmal, the practice in Malaysia.', radd: 'Radd (Perlis fatwa): the residue returns to the fixed-share heirs other than the spouse.' },
    special: "A paternal grandfather with full or consanguine siblings (muqasamah) has several methods in the Shafi'i school. Get a faraid certificate (Sijil Faraid) from the Syariah Court.", none: 'Enter at least one heir',
    live: function (r) { return 'Net estate ' + money(r.money.net) + ' divided into ' + r.D + ' parts.'; }
  };
  function input() {
    var o = { estate: f('estate').value, sepencarian: f('sepencarian').value, funeral: f('funeral').value, debts: f('debts').value, wasiat: f('wasiat').value, residue: f('residue').value };
    X.HEIRS.forEach(function (h) { var el = f(h[0]); o[h[0]] = el ? el.value : 0; });
    if (f('deceased').value === 'female') o.wife = 0; else o.husband = 0;
    return o;
  }

  function render(writeHash) {
    var female = f('deceased').value === 'female';
    $('fHusband').hidden = !female; $('fWife').hidden = female;
    var r = X.calculate(input()), m = r.money;
    $('fNet').textContent = money(m.net);
    var money1 = [[T.gross, money(m.gross)]];
    if (m.sepencarian) money1.push([T.sep, '− ' + money(m.sepencarian)]);
    if (m.funeral) money1.push([T.funeral, '− ' + money(m.funeral)]);
    if (m.debts) money1.push([T.debts, '− ' + money(m.debts)]);
    if (m.wasiat) money1.push([T.wasiat + (m.wasiatCut ? T.cut : ''), '− ' + money(m.wasiat)]);
    money1.push([T.net, money(m.net), 'total']);
    rows($('fMoney'), money1);
    var heirs = r.list ? r.list.filter(function (x) { return x.count; }) : [];
    if (r.special) { $('fSub').textContent = T.special; rows($('fShares'), []); $('fNotes').textContent = ''; }
    else if (!heirs.length) { $('fSub').textContent = T.none; rows($('fShares'), []); $('fNotes').textContent = ''; }
    else {
      $('fSub').textContent = T.sub(r);
      var list = heirs.map(function (x) {
        return x.blocked || !x.share.n ? [LB[x.key] + T.persons(x.count), T.blocked] : [LB[x.key] + T.persons(x.count) + ' · ' + fr(x.share), money(x.each) + (x.count > 1 ? T.each : '') + ' · ' + x.saham + '/' + r.D];
      });
      if (r.baitulmal.n) list.push([T.bm + ' · ' + fr(r.baitulmal), money(m.baitulmal) + ' · ' + r.baitulmalSaham + '/' + r.D]);
      rows($('fShares'), list);
      $('fNotes').textContent = r.notes.map(function (k) { return T.notes[k]; }).join(' ');
    }
    $('fLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'faraidPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
