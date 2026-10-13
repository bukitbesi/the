/* Zakat emas and simpanan UI (EN + BM). Inputs map to TBBZakat.gold(); state is kept in the URL hash. */
(function () {
  'use strict';
  var Z = window.TBBZakat;
  var form = document.getElementById('goldForm');
  if (!Z || !form) return;
  var ms = document.documentElement.lang === 'ms', loc = ms ? 'ms-MY' : 'en-MY';
  var fmt2 = new Intl.NumberFormat(loc, { style: 'currency', currency: 'MYR' });
  var g = new Intl.NumberFormat(loc, { maximumFractionDigits: 2 });
  var $ = function (id) { return document.getElementById(id); };
  var f = function (n) { return form.elements[n]; };
  var T = ms ? { notDue: 'Belum cukup nisab', none: 'Tiada zakat', live: function (r) { return 'Jumlah zakat ' + fmt2.format(r.total) + '.'; } }
    : { notDue: 'Below the nisab', none: 'No zakat', live: function (r) { return 'Total zakat ' + fmt2.format(r.total) + '.'; } };

  // Choosing a state fills its uruf; typing an uruf switches the state to "other".
  f('state').addEventListener('change', function () { if (Z.URUF[this.value]) f('uruf').value = Z.URUF[this.value]; });
  f('uruf').addEventListener('input', function () {
    var v = Number(this.value), match = Object.keys(Z.URUF).filter(function (k) { return Z.URUF[k] === v; });
    if (match.indexOf(f('state').value) < 0) f('state').value = match[0] || 'other';
  });

  function render(writeHash) {
    var r = Z.gold({ price: f('price').value, kept: f('kept').value, worn: f('worn').value, uruf: f('uruf').value, savings: f('savings').value });
    var L = r.lines;
    $('gTotal').textContent = fmt2.format(r.total);
    $('gNisab').textContent = fmt2.format(r.nisab);
    $('gKept').textContent = L.kept.grams ? (L.kept.due ? fmt2.format(L.kept.zakat) : T.notDue) : fmt2.format(0);
    $('gKeptNote').textContent = g.format(L.kept.grams) + ' g × ' + fmt2.format(r.price);
    $('gWorn').textContent = L.worn.due ? fmt2.format(L.worn.zakat) : (L.worn.grams ? T.none : fmt2.format(0));
    $('gWornNote').textContent = g.format(L.worn.grams) + ' g − ' + g.format(L.worn.uruf) + ' g uruf = ' + g.format(L.worn.excess) + ' g';
    $('gSavings').textContent = L.savings.amount ? (L.savings.due ? fmt2.format(L.savings.zakat) : T.notDue) : fmt2.format(0);
    $('gLive').textContent = T.live(r);
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

  function fromHash() {
    if (location.hash.length < 2) return false;
    location.hash.slice(1).split('&').forEach(function (kv) {
      var i = kv.indexOf('='), el = form.elements[kv.slice(0, i)];
      if (el && el.name) el.value = decodeURIComponent(kv.slice(i + 1));
    });
    return true;
  }

  var frame = 0;
  var schedule = function () { cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { render(true); }); };
  form.addEventListener('input', schedule);
  form.addEventListener('change', schedule);
  form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
  $('goldPrint').addEventListener('click', function () { window.print(); });
  var restored = Array.prototype.some.call(form.elements, function (el) {
    if (!el.name) return false;
    return el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected : el.value !== el.defaultValue;
  });
  if (fromHash() || restored) render(false);
})();
