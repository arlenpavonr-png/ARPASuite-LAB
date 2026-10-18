/**
 * Normaliza y valida una OT para ARPA IA INFORMES.
 * No infiere oficio. No inventa hechos.
 */
(function (global) {
  const ALIASES_OFICIO = {
    automatizacion: 'automatismos',
    control_de_plagas: 'plagas',
    energia_solar: 'solar',
    cctv_seguridad: 'cctv'
  };

  const ALIASES_TIPO = {
    mantenimiento: 'mantenimiento',
    mant: 'mantenimiento',
    reparacion: 'reparacion',
    reparación: 'reparacion',
    reparar: 'reparacion',
    instalacion: 'instalacion',
    instalación: 'instalacion',
    instalar: 'instalacion'
  };

  function trimStr(value) {
    if (value == null) return '';
    return String(value).trim();
  }

  function asList(value) {
    if (value == null || value === '') return [];
    if (Array.isArray(value)) {
      return value.map(function (item) {
        if (item == null) return '';
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'object') {
          return trimStr(item.texto || item.descripcion || item.nombre || item.label || item.pregunta || item.valor);
        }
        return String(item).trim();
      }).filter(Boolean);
    }
    return [String(value).trim()].filter(Boolean);
  }

  function asCausas(value) {
    if (value == null || value === '') return [];
    const list = Array.isArray(value) ? value : [value];
    return list.map(function (item) {
      if (item == null) return null;
      if (typeof item === 'string') {
        const t = item.trim();
        if (!t) return null;
        return { texto: t, confirmado: false, tipo: 'hipotesis' };
      }
      const texto = trimStr(item.texto || item.hipotesis || item.causa || item.descripcion);
      if (!texto) return null;
      return {
        texto: texto,
        confirmado: !!item.confirmado && item.tipo !== 'hipotesis',
        tipo: item.confirmado && item.tipo !== 'hipotesis' ? 'confirmada' : 'hipotesis'
      };
    }).filter(Boolean);
  }

  function asFotos(value) {
    const empty = { antes: [], despues: [] };
    if (!value) return empty;
    if (Array.isArray(value)) return { antes: asList(value), despues: [] };
    return {
      antes: asList(value.antes || value.before),
      despues: asList(value.despues || value.after)
    };
  }

  function asMateriales(value) {
    return asList(value).filter(function (item) {
      return !/ninguno|ninguna|no\s+registrad|sin\s+material|^n\/a$|^na$|^0$/i.test(String(item).trim());
    });
  }

  function pick(src, keys) {
    for (let i = 0; i < keys.length; i += 1) {
      const v = src && src[keys[i]];
      if (v != null && String(v).trim() !== '') return v;
    }
    return '';
  }

  function normalizeOficio(raw) {
    const v = trimStr(raw).toLowerCase();
    if (!v) return '';
    const perfiles = global.ArpaIaPerfiles;
    if (perfiles && typeof perfiles.normalizeOficioId === 'function') {
      const n = perfiles.normalizeOficioId(v);
      if (n) return n;
    }
    if (perfiles && typeof perfiles.getProfile === 'function') {
      const p = perfiles.getProfile(v);
      if (p && p.id) return p.id;
    }
    return ALIASES_OFICIO[v] || v;
  }

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

  function labelOficio(oficioId) {
    if (!oficioId) return '';
    if (global.ArpaOficios && typeof global.ArpaOficios.getOficioLabel === 'function') {
      const lab = global.ArpaOficios.getOficioLabel(oficioId);
      if (lab && lab !== oficioId) return lab;
    }
    if (global.ArpaIaPerfiles && typeof global.ArpaIaPerfiles.getProfile === 'function') {
      const p = global.ArpaIaPerfiles.getProfile(oficioId);
      if (p && p.label) return p.label;
    }
    return OFICIO_LABELS[oficioId] || oficioId;
  }

  function normalizeTipo(raw) {
    const v = trimStr(raw).toLowerCase();
    if (!v) return '';
    return ALIASES_TIPO[v] || v;
  }

  function fromIaTecnica(ia) {
    if (!ia || typeof ia !== 'object') {
      return { sintomas: [], causas: [], pruebas: [], advertencias: [], confirmado: false, diagnostico: '' };
    }
    const sintomas = asList((ia.sintomas || []).map(function (s) { return s && (s.texto || s); }));
    const causas = asCausas(ia.posibles_causas || ia.causas || ia.hipotesis);
    const pruebas = asList(ia.pruebas_recomendadas || ia.pruebas);
    const advertencias = asList(ia.advertencias_seguridad || ia.advertencias);
    const confirmado = ia.causa_confirmada === true;
    return {
      sintomas: sintomas,
      causas: causas,
      pruebas: pruebas,
      advertencias: advertencias,
      confirmado: confirmado,
      diagnostico: confirmado ? trimStr(ia.diagnostico || ia.mensaje) : ''
    };
  }

  function parseOt(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const oficioId = normalizeOficio(pick(src, ['oficio', 'oficio_id', 'oficioId']));
    const ia = fromIaTecnica(src.ia_tecnica || src.iaTecnica || src.diagnostico_ia);
    const sintomasOt = asList(src.sintomas || src.sintoma || src.problema);
    const hallazgosOt = asList(src.hallazgos || src.hallazgo);
    const causasOt = asCausas(src.causas || src.posible_causa || src.posibles_causas);
    const diagnosticoTec = trimStr(src.diagnostico_confirmado || src.diagnosticoTecnico || '');
    const confirmadoTec = !!src.diagnostico_confirmado || src.causa_confirmada === true || trimStr(src.diagnostico_estado) === 'confirmado';

    const parsed = {
      numero_ot: trimStr(pick(src, ['numero_ot', 'numero', 'ot', 'id_ot'])),
      fecha: trimStr(pick(src, ['fecha', 'fecha_ot', 'fecha_servicio'])),
      cliente: trimStr(pick(src, ['cliente', 'nombre_cliente', 'cliente_nombre'])),
      ubicacion: trimStr(pick(src, ['ubicacion', 'ciudad', 'direccion', 'lugar'])),
      tecnico: trimStr(pick(src, ['tecnico', 'tecnico_nombre', 'operario'])),
      oficio_id: oficioId,
      oficio_label: labelOficio(oficioId),
      tipo_servicio: normalizeTipo(pick(src, ['tipo_servicio', 'tipo', 'tipo_de_trabajo'])),
      descripcion_trabajo: trimStr(pick(src, ['descripcion_trabajo', 'descripcion', 'trabajo'])),
      equipo: trimStr(pick(src, ['equipo', 'tipo_equipo'])),
      marca: trimStr(pick(src, ['marca'])),
      modelo: trimStr(pick(src, ['modelo', 'referencia'])),
      sintomas: unique(sintomasOt.concat(ia.sintomas)),
      hallazgos: unique(hallazgosOt),
      diagnostico_confirmado: diagnosticoTec || (confirmadoTec || ia.confirmado ? ia.diagnostico : ''),
      causa_confirmada: !!(confirmadoTec || (ia.confirmado && ia.diagnostico)),
      causas: uniqueCausas(causasOt.concat(ia.causas)),
      pruebas_realizadas: unique(asList(src.pruebas_realizadas || src.pruebas).concat(src.incluir_pruebas_ia ? ia.pruebas : [])),
      trabajos_ejecutados: unique(asList(src.trabajos_ejecutados || src.trabajos_realizados || src.trabajo_realizado)),
      materiales: unique(asMateriales(src.materiales || src.materiales_utilizados || src.material)),
      observaciones: trimStr(pick(src, ['observaciones', 'obs'])),
      fotos: asFotos(src.fotos),
      resultado: trimStr(pick(src, ['resultado', 'resultado_final', 'cierre'])),
      recomendaciones: unique(asList(src.recomendaciones || src.recomendacion)),
      estado: trimStr(pick(src, ['estado', 'estado_ot'])),
      advertencias: unique(asList(src.advertencias || src.advertencias_seguridad).concat(ia.advertencias)),
      ia_tecnica: src.ia_tecnica || src.iaTecnica || null
    };

    parsed.texto_fuente = [
      parsed.numero_ot, parsed.fecha, parsed.cliente, parsed.ubicacion, parsed.tecnico,
      parsed.oficio_id, parsed.oficio_label, parsed.tipo_servicio, parsed.descripcion_trabajo,
      parsed.equipo, parsed.marca, parsed.modelo,
      parsed.sintomas.join(' '), parsed.hallazgos.join(' '),
      parsed.diagnostico_confirmado, parsed.observaciones, parsed.resultado, parsed.estado,
      parsed.causas.map(function (c) { return c.texto; }).join(' '),
      parsed.pruebas_realizadas.join(' '), parsed.trabajos_ejecutados.join(' '),
      parsed.materiales.join(' '), parsed.recomendaciones.join(' '),
      parsed.advertencias.join(' ')
    ].join(' \n ');

    return parsed;
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

  function uniqueCausas(list) {
    const seen = {};
    const out = [];
    (list || []).forEach(function (c) {
      const k = String(c && c.texto || '').trim().toLowerCase();
      if (!k || seen[k]) return;
      seen[k] = true;
      out.push(c);
    });
    return out;
  }

  global.ArpaIaInformesParser = {
    parseOt: parseOt,
    normalizeOficio: normalizeOficio,
    normalizeTipo: normalizeTipo,
    labelOficio: labelOficio
  };
})(typeof window !== 'undefined' ? window : globalThis);
