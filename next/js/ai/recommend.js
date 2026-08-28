import { PART_CATALOG } from './knowledge.js';

const RULES = [
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
