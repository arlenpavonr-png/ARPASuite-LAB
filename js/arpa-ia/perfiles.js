/**
 * Chasis de perfiles de oficio para ARPA IA.
 * Automatización es un perfil, no la arquitectura.
 */
(function (global) {
  const ALIASES = {
    automatizacion: 'automatismos',
    control_de_plagas: 'plagas',
    energia_solar: 'solar',
    cctv_seguridad: 'cctv',
    cerrajeria: 'metalmecanica'
  };

  const TO_LLM_OFICIO = {
    automatismos: 'automatizacion',
    plagas: 'control_de_plagas',
    solar: 'energia_solar',
    cctv: 'cctv_seguridad'
  };

  function field(id, label, extra) {
    return Object.assign({ id: id, label: label, type: 'text' }, extra || {});
  }

  function genericStub(id) {
    return {
      id: id || 'sin_oficio',
      label: id || 'Sin oficio',
      llmSchema: 'generico',
      match: 'generic',
      fields: [
        field('tipo_de_trabajo', 'Tipo de trabajo'),
        field('ciudad', 'Ciudad'),
        field('observaciones', 'Observaciones')
      ],
      requiredForQuote: [],
      productMeta: [],
      matchKeywords: [],
      placeholder: 'Describe el trabajo en tus palabras.'
    };
  }

  const PROFILES = {
    automatismos: {
      id: 'automatismos',
      label: 'Automatización de Puertas',
      llmSchema: 'automatismos',
      match: 'automatismos',
      fields: [
        field('tipo_de_trabajo', 'Tipo de trabajo'),
        field('tipo_de_puerta', 'Tipo de puerta'),
        field('uso', 'Uso'),
        field('peso_estimado', 'Peso', { type: 'number', unit: 'kg' }),
        field('ancho_m', 'Ancho', { type: 'number', unit: 'm' }),
        field('recorrido_m', 'Recorrido', { type: 'number', unit: 'm' }),
        field('ciudad', 'Ciudad'),
        field('materiales_mencionados', 'Materiales', { type: 'list' })
      ],
      requiredForQuote: ['tipo_de_puerta', 'peso_estimado', 'uso', 'ciudad'],
      productMeta: [{ id: 'capacidad_kg_catalogo', label: 'Capacidad', unit: 'kg' }],
      matchKeywords: ['motor', 'puerta', 'kit'],
      placeholder: 'Ej. Puerta corrediza residencial de 500 kg, 5 metros, Medellín.'
    },
    electricidad: {
      id: 'electricidad',
      label: 'Electricidad',
      llmSchema: 'generico',
      match: 'generic',
      fields: [
        field('tipo_de_trabajo', 'Tipo de trabajo'),
        field('tipo_instalacion', 'Tipo de instalación'),
        field('puntos', 'Puntos', { type: 'number' }),
        field('metros_cable', 'Metros de cable', { type: 'number', unit: 'm' }),
        field('amperaje', 'Amperaje', { type: 'number', unit: 'A' }),
        field('voltaje', 'Voltaje', { type: 'number', unit: 'V' }),
        field('material', 'Material'),
        field('ciudad', 'Ciudad'),
        field('observaciones', 'Observaciones')
      ],
      requiredForQuote: ['tipo_de_trabajo'],
      productMeta: [],
      matchKeywords: ['eléctrico', 'electrico', 'cable', 'punto', 'breaker', 'tablero', 'toma'],
      placeholder: 'Ej. Instalar 8 puntos eléctricos, 40 metros de cable, Medellín.'
    },
    gas: {
      id: 'gas',
      label: 'Gas',
      llmSchema: 'generico',
      match: 'generic',
      fields: [
        field('tipo_de_trabajo', 'Tipo de trabajo'),
        field('tipo_servicio', 'Tipo de servicio'),
        field('tipo_gas', 'Tipo de gas'),
        field('metros_tuberia', 'Metros de tubería', { type: 'number', unit: 'm' }),
        field('diametro_tuberia', 'Diámetro de tubería'),
        field('puntos', 'Puntos', { type: 'number' }),
        field('material', 'Material'),
        field('ciudad', 'Ciudad'),
        field('observaciones', 'Observaciones')
      ],
      requiredForQuote: ['tipo_de_trabajo'],
      productMeta: [],
      matchKeywords: ['gas', 'tubería', 'tuberia', 'cocina', 'calentador', 'válvula', 'valvula'],
      placeholder: 'Ej. Instalación de gas para cocina, 12 metros de tubería, Medellín.'
    },
    refrigeracion: {
      id: 'refrigeracion',
      label: 'Refrigeración y Aire Acondicionado',
      llmSchema: 'generico',
      match: 'generic',
      fields: [
        field('tipo_de_trabajo', 'Tipo de trabajo'),
        field('tipo_equipo', 'Tipo de equipo'),
        field('btu', 'Capacidad BTU', { type: 'number', unit: 'BTU' }),
        field('refrigerante', 'Refrigerante'),
        field('metros_tuberia', 'Metros de tubería', { type: 'number', unit: 'm' }),
        field('ciudad', 'Ciudad'),
        field('observaciones', 'Observaciones')
      ],
      requiredForQuote: ['tipo_de_trabajo'],
      productMeta: [],
      matchKeywords: ['aire', 'split', 'btu', 'refrigerante', 'nevera', 'mantenimiento'],
      placeholder: 'Ej. Mantenimiento de aire acondicionado de 12000 BTU, Medellín.'
    },
    metalmecanica: {
      id: 'metalmecanica',
      label: 'Metalmecánica',
      llmSchema: 'generico',
      match: 'generic',
      fields: [
        field('tipo_de_trabajo', 'Tipo de trabajo'),
        field('tipo_pieza', 'Tipo de pieza'),
        field('material', 'Material'),
        field('dimensiones', 'Dimensiones'),
        field('metros_cuadrados', 'Metros cuadrados', { type: 'number', unit: 'm²' }),
        field('cantidad', 'Cantidad', { type: 'number' }),
        field('acabado', 'Acabado'),
        field('observaciones', 'Observaciones')
      ],
      requiredForQuote: ['tipo_pieza'],
      productMeta: [],
      matchKeywords: ['reja', 'puerta', 'acero', 'soldadura', 'estructura', 'fabricación', 'fabricacion'],
      placeholder: 'Ej. Fabricar una reja de 2 por 3 metros en acero.'
    },
    plagas: {
      id: 'plagas',
      label: 'Control de Plagas',
      llmSchema: 'generico',
      match: 'generic',
      fields: [
        field('tipo_servicio', 'Tipo de servicio'),
        field('tipo_plaga', 'Tipo de plaga'),
        field('area_m2', 'Área', { type: 'number', unit: 'm²' }),
        field('nivel_infestacion', 'Nivel de infestación'),
        field('frecuencia', 'Frecuencia'),
        field('ciudad', 'Ciudad'),
        field('observaciones', 'Observaciones')
      ],
      requiredForQuote: ['tipo_servicio'],
      productMeta: [],
      matchKeywords: ['plaga', 'fumig', 'cucaracha', 'roedor', 'casa', 'apartamento', 'control'],
      placeholder: 'Ej. Control de plagas para una casa de 180 m2.'
    },
    linea_blanca: {
      id: 'linea_blanca',
      label: 'Línea Blanca',
      llmSchema: 'generico',
      match: 'generic',
      fields: [
        field('tipo_de_trabajo', 'Tipo de trabajo'),
        field('tipo_equipo', 'Tipo de equipo'),
        field('marca', 'Marca'),
        field('modelo', 'Modelo'),
        field('falla', 'Falla'),
        field('diagnostico', 'Diagnóstico'),
        field('repuestos_mencionados', 'Repuestos mencionados', { type: 'list' }),
        field('observaciones', 'Observaciones')
      ],
      requiredForQuote: ['tipo_equipo'],
      productMeta: [],
      matchKeywords: ['lavadora', 'nevera', 'estufa', 'horno', 'reparación', 'reparacion', 'diagnóstico'],
      placeholder: 'Ej. Reparar lavadora Haceb que no centrifuga.'
    },
    solar: {
      id: 'solar',
      label: 'Energía Solar',
      llmSchema: 'generico',
      match: 'generic',
      fields: [
        field('tipo_de_trabajo', 'Tipo de trabajo'),
        field('tipo_sistema', 'Tipo de sistema'),
        field('potencia_kw', 'Potencia', { type: 'number', unit: 'kW' }),
        field('paneles', 'Paneles', { type: 'number' }),
        field('inversor', 'Inversor'),
        field('baterias', 'Baterías'),
        field('consumo', 'Consumo'),
        field('ciudad', 'Ciudad'),
        field('observaciones', 'Observaciones')
      ],
      requiredForQuote: ['tipo_de_trabajo'],
      productMeta: [],
      matchKeywords: ['solar', 'panel', 'inversor', 'bater', 'kw'],
      placeholder: 'Ej. Instalar sistema solar de 5 kW con 10 paneles.'
    },
    plomeria: {
      id: 'plomeria',
      label: 'Plomería',
      llmSchema: 'generico',
      match: 'generic',
      fields: [
        field('tipo_de_trabajo', 'Tipo de trabajo'),
        field('tipo_servicio', 'Tipo de servicio'),
        field('tipo_instalacion', 'Tipo de instalación'),
        field('puntos', 'Puntos', { type: 'number' }),
        field('metros_tuberia', 'Metros de tubería', { type: 'number', unit: 'm' }),
        field('diametro', 'Diámetro'),
        field('material', 'Material'),
        field('ciudad', 'Ciudad'),
        field('observaciones', 'Observaciones')
      ],
      requiredForQuote: ['tipo_de_trabajo'],
      productMeta: [],
      matchKeywords: ['fuga', 'tubería', 'tuberia', 'agua', 'grifo', 'pvc', 'destape'],
      placeholder: 'Ej. Reparar fuga de agua y cambiar 8 metros de tubería.'
    },
    cctv: {
      id: 'cctv',
      label: 'CCTV / Seguridad Electrónica',
      llmSchema: 'generico',
      match: 'generic',
      fields: [
        field('tipo_de_trabajo', 'Tipo de trabajo'),
        field('tipo_sistema', 'Tipo de sistema'),
        field('camaras', 'Cámaras', { type: 'number' }),
        field('canales', 'Canales', { type: 'number' }),
        field('resolucion', 'Resolución'),
        field('almacenamiento', 'Almacenamiento'),
        field('metros_cable', 'Metros de cable', { type: 'number', unit: 'm' }),
        field('ciudad', 'Ciudad'),
        field('observaciones', 'Observaciones')
      ],
      requiredForQuote: ['tipo_de_trabajo'],
      productMeta: [],
      matchKeywords: ['cámara', 'camara', 'ip', 'dvr', 'nvr', 'cctv', 'alarma'],
      placeholder: 'Ej. Instalar 6 cámaras IP con 80 metros de cable.'
    },
    taller_motos: {
      id: 'taller_motos',
      label: 'Taller de Motos',
      llmSchema: 'generico',
      match: 'generic',
      fields: [
        field('tipo_de_trabajo', 'Tipo de trabajo'),
        field('tipo_servicio', 'Tipo de servicio'),
        field('marca', 'Marca'),
        field('modelo', 'Modelo'),
        field('cilindraje', 'Cilindraje', { type: 'number', unit: 'cc' }),
        field('kilometraje', 'Kilometraje', { type: 'number', unit: 'km' }),
        field('falla', 'Falla'),
        field('repuestos_mencionados', 'Repuestos mencionados', { type: 'list' }),
        field('mano_de_obra', 'Mano de obra'),
        field('observaciones', 'Observaciones')
      ],
      requiredForQuote: ['tipo_servicio'],
      productMeta: [],
      matchKeywords: ['moto', 'revisión', 'revision', 'mantenimiento', 'aceite', 'honda'],
      placeholder: 'Ej. Revisión y mantenimiento de moto Honda 150 con 25000 km.'
    }
  };

  function foldText(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function inferOficioFromText(text) {
    const t = foldText(text);
    if (!t.trim()) return '';

    const mentionsDoor = /puerta|porton|corrediz|batiente|talanquera|enrollable|seccional|automatiz/.test(t);
    if ((/\b(moto|motocicleta|cilindraje)\b/.test(t) || (/\bhonda\b/.test(t) && /\b(\d+\s*cc|\d+\s*km)/.test(t))) && !mentionsDoor) {
      return 'taller_motos';
    }
    if (/nevera|refrigerador|congelador|aire acondicionado|\bbtu\b|no enfri/.test(t)) {
      return 'refrigeracion';
    }
    if (/lavadora|centrifug|estufa|horno micro|linea blanca/.test(t)) return 'linea_blanca';
    if (/\b(cctv|dvr|nvr)\b/.test(t) || /camaras?\b/.test(t)) return 'cctv';
    if (/energia solar|panel solar|\bpaneles\b/.test(t) || (/\bsolar\b/.test(t) && /\b(kw|inversor)\b/.test(t))) {
      return 'solar';
    }
    if (/fumig|plaga|cucaracha|roedor/.test(t)) return 'plagas';
    if (/\bgas\b/.test(t) && /tuber|cocina|calentador|valvula/.test(t)) return 'gas';
    if (/tablero electric|puntos electric|breaker|cableado/.test(t)) return 'electricidad';
    if (/fuga de agua|plomer|grifo|\bpvc\b/.test(t)) return 'plomeria';
    if ((/reja|soldar|herrer/.test(t) || /metalmecan/.test(t)) && !mentionsDoor) return 'metalmecanica';
    if (mentionsDoor) return 'automatismos';
    return '';
  }

  function normalizeOficioId(id) {
    const raw = String(id == null ? '' : id).trim().toLowerCase();
    if (!raw) return '';
    if (ALIASES[raw]) return ALIASES[raw];
    if (PROFILES[raw]) return raw;
    if (global.ArpaOficios && typeof global.ArpaOficios.normalizeOficioId === 'function') {
      const mapped = global.ArpaOficios.normalizeOficioId(raw);
      if (mapped && PROFILES[mapped] && (mapped === raw || ALIASES[raw] === mapped)) {
        return mapped;
      }
      if (mapped && mapped !== 'automatismos' && PROFILES[mapped]) return mapped;
    }
    return raw;
  }

  function resolveOficioId(explicit) {
    if (explicit != null && String(explicit).trim() !== '') {
      const n = normalizeOficioId(explicit);
      if (n) return n;
    }
    if (global.ArpaMiCatalogo && typeof global.ArpaMiCatalogo.getActiveOficioId === 'function') {
      const active = normalizeOficioId(global.ArpaMiCatalogo.getActiveOficioId());
      if (active && (PROFILES[active] || active !== 'automatismos')) return active;
    }
    const settings = global.ArpaOficios && global.ArpaOficios.getActiveOficiosFromSettings
      ? global.ArpaOficios.getActiveOficiosFromSettings()
      : [];
    if (Array.isArray(settings) && settings.length) {
      const active = normalizeOficioId(settings[0]);
      if (active) return active;
    }
    return 'automatismos';
  }

  function getProfile(oficioId) {
    const id = normalizeOficioId(oficioId);
    if (PROFILES[id]) return PROFILES[id];
    if (!id) return PROFILES.automatismos;
    return genericStub(id);
  }

  function isKnownOficio(oficioId) {
    const id = normalizeOficioId(oficioId);
    return !!PROFILES[id];
  }

  function listProfiles() {
    return Object.keys(PROFILES).map((id) => PROFILES[id]);
  }

  function formatFieldValue(fieldDef, value) {
    if (value == null || value === '') return '—';
    if (Array.isArray(value)) {
      const labels = value.map((item) => {
        if (item && typeof item === 'object') return item.label || item.id || '';
        return String(item);
      }).filter(Boolean);
      return labels.length ? labels.join(', ') : '—';
    }
    if (fieldDef && fieldDef.unit === 'km') {
      const n = typeof value === 'number' ? value : Number(String(value).replace(/[.\s,]/g, ''));
      if (Number.isFinite(n)) return Math.round(n).toLocaleString('es-CO') + ' km';
    }
    if (fieldDef && fieldDef.unit) return String(value) + ' ' + fieldDef.unit;
    return String(value);
  }

  function readFieldValue(datos, fieldId) {
    if (!datos) return null;
    if (datos[fieldId] != null && datos[fieldId] !== '') return datos[fieldId];
    if (datos.especificos && datos.especificos[fieldId] != null) return datos.especificos[fieldId];
    return null;
  }

  function fieldIds(profile) {
    return (profile && Array.isArray(profile.fields) ? profile.fields : []).map((f) => f.id);
  }

  function toLlmOficioId(oficioId) {
    const id = normalizeOficioId(oficioId);
    if (!id || !PROFILES[id]) return '';
    return TO_LLM_OFICIO[id] || id;
  }

  global.ArpaIaPerfiles = {
    PROFILES,
    ALIASES,
    TO_LLM_OFICIO,
    inferOficioFromText,
    normalizeOficioId,
    resolveOficioId,
    getProfile,
    isKnownOficio,
    listProfiles,
    formatFieldValue,
    readFieldValue,
    fieldIds,
    toLlmOficioId,
    genericStub
  };
})(typeof window !== 'undefined' ? window : globalThis);
