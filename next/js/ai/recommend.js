import { PART_CATALOG } from './knowledge.js';

/** Pieza y problema cerca en la frase (hasta 4 palabras entre ellos, en cualquier orden). */
function near(text, piece, problem) {
  const gap = '(?:[\\wáéíóúñ]+\\W+){0,4}';
  const re = new RegExp('(?:' + piece + ')\\w*\\W+' + gap + '(?:' + problem + ')|(?:' + problem + ')\\w*\\W+' + gap + '(?:' + piece + ')', 'i');
  return re.test(String(text || ''));
}

const RULES = [
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
    test: (f) => /pi[nñ][oó]n/i.test(f) && /desgaste|gastad|avanzad|desdentad|comid|reventad/i.test(f),
    recommendation: 'Cambio de piñón de ataque.',
    partId: 'pinon',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'cremallera',
    test: (f) => /cremallera/i.test(f) && /desaline|desgaste|suelta|floja|dan|comid|desdentad|desoldad/i.test(f),
    recommendation: 'Alineación o reemplazo de tramos de cremallera.',
    partId: 'cremallera',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'fotocelda',
    test: (f) => /fotocelda|fotocélula/i.test(f) && /sucia|suciedad|desaline|falla|no (?:detecta|funciona)|roto/i.test(f),
    recommendation: 'Limpieza profunda o reemplazo del par de fotoceldas.',
    partId: 'fotocelda',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'control',
    test: (f) => /control/i.test(f) && /falla|no funciona|agotad|bater|desprogramad|no responde/i.test(f),
    recommendation: 'Reprogramación o cambio de control remoto y prueba de alcance.',
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
    test: (f) => /rueda|rodamiento|balinera/i.test(f) && /holgura|desgaste|ruido|roto|reventad|da[nñ]ad|mal[oa]s/i.test(f),
    recommendation: 'Cambio de balineras (rodamientos) y nivelación.',
    partId: 'rueda',
    followUp: 'repair',
    quote: true,
  },
  // ─── Paquete de puertas de Arlen (10-nov-2026) ───
  {
    id: 'mantenimiento',
    test: (f) => /(?:toca|hay que|recomiend\w*|necesita|hacerle)\s+(?:[\wáéíóúñ]+\s+){0,3}mantenimiento/i.test(f),
    recommendation: 'Mantenimiento general preventivo.',
    partId: 'mantenimiento',
    followUp: 'maintenance',
    quote: true,
  },
  {
    id: 'capacitor',
    test: (f) => near(f, 'capacitor|condensador', 'estallad|quemad|da[nñ]ad|inflad|malo|falla'),
    recommendation: 'Cambio de capacitor de arranque.',
    partId: 'condensador',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'tarjeta',
    test: (f) => near(f, 'tarjeta|placa', 'quemad|da[nñ]ad|falla|metralleta|bloquead'),
    recommendation: 'Diagnóstico y reparación o cambio de la tarjeta electrónica.',
    partId: 'tarjeta',
    followUp: 'quote',
    quote: true,
  },
  {
    id: 'fin_carrera',
    test: (f) => near(f, 'fin(?:es)? de carrera|im[aá]n(?:es)?\\b', 'suelt|perdid|da[nñ]ad|falla|se pasa'),
    recommendation: 'Ajuste o cambio del fin de carrera y calibración de límites.',
    partId: 'fin_carrera',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'panel_solar',
    test: (f) => near(f, 'panel', 'suci|polvo|no carga|tapad|sulfatad'),
    recommendation: 'Limpieza del panel solar y revisión de conexiones.',
    partId: 'panel_limpieza',
    followUp: 'maintenance',
    quote: true,
  },
  {
    id: 'bateria',
    test: (f) => near(f, 'bater[ií]a', 'no retiene|descarg|agotad|en corto|hinchad|mala|vencid'),
    recommendation: 'Cambio de batería de respaldo.',
    partId: 'bateria',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'electroiman',
    test: (f) => near(f, 'electro.?im[aá]n', 'pegad|reventad|falla|da[nñ]ad|no (?:pega|sostiene)'),
    recommendation: 'Revisión o cambio del electroimán.',
    partId: 'electroiman',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'bisagras',
    test: (f) => near(f, 'bisagra', 'fisurad|vencid|rot|da[nñ]ad|desoldad|partid'),
    recommendation: 'Refuerzo o cambio de bisagras.',
    partId: 'bisagra',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'brazo_barrera',
    test: (f) => near(f, 'brazo|barrera', 'quebrad|rot|partid|doblad'),
    recommendation: 'Cambio del brazo de la barrera.',
    partId: 'brazo_barrera',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'tope',
    test: (f) => near(f, 'tope', 'arrancad|reventad|rot|da[nñ]ad'),
    recommendation: 'Cambio del tope de cierre y calibración de límites.',
    partId: 'tope',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'agua',
    test: (f) => /entr[oó] agua|le entr[oó] agua|humedad en (?:la caja|el motor|la tarjeta)/i.test(f),
    recommendation: 'Secado del equipo e impermeabilización de cajas de paso.',
    partId: 'impermeabilizacion',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'sulfatado',
    test: (f) => /sulfatad/i.test(f) && !/panel/i.test(f),
    recommendation: 'Rehacer empalmes y conexiones sulfatadas.',
    followUp: 'repair',
    quote: false,
  },
];

/** Cómo se nombra cada pieza en una recomendación del técnico. */
const PIECE_RE = {
  pinon: /pi[nñ][oó]n/i,
  cremallera: /cremallera/i,
  fotocelda: /fotocelda|fotocélula|sensores/i,
  control: /control/i,
  rueda: /balinera|rueda|rodamiento/i,
  mantenimiento: /mantenimiento/i,
  condensador: /capacitor|condensador/i,
  tarjeta: /tarjeta|placa/i,
  fin_carrera: /fin(?:es)? de carrera/i,
  panel_limpieza: /panel/i,
  bateria: /bater[ií]a/i,
  electroiman: /electro.?im[aá]n/i,
  bisagra: /bisagra/i,
  brazo_barrera: /brazo/i,
  tope: /\btope/i,
  resorte: /resorte/i,
  lama: /\blama|fleje/i,
  chapa: /chapa|cerradura/i,
};

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
    // Si el técnico ya dijo qué hacer con esa pieza, no se repite la recomendación (sí va a la cotización).
    const piece = PIECE_RE[rule.partId];
    const dichas = piece ? existingRecs.filter((r) => piece.test(r.text)) : [];
    if (!dichas.length) extraRecs.push({ text: rule.recommendation, source: 'engine', ruleId: rule.id });
    followUpTypes.add(rule.followUp);
    // Si el técnico pidió solo limpiar o ajustar esa pieza, no se cotiza una nueva.
    const soloServicio = dichas.length > 0
      && rule.partId !== 'mantenimiento'
      && !dichas.some((r) => /cambi|reemplaz|nuev|instal|poner/i.test(r.text));
    if (rule.quote && rule.partId && !soloServicio && !usedParts.has(rule.partId)) {
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
