/* CGPA-to-percentage converter UI. State lives in the URL hash so a result can be shared. */
(function () {
  'use strict';
  var G = window.TBBGrades;
  var form = document.getElementById('convForm');
  if (!G || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var f = function (name) { return form.elements[name]; };
  var fmt = function (n) { return (Math.round(n * 100) / 100).toFixed(2).replace(/\.?0+$/, ''); };
  var NOTES = {
    sppu: 'Some SPPU programmes and older patterns use a different formula. Check the formula printed on your marksheet.',
    mu: 'Check whether your University of Mumbai programme has a newer circular before relying on this figure.'
  };
  var ERRORS = {
    range: function (max) { return 'Enter a CGPA between 0 and ' + max + '.'; },
    scale: function () { return 'This university formula is for the 10-point scale. Choose "Any scale" for other scales.'; },
    custom: function () { return 'Enter the multiplier from your university\'s formula.'; }
  };

  function opts() { return { max: Number(f('max').value) || 10, a: f('a').value, b: f('b').value }; }

  function render(writeHash) {
    var preset = f('preset').value;
    var formula = G.PRESETS.filter(function (p) { return p.id === preset; })[0].formula;
    $('scaleField').hidden = formula !== 'proportional' && formula !== 'custom';
    $('customFields').hidden = formula !== 'custom';
    if (formula !== 'proportional' && formula !== 'custom') f('max').value = 10;
    var r = G.toPercent(f('cgpa').value, preset, opts());
    $('convError').hidden = !r.error;
    f('cgpa').setAttribute('aria-invalid', r.error ? 'true' : 'false');
    if (r.error) {
      $('convError').textContent = ERRORS[r.error](r.max || 10);
      $('rPercent').textContent = '–'; $('rFormula').textContent = ''; $('rNote').textContent = '';
      return;
    }
    $('rPercent').textContent = fmt(r.percent) + '%';
    $('rFormula').textContent = r.formula + ' = ' + fmt(r.percent) + '%';
    $('rNote').textContent = r.preset.note ? NOTES[r.preset.note] : '';
    $('rLive').textContent = 'CGPA ' + f('cgpa').value + ' is ' + fmt(r.percent) + ' percent.';
    // Same CGPA under every 10-point formula, so students can see how much the choice matters.
    var rows = $('compareBody').rows;
    for (var i = 0; i < rows.length; i++) {
      var x = G.toPercent(f('cgpa').value, rows[i].getAttribute('data-preset'));
      rows[i].cells[1].textContent = x.error ? '–' : fmt(x.percent) + '%';
    }
    if (writeHash) {
      var h = 'cgpa=' + encodeURIComponent(f('cgpa').value) + '&u=' + preset;
      if (formula !== 'x95' && formula !== 'x10' && formula !== 'less075' && formula !== 'less05' && formula !== 'mu') h += '&max=' + f('max').value;
      if (formula === 'custom') h += '&a=' + encodeURIComponent(f('a').value) + '&b=' + encodeURIComponent(f('b').value);
      history.replaceState(null, '', '#' + h);
    }
  }

  function renderReverse() {
    var r = G.toCgpa(f('percent').value, f('preset').value, opts());
    $('rCgpa').textContent = r.error ? '–' : fmt(r.cgpa);
  }

  function fromHash() {
    if (location.hash.indexOf('cgpa=') < 0) return false;
    var q = {};
    location.hash.slice(1).split('&').forEach(function (p) { var kv = p.split('='); q[kv[0]] = decodeURIComponent(kv[1] || ''); });
    f('cgpa').value = q.cgpa;
    if (G.PRESETS.some(function (p) { return p.id === q.u; })) f('preset').value = q.u;
    if (q.max) f('max').value = q.max;
    if (q.a) f('a').value = q.a;
    if (q.b) f('b').value = q.b;
    return true;
  }

  var frame = 0;
  form.addEventListener('input', function (e) {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(function () {
      if (e.target.name === 'percent') renderReverse();
      else { render(true); renderReverse(); }
    });
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
  // The page ships with the default result; only recalculate for a shared link or restored inputs.
  var restored = Array.prototype.some.call(form.elements, function (el) {
    return el.tagName === 'SELECT' ? !el.options[el.selectedIndex].defaultSelected : 'defaultValue' in el && el.value !== el.defaultValue;
  });
  if (fromHash() || restored) { render(false); renderReverse(); }
})();
