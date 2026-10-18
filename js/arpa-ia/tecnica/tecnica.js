/**
 * Motor local IA Técnica. El oficio lo define el usuario; no se infiere ni se cambia.
 * No llama LLM. No inventa hechos. Las causas son hipótesis.
 */
(function (global) {
  const OFICIO_LABELS = {
    automatismos: 'Automatización de Puertas',
    electricidad: 'Electricidad',
    gas: 'Gas',
    refrigeracion: 'Refrigeración y Aire Acondicionado',
    cctv: 'CCTV / Seguridad Electrónica',
    plomeria: 'Plomería',
    metalmecanica: 'Metalmecánica',
    plagas: 'Control de Plagas',
    linea_blanca: 'Línea Blanca',
    solar: 'Energía Solar',
    taller_motos: 'Taller de Motos'
  };

  const ALIASES = {
    automatizacion: 'automatismos',
    control_de_plagas: 'plagas',
    energia_solar: 'solar',
    cctv_seguridad: 'cctv'
  };

  function emptyResult(oficioId, mensaje, extra) {
    const base = {
      solicitud_original: '',
      oficio_id: oficioId || '',
      oficio_label: labelOficio(oficioId),
      sintomas: [],
      datos_conocidos: [],
      datos_faltantes: [],
      posibles_causas: [],
      pruebas_recomendadas: [],
      procedimiento_sugerido: [],
      urgencia: { nivel: 'indeterminada', motivo: mensaje || 'Sin datos.' },
      advertencias_seguridad: [],
      informacion_insuficiente: true,
      causa_confirmada: false,
      preguntas: [],
      mensaje: mensaje || 'Falta información.',
      fuente: 'local',
      estado_llm: 'desconectado',
      error_llm: null
    };
    return Object.assign(base, extra || {});
  }

  function labelOficio(oficioId) {
    if (!oficioId) return '';
    if (global.ArpaOficios && typeof global.ArpaOficios.getOficioLabel === 'function') {
      const list = global.ArpaOficios.getOficiosList ? global.ArpaOficios.getOficiosList() : [];
      const known = list.some(function (o) { return o.id === oficioId; });
      if (known) {
        const lab = global.ArpaOficios.getOficioLabel(oficioId);
        if (lab) return lab;
      }
    }
    if (global.ArpaIaPerfiles && typeof global.ArpaIaPerfiles.getProfile === 'function') {
      const p = global.ArpaIaPerfiles.getProfile(oficioId);
      if (p && p.label && p.id === oficioId) return p.label;
    }
    return OFICIO_LABELS[oficioId] || oficioId;
  }

  function oficiosOficiales() {
    if (global.ArpaOficios && typeof global.ArpaOficios.getOficiosList === 'function') {
      return global.ArpaOficios.getOficiosList().map(function (o) { return o.id; });
    }
    return Object.keys(OFICIO_LABELS);
  }

  /**
   * Resuelve el oficio enviado por el usuario.
   * No sustituye un oficio desconocido por automatismos ni infiere por el texto.
   */
  function resolverOficioUsuario(oficioId) {
    const raw = String(oficioId == null ? '' : oficioId).trim().toLowerCase();
    if (!raw) return '';
    const mapped = ALIASES[raw] || raw;
    const oficiales = oficiosOficiales();
    if (oficiales.indexOf(mapped) !== -1) return mapped;
    return mapped;
  }

  function filtrarPasosSeguros(pasos, seguridad) {
    const list = Array.isArray(pasos) ? pasos.slice() : [];
    return list.filter(function (paso) {
      return !seguridad.esPasoInseguro(paso);
    });
  }

  function foldClave(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function sanitizarClaveRespuesta(key) {
    const raw = String(key || '').trim();
    if (!raw) return 'Dato';
    const t = foldClave(raw);
    if (/fotoceld/.test(t)) return 'Fotoceldas';
    if (/alimentaci|voltaje|110 o 220/.test(t)) return 'Alimentacion';
    if (/tipo de puerta|corrediza, batiente/.test(t)) return 'Tipo de puerta';
    if (/no abre|no cierra|no responde/.test(t)) return 'Sintoma del ciclo';
    if (/capacitor/.test(t)) return 'Capacitor';
    if (/desbloqueo/.test(t)) return 'Desbloqueo';
    if (/tension/.test(t)) return 'Tension';
    if (/pinon|cremallera/.test(t)) return 'Transmision';
    if (/[¿?]/.test(raw) || raw.length > 80) return 'Dato del tecnico';
    return raw;
  }

  function parsearLineasRespuestas(block) {
    const out = {};
    String(block || '').split(/\n/).forEach(function (line, i) {
      const t = String(line || '').replace(/^[-\s]+/, '').trim();
      if (!t) return;
      const idx = t.indexOf(':');
      if (idx > 0) {
        const k = t.slice(0, idx).trim();
        const v = t.slice(idx + 1).trim();
        if (v) out[k] = v;
      } else if (!/respuestas del t[eé]cnico/i.test(t)) {
        out['dato_' + i] = t;
      }
    });
    return out;
  }

  function valoresDeRespuestas(respuestas) {
    if (!respuestas || typeof respuestas !== 'object') return '';
    return Object.keys(respuestas).map(function (k) {
      return String(respuestas[k] || '').trim();
    }).filter(Boolean).join('\n');
  }

  function formatearRespuestas(respuestas) {
    if (!respuestas || typeof respuestas !== 'object') return '';
    return Object.keys(respuestas).map(function (k) {
      const v = String(respuestas[k] || '').trim();
      if (!v) return '';
      return sanitizarClaveRespuesta(k) + ': ' + v;
    }).filter(Boolean).join('\n');
  }

  function extraerSeccionesDeTexto(raw) {
    const src = String(raw || '');
    const markers = [
      { key: 'contexto', re: /datos actuales de la ot\s*:/i },
      { key: 'contexto', re: /datos ya capturados(?: en la orden de trabajo)?\s*:/i },
      { key: 'sintomas', re: /s[ií]ntomas(?: \/ observaciones)?(?: del t[eé]cnico)?\s*:/i },
      { key: 'respuestas', re: /respuestas del t[eé]cnico(?: a preguntas previas)?\s*:/i }
    ];
    const hits = [];
    markers.forEach(function (m) {
      const match = m.re.exec(src);
      if (match) hits.push({ key: m.key, index: match.index, len: match[0].length });
    });
    if (!hits.length) return { sintomas: src.trim() };
    hits.sort(function (a, b) { return a.index - b.index; });
    const out = { sintomas: '', contexto: '', respuestasObj: null };
    if (hits[0].index > 0 && !hits.some(function (h) { return h.key === 'sintomas'; })) {
      out.sintomas = src.slice(0, hits[0].index).trim();
    }
    for (let i = 0; i < hits.length; i += 1) {
      const start = hits[i].index + hits[i].len;
      const end = i + 1 < hits.length ? hits[i + 1].index : src.length;
      const chunk = src.slice(start, end).trim();
      if (!chunk) continue;
      if (hits[i].key === 'respuestas') out.respuestasObj = parsearLineasRespuestas(chunk);
      else if (hits[i].key === 'contexto') out.contexto = [out.contexto, chunk].filter(Boolean).join('\n');
      else out.sintomas = [out.sintomas, chunk].filter(Boolean).join('\n');
    }
    return out;
  }

  function quitarObservacionesOt(texto) {
    const src = String(texto || '');
    const idx = src.search(/observaciones de la ot\s*:/i);
    if (idx < 0) return { texto: src.trim(), observaciones: '' };
    return { texto: src.slice(0, idx).trim(), observaciones: src.slice(idx).replace(/observaciones de la ot\s*:/i, '').trim() };
  }

  function contextoSinNarrativaPrevia(texto) {
    return String(texto || '')
      .replace(/observaciones de la ot\s*:[^\n]*/ig, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function resolverFuentes(texto, options) {
    const opt = options && typeof options === 'object' ? options : {};
    const split = extraerSeccionesDeTexto(texto);
    const moved = quitarObservacionesOt(split.sintomas || '');
    let sintomas = moved.texto;
    let contexto = contextoSinNarrativaPrevia(opt.contextoTexto || split.contexto || '');
    let respuestas = null;
    if (opt.respuestas && typeof opt.respuestas === 'object' && !Array.isArray(opt.respuestas)) {
      respuestas = opt.respuestas;
    } else if (split.respuestasObj) {
      respuestas = split.respuestasObj;
    }
    return {
      sintomas: sintomas,
      contexto: contexto,
      respuestas: respuestas,
      respuestasBlock: formatearRespuestas(respuestas),
      respuestasValores: valoresDeRespuestas(respuestas)
    };
  }

  function clonarResultado(result) {
    if (!result || typeof result !== 'object') return result;
    try {
      return JSON.parse(JSON.stringify(result));
    } catch (err) {
      return result;
    }
  }

  function analizarFalla(texto, oficioId, options) {
    const parser = global.ArpaIaTecnicaParser;
    const conocimiento = global.ArpaIaTecnicaConocimiento;
    const seguridad = global.ArpaIaTecnicaSeguridad;
    const oficio = resolverOficioUsuario(oficioId);
    const fuentes = resolverFuentes(texto, options);
    const textoSintomas = [fuentes.sintomas, fuentes.respuestasValores].filter(Boolean).join('\n');
    const textoEvidencia = [fuentes.sintomas, fuentes.respuestasBlock ? ('Respuestas del técnico:\n' + fuentes.respuestasBlock) : '']
      .filter(Boolean).join('\n\n');
    const solicitud = parser ? parser.normalizeText(textoSintomas) : String(textoSintomas || '').trim();

    if (!oficio) {
      return emptyResult('', 'Debe indicar el oficio. La IA no lo inventa ni lo cambia.');
    }

    if (!solicitud) {
      const faltantes = conocimiento ? conocimiento.datosFaltantes([], [], oficio) : [];
      const preguntas = conocimiento && conocimiento.preguntas
        ? conocimiento.preguntas([], [], oficio)
        : [];
      const adv = seguridad ? seguridad.advertencias('', oficio) : [];
      return emptyResult(oficio, 'No hay descripción de la falla. Escriba lo observado, sin asumir datos.', {
        datos_faltantes: faltantes,
        preguntas: preguntas,
        advertencias_seguridad: adv,
        procedimiento_sugerido: conocimiento ? filtrarPasosSeguros(conocimiento.procedimiento(oficio), seguridad) : []
      });
    }

    const extraidoAnalisis = parser.extraerHechos([fuentes.sintomas, fuentes.respuestasValores].filter(Boolean).join('\n'));
    const extraidoOt = parser.extraerHechos(fuentes.contexto);
    const extraido = { hechos: [] };
    (extraidoOt.hechos || []).forEach(function (h) {
      extraido.hechos.push(Object.assign({}, h, { fuente: 'ot' }));
    });
    (extraidoAnalisis.hechos || []).forEach(function (h) {
      if (extraido.hechos.some(function (x) { return x.id === h.id; })) return;
      extraido.hechos.push(h);
    });
    const sintomas = conocimiento.detectarSintomas(textoSintomas, oficio);
    const especificos = sintomas.filter(conocimiento.esSintomaEspecifico);
    const vago = /^(ayuda|hola|ok|revisar|falla|algo(?:\s+est[aá]\s+fallando)?)$/i.test(solicitud)
      || (solicitud.length < 20 && especificos.length === 0);
    const insuficiente = vago || especificos.length === 0;

    const ids = sintomas.map(function (s) { return s.id; });
    const pack = insuficiente
      ? { hipotesis: [], pruebas: [] }
      : conocimiento.hipotesisYPruebas(ids, oficio);
    const faltantes = conocimiento.datosFaltantes(extraido.hechos, sintomas, oficio);
    const preguntas = conocimiento.preguntas
      ? conocimiento.preguntas(extraido.hechos, sintomas, oficio)
      : faltantes.map(function (label) { return { id: label, pregunta: '¿' + label + '?' }; });
    const adv = seguridad.advertencias(textoSintomas, oficio);
    let procedimiento = filtrarPasosSeguros(conocimiento.procedimiento(oficio), seguridad);
    if (seguridad.textoTieneBypass(textoSintomas) && procedimiento.indexOf(seguridad.PROHIBIDO) === -1) {
      procedimiento = [seguridad.PROHIBIDO].concat(procedimiento);
    }

    let mensaje = '';
    if (insuficiente) {
      mensaje = 'Información insuficiente para un análisis técnico. Indique equipo, síntoma concreto y condiciones. No se afirma ninguna causa.';
    } else {
      mensaje = 'Las causas listadas son hipótesis de trabajo. No constituyen un diagnóstico confirmado.';
    }

    const resultado = {
      solicitud_original: textoEvidencia || solicitud,
      oficio_id: oficio,
      oficio_label: labelOficio(oficio),
      sintomas: sintomas,
      datos_conocidos: extraido.hechos,
      datos_faltantes: faltantes,
      posibles_causas: pack.hipotesis,
      pruebas_recomendadas: pack.pruebas,
      procedimiento_sugerido: procedimiento,
      urgencia: conocimiento.urgencia(ids, oficio, insuficiente),
      advertencias_seguridad: adv,
      informacion_insuficiente: insuficiente,
      causa_confirmada: false,
      preguntas: preguntas,
      mensaje: mensaje,
      fuente: 'local',
      estado_llm: 'desconectado',
      error_llm: null
    };
    const conEvidencia = conocimiento.aplicarEvidenciaAResultado
      ? conocimiento.aplicarEvidenciaAResultado(resultado)
      : resultado;
    const llm = global.ArpaIaTecnicaLlm;
    const limpio = llm && typeof llm.deduplicarAnalisis === 'function'
      ? llm.deduplicarAnalisis(conEvidencia)
      : conEvidencia;
    return clonarResultado(limpio);
  }

  function componerTexto(texto, options) {
    const parts = [];
    const ctx = options && options.contextoTexto ? contextoSinNarrativaPrevia(options.contextoTexto) : '';
    if (ctx) parts.push('Datos actuales de la OT:\n' + ctx);
    if (texto) parts.push('Síntomas del técnico:\n' + String(texto).trim());
    const ans = formatearRespuestas(options && options.respuestas);
    if (ans) parts.push('Respuestas del técnico:\n' + ans);
    return parts.filter(Boolean).join('\n\n');
  }

  function serializarParaOt(result) {
    const src = result || {};
    return JSON.stringify({
      v: 1,
      fecha: new Date().toISOString(),
      oficio_id: src.oficio_id || '',
      oficio_label: src.oficio_label || '',
      solicitud_original: src.solicitud_original || '',
      sintomas: src.sintomas || [],
      datos_conocidos: src.datos_conocidos || [],
      datos_faltantes: src.datos_faltantes || [],
      preguntas: src.preguntas || [],
      posibles_causas: src.posibles_causas || [],
      pruebas_recomendadas: src.pruebas_recomendadas || [],
      procedimiento_sugerido: src.procedimiento_sugerido || [],
      urgencia: src.urgencia || {},
      advertencias_seguridad: src.advertencias_seguridad || [],
      informacion_insuficiente: !!src.informacion_insuficiente,
      causa_confirmada: false,
      mensaje: src.mensaje || '',
      fuente: src.fuente || 'local',
      estado_llm: src.estado_llm || 'desconectado',
      notas_tecnico: src.notas_tecnico || ''
    });
  }

  function parseDesdeOt(raw) {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!parsed || typeof parsed !== 'object') return null;
      parsed.causa_confirmada = false;
      const llm = global.ArpaIaTecnicaLlm;
      return llm && typeof llm.deduplicarAnalisis === 'function'
        ? llm.deduplicarAnalisis(parsed)
        : parsed;
    } catch (err) {
      return null;
    }
  }

  function estadoDesdeError(error) {
    const codigo = error && error.codigo ? error.codigo : '';
    if (codigo === 'bloqueado_produccion') return 'bloqueado_produccion';
    if (codigo === 'backend_dev_ausente' || codigo === 'modo_local') return 'desconectado';
    if (codigo === 'timeout_llm' || codigo === 'error_red' || codigo === 'backend_no_disponible') return 'error';
    if (codigo === 'respuesta_no_json' || codigo === 'json_invalido' || codigo === 'respuesta_vacia') return 'error';
    return 'error';
  }

  async function analizarFallaAsync(texto, oficioId, options) {
    const local = analizarFalla(texto, oficioId, options);
    if (!local.oficio_id) return local;
    if (options && options.localOnly) return local;

    const api = global.ArpaIaCotizadorApi;
    const llmHelper = global.ArpaIaTecnicaLlm;
    if (!api || typeof api.tryRemoteDiagnostico !== 'function') {
      if (api && api.mode === 'remote' && api.endpoint) {
        local.fuente = 'local_por_error_llm';
        local.estado_llm = 'error';
        local.error_llm = {
          codigo: 'modulo_llm_ausente',
          mensaje: 'El cliente de diagnóstico LLM no está cargado. Recargue LAB para salir de la caché vieja.'
        };
      }
      return local;
    }

    const prompt = llmHelper && typeof llmHelper.construirTextoLlm === 'function'
      ? llmHelper.construirTextoLlm(
        local.oficio_id,
        texto,
        options && options.contextoTexto ? contextoSinNarrativaPrevia(options.contextoTexto) : '',
        options && options.respuestas
      )
      : componerTexto(texto, options);

    try {
      const remote = await api.tryRemoteDiagnostico(prompt, local.oficio_id);
      if (remote && remote.ok && remote.diagnostico && llmHelper) {
        return llmHelper.mergeAnalisis(local, remote.diagnostico, {
          fuente: 'llm+local',
          estado_llm: 'ok',
          error_llm: null
        });
      }
      const error = remote && remote.error
        ? remote.error
        : { codigo: 'respuesta_vacia', mensaje: 'El backend LLM DEV no devolvió diagnóstico técnico.' };
      local.fuente = 'local_por_error_llm';
      local.estado_llm = estadoDesdeError(error);
      local.error_llm = error;
      return local;
    } catch (err) {
      local.fuente = 'local_por_error_llm';
      local.estado_llm = 'error';
      local.error_llm = {
        codigo: 'excepcion_cliente',
        mensaje: err && err.message ? err.message : 'Error inesperado al consultar el LLM.'
      };
      return local;
    }
  }

  global.ArpaIaTecnica = {
    analizarFalla,
    analizarFallaAsync,
    resolverOficioUsuario,
    labelOficio,
    componerTexto,
    resolverFuentes,
    sanitizarClaveRespuesta,
    serializarParaOt,
    parseDesdeOt,
    OFICIO_LABELS
  };
})(typeof window !== 'undefined' ? window : globalThis);
