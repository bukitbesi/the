// Rebuilds /assets/vendor from the versions pinned in package.json and rewrites LICENSES.txt from the
// packages that actually end up in each file. Only needed to update a library:
//   cd tools-src/vendor && npm install && node build-vendor.mjs && cd ../.. && node tools-src/build.mjs
// Then update VENDOR in the matching assets/js/*-core.js if a version changed, and run the tests.
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
  { pkg: 'html-minifier-terser', global: 'import { minify } from "html-minifier-terser"; globalThis.HTMLMinifier = { minify };' }
];
const COPIES = [{ pkg: 'javascript-obfuscator', file: 'dist/index.browser.js' }];

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
const bar = '='.repeat(64);
fs.writeFileSync(path.join(out, 'LICENSES.txt'), 'Third-party code served from /assets/vendor/ by The Bukit Besi Tools.\n\n' +
  sections.map(s => `## ${s.name}\n\n` + s.lic.map(l => `${bar}\n${l.name} ${l.version} (${l.license})\n${bar}\n${l.text}\n`).join('\n')).join('\n'));
for (const f of fs.readdirSync(out)) if (f.endsWith('.js') && !sections.some(s => s.name === f)) console.log('Stale vendor file, delete it:', f);
fs.rmSync(empty); fs.rmSync(proc);
