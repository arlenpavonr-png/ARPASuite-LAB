/**
 * API pública de ARPA IA INTEGRAL.
 * Clasifica en local (enum cerrado) y reutiliza los motores existentes.
 * No escribe datos. No cambia el oficio.
 */
(function (global) {
  function vacio(advertencia) {
    return {
      ok: true,
      intencion: 'desconocida',
      motor: 'ninguno',
      oficio: '',
      datos_disponibles: false,
      resumen: 'NO DISPONIBLE EN LAB',
      aclaracion: global.ArpaIaIntegralRouter ? global.ArpaIaIntegralRouter.ACLARACION : '',
      advertencias: [advertencia || 'La capa INTEGRAL no está cargada.'],
      resultado: null,
      otras_opciones: [],
      fuente: 'local',
      escritura: false
    };
  }

  function ejecutarLocal(texto, contexto, desdeArpa) {
    const parser = global.ArpaIaIntegralParser;
    const router = global.ArpaIaIntegralRouter;
    if (!parser || !router) return vacio();
    const parsed = parser.parsear(texto);
    return router.despachar(parsed, contexto || {}, { desdeArpa: !!desdeArpa });
  }

  function ejecutar(texto, contexto) {
    return ejecutarLocal(texto, contexto, false);
  }

  function ejecutarDesdeArpaSuite(texto, extra) {
    const ctx = extra && typeof extra === 'object' ? extra : {};
    if (!ctx.ot && global.ArpaIaInformesUi && typeof global.ArpaIaInformesUi.recogerOtDesdeFormato === 'function') {
      try { ctx.ot = global.ArpaIaInformesUi.recogerOtDesdeFormato(); } catch (e) { /* solo lectura */ }
    }
    return ejecutarLocal(texto, ctx, true);
  }

  async function ejecutarAsync(texto, contexto, options) {
    const parser = global.ArpaIaIntegralParser;
    const router = global.ArpaIaIntegralRouter;
    if (!parser || !router) return vacio();
    const parsed = parser.parsear(texto);
    const opts = Object.assign({}, options || {}, { desdeArpa: false });
    return router.despacharAsync(parsed, contexto || {}, opts);
  }

  async function ejecutarDesdeArpaSuiteAsync(texto, extra, options) {
    const parser = global.ArpaIaIntegralParser;
    const router = global.ArpaIaIntegralRouter;
    if (!parser || !router) return vacio();
    const ctx = extra && typeof extra === 'object' ? extra : {};
    if (!ctx.ot && global.ArpaIaInformesUi && typeof global.ArpaIaInformesUi.recogerOtDesdeFormato === 'function') {
      try { ctx.ot = global.ArpaIaInformesUi.recogerOtDesdeFormato(); } catch (e) { /* solo lectura */ }
    }
    const parsed = parser.parsear(texto);
    const opts = Object.assign({}, options || {}, { desdeArpa: true });
    return router.despacharAsync(parsed, ctx, opts);
  }

  global.ArpaIaIntegral = {
    ejecutar: ejecutar,
    ejecutarAsync: ejecutarAsync,
    ejecutarDesdeArpaSuite: ejecutarDesdeArpaSuite,
    ejecutarDesdeArpaSuiteAsync: ejecutarDesdeArpaSuiteAsync
  };
})(typeof window !== 'undefined' ? window : globalThis);
