/* JavaScript minifier worker: runs Terser or the obfuscator off the main thread, so a large file never
   blocks typing or scrolling. Each library is loaded once, on the first job that needs it. */
(function () {
  'use strict';
  var J = self.TBBJs;
  self.onmessage = function (e) {
    var job = e.data;
    try {
      if (!self.Terser) importScripts(J.VENDOR.terser);
      if (job.opts.mode === 'obfuscate' && !self.JavaScriptObfuscator) importScripts(J.VENDOR.obfuscator);
    } catch (err) {
      self.postMessage({ id: job.id, code: '', map: '', ms: 0, error: { message: 'The minifier could not load. Check your connection and try again.', line: 0, col: 0 } });
      return;
    }
    // A warm-up job only loads Terser, so the first real run is instant.
    if (job.warm) return;
    J.run({ terser: self.Terser, obfuscator: self.JavaScriptObfuscator }, job.code, job.opts).then(function (r) {
      r.id = job.id;
      self.postMessage(r);
    });
  };
})();
