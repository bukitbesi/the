/* Loads an open background-removal model with Transformers.js (pinned 3.8.1, from jsDelivr) only when the visitor
   asks for it, and returns the matte (0-255 per pixel) for a canvas. Models download once from Hugging Face and the
   browser caches them. person: MODNet (Apache-2.0, about 7 MB); object: BiRefNet-lite (MIT, about 115 MB, needs
   WebGPU). Shared by the background remover and the passport photo maker. */
(function (root) {
  'use strict';
  var LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
  var MODELS = { person: { id: 'Xenova/modnet', gpu: 'fp16', cpu: 'q8' }, object: { id: 'onnx-community/BiRefNet_lite-ONNX', gpu: 'fp16', cpu: null } };
  var cache = {}, libP = null;
  // A real adapter, not just navigator.gpu: some browsers expose the API without a usable GPU.
  var gpuP = null;
  function gpuReady() {
    if (!gpuP) gpuP = root.navigator && root.navigator.gpu ? root.navigator.gpu.requestAdapter().then(function (a) { return !!a; }, function () { return false; }) : Promise.resolve(false);
    return gpuP;
  }

  function load(engine, onProgress) {
    return gpuReady().then(function (gpu) { return loadOn(engine, gpu, onProgress); });
  }
  function loadOn(engine, gpu, onProgress) {
    var m = MODELS[engine];
    if (!m) return Promise.reject(new Error('engine'));
    if (!gpu && !m.cpu) return Promise.reject(new Error('webgpu'));
    var key = engine + (gpu ? ':gpu' : ':cpu');
    if (cache[key]) return cache[key];
    libP = libP || import(LIB);
    var seen = {};
    cache[key] = libP.then(function (T) {
      T.env.allowLocalModels = false;
      return T.pipeline('background-removal', m.id, {
        device: gpu ? 'webgpu' : 'wasm', dtype: gpu ? m.gpu : m.cpu,
        progress_callback: function (p) {
          if (!onProgress || !p || !/\.onnx$/.test(p.file || '')) return;
          if (p.status === 'progress') { seen[p.file] = p; onProgress(Math.round(p.progress || 0), Math.round((p.total || 0) / 1e6)); }
        }
      }).catch(function (err) {
        // WebGPU can fail on some drivers: retry once on the CPU when the model has a CPU build.
        if (gpu && m.cpu) return T.pipeline('background-removal', m.id, { device: 'wasm', dtype: m.cpu });
        throw err;
      });
    });
    cache[key].catch(function () { delete cache[key]; });
    return cache[key];
  }

  // Runs the model on a canvas and returns a Uint8ClampedArray matte at the canvas size.
  function run(canvas, engine, onProgress) {
    return load(engine, onProgress).then(function (seg) {
      return new Promise(function (res) { canvas.toBlob(res, 'image/png'); }).then(function (blob) {
        var url = URL.createObjectURL(blob);
        return seg(url).then(function (out) {
          URL.revokeObjectURL(url);
          var img = Array.isArray(out) ? out[0] : out;
          var w = canvas.width, h = canvas.height;
          if (img.width !== w || img.height !== h) img = img.resize ? img.resize(w, h) : img;
          return Promise.resolve(img).then(function (im) {
            var data = im.data, ch = im.channels || Math.round(data.length / (im.width * im.height)), mask = new Uint8ClampedArray(w * h);
            for (var p = 0; p < mask.length; p++) mask[p] = data[p * ch + (ch === 4 ? 3 : 0)];
            return mask;
          });
        });
      });
    });
  }

  root.TBBBgAI = { MODELS: MODELS, gpuReady: gpuReady, load: load, run: run };
})(typeof globalThis !== 'undefined' ? globalThis : this);
