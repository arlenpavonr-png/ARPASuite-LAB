import { PART_CATALOG, ACTIVE_OFICIO } from './knowledge.js';

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
    oficios: ['cctv'],
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
    oficios: ['refrigeracion', 'linea_blanca'],
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
  // Gas
  {
    id: 'fuga_red_gas',
    oficios: ['gas'],
    test: (f) => /olor a gas/i.test(f) || near(f, 'fuga', 'gas|uni[oó]n|v[aá]lvula|conector|tuber|regulador'),
    recommendation: 'Localizar y reparar la fuga; prueba de hermeticidad.',
    partId: 'hermeticidad',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'regulador',
    oficios: ['gas'],
    test: (f) => near(f, 'regulador', 'falla|da[nñ]ad|no regula|escarcha|vencid'),
    recommendation: 'Cambio del regulador de presión.',
    partId: 'regulador',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'conector_gas',
    oficios: ['gas'],
    test: (f) => near(f, 'conector|manguera', 'vencid|resec|agrietad|da[nñ]ad|fisur'),
    recommendation: 'Cambio del conector flexible.',
    partId: 'conector_gas',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'llama',
    oficios: ['gas'],
    test: (f) => /llama (?:amarilla|naranja|roja)|quemadores? sucios?/i.test(f),
    recommendation: 'Limpieza de quemadores y ajuste de la mezcla de aire.',
    partId: 'diagnostico_gas',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'calentador',
    oficios: ['gas', 'plomeria'],
    test: (f) => near(f, 'calentador', 'no enciende|no prende|se apaga|da[nñ]ad|no calienta'),
    recommendation: 'Diagnóstico del calentador; posible cambio de piezas o del equipo.',
    partId: 'diagnostico_gas',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'ventilacion',
    oficios: ['gas'],
    test: (f) => /sin ventilaci[oó]n|rejillas? tapad|rejillas? obstruid/i.test(f),
    recommendation: 'Adecuar la ventilación del recinto según la norma.',
    followUp: 'recommendation',
    quote: false,
  },
  // Plomería
  {
    id: 'fuga_agua',
    oficios: ['plomeria'],
    test: (f) => near(f, 'fuga|gote', 'agua|tuber|tubo|uni[oó]n|llave|codo'),
    recommendation: 'Reparación de la fuga y cambio del tramo o accesorio dañado.',
    partId: 'tuberia_pvc',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'tapado',
    oficios: ['plomeria'],
    test: (f) => near(f, 'tubo|tuber|desag|sif[oó]n|lavaplatos|lavamanos|sanitario|ducha|ca[nñ]o', 'tapad|obstruid|no drena|drena lento'),
    recommendation: 'Destape de la tubería y revisión del sifón.',
    partId: 'destape',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'grifo',
    oficios: ['plomeria'],
    test: (f) => near(f, 'grifo|grifer|llave', 'gote|da[nñ]ad|suelt|no cierra'),
    recommendation: 'Cambio del grifo o de sus empaques.',
    partId: 'grifo',
    followUp: 'quote',
    quote: true,
  },
  {
    id: 'sanitario',
    oficios: ['plomeria'],
    test: (f) => near(f, 'sanitario|inodoro|tanque', 'no descarga|rebosa|corre el agua|da[nñ]ad|fuga'),
    recommendation: 'Cambio del kit de tanque del sanitario.',
    partId: 'diagnostico_plo',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'presion',
    oficios: ['plomeria'],
    test: (f) => /(?:baja|poca|sin) presi[oó]n/i.test(f),
    recommendation: 'Revisión de bomba, registro y tubería por baja presión.',
    partId: 'diagnostico_plo',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'humedad',
    oficios: ['plomeria'],
    test: (f) => /humedad|filtraci[oó]n|mancha de agua/i.test(f),
    recommendation: 'Detectar el origen de la humedad (posible fuga oculta).',
    partId: 'diagnostico_plo',
    followUp: 'repair',
    quote: true,
  },
  // Control de plagas
  {
    id: 'cucarachas',
    oficios: ['plagas'],
    test: (f) => near(f, 'cucarach', 'presencia|infest|hay|encontr|muchas|nido|activ'),
    recommendation: 'Control de cucarachas con gel en puntos críticos y revisión a los 15 días.',
    partId: 'cucarachas',
    followUp: 'recommendation',
    quote: true,
  },
  {
    id: 'roedores',
    oficios: ['plagas'],
    test: (f) => /\bratas?\b|rat[oó]n|ratones|roedor|excremento/i.test(f),
    recommendation: 'Control de roedores con cebaderos y sellado de puntos de entrada.',
    partId: 'roedores',
    followUp: 'recommendation',
    quote: true,
  },
  {
    id: 'hormigas',
    oficios: ['plagas'],
    test: (f) => near(f, 'hormiga', 'presencia|infest|hay|encontr|muchas|nido|activ'),
    recommendation: 'Control de hormigas en nidos y rutas.',
    partId: 'hormigas',
    followUp: 'recommendation',
    quote: true,
  },
  {
    id: 'zancudos',
    oficios: ['plagas'],
    test: (f) => near(f, 'zancud|mosquit', 'presencia|infest|hay|encontr|muchos|criadero'),
    recommendation: 'Control de zancudos y eliminación de criaderos.',
    partId: 'zancudos',
    followUp: 'recommendation',
    quote: true,
  },
  {
    id: 'termitas',
    oficios: ['plagas'],
    test: (f) => /termita|comej[eé]n/i.test(f),
    recommendation: 'Control de termitas y revisión de la madera afectada.',
    partId: 'termitas',
    followUp: 'quote',
    quote: true,
  },
  {
    id: 'entradas',
    oficios: ['plagas'],
    test: (f) => /puntos? de entrada|sin sellar|grietas?/i.test(f),
    recommendation: 'Sellar grietas y puntos de entrada para evitar reinfestación.',
    followUp: 'recommendation',
    quote: false,
  },
  // Línea blanca
  {
    id: 'desagua',
    oficios: ['linea_blanca'],
    test: (f) => /no desagua|no bota el agua/i.test(f) || near(f, 'bomba', 'da[nñ]ad|tapad|ruido|quemad'),
    recommendation: 'Limpieza o cambio de la bomba de desagüe.',
    partId: 'bomba_lavadora',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'centrifuga',
    oficios: ['linea_blanca'],
    test: (f) => /no centrifuga|no gira|no lava/i.test(f) || near(f, 'motor', 'quemad|no arranca|ruido'),
    recommendation: 'Diagnóstico de motor y correa; posible cambio de motor.',
    partId: 'motor_lavadora',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'horno',
    oficios: ['linea_blanca'],
    test: (f) => near(f, 'horno|resistencia', 'no calienta|quemad|da[nñ]ad|no prende'),
    recommendation: 'Cambio de la resistencia del horno.',
    partId: 'resistencia_horno',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'temporizador',
    oficios: ['linea_blanca'],
    test: (f) => near(f, 'temporizador|perilla', 'da[nñ]ad|no avanza|falla'),
    recommendation: 'Cambio del temporizador.',
    partId: 'temporizador',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'tarjeta_lb',
    oficios: ['linea_blanca'],
    test: (f) => near(f, 'tarjeta', 'quemad|da[nñ]ad|falla'),
    recommendation: 'Reparación o cambio de la tarjeta electrónica.',
    partId: 'tarjeta_lb',
    followUp: 'quote',
    quote: true,
  },
  // Energía solar
  {
    id: 'paneles_sucios',
    oficios: ['solar'],
    test: (f) => near(f, 'panel', 'suci|polvo|excremento|hojas'),
    recommendation: 'Limpieza de paneles y revisión de producción.',
    partId: 'limpieza_panel',
    followUp: 'maintenance',
    quote: true,
  },
  {
    id: 'inversor',
    oficios: ['solar'],
    test: (f) => near(f, 'inversor', 'alarma|error|falla|no enciende|se apaga|da[nñ]ad'),
    recommendation: 'Diagnóstico del inversor; posible cambio.',
    partId: 'diagnostico_solar',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'baterias_solares',
    oficios: ['solar'],
    test: (f) => near(f, 'bater', 'baja|no carga|hinchad|sulfat|da[nñ]ad|no retiene'),
    recommendation: 'Cambio de baterías del banco.',
    partId: 'bateria_solar',
    followUp: 'quote',
    quote: true,
  },
  {
    id: 'mc4',
    oficios: ['solar'],
    test: (f) => near(f, 'mc4|conector', 'quemad|derretid|suelt|sulfat'),
    recommendation: 'Cambio de conectores MC4.',
    partId: 'mc4',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'estructura_solar',
    oficios: ['solar'],
    test: (f) => near(f, 'estructura|soporte', 'flojo|floja|suelt|oxidad'),
    recommendation: 'Ajuste o cambio de la estructura de soporte.',
    partId: 'estructura_panel',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'sombra',
    oficios: ['solar'],
    test: (f) => /sombra/i.test(f),
    recommendation: 'Podar o reubicar para quitar la sombra sobre los paneles.',
    followUp: 'recommendation',
    quote: false,
  },
  // Taller de motos
  {
    id: 'pastillas',
    oficios: ['taller_motos'],
    test: (f) => near(f, 'pastilla|freno|banda', 'gastad|desgast|chill|no frena|cristalizad'),
    recommendation: 'Cambio de pastillas o bandas de freno.',
    partId: 'pastillas',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'kit_arrastre',
    oficios: ['taller_motos'],
    test: (f) => near(f, 'kit|cadena|pi[nñ][oó]n|corona|arrastre', 'gastad|desgast|flojo|floja|estirad|salta'),
    recommendation: 'Cambio del kit de arrastre (cadena, piñón y corona).',
    partId: 'kit_arrastre',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'aceite',
    oficios: ['taller_motos'],
    test: (f) => near(f, 'aceite', 'vencid|negro|bajo|sucio|quemad'),
    recommendation: 'Cambio de aceite y filtro.',
    partId: 'aceite',
    followUp: 'maintenance',
    quote: true,
  },
  {
    id: 'bateria_moto',
    oficios: ['taller_motos'],
    test: (f) => near(f, 'bater', 'baja|descargad|no carga|sulfat|da[nñ]ad'),
    recommendation: 'Cambio de batería.',
    partId: 'bateria_moto',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'llanta',
    oficios: ['taller_motos'],
    test: (f) => near(f, 'llanta|neum', 'lisa|gastad|pinchad|desgast'),
    recommendation: 'Cambio de llanta.',
    partId: 'llanta',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'no_arranca',
    oficios: ['taller_motos'],
    test: (f) => /no arranca|no prende|no enciende/i.test(f),
    recommendation: 'Diagnóstico de arranque: bujía, batería y carburación o inyección.',
    partId: 'diagnostico_moto',
    followUp: 'repair',
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
    oficios: ['automatismos', 'metalmecanica'],
    test: (f) => /pi[nñ][oó]n/i.test(f) && /desgaste|gastad|avanzad/i.test(f),
    recommendation: 'Cambio de piñón de ataque.',
    partId: 'pinon',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'cremallera',
    oficios: ['automatismos', 'metalmecanica'],
    test: (f) => /cremallera/i.test(f) && /desaline|desgaste|suelta|floja|dan/i.test(f),
    recommendation: 'Alineación o reemplazo de tramos de cremallera.',
    partId: 'cremallera',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'fotocelda',
    oficios: ['automatismos', 'metalmecanica'],
    test: (f) => /fotocelda|fotocélula/i.test(f) && /sucia|falla|no (?:detecta|funciona)|roto/i.test(f),
    recommendation: 'Limpieza profunda o reemplazo del par de fotoceldas.',
    partId: 'fotocelda',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'control',
    oficios: ['automatismos', 'metalmecanica'],
    test: (f) => /control/i.test(f) && /falla|no funciona|agotad|bater/i.test(f),
    recommendation: 'Cambio de control remoto y prueba de alcance.',
    partId: 'control',
    followUp: 'quote',
    quote: true,
  },
  {
    id: 'motor_noise',
    oficios: ['automatismos', 'metalmecanica'],
    test: (f) => /motor/i.test(f) && /ruido|caliente|fuerza|no arranca/i.test(f),
    recommendation: 'Diagnóstico de motor y capacitor; posible reemplazo.',
    partId: 'motor',
    followUp: 'repair',
    quote: true,
  },
  {
    id: 'ruedas',
    oficios: ['automatismos', 'metalmecanica'],
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
export function buildAssistance(parsed, options = {}) {
  const oficio = options.oficio || ACTIVE_OFICIO;
  const findings = parsed?.findings || [];
  const existingRecs = parsed?.recommendations || [];
  const extraRecs = [];
  const quoteItems = [];
  const followUpTypes = new Set();
  const usedParts = new Set();

  const findingText = findings.map((f) => f.text).join(' | ');
  const allText = [findingText, parsed?.transcript || ''].join(' | ');

  for (const rule of RULES) {
    if (rule.oficios && !rule.oficios.includes(oficio)) continue;
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
