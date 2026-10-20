/* HTML Table Generator core. Imports CSV, tab-separated text (pasted from Excel or Google Sheets) and Markdown tables,
   and writes accessible HTML (caption, thead, th with scope), a scoped stylesheet or inline styles, Markdown and CSV.
   UMD: module.exports in Node, window.TBBTable in the browser. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-19' };
  var THEMES = {
    clean: { label: 'Clean', head: '#f3f4f8', headText: '#1a1a2e', border: '#d9dce6', stripe: '', radius: 8 },
    striped: { label: 'Striped', head: '#4a3cc2', headText: '#ffffff', border: '#e3e5ee', stripe: '#f5f6fb', radius: 8 },
    bordered: { label: 'Bordered', head: '#ffffff', headText: '#12131a', border: '#9aa0b4', stripe: '', radius: 0 },
    minimal: { label: 'Minimal', head: '', headText: '#12131a', border: '#e3e5ee', stripe: '', radius: 0 },
    green: { label: 'Green', head: '#08807c', headText: '#ffffff', border: '#cfe3e2', stripe: '#f1f8f7', radius: 8 }
  };
  var DEFAULTS = { header: true, firstCol: false, caption: '', theme: 'clean', inline: false, responsive: true, alignNumbers: true, cls: 'tbb-table' };

  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // RFC 4180 CSV with any one-character delimiter; quoted fields may hold delimiters, quotes ("") and line breaks.
  function parseDelimited(text, d) {
    var rows = [], row = [], f = '', q = false, s = String(text).replace(/\r\n?/g, '\n');
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (q) {
        if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
      } else if (c === '"' && f === '') q = true;
      else if (c === d) { row.push(f); f = ''; }
      else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
      else f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows;
  }
  function parseMarkdown(text) {
    var lines = String(text).trim().split(/\r?\n/).filter(function (l) { return /\|/.test(l); });
    return lines.filter(function (l) { return !/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l); })
      .map(function (l) { return l.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map(function (c) { return c.trim().replace(/\\\|/g, '|'); }); });
  }
  // Detects Markdown, tabs, semicolons or commas, and returns a rectangular array (short rows padded).
  function parse(text) {
    var t = String(text || '').replace(/^﻿/, '');
    if (!t.trim()) return [];
    var first = t.split('\n')[0], rows;
    if (/^\s*\|.*\|\s*$/.test(first) && /\n\s*\|?\s*:?-{2,}/.test(t)) rows = parseMarkdown(t);
    else {
      var d = first.indexOf('\t') >= 0 ? '\t' : (first.split(';').length > first.split(',').length ? ';' : ',');
      rows = parseDelimited(t.replace(/\n+$/, ''), d);
    }
    return pad(rows.map(function (r) { return r.map(function (c) { return c.trim(); }); }));
  }
  function pad(rows) {
    var w = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    return rows.map(function (r) { r = r.slice(); while (r.length < w) r.push(''); return r; });
  }
  var isNum = function (s) { return /^\s*[-+]?(RM|\$|€|£)?\s?[\d,]*\.?\d+\s*(%|k|m)?\s*$/i.test(s) && /\d/.test(s); };
  // A column is numeric when every non-empty body cell looks like a number (so it is right-aligned).
  function numericCols(rows, header) {
    var body = header ? rows.slice(1) : rows, w = rows[0] ? rows[0].length : 0, out = [];
    for (var c = 0; c < w; c++) {
      var vals = body.map(function (r) { return r[c]; }).filter(function (v) { return v !== ''; });
      out.push(vals.length > 0 && vals.every(isNum));
    }
    return out;
  }

  function css(o) {
    var T = THEMES[o.theme] || THEMES.clean, c = '.' + o.cls;
    return (o.responsive ? c + '-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}\n' : '') +
      c + '{width:100%;border-collapse:collapse;font-size:15px;line-height:1.5' + (T.radius ? ';border-radius:' + T.radius + 'px;overflow:hidden' : '') + '}\n' +
      c + ' caption{caption-side:top;text-align:left;font-weight:700;padding:8px 0}\n' +
      c + ' th,' + c + ' td{padding:10px 12px;border' + (o.theme === 'minimal' ? '-bottom' : '') + ':1px solid ' + T.border + ';text-align:left;vertical-align:top}\n' +
      c + ' thead th{' + (T.head ? 'background:' + T.head + ';' : '') + 'color:' + T.headText + ';font-weight:700}\n' +
      (T.stripe ? c + ' tbody tr:nth-child(even){background:' + T.stripe + '}\n' : '') +
      c + ' .num{text-align:right;font-variant-numeric:tabular-nums}\n';
  }
  function inlineStyle(o, part, num) {
    var T = THEMES[o.theme] || THEMES.clean, b = (o.theme === 'minimal' ? 'border-bottom' : 'border') + ':1px solid ' + T.border;
    if (part === 'table') return 'width:100%;border-collapse:collapse;font-size:15px;line-height:1.5';
    if (part === 'caption') return 'text-align:left;font-weight:700;padding:8px 0';
    var s = 'padding:10px 12px;' + b + ';text-align:' + (num ? 'right' : 'left') + ';vertical-align:top';
    if (part === 'head') s += (T.head ? ';background:' + T.head : '') + ';color:' + T.headText + ';font-weight:700';
    if (part === 'stripe' && T.stripe) s += ';background:' + T.stripe;
    return s;
  }

  function html(rows, opts) {
    var o = Object.assign({}, DEFAULTS, opts);
    rows = pad(rows || []);
    if (!rows.length) return '';
    var nums = o.alignNumbers ? numericCols(rows, o.header) : [], head = o.header ? rows[0] : null, body = o.header ? rows.slice(1) : rows;
    var attr = function (part, num) { return o.inline ? ' style="' + inlineStyle(o, part, num) + '"' : (num ? ' class="num"' : ''); };
    var cell = function (v) { return esc(v).replace(/\n/g, '<br>'); };
    var out = [];
    out.push('<table' + (o.inline ? ' style="' + inlineStyle(o, 'table') + '"' : ' class="' + esc(o.cls) + '"') + '>');
    if (o.caption) out.push('  <caption' + (o.inline ? ' style="' + inlineStyle(o, 'caption') + '"' : '') + '>' + esc(o.caption) + '</caption>');
    if (head) out.push('  <thead>\n    <tr>' + head.map(function (v, i) { return '<th scope="col"' + attr('head', nums[i]) + '>' + cell(v) + '</th>'; }).join('') + '</tr>\n  </thead>');
    out.push('  <tbody>');
    body.forEach(function (r, ri) {
      out.push('    <tr>' + r.map(function (v, i) {
        var part = o.inline && ri % 2 === 1 ? 'stripe' : 'cell';
        return i === 0 && o.firstCol ? '<th scope="row"' + attr(part, nums[i]) + '>' + cell(v) + '</th>' : '<td' + attr(part, nums[i]) + '>' + cell(v) + '</td>';
      }).join('') + '</tr>');
    });
    out.push('  </tbody>\n</table>');
    var table = out.join('\n');
    if (o.responsive) table = '<div' + (o.inline ? ' style="overflow-x:auto"' : ' class="' + esc(o.cls) + '-wrap"') + '>\n' + table + '\n</div>';
    return o.inline ? table : '<style>\n' + css(o) + '</style>\n' + table;
  }

  function markdown(rows, opts) {
    var o = Object.assign({}, DEFAULTS, opts);
    rows = pad(rows || []);
    if (!rows.length) return '';
    var nums = o.alignNumbers ? numericCols(rows, true) : [], cell = function (v) { return String(v).replace(/\|/g, '\\|').replace(/\n/g, '<br>'); };
    var head = rows[0], line = function (r) { return '| ' + r.map(cell).join(' | ') + ' |'; };
    return [line(head), '| ' + head.map(function (_, i) { return nums[i] ? '---:' : '---'; }).join(' | ') + ' |'].concat(rows.slice(1).map(line)).join('\n') + '\n';
  }
  function csv(rows) {
    return pad(rows || []).map(function (r) { return r.map(function (v) { return /[",\n\r]|^\s|\s$/.test(v) ? '"' + String(v).replace(/"/g, '""') + '"' : v; }).join(','); }).join('\r\n') + '\r\n';
  }

  // The editable grid (one input per cell); header cells get a tint so the header choice is visible.
  function gridHtml(rows, o) {
    return '<table class="tg-grid" role="presentation"><tbody>' + rows.map(function (r, ri) {
      return '<tr>' + r.map(function (v, ci) {
        var head = (o.header && ri === 0) || (o.firstCol && ci === 0);
        return '<td' + (head ? ' class="tg-h"' : '') + '><input value="' + esc(v) + '" data-r="' + ri + '" data-c="' + ci + '" aria-label="Row ' + (ri + 1) + ', column ' + (ci + 1) + '" autocomplete="off"></td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody></table>';
  }

  var api = { views: { gridHtml: gridHtml }, FACTS: FACTS, THEMES: THEMES, DEFAULTS: DEFAULTS, parse: parse, parseDelimited: parseDelimited, pad: pad, numericCols: numericCols, css: css, html: html, markdown: markdown, csv: csv, esc: esc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBTable = api;
})(typeof self !== 'undefined' ? self : this);
