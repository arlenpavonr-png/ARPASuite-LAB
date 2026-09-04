/**
 * Orquestador: oficio → perfil → catálogo de esa empresa → matcher.
 */
(function (global) {
  function emptyResult(solicitud, oficioId) {
    return {
      solicitud_original: String(solicitud || '').trim(),
      oficio_id: oficioId || null,
      perfil_id: null,
      catalogo_fuente: null,
      datos_extraidos: {},
      productos_sugeridos: [],
      materiales_sugeridos: [],
      datos_faltantes: ['solicitud'],
      observaciones: ['No hay texto para analizar.'],
      fuente: 'local',
      estado_llm: 'desconectado',
      error_llm: null
    };
  }

  function resolveContext(options, text) {
    const perfiles = global.ArpaIaPerfiles;
    const catalogApi = global.ArpaIaCotizadorCatalogo;
    let requested = options && options.oficioId;
    if ((requested == null || String(requested).trim() === '') && text && perfiles && typeof perfiles.inferOficioFromText === 'function') {
      requested = perfiles.inferOficioFromText(text) || undefined;
    }
    const oficioId = perfiles
      ? perfiles.resolveOficioId(requested)
      : (requested || '');
    const profile = perfiles ? perfiles.getProfile(oficioId) : { id: oficioId, match: 'generic', fields: [] };
    const catalog = catalogApi && typeof catalogApi.resolveCatalog === 'function'
      ? catalogApi.resolveCatalog(oficioId)
      : { oficioId: oficioId, fuente: 'none', products: options && options.catalogo ? options.catalogo : [] };
    if (options && Array.isArray(options.catalogo)) {
      catalog.products = options.catalogo;
      catalog.fuente = 'explicito';
    }
    return { oficioId: oficioId, profile: profile, catalog: catalog };
  }

  function fromParsed(solicitud, parsed, meta, ctx) {
    const matcher = global.ArpaIaCotizadorMatcher;
    const info = meta || { fuente: 'local', estado_llm: 'desconectado', error_llm: null };
    const products = ctx.catalog.products || [];
    const match = matcher && typeof matcher.suggest === 'function'
      ? matcher.suggest(parsed.datos_extraidos, products, ctx.profile)
      : { productos_sugeridos: [], materiales_sugeridos: [] };
    return {
      solicitud_original: parsed.solicitud_original,
      oficio_id: ctx.oficioId,
      perfil_id: ctx.profile.id,
      catalogo_fuente: ctx.catalog.fuente,
      datos_extraidos: parsed.datos_extraidos,
      productos_sugeridos: match.productos_sugeridos,
      materiales_sugeridos: match.materiales_sugeridos,
      datos_faltantes: parsed.datos_faltantes,
      observaciones: [],
      fuente: info.fuente,
      estado_llm: info.estado_llm,
      error_llm: info.error_llm
    };
  }

  function parsedFromLocal(solicitud, oficioId) {
    const parser = global.ArpaIaCotizadorParser;
    if (!parser) return null;
    return parser.parseSolicitud(solicitud, oficioId);
  }

  function parsedFromLlm(solicitud, extraido, ctx) {
    const llm = global.ArpaIaCotizadorLlm;
    const parser = global.ArpaIaCotizadorParser;
    const isAuto = ctx.profile && (ctx.profile.id === 'automatismos' || ctx.profile.match === 'automatismos');
    let datos = llm.toDatosExtraidos(extraido, ctx.profile);
    if (!isAuto && parser && typeof parser.parseSolicitud === 'function') {
      const local = parser.parseSolicitud(solicitud, ctx.oficioId);
      const merged = Object.assign({}, local.datos_extraidos);
      ['tipo_de_trabajo', 'uso', 'ciudad'].forEach((key) => {
        if (datos[key]) merged[key] = datos[key];
      });
      if (datos.materiales_mencionados && datos.materiales_mencionados.length) {
        merged.materiales_mencionados = datos.materiales_mencionados;
      }
      merged.especificos = Object.assign({}, local.datos_extraidos.especificos || {}, datos.especificos || {});
      datos = merged;
    }
    datos.oficio_id = ctx.oficioId;
    const faltantes = parser && typeof parser.datosFaltantes === 'function'
      ? parser.datosFaltantes(datos, ctx.profile)
      : [];
    return {
      solicitud_original: String(solicitud || '').trim(),
      oficio_id: ctx.oficioId,
      perfil_id: ctx.profile.id,
      datos_extraidos: datos,
      datos_faltantes: faltantes
    };
  }

  function estadoDesdeError(error) {
    const codigo = error && error.codigo ? error.codigo : '';
    if (codigo === 'bloqueado_produccion') return 'bloqueado_produccion';
    if (codigo === 'backend_dev_ausente' || codigo === 'modo_local') return 'desconectado';
    if (codigo === 'timeout_llm' || codigo === 'error_red' || codigo === 'backend_no_disponible') return 'error';
    if (codigo === 'respuesta_no_json' || codigo === 'json_invalido' || codigo === 'respuesta_vacia') return 'error';
    return 'error';
  }

  function cotizarDesdeTexto(solicitud, options) {
    const text = String(solicitud || '').trim();
    const ctx = resolveContext(options, text);
    if (!text) return emptyResult(solicitud, ctx.oficioId);
    const parsed = parsedFromLocal(text, ctx.oficioId);
    if (!parsed) return emptyResult(solicitud, ctx.oficioId);
    return fromParsed(text, parsed, {
      fuente: 'local',
      estado_llm: 'desconectado',
      error_llm: null
    }, ctx);
  }

  async function cotizarDesdeTextoAsync(solicitud, options) {
    const text = String(solicitud || '').trim();
    const ctx = resolveContext(options, text);
    if (!text) return emptyResult(solicitud, ctx.oficioId);
    const api = global.ArpaIaCotizadorApi;
    const llm = global.ArpaIaCotizadorLlm;

    if (api && typeof api.tryRemote === 'function') {
      try {
        const remote = await api.tryRemote(text, ctx.oficioId);
        if (remote && remote.ok && remote.extraido && llm) {
          return fromParsed(text, parsedFromLlm(text, remote.extraido, ctx), {
            fuente: 'llm',
            estado_llm: 'ok',
            error_llm: null
          }, ctx);
        }
        const error = remote && remote.error
          ? remote.error
          : { codigo: 'respuesta_vacia', mensaje: 'El backend LLM DEV no devolvió extracción.' };
        const local = parsedFromLocal(text, ctx.oficioId);
        if (!local) return emptyResult(solicitud, ctx.oficioId);
        return fromParsed(text, local, {
          fuente: 'local_por_error_llm',
          estado_llm: estadoDesdeError(error),
          error_llm: error
        }, ctx);
      } catch (err) {
        const local = parsedFromLocal(text, ctx.oficioId);
        if (!local) return emptyResult(solicitud, ctx.oficioId);
        return fromParsed(text, local, {
          fuente: 'local_por_error_llm',
          estado_llm: 'error',
          error_llm: {
            codigo: 'excepcion_cliente',
            mensaje: err && err.message ? err.message : 'Error inesperado al consultar el LLM.'
          }
        }, ctx);
      }
    }

    const parsed = parsedFromLocal(text, ctx.oficioId);
    if (!parsed) return emptyResult(solicitud, ctx.oficioId);
    return fromParsed(text, parsed, {
      fuente: 'local',
      estado_llm: 'desconectado',
      error_llm: null
    }, ctx);
  }

  global.ArpaIaCotizador = {
    cotizarDesdeTexto,
    cotizarDesdeTextoAsync
  };
})(typeof window !== 'undefined' ? window : globalThis);
