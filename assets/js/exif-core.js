/* EXIF / photo metadata reader, remover and writer shared by the EXIF Editor and EXIF Remover pages, the build
   and the tests. Works on raw bytes (Uint8Array) for JPEG, PNG and WebP and never decodes or re-encodes pixels:
   removing or editing metadata copies the compressed image data byte for byte, so there is no quality loss.
   Reads EXIF (IFD0, Exif, GPS, Interop, IFD1 thumbnail), XMP, IPTC IIM, ICC, comments, PNG text, C2PA and
   trailing data. Writes EXIF and an XMP packet with the IPTC fields Google Images shows (Creator, Credit Line,
   Copyright Notice, Web Statement of Rights, Licensor URL). */
(function (root) {
  'use strict';

  var FACTS = { verified: '2026-10-17', maxBytes: 50 * 1024 * 1024, maxSegment: 65533 };
  var enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  var utf8 = function (s) { return enc.encode(String(s)); };
  var decode = function (b) { return new TextDecoder('utf-8').decode(b); };
  var latin1 = function (b) { var s = ''; for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return s; };
  var ascii = function (s) { var b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255; return b; };

  function concat(parts) {
    var n = 0, i, o = 0;
    for (i = 0; i < parts.length; i++) n += parts[i].length;
    var out = new Uint8Array(n);
    for (i = 0; i < parts.length; i++) { out.set(parts[i], o); o += parts[i].length; }
    return out;
  }
  var u16be = function (b, i) { return (b[i] << 8) | b[i + 1]; };
  var u32be = function (b, i) { return ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3]; };
  var u32le = function (b, i) { return ((b[i + 3] << 24) >>> 0) + (b[i + 2] << 16) + (b[i + 1] << 8) + b[i]; };
  var be16 = function (n) { return new Uint8Array([(n >> 8) & 255, n & 255]); };
  var be32 = function (n) { return new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]); };
  var le32 = function (n) { return new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]); };
  var startsWith = function (b, i, s) { for (var k = 0; k < s.length; k++) if (b[i + k] !== s.charCodeAt(k)) return false; return true; };

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

  function detect(b) {
    if (!b || b.length < 12) return null;
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
    if (b[0] === 0x89 && startsWith(b, 1, 'PNG\r\n\x1a\n')) return 'png';
    if (startsWith(b, 0, 'RIFF') && startsWith(b, 8, 'WEBP')) return 'webp';
    if (startsWith(b, 4, 'ftyp') && /^(heic|heix|hevc|mif1|msf1|avif)/.test(latin1(b.subarray(8, 12)))) return 'heif';
    return null;
  }

  // ---------------------------------------------------------------- tag dictionary
  // [name, label] per IFD; label is the plain-English name shown on the page.
  var TAGS = {
    ifd0: {
      0x0100: ['ImageWidth', 'Image width'], 0x0101: ['ImageHeight', 'Image height'], 0x0102: ['BitsPerSample', 'Bits per sample'],
      0x0103: ['Compression', 'Compression'], 0x0106: ['PhotometricInterpretation', 'Colour model'], 0x010e: ['ImageDescription', 'Description'],
      0x010f: ['Make', 'Camera make'], 0x0110: ['Model', 'Camera model'], 0x0112: ['Orientation', 'Orientation'],
      0x0115: ['SamplesPerPixel', 'Samples per pixel'], 0x011a: ['XResolution', 'X resolution'], 0x011b: ['YResolution', 'Y resolution'],
      0x011c: ['PlanarConfiguration', 'Planar configuration'], 0x0128: ['ResolutionUnit', 'Resolution unit'], 0x0131: ['Software', 'Software'],
      0x0132: ['ModifyDate', 'Date modified'], 0x013b: ['Artist', 'Artist'], 0x013e: ['WhitePoint', 'White point'],
      0x013f: ['PrimaryChromaticities', 'Primary chromaticities'], 0x0201: ['ThumbnailOffset', 'Thumbnail offset'],
      0x0202: ['ThumbnailLength', 'Thumbnail length'], 0x0211: ['YCbCrCoefficients', 'YCbCr coefficients'],
      0x0213: ['YCbCrPositioning', 'YCbCr positioning'], 0x4746: ['Rating', 'Rating'], 0x8298: ['Copyright', 'Copyright'],
      0x8769: ['ExifOffset', 'Exif IFD pointer'], 0x8825: ['GPSInfo', 'GPS IFD pointer'], 0x9c9b: ['XPTitle', 'Windows title'],
      0x9c9c: ['XPComment', 'Windows comment'], 0x9c9d: ['XPAuthor', 'Windows author'], 0x9c9e: ['XPKeywords', 'Windows keywords'],
      0x9c9f: ['XPSubject', 'Windows subject'], 0xc4a5: ['PrintIM', 'Print Image Matching']
    },
    exif: {
      0x829a: ['ExposureTime', 'Shutter speed'], 0x829d: ['FNumber', 'Aperture'], 0x8822: ['ExposureProgram', 'Exposure program'],
      0x8827: ['ISO', 'ISO'], 0x8830: ['SensitivityType', 'Sensitivity type'], 0x9000: ['ExifVersion', 'Exif version'],
      0x9003: ['DateTimeOriginal', 'Date taken'], 0x9004: ['CreateDate', 'Date digitised'], 0x9010: ['OffsetTime', 'Time zone (modified)'],
      0x9011: ['OffsetTimeOriginal', 'Time zone (taken)'], 0x9012: ['OffsetTimeDigitized', 'Time zone (digitised)'],
      0x9101: ['ComponentsConfiguration', 'Components configuration'], 0x9201: ['ShutterSpeedValue', 'Shutter speed value'],
      0x9202: ['ApertureValue', 'Aperture value'], 0x9203: ['BrightnessValue', 'Brightness'], 0x9204: ['ExposureCompensation', 'Exposure compensation'],
      0x9205: ['MaxApertureValue', 'Max aperture'], 0x9206: ['SubjectDistance', 'Subject distance'], 0x9207: ['MeteringMode', 'Metering mode'],
      0x9208: ['LightSource', 'Light source'], 0x9209: ['Flash', 'Flash'], 0x920a: ['FocalLength', 'Focal length'],
      0x9214: ['SubjectArea', 'Subject area'], 0x927c: ['MakerNote', 'Maker note'], 0x9286: ['UserComment', 'User comment'],
      0x9290: ['SubSecTime', 'Sub-second (modified)'], 0x9291: ['SubSecTimeOriginal', 'Sub-second (taken)'],
      0x9292: ['SubSecTimeDigitized', 'Sub-second (digitised)'], 0xa000: ['FlashpixVersion', 'FlashPix version'],
      0xa001: ['ColorSpace', 'Colour space'], 0xa002: ['ExifImageWidth', 'Pixel width'], 0xa003: ['ExifImageHeight', 'Pixel height'],
      0xa005: ['InteropOffset', 'Interop IFD pointer'], 0xa20e: ['FocalPlaneXResolution', 'Focal plane X resolution'],
      0xa20f: ['FocalPlaneYResolution', 'Focal plane Y resolution'], 0xa210: ['FocalPlaneResolutionUnit', 'Focal plane resolution unit'],
      0xa217: ['SensingMethod', 'Sensing method'], 0xa300: ['FileSource', 'File source'], 0xa301: ['SceneType', 'Scene type'],
      0xa401: ['CustomRendered', 'Custom rendered'], 0xa402: ['ExposureMode', 'Exposure mode'], 0xa403: ['WhiteBalance', 'White balance'],
      0xa404: ['DigitalZoomRatio', 'Digital zoom'], 0xa405: ['FocalLengthIn35mmFormat', 'Focal length (35 mm equivalent)'],
      0xa406: ['SceneCaptureType', 'Scene type'], 0xa407: ['GainControl', 'Gain control'], 0xa408: ['Contrast', 'Contrast'],
      0xa409: ['Saturation', 'Saturation'], 0xa40a: ['Sharpness', 'Sharpness'], 0xa40c: ['SubjectDistanceRange', 'Subject distance range'],
      0xa420: ['ImageUniqueID', 'Image unique ID'], 0xa430: ['OwnerName', 'Camera owner name'], 0xa431: ['SerialNumber', 'Camera serial number'],
      0xa432: ['LensInfo', 'Lens specification'], 0xa433: ['LensMake', 'Lens make'], 0xa434: ['LensModel', 'Lens model'],
      0xa435: ['LensSerialNumber', 'Lens serial number'], 0xa460: ['CompositeImage', 'Composite image']
    },
    gps: {
      0x00: ['GPSVersionID', 'GPS version'], 0x01: ['GPSLatitudeRef', 'Latitude ref'], 0x02: ['GPSLatitude', 'Latitude'],
      0x03: ['GPSLongitudeRef', 'Longitude ref'], 0x04: ['GPSLongitude', 'Longitude'], 0x05: ['GPSAltitudeRef', 'Altitude ref'],
      0x06: ['GPSAltitude', 'Altitude'], 0x07: ['GPSTimeStamp', 'GPS time (UTC)'], 0x08: ['GPSSatellites', 'Satellites'],
      0x09: ['GPSStatus', 'GPS status'], 0x0a: ['GPSMeasureMode', 'Measure mode'], 0x0b: ['GPSDOP', 'GPS precision (DOP)'],
      0x0c: ['GPSSpeedRef', 'Speed unit'], 0x0d: ['GPSSpeed', 'Speed'], 0x0e: ['GPSTrackRef', 'Track ref'], 0x0f: ['GPSTrack', 'Track'],
      0x10: ['GPSImgDirectionRef', 'Direction ref'], 0x11: ['GPSImgDirection', 'Camera direction'], 0x12: ['GPSMapDatum', 'Map datum'],
      0x17: ['GPSDestBearingRef', 'Bearing ref'], 0x18: ['GPSDestBearing', 'Bearing'], 0x1b: ['GPSProcessingMethod', 'Positioning method'],
      0x1d: ['GPSDateStamp', 'GPS date'], 0x1f: ['GPSHPositioningError', 'Horizontal error']
    },
    interop: { 0x01: ['InteropIndex', 'Interoperability index'], 0x02: ['InteropVersion', 'Interoperability version'] }
  };
  TAGS.ifd1 = TAGS.ifd0;
  var GROUP_LABEL = { ifd0: 'Image (IFD0)', exif: 'Camera (Exif)', gps: 'Location (GPS)', interop: 'Interoperability', ifd1: 'Thumbnail (IFD1)' };
  // Tags that identify a person, a device or a place.
  var SENSITIVE = { GPS: 1, OwnerName: 1, SerialNumber: 1, LensSerialNumber: 1, ImageUniqueID: 1, Artist: 1, MakerNote: 1, XPAuthor: 1 };

  var ENUMS = {
    Orientation: { 1: 'Normal', 2: 'Mirrored', 3: 'Rotated 180°', 4: 'Mirrored vertically', 5: 'Mirrored, rotated 90° CCW', 6: 'Rotated 90° CW', 7: 'Mirrored, rotated 90° CW', 8: 'Rotated 90° CCW' },
    ResolutionUnit: { 1: 'None', 2: 'inches', 3: 'cm' },
    FocalPlaneResolutionUnit: { 1: 'None', 2: 'inches', 3: 'cm' },
    YCbCrPositioning: { 1: 'Centred', 2: 'Co-sited' },
    ExposureProgram: { 0: 'Not defined', 1: 'Manual', 2: 'Program AE', 3: 'Aperture priority', 4: 'Shutter priority', 5: 'Creative', 6: 'Action', 7: 'Portrait', 8: 'Landscape' },
    MeteringMode: { 0: 'Unknown', 1: 'Average', 2: 'Centre-weighted', 3: 'Spot', 4: 'Multi-spot', 5: 'Multi-segment', 6: 'Partial', 255: 'Other' },
    LightSource: { 0: 'Unknown', 1: 'Daylight', 2: 'Fluorescent', 3: 'Tungsten', 4: 'Flash', 9: 'Fine weather', 10: 'Cloudy', 11: 'Shade', 255: 'Other' },
    ColorSpace: { 1: 'sRGB', 2: 'Adobe RGB', 65535: 'Uncalibrated' },
    ExposureMode: { 0: 'Auto', 1: 'Manual', 2: 'Auto bracket' },
    WhiteBalance: { 0: 'Auto', 1: 'Manual' },
    SceneCaptureType: { 0: 'Standard', 1: 'Landscape', 2: 'Portrait', 3: 'Night' },
    SensingMethod: { 1: 'Not defined', 2: 'One-chip colour area', 3: 'Two-chip colour area', 4: 'Three-chip colour area', 5: 'Colour sequential area', 7: 'Trilinear', 8: 'Colour sequential linear' },
    CustomRendered: { 0: 'Normal', 1: 'Custom' },
    Contrast: { 0: 'Normal', 1: 'Low', 2: 'High' }, Saturation: { 0: 'Normal', 1: 'Low', 2: 'High' }, Sharpness: { 0: 'Normal', 1: 'Soft', 2: 'Hard' },
    GPSAltitudeRef: { 0: 'Above sea level', 1: 'Below sea level' },
    Compression: { 1: 'Uncompressed', 6: 'JPEG (old-style)', 7: 'JPEG' }
  };
  var TYPE_SIZE = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8, 4];

  // ---------------------------------------------------------------- TIFF / EXIF parsing
  function Reader(b, le) {
    this.b = b; this.le = le;
  }
  Reader.prototype.u16 = function (i) { var b = this.b; return this.le ? b[i] | (b[i + 1] << 8) : (b[i] << 8) | b[i + 1]; };
  Reader.prototype.u32 = function (i) { return this.le ? u32le(this.b, i) : u32be(this.b, i); };

  function values(entry, le) {
    var r = new Reader(entry.raw, le), out = [], i, t = entry.type, n = entry.count, s = TYPE_SIZE[t] || 1;
    if (t === 2) return [decode(entry.raw).replace(/\0[\s\S]*$/, '').trim()];
    for (i = 0; i < n && i * s + s <= entry.raw.length; i++) {
      var o = i * s;
      if (t === 1 || t === 7) out.push(entry.raw[o]);
      else if (t === 6) out.push((entry.raw[o] << 24) >> 24);
      else if (t === 3) out.push(r.u16(o));
      else if (t === 8) out.push((r.u16(o) << 16) >> 16);
      else if (t === 4 || t === 13) out.push(r.u32(o));
      else if (t === 9) out.push(r.u32(o) | 0);
      else if (t === 5) { var d = r.u32(o + 4); out.push(d ? r.u32(o) / d : 0); }
      else if (t === 10) { var sd = r.u32(o + 4) | 0; out.push(sd ? (r.u32(o) | 0) / sd : 0); }
      else if (t === 11) out.push(new DataView(entry.raw.buffer, entry.raw.byteOffset + o, 4).getFloat32(0, le));
      else if (t === 12) out.push(new DataView(entry.raw.buffer, entry.raw.byteOffset + o, 8).getFloat64(0, le));
    }
    return out;
  }

  function readIfd(tiff, r, off, seen) {
    if (!off || off + 2 > tiff.length || seen[off]) return null;
    seen[off] = 1;
    var n = r.u16(off), entries = [];
    if (n > 1000 || off + 2 + n * 12 > tiff.length) return null;
    for (var i = 0; i < n; i++) {
      var p = off + 2 + i * 12, type = r.u16(p + 2), count = r.u32(p + 4), size = (TYPE_SIZE[type] || 0) * count;
      if (!TYPE_SIZE[type] || size > tiff.length) continue;
      var at = size <= 4 ? p + 8 : r.u32(p + 8);
      if (at + size > tiff.length) continue;
      entries.push({ tag: r.u16(p), type: type, count: count, raw: tiff.slice(at, at + size) });
    }
    var nextAt = off + 2 + n * 12;
    return { entries: entries, next: nextAt + 4 <= tiff.length ? r.u32(nextAt) : 0 };
  }

  // tiff: bytes starting at the TIFF header ("II*\0" or "MM\0*").
  function parseTiff(tiff) {
    if (!tiff || tiff.length < 8) return null;
    var le = tiff[0] === 0x49 && tiff[1] === 0x49;
    if (!le && !(tiff[0] === 0x4d && tiff[1] === 0x4d)) return null;
    var r = new Reader(tiff, le), seen = {};
    if (r.u16(2) !== 42) return null;
    var res = { le: le, ifd0: [], exif: [], gps: [], interop: [], ifd1: [], thumbnail: null };
    var ptr = function (list, tag) { for (var i = 0; i < list.length; i++) if (list[i].tag === tag) return values(list[i], le)[0]; return 0; };
    var drop = function (list, tags) { return list.filter(function (e) { return tags.indexOf(e.tag) < 0; }); };
    var d0 = readIfd(tiff, r, r.u32(4), seen);
    if (!d0) return null;
    res.ifd0 = d0.entries;
    var ex = readIfd(tiff, r, ptr(res.ifd0, 0x8769), seen);
    if (ex) {
      res.exif = ex.entries;
      var io = readIfd(tiff, r, ptr(res.exif, 0xa005), seen);
      if (io) res.interop = io.entries;
      res.exif = drop(res.exif, [0xa005]);
    }
    var gp = readIfd(tiff, r, ptr(res.ifd0, 0x8825), seen);
    if (gp) res.gps = gp.entries;
    res.ifd0 = drop(res.ifd0, [0x8769, 0x8825]);
    var d1 = d0.next ? readIfd(tiff, r, d0.next, seen) : null;
    if (d1) {
      var to = ptr(d1.entries, 0x0201), tl = ptr(d1.entries, 0x0202);
      if (to && tl && to + tl <= tiff.length) res.thumbnail = tiff.slice(to, to + tl);
      res.ifd1 = drop(d1.entries, [0x0201, 0x0202]);
    }
    return res;
  }

  // ---------------------------------------------------------------- TIFF / EXIF writing
  function encodeValue(type, v, le) {
    if (type === 2) { var s = utf8(v), a = new Uint8Array(s.length + 1); a.set(s); return a; }
    var list = [].concat(v), out = new Uint8Array(list.length * TYPE_SIZE[type]), dv = new DataView(out.buffer);
    list.forEach(function (x, i) {
      var o = i * TYPE_SIZE[type];
      if (type === 1 || type === 7) out[o] = x;
      else if (type === 3) dv.setUint16(o, x, le);
      else if (type === 4) dv.setUint32(o, x, le);
      else if (type === 5) { var q = rational(x); dv.setUint32(o, q[0], le); dv.setUint32(o + 4, q[1], le); }
    });
    return out;
  }
  // Exact for the values written here: integers, decimals up to 7 places, and [num, den] pairs.
  function rational(x) {
    if (Array.isArray(x)) return x;
    var d = 1;
    while (Math.abs(Math.round(x * d) - x * d) > 1e-9 && d < 1e7) d *= 10;
    var n = Math.round(x * d);
    while (n > 0xffffffff) { n = Math.round(n / 10); d = Math.max(1, Math.round(d / 10)); }
    return [n, d];
  }
  function entry(tag, type, v, le) { var raw = encodeValue(type, v, le); return { tag: tag, type: type, count: type === 2 || type === 7 || type === 1 ? raw.length : raw.length / TYPE_SIZE[type], raw: raw }; }

  // Serialises { le, ifd0, exif, gps, interop, ifd1, thumbnail } into TIFF bytes. Pointer tags are rebuilt here.
  function buildTiff(t) {
    var le = !!t.le;
    var w16 = function (n) { return le ? new Uint8Array([n & 255, (n >> 8) & 255]) : be16(n); };
    var w32 = function (n) { return le ? le32(n) : be32(n); };
    var ifds = [], order = [];
    var sorted = function (l) { return l.slice().sort(function (a, b) { return a.tag - b.tag; }); };
    var ptrEntry = function (tag) { return { tag: tag, type: 4, count: 1, raw: new Uint8Array(4), ptr: true }; };
    var interop = t.interop && t.interop.length ? sorted(t.interop) : null;
    var exif = (t.exif && t.exif.length) || interop ? sorted((t.exif || []).concat(interop ? [ptrEntry(0xa005)] : [])) : null;
    var gps = t.gps && t.gps.length ? sorted(t.gps) : null;
    var ifd0 = sorted((t.ifd0 || []).concat(exif ? [ptrEntry(0x8769)] : [], gps ? [ptrEntry(0x8825)] : []));
    var thumb = t.thumbnail && t.thumbnail.length ? t.thumbnail : null;
    var ifd1 = thumb ? sorted((t.ifd1 || []).filter(function (e) { return e.tag !== 0x0201 && e.tag !== 0x0202; })
      .concat([{ tag: 0x0201, type: 4, count: 1, raw: new Uint8Array(4), ptr: true }, entry(0x0202, 4, thumb.length, le)])) : null;
    ifds.push(['ifd0', ifd0]);
    if (exif) ifds.push(['exif', exif]);
    if (interop) ifds.push(['interop', interop]);
    if (gps) ifds.push(['gps', gps]);
    if (ifd1) ifds.push(['ifd1', ifd1]);
    var off = 8, at = {};
    ifds.forEach(function (x) {
      var data = 0;
      x[1].forEach(function (e) { if (e.raw.length > 4) data += e.raw.length + (e.raw.length & 1); });
      at[x[0]] = off;
      off += 2 + x[1].length * 12 + 4 + data;
    });
    var thumbAt = off;
    var target = { 0x8769: at.exif, 0x8825: at.gps, 0xa005: at.interop, 0x0201: thumbAt };
    var parts = [le ? ascii('II') : ascii('MM'), w16(42), w32(8)];
    ifds.forEach(function (x) {
      var list = x[1], dataAt = at[x[0]] + 2 + list.length * 12 + 4, data = [];
      parts.push(w16(list.length));
      list.forEach(function (e) {
        var raw = e.ptr ? w32(target[e.tag]) : e.raw;
        parts.push(w16(e.tag), w16(e.type), w32(e.count));
        if (raw.length <= 4) { var v = new Uint8Array(4); v.set(raw); parts.push(v); }
        else {
          parts.push(w32(dataAt)); data.push(raw);
          if (raw.length & 1) data.push(new Uint8Array(1));
          dataAt += raw.length + (raw.length & 1);
        }
      });
      parts.push(w32(x[0] === 'ifd0' && ifd1 ? at.ifd1 : 0));
      parts = parts.concat(data);
    });
    if (thumb) parts.push(thumb);
    return concat(parts);
  }

  // ---------------------------------------------------------------- display values
  function gpsDecimal(dms, ref) {
    if (!dms || dms.length < 1) return null;
    var v = dms[0] + (dms[1] || 0) / 60 + (dms[2] || 0) / 3600;
    return /[SW]/i.test(ref || '') ? -v : v;
  }
  var round = function (n, p) { var m = Math.pow(10, p); return Math.round(n * m) / m; };
  function fmtNum(n) { return String(round(n, 4)); }

  function describe(group, e, le) {
    var info = (TAGS[group] || {})[e.tag], name = info ? info[0] : 'Tag0x' + ('000' + e.tag.toString(16)).slice(-4);
    var v = values(e, le), text;
    if (name === 'MakerNote' || name === 'PrintIM') text = e.raw.length + ' bytes (camera-specific data)';
    else if (/^XP/.test(name)) { var u = []; for (var i = 0; i + 1 < e.raw.length; i += 2) u.push(e.raw[i] | (e.raw[i + 1] << 8)); text = String.fromCharCode.apply(null, u).replace(/\0+$/, ''); }
    else if (name === 'UserComment') text = userComment(e.raw, le);
    else if (/Version$/.test(name) && e.type === 7) text = latin1(e.raw).replace(/\0/g, '');
    else if (name === 'GPSVersionID') text = v.join('.');
    else if (name === 'ExposureTime') text = v[0] >= 1 || !v[0] ? fmtNum(v[0]) + ' s' : '1/' + Math.round(1 / v[0]) + ' s';
    else if (name === 'FNumber') text = 'f/' + fmtNum(v[0]);
    else if (name === 'FocalLength') text = fmtNum(v[0]) + ' mm';
    else if (name === 'FocalLengthIn35mmFormat') text = v[0] + ' mm';
    else if (name === 'Flash') text = v[0] & 1 ? 'Fired' : 'Did not fire';
    else if (name === 'GPSLatitude' || name === 'GPSLongitude') text = v.map(fmtNum).join(', ');
    else if (name === 'GPSAltitude') text = fmtNum(v[0]) + ' m';
    else if (name === 'GPSTimeStamp') text = v.map(function (x) { return ('0' + Math.floor(x)).slice(-2); }).join(':');
    else if (name === 'ComponentsConfiguration') text = v.map(function (x) { return ['-', 'Y', 'Cb', 'Cr', 'R', 'G', 'B'][x] || x; }).join(', ');
    else if (name === 'FileSource' || name === 'SceneType') text = v[0] === 3 ? 'Digital camera' : v[0] === 1 ? 'Directly photographed' : String(v[0]);
    else if (ENUMS[name] && ENUMS[name][v[0]] !== undefined) text = ENUMS[name][v[0]];
    else if (e.type === 7 && e.raw.length > 16) text = e.raw.length + ' bytes';
    else if (e.type === 2) text = v[0];
    else text = v.slice(0, 16).map(function (x) { return typeof x === 'number' ? fmtNum(x) : x; }).join(', ') + (v.length > 16 ? ' …' : '');
    return { group: group, tag: e.tag, name: name, label: info ? info[1] : name, value: text, sensitive: !!SENSITIVE[name] || group === 'gps' };
  }

  // The first 8 bytes name the character code (EXIF 2.32, 4.6.5); UNICODE is UCS-2 in the file's byte order.
  function userComment(raw, le) {
    var body = raw.subarray(8);
    if (startsWith(raw, 0, 'UNICODE\0')) {
      var u = [];
      for (var i = 0; i + 1 < body.length; i += 2) u.push(le ? body[i] | (body[i + 1] << 8) : (body[i] << 8) | body[i + 1]);
      return String.fromCharCode.apply(null, u).replace(/\0+$/, '').trim();
    }
    return decode(body).replace(/\0+$/, '').trim();
  }

  function exifSummary(t) {
    if (!t) return null;
    var fields = [], get = {};
    ['ifd0', 'exif', 'gps', 'interop', 'ifd1'].forEach(function (g) {
      t[g].forEach(function (e) {
        var d = describe(g, e, t.le);
        fields.push(d);
        if (g !== 'ifd1') get[d.name] = { d: d, v: values(e, t.le) };
      });
    });
    var gps = null;
    if (get.GPSLatitude && get.GPSLongitude) {
      var lat = gpsDecimal(get.GPSLatitude.v, get.GPSLatitudeRef && get.GPSLatitudeRef.v[0]);
      var lon = gpsDecimal(get.GPSLongitude.v, get.GPSLongitudeRef && get.GPSLongitudeRef.v[0]);
      if (lat !== null && lon !== null && isFinite(lat) && isFinite(lon)) {
        gps = { lat: round(lat, 6), lon: round(lon, 6) };
        if (get.GPSAltitude) gps.alt = round(get.GPSAltitude.v[0] * (get.GPSAltitudeRef && get.GPSAltitudeRef.v[0] === 1 ? -1 : 1), 1);
      }
    }
    var text = function (k) { return get[k] ? get[k].d.value : ''; };
    return {
      fields: fields, gps: gps, orientation: get.Orientation ? get.Orientation.v[0] : 0,
      values: {
        ImageDescription: text('ImageDescription'), Make: text('Make'), Model: text('Model'), Software: text('Software'),
        Artist: text('Artist'), Copyright: text('Copyright'), DateTimeOriginal: text('DateTimeOriginal'), CreateDate: text('CreateDate'),
        ModifyDate: text('ModifyDate'), LensModel: text('LensModel'), OwnerName: text('OwnerName'), SerialNumber: text('SerialNumber'),
        UserComment: text('UserComment')
      }
    };
  }

  // ---------------------------------------------------------------- XMP
  var XNS = {
    x: 'adobe:ns:meta/', rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#', dc: 'http://purl.org/dc/elements/1.1/',
    photoshop: 'http://ns.adobe.com/photoshop/1.0/', xmpRights: 'http://ns.adobe.com/xap/1.0/rights/',
    plus: 'http://ns.useplus.org/ldf/xmp/1.0/', Iptc4xmpCore: 'http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/'
  };
  var xmlEsc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var xmlUnesc = function (s) {
    return String(s).replace(/&#x([0-9a-f]+);/gi, function (m, h) { return String.fromCodePoint(parseInt(h, 16)); })
      .replace(/&#(\d+);/g, function (m, d) { return String.fromCodePoint(+d); })
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  };

  // The IPTC fields Google Images reads, with where each lives in XMP, IPTC IIM and EXIF.
  var RIGHTS = [
    { key: 'creator', label: 'Creator', xmp: 'dc:creator', iim: '2:80 By-line', exif: 'Artist', google: 'Shown as the image credit (Creator)' },
    { key: 'credit', label: 'Credit Line', xmp: 'photoshop:Credit', iim: '2:110 Credit', exif: '', google: 'Shown as the credit line' },
    { key: 'copyright', label: 'Copyright Notice', xmp: 'dc:rights', iim: '2:116 Copyright Notice', exif: 'Copyright', google: 'Shown as the copyright notice' },
    { key: 'webStatement', label: 'Web Statement of Rights', xmp: 'xmpRights:WebStatement', iim: '', exif: '', google: 'Licence link; with it Google can show the Licensable badge' },
    { key: 'licensorUrl', label: 'Licensor URL', xmp: 'plus:Licensor / plus:LicensorURL', iim: '', exif: '', google: '"Get this image on" link to where the image can be licensed' },
    { key: 'title', label: 'Title', xmp: 'dc:title', iim: '2:05 Object Name', exif: '', google: 'Not displayed; describes the image' },
    { key: 'description', label: 'Description', xmp: 'dc:description', iim: '2:120 Caption', exif: 'ImageDescription', google: 'Not displayed; describes the image' },
    { key: 'keywords', label: 'Keywords', xmp: 'dc:subject', iim: '2:25 Keywords', exif: '', google: 'Not displayed' }
  ];

  function xmpProps(xml) {
    var out = {};
    if (!xml) return out;
    // Attribute form on rdf:Description: <rdf:Description photoshop:Credit="x">
    xml.replace(/<rdf:Description\b([^>]*)>?/g, function (m, attrs) {
      attrs.replace(/([A-Za-z][\w-]*:[\w-]+)\s*=\s*"([^"]*)"/g, function (a, k, v) { if (!/^(rdf|xmlns|x):/.test(k)) out[k] = [xmlUnesc(v)]; return a; });
      return m;
    });
    // Element form; containers (Seq/Bag/Alt) become lists of their rdf:li values.
    var re = /<([A-Za-z][\w-]*:[\w-]+)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g, m;
    while ((m = re.exec(xml))) {
      var k = m[1];
      if (/^(rdf|x):/.test(k)) { if (k === 'rdf:Description' || k === 'x:xmpmeta' || k === 'rdf:RDF') re.lastIndex = m.index + m[0].indexOf('>') + 1; continue; }
      var body = m[3];
      if (body === undefined) {
        var res = /rdf:resource="([^"]*)"/.exec(m[2]);
        if (res) out[k] = [xmlUnesc(res[1])];
        continue;
      }
      var lis = [], lm, lre = /<rdf:li\b[^>]*>([\s\S]*?)<\/rdf:li>/g;
      while ((lm = lre.exec(body))) lis.push(lm[1]);
      if (lis.length) out[k] = lis.map(function (s) { return xmlUnesc(s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()); }).filter(Boolean);
      else if (!/</.test(body)) out[k] = [xmlUnesc(body.trim())];
      else re.lastIndex = m.index + m[0].indexOf('>') + 1;
    }
    var lic = /<plus:LicensorURL>([^<]*)<\/plus:LicensorURL>/.exec(xml) || /plus:LicensorURL="([^"]*)"/.exec(xml);
    if (lic) out['plus:LicensorURL'] = [xmlUnesc(lic[1])];
    delete out['plus:Licensor'];
    return out;
  }

  function buildXmp(r) {
    var p = [], alt = function (tag, v) { p.push('<' + tag + '><rdf:Alt><rdf:li xml:lang="x-default">' + xmlEsc(v) + '</rdf:li></rdf:Alt></' + tag + '>'); };
    if (r.creator) p.push('<dc:creator><rdf:Seq><rdf:li>' + xmlEsc(r.creator) + '</rdf:li></rdf:Seq></dc:creator>');
    if (r.title) alt('dc:title', r.title);
    if (r.description) alt('dc:description', r.description);
    if (r.copyright) alt('dc:rights', r.copyright);
    var kw = keywordList(r.keywords);
    if (kw.length) p.push('<dc:subject><rdf:Bag>' + kw.map(function (k) { return '<rdf:li>' + xmlEsc(k) + '</rdf:li>'; }).join('') + '</rdf:Bag></dc:subject>');
    if (r.credit) p.push('<photoshop:Credit>' + xmlEsc(r.credit) + '</photoshop:Credit>');
    if (r.copyright || r.webStatement) p.push('<xmpRights:Marked>True</xmpRights:Marked>');
    if (r.webStatement) p.push('<xmpRights:WebStatement>' + xmlEsc(r.webStatement) + '</xmpRights:WebStatement>');
    if (r.licensorUrl) p.push('<plus:Licensor><rdf:Seq><rdf:li rdf:parseType="Resource"><plus:LicensorURL>' + xmlEsc(r.licensorUrl) + '</plus:LicensorURL></rdf:li></rdf:Seq></plus:Licensor>');
    if (!p.length) return '';
    return '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>\n<x:xmpmeta xmlns:x="' + XNS.x + '"><rdf:RDF xmlns:rdf="' + XNS.rdf + '">' +
      '<rdf:Description rdf:about="" xmlns:dc="' + XNS.dc + '" xmlns:photoshop="' + XNS.photoshop + '" xmlns:xmpRights="' + XNS.xmpRights + '" xmlns:plus="' + XNS.plus + '">' +
      p.join('') + '</rdf:Description></rdf:RDF></x:xmpmeta>\n<?xpacket end="w"?>';
  }
  function keywordList(k) {
    return (Array.isArray(k) ? k : String(k || '').split(/[,;\n]/)).map(function (s) { return String(s).trim(); })
      .filter(function (s, i, a) { return s && a.indexOf(s) === i; });
  }

  // ---------------------------------------------------------------- IPTC IIM (Photoshop APP13)
  var IIM = { 5: 'title', 25: 'keywords', 80: 'creator', 105: 'headline', 110: 'credit', 115: 'source', 116: 'copyright', 120: 'description', 90: 'city', 101: 'country', 55: 'dateCreated' };
  function parseIim(b) {
    var out = {}, i = 0;
    while (i + 5 <= b.length) {
      if (b[i] !== 0x1c) { i++; continue; }
      var rec = b[i + 1], ds = b[i + 2], len = u16be(b, i + 3);
      i += 5;
      if (len & 0x8000) break;
      var val = decode(b.subarray(i, i + len));
      if (rec === 2 && IIM[ds]) (out[IIM[ds]] = out[IIM[ds]] || []).push(val);
      i += len;
    }
    return out;
  }
  function parsePhotoshop(b) {
    // b starts after "Photoshop 3.0\0".
    var i = 0, iptc = null;
    while (i + 12 <= b.length && startsWith(b, i, '8BIM')) {
      var id = u16be(b, i + 4), nl = b[i + 6], p = i + 6 + ((nl + 2) & ~1), size = u32be(b, p);
      p += 4;
      if (id === 0x0404) iptc = parseIim(b.subarray(p, p + size));
      i = p + size + (size & 1);
    }
    return iptc;
  }

  // ---------------------------------------------------------------- container parsing
  // Each block: { kind, name, start, end, ...} with kind one of
  // exif, xmp, xmpExt, iptc, icc, comment, text, c2pa, jfif, adobe, mpf, app, other, image, trailer.
  var KIND_LABEL = {
    exif: 'EXIF (camera, date, GPS, thumbnail)', xmp: 'XMP (Adobe, IPTC Core, edit history)', xmpExt: 'Extended XMP',
    iptc: 'IPTC IIM / Photoshop', icc: 'ICC colour profile', comment: 'Comment', text: 'Text chunk', c2pa: 'Content Credentials (C2PA)',
    mpf: 'Multi-Picture index (MPF)', app: 'Other application data', trailer: 'Data after the image end', time: 'Last-modified time'
  };

  function parseJpeg(b) {
    var blocks = [], i = 2, w = 0, h = 0;
    while (i < b.length) {
      if (b[i] !== 0xff) return { blocks: blocks, error: 'corrupt', w: w, h: h };
      while (b[i] === 0xff && b[i + 1] === 0xff) i++;
      var m = b[i + 1], start = i;
      if (m === 0xd9) { blocks.push({ kind: 'image', start: start, end: i + 2 }); i += 2; break; }
      if ((m >= 0xd0 && m <= 0xd7) || m === 0x01) { i += 2; continue; }
      var len = u16be(b, i + 2), end = i + 2 + len, d = i + 4;
      if (len < 2 || end > b.length) return { blocks: blocks, error: 'truncated', w: w, h: h };
      var k = 'image', name = 'APP' + (m - 0xe0);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) { h = u16be(b, d + 1); w = u16be(b, d + 3); }
      if (m === 0xe0) k = startsWith(b, d, 'JFIF\0') ? 'jfif' : 'app';
      else if (m === 0xe1) k = startsWith(b, d, 'Exif\0') ? 'exif' : startsWith(b, d, 'http://ns.adobe.com/xap/1.0/\0') ? 'xmp' : startsWith(b, d, 'http://ns.adobe.com/xmp/extension/\0') ? 'xmpExt' : 'app';
      else if (m === 0xe2) k = startsWith(b, d, 'ICC_PROFILE\0') ? 'icc' : startsWith(b, d, 'MPF\0') ? 'mpf' : 'app';
      else if (m === 0xeb) k = startsWith(b, d, 'JP') ? 'c2pa' : 'app';
      else if (m === 0xed) k = startsWith(b, d, 'Photoshop 3.0\0') ? 'iptc' : 'app';
      else if (m === 0xee) k = startsWith(b, d, 'Adobe') ? 'adobe' : 'app';
      else if (m > 0xe0 && m <= 0xef) k = 'app';
      else if (m === 0xfe) k = 'comment';
      blocks.push({ kind: k, name: m === 0xfe ? 'COM' : m >= 0xe0 && m <= 0xef ? name : 'marker', start: start, end: end, data: d });
      i = end;
      if (m === 0xda) {
        // Entropy-coded scan data: runs until a marker that is not a stuffed byte or restart marker.
        var s = i;
        while (i + 1 < b.length) {
          if (b[i] === 0xff) { var n = b[i + 1]; if (n === 0 || (n >= 0xd0 && n <= 0xd7) || n === 0xff) { i += n === 0xff ? 1 : 2; continue; } break; }
          i++;
        }
        if (i + 1 >= b.length) i = b.length;
        blocks.push({ kind: 'image', start: s, end: i });
      }
    }
    if (i < b.length) blocks.push({ kind: 'trailer', name: 'Trailer', start: i, end: b.length });
    return { blocks: blocks, w: w, h: h };
  }

  var PNG_META = { tEXt: 'text', zTXt: 'text', iTXt: 'text', eXIf: 'exif', tIME: 'time', iCCP: 'icc', caBX: 'c2pa' };
  function parsePng(b) {
    var blocks = [{ kind: 'image', start: 0, end: 8 }], i = 8, w = 0, h = 0;
    while (i + 12 <= b.length) {
      var len = u32be(b, i), type = latin1(b.subarray(i + 4, i + 8)), end = i + 12 + len;
      if (end > b.length) return { blocks: blocks, error: 'truncated', w: w, h: h };
      if (type === 'IHDR') { w = u32be(b, i + 8); h = u32be(b, i + 12); }
      var k = PNG_META[type] || 'image';
      if (type === 'iTXt' && startsWith(b, i + 8, 'XML:com.adobe.xmp\0')) k = 'xmp';
      blocks.push({ kind: k, name: type, start: i, end: end, data: i + 8, len: len });
      i = end;
      if (type === 'IEND') break;
    }
    if (i < b.length) blocks.push({ kind: 'trailer', name: 'Trailer', start: i, end: b.length });
    return { blocks: blocks, w: w, h: h };
  }

  var WEBP_META = { EXIF: 'exif', 'XMP ': 'xmp', ICCP: 'icc' };
  function parseWebp(b) {
    var blocks = [], i = 12, w = 0, h = 0, riffEnd = Math.min(b.length, 8 + u32le(b, 4));
    while (i + 8 <= riffEnd) {
      var type = latin1(b.subarray(i, i + 4)), len = u32le(b, i + 4), end = i + 8 + len + (len & 1);
      if (i + 8 + len > b.length) return { blocks: blocks, error: 'truncated', w: w, h: h };
      var d = i + 8;
      if (type === 'VP8X') { w = 1 + b[d + 4] + (b[d + 5] << 8) + (b[d + 6] << 16); h = 1 + b[d + 7] + (b[d + 8] << 8) + (b[d + 9] << 16); }
      else if (type === 'VP8 ' && !w) { w = (b[d + 6] | (b[d + 7] << 8)) & 0x3fff; h = (b[d + 8] | (b[d + 9] << 8)) & 0x3fff; }
      else if (type === 'VP8L' && !w) { var bits = u32le(b, d + 1); w = (bits & 0x3fff) + 1; h = ((bits >>> 14) & 0x3fff) + 1; }
      blocks.push({ kind: WEBP_META[type] || 'image', name: type.trim(), start: i, end: Math.min(end, b.length), data: d, len: len });
      i = end;
    }
    if (riffEnd < b.length) blocks.push({ kind: 'trailer', name: 'Trailer', start: riffEnd, end: b.length });
    return { blocks: blocks, w: w, h: h };
  }

  function parse(b) {
    var f = detect(b);
    var r = f === 'jpeg' ? parseJpeg(b) : f === 'png' ? parsePng(b) : f === 'webp' ? parseWebp(b) : null;
    if (r) r.format = f;
    return r;
  }

  function tiffOf(b, blk, format) {
    if (format === 'jpeg') return b.subarray(blk.data + 6, blk.end);
    var p = b.subarray(blk.data, blk.data + blk.len);
    return startsWith(p, 0, 'Exif\0\0') ? p.subarray(6) : p;
  }
  function xmpOf(b, blk, format) {
    if (format === 'jpeg') return decode(b.subarray(blk.data + 29, blk.end));
    if (format === 'webp') return decode(b.subarray(blk.data, blk.data + blk.len));
    // PNG iTXt: keyword\0 flag method lang\0 translated\0 text (uncompressed only)
    var p = b.subarray(blk.data, blk.data + blk.len), z = 18;
    if (p[z] !== 0) return '';
    z += 2;
    while (z < p.length && p[z]) z++;
    z++;
    while (z < p.length && p[z]) z++;
    return decode(p.subarray(z + 1));
  }
  function pngTextOf(b, blk) {
    var p = b.subarray(blk.data, blk.data + blk.len), z = 0;
    while (z < p.length && p[z]) z++;
    var key = latin1(p.subarray(0, z));
    if (blk.name === 'tEXt') return { key: key, value: latin1(p.subarray(z + 1)) };
    if (blk.name === 'iTXt' && p[z + 1] === 0) {
      var q = z + 3;
      while (q < p.length && p[q]) q++;
      q++;
      while (q < p.length && p[q]) q++;
      return { key: key, value: decode(p.subarray(q + 1)) };
    }
    return { key: key, value: '(compressed text, ' + (p.length - z - 2) + ' bytes)' };
  }

  // ---------------------------------------------------------------- read: everything the pages show
  function read(b) {
    var f = detect(b);
    if (f === 'heif') return { format: 'heif', error: 'heif' };
    var p = parse(b);
    if (!p) return { format: null, error: 'unsupported' };
    var out = { format: p.format, width: p.w, height: p.h, size: b.length, error: p.error || null, blocks: [], exif: null, tiff: null,
      xmp: '', xmpProps: {}, iptc: null, texts: [], comments: [], icc: 0, rights: {}, privacy: [] };
    p.blocks.forEach(function (blk) {
      if (blk.kind === 'image' || blk.kind === 'jfif' || blk.kind === 'adobe') return;
      out.blocks.push({ kind: blk.kind, name: blk.name, size: blk.end - blk.start, label: KIND_LABEL[blk.kind] || blk.name });
      if (blk.kind === 'exif' && !out.tiff) { out.tiff = parseTiff(tiffOf(b, blk, p.format)); out.exif = exifSummary(out.tiff); }
      else if (blk.kind === 'xmp' && !out.xmp) { out.xmp = xmpOf(b, blk, p.format); out.xmpProps = xmpProps(out.xmp); }
      else if (blk.kind === 'iptc') out.iptc = parsePhotoshop(b.subarray(blk.data + 14, blk.end)) || out.iptc;
      else if (blk.kind === 'text') out.texts.push(pngTextOf(b, blk));
      else if (blk.kind === 'comment') out.comments.push(decode(b.subarray(blk.data, blk.end)));
      else if (blk.kind === 'icc') out.icc += blk.end - blk.start;
    });
    // Rights: XMP first (what Google prefers), then IPTC IIM, then EXIF.
    var X = out.xmpProps, I = out.iptc || {}, E = out.exif ? out.exif.values : {};
    var first = function () { for (var i = 0; i < arguments.length; i++) { var a = arguments[i]; if (a && a.length && String(a[0]).trim()) return a; } return null; };
    var one = function (a) { return a ? String(a[0]) : ''; };
    out.rights = {
      creator: (first(X['dc:creator'], I.creator, E.Artist ? [E.Artist] : null) || []).join('; '),
      credit: one(first(X['photoshop:Credit'], I.credit)),
      copyright: one(first(X['dc:rights'], I.copyright, E.Copyright ? [E.Copyright] : null)),
      webStatement: one(first(X['xmpRights:WebStatement'])),
      licensorUrl: one(first(X['plus:LicensorURL'])),
      title: one(first(X['dc:title'], I.title)),
      description: one(first(X['dc:description'], I.description, E.ImageDescription ? [E.ImageDescription] : null)),
      keywords: (first(X['dc:subject'], I.keywords) || []).join(', ')
    };
    out.privacy = privacy(out);
    return out;
  }

  function privacy(r) {
    var p = [], v = r.exif ? r.exif.values : {};
    if (r.exif && r.exif.gps) p.push({ key: 'gps', label: 'GPS location', value: r.exif.gps.lat + ', ' + r.exif.gps.lon });
    if (v.DateTimeOriginal || v.CreateDate) p.push({ key: 'date', label: 'Date and time taken', value: v.DateTimeOriginal || v.CreateDate });
    if (v.Make || v.Model) p.push({ key: 'camera', label: 'Camera or phone', value: v.Model && v.Make && v.Model.toLowerCase().indexOf(v.Make.toLowerCase()) === 0 ? v.Model : [v.Make, v.Model].filter(Boolean).join(' ') });
    if (v.SerialNumber) p.push({ key: 'serial', label: 'Camera serial number', value: v.SerialNumber });
    if (v.OwnerName || v.Artist) p.push({ key: 'owner', label: 'Owner or artist name', value: v.OwnerName || v.Artist });
    if (v.Software) p.push({ key: 'software', label: 'Software', value: v.Software });
    if (r.tiff && r.tiff.thumbnail) p.push({ key: 'thumb', label: 'Embedded thumbnail', value: r.tiff.thumbnail.length.toLocaleString('en-US') + ' bytes; may show the photo before cropping or editing' });
    if (r.tiff && r.tiff.exif.some(function (e) { return e.tag === 0x927c; })) p.push({ key: 'makernote', label: 'Maker note', value: 'Camera-specific data, often including serial numbers' });
    if (r.xmp) p.push({ key: 'xmp', label: 'XMP metadata', value: Object.keys(r.xmpProps).length + ' properties' + (/xmpMM:History|stEvt:/.test(r.xmp) ? ', including edit history' : '') });
    if (r.iptc) p.push({ key: 'iptc', label: 'IPTC (Photoshop)', value: Object.keys(r.iptc).join(', ') || 'present' });
    // Stable Diffusion WebUI writes "parameters"; ComfyUI writes "prompt" and "workflow"; InvokeAI "invokeai_metadata".
    var ai = r.texts.filter(function (t) { return /^(parameters|prompt|workflow|invokeai_metadata|sd-metadata)$/i.test(t.key); });
    if (ai.length) p.push({ key: 'ai', label: 'AI generator settings', value: ai.map(function (t) { return t.key; }).join(', ') });
    else if (r.texts.length) p.push({ key: 'text', label: 'Text chunks', value: r.texts.map(function (t) { return t.key; }).join(', ') });
    if (r.comments.length) p.push({ key: 'comment', label: 'Comment', value: r.comments[0].slice(0, 80) });
    r.blocks.forEach(function (b) { if (b.kind === 'c2pa') p.push({ key: 'c2pa', label: 'Content Credentials (C2PA)', value: b.size.toLocaleString('en-US') + ' bytes' }); });
    r.blocks.forEach(function (b) { if (b.kind === 'trailer') p.push({ key: 'trailer', label: 'Data after the image', value: b.size.toLocaleString('en-US') + ' bytes (for example a motion-photo video)' }); });
    return p;
  }

  // ---------------------------------------------------------------- shared container writers
  function jpegSegment(marker, payload) {
    if (payload.length > FACTS.maxSegment) throw new Error('segmentTooLarge');
    return concat([new Uint8Array([0xff, marker]), be16(payload.length + 2), payload]);
  }
  function pngChunk(type, data) {
    var body = concat([ascii(type), data]);
    return concat([be32(data.length), body, be32(crc32(body))]);
  }
  function webpChunk(type, data) {
    return concat([ascii(type), le32(data.length), data, data.length & 1 ? new Uint8Array(1) : new Uint8Array(0)]);
  }
  function exifPayload(tiff, format) { return format === 'jpeg' ? concat([ascii('Exif\0\0'), tiff]) : tiff; }
  function xmpChunkData(xml, format) {
    if (format === 'jpeg') return concat([ascii('http://ns.adobe.com/xap/1.0/\0'), utf8(xml)]);
    if (format === 'png') return concat([ascii('XML:com.adobe.xmp\0'), new Uint8Array([0, 0, 0, 0]), utf8(xml)]);
    return utf8(xml);
  }

  // Rebuilds a file from its parsed blocks: keep(blk) decides which original blocks stay; add.exif/add.xmp are new
  // payloads written where the format expects them.
  function rebuild(b, p, keep, add) {
    var parts = [], f = p.format, blocks = p.blocks.filter(keep);
    if (f === 'jpeg') {
      var head = [], body = [], placed = false;
      var extra = [];
      if (add.exif) extra.push(jpegSegment(0xe1, exifPayload(add.exif, 'jpeg')));
      if (add.xmp) extra.push(jpegSegment(0xe1, xmpChunkData(add.xmp, 'jpeg')));
      blocks.forEach(function (blk) {
        // New EXIF/XMP go right after SOI and JFIF (APP0), before every other segment.
        if (!placed && blk.kind !== 'jfif') { body = body.concat(extra); placed = true; }
        body.push(b.subarray(blk.start, blk.end));
      });
      if (!placed) body = body.concat(extra);
      head.push(new Uint8Array([0xff, 0xd8]));
      return concat(head.concat(body));
    }
    if (f === 'png') {
      parts.push(b.subarray(0, 8));
      var done = false;
      blocks.forEach(function (blk) {
        if (blk.start === 0) return;
        // eXIf and XMP must come before the first IDAT.
        if (!done && (blk.name === 'IDAT' || blk.name === 'IEND')) {
          if (add.exif) parts.push(pngChunk('eXIf', add.exif));
          if (add.xmp) parts.push(pngChunk('iTXt', xmpChunkData(add.xmp, 'png')));
          done = true;
        }
        parts.push(b.subarray(blk.start, blk.end));
      });
      return concat(parts);
    }
    // WebP: metadata needs the extended (VP8X) header with matching flags; EXIF and XMP go last.
    var kinds = blocks.map(function (x) { return x.kind; });
    var hasExif = !!add.exif || kinds.indexOf('exif') >= 0, hasXmp = !!add.xmp || kinds.indexOf('xmp') >= 0, hasIcc = kinds.indexOf('icc') >= 0;
    var vp8x = null, chunks = [];
    blocks.forEach(function (blk) {
      if (blk.kind === 'trailer') return;
      if (blk.name === 'VP8X') { vp8x = b.slice(blk.data, blk.data + 10); return; }
      chunks.push(b.subarray(blk.start, blk.end));
    });
    var alpha = blocks.some(function (x) { return x.name === 'ALPH'; }) || blocks.some(function (x) { return x.name === 'VP8L' && (b[x.data + 4] & 0x10); });
    if (!vp8x && (hasExif || hasXmp || hasIcc)) {
      vp8x = new Uint8Array(10);
      var w = p.w - 1, h = p.h - 1;
      vp8x.set([w & 255, (w >> 8) & 255, (w >> 16) & 255, h & 255, (h >> 8) & 255, (h >> 16) & 255], 4);
      if (alpha) vp8x[0] |= 0x10;
    }
    if (vp8x) vp8x[0] = (vp8x[0] & ~0x2c) | (hasIcc ? 0x20 : 0) | (hasExif ? 0x08 : 0) | (hasXmp ? 0x04 : 0);
    // With no ICC, alpha, metadata or animation left, the simple format is valid again and 18 bytes smaller.
    var simple = vp8x && !(vp8x[0] & 0x3e) && chunks.length === 1 && /^VP8[ L]$/.test(latin1(chunks[0].subarray(0, 4)));
    if (vp8x && !simple) chunks.unshift(webpChunk('VP8X', vp8x));
    if (add.exif) chunks.push(webpChunk('EXIF', add.exif));
    if (add.xmp) chunks.push(webpChunk('XMP ', utf8(add.xmp)));
    var data = concat(chunks);
    var trailer = blocks.filter(function (x) { return x.kind === 'trailer'; }).map(function (x) { return b.subarray(x.start, x.end); });
    return concat([ascii('RIFF'), le32(data.length + 4), ascii('WEBP'), data].concat(trailer));
  }

  // ---------------------------------------------------------------- strip
  // opts: keepOrientation (default true), keepIcc (default true), keepTrailer (default false), keepRights (default false).
  function strip(b, opts) {
    opts = opts || {};
    var keepOrientation = opts.keepOrientation !== false, keepIcc = opts.keepIcc !== false;
    var info = read(b);
    if (info.error) throw new Error(info.error);
    var p = parse(b), removed = [];
    var keep = function (blk) {
      var k = blk.kind;
      if (k === 'image' || k === 'jfif' || k === 'adobe') return true;
      if (k === 'icc' && keepIcc) return true;
      if (k === 'trailer' && opts.keepTrailer) return true;
      // An MPF index points at images after the end marker; it is only meaningful if those are kept.
      if (k === 'mpf' && opts.keepTrailer) return true;
      removed.push({ kind: k, name: blk.name, size: blk.end - blk.start, label: KIND_LABEL[k] || blk.name });
      return false;
    };
    var add = {};
    var o = info.exif ? info.exif.orientation : 0;
    // JPEG EXIF requires YCbCrPositioning in IFD0 (EXIF 2.32, 4.6.8), so the minimal block carries it too.
    if (keepOrientation && o > 1 && o <= 8) add.exif = buildTiff({ le: info.tiff.le, ifd0: [entry(0x0112, 3, o, info.tiff.le)].concat(info.format === 'jpeg' ? [entry(0x0213, 3, 1, info.tiff.le)] : []) });
    if (opts.keepRights) {
      var x = buildXmp(info.rights);
      if (x) add.xmp = x;
    }
    var out = rebuild(b, p, keep, add);
    return { bytes: out, removed: removed, before: b.length, after: out.length, orientation: add.exif ? o : 0, info: info };
  }

  // ---------------------------------------------------------------- write (editor)
  // Editable EXIF fields: key -> [ifd, tag, type].
  var FIELDS = {
    ImageDescription: ['ifd0', 0x010e, 2], Make: ['ifd0', 0x010f, 2], Model: ['ifd0', 0x0110, 2], Software: ['ifd0', 0x0131, 2],
    ModifyDate: ['ifd0', 0x0132, 2], Artist: ['ifd0', 0x013b, 2], Copyright: ['ifd0', 0x8298, 2],
    DateTimeOriginal: ['exif', 0x9003, 2], CreateDate: ['exif', 0x9004, 2], LensModel: ['exif', 0xa434, 2],
    OwnerName: ['exif', 0xa430, 2], SerialNumber: ['exif', 0xa431, 2], LensSerialNumber: ['exif', 0xa435, 2], UserComment: ['exif', 0x9286, 7]
  };
  var DATE_RE = /^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/;
  // Accepts "2026-10-17T09:30", "2026-10-17 09:30:15" or the EXIF form "2026:10:17 09:30:15".
  function exifDate(s) {
    var m = /^(\d{4})[-:](\d{2})[-:](\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(s).trim());
    return m ? m[1] + ':' + m[2] + ':' + m[3] + ' ' + m[4] + ':' + m[5] + ':' + (m[6] || '00') : null;
  }
  function dms(v) {
    var a = Math.abs(v), d = Math.floor(a), mf = (a - d) * 60, m = Math.floor(mf), s = round((mf - m) * 60, 4);
    if (s >= 60) { s = 0; m++; }
    if (m >= 60) { m = 0; d++; }
    return [[d, 1], [m, 1], rational(s)];
  }
  function validate(edits) {
    var errs = [];
    var ex = edits.exif || {};
    ['DateTimeOriginal', 'CreateDate', 'ModifyDate'].forEach(function (k) { if (ex[k] && !exifDate(ex[k])) errs.push(k); });
    if (edits.gps) {
      var g = edits.gps;
      if (!(isFinite(g.lat) && Math.abs(g.lat) <= 90)) errs.push('lat');
      if (!(isFinite(g.lon) && Math.abs(g.lon) <= 180)) errs.push('lon');
      if (g.alt !== undefined && g.alt !== null && g.alt !== '' && !isFinite(g.alt)) errs.push('alt');
    }
    if (edits.orientation !== undefined && !(edits.orientation >= 1 && edits.orientation <= 8)) errs.push('orientation');
    return errs;
  }

  // edits: { exif: {Field: value|''}, orientation, gps: null (remove) | {lat, lon, alt}, removeThumbnail,
  //          rights: {creator, credit, copyright, webStatement, licensorUrl, title, description, keywords} }
  // undefined means keep; '' removes an EXIF field.
  function write(b, edits) {
    edits = edits || {};
    var info = read(b);
    if (info.error) throw new Error(info.error);
    var errs = validate(edits);
    if (errs.length) throw new Error('invalid:' + errs.join(','));
    var p = parse(b), le = info.tiff ? info.tiff.le : false;
    var t = info.tiff ? { le: le, ifd0: info.tiff.ifd0.slice(), exif: info.tiff.exif.slice(), gps: info.tiff.gps.slice(), interop: info.tiff.interop.slice(), ifd1: info.tiff.ifd1.slice(), thumbnail: info.tiff.thumbnail }
      : { le: false, ifd0: [], exif: [], gps: [], interop: [], ifd1: [], thumbnail: null };
    var set = function (ifd, tag, e) { t[ifd] = t[ifd].filter(function (x) { return x.tag !== tag; }); if (e) t[ifd].push(e); };
    Object.keys(edits.exif || {}).forEach(function (k) {
      var f = FIELDS[k], v = edits.exif[k];
      if (!f || v === undefined || v === null) return;
      v = String(v).trim();
      if (/Date/.test(k) && v) v = exifDate(v);
      if (!v) return set(f[0], f[1], null);
      if (f[2] === 7) {
        var raw = /^[\x20-\x7e]*$/.test(v) ? concat([ascii('ASCII\0\0\0'), ascii(v)]) : concat([ascii('UNICODE\0'), utf16(v, le)]);
        return set(f[0], f[1], { tag: f[1], type: 7, count: raw.length, raw: raw });
      }
      set(f[0], f[1], entry(f[1], 2, v, le));
    });
    if (edits.orientation) set('ifd0', 0x0112, entry(0x0112, 3, +edits.orientation, le));
    if (edits.gps === null) t.gps = [];
    else if (edits.gps) {
      var g = edits.gps;
      t.gps = [entry(0x00, 1, [2, 3, 0, 0], le), entry(0x01, 2, g.lat < 0 ? 'S' : 'N', le), { tag: 0x02, type: 5, count: 3, raw: encodeValue(5, dms(g.lat), le) },
        entry(0x03, 2, g.lon < 0 ? 'W' : 'E', le), { tag: 0x04, type: 5, count: 3, raw: encodeValue(5, dms(g.lon), le) }];
      if (g.alt !== undefined && g.alt !== null && g.alt !== '') t.gps.push(entry(0x05, 1, +g.alt < 0 ? 1 : 0, le), entry(0x06, 5, round(Math.abs(+g.alt), 2), le));
      t.gps.push(entry(0x12, 2, 'WGS-84', le));
    }
    if (edits.removeThumbnail) { t.thumbnail = null; t.ifd1 = []; }
    // A new Exif IFD needs its version tag to be valid (EXIF 2.32, 4.6.5).
    if (t.exif.length && !t.exif.some(function (e) { return e.tag === 0x9000; })) t.exif.push({ tag: 0x9000, type: 7, count: 4, raw: ascii('0232') });
    var hasExif = t.ifd0.length || t.exif.length || t.gps.length || t.interop.length;
    var tiff = hasExif ? buildTiff(t) : null;
    if (tiff && p.format === 'jpeg' && tiff.length + 8 > FACTS.maxSegment && t.thumbnail) { t.thumbnail = null; t.ifd1 = []; tiff = buildTiff(t); }
    var xml = edits.rights ? buildXmp(edits.rights) : null;
    var replaceXmp = !!edits.rights;
    var keep = function (blk) {
      if (blk.kind === 'exif') return false;
      if (replaceXmp && (blk.kind === 'xmp' || blk.kind === 'xmpExt' || blk.kind === 'iptc')) return false;
      return true;
    };
    return rebuild(b, p, keep, { exif: tiff, xmp: xml || null });
  }
  function utf16(s, le) {
    var out = new Uint8Array(s.length * 2);
    for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); out[i * 2] = le ? c & 255 : c >> 8; out[i * 2 + 1] = le ? c >> 8 : c & 255; }
    return out;
  }
  // ---------------------------------------------------------------- ZIP (stored, no compression: images are already compressed)
  function zip(files, when) {
    var d = when || new Date(1980, 0, 1);
    var time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    var le16 = function (n) { return new Uint8Array([n & 255, (n >> 8) & 255]); };
    var local = [], central = [], off = 0, used = {};
    files.forEach(function (f) {
      var name = f.name, n = 1;
      while (used[name]) name = f.name.replace(/(\.[^.]*)?$/, '-' + (++n) + '$1');
      used[name] = 1;
      var nb = utf8(name), crc = crc32(f.bytes), size = f.bytes.length;
      var common = concat([le16(20), le16(0x0800), le16(0), le16(time), le16(date), le32(crc), le32(size), le32(size), le16(nb.length), le16(0)]);
      var head = concat([le32(0x04034b50), common, nb]);
      local.push(head, f.bytes);
      central.push(concat([le32(0x02014b50), le16(20), common, le16(0), le16(0), le16(0), le32(0), le32(off), nb]));
      off += head.length + size;
    });
    var cd = concat(central);
    var end = concat([le32(0x06054b50), le16(0), le16(0), le16(files.length), le16(files.length), le32(cd.length), le32(off), le16(0)]);
    return concat(local.concat([cd, end]));
  }


  // ---------------------------------------------------------------- HTML views shared by the build and the pages
  var h = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  function size(n) { return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB'; }
  var FORMAT = { jpeg: 'JPEG', png: 'PNG', webp: 'WebP' };
  function mapUrl(g) { return 'https://www.openstreetmap.org/?mlat=' + g.lat + '&mlon=' + g.lon + '#map=15/' + g.lat + '/' + g.lon; }
  function fileInfo(name, r) {
    return '<strong>' + h(name) + '</strong> · ' + FORMAT[r.format] + ' · ' + r.width + ' × ' + r.height + ' px · ' + size(r.size);
  }
  function privacyList(r) {
    if (!r.privacy.length) return '<p class="ex-clean">No personal metadata found in this file.</p>';
    return '<ul class="ex-priv">' + r.privacy.map(function (p) {
      var v = p.key === 'gps' ? '<a href="' + h(mapUrl(r.exif.gps)) + '" rel="noopener nofollow" target="_blank">' + h(p.value) + '</a>' : h(p.value);
      return '<li><strong>' + h(p.label) + '</strong> <span>' + v + '</span></li>';
    }).join('') + '</ul>';
  }
  function table(caption, rows) {
    return '<details class="ex-group"' + (rows.length < 30 ? ' open' : '') + '><summary>' + h(caption) + ' <small>(' + rows.length + ')</small></summary>' +
      '<div class="table-wrap"><table class="data text ex-table"><tbody>' +
      rows.map(function (r) { return '<tr' + (r[2] ? ' class="ex-sens"' : '') + '><th scope="row">' + h(r[0]) + '</th><td>' + h(r[1]) + '</td></tr>'; }).join('') +
      '</tbody></table></div></details>';
  }
  function metaTables(r) {
    var out = [];
    if (r.exif) ['ifd0', 'exif', 'gps', 'interop', 'ifd1'].forEach(function (g) {
      var rows = r.exif.fields.filter(function (f) { return f.group === g; }).map(function (f) { return [f.label, f.value, f.sensitive]; });
      if (g === 'ifd1' && r.tiff.thumbnail) rows.push(['Thumbnail image', r.tiff.thumbnail.length + ' bytes', true]);
      if (rows.length) out.push(table(GROUP_LABEL[g], rows));
    });
    var xk = Object.keys(r.xmpProps);
    if (xk.length) out.push(table('XMP', xk.map(function (k) { return [k, r.xmpProps[k].join('; '), false]; })));
    if (r.iptc) out.push(table('IPTC IIM', Object.keys(r.iptc).map(function (k) { return [k, r.iptc[k].join('; '), false]; })));
    if (r.texts.length) out.push(table('PNG text', r.texts.map(function (t) { return [t.key, t.value.length > 300 ? t.value.slice(0, 300) + ' …' : t.value, false]; })));
    if (r.comments.length) out.push(table('Comment', r.comments.map(function (c) { return ['Comment', c, false]; })));
    out.push(table('Metadata blocks', r.blocks.length ? r.blocks.map(function (b) { return [b.label, size(b.size) + ' (' + b.name + ')', false]; }) : [['None', 'Only image data', false]]));
    return out.join('');
  }
  function resultCard(name, s, url) {
    var pct = s.before ? Math.round((1 - s.after / s.before) * 1000) / 10 : 0;
    var found = s.info.privacy.length ? s.info.privacy.map(function (p) { return '<li>' + h(p.label) + '</li>'; }).join('') : '<li>No personal metadata</li>';
    return '<li class="ex-file"><div class="ex-file-head"><strong>' + h(name) + '</strong><span>' + size(s.before) + ' → ' + size(s.after) +
      (pct > 0 ? ' (' + pct + '% smaller)' : '') + '</span></div><ul class="ex-found" aria-label="Removed">' + found + '</ul>' +
      (s.orientation > 1 ? '<p class="help">Orientation kept: ' + h(ENUMS.Orientation[s.orientation]) + '.</p>' : '') +
      (url ? '<a class="btn sm" href="' + h(url) + '" download="' + h(cleanName(name)) + '">Download</a>' : '') + '</li>';
  }
  function cleanName(name) { return String(name).replace(/(\.[^.]+)$/, '-clean$1'); }

  var api = {
    FACTS: FACTS, TAGS: TAGS, GROUP_LABEL: GROUP_LABEL, RIGHTS: RIGHTS, KIND_LABEL: KIND_LABEL, FIELDS: FIELDS, ENUMS: ENUMS,
    detect: detect, read: read, strip: strip, write: write, validate: validate, zip: zip, crc32: crc32,
    parseTiff: parseTiff, buildTiff: buildTiff, buildXmp: buildXmp, xmpProps: xmpProps, exifDate: exifDate, gpsDecimal: gpsDecimal,
    keywordList: keywordList, DATE_RE: DATE_RE,
    views: { fileInfo: fileInfo, privacyList: privacyList, metaTables: metaTables, resultCard: resultCard, size: size, mapUrl: mapUrl, cleanName: cleanName, esc: h }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBExif = api;
})(typeof self !== 'undefined' ? self : this);
