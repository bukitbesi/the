/* Robots.txt Generator UI. Everything runs in the browser. The form (preset, site, rule rows, AI crawlers,
   sitemaps) generates the text; the text box can then be edited by hand and is what the audit and tester read.
   Form settings are kept in the URL hash. */
(function () {
  'use strict';
  var R = window.TBBRobots;
  var form = document.getElementById('rbForm');
  if (!R || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var V = R.views, E = form.elements, out = $('rbOut'), rowsBox = $('rbRows');
  var timer = 0;

  function rows() {
    return Array.prototype.map.call(rowsBox.querySelectorAll('.rb-row'), function (el) {
      var f = el.querySelectorAll('input,select');
      return { agent: f[0].value, type: f[1].value, path: f[2].value };
    });
  }
  function ai() {
    var o = {};
    Array.prototype.forEach.call(form.querySelectorAll('input[name=ai]'), function (c) { if (c.checked) o[c.value] = 'block'; });
    return o;
  }
  function cfg() {
    return { site: E.site.value.trim(), groups: R.groupsFromRows(rows()), sitemaps: E.sitemaps.value.split(/\n/), ai: ai() };
  }
  function check() {
    var text = out.value, a = R.audit(text, E.site.value.trim());
    $('rbAudit').innerHTML = V.auditHtml(a.notes);
    var url = E.url.value || '/', ua = E.ua.value, r = R.test(a.parsed, url, ua);
    $('rbVerdict').innerHTML = V.verdictHtml(r, ua);
    $('rbAll').innerHTML = V.allHtml(text, url);
  }
  function generate() {
    out.value = R.generate(cfg());
    save();
    check();
  }
  function save() {
    var q = new URLSearchParams();
    q.set('p', E.preset.value);
    if (E.site.value.trim()) q.set('s', E.site.value.trim());
    var blocked = Object.keys(ai());
    if (blocked.length) q.set('ai', blocked.join(','));
    var preset = R.fromPreset(E.preset.value, E.site.value.trim());
    var r = rows();
    if (JSON.stringify(r) !== JSON.stringify(R.rowsFromCfg(preset))) q.set('r', JSON.stringify(r.map(function (x) { return [x.agent, x.type === 'Allow' ? 1 : 0, x.path]; })));
    var maps = E.sitemaps.value.trim();
    if (maps !== preset.sitemaps.join('\n')) q.set('m', maps);
    history.replaceState(null, '', '#' + q.toString());
  }
  function applyPreset(name, keepSite) {
    var p = R.fromPreset(name, keepSite ? E.site.value.trim() : '');
    if (!keepSite) E.site.value = p.site;
    rowsBox.innerHTML = V.rowsHtml(R.rowsFromCfg(p));
    E.sitemaps.value = p.sitemaps.join('\n');
  }
  function restore() {
    var q = new URLSearchParams(location.hash.slice(1));
    if (!q.has('p')) return false;
    if (R.PRESETS[q.get('p')]) E.preset.value = q.get('p');
    applyPreset(E.preset.value);
    if (q.has('s')) E.site.value = q.get('s');
    if (q.has('r')) {
      try {
        rowsBox.innerHTML = V.rowsHtml(JSON.parse(q.get('r')).map(function (x) { return { agent: x[0], type: x[1] ? 'Allow' : 'Disallow', path: x[2] }; }));
      } catch (e) { /* keep the preset rows */ }
    }
    if (q.has('m')) E.sitemaps.value = q.get('m');
    var blocked = (q.get('ai') || '').split(',');
    Array.prototype.forEach.call(form.querySelectorAll('input[name=ai]'), function (c) { c.checked = blocked.indexOf(c.value) >= 0; });
    return true;
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.addEventListener('input', function (e) {
    var t = e.target;
    clearTimeout(timer);
    if (t === out) { timer = setTimeout(check, 150); return; }
    if (t === E.url || t === E.ua) { check(); return; }
    if (t === E.preset) return;
    timer = setTimeout(generate, 150);
  });
  form.addEventListener('change', function (e) {
    var t = e.target;
    if (t === E.preset) { applyPreset(t.value, false); generate(); return; }
    if (t === E.ua) { check(); return; }
    if (t.name === 'ai' || t.tagName === 'SELECT') generate();
  });
  rowsBox.addEventListener('click', function (e) {
    var del = e.target.closest('[data-del]');
    if (!del) return;
    del.parentNode.remove();
    generate();
  });
  $('rbAdd').addEventListener('click', function () {
    var list = $('rbAgents');
    list.insertAdjacentHTML('beforebegin', V.rowHtml({ agent: '*', type: 'Disallow', path: '' }));
    var all = rowsBox.querySelectorAll('.rb-row');
    all[all.length - 1].querySelectorAll('input')[1].focus();
  });
  form.querySelector('.rb-quick').addEventListener('click', function (e) {
    var b = e.target.closest('[data-ai]');
    if (!b) return;
    var mode = b.getAttribute('data-ai');
    R.BOTS.forEach(function (bot) {
      var c = form.querySelector('input[name=ai][value="' + bot.token + '"]');
      c.checked = mode === 'all' || (mode === 'training' && bot.purpose === 'training');
    });
    generate();
    $('rbLive').textContent = b.textContent + ': robots.txt updated.';
  });
  $('rbCopy').addEventListener('click', function () {
    var btn = this, done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy'; }, 1800); $('rbLive').textContent = 'Copied to clipboard.'; };
    if (navigator.clipboard) navigator.clipboard.writeText(out.value).then(done, function () { out.select(); document.execCommand('copy'); done(); });
    else { out.select(); document.execCommand('copy'); done(); }
  });
  $('rbDownload').addEventListener('click', function () {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([out.value], { type: 'text/plain' }));
    a.download = 'robots.txt';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  });
  $('rbPrint').addEventListener('click', function () { window.print(); });

  // The page ships with the Blogger preset rendered; only rebuild when the link carries other settings.
  if (restore()) generate();
})();
