// Batch 14 renderers and bundles (typing test, online timer/stopwatch, QR code generator, image to text). Same pattern
// as batch13.mjs: build.mjs only needs the hook lines. Each renderer returns the {{TOKENS}} for its pages.
export function batch14({ require, esc, longDate, qrcode }) {
  const fs = require('node:fs'), path = require('node:path');
  const renderers = {}, bundles = {};
  const CSS = '<style>' + fs.readFileSync(path.join(path.dirname(require.resolve('../assets/js/typing-core.js')), '../../tools-src/css/batch14.css'), 'utf8').replace(/\/\*[^]*?\*\//g, '').replace(/\s*\n\s*/g, '').trim() + '</style>';
  const opt = (v, t, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${esc(t)}</option>`;
  const fmt = (L, n, d = 0) => new Intl.NumberFormat(L ? 'ms-MY' : 'en-MY', { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);

  // ---- typing test
  const typing = require('../assets/js/typing-core.js');
  renderers.typing = lang => {
    const L = lang === 'ms' ? 1 : 0, Y = typing, F = Y.FACTS;
    const text = Y.generate({ lang, mode: 'words', secs: 60, seed: 1 });
    const bandText = {
      beginner: ['Beginner', 'Permulaan', 'Still looking at the keys; learn the home row first.', 'Masih melihat papan kekunci; mulakan dengan baris asas.'],
      learning: ['Learning', 'Sedang belajar', 'Enough for chat and short emails.', 'Cukup untuk sembang dan e-mel pendek.'],
      average: ['Average', 'Purata', 'Around the typical adult on a phone or computer.', 'Sekitar purata orang dewasa di telefon atau komputer.'],
      fast: ['Fast', 'Pantas', 'Above the average desktop typist (51.6 WPM).', 'Melebihi purata menaip di komputer (51.6 WPM).'],
      'very fast': ['Very fast', 'Sangat pantas', 'Comfortable for transcription and heavy office work.', 'Selesa untuk transkripsi dan kerja pejabat berat.'],
      expert: ['Expert', 'Pakar', 'Top few percent of typists.', 'Antara penaip terpantas.']
    };
    const bands = Y.BANDS.map(([min, k], i) => { const next = Y.BANDS[i + 1]; return `<tr><th scope="row">${bandText[k][L]}</th><td>${next ? `${min}–${next[0] - 1}` : `${min}+`} WPM</td><td>${bandText[k][2 + L]}</td></tr>`; }).join('\n');
    const ex = Y.score({ target: 'a'.repeat(250), typed: 'a'.repeat(247) + 'bbb', ms: 60000, keystrokes: 260, mistakes: 13 });
    return {
      HEAD_EXTRA: CSS, Y_TEXT: esc(text),
      Y_LANG_OPTIONS: opt('en', 'English', !L) + opt('ms', 'Bahasa Melayu', L),
      Y_MODE_OPTIONS: opt('words', L ? 'Perkataan biasa' : 'Common words', true) + opt('sentences', L ? 'Ayat dan tanda baca' : 'Sentences with punctuation') + opt('numbers', L ? 'Perkataan dan nombor' : 'Words and numbers'),
      Y_SECS: F.durations.map(s => `<label><input type="radio" name="secs" value="${s}"${s === 60 ? ' checked' : ''}> ${s < 60 ? s + (L ? ' saat' : ' s') : s / 60 + (L ? ' minit' : ' min')}</label>`).join(''),
      Y_BANDS: bands, Y_DESKTOP: fmt(L, F.desktopAvg, 1), Y_MOBILE: fmt(L, F.mobileAvg, 1), Y_DESK_ERR: fmt(L, F.desktopErr, 1), Y_MOB_ERR: fmt(L, F.mobileErr, 1),
      Y_EX_GROSS: fmt(L, ex.gross), Y_EX_NET: fmt(L, ex.net), Y_EX_ACC: fmt(L, ex.accuracy * 100),
      Y_VERIFIED: longDate(F.verified, lang), Y_VERIFIED_ISO: F.verified
    };
  };
  bundles['typing.js'] = ['assets/js/typing-core.js', 'assets/js/typing-ui.js'];

  // ---- online timer, stopwatch, Pomodoro
  const timer = require('../assets/js/timer-core.js');
  renderers.timer = lang => {
    const L = lang === 'ms' ? 1 : 0, T = timer, def = L ? 'stopwatch' : 'timer';
    const modes = [['timer', 'Timer', 'Pemasa'], ['stopwatch', 'Stopwatch', 'Jam randik'], ['pomodoro', 'Pomodoro', 'Pomodoro']]
      .map(([v, en, ms]) => `<label><input type="radio" name="mode" value="${v}"${v === def ? ' checked' : ''}> ${L ? ms : en}</label>`).join('');
    const kind = { focus: ['Focus', 'Fokus'], short: ['Short break', 'Rehat pendek'], long: ['Long break', 'Rehat panjang'] };
    let at = 0;
    const plan = T.pomodoro(4).map((p, i) => { const row = `<tr><th scope="row">${i + 1}</th><td>${kind[p.kind][L]}</td><td>${p.min} min</td><td>${T.format(at * 60000)}–${T.format((at + p.min) * 60000)}</td></tr>`; at += p.min; return row; }).join('\n');
    return {
      HEAD_EXTRA: CSS, TM_MODES: modes, TM_DISPLAY: def === 'timer' ? T.countdownText(300000) : T.format(0, true),
      TM_PRESETS: T.PRESETS.map(m => `<button type="button" data-min="${m}">${m} min</button>`).join(''),
      TM_PLAN: plan, TM_PLAN_TOTAL: T.planMinutes(T.pomodoro(4)), TM_TIMER_HIDDEN: def === 'timer' ? '' : ' hidden', TM_BAR_HIDDEN: def === 'timer' ? '' : ' hidden', TM_LAP_ATTR: def === 'stopwatch' ? ' disabled' : ' hidden disabled', TM_PLUS_ATTR: def === 'timer' ? '' : ' hidden',
      TM_VERIFIED: longDate(T.FACTS.verified, lang), TM_VERIFIED_ISO: T.FACTS.verified
    };
  };
  bundles['timer.js'] = ['assets/js/timer-core.js', 'assets/js/timer-ui.js'];

  // ---- QR code generator
  const qr = require('../assets/js/qr-core.js');
  renderers.qr = lang => {
    const L = lang === 'ms' ? 1 : 0, Q = qr, url = 'https://tool.thebukitbesi.com/';
    const m = Q.matrix(qrcode, url, 'M');
    const types = [
      ['url', 'Website link', 'Pautan laman web', { url: 'tool.thebukitbesi.com' }], ['wifi', 'Wi-Fi login', 'Log masuk Wi-Fi', { ssid: 'Kedai Kopi', password: 'kopi1234', security: 'WPA' }],
      ['whatsapp', 'WhatsApp chat', 'Sembang WhatsApp', { phone: '012-345 6789', message: 'Hai' }], ['vcard', 'Contact card (vCard)', 'Kad kenalan (vCard)', { first: 'Siti', last: 'Aminah', phone: '0123456789' }],
      ['email', 'Email', 'E-mel', { email: 'hello@example.my', subject: 'Tempahan' }], ['sms', 'SMS', 'SMS', { phone: '0123456789', message: 'OK' }],
      ['phone', 'Phone call', 'Panggilan telefon', { phone: '03-1234 5678' }], ['geo', 'Map location', 'Lokasi peta', { lat: 3.1579, lng: 101.7116 }]
    ].map(([t, en, ms, v]) => `<tr><th scope="row">${L ? ms : en}</th><td><code>${esc(Q.payload(t, v).split('\r\n').slice(0, 4).join(' ⏎ '))}${t === 'vcard' ? ' …' : ''}</code></td></tr>`).join('\n');
    const ecRows = [['L', 7089, 4296, 2953], ['M', 5596, 3391, 2331], ['Q', 3993, 2420, 1663], ['H', 3057, 1852, 1273]]
      .map(([k, n, a, b]) => `<tr><th scope="row">${k}</th><td>${Q.FACTS.ec[k]}%</td><td>${fmt(L, n)}</td><td>${fmt(L, a)}</td><td>${fmt(L, b)}</td></tr>`).join('\n');
    const print = [[30, L ? 'Kad nama, meja' : 'Business card, table'], [100, L ? 'Risalah, menu' : 'Flyer, menu'], [200, L ? 'Poster dinding' : 'Wall poster'], [500, L ? 'Kain rentang kedai' : 'Shop banner'], [1000, L ? 'Papan iklan kecil' : 'Small billboard']]
      .map(([d, use]) => `<tr><th scope="row">${use}</th><td>${fmt(L, d / 100, 1)} m</td><td>${fmt(L, Q.printCm(d), 1)} cm</td></tr>`).join('\n');
    return {
      HEAD_EXTRA: CSS, Q_SVG: Q.svg(m, { bg: '#ffffff', label: 'QR code: ' + url }), Q_URL: url,
      Q_INFO: L ? `Versi ${Q.version(m)} · ${m.length} × ${m.length} modul · pembetulan M (15%) · ${url.length} aksara` : `Version ${Q.version(m)} · ${m.length} × ${m.length} modules · error correction M (15%) · ${url.length} characters`,
      Q_TYPES: types, Q_EC: ecRows, Q_PRINT: print, Q_VERIFIED: longDate(Q.FACTS.verified, lang), Q_VERIFIED_ISO: Q.FACTS.verified
    };
  };
  bundles['qr.js'] = ['assets/js/qr-core.js', 'assets/js/qr-ui.js'];

  // ---- image to text (OCR)
  const ocr = require('../assets/js/ocr-core.js');
  renderers.ocr = lang => {
    const L = lang === 'ms' ? 1 : 0, O = ocr;
    const names = { eng: ['English', 'Inggeris'], msa: ['Malay', 'Melayu'], chi_sim: ['Chinese (simplified)', 'Cina (ringkas)'], tam: ['Tamil', 'Tamil'] };
    const checks = Object.keys(O.FACTS.langs).map(k => `<label><input type="checkbox" name="lang" value="${k}"${k === 'eng' || k === 'msa' ? ' checked' : ''}> ${names[k][L]}</label>`).join('');
    const rows = Object.entries(O.FACTS.langs).map(([k, mb]) => `<tr><th scope="row">${names[k][L]}</th><td><code>${k}</code></td><td>${fmt(L, mb, 2)} MB</td></tr>`).join('\n');
    return {
      HEAD_EXTRA: CSS, O_LANGS: checks, O_TABLE: rows, O_SIZE: fmt(L, O.downloadMb(['eng', 'msa']), 0), O_CORE: fmt(L, O.FACTS.coreMb, 1), O_VERSION: O.FACTS.version,
      O_VERIFIED: longDate(O.FACTS.verified, lang), O_VERIFIED_ISO: O.FACTS.verified
    };
  };
  bundles['ocr.js'] = ['assets/js/ocr-core.js', 'assets/js/ocr-ui.js'];

  return { renderers, bundles };
}
