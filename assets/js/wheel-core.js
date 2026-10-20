/* Spin the wheel and lucky draw (cabutan bertuah). Entries are one per line; "Name x3" or "Name*3" gives three times
   the chance. Picks use crypto.getRandomValues in the browser (rejection sampling, no modulo bias), so every
   entry's chance is exactly its weight ÷ the total. The wheel's landing angle is worked out from the winner, so the
   animation always stops on the drawn slice. A lucky draw picks several winners without repeats. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-20', maxEntries: 500, maxWeight: 100 };
  var PRESETS = {
    yesno: { en: ['Yes', 'No'], ms: ['Ya', 'Tidak'] },
    numbers: { en: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], ms: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
    food: { en: ['Nasi lemak', 'Roti canai', 'Mee goreng mamak', 'Nasi kandar', 'Char kuey teow', 'Laksa', 'Chicken rice', 'Satay', 'Nasi ayam', 'Burger'],
      ms: ['Nasi lemak', 'Roti canai', 'Mi goreng mamak', 'Nasi kandar', 'Char kuey teow', 'Laksa', 'Nasi ayam', 'Sate', 'Nasi kerabu', 'Burger'] },
    names: { en: ['Aisyah', 'Ben', 'Chong', 'Devi', 'Farid', 'Grace', 'Hafiz', 'Imran'], ms: ['Aisyah', 'Ben', 'Chong', 'Devi', 'Farid', 'Grace', 'Hafiz', 'Imran'] }
  };
  var COLORS = ['#e63946', '#f4a261', '#2a9d8f', '#457b9d', '#8e44ad', '#e9c46a', '#06d6a0', '#ef476f', '#118ab2', '#ff7f50', '#6a994e', '#b5179e'];

  // "Ali x3", "Ali*3", "Ali (3)" → weight 3. Blank lines and "#" comments are ignored.
  function parse(text) {
    var out = [];
    String(text || '').split(/\r?\n/).forEach(function (line) {
      var t = line.trim();
      if (!t || t.charAt(0) === '#') return;
      var m = t.match(/^(.*?)\s*(?:[x×*]\s*(\d+)|\((\d+)\))\s*$/i), name = t, w = 1;
      if (m && m[1]) { name = m[1].trim(); w = Number(m[2] || m[3]); }
      w = Math.max(1, Math.min(FACTS.maxWeight, Math.round(w) || 1));
      if (name && out.length < FACTS.maxEntries) out.push({ name: name, weight: w });
    });
    return out;
  }
  function total(entries) { return entries.reduce(function (s, e) { return s + e.weight; }, 0); }
  function chances(entries) { var t = total(entries); return entries.map(function (e) { return t ? e.weight / t : 0; }); }

  // Uniform integer in [0, n) from a 32-bit source, rejecting the biased tail.
  function randInt(n, rand32) {
    var limit = Math.floor(4294967296 / n) * n, x;
    do { x = rand32(); } while (x >= limit);
    return x % n;
  }
  function cryptoRand32() {
    var c = root.crypto || (typeof require === 'function' ? require('crypto').webcrypto : null), a = new Uint32Array(1);
    c.getRandomValues(a); return a[0];
  }
  function pickIndex(entries, rand32) {
    var t = total(entries); if (!t) return -1;
    var r = randInt(t, rand32 || cryptoRand32), acc = 0;
    for (var i = 0; i < entries.length; i++) { acc += entries[i].weight; if (r < acc) return i; }
    return entries.length - 1;
  }
  // Several winners without repeats (each draw removes the winner's whole entry).
  function draw(entries, n, rand32) {
    var pool = entries.slice(), winners = [];
    n = Math.max(1, Math.min(pool.length, Math.round(Number(n) || 1)));
    while (winners.length < n && pool.length) { var i = pickIndex(pool, rand32); winners.push(pool[i].name); pool.splice(i, 1); }
    return winners;
  }

  // Slice angles in degrees, clockwise from the top pointer.
  function slices(entries) {
    var t = total(entries), a = 0;
    return entries.map(function (e, i) { var span = t ? 360 * e.weight / t : 0, s = { start: a, end: a + span, mid: a + span / 2, color: COLORS[i % COLORS.length] }; a += span; return s; });
  }
  // Rotation that brings the winner's slice under the pointer (at the top), after `turns` full spins, with a random
  // offset inside the slice so it never lands on a border. `current` is the wheel's present rotation.
  function landing(entries, index, current, turns, frac) {
    var s = slices(entries)[index], inside = s.start + (s.end - s.start) * (0.15 + 0.7 * (frac === undefined ? 0.5 : frac));
    var base = Math.ceil(((current || 0) + 1) / 360) * 360;
    return base + 360 * (turns || 5) + (360 - inside) % 360;
  }
  // Which slice is under the pointer at a given rotation (for checks and the live label).
  function at(entries, rotation) {
    var deg = ((360 - (rotation % 360)) % 360 + 360) % 360, list = slices(entries);
    for (var i = 0; i < list.length; i++) if (deg >= list[i].start && deg < list[i].end) return i;
    return list.length - 1;
  }
  function shuffle(entries, rand32) {
    var a = entries.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = randInt(i + 1, rand32 || cryptoRand32), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function serialize(entries) { return entries.map(function (e) { return e.weight > 1 ? e.name + ' x' + e.weight : e.name; }).join('\n'); }

  var api = { FACTS: FACTS, PRESETS: PRESETS, COLORS: COLORS, parse: parse, total: total, chances: chances, randInt: randInt, pickIndex: pickIndex, draw: draw, slices: slices, landing: landing, at: at, shuffle: shuffle, serialize: serialize };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBWheel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
