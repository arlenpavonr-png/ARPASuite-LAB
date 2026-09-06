/**
 * Enruta una intención cerrada al motor existente.
 * No duplica cotización, diagnóstico, informes ni consultas.
 */
(function (global) {
  const ACLARACION = '¿Necesita cotizar un equipo, diagnosticar una falla, generar un informe, consultar datos existentes o ver oportunidades comerciales? Escriba una de esas tareas. No se ejecutó ninguna acción.';
  const ACLARACION_PESO = 'Para recomendar el motor adecuado necesito saber el peso aproximado de la puerta. ¿Cuántos kg pesa?';
  const ACLARACION_ANCHO = 'Para recomendar el motor adecuado necesito saber el ancho de la hoja. ¿Cuántos metros mide?';
  const ACLARACION_PESO_ANCHO = 'Para recomendar el motor adecuado necesito saber el peso aproximado de la puerta y el ancho de la hoja. ¿Cuánto pesa y cuánto mide de ancho?';

  function envelope(base) {
    return Object.assign({
      ok: true,
      intencion: 'desconocida',
      motor: 'ninguno',
      oficio: '',
      datos_disponibles: false,
      resumen: '',
      aclaracion: '',
      advertencias: [],
      resultado: null,
      otras_opciones: [],
      fuente: 'local',
      escritura: false
    }, base || {});
  }

  function claveMarca(marca) {
    return String(marca == null ? '' : marca).trim().toLowerCase();
  }

  function numeroPositivo(val) {
    if (val == null || val === '') return false;
    const n = Number(val);
    return Number.isFinite(n) && n > 0;
  }

  /**
   * Mínimos de Integral para recomendar (no cambia el Cotizador).
   * Corrediza: peso. Batiente: peso + ancho. Otros tipos con capacidad en catálogo: peso.
   */
  function faltantesParaRecomendar(datos) {
    if (!datos) return [];
    const tipo = datos.tipo_de_puerta;
    const out = [];
    if (tipo === 'corrediza') {
      if (!numeroPositivo(datos.peso_estimado)) out.push('peso_estimado');
    } else if (tipo === 'batiente') {
      if (!numeroPositivo(datos.peso_estimado)) out.push('peso_estimado');
      if (!numeroPositivo(datos.ancho_m)) out.push('ancho_m');
    } else if (tipo === 'seccional' || tipo === 'levadiza' || tipo === 'enrollable') {
      if (!numeroPositivo(datos.peso_estimado)) out.push('peso_estimado');
    }
    return out;
  }

  function aclaracionFaltantes(faltantes) {
    const peso = faltantes.indexOf('peso_estimado') >= 0;
    const ancho = faltantes.indexOf('ancho_m') >= 0;
    if (peso && ancho) return ACLARACION_PESO_ANCHO;
    if (peso) return ACLARACION_PESO;
    if (ancho) return ACLARACION_ANCHO;
    return '';
  }

  function bloqueoRecomendacion(datos) {
    const faltantes = faltantesParaRecomendar(datos);
    if (!faltantes.length) return null;
    return { faltantes: faltantes, aclaracion: aclaracionFaltantes(faltantes) };
  }

  function parsearCotizadorLocal(texto, oficioId) {
    const parser = global.ArpaIaCotizadorParser;
    if (!parser || typeof parser.parseSolicitud !== 'function') return null;
    return parser.parseSolicitud(texto, oficioId);
  }

  function resultadoSinRecomendaciones(parsedCot, oficioId, extraFaltantes) {
    const datos = parsedCot && parsedCot.datos_extraidos ? parsedCot.datos_extraidos : {};
    const faltantes = parsedCot && Array.isArray(parsedCot.datos_faltantes)
      ? parsedCot.datos_faltantes.slice()
      : [];
    (extraFaltantes || []).forEach(function (k) {
      if (faltantes.indexOf(k) < 0) faltantes.unshift(k);
    });
    return {
      solicitud_original: parsedCot && parsedCot.solicitud_original ? parsedCot.solicitud_original : '',
      oficio_id: oficioId,
      perfil_id: parsedCot && parsedCot.perfil_id ? parsedCot.perfil_id : null,
      catalogo_fuente: null,
      datos_extraidos: datos,
      productos_sugeridos: [],
      materiales_sugeridos: [],
      datos_faltantes: faltantes,
      observaciones: [],
      fuente: 'local',
      estado_llm: 'desconectado',
      error_llm: null
    };
  }

  /**
   * Presentación: una alternativa por marca elegible ausente del Top 12.
   * Reutiliza el matcher sobre un subconjunto por marca. No altera el ranking del Cotizador.
   */
  function otrasOpcionesElegibles(resultado, oficioId) {
    const matcher = global.ArpaIaCotizadorMatcher;
    const catalogApi = global.ArpaIaCotizadorCatalogo;
    const perfiles = global.ArpaIaPerfiles;
    if (!matcher || typeof matcher.suggest !== 'function' || !catalogApi || !resultado) return [];
    const profile = perfiles && typeof perfiles.getProfile === 'function'
      ? perfiles.getProfile(oficioId)
      : null;
    if (!profile || profile.match !== 'automatismos') return [];
    const top = resultado.productos_sugeridos || [];
    const enTop = {};
    top.forEach(function (p) {
      const k = claveMarca(p && p.marca);
      if (k) enTop[k] = true;
    });
    const cat = typeof catalogApi.resolveCatalog === 'function'
      ? catalogApi.resolveCatalog(oficioId)
      : { products: [] };
    const porMarca = {};
    (cat.products || []).forEach(function (p) {
      const k = claveMarca(p && p.marca);
      if (!k || enTop[k]) return;
      if (!porMarca[k]) porMarca[k] = [];
      porMarca[k].push(p);
    });
    const datos = resultado.datos_extraidos || {};
    if (bloqueoRecomendacion(datos)) return [];
    const peso = datos.peso_estimado;
    const out = [];
    Object.keys(porMarca).sort().forEach(function (k) {
      const match = matcher.suggest(datos, porMarca[k], profile);
      const best = (match && match.productos_sugeridos || [])[0];
      if (!best) return;
      const kg = best.capacidad_kg_catalogo != null
        ? best.capacidad_kg_catalogo
        : (catalogApi.capacityKgFromName ? catalogApi.capacityKgFromName(best.nombre) : null);
      if (peso != null && kg != null && kg + 1 < peso) return;
      out.push({
        marca: best.marca,
        producto: best.nombre,
        sku: best.codigo,
        capacidad_kg: kg,
        pvp: best.precio_catalogo,
        coincidencia: best.coincidencia
      });
    });
    return out;
  }

  function ctxMotores(contexto) {
    const ctx = contexto && typeof contexto === 'object' ? contexto : {};
    return {
      hoy: ctx.hoy || ctx.fecha_analisis || '',
      historial: ctx.historial || ctx.records || [],
      clientes: ctx.clientes || [],
      cotDraft: ctx.cotDraft || ctx.cotizacion_borrador || null,
      oficio: ctx.oficio || ctx.oficio_id || '',
      ot: ctx.ot || null,
      settings: ctx.settings || null
    };
  }

  function resolverOt(contexto, desdeArpa) {
    const ctx = contexto && typeof contexto === 'object' ? contexto : {};
    if (ctx.ot && typeof ctx.ot === 'object') return ctx.ot;
    if (desdeArpa) {
      const ui = global.ArpaIaInformesUi;
      if (ui && typeof ui.recogerOtDesdeFormato === 'function') {
        try { return ui.recogerOtDesdeFormato(); } catch (e) { return null; }
      }
    }
    return null;
  }

  function resumenCotizar(r) {
    if (!r) return 'NO DISPONIBLE EN LAB';
    const n = (r.productos_sugeridos || []).length;
    const d = r.datos_extraidos || {};
    const bits = [];
    const tipo = d.tipo_de_puerta;
    if (tipo) bits.push(tipo);
    if (d.peso_estimado != null && d.peso_estimado !== '') bits.push(d.peso_estimado + ' kg');
    if (tipo === 'corrediza') {
      if (d.recorrido_m != null && d.recorrido_m !== '') bits.push('recorrido ' + d.recorrido_m + ' m');
    } else if (tipo === 'batiente') {
      if (d.ancho_m != null && d.ancho_m !== '') bits.push('ancho ' + d.ancho_m + ' m');
    } else if (d.recorrido_m != null && d.recorrido_m !== '') {
      bits.push('recorrido ' + d.recorrido_m + ' m');
    } else if (d.ancho_m != null && d.ancho_m !== '') {
      bits.push('ancho ' + d.ancho_m + ' m');
    }
    if (d.uso) bits.push(d.uso);
    if (d.ciudad) bits.push(d.ciudad);
    const extra = bits.length ? ' Extraído: ' + bits.join(', ') + '.' : '';
    return 'Cotizador: ' + n + ' producto(s) sugerido(s) del catálogo real.' + extra;
  }

  function resumenTecnica(r) {
    if (!r) return 'NO DISPONIBLE EN LAB';
    if (r.mensaje) return r.mensaje;
    const n = (r.sintomas || []).length;
    return n ? 'IA Técnica: ' + n + ' síntoma(s) detectado(s). Las causas son hipótesis.' : 'IA Técnica no encontró síntomas suficientes.';
  }

  function resumenInforme(r) {
    if (!r) return 'NO DISPONIBLE EN LAB';
    return r.resumen_cliente || r.titulo || 'Informe local a partir de los hechos de la OT.';
  }

  function resumenCopiloto(r) {
    if (!r) return 'NO DISPONIBLE EN LAB';
    return r.resumen || 'NO DISPONIBLE EN LAB';
  }

  function resumenComercial(r) {
    if (!r) return 'NO DISPONIBLE EN LAB';
    const n = r.resumen && typeof r.resumen.total === 'number' ? r.resumen.total : (r.oportunidades || []).length;
    return 'Comercial (solo lectura): ' + n + ' oportunidad(es) a partir de datos existentes.';
  }

  function desconocida(oficio, advertencias, texto) {
    return envelope({
      intencion: 'desconocida',
      motor: 'ninguno',
      oficio: oficio || '',
      datos_disponibles: false,
      resumen: 'NO DISPONIBLE EN LAB',
      aclaracion: ACLARACION,
      advertencias: (advertencias || []).concat(['Intención no determinada. No se ejecutó ningún motor.']),
      resultado: null,
      solicitud: texto || ''
    });
  }

  function despachar(parsed, contexto, opciones) {
    const valid = global.ArpaIaIntegralValidacion;
    const parser = global.ArpaIaIntegralParser;
    const opts = opciones && typeof opciones === 'object' ? opciones : {};
    const ctx = ctxMotores(contexto);
    const oficio = valid ? valid.leerOficioConfigurado(ctx) : (ctx.oficio || '');
    ctx.oficio = oficio;
    const amenazas = (parsed && parsed.amenazas) || [];
    const adsAmenaza = valid ? valid.advertenciasAmenaza(amenazas) : [];
    const texto = parsed && parsed.texto_util ? parsed.texto_util : (parsed && parsed.texto_original) || '';
    const intencion = parsed && parsed.intencion ? parsed.intencion : (parser && parser.INTENCIONES.DESCONOCIDA);

    if (!texto || intencion === 'desconocida') {
      return desconocida(oficio, adsAmenaza, texto);
    }

    let motor = 'ninguno';
    let resultado = null;
    let resumen = 'NO DISPONIBLE EN LAB';
    let datos = false;
    let extraAds = [];

    if (intencion === 'cotizar') {
      if (!oficio) {
        extraAds.push('No hay oficio configurado. La IA no infiere ni cambia el oficio.');
        return envelope({
          intencion: intencion,
          motor: 'cotizador',
          oficio: '',
          datos_disponibles: false,
          resumen: 'NO DISPONIBLE EN LAB',
          advertencias: adsAmenaza.concat(extraAds),
          resultado: null
        });
      }
      motor = 'cotizador';
      const parsedCot = parsearCotizadorLocal(texto, oficio);
      const bloqueoLocal = parsedCot ? bloqueoRecomendacion(parsedCot.datos_extraidos) : null;
      if (bloqueoLocal) {
        resultado = resultadoSinRecomendaciones(parsedCot, oficio, bloqueoLocal.faltantes);
        datos = false;
        resumen = bloqueoLocal.aclaracion;
      } else {
        const cot = global.ArpaIaCotizador;
        if (cot && typeof cot.cotizarDesdeTexto === 'function') {
          resultado = cot.cotizarDesdeTexto(texto, { oficioId: oficio });
          datos = !!(resultado && ((resultado.productos_sugeridos || []).length || (resultado.datos_extraidos && Object.keys(resultado.datos_extraidos).length)));
          resumen = resumenCotizar(resultado);
        } else {
          extraAds.push('El motor Cotizador no está cargado.');
        }
      }
    } else if (intencion === 'diagnosticar') {
      motor = 'tecnica';
      const tec = global.ArpaIaTecnica;
      if (tec && typeof tec.analizarFalla === 'function') {
        resultado = tec.analizarFalla(texto, oficio);
        datos = !!(resultado && (resultado.sintomas || []).length);
        resumen = resumenTecnica(resultado);
      } else {
        extraAds.push('El motor IA Técnica no está cargado.');
      }
    } else if (intencion === 'informar') {
      motor = 'informes';
      const ot = resolverOt(contexto, opts.desdeArpa);
      const check = valid ? valid.otSuficiente(ot) : { ok: !!ot, motivo: 'No hay OT disponible.' };
      if (!check.ok) {
        extraAds.push(check.motivo);
        return envelope({
          intencion: intencion,
          motor: motor,
          oficio: oficio,
          datos_disponibles: false,
          resumen: 'NO DISPONIBLE EN LAB',
          advertencias: adsAmenaza.concat(extraAds),
          resultado: null
        });
      }
      const inf = global.ArpaIaInformes;
      if (inf && typeof inf.generar === 'function') {
        const otUso = Object.assign({}, ot);
        if (oficio) otUso.oficio = oficio;
        resultado = inf.generar(otUso);
        datos = !!(resultado && (resultado.numero_ot || resultado.cliente));
        resumen = resumenInforme(resultado);
      } else {
        extraAds.push('El motor IA Informes no está cargado.');
      }
    } else if (intencion === 'consultar') {
      motor = 'copiloto';
      const cop = global.ArpaIaCopiloto;
      if (cop && typeof cop.consultar === 'function') {
        resultado = cop.consultar(texto, ctx);
        datos = !!(resultado && resultado.datos_disponibles);
        resumen = resumenCopiloto(resultado);
        if ((!datos || (resultado && resultado.intencion === 'desconocida')) && ctx.ot) {
          const hechos = valid ? valid.hechosOt(ctx.ot) : [];
          if (hechos.length && /esta\s+(ot|orden|formato)|puedo\s+hacer/i.test(texto)) {
            resultado = {
              ok: true,
              intencion: 'ot_disponible',
              datos_disponibles: true,
              resultados: hechos,
              resumen: 'Hechos disponibles de esta OT: ' + hechos.map(function (h) { return h.campo + ' ' + h.valor; }).join(', ') + '.',
              advertencias: ['Solo se listan campos que ya existen. No se inventó nada.'],
              fuente: 'local'
            };
            datos = true;
            resumen = resultado.resumen;
          }
        }
      } else {
        extraAds.push('El motor Copiloto no está cargado.');
      }
    } else if (intencion === 'comercial') {
      motor = 'comercial';
      const com = global.ArpaIaComercial;
      if (com) {
        resultado = opts.desdeArpa && typeof com.analizarDesdeArpaSuite === 'function'
          ? com.analizarDesdeArpaSuite(ctx)
          : (typeof com.analizar === 'function' ? com.analizar(ctx) : null);
        datos = !!(resultado && ((resultado.oportunidades || []).length || (resultado.faltantes || []).length));
        resumen = resumenComercial(resultado);
      } else {
        extraAds.push('El motor IA Comercial no está cargado.');
      }
    } else {
      return desconocida(oficio, adsAmenaza, texto);
    }

    const chequeo = valid
      ? valid.validarSalida(intencion, resultado, ctx, amenazas)
      : { oficio: oficio, advertencias: adsAmenaza, escritura: false };

    const bloqueo = intencion === 'cotizar' ? bloqueoRecomendacion(resultado && resultado.datos_extraidos) : null;
    const otras = intencion === 'cotizar' && resultado && !bloqueo
      ? otrasOpcionesElegibles(resultado, chequeo.oficio || oficio)
      : [];

    return envelope({
      intencion: intencion,
      motor: motor,
      oficio: chequeo.oficio || oficio,
      datos_disponibles: bloqueo ? false : datos,
      resumen: resumen,
      aclaracion: bloqueo ? bloqueo.aclaracion : '',
      advertencias: (chequeo.advertencias || []).concat(extraAds),
      resultado: resultado,
      otras_opciones: otras,
      fuente: 'local',
      escritura: false,
      solicitud: texto
    });
  }

  async function despacharAsync(parsed, contexto, opciones) {
    const local = despachar(parsed, contexto, opciones);
    const opts = opciones && typeof opciones === 'object' ? opciones : {};
    if (opts.localOnly) return local;
    if (local.intencion === 'desconocida' || local.motor === 'ninguno') return local;

    const oficio = local.oficio;
    const texto = parsed && parsed.texto_util ? parsed.texto_util : '';

    try {
      if (local.motor === 'cotizador' && bloqueoRecomendacion(local.resultado && local.resultado.datos_extraidos)) {
        local.otras_opciones = [];
      } else if (local.motor === 'cotizador' && global.ArpaIaCotizador && typeof global.ArpaIaCotizador.cotizarDesdeTextoAsync === 'function') {
        local.resultado = await global.ArpaIaCotizador.cotizarDesdeTextoAsync(texto, { oficioId: oficio, localOnly: false });
        const bloqueoRemoto = bloqueoRecomendacion(local.resultado && local.resultado.datos_extraidos);
        if (bloqueoRemoto) {
          const parsedCot = parsearCotizadorLocal(texto, oficio);
          local.resultado = resultadoSinRecomendaciones(parsedCot || local.resultado, oficio, bloqueoRemoto.faltantes);
          local.resumen = bloqueoRemoto.aclaracion;
          local.aclaracion = bloqueoRemoto.aclaracion;
          local.datos_disponibles = false;
          local.otras_opciones = [];
        } else {
          local.resumen = resumenCotizar(local.resultado);
          local.otras_opciones = otrasOpcionesElegibles(local.resultado, oficio);
        }
      } else if (local.motor === 'tecnica' && global.ArpaIaTecnica && typeof global.ArpaIaTecnica.analizarFallaAsync === 'function') {
        local.resultado = await global.ArpaIaTecnica.analizarFallaAsync(texto, oficio, opts);
        local.resumen = resumenTecnica(local.resultado);
      } else if (local.motor === 'informes' && local.resultado && global.ArpaIaInformes && typeof global.ArpaIaInformes.generarAsync === 'function') {
        const ot = resolverOt(contexto, opts.desdeArpa);
        if (ot) {
          const otUso = Object.assign({}, ot);
          if (oficio) otUso.oficio = oficio;
          local.resultado = await global.ArpaIaInformes.generarAsync(otUso, opts);
          local.resumen = resumenInforme(local.resultado);
        }
      } else if (local.motor === 'copiloto' && global.ArpaIaCopiloto && typeof global.ArpaIaCopiloto.consultarAsync === 'function') {
        local.resultado = await global.ArpaIaCopiloto.consultarAsync(texto, ctxMotores(contexto), opts);
        local.resumen = resumenCopiloto(local.resultado);
        local.datos_disponibles = !!(local.resultado && local.resultado.datos_disponibles);
      }
    } catch (err) {
      local.advertencias = (local.advertencias || []).concat(['El motor remoto no respondió. Se conservó el resultado local.']);
    }

    const valid = global.ArpaIaIntegralValidacion;
    if (valid) {
      const chequeo = valid.validarSalida(local.intencion, local.resultado, ctxMotores(contexto), parsed && parsed.amenazas);
      local.oficio = chequeo.oficio || local.oficio;
      local.advertencias = (chequeo.advertencias || []).concat(local.advertencias || []).filter(function (a, i, arr) {
        return a && arr.indexOf(a) === i;
      });
      local.escritura = false;
    }
    return local;
  }

  global.ArpaIaIntegralRouter = {
    ACLARACION: ACLARACION,
    despachar: despachar,
    despacharAsync: despacharAsync
  };
})(typeof window !== 'undefined' ? window : globalThis);
