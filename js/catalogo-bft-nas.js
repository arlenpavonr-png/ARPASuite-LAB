/**
 * Catálogo BFT + NAS (333 productos) — Garajes Prefabricados
 */
(function (global) {
  const OFICIO_AUTOMATISMOS = 'automatismos';
  const ACTIVE_BRAND_KEY = 'arpa_catalogo_marca_activa';
  const LEGACY_CATALOG_KEY = 'arpa_catalogo_usuario';
  const LEGACY_CATEGORIES_KEY = 'arpa_categorias_usuario';

  const BRAND_STORAGE = {
    accessmatic: {
      label: 'Accessmatic',
      productsKey: 'arpa_catalogo_accessmatic',
      categoriesKey: 'arpa_categorias_accessmatic'
    },
    elite: {
      label: 'Elite',
      productsKey: 'arpa_catalogo_elite',
      categoriesKey: 'arpa_categorias_elite'
    },
    bft_nas: {
      label: 'BFT + NAS',
      productsKey: 'arpa_catalogo_bft_nas',
      categoriesKey: 'arpa_categorias_bft_nas'
    },
    ppa: {
      label: 'PPA',
      productsKey: 'arpa_catalogo_ppa',
      categoriesKey: 'arpa_categorias_ppa'
    }
  };

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

  const CATALOGO_BFT_NAS = [
  { codigo: "KDEIMOSBTA400-1", nombre: "Kit BFT Deimos BT A400 110V - Corrediza hasta 400kg Uso Intensivo", precio: 1948900, categoria: "Corredizas BFT", marca: "BFT" },
  { codigo: "KDEIMOSBTA600-1", nombre: "Kit BFT Deimos BT A600 110V - Corrediza hasta 600kg Uso Intensivo", precio: 2391900, categoria: "Corredizas BFT", marca: "BFT" },
  { codigo: "KDEIMOSACA600-1", nombre: "Kit BFT Deimos AC A600 110V - Corrediza hasta 600kg Semi Intensivo", precio: 2960900, categoria: "Corredizas BFT", marca: "BFT" },
  { codigo: "KDEIMOSACA600-2", nombre: "Kit BFT Deimos AC A600 220V - Corrediza hasta 600kg Semi Intensivo", precio: 2960900, categoria: "Corredizas BFT", marca: "BFT" },
  { codigo: "KDEIMOSACA800SLDN-1", nombre: "Kit BFT Deimos AC A800 SL DN 110V - Corrediza hasta 800kg Semi Intensivo", precio: 3728900, categoria: "Corredizas BFT", marca: "BFT" },
  { codigo: "KDEIMOSACA800SLDN-2", nombre: "Kit BFT Deimos AC A800 SL DN 220V - Corrediza hasta 800kg Semi Intensivo", precio: 3728900, categoria: "Corredizas BFT", marca: "BFT" },
  { codigo: "KARESBTA1000Z18-2", nombre: "Kit BFT Ares BT A1000 220V Pinon 18 - Corrediza hasta 1000kg Intensivo", precio: 3539900, categoria: "Corredizas BFT", marca: "BFT" },
  { codigo: "KARESBTA1000Z25-2", nombre: "Kit BFT Ares BT A1000 220V Pinon 25 - Corrediza hasta 500kg 12m/min", precio: 3539900, categoria: "Corredizas BFT", marca: "BFT" },
  { codigo: "KARESBTA1500Z18-2", nombre: "Kit BFT Ares BT A1500 220V Pinon 18 - Corrediza hasta 1500kg Intensivo", precio: 4209900, categoria: "Corredizas BFT", marca: "BFT" },
  { codigo: "KARESBTA1500Z25-2", nombre: "Kit BFT Ares BT A1500 220V Pinon 25 - Corrediza hasta 750kg 12m/min", precio: 4402900, categoria: "Corredizas BFT", marca: "BFT" },
  { codigo: "KICAROSMARTACA2000V", nombre: "Kit BFT Icaro Smart AC A2000V 220V - Corrediza hasta 1000kg Continuo", precio: 5522900, categoria: "Corredizas BFT", marca: "BFT" },
  { codigo: "KICAROSMARTACA2000", nombre: "Kit BFT Icaro Smart AC A2000 220V - Corrediza hasta 2000kg Continuo", precio: 5522900, categoria: "Corredizas BFT", marca: "BFT" },
  { codigo: "KSP3500-2", nombre: "Kit BFT SP3500 220V/440V - Corrediza hasta 3500kg Industrial Continuo", precio: 20606900, categoria: "Corredizas BFT", marca: "BFT" },
  { codigo: "KARESSMARTBTA500VZ25-2", nombre: "Kit BFT Ares BT A500V Veloce 220V - Corrediza hasta 500kg 25m/min", precio: 4871900, categoria: "Corredizas BFT", marca: "BFT" },
  { codigo: "KICAROSMARTACA1000VZ25-2", nombre: "Kit BFT Icaro Smart AC A1000V Veloce 220V - Corrediza hasta 1000kg 25m/min", precio: 6764900, categoria: "Corredizas BFT", marca: "BFT" },
  { codigo: "KSL600", nombre: "Kit LiftMaster SL600 - Corrediza hasta 600kg 8m myQ", precio: 2592000, categoria: "Corredizas BFT", marca: "LiftMaster" },
  { codigo: "K2PHOBOSBT-A25", nombre: "Kit 2 Brazos BFT Phobos BT A25 110V/24V - Batiente hasta 400kg 2.5m Intensivo", precio: 3278900, categoria: "Batientes Electromec BFT", marca: "BFT" },
  { codigo: "K2PHOBOSBT-A40", nombre: "Kit 2 Brazos BFT Phobos BT A40 110V/24V - Batiente hasta 500kg 4m Intensivo", precio: 3498900, categoria: "Batientes Electromec BFT", marca: "BFT" },
  { codigo: "K2PHOBOSBT-B35V", nombre: "Kit 2 Brazos BFT Phobos BT B35 Veloce 220V/24V - Batiente hasta 450kg 3m apertura 10seg", precio: 4293900, categoria: "Batientes Electromec BFT", marca: "BFT" },
  { codigo: "K2PHOBOSACA25-AL", nombre: "Kit 2 Brazos BFT Phobos AC A25 110V Tarj.Alena - Batiente hasta 400kg 2.5m", precio: 3253900, categoria: "Batientes Electromec BFT", marca: "BFT" },
  { codigo: "K2PHOBOSACA25-R", nombre: "Kit 2 Brazos BFT Phobos AC A25 110V Tarj.Rigel 6 - Batiente hasta 400kg 2.5m", precio: 3823900, categoria: "Batientes Electromec BFT", marca: "BFT" },
  { codigo: "K1PHOBOSACA25-AL", nombre: "Kit 1 Brazo BFT Phobos AC A25 110V Tarj.Alena - Batiente hasta 400kg 2.5m", precio: 2844900, categoria: "Batientes Electromec BFT", marca: "BFT" },
  { codigo: "K1PHOBOSACA25-R", nombre: "Kit 1 Brazo BFT Phobos AC A25 110V Tarj.Rigel 6 - Batiente hasta 400kg 2.5m", precio: 3170900, categoria: "Batientes Electromec BFT", marca: "BFT" },
  { codigo: "K1PHOBOSBT-A25", nombre: "Kit 1 Brazo BFT Phobos BT A25 110V/24V - Batiente hasta 400kg 2.5m Intensivo", precio: 2663900, categoria: "Batientes Electromec BFT", marca: "BFT" },
  { codigo: "K1PHOBOSBT-A40", nombre: "Kit 1 Brazo BFT Phobos BT A40 110V/24V - Batiente hasta 500kg 4m Intensivo", precio: 2995900, categoria: "Batientes Electromec BFT", marca: "BFT" },
  { codigo: "R935339-00001", nombre: "Kit 2 Brazos BFT Athos AC A25 110V - Batiente hasta 400kg 2.5m Semi Intensivo", precio: 3079900, categoria: "Batientes Electromec BFT", marca: "BFT" },
  { codigo: "P935098-00001", nombre: "Brazo BFT Phobos AC A25 110V unidad - hasta 400kg 2.5m", precio: 1486900, categoria: "Batientes Electromec BFT", marca: "BFT" },
  { codigo: "P935129-00002", nombre: "Brazo BFT Phobos BT A25 110V/24V unidad - hasta 400kg 2.5m", precio: 1430900, categoria: "Batientes Electromec BFT", marca: "BFT" },
  { codigo: "P935130-00002", nombre: "Brazo BFT Phobos BT A40 110V/24V unidad - hasta 500kg 4m", precio: 1686900, categoria: "Batientes Electromec BFT", marca: "BFT" },
  { codigo: "P935131-00002", nombre: "Brazo BFT Phobos BT B35 Veloce 220V/24V unidad - hasta 450kg 3m", precio: 2229900, categoria: "Batientes Electromec BFT", marca: "BFT" },
  { codigo: "K2LUX2B-1", nombre: "Kit 2 Brazos Hidraulicos BFT Lux 2B 110V Rigel 6 - Batiente hasta 300kg 2.5m", precio: 6413900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "K2LUX2B-2", nombre: "Kit 2 Brazos Hidraulicos BFT Lux 2B 220V Rigel 6 - Batiente hasta 300kg 2.5m", precio: 6413900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "K2LUX2B-1-A", nombre: "Kit 2 Brazos Hidraulicos BFT Lux 2B 110V Alcor - Batiente hasta 300kg 2.5m", precio: 6134900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "K2LUX2B-2-A", nombre: "Kit 2 Brazos Hidraulicos BFT Lux 2B 220V Alcor - Batiente hasta 300kg 2.5m", precio: 6134900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "K2LUXGV2B-1", nombre: "Kit 2 Brazos Hidraulicos BFT Lux GV 2B 110V Rigel 6 - Batiente hasta 300kg 3.5m", precio: 8407900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "K2LUXGV2B-2", nombre: "Kit 2 Brazos Hidraulicos BFT Lux GV 2B 220V Rigel 6 - Batiente hasta 300kg 3.5m", precio: 8407900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "K2LUXGV2B-1-A", nombre: "Kit 2 Brazos Hidraulicos BFT Lux GV 2B 110V Alcor - Batiente hasta 300kg 3.5m", precio: 8106900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "K2LUXGV2B-2-A", nombre: "Kit 2 Brazos Hidraulicos BFT Lux GV 2B 220V Alcor - Batiente hasta 300kg 3.5m", precio: 8106900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "K2GIUNO-BTA20-1", nombre: "Kit 2 Brazos Hidraulicos BFT Giuno Ultra BT A20 24V - Batiente hasta 300kg 2.5m Continuo", precio: 9709900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "K2GIUNO-BTA50-1", nombre: "Kit 2 Brazos Hidraulicos BFT Giuno Ultra BT A50 24V - Batiente hasta 800kg 5m Continuo", precio: 10394900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "K1LUX2B-1", nombre: "Kit 1 Brazo Hidraulico BFT Lux 2B 110V Rigel 6 - Batiente hasta 300kg 2.5m", precio: 3875900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "K1LUX2B-2", nombre: "Kit 1 Brazo Hidraulico BFT Lux 2B 220V Rigel 6 - Batiente hasta 300kg 2.5m", precio: 3875900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "K1LUX2B-1-A", nombre: "Kit 1 Brazo Hidraulico BFT Lux 2B 110V Alcor - Batiente hasta 300kg 2.5m", precio: 3596900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "K1LUX2B-2-A", nombre: "Kit 1 Brazo Hidraulico BFT Lux 2B 220V Alcor - Batiente hasta 300kg 2.5m", precio: 3596900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "K1LUXGV2B-1", nombre: "Kit 1 Brazo Hidraulico BFT Lux GV 2B 110V Rigel 6 - Batiente hasta 300kg 3.5m", precio: 4923900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "K1LUXGV2B-2", nombre: "Kit 1 Brazo Hidraulico BFT Lux GV 2B 220V Rigel 6 - Batiente hasta 300kg 3.5m", precio: 4923900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "K1LUXGV2B-1-A", nombre: "Kit 1 Brazo Hidraulico BFT Lux GV 2B 110V Alcor - Batiente hasta 300kg 3.5m", precio: 4292900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "K1LUXGV2B-2-A", nombre: "Kit 1 Brazo Hidraulico BFT Lux GV 2B 220V Alcor - Batiente hasta 300kg 3.5m", precio: 4292900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "K1GIUNO-BTA20-1", nombre: "Kit 1 Brazo Hidraulico BFT Giuno Ultra BT A20 24V - Batiente hasta 300kg 2.5m", precio: 6096900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "K1GIUNO-BTA50-1", nombre: "Kit 1 Brazo Hidraulico BFT Giuno Ultra BT A50 24V - Batiente hasta 800kg 5m", precio: 7024900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "P935011-00016", nombre: "Brazo Hidraulico BFT Lux 2B 110V unidad - hasta 350kg 2.5m", precio: 2733900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "P935011-00001", nombre: "Brazo Hidraulico BFT Lux 2B 220V unidad - hasta 350kg 2.5m", precio: 2733900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "P935105-00001", nombre: "Brazo Hidraulico BFT Giuno Ultra BT A20 24V unidad - hasta 300kg 2.5m", precio: 4335900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "P935106-00001", nombre: "Brazo Hidraulico BFT Giuno Ultra BT A50 24V unidad - hasta 800kg 5m", precio: 4746900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "P935118-00001", nombre: "Brazo Hidraulico BFT Lux GV 2B 110V unidad - hasta 350kg 4m", precio: 3483900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "P935014-00005", nombre: "Brazo Hidraulico BFT Lux GV 2B 220V unidad - hasta 350kg 4m", precio: 3483900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "P935061-00001", nombre: "Brazo Hidraulico BFT P4.5 220V unidad - hasta 500kg 4.5m Reversible", precio: 4983900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "P935060-00001", nombre: "Brazo Hidraulico BFT P7 220V unidad - hasta 500kg 7m Reversible", precio: 5149900, categoria: "Batientes Hidraulicos BFT", marca: "BFT" },
  { codigo: "KMOOVI30", nombre: "Barrera BFT Moovi 30 220V - Paso util 3m Intensivo 4seg", precio: 5383900, categoria: "Barreras BFT", marca: "BFT" },
  { codigo: "KMOOVI60", nombre: "Barrera BFT Moovi 60 220V - Paso util 6m Intensivo 8seg", precio: 6587900, categoria: "Barreras BFT", marca: "BFT" },
  { codigo: "KGIOTTOBTA30U", nombre: "Barrera BFT Giotto BT A30U 220V/24V - Paso util 3m Muy Intensivo 4seg", precio: 6670900, categoria: "Barreras BFT", marca: "BFT" },
  { codigo: "KGIOTTOBTA60U", nombre: "Barrera BFT Giotto BT A60U 220V/24V - Paso util 6m Muy Intensivo 5seg", precio: 7862900, categoria: "Barreras BFT", marca: "BFT" },
  { codigo: "KMICHELANGELO60BT", nombre: "Barrera BFT Michelangelo 60BT 220V/24V - Paso util 6m Continuo 6seg", precio: 11256000, categoria: "Barreras BFT", marca: "BFT" },
  { codigo: "KMICHELANGELO80BT", nombre: "Barrera BFT Michelangelo 80BT 220V/24V - Paso util 8m Continuo 8seg", precio: 13627000, categoria: "Barreras BFT", marca: "BFT" },
  { codigo: "KVISTASLKA100R-SMART-2", nombre: "Puerta Automatica BFT Vista SLK A100R Smart 4.40m 220V - 2 hojas hasta 80kg", precio: 7690900, categoria: "Cabezales Automaticas BFT", marca: "BFT" },
  { codigo: "KVISTASLKA100R-SMART-3", nombre: "Puerta Automatica BFT Vista SLK A100R Smart 3.00m 220V - 1 hoja hasta 100kg", precio: 6912900, categoria: "Cabezales Automaticas BFT", marca: "BFT" },
  { codigo: "KVISTASLKA150R-SMART-1", nombre: "Puerta Automatica BFT Vista SL A150R Smart 220V/24V - 2 hojas 120kg apertura 2.9m", precio: 15532000, categoria: "Cabezales Automaticas BFT", marca: "BFT" },
  { codigo: "KVISTASLKA150R-SMART-2", nombre: "Puerta Automatica BFT Vista SLK A150R Smart 220V/24V con sensores OA-AXIS II", precio: 15333000, categoria: "Cabezales Automaticas BFT", marca: "BFT" },
  { codigo: "KVISTATL440", nombre: "Puerta Automatica BFT Vista TL-440 220V/24V - 4 hojas 80kg apertura 4m 2m/s", precio: 34940000, categoria: "Cabezales Automaticas BFT", marca: "BFT" },
  { codigo: "KVISTATL226", nombre: "Puerta Automatica BFT Vista TL-226 220V/24V - 2 hojas 120kg apertura 2.65m", precio: 31514000, categoria: "Cabezales Automaticas BFT", marca: "BFT" },
  { codigo: "KVISTASW260", nombre: "Puerta Automatica BFT Vista SW 260 220V/24V - Batiente seccional hasta 250kg", precio: 9057000, categoria: "Cabezales Automaticas BFT", marca: "BFT" },
  { codigo: "KVISTASW350", nombre: "Puerta Automatica BFT Vista SW 350 220V/24V - Batiente seccional hasta 350kg", precio: 10206000, categoria: "Cabezales Automaticas BFT", marca: "BFT" },
  { codigo: "P910042-00002", nombre: "Motorreductor BFT Wind RMB 130B EF 220V - Cortina enrollable hasta 6m Par 130Nm", precio: 1068900, categoria: "Cortinas Enrollables BFT", marca: "BFT" },
  { codigo: "P910044-00002", nombre: "Motorreductor BFT Wind RMB 170B EF 220V - Cortina enrollable hasta 6m Par 170Nm", precio: 1494900, categoria: "Cortinas Enrollables BFT", marca: "BFT" },
  { codigo: "P910053-00002", nombre: "Motorreductor BFT Wind AC A230/240-76 EF 220V - Cortina eje 76mm Par 226Nm", precio: 2200900, categoria: "Cortinas Enrollables BFT", marca: "BFT" },
  { codigo: "P910046-00002", nombre: "Motorreductor BFT Wind RMB 350B EF 220V - Cortina enrollable hasta 6m Par 357Nm", precio: 2600900, categoria: "Cortinas Enrollables BFT", marca: "BFT" },
  { codigo: "P910054-00002", nombre: "Motorreductor BFT Wind AC A470/240-76 EF 220V - Cortina eje 76mm Par 476Nm", precio: 2841000, categoria: "Cortinas Enrollables BFT", marca: "BFT" },
  { codigo: "D114092-00001", nombre: "Tarjeta BFT Alcor AC A 110V - Para brazos hidraulicos Lux y P4.5 P7", precio: 1244900, categoria: "Tarjetas Electronicas BFT", marca: "BFT" },
  { codigo: "D114092-00002", nombre: "Tarjeta BFT Alcor AC A 220V - Para brazos hidraulicos Lux y P4.5 P7", precio: 1244900, categoria: "Tarjetas Electronicas BFT", marca: "BFT" },
  { codigo: "D113811-00003", nombre: "Tarjeta BFT Alena SW2 CPEM 110V - Para brazos electromec Athos AC y Phobos AC", precio: 1572900, categoria: "Tarjetas Electronicas BFT", marca: "BFT" },
  { codigo: "D113747-00001", nombre: "Tarjeta BFT Thalia P 110V/24V - Para brazos hidraulicos Giuno BT y Lux BT", precio: 2744900, categoria: "Tarjetas Electronicas BFT", marca: "BFT" },
  { codigo: "D113747-00002", nombre: "Tarjeta BFT Thalia P 220V/24V - Para brazos hidraulicos Giuno BT y Lux BT", precio: 2744900, categoria: "Tarjetas Electronicas BFT", marca: "BFT" },
  { codigo: "D114215-00002", nombre: "Tarjeta BFT Thalia BT A80 Duo 220V/24V - Para brazos Phobos BT B35 Veloce", precio: 1572900, categoria: "Tarjetas Electronicas BFT", marca: "BFT" },
  { codigo: "D113833-00001", nombre: "Tarjeta BFT Rigel 6 110V - Para brazos hidraulicos y Phobos AC", precio: 1635900, categoria: "Tarjetas Electronicas BFT", marca: "BFT" },
  { codigo: "D113833-00002", nombre: "Tarjeta BFT Rigel 6 220V - Para brazos hidraulicos y Phobos AC", precio: 1635900, categoria: "Tarjetas Electronicas BFT", marca: "BFT" },
  { codigo: "D113796-00001", nombre: "Tarjeta BFT Zara BT L2 110V/24V - Para brazos Phobos BT A25 y BT A40", precio: 1521900, categoria: "Tarjetas Electronicas BFT", marca: "BFT" },
  { codigo: "D113804-00002", nombre: "Tarjeta BFT Shyra 220V - Para barreras Moovi 30 y Moovi 60", precio: 1235000, categoria: "Tarjetas Electronicas BFT", marca: "BFT" },
  { codigo: "D114183-00002", nombre: "Tarjeta BFT Luna AC B 220V - Para motores Wind RMB cortinas enrollables", precio: 491000, categoria: "Tarjetas Electronicas BFT", marca: "BFT" },
  { codigo: "CRG001", nombre: "Cremallera Acero Galvanizado NAS 1m 30x12mm Modulo 4 con pernos", precio: 61000, categoria: "Accesorios BFT", marca: "NAS" },
  { codigo: "CRG003", nombre: "Cremallera Acero Galvanizado NAS CFZ 2m 22x22mm Modulo 4", precio: 150000, categoria: "Accesorios BFT", marca: "NAS" },
  { codigo: "CRG004", nombre: "Cremallera Acero Galvanizado NAS CFZ6 2m 30x30mm Modulo 6", precio: 437000, categoria: "Accesorios BFT", marca: "NAS" },
  { codigo: "CRP002", nombre: "Cremallera Plastica NAS", precio: 57000, categoria: "Accesorios BFT", marca: "NAS" },
  { codigo: "D112306", nombre: "Control Remoto BFT Mitto Cool C2 2 canales 433MHz Bateria 3V", precio: 89000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "D112318", nombre: "Control Remoto BFT Mitto Cool C4 4 canales 433MHz Bateria 12V", precio: 124000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "KCMC-10", nombre: "Caja x10 Controles BFT Mitto Cool C2 2 canales 433MHz", precio: 740000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "P111526", nombre: "Par Fotoceldas BFT Desme A15 Autoalineantes Exterior 30m 24V", precio: 251000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "P111827", nombre: "Fotoceldas BFT Reflecta Reflexion Exterior 12m 24V con reflector", precio: 705000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "P111683", nombre: "Par Fotoceldas BFT FPA1 Laterales 10m", precio: 877000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "P111258", nombre: "Par Fotoceldas BFT Thea A15 con luz intermitente Exterior 30m solo BFT", precio: 472000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "P111714", nombre: "Par Fotoceldas BFT Thea A15 con luz intermitente Exterior 30m universal", precio: 472000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "P111662", nombre: "Sensor BFT VIO-M Activacion Monodireccional Compacto para cabezales", precio: 1113000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "P111754", nombre: "Sensor BFT OA-203C Doble Tecnologia Movimiento y Presencia puertas automaticas", precio: 1051000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "P111751", nombre: "Sensor BFT OA-AXIS II Doble Tecnologia Movimiento y Presencia angulo regulable", precio: 1513000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "P120017", nombre: "Kit Baterias BFT BAT KIT 1 Para barreras Moovi y Giotto", precio: 556000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "P125020", nombre: "Kit Bateria Emergencia BFT BBT BAT Para tarjeta Thalia y Thalia P", precio: 649000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "P125035", nombre: "Kit Baterias BFT SL BAT2 Para Deimos BT A400 A600 y Ares BT A1000 A1500", precio: 509000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "P125009", nombre: "Kit Baterias BFT BT BAT2 Para motores Ares", precio: 496000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "D113674-00001", nombre: "Tarjeta Receptora Exterior BFT Clonix 2E 433MHz para 128 controles", precio: 439900, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "D111662", nombre: "Tarjeta Receptora BFT Clonix 2 433MHz para 128 controles interior", precio: 381000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "D113632", nombre: "Antena BFT AEL 433 con 4m de cable", precio: 127000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "P121023", nombre: "Selector Llave Antivandalismo BFT Q.BO KEY WM AV Exterior metal", precio: 155000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "P121024", nombre: "Botonera Digital Inalambrica BFT Q.BO Touch 433MHz 10 canales 100 codigos", precio: 476000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "D121611", nombre: "Botonera Exterior BFT SPC 2 funciones Abrir Cerrar", precio: 130000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "D114093-00001", nombre: "Lampara Intermitente BFT Radius LED AC A R1 110V", precio: 302000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "D114093-00002", nombre: "Lampara Intermitente BFT Radius LED AC A R1 220V", precio: 324000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "D114093-00003", nombre: "Lampara BFT Radius LED BT A R1 24V", precio: 331000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "385251", nombre: "Semaforo Bicolor BFT Parky Light Rojo Verde 220V con soportes barrera", precio: 1714000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "P123032-110V", nombre: "Electrocerradura BFT EBP AC A 110V Vertical con 2 llaves", precio: 380000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "P123032-220V", nombre: "Electrocerradura BFT EBP AC A 220V Vertical con 2 llaves", precio: 380000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "P123032-24V", nombre: "Electrocerradura BFT EBP BT A 24V Vertical con 2 llaves", precio: 565000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "N999471", nombre: "Panel Solar BFT Ecosol Panel 35W 24V Compatible automatismos 24V", precio: 568000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "D113731", nombre: "Interfaz BFT Ecosol Box 24V Solar con 2 baterias 12V 7.2Ah y receptor 433MHz", precio: 1655000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "D113732", nombre: "Expansion Baterias BFT Ecosol Double 2 baterias 12V 7.2Ah para Ecosol Box", precio: 1123000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "KECERRADURA-V9083-HOR", nombre: "Electrocerradura Viro V9083 Horizontal 12V Apertura hacia dentro version grande", precio: 651000, categoria: "Accesorios BFT", marca: "Viro" },
  { codigo: "KECERRADURA-V9083-VER", nombre: "Electrocerradura Viro V9083 Vertical 12V Apertura hacia dentro version grande", precio: 626000, categoria: "Accesorios BFT", marca: "Viro" },
  { codigo: "KECERRADURA-V06-HOR", nombre: "Electrocerradura Viro V06 Horizontal 12V Antirruido Apertura hacia dentro pequeña", precio: 572000, categoria: "Accesorios BFT", marca: "Viro" },
  { codigo: "KECERRADURA-V06-VER", nombre: "Electrocerradura Viro V06 Vertical 12V Antirruido Apertura hacia dentro pequeña", precio: 547000, categoria: "Accesorios BFT", marca: "Viro" },
  { codigo: "KLIGHTPCAN3", nombre: "Kit Luces BFT Light para astas barreras Moovi Giotto hasta 3m", precio: 725000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "KLIGHT1PCAN6", nombre: "Kit Luces BFT Light1 para astas barreras Moovi Giotto hasta 6m", precio: 1046000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "N728051", nombre: "Kit Articulacion BFT ART 90Q Para Moovi 30 Giotto 30BT apertura max 4m", precio: 2377000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "N728038", nombre: "Asta Redonda BFT AT6 6m Aluminio con reflectivos para Moovi Giotto", precio: 1021000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "N728033", nombre: "Asta Rectangular BFT AQ3 3m Aluminio con reflectivos para Moovi Giotto", precio: 508000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "N728034", nombre: "Asta Rectangular BFT AQ5 5m Aluminio con reflectivos para Moovi Giotto", precio: 823000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "D113722", nombre: "Selector de Funciones BFT Vista SEL Para puertas automaticas Vista", precio: 484900, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "P111768", nombre: "Bateria de Respaldo BFT BBV SL Vista SL", precio: 800000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "N733408", nombre: "Electrobloqueo BFT ERV Para puertas Vista SL Vista SL E y Vista TL", precio: 513000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "N574039", nombre: "Caja Empotrable BFT Box Para mecanismo desbloqueo cable acero mando electrico", precio: 183000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "D111013", nombre: "Tarjeta Transformadora BFT ME 220V 12V Para electrocerradura Yale con Alcor N Altair P", precio: 243000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "P111001-00003", nombre: "Detector Cuerpos Metalicos BFT RME2 Bicanal 220V con zocalo instalacion", precio: 1342000, categoria: "Accesorios BFT", marca: "BFT" },
  { codigo: "KPOWER700", nombre: "Motor NAS Power 700 1/2HP 110V - Garaje residencial cadena 24V con bateria", precio: 770000, categoria: "Motores Garaje NAS", marca: "NAS" },
  { codigo: "KPOWER1000", nombre: "Motor NAS Power 1000 3/4HP 110V - Garaje residencial cadena 24V con bateria", precio: 826000, categoria: "Motores Garaje NAS", marca: "NAS" },
  { codigo: "KPOWER1200", nombre: "Motor NAS Power 1200 1HP 110V - Garaje residencial cadena 24V con bateria", precio: 893000, categoria: "Motores Garaje NAS", marca: "NAS" },
  { codigo: "NP027", nombre: "Control Remoto NAS NP027 Wireless 433MHz 3 canales Para Power 700 1000 1200", precio: 39000, categoria: "Accesorios NAS", marca: "NAS" },
  { codigo: "NP028", nombre: "Control Remoto Lujo NAS NP028 Wireless 433MHz 3 canales Para Power 700 1000 1200", precio: 46000, categoria: "Accesorios NAS", marca: "NAS" },
  { codigo: "NP043", nombre: "Fotocelda Universal NAS NP043 12-24V", precio: 94900, categoria: "Accesorios NAS", marca: "NAS" },
  { codigo: "NP032", nombre: "Coche Trolley Metalico NAS Para motores Power 700 1000 1200", precio: 39000, categoria: "Accesorios NAS", marca: "NAS" },
  { codigo: "NP026", nombre: "Botonera Inalambrica NAS NP026 433MHz 3 canales Para Power 700 1000 1200", precio: 42000, categoria: "Accesorios NAS", marca: "NAS" },
  { codigo: "NP025", nombre: "Extension 1m de Riel NAS Para motores Power 700 1000 1200", precio: 131000, categoria: "Accesorios NAS", marca: "NAS" },
  { codigo: "NP034", nombre: "Lampara NAS NP034 Luz Intermitente 12-240V AC DC", precio: 92000, categoria: "Accesorios NAS", marca: "NAS" },
  { codigo: "NP035", nombre: "Bateria Respaldo Litio NAS NP035 Para Motor Power 700 1000 1200", precio: 223000, categoria: "Accesorios NAS", marca: "NAS" },
  { codigo: "NP036", nombre: "Bateria Respaldo Acido Plomo NAS NP036 Para Motor Power 700 1000 1200", precio: 131000, categoria: "Accesorios NAS", marca: "NAS" },
  { codigo: "NP037", nombre: "Soporte Lateral de Baterias NAS NP037", precio: 24000, categoria: "Accesorios NAS", marca: "NAS" },
  { codigo: "NP038", nombre: "Botonera Inalambrica NAS Rectangular para Motores Power", precio: 105791, categoria: "Accesorios NAS", marca: "NAS" },
  { codigo: "NP039", nombre: "Botonera Digital Inalambrica NAS para Motores Power", precio: 112931, categoria: "Accesorios NAS", marca: "NAS" },
  { codigo: "NP040", nombre: "Modulo WiFi USB NAS para Motores Power", precio: 149900, categoria: "Accesorios NAS", marca: "NAS" },
  { codigo: "NF031", nombre: "Receptora Universal NAS NF031 4 canales 433MHz con 2 controles Para corredizas batientes y barreras", precio: 157900, categoria: "Accesorios NAS", marca: "NAS" },
  { codigo: "KFORZA500-1", nombre: "Motor NAS Forza 500 110V - Corrediza hasta 500kg 12m/min Semi Intensivo", precio: 999900, categoria: "Corredizas NAS", marca: "NAS" },
  { codigo: "KFORZA500-2", nombre: "Motor NAS Forza 500 220V - Corrediza hasta 500kg 12m/min Semi Intensivo", precio: 999900, categoria: "Corredizas NAS", marca: "NAS" },
  { codigo: "KFORZA800-1", nombre: "Motor NAS Forza 800 110V - Corrediza hasta 800kg 13m/min Semi Intensivo", precio: 1183900, categoria: "Corredizas NAS", marca: "NAS" },
  { codigo: "KFORZA800-2", nombre: "Motor NAS Forza 800 220V - Corrediza hasta 800kg 13m/min Semi Intensivo", precio: 1218900, categoria: "Corredizas NAS", marca: "NAS" },
  { codigo: "KFORZA800-1-Z26", nombre: "Motor NAS Forza 800 110V Pinon 26 - Corrediza hasta 400kg 18m/min", precio: 1253900, categoria: "Corredizas NAS", marca: "NAS" },
  { codigo: "KFORTE800-1", nombre: "Motor NAS Forte 800 110V - Corrediza hasta 800kg 14m/min Semi Intensivo", precio: 1183900, categoria: "Corredizas NAS", marca: "NAS" },
  { codigo: "KFORTE1200-1", nombre: "Motor NAS Forte 1200 110V - Corrediza hasta 1200kg 14m/min Semi Intensivo", precio: 1314900, categoria: "Corredizas NAS", marca: "NAS" },
  { codigo: "KFORTE1500-1", nombre: "Motor NAS Forte 1500 110V - Corrediza hasta 1500kg 14m/min Semi Intensivo", precio: 1380900, categoria: "Corredizas NAS", marca: "NAS" },
  { codigo: "KFORTE800DC-1", nombre: "Motor NAS Forte 800DC 110V/24V - Corrediza hasta 800kg 14m/min con bateria respaldo", precio: 1536900, categoria: "Corredizas NAS", marca: "NAS" },
  { codigo: "KFORTE800PLUS-1", nombre: "Motor NAS Forte 800 Plus 110V - Corrediza hasta 800kg 14m/min Semi Intensivo", precio: 1183900, categoria: "Corredizas NAS", marca: "NAS" },
  { codigo: "YKF09", nombre: "Control Remoto NAS YKF09 Wireless 433MHz Para Forza 500 y Forza 800 v2", precio: 31000, categoria: "Accesorios NAS", marca: "NAS" },
  { codigo: "NKZ01", nombre: "Control Remoto NAS NKZ01 Wireless 433MHz Para motores Zeus Kratos y Apolo", precio: 31000, categoria: "Accesorios NAS", marca: "NAS" },
  { codigo: "NKZ02", nombre: "Control Remoto NAS NKZ02 Wireless 433MHz Para motores Zeus Kratos y Apolo", precio: 31000, categoria: "Accesorios NAS", marca: "NAS" },
  { codigo: "NKZ03", nombre: "Tarjeta Electronica NAS NKZ03 110V Para motores Zeus y Kratos", precio: 243000, categoria: "Accesorios NAS", marca: "NAS" },
  { codigo: "NKZ04", nombre: "Tarjeta Electronica NAS NKZ04 220V Para motores Zeus y Kratos", precio: 243000, categoria: "Accesorios NAS", marca: "NAS" },
  { codigo: "MAGNO200-1", nombre: "Kit 2 Brazos NAS Magno 200 110V/24V - Batiente hasta 200kg 2.5m Intensivo", precio: 2135000, categoria: "Batientes NAS", marca: "NAS" },
  { codigo: "POTENZA400-1", nombre: "Kit 2 Brazos NAS Potenza 400 110V/24V - Batiente hasta 350kg 4m Intensivo", precio: 3136000, categoria: "Batientes NAS", marca: "NAS" },
  { codigo: "APOLO200-1", nombre: "Kit 2 Brazos NAS Apolo 200 110V/24V - Batiente hasta 200kg 2.5m Intensivo", precio: 990000, categoria: "Batientes NAS", marca: "NAS" },
  { codigo: "APOLO300-1", nombre: "Kit 2 Brazos NAS Apolo 300 110V/24V - Batiente hasta 300kg 3m Intensivo", precio: 1086000, categoria: "Batientes NAS", marca: "NAS" },
  { codigo: "PR3-001", nombre: "Control Remoto NAS TMT3 433MHz Para Forza BT Magno 200 y Potenza 400", precio: 97000, categoria: "Accesorios NAS", marca: "NAS" },
  { codigo: "SP-4001-002", nombre: "Bateria Respaldo NAS SP-4001-002 Para Magno 200 y Potenza 400", precio: 181000, categoria: "Accesorios NAS", marca: "NAS" },
  { codigo: "CB210", nombre: "Tarjeta Electronica NAS CB210 110V/24V Para brazos Magno 200 y Potenza 400", precio: 811000, categoria: "Accesorios NAS", marca: "NAS" },
  { codigo: "KELECTRADC421", nombre: "Barrera NAS Electra DC421 220V - Paso util 3.6m Continuo 1.5seg mas de 1000000 ciclos", precio: 4055000, categoria: "Barreras NAS", marca: "NAS" },
  { codigo: "KELECTRADC656", nombre: "Barrera NAS Electra DC656 220V - Paso util 6m Intensivo 55.5seg mas de 1000000 ciclos", precio: 4116000, categoria: "Barreras NAS", marca: "NAS" },
  { codigo: "NE001-R", nombre: "Asta Rectangular NAS con reflectivos 3.6m Para barreras Electra", precio: 509000, categoria: "Barreras NAS", marca: "NAS" },
  { codigo: "NE002-R", nombre: "Asta Rectangular NAS con reflectivos 6m Para barreras Electra", precio: 621000, categoria: "Barreras NAS", marca: "NAS" },
  { codigo: "KMBS90", nombre: "Puerta Automatica NAS MBS90 110V 220V - 2 hojas 100kg o 1 hoja 130kg apertura 2.1m Continuo", precio: 5366000, categoria: "Cabezales Automaticas NAS", marca: "NAS" },
  { codigo: "KMBS90-2", nombre: "Puerta Automatica NAS MBS90 con sensores OPTEX AO-203 - 2 hojas 100kg apertura 2.1m", precio: 6248000, categoria: "Cabezales Automaticas NAS", marca: "NAS" },
  { codigo: "MBS-QP02", nombre: "Puerta Automatica Batiente NAS MBS-QP02 110V 220V - Hojas 60-120cm hasta 100kg apertura 120 grados", precio: 2850000, categoria: "Cabezales Automaticas NAS", marca: "NAS" },
  { codigo: "M-027", nombre: "Selector y Programador Cableado NAS Para puerta automatica MBS90", precio: 706000, categoria: "Cabezales Automaticas NAS", marca: "NAS" },
  { codigo: "M-002", nombre: "Sensor de Movimiento NAS Para puerta automatica MBS90", precio: 392000, categoria: "Cabezales Automaticas NAS", marca: "NAS" },
  { codigo: "M-059", nombre: "Par Guias Inferiores NAS Para puerta automatica MBS90", precio: 132000, categoria: "Cabezales Automaticas NAS", marca: "NAS" },
  { codigo: "KTHOR600-1", nombre: "Motor NAS Thor 600 110V - Cortina enrollable industrial hasta 600kg", precio: 955000, categoria: "Cortinas Enrollables NAS", marca: "NAS" },
  { codigo: "KTHOR800-1", nombre: "Motor NAS Thor 800 110V - Cortina enrollable industrial hasta 800kg", precio: 1219000, categoria: "Cortinas Enrollables NAS", marca: "NAS" },
  { codigo: "NT001", nombre: "Receptora NAS NT001 para motores Thor con 2 controles 433MHz y entrada fotoceldas", precio: 178000, categoria: "Cortinas Enrollables NAS", marca: "NAS" },
  { codigo: "KODIN500-1", nombre: "Motor NAS Odin 500 110V - Cortina enrollable industrial hasta 500kg sin resortes", precio: 969900, categoria: "Cortinas Enrollables NAS", marca: "NAS" },
  { codigo: "KODIN800-1", nombre: "Motor NAS Odin 800 110V - Cortina enrollable industrial hasta 800kg sin resortes", precio: 1499900, categoria: "Cortinas Enrollables NAS", marca: "NAS" },
  { codigo: "KODIN1000-1", nombre: "Motor NAS Odin 1000 110V - Cortina enrollable industrial hasta 1000kg sin resortes", precio: 1628900, categoria: "Cortinas Enrollables NAS", marca: "NAS" },
  { codigo: "NO10", nombre: "Receptora NAS NO10 para Odin 500 800 1000 con 2 controles 433MHz", precio: 109000, categoria: "Cortinas Enrollables NAS", marca: "NAS" },
  { codigo: "NO11", nombre: "Receptora NAS NO11 para Odin 500 800 1000 con 2 controles 433MHz", precio: 109000, categoria: "Cortinas Enrollables NAS", marca: "NAS" },
  { codigo: "NO12", nombre: "Fotoceldas NAS NO12 para Odin 500 800 1000 requiere receptora NO10 o NO11", precio: 109000, categoria: "Cortinas Enrollables NAS", marca: "NAS" },
  { codigo: "NO13", nombre: "Freno Paracaidas NAS NO13 para motor Odin 500", precio: 414000, categoria: "Cortinas Enrollables NAS", marca: "NAS" },
  { codigo: "NO14", nombre: "Freno Paracaidas NAS NO14 para motor Odin 800 y Odin 1000", precio: 763000, categoria: "Cortinas Enrollables NAS", marca: "NAS" },
  { codigo: "HERCULES1600", nombre: "Motorreductor NAS Hercules 1600 110V - Cortina uso interno hasta 150kg eje 60mm Par 150Nm", precio: 732000, categoria: "Cortinas Enrollables NAS", marca: "NAS" },
  { codigo: "HERCULES2000", nombre: "Motorreductor NAS Hercules 2000 110V - Cortina uso interno hasta 180kg eje 60mm Par 180Nm", precio: 760000, categoria: "Cortinas Enrollables NAS", marca: "NAS" },
  { codigo: "HERCULES2800", nombre: "Motorreductor Doble NAS Hercules 2800 110V - Cortina uso interno hasta 280kg eje 76mm Par 360Nm", precio: 1105000, categoria: "Cortinas Enrollables NAS", marca: "NAS" },
  { codigo: "HERCULES3600", nombre: "Motorreductor Doble NAS Hercules 3600 110V - Cortina uso interno hasta 360kg eje 76mm Par 420Nm", precio: 1216000, categoria: "Cortinas Enrollables NAS", marca: "NAS" },
  { codigo: "SFRV03", nombre: "Tarjeta Electronica NAS SFRV03 110V Para motores cortinas Hercules con 2 controles", precio: 306000, categoria: "Cortinas Enrollables NAS", marca: "NAS" },
  { codigo: "KS-03", nombre: "Selector de Llave NAS Para motores cortinas Hercules", precio: 103000, categoria: "Cortinas Enrollables NAS", marca: "NAS" },
  { codigo: "KS-01", nombre: "Caja con Cerradura Seguridad NAS Para motores cortinas Hercules compatible BFT Wind", precio: 189000, categoria: "Cortinas Enrollables NAS", marca: "NAS" },
  { codigo: "RO301", nombre: "Rueda Galvanizada V NAS 2.5 pulgadas Para 100kg", precio: 32000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO302", nombre: "Rueda Galvanizada V NAS 3 pulgadas Para 150kg", precio: 51000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO304", nombre: "Rueda Galvanizada V NAS 4 pulgadas Para 200kg", precio: 82000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO304-2", nombre: "Rueda Galvanizada V NAS 4 pulgadas Doble Rodamiento Para 400kg", precio: 97000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO305-2", nombre: "Rueda Galvanizada V NAS 5 pulgadas Doble Rodamiento Para 400kg", precio: 151000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO311", nombre: "Rueda Galvanizada U NAS 2.5 pulgadas Para 100kg riel varilla cuadrada", precio: 32000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO312", nombre: "Rueda Galvanizada U NAS 3 pulgadas Para 150kg riel varilla cuadrada", precio: 50000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO314", nombre: "Rueda Galvanizada U NAS 4 pulgadas Para 200kg riel varilla cuadrada", precio: 89000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO14110", nombre: "Rueda Galvanizada V NAS 2.5 pulgadas Con Soporte Central Para 100kg", precio: 38000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO14115", nombre: "Rueda Galvanizada V NAS 3 pulgadas Con Soporte Central Para 150kg", precio: 49000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO14140", nombre: "Rueda Galvanizada V NAS 4 pulgadas Con Soporte Central Para 200kg", precio: 91000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO321-16", nombre: "Rueda Galvanizada O NAS 2.5 pulgadas Para 100kg riel varilla redonda", precio: 32000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO322-16", nombre: "Rueda Galvanizada O NAS 3 pulgadas Para 150kg riel varilla redonda", precio: 51000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO324-16", nombre: "Rueda Galvanizada O NAS 4 pulgadas Para 200kg riel varilla redonda", precio: 77000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO201", nombre: "Rueda Galvanizada V NAS 2.5 pulgadas Con Soporte Superior Para 100kg", precio: 36000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO202", nombre: "Rueda Galvanizada V NAS 3 pulgadas Con Soporte Superior Para 200kg", precio: 59000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO204-2", nombre: "Rueda Galvanizada V NAS 4 pulgadas Soporte Superior Doble Rodamiento Para 400kg", precio: 110000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO222-16", nombre: "Rueda Galvanizada O NAS 3 pulgadas Con Soporte Superior Para 200kg", precio: 58000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO224-16", nombre: "Rueda Galvanizada O NAS 4 pulgadas Soporte Superior Doble Rodamiento Para 400kg", precio: 111000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO702", nombre: "Rueda Galvanizada V NAS 3 pulgadas Con Soporte Inferior Para 180kg", precio: 60000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO704", nombre: "Rueda Galvanizada V NAS 4 pulgadas Con Soporte Inferior Para 220kg", precio: 95000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO722-16", nombre: "Rueda Galvanizada O NAS 3 pulgadas Con Soporte Inferior Para 180kg", precio: 71000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO724-16", nombre: "Rueda Galvanizada O NAS 4 pulgadas Con Soporte Inferior Para 220kg", precio: 84000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RODW4", nombre: "Rueda Galvanizada V NAS 4 pulgadas Doble Rodamiento Trabajo Pesado Para 800kg", precio: 192000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RODW5", nombre: "Rueda Galvanizada V NAS 5 pulgadas Doble Rodamiento Trabajo Pesado Para 1000kg", precio: 308000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RODW6", nombre: "Rueda Galvanizada V NAS 6 pulgadas Doble Rodamiento Trabajo Pesado Para 1200kg", precio: 423000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO260-4", nombre: "Pivote Superior Pequeno NAS 40mm Para puerta batiente hasta 200kg", precio: 61000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO260-5", nombre: "Pivote Superior Mediano NAS 50mm Para puerta batiente hasta 400kg", precio: 76000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO260-7", nombre: "Pivote Superior Grande NAS 70mm Para puerta batiente hasta 600kg", precio: 146000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO265-4", nombre: "Pivote Inferior Pequeno NAS 40mm Para puerta batiente hasta 200kg", precio: 58000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO265-5", nombre: "Pivote Inferior Mediano NAS 50mm Para puerta batiente hasta 400kg", precio: 71000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO265-7", nombre: "Pivote Inferior Grande NAS 70mm Para puerta batiente hasta 600kg", precio: 101000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO217", nombre: "Guia Superior Ajustable Pequena NAS 220mm Para hojas 25-50mm espesor", precio: 120000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO218", nombre: "Guia Superior Ajustable Grande NAS 350mm Para hojas 46-76mm espesor", precio: 268000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO113", nombre: "Rodillo Nylon Deslizamiento NAS 25x63mm con tornillo", precio: 12000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO117", nombre: "Rodillo Nylon Deslizamiento NAS 30x74mm con tornillo", precio: 13000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO118", nombre: "Rodillo Nylon Deslizamiento NAS 40x100mm con tornillo", precio: 24000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO4WB-46", nombre: "Coche 4 Ruedas Mediano NAS Para puertas corredizas colgantes hasta 200kg rueda 46mm", precio: 70000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "RO4WB-Z55", nombre: "Coche 4 Ruedas Grande NAS Para puertas corredizas colgantes hasta 400kg rueda 55mm", precio: 143000, categoria: "Rodamientos NAS", marca: "NAS" },
  { codigo: "GG01B-5.8MTS", nombre: "Riel Largo NAS 5.8m Calibre 14 Para rueda RO4WB-46", precio: 513000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "GG01B-2.9MTS", nombre: "Riel Corto NAS 2.9m Calibre 14 Para rueda RO4WB-46", precio: 256000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "GG01C-5.8MTS", nombre: "Riel Largo NAS 5.8m Calibre 14 Para rueda RO4WB-Z55", precio: 680000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "GG01C-2.9MTS", nombre: "Riel Corto NAS 2.9m Calibre 14 Para rueda RO4WB-Z55", precio: 340000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "MX04A", nombre: "Tope Mecanico Pequeno NAS Para puerta batiente 95x100mm", precio: 47000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "MX04B", nombre: "Tope Mecanico Mediano NAS Para puerta batiente 110x130mm", precio: 58000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "MX02A", nombre: "Tope Mecanico Grande NAS Para puerta batiente 146x100mm", precio: 61000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "MX05A", nombre: "Tope de Parada Pequeno NAS Para puerta batiente 43x120x100mm", precio: 31000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "MX05B", nombre: "Tope de Parada Grande NAS Para puerta batiente 50x158x138mm", precio: 37000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "CHN10X7C14", nombre: "Caja Herraje NAS Cal.14 para puerta 3.05x2.14m Bisagras soportes tambores rodillos guayas", precio: 274000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "CHN10X8C14", nombre: "Caja Herraje NAS Cal.14 para puerta 3.05x2.44m Bisagras soportes tambores rodillos guayas", precio: 315000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "CHN12X7C14", nombre: "Caja Herraje NAS Cal.14 para puerta 3.66x2.14m Bisagras soportes tambores rodillos guayas", precio: 292000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "CHN12X8C14", nombre: "Caja Herraje NAS Cal.14 para puerta 3.66x2.44m Bisagras soportes tambores rodillos guayas", precio: 315000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "CHN-12X8-C11", nombre: "Caja Herraje NAS Cal.11 para puerta 3.66x2.44m Bisagras soportes tambores rodillos guayas", precio: 425000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "KHN10X7-55K", nombre: "Kit Herrajes Completo NAS para puerta 3.05x2.14m Resorte 55kg guias tubo torsion", precio: 1017000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "KHN10X8-61K", nombre: "Kit Herrajes Completo NAS para puerta 3.05x2.44m Resorte 61kg guias tubo torsion", precio: 1115000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "KHN12X8-70K", nombre: "Kit Herrajes Completo NAS para puerta 3.66x2.44m Resorte 70kg guias tubo torsion", precio: 1130000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "KHN12X8-83K", nombre: "Kit Herrajes Completo NAS para puerta 3.66x2.44m Resorte 83kg guias tubo torsion", precio: 1177000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "KHN12X7-100K", nombre: "Kit Herrajes Completo NAS para puerta 3.66x2.14m 2 Resortes 50kg guias tubo torsion", precio: 1278000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "KHN12X8-114K", nombre: "Kit Herrajes Completo NAS para puerta 3.66x2.44m Cal.11 2 Resortes 57kg doble riel", precio: 1357000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "KHN12X8-120K", nombre: "Kit Herrajes Completo NAS para puerta 3.66x2.44m Cal.11 2 Resortes 60kg doble riel", precio: 1354000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "KHN12X8-140K", nombre: "Kit Herrajes Completo NAS para puerta 3.66x2.44m Cal.11 2 Resortes 70kg doble riel", precio: 1549000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "KHN12X8-166K", nombre: "Kit Herrajes Completo NAS para puerta 3.66x2.44m Cal.11 2 Resortes 83kg doble riel", precio: 1646000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "SCN001", nombre: "Soporte Central NAS para seccion puerta garaje Para operador", precio: 45000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RM6007-D", nombre: "Acople NAS para tubo de torsion", precio: 33000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RM6002-A", nombre: "Tubo de Torsion NAS 3.3m", precio: 65000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RR4201", nombre: "Balero Central Plastico NAS Acopla sistema de torsion", precio: 26000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "KRM6003-6004", nombre: "Juego Guias Verticales y Horizontales NAS hasta 2.44m alto", precio: 304000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "KRM6003-6004-DOBLE", nombre: "Par Guias Horizontales 2.8m Doble Riel y Verticales 2.3m Cal.14 NAS", precio: 574000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "KNPG001", nombre: "Kit 10 Bisagras Centrales NAS Antipellizco Acero Galvanizado para puertas garaje", precio: 73000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "REN-33-5KGS", nombre: "Resorte Izquierdo NAS Cono Rojo 33.5kg", precio: 205000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "REN-48KGS", nombre: "Resorte Izquierdo NAS Cono Rojo 48kg", precio: 263000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "REN-53KGS", nombre: "Resorte Izquierdo NAS Cono Rojo 53kg", precio: 288000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "REN-59KGS", nombre: "Resorte Izquierdo NAS Cono Rojo 59kg", precio: 301000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "KREN-67KGS", nombre: "Kit Resorte NAS 67kg Izquierdo Cono Rojo Derecho Cono Negro", precio: 384000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "KREN-80KGS", nombre: "Kit Resorte NAS 80kg Izquierdo Cono Rojo Derecho Cono Negro", precio: 411000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "KREN-93KGS", nombre: "Kit Resorte NAS 93kg Izquierdo Cono Rojo Derecho Cono Negro", precio: 493000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RH1001-C", nombre: "Bisagra No1 NAS Cal.18 Acero Galvanizado", precio: 4500, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RH1002-C", nombre: "Bisagra No2 NAS Cal.18 Acero Galvanizado", precio: 5100, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RH1003-C", nombre: "Bisagra No3 NAS Cal.18 Acero Galvanizado", precio: 5300, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RH1004-C", nombre: "Bisagra No4 NAS Cal.18 Acero Galvanizado", precio: 6100, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RH1001", nombre: "Bisagra No1 NAS Cal.14 Acero Galvanizado", precio: 6000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RH1002", nombre: "Bisagra No2 NAS Cal.14 Acero Galvanizado", precio: 6500, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RH1003", nombre: "Bisagra No3 NAS Cal.14 Acero Galvanizado", precio: 6500, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RH1004", nombre: "Bisagra No4 NAS Cal.14 Acero Galvanizado", precio: 6500, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RH1001-D", nombre: "Bisagra No1 NAS Cal.11 Acero Galvanizado", precio: 12300, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RH1002-D", nombre: "Bisagra No2 NAS Cal.11 Acero Galvanizado", precio: 13000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RH1003-D", nombre: "Bisagra No3 NAS Cal.11 Acero Galvanizado", precio: 15000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RH1004-D", nombre: "Bisagra No4 NAS Cal.11 Acero Galvanizado", precio: 15000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RB2001", nombre: "Bisagra Superior Residencial NAS Cal.14 Gallinazo", precio: 8000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RB2002", nombre: "Bisagra Superior Comercial NAS Cal.14 Gallinazo", precio: 15000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RB2101-B", nombre: "Par Portaguayas NAS Uso Residencial", precio: 19000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RB2102", nombre: "Par Portaguayas NAS Uso Comercial", precio: 29000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "KROTB", nombre: "Par Bisagras Techo Bajo NAS Instala torsion en minimo 15cm", precio: 143000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RB2202", nombre: "Par Soportes Laterales NAS Residenciales con Balinera para tubos 1 pulgada", precio: 43000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RB2204", nombre: "Soporte Central NAS Residencial Cal.11 para resorte de 1-3/4 2 y 2-5/8 pulgadas", precio: 14000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RL5101", nombre: "Cerradura Deslizante NAS Residencial Interior Para puertas levadizas pequeña", precio: 11000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RL5102", nombre: "Cerradura Deslizante NAS Residencial Interior Para puertas levadizas grande", precio: 15000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RD3001", nombre: "Par Conos NAS para resortes 1-3/4 pulgadas Izquierdo y Derecho", precio: 33000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RD3002", nombre: "Par Conos NAS para resortes 2 pulgadas Izquierdo y Derecho", precio: 36000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RD3003", nombre: "Par Conos NAS para resortes 2-5/8 pulgadas Izquierdo y Derecho", precio: 65000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RD3004", nombre: "Par Conos NAS para resortes 3-3/4 pulgadas Izquierdo y Derecho", precio: 100000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RD3101", nombre: "Par Tambores NAS para puertas hasta 2.50m alto", precio: 61000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RD3102", nombre: "Par Tambores NAS para puertas hasta 3.70m alto", precio: 107000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RD3103", nombre: "Par Tambores NAS para puertas hasta 5.50m alto", precio: 196000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RM6011-214M", nombre: "Par Guayas NAS para puertas residenciales hasta 2.14m", precio: 33000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RM6011-244M", nombre: "Par Guayas NAS para puertas residenciales hasta 2.44m", precio: 34000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RM6011-350M", nombre: "Par Guayas NAS para puertas residenciales hasta 3.50m", precio: 35000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RM6011-A", nombre: "Guaya NAS para puerta de garaje por metro", precio: 7000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RM6011-C", nombre: "Oval Doble Aluminio NAS para guaya hasta 4mm", precio: 3000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RM6011-B", nombre: "Oval Sencillo Aluminio NAS para guaya hasta 4mm", precio: 2000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RM6103-8M", nombre: "Cadena NAS para malacate por 8m", precio: 119000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RM6101-D", nombre: "Malacate No4 NAS Reduccion 4:1 Incluye pinon cadena collares soporte", precio: 560000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RM6006", nombre: "Angulo Perforado NAS Cal.14 Para instalacion rapida puertas garaje", precio: 65000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RR4001", nombre: "Rodillo NAS 2 pulgadas Nylon Sin Balinera 10cm", precio: 4000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RR4003", nombre: "Rodillo NAS 2 pulgadas Acero Con Balinera 10cm 10 balines", precio: 8000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RR4004", nombre: "Rodillo NAS 2 pulgadas Acero Largo 18cm Con Balinera 10 balines", precio: 8000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RR4007", nombre: "Rodillo NAS 2 pulgadas Nylon Largo 10cm Con Balinera 10 balines", precio: 6000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RR4008", nombre: "Rodillo NAS 2 pulgadas Nylon Largo 18cm Con Balinera 10 balines", precio: 8000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RM6009", nombre: "Resorte de Empuje 15 pulgadas NAS para puertas garaje seccionadas", precio: 64000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "RM6009-A", nombre: "Resorte de Empuje 8 pulgadas NAS para puertas garaje seccionadas", precio: 54000, categoria: "Herrajes NAS", marca: "NAS" },
  { codigo: "NAS-1209SC-Y", nombre: "Cortina de Aire NAS 110V 900mm Residencial Comercial 9-12m/s 1100-1400 m3/h", precio: 824000, categoria: "Cortinas de Aire NAS", marca: "NAS" },
  { codigo: "NAS-1212SC-Y", nombre: "Cortina de Aire NAS 220V 1200mm Residencial Comercial 9-12m/s 1600-1900 m3/h", precio: 1126000, categoria: "Cortinas de Aire NAS", marca: "NAS" },
  { codigo: "NAS-1215SC-Y", nombre: "Cortina de Aire NAS 110V 1500mm Residencial Comercial 9-12m/s 2000-2500 m3/h", precio: 1355000, categoria: "Cortinas de Aire NAS", marca: "NAS" },
  { codigo: "NAS-1218SC-Y", nombre: "Cortina de Aire NAS 110V 1800mm Residencial Comercial 9-12m/s 2600-3200 m3/h", precio: 1895000, categoria: "Cortinas de Aire NAS", marca: "NAS" },
  { codigo: "NAS-1220SC-Y", nombre: "Cortina de Aire NAS 220V 2000mm Residencial Comercial 9-12m/s 2900-3600 m3/h", precio: 2041000, categoria: "Cortinas de Aire NAS", marca: "NAS" },
  { codigo: "NAS-5012A", nombre: "Cortina de Aire Industrial NAS 110V 900mm 9-12m/s 1100-1400 m3/h", precio: 3753000, categoria: "Cortinas de Aire NAS", marca: "NAS" },
  { codigo: "NAS-5020A", nombre: "Cortina de Aire Industrial NAS 220V 1200mm 9-12m/s 1600-1900 m3/h", precio: 5833000, categoria: "Cortinas de Aire NAS", marca: "NAS" }
  ];

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function allBrandStorageKeys() {
    const keys = [];
    Object.values(BRAND_STORAGE).forEach((brand) => {
      keys.push(brand.productsKey, brand.categoriesKey);
    });
    return keys;
  }

  function clearAllBrandCatalogs() {
    allBrandStorageKeys().forEach((key) => {
      try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
    });
    try { localStorage.removeItem(ACTIVE_BRAND_KEY); } catch (e) { /* ignore */ }
    try { localStorage.removeItem(LEGACY_CATALOG_KEY); } catch (e) { /* ignore */ }
    try { localStorage.removeItem(LEGACY_CATEGORIES_KEY); } catch (e) { /* ignore */ }
    global.ArpaMiCatalogo?.saveProducts?.([], OFICIO_AUTOMATISMOS);
    global.ArpaMiCatalogo?.saveCategories?.([], OFICIO_AUTOMATISMOS);
  }

  function buildCatalogFromRows(rows, options) {
    const opts = options || {};
    const defaultMarca = opts.defaultMarca || '';
    const categoryIds = new Map();
    const categories = [];
    const products = [];
    const seen = new Set();
    const ahora = new Date().toISOString();

    function ensureCategory(name) {
      const label = String(name || 'General').trim() || 'General';
      const key = label.toLowerCase();
      if (!categoryIds.has(key)) {
        const cat = { id: newId(), name: label, oficioId: OFICIO_AUTOMATISMOS };
        categories.push(cat);
        categoryIds.set(key, cat.id);
      }
      return categoryIds.get(key);
    }

    (rows || []).forEach((row) => {
      const cod = canonicalCodigo(row.codigo || row.cod);
      const nom = String(row.nombre || row.nom || '').trim();
      if (!cod || !nom || seen.has(cod)) return;
      seen.add(cod);
      let categoria = String(row.categoria || row.category || 'General').trim() || 'General';
      if (opts.normalizeCategory !== false && global.ArpaCatalogo?.normalizeAutomatismosCategory) {
        categoria = global.ArpaCatalogo.normalizeAutomatismosCategory(categoria);
      }
      products.push({
        id: newId(),
        cod,
        nom,
        pvp: Number(row.precio != null ? row.precio : row.pvp) || 0,
        unidad: String(row.unidad || 'unidad').trim() || 'unidad',
        marca: String(row.marca || defaultMarca || '').trim(),
        categoriaId: ensureCategory(categoria),
        oficioId: OFICIO_AUTOMATISMOS,
        fechaAgregado: ahora
      });
    });

    return { products, categories };
  }

  function installBrandCatalog(brandId, rows, options) {
    const brand = BRAND_STORAGE[brandId];
    if (!brand) return 0;

    clearAllBrandCatalogs();
    const built = buildCatalogFromRows(rows, options);

    try {
      localStorage.setItem(brand.productsKey, JSON.stringify(built.products));
      localStorage.setItem(brand.categoriesKey, JSON.stringify(built.categories));
      localStorage.setItem(ACTIVE_BRAND_KEY, brandId);
    } catch (e) {
      console.warn('[catalogo-marcas] install', brandId, e);
      alert(window.ArpaI18n.t('alert.catalogo.no_guardado'));
      return 0;
    }

    global.ArpaMiCatalogo?.saveCategories?.(built.categories, OFICIO_AUTOMATISMOS);
    global.ArpaMiCatalogo?.saveProducts?.(built.products, OFICIO_AUTOMATISMOS);
    global.ArpaCatalogo?.invalidateListaCache?.();
    global.ArpaCotizacion?.updateCatalogHint?.();
    global.ArpaMiCatalogo?.refreshView?.();
    return built.products.length;
  }

  function flattenMarcaFromArpaCatalogo(marcaName) {
    const marcas = global.ArpaCatalogo?.getCatalogoMarcas?.();
    const categorias = marcas?.[marcaName];
    if (!categorias) return [];
    const rows = [];
    Object.entries(categorias).forEach(([categoria, items]) => {
      (items || []).forEach((item) => {
        rows.push({
          cod: item.cod,
          nom: item.nom,
          marca: marcaName,
          categoria,
          pvp: Number(item.pvp) || 0
        });
      });
    });
    return rows;
  }

  function restoreActiveBrandCatalog() {
    let brandId = '';
    try { brandId = localStorage.getItem(ACTIVE_BRAND_KEY) || ''; } catch (e) { /* ignore */ }
    const brand = BRAND_STORAGE[brandId];
    if (!brand) return false;

    let products = [];
    let categories = [];
    try {
      products = JSON.parse(localStorage.getItem(brand.productsKey) || '[]');
      categories = JSON.parse(localStorage.getItem(brand.categoriesKey) || '[]');
      if (!Array.isArray(products)) products = [];
      if (!Array.isArray(categories)) categories = [];
    } catch (e) {
      return false;
    }
    if (!products.length) return false;

    global.ArpaMiCatalogo?.saveCategories?.(categories, OFICIO_AUTOMATISMOS);
    global.ArpaMiCatalogo?.saveProducts?.(products, OFICIO_AUTOMATISMOS);
    global.ArpaCatalogo?.invalidateListaCache?.();
    return true;
  }

  function precargarCatalogoAccessmatic() {
    const count = installBrandCatalog('accessmatic', flattenMarcaFromArpaCatalogo('Accessmatic'));
    alert(window.ArpaI18n.t('alert.catalogo.marca_cargado', { marca: 'Accessmatic', count }));
    return count;
  }

  function precargarCatalogoElite() {
    const count = installBrandCatalog('elite', flattenMarcaFromArpaCatalogo('Elite'));
    alert(window.ArpaI18n.t('alert.catalogo.marca_cargado', { marca: 'Elite', count }));
    return count;
  }

  function precargarCatalogoBFTNAS() {
    const count = installBrandCatalog('bft_nas', CATALOGO_BFT_NAS, { normalizeCategory: false });
    alert(window.ArpaI18n.t('alert.catalogo.marca_cargado', { marca: 'BFT + NAS', count }));
    return count;
  }

  global.ArpaCatalogoMarcas = {
    BRAND_STORAGE,
    ACTIVE_BRAND_KEY,
    OFICIO_AUTOMATISMOS,
    clearAllBrandCatalogs,
    buildCatalogFromRows,
    installBrandCatalog,
    restoreActiveBrandCatalog,
    getActiveBrandId() {
      try { return localStorage.getItem(ACTIVE_BRAND_KEY) || ''; } catch (e) { return ''; }
    }
  };

  global.CATALOGO_BFT_NAS = CATALOGO_BFT_NAS;
  global.precargarCatalogoAccessmatic = precargarCatalogoAccessmatic;
  global.precargarCatalogoElite = precargarCatalogoElite;
  global.precargarCatalogoBFTNAS = precargarCatalogoBFTNAS;

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      restoreActiveBrandCatalog();
    });
  } else {
    restoreActiveBrandCatalog();
  }

  global.ArpaCatalogo?.invalidateListaCache?.();
})(typeof window !== 'undefined' ? window : globalThis);
