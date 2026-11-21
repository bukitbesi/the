// Contact form for /contact/ (Cloudflare Workers + Email Routing, free plan).
// Runs on the route tool.thebukitbesi.com/api/contact, so the form posts to its own origin (no CORS).
// Each message is emailed to the owner's verified Email Routing address; nothing is stored.
// Deploy steps: documentation/contact-worker.md
import { EmailMessage } from 'cloudflare:email';

const ORIGINS = ['https://tool.thebukitbesi.com'];
const PAGE = 'https://tool.thebukitbesi.com/contact/';
const FROM = 'contact-form@thebukitbesi.com';
const TOPICS = {
  general: 'General question',
  correction: 'Wrong rate or result',
  tool: 'Tool idea or feedback',
  advertising: 'Advertising and sponsorship',
  business: 'Partnership or business use',
  press: 'Press and media'
};
const MIN_FILL_MS = 3000; // humans take longer than this to fill the form
const RATE_WINDOW = 60;   // seconds between messages from one IP (per Cloudflare data centre)

const clean = (v, max) => String(v || '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max);
const oneLine = (v, max) => clean(v, max).replace(/\s+/g, ' ');
const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i;

function b64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
// RFC 2047 header encoding keeps names and subjects in any script readable.
const header = s => /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`;

function mime({ to, replyName, replyEmail, subject, text }) {
  const id = `<${crypto.randomUUID()}@thebukitbesi.com>`;
  return [
    `From: "Bukit Besi Tools contact form" <${FROM}>`,
    `To: <${to}>`,
    `Reply-To: ${header(replyName.replace(/["\\]/g, ''))} <${replyEmail}>`,
    `Subject: ${header(subject)}`,
    `Message-ID: ${id}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    b64(text).replace(/.{1,76}/g, '$&\r\n')
  ].join('\r\n');
}

function reply(request, ok, error, status) {
  const wantsJson = (request.headers.get('Accept') || '').includes('application/json');
  if (wantsJson) {
    return new Response(JSON.stringify(ok ? { ok: true } : { ok: false, error }), {
      status: status || (ok ? 200 : 400),
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }
  // Without JavaScript the browser follows this back to the page, which shows the matching notice.
  return Response.redirect(PAGE + (ok ? '?sent=1#form' : '?error=1#form'), 303);
}

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') return new Response('POST only', { status: 405, headers: { Allow: 'POST' } });

    const source = request.headers.get('Origin') || request.headers.get('Referer') || '';
    if (!ORIGINS.some(o => source === o || source.startsWith(o + '/'))) return reply(request, false, 'Please send the form from our contact page.', 403);
    if (Number(request.headers.get('Content-Length') || 0) > 20000) return reply(request, false, 'Your message is too long.', 413);

    let form;
    try { form = await request.formData(); } catch { return reply(request, false, 'Your message could not be read.'); }

    // Bots fill the hidden field or submit instantly; tell them it worked and drop the message.
    const started = Number(form.get('t'));
    if (clean(form.get('website'), 200) || (started && Date.now() - started < MIN_FILL_MS)) return reply(request, true);

    const name = oneLine(form.get('name'), 100);
    const email = oneLine(form.get('email'), 200);
    const company = oneLine(form.get('company'), 120);
    const topicKey = oneLine(form.get('topic'), 20);
    const topic = TOPICS[topicKey] || TOPICS.general;
    const message = clean(form.get('message'), 5000);
    const page = oneLine(form.get('page'), 300);

    if (name.length < 2) return reply(request, false, 'Please enter your name.');
    if (!EMAIL_RE.test(email)) return reply(request, false, 'Please enter a valid email address.');
    if (message.length < 10) return reply(request, false, 'Please write a little more in your message.');
    if ((message.match(/https?:\/\//gi) || []).length > 5) return reply(request, false, 'Please include no more than five links.');

    const ip = request.headers.get('CF-Connecting-IP') || '';
    const cache = caches.default;
    const rateKey = new Request('https://rate.invalid/contact/' + encodeURIComponent(ip));
    if (ip && await cache.match(rateKey)) return reply(request, false, 'Please wait a minute before sending another message.', 429);

    const text = [
      `Name: ${name}`,
      `Email: ${email}`,
      company ? `Company or website: ${company}` : null,
      `Topic: ${topic}`,
      page.startsWith(ORIGINS[0]) ? `Came from: ${page}` : null,
      `Country: ${(request.cf && request.cf.country) || 'unknown'}`,
      '',
      message,
      '',
      '--',
      `Sent from ${PAGE}. Reply to this email to answer ${name}.`
    ].filter(l => l !== null).join('\n');

    try {
      const raw = mime({ to: env.TO, replyName: name, replyEmail: email, subject: `[Tools] ${topic}: ${name}`, text });
      await env.SEND_EMAIL.send(new EmailMessage(FROM, env.TO, raw));
    } catch (e) {
      console.error('send failed', e && e.message);
      return reply(request, false, 'Your message could not be sent.', 502);
    }

    if (ip) ctx.waitUntil(cache.put(rateKey, new Response('1', { headers: { 'Cache-Control': `max-age=${RATE_WINDOW}` } })));
    return reply(request, true);
  }
};
