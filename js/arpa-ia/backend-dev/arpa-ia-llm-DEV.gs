/**
 * ARPA IA — backend LLM DEV (multi-oficio)
 * Proyecto Apps Script: "ARPA IA — DEV"
 *
 * SOLO LABORATORIO.
 * NO copiar sobre el Apps Script de licencias, cloud o cotizaciones.
 * NO pegar la API key en este archivo. Va en Script Properties:
 *   ARPA_IA_LLM_KEY
 *   ARPA_IA_LLM_PROVIDER
 *   ARPA_IA_LLM_MODEL
 * NO guarda textos. NO usa Sheets ni datos de producción.
 *
 * POST: { "oficio": "<oficio>", "text": "<texto>", "modo": "cotizador"|"tecnica"|"informe" }
 * Content-Type: text/plain (JSON en el cuerpo) para evitar preflight CORS.
 * modo=tecnica → diagnóstico técnico { ok:true, diagnostico }.
 * modo=informe → informe de OT { ok:true, informe }. Payload: { modo, oficio, ot }.
 * modo=cotizador o sin modo → extracción para cotizar { ok:true, extraido }.
 * store: false. No guarda conversaciones ni textos.
 */

var OFICIOS_OFICIALES = [
  'electricidad',
  'gas',
  'refrigeracion',
  'metalmecanica',
  'control_de_plagas',
  'linea_blanca',
  'energia_solar',
  'plomeria',
  'cctv_seguridad',
  'automatizacion',
  'taller_motos'
];

var OFICIO_ALIASES = {
  automatismos: 'automatizacion',
  plagas: 'control_de_plagas',
  solar: 'energia_solar',
  cctv: 'cctv_seguridad'
};

var OFICIO_LABELS = {
  electricidad: 'Electricidad',
  gas: 'Gas',
  refrigeracion: 'Refrigeración y Aire Acondicionado',
  metalmecanica: 'Metalmecánica',
  control_de_plagas: 'Control de Plagas',
  linea_blanca: 'Línea Blanca',
  energia_solar: 'Energía Solar',
  plomeria: 'Plomería',
  cctv_seguridad: 'CCTV / Seguridad Electrónica',
  automatizacion: 'Automatización de Puertas',
  taller_motos: 'Taller de Motos'
};

var DATOS_SCHEMA = {
  electricidad: {
    puntos: null,
    metros_cable: null,
    tipo_instalacion: '',
    amperaje: null,
    voltaje: null
  },
  gas: {
    tipo_servicio: '',
    tipo_gas: '',
    metros_tuberia: null,
    diametro_tuberia: null,
    puntos: null
  },
  refrigeracion: {
    tipo_equipo: '',
    capacidad_btu: null,
    refrigerante: '',
    metros_tuberia: null,
    servicio: ''
  },
  metalmecanica: {
    tipo_pieza: '',
    material: '',
    dimensiones: '',
    metros_cuadrados: null,
    cantidad: null,
    acabado: ''
  },
  control_de_plagas: {
    tipo_plaga: '',
    area_m2: null,
    tipo_servicio: '',
    nivel_infestacion: '',
    frecuencia: ''
  },
  linea_blanca: {
    tipo_equipo: '',
    marca: '',
    modelo: '',
    falla: '',
    diagnostico: '',
    repuestos_mencionados: []
  },
  energia_solar: {
    tipo_sistema: '',
    potencia_kw: null,
    paneles: null,
    inversor: '',
    baterias: '',
    consumo: ''
  },
  plomeria: {
    tipo_servicio: '',
    tipo_instalacion: '',
    puntos: null,
    metros_tuberia: null,
    diametro: '',
    material: ''
  },
  cctv_seguridad: {
    tipo_sistema: '',
    camaras: null,
    canales: null,
    resolucion: '',
    metros_cable: null,
    almacenamiento: ''
  },
  automatizacion: {
    tipo_de_puerta: '',
    uso: '',
    peso_kg: null,
    ancho_m: null,
    ciudad: ''
  },
  taller_motos: {
    tipo_servicio: '',
    marca: '',
    modelo: '',
    cilindraje: null,
    kilometraje: null,
    falla: '',
    repuestos_mencionados: []
  }
};

function doGet() {
  return jsonResponse_({
    ok: true,
    service: 'ARPA IA DEV',
    modos: ['cotizador', 'tecnica', 'informe']
  });
}

/**
 * Recibe JSON por POST.
 * Cuerpo esperado: { "oficio": "electricidad", "text": "..." }
 *
 * CORS / LAB: Apps Script ContentService no permite cabeceras CORS arbitrarias.
 * El cliente LAB debe enviar Content-Type text/plain (petición simple, sin preflight).
 */
function doPost(e) {
  try {
    var body = parsePostBody_(e);
    var modo = resolveModo_(body, e);

    if (esModoInforme_(modo)) {
      var ot = resolveOt_(body);
      var oficioInf = normalizeOficio_((body && body.oficio) || (ot && ot.oficio));
      if (!oficioInf) {
        return jsonResponse_({
          ok: false,
          error: {
            codigo: 'oficio_invalido',
            mensaje: 'Falta un oficio válido para el informe.'
          }
        });
      }
      var informe = callConfiguredLlm_('', oficioInf, 'informe', ot);
      return jsonResponse_({
        ok: true,
        modo: 'informe',
        informe: informe
      });
    }

    var text = String(body && body.text != null ? body.text : '').trim();
    if (!text) {
      return jsonResponse_({ ok: false, error: 'Falta el campo text.' });
    }

    var oficio = normalizeOficio_(body && body.oficio);
    if (!oficio) {
      return jsonResponse_({
        ok: false,
        error: {
          codigo: 'oficio_invalido',
          mensaje: 'Falta un oficio válido. Oficio recibido: ' + String(body && body.oficio != null ? body.oficio : '')
        }
      });
    }

    if (esModoTecnica_(modo)) {
      var diagnostico = callConfiguredLlm_(text, oficio, 'tecnica');
      return jsonResponse_({
        ok: true,
        modo: 'tecnica',
        diagnostico: diagnostico
      });
    }

    var extraido = callConfiguredLlm_(text, oficio);
    return jsonResponse_({
      ok: true,
      modo: 'cotizador',
      extraido: extraido
    });
  } catch (err) {
    return jsonResponse_({
      ok: false,
      error: sanitizeError_(err && err.message ? err.message : 'Error en el backend DEV.')
    });
  }
}

function resolveModo_(body, e) {
  var fromBody = body && (body.modo != null ? body.modo : body.mode);
  var params = e && e.parameter ? e.parameter : {};
  var fromQuery = params.modo != null ? params.modo : params.mode;
  var raw = fromBody != null && String(fromBody).trim() !== '' ? fromBody : fromQuery;
  return String(raw == null ? '' : raw).trim().toLowerCase();
}

function esModoTecnica_(modo) {
  return modo === 'tecnica' || modo === 'diagnostico' || modo === 'diagnostico_tecnico';
}

function esModoInforme_(modo) {
  return modo === 'informe' || modo === 'informes';
}

function resolveOt_(body) {
  if (body && body.ot && typeof body.ot === 'object' && !Array.isArray(body.ot)) return body.ot;
  if (body && body.orden && typeof body.orden === 'object' && !Array.isArray(body.orden)) return body.orden;
  var text = String(body && body.text != null ? body.text : '').trim();
  if (!text) return {};
  try {
    var parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if (parsed.ot && typeof parsed.ot === 'object') return parsed.ot;
      return parsed;
    }
  } catch (err) {}
  return {};
}

function parsePostBody_(e) {
  var raw = '';
  if (e && e.postData) {
    if (e.postData.contents) raw = String(e.postData.contents);
    else if (typeof e.postData.getDataAsString === 'function') {
      try { raw = String(e.postData.getDataAsString()); } catch (err2) { raw = ''; }
    }
  }
  raw = String(raw || '').trim();
  if (!raw && e && e.parameter && e.parameter.payload) {
    raw = String(e.parameter.payload);
  }
  if (!raw) return {};
  try {
    var parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (err) {
    throw new Error('El POST no es JSON válido.');
  }
}

function normalizeOficio_(raw) {
  var v = String(raw == null ? '' : raw).trim().toLowerCase();
  if (!v) return '';
  if (OFICIO_ALIASES[v]) v = OFICIO_ALIASES[v];
  for (var i = 0; i < OFICIOS_OFICIALES.length; i++) {
    if (OFICIOS_OFICIALES[i] === v) return v;
  }
  return '';
}

function getProp_(name) {
  return String(PropertiesService.getScriptProperties().getProperty(name) || '').trim();
}

function buildSystemPrompt_(oficio) {
  var schema = DATOS_SCHEMA[oficio];
  var label = OFICIO_LABELS[oficio] || oficio;
  var schemaJson = JSON.stringify({
    oficio: oficio,
    tipo_de_trabajo: '',
    datos: schema,
    materiales_mencionados: [],
    observaciones: [],
    datos_faltantes: []
  }, null, 2);

  var lines = [
    'Eres un extractor de datos para cotizaciones del oficio: ' + label + ' (' + oficio + ').',
    'El oficio ya lo definió ARPASuite. NO adivines el oficio. NO lo cambies. Copia exactamente "' + oficio + '" en el campo oficio.',
    'Lee SOLO el texto del técnico. Extrae únicamente información explícitamente presente.',
    'No inventes productos, marcas, modelos, códigos, precios, cantidades, medidas, diagnósticos ni materiales.',
    'No elijas productos del catálogo. No cotices. No completes huecos con supuestos.',
    'Responde únicamente con un objeto JSON válido. No agregues Markdown, explicaciones ni texto fuera del JSON.',
    'La respuesta debe ser únicamente este json válido, sin markdown y sin texto extra:',
    schemaJson,
    'Normaliza tipo_de_trabajo siempre en minúscula. Valores permitidos: "instalación", "mantenimiento", "reparación" o "".',
    'No uses "Automatización" ni el nombre del oficio como tipo_de_trabajo.',
    'Usa "instalación" solo si el texto describe instalar, montar, fabricar o poner algo nuevo.',
    'Usa "mantenimiento" solo si el texto habla de mantenimiento o revisión preventiva.',
    'Usa "reparación" solo si el texto habla de reparación, arreglo o falla a corregir.',
    'Si el texto solo pide un producto, sin describir el trabajo, tipo_de_trabajo debe ser "".',
    'datos: llena únicamente las claves del esquema de este oficio. No agregues claves de otros oficios.',
    'Números (puntos, metros, BTU, kg, kW, m2, cilindraje, kilometraje, cámaras, canales, cantidad, amperaje, voltaje): número o null. No inventes.',
    'Textos: string o "". Listas: array. Si un dato no aparece, usa null, "" o [] según el campo.',
    'materiales_mencionados: solo materiales o accesorios citados de forma explícita. No inventes.',
    'observaciones: solo notas que estén en el texto. Si no hay, [].',
    'datos_faltantes: lista los campos del esquema de ESTE oficio que harían falta para cotizar y no estén en el texto. No pongas campos de otro oficio. No inventes productos ahí.'
  ];

  if (oficio === 'automatizacion') {
    lines.push(
      'Reglas específicas de Automatización de Puertas (conservar el comportamiento actual):',
      'Usa "instalación" cuando el texto describe claramente automatizar o instalar una puerta (incluye "automatizar" y una descripción de puerta nueva a automatizar).',
      'Cuando el texto describa una puerta con características para solicitar su automatización o cotización (tipo de puerta, uso, peso, medidas o ciudad), y no indique mantenimiento, reparación o solamente compra de un motor, tipo_de_trabajo = "instalación". Ejemplo: "Puerta corrediza residencial de 500 kg, 5 metros, Medellín." → tipo_de_trabajo = "instalación".',
      'Si el texto solo pide un motor o un producto, tipo_de_trabajo debe ser "". Ejemplo: "Motor para puerta corrediza de 1200 kg." → tipo_de_trabajo = "".',
      'Normaliza tipo_de_puerta en minúscula. Preferidos: "corrediza", "batiente", "levadiza", "enrollable", "seccional", "talanquera". Si no aparece, "".',
      'Normaliza uso en minúscula: "residencial", "comercial", "industrial" o "".',
      'peso_kg y ancho_m deben ser número o null. No inventes esos números. Si el técnico indica metros de recorrido en puerta corrediza, pon ese número en ancho_m.',
      'ciudad: copia la ciudad si aparece; no inventes ciudad.',
      'No incluyas "motor" en materiales_mencionados solo por pedir un motor. No inventes accesorios (cremallera, fotocelda, etc.).'
    );
  }

  return lines.join('\n');
}

function buildTecnicaPrompt_(oficio) {
  var label = OFICIO_LABELS[oficio] || oficio;
  var schemaJson = JSON.stringify({
    oficio: oficio,
    sintomas: [],
    hechos: [{ label: '', valor: '' }],
    hipotesis: [{ texto: '', prioridad: 1 }],
    datos_faltantes: [],
    preguntas: [],
    pruebas: [],
    procedimiento: [],
    urgencia: { nivel: 'indeterminada', motivo: '' },
    advertencias_seguridad: [],
    informacion_insuficiente: true,
    causa_confirmada: false,
    mensaje: ''
  }, null, 2);

  return [
    'Eres un asistente de diagnóstico técnico de campo para el oficio: ' + label + ' (' + oficio + ').',
    'El oficio ya lo fijó ARPASuite. NO adivines el oficio. NO lo cambies. Copia exactamente "' + oficio + '" en oficio.',
    'El texto puede incluir datos de la Orden de Trabajo (tipo de servicio, ciudad, marca, medidas). Úsalos solo si están explícitos.',
    'Lee SOLO el texto. Extrae únicamente información explícitamente presente. No inventes medidas, marcas, modelos ni lecturas.',
    'Separa hechos, hipótesis y datos faltantes. Nunca afirmes una causa como diagnóstico confirmado. causa_confirmada siempre es false.',
    'Nunca recomiendes puentear, anular, quitar o desactivar fotoceldas, sensores, tierra u otros dispositivos de seguridad.',
    'Si la información es insuficiente, informacion_insuficiente=true, hipotesis=[], y formula preguntas concretas al técnico.',
    'prioridad de hipótesis: 1 más probable según el texto, 3 menos probable.',
    'urgencia.nivel: critica | alta | media | baja | indeterminada.',
    'Responde únicamente con un objeto JSON válido. Sin markdown ni texto fuera del JSON.',
    'La respuesta debe ser únicamente este json válido:',
    schemaJson
  ].join('\n');
}

function buildInformePrompt_(oficio) {
  var label = OFICIO_LABELS[oficio] || oficio;
  var schemaJson = JSON.stringify({
    titulo: '',
    numero_ot: '',
    fecha: '',
    cliente: '',
    ubicacion: '',
    tecnico: '',
    oficio: oficio,
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
    advertencias: []
  }, null, 2);

  return [
    'Eres un redactor de informes técnicos de campo para ARPASuite.',
    'Oficio fijado por ARPASuite: ' + label + ' (' + oficio + '). NO lo cambies. NO infieras otro oficio. Copia exactamente "' + oficio + '" o su etiqueta oficial en oficio.',
    'Genera EXCLUSIVAMENTE el JSON de informe definido abajo. Sin markdown, sin prosa fuera del JSON, sin cotización.',
    'Trabaja SOLO con los hechos JSON de la Orden de Trabajo. NO inventes información.',
    'NO inventes marcas. NO inventes modelos. NO inventes materiales. NO inventes mediciones.',
    'NO inventes reparaciones. NO inventes resultados. NO inventes precios. NO inventes nombres, fechas ni números de OT.',
    'Si un campo no viene en la OT, déjalo vacío ("") o []. Nunca completes huecos con supuestos o catálogo.',
    'Respeta el oficio enviado y el tipo de servicio enviado. No los cambies.',
    'Diferencia hechos registrados de hipótesis. Una causa de IA Técnica no confirmada DEBE permanecer como hipótesis.',
    'Nunca conviertas una hipótesis o "posible causa" en diagnóstico confirmado.',
    'Si causa_confirmada es false o no hay diagnóstico confirmado por el técnico, diagnostico debe decir que no hay diagnóstico confirmado y listar las hipótesis como tales.',
    'Mantén las advertencias de seguridad presentes en la OT. Nunca recomiendes puentear, anular o desactivar fotoceldas u otros dispositivos de seguridad.',
    'Redacta en español profesional, específico de ESTA OT. No uses tono genérico de chatbot.',
    'Responde únicamente con este JSON:',
    schemaJson
  ].join('\n');
}

function callConfiguredLlm_(text, oficio, modo, ot) {
  var provider = getProp_('ARPA_IA_LLM_PROVIDER').toLowerCase();
  var model = getProp_('ARPA_IA_LLM_MODEL');
  var key = getProp_('ARPA_IA_LLM_KEY');

  if (!key) {
    throw new Error('Falta la propiedad ARPA_IA_LLM_KEY.');
  }
  if (!provider) {
    throw new Error('Falta la propiedad ARPA_IA_LLM_PROVIDER.');
  }
  if (!model) {
    throw new Error('Falta la propiedad ARPA_IA_LLM_MODEL.');
  }
  if (provider !== 'openai') {
    throw new Error('Provider no soportado en este backend DEV: ' + provider);
  }
  if (modo === 'tecnica') {
    return callOpenAiTecnica_(text, oficio, key, model);
  }
  if (modo === 'informe') {
    return callOpenAiInforme_(ot || {}, oficio, key, model);
  }
  return callOpenAiResponses_(text, oficio, key, model);
}

function callOpenAiResponses_(text, oficio, key, model) {
  var res = UrlFetchApp.fetch('https://api.openai.com/v1/responses', {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: {
      Authorization: 'Bearer ' + key
    },
    payload: JSON.stringify({
      model: model,
      instructions: buildSystemPrompt_(oficio),
      input: String(text || '') + '\n\nOficio: ' + oficio + '\nDevuelve la extracción en formato JSON válido.',
      store: false,
      text: {
        format: { type: 'json_object' }
      }
    })
  });

  var http = res.getResponseCode();
  var raw = res.getContentText() || '';
  var payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch (err) {
    throw new Error('OpenAI no devolvió JSON. HTTP ' + http);
  }

  if (payload && payload.error) {
    throw new Error(openaiErrorMessage_(payload.error, http));
  }
  if (http < 200 || http >= 300) {
    throw new Error('OpenAI HTTP ' + http);
  }

  var modelText = extractOutputText_(payload);
  return parseAndValidateExtract_(modelText, oficio);
}

function callOpenAiTecnica_(text, oficio, key, model) {
  var res = UrlFetchApp.fetch('https://api.openai.com/v1/responses', {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: {
      Authorization: 'Bearer ' + key
    },
    payload: JSON.stringify({
      model: model,
      instructions: buildTecnicaPrompt_(oficio),
      input: String(text || '') + '\n\nOficio fijado: ' + oficio + '\nDevuelve el diagnóstico técnico en JSON válido. No confirmes causas. No puentear seguridad.',
      store: false,
      text: {
        format: { type: 'json_object' }
      }
    })
  });

  var http = res.getResponseCode();
  var raw = res.getContentText() || '';
  var payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch (err) {
    throw new Error('OpenAI no devolvió JSON. HTTP ' + http);
  }

  if (payload && payload.error) {
    throw new Error(openaiErrorMessage_(payload.error, http));
  }
  if (http < 200 || http >= 300) {
    throw new Error('OpenAI HTTP ' + http);
  }

  var modelText = extractOutputText_(payload);
  return parseAndValidateDiagnostico_(modelText, oficio);
}

function compactOtFacts_(ot, oficio) {
  var src = ot && typeof ot === 'object' ? ot : {};
  return {
    numero_ot: asStr_(src.numero_ot),
    fecha: asStr_(src.fecha),
    cliente: asStr_(src.cliente),
    ubicacion: asStr_(src.ubicacion),
    tecnico: asStr_(src.tecnico),
    oficio: oficio,
    tipo_servicio: asStr_(src.tipo_servicio || src.tipo),
    equipo: asStr_(src.equipo),
    marca: asStr_(src.marca),
    modelo: asStr_(src.modelo),
    descripcion_trabajo: asStr_(src.descripcion_trabajo || src.descripcion),
    sintomas: asStringList_(src.sintomas),
    hallazgos: asStringList_(src.hallazgos),
    diagnostico: asStr_(src.diagnostico || src.diagnostico_confirmado),
    causa_confirmada: !!src.causa_confirmada,
    causas: otCausas_(src),
    trabajos_realizados: asStringList_(src.trabajos_realizados || src.trabajos_ejecutados),
    materiales_utilizados: asStringList_(src.materiales_utilizados || src.materiales),
    resultado: asStr_(src.resultado),
    recomendaciones: asStringList_(src.recomendaciones),
    observaciones: asStr_(src.observaciones),
    advertencias: asStringList_(src.advertencias)
  };
}

function callOpenAiInforme_(ot, oficio, key, model) {
  var facts = compactOtFacts_(ot, oficio);
  var res = UrlFetchApp.fetch('https://api.openai.com/v1/responses', {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: {
      Authorization: 'Bearer ' + key
    },
    payload: JSON.stringify({
      model: model,
      instructions: buildInformePrompt_(oficio),
      input: 'Hechos registrados de la OT (NO completar huecos):\n' + JSON.stringify(facts, null, 2) +
        '\n\nOficio fijado: ' + oficio +
        '\nDevuelve SOLO el JSON del informe. No inventes. No confirmes hipótesis.',
      store: false,
      text: {
        format: { type: 'json_object' }
      }
    })
  });

  var http = res.getResponseCode();
  var raw = res.getContentText() || '';
  var payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch (err) {
    throw new Error('OpenAI no devolvió JSON. HTTP ' + http);
  }

  if (payload && payload.error) {
    throw new Error(openaiErrorMessage_(payload.error, http));
  }
  if (http < 200 || http >= 300) {
    throw new Error('OpenAI HTTP ' + http);
  }

  var modelText = extractOutputText_(payload);
  return parseAndValidateInforme_(modelText, oficio, facts);
}

function asStr_(value) {
  return value == null ? '' : String(value).trim();
}

function otCausas_(ot) {
  var out = [];
  var src = ot && typeof ot === 'object' ? ot : {};
  var list = Array.isArray(src.causas) ? src.causas : (Array.isArray(src.hipotesis) ? src.hipotesis : []);
  var i;
  for (i = 0; i < list.length; i++) {
    var item = list[i];
    if (item == null) continue;
    if (typeof item === 'string') {
      var s = item.trim();
      if (s) out.push({ texto: s, confirmado: false, tipo: 'hipotesis' });
      continue;
    }
    var texto = asStr_(item.texto || item.causa || item.descripcion);
    if (!texto) continue;
    var confirmado = !!item.confirmado;
    out.push({
      texto: texto,
      confirmado: confirmado,
      tipo: confirmado ? 'confirmada' : (item.tipo || 'hipotesis')
    });
  }
  var diag = asStr_(src.diagnostico || src.diagnostico_confirmado);
  if (/posible causa|hip[oó]tesis/i.test(diag)) {
    var already = false;
    for (i = 0; i < out.length; i++) {
      if (foldInforme_(out[i].texto) === foldInforme_(diag)) already = true;
    }
    if (!already) out.push({ texto: diag, confirmado: false, tipo: 'hipotesis' });
  }
  return out;
}

function foldInforme_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
    .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ü/g, 'u').replace(/ñ/g, 'n');
}

function otSourceFold_(facts) {
  try {
    return foldInforme_(JSON.stringify(facts || {}));
  } catch (err) {
    return '';
  }
}

function introduceInventionInforme_(text, facts) {
  var t = foldInforme_(text);
  var src = otSourceFold_(facts);
  if (!t) return false;
  if (/\$|pvp|\bprecio\b|\bcop\b|\busd\b|\biva\b/.test(t)) return true;
  var marcas = ['nice', 'came', 'ppa', 'faac', 'roger', 'yamaha', 'suzuki', 'samsung', 'hitachi'];
  var j;
  for (j = 0; j < marcas.length; j++) {
    if (new RegExp('\\b' + marcas[j] + '\\b').test(t) && src.indexOf(marcas[j]) === -1) return true;
  }
  if (/\bbft\b/.test(t) && src.indexOf('bft') === -1) return true;
  if (/\bhonda\b/.test(t) && src.indexOf('honda') === -1) return true;
  var mats = ['cremallera', 'capacitor', 'engranaje', 'pinon', 'piñon', 'repuesto'];
  var k;
  for (k = 0; k < mats.length; k++) {
    if (t.indexOf(foldInforme_(mats[k])) !== -1 && src.indexOf(foldInforme_(mats[k])) === -1) return true;
  }
  return false;
}

function pickProseInforme_(llmValue, facts, fallback) {
  var v = asStr_(llmValue);
  if (!v) return fallback || '';
  if (introduceInventionInforme_(v, facts)) return fallback || '';
  return v;
}

function parseAndValidateInforme_(modelText, oficio, facts) {
  var raw = String(modelText || '').trim();
  var fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) raw = fenced[1].trim();
  var start = raw.indexOf('{');
  var end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('La respuesta del modelo no es JSON válido.');
  }
  var parsed;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch (err) {
    throw new Error('La respuesta del modelo no es JSON válido.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('La respuesta del modelo no es JSON válido.');
  }

  var src = facts && typeof facts === 'object' ? facts : {};
  var label = OFICIO_LABELS[oficio] || oficio;
  var tipo = asStr_(src.tipo_servicio);
  var tituloFallback = 'Informe técnico' + (tipo ? ' — ' + tipo : '') + (label ? ' — ' + label : '');
  var causas = Array.isArray(src.causas) ? src.causas : [];
  var hips = [];
  var i;
  for (i = 0; i < causas.length; i++) {
    if (causas[i] && !causas[i].confirmado && causas[i].texto) hips.push(causas[i].texto);
  }

  var diagnostico = pickProseInforme_(parsed.diagnostico, src, '');
  if (!src.causa_confirmada) {
    if (!diagnostico || !/hip[oó]tesis|posible causa|no (hay|existe) diagn[oó]stico confirmado|no confirmad/i.test(diagnostico)) {
      if (hips.length) {
        diagnostico = 'No hay diagnóstico confirmado en la OT. Hipótesis de trabajo (no confirmadas): ' + hips.join('; ') + '.';
      } else {
        diagnostico = diagnostico && /posible causa/i.test(diagnostico)
          ? diagnostico
          : (asStr_(src.diagnostico) && /posible causa|hip[oó]tesis/i.test(src.diagnostico)
            ? 'No hay diagnóstico confirmado en la OT. ' + src.diagnostico
            : 'No hay diagnóstico confirmado registrado.');
      }
    }
  } else {
    diagnostico = diagnostico || asStr_(src.diagnostico);
  }

  var hallazgos = asStringList_(src.sintomas).concat(asStringList_(src.hallazgos));
  var hallazgosLlm = asStringList_(parsed.hallazgos);
  for (i = 0; i < hallazgosLlm.length; i++) {
    var h = hallazgosLlm[i];
    if (introduceInventionInforme_(h, src)) continue;
    var dup = false;
    var n;
    for (n = 0; n < hallazgos.length; n++) {
      if (foldInforme_(hallazgos[n]) === foldInforme_(h)) dup = true;
    }
    if (!dup) hallazgos.push(h);
  }

  var advertencias = asStringList_(src.advertencias);
  var advLlm = asStringList_(parsed.advertencias);
  for (i = 0; i < advLlm.length; i++) {
    if (introduceInventionInforme_(advLlm[i], src)) continue;
    advertencias.push(advLlm[i]);
  }

  return {
    titulo: pickProseInforme_(parsed.titulo, src, tituloFallback) || tituloFallback,
    numero_ot: asStr_(src.numero_ot),
    fecha: asStr_(src.fecha),
    cliente: asStr_(src.cliente),
    ubicacion: asStr_(src.ubicacion),
    tecnico: asStr_(src.tecnico),
    oficio: oficio,
    tipo_servicio: tipo,
    equipo: asStr_(src.equipo),
    marca: asStr_(src.marca),
    modelo: asStr_(src.modelo),
    descripcion_trabajo: asStr_(src.descripcion_trabajo),
    hallazgos: hallazgos,
    diagnostico: diagnostico,
    trabajos_realizados: asStringList_(src.trabajos_realizados),
    materiales_utilizados: asStringList_(src.materiales_utilizados),
    resultado: asStr_(src.resultado),
    recomendaciones: asStringList_(src.recomendaciones).length
      ? asStringList_(src.recomendaciones)
      : asStringList_(parsed.recomendaciones).filter(function (item) {
        return !introduceInventionInforme_(item, src);
      }),
    observaciones: asStr_(src.observaciones),
    resumen_cliente: pickProseInforme_(parsed.resumen_cliente, src, ''),
    nota_tecnica: pickProseInforme_(parsed.nota_tecnica, src, ''),
    advertencias: advertencias,
    causa_confirmada: !!src.causa_confirmada
  };
}

function asStringList_(value) {
  if (!Array.isArray(value)) return [];
  var out = [];
  for (var i = 0; i < value.length; i++) {
    if (value[i] == null) continue;
    if (typeof value[i] === 'string') {
      var s = value[i].trim();
      if (s) out.push(s);
    } else if (typeof value[i] === 'object') {
      var t = String(value[i].texto || value[i].pregunta || value[i].label || '').trim();
      if (t) out.push(t);
    }
  }
  return out;
}

function isUnsafeStep_(paso) {
  var t = String(paso || '');
  if (!/puente(?:ar|o)?|bypass|jumper|anular\s+(?:la\s+|el\s+|las\s+)?(?:foto|segur|protecci)|desactivar\s+(?:las?\s+)?(?:foto|segur)|quitar\s+(?:las?\s+)?(?:foto|protecci)/i.test(t)) {
    return false;
  }
  if (/no\s+(?:se\s+debe\s+)?(?:puente|anular|quitar|desactivar)|nunca|prohibido/i.test(t)) return false;
  return true;
}

function parseAndValidateDiagnostico_(modelText, oficio) {
  var raw = String(modelText || '').trim();
  var fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) raw = fenced[1].trim();
  var start = raw.indexOf('{');
  var end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('La respuesta del modelo no es JSON válido.');
  }
  var parsed;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch (err) {
    throw new Error('La respuesta del modelo no es JSON válido.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('La respuesta del modelo no es JSON válido.');
  }

  var pruebas = asStringList_(parsed.pruebas || parsed.pruebas_recomendadas);
  var procedimiento = asStringList_(parsed.procedimiento || parsed.procedimiento_sugerido);
  var pruebasOk = [];
  var procOk = [];
  var i;
  for (i = 0; i < pruebas.length; i++) {
    if (!isUnsafeStep_(pruebas[i])) pruebasOk.push(pruebas[i]);
  }
  for (i = 0; i < procedimiento.length; i++) {
    if (!isUnsafeStep_(procedimiento[i])) procOk.push(procedimiento[i]);
  }

  var urg = parsed.urgencia && typeof parsed.urgencia === 'object' ? parsed.urgencia : {};
  return {
    oficio: oficio,
    sintomas: asStringList_(parsed.sintomas),
    hechos: Array.isArray(parsed.hechos) ? parsed.hechos : [],
    hipotesis: Array.isArray(parsed.hipotesis) ? parsed.hipotesis : (Array.isArray(parsed.posibles_causas) ? parsed.posibles_causas : []),
    datos_faltantes: asStringList_(parsed.datos_faltantes),
    preguntas: asStringList_(parsed.preguntas),
    pruebas: pruebasOk,
    procedimiento: procOk,
    urgencia: {
      nivel: String(urg.nivel || 'indeterminada'),
      motivo: String(urg.motivo || '')
    },
    advertencias_seguridad: asStringList_(parsed.advertencias_seguridad),
    informacion_insuficiente: !!parsed.informacion_insuficiente,
    causa_confirmada: false,
    mensaje: parsed.mensaje == null ? '' : String(parsed.mensaje)
  };
}

function openaiErrorMessage_(error, http) {
  if (typeof error === 'string') return 'OpenAI: ' + error;
  var msg = error && error.message ? String(error.message) : 'Error de OpenAI';
  return 'OpenAI HTTP ' + http + ': ' + msg;
}

function extractOutputText_(data) {
  if (data && typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text;
  }
  var chunks = [];
  var output = data && data.output ? data.output : [];
  for (var i = 0; i < output.length; i++) {
    var item = output[i];
    var content = item && item.content ? item.content : [];
    for (var j = 0; j < content.length; j++) {
      var part = content[j];
      if (part && (part.type === 'output_text' || part.type === 'text') && part.text) {
        chunks.push(String(part.text));
      }
    }
  }
  return chunks.join('');
}

function emptyDatos_(oficio) {
  var src = DATOS_SCHEMA[oficio] || {};
  var out = {};
  var keys = Object.keys(src);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (Array.isArray(src[key])) out[key] = [];
    else if (src[key] === null) out[key] = null;
    else out[key] = '';
  }
  return out;
}

function asList_(value) {
  return Array.isArray(value) ? value : [];
}

function copyDato_(key, raw, template) {
  if (!Object.prototype.hasOwnProperty.call(template, key)) return template[key];
  if (Array.isArray(template[key])) return asList_(raw);
  if (template[key] === null) {
    if (raw == null || raw === '') return null;
    return raw;
  }
  if (raw == null) return '';
  return raw;
}

function parseAndValidateExtract_(modelText, oficio) {
  var raw = String(modelText || '').trim();
  var fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) raw = fenced[1].trim();
  var start = raw.indexOf('{');
  var end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('La respuesta del modelo no es JSON válido.');
  }
  var parsed;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch (err) {
    throw new Error('La respuesta del modelo no es JSON válido.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('La respuesta del modelo no es JSON válido.');
  }

  var template = emptyDatos_(oficio);
  var srcDatos = parsed.datos && typeof parsed.datos === 'object' && !Array.isArray(parsed.datos)
    ? parsed.datos
    : parsed;
  var datos = emptyDatos_(oficio);
  var keys = Object.keys(template);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    datos[key] = copyDato_(key, srcDatos[key], template);
  }

  var extraido = {
    oficio: oficio,
    tipo_de_trabajo: parsed.tipo_de_trabajo == null ? '' : parsed.tipo_de_trabajo,
    datos: datos,
    materiales_mencionados: asList_(parsed.materiales_mencionados),
    observaciones: asList_(parsed.observaciones),
    datos_faltantes: asList_(parsed.datos_faltantes)
  };

  if (oficio === 'automatizacion') {
    extraido.tipo_de_puerta = datos.tipo_de_puerta;
    extraido.uso = datos.uso;
    extraido.peso_kg = datos.peso_kg;
    extraido.ancho_m = datos.ancho_m;
    extraido.ciudad = datos.ciudad;
  }

  return extraido;
}

function sanitizeError_(message) {
  return String(message || 'Error desconocido')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redactado]')
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redactado]')
    .replace(/ARPA_IA_LLM_KEY\s*[:=]\s*\S+/gi, 'ARPA_IA_LLM_KEY=[redactado]');
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
