// Batch 19 renderers and bundles (Blogger Template Generator, English and Malay).
// Same hook pattern as 13–18: the first preview, the WCAG table, the worked audit and every data table come from the
// tested core and the vendored TBB Lite theme, so the page is complete before any script runs.
export function batch19({ require, esc, longDate }) {
  const fs = require('node:fs'), path = require('node:path');
  const renderers = {}, bundles = {};
  const here = path.dirname(require.resolve('../assets/js/blogger-core.js'));
  const CSS = '<style>' + fs.readFileSync(path.join(here, '../../tools-src/css/batch19.css'), 'utf8').replace(/\/\*[^]*?\*\//g, '').replace(/\s*\n\s*/g, '').trim() + '</style>';
  const B = require('../assets/js/blogger-core.js'), C = require('../assets/js/contrast-core.js');
  const LITE = fs.readFileSync(path.join(here, '../blogger/tbb-lite.xml'), 'utf8');
  const theme = B.parseTheme(LITE), D = B.defaults(theme);

  const SWATCHES = [['#e5002b', 'Red'], ['#2563eb', 'Blue'], ['#0f766e', 'Teal'], ['#16a34a', 'Green'], ['#f59e0b', 'Amber'], ['#7c3aed', 'Violet'], ['#db2777', 'Pink'], ['#111827', 'Ink']];
  const MS = {
    vars: { 'brand.color': 'Warna jenama (butang)', 'brand.ink': 'Teks pada warna jenama', 'link.color': 'Pautan (mod cerah)', 'page.bg': 'Latar halaman', 'surface.bg': 'Latar kad dan pengepala',
      'text.color': 'Teks', 'muted.color': 'Tarikh dan kapsyen', 'line.color': 'Garis sempadan', 'dark.bg': 'Latar halaman gelap', 'dark.surface': 'Latar kad gelap', 'dark.text': 'Teks mod gelap',
      'dark.muted': 'Teks malap mod gelap', 'dark.line': 'Garis sempadan gelap', 'dark.link': 'Pautan (mod gelap)', 'body.font': 'Fon teks', 'heading.font': 'Fon tajuk', 'content.width': 'Lebar maksimum halaman', 'sidebar.width': 'Lebar bar sisi (desktop)' },
    fonts: { system: 'Sans sistem (paling pantas)', humanist: 'Sans humanis', serif: 'Serif buku', rounded: 'Sans bulat', mono: 'Monospace (blog teknologi)' },
    swatch: { Red: 'Merah', Blue: 'Biru', Teal: 'Hijau kebiruan', Green: 'Hijau', Amber: 'Kuning ambar', Violet: 'Ungu', Pink: 'Merah jambu', Ink: 'Hitam' },
    why: { size: 'Fail besar lambat dimuat dan sukar diselenggara', blocking: 'Setiap skrip luaran tanpa defer menangguhkan paparan pertama', jquery: 'Kira-kira 30 KB skrip yang jarang diperlukan', iconfont: 'Memuat turun ratusan ikon untuk beberapa sahaja',
      css: 'Setiap helaian gaya luaran menyekat paparan', canonical: 'Satu URL kanonik setiap halaman', description: 'Ringkasan dalam hasil carian', viewport: 'Tanpanya telefon memaparkan versi desktop', schema: 'Satu entiti artikel setiap entri',
      noindex: 'Halaman label dan carian ialah senarai nipis', lazy: 'Imej di bawah lipatan dimuat apabila perlu', layouts: 'Enjin susun atur terbaru Blogger', bcss: 'Elak CSS widget lalai yang tidak digunakan' }
  };
  const WHY_EN = { size: 'Big files load slowly and are hard to maintain', blocking: 'Each external script without defer delays the first paint', jquery: 'About 30 KB of script that is rarely needed', iconfont: 'Downloads hundreds of icons to show a few',
    css: 'Each external stylesheet blocks rendering', canonical: 'One canonical URL per page', description: 'Your summary in search results', viewport: 'Without it phones show the desktop version', schema: 'One article entity per post',
    noindex: 'Label and search pages are thin lists', lazy: 'Images below the fold load when needed', layouts: "Blogger's current layout engine", bcss: 'Skips default widget CSS you do not use' };
  const RULES = { size: '≤ 100 KB · ≤ 200 KB', blocking: '0 · 1', jquery: '—', iconfont: '—', css: '≤ 1 · 2', canonical: '1', description: '1', viewport: '✓', schema: '1', noindex: '✓', lazy: '✓', layouts: '3', bcss: "b:css='false'" };

  renderers.blogger = lang => {
    const ms = lang === 'ms', k = ms ? 'ms' : 'en', T = B.TEXT[k];
    const colorVars = theme.vars.filter(v => v.type === 'color');
    const label = v => ms ? MS.vars[v.name] : v.desc.replace(/ \(.*\)$/, '');
    const fontOpts = sel => B.FONTS.map(f => `<option value="${f.key}"${f.key === sel ? ' selected' : ''}>${esc(ms ? MS.fonts[f.key] : f.label)}</option>`).join('');
    const doc = B.previewDoc(B.previewCss(theme, D, false), { lang: k, title: ms ? 'Blog Saya' : 'My Blog' });
    const rows = B.checks(D), legacy = B.audit(B.LEGACY_SAMPLE), lite = B.audit(LITE);
    const examples = ['#e5002b', '#2563eb', '#16a34a', '#f59e0b', '#ffeb3b'].map(b => {
      const p = B.palette(b), r = (x, y) => C.show(B.ratioOf(p[x], p[y]));
      return `<tr><th scope="row"><span class="bt-pair" style="background:${b}"></span> <code>${b}</code></th><td><code>${p['link.color']}</code> (${r('link.color', 'surface.bg')}:1)</td><td><code>${p['dark.link']}</code> (${r('dark.link', 'dark.surface')}:1)</td><td><code>${p['brand.ink']}</code> (${r('brand.ink', 'brand.color')}:1)</td></tr>`;
    }).join('\n');
    const yellow = B.palette('#ffeb3b');
    return {
      HEAD_EXTRA: CSS,
      BT_VERIFIED: longDate(B.FACTS.verified, lang), BT_VERIFIED_ISO: B.FACTS.verified, BT_THEME: B.FACTS.theme, BT_THEME_V: B.FACTS.theme.replace(/^TBB Lite /, ''),
      BT_COLOR_COUNT: colorVars.length,
      BT_SIZE_KB: (lite.size / 1024).toFixed(1), BT_VARS: theme.vars.length, BT_PAIRS: B.PAIRS.length,
      BT_BRAND: D['brand.color'],
      BT_SWATCHES: SWATCHES.map(([c, n]) => `<button type="button" data-c="${c}" style="background:${c}" aria-label="${esc(ms ? MS.swatch[n] : n)} ${c}" title="${esc(ms ? MS.swatch[n] : n)}"></button>`).join(''),
      BT_COLORS: colorVars.map(v => `<label><input type="color" data-var="${v.name}" value="${D[v.name]}"> ${esc(label(v))}</label>`).join(''),
      BT_BODY_FONTS: fontOpts('system'), BT_HEAD_FONTS: fontOpts('system'),
      BT_SRCDOC: esc(doc),
      BT_CHECKS: B.views.checksHtml(rows, k), BT_SUM: esc(B.views.checksSummary(rows, k)),
      BT_AUDIT_EXAMPLE: B.views.auditHtml(legacy, k), BT_LEGACY_SCORE: legacy.score, BT_LEGACY_GRADE: legacy.grade, BT_LITE_SCORE: lite.score,
      BT_LEGACY_CODE: esc(B.LEGACY_SAMPLE),
      BT_VAR_ROWS: theme.vars.map(v => `<tr><th scope="row"><code>${v.name}</code></th><td>${esc(label(v))}</td><td><code>${esc(v.def.length > 40 ? v.def.slice(0, 38) + '…' : v.def)}</code></td></tr>`).join('\n'),
      BT_FONT_ROWS: B.FONTS.map(f => `<tr><th scope="row">${esc(ms ? MS.fonts[f.key] : f.label)}</th><td style="font-family:${esc(f.stack)}">${ms ? 'Bajet bulanan RM2,500' : 'Monthly budget RM2,500'}</td><td><code>${esc(f.stack)}</code></td></tr>`).join('\n'),
      BT_AUDIT_ROWS: lite.items.map(i => `<tr><th scope="row">${esc(T.checks[i.id])}</th><td>${i.weight}</td><td>${esc(RULES[i.id])}</td><td>${esc(ms ? MS.why[i.id] : WHY_EN[i.id])}</td></tr>`).join('\n'),
      BT_PALETTE_ROWS: examples,
      BT_OLD_DARK: C.check('#e5002b', '#0f0f12').text, BT_OLD_CARD: C.check('#e5002b', '#f6f6f7').text, BT_OLD_DARKCARD: C.check('#e5002b', '#1b1b20').text,
      BT_LINK_L: D['link.color'], BT_LINK_L_R: C.check(D['link.color'], D['surface.bg']).text, BT_LINK_D: D['dark.link'], BT_LINK_D_R: C.check(D['dark.link'], D['dark.surface']).text,
      BT_YELLOW_LINK: yellow['link.color'], BT_YELLOW_R: C.check(yellow['link.color'], '#ffffff').text, BT_YELLOW_INK: yellow['brand.ink'],
      BT_TEXT_R: rows[0].text
    };
  };
  bundles['blogger-template.js'] = ['assets/js/contrast-core.js', 'assets/js/blogger-core.js', 'assets/js/blogger-ui.js'];
  return { renderers, bundles };
}
