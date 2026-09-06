/**
 * API pública de ARPA IA COMERCIAL (motor local).
 * No llama red. No usa producción. No inventa datos.
 */
(function (global) {
  function analizar(entrada) {
    const datosApi = global.ArpaIaComercialDatos;
    const analizador = global.ArpaIaComercialAnalizador;
    if (!datosApi || !analizador) {
      return {
        ok: false,
        fuente: 'local',
        hoy: '',
        oportunidades: [],
        faltantes: [{ cliente: '', faltan: ['motor'], detalle: 'El motor de IA Comercial no está cargado.' }],
        resumen: { total: 0, por_tipo: {}, por_prioridad: { ALTA: 0, MEDIA: 0, BAJA: 0 } }
      };
    }
    return analizador.analizar(datosApi.extraer(entrada || {}));
  }

  function analizarDesdeArpaSuite(extra) {
    const datosApi = global.ArpaIaComercialDatos;
    const analizador = global.ArpaIaComercialAnalizador;
    if (!datosApi || !analizador) return analizar(extra);
    if (typeof datosApi.leerDesdeArpaSuite === 'function') {
      return analizador.analizar(datosApi.leerDesdeArpaSuite(extra || {}));
    }
    return analizar(extra);
  }

  global.ArpaIaComercial = {
    analizar: analizar,
    analizarDesdeArpaSuite: analizarDesdeArpaSuite
  };
})(typeof window !== 'undefined' ? window : globalThis);
