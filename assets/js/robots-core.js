/* Robots.txt generator, parser, validator and tester shared by the Robots.txt Generator page, the build and the
   tests. Matching follows RFC 9309 and Google's documented behaviour: the most specific user-agent group wins
   (groups with the same agent are merged, '*' is the fallback), the longest matching path rule wins, Allow wins a
   tie, '*' matches any sequence, '$' anchors the end, and /robots.txt itself is always allowed. */
(function (root) {
  'use strict';

  var FACTS = { verified: '2026-10-17', maxBytes: 500 * 1024 };

  // AI crawlers and control tokens; purpose is what blocking the token stops.
  var BOTS = [
    { token: 'GPTBot', owner: 'OpenAI', purpose: 'training', note: 'Collects pages that may be used to train OpenAI models.' },
    { token: 'OAI-SearchBot', owner: 'OpenAI', purpose: 'search', note: 'Indexes pages so they can appear as sources in ChatGPT search.' },
    { token: 'ChatGPT-User', owner: 'OpenAI', purpose: 'user', note: 'Fetches a page when a ChatGPT user asks for it; may not follow robots.txt.' },
    { token: 'ClaudeBot', owner: 'Anthropic', purpose: 'training', note: 'Collects pages that may be used to train Claude models.' },
    { token: 'Claude-SearchBot', owner: 'Anthropic', purpose: 'search', note: 'Indexes pages for search results in Claude.' },
    { token: 'Claude-User', owner: 'Anthropic', purpose: 'user', note: 'Fetches a page when a Claude user asks for it.' },
    { token: 'Google-Extended', owner: 'Google', purpose: 'training', note: 'Control token, not a crawler: stops Googlebot-crawled pages being used for Gemini training and grounding. No effect on Google Search.' },
    { token: 'Applebot-Extended', owner: 'Apple', purpose: 'training', note: 'Control token: stops Applebot-crawled pages being used to train Apple models. Applebot search crawling continues.' },
    { token: 'PerplexityBot', owner: 'Perplexity', purpose: 'search', note: 'Indexes pages for Perplexity answers.' },
    { token: 'Perplexity-User', owner: 'Perplexity', purpose: 'user', note: 'Fetches a page when a Perplexity user asks for it; may not follow robots.txt.' },
    { token: 'meta-externalagent', owner: 'Meta', purpose: 'training', note: 'Collects pages for Meta AI training and products.' },
    { token: 'CCBot', owner: 'Common Crawl', purpose: 'training', note: 'Builds the open Common Crawl dataset that many AI models are trained on.' }
  ];
  var PURPOSE = { training: 'AI training', search: 'AI search', user: 'User-requested fetch' };

  // Crawlers offered in the tester, most specific first.
  var TESTERS = ['Googlebot', 'Googlebot-Image', 'Googlebot-News', 'Mediapartners-Google', 'AdsBot-Google', 'Bingbot', 'DuckDuckBot', 'Applebot']
    .concat(BOTS.map(function (b) { return b.token; }));

  var PRESETS = {
    blogger: {
      label: 'Blogger',
      groups: [{ agents: ['Mediapartners-Google'], disallow: [''] }, { agents: ['*'], disallow: ['/search'], allow: ['/'] }],
      sitemaps: ['/sitemap.xml', '/sitemap-pages.xml'], site: 'https://www.example.com'
    },
    wordpress: {
      label: 'WordPress',
      groups: [{ agents: ['*'], disallow: ['/wp-admin/'], allow: ['/wp-admin/admin-ajax.php'] }],
      sitemaps: ['/wp-sitemap.xml'], site: 'https://www.example.com'
    },
    open: { label: 'Allow everything', groups: [{ agents: ['*'], disallow: [''] }], sitemaps: ['/sitemap.xml'], site: 'https://www.example.com' },
    closed: { label: 'Block everything (staging)', groups: [{ agents: ['*'], disallow: ['/'] }], sitemaps: [], site: 'https://staging.example.com' }
  };

  // ---------------------------------------------------------------- generate
  // cfg: { site, groups: [{agents, allow, disallow, crawlDelay}], sitemaps, ai: {token: 'block'} , comment }
  function absolute(site, u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    return String(site || '').replace(/\/+$/, '') + (u.charAt(0) === '/' ? '' : '/') + u;
  }
  function generate(cfg) {
    var out = [];
    if (cfg.comment) out.push('# ' + cfg.comment, '');
    (cfg.groups || []).forEach(function (g) {
      var agents = (g.agents || []).filter(Boolean);
      if (!agents.length) return;
      agents.forEach(function (a) { out.push('User-agent: ' + a); });
      var rules = 0;
      (g.disallow || []).forEach(function (p) { out.push('Disallow:' + (p ? ' ' + p : '')); rules++; });
      (g.allow || []).forEach(function (p) { if (p) { out.push('Allow: ' + p); rules++; } });
      if (!rules) out.push('Disallow:');
      if (g.crawlDelay) out.push('Crawl-delay: ' + g.crawlDelay);
      out.push('');
    });
    var blocked = BOTS.filter(function (b) { return cfg.ai && cfg.ai[b.token] === 'block'; }).map(function (b) { return b.token; });
    if (blocked.length) {
      out.push('# AI crawlers and AI training');
      blocked.forEach(function (t) { out.push('User-agent: ' + t); });
      out.push('Disallow: /', '');
    }
    var maps = (cfg.sitemaps || []).map(function (s) { return absolute(cfg.site, s); }).filter(Boolean);
    maps.forEach(function (s) { out.push('Sitemap: ' + s); });
    while (out.length && out[out.length - 1] === '') out.pop();
    return out.join('\n') + '\n';
  }
  function fromPreset(name, site, ai) {
    var p = PRESETS[name] || PRESETS.open;
    return { site: site || p.site, groups: JSON.parse(JSON.stringify(p.groups)), sitemaps: p.sitemaps.slice(), ai: ai || {} };
  }

  // ---------------------------------------------------------------- parse
  var KNOWN = { 'user-agent': 1, allow: 1, disallow: 1, sitemap: 1, 'crawl-delay': 1, host: 1, 'clean-param': 1, noindex: 1, nofollow: 1, 'request-rate': 1, 'visit-time': 1 };
  function parse(text) {
    var lines = String(text || '').replace(/^﻿/, '').split(/\r\n|\r|\n/);
    var groups = [], sitemaps = [], issues = [], cur = null, lastWasAgent = false;
    lines.forEach(function (raw, i) {
      var n = i + 1, line = raw.replace(/#.*$/, '').trim();
      if (!line) return;
      var m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
      if (!m) { issues.push({ line: n, level: 'error', code: 'syntax', text: raw.trim() }); return; }
      var key = m[1].toLowerCase(), val = m[2].trim();
      if (!KNOWN[key]) { issues.push({ line: n, level: 'warn', code: 'unknown', text: m[1] }); return; }
      if (key === 'user-agent') {
        if (!lastWasAgent || !cur) { cur = { agents: [], rules: [], line: n }; groups.push(cur); }
        cur.agents.push(val);
        lastWasAgent = true;
        return;
      }
      lastWasAgent = false;
      if (key === 'sitemap') {
        if (!/^https?:\/\//i.test(val)) issues.push({ line: n, level: 'error', code: 'sitemapRelative', text: val });
        sitemaps.push({ url: val, line: n });
        return;
      }
      if (key === 'allow' || key === 'disallow') {
        if (!cur) { issues.push({ line: n, level: 'error', code: 'noAgent', text: line }); return; }
        if (val && val.charAt(0) !== '/' && val.charAt(0) !== '*') issues.push({ line: n, level: 'warn', code: 'noSlash', text: val });
        cur.rules.push({ allow: key === 'allow', path: val, line: n });
        return;
      }
      if (key === 'crawl-delay') { issues.push({ line: n, level: 'info', code: 'crawlDelay', text: val }); if (cur) cur.crawlDelay = val; return; }
      if (key === 'noindex' || key === 'nofollow') { issues.push({ line: n, level: 'warn', code: 'noindex', text: line }); return; }
      issues.push({ line: n, level: 'info', code: 'ignoredByGoogle', text: m[1] });
    });
    return { groups: groups, sitemaps: sitemaps, issues: issues, bytes: utf8Length(text) };
  }
  function utf8Length(s) { s = String(s || ''); var n = 0; for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); n += c < 0x80 ? 1 : c < 0x800 ? 2 : c >= 0xd800 && c < 0xdc00 ? (i++, 4) : 3; } return n; }

  // ---------------------------------------------------------------- match
  // Percent-encode characters outside the unreserved/reserved set and upper-case existing escapes, so the
  // pattern and the URL path compare byte for byte (RFC 9309, 2.2.2).
  function normalise(p) {
    return String(p).replace(/%[0-9a-f]{2}/gi, function (m) { return m.toUpperCase(); })
      .replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@\/?%#\[\]]/gu, function (c) { try { return encodeURIComponent(c); } catch (e) { return c; } });
  }
  function patternMatches(pattern, path) {
    var re = '^' + normalise(pattern).split('*').map(function (s) { return s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'); }).join('.*');
    if (/\\\$$/.test(re)) re = re.slice(0, -2) + '$';
    return new RegExp(re).test(path);
  }
  function pathOf(url) {
    var u = String(url || '').trim();
    var m = /^[a-z][a-z0-9+.-]*:\/\/[^\/?#]*(.*)$/i.exec(u);
    var p = (m ? m[1] : u).replace(/#.*$/, '');
    if (!p || p.charAt(0) === '?') p = '/' + p;
    if (p.charAt(0) !== '/') p = '/' + p;
    return normalise(p);
  }
  // Picks the group(s) for a crawler: the longest agent token that is a case-insensitive prefix of the crawler's
  // product token (so Googlebot-Image falls back to Googlebot), else '*'. Same-agent groups are merged.
  function groupsFor(parsed, crawler) {
    var c = String(crawler || '*').toLowerCase(), best = '', label = '', hits = [];
    parsed.groups.forEach(function (g) {
      g.agents.forEach(function (a) {
        var t = a.toLowerCase().split('/')[0].trim();
        if (t !== '*' && c.indexOf(t) === 0 && t.length > best.length) { best = t; label = a.split('/')[0].trim(); }
      });
    });
    var want = best || '*';
    parsed.groups.forEach(function (g) {
      if (g.agents.some(function (a) { return a.toLowerCase().split('/')[0].trim() === want; })) hits.push(g);
    });
    return { agent: best ? label : (hits.length ? '*' : ''), groups: hits };
  }
  function test(text, url, crawler) {
    var parsed = typeof text === 'string' ? parse(text) : text, path = pathOf(url);
    if (/^\/robots\.txt$/i.test(path.split('?')[0])) return { allowed: true, reason: 'robots', path: path, agent: '', rule: null };
    var g = groupsFor(parsed, crawler), best = null;
    g.groups.forEach(function (grp) {
      grp.rules.forEach(function (r) {
        if (!r.path || !patternMatches(r.path, path)) return;
        var len = utf8Length(normalise(r.path));
        if (!best || len > best.len || (len === best.len && r.allow && !best.rule.allow)) best = { len: len, rule: r };
      });
    });
    return {
      allowed: !best || best.rule.allow, reason: !g.groups.length ? 'noGroup' : best ? 'rule' : 'noRule',
      path: path, agent: g.agent, rule: best ? best.rule : null
    };
  }

  // ---------------------------------------------------------------- audit
  function audit(text, site) {
    var p = parse(text), notes = p.issues.slice();
    if (p.bytes > FACTS.maxBytes) notes.push({ line: 0, level: 'error', code: 'tooBig', text: String(p.bytes) });
    if (!p.groups.length) notes.push({ line: 0, level: 'warn', code: 'noGroups', text: '' });
    if (!p.sitemaps.length) notes.push({ line: 0, level: 'info', code: 'noSitemap', text: '' });
    var home = test(p, '/', 'Googlebot');
    if (!home.allowed) notes.push({ line: home.rule ? home.rule.line : 0, level: 'error', code: 'blocksAll', text: '' });
    ['/style.css', '/app.js', '/wp-content/themes/x/style.css', '/wp-includes/js/jquery/jquery.min.js'].some(function (u) {
      var t = test(p, u, 'Googlebot');
      if (!t.allowed && home.allowed) { notes.push({ line: t.rule.line, level: 'warn', code: 'blocksAssets', text: u }); return true; }
      return false;
    });
    var ads = test(p, '/', 'Mediapartners-Google');
    if (!ads.allowed) notes.push({ line: ads.rule ? ads.rule.line : 0, level: 'warn', code: 'blocksAdsense', text: '' });
    if (site) p.sitemaps.forEach(function (s) {
      try { if (new URL(s.url).host !== new URL(site).host) notes.push({ line: s.line, level: 'info', code: 'sitemapHost', text: s.url }); } catch (e) { /* reported as relative */ }
    });
    return { parsed: p, notes: notes.sort(function (a, b) { return a.line - b.line; }) };
  }
  var NOTE = {
    syntax: 'Not a valid "field: value" line; crawlers ignore it.',
    unknown: 'Unknown directive; crawlers ignore it.',
    sitemapRelative: 'Sitemap must be a full URL starting with https://.',
    noAgent: 'Rule before any User-agent line; it belongs to no group and is ignored.',
    noSlash: 'Paths should start with / (or *).',
    crawlDelay: 'Crawl-delay is ignored by Google; Bing and Yandex read it.',
    noindex: 'Noindex in robots.txt is not supported by Google since 2019; use a meta robots tag or X-Robots-Tag header.',
    ignoredByGoogle: 'Not part of the standard; Google ignores it.',
    tooBig: 'Larger than 500 KiB; Google ignores everything after that.',
    noGroups: 'No User-agent groups, so nothing is blocked.',
    noSitemap: 'No Sitemap line. Adding one helps crawlers find your pages.',
    blocksAll: 'Googlebot is blocked from your home page: the whole site will drop out of Google.',
    blocksAssets: 'CSS or JavaScript is blocked, so Google cannot render pages as visitors see them.',
    blocksAdsense: 'Mediapartners-Google (AdSense) is blocked, so ads may be irrelevant or unfilled.',
    sitemapHost: 'Sitemap is on another host; allowed, but check it is the right site.'
  };


  // ---------------------------------------------------------------- rule rows (the page's editor) and HTML views
  function rowsFromCfg(cfg) {
    var rows = [];
    (cfg.groups || []).forEach(function (g) {
      g.agents.forEach(function (a) {
        (g.disallow || []).forEach(function (p) { rows.push({ agent: a, type: 'Disallow', path: p }); });
        (g.allow || []).forEach(function (p) { rows.push({ agent: a, type: 'Allow', path: p }); });
      });
    });
    return rows;
  }
  function groupsFromRows(rows) {
    var order = [], by = {};
    rows.forEach(function (r) {
      var a = String(r.agent || '').trim();
      if (!a) return;
      if (!by[a]) { by[a] = { agents: [a], disallow: [], allow: [] }; order.push(a); }
      by[a][r.type === 'Allow' ? 'allow' : 'disallow'].push(String(r.path || '').trim());
    });
    return order.map(function (a) { return by[a]; });
  }
  var h = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  function rowHtml(r) {
    return '<div class="rb-row"><input class="input" aria-label="User agent" list="rbAgents" value="' + h(r.agent) + '">' +
      '<select class="input" aria-label="Rule type"><option' + (r.type === 'Disallow' ? ' selected' : '') + '>Disallow</option><option' + (r.type === 'Allow' ? ' selected' : '') + '>Allow</option></select>' +
      '<input class="input" aria-label="Path" placeholder="/path" value="' + h(r.path) + '">' +
      '<button type="button" class="btn ghost sm" data-del aria-label="Remove rule">✕</button></div>';
  }
  function rowsHtml(rows) {
    return rows.map(rowHtml).join('') + '<datalist id="rbAgents">' + ['*'].concat(TESTERS).map(function (t) { return '<option value="' + h(t) + '">'; }).join('') + '</datalist>';
  }
  function auditHtml(notes) {
    if (!notes.length) return '<li class="rb-n rb-ok">No problems found.</li>';
    return notes.map(function (n) {
      return '<li class="rb-n rb-' + n.level + '"><strong>' + (n.line ? 'Line ' + n.line : 'File') + '</strong> ' + h(NOTE[n.code]) + (n.text && n.code !== 'tooBig' ? ' <code>' + h(n.text.slice(0, 80)) + '</code>' : '') + '</li>';
    }).join('');
  }
  function ruleText(r) { return r ? (r.allow ? 'Allow: ' : 'Disallow: ') + r.path : ''; }
  function verdictHtml(r, ua) {
    var head = '<strong class="' + (r.allowed ? 'rb-yes' : 'rb-no') + '">' + (r.allowed ? 'Allowed' : 'Blocked') + '</strong> for ' + h(ua) + ' <code>' + h(r.path) + '</code>: ';
    if (r.reason === 'robots') return head + 'robots.txt itself is always allowed.';
    if (r.reason === 'noGroup') return head + 'no group for this crawler and no * group, so everything is allowed.';
    if (r.reason === 'noRule') return head + 'no rule in the ' + h(r.agent) + ' group matches.';
    return head + 'line ' + r.rule.line + ' <code>' + h(ruleText(r.rule)) + '</code> in the ' + h(r.agent) + ' group is the longest match.';
  }
  function allHtml(text, url) {
    var parsed = parse(text);
    return TESTERS.map(function (ua) {
      var r = test(parsed, url, ua);
      return '<tr><th scope="row">' + h(ua) + '</th><td><strong class="' + (r.allowed ? 'rb-yes' : 'rb-no') + '">' + (r.allowed ? 'Allowed' : 'Blocked') + '</strong>' +
        (r.rule ? '<small>Line ' + r.rule.line + ': ' + h(ruleText(r.rule)) + '</small>' : '') + '</td></tr>';
    }).join('');
  }
  function botChecks(ai) {
    return BOTS.map(function (b) {
      return '<label class="check"><input type="checkbox" name="ai" value="' + h(b.token) + '"' + (ai && ai[b.token] === 'block' ? ' checked' : '') + '> <span><code>' + h(b.token) + '</code> <small>' + h(b.owner + ', ' + PURPOSE[b.purpose].toLowerCase()) + '</small></span></label>';
    }).join('');
  }

  var api = {
    FACTS: FACTS, BOTS: BOTS, PURPOSE: PURPOSE, TESTERS: TESTERS, PRESETS: PRESETS, NOTE: NOTE,
    generate: generate, fromPreset: fromPreset, rowsFromCfg: rowsFromCfg, groupsFromRows: groupsFromRows,
    views: { rowsHtml: rowsHtml, rowHtml: rowHtml, auditHtml: auditHtml, verdictHtml: verdictHtml, allHtml: allHtml, botChecks: botChecks, ruleText: ruleText, esc: h }, parse: parse, test: test, audit: audit, pathOf: pathOf, patternMatches: patternMatches, absolute: absolute
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBRobots = api;
})(typeof self !== 'undefined' ? self : this);
