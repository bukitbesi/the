/* Blogger Template Generator UI. Every change re-renders the sandboxed preview and the WCAG table; the design is kept
   in the URL hash so a link reopens it. The theme file is fetched once from this site; nothing is uploaded, and a theme
   pasted into the audit never leaves the browser. */
(function () {
  'use strict';
  var B = window.TBBBlogger;
  var form = document.getElementById('btForm');
  if (!B || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var lang = document.documentElement.lang === 'ms' ? 'ms' : 'en';
  var MSG = {
    en: { loading: 'Loading the theme file…', ready: 'Ready. Changes update the preview instantly.', failed: 'The theme file could not be loaded. Check your connection and reload the page.',
      fixed: function (n) { return n ? 'Fixed ' + n + ' colour' + (n > 1 ? 's' : '') + '; every text pair now passes 4.5:1.' : 'Nothing to fix: every text pair already passes.'; },
      saved: 'Downloaded tbb-lite-custom.xml. In Blogger: Theme → More (▾) → Restore → Upload.', copied: 'Link copied', copyLink: 'Copy link',
      badLinks: function (l) { return 'Skipped (use “Label | URL”): ' + l.join('; '); }, invalid: 'The generated file is not valid XML; please report this.',
      audited: function (s) { return 'Audit done: ' + s + '/100.'; }, tooBig: 'That file is over 2 MB, larger than any Blogger theme.', notXml: 'This is not well-formed XML: ' },
    ms: { loading: 'Memuatkan fail tema…', ready: 'Sedia. Setiap perubahan dikemas kini serta-merta.', failed: 'Fail tema gagal dimuatkan. Semak sambungan dan muat semula halaman.',
      fixed: function (n) { return n ? n + ' warna dibaiki; semua pasangan teks kini lulus 4.5:1.' : 'Tiada yang perlu dibaiki: semua pasangan teks sudah lulus.'; },
      saved: 'tbb-lite-custom.xml dimuat turun. Dalam Blogger: Tema → Lagi (▾) → Pulihkan → Muat naik.', copied: 'Pautan disalin', copyLink: 'Salin pautan',
      badLinks: function (l) { return 'Diabaikan (guna “Label | URL”): ' + l.join('; '); }, invalid: 'Fail yang dijana bukan XML sah; sila laporkan.',
      audited: function (s) { return 'Audit selesai: ' + s + '/100.'; }, tooBig: 'Fail melebihi 2 MB, lebih besar daripada mana-mana tema Blogger.', notXml: 'Ini bukan XML yang sah: ' }
  }[lang];

  var theme = null, base = null, timer = 0, frame = $('btFrame'), stage = $('btStage');
  var colorInputs = [].slice.call(form.querySelectorAll('[data-var]'));
  var radio = function (name) { var r = form.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ''; };
  var status = function (t) { $('btStatus').textContent = t; };

  function state() {
    return {
      brand: $('btBrand').value.trim(), auto: $('btAuto').checked,
      colors: colorInputs.reduce(function (o, el) { o[el.getAttribute('data-var')] = el.value; return o; }, {}),
      bodyFont: $('btBodyFont').value, headFont: $('btHeadFont').value, size: +$('btSize').value, width: +$('btWidth').value, side: +$('btSide').value,
      title: $('btTitle').value, menu: $('btMenu').value, about: $('btAbout').value, pages: $('btPages').value
    };
  }
  function values(s) {
    var v = {}, k, pal = s.auto ? B.palette(s.brand) : null;
    for (k in base) v[k] = base[k];
    if (pal) { for (k in pal) v[k] = pal[k]; } else { for (k in s.colors) v[k] = s.colors[k]; }
    v['body.font'] = B.fontValue(s.bodyFont, s.size, 400);
    v['heading.font'] = B.fontValue(s.headFont, 16, 700);
    v['content.width'] = s.width + 'px';
    v['sidebar.width'] = s.side + 'px';
    return v;
  }

  function fit() {
    var phone = radio('btDevice') === 'phone', w = stage.clientWidth, h = stage.clientHeight, fw = phone ? 390 : 1280;
    var s = Math.min(1, w / fw);
    stage.classList.toggle('is-phone', phone);
    frame.style.width = fw + 'px';
    frame.style.height = Math.round(h / s) + 'px';
    frame.style.transform = 'scale(' + s + ')';
    frame.style.left = Math.max(0, Math.round((w - fw * s) / 2)) + 'px';
    frame.style.marginLeft = '0';
  }

  function render() {
    if (!theme) return;
    var s = state(), v = values(s);
    // Keep the individual pickers in step with the generated palette, so turning auto off starts from it.
    if (s.auto) colorInputs.forEach(function (el) { var c = v[el.getAttribute('data-var')]; if (c && /^#[0-9a-f]{6}$/i.test(c)) el.value = c; });
    var pal = B.palette(s.brand);
    if (pal && s.auto) $('btBrandPick').value = pal['brand.color'];
    $('btBrand').setAttribute('aria-invalid', pal ? 'false' : 'true');
    var dark = radio('btMode') === 'dark';
    frame.srcdoc = B.previewDoc(B.previewCss(theme, v, dark), { lang: lang, dark: dark, view: radio('btView'), title: s.title || 'My Blog', menu: B.parseLinks(s.menu, B.LIMITS.menu).links });
    var rows = B.checks(v);
    $('btChecks').innerHTML = B.views.checksHtml(rows, lang);
    $('btSum').textContent = B.views.checksSummary(rows, lang);
    $('btSizeOut').value = s.size + 'px';
    $('btWidthOut').value = s.width + 'px';
    $('btSideOut').value = s.side + 'px';
    var bad = B.parseLinks(s.menu, 99).bad.concat(B.parseLinks(s.pages, 99).bad);
    $('btLinkHelp').textContent = bad.length ? MSG.badLinks(bad) : '';
    save(s);
    schedule();
  }

  // ---- URL hash: only what differs from the page's defaults, so shared links stay short.
  var KEYS = { brand: 'b', auto: 'a', bodyFont: 'f', headFont: 'h', size: 's', width: 'w', side: 'sd', title: 't', menu: 'm', about: 'ab', pages: 'p' };
  var initial;
  function save(s) {
    var p = new URLSearchParams(), k;
    for (k in KEYS) if (String(s[k]) !== String(initial[k])) p.set(KEYS[k], k === 'auto' ? (s[k] ? '1' : '0') : s[k]);
    if (!s.auto) for (k in s.colors) if (s.colors[k] !== initial.colors[k]) p.set('c.' + k, s.colors[k]);
    try { history.replaceState(null, '', p.toString() ? '#' + p.toString() : location.pathname + location.search); } catch (e) { /* file:// */ }
  }
  function load() {
    if (location.hash.length < 2) return;
    var p = new URLSearchParams(location.hash.slice(1)), el;
    var set = function (id, v) { if (v != null) $(id).value = v; };
    set('btBrand', p.get('b')); set('btBodyFont', p.get('f')); set('btHeadFont', p.get('h')); set('btSize', p.get('s'));
    set('btWidth', p.get('w')); set('btSide', p.get('sd')); set('btTitle', p.get('t')); set('btMenu', p.get('m')); set('btAbout', p.get('ab')); set('btPages', p.get('p'));
    if (p.get('a') === '0') $('btAuto').checked = false;
    p.forEach(function (v, key) {
      if (key.indexOf('c.') !== 0) return;
      el = form.querySelector('[data-var="' + key.slice(2) + '"]');
      if (el && /^#[0-9a-f]{6}$/i.test(v)) el.value = v;
    });
    if (B.palette($('btBrand').value)) $('btBrandPick').value = B.palette($('btBrand').value)['brand.color'];
  }

  // ---- Theme file: fetched once, on the first interaction (or at once for a shared link), so opening the page costs
  // nothing. The preview already shows the default design from the build.
  initial = state();
  var loading = null;
  function ensureTheme() {
    if (!loading) {
      status(MSG.loading);
      loading = fetch('/assets/blogger/tbb-lite.xml').then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (xml) {
        theme = B.parseTheme(xml);
        base = B.defaults(theme);
        load();
        $('btColorsBox').disabled = $('btAuto').checked;
        // Render only if a shared link or an early change made the design differ from the built preview.
        if (JSON.stringify(state()) !== JSON.stringify(initial) || radio('btView') !== 'home' || radio('btMode') !== 'light') render();
        status(MSG.ready);
      }).catch(function () { loading = null; status(MSG.failed); });
    }
    return loading;
  }
  if (location.hash.length > 1) ensureTheme();
  ['pointerdown', 'focusin', 'keydown'].forEach(function (type) { form.addEventListener(type, ensureTheme, { once: true, passive: true }); });

  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.addEventListener('input', function (e) {
    var t = e.target;
    // Radios are handled on change; the audit has its own listeners.
    if (t.type === 'radio' || t.id === 'btAuditIn' || t.id === 'btAuditFile') return;
    if (t.id === 'btBrandPick') $('btBrand').value = t.value;
    if (t.hasAttribute('data-var') && $('btAuto').checked) return;
    if (t.id === 'btAuto') $('btColorsBox').disabled = t.checked;
    clearTimeout(timer);
    timer = setTimeout(function () { render(); }, /^(btMenu|btAbout|btPages|btTitle|btBrand)$/.test(t.id) ? 200 : 30);
  });
  form.addEventListener('change', function (e) {
    if (e.target.name === 'btDevice') { schedule(); return; }
    if (/^bt(View|Mode)$/.test(e.target.name || '')) render();
  });
  form.addEventListener('click', function (e) {
    var sw = e.target.closest('[data-c]');
    if (sw) { $('btBrand').value = sw.getAttribute('data-c'); $('btAuto').checked = true; $('btColorsBox').disabled = true; render(); return; }
    if (e.target.closest('#btFix')) {
      var s = state(), v = values(s), r = B.fixAll(v);
      $('btAuto').checked = false;
      $('btColorsBox').disabled = false;
      colorInputs.forEach(function (el) { var c = r.values[el.getAttribute('data-var')]; if (c) el.value = c; });
      if (r.values['brand.color'] !== v['brand.color']) $('btBrand').value = r.values['brand.color'];
      render();
      status(MSG.fixed(r.changed.length));
      return;
    }
    if (e.target.closest('#btDownload')) { ensureTheme().then(download); return; }
    if (e.target.closest('#btPrint')) { window.print(); return; }
    if (e.target.closest('#btCopy')) {
      var b = e.target.closest('#btCopy');
      if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(function () { b.textContent = MSG.copied; setTimeout(function () { b.textContent = MSG.copyLink; }, 1500); }, function () {});
    }
  });

  function download() {
    if (!theme) return;
    var s = state(), menu = B.parseLinks(s.menu, B.LIMITS.menu).links, pages = B.parseLinks(s.pages, B.LIMITS.footer).links;
    var out = B.build(theme.xml, { values: values(s), menu: menu.length ? menu : null, pages: pages.length ? pages : null, about: s.about, date: new Date().toISOString().slice(0, 10) });
    var check = new DOMParser().parseFromString(out, 'application/xml');
    if (check.getElementsByTagName('parsererror').length) { status(MSG.invalid); return; }
    var a = document.createElement('a'), url = URL.createObjectURL(new Blob([out], { type: 'application/xml' }));
    a.href = url;
    a.download = 'tbb-lite-custom.xml';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    status(MSG.saved);
  }

  // ---- Theme audit
  var auditTimer = 0;
  function runAudit(text) {
    if (!text.trim()) return;
    if (text.length > 2e6) { $('btAuditStatus').textContent = MSG.tooBig; return; }
    var doc = new DOMParser().parseFromString(text, 'application/xml'), err = doc.getElementsByTagName('parsererror')[0];
    var r = B.audit(text, err ? { wellFormed: false, error: MSG.notXml + err.textContent.split('\n')[0].slice(0, 160) } : {});
    $('btAuditOut').innerHTML = B.views.auditHtml(r, lang) + (r.hosts && r.hosts.length ? '<p class="bt-hosts">' + r.hosts.map(function (h) { return B.views.esc(h[0]) + ' (' + h[1] + ')'; }).join(', ') + '</p>' : '');
    $('btAuditStatus').textContent = r.items.length ? MSG.audited(r.score) : r.error;
  }
  $('btAuditIn').addEventListener('input', function () { clearTimeout(auditTimer); auditTimer = setTimeout(function () { runAudit($('btAuditIn').value); }, 300); });
  $('btAuditFile').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    if (f.size > 2e6) { $('btAuditStatus').textContent = MSG.tooBig; return; }
    f.text().then(function (t) { $('btAuditIn').value = t; runAudit(t); });
  });

  // Scaling reads layout, so it runs once per frame instead of in the middle of style changes.
  var pending = false;
  function schedule() { if (pending) return; pending = true; requestAnimationFrame(function () { pending = false; fit(); }); }
  window.addEventListener('resize', schedule);
  schedule();
})();
