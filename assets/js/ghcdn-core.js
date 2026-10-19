/* GitHub to jsDelivr converter core. Reads github.com blob/raw/tree links, raw.githubusercontent.com links and
   jsDelivr /gh/ links, and writes the jsDelivr CDN URL (as given, minified, latest), the raw and GitHub links, and the
   HTML tag to load the file, with notes on caching from jsDelivr's documentation.
   UMD: module.exports in Node, window.TBBGhCdn in the browser. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-19', branchCacheHours: 12, aliasCacheDays: 7, maxFileMB: 20 };
  var CDN = 'https://cdn.jsdelivr.net/gh/';
  var SHA = /^[0-9a-f]{7,40}$/i, SEMVER = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

  // Returns { user, repo, ref, path, dir } or { error }.
  function parse(input) {
    var s = String(input || '').trim().replace(/[?#].*$/, ''), m;
    if (!s) return { error: 'empty' };
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    if ((m = /^https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/(blob|raw|tree)\/(?:refs\/(?:heads|tags)\/)?([^/]+)(?:\/(.*))?$/i.exec(s)))
      return { user: m[1], repo: m[2], ref: decodeURIComponent(m[4]), path: m[5] || '', dir: m[3] === 'tree' || !m[5] };
    if ((m = /^https?:\/\/raw\.githubusercontent\.com\/([\w.-]+)\/([\w.-]+)\/(?:refs\/(?:heads|tags)\/)?([^/]+)\/(.+)$/i.exec(s)))
      return { user: m[1], repo: m[2], ref: decodeURIComponent(m[3]), path: m[4], dir: false };
    if ((m = /^https?:\/\/(?:cdn|fastly|gcore|testingcf)\.jsdelivr\.net\/gh\/([\w.-]+)\/([\w.-]+?)(?:@([^/]+))?(?:\/(.*))?$/i.exec(s)))
      return { user: m[1], repo: m[2], ref: m[3] ? decodeURIComponent(m[3]) : '', path: m[4] || '', dir: !m[4] || /\/$/.test(m[4]) };
    if ((m = /^https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i.exec(s))) return { user: m[1], repo: m[2], ref: '', path: '', dir: true };
    if (/gist\.github(usercontent)?\.com/i.test(s)) return { error: 'gist' };
    if (/\.github\.io\//i.test(s)) return { error: 'pages' };
    return { error: 'unknown' };
  }

  function refKind(ref) {
    if (!ref) return 'latest';
    if (SHA.test(ref) && /\d/.test(ref) && /[a-f]/i.test(ref)) return 'commit';
    if (SEMVER.test(ref.replace(/^v/, ''))) return 'version';
    return 'branch';
  }
  var ext = function (p) { var m = /\.([a-z0-9]+)$/i.exec(p); return m ? m[1].toLowerCase() : ''; };
  var encPath = function (p) { return p.split('/').map(encodeURIComponent).join('/'); };

  function cdnUrl(g, ref, path) {
    return CDN + g.user + '/' + g.repo + (ref ? '@' + encodeURIComponent(ref) : '') + '/' + encPath(path == null ? g.path : path);
  }
  function minPath(p) { return /\.(js|css)$/i.test(p) && !/\.min\.(js|css)$/i.test(p) ? p.replace(/\.(js|css)$/i, '.min.$1') : ''; }

  function tagFor(url, p) {
    var e = ext(p);
    if (e === 'js' || e === 'mjs') return '<script src="' + url + '" defer></script>';
    if (e === 'css') return '<link rel="stylesheet" href="' + url + '">';
    if (/^(png|jpe?g|gif|webp|avif|svg|ico)$/.test(e)) return '<img src="' + url + '" alt="" loading="lazy">';
    if (/^(woff2?|ttf|otf)$/.test(e)) return '@font-face{font-family:"MyFont";src:url("' + url + '") format("' + (e === 'ttf' ? 'truetype' : e === 'otf' ? 'opentype' : e) + '");font-display:swap}';
    return '';
  }

  // Everything the page shows for one link.
  function convert(input) {
    var g = parse(input);
    if (g.error) return { ok: false, error: g.error };
    var kind = refKind(g.ref), notes = [], out = { ok: true, g: g, kind: kind };
    out.cdn = g.dir ? cdnUrl(g, g.ref, g.path.replace(/\/?$/, '/')) : cdnUrl(g, g.ref);
    if (!g.dir) {
      var mp = minPath(g.path);
      if (mp) out.min = cdnUrl(g, g.ref, mp);
      out.raw = g.ref ? 'https://raw.githubusercontent.com/' + g.user + '/' + g.repo + '/' + encodeURIComponent(g.ref) + '/' + encPath(g.path) : '';
      out.tag = tagFor(out.min || out.cdn, g.path);
    }
    out.github = 'https://github.com/' + g.user + '/' + g.repo + (g.ref ? '/' + (g.dir ? 'tree' : 'blob') + '/' + encodeURIComponent(g.ref) + (g.path ? '/' + encPath(g.path.replace(/\/$/, '')) : '') : '');
    if (kind === 'version') {
      var v = g.ref.replace(/^v/, '').split('.');
      if (g.ref[0] !== 'v') { out.major = cdnUrl(g, v[0]); out.minor = cdnUrl(g, v[0] + '.' + v[1]); }
    }
    if (kind === 'branch') notes.push('branch');
    if (kind === 'latest') notes.push('latest');
    if (ext(g.path) === 'html' || ext(g.path) === 'htm') notes.push('html');
    out.notes = notes;
    return out;
  }

  // ---------------------------------------------------------------- HTML view shared by the build and the page
  var esc = function (x) { return String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var ERR = {
    gist: 'Gists are not served by jsDelivr. Put the file in a public repository instead.',
    pages: 'GitHub Pages links (github.io) are already served by a CDN. Use the file\'s link on github.com to get a jsDelivr URL.',
    unknown: 'Paste a link to a file on github.com, raw.githubusercontent.com or cdn.jsdelivr.net/gh/.'
  };
  var NOTE = {
    branch: 'Branch links are cached for up to 12 hours, so updates appear late. For a live site, create a release tag and use @version, or a commit hash.',
    latest: 'Links without @version always load the latest release; jsDelivr advises against this in production.',
    html: 'jsDelivr serves HTML files as plain text, so they will not open as web pages.'
  };
  function row(label, url, i) {
    return '<li><span class="gc-l">' + label + '</span><code>' + esc(url) + '</code><button type="button" class="btn ghost sm" data-copy="' + esc(url) + '" aria-label="Copy ' + label + ' ' + (i + 1) + '">Copy</button></li>';
  }
  function resultHtml(r, i) {
    if (!r.ok) return r.error === 'empty' ? '' : '<div class="gc-card"><p class="error">' + ERR[r.error] + '</p></div>';
    var g = r.g, rows = [row('jsDelivr' + (r.min ? ' (minified)' : ''), r.min || r.cdn, i)];
    if (r.min) rows.push(row('jsDelivr (original)', r.cdn, i));
    if (r.major) rows.push(row('Latest ' + g.ref.split('.')[0] + '.x', r.major, i), row('Latest ' + g.ref.split('.').slice(0, 2).join('.') + '.x', r.minor, i));
    if (r.tag) rows.push(row('HTML', r.tag, i));
    if (r.raw) rows.push(row('Raw GitHub', r.raw, i));
    return '<div class="gc-card"><p class="gc-h"><strong>' + esc(g.path || g.repo) + '</strong> <span>' + esc(g.user + '/' + g.repo) + (g.ref ? ' @ ' + esc(g.ref) + ' (' + r.kind + ')' : '') + '</span></p><ul class="gc-rows">' + rows.join('') + '</ul>' +
      r.notes.map(function (n) { return '<p class="help gc-note">' + NOTE[n] + '</p>'; }).join('') + '</div>';
  }

  var api = { views: { resultHtml: resultHtml }, FACTS: FACTS, parse: parse, refKind: refKind, convert: convert, minPath: minPath, tagFor: tagFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBGhCdn = api;
})(typeof self !== 'undefined' ? self : this);
