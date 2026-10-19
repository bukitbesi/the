/* UTM Builder UI. The tagged link, GA4 channel and QR code update as you type; recent links are kept only in this
   browser. Pasting an already-tagged link into the address box fills the fields. */
(function () {
  'use strict';
  var U = window.TBBUtm, W = window.TBBWa;
  var form = document.getElementById('utForm');
  if (!U || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'tbb-utm', timer = 0, lib = null, last = null, recent = [];
  var WARN = {
    'missing:utm_source': 'Add a source: where the click comes from (facebook, newsletter).',
    'missing:utm_medium': 'Add a medium: the type of link (social, email, cpc).',
    'missing:utm_campaign': 'Add a campaign name so you can find this traffic in reports.',
    'medium:organic': 'Do not tag links with medium "organic": Google Analytics already detects organic search.',
    'medium:referral': 'Do not tag links with medium "referral": normal links are detected as referrals automatically.',
    'medium:(none)': '"(none)" is reserved for direct traffic.',
    gclid: 'This link already has a Google Ads gclid; auto-tagging covers Google Ads, so UTM tags are not needed there.',
    unassigned: 'Google Analytics will put this traffic in "Unassigned". Use a medium such as social, email, cpc, affiliate or sms.'
  };

  function vals() { var o = {}; U.PARAMS.forEach(function (p) { o[p[1]] = form.elements[p[1]].value; }); return o; }
  function loadQr() {
    if (!lib) lib = new Promise(function (ok, fail) {
      if (window.qrcode) return ok(window.qrcode);
      var s = document.createElement('script'); s.src = W.VENDOR; s.onload = function () { ok(window.qrcode); }; s.onerror = fail; document.head.appendChild(s);
    });
    return lib;
  }
  function run() {
    var r = U.build($('utUrl').value, vals(), { lower: form.elements.lower.checked, spaces: form.elements.spaces.value });
    last = r;
    $('utErr').hidden = r.ok; $('utErr').textContent = r.ok ? '' : r.error;
    $('utOut').value = r.ok ? r.url : '';
    $('utOpen').href = r.ok ? r.url : '#';
    $('utChannel').textContent = r.ok && r.channel ? r.channel : '–';
    $('utChannel').className = 'ut-ch' + (r.channel === 'Unassigned' ? ' ut-bad' : '');
    var w = r.ok ? r.warnings.map(function (k) { return WARN[k] || (k.indexOf('case:') === 0 ? k.slice(5) + ' has capital letters; GA4 treats "Facebook" and "facebook" as different values.' : k); }) : [];
    $('utWarn').innerHTML = w.map(function (x) { return '<li>' + x.replace(/</g, '&lt;') + '</li>'; }).join('');
    $('utWarn').hidden = !w.length;
    if (r.ok) loadQr().then(function (q) { $('utQr').innerHTML = W.qrSvg(W.qrMatrix(q, r.url), 'QR code for ' + r.url); }, function () { $('utQr').innerHTML = '<p class="help">QR code could not load.</p>'; });
    save();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ u: $('utUrl').value, v: vals(), r: recent })); } catch (e) { /* storage blocked */ } }
  function remember(url) {
    recent = [url].concat(recent.filter(function (x) { return x !== url; })).slice(0, 10);
    $('utRecent').innerHTML = recent.map(function (x) { return '<li><code>' + x.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</code><button type="button" class="btn ghost sm" data-copy="' + x.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '">Copy</button></li>'; }).join('');
    $('utRecentWrap').hidden = !recent.length;
    save();
  }
  function copy(text, btn) { if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { var o = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = o; }, 1500); }, function () {}); }
  function download(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0); }

  form.addEventListener('submit', function (e) { e.preventDefault(); run(); });
  form.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 100); });
  form.addEventListener('change', run);
  $('utUrl').addEventListener('paste', function (e) {
    var t = (e.clipboardData || window.clipboardData).getData('text'), p = U.parse(t.trim());
    if (!p || !Object.keys(p.values).length) return;
    e.preventDefault();
    $('utUrl').value = p.base;
    U.PARAMS.forEach(function (x) { if (p.values[x[1]] != null) form.elements[x[1]].value = p.values[x[1]]; });
    run();
    $('utLive').textContent = 'Existing UTM tags loaded into the fields.';
  });
  form.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-preset')) {
      var v = U.PRESETS[+b.getAttribute('data-preset')][1];
      ['source', 'medium'].forEach(function (k) { form.elements[k].value = v[k]; });
      if (v.campaign && !form.elements.campaign.value) form.elements.campaign.value = v.campaign;
      run();
      form.elements.campaign.focus();
    } else if (b.id === 'utCopy' && last && last.ok) { copy(last.url, b); remember(last.url); }
    else if (b.hasAttribute('data-copy')) copy(b.getAttribute('data-copy'), b);
    else if (b.id === 'utPng' && last && last.ok) loadQr().then(function (q) {
      var m = W.qrMatrix(q, last.url), sc = 12, size = (m.length + 8) * sc, c = document.createElement('canvas'), g = c.getContext('2d');
      c.width = c.height = size; g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); g.fillStyle = '#000';
      m.forEach(function (row, r) { row.forEach(function (on, k) { if (on) g.fillRect((k + 4) * sc, (r + 4) * sc, sc, sc); }); });
      c.toBlob(function (bl) { download(bl, 'utm-qr.png'); }, 'image/png');
    });
    else if (b.id === 'utSvg') download(new Blob([$('utQr').innerHTML], { type: 'image/svg+xml' }), 'utm-qr.svg');
    else if (b.id === 'utClearRecent') { recent = []; $('utRecent').innerHTML = ''; $('utRecentWrap').hidden = true; save(); }
  });

  try {
    var s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s) {
      $('utUrl').value = s.u || '';
      U.PARAMS.forEach(function (p) { if (s.v && s.v[p[1]] != null) form.elements[p[1]].value = s.v[p[1]]; });
      recent = (s.r || []).filter(Boolean);
      if (recent.length) remember(recent[0]);
      run();
    }
  } catch (e) { /* storage blocked */ }
  ['pointerdown', 'focusin'].forEach(function (ev) { form.addEventListener(ev, function () { loadQr().catch(function () {}); }, { once: true, passive: true }); });
})();
