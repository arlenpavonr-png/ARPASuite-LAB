/**
 * Contrato del LLM de extracción (fase 2).
 * El modelo SOLO extrae datos del texto. No elige productos ni precios.
 */
(function (global) {
  const TIPOS_TRABAJO = ['instalacion', 'reparacion', 'mantenimiento'];
  const TIPOS_PUERTA = ['corrediza', 'batiente', 'levadiza', 'seccional', 'enrollable', 'cortina', 'barrera', 'talanquera'];
  const USOS = ['residencial', 'comercial', 'industrial'];

  function emptyResult() {
    return {
      oficio: null,
      tipo_de_trabajo: null,
      tipo_de_puerta: null,
      uso: null,
      peso_kg: null,
      ancho_m: null,
      ciudad: null,
      materiales_mencionados: [],
      observaciones: [],
      datos_faltantes: []
    };
  }

  function asNullString(value) {
    if (value == null) return null;
    const s = String(value).trim();
    if (!s || s.toLowerCase() === 'null' || s === '-' || s === 'n/a') return null;
    return s;
  }

  function asNumber(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const n = parseFloat(String(value).replace(',', '.').replace(/[^\d.+-]/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  function asStringList(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => asNullString(item))
      .filter(Boolean);
  }

  function normalizeMateriales(value) {
    if (!Array.isArray(value)) return [];
    return value.map((item) => {
      if (item && typeof item === 'object') {
        const label = asNullString(item.label || item.nombre || item.id);
        const id = asNullString(item.id) || (label ? label.toLowerCase().replace(/\s+/g, '_') : null);
        if (!label) return null;
        return { id: id, label: label };
      }
      const label = asNullString(item);
      if (!label) return null;
      return { id: label.toLowerCase().replace(/\s+/g, '_'), label: label };
    }).filter(Boolean);
  }

  function pickEnum(value, allowed) {
    const s = asNullString(value);
    if (!s) return null;
    const norm = s.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '');
    for (let i = 0; i < allowed.length; i += 1) {
      if (norm === allowed[i] || norm.indexOf(allowed[i]) === 0) return allowed[i];
    }
    if (/corrediz|desliz/.test(norm)) return 'corrediza';
    if (/batient|abatib|swing/.test(norm)) return 'batiente';
    if (/seccional/.test(norm)) return 'seccional';
    if (/levadiz|bascul/.test(norm)) return 'levadiza';
    if (/enroll/.test(norm)) return 'enrollable';
    if (/talanquera|barrera/.test(norm)) return /talanquera/.test(norm) ? 'talanquera' : 'barrera';
    if (/residenc|casa|hogar/.test(norm)) return 'residencial';
    if (/comerci/.test(norm)) return 'comercial';
    if (/industri/.test(norm)) return 'industrial';
    if (/repar|arreglo/.test(norm)) return 'reparacion';
    if (/manten/.test(norm)) return 'mantenimiento';
    if (/instal|automat/.test(norm)) return 'instalacion';
    return null;
  }

  function stripCodeFences(text) {
    const raw = String(text || '').trim();
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    return (fenced ? fenced[1] : raw).trim();
  }

  function parseJsonLoose(payload) {
    if (payload && typeof payload === 'object') return payload;
    if (typeof payload !== 'string') return null;
    const text = stripCodeFences(payload);
    try {
      return JSON.parse(text);
    } catch (err) {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start >= 0 && end > start) {
        try { return JSON.parse(text.slice(start, end + 1)); } catch (err2) { return null; }
      }
      return null;
    }
  }

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Acepta el JSON estricto del LLM o un envoltorio { extraido|datos }.
   * Ignora productos, precios y cualquier campo de catálogo.
   */
  function normalizeLlmExtract(payload) {
    const parsed = parseJsonLoose(payload);
    if (!isPlainObject(parsed)) {
      return { ok: false, error: { codigo: 'json_invalido', mensaje: 'El LLM no devolvió JSON válido.' } };
    }
    if (parsed.ok === false) {
      const err = parsed.error && typeof parsed.error === 'object'
        ? parsed.error
        : { codigo: 'backend_error', mensaje: 'El backend LLM DEV reportó error.' };
      return { ok: false, error: { codigo: String(err.codigo || 'backend_error'), mensaje: String(err.mensaje || 'Error del backend LLM DEV.') } };
    }

    let src = parsed;
    if (Object.prototype.hasOwnProperty.call(parsed, 'extraido')) {
      if (!isPlainObject(parsed.extraido)) {
        return { ok: false, error: { codigo: 'json_invalido', mensaje: 'El LLM no devolvió JSON válido.' } };
      }
      src = parsed.extraido;
    } else if (Object.prototype.hasOwnProperty.call(parsed, 'datos')) {
      if (!isPlainObject(parsed.datos)) {
        return { ok: false, error: { codigo: 'json_invalido', mensaje: 'El LLM no devolvió JSON válido.' } };
      }
      src = parsed.datos;
    }

    const nested = isPlainObject(src.datos) ? src.datos : {};
    const extract = emptyResult();
    extract.oficio = asNullString(src.oficio);
    extract.tipo_de_trabajo = pickEnum(src.tipo_de_trabajo, TIPOS_TRABAJO);
    extract.tipo_de_puerta = pickEnum(src.tipo_de_puerta != null ? src.tipo_de_puerta : nested.tipo_de_puerta, TIPOS_PUERTA);
    extract.uso = pickEnum(src.uso != null ? src.uso : nested.uso, USOS);
    extract.peso_kg = asNumber(
      src.peso_kg != null ? src.peso_kg : (nested.peso_kg != null ? nested.peso_kg : src.peso_estimado)
    );
    extract.ancho_m = asNumber(
      src.ancho_m != null ? src.ancho_m : (nested.ancho_m != null ? nested.ancho_m : src.recorrido_m)
    );
    extract.ciudad = asNullString(src.ciudad != null ? src.ciudad : nested.ciudad);
    extract.materiales_mencionados = normalizeMateriales(src.materiales_mencionados);
    extract.observaciones = asStringList(src.observaciones);
    extract.datos_faltantes = asStringList(src.datos_faltantes);
    extract.extras = {};
    const reserved = {
      ok: 1, extraido: 1, datos: 1, productos: 1, productos_inventados: 1,
      catalogo: 1, precios: 1, pvp: 1, codigo: 1, error: 1, oficio: 1
    };
    function takeExtra(key, value) {
      if (Object.prototype.hasOwnProperty.call(extract, key) && key !== 'extras') return;
      if (reserved[key]) return;
      if (/producto|precio|pvp|catalogo|codigo/i.test(key)) return;
      extract.extras[key] = value;
    }
    Object.keys(src).forEach((key) => takeExtra(key, src[key]));
    Object.keys(nested).forEach((key) => takeExtra(key, nested[key]));
    if (nested.capacidad_btu != null && extract.extras.btu == null) {
      extract.extras.btu = nested.capacidad_btu;
    }

    return { ok: true, extraido: extract };
  }

  function toDatosExtraidos(extraido, profile) {
    const schema = profile && profile.llmSchema ? profile.llmSchema : 'automatismos';
    const base = {
      tipo_de_trabajo: extraido && extraido.tipo_de_trabajo ? extraido.tipo_de_trabajo : null,
      uso: extraido && extraido.uso ? extraido.uso : null,
      ciudad: extraido && extraido.ciudad ? extraido.ciudad : null,
      materiales_mencionados: extraido && extraido.materiales_mencionados ? extraido.materiales_mencionados : [],
      especificos: {}
    };
    if (schema !== 'automatismos') {
      const extras = extraido && extraido.extras && typeof extraido.extras === 'object' ? extraido.extras : {};
      const allowed = {};
      if (profile && Array.isArray(profile.fields)) {
        profile.fields.forEach((f) => { allowed[f.id] = true; });
      }
      Object.keys(extras).forEach((key) => {
        if (!allowed[key] && key !== 'tipo_de_trabajo' && key !== 'uso' && key !== 'ciudad') return;
        if (base[key] !== undefined && base[key] != null) return;
        if (allowed[key]) base[key] = extras[key];
        else base.especificos[key] = extras[key];
      });
      return base;
    }
    const tipo = extraido && extraido.tipo_de_puerta ? extraido.tipo_de_puerta : null;
    const metros = extraido ? extraido.ancho_m : null;
    base.tipo_de_puerta = tipo;
    base.peso_estimado = extraido && extraido.peso_kg != null ? extraido.peso_kg : null;
    base.ancho_m = tipo === 'batiente' ? metros : null;
    base.recorrido_m = tipo === 'corrediza' ? metros : (tipo === 'batiente' ? null : metros);
    base.hojas = null;
    base.cantidad_motores = 1;
    return base;
  }

  global.ArpaIaCotizadorLlm = {
    emptyResult,
    normalizeLlmExtract,
    toDatosExtraidos
  };
})(typeof window !== 'undefined' ? window : globalThis);
