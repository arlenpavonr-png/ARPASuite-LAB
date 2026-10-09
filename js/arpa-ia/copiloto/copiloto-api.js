/**
 * API de ARPA IA COPILOTO.
 * El motor local es la fuente de verdad. El LLM DEV solo redacta después.
 * Solo lectura. No escribe en ARPASuite.
 */
(function (global) {
  function respuestaVacia(intencion, advertencia) {
    const respuesta = global.ArpaIaCopilotoRespuesta;
    if (respuesta && typeof respuesta.construir === 'function') {
      return respuesta.construir(intencion || 'desconocida', {
        disponible: false,
        items: [],
        advertencias: [advertencia || 'El motor del Copiloto no está cargado.']
      });
    }
    return {
      ok: true,
      intencion: intencion || 'desconocida',
      datos_disponibles: false,
      resultados: [],
      resumen: 'NO DISPONIBLE EN LAB',
      advertencias: [advertencia || 'El motor del Copiloto no está cargado.'],
      fuente: 'local',
      llm_usado: false
    };
  }

  function consultarLocal(pregunta, contexto, desdeArpa) {
    const parser = global.ArpaIaCopilotoParser;
    const consultas = global.ArpaIaCopilotoConsultas;
    const respuesta = global.ArpaIaCopilotoRespuesta;
    if (!parser || !consultas || !respuesta) {
      return respuestaVacia('desconocida');
    }
    const ctx = contexto && typeof contexto === 'object' ? contexto : {};
    const parsed = parser.parsear(pregunta);
    if (parsed.intencion === parser.INTENCIONES.DESCONOCIDA) {
      return respuesta.construir(parsed.intencion, {
        disponible: false,
        items: [],
        advertencias: ['No se pudo determinar la intención. No se inventó una consulta.']
      }, {
        oficio: consultas.leerOficioConfigurado(ctx),
        hoy: ctx.hoy || ''
      });
    }
    const pack = desdeArpa ? consultas.leerDesdeArpaSuite(ctx) : consultas.extraer(ctx);
    if (!desdeArpa) {
      pack.oficio = consultas.leerOficioConfigurado(ctx);
      if (!pack.hoy && ctx.hoy) pack.hoy = consultas.parseFecha(ctx.hoy) || pack.hoy;
    }
    const consulta = consultas.ejecutar(parsed.intencion, pack, parsed, ctx);
    return respuesta.construir(parsed.intencion, consulta, {
      oficio: pack.oficio,
      hoy: pack.hoy
    });
  }

  function consultar(pregunta, contexto) {
    return consultarLocal(pregunta, contexto, false);
  }

  function consultarDesdeArpaSuite(pregunta, extra) {
    const parser = global.ArpaIaCopilotoParser;
    const consultas = global.ArpaIaCopilotoConsultas;
    const respuesta = global.ArpaIaCopilotoRespuesta;
    if (!parser || !consultas || !respuesta) {
      return consultar(pregunta, extra);
    }
    return consultarLocal(pregunta, extra, true);
  }

  async function enriquecerConLlm(local, options) {
    const respuesta = global.ArpaIaCopilotoRespuesta;
    const llm = global.ArpaIaCopilotoLlm;
    if (!respuesta || typeof respuesta.aplicarRedaccion !== 'function' || !llm) {
      return local;
    }
    const opts = options && typeof options === 'object' ? options : {};
    if (opts.localOnly) return local;
    const pack = llm.construirPaquete(local);
    let remote;
    try {
      remote = await llm.redactar(pack, opts);
    } catch (err) {
      return respuesta.aplicarRedaccion(local, {
        ok: false,
        motivo: 'El LLM DEV no se pudo consultar.'
      });
    }
    if (!remote || !remote.ok || !remote.texto) {
      const motivo = remote && remote.error && remote.error.mensaje
        ? remote.error.mensaje
        : (remote && remote.error && remote.error.codigo) || 'El LLM DEV no redactó.';
      return respuesta.aplicarRedaccion(local, { ok: false, motivo: String(motivo) });
    }
    const validado = llm.validarRedaccion(remote.texto, pack);
    return respuesta.aplicarRedaccion(local, validado);
  }

  async function consultarAsync(pregunta, contexto, options) {
    const local = consultar(pregunta, contexto);
    return enriquecerConLlm(local, options);
  }

  async function consultarDesdeArpaSuiteAsync(pregunta, extra, options) {
    const local = consultarDesdeArpaSuite(pregunta, extra);
    return enriquecerConLlm(local, options);
  }

  global.ArpaIaCopiloto = {
    consultar: consultar,
    consultarDesdeArpaSuite: consultarDesdeArpaSuite,
    consultarAsync: consultarAsync,
    consultarDesdeArpaSuiteAsync: consultarDesdeArpaSuiteAsync
  };
})(typeof window !== 'undefined' ? window : globalThis);
