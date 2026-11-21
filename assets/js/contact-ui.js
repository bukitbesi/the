// Contact form: posts to the Cloudflare Worker at /api/contact (tools-src/contact-worker/worker.js).
// Without JavaScript the form still posts and the worker redirects back with ?sent=1 or ?error=1.
(function () {
  'use strict';
  var form = document.querySelector('[data-tbb-contact]');
  if (!form) return;
  var status = form.querySelector('[data-status]');
  var button = form.querySelector('button[type=submit]');
  var label = button.textContent;
  var email = form.getAttribute('data-email');
  var field = function (n) { return form.elements.namedItem(n); };
  var params = new URLSearchParams(location.search);

  field('t').value = String(Date.now());
  field('page').value = document.referrer.indexOf(location.origin) === 0 ? document.referrer : '';

  var topic = (params.get('topic') || '').replace(/[^a-z]/g, '');
  var select = field('topic');
  if (topic && select.querySelector('option[value="' + topic + '"]')) select.value = topic;
  if (params.get('sent')) form.querySelector('[data-sent]').hidden = false;
  if (params.get('error')) form.querySelector('[data-failed]').hidden = false;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    button.disabled = true;
    button.textContent = 'Sending…';
    status.className = 'contact__status';
    status.textContent = '';
    fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.error || 'Your message could not be sent.');
        var done = document.createElement('div');
        done.className = 'contact__done';
        done.tabIndex = -1;
        done.innerHTML = '<h2>Thank you, your message is on its way</h2><p>We reply to every genuine message, usually within two working days. Check your spam folder if you have not heard back.</p>';
        form.replaceChildren(done);
        done.focus();
      })
      .catch(function (err) {
        var msg = err && err.message && err.message !== 'Failed to fetch' ? err.message : 'Your message could not be sent.';
        status.className = 'contact__status contact__status--err';
        status.textContent = msg + ' You can also email ' + email + '.';
        button.disabled = false;
        button.textContent = label;
      });
  });
})();
