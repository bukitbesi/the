/* UTM Builder core. Adds Google Analytics 4 campaign parameters to a URL (keeping its other parameters and #fragment),
   cleans values, warns about common mistakes, and predicts the GA4 default channel group from Google's published manual-
   traffic rules (source lists here hold only well-known sites from Google's spreadsheet).
   UMD: module.exports in Node, window.TBBUtm in the browser. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-19' };
  // Order and meaning from Google Analytics Help, "URL builders: collect campaign data with custom URLs".
  var PARAMS = [
    ['utm_source', 'source', true], ['utm_medium', 'medium', true], ['utm_campaign', 'campaign', true], ['utm_id', 'id', false],
    ['utm_term', 'term', false], ['utm_content', 'content', false], ['utm_source_platform', 'platform', false],
    ['utm_creative_format', 'format', false], ['utm_marketing_tactic', 'tactic', false]
  ];
  var SOCIAL = ['facebook', 'fb', 'm.facebook.com', 'instagram', 'ig', 'linkedin', 'twitter', 't.co', 'x.com', 'pinterest', 'reddit', 'threads'];
  var SEARCH = ['google', 'bing', 'yahoo', 'baidu', 'duckduckgo', 'yandex', 'ecosia'];
  var VIDEO = ['youtube', 'vimeo'];
  var SHOPPING = ['amazon', 'ebay', 'walmart', 'etsy'];
  var PAID = /^(.*cp.*|ppc|retargeting|paid.*)$/, SHOP_CAMPAIGN = /^(.*(([^a-df-z]|^)shop|shopping).*)$/;
  var inList = function (v, list) { return list.indexOf(v) >= 0; };

  // GA4 manual-traffic channel rules, checked in the order Google lists them. Values are case-insensitive.
  function channel(source, medium, campaign) {
    var s = String(source || '').trim().toLowerCase(), m = String(medium || '').trim().toLowerCase(), c = String(campaign || '').trim().toLowerCase(), paid = PAID.test(m);
    var rules = [
      ['Direct', s === '(direct)' && (m === '(not set)' || m === '(none)')],
      ['Cross-network', c.indexOf('cross-network') >= 0],
      ['Paid Shopping', (inList(s, SHOPPING) || SHOP_CAMPAIGN.test(c)) && paid],
      ['Paid Search', inList(s, SEARCH) && paid],
      ['Paid Social', inList(s, SOCIAL) && paid],
      ['Paid Video', inList(s, VIDEO) && paid],
      ['Display', inList(m, ['display', 'banner', 'expandable', 'interstitial', 'cpm'])],
      ['Paid Other', paid],
      ['Organic Shopping', inList(s, SHOPPING) || SHOP_CAMPAIGN.test(c)],
      ['Organic Social', inList(s, SOCIAL) || inList(m, ['social', 'social-network', 'social-media', 'sm', 'social network', 'social media'])],
      ['Organic Video', inList(s, VIDEO) || /video/.test(m)],
      ['Organic Search', inList(s, SEARCH) || m === 'organic'],
      ['AI Assistant', m === 'ai-assistant'],
      ['Referral', inList(m, ['referral', 'app', 'link'])],
      ['Email', /^(email|e-mail|e_mail|e mail)$/.test(s) || /^(email|e-mail|e_mail|e mail)$/.test(m)],
      ['Affiliates', m === 'affiliate'],
      ['Audio', m === 'audio'],
      ['SMS', s === 'sms' || m === 'sms'],
      ['Mobile Push Notifications', /push$/.test(m) || /mobile|notification/.test(m) || s === 'firebase']
    ];
    for (var i = 0; i < rules.length; i++) if (rules[i][1]) return rules[i][0];
    return 'Unassigned';
  }

  function cleanValue(v, o) {
    var t = String(v == null ? '' : v).trim();
    if (o && o.lower) t = t.toLowerCase();
    if (o && o.spaces) t = t.replace(/\s+/g, o.spaces);
    return t;
  }

  // Returns { ok, url, error, warnings, channel }.
  function build(base, values, opts) {
    var o = Object.assign({ lower: true, spaces: '_' }, opts), u, raw = String(base || '').trim(), warnings = [];
    if (!raw) return { ok: false, error: 'Enter the page address you are linking to.' };
    if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = 'https://' + raw;
    try { u = new URL(raw); } catch (e) { return { ok: false, error: 'That is not a valid web address.' }; }
    if (!/^https?:$/.test(u.protocol)) return { ok: false, error: 'Use an http or https address.' };
    var v = {};
    PARAMS.forEach(function (p) { v[p[1]] = cleanValue(values[p[1]], o); });
    PARAMS.forEach(function (p) { u.searchParams.delete(p[0]); });
    PARAMS.forEach(function (p) { if (v[p[1]]) u.searchParams.append(p[0], v[p[1]]); });
    PARAMS.filter(function (p) { return p[2] && !v[p[1]]; }).forEach(function (p) { warnings.push('missing:' + p[0]); });
    PARAMS.forEach(function (p) { var x = String(values[p[1]] || ''); if (!o.lower && /[A-Z]/.test(x)) warnings.push('case:' + p[0]); });
    if (v.medium === 'organic' || v.medium === 'referral' || v.medium === '(none)') warnings.push('medium:' + v.medium);
    if (u.searchParams.get('gclid')) warnings.push('gclid');
    var ch = v.source || v.medium || v.campaign ? channel(v.source, v.medium, v.campaign) : '';
    if (ch === 'Unassigned') warnings.push('unassigned');
    // URLSearchParams writes spaces as +; %20 is the form every platform reads the same way.
    return { ok: true, url: u.toString().replace(/\+/g, '%20'), warnings: warnings, channel: ch, values: v };
  }

  // Split a tagged URL back into its base and UTM values.
  function parse(url) {
    var u;
    try { u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(url) ? url : 'https://' + url); } catch (e) { return null; }
    var v = {};
    PARAMS.forEach(function (p) { var x = u.searchParams.get(p[0]); if (x != null) v[p[1]] = x; u.searchParams.delete(p[0]); });
    return { base: u.toString(), values: v };
  }

  var PRESETS = [
    ['Instagram bio', { source: 'instagram', medium: 'social', campaign: 'bio_link' }],
    ['Facebook post', { source: 'facebook', medium: 'social', campaign: '' }],
    ['Facebook ads', { source: 'facebook', medium: 'paid_social', campaign: '' }],
    ['WhatsApp broadcast', { source: 'whatsapp', medium: 'social', campaign: '' }],
    ['Email newsletter', { source: 'newsletter', medium: 'email', campaign: '' }],
    ['TikTok bio', { source: 'tiktok', medium: 'social', campaign: 'bio_link' }],
    ['YouTube description', { source: 'youtube', medium: 'video', campaign: '' }],
    ['Affiliate partner', { source: 'partner_name', medium: 'affiliate', campaign: '' }],
    ['SMS', { source: 'sms', medium: 'sms', campaign: '' }]
  ];

  var api = { FACTS: FACTS, PARAMS: PARAMS, PRESETS: PRESETS, channel: channel, build: build, parse: parse, cleanValue: cleanValue };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBUtm = api;
})(typeof self !== 'undefined' ? self : this);
