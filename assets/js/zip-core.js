/* Minimal ZIP writer (stored entries, UTF-8 names) and CRC-32, shared by the tools that download several files at
   once or build Office files (.docx is a ZIP of XML parts). Stored entries suit already-compressed images and
   keep the code tiny; every reader, including Word, accepts them. */
(function (root) {
  'use strict';

  var CRC = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(b, start, end) {
    var c = 0xffffffff;
    for (var i = start || 0, e = end === undefined ? b.length : end; i < e; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  var utf8 = function (s) { return new TextEncoder().encode(String(s)); };
  var le16 = function (n) { return new Uint8Array([n & 255, (n >> 8) & 255]); };
  var le32 = function (n) { return new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]); };
  function concat(parts) {
    var n = 0, i, o = 0;
    for (i = 0; i < parts.length; i++) n += parts[i].length;
    var out = new Uint8Array(n);
    for (i = 0; i < parts.length; i++) { out.set(parts[i], o); o += parts[i].length; }
    return out;
  }

  // files: [{ name, bytes (Uint8Array) | text (string) }]. Duplicate names get -2, -3 before the extension.
  function zip(files, when) {
    var d = when || new Date(1980, 0, 1);
    var time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    var local = [], central = [], off = 0, used = {};
    files.forEach(function (f) {
      var name = f.name, n = 1;
      while (used[name]) name = f.name.replace(/(\.[^./]*)?$/, '-' + (++n) + '$1');
      used[name] = 1;
      var bytes = f.bytes || utf8(f.text || ''), nb = utf8(name), crc = crc32(bytes), size = bytes.length;
      var common = concat([le16(20), le16(0x0800), le16(0), le16(time), le16(date), le32(crc), le32(size), le32(size), le16(nb.length), le16(0)]);
      var head = concat([le32(0x04034b50), common, nb]);
      local.push(head, bytes);
      central.push(concat([le32(0x02014b50), le16(20), common, le16(0), le16(0), le16(0), le32(0), le32(off), nb]));
      off += head.length + size;
    });
    var cd = concat(central);
    var end = concat([le32(0x06054b50), le16(0), le16(0), le16(files.length), le16(files.length), le32(cd.length), le32(off), le16(0)]);
    return concat(local.concat([cd, end]));
  }

  // Reads a ZIP made of stored or deflated entries; inflate is optional (a function bytes -> bytes) for deflated ones.
  function unzip(b, inflate) {
    var dv = new DataView(b.buffer, b.byteOffset, b.byteLength), end = -1;
    for (var i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { end = i; break; }
    if (end < 0) throw new Error('notZip');
    var count = dv.getUint16(end + 10, true), p = dv.getUint32(end + 16, true), out = [];
    for (var k = 0; k < count; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('badZip');
      var method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true);
      var xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
      var name = new TextDecoder().decode(b.subarray(p + 46, p + 46 + nl));
      var data = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true);
      out.push({ name: name, method: method, bytes: b.subarray(data, data + csize) });
      p += 46 + nl + xl + cl;
    }
    return out.map(function (e) {
      if (e.method === 0) return { name: e.name, bytes: e.bytes };
      if (e.method === 8 && inflate) return { name: e.name, bytes: inflate(e.bytes) };
      return { name: e.name, bytes: null, method: e.method };
    });
  }

  var api = { crc32: crc32, zip: zip, unzip: unzip, concat: concat };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBZip = api;
})(typeof self !== 'undefined' ? self : this);
