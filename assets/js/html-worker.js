/* HTML tool worker: beautifies or minifies off the main thread and runs the checker on the input.
   Each library is loaded once, on the first job that needs it. */
(function () {
  'use strict';
  var H = self.TBBHtml;
  var CHECK_MAX = 2000000;
  self.onmessage = function (e) {
    var job = e.data, minify = job.opts.mode === 'minify';
    try {
      if (minify && !self.HTMLMinifier) importScripts(H.VENDOR.minifier);
      if (!minify && !self.jsBeautify) importScripts(H.VENDOR.beautifier);
    } catch (err) {
      self.postMessage({ id: job.id, code: '', ms: 0, issues: [], error: { message: 'The formatter could not load. Check your connection and try again.', line: 0, col: 0 } });
      return;
    }
    if (job.warm) return;
    H.run({ minifier: self.HTMLMinifier, beautifier: self.jsBeautify }, job.code, job.opts).then(function (r) {
      r.id = job.id;
      r.issues = job.code.length <= CHECK_MAX ? H.check(job.code) : null;
      self.postMessage(r);
    });
  };
})();
