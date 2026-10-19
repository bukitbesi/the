// Schema Markup Generator core: every type builds valid JSON-LD from its defaults, Google's required properties are
// enforced, and helpers convert durations, dates, opening hours and YouTube links.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../../assets/js/schema-core.js');

test('Every type builds from its defaults', () => {
  for (const type of Object.keys(S.TYPES)) {
    const r = S.generate(type, S.defaults(type));
    assert.equal(r.json['@context'], 'https://schema.org', type);
    assert.ok(r.json['@type'], type);
    assert.deepEqual(JSON.parse(r.text), r.json);
    if (type !== 'software') assert.deepEqual(r.errors, [], type + ': ' + r.errors.join(' '));
  }
  assert.equal(Object.keys(S.TYPES).length, 11);
});

test('Helpers', () => {
  assert.equal(S.duration('3:25'), 'PT3M25S');
  assert.equal(S.duration('1:02:03'), 'PT1H2M3S');
  assert.equal(S.duration('0:00'), 'PT0S');
  assert.equal(S.duration('90', 'min'), 'PT1H30M');
  assert.equal(S.duration('x:1'), undefined);
  assert.equal(S.dateTime('2026-10-19T20:00'), '2026-10-19T20:00:00+08:00');
  assert.equal(S.dateTime('2026-10-19'), '2026-10-19');
  assert.deepEqual(S.hours('Mon-Fri 09:00-18:00\nSat 9.30-13:00\nSun closed'), [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '18:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Saturday', opens: '09:30', closes: '13:00' }]);
  assert.deepEqual(S.hours('Fri-Mon 10:00-22:00')[0].dayOfWeek, ['Friday', 'Saturday', 'Sunday', 'Monday']);
  for (const u of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ?t=4', 'https://youtube.com/shorts/dQw4w9WgXcQ', 'https://www.youtube.com/watch?feature=x&v=dQw4w9WgXcQ'])
    assert.equal(S.youtubeId(u), 'dQw4w9WgXcQ', u);
  assert.deepEqual(S.clean({ '@type': 'X', a: '', b: [], c: { '@type': 'Y', d: '' }, e: 0 }), { '@type': 'X', e: 0 });
});

test('Video: YouTube link fills thumbnail and embed; required properties enforced', () => {
  const r = S.generate('video', S.defaults('video'));
  assert.equal(r.json.thumbnailUrl, 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  assert.equal(r.json.embedUrl, 'https://www.youtube.com/embed/dQw4w9WgXcQ');
  assert.equal(r.json.duration, 'PT3M25S');
  assert.equal(r.json.uploadDate, '2026-10-19T20:00:00+08:00');
  const bad = S.generate('video', { name: '', uploadDate: '', thumbnailUrl: '', duration: '3m' });
  assert.deepEqual(bad.errors, ['Video title is required by Google.', 'Thumbnail URL is required by Google.', 'Upload date and time is required by Google.', 'Duration must look like 3:25 or 1:02:03.']);
});

test('Product, local business and event rules', () => {
  const p = S.generate('product', S.defaults('product'));
  assert.deepEqual(p.json.offers, { '@type': 'Offer', price: '45.90', priceCurrency: 'MYR', availability: 'https://schema.org/InStock' });
  assert.match(S.generate('product', { name: 'X' }).errors.join(), /Add a price or a rating/);
  assert.match(S.generate('product', { name: 'X', price: 1, ratingValue: 7, ratingCount: 3 }).errors.join(), /between 1 and 5/);
  const l = S.generate('local', S.defaults('local'));
  assert.equal(l.json.address.postalCode, '23200');
  assert.equal(l.json.openingHoursSpecification.length, 2);
  assert.match(S.generate('local', { ...S.defaults('local'), hours: 'weekdays 9 to 5' }).errors.join(), /Opening hours not understood: weekdays 9 to 5/);
  const online = S.generate('event', { ...S.defaults('event'), mode: 'OnlineEventAttendanceMode', online: 'https://meet.example.com/x' });
  assert.deepEqual(online.json.location, { '@type': 'VirtualLocation', url: 'https://meet.example.com/x' });
  assert.equal(S.generate('event', { ...S.defaults('event'), mode: 'MixedEventAttendanceMode', online: 'https://x.my' }).json.location.length, 2);
  assert.match(S.generate('event', { ...S.defaults('event'), mode: 'OnlineEventAttendanceMode' }).errors.join(), /Online event URL is required/);
});

test('Recipe, breadcrumb, FAQ, software and output', () => {
  const r = S.generate('recipe', S.defaults('recipe')).json;
  assert.deepEqual([r.prepTime, r.cookTime, r.totalTime], ['PT20M', 'PT40M', 'PT1H']);
  assert.equal(r.recipeInstructions[1]['@type'], 'HowToStep');
  const b = S.generate('breadcrumb', S.defaults('breadcrumb')).json;
  assert.deepEqual(b.itemListElement[2], { '@type': 'ListItem', position: 3, name: 'Zakat Pendapatan' });
  assert.match(S.generate('breadcrumb', { items: 'Home\nPage' }).errors.join(), /needs a URL/);
  const f = S.generate('faq', S.defaults('faq')).json;
  assert.equal(f.mainEntity.length, 2);
  assert.equal(f.mainEntity[1].acceptedAnswer.text, '2.5% daripada pendapatan yang layak.');
  assert.equal(S.generate('faq', { qa: 'Is 5 < 6?\nYes & always.' }).html, '<div class="faq">\n  <details>\n    <summary>Is 5 &lt; 6?</summary>\n    <p>Yes &amp; always.</p>\n  </details>\n</div>');
  assert.equal(S.generate('article', S.defaults('article')).html, undefined);
  assert.match(S.generate('software', S.defaults('software')).errors.join(), /rating or review from real users/);
  assert.match(S.generate('article', { headline: 'x', url: 'example.com' }).errors.join(), /full URL/);
  assert.equal(S.scriptTag('{"a":"</script>"}'), '<script type="application/ld+json">\n{"a":"<\\/script>"}\n</script>');
  assert.match(S.views.formHtml('video'), /id="sf_youtube"/);
  assert.match(S.FACTS.verified, /^\d{4}-\d{2}-\d{2}$/);
});
