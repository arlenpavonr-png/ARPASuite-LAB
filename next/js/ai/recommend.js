import { PART_CATALOG } from './knowledge.js';

/** Pieza y problema cerca en la frase (hasta 4 palabras entre ellos, en cualquier orden). */
function near(text, piece, problem) {
  const gap = '(?:[\\wáéíóúñ]+\\W+){0,4}';
  const re = new RegExp('(?:' + piece + ')\\w*\\W+' + gap + '(?:' + problem + ')|(?:' + problem + ')\\w*\\W+' + gap + '(?:' + piece + ')', 'i');
  return re.test(String(text || ''));
}

const RULES = [
  // Cámaras y CCTV
  {
    id: 'camara_sin_imagen',
    test: (f) => near(f, 'c[aá]mara', 'sin imagen|sin se[nñ]al|no se ve|borros|da[nñ]ad|quemad'),
    recommendation: 'Revisión de cableado y fuente; si sigue sin imagen, cambio de cámara.',
    partId: 'camara',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'disco_vigilancia',
    test: (f) => near(f, 'disco', 'da[nñ]ad|lleno|no graba|falla|no lo detecta|error') || /no (?:est[aá] )?grab/i.test(f),
    recommendation: 'Cambio de disco duro de vigilancia y verificación de la grabación.',
    partId: 'disco',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'fuente_poder',
    test: (f) => near(f, 'fuente', 'da[nñ]ad|quemad|falla|no da|baja'),
    recommendation: 'Cambio de fuente de poder 12V.',
    partId: 'fuente',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'grabador',
    test: (f) => near(f, 'dvr|nvr|grabador', 'no enciende|da[nñ]ad|se reinicia|quemad|falla'),
    recommendation: 'Diagnóstico del grabador; posible cambio de DVR/NVR.',
    partId: 'grabador',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'conectores',
    test: (f) => near(f, 'conector|balun|cableado', 'sulfat|oxidad|suelt|da[nñ]ad|mojad'),
    recommendation: 'Cambio de conectores y revisión del cableado.',
    partId: 'conectores',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'sensor_pir',
    test: (f) => near(f, 'pir|sensor de movimiento', 'falla|no detecta|da[nñ]ad|falsa'),
    recommendation: 'Cambio de sensor de movimiento de la alarma.',
    partId: 'sensor_pir',
    followUp: 'repair',
    quote: true,
  },
  // Refrigeración y aire acondicionado
  {
    id: 'fuga_gas',
    test: (f) => near(f, 'fuga', 'gas|refrigerante') || /(?:bajo|sin) (?:de )?gas/i.test(f),
    recommendation: 'Búsqueda y reparación de la fuga; carga de gas refrigerante.',
    partId: 'carga_gas',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'no_enfria',
    test: (f) => /no enfr[ií]a|enfr[ií]a poco|no congela/i.test(f),
    recommendation: 'Diagnóstico de presiones, temperatura y compresor.',
    partId: 'diagnostico_ac',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'equipo_sucio',
    test: (f) => near(f, 'filtro|serpent[ií]n|evaporador|condensadora', 'suci|tapad|obstruid|congelad'),
    recommendation: 'Limpieza profunda de evaporador y condensadora.',
    partId: 'limpieza_ac',
    followUp: 'quote',
    quote: true,
  },
  {
    id: 'goteo',
    test: (f) => /gote|bota agua|drenaje (?:\w+ )?tapad/i.test(f),
    recommendation: 'Destapar el drenaje y revisar la pendiente y el nivel del equipo.',
    partId: 'drenaje',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'compresor',
    test: (f) => near(f, 'compresor', 'ruido|no arranca|recalent|caliente|quemad|bloquead'),
    recommendation: 'Diagnóstico del compresor; posible cambio.',
    partId: 'compresor',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'termostato',
    test: (f) => near(f, 'termostato', 'da[nñ]ad|falla|no corta|no funciona'),
    recommendation: 'Cambio de termostato.',
    partId: 'termostato',
    followUp: 'repair',
    quote: true,
  },
  // Electricidad
  {
    id: 'breaker',
    test: (f) => near(f, 'breaker|taco|interruptor', 'dispar|salta|se bota|quemad|da[nñ]ad|recalent'),
    recommendation: 'Revisión de carga del circuito y cambio de breaker si está fatigado.',
    partId: 'breaker',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'toma',
    test: (f) => near(f, 'toma|tomacorriente|enchufe', 'quemad|derretid|suelt|flojo|chispa|da[nñ]ad'),
    recommendation: 'Cambio de toma con polo a tierra.',
    partId: 'toma',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'cable_recalentado',
    test: (f) => near(f, 'cable|cableado|conductor', 'recalent|quemad|derretid|pelad'),
    recommendation: 'Cambio del tramo de cable dañado y empalmes con borne.',
    partId: 'cable',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'sin_tierra',
    test: (f) => /(?:sin|no tiene|falta) (?:el )?polo a tierra|sin puesta a tierra/i.test(f),
    recommendation: 'Instalar puesta a tierra para proteger equipos y personas.',
    partId: 'tierra',
    followUp: 'quote',
    quote: true,
  },
  {
    id: 'luminaria',
    test: (f) => near(f, 'luminaria|bombillo|reflector|panel led', 'da[nñ]ad|quemad|parpade|no prende|fundid'),
    recommendation: 'Cambio de luminaria por LED.',
    partId: 'luminaria',
    followUp: 'quote',
    quote: true,
  },
  {
    id: 'tablero',
    test: (f) => near(f, 'tablero', 'sin marcar|desordenad|oxidad|recalent|sin tapa|da[nñ]ad'),
    recommendation: 'Organizar y marcar el tablero; cambio si está deteriorado.',
    partId: 'tablero',
    followUp: 'quote',
    quote: true,
  },
  // Cerrajería y metalmecánica
  {
    id: 'resortes',
    test: (f) => near(f, 'resorte', 'sin tensi|flojo|roto|vencid|cansad|partid'),
    recommendation: 'Cambio de resortes de balance y ajuste de tensión del eje.',
    partId: 'resorte',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'lamas',
    test: (f) => near(f, 'lama|fleje', 'doblad|golpead|rot|desgast|da[nñ]ad'),
    recommendation: 'Cambio de lamas dañadas de la cortina.',
    partId: 'lama',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'guias_cortina',
    test: (f) => near(f, 'gu[ií]a', 'desaline|doblad|golpead'),
    recommendation: 'Alineación o cambio de guías laterales.',
    partId: 'guia_cortina',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'chapa',
    test: (f) => near(f, 'chapa|cerradura|guarda|candado', 'da[nñ]ad|rot|falla|no cierra|no abre|forzad|trabad'),
    recommendation: 'Cambio de chapa o cerradura.',
    partId: 'chapa',
    followUp: 'quote',
    quote: true,
  },
  {
    id: 'oxido',
    test: (f) => /oxid|óxido/i.test(f),
    recommendation: 'Limpieza y pintura anticorrosiva de la estructura.',
    partId: 'pintura',
    followUp: 'quote',
    quote: true,
  },
  {
    id: 'pinon_wear',
    test: (f) => /pi[nñ][oó]n/i.test(f) && /desgaste|gastad|avanzad/i.test(f),
    recommendation: 'Cambio de piñón de ataque.',
    partId: 'pinon',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'cremallera',
    test: (f) => /cremallera/i.test(f) && /desaline|desgaste|suelta|floja|dan/i.test(f),
    recommendation: 'Alineación o reemplazo de tramos de cremallera.',
    partId: 'cremallera',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'fotocelda',
    test: (f) => /fotocelda|fotocélula/i.test(f) && /sucia|falla|no (?:detecta|funciona)|roto/i.test(f),
    recommendation: 'Limpieza profunda o reemplazo del par de fotoceldas.',
    partId: 'fotocelda',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'control',
    test: (f) => /control/i.test(f) && /falla|no funciona|agotad|bater/i.test(f),
    recommendation: 'Cambio de control remoto y prueba de alcance.',
    partId: 'control',
    followUp: 'quote',
    quote: true,
  },
  {
    id: 'motor_noise',
    test: (f) => /motor/i.test(f) && /ruido|caliente|fuerza|no arranca/i.test(f),
    recommendation: 'Diagnóstico de motor y capacitor; posible reemplazo.',
    partId: 'motor',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'ruedas',
    test: (f) => /rueda|rodamiento/i.test(f) && /holgura|desgaste|ruido|roto/i.test(f),
    recommendation: 'Cambio de ruedas o rodamientos y nivelación.',
    partId: 'rueda',
    followUp: 'repair',
    quote: true,
  },
];

function uniqueByText(items) {
  const out = [];
  for (const item of items) {
    const key = String(item.text || '').trim().toLowerCase().replace(/[.\s]+$/g, '');
    if (!key) continue;
    const dup = out.some((x) => {
      const y = String(x.text || '').trim().toLowerCase();
      return y === key || y.includes(key) || key.includes(y);
    });
    if (dup) continue;
    out.push(item);
  }
  return out;
}

/**
 * Enriquece el parseo con recomendaciones, ítems de cotización y seguimientos.
 */
export function buildAssistance(parsed) {
  const findings = parsed?.findings || [];
  const existingRecs = parsed?.recommendations || [];
  const extraRecs = [];
  const quoteItems = [];
  const followUpTypes = new Set();
  const usedParts = new Set();

  const findingText = findings.map((f) => f.text).join(' | ');
  const allText = [findingText, parsed?.transcript || ''].join(' | ');

  for (const rule of RULES) {
    const hit = findings.some((f) => rule.test(f.text)) || rule.test(allText);
    if (!hit) continue;
    extraRecs.push({ text: rule.recommendation, source: 'engine', ruleId: rule.id });
    followUpTypes.add(rule.followUp);
    if (rule.quote && rule.partId && !usedParts.has(rule.partId)) {
      usedParts.add(rule.partId);
      const cat = PART_CATALOG[rule.partId];
      if (cat) {
        quoteItems.push({
          partId: rule.partId,
          name: cat.name,
          qty: 1,
          unitPrice: cat.unitPrice,
          labor: cat.labor,
          needsQuote: !!cat.needsQuote,
          source: 'engine',
        });
      }
    }
  }

  for (const part of parsed?.partsMentioned || []) {
    if (usedParts.has(part.id)) continue;
    const recHit = existingRecs.some((r) => new RegExp(part.name, 'i').test(r.text) && /cambi|reemplaz|cotiz/i.test(r.text));
    if (!recHit) continue;
    usedParts.add(part.id);
    const cat = PART_CATALOG[part.id];
    if (cat) {
      quoteItems.push({
        partId: part.id,
        name: cat.name,
        qty: 1,
        unitPrice: cat.unitPrice,
        labor: cat.labor,
        needsQuote: !!cat.needsQuote,
        source: 'engine',
      });
      followUpTypes.add('quote');
    }
  }

  if (parsed?.status?.code === 'operational' || parsed?.status?.code === 'operational_watch') {
    followUpTypes.add('maintenance');
  }
  if (existingRecs.length || extraRecs.length) {
    followUpTypes.add('recommendation');
  }

  const recommendations = uniqueByText([
    ...existingRecs.map((r) => ({ ...r, source: r.source || 'parser' })),
    ...extraRecs,
  ]);

  return {
    recommendations,
    quoteItems,
    followUpTypes: [...followUpTypes],
    status: parsed?.status || { code: 'operational', label: 'Equipo operativo' },
  };
}
