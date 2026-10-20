/* Cups to grams UI (BM + EN): single converter plus a whole-recipe converter with serving and tin scaling.
   Maths in TBBSukatan; the converter's state lives in the URL hash. */
(function () {
  'use strict';
  var S = window.TBBSukatan;
  var form = document.getElementById('sukForm'), rec = document.getElementById('recForm');
  if (!S || !form) return;
  var ms = document.documentElement.lang === 'ms', $ = function (id) { return document.getElementById(id); }, f = function (n) { return form.elements[n]; };
  var nf = new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { maximumFractionDigits: 2 });
  var name = function (k) { return S.ING[k] ? S.ING[k][ms ? 0 : 1] : (ms ? 'Telur (Gred B)' : 'Egg (Grade B)'); };
  var T = ms ? { cup: 'cawan', tbsp: 'sudu besar', tsp: 'sudu kecil', ml: 'ml', g: 'g', range: 'julat', unknown: 'Bahan tidak dikenali: timbang atau pilih di atas', noAmount: 'Tiada sukatan', copied: 'Disalin ✓',
    sub: function (r, a, u) { return a + ' ' + u + ' ' + name(r.key).toLowerCase() + (/^(cup|cups|cawan)$/.test(u) ? ' (' + nf.format(r.cupMl) + ' ml)' : ''); }, back: function (r) { return '≈ ' + nf.format(r.cups) + ' cawan · ' + nf.format(r.tbsp) + ' sudu besar'; } }
    : { cup: 'cup', tbsp: 'tbsp', tsp: 'tsp', ml: 'ml', g: 'g', range: 'range', unknown: 'Ingredient not recognised: weigh it or pick it above', noAmount: 'No amount', copied: 'Copied ✓',
    sub: function (r, a, u) { return a + ' ' + u + ' ' + name(r.key).toLowerCase() + (/^(cup|cups|cawan)$/.test(u) ? ' (' + nf.format(r.cupMl) + ' ml)' : ''); }, back: function (r) { return '≈ ' + nf.format(r.cups) + ' cups · ' + nf.format(r.tbsp) + ' tbsp'; } };
  var g = function (x) { return nf.format(S.round(x)) + ' g'; };
  // English plural for cups ("2 cups", "0.5 cups"); Malay has no plural form.
  var unit = function (u, n) { var t = T[u] || u; return !ms && u === 'cup' && n !== 1 ? 'cups' : t; };

  function render(write) {
    var r = S.convert({ ing: f('ing').value, amount: f('amount').value, unit: f('unit').value, cup: f('cup').value });
    var weight = f('unit').value === 'g' || f('unit').value === 'kg';
    var cups = Math.round(r.cups * 100) / 100;
    $('kG').textContent = weight ? nf.format(cups) + ' ' + unit('cup', cups) : g(r.g);
    $('kSub').textContent = weight ? T.back(r) : T.sub(r, f('amount').value, unit(f('unit').value, S.parseAmount(f('amount').value))) + (Math.round(r.high) - Math.round(r.low) >= 2 ? ' · ' + T.range + ' ' + g(r.low) + '–' + g(r.high) : '');
    var rows = [[1, 'cup'], [0.75, 'cup'], [0.5, 'cup'], [1 / 3, 'cup'], [0.25, 'cup'], [1, 'tbsp'], [1, 'tsp']], body = $('kAll');
    body.textContent = '';
    rows.forEach(function (x) {
      var c = S.convert({ ing: r.key, amount: String(x[0]), unit: x[1], cup: f('cup').value }), tr = body.insertRow(), th = document.createElement('th');
      th.scope = 'row'; th.textContent = (x[1] === 'cup' ? ({ 1: '1', 0.75: '¾', 0.5: '½', 0.25: '¼' }[x[0]] || '⅓') + ' ' + T.cup : '1 ' + T[x[1]]);
      tr.appendChild(th); tr.insertCell().textContent = g(c.g);
    });
    $('kAllName').textContent = name(r.key);
    $('kLive').textContent = $('kG').textContent + ', ' + $('kSub').textContent;
    if (write) {
      var parts = [];
      ['ing', 'amount', 'unit', 'cup'].forEach(function (n) { var el = f(n), def = el.tagName === 'SELECT' ? (el.querySelector('option[selected]') || el.options[0]).value : el.defaultValue; if (el.value !== def) parts.push(n + '=' + encodeURIComponent(el.value)); });
      history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
    }
  }

  function factor() {
    var k = Number(rec.elements.serve.value) || 1;
    if (rec.elements.tin.checked) k *= S.tinFactor({ shape: rec.elements.fromShape.value, a: rec.elements.fromA.value, b: rec.elements.fromB.value }, { shape: rec.elements.toShape.value, a: rec.elements.toA.value, b: rec.elements.toB.value });
    return k;
  }
  var lastText = '';
  function renderRecipe() {
    var k = factor(), lines = S.parseRecipe(rec.elements.recipe.value, Number(f('cup').value) || 250, k), body = $('rOut'), text = [];
    $('rFactor').textContent = '× ' + nf.format(Math.round(k * 100) / 100);
    body.textContent = '';
    lines.forEach(function (l) {
      var tr = body.insertRow(), th = document.createElement('th'), amt = tr, wt;
      th.scope = 'row'; th.textContent = l.line; tr.appendChild(th);
      var scaled = isFinite(l.scaled) ? nf.format(Math.round(l.scaled * 100) / 100) + (l.unit ? ' ' + unit(l.unit, l.scaled) : l.key === 'egg' ? (ms ? ' biji' : ' eggs') : '') : T.noAmount;
      tr.insertCell().textContent = scaled;
      wt = l.g !== null ? (Math.round(l.high) - Math.round(l.low) >= 2 ? g(l.low) + '–' + g(l.high) : g(l.g)) : (l.ml ? nf.format(Math.round(l.ml)) + ' ml' : (isFinite(l.amount) ? T.unknown : '–'));
      var td = tr.insertCell(); td.textContent = wt; if (l.g === null && !l.ml && isFinite(l.amount)) td.className = 'muted';
      text.push(l.line + ' → ' + scaled + (l.g !== null ? ' = ' + wt : ''));
    });
    lastText = text.join('\n');
  }

  form.addEventListener('input', function () { render(true); renderRecipe(); });
  form.addEventListener('change', function () { render(true); renderRecipe(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  if (rec) {
    rec.addEventListener('input', renderRecipe); rec.addEventListener('change', function (e) { if (e.target.name === 'tin') $('rTin').hidden = !e.target.checked; renderRecipe(); });
    rec.addEventListener('submit', function (e) { e.preventDefault(); });
    $('rCopy').addEventListener('click', function () { var b = $('rCopy'), l = b.textContent; var done = function () { b.textContent = T.copied; setTimeout(function () { b.textContent = l; }, 1500); }; if (navigator.clipboard) navigator.clipboard.writeText(lastText).then(done, done); else done(); });
    ['fromShape', 'toShape'].forEach(function (n) { rec.elements[n].addEventListener('change', function () { $(n === 'fromShape' ? 'rFromB' : 'rToB').hidden = rec.elements[n].value !== 'rect'; }); });
  }
  if ($('kPrint')) $('kPrint').addEventListener('click', function () { window.print(); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ing]'); if (!b) return;
    f('ing').value = b.getAttribute('data-ing'); f('amount').value = '1'; f('unit').value = 'cup'; render(true); form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  if (location.hash.length > 1) location.hash.slice(1).split('&').forEach(function (p) { var i = p.indexOf('='); var el = f(p.slice(0, i)); if (el) el.value = decodeURIComponent(p.slice(i + 1)); });
  render(false); renderRecipe();
})();
