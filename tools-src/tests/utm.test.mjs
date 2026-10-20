// UTM Builder core: GA4 parameter order, value cleaning, existing parameters kept, warnings, and the default channel
// group from Google's manual-traffic rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const U = require('../../assets/js/utm-core.js');

test('Builds the URL in GA4 parameter order, keeping other parameters and the fragment', () => {
  const r = U.build('example.com/promo?ref=abc#menu', { source: 'Newsletter', medium: 'Email', campaign: 'Raya Sale 2026', content: 'top button' });
  assert.equal(r.url, 'https://example.com/promo?ref=abc&utm_source=newsletter&utm_medium=email&utm_campaign=raya_sale_2026&utm_content=top_button#menu');
  assert.equal(r.channel, 'Email');
  assert.deepEqual(r.warnings, []);
  assert.equal(U.build('https://x.my/?utm_source=old&a=1', { source: 'new', medium: 'social', campaign: 'c' }).url, 'https://x.my/?a=1&utm_source=new&utm_medium=social&utm_campaign=c');
  assert.equal(U.build('https://x.my', { source: 'A B', medium: 'cpc', campaign: 'x' }, { lower: false, spaces: '' }).url, 'https://x.my/?utm_source=A%20B&utm_medium=cpc&utm_campaign=x');
  assert.equal(U.build('', {}).ok, false);
  assert.equal(U.build('ftp://x.my', {}).ok, false);
  assert.equal(U.build('http://exa mple', {}).ok, false);
});

test('Warnings', () => {
  assert.deepEqual(U.build('x.my', { source: 'fb' }).warnings, ['missing:utm_medium', 'missing:utm_campaign']);
  assert.deepEqual(U.build('x.my', { source: 'FB', medium: 'social', campaign: 'c' }, { lower: false }).warnings, ['case:utm_source']);
  assert.deepEqual(U.build('x.my', { source: 'google', medium: 'organic', campaign: 'c' }).warnings, ['medium:organic']);
  assert.deepEqual(U.build('x.my', { source: 'poster', medium: 'offline', campaign: 'c' }).warnings, ['unassigned']);
  assert.deepEqual(U.build('x.my/?gclid=1', { source: 'google', medium: 'cpc', campaign: 'c' }).warnings, ['gclid']);
});

test('GA4 default channel group rules', () => {
  const C = (s, m, c) => U.channel(s, m, c);
  assert.equal(C('facebook', 'paid_social'), 'Paid Social');
  assert.equal(C('Facebook', 'CPC'), 'Paid Social');
  assert.equal(C('facebook', 'social'), 'Organic Social');
  assert.equal(C('whatsapp', 'social'), 'Organic Social');
  assert.equal(C('google', 'cpc'), 'Paid Search');
  assert.equal(C('google', 'organic'), 'Organic Search');
  assert.equal(C('youtube', 'video'), 'Organic Video');
  assert.equal(C('tiktok_ads', 'paid'), 'Paid Other');
  assert.equal(C('partner', 'banner'), 'Display');
  assert.equal(C('shopee', 'social', 'year_end_shopping'), 'Organic Shopping');
  assert.equal(C('shopee', 'cpc', 'year_end_shopping'), 'Paid Shopping');
  assert.equal(C('mailchimp', 'e-mail'), 'Email');
  assert.equal(C('blog', 'referral'), 'Referral');
  assert.equal(C('x', 'affiliate'), 'Affiliates');
  assert.equal(C('sms', 'text'), 'SMS');
  assert.equal(C('app', 'web_push'), 'Mobile Push Notifications');
  assert.equal(C('chatgpt', 'ai-assistant'), 'AI Assistant');
  assert.equal(C('x', 'y', 'cross-network-raya'), 'Cross-network');
  assert.equal(C('qr_poster', 'offline'), 'Unassigned');
  assert.equal(C('(direct)', '(none)'), 'Direct');
});

test('Parse and presets', () => {
  assert.deepEqual(U.parse('https://x.my/a?b=1&utm_source=ig&utm_medium=social#h'), { base: 'https://x.my/a?b=1#h', values: { source: 'ig', medium: 'social' } });
  assert.equal(U.parse('http://['), null);
  assert.deepEqual(U.PRESETS.map(([n, v]) => [n, U.channel(v.source, v.medium, 'x')]), [['Instagram bio', 'Organic Social'], ['Facebook post', 'Organic Social'], ['Facebook ads', 'Paid Social'],
    ['WhatsApp broadcast', 'Organic Social'], ['Email newsletter', 'Email'], ['TikTok bio', 'Organic Social'], ['YouTube description', 'Organic Video'], ['Affiliate partner', 'Affiliates'], ['SMS', 'SMS']]);
  assert.equal(U.PARAMS.length, 9);
  assert.match(U.FACTS.verified, /^\d{4}-\d{2}-\d{2}$/);
});
