/**
 * App al día al primer intento (Arlen, 26-nov-2026).
 * Antes, al publicar una mejora, la app había que abrirla DOS veces: la primera cargaba la versión
 * guardada y bajaba la nueva por detrás. Ahora, cuando la versión nueva ya está lista:
 *  - si la app se acaba de abrir (primeros 20 segundos), se recarga sola y queda al día;
 *  - si la persona ya estaba trabajando, espera a que salga y vuelva a la app para recargar,
 *    así nunca se le borra lo que está escribiendo (los borradores se guardan antes).
 * Una sola recarga por apertura: nunca entra en un ciclo.
 */
(function (global) {
  'use strict';
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || global.ArpaAlDia) return;

  const FLAG = 'arpa_al_dia_recargado';
  const VENTANA_MS = 20000;
  const t0 = Date.now();
  // Solo si ya había una versión guardada: la primera vez que alguien abre la app no hay nada que actualizar.
  const habiaVersion = !!navigator.serviceWorker.controller;
  let pendiente = false;

  function yaRecargo() {
    try { return global.sessionStorage.getItem(FLAG) === '1'; } catch (e) { return true; }
  }

  function guardarBorradores() {
    try { global.persistFormatoDraftToStorage?.(); } catch (e) { /* sin borrador de formato */ }
    try { global.ArpaCotizacion?.scheduleCotDraftSave?.(); } catch (e) { /* sin borrador de cotización */ }
    try { global.ArpaCuentaCobro?.scheduleCcDraftSave?.(); } catch (e) { /* sin borrador de cuenta de cobro */ }
  }

  function recargar() {
    if (yaRecargo()) return;
    try { global.sessionStorage.setItem(FLAG, '1'); } catch (e) { return; }
    guardarBorradores();
    setTimeout(() => global.location.reload(), 400);
  }

  // La marca dura solo un rato: así la siguiente mejora también llega sin abrir dos veces.
  if (yaRecargo()) {
    setTimeout(() => { try { global.sessionStorage.removeItem(FLAG); } catch (e) { /* nada */ } }, 60000);
  }

  if (habiaVersion) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (yaRecargo()) return;
      if (Date.now() - t0 < VENTANA_MS) recargar();
      else pendiente = true;
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && pendiente) guardarBorradores();
      if (document.visibilityState === 'visible' && pendiente) recargar();
    });
  }

  global.ArpaAlDia = { recargar, _estado: () => ({ habiaVersion, pendiente, t0 }) };
})(typeof window !== 'undefined' ? window : globalThis);
