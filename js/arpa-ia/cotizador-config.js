/**
 * Configuración LAB del motor IA (versión para Git).
 * Por defecto: local, sin endpoint.
 * No pegar LICENSE_API, COT_SHEETS_URL, endpoints remotos, IDs ni claves.
 * El endpoint remoto DEV, si se usa, vive solo en la máquina local
 * y no forma parte de este archivo versionado.
 */
(function (global) {
  const api = global.ArpaIaCotizadorApi;
  if (!api || typeof api.configure !== 'function') return;
  api.configure({
    mode: 'local',
    endpoint: ''
  });
})(typeof window !== 'undefined' ? window : globalThis);
