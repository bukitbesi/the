# Contact form worker (Cloudflare, free plan)

The form on `/contact/` posts to `https://tool.thebukitbesi.com/api/contact`. That path is served by the Cloudflare
Worker in `tools-src/contact-worker/worker.js`, which emails each message to your inbox with Cloudflare Email Routing
(`send_email` binding). Nothing is stored; the visitor's address is set as **Reply-To**, so you answer with a normal reply.

Spam protection, no captcha needed: hidden honeypot field, a 3-second fill-time trap, Origin check, a 5-link limit and
one message per IP per minute. Until the worker is deployed the page shows "could not be sent, please email
editor@thebukitbesi.com", so visitors are never stuck.

## 1. Fix Email Routing on thebukitbesi.com (once)

Email Routing for `thebukitbesi.com` must show **Ready**, not "Misconfigured". The usual cause is the root SPF record
`v=spf1 -all`, which Cloudflare needs as:

```
v=spf1 include:_spf.mx.cloudflare.net ~all
```

Dashboard → thebukitbesi.com → **Email** → **Email Routing** → **Settings**; if it lists missing records, use
**Add records and enable**. Keep `editor@thebukitbesi.com` → your Gmail as it is, and make sure that Gmail address is
listed (verified) under **Destination addresses**.

## 2. Create the worker (about 5 minutes)

1. **Workers & Pages** → **Create** → **Create Worker**, name it `tbb-contact` → **Deploy**.
2. **Edit code**, delete the sample, paste all of `tools-src/contact-worker/worker.js` → **Deploy**.
3. Worker → **Settings** → **Bindings** → **Add** → **Send email**: variable name `SEND_EMAIL`, destination address
   = your verified Gmail address → **Deploy**.
4. **Settings** → **Variables and Secrets** → **Add**: type *Text*, name `TO`, value = the same Gmail address → **Deploy**.
5. **Settings** → **Domains & Routes** → **Add** → **Route**: zone `thebukitbesi.com`, route
   `tool.thebukitbesi.com/api/contact` → **Add route**.

## 3. Test

Open `https://tool.thebukitbesi.com/contact/`, wait a few seconds, fill in the form and send. You should see
"Thank you, your message is on its way" and receive an email titled `[Tools] General question: <name>`.
If you get an error instead, open the worker → **Logs** (Real-time) and send again; `send failed` with a message names
the cause (usually an unverified destination or Email Routing not Ready).

The free plan allows 100,000 requests a day; Email Routing sending to your own verified address is free.

## Changing things

- Topics: edit `TOPICS` in the worker and the `<option>` list in `tools-src/pages/contact.html` together.
- Public address: `editor@thebukitbesi.com` appears in `contact.html` (text and `data-email`).
- Sender: the worker sends as `contact-form@thebukitbesi.com`; any address on the domain works, no rule needed.
