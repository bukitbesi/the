// Color Contrast Checker core: WCAG ratios on known pairs, thresholds, parsing, alpha blending, suggestions and
// colour-vision simulation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../../assets/js/contrast-core.js');

test('WCAG ratios on known pairs', () => {
  assert.equal(C.check('#000', '#fff').text, '21.00');
  assert.equal(C.check('#ffffff', '#ffffff').text, '1.00');
  assert.equal(C.check('#767676', '#fff').text, '4.54');
  assert.equal(C.check('#777777', '#fff').text, '4.47');
  assert.equal(C.check('#595959', '#fff').text, '7.00');
  assert.equal(C.check('#949494', '#fff').text, '3.03');
  const r = C.check('#767676', 'white');
  assert.deepEqual(r.pass, { aaNormal: true, aaLarge: true, aaaNormal: false, aaaLarge: true, ui: true });
  assert.equal(C.check('#777', '#fff').pass.aaNormal, false);
  assert.equal(C.check('#fff', '#000').ratio, C.check('#000', '#fff').ratio);
});

test('Parses hex, rgb, hsl and names', () => {
  assert.deepEqual(C.parse('#abc'), { r: 170, g: 187, b: 204, a: 1 });
  assert.deepEqual(C.parse('ff000080'), { r: 255, g: 0, b: 0, a: 0.502 });
  assert.deepEqual(C.parse('rgb(10, 20, 30)'), { r: 10, g: 20, b: 30, a: 1 });
  assert.deepEqual(C.parse('rgb(10 20 30 / 50%)'), { r: 10, g: 20, b: 30, a: 0.5 });
  assert.deepEqual(C.parse('hsl(0, 100%, 50%)'), { r: 255, g: 0, b: 0, a: 1 });
  assert.deepEqual(C.parse('hsl(120 100% 25%)'), { r: 0, g: 128, b: 0, a: 1 });
  assert.deepEqual(C.parse('RebeccaPurple'), { r: 102, g: 51, b: 153, a: 1 });
  assert.equal(C.parse('notacolor'), null);
  assert.equal(C.parse('#12345'), null);
  assert.equal(C.check('nope', '#fff'), null);
});

test('Transparent text is blended over the background', () => {
  const r = C.check('rgba(0,0,0,0.5)', '#ffffff');
  assert.deepEqual([r.fg.r, r.translucent], [128, true]);
  assert.equal(r.text, C.check('#808080', '#fff').text);
});

test('Suggests the nearest passing colour', () => {
  const s = C.suggest(C.parse('#999999'), C.parse('#ffffff'), 4.5);
  assert.ok(s.ratio >= 4.5 && s.ratio < 4.7, String(s.ratio));
  assert.equal(s.hex, '#767676');
  const light = C.suggest(C.parse('#333333'), C.parse('#000000'), 7);
  assert.ok(light.ratio >= 7 && C.luminance(light.color) > C.luminance(C.parse('#333333')));
  const brand = C.suggest(C.parse('#5b9bd5'), C.parse('#ffffff'), 4.5);
  const h1 = C.rgbToHsl(C.parse('#5b9bd5')).h, h2 = C.rgbToHsl(brand.color).h;
  assert.ok(brand.ratio >= 4.5 && Math.abs(h1 - h2) < 3, brand.hex);
  assert.equal(C.suggest(C.parse('#000'), C.parse('#fff'), 4.5).hex, '#000000');
});

test('Colour-vision simulation and palette matrix', () => {
  assert.deepEqual(C.simulate(C.parse('#ffffff'), 'protanopia'), { r: 255, g: 255, b: 255, a: 1 });
  const red = C.simulate(C.parse('#ff0000'), 'protanopia');
  assert.ok(red.r < 120 && red.g < 120, JSON.stringify(red));
  const m = C.matrix(['#000', '#fff', 'oops', 'red']);
  assert.deepEqual(m.colors, ['#000000', '#ffffff', '#ff0000']);
  assert.equal(m.cells[0][1].text, '21.00');
  assert.match(C.views.matrixHtml(m), /21\.00/);
  assert.match(C.views.resultHtml(C.check('#767676', '#fff')), /Good: passes AA/);
  assert.match(C.views.cvdRows(C.check('#000', '#fff')), /Deuteranopia/);
  assert.equal(C.show(4.4999), '4.49');
  assert.match(C.FACTS.verified, /^\d{4}-\d{2}-\d{2}$/);
});
