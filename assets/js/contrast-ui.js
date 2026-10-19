/* Color Contrast Checker UI. Results update as you type or pick; the pair is kept in the URL hash (#fg=…&bg=…) so a
   check can be shared. Nothing is uploaded. */
(function () {
  'use strict';
  var C = window.TBBContrast;
  var form = document.getElementById('ctForm');
  if (!C || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var V = C.views, fg = $('ctFg'), bg = $('ctBg'), fgPick = $('ctFgPick'), bgPick = $('ctBgPick'), timer = 0;

  function run() {
    var r = C.check(fg.value, bg.value);
    fg.setAttribute('aria-invalid', C.parse(fg.value) ? 'false' : 'true');
    bg.setAttribute('aria-invalid', C.parse(bg.value) ? 'false' : 'true');
    $('ctResult').innerHTML = V.resultHtml(r);
    if (!r) return;
    var f = C.hex(r.fg), b = C.hex(r.bg);
    fgPick.value = f;
    bgPick.value = b;
    var prev = $('ctPreview');
    prev.style.color = f;
    prev.style.background = b;
    prev.style.setProperty('--ct-fg', f);
    $('ctCvd').innerHTML = V.cvdRows(r);
    fixes(r);
    try { history.replaceState(null, '', '#fg=' + encodeURIComponent(fg.value.trim()) + '&bg=' + encodeURIComponent(bg.value.trim())); } catch (e) { /* file:// */ }
  }

  function fixes(r) {
    var out = [];
    [[4.5, 'AA'], [7, 'AAA']].forEach(function (t) {
      if (r.ratio >= t[0]) return;
      var a = C.suggest(r.fg, r.bg, t[0]), b = C.suggest(r.bg, r.fg, t[0]);
      if (a) out.push(btn('fg', a, 'Text ' + a.hex, t[1]));
      if (b) out.push(btn('bg', b, 'Background ' + b.hex, t[1]));
    });
    $('ctFixes').innerHTML = out.length ? out.join('') : '<p class="help">This pair already passes AAA for all text.</p>';
  }
  function btn(which, s, label, level) {
    return '<button type="button" class="btn ghost sm ct-fix" data-set="' + which + '" data-hex="' + s.hex + '"><i class="ct-chip" style="background:' + s.hex + '"></i>' + label + ' · ' + C.show(s.ratio) + ':1 ' + level + '</button>';
  }

  function matrix() { $('ctMatrix').innerHTML = V.matrixHtml(C.matrix($('ctPalette').value.split(/[\n,;]+|\s{2,}/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 8))); }

  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.addEventListener('input', function (e) {
    if (e.target === fgPick) fg.value = fgPick.value;
    else if (e.target === bgPick) bg.value = bgPick.value;
    else if (e.target.id === 'ctPalette') { clearTimeout(timer); timer = setTimeout(matrix, 150); return; }
    run();
  });
  form.addEventListener('click', function (e) {
    var b = e.target.closest('[data-set]');
    if (b) { (b.getAttribute('data-set') === 'fg' ? fg : bg).value = b.getAttribute('data-hex'); run(); $('ctLive').textContent = 'Applied ' + b.getAttribute('data-hex') + '.'; return; }
    if (e.target.closest('#ctSwap')) { var t = fg.value; fg.value = bg.value; bg.value = t; run(); $('ctLive').textContent = 'Colours swapped.'; }
    if (e.target.closest('#ctCopy')) {
      var btnEl = e.target.closest('#ctCopy'), done = function () { btnEl.textContent = 'Link copied'; setTimeout(function () { btnEl.textContent = 'Copy link'; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, function () {});
    }
  });

  var m = /fg=([^&]*)&bg=([^&]*)/.exec(location.hash);
  if (m) { fg.value = decodeURIComponent(m[1]); bg.value = decodeURIComponent(m[2]); run(); }
})();
