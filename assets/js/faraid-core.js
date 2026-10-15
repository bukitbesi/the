/* Faraid (Islamic inheritance) under the Shafi'i school as applied in Malaysia. Fixed shares (ashab al-furud), residuaries
   (asabah bin-nafs, bil-ghair and ma'al-ghair), exclusion (hajb hirman) and reduction (hajb nuqsan), 'awl when the
   shares exceed the estate, the two Umariyyatain cases (mother takes 1/3 of what is left after the spouse), and the
   musytarakah case (full brothers share the uterine siblings' 1/3). A residue with no residuary goes to Baitulmal or is
   returned (radd) to the fixed heirs other than spouses, by the option passed in. Cases with a paternal grandfather and
   full or consanguine siblings (muqasamah) are returned as 'special' for the Syariah Court. Before distribution:
   harta sepencarian, funeral costs, debts, then a bequest (wasiat) of at most 1/3 of what remains. Verified 15 October 2026. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-15', wasiatMax: [1, 3] };
  // Heir keys in display order, with the maximum count allowed.
  var HEIRS = [['husband', 1], ['wife', 4], ['son', 20], ['daughter', 20], ['grandson', 20], ['granddaughter', 20], ['father', 1], ['mother', 1],
    ['grandfather', 1], ['grandmotherF', 1], ['grandmotherM', 1], ['brother', 20], ['sister', 20], ['brotherF', 20], ['sisterF', 20], ['brotherM', 20], ['sisterM', 20],
    ['nephew', 20], ['nephewF', 20], ['uncle', 20], ['uncleF', 20], ['cousin', 20], ['cousinF', 20]];
  var LABELS = {
    ms: { husband: 'Suami', wife: 'Isteri', son: 'Anak lelaki', daughter: 'Anak perempuan', grandson: 'Cucu lelaki (dari anak lelaki)', granddaughter: 'Cucu perempuan (dari anak lelaki)',
      father: 'Bapa', mother: 'Ibu', grandfather: 'Datuk (bapa kepada bapa)', grandmotherF: 'Nenek (ibu kepada bapa)', grandmotherM: 'Nenek (ibu kepada ibu)',
      brother: 'Saudara lelaki seibu sebapa', sister: 'Saudara perempuan seibu sebapa', brotherF: 'Saudara lelaki sebapa', sisterF: 'Saudara perempuan sebapa',
      brotherM: 'Saudara lelaki seibu', sisterM: 'Saudara perempuan seibu', nephew: 'Anak saudara lelaki (seibu sebapa)', nephewF: 'Anak saudara lelaki (sebapa)',
      uncle: 'Bapa saudara seibu sebapa (sebelah bapa)', uncleF: 'Bapa saudara sebapa (sebelah bapa)', cousin: 'Sepupu lelaki (anak bapa saudara seibu sebapa)', cousinF: 'Sepupu lelaki (anak bapa saudara sebapa)' },
    en: { husband: 'Husband', wife: 'Wife (wives)', son: 'Son', daughter: 'Daughter', grandson: "Son's son", granddaughter: "Son's daughter",
      father: 'Father', mother: 'Mother', grandfather: 'Paternal grandfather', grandmotherF: 'Paternal grandmother', grandmotherM: 'Maternal grandmother',
      brother: 'Full brother', sister: 'Full sister', brotherF: 'Consanguine brother (same father)', sisterF: 'Consanguine sister (same father)',
      brotherM: 'Uterine brother (same mother)', sisterM: 'Uterine sister (same mother)', nephew: "Full brother's son", nephewF: "Consanguine brother's son",
      uncle: 'Full paternal uncle', uncleF: 'Consanguine paternal uncle', cousin: "Full paternal uncle's son", cousinF: "Consanguine paternal uncle's son" }
  };
  var MALE = { husband: 1, son: 1, grandson: 1, father: 1, grandfather: 1, brother: 1, brotherF: 1, brotherM: 1, nephew: 1, nephewF: 1, uncle: 1, uncleF: 1, cousin: 1, cousinF: 1 };

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a || 1; }
  function F(n, d) { if (d < 0) { n = -n; d = -d; } var g = gcd(n, d); return { n: n / g, d: d / g }; }
  function add(a, b) { return F(a.n * b.d + b.n * a.d, a.d * b.d); }
  function sub(a, b) { return F(a.n * b.d - b.n * a.d, a.d * b.d); }
  function mul(a, b) { return F(a.n * b.n, a.d * b.d); }
  function div(a, b) { return F(a.n * b.d, a.d * b.n); }
  function cmp(a, b) { return a.n * b.d - b.n * a.d; }
  var ZERO = F(0, 1), ONE = F(1, 1);
  function lcm(a, b) { return a / gcd(a, b) * b; }

  function counts(input) {
    var c = {};
    HEIRS.forEach(function (h) { var v = Math.floor(Number(input[h[0]]) || 0); c[h[0]] = Math.max(0, Math.min(h[1], v)); });
    if (c.husband && c.wife) c.wife = 0; // the deceased is either a woman (husband) or a man (wives)
    return c;
  }

  function solve(input) {
    var c = counts(input), out = {}, notes = [];
    var maleDesc = c.son + c.grandson > 0, femaleDesc = c.daughter + c.granddaughter > 0, desc = maleDesc || femaleDesc;
    var siblingsAll = c.brother + c.sister + c.brotherF + c.sisterF + c.brotherM + c.sisterM;

    // Exclusion (hajb hirman).
    var b = {};
    if (c.son) b.grandson = b.granddaughter = 1;
    if (c.father) b.grandfather = b.grandmotherF = 1;
    if (c.mother) b.grandmotherF = b.grandmotherM = 1;
    if (!c.son && !c.grandson && c.daughter >= 2) b.granddaughter = 1;
    var upMale = c.father || (c.grandfather && !b.grandfather);
    if (maleDesc || c.father) b.brother = b.sister = b.brotherF = b.sisterF = 1;
    if (desc || upMale) b.brotherM = b.sisterM = 1;
    if (c.brother) b.brotherF = b.sisterF = 1;
    var sisAsabah = !b.sister && c.sister && !c.brother && femaleDesc; // full sister with daughters (ma'al ghair)
    if (sisAsabah) b.brotherF = b.sisterF = 1;
    if (!b.sisterF && !c.brotherF && c.sister >= 2 && !c.brother) b.sisterF = 1;
    var collaterals = ['nephew', 'nephewF', 'uncle', 'uncleF', 'cousin', 'cousinF'];
    var stop = maleDesc || upMale || (!b.brother && c.brother) || (!b.brotherF && c.brotherF) || sisAsabah || (!b.sisterF && c.sisterF && !c.brotherF && femaleDesc);
    collaterals.forEach(function (k, i) {
      if (stop) b[k] = 1;
      else if (c[k]) { collaterals.slice(i + 1).forEach(function (x) { b[x] = 1; }); stop = true; }
    });
    var has = function (k) { return c[k] > 0 && !b[k]; };

    // Grandfather with full or consanguine siblings (muqasamah) needs a court ruling.
    if (has('grandfather') && (c.brother + c.sister + c.brotherF + c.sisterF) > 0 && !maleDesc) {
      return { special: 'grandfather', counts: c };
    }

    // Fixed shares.
    var fard = {};
    if (has('husband')) fard.husband = desc ? F(1, 4) : F(1, 2);
    if (has('wife')) fard.wife = desc ? F(1, 8) : F(1, 4);
    var spouse = fard.husband || fard.wife || ZERO;
    var father = has('father') ? 'father' : has('grandfather') ? 'grandfather' : null;
    if (father && desc) fard[father] = F(1, 6);
    var umariyyah = has('mother') && has('father') && !desc && siblingsAll < 2 && (has('husband') || has('wife'));
    if (has('mother')) {
      if (desc || siblingsAll >= 2) fard.mother = F(1, 6);
      else if (umariyyah) fard.mother = mul(sub(ONE, spouse), F(1, 3));
      else fard.mother = F(1, 3);
    }
    if (has('grandmotherF') || has('grandmotherM')) {
      var gm = (has('grandmotherF') ? 1 : 0) + (has('grandmotherM') ? 1 : 0);
      if (has('grandmotherF')) fard.grandmotherF = F(1, 6 * gm);
      if (has('grandmotherM')) fard.grandmotherM = F(1, 6 * gm);
    }
    if (has('daughter') && !c.son) fard.daughter = c.daughter === 1 ? F(1, 2) : F(2, 3);
    if (has('granddaughter') && !c.grandson) {
      if (!c.daughter) fard.granddaughter = c.granddaughter === 1 ? F(1, 2) : F(2, 3);
      else if (c.daughter === 1) fard.granddaughter = F(1, 6);
    }
    var uterine = (has('brotherM') ? c.brotherM : 0) + (has('sisterM') ? c.sisterM : 0);
    if (uterine) {
      var u = uterine === 1 ? F(1, 6) : F(1, 3);
      if (has('brotherM')) fard.brotherM = mul(u, F(c.brotherM, uterine));
      if (has('sisterM')) fard.sisterM = mul(u, F(c.sisterM, uterine));
    }
    if (has('sister') && !c.brother && !femaleDesc) fard.sister = c.sister === 1 ? F(1, 2) : F(2, 3);
    if (has('sisterF') && !c.brotherF && !femaleDesc) {
      if (!c.sister) fard.sisterF = c.sisterF === 1 ? F(1, 2) : F(2, 3);
      else if (c.sister === 1 && !c.brother) fard.sisterF = F(1, 6);
    }

    var total = Object.keys(fard).reduce(function (s, k) { return add(s, fard[k]); }, ZERO);
    var awl = cmp(total, ONE) > 0;
    var residue = awl ? ZERO : sub(ONE, total);

    // Residuaries, highest class first: [members with weight].
    var groups = [
      [['son', 2], ['daughter', 1]], [['grandson', 2], ['granddaughter', 1]], [['father', 1]], [['grandfather', 1]],
      [['brother', 2], ['sister', 1]], [['brotherF', 2], ['sisterF', 1]]
    ];
    var asabah = null;
    for (var i = 0; i < groups.length && !asabah; i++) {
      var g = groups[i].filter(function (x) { return has(x[0]) && (MALE[x[0]] || groups[i].some(function (y) { return MALE[y[0]] && has(y[0]); })); });
      if (g.length && g.some(function (x) { return MALE[x[0]]; })) asabah = g;
    }
    if (!asabah && femaleDesc && has('sister')) asabah = [['sister', 1]];
    if (!asabah && femaleDesc && has('sisterF')) asabah = [['sisterF', 1]];
    if (!asabah) collaterals.forEach(function (k) { if (!asabah && has(k)) asabah = [[k, 1]]; });

    // Musytarakah: husband, mother or grandmother, 2+ uterine siblings and full brothers left with nothing.
    var musy = asabah && asabah[0][0] === 'brother' && has('husband') && (has('mother') || has('grandmotherF') || has('grandmotherM')) && uterine >= 2 && cmp(residue, ZERO) <= 0;
    var share = {};
    Object.keys(fard).forEach(function (k) { share[k] = awl ? div(fard[k], total) : fard[k]; });
    if (musy) {
      var pool = F(1, 3), heads = uterine + c.brother + c.sister;
      ['brotherM', 'sisterM'].forEach(function (k) { if (share[k]) share[k] = mul(pool, F(c[k], heads)); });
      share.brother = mul(pool, F(c.brother, heads)); if (c.sister) share.sister = mul(pool, F(c.sister, heads));
      notes.push('musytarakah'); asabah = null;
    } else if (asabah && cmp(residue, ZERO) > 0) {
      var units = asabah.reduce(function (s, x) { return s + x[1] * c[x[0]]; }, 0);
      asabah.forEach(function (x) { share[x[0]] = add(share[x[0]] || ZERO, mul(residue, F(x[1] * c[x[0]], units))); });
      residue = ZERO;
    }
    var baitulmal = ZERO;
    if (cmp(residue, ZERO) > 0) {
      var keys = Object.keys(share).filter(function (k) { return k !== 'husband' && k !== 'wife'; });
      if (input.residue === 'radd' && keys.length) {
        var base = keys.reduce(function (s, k) { return add(s, share[k]); }, ZERO);
        keys.forEach(function (k) { share[k] = add(share[k], mul(residue, div(share[k], base))); });
        notes.push('radd');
      } else { baitulmal = residue; notes.push('baitulmal'); }
    }
    if (awl) notes.push('awl');
    if (umariyyah) notes.push('umariyyah');

    // Common denominator for the shares (saham) of each person.
    var D = baitulmal.n ? baitulmal.d : 1;
    var list = HEIRS.map(function (h) { return h[0]; }).filter(function (k) { return c[k] > 0; }).map(function (k) {
      var s = share[k] || ZERO, per = c[k] ? div(s, F(c[k], 1)) : ZERO;
      D = lcm(D, per.d);
      return { key: k, count: c[k], blocked: !!b[k], share: s, per: per };
    });
    list.forEach(function (x) { x.saham = x.per.n * (D / x.per.d); });
    var asal = Object.keys(fard).reduce(function (s, k) { return lcm(s, fard[k].d); }, 1);
    return { counts: c, list: list, fard: fard, awl: awl, awlBase: awl ? total.n * (asal / total.d) : null, asal: asal, baitulmal: baitulmal,
      baitulmalSaham: baitulmal.n ? baitulmal.n * (D / baitulmal.d) : 0, D: D, notes: notes };
  }

  // Money: harta sepencarian, funeral, debts, then wasiat capped at a third; the rest by faraid.
  function calculate(input) {
    var r = solve(input), num = function (v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; };
    var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
    var gross = num(input.estate), sep = Math.min(gross, num(input.sepencarian));
    var afterSep = gross - sep, funeral = Math.min(afterSep, num(input.funeral)), debts = Math.min(afterSep - funeral, num(input.debts));
    var left = afterSep - funeral - debts, wasiatMax = cents(left / 3), wasiat = Math.min(wasiatMax, num(input.wasiat));
    var net = cents(left - wasiat);
    r.money = { gross: cents(gross), sepencarian: cents(sep), funeral: cents(funeral), debts: cents(debts), wasiat: cents(wasiat), wasiatMax: wasiatMax,
      wasiatCut: num(input.wasiat) > wasiatMax, net: net };
    if (!r.special) {
      r.list.forEach(function (x) { x.amount = cents(net * x.share.n / x.share.d); x.each = cents(net * x.per.n / x.per.d); });
      r.money.baitulmal = cents(net * r.baitulmal.n / r.baitulmal.d);
    }
    return r;
  }

  var api = { FACTS: FACTS, HEIRS: HEIRS, LABELS: LABELS, solve: solve, calculate: calculate, F: F };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBFaraid = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
