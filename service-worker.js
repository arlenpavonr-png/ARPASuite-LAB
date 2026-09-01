// ARPA Suite — Service Worker
// Cambia CACHE_VERSION con cada deploy para que los usuarios reciban la versión nueva.
const CACHE_VERSION = 'v20260901-ot';
const CACHE_NAME = 'arpa-suite-' + CACHE_VERSION;

const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './js/arpa-brand.js',
  './js/arpa-cloud-sync.js',
  './js/arpa-catalogo.js',
  './js/arpa-mi-catalogo.js',
  './js/arpa-historial.js',
  './js/arpa-ot.js',
  './js/arpa-cotizacion.js',
  './js/arpa-cuenta-cobro.js',
  './js/arpa-license.js',
  './js/arpa-trial-capture.js',
];

// INSTALACIÓN: pre-cachear assets locales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(LOCAL_ASSETS))
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

  // NEXT: red primero para no servir una app de campo obsoleta
  if (url.includes('/next/')) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Para assets locales: caché primero, red como fallback
  if (url.includes(self.location.origin)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
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
