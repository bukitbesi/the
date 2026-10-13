/* BMI calculator UI (EN + BM). Inputs map to TBBBmi.calculate(); state is kept in the URL hash. */
(function () {
  'use strict';
  var B = window.TBBBmi;
  var form = document.getElementById('bmiForm');
  if (!B || !form) return;
  var ms = document.documentElement.lang === 'ms', lang = ms ? 'ms' : 'en', L = B.LABELS[lang];
  var nf = new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY', { maximumFractionDigits: 1 });
  var $ = function (id) { return document.getElementById(id); };
  var f = function (n) { return form.elements[n]; };
  var T = ms ? {
    change: { lose: function (k) { return 'Turunkan ' + nf.format(k) + ' kg untuk mencapai julat sihat.'; }, gain: function (k) { return 'Naikkan ' + nf.format(k) + ' kg untuk mencapai julat sihat.'; }, keep: function () { return 'Anda dalam julat berat sihat. Kekalkan.'; } },
    waist: { cm: 'cm', in: 'inci' }, risk: { yes: 'Melebihi', no: 'Bawah' },
    live: function (r) { return 'BMI ' + nf.format(r.bmi) + ', ' + L[r.category] + '.'; }
  } : {
    change: { lose: function (k) { return 'Lose ' + nf.format(k) + ' kg to reach the healthy range.'; }, gain: function (k) { return 'Gain ' + nf.format(k) + ' kg to reach the healthy range.'; }, keep: function () { return 'You are in the healthy weight range. Keep it up.'; } },
    waist: { cm: 'cm', in: 'in' }, risk: { yes: 'Above', no: 'Below' },
    live: function (r) { return 'BMI ' + nf.format(r.bmi) + ', ' + L[r.category] + '.'; }
  };

  function render(writeHash) {
    var imperial = f('unit').value === 'imperial';
    $('bmiMetric').hidden = imperial;
    $('bmiImperial').hidden = !imperial;
    $('waistUnit').textContent = imperial ? T.waist.in : T.waist.cm;
    var r = B.calculate({ unit: f('unit').value, cm: f('cm').value, kg: f('kg').value, ft: f('ft').value, inch: f('inch').value, lb: f('lb').value, waist: f('waist').value, sex: f('sex').value });
    $('bValue').textContent = r.valid ? nf.format(r.bmi) : '–';
    $('bCat').textContent = r.valid ? L[r.category] : '';
    $('bCat').className = 'bmi-cat bmi-' + r.category;
    $('bMarker').style.left = r.gauge + '%';
    $('bWho').textContent = r.valid ? L[r.who] : '–';
    $('bRange').textContent = nf.format(r.healthy.low) + '–' + nf.format(r.healthy.high) + ' kg';
    $('bChange').textContent = r.valid ? T.change[r.direction](r.change) : '';
    var w = r.waist;
    $('bWaistRows').hidden = !w;
    if (w) {
      $('bWaist').textContent = (w.atRisk ? T.risk.yes : T.risk.no) + ' ' + w.limit + ' cm';
      $('bRatio').textContent = w.ratio.toFixed(2) + ' · ' + L[w.ratioBand];
    }
    $('bLive').textContent = r.valid ? T.live(r) : '';
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
  $('bmiPrint').addEventListener('click', function () { window.print(); });
  var restored = Array.prototype.some.call(form.elements, function (el) {
    if (!el.name) return false;
    return el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected : el.value !== el.defaultValue;
  });
  if (fromHash() || restored) render(false);
})();
