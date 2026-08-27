/**
 * Oficios / actividades — selector de oficio y catálogos genéricos (anexo).
 */
(function (global) {
  const OFICIO_AUTOMATISMOS = 'automatismos';
  const SEEDED_KEY = 'arpa_oficios_seeded';
  const ACTIVE_OFICIOS_KEY = 'arpa_active_oficios';

  const FORMATO_AUTOMATISMOS_OPCIONES = [
    { id: 'c1', label: 'Corrediza', i18nKey: 'formato.puerta.corrediza', catalogKey: 'Corrediza' },
    { id: 'c2', label: 'Batiente 1 hoja', i18nKey: 'formato.puerta.batiente_1', catalogKey: 'Batiente 1 hoja' },
    { id: 'c3', label: 'Batiente 2 hojas', i18nKey: 'formato.puerta.batiente_2', catalogKey: 'Batiente 2 hojas' },
    { id: 'c4', label: 'Levadiza', i18nKey: 'formato.puerta.levadiza', catalogKey: 'Levadiza / Seccional' },
    { id: 'c5', label: 'Seccional', i18nKey: 'formato.puerta.seccional', catalogKey: 'Levadiza / Seccional' },
    { id: 'c6', label: 'Barrera vehicular', i18nKey: 'formato.puerta.barrera', catalogKey: 'Barrera vehicular' },
    { id: 'c7', label: 'Techo corredizo', i18nKey: 'formato.puerta.techo_corredizo', catalogKey: 'Corrediza' },
    { id: 'c9', label: 'Cortina enrollable', i18nKey: 'formato.puerta.cortina_enrollable', catalogKey: 'Cortina enrollable' },
    { id: 'c8', label: 'Otra', i18nKey: 'formato.puerta.otra', otra: true }
  ];

  function buildFormatoOpciones(prefix, items) {
    return items.map((item, index) => ({
      id: prefix + (index + 1),
      label: item.label,
      i18nKey: item.i18nKey,
      catalogKey: item.catalogKey || '',
      otra: !!item.otra
    }));
  }

  /** motor = catálogo motores; generico = marca/modelo texto; none = ocultar sección */
  const FORMATO_EQUIPO_MODO = {
    automatismos: 'motor',
    metalmecanica: 'generico',
    refrigeracion: 'generico',
    cctv: 'generico',
    solar: 'generico',
    linea_blanca: 'generico'
  };

  const FORMATO_EQUIPO_REF_DEFAULT = {
    i18nKey: 'formato.placeholder.referencia_manual',
    default: 'Ej: ARES 1500'
  };

  const FORMATO_EQUIPO_REF_PLACEHOLDER = {
    automatismos: FORMATO_EQUIPO_REF_DEFAULT,
    metalmecanica: { i18nKey: 'formato.placeholder.ref.metalmecanica', default: 'Ej: Portón 3x2.5m' },
    refrigeracion: { i18nKey: 'formato.placeholder.ref.refrigeracion', default: 'Ej: Midea 12,000 BTU' },
    cctv: { i18nKey: 'formato.placeholder.ref.cctv', default: 'Ej: Hikvision DS-2CD2043G2' },
    solar: { i18nKey: 'formato.placeholder.ref.solar', default: 'Ej: JA Solar 450W' },
    linea_blanca: { i18nKey: 'formato.placeholder.ref.linea_blanca', default: 'Ej: Lavadora Samsung 18kg' }
  };

  /** @type {{ id: string, i18nKey: string, formatoTitulo: string, formatoTituloI18nKey: string, formatoOpciones: object[] }[]} */
  const OFICIOS = [
    {
      id: OFICIO_AUTOMATISMOS,
      i18nKey: 'oficio.automatismos',
      formatoTitulo: 'Tipo de Puerta / Motor',
      formatoTituloI18nKey: 'formato.section.tipo_puerta',
      formatoOpciones: FORMATO_AUTOMATISMOS_OPCIONES
    },
    {
      id: 'electricidad',
      i18nKey: 'oficio.electricidad',
      formatoTitulo: 'Tipo de Trabajo Eléctrico',
      formatoTituloI18nKey: 'formato.titulo.electricidad',
      formatoOpciones: buildFormatoOpciones('fe', [
        { label: 'Instalación residencial', i18nKey: 'formato.electricidad.residencial' },
        { label: 'Comercial/industrial', i18nKey: 'formato.electricidad.comercial' },
        { label: 'Tablero eléctrico', i18nKey: 'formato.electricidad.tablero' },
        { label: 'Acometida', i18nKey: 'formato.electricidad.acometida' },
        { label: 'Iluminación', i18nKey: 'formato.electricidad.iluminacion' },
        { label: 'Tomas y circuitos', i18nKey: 'formato.electricidad.tomas' },
        { label: 'Puesta a tierra', i18nKey: 'formato.electricidad.tierra' },
        { label: 'Otra', i18nKey: 'formato.puerta.otra', otra: true }
      ])
    },
    {
      id: 'gas',
      i18nKey: 'oficio.gas',
      formatoTitulo: 'Tipo de Trabajo de Gas',
      formatoTituloI18nKey: 'formato.titulo.gas',
      formatoOpciones: buildFormatoOpciones('fgas', [
        { label: 'Instalación interna', i18nKey: 'formato.gas.interna' },
        { label: 'Gasodoméstico', i18nKey: 'formato.gas.domestico' },
        { label: 'Revisión reglamentaria', i18nKey: 'formato.gas.revision' },
        { label: 'Reparación de fuga', i18nKey: 'formato.gas.fuga' },
        { label: 'Calentador', i18nKey: 'formato.gas.calentador' },
        { label: 'Otra', i18nKey: 'formato.puerta.otra', otra: true }
      ])
    },
    {
      id: 'refrigeracion',
      i18nKey: 'oficio.refrigeracion',
      formatoTitulo: 'Tipo de Equipo',
      formatoTituloI18nKey: 'formato.titulo.refrigeracion',
      formatoOpciones: buildFormatoOpciones('fref', [
        { label: 'Nevera/congelador', i18nKey: 'formato.refrigeracion.nevera' },
        { label: 'Aire split', i18nKey: 'formato.refrigeracion.split' },
        { label: 'Aire central', i18nKey: 'formato.refrigeracion.central' },
        { label: 'Cuarto frío', i18nKey: 'formato.refrigeracion.cuarto_frio' },
        { label: 'Refrigeración comercial', i18nKey: 'formato.refrigeracion.comercial' },
        { label: 'Otra', i18nKey: 'formato.puerta.otra', otra: true }
      ])
    },
    {
      id: 'cctv',
      i18nKey: 'oficio.cctv',
      formatoTitulo: 'Tipo de Sistema de Seguridad',
      formatoTituloI18nKey: 'formato.titulo.cctv',
      formatoOpciones: buildFormatoOpciones('fcctv', [
        { label: 'Cámaras análogas', i18nKey: 'formato.cctv.analogas' },
        { label: 'Cámaras IP', i18nKey: 'formato.cctv.ip' },
        { label: 'DVR/NVR', i18nKey: 'formato.cctv.dvr' },
        { label: 'Alarma', i18nKey: 'formato.cctv.alarma' },
        { label: 'Control de acceso', i18nKey: 'formato.cctv.acceso' },
        { label: 'Videoportero', i18nKey: 'formato.cctv.videoportero' },
        { label: 'Otra', i18nKey: 'formato.puerta.otra', otra: true }
      ])
    },
    {
      id: 'plomeria',
      i18nKey: 'oficio.plomeria',
      formatoTitulo: 'Tipo de Trabajo Hidráulico',
      formatoTituloI18nKey: 'formato.titulo.plomeria',
      formatoOpciones: buildFormatoOpciones('fplo', [
        { label: 'Red hidráulica', i18nKey: 'formato.plomeria.hidraulica' },
        { label: 'Red sanitaria', i18nKey: 'formato.plomeria.sanitaria' },
        { label: 'Fuga/reparación', i18nKey: 'formato.plomeria.fuga' },
        { label: 'Calentador', i18nKey: 'formato.plomeria.calentador' },
        { label: 'Grifería/sanitarios', i18nKey: 'formato.plomeria.griferia' },
        { label: 'Bomba/presión', i18nKey: 'formato.plomeria.bomba' },
        { label: 'Otra', i18nKey: 'formato.puerta.otra', otra: true }
      ])
    },
    {
      id: 'metalmecanica',
      i18nKey: 'oficio.metalmecanica',
      formatoTitulo: 'Tipo de Trabajo Metalmecánico',
      formatoTituloI18nKey: 'formato.titulo.metalmecanica',
      formatoOpciones: buildFormatoOpciones('fmet', [
        { label: 'Puerta/portón metálico', i18nKey: 'formato.metalmecanica.puerta' },
        { label: 'Reja/cerramiento', i18nKey: 'formato.metalmecanica.reja' },
        { label: 'Escalera/baranda', i18nKey: 'formato.metalmecanica.escalera' },
        { label: 'Estructura metálica', i18nKey: 'formato.metalmecanica.estructura' },
        { label: 'Soldadura/reparación', i18nKey: 'formato.metalmecanica.soldadura' },
        { label: 'Otra', i18nKey: 'formato.puerta.otra', otra: true }
      ])
    },
    {
      id: 'plagas',
      i18nKey: 'oficio.plagas',
      formatoTitulo: 'Tipo de Servicio',
      formatoTituloI18nKey: 'formato.titulo.plagas',
      formatoOpciones: buildFormatoOpciones('fpla', [
        { label: 'Desinsectación', i18nKey: 'formato.plagas.desinsectacion' },
        { label: 'Desratización', i18nKey: 'formato.plagas.desratizacion' },
        { label: 'Desinfección', i18nKey: 'formato.plagas.desinfeccion' },
        { label: 'Fumigación general', i18nKey: 'formato.plagas.fumigacion' },
        { label: 'Control preventivo', i18nKey: 'formato.plagas.preventivo' },
        { label: 'Otra', i18nKey: 'formato.puerta.otra', otra: true }
      ])
    },
    {
      id: 'linea_blanca',
      i18nKey: 'oficio.linea_blanca',
      formatoTitulo: 'Tipo de Electrodoméstico',
      formatoTituloI18nKey: 'formato.titulo.linea_blanca',
      formatoOpciones: buildFormatoOpciones('flb', [
        { label: 'Lavadora', i18nKey: 'formato.linea_blanca.lavadora' },
        { label: 'Nevera', i18nKey: 'formato.linea_blanca.nevera' },
        { label: 'Estufa/horno', i18nKey: 'formato.linea_blanca.estufa' },
        { label: 'Secadora', i18nKey: 'formato.linea_blanca.secadora' },
        { label: 'Lavavajillas', i18nKey: 'formato.linea_blanca.lavavajillas' },
        { label: 'Otra', i18nKey: 'formato.puerta.otra', otra: true }
      ])
    },
    {
      id: 'solar',
      i18nKey: 'oficio.solar',
      formatoTitulo: 'Tipo de Sistema Solar',
      formatoTituloI18nKey: 'formato.titulo.solar',
      formatoOpciones: buildFormatoOpciones('fsol', [
        { label: 'Panel solar', i18nKey: 'formato.solar.panel' },
        { label: 'Inversor', i18nKey: 'formato.solar.inversor' },
        { label: 'Baterías', i18nKey: 'formato.solar.baterias' },
        { label: 'Estructura/montaje', i18nKey: 'formato.solar.estructura' },
        { label: 'Cableado DC/AC', i18nKey: 'formato.solar.cableado' },
        { label: 'Mantenimiento/limpieza', i18nKey: 'formato.solar.mantenimiento' },
        { label: 'Otra', i18nKey: 'formato.puerta.otra', otra: true }
      ])
    }
  ];

  function normalizeSeedUnidad(val) {
    const v = String(val || '').trim().toLowerCase();
    const aliases = {
      un: 'unidad',
      und: 'unidad',
      unidades: 'unidad',
      mts: 'metro',
      metros: 'metro',
      m: 'metro',
      hr: 'hora',
      horas: 'hora',
      servicios: 'servicio'
    };
    if (aliases[v]) return aliases[v];
    if (['unidad', 'metro', 'hora', 'servicio'].includes(v)) return v;
    return v || 'unidad';
  }

  /** Catálogo base Gas — 20 productos (COP). */
  function seedCatalog_gas() {
    return [
      { cod: 'GAS-001', nom: 'Tubería cobre 1/2" (metro)', categoria: 'Tubería', pvp: 18000, unidad: 'metro' },
      { cod: 'GAS-002', nom: 'Tubería cobre 3/4" (metro)', categoria: 'Tubería', pvp: 25000, unidad: 'metro' },
      { cod: 'GAS-003', nom: 'Válvula de paso 1/2"', categoria: 'Válvulas', pvp: 35000, unidad: 'un' },
      { cod: 'GAS-004', nom: 'Válvula de paso 3/4"', categoria: 'Válvulas', pvp: 48000, unidad: 'un' },
      { cod: 'GAS-005', nom: 'Regulador de presión doméstico', categoria: 'Reguladores', pvp: 65000, unidad: 'un' },
      { cod: 'GAS-006', nom: 'Manómetro de presión', categoria: 'Instrumentos', pvp: 45000, unidad: 'un' },
      { cod: 'GAS-007', nom: 'Conector flexible 60cm', categoria: 'Conectores', pvp: 28000, unidad: 'un' },
      { cod: 'GAS-008', nom: 'Codo cobre 1/2"', categoria: 'Accesorios', pvp: 8000, unidad: 'un' },
      { cod: 'GAS-009', nom: 'Te cobre 1/2"', categoria: 'Accesorios', pvp: 12000, unidad: 'un' },
      { cod: 'GAS-010', nom: 'Abrazadera metálica', categoria: 'Accesorios', pvp: 5000, unidad: 'un' },
      { cod: 'GAS-011', nom: 'Detector de gas natural', categoria: 'Seguridad', pvp: 85000, unidad: 'un' },
      { cod: 'GAS-012', nom: 'Detector de gas propano', categoria: 'Seguridad', pvp: 85000, unidad: 'un' },
      { cod: 'GAS-013', nom: 'Sellador de teflón gas', categoria: 'Accesorios', pvp: 6000, unidad: 'un' },
      { cod: 'GAS-014', nom: 'Llave de estufa 4 puestos', categoria: 'Equipos', pvp: 120000, unidad: 'un' },
      { cod: 'GAS-015', nom: 'Calentador paso a paso 6L', categoria: 'Equipos', pvp: 380000, unidad: 'un' },
      { cod: 'GAS-016', nom: 'Calentador paso a paso 10L', categoria: 'Equipos', pvp: 520000, unidad: 'un' },
      { cod: 'GAS-017', nom: 'Quemador industrial sencillo', categoria: 'Equipos', pvp: 95000, unidad: 'un' },
      { cod: 'GAS-018', nom: 'Prueba de hermeticidad', categoria: 'Servicios', pvp: 80000, unidad: 'servicio' },
      { cod: 'GAS-019', nom: 'Instalación punto de gas', categoria: 'Servicios', pvp: 150000, unidad: 'servicio' },
      { cod: 'GAS-020', nom: 'Visita técnica diagnóstico', categoria: 'Servicios', pvp: 65000, unidad: 'servicio' }
    ];
  }

  /** Catálogo base Refrigeración y AC — 20 productos (COP). */
  function seedCatalog_refrigeracion() {
    return [
      { cod: 'RAC-001', nom: 'Aire split 9000 BTU instalado', categoria: 'Equipos', pvp: 1850000, unidad: 'un' },
      { cod: 'RAC-002', nom: 'Aire split 12000 BTU instalado', categoria: 'Equipos', pvp: 2200000, unidad: 'un' },
      { cod: 'RAC-003', nom: 'Aire split 18000 BTU instalado', categoria: 'Equipos', pvp: 2900000, unidad: 'un' },
      { cod: 'RAC-004', nom: 'Aire split 24000 BTU instalado', categoria: 'Equipos', pvp: 3500000, unidad: 'un' },
      { cod: 'RAC-005', nom: 'Gas refrigerante R410A (libra)', categoria: 'Refrigerantes', pvp: 45000, unidad: 'libra' },
      { cod: 'RAC-006', nom: 'Gas refrigerante R22 (libra)', categoria: 'Refrigerantes', pvp: 55000, unidad: 'libra' },
      { cod: 'RAC-007', nom: 'Tubería cobre 1/4" (metro)', categoria: 'Tubería', pvp: 22000, unidad: 'metro' },
      { cod: 'RAC-008', nom: 'Tubería cobre 3/8" (metro)', categoria: 'Tubería', pvp: 28000, unidad: 'metro' },
      { cod: 'RAC-009', nom: 'Filtro deshidratador', categoria: 'Repuestos', pvp: 35000, unidad: 'un' },
      { cod: 'RAC-010', nom: 'Condensador universal', categoria: 'Repuestos', pvp: 180000, unidad: 'un' },
      { cod: 'RAC-011', nom: 'Compresor 9000 BTU', categoria: 'Repuestos', pvp: 450000, unidad: 'un' },
      { cod: 'RAC-012', nom: 'Termostato digital', categoria: 'Repuestos', pvp: 85000, unidad: 'un' },
      { cod: 'RAC-013', nom: 'Control remoto universal AC', categoria: 'Accesorios', pvp: 45000, unidad: 'un' },
      { cod: 'RAC-014', nom: 'Soporte exterior unidad condensadora', categoria: 'Accesorios', pvp: 75000, unidad: 'un' },
      { cod: 'RAC-015', nom: 'Mantenimiento preventivo split', categoria: 'Servicios', pvp: 120000, unidad: 'servicio' },
      { cod: 'RAC-016', nom: 'Carga de gas refrigerante', categoria: 'Servicios', pvp: 180000, unidad: 'servicio' },
      { cod: 'RAC-017', nom: 'Limpieza profunda evaporador', categoria: 'Servicios', pvp: 95000, unidad: 'servicio' },
      { cod: 'RAC-018', nom: 'Instalación punto eléctrico AC', categoria: 'Servicios', pvp: 150000, unidad: 'servicio' },
      { cod: 'RAC-019', nom: 'Diagnóstico técnico AC', categoria: 'Servicios', pvp: 65000, unidad: 'servicio' },
      { cod: 'RAC-020', nom: 'Revisión sistema frío nevera', categoria: 'Servicios', pvp: 95000, unidad: 'servicio' }
    ];
  }

  /** Catálogo base Cámaras y CCTV — 20 productos (COP). */
  function seedCatalog_cctv() {
    return [
      { cod: 'CAM-001', nom: 'Cámara domo HD 2MP interior', categoria: 'Cámaras', pvp: 95000, unidad: 'un' },
      { cod: 'CAM-002', nom: 'Cámara bala HD 2MP exterior', categoria: 'Cámaras', pvp: 110000, unidad: 'un' },
      { cod: 'CAM-003', nom: 'Cámara domo 4MP exterior', categoria: 'Cámaras', pvp: 165000, unidad: 'un' },
      { cod: 'CAM-004', nom: 'Cámara PTZ 5MP motorizada', categoria: 'Cámaras', pvp: 450000, unidad: 'un' },
      { cod: 'CAM-005', nom: 'DVR 4 canales 1080P', categoria: 'Grabadores', pvp: 280000, unidad: 'un' },
      { cod: 'CAM-006', nom: 'DVR 8 canales 1080P', categoria: 'Grabadores', pvp: 380000, unidad: 'un' },
      { cod: 'CAM-007', nom: 'NVR 8 canales IP', categoria: 'Grabadores', pvp: 420000, unidad: 'un' },
      { cod: 'CAM-008', nom: 'Disco duro 1TB vigilancia', categoria: 'Almacenamiento', pvp: 220000, unidad: 'un' },
      { cod: 'CAM-009', nom: 'Cable UTP cat6 (metro)', categoria: 'Cableado', pvp: 2500, unidad: 'metro' },
      { cod: 'CAM-010', nom: 'Conector RJ45 (unidad)', categoria: 'Cableado', pvp: 800, unidad: 'un' },
      { cod: 'CAM-011', nom: 'Fuente poder 12V 5A', categoria: 'Accesorios', pvp: 45000, unidad: 'un' },
      { cod: 'CAM-012', nom: 'Caja de paso metálica', categoria: 'Accesorios', pvp: 18000, unidad: 'un' },
      { cod: 'CAM-013', nom: 'Sensor de movimiento PIR', categoria: 'Alarmas', pvp: 35000, unidad: 'un' },
      { cod: 'CAM-014', nom: 'Sirena exterior con flash', categoria: 'Alarmas', pvp: 85000, unidad: 'un' },
      { cod: 'CAM-015', nom: 'Panel de alarma 8 zonas', categoria: 'Alarmas', pvp: 220000, unidad: 'un' },
      { cod: 'CAM-016', nom: 'Teclado LCD alarma', categoria: 'Alarmas', pvp: 95000, unidad: 'un' },
      { cod: 'CAM-017', nom: 'Instalación cámara (unidad)', categoria: 'Servicios', pvp: 85000, unidad: 'servicio' },
      { cod: 'CAM-018', nom: 'Configuración acceso remoto', categoria: 'Servicios', pvp: 65000, unidad: 'servicio' },
      { cod: 'CAM-019', nom: 'Mantenimiento sistema CCTV', categoria: 'Servicios', pvp: 120000, unidad: 'servicio' },
      { cod: 'CAM-020', nom: 'Visita técnica diagnóstico', categoria: 'Servicios', pvp: 65000, unidad: 'servicio' }
    ];
  }

  /** Catálogo base Plomería — 20 productos (COP). */
  function seedCatalog_plomeria() {
    return [
      { cod: 'PLO-001', nom: 'Tubo PVC 1/2" presión (metro)', categoria: 'Tubería', pvp: 8500, unidad: 'metro' },
      { cod: 'PLO-002', nom: 'Tubo PVC 3/4" presión (metro)', categoria: 'Tubería', pvp: 12000, unidad: 'metro' },
      { cod: 'PLO-003', nom: 'Tubo PVC 1" presión (metro)', categoria: 'Tubería', pvp: 18000, unidad: 'metro' },
      { cod: 'PLO-004', nom: 'Llave de paso 1/2"', categoria: 'Válvulas', pvp: 28000, unidad: 'un' },
      { cod: 'PLO-005', nom: 'Llave de paso 3/4"', categoria: 'Válvulas', pvp: 38000, unidad: 'un' },
      { cod: 'PLO-006', nom: 'Grifo monomando lavamanos', categoria: 'Grifería', pvp: 185000, unidad: 'un' },
      { cod: 'PLO-007', nom: 'Grifo monomando cocina', categoria: 'Grifería', pvp: 220000, unidad: 'un' },
      { cod: 'PLO-008', nom: 'Ducha eléctrica sencilla', categoria: 'Equipos', pvp: 95000, unidad: 'un' },
      { cod: 'PLO-009', nom: 'Sanitario one piece', categoria: 'Sanitarios', pvp: 380000, unidad: 'un' },
      { cod: 'PLO-010', nom: 'Lavamanos empotrar', categoria: 'Sanitarios', pvp: 220000, unidad: 'un' },
      { cod: 'PLO-011', nom: 'Sifón PVC lavaplatos', categoria: 'Accesorios', pvp: 18000, unidad: 'un' },
      { cod: 'PLO-012', nom: 'Codo PVC 1/2" 90°', categoria: 'Accesorios', pvp: 2500, unidad: 'un' },
      { cod: 'PLO-013', nom: 'Te PVC 1/2"', categoria: 'Accesorios', pvp: 3200, unidad: 'un' },
      { cod: 'PLO-014', nom: 'Unión PVC 1/2"', categoria: 'Accesorios', pvp: 1800, unidad: 'un' },
      { cod: 'PLO-015', nom: 'Pegante PVC 250cc', categoria: 'Accesorios', pvp: 22000, unidad: 'un' },
      { cod: 'PLO-016', nom: 'Teflón rollo grande', categoria: 'Accesorios', pvp: 4500, unidad: 'un' },
      { cod: 'PLO-017', nom: 'Destape químico profesional', categoria: 'Servicios', pvp: 35000, unidad: 'servicio' },
      { cod: 'PLO-018', nom: 'Instalación punto hidráulico', categoria: 'Servicios', pvp: 120000, unidad: 'servicio' },
      { cod: 'PLO-019', nom: 'Destape tubería (punto)', categoria: 'Servicios', pvp: 85000, unidad: 'servicio' },
      { cod: 'PLO-020', nom: 'Visita técnica diagnóstico', categoria: 'Servicios', pvp: 65000, unidad: 'servicio' }
    ];
  }

  /** Catálogo base Metalmecánica y Soldadura — 20 productos (COP). */
  function seedCatalog_metalmecanica() {
    return [
      { cod: 'MET-001', nom: 'Electrodo 6013 1/8" (kg)', categoria: 'Consumibles', pvp: 18000, unidad: 'kg' },
      { cod: 'MET-002', nom: 'Electrodo 7018 1/8" (kg)', categoria: 'Consumibles', pvp: 22000, unidad: 'kg' },
      { cod: 'MET-003', nom: 'Disco de corte 4.5" (unidad)', categoria: 'Consumibles', pvp: 4500, unidad: 'un' },
      { cod: 'MET-004', nom: 'Disco de desbaste 4.5" (unidad)', categoria: 'Consumibles', pvp: 6500, unidad: 'un' },
      { cod: 'MET-005', nom: 'Disco de corte 9" (unidad)', categoria: 'Consumibles', pvp: 8500, unidad: 'un' },
      { cod: 'MET-006', nom: 'Perfil cuadrado 1" calibre 18 (metro)', categoria: 'Perfiles', pvp: 12000, unidad: 'metro' },
      { cod: 'MET-007', nom: 'Perfil cuadrado 2" calibre 16 (metro)', categoria: 'Perfiles', pvp: 22000, unidad: 'metro' },
      { cod: 'MET-008', nom: 'Perfil rectangular 1x2" calibre 18 (metro)', categoria: 'Perfiles', pvp: 16000, unidad: 'metro' },
      { cod: 'MET-009', nom: 'Ángulo 1.5" calibre 14 (metro)', categoria: 'Perfiles', pvp: 18000, unidad: 'metro' },
      { cod: 'MET-010', nom: 'Lámina cold rolled calibre 18 (m²)', categoria: 'Láminas', pvp: 45000, unidad: 'm2' },
      { cod: 'MET-011', nom: 'Lámina galvanizada calibre 26 (m²)', categoria: 'Láminas', pvp: 38000, unidad: 'm2' },
      { cod: 'MET-012', nom: 'Pintura anticorrosiva gris (galón)', categoria: 'Acabados', pvp: 65000, unidad: 'galón' },
      { cod: 'MET-013', nom: 'Pintura esmalte color (galón)', categoria: 'Acabados', pvp: 72000, unidad: 'galón' },
      { cod: 'MET-014', nom: 'Bisagra reforzada 4" (par)', categoria: 'Accesorios', pvp: 18000, unidad: 'un' },
      { cod: 'MET-015', nom: 'Riel puerta corrediza (metro)', categoria: 'Accesorios', pvp: 35000, unidad: 'metro' },
      { cod: 'MET-016', nom: 'Rueda puerta corrediza (unidad)', categoria: 'Accesorios', pvp: 25000, unidad: 'un' },
      { cod: 'MET-017', nom: 'Fabricación puerta metálica (m²)', categoria: 'Servicios', pvp: 180000, unidad: 'servicio' },
      { cod: 'MET-018', nom: 'Fabricación reja ventana (m²)', categoria: 'Servicios', pvp: 120000, unidad: 'servicio' },
      { cod: 'MET-019', nom: 'Fabricación techo corredizo (m²)', categoria: 'Servicios', pvp: 250000, unidad: 'servicio' },
      { cod: 'MET-020', nom: 'Instalación estructura metálica', categoria: 'Servicios', pvp: 200000, unidad: 'servicio' }
    ];
  }

  /** Catálogo base Control de Plagas — 20 productos (COP). */
  function seedCatalog_plagas() {
    return [
      { cod: 'PLA-001', nom: 'Fumigación apartamento hasta 60m²', categoria: 'Fumigación', pvp: 180000, unidad: 'servicio' },
      { cod: 'PLA-002', nom: 'Fumigación casa hasta 120m²', categoria: 'Fumigación', pvp: 280000, unidad: 'servicio' },
      { cod: 'PLA-003', nom: 'Fumigación local comercial', categoria: 'Fumigación', pvp: 220000, unidad: 'servicio' },
      { cod: 'PLA-004', nom: 'Control de cucarachas (punto)', categoria: 'Control', pvp: 120000, unidad: 'servicio' },
      { cod: 'PLA-005', nom: 'Control de hormigas', categoria: 'Control', pvp: 95000, unidad: 'servicio' },
      { cod: 'PLA-006', nom: 'Control de moscas', categoria: 'Control', pvp: 110000, unidad: 'servicio' },
      { cod: 'PLA-007', nom: 'Control de zancudos/mosquitos', categoria: 'Control', pvp: 130000, unidad: 'servicio' },
      { cod: 'PLA-008', nom: 'Control de roedores (trampa)', categoria: 'Roedores', pvp: 85000, unidad: 'servicio' },
      { cod: 'PLA-009', nom: 'Control de ratas (cebadero)', categoria: 'Roedores', pvp: 95000, unidad: 'servicio' },
      { cod: 'PLA-010', nom: 'Desratización completa local', categoria: 'Roedores', pvp: 350000, unidad: 'servicio' },
      { cod: 'PLA-011', nom: 'Control de pulgas y garrapatas', categoria: 'Control', pvp: 160000, unidad: 'servicio' },
      { cod: 'PLA-012', nom: 'Control de termitas', categoria: 'Control', pvp: 450000, unidad: 'servicio' },
      { cod: 'PLA-013', nom: 'Nebulización exterior', categoria: 'Fumigación', pvp: 200000, unidad: 'servicio' },
      { cod: 'PLA-014', nom: 'Desinfección superficies', categoria: 'Desinfección', pvp: 180000, unidad: 'servicio' },
      { cod: 'PLA-015', nom: 'Certificado sanitario', categoria: 'Documentos', pvp: 85000, unidad: 'servicio' },
      { cod: 'PLA-016', nom: 'Visita de inspección', categoria: 'Servicios', pvp: 65000, unidad: 'servicio' },
      { cod: 'PLA-017', nom: 'Plan trimestral apartamento', categoria: 'Planes', pvp: 480000, unidad: 'servicio' },
      { cod: 'PLA-018', nom: 'Plan trimestral local comercial', categoria: 'Planes', pvp: 650000, unidad: 'servicio' },
      { cod: 'PLA-019', nom: 'Gel para cucarachas (punto)', categoria: 'Insumos', pvp: 45000, unidad: 'un' },
      { cod: 'PLA-020', nom: 'Trampa luminosa insectos', categoria: 'Equipos', pvp: 220000, unidad: 'un' }
    ];
  }

  /** Catálogo base Línea Blanca — 20 productos (COP). */
  function seedCatalog_linea_blanca() {
    return [
      { cod: 'LB-001', nom: 'Diagnóstico técnico lavadora', categoria: 'Diagnósticos', pvp: 65000, unidad: 'servicio' },
      { cod: 'LB-002', nom: 'Diagnóstico técnico nevera', categoria: 'Diagnósticos', pvp: 65000, unidad: 'servicio' },
      { cod: 'LB-003', nom: 'Diagnóstico técnico horno/estufa', categoria: 'Diagnósticos', pvp: 65000, unidad: 'servicio' },
      { cod: 'LB-004', nom: 'Diagnóstico técnico lavavajillas', categoria: 'Diagnósticos', pvp: 65000, unidad: 'servicio' },
      { cod: 'LB-005', nom: 'Reparación lavadora (mano obra)', categoria: 'Reparaciones', pvp: 180000, unidad: 'servicio' },
      { cod: 'LB-006', nom: 'Reparación nevera (mano obra)', categoria: 'Reparaciones', pvp: 200000, unidad: 'servicio' },
      { cod: 'LB-007', nom: 'Reparación microondas', categoria: 'Reparaciones', pvp: 120000, unidad: 'servicio' },
      { cod: 'LB-008', nom: 'Cambio motor lavadora', categoria: 'Repuestos', pvp: 280000, unidad: 'un' },
      { cod: 'LB-009', nom: 'Cambio bomba lavadora', categoria: 'Repuestos', pvp: 150000, unidad: 'un' },
      { cod: 'LB-010', nom: 'Cambio compresor nevera', categoria: 'Repuestos', pvp: 450000, unidad: 'un' },
      { cod: 'LB-011', nom: 'Carga gas nevera', categoria: 'Servicios', pvp: 180000, unidad: 'servicio' },
      { cod: 'LB-012', nom: 'Cambio resistencia horno', categoria: 'Repuestos', pvp: 95000, unidad: 'un' },
      { cod: 'LB-013', nom: 'Cambio temporizador lavadora', categoria: 'Repuestos', pvp: 120000, unidad: 'un' },
      { cod: 'LB-014', nom: 'Cambio tarjeta electrónica', categoria: 'Repuestos', pvp: 320000, unidad: 'un' },
      { cod: 'LB-015', nom: 'Instalación lavadora', categoria: 'Servicios', pvp: 85000, unidad: 'servicio' },
      { cod: 'LB-016', nom: 'Instalación lavavajillas', categoria: 'Servicios', pvp: 120000, unidad: 'servicio' },
      { cod: 'LB-017', nom: 'Mantenimiento preventivo lavadora', categoria: 'Servicios', pvp: 95000, unidad: 'servicio' },
      { cod: 'LB-018', nom: 'Mantenimiento preventivo nevera', categoria: 'Servicios', pvp: 95000, unidad: 'servicio' },
      { cod: 'LB-019', nom: 'Visita a domicilio', categoria: 'Servicios', pvp: 55000, unidad: 'servicio' },
      { cod: 'LB-020', nom: 'Repuesto genérico (ítem manual)', categoria: 'Repuestos', pvp: 0, unidad: 'un' }
    ];
  }

  /** Catálogo base Energía Solar — 20 productos (COP). */
  function seedCatalog_solar() {
    return [
      { cod: 'SOL-001', nom: 'Panel solar monocristalino 400W', categoria: 'Paneles', pvp: 850000, unidad: 'un' },
      { cod: 'SOL-002', nom: 'Panel solar policristalino 300W', categoria: 'Paneles', pvp: 620000, unidad: 'un' },
      { cod: 'SOL-003', nom: 'Inversor solar 1000W', categoria: 'Inversores', pvp: 680000, unidad: 'un' },
      { cod: 'SOL-004', nom: 'Inversor solar 3000W', categoria: 'Inversores', pvp: 1850000, unidad: 'un' },
      { cod: 'SOL-005', nom: 'Inversor solar 5000W', categoria: 'Inversores', pvp: 2800000, unidad: 'un' },
      { cod: 'SOL-006', nom: 'Batería gel 100Ah 12V', categoria: 'Baterías', pvp: 680000, unidad: 'un' },
      { cod: 'SOL-007', nom: 'Batería litio 100Ah', categoria: 'Baterías', pvp: 1450000, unidad: 'un' },
      { cod: 'SOL-008', nom: 'Controlador de carga MPPT 30A', categoria: 'Controladores', pvp: 280000, unidad: 'un' },
      { cod: 'SOL-009', nom: 'Controlador de carga MPPT 60A', categoria: 'Controladores', pvp: 420000, unidad: 'un' },
      { cod: 'SOL-010', nom: 'Estructura soporte panel (unidad)', categoria: 'Estructuras', pvp: 185000, unidad: 'un' },
      { cod: 'SOL-011', nom: 'Cable solar 6mm (metro)', categoria: 'Cableado', pvp: 12000, unidad: 'metro' },
      { cod: 'SOL-012', nom: 'Conector MC4 (par)', categoria: 'Accesorios', pvp: 8500, unidad: 'un' },
      { cod: 'SOL-013', nom: 'Caja de combinación 4 entradas', categoria: 'Accesorios', pvp: 220000, unidad: 'un' },
      { cod: 'SOL-014', nom: 'Medidor bidireccional', categoria: 'Equipos', pvp: 380000, unidad: 'un' },
      { cod: 'SOL-015', nom: 'Instalación panel solar (unidad)', categoria: 'Servicios', pvp: 180000, unidad: 'servicio' },
      { cod: 'SOL-016', nom: 'Diseño sistema solar residencial', categoria: 'Servicios', pvp: 350000, unidad: 'servicio' },
      { cod: 'SOL-017', nom: 'Mantenimiento sistema solar', categoria: 'Servicios', pvp: 220000, unidad: 'servicio' },
      { cod: 'SOL-018', nom: 'Limpieza paneles (unidad)', categoria: 'Servicios', pvp: 45000, unidad: 'servicio' },
      { cod: 'SOL-019', nom: 'Diagnóstico sistema existente', categoria: 'Servicios', pvp: 120000, unidad: 'servicio' },
      { cod: 'SOL-020', nom: 'Visita técnica gratuita', categoria: 'Servicios', pvp: 0, unidad: 'servicio' }
    ];
  }

  const SEED_CATALOG_BUILDERS = {
    gas: seedCatalog_gas,
    refrigeracion: seedCatalog_refrigeracion,
    cctv: seedCatalog_cctv,
    plomeria: seedCatalog_plomeria,
    metalmecanica: seedCatalog_metalmecanica,
    plagas: seedCatalog_plagas,
    linea_blanca: seedCatalog_linea_blanca,
    solar: seedCatalog_solar
  };

  /**
   * Catálogo base Electricidad (sin cambios).
   * Formato por ítem: { cod, nom, categoria, pvp, unidad?, marca? }
   */
  const SEED_CATALOGS = {
    electricidad: {
      products: [
        { cod: 'ELE-001', nom: 'Breaker 1 polo 20A', categoria: 'Protección', pvp: 18000, unidad: 'un' },
        { cod: 'ELE-002', nom: 'Breaker 2 polos 30A', categoria: 'Protección', pvp: 42000, unidad: 'un' },
        { cod: 'ELE-003', nom: 'Tablero de distribución 12 circuitos', categoria: 'Tableros', pvp: 95000, unidad: 'un' },
        { cod: 'ELE-004', nom: 'Cable encauchetado 12 AWG', categoria: 'Cableado', pvp: 2200, unidad: 'metro' },
        { cod: 'ELE-005', nom: 'Cable encauchetado 14 AWG', categoria: 'Cableado', pvp: 1800, unidad: 'metro' },
        { cod: 'ELE-006', nom: 'Toma doble con polo a tierra', categoria: 'Tomas y Switches', pvp: 9500, unidad: 'un' },
        { cod: 'ELE-007', nom: 'Switch sencillo', categoria: 'Tomas y Switches', pvp: 7000, unidad: 'un' },
        { cod: 'ELE-008', nom: 'Luminaria LED panel 24W', categoria: 'Iluminación', pvp: 35000, unidad: 'un' },
        { cod: 'ELE-009', nom: 'Reflector LED 50W exterior', categoria: 'Iluminación', pvp: 48000, unidad: 'un' },
        { cod: 'ELE-010', nom: 'Caja octogonal PVC', categoria: 'Accesorios', pvp: 3500, unidad: 'un' },
        { cod: 'ELE-011', nom: 'Tubería EMT 1/2 pulgada', categoria: 'Cableado', pvp: 8500, unidad: 'un' },
        { cod: 'ELE-012', nom: 'Totalizador 2x40A', categoria: 'Protección', pvp: 65000, unidad: 'un' }
      ]
    }
  };

  function normalizeOficioId(id) {
    const v = String(id || '').trim().toLowerCase();
    if (!v || v === OFICIO_AUTOMATISMOS) return OFICIO_AUTOMATISMOS;
    if (v === 'cerrajeria') return 'metalmecanica';
    return OFICIOS.some((o) => o.id === v) ? v : OFICIO_AUTOMATISMOS;
  }

  function resolveItemOficioId(item) {
    return normalizeOficioId(item?.oficioId);
  }

  function getOficiosList() {
    return OFICIOS.slice();
  }

  function getOficioById(id) {
    return OFICIOS.find((o) => o.id === normalizeOficioId(id)) || OFICIOS[0];
  }

  function resolveFormatoOficioId(oficioId) {
    try {
      const id = normalizeOficioId(oficioId);
      const oficio = getOficioById(id);
      if (oficio?.formatoOpciones?.length) return oficio.id;
    } catch (e) { /* ignore */ }
    return OFICIO_AUTOMATISMOS;
  }

  function getActiveFormatoOficioId() {
    const active = getActiveOficiosFromSettings();
    if (Array.isArray(active) && active.length) {
      return resolveFormatoOficioId(active[0]);
    }
    return OFICIO_AUTOMATISMOS;
  }

  function getFormatoConfig(oficioId) {
    const id = resolveFormatoOficioId(oficioId);
    const oficio = getOficioById(id);
    return {
      oficioId: id,
      titulo: oficio.formatoTitulo || 'Tipo de Puerta / Motor',
      tituloI18nKey: oficio.formatoTituloI18nKey || 'formato.section.tipo_puerta',
      opciones: Array.isArray(oficio.formatoOpciones) ? oficio.formatoOpciones.slice() : FORMATO_AUTOMATISMOS_OPCIONES.slice(),
      showMedidas: id === OFICIO_AUTOMATISMOS || id === 'metalmecanica',
      equipoModo: oficio.formatoEquipoModo || FORMATO_EQUIPO_MODO[id] || 'none',
      equipoRefPlaceholder: oficio.formatoEquipoRefPlaceholder
        || FORMATO_EQUIPO_REF_PLACEHOLDER[id]
        || FORMATO_EQUIPO_REF_DEFAULT
    };
  }

  function getFormatoMapaTipos(oficioId) {
    const config = getFormatoConfig(oficioId);
    if (config.oficioId !== OFICIO_AUTOMATISMOS) return {};
    const map = {};
    config.opciones.forEach((op) => {
      if (op.catalogKey && !op.otra) map[op.id] = op.catalogKey;
    });
    return map;
  }

  function getFormatoOpcionLabel(oficioId, optionId) {
    const config = getFormatoConfig(oficioId);
    const op = config.opciones.find((item) => item.id === optionId);
    if (!op) return '';
    const translated = global.ArpaI18n?.t?.(op.i18nKey);
    if (translated && translated !== op.i18nKey) return translated;
    return op.label || '';
  }

  function getFormatoCheckedLabels(oficioId) {
    const config = getFormatoConfig(oficioId);
    const labels = [];
    config.opciones.forEach((op) => {
      const el = document.getElementById(op.id);
      if (!el || el.type !== 'checkbox' || !el.checked) return;
      let label = getFormatoOpcionLabel(oficioId, op.id);
      if (op.otra) {
        const otraText = (document.getElementById('formato-tipo-otra-texto')?.value || '').trim();
        if (otraText) label = label + ': ' + otraText;
      }
      if (label) labels.push(label);
    });
    return labels;
  }

  function isFounderLicense() {
    return global.ArpaLicense?.isFounderLicense?.() === true;
  }

  function normalizeActiveOficiosList(raw) {
    if (!Array.isArray(raw) || !raw.length) return [];
    const ids = raw.map(normalizeOficioId).filter((id, i, arr) => arr.indexOf(id) === i);
    if (isFounderLicense()) return ids;
    return ids.length ? [ids[0]] : [];
  }

  function readActiveOficiosFromStorage() {
    try {
      const fromKey = JSON.parse(localStorage.getItem(ACTIVE_OFICIOS_KEY) || 'null');
      if (Array.isArray(fromKey) && fromKey.length) {
        return normalizeActiveOficiosList(fromKey);
      }
    } catch (e) { /* ignore */ }
    try {
      const fromSettings = global.ArpaBrand?.getSettings?.()?.activeOficios;
      if (Array.isArray(fromSettings) && fromSettings.length) {
        return normalizeActiveOficiosList(fromSettings);
      }
    } catch (e) { /* ignore */ }
    return [];
  }

  function saveActiveOficios(ids) {
    const normalized = normalizeActiveOficiosList(ids);
    try {
      localStorage.setItem(ACTIVE_OFICIOS_KEY, JSON.stringify(normalized));
    } catch (e) {
      console.warn('[arpa-oficios] saveActiveOficios', e);
      return false;
    }
    try {
      const brand = global.ArpaBrand;
      if (brand?.getSettings && brand?.saveSettings) {
        const current = brand.getSettings();
        brand.saveSettings({ ...current, activeOficios: normalized });
      }
    } catch (e) { /* ignore */ }
    try {
      global.dispatchEvent(new CustomEvent('arpa-active-oficio-changed', { detail: { ids: normalized } }));
    } catch (e) { /* ignore */ }
    return true;
  }

  function getActiveOficiosFromSettings() {
    return readActiveOficiosFromStorage();
  }

  function getOficioLabel(oficioId) {
    const key = getOficioById(oficioId).i18nKey;
    const translated = global.ArpaI18n?.t?.(key);
    if (translated && translated !== key) return translated;
    const fallbacks = {
      automatismos: 'Automatismos',
      electricidad: 'Electricidad',
      gas: 'Gas',
      refrigeracion: 'Refrigeración y Aire Acondicionado',
      cctv: 'Cámaras y CCTV / Seguridad Electrónica',
      plomeria: 'Plomería y Fontanería',
      metalmecanica: 'Metalmecánica y Soldadura',
      plagas: 'Control de Plagas / Fumigación',
      linea_blanca: 'Línea Blanca / Electrodomésticos',
      solar: 'Energía Solar'
    };
    return fallbacks[normalizeOficioId(oficioId)] || oficioId;
  }

  function getSeededOficios() {
    try {
      const data = JSON.parse(localStorage.getItem(SEEDED_KEY) || '[]');
      return Array.isArray(data) ? data.map(normalizeOficioId) : [];
    } catch (e) {
      return [];
    }
  }

  function markOficioSeeded(oficioId) {
    const id = normalizeOficioId(oficioId);
    const seeded = getSeededOficios();
    if (seeded.includes(id)) return;
    seeded.push(id);
    try {
      localStorage.setItem(SEEDED_KEY, JSON.stringify(seeded));
    } catch (e) { /* ignore */ }
  }

  function getSeedProductsForOficio(oficioId) {
    const id = normalizeOficioId(oficioId);
    if (id === OFICIO_AUTOMATISMOS) {
      return global.ArpaCatalogo?.buildAutomatismosSeedProducts?.() || [];
    }
    if (id === 'electricidad') {
      return Array.isArray(SEED_CATALOGS.electricidad?.products)
        ? SEED_CATALOGS.electricidad.products
        : [];
    }
    const builder = SEED_CATALOG_BUILDERS[id];
    return builder ? builder() : [];
  }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function importSeedCatalog(oficioId, options) {
    const opts = options || {};
    const id = normalizeOficioId(oficioId);
    if (!opts.force && getSeededOficios().includes(id)) {
      return { added: 0, skipped: true, reason: 'already_seeded' };
    }

    const seedProducts = getSeedProductsForOficio(id);
    if (!seedProducts.length) {
      return { added: 0, skipped: true, empty: true, total: 0 };
    }

    let categories = global.ArpaMiCatalogo?.getCategories?.(id) || [];
    let products = global.ArpaMiCatalogo?.getProducts?.(id) || [];

    const existingCodes = new Set(
      products
        .map((p) => String(p.cod || '').trim().toLowerCase())
        .filter(Boolean)
    );

    const catByName = new Map();
    categories.forEach((c) => catByName.set(String(c.name || '').trim().toLowerCase(), c.id));

    function ensureCategory(name) {
      const label = String(name || 'General').trim() || 'General';
      const key = label.toLowerCase();
      if (catByName.has(key)) return catByName.get(key);
      const cat = { id: newId(), name: label, oficioId: id };
      categories.push(cat);
      catByName.set(key, cat.id);
      return cat.id;
    }

    let added = 0;
    seedProducts.forEach((item) => {
      const cod = String(item.cod || item.codigo || '').trim();
      const nom = String(item.nom || item.nombre || '').trim();
      if (!cod || !nom) return;
      if (existingCodes.has(cod.toLowerCase())) return;
      const categoriaId = ensureCategory(
        id === OFICIO_AUTOMATISMOS
          ? (global.ArpaCatalogo?.normalizeAutomatismosCategory?.(item.categoria || item.category) || item.categoria || 'General')
          : (item.categoria || item.category || 'General')
      );
      const seedPvp = id === OFICIO_AUTOMATISMOS
        ? 0
        : (Number(item.pvp != null ? item.pvp : item.precio) || 0);
      products.push({
        id: newId(),
        cod,
        nom,
        pvp: seedPvp,
        unidad: normalizeSeedUnidad(item.unidad),
        marca: String(item.marca || '').trim(),
        categoriaId,
        oficioId: id
      });
      existingCodes.add(cod.toLowerCase());
      added++;
    });

    try {
      global.ArpaMiCatalogo?.saveCategories?.(categories, id);
      global.ArpaMiCatalogo?.saveProducts?.(products, id);
    } catch (e) { /* ignore */ }

    markOficioSeeded(id);
    if (added > 0) {
      global.ArpaCatalogo?.invalidateListaCache?.();
      global.ArpaCotizacion?.updateCatalogHint?.();
    }

    return { added, skipped: false, total: seedProducts.length };
  }

  function unmarkOficioSeeded(oficioId) {
    const id = normalizeOficioId(oficioId);
    const seeded = getSeededOficios().filter((s) => s !== id);
    try {
      localStorage.setItem(SEEDED_KEY, JSON.stringify(seeded));
    } catch (e) { /* ignore */ }
  }

  function productBelongsToOficioForRemoval(product, oficioId) {
    const id = normalizeOficioId(oficioId);
    const raw = product?.oficioId;
    if (raw === undefined || raw === null || String(raw).trim() === '') return false;
    return normalizeOficioId(raw) === id;
  }

  function categoryBelongsToOficioForRemoval(category, oficioId) {
    const id = normalizeOficioId(oficioId);
    const raw = category?.oficioId;
    if (raw === undefined || raw === null || String(raw).trim() === '') return false;
    return normalizeOficioId(raw) === id;
  }

  function unseedOficio(oficioId) {
    const id = normalizeOficioId(oficioId);

    global.ArpaMiCatalogo?.saveProducts?.([], id);
    global.ArpaMiCatalogo?.saveCategories?.([], id);

    unmarkOficioSeeded(id);
    global.ArpaCatalogo?.invalidateListaCache?.();
    global.ArpaCotizacion?.updateCatalogHint?.();
  }

  function seedOficioIfNeeded(oficioId) {
    return importSeedCatalog(oficioId, { force: false });
  }

  function getSeedProductCount(oficioId) {
    return getSeedProductsForOficio(oficioId).length;
  }

  /** Carga manual del catálogo base de un oficio (agrega faltantes, sin duplicar códigos). */
  function precargarCatalogoOficio(oficioId) {
    const id = normalizeOficioId(oficioId);

    const total = getSeedProductCount(id);
    if (!total) {
      alert(window.ArpaI18n.t('alert.oficios.sin_catalogo_base'));
      return 0;
    }

    const label = getOficioLabel(id);
    const result = importSeedCatalog(id, { force: true });
    global.ArpaMiCatalogo?.refreshView?.();

    if (result.added > 0) {
      alert(window.ArpaI18n.t('alert.oficios.catalogo_base_cargado', { count: result.added, label }));
    } else {
      alert(window.ArpaI18n.t('alert.oficios.catalogo_ya_cargado', { label, total }));
    }
    return result.added;
  }

  function seedActiveOficios() {
    getActiveOficiosFromSettings().forEach((id) => seedOficioIfNeeded(id));
  }

  function renderSettingsCheckboxes(container) {
    if (!container) return;
    const active = getActiveOficiosFromSettings();
    const activeSet = new Set(active);
    const founder = isFounderLicense();
    const inputType = founder ? 'checkbox' : 'radio';
    const singleActive = active[0] || null;

    container.innerHTML = OFICIOS.map((o) => {
      const checked = founder ? activeSet.has(o.id) : singleActive === o.id;
      return `
        <label class="settings-oficio-chip">
          <input type="${inputType}" name="settings-oficio" value="${o.id}"${checked ? ' checked' : ''}>
          <span data-i18n="${o.i18nKey}">${getOficioLabel(o.id)}</span>
        </label>`;
    }).join('');
    bindOficioCheckboxListeners(container);
    global.ArpaI18n?.apply?.(global.ArpaI18n?.getLang?.() || 'es');
  }

  function readSettingsCheckboxes(container) {
    const selected = [];
    if (!container) return [];
    container.querySelectorAll('input[name="settings-oficio"]:checked').forEach((el) => {
      const id = normalizeOficioId(el.value);
      if (!selected.includes(id)) selected.push(id);
    });
    return normalizeActiveOficiosList(selected);
  }

  function revertOficioInputs(container, activeIds) {
    if (!container) return;
    const activeSet = new Set(activeIds);
    const single = activeIds[0] || null;
    container.querySelectorAll('input[name="settings-oficio"]').forEach((el) => {
      if (isFounderLicense()) {
        el.checked = activeSet.has(normalizeOficioId(el.value));
      } else {
        el.checked = normalizeOficioId(el.value) === single;
      }
    });
  }

  function applyNonFounderOficioChange(container, newOficioId) {
    const previous = getActiveOficiosFromSettings();
    const previousSingle = previous[0] || null;
    const nextId = normalizeOficioId(newOficioId);

    if (previousSingle === nextId) return true;

    if (previousSingle) {
      const msg = window.ArpaI18n.t('confirm.oficios.cambiar_oficio', {
        from: getOficioLabel(previousSingle),
        to: getOficioLabel(nextId)
      });
      if (!confirm(msg)) {
        revertOficioInputs(container, previous);
        return false;
      }
      unseedOficio(previousSingle);
    }

    if (!saveActiveOficios([nextId])) {
      revertOficioInputs(container, previous);
      return false;
    }

    seedOficioIfNeeded(nextId);
    global.ArpaMiCatalogo?.refreshView?.();
    renderSettingsCheckboxes(container);
    return true;
  }

  function applyOficiosFromSettingsUI(container) {
    const grid = container || document.getElementById('settings-oficios-grid');
    const ids = readSettingsCheckboxes(grid);
    if (!saveActiveOficios(ids)) return false;
    seedActiveOficios();
    global.ArpaMiCatalogo?.refreshView?.();
    return true;
  }

  function bindOficioCheckboxListeners(container) {
    if (!container) return;
    container.querySelectorAll('input[name="settings-oficio"]').forEach((input) => {
      if (input.dataset.oficioBound === '1') return;
      input.dataset.oficioBound = '1';
      input.addEventListener('change', (e) => {
        const target = e.target;
        if (isFounderLicense()) {
          applyOficiosFromSettingsUI(container);
          return;
        }

        if (!target.checked) {
          target.checked = true;
          return;
        }

        applyNonFounderOficioChange(container, target.value);
      });
    });
  }

  global.ArpaOficios = {
    OFICIO_AUTOMATISMOS,
    OFICIOS,
    SEED_CATALOGS,
    SEED_CATALOG_BUILDERS,
    seedCatalog_gas,
    seedCatalog_refrigeracion,
    seedCatalog_cctv,
    seedCatalog_plomeria,
    seedCatalog_metalmecanica,
    seedCatalog_plagas,
    seedCatalog_linea_blanca,
    seedCatalog_solar,
    ACTIVE_OFICIOS_KEY,
    normalizeOficioId,
    normalizeActiveOficiosList,
    readActiveOficiosFromStorage,
    saveActiveOficios,
    applyOficiosFromSettingsUI,
    resolveItemOficioId,
    getOficiosList,
    getOficioById,
    resolveFormatoOficioId,
    getActiveFormatoOficioId,
    getFormatoConfig,
    getFormatoMapaTipos,
    getFormatoOpcionLabel,
    getFormatoCheckedLabels,
    getActiveOficiosFromSettings,
    getOficioLabel,
    seedOficioIfNeeded,
    seedActiveOficios,
    importSeedCatalog,
    getSeedProductsForOficio,
    getSeedProductCount,
    precargarCatalogoOficio,
    renderSettingsCheckboxes,
    readSettingsCheckboxes,
    unseedOficio,
    isFounderLicense
  };

  global.precargarCatalogoOficio = precargarCatalogoOficio;

  function migrateCerrajeriaToMetalmecanica() {
    const FLAG = 'arpa_oficio_metalmecanica_migrated_v1';
    try {
      if (localStorage.getItem(FLAG) === 'true') return;
    } catch (e) {
      return;
    }

    try {
      const hadCerrajeria = (list) =>
        Array.isArray(list) && list.some((id) => String(id).toLowerCase() === 'cerrajeria');

      const activeRaw = JSON.parse(localStorage.getItem(ACTIVE_OFICIOS_KEY) || 'null');
      if (hadCerrajeria(activeRaw)) {
        saveActiveOficios(activeRaw);
      }

      const brand = global.ArpaBrand;
      const fromSettings = brand?.getSettings?.()?.activeOficios;
      if (hadCerrajeria(fromSettings)) {
        brand.saveSettings({
          ...brand.getSettings(),
          activeOficios: normalizeActiveOficiosList(fromSettings)
        });
      }

      let seeded = JSON.parse(localStorage.getItem(SEEDED_KEY) || '[]');
      if (Array.isArray(seeded)) {
        seeded = seeded
          .map((id) => String(id).toLowerCase())
          .filter((id) => id !== 'cerrajeria' && id !== 'metalmecanica');
        localStorage.setItem(SEEDED_KEY, JSON.stringify(seeded));
      }

      localStorage.removeItem('arpa_catalog_cerrajeria');
      localStorage.removeItem('arpa_categorias_cerrajeria');
      localStorage.removeItem('arpa_catalog_metalmecanica');
      localStorage.removeItem('arpa_categorias_metalmecanica');

      if (localStorage.getItem('arpa_trial_oficio') === 'cerrajeria') {
        localStorage.setItem('arpa_trial_oficio', 'metalmecanica');
      }

      localStorage.setItem(FLAG, 'true');
    } catch (e) {
      console.warn('[arpa-oficios] migrateCerrajeriaToMetalmecanica', e);
    }
  }

  function migrateActiveOficiosKey() {
    try {
      if (localStorage.getItem(ACTIVE_OFICIOS_KEY)) return;
      const fromSettings = global.ArpaBrand?.getSettings?.()?.activeOficios;
      if (Array.isArray(fromSettings) && fromSettings.length) {
        saveActiveOficios(fromSettings);
      }
    } catch (e) { /* ignore */ }
  }

  function bootstrapCatalogSeeds() {
    if (global.ArpaOnboarding && !global.ArpaOnboarding.isOnboardingDone()) return;
    getActiveOficiosFromSettings().forEach((id) => seedOficioIfNeeded(id));
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      migrateCerrajeriaToMetalmecanica();
      migrateActiveOficiosKey();
      bootstrapCatalogSeeds();
    });
  } else {
    migrateCerrajeriaToMetalmecanica();
    migrateActiveOficiosKey();
    bootstrapCatalogSeeds();
  }
})(typeof window !== 'undefined' ? window : globalThis);
