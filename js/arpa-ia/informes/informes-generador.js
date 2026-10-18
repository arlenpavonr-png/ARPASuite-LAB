/**
 * Construye el informe técnico a partir de hechos de la OT.
 * El fallback local no inventa. El texto del LLM se recorta si introduce hechos nuevos.
 */
(function (global) {
  const TIPO_LABEL = {
    mantenimiento: 'Mantenimiento',
    reparacion: 'Reparación',
    instalacion: 'Instalación'
  };

  function emptyInforme() {
    return {
      titulo: '',
      numero_ot: '',
      fecha: '',
      cliente: '',
      ubicacion: '',
      tecnico: '',
      oficio: '',
      tipo_servicio: '',
      equipo: '',
      marca: '',
      modelo: '',
      descripcion_trabajo: '',
      hallazgos: [],
      diagnostico: '',
      trabajos_realizados: [],
      materiales_utilizados: [],
      resultado: '',
      recomendaciones: [],
      observaciones: '',
      resumen_cliente: '',
      nota_tecnica: '',
      advertencias: [],
      fuente: 'local',
      estado_llm: 'desconectado',
      error_llm: null,
      causa_confirmada: false
    };
  }

  function joinAnd(list) {
    const items = (list || []).filter(Boolean);
    if (!items.length) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return items[0] + ' y ' + items[1];
    return items.slice(0, -1).join(', ') + ' y ' + items[items.length - 1];
  }

  function tipoLabel(tipo) {
    return TIPO_LABEL[tipo] || tipo || '';
  }

  function hipotesisDe(parsed) {
    return (parsed.causas || []).filter(function (c) { return !c.confirmado; });
  }

  function buildTitulo(parsed) {
    const bits = ['Informe técnico'];
    const tipo = tipoLabel(parsed.tipo_servicio);
    if (tipo) bits.push(tipo.toLowerCase());
    if (parsed.oficio_label) bits.push(parsed.oficio_label);
    return bits.join(' — ');
  }

  function buildDiagnostico(parsed) {
    if (parsed.causa_confirmada && parsed.diagnostico_confirmado) {
      return 'Diagnóstico registrado por el técnico: ' + parsed.diagnostico_confirmado;
    }
    const hips = hipotesisDe(parsed);
    if (hips.length) {
      return 'No hay diagnóstico confirmado en la OT. Hipótesis de trabajo (no confirmadas): ' +
        joinAnd(hips.map(function (c) { return c.texto; })) + '.';
    }
    if (parsed.hallazgos.length || parsed.sintomas.length) {
      return 'No hay diagnóstico confirmado registrado.';
    }
    return '';
  }

  function buildResumen(parsed) {
    const parts = [];
    const quien = parsed.cliente ? ('para ' + parsed.cliente) : '';
    const donde = parsed.ubicacion ? (' en ' + parsed.ubicacion) : '';
    const tipo = tipoLabel(parsed.tipo_servicio).toLowerCase();
    const oficio = parsed.oficio_label || parsed.oficio_id;
    const equipo = [parsed.equipo, parsed.marca, parsed.modelo].filter(Boolean).join(' ');

    if (tipo || oficio) {
      let line = 'Se registró';
      if (tipo) line += ' un servicio de ' + tipo;
      if (oficio) line += (tipo ? ' de ' : ' trabajo de ') + oficio;
      if (equipo) line += ' sobre ' + equipo;
      if (quien) line += ' ' + quien;
      if (donde) line += donde;
      line += '.';
      parts.push(line);
    }
    if (parsed.sintomas.length) {
      parts.push('Síntoma registrado: ' + joinAnd(parsed.sintomas) + '.');
    }
    if (parsed.hallazgos.length) {
      parts.push('Hallazgo registrado: ' + joinAnd(parsed.hallazgos) + '.');
    }
    if (parsed.trabajos_ejecutados.length) {
      parts.push('Trabajo ejecutado: ' + joinAnd(parsed.trabajos_ejecutados) + '.');
    }
    if (parsed.resultado) {
      parts.push('Resultado registrado: ' + parsed.resultado + '.');
      if (/pendiente/i.test(parsed.resultado)) {
        parts.push('La reparación no está terminada.');
      }
    } else if (/pendiente/i.test(parsed.estado || '')) {
      parts.push('El trabajo figura pendiente; no se registró un cierre.');
    }
    if (!parsed.materiales.length) {
      parts.push('No se registraron materiales utilizados.');
    } else {
      parts.push('Materiales registrados: ' + joinAnd(parsed.materiales) + '.');
    }
    const hips = hipotesisDe(parsed);
    if (hips.length && !parsed.causa_confirmada) {
      parts.push('Hay hipótesis de causa, no un diagnóstico confirmado.');
    }
    if (!parsed.marca) parts.push('La OT no registra marca.');
    if (!parsed.modelo) parts.push('La OT no registra modelo.');
    if (!parsed.resultado && !parsed.trabajos_ejecutados.length) {
      parts.push('La OT no registra resultado del trabajo.');
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  function buildNotaTecnica(parsed) {
    const hechos = [];
    if (parsed.numero_ot) hechos.push('OT ' + parsed.numero_ot);
    if (parsed.fecha) hechos.push('fecha ' + parsed.fecha);
    if (parsed.tecnico) hechos.push('técnico ' + parsed.tecnico);
    if (parsed.equipo) hechos.push(parsed.equipo);
    if (parsed.marca) hechos.push('marca ' + parsed.marca);
    if (parsed.modelo) hechos.push('modelo ' + parsed.modelo);
    if (parsed.sintomas.length) hechos.push('síntomas: ' + joinAnd(parsed.sintomas));
    if (parsed.hallazgos.length) hechos.push('hallazgos: ' + joinAnd(parsed.hallazgos));
    if (parsed.pruebas_realizadas.length) hechos.push('pruebas: ' + joinAnd(parsed.pruebas_realizadas));
    if (parsed.trabajos_ejecutados.length) hechos.push('trabajos: ' + joinAnd(parsed.trabajos_ejecutados));
    if (parsed.resultado) hechos.push('resultado: ' + parsed.resultado);
    const fotos = parsed.fotos || { antes: [], despues: [] };
    if (fotos.antes.length || fotos.despues.length) {
      hechos.push('fotos registradas: ' + fotos.antes.length + ' antes, ' + fotos.despues.length + ' después');
    }

    const lines = [];
    lines.push('HECHOS REGISTRADOS: ' + (hechos.length ? hechos.join('; ') + '.' : 'sin detalle adicional en la OT.'));
    const hips = hipotesisDe(parsed);
    if (parsed.causa_confirmada && parsed.diagnostico_confirmado) {
      lines.push('DIAGNÓSTICO CONFIRMADO (registro del técnico): ' + parsed.diagnostico_confirmado);
    } else if (hips.length) {
      lines.push('INFORMACIÓN GENERADA / HIPÓTESIS (no confirmadas): ' + joinAnd(hips.map(function (c) { return c.texto; })) + '.');
    } else {
      lines.push('INFORMACIÓN GENERADA / HIPÓTESIS: no hay hipótesis ni diagnóstico confirmado en la OT.');
    }
    if (/pendiente/i.test(parsed.resultado || '') || /pendiente/i.test(parsed.estado || '')) {
      lines.push('El trabajo no figura como reparación terminada.');
    }
    return lines.join(' ');
  }

  function buildHallazgos(parsed) {
    return unique((parsed.sintomas || []).concat(parsed.hallazgos || []));
  }

  function unique(list) {
    const seen = {};
    const out = [];
    (list || []).forEach(function (item) {
      const k = String(item || '').trim().toLowerCase();
      if (!k || seen[k]) return;
      seen[k] = true;
      out.push(item);
    });
    return out;
  }

  function construirLocal(parsed, meta) {
    const info = meta || {};
    const inf = emptyInforme();
    inf.titulo = buildTitulo(parsed);
    inf.numero_ot = parsed.numero_ot || '';
    inf.fecha = parsed.fecha || '';
    inf.cliente = parsed.cliente || '';
    inf.ubicacion = parsed.ubicacion || '';
    inf.tecnico = parsed.tecnico || '';
    inf.oficio = parsed.oficio_label || parsed.oficio_id || '';
    inf.tipo_servicio = parsed.tipo_servicio || '';
    inf.equipo = parsed.equipo || '';
    inf.marca = parsed.marca || '';
    inf.modelo = parsed.modelo || '';
    inf.descripcion_trabajo = parsed.descripcion_trabajo || '';
    inf.hallazgos = buildHallazgos(parsed);
    inf.diagnostico = buildDiagnostico(parsed);
    inf.trabajos_realizados = (parsed.trabajos_ejecutados || []).slice();
    inf.materiales_utilizados = (parsed.materiales || []).slice();
    inf.resultado = parsed.resultado || '';
    inf.recomendaciones = (parsed.recomendaciones || []).slice();
    inf.observaciones = parsed.observaciones || '';
    inf.resumen_cliente = buildResumen(parsed);
    inf.nota_tecnica = buildNotaTecnica(parsed);
    inf.advertencias = (parsed.advertencias || []).slice();
    inf.fuente = info.fuente || 'local';
    inf.estado_llm = info.estado_llm || 'desconectado';
    inf.error_llm = info.error_llm || null;
    inf.causa_confirmada = !!parsed.causa_confirmada;
    return inf;
  }

  function fold(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
      .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ü/g, 'u').replace(/ñ/g, 'n');
  }

  function sourceFold(parsed) {
    return fold(parsed && parsed.texto_fuente ? parsed.texto_fuente : '');
  }

  function introduceHechoNuevo(text, parsed) {
    const t = fold(text);
    const src = sourceFold(parsed);
    if (!t) return false;
    if (/\$|pvp|\bprecio\b|\bcop\b|\busd\b|\biva\b/.test(t)) return true;
    const units = t.match(/\d+(?:[.,]\d+)?\s*(?:kg|m|cm|mm|v|w|amp|btu|kw)/g) || [];
    for (let i = 0; i < units.length; i += 1) {
      const u = units[i].replace(/\s+/g, '');
      const srcN = src.replace(/\s+/g, '');
      if (srcN.indexOf(u) === -1 && src.indexOf(units[i]) === -1) return true;
    }
    const marcas = ['nice', 'came', 'ppa', 'faac', 'roger', 'yamaha', 'suzuki', 'samsung', 'hitachi'];
    for (let j = 0; j < marcas.length; j += 1) {
      if (new RegExp('\\b' + marcas[j] + '\\b').test(t) && src.indexOf(marcas[j]) === -1) return true;
    }
    if (/\bbft\b/.test(t) && src.indexOf('bft') === -1) return true;
    if (/\bhonda\b/.test(t) && src.indexOf('honda') === -1) return true;
    const mats = ['cremallera', 'capacitor', 'engranaje', 'pinon', 'piñon', 'repuesto'];
    for (let k = 0; k < mats.length; k += 1) {
      if (t.indexOf(mats[k]) !== -1 && src.indexOf(fold(mats[k])) === -1) return true;
    }
    if (parsed.oficio_id && parsed.oficio_id !== 'automatismos') {
      if (/fotocelda|corrediza|cremallera|porton|portón/.test(t) && !/fotocelda|corrediza|cremallera|porton/.test(src)) {
        return true;
      }
    }
    if (parsed.oficio_id && parsed.oficio_id !== 'refrigeracion') {
      if (/evaporador|refrigerante|\bbtu\b/.test(t) && !/evaporador|refrigerante|btu/.test(src)) return true;
    }
    return false;
  }

  function asStringList(value) {
    if (!Array.isArray(value)) return [];
    return value.map(function (item) {
      if (item == null) return '';
      if (typeof item === 'string') return item.trim();
      return String(item.texto || item.nombre || item).trim();
    }).filter(Boolean);
  }

  function filtrarListaCubierta(list, parsed) {
    return asStringList(list).filter(function (item) {
      return !introduceHechoNuevo(item, parsed);
    });
  }

  function mergeLlm(local, llm, parsed) {
    const out = Object.assign({}, local);
    if (!llm || typeof llm !== 'object') return out;
    const prose = ['titulo', 'resumen_cliente', 'nota_tecnica', 'diagnostico', 'observaciones', 'resultado'];
    prose.forEach(function (key) {
      const v = llm[key] == null ? '' : String(llm[key]).trim();
      if (!v) return;
      if (introduceHechoNuevo(v, parsed)) return;
      if (key === 'resultado' && local.resultado) {
        out.resultado = local.resultado;
        return;
      }
      if (key === 'observaciones' && !parsed.observaciones) return;
      out[key] = v;
    });
    if (!parsed.causa_confirmada && out.diagnostico && !/hip[oó]tesis|posible causa|no (hay|existe) diagn[oó]stico confirmado|no confirmad/i.test(out.diagnostico)) {
      out.diagnostico = local.diagnostico;
    }
    out.hallazgos = local.hallazgos;
    out.trabajos_realizados = local.trabajos_realizados;
    out.materiales_utilizados = local.materiales_utilizados;
    out.recomendaciones = local.recomendaciones;
    out.advertencias = local.advertencias;
    out.marca = local.marca;
    out.modelo = local.modelo;
    out.equipo = local.equipo;
    out.oficio = local.oficio;
    out.tipo_servicio = local.tipo_servicio;
    out.numero_ot = local.numero_ot;
    out.fecha = local.fecha;
    out.cliente = local.cliente;
    out.ubicacion = local.ubicacion;
    out.tecnico = local.tecnico;
    out.causa_confirmada = local.causa_confirmada;
    if (Array.isArray(llm.hallazgos) && llm.hallazgos.length) {
      const extra = filtrarListaCubierta(llm.hallazgos, parsed);
      extra.forEach(function (h) {
        if (!out.hallazgos.some(function (x) { return fold(x) === fold(h); })) {
          if (parsed.sintomas.concat(parsed.hallazgos).some(function (s) { return fold(s).indexOf(fold(h)) !== -1 || fold(h).indexOf(fold(s)) !== -1; })) {
            out.hallazgos.push(h);
          }
        }
      });
    }
    return out;
  }

  function pickInformePayload(data) {
    if (!data || typeof data !== 'object') return null;
    if (data.informe && typeof data.informe === 'object') return data.informe;
    if (data.titulo != null || data.resumen_cliente != null || data.nota_tecnica != null) return data;
    return null;
  }

  global.ArpaIaInformesGenerador = {
    emptyInforme: emptyInforme,
    construirLocal: construirLocal,
    mergeLlm: mergeLlm,
    pickInformePayload: pickInformePayload,
    introduceHechoNuevo: introduceHechoNuevo
  };
})(typeof window !== 'undefined' ? window : globalThis);
