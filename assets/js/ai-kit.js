/* Small UI helpers shared by the AI tool pages: character counter, copy buttons, busy state, option state in the
   URL hash (never the user's text) and Ctrl/Cmd+Enter to submit. */
(function (root) {
  'use strict';
  var ms = document.documentElement.lang === 'ms';
  var nf = new Intl.NumberFormat(ms ? 'ms-MY' : 'en-MY');
  var Kit = {
    ms: ms, nf: nf,
    counter: function (input, out, limit) {
      var update = function () {
        var n = input.value.length;
        out.textContent = nf.format(n) + ' / ' + nf.format(limit);
        out.classList.toggle('over', n > limit);
      };
      input.addEventListener('input', update); update();
      return update;
    },
    copy: function (btn, get) {
      var label = btn.textContent;
      btn.addEventListener('click', function () {
        var text = get();
        if (!text) return;
        var done = function () { btn.textContent = ms ? 'Disalin ✓' : 'Copied ✓'; setTimeout(function () { btn.textContent = label; }, 1600); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { Kit.fallbackCopy(text); done(); });
        else { Kit.fallbackCopy(text); done(); }
      });
    },
    fallbackCopy: function (text) {
      var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) { /* nothing else to try */ } t.remove();
    },
    busy: function (btn, on, text) {
      if (on) { btn.dataset.label = btn.textContent; btn.textContent = text; btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
      else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; btn.removeAttribute('aria-busy'); }
    },
    // Saves the named option fields (radios and selects) that differ from their defaults.
    saveOptions: function (form, names) {
      var parts = [];
      names.forEach(function (n) {
        var el = form.elements[n]; if (!el) return;
        var value = el.value, def;
        if (el.length && el[0] && el[0].type === 'radio') { def = (Array.prototype.filter.call(el, function (r) { return r.defaultChecked; })[0] || {}).value; }
        else if (el.tagName === 'SELECT') def = (el.querySelector('option[selected]') || el.options[0] || {}).value;
        else def = el.defaultValue;
        if (value !== def) parts.push(n + '=' + encodeURIComponent(value));
      });
      history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
    },
    loadOptions: function (form, names) {
      if (location.hash.length < 2) return;
      location.hash.slice(1).split('&').forEach(function (p) {
        var i = p.indexOf('='); if (i < 1) return;
        var k = p.slice(0, i), v = decodeURIComponent(p.slice(i + 1)), el = form.elements[k];
        if (el && names.indexOf(k) >= 0) el.value = v;
      });
    },
    submitShortcut: function (input, form) {
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true })); } });
    },
    // Renders a word diff into a container using <ins>/<del>.
    renderDiff: function (box, parts) {
      box.textContent = '';
      parts.forEach(function (p) {
        var el = p.t === 'same' ? document.createTextNode(p.w) : document.createElement(p.t === 'add' ? 'ins' : 'del');
        if (p.t !== 'same') el.textContent = p.w;
        box.appendChild(el);
      });
    }
  };
  root.TBBAiKit = Kit;
})(typeof globalThis !== 'undefined' ? globalThis : this);
