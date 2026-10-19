/* Color Contrast Checker core: WCAG 2.2 contrast ratio from relative luminance, pass/fail for text (SC 1.4.3, 1.4.6)
   and non-text (SC 1.4.11), alpha blending, CSS colour parsing (hex, rgb, hsl, names), nearest passing colour, and
   colour-vision-deficiency simulation (Machado, Oliveira and Fernandes 2009, severity 1.0, applied to linear RGB).
   UMD: module.exports in Node, window.TBBContrast in the browser. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-19' };
  // Thresholds from WCAG 2.2: large text is at least 24px (18pt) or 18.66px (14pt) bold.
  var LEVELS = [
    { key: 'aaNormal', label: 'AA normal text', min: 4.5, sc: '1.4.3' },
    { key: 'aaLarge', label: 'AA large text', min: 3, sc: '1.4.3' },
    { key: 'aaaNormal', label: 'AAA normal text', min: 7, sc: '1.4.6' },
    { key: 'aaaLarge', label: 'AAA large text', min: 4.5, sc: '1.4.6' },
    { key: 'ui', label: 'UI components and graphics', min: 3, sc: '1.4.11' }
  ];
  var CVD = {
    protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
    tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]]
  };
  var NAMES = ('aliceblue f0f8ff antiquewhite faebd7 aqua 00ffff aquamarine 7fffd4 azure f0ffff beige f5f5dc bisque ffe4c4 black 000000 blanchedalmond ffebcd blue 0000ff blueviolet 8a2be2 brown a52a2a burlywood deb887 cadetblue 5f9ea0 chartreuse 7fff00 chocolate d2691e coral ff7f50 cornflowerblue 6495ed cornsilk fff8dc crimson dc143c cyan 00ffff darkblue 00008b darkcyan 008b8b darkgoldenrod b8860b darkgray a9a9a9 darkgreen 006400 darkgrey a9a9a9 darkkhaki bdb76b darkmagenta 8b008b darkolivegreen 556b2f darkorange ff8c00 darkorchid 9932cc darkred 8b0000 darksalmon e9967a darkseagreen 8fbc8f darkslateblue 483d8b darkslategray 2f4f4f darkslategrey 2f4f4f darkturquoise 00ced1 darkviolet 9400d3 deeppink ff1493 deepskyblue 00bfff dimgray 696969 dimgrey 696969 dodgerblue 1e90ff firebrick b22222 floralwhite fffaf0 forestgreen 228b22 fuchsia ff00ff gainsboro dcdcdc ghostwhite f8f8ff gold ffd700 goldenrod daa520 gray 808080 green 008000 greenyellow adff2f grey 808080 honeydew f0fff0 hotpink ff69b4 indianred cd5c5c indigo 4b0082 ivory fffff0 khaki f0e68c lavender e6e6fa lavenderblush fff0f5 lawngreen 7cfc00 lemonchiffon fffacd lightblue add8e6 lightcoral f08080 lightcyan e0ffff lightgoldenrodyellow fafad2 lightgray d3d3d3 lightgreen 90ee90 lightgrey d3d3d3 lightpink ffb6c1 lightsalmon ffa07a lightseagreen 20b2aa lightskyblue 87cefa lightslategray 778899 lightslategrey 778899 lightsteelblue b0c4de lightyellow ffffe0 lime 00ff00 limegreen 32cd32 linen faf0e6 magenta ff00ff maroon 800000 mediumaquamarine 66cdaa mediumblue 0000cd mediumorchid ba55d3 mediumpurple 9370db mediumseagreen 3cb371 mediumslateblue 7b68ee mediumspringgreen 00fa9a mediumturquoise 48d1cc mediumvioletred c71585 midnightblue 191970 mintcream f5fffa mistyrose ffe4e1 moccasin ffe4b5 navajowhite ffdead navy 000080 oldlace fdf5e6 olive 808000 olivedrab 6b8e23 orange ffa500 orangered ff4500 orchid da70d6 palegoldenrod eee8aa palegreen 98fb98 paleturquoise afeeee palevioletred db7093 papayawhip ffefd5 peachpuff ffdab9 peru cd853f pink ffc0cb plum dda0dd powderblue b0e0e6 purple 800080 rebeccapurple 663399 red ff0000 rosybrown bc8f8f royalblue 4169e1 saddlebrown 8b4513 salmon fa8072 sandybrown f4a460 seagreen 2e8b57 seashell fff5ee sienna a0522d silver c0c0c0 skyblue 87ceeb slateblue 6a5acd slategray 708090 slategrey 708090 snow fffafa springgreen 00ff7f steelblue 4682b4 tan d2b48c teal 008080 thistle d8bfd8 tomato ff6347 turquoise 40e0d0 violet ee82ee wheat f5deb3 white ffffff whitesmoke f5f5f5 yellow ffff00 yellowgreen 9acd32').split(' ');
  var NAMED = {};
  for (var i = 0; i < NAMES.length; i += 2) NAMED[NAMES[i]] = NAMES[i + 1];

  var clamp = function (x, a, b) { return Math.min(b, Math.max(a, x)); };

  // Parses a CSS colour into { r, g, b (0-255), a (0-1) }, or null.
  function parse(input) {
    var s = String(input == null ? '' : input).trim().toLowerCase(), m;
    if (!s) return null;
    if (Object.prototype.hasOwnProperty.call(NAMED, s)) s = '#' + NAMED[s];
    if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    if ((m = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(s))) {
      var h = m[1];
      if (h.length < 5) h = h.split('').map(function (c) { return c + c; }).join('');
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? Math.round(parseInt(h.slice(6, 8), 16) / 255 * 1000) / 1000 : 1 };
    }
    if ((m = /^(rgba?|hsla?)\(\s*([^)]*)\)$/.exec(s))) {
      var p = m[2].split(/\s*[,/]\s*|\s+/).filter(Boolean);
      if (p.length < 3 || p.length > 4) return null;
      var alpha = p[3] == null ? 1 : /%$/.test(p[3]) ? parseFloat(p[3]) / 100 : parseFloat(p[3]);
      if (isNaN(alpha)) return null;
      if (m[1][0] === 'r') {
        var c = p.slice(0, 3).map(function (v) { return /%$/.test(v) ? parseFloat(v) * 2.55 : parseFloat(v); });
        if (c.some(isNaN)) return null;
        return { r: Math.round(clamp(c[0], 0, 255)), g: Math.round(clamp(c[1], 0, 255)), b: Math.round(clamp(c[2], 0, 255)), a: clamp(alpha, 0, 1) };
      }
      var hh = parseFloat(p[0]), ss = parseFloat(p[1]), ll = parseFloat(p[2]);
      if ([hh, ss, ll].some(isNaN)) return null;
      var rgb = hslToRgb(hh, clamp(ss, 0, 100), clamp(ll, 0, 100));
      rgb.a = clamp(alpha, 0, 1);
      return rgb;
    }
    return null;
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
    var k = function (n) { return (n + h / 30) % 12; }, a = s * Math.min(l, 1 - l);
    var f = function (n) { return Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))); };
    return { r: f(0), g: f(8), b: f(4) };
  }
  function rgbToHsl(c) {
    var r = c.r / 255, g = c.g / 255, b = c.b / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0, l = (mx + mn) / 2;
    var s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 };
  }
  function hex(c) { return '#' + [c.r, c.g, c.b].map(function (v) { return ('0' + Math.round(v).toString(16)).slice(-2); }).join(''); }

  // A translucent colour is composited over the colour behind it before contrast is measured.
  function blend(fg, bg) {
    if (fg.a >= 1) return { r: fg.r, g: fg.g, b: fg.b, a: 1 };
    return { r: Math.round(fg.r * fg.a + bg.r * (1 - fg.a)), g: Math.round(fg.g * fg.a + bg.g * (1 - fg.a)), b: Math.round(fg.b * fg.a + bg.b * (1 - fg.a)), a: 1 };
  }
  var lin = function (v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  var unlin = function (v) { v = clamp(v, 0, 1); return Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)); };
  function luminance(c) { return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b); }
  function ratio(a, b) {
    var x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  // Shown truncated, never rounded up, so 4.499 reads 4.49 and fails like it should.
  function show(r) { return (Math.floor(r * 100) / 100).toFixed(2); }

  function check(fgIn, bgIn) {
    var fg = typeof fgIn === 'string' ? parse(fgIn) : fgIn, bg = typeof bgIn === 'string' ? parse(bgIn) : bgIn;
    if (!fg || !bg) return null;
    var bgSolid = blend(bg, { r: 255, g: 255, b: 255, a: 1 }), fgSolid = blend(fg, bgSolid), r = ratio(fgSolid, bgSolid);
    var res = { fg: fgSolid, bg: bgSolid, ratio: r, text: show(r), translucent: fg.a < 1 || bg.a < 1, pass: {} };
    LEVELS.forEach(function (l) { res.pass[l.key] = r >= l.min; });
    return res;
  }

  // Nearest colour to `c` (changing HSL lightness only, so hue and saturation stay) with at least `target` contrast on `other`.
  function suggest(c, other, target) {
    if (ratio(c, other) >= target) return { color: c, hex: hex(c), ratio: ratio(c, other) };
    var hsl = rgbToHsl(c), best = null;
    [0, 100].forEach(function (end) {
      var lo = hsl.l, hi = end, found = null;
      if (ratio(hslToRgb(hsl.h, hsl.s, end), other) < target) return;
      for (var k = 0; k < 30; k++) {
        var mid = (lo + hi) / 2, col = hslToRgb(hsl.h, hsl.s, mid);
        if (ratio(col, other) >= target) { found = col; hi = mid; } else lo = mid;
      }
      found = found || hslToRgb(hsl.h, hsl.s, end);
      // Rounding to whole RGB values can land just under the target; step once more toward the end.
      for (var step = 0; ratio(found, other) < target && step < 100; step++) found = hslToRgb(hsl.h, hsl.s, rgbToHsl(found).l + (end ? 0.5 : -0.5));
      var dist = Math.abs(rgbToHsl(found).l - hsl.l);
      if (!best || dist < best.dist) best = { color: found, dist: dist };
    });
    return best ? { color: best.color, hex: hex(best.color), ratio: ratio(best.color, other) } : null;
  }

  function simulate(c, type) {
    var m = CVD[type], v = [lin(c.r), lin(c.g), lin(c.b)];
    return { r: unlin(m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2]), g: unlin(m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2]), b: unlin(m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]), a: 1 };
  }

  // Every pair in a palette, for checking a whole set of brand colours at once.
  function matrix(list) {
    var cols = list.map(function (s) { return { input: s, c: parse(s) }; }).filter(function (x) { return x.c; });
    return { colors: cols.map(function (x) { return hex(blend(x.c, { r: 255, g: 255, b: 255, a: 1 })); }), cells: cols.map(function (a) { return cols.map(function (b) { return check(a.c, b.c); }); }) };
  }

  // ---------------------------------------------------------------- HTML views shared by the build and the page
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  function resultHtml(r) {
    if (!r) return '<p class="error">Enter two valid colours, for example #1a1a1a or rgb(26 26 26).</p>';
    var best = r.pass.aaaNormal ? 'Excellent: passes every WCAG level' : r.pass.aaNormal ? 'Good: passes AA for all text' : r.pass.aaLarge ? 'Large text and UI only' : 'Fails WCAG for text';
    return '<div class="ct-ratio"><b>' + r.text + '<small>:1</small></b><span>' + best + (r.translucent ? ' (transparency blended)' : '') + '</span></div>' +
      '<ul class="ct-levels">' + LEVELS.map(function (l) {
        var ok = r.pass[l.key];
        return '<li class="' + (ok ? 'ok' : 'no') + '"><span>' + (ok ? 'Pass' : 'Fail') + '</span>' + esc(l.label) + '<small>' + l.min + ':1 · SC ' + l.sc + '</small></li>';
      }).join('') + '</ul>';
  }
  function cvdRows(r) {
    if (!r) return '';
    return [['Normal vision', null], ['Protanopia (no red cones)', 'protanopia'], ['Deuteranopia (no green cones)', 'deuteranopia'], ['Tritanopia (no blue cones)', 'tritanopia']].map(function (v) {
      var f = v[1] ? simulate(r.fg, v[1]) : r.fg, b = v[1] ? simulate(r.bg, v[1]) : r.bg, x = ratio(f, b);
      return '<tr><th scope="row">' + v[0] + '</th><td><span class="ct-swatch" style="color:' + hex(f) + ';background:' + hex(b) + '">Aa</span></td><td>' + show(x) + ':1</td><td class="' + (x >= 4.5 ? 'rb-yes' : 'rb-no') + '">' + (x >= 4.5 ? 'AA' : x >= 3 ? 'Large only' : 'Fail') + '</td></tr>';
    }).join('');
  }
  function matrixHtml(m) {
    if (m.colors.length < 2) return '<p class="help">Enter at least two colours.</p>';
    return '<table class="data ct-matrix"><thead><tr><th scope="col"><span class="sr-only">Text colour</span></th>' + m.colors.map(function (c) { return '<th scope="col"><i class="ct-chip" style="background:' + c + '"></i>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' +
      m.cells.map(function (row, i) {
        return '<tr><th scope="row"><i class="ct-chip" style="background:' + m.colors[i] + '"></i>' + m.colors[i] + '</th>' + row.map(function (r, j) {
          if (i === j) return '<td class="ct-same">–</td>';
          return '<td style="color:' + m.colors[i] + ';background:' + m.colors[j] + '"><b>' + r.text + '</b><small>' + (r.pass.aaaNormal ? 'AAA' : r.pass.aaNormal ? 'AA' : r.pass.aaLarge ? 'AA large' : 'Fail') + '</small></td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table>';
  }

  var api = {
    FACTS: FACTS, LEVELS: LEVELS, CVD: CVD, parse: parse, hex: hex, hslToRgb: hslToRgb, rgbToHsl: rgbToHsl, blend: blend, luminance: luminance,
    ratio: ratio, show: show, check: check, suggest: suggest, simulate: simulate, matrix: matrix,
    views: { resultHtml: resultHtml, cvdRows: cvdRows, matrixHtml: matrixHtml, esc: esc }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBContrast = api;
})(typeof self !== 'undefined' ? self : this);
