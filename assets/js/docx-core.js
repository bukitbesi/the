/* Minimal .docx writer shared by the Online Notepad and the PDF Converter. A .docx is a ZIP of XML parts; this
   writes the three parts Word needs (content types, package relationship, document) and expresses headings,
   lists, quotes and code with direct run formatting, so no styles part is required. Needs zip-core.js. */
(function (root) {
  'use strict';
  var Z = typeof module !== 'undefined' && module.exports ? require('./zip-core.js') : root.TBBZip;

  var x = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ''); };
  var SIZE = { 1: 40, 2: 32, 3: 28, 4: 26, 5: 24, 6: 22 };

  function run(r, base) {
    var p = [];
    if (r.b || base.b) p.push('<w:b/>');
    if (r.i || base.i) p.push('<w:i/>');
    if (r.del) p.push('<w:strike/>');
    if (r.code || base.code) p.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>');
    if (r.href) p.push('<w:color w:val="1155CC"/><w:u w:val="single"/>');
    if (base.size) p.push('<w:sz w:val="' + base.size + '"/>');
    var rpr = p.length ? '<w:rPr>' + p.join('') + '</w:rPr>' : '';
    return String(r.text).split('\n').map(function (line, i) {
      return (i ? '<w:r>' + rpr + '<w:br/></w:r>' : '') + '<w:r>' + rpr + '<w:t xml:space="preserve">' + x(line) + '</w:t></w:r>';
    }).join('');
  }
  function para(runs, base, ppr) {
    return '<w:p>' + (ppr ? '<w:pPr>' + ppr + '</w:pPr>' : '') + runs.map(function (r) { return run(r, base || {}); }).join('') + '</w:p>';
  }

  // blocks: [{ t: 'h', level, inl } | { t: 'p', inl } | { t: 'ul'|'ol', items: [{ inl, checked }] } | { t: 'code', text }
  //          | { t: 'quote', inl } | { t: 'hr' } | { t: 'pagebreak' }]; inl: [{ text, b, i, code, del, href }]
  function documentXml(blocks) {
    var body = blocks.map(function (b) {
      if (b.t === 'h') return para(b.inl, { b: true, size: SIZE[b.level] || 24 }, '<w:spacing w:before="240" w:after="120"/><w:keepNext/>');
      if (b.t === 'p') return para(b.inl);
      if (b.t === 'quote') return para(b.inl, { i: true }, '<w:ind w:left="567"/><w:pBdr><w:left w:val="single" w:sz="12" w:space="8" w:color="AAAAAA"/></w:pBdr>');
      if (b.t === 'code') return para([{ text: b.text }], { code: true }, '<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>');
      if (b.t === 'hr') return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="AAAAAA"/></w:pBdr></w:pPr></w:p>';
      if (b.t === 'pagebreak') return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
      if (b.t === 'ul' || b.t === 'ol') return b.items.map(function (it, n) {
        var mark = it.checked === true ? '☑ ' : it.checked === false ? '☐ ' : b.t === 'ol' ? (n + 1) + '. ' : '• ';
        return para([{ text: mark }].concat(it.inl), {}, '<w:ind w:left="567" w:hanging="283"/>');
      }).join('');
      return '';
    }).join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
      (body || '<w:p/>') + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
  }
  function build(blocks, meta) {
    meta = meta || {};
    var now = (meta.date || new Date()).toISOString().replace(/\.\d+Z$/, 'Z');
    return Z.zip([
      { name: '[Content_Types].xml', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>' },
      { name: '_rels/.rels', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>' },
      { name: 'docProps/core.xml', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>' + x(meta.title || '') + '</dc:title><dc:creator>' + x(meta.creator || '') + '</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">' + now + '</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">' + now + '</dcterms:modified></cp:coreProperties>' },
      { name: 'word/document.xml', text: documentXml(blocks) }
    ], meta.date);
  }

  var api = { build: build, documentXml: documentXml };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBDocx = api;
})(typeof self !== 'undefined' ? self : this);
