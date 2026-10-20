// Batch 13 renderers and bundles (spin the wheel, cups-to-grams, background remover, passport photo), kept in their
// own module so build.mjs only needs two hook lines. Each renderer returns the {{TOKENS}} for its pages.
export function batch13({ require, esc, attr, longDate, b3 }) {
  const wheelCore = require('../assets/js/wheel-core.js');
  const renderers = {}, bundles = {};
  // Page-specific CSS goes into these pages' <head> only, so the shared page.css stays small.
  const fs = require('node:fs'), path = require('node:path');
  const CSS = '<style>' + fs.readFileSync(path.join(path.dirname(require.resolve('../assets/js/wheel-core.js')), '../../tools-src/css/batch13.css'), 'utf8').replace(/\/\*[^]*?\*\//g, '').replace(/\s*\n\s*/g, '').trim() + '</style>';

  // ---- spin the wheel / cabutan bertuah
  const WHEEL_DEFAULT = ['Aisyah', 'Ben', 'Chong', 'Devi', 'Farid', 'Grace', 'Hafiz', 'Imran'];
  // Static SVG of the default wheel so the page shows a complete wheel before any script runs.
  function wheelSvg(entries) {
    const W = wheelCore, c = 200, R = 196, pt = (deg, r) => { const a = (deg - 90) * Math.PI / 180; return [(c + r * Math.cos(a)).toFixed(1), (c + r * Math.sin(a)).toFixed(1)]; };
    const parts = W.slices(entries).map((s, i) => {
      const [x0, y0] = pt(s.start, R), [x1, y1] = pt(s.end, R), large = s.end - s.start > 180 ? 1 : 0;
      return `<path d="M${c} ${c}L${x0} ${y0}A${R} ${R} 0 ${large} 1 ${x1} ${y1}Z" fill="${s.color}" stroke="#fff" stroke-width="2"/>` +
        `<text transform="rotate(${(s.mid - 90).toFixed(1)} ${c} ${c})" x="${c + R - 14}" y="${c}" text-anchor="end" dominant-baseline="middle" fill="#fff" font-weight="700" font-size="18">${esc(entries[i].name)}</text>`;
    }).join('');
    return `<svg id="wSvg" viewBox="0 0 400 400" role="img" aria-label="Wheel">${parts}<circle cx="200" cy="200" r="28" fill="#fff" stroke="#222" stroke-width="3"/></svg>`;
  }
  renderers.wheel = lang => {
    const L = lang === 'ms' ? 1 : 0, W = wheelCore, entries = W.parse(WHEEL_DEFAULT.join('\n'));
    const opt = (v, en, ms, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${L ? ms : en}</option>`;
    return {
      W_ENTRIES: esc(WHEEL_DEFAULT.join('\n')), W_SVG: wheelSvg(entries), W_COUNT: L ? `${entries.length} entri` : `${entries.length} entries`,
      W_MODE_OPTIONS: opt('spin', 'Spin: one winner', 'Putar: seorang pemenang', !L) + opt('draw', 'Lucky draw: several winners', 'Cabutan bertuah: beberapa pemenang', L),
      W_SPEED_OPTIONS: opt('3000', 'Fast (3 s)', 'Pantas (3 saat)') + opt('5000', 'Normal (5 s)', 'Biasa (5 saat)', true) + opt('8000', 'Dramatic (8 s)', 'Dramatik (8 saat)'),
      W_PRESETS: Object.keys(W.PRESETS).map(k => `<button type="button" data-preset="${k}">${({ yesno: ['Yes / No', 'Ya / Tidak'], numbers: ['Numbers 1–10', 'Nombor 1–10'], food: ['What to eat?', 'Makan apa?'], names: ['Sample names', 'Contoh nama'] })[k][L]}</button>`).join(''),
      HEAD_EXTRA: CSS, W_CHANCE: (100 / entries.length).toFixed(1), W_VERIFIED: longDate(W.FACTS.verified, lang), W_VERIFIED_ISO: W.FACTS.verified
    };
  };
  bundles['wheel.js'] = ['assets/js/wheel-core.js', 'assets/js/wheel-ui.js'];

  // ---- cups to grams (sukatan cawan ke gram)
  const sukCore = require('../assets/js/sukatan-core.js');
  const SUK_RECIPE = {
    ms: '2 cawan tepung gandum\n1 cawan gula pasir\n½ cawan minyak masak\n1 cawan susu segar\n¼ cawan serbuk koko\n2 biji telur\n1 sudu kecil garam',
    en: '2 cups all-purpose flour\n1 cup granulated sugar\n½ cup cooking oil\n1 cup milk\n¼ cup cocoa powder\n2 eggs\n1 tsp salt'
  };
  renderers.sukatan = lang => {
    const L = lang === 'ms' ? 1 : 0, S = sukCore, nf = new Intl.NumberFormat(L ? 'ms-MY' : 'en-MY', { maximumFractionDigits: 2 }), g = x => nf.format(S.round(x)) + ' g';
    const opt = (v, t, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${esc(t)}</option>`;
    const keys = Object.keys(S.ING), nm = k => S.ING[k][L ? 0 : 1];
    const r = S.convert({ ing: 'flour', amount: '1', unit: 'cup', cup: 250 });
    const unitName = { cup: ['cup', 'cawan'], tbsp: ['tbsp', 'sudu besar'], tsp: ['tsp', 'sudu kecil'] };
    const allRows = [[1, 'cup', '1'], [0.75, 'cup', '¾'], [0.5, 'cup', '½'], [1 / 3, 'cup', '⅓'], [0.25, 'cup', '¼'], [1, 'tbsp', '1'], [1, 'tsp', '1']]
      .map(([a, u, label]) => `<tr><th scope="row">${label} ${unitName[u][L]}</th><td>${g(S.convert({ ing: 'flour', amount: String(a), unit: u, cup: 250 }).g)}</td></tr>`).join('\n');
    const big = keys.map(k => { const c250 = S.convert({ ing: k, amount: '1', unit: 'cup', cup: 250 }), c240 = S.convert({ ing: k, amount: '1', unit: 'cup', cup: 240 }), sb = S.convert({ ing: k, amount: '1', unit: 'tbsp' });
      const range = Math.round(c250.high) - Math.round(c250.low) >= 2 ? `${g(c250.low)}–${g(c250.high)}` : g(c250.g);
      return `<tr><th scope="row"><button type="button" class="linklike" data-ing="${k}">${esc(nm(k))}</button></th><td>${range}</td><td>${g(c240.g)}</td><td>${g(sb.g)}</td></tr>`; }).join('\n');
    const lines = S.parseRecipe(SUK_RECIPE[lang], 250, 1);
    const recipeRows = lines.map(l => `<tr><th scope="row">${esc(l.line)}</th><td>${nf.format(l.scaled)}${l.unit ? ' ' + (!L && l.unit === 'cup' && l.scaled !== 1 ? 'cups' : unitName[l.unit][L]) : l.key === 'egg' ? (L ? ' biji' : ' eggs') : ''}</td><td>${Math.round(l.high) - Math.round(l.low) >= 2 ? g(l.low) + '–' + g(l.high) : g(l.g)}</td></tr>`).join('\n');
    const E = S.FACTS.eggs;
    const eggs = Object.entries(E).map(([k, v]) => `<tr><th scope="row">${L ? 'Gred' : 'Grade'} ${k}</th><td>${nf.format(v[0])}–${nf.format(v[1])} g</td></tr>`).join('\n');
    return {
      HEAD_EXTRA: CSS, K_ING_OPTIONS: keys.map(k => opt(k, nm(k), k === 'flour')).join(''),
      K_UNIT_OPTIONS: [opt('cup', L ? 'cawan' : 'cups', true), opt('tbsp', L ? 'sudu besar' : 'tablespoons'), opt('tsp', L ? 'sudu kecil' : 'teaspoons'), opt('ml', 'ml'), opt('g', L ? 'gram (tukar ke cawan)' : 'grams (to cups)')].join(''),
      K_CUP_OPTIONS: [opt('250', L ? '250 ml (cawan metrik, paling biasa)' : '250 ml (metric cup, most common)', true), opt('240', L ? '240 ml (cawan AS untuk label)' : '240 ml (US legal cup)'), opt('236.59', L ? '236.6 ml (cawan AS)' : '236.6 ml (US cup)')].join(''),
      K_G: g(r.g), K_SUB: (L ? '1 cawan tepung gandum (250 ml)' : '1 cup all-purpose flour (250 ml)') + ` · ${L ? 'julat' : 'range'} ${g(r.low)}–${g(r.high)}`, K_ALL: allRows, K_NAME: nm('flour'),
      K_TABLE: big, K_RECIPE: esc(SUK_RECIPE[lang]), K_RECIPE_ROWS: recipeRows, K_EGGS: eggs,
      K_FLOUR_US: g(S.convert({ ing: 'flour', amount: '1', unit: 'cup', cup: 236.5882365 }).g), K_FLOUR_250: g(r.g), K_SUGAR_250: g(S.convert({ ing: 'sugar', amount: '1', unit: 'cup', cup: 250 }).g),
      K_BUTTER_250: g(S.convert({ ing: 'butter', amount: '1', unit: 'cup', cup: 250 }).g), K_BUTTER_SB: g(S.convert({ ing: 'butter', amount: '1', unit: 'tbsp' }).g), K_SUGAR_SB: g(S.convert({ ing: 'sugar', amount: '1', unit: 'tbsp' }).g),
      K_VERIFIED: longDate(S.FACTS.verified, lang), K_VERIFIED_ISO: S.FACTS.verified
    };
  };
  bundles['sukatan.js'] = ['assets/js/sukatan-core.js', 'assets/js/sukatan-ui.js'];

  // ---- background remover
  const bgCore = require('../assets/js/bgremove-core.js');
  renderers.bgremove = lang => {
    const L = lang === 'ms' ? 1 : 0, B = bgCore;
    const modes = [
      [L ? 'Orang (AI)' : 'People (AI)', 'MODNet', L ? 'Kira-kira 7 MB, sekali sahaja' : 'About 7 MB, one time', 'Apache-2.0', L ? 'Potret, selfie, foto produk dengan orang; rambut' : 'Portraits, selfies, people in product shots; hair'],
      [L ? 'Objek (AI)' : 'Object (AI)', 'BiRefNet-lite', L ? 'Kira-kira 115 MB, perlukan WebGPU' : 'About 115 MB, needs WebGPU', 'MIT', L ? 'Produk, kereta, haiwan, logo, apa-apa subjek' : 'Products, cars, pets, logos, any subject'],
      [L ? 'Latar polos' : 'Plain background', L ? 'Isian banjir dari tepi' : 'Flood fill from the edges', L ? 'Tiada muat turun, serta-merta' : 'No download, instant', '–', L ? 'Latar putih atau satu warna, tangkap skrin, logo' : 'White or single-colour backdrops, screenshots, logos']
    ].map(r => `<tr><th scope="row">${r[0]}</th><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td></tr>`).join('\n');
    const fmts = [
      ['PNG', L ? 'Ya' : 'Yes', L ? 'Terbesar' : 'Largest', L ? 'Pelekat, logo, reka bentuk Canva, kedai dalam talian' : 'Stickers, logos, Canva designs, online shops'],
      ['WebP', L ? 'Ya' : 'Yes', L ? 'Kira-kira 30% lebih kecil' : 'About 30% smaller', L ? 'Laman web dan blog' : 'Websites and blogs'],
      ['JPG', L ? 'Tidak (latar putih)' : 'No (white behind)', L ? 'Terkecil' : 'Smallest', L ? 'Muat naik borang, cetakan, WhatsApp' : 'Form uploads, prints, WhatsApp']
    ].map(r => `<tr><th scope="row">${r[0]}</th><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('\n');
    return { HEAD_EXTRA: CSS, B_MODES: modes, B_FORMATS: fmts, B_MAX: String(B.FACTS.maxSide).replace(/\B(?=(\d{3})+$)/, ','), B_VERIFIED: longDate(B.FACTS.verified, lang), B_VERIFIED_ISO: B.FACTS.verified };
  };
  bundles['bgremove.js'] = ['assets/js/bgremove-core.js', 'assets/js/bgremove-ai.js', 'assets/js/bgremove-ui.js'];

  // ---- passport photo
  const PF_NAMES = {
    my: ['Malaysia passport photo (print) 35 × 50 mm', 'Pasport Malaysia (cetak) 35 × 50 mm'],
    myonline: ['MyOnline Passport renewal: JPG 100–300 KB', 'Pembaharuan MyOnline Passport: JPG 100–300 KB'],
    us: ['US passport or visa 2 × 2 in', 'Pasport atau visa AS 2 × 2 inci'],
    cn: ['China visa 33 × 48 mm', 'Visa China 33 × 48 mm'],
    jp: ['Japan visa 35 × 45 mm', 'Visa Jepun 35 × 45 mm'],
    schengen: ['Schengen visa (Europe) 35 × 45 mm', 'Visa Schengen (Eropah) 35 × 45 mm'],
    uk: ['UK digital photo (at least 600 × 750 px)', 'Foto digital UK (sekurang-kurangnya 600 × 750 px)'],
    sa: ['Saudi eVisa 200 × 200 px, 5–100 KB', 'eVisa Arab Saudi 200 × 200 px, 5–100 KB'],
    in: ['India e-Visa (square), 10–300 KB', 'e-Visa India (segi empat sama), 10–300 KB']
  };
  renderers.passport = lang => {
    const L = lang === 'ms' ? 1 : 0, B = bgCore, P = B.PASSPORT, nf = n => String(n).replace('.', L ? ',' : '.');
    const options = Object.keys(P).map(k => `<option value="${k}"${k === 'my' ? ' selected' : ''}>${esc(PF_NAMES[k][L])}</option>`).join('');
    const rows = Object.entries(P).map(([k, p]) => {
      const r4 = p.mm ? B.sheet(p.mm[0], p.mm[1], 101.6, 152.4).count : '–', a4 = p.mm ? B.sheet(p.mm[0], p.mm[1], 210, 297, 0, 5).count : '–';
      const head = p.head ? `${nf(Math.round(p.head[0] * p.mm[1] * 10) / 10)}–${nf(Math.round(p.head[1] * p.mm[1] * 10) / 10)} mm` : '–';
      return `<tr><th scope="row">${esc(PF_NAMES[k][L])}</th><td>${p.mm ? p.mm.map(nf).join(' × ') + ' mm' : (L ? 'Digital sahaja' : 'Digital only')}</td><td>${p.px.join(' × ')}${p.kb ? ` · ${p.kb.join('–')} KB` : ''}</td><td>${head}</td><td>${r4}</td><td>${a4}</td></tr>`;
    }).join('\n');
    const my = P.my, px = B.printPixels(35, 50, 300);
    return {
      HEAD_EXTRA: CSS, P_OPTIONS: options, P_TABLE: rows, P_SPEC: `35 × 50 mm · ${my.px.join(' × ')} px`,
      P_PX: `${px.w} × ${px.h}`, P_R4: B.sheet(35, 50, 101.6, 152.4).count, P_A4: B.sheet(35, 50, 210, 297, 0, 5).count,
      P_VERIFIED: longDate(B.FACTS.verified, lang), P_VERIFIED_ISO: B.FACTS.verified
    };
  };
  bundles['passport.js'] = ['assets/js/bgremove-core.js', 'assets/js/bgremove-ai.js', 'assets/js/passport-ui.js'];

  return { renderers, bundles };
}
