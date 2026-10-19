/* Privacy Policy Generator UI. The policy updates as you answer; answers are kept only in this browser
   (localStorage). Copies as HTML or text and downloads HTML, Markdown or Word (.docx via docx-core.js). */
(function () {
  'use strict';
  var P = window.TBBPrivacy, N = window.TBBNotes, D = window.TBBDocx;
  var form = document.getElementById('ppForm');
  if (!P || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'tbb-privacy', timer = 0, docs = [];
  var CHECK = {
    url: 'Enter your full website address, starting with https://.',
    email: 'Enter a valid contact email address: the PDPA notice must tell people how to reach you.',
    placeholder: 'Replace the example name, owner or email with your own before publishing.'
  };
  var TEXT_FIELDS = ['site', 'url', 'owner', 'email', 'address', 'date'];

  function read() {
    var e = form.elements, o = { lang: e.lang.value, gdpr: e.gdpr.checked, children: e.children.checked, collect: {}, services: {} };
    TEXT_FIELDS.forEach(function (k) { o[k] = e[k].value.trim(); });
    ['contact', 'comments', 'newsletter', 'accounts', 'orders'].forEach(function (k) { o.collect[k] = e['c_' + k].checked; });
    ['adsense', 'analytics', 'affiliate', 'embeds', 'cdn'].forEach(function (k) { o.services[k] = e['s_' + k].checked; });
    return o;
  }
  function write(o) {
    var e = form.elements;
    TEXT_FIELDS.forEach(function (k) { if (o[k] != null) e[k].value = o[k]; });
    if (o.lang) e.lang.value = o.lang;
    e.gdpr.checked = o.gdpr !== false;
    e.children.checked = o.children !== false;
    Object.keys(o.collect || {}).forEach(function (k) { if (e['c_' + k]) e['c_' + k].checked = !!o.collect[k]; });
    Object.keys(o.services || {}).forEach(function (k) { if (e['s_' + k]) e['s_' + k].checked = !!o.services[k]; });
  }

  function run() {
    var o = read(), issues = P.check(o);
    docs = P.generate(o);
    $('ppPreview').innerHTML = P.html(docs, 3);
    $('ppIssues').hidden = !issues.length;
    $('ppIssues').innerHTML = issues.map(function (k) { return '<li>' + CHECK[k] + '</li>'; }).join('');
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (x) { /* storage blocked */ }
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(run, 150); }

  function flash(btn, t) { var old = btn.textContent; btn.textContent = t; setTimeout(function () { btn.textContent = old; }, 1500); }
  function copy(text, btn) { if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { flash(btn, 'Copied'); }, function () {}); }
  function download(data, name, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: type }));
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }
  function slug() { return (read().site || 'website').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'website'; }
  function page() {
    var o = read(), title = docs.map(function (d) { return d.title; }).join(' / ');
    return '<!doctype html>\n<html lang="' + (o.lang === 'ms' ? 'ms' : 'en') + '">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>' + P.esc(title + ' | ' + o.site) + '</title>\n' +
      '<style>body{max-width:760px;margin:40px auto;padding:0 20px;font:16px/1.7 system-ui,sans-serif;color:#1a1a1a}h2{margin-top:2em}a{color:#1a56db}</style>\n</head>\n<body>\n' + P.html(docs, 1) + '\n</body>\n</html>\n';
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); run(); });
  form.addEventListener('input', schedule);
  form.addEventListener('change', run);
  $('ppCopyHtml').addEventListener('click', function () { copy(P.html(docs, 2), this); });
  $('ppCopyText').addEventListener('click', function () { copy(P.text(docs), this); });
  $('ppHtml').addEventListener('click', function () { download(page(), 'privacy-policy-' + slug() + '.html', 'text/html'); });
  $('ppMd').addEventListener('click', function () { download(P.markdown(docs), 'privacy-policy-' + slug() + '.md', 'text/markdown'); });
  $('ppDocx').addEventListener('click', function () {
    if (!N || !D) return;
    var md = P.markdown(docs).replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
    download(D.build(N.parse(md), { title: docs[0].title, creator: read().owner }), 'privacy-policy-' + slug() + '.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  });
  $('ppReset').addEventListener('click', function () {
    try { localStorage.removeItem(KEY); } catch (x) { /* ignore */ }
    write(P.DEFAULTS);
    form.elements.date.value = new Date().toISOString().slice(0, 10);
    run();
  });

  var saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (x) { saved = null; }
  if (saved) write(saved);
  else form.elements.date.value = new Date().toISOString().slice(0, 10);
  run();
})();
