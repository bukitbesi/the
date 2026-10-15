/* Shoe sizes from foot length, and between UK, EU, US and Mondopoint. The shoe last is the foot plus about 2/3 inch
   (2 barleycorns, 1.7 cm) for adults and 1.2 cm for children. UK adult = 3 × last (inches) − 25; UK child = 3 × last
   − 12 (0 to 13.5, then adult 1); EU (Paris point) = 1.5 × last (cm); US men = UK + 1; US women = UK + 2; Mondopoint =
   foot length in mm (ISO 9407). Brand charts differ by up to half a UK/US size (about one EU size): adidas and New
   Balance use US men = UK + 0.5, and US women runs UK + 1.5 to + 2.5. Malaysian shops mostly label UK and EU. Verified 15 October 2026. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-15', inch: 2.54, allowance: 2 / 3 * 2.54, childAllowance: 1.2, usMen: 1, usWomen: 2 };
  var half = function (n) { return Math.round(n * 2) / 2; };
  var num = function (v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; };

  // Sizes for a foot length in cm.
  function fromFoot(cm) {
    cm = num(cm);
    if (!cm) return null;
    var lastA = (cm + FACTS.allowance) / FACTS.inch, ukA = 3 * lastA - 25;
    if (ukA >= 0.75) {
      var uk = half(ukA);
      return { foot: cm, mm: Math.round(cm * 10), kids: false, uk: uk, eu: half(1.5 * (cm + FACTS.allowance)), usM: uk + FACTS.usMen, usW: uk + FACTS.usWomen };
    }
    var lastC = (cm + FACTS.childAllowance) / FACTS.inch, ukC = Math.max(0, Math.min(13.5, half(3 * lastC - 12)));
    return { foot: cm, mm: Math.round(cm * 10), kids: true, uk: ukC, eu: half(1.5 * (cm + FACTS.childAllowance)), usM: null, usW: null };
  }

  // Foot length in cm for a size in one system ('uk', 'eu', 'usM', 'usW', 'mm', 'ukKids').
  function toFoot(system, size) {
    size = Number(size);
    if (!isFinite(size)) return null;
    if (system === 'mm') return size / 10;
    if (system === 'eu') return size / 1.5 - FACTS.allowance;
    if (system === 'ukKids') return (size + 12) / 3 * FACTS.inch - FACTS.childAllowance;
    var uk = system === 'usM' ? size - FACTS.usMen : system === 'usW' ? size - FACTS.usWomen : size;
    return (uk + 25) / 3 * FACTS.inch - FACTS.allowance;
  }

  function convert(input) {
    var foot = input.mode === 'size' ? toFoot(input.system, input.size) : num(input.foot);
    var r = fromFoot(foot);
    if (r) r.foot = Math.round(foot * 10) / 10;
    return r;
  }

  var api = { FACTS: FACTS, fromFoot: fromFoot, toFoot: toFoot, convert: convert };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBKasut = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
