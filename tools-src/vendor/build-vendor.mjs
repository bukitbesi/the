// Rebuilds /assets/vendor from the versions pinned in package.json and rewrites LICENSES.txt from the
// packages that actually end up in each file. Only needed to update a library:
//   cd tools-src/vendor && npm install && node build-vendor.mjs && cd ../.. && node tools-src/build.mjs
// Then update VENDOR in the matching assets/js/*-core.js if a version changed, and run the tests.
// pdf-lib, mammoth and PDF.js (with its standard fonts and WebAssembly image decoders) are copied as published.
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '../../assets/vendor');
const nm = path.join(here, 'node_modules');
const version = p => JSON.parse(fs.readFileSync(path.join(nm, p, 'package.json'), 'utf8')).version;
const shim = (name, code) => { const f = path.join(here, '.shim-' + name + '.mjs'); fs.writeFileSync(f, code); return f; };
// clean-css (inside html-minifier-terser) imports Node modules only to fetch remote @import files, which is turned off.
const empty = shim('empty', 'export default {}; export const readFileSync = () => { throw new Error("fs is not available"); }; export const existsSync = () => false;\n');
const proc = shim('process', "export const process = { env: {}, cwd: () => '/', platform: 'browser', nextTick: (f, ...a) => Promise.resolve().then(() => f(...a)) };\n");

const BUNDLES = [
  { pkg: 'terser', global: 'import { minify } from "terser"; globalThis.Terser = { minify };' },
  { pkg: 'js-beautify', global: 'import b from "js-beautify"; globalThis.jsBeautify = { html: b.html, css: b.css, js: b.js };' },
  { pkg: 'html-minifier-terser', global: 'import { minify } from "html-minifier-terser"; globalThis.HTMLMinifier = { minify };' },
  { pkg: 'qrcode-generator', global: 'import qrcode from "qrcode-generator"; globalThis.qrcode = qrcode;' }
];
const COPIES = [
  { pkg: 'javascript-obfuscator', file: 'dist/index.browser.js' },
  { pkg: 'pdf-lib', file: 'dist/pdf-lib.min.js' },
  { pkg: 'mammoth', file: 'mammoth.browser.min.js' }
];
// PDF.js is an ES module with a worker; it fetches fonts and WebAssembly decoders from folders next to it on demand.
// The legacy build supports the browsers people actually use; the modern one needs brand-new JavaScript features.
const FOLDERS = [{ pkg: 'pdfjs-dist', files: ['legacy/build/pdf.min.mjs', 'legacy/build/pdf.worker.min.mjs'], dirs: ['standard_fonts', 'wasm'] }];

const licenceOf = p => {
  const d = path.join(nm, p), j = JSON.parse(fs.readFileSync(path.join(d, 'package.json'), 'utf8'));
  const f = fs.readdirSync(d).find(x => /^licen[cs]e/i.test(x));
  return { name: p, version: j.version, license: j.license, text: f ? fs.readFileSync(path.join(d, f), 'utf8').trim() : `${j.license} licence.` };
};
const sections = [];
for (const b of BUNDLES) {
  const name = `${b.pkg}-${version(b.pkg)}.js`;
  const r = await esbuild.build({
    stdin: { contents: b.global, resolveDir: here, loader: 'js' }, bundle: true, format: 'iife', platform: 'browser',
    target: 'es2019', minify: true, legalComments: 'none', write: false, metafile: true, inject: [proc],
    alias: { fs: empty, http: empty, https: empty, path: 'path-browserify', url: 'url', os: 'os-browserify/browser' },
    define: { 'process.env.NODE_ENV': '"production"' }
  });
  const pkgs = [...new Set(Object.keys(r.metafile.inputs).filter(k => k.includes('node_modules/')).map(k => {
    const p = k.slice(k.lastIndexOf('node_modules/') + 13).split('/');
    return p[0].startsWith('@') ? p[0] + '/' + p[1] : p[0];
  }))].sort();
  const lic = pkgs.map(licenceOf);
  const header = `/*! ${b.pkg} ${version(b.pkg)} (${licenceOf(b.pkg).license})${pkgs.length > 1 ? ' with ' + (pkgs.length - 1) + ' bundled packages' : ''}. Licence texts: /assets/vendor/LICENSES.txt */\n`;
  fs.writeFileSync(path.join(out, name), header + r.outputFiles[0].text);
  sections.push({ name, lic });
  console.log(name, Math.round(r.outputFiles[0].text.length / 1024) + ' KB,', pkgs.length, 'packages');
}
for (const c of COPIES) {
  const name = `${c.pkg}-${version(c.pkg)}.js`;
  fs.writeFileSync(path.join(out, name), fs.readFileSync(path.join(nm, c.pkg, c.file), 'utf8').replace(/\n\/\/# sourceMappingURL=.*\s*$/, '\n'));
  sections.push({ name, lic: [licenceOf(c.pkg)] });
  console.log(name, 'copied');
}
for (const f of FOLDERS) {
  const dir = `${f.pkg}-${version(f.pkg)}`, dest = path.join(out, dir);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  for (const file of f.files) fs.writeFileSync(path.join(dest, path.basename(file)), fs.readFileSync(path.join(nm, f.pkg, file), 'utf8').replace(/\n\/\/# sourceMappingURL=.*\s*$/, '\n'));
  for (const d of f.dirs) fs.cpSync(path.join(nm, f.pkg, d), path.join(dest, d), { recursive: true });
  sections.push({ name: dir + '/', lic: [licenceOf(f.pkg)] });
  console.log(dir + '/ copied');
}
const bar = '='.repeat(64);
fs.writeFileSync(path.join(out, 'LICENSES.txt'), 'Third-party code served from /assets/vendor/ by The Bukit Besi Tools.\n\n' +
  sections.map(s => `## ${s.name}\n\n` + s.lic.map(l => `${bar}\n${l.name} ${l.version} (${l.license})\n${bar}\n${l.text}\n`).join('\n')).join('\n'));
for (const f of fs.readdirSync(out)) if ((f.endsWith('.js') || fs.statSync(path.join(out, f)).isDirectory()) && !sections.some(s => s.name === f || s.name === f + '/')) console.log('Stale vendor file, delete it:', f);
fs.rmSync(empty); fs.rmSync(proc);
