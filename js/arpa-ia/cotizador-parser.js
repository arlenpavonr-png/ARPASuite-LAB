/**
 * Parser por perfil. No asume puertas, kg ni motores como universales.
 */
(function (global) {
  const CIUDADES = [
    'Medellín', 'Bogotá', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga',
    'Pereira', 'Manizales', 'Armenia', 'Ibagué', 'Santa Marta', 'Cúcuta',
    'Villavicencio', 'Pasto', 'Neiva', 'Montería', 'Valledupar', 'Popayán',
    'Envigado', 'Itagüí', 'Bello', 'Rionegro', 'Sabaneta'
  ];

  const MARCAS_LINEA_BLANCA = [
    'Haceb', 'Samsung', 'LG', 'Mabe', 'Whirlpool', 'Electrolux', 'Challenger',
    'Kalley', 'Bosch', 'GE', 'Panasonic', 'Sony'
  ];

  const MARCAS_MOTOS = [
    'Honda', 'Yamaha', 'Suzuki', 'AKT', 'Bajaj', 'TVS', 'KTM', 'BMW',
    'Hero', 'Kawasaki', 'Auteco', 'Victory'
  ];

  function normalizeText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function parseNum(raw) {
    const n = parseFloat(String(raw).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  function extractUso(text) {
    if (/industri/i.test(text)) return 'industrial';
    if (/comerci|condominio|conjunto|edificio/i.test(text)) return 'comercial';
    if (/residenc|casa|hogar|vivienda/i.test(text)) return 'residencial';
    return null;
  }

  function extractTipoTrabajo(text, profile) {
    if (/repar|arreglo|fuga|falla|diagn[oó]stico/i.test(text)) return 'reparacion';
    if (/mantenim/i.test(text)) return 'mantenimiento';
    if (/revisi[oó]n/i.test(text)) return 'mantenimiento';
    if (profile && profile.id === 'automatismos' && /automatiz/i.test(text)) return 'instalacion';
    if (/instal|fabricar|montar|poner/i.test(text)) return 'instalacion';
    return null;
  }

  function extractCiudad(text) {
    const lower = text.toLowerCase();
    for (let i = 0; i < CIUDADES.length; i += 1) {
      const city = CIUDADES[i];
      if (lower.includes(city.toLowerCase())) return city;
    }
    const en = text.match(/\ben\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/);
    return en ? en[1] : null;
  }

  function extractPesoKg(text) {
    const m = text.match(/(\d{2,5})\s*(?:kg|kilos?|kilogramos?)\b/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function extractMetros(text) {
    const m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:metros?|m\.?)\b/i);
    if (!m) return null;
    return parseNum(m[1]);
  }

  const PUERTAS = [
    { id: 'corrediza', re: /corrediz[ao]|deslizante|correr/i },
    { id: 'batiente', re: /batiente|abatible|swing/i },
    { id: 'seccional', re: /seccional/i },
    { id: 'levadiza', re: /levadiz[ao]|basculante/i },
    { id: 'enrollable', re: /cortina\s*enrollable|enrollable/i },
    { id: 'barrera', re: /barrera(?:\s+vehicular)?/i },
    { id: 'talanquera', re: /talanquera/i }
  ];

  function extractTipoPuerta(text) {
    for (let i = 0; i < PUERTAS.length; i += 1) {
      if (PUERTAS[i].re.test(text)) return PUERTAS[i].id;
    }
    return null;
  }

  function extractHojas(text) {
    if (/2\s*hojas|dos\s*hojas|doble\s*hoja/i.test(text)) return 2;
    if (/1\s*hoja|una\s*hoja|una\s*sola\s*hoja/i.test(text)) return 1;
    return null;
  }

  function extractCantidadMotores(text) {
    const m = text.match(/(\d+)\s*motores?\b/i);
    if (m) return parseInt(m[1], 10);
    if (/kit\s*2\s*brazos|dos\s*brazos/i.test(text)) return 2;
    return 1;
  }

  function extractMaterialesAutomatismos(text) {
    const found = [];
    const rules = [
      { id: 'cremallera', re: /cremallera/i, label: 'Cremallera' },
      { id: 'fotocelda', re: /fotocelda|fotoc[eé]lula|foto\s*celda/i, label: 'Fotocelda' },
      { id: 'control', re: /control(?:es)?(?:\s+remoto)?/i, label: 'Control remoto' },
      { id: 'bateria', re: /bater[ií]a/i, label: 'Batería de respaldo' },
      { id: 'lampara', re: /l[aá]mpara/i, label: 'Lámpara' },
      { id: 'riel', re: /\briel\b/i, label: 'Riel' },
      { id: 'fin_carrera', re: /fin(?:es)?\s+de\s+carrera/i, label: 'Fin de carrera' }
    ];
    rules.forEach((rule) => {
      if (rule.re.test(text)) found.push({ id: rule.id, label: rule.label });
    });
    return found;
  }

  function extractPuntos(text) {
    const m = text.match(/(\d+)\s*puntos?/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function extractMetrosCable(text) {
    const m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:metros?|m)\s+de\s+cable/i);
    return m ? parseNum(m[1]) : null;
  }

  function extractMetrosTuberia(text) {
    const m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:metros?|m)\s+de\s+tuber/i);
    return m ? parseNum(m[1]) : null;
  }

  function extractAmperaje(text) {
    const m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:a\b|amp(?:erios?)?)/i);
    return m ? parseNum(m[1]) : null;
  }

  function extractVoltaje(text) {
    const m = text.match(/(\d{2,3})\s*v(?:oltios?)?\b/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function extractBtu(text) {
    const m = text.match(/(\d+(?:[.,]\d+)?)\s*btu/i);
    return m ? parseNum(m[1]) : null;
  }

  function extractKw(text) {
    const m = text.match(/(\d+(?:[.,]\d+)?)\s*kw\b/i);
    return m ? parseNum(m[1]) : null;
  }

  function extractPaneles(text) {
    const m = text.match(/(\d+)\s*paneles?/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function extractCamaras(text) {
    const m = text.match(/(\d+)\s*c[aá]maras?/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function extractCanales(text) {
    const m = text.match(/(\d+)\s*canales?/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function extractAreaM2(text) {
    const m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²|metros?\s*cuadrados?)/i);
    return m ? parseNum(m[1]) : null;
  }

  function extractDimensiones(text) {
    const m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:x|por|×)\s*(\d+(?:[.,]\d+)?)\s*(?:metros?|m\b)?/i);
    if (!m) return null;
    const a = parseNum(m[1]);
    const b = parseNum(m[2]);
    if (a == null || b == null) return null;
    return a + ' x ' + b + ' m';
  }

  function extractMetrosCuadrados(text) {
    const direct = extractAreaM2(text);
    if (direct != null) return direct;
    const m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:x|por|×)\s*(\d+(?:[.,]\d+)?)/i);
    if (!m) return null;
    const a = parseNum(m[1]);
    const b = parseNum(m[2]);
    if (a == null || b == null) return null;
    return Math.round(a * b * 100) / 100;
  }

  function extractCantidad(text) {
    const m = text.match(/(\d+)\s*(?:unidades?|unds?)\b/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function parseEnteroConMiles(raw) {
    const s = String(raw || '').trim();
    if (!s) return null;
    const compact = /^\d{1,3}(?:[.\s,]\d{3})+$/.test(s)
      ? s.replace(/[.\s,]/g, '')
      : s.replace(/\s/g, '');
    const n = parseInt(compact, 10);
    return Number.isFinite(n) ? n : null;
  }

  function extractKilometraje(text) {
    const m = String(text || '').match(/(\d{1,3}(?:[.\s,]\d{3})+|\d+)\s*(?:km|kil[oó]metros?)\b/i);
    if (!m) return null;
    return parseEnteroConMiles(m[1]);
  }

  function extractCilindraje(text) {
    const cc = text.match(/(\d{2,4})\s*(?:cc|cm3)\b/i);
    if (cc) return parseInt(cc[1], 10);
    const branded = text.match(/(?:honda|yamaha|suzuki|akt|bajaj|tvs|ktm|hero|kawasaki)\s+(\d{2,3})\b/i);
    if (branded) return parseInt(branded[1], 10);
    const moto = text.match(/moto(?:\s+\w+)?\s+(\d{2,3})\b/i);
    if (moto) return parseInt(moto[1], 10);
    return null;
  }

  function extractMarca(text, list) {
    for (let i = 0; i < list.length; i += 1) {
      const re = new RegExp('\\b' + list[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (re.test(text)) return list[i];
    }
    return null;
  }

  function extractMaterial(text) {
    if (/\bacero\b/i.test(text)) return 'acero';
    if (/aluminio/i.test(text)) return 'aluminio';
    if (/\bcobre\b/i.test(text)) return 'cobre';
    if (/\bpvc\b/i.test(text)) return 'PVC';
    if (/galvaniz/i.test(text)) return 'galvanizado';
    return null;
  }

  function extractTipoInstalacion(text) {
    if (/residenc|casa|hogar/i.test(text)) return 'residencial';
    if (/comerci|industrial/i.test(text)) return 'comercial';
    if (/tablero/i.test(text)) return 'tablero';
    if (/interna/i.test(text)) return 'interna';
    if (/el[eé]ctric/i.test(text)) return 'eléctrica';
    return null;
  }

  function extractTipoServicio(text, profileId) {
    if (profileId === 'gas') {
      if (/cocina/i.test(text)) return 'cocina';
      if (/calentador/i.test(text)) return 'calentador';
      if (/fuga/i.test(text)) return 'fuga';
    }
    if (profileId === 'plagas') {
      if (/fumig/i.test(text)) return 'fumigacion';
      if (/control/i.test(text)) return 'control';
      if (/desrat/i.test(text)) return 'desratizacion';
    }
    if (profileId === 'plomeria') {
      if (/fuga/i.test(text)) return 'fuga';
      if (/destape/i.test(text)) return 'destape';
      if (/cambio|cambiar/i.test(text)) return 'cambio_tuberia';
    }
    if (profileId === 'taller_motos') {
      if (/revisi[oó]n/i.test(text)) return 'revision';
      if (/mantenim/i.test(text)) return 'mantenimiento';
      if (/repar/i.test(text)) return 'reparacion';
    }
    if (/instal/i.test(text)) return 'instalacion';
    if (/mantenim/i.test(text)) return 'mantenimiento';
    if (/repar/i.test(text)) return 'reparacion';
    return null;
  }

  function extractTipoGas(text) {
    if (/natural/i.test(text)) return 'natural';
    if (/propano|glp/i.test(text)) return 'propano';
    return null;
  }

  function extractDiametro(text) {
    const m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:pulgadas?|"|”)|di[aá]metro\s+(\d+(?:[.,]\d+)?)/i);
    if (!m) return null;
    return m[1] || m[2] || null;
  }

  function extractTipoEquipo(text, profileId) {
    if (profileId === 'refrigeracion') {
      if (/aire|split|acondicion/i.test(text)) return 'aire acondicionado';
      if (/nevera|congelador/i.test(text)) return 'nevera';
    }
    if (profileId === 'linea_blanca') {
      if (/lavadora/i.test(text)) return 'lavadora';
      if (/nevera|refrigerador/i.test(text)) return 'nevera';
      if (/estufa|horno/i.test(text)) return 'estufa';
      if (/secadora/i.test(text)) return 'secadora';
      if (/lavavajillas/i.test(text)) return 'lavavajillas';
    }
    return null;
  }

  function extractTipoPieza(text) {
    if (/reja/i.test(text)) return 'reja';
    if (/port[oó]n|puerta/i.test(text)) return 'puerta';
    if (/escalera/i.test(text)) return 'escalera';
    if (/baranda/i.test(text)) return 'baranda';
    if (/estructura/i.test(text)) return 'estructura';
    return null;
  }

  function extractTipoPlaga(text) {
    if (/cucarach/i.test(text)) return 'cucarachas';
    if (/rata|roedor/i.test(text)) return 'roedores';
    if (/hormiga/i.test(text)) return 'hormigas';
    if (/termite/i.test(text)) return 'termitas';
    if (/zancudo|mosquito/i.test(text)) return 'zancudos';
    return null;
  }

  function extractTipoSistema(text, profileId) {
    if (profileId === 'solar') {
      if (/off[\s-]?grid/i.test(text)) return 'off-grid';
      if (/on[\s-]?grid|interconect/i.test(text)) return 'on-grid';
      if (/solar/i.test(text)) return 'sistema solar';
    }
    if (profileId === 'cctv') {
      if (/\bip\b/i.test(text)) return 'IP';
      if (/an[aá]log/i.test(text)) return 'analogas';
      if (/alarma/i.test(text)) return 'alarma';
    }
    return null;
  }

  function extractFalla(text) {
    const queNo = text.match(/que\s+no\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i);
    if (queNo) return 'no ' + queNo[1].trim();
    const no = text.match(/\bno\s+(centrifuga|enfr[ií]a|prende|lava|seca|arranca)\b/i);
    if (no) return 'no ' + no[1].toLowerCase();
    return null;
  }

  function extractRefrigerante(text) {
    const m = text.match(/\b(r[\s-]?22|r[\s-]?410a|r[\s-]?32|r[\s-]?134a)\b/i);
    return m ? m[1].toUpperCase().replace(/\s+/g, '') : null;
  }

  function extractAcabado(text) {
    if (/pintad/i.test(text)) return 'pintado';
    if (/galvaniz/i.test(text)) return 'galvanizado';
    if (/electroest/i.test(text)) return 'electroestático';
    return null;
  }

  function extractInversor(text) {
    return /inversor/i.test(text) ? 'mencionado' : null;
  }

  function extractBaterias(text) {
    return /bater/i.test(text) ? 'mencionadas' : null;
  }

  function extractManoObra(text) {
    return /mano\s+de\s+obra/i.test(text) ? 'mencionada' : null;
  }

  function extractRepuestos(text) {
    if (/repuesto/i.test(text)) return [{ id: 'repuesto', label: 'Repuesto' }];
    return [];
  }

  const EXTRACTORS = {
    tipo_de_trabajo: function (text, ctx) { return extractTipoTrabajo(text, ctx.profile); },
    uso: function (text) { return extractUso(text); },
    ciudad: function (text) { return extractCiudad(text); },
    tipo_de_puerta: function (text) { return extractTipoPuerta(text); },
    peso_estimado: function (text) { return extractPesoKg(text); },
    peso_kg: function (text) { return extractPesoKg(text); },
    ancho_m: function () { return null; },
    recorrido_m: function () { return null; },
    puntos: function (text) { return extractPuntos(text); },
    metros_cable: function (text) { return extractMetrosCable(text); },
    metros_tuberia: function (text) { return extractMetrosTuberia(text); },
    amperaje: function (text) { return extractAmperaje(text); },
    voltaje: function (text) { return extractVoltaje(text); },
    material: function (text) { return extractMaterial(text); },
    tipo_instalacion: function (text) { return extractTipoInstalacion(text); },
    tipo_servicio: function (text, ctx) { return extractTipoServicio(text, ctx.profile.id); },
    tipo_gas: function (text) { return extractTipoGas(text); },
    diametro_tuberia: function (text) { return extractDiametro(text); },
    diametro: function (text) { return extractDiametro(text); },
    tipo_equipo: function (text, ctx) { return extractTipoEquipo(text, ctx.profile.id); },
    btu: function (text) { return extractBtu(text); },
    refrigerante: function (text) { return extractRefrigerante(text); },
    tipo_pieza: function (text) { return extractTipoPieza(text); },
    dimensiones: function (text) { return extractDimensiones(text); },
    metros_cuadrados: function (text) { return extractMetrosCuadrados(text); },
    cantidad: function (text) { return extractCantidad(text); },
    acabado: function (text) { return extractAcabado(text); },
    tipo_plaga: function (text) { return extractTipoPlaga(text); },
    area_m2: function (text) { return extractAreaM2(text); },
    nivel_infestacion: function () { return null; },
    frecuencia: function () { return null; },
    marca: function (text, ctx) {
      if (ctx.profile.id === 'taller_motos') return extractMarca(text, MARCAS_MOTOS);
      return extractMarca(text, MARCAS_LINEA_BLANCA);
    },
    modelo: function () { return null; },
    falla: function (text) { return extractFalla(text); },
    diagnostico: function () { return null; },
    repuestos_mencionados: function (text) { return extractRepuestos(text); },
    tipo_sistema: function (text, ctx) { return extractTipoSistema(text, ctx.profile.id); },
    potencia_kw: function (text) { return extractKw(text); },
    paneles: function (text) { return extractPaneles(text); },
    inversor: function (text) { return extractInversor(text); },
    baterias: function (text) { return extractBaterias(text); },
    consumo: function () { return null; },
    camaras: function (text) { return extractCamaras(text); },
    canales: function (text) { return extractCanales(text); },
    resolucion: function () { return null; },
    almacenamiento: function () { return null; },
    cilindraje: function (text) { return extractCilindraje(text); },
    kilometraje: function (text) { return extractKilometraje(text); },
    mano_de_obra: function (text) { return extractManoObra(text); },
    observaciones: function () { return null; },
    materiales_mencionados: function () { return []; }
  };

  function applyAutomatismos(text, datos) {
    const metros = extractMetros(text);
    const tipoPuerta = extractTipoPuerta(text);
    datos.tipo_de_puerta = tipoPuerta;
    datos.peso_estimado = extractPesoKg(text);
    datos.ancho_m = tipoPuerta === 'batiente' ? metros : null;
    datos.recorrido_m = tipoPuerta === 'corrediza' ? metros : (tipoPuerta === 'batiente' ? null : metros);
    datos.hojas = extractHojas(text);
    datos.cantidad_motores = extractCantidadMotores(text);
    datos.materiales_mencionados = extractMaterialesAutomatismos(text);
    if (!datos.tipo_de_trabajo) {
      if (/puerta|motor para/i.test(text) && tipoPuerta && !/mantenim|repar/i.test(text) && !/^motor para/i.test(text.trim())) {
        datos.tipo_de_trabajo = 'instalacion';
      }
    }
    return datos;
  }

  function extractByProfile(text, profile) {
    const datos = { especificos: {} };
    const fields = profile && Array.isArray(profile.fields) ? profile.fields : [];
    const ctx = { profile: profile };
    fields.forEach((field) => {
      const fn = EXTRACTORS[field.id];
      const value = fn ? fn(text, ctx) : null;
      datos[field.id] = value == null ? null : value;
    });
    return datos;
  }

  function datosFaltantes(datos, profile) {
    const missing = [];
    const req = profile && Array.isArray(profile.requiredForQuote) ? profile.requiredForQuote : [];
    req.forEach((key) => {
      const val = datos[key] != null ? datos[key] : (datos.especificos && datos.especificos[key]);
      if (val == null || val === '' || (Array.isArray(val) && !val.length)) missing.push(key);
    });
    if (profile && profile.id === 'automatismos') {
      if (datos.tipo_de_puerta === 'corrediza' && datos.recorrido_m == null) missing.push('recorrido_m');
      if (datos.tipo_de_puerta === 'batiente' && datos.ancho_m == null && datos.recorrido_m == null) {
        missing.push('ancho_m');
      }
    }
    return missing;
  }

  function parseSolicitud(solicitud, oficioId) {
    const original = normalizeText(solicitud);
    const perfiles = global.ArpaIaPerfiles;
    const oid = perfiles ? perfiles.resolveOficioId(oficioId) : (oficioId || 'automatismos');
    const profile = perfiles ? perfiles.getProfile(oid) : { id: 'automatismos', match: 'automatismos', fields: [] };
    let datos;
    if (profile.id === 'automatismos' || profile.match === 'automatismos') {
      datos = {
        tipo_de_trabajo: extractTipoTrabajo(original, profile),
        uso: extractUso(original),
        ciudad: extractCiudad(original),
        materiales_mencionados: [],
        especificos: {}
      };
      applyAutomatismos(original, datos);
    } else {
      datos = extractByProfile(original, profile);
    }
    datos.oficio_id = oid;
    return {
      solicitud_original: original,
      oficio_id: oid,
      perfil_id: profile.id,
      datos_extraidos: datos,
      datos_faltantes: datosFaltantes(datos, profile)
    };
  }

  global.ArpaIaCotizadorParser = {
    parseSolicitud,
    datosFaltantes,
    CIUDADES
  };
})(typeof window !== 'undefined' ? window : globalThis);
