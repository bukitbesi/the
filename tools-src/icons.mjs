// Small inline SVGs: one named icon per published tool, no font or CDN requests.
const p = d => `<path d="${d}"/>`;
const circle = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}"/>`;
const rect = (x, y, w, h, r = 2) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`;
const text = (label, size = 7) => `<text x="12" y="15" text-anchor="middle" stroke="none" fill="currentColor" font-family="system-ui,sans-serif" font-weight="700" font-size="${size}">${label}</text>`;
const file = label => p('M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6v6h6') + text(label);
const sparkle = p('m17 2 1.5 3.5L22 7l-3.5 1.5L17 12l-1.5-3.5L12 7l3.5-1.5Z');
const image = rect(3, 4, 18, 16) + circle(8, 9, 1.5) + p('m3 17 5-5 4 4 3-3 6 6');
const chat = p('M20 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3Z');

export const icons = {
  'salary-calculator-malaysia': rect(2, 6, 20, 13) + p('M2 10h20') + text('RM', 6.5).replace('y="15"', 'y="17"'),
  'javascript-minifier-obfuscator': p('m12 2 8 3v6c0 5-4 8-8 11-4-3-8-6-8-11V5Z') + text('JS'),
  'css-minifier-tool': file('CSS'),
  'html-beautifier-online': p('m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18'),
  'parse-html': p('m7 4-4 8 4 8m10-16 4 8-4 8M9 9h6m-6 6h6'),
  'html-table-generator': rect(3, 3, 18, 18) + p('M3 9h18M9 3v18M15 9v12M3 15h18'),
  'json-formatter-validator': p('M8 3H6v6l-3 3 3 3v6h2m8-18h2v6l3 3-3 3v6h-2m-6-9 2 2 4-5'),
  'parser-unparser': p('M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4'),
  'github-link-converter': p('m10 14 4-4m-6 7-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2-1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0'),
  'best-javascript-minifier-online': file('JS') + p('M8 18h8'),
  'json-schema-markup-generator': rect(8, 2, 8, 5, 1) + rect(2, 17, 6, 5, 1) + rect(16, 17, 6, 5, 1) + p('M12 7v6H5v4m7-4h7v4'),
  'video-schema-markup-generator': rect(2, 5, 14, 14) + p('m16 10 6-4v12l-6-4m-9-5 5 3-5 3Z'),
  'robotstxt-generator': rect(4, 7, 16, 13, 3) + circle(8, 12, 1) + circle(16, 12, 1) + p('M9 16h6M12 7V3m-2 0h4M1 11v5m22-5v5'),
  'seo-meta-analyzer-tool': rect(2, 3, 20, 16) + p('M2 7h20m-16 4h7m-7 4h4') + circle(17, 15, 3) + p('m19 17 3 4'),
  'faq-formatter-tool': chat + p('M9 8a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3v.1'),
  'free-word-counter-seo-keyword-density': p('M3 20V10h4v10m3 0V4h4v16m3 0v-7h4v7M2 20h20'),
  'word-counter': rect(3, 3, 18, 18) + text('123', 7),
  'remove-characters-from-text': p('M3 6h12M9 6v14M5 20h8m4-8 5 5m0-5-5 5'),
  'text-to-html-converter': file('&lt;&gt;') + p('M7 6h4'),
  'find-replace-text': circle(8, 8, 5) + p('m12 12 3 3M3 20h17m-4-4 4 4-4 4'),
  'convert-case': p('m2 19 5-14 5 14M4 14h6m7-2c6-1 6 8 0 7-5-1-4-6 1-6h3m0-1v7'),
  'online-notepad': rect(5, 3, 15, 18) + p('M3 7h4M3 12h4M3 17h4m3-9h6m-6 4h6m-6 4h4'),
  'webp-image-converter': file('WP') + p('M7 18h10'),
  'image-converter': image + p('m15 2 3 2-3 2M6 18l-3 2 3 2'),
  'color-contrast': circle(12, 12, 9) + '<path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor"/>',
  'online-photoshop': p('m15 3 6 6-9 9-6 2 2-6Zm-7 11 4 4M4 3v5M2 5h5'),
  'sticker-whatsapp-maker': p('M20 14V6a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v11a3 3 0 0 0 3 3h8Zm-6 6v-6h6') + circle(8, 9, 1) + circle(14, 9, 1) + p('M7 13c2 3 5 3 7 0'),
  'whatsapp-sticker-maker': rect(2, 8, 14, 14, 3) + p('M7 8V3h15v14h-6M5 17h8M5 12h4'),
  'ai-art-prompt-optimizer-create-perfect': sparkle + p('m3 21 11-11 3 3L6 24Zm3-14V3M4 5h4'),
  'free-ai-image-generator': image + '<path d="m16 2 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" fill="currentColor"/>',
  'ai-video-prompt': sparkle + rect(2, 12, 16, 10) + p('m8 14 5 3-5 3Z'),
  'image-to-prompt': rect(2, 3, 10, 10) + p('m3 11 3-4 5 5M16 7h6m-3-3 3 3-3 3M3 18h18M3 22h13'),
  'ai-paraphraser-tool': chat + p('M7 8h9m-9 4h6M8 20l3 3m0-3-3 3'),
  'cartoonizer-ai-tool': circle(12, 12, 9) + p('M6 10h3m6 0h3m-11 6c3 3 7 3 10 0M12 3l2 4-4-1'),
  'free-privacy-policy-generator': file('PP') + p('m7 18 2 2 4-4'),
  'secure-link-generator': rect(5, 10, 14, 12) + p('M8 10V6a4 4 0 0 1 8 0v4M12 15v3'),
  'whatsapp-link-creator': chat + p('M7 8c1 5 3 7 8 7l2-2-3-2-2 1-2-2 1-2-2-2Z'),
  'semak-tracking-semua-kurier-di-malaysia': p('m12 2 9 5v10l-9 5-9-5V7Zm-9 5 9 5 9-5M12 12v10M7 4l9 5') + circle(17, 17, 2),
  'pdf-converter': file('PDF') + p('M7 18h10'),
  'currency-converter-malaysia': circle(9, 9, 7) + p('M9 4v10m3-8H8a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H6M17 8a7 7 0 1 1-9 9'),
  'tm-speed-test': p('M3 15a9 9 0 0 1 18 0m-9-3 5-5M7 20h10M3 15h3m12 0h3M12 6v3'),
  'internet-speed-test': p('M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-11 4a6 6 0 0 1 8 0') + circle(12, 20, 1),
  'kalkulator-faraid': circle(12, 4, 2) + circle(4, 18, 2) + circle(12, 18, 2) + circle(20, 18, 2) + p('M12 6v6H4v4m8-4v4m0-4h8v4'),
  'kalkulator-zakat': p('M19 5a8 8 0 1 0 0 14A10 10 0 0 1 19 5Z') + p('m18 8 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z'),
  'kalkulator-jantina-bayi': rect(3, 4, 18, 18) + p('M3 9h18M7 2v4m10-4v4') + circle(12, 15, 3) + p('m10 18 2 2 2-2'),
  'kalkulator-saiz-kasut': p('M3 4h5l2 8 5 2h6v6H3Zm0 12h18M10 8l-4 1m5 2-4 1m6 2-4 1'),
  'kalkulator-kalori': p('M12 2c2 5-2 6 1 10 1-2 3-3 4-4 5 7 3 14-5 14S1 14 6 8c0 4 3 5 3 3 0-3 2-5 3-9Z'),
  'kalkulator-bmi': rect(3, 5, 18, 16, 3) + p('M7 5V3h10v2M7 9h10l-2 5H9Zm5 1 2-2'),
  'bmi-calculator-malaysia': p('M2 20h20M3 18V8h4v10m3 0V4h4v14m3 0v-7h4v7') + p('m4 4 2-2 2 2'),
};

export function renderIcon(key) {
  if (!Object.hasOwn(icons, key)) throw new Error(`Missing tool icon: ${key}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" focusable="false">${icons[key]}</svg>`;
}
