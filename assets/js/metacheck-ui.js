/* Meta Tag Checker UI. Type a title and description for a live search-result preview, or paste a page's HTML (View
   Source) to fill them in and run every check. Nothing is uploaded; the social preview only loads the og:image URL. */
(function () {
  'use strict';
  var M = window.TBBMeta;
  var form = document.getElementById('mcForm');
  if (!M || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'tbb-metacheck', timer = 0, info = null;

  function count(el, out, range) {
    var n = Array.from(el.value).length;
    out.textContent = n + ' characters';
    out.className = 'help mc-count' + (n && (n < range[0] || n > range[1]) ? ' mc-over' : '');
  }
  function run(fromHtml) {
    var html = $('mcHtml').value.trim();
    if (fromHtml && html) {
      info = M.extract(html);
      $('mcTitle').value = info.title;
      $('mcDesc').value = info.description || '';
      if (info.canonical || info.og.url) $('mcUrl').value = info.canonical || info.og.url;
      if (info.og.site) $('mcSite').value = info.og.site;
    }
    if (!html) info = null;
    var t = $('mcTitle').value.trim(), d = $('mcDesc').value.trim(), u = $('mcUrl').value.trim();
    count($('mcTitle'), $('mcTitleN'), M.FACTS.title);
    count($('mcDesc'), $('mcDescN'), M.FACTS.description);
    $('mcPreview').innerHTML = M.views.serpHtml({ title: t, description: d, url: u, site: $('mcSite').value.trim() });
    var base = info ? Object.assign({}, info, { title: t, titles: info.titles.length ? info.titles : [t], description: d || null })
      : { title: t, titles: [t], description: d || null, h1: [], hreflang: [], og: {}, twitter: {}, ld: [], images: 0, noAlt: 0 };
    var list = M.check(base, { keyword: $('mcKw').value, url: u });
    if (!info) list = list.filter(function (c) { return c.id === 'title' || c.id === 'description' || c.id === 'keyword'; });
    $('mcChecks').innerHTML = M.views.checksHtml(list);
    $('mcScore').textContent = info ? 'Score ' + M.score(list) + '/100 · ' + list.filter(function (c) { return c.status === 'fail'; }).length + ' errors, ' + list.filter(function (c) { return c.status === 'warn'; }).length + ' warnings' : 'Paste the page HTML below for the full check.';
    var og = info && info.og, img = og && og.image && /^https?:\/\//.test(og.image) ? og.image : '';
    $('mcSocial').hidden = !info;
    if (info) {
      $('mcSocial').innerHTML = (img ? '<img src="' + M.views.esc(img) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<div class="mc-noimg">No og:image</div>') +
        '<p><small>' + M.views.esc(M.crumb(og.url || u).split(' › ')[0]) + '</small><b>' + M.views.esc(og.title || t) + '</b><span>' + M.views.esc(og.description || d) + '</span></p>';
    }
    try { localStorage.setItem(KEY, JSON.stringify({ t: t, d: d, u: u, s: $('mcSite').value, k: $('mcKw').value, h: html.slice(0, 200000) })); } catch (e) { /* storage blocked */ }
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); run(true); });
  form.addEventListener('input', function (e) { clearTimeout(timer); var h = e.target.id === 'mcHtml'; timer = setTimeout(function () { run(h); }, h ? 300 : 80); });
  form.addEventListener('change', function (e) { if (e.target.name === 'device') $('mcPreview').className = 'mc-preview mc-' + e.target.value; });

  try {
    var s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s) { $('mcTitle').value = s.t || ''; $('mcDesc').value = s.d || ''; $('mcUrl').value = s.u || ''; $('mcSite').value = s.s || ''; $('mcKw').value = s.k || ''; $('mcHtml').value = s.h || ''; run(false); if (s.h) { info = M.extract(s.h); run(false); } }
  } catch (e) { /* storage blocked */ }
})();
