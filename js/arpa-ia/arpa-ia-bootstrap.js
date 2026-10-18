/**
 * Arranque único de IA en LAB.
 * index.html solo carga este script; el resto vive bajo js/arpa-ia/.
 */
(function (global) {
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (!global.document) {
        reject(new Error('document ausente'));
        return;
      }
      const existing = global.document.querySelector('script[data-arpa-ia-boot="' + src + '"]');
      if (existing) {
        resolve();
        return;
      }
      const s = global.document.createElement('script');
      s.src = src;
      s.async = false;
      s.setAttribute('data-arpa-ia-boot', src);
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('No se pudo cargar: ' + src)); };
      global.document.head.appendChild(s);
    });
  }

  function start() {
    loadScript('./js/arpa-ia/arpa-ia-panels.js')
      .then(function () { return loadScript('./js/arpa-ia/arpa-ia-registry.js'); })
      .then(function () { return loadScript('./js/arpa-ia/arpa-ia-host.js'); })
      .then(function () {
        const host = global.ArpaIaHost;
        if (!host || typeof host.boot !== 'function') {
          throw new Error('ArpaIaHost no disponible');
        }
        return host.boot();
      })
      .catch(function (err) {
        console.warn('[ARPA IA] Falló el arranque:', err && err.message ? err.message : err);
      });
  }

  if (!global.document) return;
  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(typeof window !== 'undefined' ? window : globalThis);
