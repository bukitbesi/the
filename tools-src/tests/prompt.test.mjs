// AI prompt builder: platform formats, variations, surprise seeds, image analysis, vision parsing and hash state.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../../assets/js/prompt-core.js');

const CAT = { subject: 'a cat wearing a tiny songkok', setting: 'a neon-lit Kuala Lumpur street at night', lighting: 'neon glow', shot: 'close-up portrait', lens: '85mm portrait lens', mood: 'whimsical', negative: 'blurry, text, watermark', aspect: '4:5' };

test('Midjourney: keywords with --ar and --no; the twists add --stylize', () => {
  const [main, cin, art] = P.buildAll({ ...CAT, platform: 'midjourney' });
  assert.equal(main.prompt, 'a cat wearing a tiny songkok, a neon-lit Kuala Lumpur street at night, photorealistic, close-up portrait, 85mm portrait lens, neon glow, whimsical mood --ar 4:5 --no blurry, text, watermark');
  assert.equal(main.negative, '');
  assert.match(cin.prompt, /cinematic film still.*teal and orange, film grain --ar 4:5 --stylize 150 --no blurry/);
  assert.match(art.prompt, /digital painting.*pastel palette, intricate textures --ar 4:5 --stylize 400/);
  assert.deepEqual([main.label, cin.label, art.label], ['Your prompt', 'Cinematic twist', 'Artistic twist']);
});

test('Stable Diffusion: separate negative prompt, aspect in settings, token warning past 75', () => {
  const r = P.build({ ...CAT, platform: 'sd' });
  assert.equal(r.negative, 'blurry, text, watermark');
  assert.ok(r.notes.some(n => /negative prompt box/.test(n)));
  assert.ok(r.notes.some(n => /4:5/.test(n)));
  assert.ok(r.tokens <= 75 && !r.notes.some(n => /tokens/.test(n)));
  const long = P.build({ ...CAT, platform: 'sd', details: 'ornate gold embroidery, tiny paws, rain puddles reflecting signboards, steam rising from a hawker stall, crowds walking past, motorbikes, wet asphalt, bokeh lights, fine fur detail, glowing paper lanterns overhead, a tiny batik scarf' });
  assert.ok(long.tokens > 75);
  assert.ok(long.notes.some(n => /About \d+ tokens/.test(n)));
});

test('Sentence platforms: no negative syntax, a note instead; DALL·E gets the format in words', () => {
  const d = P.build({ ...CAT, platform: 'dalle' });
  assert.equal(d.prompt, 'A photorealistic photo of a cat wearing a tiny songkok in a neon-lit Kuala Lumpur street at night. Shot as a close-up portrait with an 85mm portrait lens. Neon glow, whimsical mood. Portrait 4:5 format.');
  assert.ok(!/blurry/.test(d.prompt));
  assert.ok(d.notes[0].includes('has no negative prompt'));
  const f = P.build({ ...CAT, platform: 'flux', aspect: '1:1' });
  assert.ok(!/format/.test(f.prompt));
  assert.ok(f.notes.some(n => /1:1/.test(n)));
  assert.equal(P.build({ subject: 'two dogs', style: 'cyberpunk', platform: 'flux' }).prompt, 'A cyberpunk artwork of two dogs.');
});

const WOK = { mode: 'video', subject: 'a chef tossing noodles in a flaming wok', setting: 'a busy hawker stall at night', motion: 'slow dolly in', shot: 'medium shot', lighting: 'neon glow', sound: 'sizzling wok, crowd chatter', dialogue: 'Siap!', negative: 'blurry' };

test('Video: Veo gets camera, dialogue and audio; Runway leads with the camera move; Kling keeps the negative', () => {
  assert.equal(P.build({ ...WOK, platform: 'veo' }).prompt,
    'A medium shot of a chef tossing noodles in a flaming wok in a busy hawker stall at night. Camera: slow dolly in. Neon glow. The character says: "Siap!" Audio: sizzling wok, crowd chatter.');
  const rw = P.build({ ...WOK, platform: 'runway' });
  assert.ok(rw.prompt.startsWith('Slow dolly in: A medium shot of a chef'));
  assert.ok(!/Audio|says/.test(rw.prompt));
  const k = P.build({ ...WOK, platform: 'kling' });
  assert.equal(k.negative, 'blurry');
  assert.ok(!/Audio/.test(k.prompt));
  assert.equal(P.normalize({ mode: 'video' }).aspect, '16:9');
  assert.equal(P.normalize({ mode: 'video', platform: 'midjourney' }).platform, 'veo');
  const art = P.build({ ...WOK, platform: 'veo' }, 'artistic');
  assert.ok(/stylized 3D animation, neon glow/i.test(art.prompt) && !/style style|animation style/.test(art.prompt));
});

test('Three variations always differ and never lose the subject', () => {
  for (const platform of ['midjourney', 'sd', 'dalle', 'flux', 'any']) {
    const all = P.buildAll({ subject: 'a lighthouse', platform });
    assert.equal(new Set(all.map(r => r.prompt)).size, 3, platform);
    all.forEach(r => assert.ok(r.prompt.includes('lighthouse')));
  }
  assert.equal(P.build({ subject: 'x', style: 'watercolor painting' }, 'artistic').prompt.includes('oil painting'), true);
});

test('Empty subject, control characters and length limits', () => {
  const r = P.build({ subject: '   ' });
  assert.equal(r.ok, false);
  assert.deepEqual(P.buildAll({}).map(x => x.kind), ['main', 'cinematic', 'artistic']);
  assert.equal(r.notes[0], 'Add a subject to build a prompt.');
  assert.equal(P.build({ subject: '' }, 'main', 'ms').notes[0], 'Masukkan subjek untuk membina prompt.');
  assert.equal(P.normalize({ subject: 'a\u0000cat\n\n on   a mat.' }).subject, 'a cat on a mat');
  assert.equal(P.normalize({ subject: 'x'.repeat(500) }).subject.length, 200);
});

test('Surprise me is repeatable for a seed and varies across seeds', () => {
  assert.deepEqual(P.surprise(42, 'image'), P.surprise(42, 'image'));
  const subjects = new Set(Array.from({ length: 30 }, (_, i) => P.surprise(i + 1, 'image').subject));
  assert.ok(subjects.size > 6);
  const v = P.surprise(7, 'video');
  assert.equal(v.mode, 'video');
  assert.ok('motion' in v && !('lens' in v));
});

test('Aspect ratio from image size', () => {
  assert.equal(P.aspectOf(1920, 1080), '16:9');
  assert.equal(P.aspectOf(1080, 1350), '4:5');
  assert.equal(P.aspectOf(1080, 1920), '9:16');
  assert.equal(P.aspectOf(3000, 2000), '3:2');
  assert.equal(P.aspectOf(500, 500), '1:1');
  assert.equal(P.aspectOf(0, 0), '1:1');
});

const fill = (w, h, f) => { const a = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) { const [r, g, b] = f(i); a.set([r, g, b, 255], i * 4); } return a; };

test('Pixel analysis: palette, colour names and tone hints', () => {
  const half = fill(10, 10, i => (i < 60 ? [200, 30, 35] : [40, 80, 200]));
  const a = P.analyse(half, 1600, 900);
  assert.deepEqual(a.palette.map(p => [p.name, p.share]), [['red', 60], ['blue', 40]]);
  assert.equal(a.aspect, '16:9');
  assert.equal(a.hints.color, 'vibrant colors');
  assert.equal(a.hints.details, 'color palette of red and blue');
  const grey = P.analyse(fill(4, 4, () => [30, 30, 30]), 4, 4);
  assert.equal(grey.hints.color, 'black and white');
  assert.equal(grey.hints.lighting, 'moonlight');
  const warm = P.analyse(fill(4, 4, () => [190, 150, 120]), 4, 4);
  assert.equal(warm.hints.color, 'warm tones');
  assert.equal(P.colorName(250, 250, 250), 'white');
  assert.equal(P.analyse(new Uint8ClampedArray(16), 2, 2).palette.length, 0);
});

test('Vision output: JSON, fenced JSON, arrays and plain prose', () => {
  const j = P.parseVision('Here you go:\n```json\n{"subject":"A cat in a songkok","setting":"street at night","colors":["pink","blue"],"camera":"close-up","mood":"none"}\n```');
  assert.deepEqual(j, { subject: 'a cat in a songkok', setting: 'street at night', shot: 'close-up', color: 'pink, blue' });
  assert.deepEqual(P.parseVision('The image shows a red vintage car parked by the sea.'), { subject: 'a red vintage car parked by the sea' });
  assert.deepEqual(P.parseVision('{"subject": broken}'), {});
  const m = P.merge({ subject: 'a cat', lighting: 'neon glow' }, P.analyse(fill(4, 4, () => [190, 150, 120]), 1080, 1350), 'image');
  assert.deepEqual(m, { mode: 'image', subject: 'a cat', lighting: 'neon glow', aspect: '4:5', color: 'warm tones', details: 'color palette of tan' });
});

test('URL hash round trip with short keys', () => {
  const s = P.normalize({ ...WOK, platform: 'veo', aspect: '9:16' });
  const h = P.toHash(s);
  assert.ok(h.startsWith('m=video&p=veo&ar=9%3A16&s=a%20chef'));
  const back = P.normalize(P.fromHash('#' + h));
  assert.deepEqual(back, s);
  assert.deepEqual(P.fromHash('#s=%E0%A4%A&x=1&mode=video'), { mode: 'video' });
});
