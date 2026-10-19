/* Shared header behaviour on every page: dark mode, the mobile menu and tool search. The search index
   (/search-index.json) is fetched only when search is first opened or hovered, so it never affects first paint. */
(function () {
  'use strict';
  var root = document.documentElement, $ = function (id) { return document.getElementById(id); };
  var ms = root.lang === 'ms';

  // ---------------------------------------------------------------- dark mode
  var theme = $('themeToggle'), meta = document.querySelector('meta[name="theme-color"]');
  function syncTheme() {
    var d = root.getAttribute('data-theme') === 'dark';
    theme.setAttribute('aria-pressed', d ? 'true' : 'false');
    if (meta) meta.content = d ? '#0a0a0f' : '#ffffff';
  }
  if (theme) {
    theme.addEventListener('click', function () {
      if (root.getAttribute('data-theme') === 'dark') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', 'dark');
      try { localStorage.setItem('tbb-theme', root.getAttribute('data-theme') || 'light'); } catch (e) { /* storage blocked */ }
      syncTheme();
    });
    syncTheme();
  }

  // ---------------------------------------------------------------- mobile menu
  var burger = $('menuOpen'), menu = $('siteMenu');
  function setMenu(open) {
    if (!menu) return;
    menu.hidden = !open;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    root.classList.toggle('menu-open', open);
  }
  if (burger && menu) {
    burger.addEventListener('click', function () { setMenu(menu.hidden); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a') && !e.target.closest('[data-search]')) setMenu(false); });
    addEventListener('resize', function () { if (innerWidth >= 1100 && !menu.hidden) setMenu(false); });
  }

  // ---------------------------------------------------------------- search
  var dlg = $('siteSearch'), q = $('searchQ'), list = $('searchList'), status = $('searchStatus'), opener = null;
  var data = null, loading = null, timer = 0;
  if (!dlg) return;
  var L = ms
    ? { pop: 'Alat popular', none: 'Tiada alat sepadan dengan', all: 'Lihat semua alat', found: function (n) { return n + ' alat ditemui'; }, fail: 'Carian tidak dapat dimuatkan. Semak sambungan anda.' }
    : { pop: 'Popular tools', none: 'No tool matches', all: 'Browse all tools', found: function (n) { return n + (n === 1 ? ' tool found' : ' tools found'); }, fail: 'Search could not load. Check your connection.' };

  function load() {
    if (!loading) {
      loading = fetch('/search-index.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (j) {
          data = j.items.map(function (t) {
            var cat = (j.cats[t.c] || []).join(' ');
            t.nn = norm(t.n);
            t.hay = norm(t.n + ' ' + t.d + ' ' + t.k + ' ' + cat + ' ' + t.u.replace(/[/-]/g, ' '));
            return t;
          });
          return data;
        })
        .catch(function () { loading = null; throw new Error('load'); });
    }
    return loading;
  }
  function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // Every word must appear somewhere; matches in the tool name, especially at a word start, rank higher.
  function find(query) {
    var words = norm(query).split(/[^a-z0-9]+/).filter(Boolean);
    if (!words.length) return null;
    var out = [];
    data.forEach(function (t) {
      var score = 0;
      for (var i = 0; i < words.length; i++) {
        var w = words[i], at = t.nn.indexOf(w);
        if (at === 0 || (at > 0 && /[^a-z0-9]/.test(t.nn[at - 1]))) score += 30;
        else if (at > 0) score += 15;
        else if (t.hay.indexOf(w) >= 0) score += 5;
        else return;
      }
      if ((t.l === 'ms') === ms) score += 4;
      if (t.b) score += 1;
      out.push([score, t]);
    });
    return out.sort(function (a, b) { return b[0] - a[0] || a[1].n.localeCompare(b[1].n); }).slice(0, 12).map(function (x) { return x[1]; });
  }
  function item(t) {
    var cat = t.c ? ' t-' + t.c : '';
    return '<li><a href="' + esc(t.u) + '"><i class="dot' + cat + '" aria-hidden="true"></i><span><strong>' + esc(t.n) + '</strong>' +
      (t.l === 'ms' && !ms ? ' <em lang="ms">BM</em>' : '') + '<small>' + esc(t.d.length > 96 ? t.d.slice(0, 96) + '…' : t.d) + '</small></span></a></li>';
  }
  function render() {
    if (!data) return;
    var r = find(q.value);
    if (!r) {
      var pop = data.filter(function (t) { return (t.b === 'popular' || t.b === 'hot') && (t.l === 'ms') === ms; }).slice(0, 8);
      if (!pop.length) pop = data.filter(function (t) { return t.b; }).slice(0, 8);
      status.textContent = L.pop;
      list.innerHTML = pop.map(item).join('');
      return;
    }
    status.textContent = r.length ? L.found(r.length) : '';
    list.innerHTML = r.length ? r.map(item).join('') : '<li class="search-none">' + L.none + ' “' + esc(q.value.trim()) + '”. <a href="/#tools">' + L.all + '</a></li>';
  }
  function open(e, value) {
    if (e) e.preventDefault();
    if (!dlg.hidden) return;
    opener = document.activeElement;
    setMenu(false);
    dlg.hidden = false;
    root.classList.add('search-open');
    if (value != null) q.value = value;
    q.focus();
    q.select();
    load().then(render, function () { status.textContent = L.fail; });
  }
  function close() {
    if (dlg.hidden) return;
    dlg.hidden = true;
    root.classList.remove('search-open');
    if (opener && opener.focus) opener.focus();
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('#searchOpen, [data-search]');
    if (t) open(e);
    else if (e.target === dlg) close();
  });
  $('searchClose').addEventListener('click', close);
  var so = $('searchOpen');
  if (so) ['pointerenter', 'focus', 'touchstart'].forEach(function (ev) { so.addEventListener(ev, function () { load().catch(function () {}); }, { passive: true, once: true }); });
  q.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(render, 60); });
  dlg.querySelector('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var first = list.querySelector('a');
    if (first) location.href = first.href;
  });
  document.addEventListener('keydown', function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) { open(e); return; }
    if (e.key === 'Escape') { if (!dlg.hidden) close(); else if (menu && !menu.hidden) { setMenu(false); burger.focus(); } return; }
    if (dlg.hidden || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
    var links = [].slice.call(list.querySelectorAll('a')), i = links.indexOf(document.activeElement);
    if (!links.length) return;
    e.preventDefault();
    if (e.key === 'ArrowDown') (links[i + 1] || links[0]).focus();
    else if (i <= 0) q.focus();
    else links[i - 1].focus();
  });
  // Keep Tab inside the open dialog.
  dlg.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var f = [].slice.call(dlg.querySelectorAll('input, button, a[href]'));
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  // /?q=word (the search form's no-JavaScript target) opens search with that word.
  var m = /[?&]q=([^&#]*)/.exec(location.search);
  if (m) open(null, decodeURIComponent(m[1].replace(/\+/g, ' ')));
})();
