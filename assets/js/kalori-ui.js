/* Calorie calculator UI (BM + EN). Inputs map to TBBKalori.calculate(); state in the URL hash. */
(function () {
  'use strict';
  var X = window.TBBKalori;
  var form = document.getElementById('kaloriForm');
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
  var kc = function (n) { return nf(n, 0) + ' kcal'; };
  var T = ms ? {
    sub: function (r) { return 'BMR ' + kc(r.bmr) + ' · keperluan harian ' + kc(r.tdee); }, bmr: 'Kadar metabolisme asas (BMR)', tdee: 'Keperluan harian (kekal berat)', change: 'Pelarasan matlamat', target: 'Sasaran kalori sehari',
    carb: 'Karbohidrat (55%)', protein: 'Protein (15%)', fat: 'Lemak (30%)', bmi: 'BMI', healthy: 'Berat sihat untuk tinggi anda', warn: 'Sasaran di bawah BMR: dapatkan nasihat doktor atau pakar diet',
    band: { under: 'kurang berat badan', normal: 'normal', over: 'berlebihan berat badan', obese1: 'obes I', obese2: 'obes II', obese3: 'obes III' }, act: { sedentary: 'Tidak aktif', light: 'Aktif ringan', moderate: 'Aktif sederhana', active: 'Sangat aktif', extra: 'Amat aktif' },
    bad: 'Masukkan umur, berat dan tinggi', live: function (r) { return 'Sasaran ' + kc(r.target) + ' sehari.'; }
  } : {
    sub: function (r) { return 'BMR ' + kc(r.bmr) + ' · daily need ' + kc(r.tdee); }, bmr: 'Basal metabolic rate (BMR)', tdee: 'Daily need (keep weight)', change: 'Goal adjustment', target: 'Daily calorie target',
    carb: 'Carbohydrate (55%)', protein: 'Protein (15%)', fat: 'Fat (30%)', bmi: 'BMI', healthy: 'Healthy weight for your height', warn: 'Target below your BMR: get advice from a doctor or dietitian',
    band: { under: 'underweight', normal: 'normal', over: 'overweight', obese1: 'obese I', obese2: 'obese II', obese3: 'obese III' }, act: { sedentary: 'Sedentary', light: 'Lightly active', moderate: 'Moderately active', active: 'Very active', extra: 'Extra active' },
    bad: 'Enter age, weight and height', live: function (r) { return 'Target ' + kc(r.target) + ' a day.'; }
  };

  function render(writeHash) {
    var r = X.calculate({ sex: f('sex').value, age: f('age').value, weight: f('weight').value, height: f('height').value, activity: f('activity').value, goal: f('goal').value });
    if (!r) { $('kTarget').textContent = '–'; $('kSub').textContent = T.bad; return; }
    $('kTarget').textContent = kc(r.target);
    $('kSub').textContent = T.sub(r);
    var list = [[T.bmr, kc(r.bmr)], [T.tdee, kc(r.tdee)]];
    if (r.change) list.push([T.change, (r.change > 0 ? '+ ' : '− ') + kc(Math.abs(r.change))]);
    list.push([T.target, kc(r.target), 'total']);
    if (r.belowBmr) list.push(['!', T.warn]);
    list.push([T.carb, nf(r.carb, 0) + ' g'], [T.protein, nf(r.protein, 0) + ' g'], [T.fat, nf(r.fat, 0) + ' g'],
      [T.bmi, nf(r.bmi, 1) + ' (' + T.band[r.band] + ')'], [T.healthy, nf(r.healthy[0], 1) + '–' + nf(r.healthy[1], 1) + ' kg']);
    rows($('kLines'), list.map(function (x) { return x[0] === '!' ? [ms ? 'Amaran' : 'Warning', x[1]] : x; }));
    rows($('kLevels'), r.levels.map(function (x) { return [T.act[x.key] + ' (× ' + x.factor + ')', kc(x.kcal), x.key === f('activity').value ? 'total' : '']; }));
    $('kLive').textContent = T.live(r);
    if (writeHash) hashState(form);
  }
  wire(form, render, 'kaloriPrint');
  if (fromHash(form) || changed(form)) render(false);
})();
