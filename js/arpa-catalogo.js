/**
 * Catálogo compartido: marcas Accessmatic, BFT, Elite, NAS.
 * Usado por Formato/Instalación (select en cascada) y Cotización (buscador).
 */
(function (global) {
  const CATALOGO_MARCAS = {
    Accessmatic: {
      'Levadiza / Seccional': [
        { cod: 'AUACSC901', nom: 'Scorpion 901 – ½ HP' },
        { cod: 'AUACFX1000', nom: 'Fox 1000 Pro – ¾ HP' },
        { cod: 'AUACKFOX1000C', nom: 'Fox 1000 Pro + Riel C correa' },
        { cod: 'AUACKFOX1000T', nom: 'Fox 1000 Pro + Riel T metálico' },
        { cod: 'AUACFX1100WS', nom: 'Fox 1100 Pro WiFi – ¾ HP' },
        { cod: 'AUACKFOX1050HS', nom: 'Fox 1050 High Speed – ¾ HP' },
        { cod: 'AUACKFOX1100WS', nom: 'Fox 1100 Pro WiFi + Riel T' },
        { cod: 'AUACSH1000', nom: 'Shark 1000 – ¾ HP silencioso' },
        { cod: 'AUACRP120', nom: 'Raptor 1200 – 1 HP' },
        { cod: 'AUACPUMA1200', nom: 'Puma 1200 WiFi – 1 HP' },
        { cod: 'AUACKSC1800C', nom: 'Scorpion 1800 – 1.5 HP Riel C' },
        { cod: 'AUACKSC1800T', nom: 'Scorpion 1800 – 1.5 HP Riel T' },
      ],
      Corrediza: [
        { cod: 'AUACKPB400', nom: 'Pitbull 400 – 400 kg' },
        { cod: 'AUACKBD850', nom: 'Bulldozer 850 – 850 kg' },
        { cod: 'AUACKBD1100', nom: 'Bulldog 1100 – 1100 kg' },
        { cod: 'AUACKBD1024BL', nom: 'Bulldog 1024BL – 1000 kg sin escobillas' },
        { cod: 'AUACKBD1522', nom: 'Bulldog 1522 – 1500 kg 220V industrial' },
        { cod: 'AUACKBD1824BL', nom: 'Bulldog 1824BL – 1800 kg sin escobillas' },
        { cod: 'AUACKBD2024', nom: 'Bulldog 2024 – 2000 kg industrial' },
      ],
      'Batiente 2 hojas': [
        { cod: 'AUACEG250', nom: 'Eagle 250 – 2 hojas / 250 kg / 3 m' },
        { cod: 'AUACFC300', nom: 'Falcon 300 – 2 hojas / 300 kg/hoja / 3 m' },
        { cod: 'AUACFC350', nom: 'Falcon 350 – 2 hojas / 350 kg / 4 m' },
        { cod: 'AUACEG500', nom: 'Eagle 500 – 2 hojas / 350 kg / 5 m' },
        { cod: 'AUACFENIX600', nom: 'Fénix 600 – 2 hojas / 600 kg / 5.5 m' },
      ],
      'Batiente 1 hoja': [
        { cod: 'AUACFC351', nom: 'Falcon 351 – 1 hoja / 350 kg / 4 m' },
        { cod: 'AUACEG501', nom: 'Eagle 501 – 1 hoja / 350 kg / 5 m' },
        { cod: 'AUACFENIX601', nom: 'Fénix 601 – 1 hoja / 600 kg / 5.5 m' },
      ],
      'Cortina enrollable': [
        { cod: 'AUACKAR201B', nom: 'Armadillo 200 (sin control) – 200 kg' },
        { cod: 'AUACKAR382B', nom: 'Armadillo 380 (sin control) – 380 kg' },
        { cod: 'AUACKAR201F', nom: 'Armadillo 200 (con control) – 200 kg' },
        { cod: 'AUACKAR382F', nom: 'Armadillo 380 (con control) – 380 kg' },
        { cod: 'AUACKHULK500S', nom: 'Hulk 500S – 500 kg industrial' },
        { cod: 'AUACKHULK624DC', nom: 'Hulk 624DC – 600 kg con batería' },
        { cod: 'AUACKHULK750', nom: 'Hulk 750 – 750 kg' },
        { cod: 'AUACKHULK950', nom: 'Hulk 950 – 950 kg' },
        { cod: 'AUACKHULK1024DC', nom: 'Hulk 1024DC – 1000 kg con batería' },
        { cod: 'AUACKHULK1500', nom: 'Hulk 1500 – 1500 kg 220V' },
      ],
      'Barrera vehicular': [
        { cod: 'AUACMTD224', nom: 'Mastodon 224 – 220V / asta 2 m' },
        { cod: 'AUCKMTD224', nom: 'Kit Mastodon 224 + asta 2 m' },
        { cod: 'AUACMTD624', nom: 'Mastodon 624 – alta velocidad 110/220V' },
        { cod: 'AUACKMTD624', nom: 'Kit Mastodon 624 + asta telescópica 3-6 m' },
        { cod: 'AUACKMTD624ART', nom: 'Kit Mastodon 624 + asta articulada 4 m' },
      ],
    },
    BFT: {
      Corrediza: [
        { cod: 'KDEIMOSBTA400-1', nom: 'Deimos BT A400 – Corredizo 400kg 110V (Kit)', pvp: 1948900 },
        { cod: 'KDEIMOSBTA600-1', nom: 'Deimos BT A600 – Corredizo 600kg 110V (Kit)', pvp: 2391900 },
        { cod: 'KDEIMOSACA600-1', nom: 'Deimos AC A600 – Corredizo 600kg 110V (Kit)', pvp: 2960900 },
        { cod: 'KDEIMOSACA600-2', nom: 'Deimos AC A600 – Corredizo 600kg 220V (Kit)', pvp: 2960900 },
        { cod: 'KDEIMOSACA800SLDN-1', nom: 'Deimos AC A800 SL DN – Corredizo 800kg 110V (Kit)', pvp: 3728900 },
        { cod: 'KDEIMOSACA800SLDN-2', nom: 'Deimos AC A800 SL DN – Corredizo 800kg 220V (Kit)', pvp: 3728900 },
        { cod: 'KARESBTA1000Z18-2', nom: 'Ares BTA 1000 – Corredizo 1000kg 220V Piñón 18 (Kit)', pvp: 3539900 },
        { cod: 'KARESBTA1000Z25-2', nom: 'Ares BTA 1000 – Corredizo 500kg 220V Piñón 25 (Kit)', pvp: 3539000 },
        { cod: 'KARESBTA1500Z18-2', nom: 'Ares BTA 1500 – Corredizo 1500kg 220V Piñón 18 (Kit)', pvp: 4209900 },
        { cod: 'KARESBTA1500Z25-2', nom: 'Ares BTA 1500 – Corredizo 750kg 220V Piñón 25 (Kit)', pvp: 4402900 },
        { cod: 'KICAROSMARTACA2000V', nom: 'Icaro Smart AC A2000 – Corredizo 1000kg 220V (Kit)', pvp: 5522900 },
        { cod: 'KICAROSMARTACA2000', nom: 'Icaro Smart AC A2000 – Corredizo 2000kg uso continuo (Kit)', pvp: 5522900 },
      ],
      'Batiente 1 hoja': [
        { cod: 'K1PHOBOSBT-A25', nom: 'Phobos BT A25 – Batiente 400kg 2.5m 110V (Kit 1 brazo)', pvp: 2663900 },
        { cod: 'K1PHOBOSBT-A40', nom: 'Phobos BT A40 – Batiente 500kg 4m 110V (Kit 1 brazo)', pvp: 2995900 },
        { cod: 'K1PHOBOSACA25-AL', nom: 'Phobos AC A25 – Batiente 400kg 2.5m tarjeta Alena (Kit 1 brazo)', pvp: 2844900 },
        { cod: 'K1PHOBOSACA25-R', nom: 'Phobos AC A25 – Batiente 400kg 2.5m tarjeta Rigel (Kit 1 brazo)', pvp: 3170900 },
        { cod: 'K1LUX2B-1', nom: 'Lux 2B Hidráulico – Batiente 300kg 3.5m (Kit 1 brazo)', pvp: 3875900 },
        { cod: 'K1LUXGV2B-1', nom: 'Lux GV 2B Hidráulico – Batiente 300kg 3.5m (Kit 1 brazo)', pvp: 4923900 },
        { cod: 'K1GIUNO-BTA20-1', nom: 'Giuno Ultra BT A20 Hidráulico – Batiente 300kg 2.5m uso continuo (Kit 1 brazo)', pvp: 6096900 },
        { cod: 'K1GIUNO-BTA50-1', nom: 'Giuno Ultra BT A50 Hidráulico – Batiente 800kg 5m uso intensivo (Kit 1 brazo)', pvp: 7024900 },
      ],
      'Batiente 2 hojas': [
        { cod: 'K2PHOBOSBT-A25', nom: 'Phobos BT A25 – Batiente 400kg 2.5m 110V (Kit 2 brazos)', pvp: 3278900 },
        { cod: 'K2PHOBOSBT-A40', nom: 'Phobos BT A40 – Batiente 500kg 4m 110V (Kit 2 brazos)', pvp: 3498900 },
        { cod: 'K2PHOBOSACA25-AL', nom: 'Phobos AC A25 – Batiente 400kg 2.5m tarjeta Alena (Kit 2 brazos)', pvp: 3253900 },
        { cod: 'K2PHOBOSACA25-R', nom: 'Phobos AC A25 – Batiente 400kg 2.5m tarjeta Rigel (Kit 2 brazos)', pvp: 3823900 },
        { cod: 'K2LUX2B-1', nom: 'Lux 2B Hidráulico – Batiente 300kg 3.5m (Kit 2 brazos)', pvp: 6413900 },
        { cod: 'K2LUXGV2B-1', nom: 'Lux GV 2B Hidráulico – Batiente 300kg 3.5m (Kit 2 brazos)', pvp: 8407900 },
        { cod: 'K2GIUNO-BTA20-1', nom: 'Giuno Ultra BT A20 Hidráulico – Batiente 300kg 2.5m uso continuo (Kit 2 brazos)', pvp: 9709900 },
        { cod: 'K2GIUNO-BTA50-1', nom: 'Giuno Ultra BT A50 Hidráulico – Batiente 800kg 5m uso intensivo (Kit 2 brazos)', pvp: 10394900 },
      ],
      'Barrera vehicular': [
        { cod: 'KMOOVI30', nom: 'Moovi 30 – Barrera 3m 220V apertura 4seg (Kit)', pvp: 5383900 },
        { cod: 'KMOOVI60', nom: 'Moovi 60 – Barrera 6m 220V apertura 8.5seg (Kit)', pvp: 6587900 },
        { cod: 'KGIOTTOBTA30U', nom: 'Giotto BT A30 – Barrera 3m 220V/24V uso muy intensivo (Kit)', pvp: 6670900 },
        { cod: 'KGIOTTOBTA60U', nom: 'Giotto BT A60 – Barrera 6m 220V/24V uso muy intensivo (Kit)', pvp: 7862900 },
        { cod: 'KMICHELANGELO30', nom: 'Michelangelo – Barrera 3m 220V apertura 1.3seg (Kit)', pvp: 12890900 },
      ],
      Accesorios: [
        { cod: 'D112306', nom: 'Control Remoto Mitto Cool C2 – 2 canales 433MHz', pvp: 89000 },
        { cod: 'D112318', nom: 'Control Remoto Mitto Cool C4 – 4 canales 433MHz', pvp: 124000 },
        { cod: 'KCMC-10', nom: 'Caja x10 Controles Mitto Cool C2', pvp: 740000 },
        { cod: 'P111526', nom: 'Par Fotoceldas Desme A15 Exterior 30m 24V', pvp: 251000 },
        { cod: 'P111827', nom: 'Fotoceldas Reflecta Reflexión Exterior 12m 24V', pvp: 705000 },
      ],
    },
    NAS: {
      'Levadiza / Seccional': [
        { cod: 'KPOWER700', nom: 'Power 700 – motor garaje residencial 110V', pvp: 770000 },
        { cod: 'KPOWER1000', nom: 'Power 1000 – motor garaje residencial 110V', pvp: 826000 },
        { cod: 'KPOWER1200', nom: 'Power 1200 – motor garaje residencial 110V', pvp: 893000 },
      ],
      Corrediza: [
        { cod: 'KFORZA500-1', nom: 'Forza 500 – 500 kg corrediza 110V', pvp: 999900 },
        { cod: 'KFORZA800-1', nom: 'Forza 800 – 800 kg corrediza 110V', pvp: 1183900 },
        { cod: 'KFORTE800-1', nom: 'Forte 800 – 800 kg corrediza 110V', pvp: 1183900 },
        { cod: 'KFORTE1200-1', nom: 'Forte 1200 – 1200 kg corrediza 110V', pvp: 1314900 },
        { cod: 'KFORTE1500-1', nom: 'Forte 1500 – 1500 kg corrediza 110V', pvp: 1380900 },
        { cod: 'KFORTE800DC-1', nom: 'Forte 800DC – 800 kg con batería 110V/24V', pvp: 1536900 },
        { cod: 'KFORTE800PLUS-1', nom: 'Forte 800 Plus – 800 kg corrediza 110V', pvp: 1183900 },
      ],
      'Batiente 2 hojas': [
        { cod: 'APOLO200-1', nom: 'Apolo 200 – Kit 2 brazos batiente', pvp: 990000 },
        { cod: 'APOLO300-1', nom: 'Apolo 300 – Kit 2 brazos batiente', pvp: 1086000 },
        { cod: 'MAGNO200-1', nom: 'Magno 200 – Kit 2 brazos batiente', pvp: 2135000 },
        { cod: 'POTENZA400-1', nom: 'Potenza 400 – Kit 2 brazos batiente', pvp: 3136000 },
      ],
      'Barrera vehicular': [
        { cod: 'KELECTRADC421', nom: 'Electra DC421 – barrera 3.6m 220V', pvp: 4055000 },
        { cod: 'KELECTRADC656', nom: 'Electra DC656 – barrera 6m 220V', pvp: 4116000 },
      ],
      'Cortina enrollable': [
        { cod: 'KTHOR600-1', nom: 'Thor 600 – cortina industrial hasta 600 kg 110V', pvp: 955000 },
        { cod: 'KODIN500-1', nom: 'Odin 500 – cortina industrial hasta 500 kg 110V', pvp: 969900 },
        { cod: 'HERCULES1600', nom: 'Hércules 1600 – cortina uso interno hasta 150 kg', pvp: 732000 },
      ],
    },
    Elite: {
      'Levadiza / Seccional': [
        { cod: 'AUELMG750', nom: 'Elite MG 750 – ½ HP silencioso' },
      ],
      Corrediza: [
        { cod: 'AUELMC4', nom: 'Elite Slide 400 – 400 kg' },
        { cod: 'AUELMC5', nom: 'Elite Slide 500 – 500 kg' },
        { cod: 'AUELMC8', nom: 'Elite Slide 800 – 800 kg' },
        { cod: 'AUELMC8FV', nom: 'Elite Slide 800 FV – 800 kg con lámpara' },
        { cod: 'AUELMC12', nom: 'Elite Slide 1200 – 1200 kg industrial' },
      ],
      'Batiente 2 hojas': [
        { cod: 'AUELTW25', nom: 'Elite Twist 250 – 2 hojas / 250 kg' },
      ],
      'Cortina enrollable': [
        { cod: 'AUELKME611', nom: 'Elite ME622 – 600 kg 110V' },
        { cod: 'AUELKME624DC', nom: 'Elite Spin 624DC – 600 kg 24V con batería' },
        { cod: 'AUELKME8511', nom: 'Elite Spin ME8511 – 800 kg 110V' },
        { cod: 'AUELKME824DC', nom: 'Elite Spin ME824DC – 800 kg con batería' },
      ],
    },
  };

  /** Precios de venta (PVP) por código — misma fuente para Cotización */
  const PRECIOS_PVP = {
    AUACSC901: 999900,
    AUACFX1000: 799900,
    AUACKFOX1000C: 1049900,
    AUACKFOX1000T: 1149900,
    AUACFX1100WS: 1119900,
    AUACKFOX1050HS: 1219900,
    AUACKFOX1100WS: 1399900,
    AUACSH1000: 1095900,
    AUACRP120: 1399900,
    AUACPUMA1200: 1369900,
    AUACKSC1800C: 1999900,
    AUACKSC1800T: 1999900,
    AUACKPB400: 1099900,
    AUACKBD850: 1599900,
    AUACKBD1100: 1999900,
    AUACKBD1024BL: 3399900,
    AUACKBD1522: 2629900,
    AUACKBD1824BL: 3999900,
    AUACKBD2024: 3599900,
    AUACEG250: 2519900,
    AUACFC300: 2199900,
    AUACFC350: 3749900,
    AUACEG500: 3889900,
    AUACFENIX600: 6719900,
    AUACFC351: 2719900,
    AUACEG501: 2729900,
    AUACFENIX601: 4159900,
    AUACKAR201B: 1249900,
    AUACKAR382B: 1699900,
    AUACKAR201F: 1349900,
    AUACKAR382F: 1889900,
    AUACKHULK500S: 1399900,
    AUACKHULK624DC: 1729900,
    AUACKHULK750: 1999900,
    AUACKHULK950: 2249900,
    AUACKHULK1024DC: 2699900,
    AUACKHULK1500: 4249900,
    AUACMTD224: 2999900,
    AUCKMTD224: 3499900,
    AUACMTD624: 4599900,
    AUACKMTD624: 5399900,
    AUACKMTD624ART: 6199900,
    AUELMG750: 939900,
    AUELMC4: 1069900,
    AUELMC5: 1199900,
    AUELMC8: 1549900,
    AUELMC8FV: 1899900,
    AUELMC12: 1999900,
    AUELTW25: 1799900,
    AUELKME611: 1169900,
    AUELKME624DC: 1649900,
    AUELKME8511: 1759900,
    AUELKME824DC: 2469900,
    'KDEIMOSBTA400-1': 1948900,
    'KDEIMOSBTA600-1': 2391900,
    'KDEIMOSACA600-1': 2960900,
    'KDEIMOSACA600-2': 2960900,
    'KDEIMOSACA800SLDN-1': 3728900,
    'KDEIMOSACA800SLDN-2': 3728900,
    'KARESBTA1000Z18-2': 3539900,
    'KARESBTA1000Z25-2': 3539000,
    'KARESBTA1500Z18-2': 4209900,
    'KARESBTA1500Z25-2': 4402900,
    KICAROSMARTACA2000V: 5522900,
    KICAROSMARTACA2000: 5522900,
    'K2PHOBOSBT-A25': 3278900,
    'K2PHOBOSBT-A40': 3498900,
    'K1PHOBOSBT-A25': 2663900,
    'K1PHOBOSBT-A40': 2995900,
    'K2PHOBOSACA25-AL': 3253900,
    'K2PHOBOSACA25-R': 3823900,
    'K1PHOBOSACA25-AL': 2844900,
    'K1PHOBOSACA25-R': 3170900,
    'K2LUX2B-1': 6413900,
    'K1LUX2B-1': 3875900,
    'K2LUXGV2B-1': 8407900,
    'K1LUXGV2B-1': 4923900,
    'K2GIUNO-BTA20-1': 9709900,
    'K1GIUNO-BTA20-1': 6096900,
    'K2GIUNO-BTA50-1': 10394900,
    'K1GIUNO-BTA50-1': 7024900,
    KMOOVI30: 5383900,
    KMOOVI60: 6587900,
    KGIOTTOBTA30U: 6670900,
    KGIOTTOBTA60U: 7862900,
    KMICHELANGELO30: 12890900,
    D112306: 89000,
    D112318: 124000,
    'KCMC-10': 740000,
    P111526: 251000,
    P111827: 705000,
    KPOWER700: 770000,
    KPOWER1000: 826000,
    KPOWER1200: 893000,
    'KFORZA500-1': 999900,
    'KFORZA800-1': 1183900,
    'KFORTE800-1': 1183900,
    'KFORTE1200-1': 1314900,
    'KFORTE1500-1': 1380900,
    'KFORTE800DC-1': 1536900,
    'KFORTE800PLUS-1': 1183900,
    'APOLO200-1': 990000,
    'APOLO300-1': 1086000,
    'MAGNO200-1': 2135000,
    'POTENZA400-1': 3136000,
    KELECTRADC421: 4055000,
    KELECTRADC656: 4116000,
    'KTHOR600-1': 955000,
    'KODIN500-1': 969900,
    HERCULES1600: 732000,
  };

  /** Códigos legacy → código oficial (catalogo-bft-nas.js) */
  const CODIGO_ALIASES = {
    'KPHOBOBTA25-1': 'K2PHOBOSBT-A25',
    'KPHOBOBTA40-1': 'K2PHOBOSBT-A40',
    'K1PHOBOBTA25-1': 'K1PHOBOSBT-A25',
    'K1PHOBOBTA40-1': 'K1PHOBOSBT-A40',
    FORZA500: 'KFORZA500-1',
    FORZA800: 'KFORZA800-1',
    FORTE800: 'KFORTE800-1',
    FORTE1200: 'KFORTE1200-1',
    FORTE1500: 'KFORTE1500-1',
    FORTE800DC: 'KFORTE800DC-1',
    'FORTE800+': 'KFORTE800PLUS-1',
    'ELECTRA-DC421': 'KELECTRADC421',
    'ELECTRA-DC656': 'KELECTRADC656',
    THOR: 'KTHOR600-1',
    ODIN: 'KODIN500-1',
    HERCULES: 'HERCULES1600',
  };

  function canonicalCodigo(cod) {
    const c = String(cod || '').trim().toUpperCase();
    return CODIGO_ALIASES[c] || c;
  }

  function enrichCatalogoPrecios() {
    Object.values(CATALOGO_MARCAS).forEach((categorias) => {
      Object.values(categorias).forEach((items) => {
        items.forEach((item) => {
          if (item.pvp == null || item.pvp === 0) {
            item.pvp = PRECIOS_PVP[item.cod] || 0;
          }
        });
      });
    });
  }

  const USER_CATALOG_KEY = 'arpa_catalogo_usuario';
  const USER_CATEGORIES_KEY = 'arpa_categorias_usuario';

  function getActiveOficioId() {
    if (global.ArpaMiCatalogo?.getActiveOficioId) {
      return global.ArpaMiCatalogo.getActiveOficioId();
    }
    const active = global.ArpaOficios?.getActiveOficiosFromSettings?.();
    if (Array.isArray(active) && active.length) {
      return global.ArpaOficios.normalizeOficioId(active[0]);
    }
    return 'automatismos';
  }

  function getUserCategoriesRaw(oficioId) {
    const oid = oficioId != null
      ? (global.ArpaOficios?.normalizeOficioId?.(oficioId) || 'automatismos')
      : getActiveOficioId();
    if (global.ArpaMiCatalogo?.getCategories) {
      return global.ArpaMiCatalogo.getCategories(oid);
    }
    try {
      const data = JSON.parse(localStorage.getItem('arpa_categorias_' + oid) || '[]');
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function resolveUserCategoryName(product, oficioId) {
    if (product.categoriaId) {
      const cat = getUserCategoriesRaw(oficioId).find((c) => c.id === product.categoriaId);
      if (cat) return cat.name;
    }
    return (product.categoria || '').trim();
  }

  function getUserProductsRaw(oficioId) {
    const oid = oficioId != null
      ? (global.ArpaOficios?.normalizeOficioId?.(oficioId) || 'automatismos')
      : getActiveOficioId();
    if (global.ArpaMiCatalogo?.getProducts) {
      return global.ArpaMiCatalogo.getProducts(oid);
    }
    try {
      const data = JSON.parse(localStorage.getItem('arpa_catalog_' + oid) || '[]');
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function userProductsToFlat(oficioId) {
    const oid = oficioId != null
      ? (global.ArpaOficios?.normalizeOficioId?.(oficioId) || 'automatismos')
      : getActiveOficioId();
    return getUserProductsRaw(oid)
      .filter((p) => (p.nom || '').trim() && (p.cod || '').trim())
      .map((p) => productToFlatDisplay(p, oid));
  }

  const AUTO_CATEGORY_ALIASES = {
    'Levadiza / Seccional': 'Motores Garaje',
    Corrediza: 'Corredizas',
    'Batiente 2 hojas': 'Motores Batientes',
    'Batiente 1 hoja': 'Motores Batientes',
    'Cortina enrollable': 'Cortinas Enrollables',
    'Barrera vehicular': 'Barreras',
    Accesorios: 'Accesorios',
  };

  function normalizeAutomatismosCategory(raw) {
    const c = String(raw || '').trim();
    if (AUTO_CATEGORY_ALIASES[c]) return AUTO_CATEGORY_ALIASES[c];
    const lower = c.toLowerCase();
    if (lower.includes('garaje') || lower.includes('levadiza') || lower.includes('seccional')) return 'Motores Garaje';
    if (lower.includes('corrediz')) return 'Corredizas';
    if (lower.includes('batiente')) return 'Motores Batientes';
    if (lower.includes('cortina') || lower.includes('enrollable')) return 'Cortinas Enrollables';
    if (lower.includes('barrera')) return 'Barreras';
    if (lower.includes('cabezal') || lower.includes('automaticas')) return 'Cabezales';
    if (lower.includes('accesorio') || lower.includes('tarjeta') || lower.includes('control') || lower.includes('fotocelda')
      || lower.includes('rodamiento') || lower.includes('herraje') || lower.includes('cortina de aire')) {
      return 'Accesorios';
    }
    return c || 'General';
  }

  function splitMarcaNom(nom, marca) {
    const m = (marca || '').trim();
    let n = (nom || '').trim();
    if (m) {
      const stripped = stripMarcaPrefix(n, m);
      if (stripped != null) n = stripped;
      return { marca: m, nom: n };
    }
    const sep = n.search(/\s[–—-]\s/);
    if (sep > 0) {
      return { marca: n.slice(0, sep).trim(), nom: n.slice(sep + 3).trim() };
    }
    return { marca: '', nom: n };
  }

  function stripMarcaPrefix(nom, marca) {
    const n = String(nom || '').trim();
    const m = String(marca || '').trim();
    if (!m || !n) return null;
    const re = new RegExp(`^${m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[–—-]\\s*`, 'i');
    if (re.test(n)) return n.replace(re, '').trim();
    return null;
  }

  function productToFlatDisplay(p, oficioId) {
    const { marca, nom } = splitMarcaNom(p.nom, p.marca);
    return {
      cod: (p.cod || '').trim(),
      nom: marca ? `${marca} – ${nom}` : nom,
      marca,
      categoria: resolveUserCategoryName(p, oficioId),
      pvp: Number(p.pvp) || 0,
      unidad: p.unidad || 'unidad',
      _userId: p.id
    };
  }

  function migrateStoredProductNames() {
    const oid = 'automatismos';
    const products = getUserProductsRaw(oid);
    if (!products.length) return false;
    let changed = false;
    products.forEach((p) => {
      const marca = (p.marca || '').trim();
      if (!marca) return;
      const stripped = stripMarcaPrefix(p.nom, marca);
      if (stripped != null && stripped !== (p.nom || '').trim()) {
        p.nom = stripped;
        changed = true;
      }
    });
    if (!changed) return false;
    try {
      if (global.ArpaMiCatalogo?.saveProducts) {
        global.ArpaMiCatalogo.saveProducts(products, oid);
      } else {
        localStorage.setItem('arpa_catalog_' + oid, JSON.stringify(products));
      }
      invalidateListaCache();
    } catch (e) { /* ignore */ }
    return true;
  }

  function buildAutomatismosSeedProducts() {
    return getListaBaseMerged().map((p) => {
      const { marca, nom } = splitMarcaNom(p.nom, p.marca);
      return {
        cod: p.cod,
        nom,
        marca,
        categoria: normalizeAutomatismosCategory(p.categoria),
        pvp: 0,
        unidad: p.unidad || 'unidad',
      };
    });
  }

  function hasUserCatalog() {
    return userProductsToFlat('automatismos').length > 0;
  }


  function invalidateListaCache() {
    listaPlanaCache = null;
    listaPlanaMergedCache = null;
  }

  function mergeCatalogLists(...lists) {
    const byCode = new Map();
    lists.forEach((list) => {
      list.forEach((p) => {
        const cod = canonicalCodigo(p.cod);
        if (!cod) return;
        byCode.set(cod, { ...p, cod });
      });
    });
    return Array.from(byCode.values());
  }

  function buildListaBftNasExtended() {
    const catalog = global.CATALOGO_BFT_NAS;
    if (!Array.isArray(catalog)) return [];
    return catalog.map((p) => {
      const cod = canonicalCodigo(p.codigo);
      const marca = (p.marca || '').trim();
      const nombre = (p.nombre || '').trim();
      return {
        cod,
        nom: marca ? `${marca} – ${nombre}` : nombre,
        marca,
        categoria: p.categoria || '',
        pvp: Number(p.precio) || 0,
      };
    });
  }

  function findInBftNasCatalog(cod) {
    const catalog = global.CATALOGO_BFT_NAS;
    if (!Array.isArray(catalog)) return null;
    const item = catalog.find((p) => canonicalCodigo(p.codigo) === cod);
    if (!item) return null;
    const marca = (item.marca || '').trim();
    const nombre = (item.nombre || '').trim();
    return {
      cod,
      nom: marca ? `${marca} – ${nombre}` : nombre,
      marca,
      categoria: item.categoria || '',
      pvp: Number(item.precio) || 0,
    };
  }

  function getPrecioVenta(cod, item) {
    if (item?.pvp != null && item.pvp > 0) return item.pvp;
    return PRECIOS_PVP[cod] || 0;
  }

  function getCatalogoMarcas() {
    return CATALOGO_MARCAS;
  }

  enrichCatalogoPrecios();

  let listaPlanaCache = null;
  let listaPlanaMergedCache = null;

  function buildListaDefault() {
    const list = [];
    Object.entries(CATALOGO_MARCAS).forEach(([marca, categorias]) => {
      Object.entries(categorias).forEach(([categoria, items]) => {
        items.forEach((item) => {
          list.push({
            cod: item.cod,
            nom: `${marca} – ${item.nom}`,
            marca,
            categoria,
            pvp: getPrecioVenta(item.cod, item),
          });
        });
      });
    });
    return list;
  }

  function getListaBaseMerged() {
    if (!listaPlanaMergedCache) {
      listaPlanaMergedCache = mergeCatalogLists(
        buildListaDefault(),
        buildListaBftNasExtended()
      );
    }
    return listaPlanaMergedCache;
  }

  function getListaProductos(oficioId) {
    const oid = oficioId != null
      ? (global.ArpaOficios?.normalizeOficioId?.(oficioId) || 'automatismos')
      : getActiveOficioId();
    return getUserProductsRaw(oid)
      .filter((p) => (p.nom || '').trim() && (p.cod || '').trim())
      .map((p) => productToFlatDisplay(p, oid));
  }

  function getListaProductosDefault() {
    if (!listaPlanaCache) listaPlanaCache = buildListaDefault();
    return listaPlanaCache;
  }

  function findRawItem(cod) {
    for (const categorias of Object.values(CATALOGO_MARCAS)) {
      for (const items of Object.values(categorias)) {
        const item = items.find((i) => i.cod === cod);
        if (item) return item;
      }
    }
    return null;
  }

  function getPrecioByCod(cod, oficioId) {
    const canon = canonicalCodigo(cod);
    const oid = oficioId != null
      ? (global.ArpaOficios?.normalizeOficioId?.(oficioId) || 'automatismos')
      : getActiveOficioId();
    const userItem = userProductsToFlat(oid).find(
      (p) => canonicalCodigo(p.cod) === canon
    );
    return userItem ? (Number(userItem.pvp) || 0) : 0;
  }

  function findByCod(cod, oficioId) {
    const canon = canonicalCodigo(cod);
    const oid = oficioId != null
      ? (global.ArpaOficios?.normalizeOficioId?.(oficioId) || 'automatismos')
      : getActiveOficioId();
    return userProductsToFlat(oid).find(
      (p) => canonicalCodigo(p.cod) === canon
    ) || null;
  }

  global.ArpaCatalogo = {
    getCatalogoMarcas,
    getListaProductos,
    getListaProductosDefault,
    buildAutomatismosSeedProducts,
    normalizeAutomatismosCategory,
    productToFlatDisplay,
    migrateStoredProductNames,
    hasUserCatalog,
    findByCod,
    getPrecioVenta,
    getPrecioByCod,
    invalidateListaCache,
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      migrateStoredProductNames();
    });
  } else {
    migrateStoredProductNames();
  }
})(window);
