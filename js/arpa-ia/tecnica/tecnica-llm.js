/**
 * Normaliza y fusiona la respuesta del LLM DEV de diagnóstico técnico.
 * El oficio del usuario no se cambia. Las causas no se confirman.
 * Nunca se acepta puentear o anular protecciones.
 */
(function (global) {
  function asList(value) {
    if (Array.isArray(value)) return value.filter(function (item) { return item != null && String(item).trim() !== ''; });
    if (value == null || value === '') return [];
    return [value];
  }

  function asText(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'object' && (value.texto || value.pregunta || value.label)) {
      return String(value.texto || value.pregunta || value.label).trim();
    }
    return String(value).trim();
  }

  function asHecho(item) {
    if (!item) return null;
    if (typeof item === 'string') {
      const t = item.trim();
      return t ? { id: t.toLowerCase().replace(/\s+/g, '_').slice(0, 40), label: t, valor: t, fuente: 'llm' } : null;
    }
    const label = asText(item.label || item.nombre || item.id);
    const valor = asText(item.valor != null ? item.valor : (item.value != null ? item.value : item.texto));
    if (!label && !valor) return null;
    return {
      id: asText(item.id) || (label || valor).toLowerCase().replace(/\s+/g, '_').slice(0, 40),
      label: label || 'Dato',
      valor: valor || label,
      fuente: 'llm'
    };
  }

  function asHipotesis(item, idx) {
    const texto = asText(item && (item.texto || item.hipotesis || item));
    if (!texto) return null;
    const p = item && item.prioridad != null ? Number(item.prioridad) : (idx + 2);
    return {
      id: asText(item && item.id) || ('llm_' + idx),
      texto: /hipótesis|no confirmado/i.test(texto) ? texto : (texto.replace(/\.?\s*$/, '') + ' (hipótesis, no confirmado).'),
      tipo: 'hipotesis',
      confirmado: false,
      prioridad: Number.isFinite(p) && p > 0 ? p : 2
    };
  }

  function asPregunta(item, idx) {
    if (!item) return null;
    if (typeof item === 'string') {
      const t = item.trim();
      return t ? { id: 'q' + idx, pregunta: t } : null;
    }
    const pregunta = asText(item.pregunta || item.texto || item.label);
    if (!pregunta) return null;
    return { id: asText(item.id) || ('q' + idx), pregunta: pregunta };
  }

  function asUrgencia(value) {
    if (!value) return null;
    if (typeof value === 'string') {
      return { nivel: value.toLowerCase(), motivo: '' };
    }
    const nivel = asText(value.nivel || value.level).toLowerCase();
    if (!nivel) return null;
    return { nivel: nivel, motivo: asText(value.motivo || value.razon) };
  }

  function filterSafe(list, seguridad) {
    const out = [];
    asList(list).forEach(function (raw) {
      const paso = asText(raw);
      if (!paso) return;
      if (seguridad && typeof seguridad.esPasoInseguro === 'function' && seguridad.esPasoInseguro(paso)) return;
      out.push(paso);
    });
    return out;
  }

  function uniqueText(list, key) {
    const seen = {};
    const out = [];
    (list || []).forEach(function (item) {
      const t = String(key ? (item && item[key]) : item).trim().toLowerCase();
      if (!t || seen[t]) return;
      seen[t] = true;
      out.push(item);
    });
    return out;
  }

  var STOP_EQ = {
    el: 1, la: 1, los: 1, las: 1, un: 1, una: 1, unos: 1, unas: 1,
    de: 1, del: 1, al: 1, a: 1, en: 1, y: 1, o: 1, u: 1, que: 1, se: 1,
    su: 1, sus: 1, es: 1, son: 1, esta: 1, estan: 1, este: 1, hay: 1,
    con: 1, por: 1, para: 1, como: 1, muy: 1, mas: 1, tambien: 1,
    produce: 1, producir: 1, hace: 1, hacer: 1, presenta: 1, presentar: 1,
    anomalo: 1, anormal: 1, extrano: 1, extraño: 1, reportado: 1, observado: 1,
    detectado: 1, mencionado: 1, durante: 1, algun: 1, alguna: 1, otros: 1,
    otras: 1, otro: 1, otra: 1
  };
  var GENERIC_EQ = { puerta: 1, equipo: 1, sistema: 1, tecnico: 1, revision: 1, area: 1 };

  function foldText(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
      .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ü/g, 'u').replace(/ñ/g, 'n');
  }

  function stemToken(word) {
    var w = String(word || '');
    if (w.length <= 4) return w;
    return w.replace(/(ciones|cion|mente|adas|ados|ando|iendo|aron|idos|idas|osas|osos|osa|oso|icas|icos|ica|ico|as|os|es|s)$/, '');
  }

  function tokensEq(value) {
    const folded = foldText(value).replace(/[^a-z0-9]+/g, ' ').trim();
    if (!folded) return [];
    const seen = {};
    const out = [];
    folded.split(/\s+/).forEach(function (raw) {
      if (!raw || raw.length < 2 || STOP_EQ[raw]) return;
      const t = stemToken(raw);
      if (!t || seen[t]) return;
      seen[t] = true;
      out.push(t);
    });
    return out;
  }

  function itemText(item, key) {
    if (item == null) return '';
    if (typeof item === 'string') return item.trim();
    if (key && item[key]) return String(item[key]).trim();
    return String(item.texto || item.pregunta || item.label || item.valor || '').trim();
  }

  function topicKeys(tokens) {
    const keys = {};
    let hasNo = false;
    tokens.forEach(function (t) {
      if (t === 'no' || t === 'sin') hasNo = true;
      if (/^ruid/.test(t) || t === 'zumba' || t === 'golpetea') keys.ruido = 1;
      if (/^fotoceld/.test(t) || t === 'foto') keys.fotocelda = 1;
      if (/^cierr/.test(t) || t === 'abierta') keys.cierre = 1;
      if (/^abr/.test(t)) keys.apertura = 1;
      if (/prend|encend|arranc/.test(t)) keys.arranca = 1;
      if (/^lent/.test(t)) keys.lento = 1;
    });
    if (hasNo && keys.cierre) keys.no_cierra = 1;
    if (hasNo && keys.apertura) keys.no_abre = 1;
    if (hasNo && keys.arranca) keys.no_prende = 1;
    return Object.keys(keys);
  }

  function meaningfulTokens(tokens) {
    return tokens.filter(function (t) { return t !== 'no' && t !== 'sin' && !GENERIC_EQ[t]; });
  }

  function subsetOf(small, large) {
    return small.every(function (t) { return large.indexOf(t) !== -1; });
  }

  function equivalentPhrases(a, b, mode) {
    const ta = tokensEq(a);
    const tb = tokensEq(b);
    if (!ta.length || !tb.length) return false;
    if (mode === 'sintoma') {
      const ka = topicKeys(ta);
      const kb = topicKeys(tb);
      const sameTopic = ka.some(function (k) { return kb.indexOf(k) !== -1; });
      if (sameTopic) return true;
    }
    const inter = ta.filter(function (t) { return tb.indexOf(t) !== -1; });
    if (!inter.length) return false;
    const smaller = ta.length <= tb.length ? ta : tb;
    const larger = ta.length <= tb.length ? tb : ta;
    const core = meaningfulTokens(smaller);
    if (core.length && subsetOf(smaller, larger)) return true;
    const union = ta.length + tb.length - inter.length;
    return (inter.length / union) >= 0.72;
  }

  function specificityScore(text) {
    const tok = tokensEq(text);
    var score = tok.length * 4 + String(text || '').length;
    if (/\d/.test(text)) score += 16;
    if (/\b(?:bft|nice|came|ppa|faac|roger|honda|yamaha|suzuki|lg|samsung)\b/i.test(text)) score += 14;
    return score;
  }

  function deduplicarLista(list, key, mode) {
    const out = [];
    (list || []).forEach(function (item) {
      const text = itemText(item, key);
      if (!text) return;
      let merged = false;
      for (let i = 0; i < out.length; i += 1) {
        if (!equivalentPhrases(text, itemText(out[i], key), mode)) continue;
        if (specificityScore(text) > specificityScore(itemText(out[i], key))) out[i] = item;
        merged = true;
        break;
      }
      if (!merged) out.push(item);
    });
    return out;
  }

  function deduplicarAnalisis(result) {
    if (!result || typeof result !== 'object') return result;
    const out = result;
    out.sintomas = deduplicarLista(out.sintomas, 'texto', 'sintoma');
    out.datos_faltantes = deduplicarLista(out.datos_faltantes, null, 'lista');
    out.posibles_causas = deduplicarLista(out.posibles_causas, 'texto', 'lista');
    out.pruebas_recomendadas = deduplicarLista(out.pruebas_recomendadas, null, 'lista');
    out.procedimiento_sugerido = deduplicarLista(out.procedimiento_sugerido, null, 'lista');
    out.advertencias_seguridad = deduplicarLista(out.advertencias_seguridad, null, 'lista');
    out.preguntas = deduplicarLista(out.preguntas, 'pregunta', 'lista');
    return out;
  }

  function normalizeDiagnostico(payload, oficioId) {
    const parsed = payload && typeof payload === 'object' ? payload : null;
    if (!parsed) return { ok: false, error: { codigo: 'json_invalido', mensaje: 'El LLM no devolvió un diagnóstico válido.' } };
    const src = parsed.diagnostico && typeof parsed.diagnostico === 'object'
      ? parsed.diagnostico
      : parsed;
    const seguridad = global.ArpaIaTecnicaSeguridad;
    const sintomas = asList(src.sintomas).map(function (item, i) {
      const texto = asText(item && (item.texto || item));
      if (!texto) return null;
      return { id: asText(item && item.id) || ('llm_s' + i), texto: texto, fuente: 'llm' };
    }).filter(Boolean);
    const hechos = asList(src.hechos || src.datos_conocidos).map(asHecho).filter(Boolean);
    const hipotesis = asList(src.hipotesis || src.posibles_causas).map(asHipotesis).filter(Boolean);
    const preguntas = asList(src.preguntas).map(asPregunta).filter(Boolean);
    return {
      ok: true,
      diagnostico: {
        oficio_id: oficioId,
        sintomas: sintomas,
        datos_conocidos: hechos,
        datos_faltantes: asList(src.datos_faltantes).map(asText).filter(Boolean),
        preguntas: preguntas,
        posibles_causas: hipotesis,
        pruebas_recomendadas: filterSafe(src.pruebas || src.pruebas_recomendadas, seguridad),
        procedimiento_sugerido: filterSafe(src.procedimiento || src.procedimiento_sugerido, seguridad),
        urgencia: asUrgencia(src.urgencia),
        advertencias_seguridad: asList(src.advertencias_seguridad).map(asText).filter(Boolean),
        informacion_insuficiente: !!src.informacion_insuficiente,
        causa_confirmada: false,
        mensaje: asText(src.mensaje)
      }
    };
  }

  function extraidoComoHechos(extraido) {
    const hechos = [];
    if (!extraido || typeof extraido !== 'object') return hechos;
    function push(id, label, valor) {
      if (valor == null || valor === '') return;
      hechos.push({ id: id, label: label, valor: String(valor), fuente: 'llm' });
    }
    push('tipo_puerta', 'Tipo de puerta', extraido.tipo_de_puerta);
    push('uso', 'Uso', extraido.uso);
    push('ciudad', 'Ciudad', extraido.ciudad);
    if (extraido.peso_kg != null) push('peso', 'Peso', extraido.peso_kg + ' kg');
    if (extraido.ancho_m != null) push('ancho', 'Medida', extraido.ancho_m + ' m');
    const extras = extraido.extras && typeof extraido.extras === 'object' ? extraido.extras : {};
    Object.keys(extras).forEach(function (key) {
      const val = extras[key];
      if (val == null || val === '' || typeof val === 'object') return;
      push(key, key.replace(/_/g, ' '), val);
    });
    (extraido.observaciones || []).forEach(function (obs, i) {
      push('obs_' + i, 'Observación', obs);
    });
    return hechos;
  }

  function ancladoEnSolicitud(text, solicitud) {
    const src = foldText(solicitud);
    const tokens = meaningfulTokens(tokensEq(text));
    if (!tokens.length || !src) return false;
    const hits = tokens.filter(function (t) { return src.indexOf(t) >= 0; });
    return hits.length >= Math.min(2, tokens.length);
  }

  function itemAnclado(item, key, solicitud, locales, localKey) {
    const text = itemText(item, key);
    if (!text) return false;
    if ((locales || []).some(function (loc) {
      if (item && loc && item.id && loc.id && item.id === loc.id) return true;
      return equivalentPhrases(text, itemText(loc, localKey || key), 'lista');
    })) return true;
    return ancladoEnSolicitud(text, solicitud);
  }

  function mergeAnalisis(local, llmDiag, meta) {
    const out = Object.assign({}, local);
    const info = meta || {};
    out.oficio_id = local.oficio_id;
    out.oficio_label = local.oficio_label;
    out.causa_confirmada = false;
    out.error_llm = info.error_llm || null;
    out.estado_llm = info.estado_llm || local.estado_llm || 'desconectado';
    out.fuente = info.fuente || local.fuente || 'local';
    if (!llmDiag) return out;

    const ancla = String(local.solicitud_original || '');
    const llmSintomas = (llmDiag.sintomas || []).filter(function (s) {
      return itemAnclado(s, 'texto', '', local.sintomas || [], 'texto');
    });
    const llmHechos = (llmDiag.datos_conocidos || []).filter(function (h) {
      return itemAnclado(h, 'valor', ancla, local.datos_conocidos || [], 'valor');
    });
    out.sintomas = uniqueText((local.sintomas || []).concat(llmSintomas), 'texto');
    out.datos_conocidos = uniqueText((local.datos_conocidos || []).concat(llmHechos), 'valor');
    const faltantes = uniqueText((local.datos_faltantes || []).concat(llmDiag.datos_faltantes || []));
    out.datos_faltantes = faltantes;
    const llmHip = (llmDiag.posibles_causas || []).filter(function (c) {
      return itemAnclado(c, 'texto', '', local.posibles_causas || [], 'texto');
    });
    const hip = uniqueText((local.posibles_causas || []).concat(llmHip), 'texto')
      .map(function (c) { return Object.assign({}, c, { tipo: 'hipotesis', confirmado: false }); });
    hip.sort(function (a, b) { return (a.prioridad || 9) - (b.prioridad || 9); });
    out.posibles_causas = hip;
    out.pruebas_recomendadas = uniqueText((local.pruebas_recomendadas || []).concat(llmDiag.pruebas_recomendadas || []));
    out.procedimiento_sugerido = uniqueText((local.procedimiento_sugerido || []).concat(llmDiag.procedimiento_sugerido || []));
    const seguridad = global.ArpaIaTecnicaSeguridad;
    if (seguridad && typeof seguridad.esPasoInseguro === 'function') {
      out.pruebas_recomendadas = out.pruebas_recomendadas.filter(function (p) { return !seguridad.esPasoInseguro(p); });
      out.procedimiento_sugerido = out.procedimiento_sugerido.filter(function (p) { return !seguridad.esPasoInseguro(p); });
    }
    out.advertencias_seguridad = uniqueText((local.advertencias_seguridad || []).concat(llmDiag.advertencias_seguridad || []));
    out.preguntas = uniqueText((local.preguntas || []).concat(llmDiag.preguntas || []), 'pregunta');
    const idsLocal = (local.sintomas || []).map(function (s) { return s.id; });
    const hayRuidoLocal = idsLocal.indexOf('ruido_motor') >= 0 ||
      idsLocal.indexOf('ruido') >= 0 ||
      idsLocal.indexOf('motor_lento') >= 0;
    if (!hayRuidoLocal) {
      out.posibles_causas = (out.posibles_causas || []).filter(function (c) {
        return !/desgaste|lentitud|ruido\s+(?:en|de|del)\s+motor/i.test((c && c.texto) || '');
      });
    }
    if (llmDiag.urgencia && llmDiag.urgencia.nivel && local.urgencia && local.urgencia.nivel === 'indeterminada') {
      out.urgencia = llmDiag.urgencia;
    }
    if (out.urgencia && /ruido o lentitud|sugieren desgaste/i.test(out.urgencia.motivo || '') && !hayRuidoLocal) {
      out.urgencia = local.urgencia;
    }
    if (llmDiag.informacion_insuficiente && out.posibles_causas.length === 0) {
      out.informacion_insuficiente = true;
    }
    if (llmDiag.mensaje && out.informacion_insuficiente) out.mensaje = llmDiag.mensaje;
    const conocimiento = global.ArpaIaTecnicaConocimiento;
    if (conocimiento && typeof conocimiento.aplicarEvidenciaAResultado === 'function') {
      return deduplicarAnalisis(conocimiento.aplicarEvidenciaAResultado(out));
    }
    return deduplicarAnalisis(out);
  }

  function construirTextoLlm(oficioId, sintomasTexto, contextoTexto, respuestas) {
    const lines = [];
    lines.push('Oficio fijado por ARPASuite (NO cambiar): ' + oficioId);
    if (contextoTexto) {
      lines.push('Datos ya capturados en la Orden de Trabajo:');
      lines.push(contextoTexto);
    }
    if (sintomasTexto) {
      lines.push('Síntomas / observaciones del técnico:');
      lines.push(sintomasTexto);
    }
    if (respuestas && typeof respuestas === 'object') {
      const keys = Object.keys(respuestas);
      const block = [];
      const sanitizar = global.ArpaIaTecnica && typeof global.ArpaIaTecnica.sanitizarClaveRespuesta === 'function'
        ? global.ArpaIaTecnica.sanitizarClaveRespuesta
        : function (k) { return k; };
      keys.forEach(function (k) {
        const v = String(respuestas[k] || '').trim();
        if (v) block.push('- ' + sanitizar(k) + ': ' + v);
      });
      if (block.length) {
        lines.push('Respuestas del técnico a preguntas de ESTE análisis:');
        lines.push(block.join('\n'));
      }
    }
    lines.push('Este análisis es independiente y corresponde SOLO a esta solicitud. No reutilices síntomas, causas ni datos de otra solicitud.');
    lines.push('Devuelve diagnóstico técnico en JSON. No confirmes causas. No puentear seguridad. No inventes síntomas que el técnico no escribió.');
    return lines.join('\n\n');
  }

  global.ArpaIaTecnicaLlm = {
    normalizeDiagnostico,
    extraidoComoHechos,
    mergeAnalisis,
    construirTextoLlm,
    deduplicarAnalisis,
    deduplicarLista
  };
})(typeof window !== 'undefined' ? window : globalThis);
