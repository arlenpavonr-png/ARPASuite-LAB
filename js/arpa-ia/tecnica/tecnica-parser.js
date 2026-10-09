/**
 * Extrae solo hechos mencionados en el texto. No infiere oficio ni inventa datos.
 */
(function (global) {
  const MARCAS = [
    'Honda', 'Yamaha', 'Suzuki', 'AKT', 'Bajaj', 'TVS', 'KTM', 'BMW', 'Hero',
    'Kawasaki', 'Auteco', 'Victory', 'Haceb', 'Samsung', 'LG', 'Mabe', 'Whirlpool',
    'Electrolux', 'Challenger', 'Kalley', 'Bosch', 'Midea', 'Carrier', 'Daikin',
    'BFT', 'PPA', 'Nice', 'Came', 'FAAC'
  ];

  function normalizeText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function parseNum(raw) {
    const n = parseFloat(String(raw).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
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

  function pushFact(facts, id, label, valor) {
    if (valor == null || valor === '') return;
    if (facts.some((f) => f.id === id)) return;
    facts.push({ id: id, label: label, valor: valor, fuente: 'hecho' });
  }

  function extractMarca(text) {
    for (let i = 0; i < MARCAS.length; i += 1) {
      const brand = MARCAS[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp('\\b' + brand + '(?:\\s*[-]?\\d+)?\\b', 'i');
      if (re.test(text)) return MARCAS[i];
    }
    return null;
  }

  function extractTipoPuerta(text) {
    if (/corrediz/i.test(text)) return 'corrediza';
    if (/batiente|abatible/i.test(text)) return 'batiente';
    if (/seccional/i.test(text)) return 'seccional';
    if (/levadiz/i.test(text)) return 'levadiza';
    if (/enrollable/i.test(text)) return 'enrollable';
    if (/barrera|talanquera/i.test(text)) return 'barrera';
    return null;
  }

  function extractTipoEquipo(text) {
    if (/\bsplit\b/i.test(text)) return 'aire split';
    if (/aire\s+acondicionado|aire\s+central/i.test(text)) return 'aire acondicionado';
    if (/nevera|refrigerador/i.test(text)) return 'nevera';
    if (/congelador/i.test(text)) return 'congelador';
    if (/\bmoto\b|motocicleta/i.test(text)) return 'motocicleta';
    if (/tablero/i.test(text)) return 'tablero eléctrico';
    if (/\bbreaker|interruptor\s+termomagn/i.test(text)) return 'breaker';
    if (/\bmotor\b/i.test(text) && /puerta|port[oó]n/i.test(text)) return 'motor de puerta';
    if (/puerta|port[oó]n/i.test(text)) return 'puerta / portón';
    if (/fotocelda|fotoc[eé]lula/i.test(text)) return 'fotoceldas';
    if (/calentador/i.test(text)) return 'calentador';
    if (/lavadora/i.test(text)) return 'lavadora';
    if (/panel\s+solar/i.test(text)) return 'panel solar';
    if (/c[aá]mara/i.test(text)) return 'cámara';
    return null;
  }

  function extraerHechos(texto) {
    const text = normalizeText(texto);
    const facts = [];
    if (!text) return { texto: '', hechos: facts };

    const puerta = extractTipoPuerta(text);
    if (puerta) pushFact(facts, 'tipo_puerta', 'Tipo de puerta', puerta);

    const equipo = extractTipoEquipo(text);
    if (equipo) pushFact(facts, 'tipo_equipo', 'Tipo de equipo', equipo);

    const marca = extractMarca(text);
    if (marca) pushFact(facts, 'marca', 'Marca', marca);

    const btu = text.match(/(\d{3,6})\s*btu/i);
    if (btu) pushFact(facts, 'btu', 'Capacidad', parseInt(btu[1], 10) + ' BTU');

    const amp = text.match(/(\d+(?:[.,]\d+)?)\s*(?:a\b|amp(?:erios?)?)/i);
    if (amp) pushFact(facts, 'amperaje', 'Amperaje', parseNum(amp[1]) + ' A');

    const volt = text.match(/(\d{2,3})\s*v(?:oltios?)?\b/i);
    if (volt) pushFact(facts, 'voltaje', 'Voltaje', parseInt(volt[1], 10) + ' V');

    const cc = text.match(/(\d{2,4})\s*(?:cc|cm3)\b/i);
    if (cc) pushFact(facts, 'cilindraje', 'Cilindraje', parseInt(cc[1], 10) + ' cc');
    else {
      const hondaCc = text.match(/\b(?:honda|yamaha|suzuki|akt|bajaj)\s+(\d{2,3})\b/i);
      if (hondaCc) pushFact(facts, 'cilindraje', 'Cilindraje', parseInt(hondaCc[1], 10) + ' cc');
    }

    const km = text.match(/(\d{1,3}(?:[.\s,]\d{3})+|\d{3,7})\s*km\b/i);
    if (km) {
      const n = parseEnteroConMiles(km[1]);
      if (n != null) pushFact(facts, 'kilometraje', 'Kilometraje', n.toLocaleString('es-CO') + ' km');
    }

    if (/evaporador/i.test(text)) pushFact(facts, 'componente', 'Componente mencionado', 'evaporador');
    if (/tablero/i.test(text)) pushFact(facts, 'ubicacion', 'Ubicación mencionada', 'tablero');
    if (/fotocelda|fotoc[eé]lula/i.test(text)) {
      pushFact(facts, 'dispositivo_seguridad', 'Dispositivo de seguridad mencionado', 'fotoceldas');
    }

    return { texto: text, hechos: facts };
  }

  global.ArpaIaTecnicaParser = {
    extraerHechos,
    normalizeText
  };
})(typeof window !== 'undefined' ? window : globalThis);
