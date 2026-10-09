// ARPA Suite — Service Worker
// Cambia CACHE_VERSION con cada deploy para que los usuarios reciban la versión nueva.
const CACHE_VERSION = 'v20261009-nube-reintento';
const CACHE_NAME = 'arpa-suite-' + CACHE_VERSION;

// Todos los archivos que carga index.html (antes faltaban varios, p. ej. arpa-numeracion.js,
// y esos quedaban guardados con la versión vieja hasta el siguiente cambio de CACHE_VERSION).
const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './js/arpa-brand.js',
  './js/arpa-catalogo.js',
  './js/arpa-cloud-sync.js',
  './js/arpa-respaldo-nube.js',
  './respaldo.html',
  './js/arpa-cobros.js',
  './js/arpa-cotizacion.js',
  './js/arpa-cuenta-cobro.js',
  './js/arpa-formato-tipo.js',
  './js/arpa-historial.js',
  './js/arpa-i18n.js',
  './js/arpa-install-prompt.js',
  './js/arpa-license.js',
  './js/arpa-mi-catalogo.js',
  './js/arpa-numeracion.js',
  './js/arpa-oficios.js',
  './js/arpa-onboarding.js',
  './js/arpa-pricing.js',
  './js/arpa-signature.js',
  './js/arpa-trial-capture.js',
  './js/arpa-views.js',
  './js/arpa-whatsapp.js',
  './js/catalogo-bft-nas.js',
  './js/catalogo-ppa.js',
  './js/html2canvas.min.js',
  './js/jspdf.umd.min.js',
  './js/qrcode.min.js',
  // ARPA NEXT (app de campo; se abre solo con la actualización anual vigente)
  './js/arpa-actualizaciones.js',
  './next/',
  './next/css/app.css',
  './next/index.html',
  './next/js/ai/knowledge.js',
  './next/js/ai/parser.js',
  './next/js/ai/recommend.js',
  './next/js/app.js',
  './next/js/backup.js',
  './next/js/cloud.js',
  './next/js/flow.js',
  './next/js/followup.js',
  './next/js/legacy.js',
  './next/js/pdf.js',
  './next/js/photos.js',
  './next/js/quote.js',
  './next/js/report.js',
  './next/js/screens.js',
  './next/js/share.js',
  './next/js/signature.js',
  './next/js/store.js',
  './next/js/ui.js',
  './next/js/voice.js',
  './next/manifest.json',
];

// INSTALACIÓN: pre-cachear assets locales
self.addEventListener('install', (event) => {
  event.waitUntil(
    // cache: 'reload' → baja los archivos del servidor y no de la caché HTTP del navegador
    // (GitHub Pages permite guardarlos 10 min; abrir la app justo después de publicar dejaba la versión vieja).
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(LOCAL_ASSETS.map((u) => new Request(u, { cache: 'reload' })))
    )
  );
  self.skipWaiting();
});

// ACTIVACIÓN: borrar cachés de versiones anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k.startsWith('arpa-suite-') && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// FETCH: red primero para APIs y recursos externos, caché primero para assets locales
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // No interceptar llamadas a la API de Google ni recursos de terceros
  if (url.includes('script.google.com') ||
      url.includes('cdnjs.cloudflare.com') ||
      url.includes('fonts.googleapis.com') ||
      url.includes('fonts.gstatic.com')) {
    return;
  }

  // Para assets locales: caché primero, red como fallback
  if (url.includes(self.location.origin)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        const fresh = event.request.mode === 'navigate'
          ? event.request
          : new Request(event.request, { cache: 'no-cache' });
        return fetch(fresh).then((response) => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
  }
});
