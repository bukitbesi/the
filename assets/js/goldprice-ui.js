/* Gold price today UI (EN + BM): starts from the daily snapshot in the page, refreshes from the live worker every
   minute while the tab is visible, and runs the jewellery price check. */
(function () {
  'use strict';
  var G = window.TBBGold;
  var root = document.getElementById('goldLive'), form = document.getElementById('jewelForm');
  if (!G || !root || !form) return;
  var ms = document.documentElement.lang === 'ms', loc = ms ? 'ms-MY' : 'en-MY';
  var fmt2 = new Intl.NumberFormat(loc, { style: 'currency', currency: 'MYR' });
  var pct = new Intl.NumberFormat(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var $ = function (id) { return document.getElementById(id); };
  var f = function (n) { return form.elements[n]; };
  var api = root.getAttribute('data-api');
  var snap = JSON.parse($('goldData').textContent);
  var T = ms ? {
    basis: { spot: 'Harga spot antarabangsa, ditukar ke ringgit', kijang: 'Harga belian Kijang Emas Bank Negara' },
    live: 'Langsung', daily: 'Harga harian', since: 'berbanding semalam',
    above: function (v) { return 'Kedai mengenakan ' + fmt2.format(v) + ' lebih daripada anggaran.'; },
    below: function (v) { return 'Harga kedai ' + fmt2.format(v) + ' bawah anggaran.'; }
  } : {
    basis: { spot: 'International spot price in ringgit', kijang: "Bank Negara's Kijang Emas buying price" },
    live: 'Live', daily: 'Daily price', since: 'since yesterday',
    above: function (v) { return 'The shop charges ' + fmt2.format(v) + ' more than the estimate.'; },
    below: function (v) { return 'The shop price is ' + fmt2.format(v) + ' below the estimate.'; }
  };

  function when(iso) {
    return new Date(iso).toLocaleString(ms ? 'ms-MY' : 'en-GB', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function renderPrices(isLive) {
    var p = G.pureGram(snap);
    if (!p) return;
    var rows = G.table(p.rm);
    $('hPure').textContent = fmt2.format(rows[0].gram);
    $('h916').textContent = fmt2.format(rows[1].gram);
    $('hBasis').textContent = T.basis[p.basis];
    rows.forEach(function (r) {
      var a = $('hp-' + r.fineness), b = $('hp10-' + r.fineness);
      if (a) a.textContent = fmt2.format(r.gram);
      if (b) b.textContent = fmt2.format(r.tenGram);
    });
    if (snap.prev && snap.prev.pure) {
      var c = (p.rm - snap.prev.pure) / snap.prev.pure * 100;
      $('hChange').textContent = ' · ' + (c >= 0 ? '▲ ' : '▼ ') + pct.format(Math.abs(c)) + '% ' + T.since;
      $('hChange').className = c >= 0 ? 'up' : 'down';
    }
    var k = snap.kijang;
    if (k && k.date) $('hKgDate').textContent = new Date(k.date + 'T00:00:00Z').toLocaleDateString(ms ? 'ms-MY' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    if (k) [['one', k.oneOz], ['half', k.halfOz], ['quarter', k.quarterOz]].forEach(function (x) {
      if (!x[1] || !$('hk-' + x[0] + '-s')) return;
      $('hk-' + x[0] + '-s').textContent = fmt2.format(x[1].sell);
      $('hk-' + x[0] + '-b').textContent = fmt2.format(x[1].buy);
    });
    $('hStatus').textContent = (isLive ? T.live : T.daily) + ' · ' + when(snap.fetchedAt);
    $('hStatus').className = 'live' + (isLive ? ' on' : '');
    $('hZakat').href = $('hZakat').getAttribute('href').split('#')[0] + '#price=' + (p.rm * 0.999).toFixed(2);
    renderJewel();
  }

  function renderJewel(writeHash) {
    var p = G.pureGram(snap);
    if (!p) return;
    var w = G.units(f('weight').value, f('unit').value).g;
    var j = G.jewellery({ weight: w, fineness: f('fineness').value, making: f('making').value, shop: f('shop').value }, p.rm);
    $('jMetal').textContent = fmt2.format(j.metal);
    $('jLabour').textContent = fmt2.format(j.labour);
    $('jFair').textContent = fmt2.format(j.fair);
    $('jShopRows').hidden = !j.shop;
    if (j.shop) {
      $('jPremium').textContent = pct.format(j.premium) + '%';
      $('jVerdict').textContent = j.diff >= 0 ? T.above(j.diff) : T.below(-j.diff);
    }
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

  // Live refresh: once a minute while visible; keeps the last good figures if a request fails.
  var timer = 0;
  function refresh() {
    if (!api || document.hidden) return;
    fetch(api, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j) return;
      var next = {
        fetchedAt: j.fetchedAt || new Date().toISOString(),
        spot: G.parseSpot(j.spot) || snap.spot,
        fx: G.parseBnmFx(j.fx) || G.parseFrankfurter(j.fxBackup) || snap.fx,
        kijang: G.parseKijang(j.kijang) || snap.kijang,
        prev: snap.prev
      };
      if (!G.pureGram(next)) return;
      snap = next;
      renderPrices(true);
    }).catch(function () {});
  }
  function schedule() { clearInterval(timer); if (api && !document.hidden) { refresh(); timer = setInterval(refresh, 60000); } }
  document.addEventListener('visibilitychange', schedule);

  function fromHash() {
    if (location.hash.length < 2) return false;
    location.hash.slice(1).split('&').forEach(function (kv) {
      var i = kv.indexOf('='), el = form.elements[kv.slice(0, i)];
      if (el && el.name) el.value = decodeURIComponent(kv.slice(i + 1));
    });
    return true;
  }
  var frame = 0;
  var later = function () { cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { renderJewel(true); }); };
  form.addEventListener('input', later);
  form.addEventListener('change', later);
  form.addEventListener('submit', function (e) { e.preventDefault(); renderJewel(true); });
  $('goldPrint').addEventListener('click', function () { window.print(); });
  if (fromHash()) renderJewel(false);
  schedule();
})();
