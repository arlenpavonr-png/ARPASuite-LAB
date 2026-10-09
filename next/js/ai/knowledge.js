/**
 * Conocimiento de campo por oficio (automatismos, cerrajería/metalmecánica,
 * cámaras/CCTV, refrigeración, electricidad, gas, plomería, plagas,
 * línea blanca, solar y taller de motos).
 * NEXT usa el oficio principal elegido en ARPA Suite.
 * No copia catálogos de terceros: nombres genéricos + precios de referencia.
 */

const DOOR_EQUIPMENT = [
  { id: 'corrediza', label: 'Corrediza' },
  { id: 'batiente_1', label: 'Batiente 1 hoja' },
  { id: 'batiente_2', label: 'Batiente 2 hojas' },
  { id: 'levadiza', label: 'Levadiza' },
  { id: 'seccional', label: 'Seccional' },
  { id: 'barrera', label: 'Barrera vehicular' },
  { id: 'techo_corredizo', label: 'Techo corredizo' },
  { id: 'cortina', label: 'Cortina enrollable' },
  { id: 'otro', label: 'Otro' },
];

export const SERVICE_TYPES = [
  { id: 'instalacion', label: 'Instalación' },
  { id: 'mantenimiento', label: 'Mantenimiento' },
  { id: 'reparacion', label: 'Reparación' },
];

const DOOR_CHIPS_QUICK = [
  { id: 'pinon_desgaste', label: 'Desgaste de piñón', insert: 'Encontré desgaste del piñón.' },
  { id: 'cremallera', label: 'Cremallera desalineada', insert: 'Encontré la cremallera desalineada.' },
  { id: 'fotoceldas', label: 'Fotoceldas sucias', insert: 'Encontré fotoceldas sucias.' },
  { id: 'ruido', label: 'Ruido en motor', insert: 'Encontré ruido en el motor.' },
  { id: 'ruedas', label: 'Holgura en ruedas', insert: 'Encontré holgura en las ruedas.' },
  { id: 'lubrique', label: 'Lubricación hecha', insert: 'Lubriqué el sistema.' },
  { id: 'ajuste', label: 'Ajuste hecho', insert: 'Ajusté la cremallera.' },
  { id: 'ciclo_ok', label: 'Ciclo de prueba OK', insert: 'Probé el ciclo de apertura y cierre, queda operativo.' },
  { id: 'cambio_pinon', label: 'Recomendar piñón', insert: 'Recomiendo cambiar el piñón.' },
  { id: 'control', label: 'Control fallando', insert: 'Encontré el control remoto fallando. Recomiendo cambiar el control.' },
];

const DOOR_PARTS = {
  pinon: { name: 'Piñón de ataque', unitPrice: 85000, labor: 40000 },
  cremallera: { name: 'Tramo de cremallera', unitPrice: 45000, labor: 35000 },
  fotocelda: { name: 'Par de fotoceldas', unitPrice: 120000, labor: 40000 },
  control: { name: 'Control remoto', unitPrice: 65000, labor: 15000 },
  motor: { name: 'Motor / operador', unitPrice: 0, labor: 0, needsQuote: true },
  tarjeta: { name: 'Tarjeta electrónica', unitPrice: 0, labor: 80000, needsQuote: true },
  bateria: { name: 'Batería de respaldo', unitPrice: 180000, labor: 25000 },
  sensor: { name: 'Sensor de apertura', unitPrice: 90000, labor: 30000 },
  fin_carrera: { name: 'Fin de carrera', unitPrice: 35000, labor: 25000 },
  rueda: { name: 'Rueda / rodamiento', unitPrice: 40000, labor: 30000 },
  electrocerradura: { name: 'Electrocerradura', unitPrice: 150000, labor: 40000 },
  lampara: { name: 'Lámpara de cortesía', unitPrice: 25000, labor: 15000 },
};

const CHECKLIST_COMMON = [
  { id: 'visual', label: 'Inspección visual general' },
  { id: 'fijaciones', label: 'Fijaciones y anclajes' },
  { id: 'seguridad', label: 'Dispositivos de seguridad' },
  { id: 'ciclo', label: 'Prueba de ciclo apertura / cierre' },
  { id: 'cliente', label: 'Explicación al cliente' },
];

const CHECKLIST_MANTENIMIENTO = [
  { id: 'pinon', label: 'Estado de piñón' },
  { id: 'cremallera', label: 'Estado y alineación de cremallera' },
  { id: 'lubricacion', label: 'Lubricación' },
  { id: 'fotoceldas', label: 'Limpieza y prueba de fotoceldas' },
  { id: 'ruedas', label: 'Ruedas, rodamientos y guías' },
  { id: 'fines', label: 'Fines de carrera / encoder' },
  { id: 'controles', label: 'Controles y receptores' },
  { id: 'ruido', label: 'Ruidos o holguras' },
];

const CHECKLIST_INSTALACION = [
  { id: 'vano', label: 'Verificación de vano y nivel' },
  { id: 'anclaje', label: 'Anclaje de motor y riel' },
  { id: 'engrane', label: 'Engrane piñón / cremallera' },
  { id: 'electrico', label: 'Punto eléctrico y polo a tierra' },
  { id: 'programacion', label: 'Programación de controles' },
  { id: 'seguridad_inst', label: 'Instalación de fotoceldas' },
  { id: 'entrega', label: 'Prueba de entrega con cliente' },
];

const CHECKLIST_REPARACION = [
  { id: 'diagnostico', label: 'Diagnóstico de la falla' },
  { id: 'causa', label: 'Causa raíz identificada' },
  { id: 'repuesto', label: 'Repuesto instalado o pendiente' },
  { id: 'prueba_falla', label: 'Prueba después de la intervención' },
  { id: 'recomendacion', label: 'Recomendación informada al cliente' },
];

function doorChecklist(serviceType) {
  const extra =
    serviceType === 'instalacion' ? CHECKLIST_INSTALACION
      : serviceType === 'reparacion' ? CHECKLIST_REPARACION
        : CHECKLIST_MANTENIMIENTO;
  return [...extra, ...CHECKLIST_COMMON];
}

// ─── Cerrajería y Metalmecánica ────────────────────────────────────────────

const METAL_EQUIPMENT = [
  { id: 'cortina', label: 'Cortina enrollable' },
  { id: 'reja_ballesta', label: 'Reja ballesta' },
  { id: 'puerta_metalica', label: 'Puerta / portón metálico' },
  { id: 'reja', label: 'Reja / cerramiento' },
  { id: 'chapa', label: 'Chapas y cerraduras' },
  { id: 'estructura', label: 'Estructura metálica' },
  { id: 'otro', label: 'Otro' },
];

const METAL_CHIPS_QUICK = [
  { id: 'resortes', label: 'Resortes sin tensión', insert: 'Encontré los resortes de la cortina sin tensión.' },
  { id: 'lamas', label: 'Lamas dobladas', insert: 'Encontré lamas dobladas en la cortina.' },
  { id: 'guias', label: 'Guías desalineadas', insert: 'Encontré las guías desalineadas.' },
  { id: 'oxido', label: 'Óxido', insert: 'Encontré óxido en la estructura.' },
  { id: 'chapa', label: 'Chapa dañada', insert: 'Encontré la chapa dañada.' },
  { id: 'lubrique', label: 'Lubricación hecha', insert: 'Lubriqué guías y eje.' },
  { id: 'ajuste', label: 'Ajuste de guías', insert: 'Ajusté las guías.' },
  { id: 'soldadura', label: 'Soldadura hecha', insert: 'Soldé los puntos sueltos de la reja.' },
  { id: 'ciclo_ok', label: 'Prueba OK', insert: 'Probé la apertura y cierre, queda operativo.' },
  { id: 'cambio_resortes', label: 'Recomendar resortes', insert: 'Recomiendo cambiar los resortes.' },
];

/** Precios de referencia (COP) del catálogo base de Cerrajería y Metalmecánica. */
const METAL_PARTS = {
  resorte: { name: 'Eje y resortes de balance', unitPrice: 450000, labor: 120000 },
  lama: { name: 'Lamas de cortina (m²)', unitPrice: 280000, labor: 60000 },
  guia_cortina: { name: 'Guías laterales para cortina (par)', unitPrice: 180000, labor: 60000 },
  chapa: { name: 'Chapa de seguridad', unitPrice: 120000, labor: 40000 },
  cerradura_piso: { name: 'Cerradura de piso para cortina', unitPrice: 95000, labor: 30000 },
  motor_cortina: { name: 'Motor para cortina enrollable', unitPrice: 0, labor: 0, needsQuote: true },
  pintura: { name: 'Pintura anticorrosiva (galón)', unitPrice: 65000, labor: 80000 },
  soldadura: { name: 'Soldadura (hora)', unitPrice: 70000, labor: 0 },
};

const METAL_MANTENIMIENTO = [
  { id: 'lamas', label: 'Estado de lamas o tejido' },
  { id: 'resortes', label: 'Resortes y tensión del eje' },
  { id: 'guias', label: 'Guías: alineación y fijación' },
  { id: 'eje', label: 'Eje y chumaceras' },
  { id: 'lubricacion', label: 'Lubricación de guías y eje' },
  { id: 'chapas', label: 'Chapas, cerraduras y candados' },
  { id: 'oxido', label: 'Óxido, soldaduras y pintura' },
  { id: 'motor', label: 'Motor y controles (si tiene)' },
];

const METAL_INSTALACION = [
  { id: 'medidas', label: 'Medidas del vano confirmadas' },
  { id: 'anclaje', label: 'Anclaje de guías y soportes' },
  { id: 'nivel', label: 'Nivel y plomo' },
  { id: 'eje_resortes', label: 'Eje y resortes ajustados' },
  { id: 'prueba', label: 'Prueba de apertura y cierre' },
  { id: 'chapa', label: 'Chapa o cerradura instalada' },
  { id: 'entrega', label: 'Prueba de entrega con cliente' },
];

const METAL_REPARACION = [
  { id: 'diagnostico', label: 'Diagnóstico de la falla' },
  { id: 'causa', label: 'Causa identificada (golpe, óxido, desgaste)' },
  { id: 'repuesto', label: 'Repuesto o soldadura realizada' },
  { id: 'prueba_falla', label: 'Prueba después de la reparación' },
  { id: 'recomendacion', label: 'Recomendación informada al cliente' },
];

function metalChecklist(serviceType) {
  const extra =
    serviceType === 'instalacion' ? METAL_INSTALACION
      : serviceType === 'reparacion' ? METAL_REPARACION
        : METAL_MANTENIMIENTO;
  return [...extra, ...CHECKLIST_COMMON.filter((i) => i.id !== 'ciclo')];
}

// ─── Cámaras y CCTV / Seguridad electrónica ───────────────────────────────

const CCTV_EQUIPMENT = [
  { id: 'camaras', label: 'Cámaras análogas' },
  { id: 'camaras_ip', label: 'Cámaras IP' },
  { id: 'grabador', label: 'DVR / NVR' },
  { id: 'alarma', label: 'Alarma' },
  { id: 'control_acceso', label: 'Control de acceso' },
  { id: 'videoportero', label: 'Videoportero' },
  { id: 'otro', label: 'Otro' },
];

const CCTV_CHIPS_QUICK = [
  { id: 'sin_imagen', label: 'Cámara sin imagen', insert: 'Encontré una cámara sin imagen.' },
  { id: 'disco', label: 'Disco no graba', insert: 'Encontré el disco duro dañado, no graba.' },
  { id: 'fuente', label: 'Fuente fallando', insert: 'Encontré la fuente de poder fallando.' },
  { id: 'conectores', label: 'Conectores sulfatados', insert: 'Encontré conectores sulfatados.' },
  { id: 'lentes', label: 'Lentes sucios', insert: 'Encontré los lentes de las cámaras sucios.' },
  { id: 'limpieza', label: 'Limpieza hecha', insert: 'Limpié lentes y domos de las cámaras.' },
  { id: 'grabacion', label: 'Grabación revisada', insert: 'Revisé la grabación y los días de respaldo.' },
  { id: 'remoto', label: 'Acceso remoto listo', insert: 'Configuré el acceso remoto en el celular del cliente.' },
  { id: 'prueba_ok', label: 'Sistema OK', insert: 'Probé todas las cámaras, queda operativo.' },
  { id: 'rec_disco', label: 'Recomendar disco', insert: 'Recomiendo cambiar el disco duro.' },
];

/** Precios de referencia (COP) del catálogo base de Cámaras y CCTV de ARPA Suite. */
const CCTV_PARTS = {
  camara: { name: 'Cámara bala HD 2MP exterior', unitPrice: 110000, labor: 85000 },
  disco: { name: 'Disco duro 1TB vigilancia', unitPrice: 220000, labor: 40000 },
  fuente: { name: 'Fuente de poder 12V 5A', unitPrice: 45000, labor: 30000 },
  grabador: { name: 'DVR 4 canales 1080P', unitPrice: 280000, labor: 65000 },
  conectores: { name: 'Cambio de conectores y cableado', unitPrice: 20000, labor: 40000 },
  sensor_pir: { name: 'Sensor de movimiento PIR', unitPrice: 35000, labor: 30000 },
  sirena: { name: 'Sirena exterior con flash', unitPrice: 85000, labor: 30000 },
  remoto: { name: 'Configuración acceso remoto', unitPrice: 0, labor: 65000 },
};

const CCTV_MANTENIMIENTO = [
  { id: 'lentes', label: 'Limpieza de lentes y domos' },
  { id: 'imagen', label: 'Imagen de cada cámara (día y noche)' },
  { id: 'grabacion', label: 'Grabación y días de respaldo' },
  { id: 'disco', label: 'Estado del disco duro' },
  { id: 'fuente', label: 'Fuentes y voltaje' },
  { id: 'conectores', label: 'Conectores y cableado' },
  { id: 'remoto', label: 'Acceso remoto en el celular' },
  { id: 'hora', label: 'Fecha y hora del grabador' },
];

const CCTV_INSTALACION = [
  { id: 'ubicacion', label: 'Ubicación y ángulos acordados con el cliente' },
  { id: 'cableado', label: 'Cableado canalizado y marcado' },
  { id: 'fuente', label: 'Fuentes / UPS instaladas' },
  { id: 'grabacion', label: 'Grabación configurada' },
  { id: 'remoto', label: 'Acceso remoto en el celular del cliente' },
  { id: 'clave', label: 'Usuario y contraseña entregados al cliente' },
  { id: 'entrega', label: 'Prueba de entrega con cliente' },
];

// ─── Refrigeración y aire acondicionado ───────────────────────────────────

const REF_EQUIPMENT = [
  { id: 'nevera', label: 'Nevera / congelador' },
  { id: 'split', label: 'Aire split' },
  { id: 'aire_central', label: 'Aire central' },
  { id: 'cuarto_frio', label: 'Cuarto frío' },
  { id: 'ref_comercial', label: 'Refrigeración comercial' },
  { id: 'otro', label: 'Otro' },
];

const REF_CHIPS_QUICK = [
  { id: 'no_enfria', label: 'No enfría', insert: 'Encontré que el equipo no enfría.' },
  { id: 'fuga', label: 'Fuga de gas', insert: 'Encontré fuga de gas refrigerante.' },
  { id: 'filtros', label: 'Filtros sucios', insert: 'Encontré los filtros sucios.' },
  { id: 'serpentin', label: 'Serpentín sucio', insert: 'Encontré el serpentín de la condensadora sucio.' },
  { id: 'goteo', label: 'Goteo de agua', insert: 'Encontré goteo de agua, el drenaje está tapado.' },
  { id: 'compresor', label: 'Ruido en compresor', insert: 'Encontré ruido en el compresor.' },
  { id: 'limpieza', label: 'Limpieza hecha', insert: 'Limpié filtros, evaporador y condensadora.' },
  { id: 'carga', label: 'Carga de gas hecha', insert: 'Realicé carga de gas refrigerante.' },
  { id: 'presiones', label: 'Presiones OK', insert: 'Verifiqué presiones y temperatura, queda operativo.' },
  { id: 'rec_mant', label: 'Recomendar mantenimiento', insert: 'Recomiendo mantenimiento preventivo cada 6 meses.' },
];

/** Precios de referencia (COP) del catálogo base de Refrigeración de ARPA Suite. */
const REF_PARTS = {
  carga_gas: { name: 'Carga de gas refrigerante', unitPrice: 0, labor: 180000 },
  diagnostico_ac: { name: 'Diagnóstico técnico', unitPrice: 0, labor: 65000 },
  limpieza_ac: { name: 'Limpieza profunda evaporador y condensadora', unitPrice: 0, labor: 95000 },
  filtro_deshidratador: { name: 'Filtro deshidratador', unitPrice: 35000, labor: 40000 },
  compresor: { name: 'Compresor', unitPrice: 450000, labor: 150000, needsQuote: true },
  termostato: { name: 'Termostato digital', unitPrice: 85000, labor: 40000 },
  control_ac: { name: 'Control remoto universal AC', unitPrice: 45000, labor: 0 },
  drenaje: { name: 'Destape de drenaje', unitPrice: 0, labor: 50000 },
};

const REF_MANTENIMIENTO = [
  { id: 'filtros', label: 'Limpieza de filtros' },
  { id: 'evaporador', label: 'Limpieza de evaporador' },
  { id: 'condensadora', label: 'Limpieza de condensadora / serpentín' },
  { id: 'drenaje', label: 'Drenaje y bandeja' },
  { id: 'presiones', label: 'Presiones de gas' },
  { id: 'temperatura', label: 'Temperatura de salida' },
  { id: 'electrico', label: 'Conexiones eléctricas y consumo' },
  { id: 'control', label: 'Control y termostato' },
];

const REF_INSTALACION = [
  { id: 'ubicacion', label: 'Ubicación de unidades acordada' },
  { id: 'soporte', label: 'Soporte y nivel de la condensadora' },
  { id: 'tuberia', label: 'Tubería de cobre y aislamiento' },
  { id: 'vacio', label: 'Vacío y prueba de fugas' },
  { id: 'electrico', label: 'Punto eléctrico y protección' },
  { id: 'drenaje', label: 'Drenaje con pendiente' },
  { id: 'entrega', label: 'Prueba de entrega con cliente' },
];

// ─── Electricidad ──────────────────────────────────────────────────────────

const ELEC_EQUIPMENT = [
  { id: 'residencial', label: 'Instalación residencial' },
  { id: 'comercial', label: 'Comercial / industrial' },
  { id: 'tablero', label: 'Tablero eléctrico' },
  { id: 'acometida', label: 'Acometida' },
  { id: 'iluminacion', label: 'Iluminación' },
  { id: 'tomas', label: 'Tomas y circuitos' },
  { id: 'tierra', label: 'Puesta a tierra' },
  { id: 'otro', label: 'Otro' },
];

const ELEC_CHIPS_QUICK = [
  { id: 'breaker', label: 'Breaker se dispara', insert: 'Encontré que el breaker se dispara.' },
  { id: 'toma', label: 'Toma quemada', insert: 'Encontré una toma quemada.' },
  { id: 'cable', label: 'Cable recalentado', insert: 'Encontré cable recalentado en el circuito.' },
  { id: 'tierra', label: 'Sin polo a tierra', insert: 'Encontré que la instalación no tiene polo a tierra.' },
  { id: 'luminaria', label: 'Luminaria dañada', insert: 'Encontré una luminaria dañada.' },
  { id: 'tablero', label: 'Tablero sin marcar', insert: 'Encontré el tablero sin marcar.' },
  { id: 'bornes', label: 'Ajuste de bornes', insert: 'Ajusté los bornes del tablero.' },
  { id: 'medicion', label: 'Medición OK', insert: 'Medí voltaje y continuidad, valores correctos.' },
  { id: 'prueba_ok', label: 'Circuito probado', insert: 'Probé los circuitos, queda operativo.' },
  { id: 'rec_tablero', label: 'Recomendar tablero', insert: 'Recomiendo cambiar el tablero.' },
];

/** Precios de referencia (COP) del catálogo base de Electricidad de ARPA Suite. */
const ELEC_PARTS = {
  breaker: { name: 'Breaker 1 polo 20A', unitPrice: 18000, labor: 25000 },
  toma: { name: 'Toma doble con polo a tierra', unitPrice: 9500, labor: 15000 },
  cable: { name: 'Cable 12 AWG (metro)', unitPrice: 2200, labor: 30000 },
  luminaria: { name: 'Luminaria LED panel 24W', unitPrice: 35000, labor: 20000 },
  tablero: { name: 'Tablero de distribución 12 circuitos', unitPrice: 95000, labor: 150000 },
  totalizador: { name: 'Totalizador 2x40A', unitPrice: 65000, labor: 40000 },
  tierra: { name: 'Puesta a tierra (varilla y conexión)', unitPrice: 0, labor: 0, needsQuote: true },
};

const ELEC_MANTENIMIENTO = [
  { id: 'tablero', label: 'Tablero: bornes, marcación y temperatura' },
  { id: 'breakers', label: 'Breakers y totalizador' },
  { id: 'tomas', label: 'Tomas y switches' },
  { id: 'tierra', label: 'Polo a tierra' },
  { id: 'voltaje', label: 'Medición de voltaje' },
  { id: 'consumo', label: 'Consumo por circuito' },
  { id: 'iluminacion', label: 'Iluminación' },
];

const ELEC_INSTALACION = [
  { id: 'diseno', label: 'Circuitos y cargas definidos' },
  { id: 'canalizacion', label: 'Canalización y cajas' },
  { id: 'calibre', label: 'Calibre de cable según carga' },
  { id: 'protecciones', label: 'Protecciones instaladas' },
  { id: 'tierra', label: 'Polo a tierra' },
  { id: 'marcacion', label: 'Marcación del tablero' },
  { id: 'entrega', label: 'Prueba de entrega con cliente' },
];

const GENERIC_REPARACION = [
  { id: 'diagnostico', label: 'Diagnóstico de la falla' },
  { id: 'causa', label: 'Causa raíz identificada' },
  { id: 'repuesto', label: 'Repuesto instalado o pendiente' },
  { id: 'prueba_falla', label: 'Prueba después de la intervención' },
  { id: 'recomendacion', label: 'Recomendación informada al cliente' },
];

/** Checklist por tipo de servicio para los oficios sin ciclo de apertura. */
function checklistFor(mant, inst) {
  return (serviceType) => {
    const extra =
      serviceType === 'instalacion' ? inst
        : serviceType === 'reparacion' ? GENERIC_REPARACION
          : mant;
    return [...extra, ...CHECKLIST_COMMON.filter((i) => i.id !== 'ciclo' && i.id !== 'seguridad')];
  };
}

// ─── Gas ───────────────────────────────────────────────────────────────────

const GAS_EQUIPMENT = [
  { id: 'red_gas', label: 'Instalación interna' },
  { id: 'gasodomestico', label: 'Gasodoméstico' },
  { id: 'revision_gas', label: 'Revisión reglamentaria' },
  { id: 'fuga_gas', label: 'Reparación de fuga' },
  { id: 'calentador', label: 'Calentador' },
  { id: 'otro', label: 'Otro' },
];

const GAS_CHIPS_QUICK = [
  { id: 'olor', label: 'Olor a gas', insert: 'Encontré olor a gas en la cocina.' },
  { id: 'fuga_union', label: 'Fuga en unión', insert: 'Encontré fuga de gas en una unión.' },
  { id: 'regulador', label: 'Regulador fallando', insert: 'Encontré el regulador fallando.' },
  { id: 'conector', label: 'Conector vencido', insert: 'Encontré el conector flexible vencido.' },
  { id: 'llama', label: 'Llama amarilla', insert: 'Encontré llama amarilla en los quemadores.' },
  { id: 'calentador', label: 'Calentador no enciende', insert: 'Encontré que el calentador no enciende.' },
  { id: 'sellado', label: 'Uniones selladas', insert: 'Sellé las uniones con teflón para gas.' },
  { id: 'ventilacion', label: 'Ventilación revisada', insert: 'Revisé las rejillas de ventilación.' },
  { id: 'hermeticidad', label: 'Hermeticidad OK', insert: 'Hice prueba de hermeticidad, sin fugas.' },
  { id: 'rec_detector', label: 'Recomendar detector', insert: 'Recomiendo instalar detector de gas.' },
];

/** Precios de referencia (COP) del catálogo base de Gas de ARPA Suite. */
const GAS_PARTS = {
  hermeticidad: { name: 'Prueba de hermeticidad', unitPrice: 0, labor: 80000 },
  regulador: { name: 'Regulador de presión doméstico', unitPrice: 65000, labor: 30000 },
  conector_gas: { name: 'Conector flexible 60cm', unitPrice: 28000, labor: 20000 },
  valvula_gas: { name: 'Válvula de paso 1/2"', unitPrice: 35000, labor: 30000 },
  detector_gas: { name: 'Detector de gas', unitPrice: 85000, labor: 20000 },
  diagnostico_gas: { name: 'Visita técnica diagnóstico', unitPrice: 0, labor: 65000 },
  calentador: { name: 'Calentador paso a paso 10L', unitPrice: 520000, labor: 150000, needsQuote: true },
};

const GAS_MANTENIMIENTO = [
  { id: 'hermeticidad', label: 'Prueba de hermeticidad' },
  { id: 'regulador', label: 'Regulador y presión' },
  { id: 'conectores', label: 'Conectores flexibles (fecha y estado)' },
  { id: 'valvulas', label: 'Válvulas de paso' },
  { id: 'quemadores', label: 'Llama y quemadores' },
  { id: 'ventilacion', label: 'Rejillas de ventilación' },
  { id: 'calentador', label: 'Calentador y ducto de evacuación' },
];

const GAS_INSTALACION = [
  { id: 'trazado', label: 'Trazado de la red acordado' },
  { id: 'materiales', label: 'Tubería y accesorios certificados' },
  { id: 'valvulas', label: 'Válvula de corte por gasodoméstico' },
  { id: 'hermeticidad', label: 'Prueba de hermeticidad' },
  { id: 'ventilacion', label: 'Ventilación del recinto' },
  { id: 'evacuacion', label: 'Ducto de evacuación del calentador' },
  { id: 'entrega', label: 'Prueba de entrega con cliente' },
];

// ─── Plomería ──────────────────────────────────────────────────────────────

const PLO_EQUIPMENT = [
  { id: 'red_hidraulica', label: 'Red hidráulica' },
  { id: 'red_sanitaria', label: 'Red sanitaria' },
  { id: 'fuga_agua', label: 'Fuga / reparación' },
  { id: 'calentador', label: 'Calentador' },
  { id: 'griferia', label: 'Grifería / sanitarios' },
  { id: 'bomba', label: 'Bomba / presión' },
  { id: 'otro', label: 'Otro' },
];

const PLO_CHIPS_QUICK = [
  { id: 'fuga', label: 'Fuga de agua', insert: 'Encontré fuga de agua en la tubería.' },
  { id: 'tapado', label: 'Desagüe tapado', insert: 'Encontré el desagüe tapado.' },
  { id: 'grifo', label: 'Grifo goteando', insert: 'Encontré el grifo goteando.' },
  { id: 'sanitario', label: 'Sanitario no descarga', insert: 'Encontré que el sanitario no descarga bien.' },
  { id: 'presion', label: 'Baja presión', insert: 'Encontré baja presión de agua.' },
  { id: 'humedad', label: 'Humedad en pared', insert: 'Encontré humedad en la pared.' },
  { id: 'destape', label: 'Destape hecho', insert: 'Realicé destape de la tubería.' },
  { id: 'empaque', label: 'Cambio de empaque', insert: 'Cambié el empaque de la llave.' },
  { id: 'prueba_ok', label: 'Sin fugas', insert: 'Probé la red, queda sin fugas.' },
  { id: 'rec_grifo', label: 'Recomendar grifo', insert: 'Recomiendo cambiar el grifo.' },
];

/** Precios de referencia (COP) del catálogo base de Plomería de ARPA Suite. */
const PLO_PARTS = {
  tuberia_pvc: { name: 'Tubo PVC 1/2" presión (metro) y accesorios', unitPrice: 8500, labor: 40000 },
  destape: { name: 'Destape tubería (punto)', unitPrice: 0, labor: 85000 },
  grifo: { name: 'Grifo monomando', unitPrice: 185000, labor: 40000 },
  llave_paso: { name: 'Llave de paso 1/2"', unitPrice: 28000, labor: 30000 },
  sifon: { name: 'Sifón PVC lavaplatos', unitPrice: 18000, labor: 25000 },
  diagnostico_plo: { name: 'Visita técnica diagnóstico', unitPrice: 0, labor: 65000 },
  punto_hidraulico: { name: 'Instalación punto hidráulico', unitPrice: 0, labor: 120000 },
};

const PLO_MANTENIMIENTO = [
  { id: 'fugas', label: 'Revisión de fugas visibles' },
  { id: 'llaves', label: 'Llaves de paso' },
  { id: 'griferia', label: 'Grifería y empaques' },
  { id: 'sanitarios', label: 'Sanitarios: descarga y sellos' },
  { id: 'desagues', label: 'Desagües y sifones' },
  { id: 'presion', label: 'Presión de agua' },
  { id: 'bomba', label: 'Bomba y tanque (si tiene)' },
];

const PLO_INSTALACION = [
  { id: 'trazado', label: 'Trazado acordado con el cliente' },
  { id: 'materiales', label: 'Tubería y accesorios del diámetro correcto' },
  { id: 'pendientes', label: 'Pendientes de desagüe' },
  { id: 'presion', label: 'Prueba de presión' },
  { id: 'sellos', label: 'Sellos y uniones' },
  { id: 'entrega', label: 'Prueba de entrega con cliente' },
];

// ─── Control de plagas ─────────────────────────────────────────────────────

const PLA_EQUIPMENT = [
  { id: 'desinsectacion', label: 'Desinsectación' },
  { id: 'desratizacion', label: 'Desratización' },
  { id: 'desinfeccion', label: 'Desinfección' },
  { id: 'fumigacion', label: 'Fumigación general' },
  { id: 'preventivo', label: 'Control preventivo' },
  { id: 'otro', label: 'Otro' },
];

const PLA_CHIPS_QUICK = [
  { id: 'cucarachas', label: 'Cucarachas', insert: 'Encontré presencia de cucarachas en la cocina.' },
  { id: 'roedores', label: 'Roedores', insert: 'Encontré rastros de roedores.' },
  { id: 'hormigas', label: 'Hormigas', insert: 'Encontré presencia de hormigas.' },
  { id: 'zancudos', label: 'Zancudos', insert: 'Encontré presencia de zancudos.' },
  { id: 'entradas', label: 'Puntos de entrada', insert: 'Encontré puntos de entrada sin sellar.' },
  { id: 'gel', label: 'Gel aplicado', insert: 'Apliqué gel en los puntos críticos.' },
  { id: 'cebaderos', label: 'Cebaderos instalados', insert: 'Instalé cebaderos para roedores.' },
  { id: 'nebulizacion', label: 'Nebulización hecha', insert: 'Realicé nebulización del área.' },
  { id: 'certificado', label: 'Certificado entregado', insert: 'Entregué el certificado sanitario.' },
  { id: 'rec_plan', label: 'Recomendar plan', insert: 'Recomiendo plan trimestral de control.' },
];

/** Precios de referencia (COP) del catálogo base de Control de plagas de ARPA Suite. */
const PLA_PARTS = {
  cucarachas: { name: 'Control de cucarachas (punto)', unitPrice: 0, labor: 120000 },
  roedores: { name: 'Control de ratas (cebadero)', unitPrice: 95000, labor: 0 },
  hormigas: { name: 'Control de hormigas', unitPrice: 0, labor: 95000 },
  zancudos: { name: 'Control de zancudos/mosquitos', unitPrice: 0, labor: 130000 },
  termitas: { name: 'Control de termitas', unitPrice: 0, labor: 450000 },
  certificado: { name: 'Certificado sanitario', unitPrice: 0, labor: 85000 },
  plan_trimestral: { name: 'Plan trimestral', unitPrice: 0, labor: 480000 },
};

const PLA_MANTENIMIENTO = [
  { id: 'inspeccion', label: 'Inspección de áreas críticas' },
  { id: 'evidencias', label: 'Evidencias de plaga registradas' },
  { id: 'entradas', label: 'Puntos de entrada revisados' },
  { id: 'aplicacion', label: 'Producto aplicado y dosis' },
  { id: 'cebaderos', label: 'Cebaderos revisados y repuestos' },
  { id: 'indicaciones', label: 'Indicaciones de reingreso al cliente' },
  { id: 'certificado', label: 'Certificado entregado' },
];

// ─── Línea blanca ──────────────────────────────────────────────────────────

const LB_EQUIPMENT = [
  { id: 'lavadora', label: 'Lavadora' },
  { id: 'nevera', label: 'Nevera' },
  { id: 'estufa', label: 'Estufa / horno' },
  { id: 'secadora', label: 'Secadora' },
  { id: 'lavavajillas', label: 'Lavavajillas' },
  { id: 'otro', label: 'Otro' },
];

const LB_CHIPS_QUICK = [
  { id: 'centrifuga', label: 'No centrifuga', insert: 'Encontré que la lavadora no centrifuga.' },
  { id: 'desagua', label: 'No desagua', insert: 'Encontré que la lavadora no desagua, bomba tapada.' },
  { id: 'bota_agua', label: 'Bota agua', insert: 'Encontré que el equipo bota agua.' },
  { id: 'no_enfria', label: 'Nevera no enfría', insert: 'Encontré que la nevera no enfría.' },
  { id: 'horno', label: 'Horno no calienta', insert: 'Encontré que el horno no calienta.' },
  { id: 'ruido', label: 'Ruido al centrifugar', insert: 'Encontré ruido al centrifugar.' },
  { id: 'filtro', label: 'Filtro limpio', insert: 'Limpié el filtro de la bomba.' },
  { id: 'tarjeta', label: 'Tarjeta con falla', insert: 'Encontré la tarjeta electrónica dañada.' },
  { id: 'ciclo_ok', label: 'Ciclo de prueba OK', insert: 'Probé un ciclo completo, queda operativo.' },
  { id: 'rec_mant', label: 'Recomendar mantenimiento', insert: 'Recomiendo mantenimiento preventivo cada año.' },
];

/** Precios de referencia (COP) del catálogo base de Línea blanca de ARPA Suite. */
const LB_PARTS = {
  motor_lavadora: { name: 'Cambio motor lavadora', unitPrice: 280000, labor: 0 },
  bomba_lavadora: { name: 'Cambio bomba lavadora', unitPrice: 150000, labor: 0 },
  temporizador: { name: 'Cambio temporizador lavadora', unitPrice: 120000, labor: 0 },
  tarjeta_lb: { name: 'Cambio tarjeta electrónica', unitPrice: 320000, labor: 0, needsQuote: true },
  resistencia_horno: { name: 'Cambio resistencia horno', unitPrice: 95000, labor: 0 },
  compresor_nevera: { name: 'Cambio compresor nevera', unitPrice: 450000, labor: 0, needsQuote: true },
  diagnostico_lb: { name: 'Diagnóstico técnico', unitPrice: 0, labor: 65000 },
};

const LB_MANTENIMIENTO = [
  { id: 'filtros', label: 'Filtros y bomba' },
  { id: 'mangueras', label: 'Mangueras y conexiones de agua' },
  { id: 'correas', label: 'Correas, rodamientos y amortiguadores' },
  { id: 'sellos', label: 'Empaques y sellos de puerta' },
  { id: 'electrico', label: 'Conexión eléctrica y tierra' },
  { id: 'temperatura', label: 'Temperatura (nevera / horno)' },
  { id: 'ciclo', label: 'Ciclo de prueba completo' },
];

const LB_INSTALACION = [
  { id: 'nivel', label: 'Nivel del equipo' },
  { id: 'agua', label: 'Toma y desagüe de agua' },
  { id: 'electrico', label: 'Toma eléctrica con polo a tierra' },
  { id: 'seguros', label: 'Seguros de transporte retirados' },
  { id: 'ciclo', label: 'Ciclo de prueba' },
  { id: 'entrega', label: 'Explicación de uso al cliente' },
];

// ─── Energía solar ─────────────────────────────────────────────────────────

const SOL_EQUIPMENT = [
  { id: 'panel', label: 'Panel solar' },
  { id: 'inversor', label: 'Inversor' },
  { id: 'baterias', label: 'Baterías' },
  { id: 'estructura_solar', label: 'Estructura / montaje' },
  { id: 'cableado_solar', label: 'Cableado DC/AC' },
  { id: 'mant_solar', label: 'Mantenimiento / limpieza' },
  { id: 'otro', label: 'Otro' },
];

const SOL_CHIPS_QUICK = [
  { id: 'sucios', label: 'Paneles sucios', insert: 'Encontré los paneles sucios.' },
  { id: 'inversor', label: 'Inversor con alarma', insert: 'Encontré el inversor con alarma de error.' },
  { id: 'baterias', label: 'Baterías no cargan', insert: 'Encontré las baterías bajas, no cargan.' },
  { id: 'mc4', label: 'Conector MC4 quemado', insert: 'Encontré un conector MC4 quemado.' },
  { id: 'sombra', label: 'Sombra en paneles', insert: 'Encontré sombra sobre los paneles.' },
  { id: 'estructura', label: 'Estructura floja', insert: 'Encontré la estructura floja.' },
  { id: 'limpieza', label: 'Limpieza hecha', insert: 'Limpié los paneles.' },
  { id: 'medicion', label: 'Medición OK', insert: 'Medí voltaje y corriente, valores correctos.' },
  { id: 'produccion', label: 'Producción revisada', insert: 'Revisé la producción en el inversor.' },
  { id: 'rec_limpieza', label: 'Recomendar limpieza', insert: 'Recomiendo limpieza de paneles cada 3 meses.' },
];

/** Precios de referencia (COP) del catálogo base de Energía solar de ARPA Suite. */
const SOL_PARTS = {
  limpieza_panel: { name: 'Limpieza paneles (unidad)', unitPrice: 0, labor: 45000 },
  diagnostico_solar: { name: 'Diagnóstico sistema existente', unitPrice: 0, labor: 120000 },
  inversor: { name: 'Inversor solar', unitPrice: 1850000, labor: 0, needsQuote: true },
  bateria_solar: { name: 'Batería gel 100Ah 12V', unitPrice: 680000, labor: 0 },
  mc4: { name: 'Conector MC4 (par)', unitPrice: 8500, labor: 20000 },
  controlador: { name: 'Controlador de carga MPPT 30A', unitPrice: 280000, labor: 0 },
  estructura_panel: { name: 'Estructura soporte panel (unidad)', unitPrice: 185000, labor: 0 },
};

const SOL_MANTENIMIENTO = [
  { id: 'limpieza', label: 'Limpieza de paneles' },
  { id: 'sombras', label: 'Sombras sobre los paneles' },
  { id: 'estructura', label: 'Estructura y anclajes' },
  { id: 'conectores', label: 'Conectores MC4 y cableado' },
  { id: 'inversor', label: 'Inversor: alarmas y producción' },
  { id: 'baterias', label: 'Baterías: voltaje y estado' },
  { id: 'protecciones', label: 'Protecciones DC/AC' },
];

const SOL_INSTALACION = [
  { id: 'orientacion', label: 'Orientación e inclinación de paneles' },
  { id: 'estructura', label: 'Estructura anclada' },
  { id: 'cableado', label: 'Cableado DC/AC y conectores' },
  { id: 'protecciones', label: 'Protecciones y puesta a tierra' },
  { id: 'inversor', label: 'Inversor configurado' },
  { id: 'monitoreo', label: 'Monitoreo en el celular del cliente' },
  { id: 'entrega', label: 'Prueba de entrega con cliente' },
];

// ─── Taller de motos ───────────────────────────────────────────────────────

const MOT_EQUIPMENT = [
  { id: 'revision_moto', label: 'Revisión general' },
  { id: 'mant_moto', label: 'Mantenimiento' },
  { id: 'reparacion_moto', label: 'Reparación' },
  { id: 'aceite', label: 'Cambio de aceite' },
  { id: 'frenos', label: 'Frenos / llantas' },
  { id: 'otro', label: 'Otro' },
];

const MOT_CHIPS_QUICK = [
  { id: 'pastillas', label: 'Pastillas gastadas', insert: 'Encontré las pastillas de freno gastadas.' },
  { id: 'kit', label: 'Kit de arrastre gastado', insert: 'Encontré el kit de arrastre gastado.' },
  { id: 'aceite', label: 'Aceite vencido', insert: 'Encontré el aceite vencido.' },
  { id: 'bateria', label: 'Batería baja', insert: 'Encontré la batería baja.' },
  { id: 'llanta', label: 'Llanta lisa', insert: 'Encontré la llanta trasera lisa.' },
  { id: 'arranque', label: 'No arranca', insert: 'Encontré que la moto no arranca.' },
  { id: 'cambio_aceite', label: 'Cambio de aceite hecho', insert: 'Cambié el aceite y el filtro.' },
  { id: 'cadena', label: 'Ajuste de cadena', insert: 'Ajusté y lubriqué la cadena.' },
  { id: 'prueba_ok', label: 'Prueba en ruta OK', insert: 'Hice prueba en ruta, queda operativa.' },
  { id: 'rec_kit', label: 'Recomendar kit', insert: 'Recomiendo cambiar el kit de arrastre.' },
];

/**
 * Mano de obra del catálogo base de Taller de motos (hora 40.000; aceite 25.000).
 * Los repuestos varían mucho por modelo: quedan "por cotizar".
 */
const MOT_PARTS = {
  pastillas: { name: 'Pastillas de freno', unitPrice: 0, labor: 40000, needsQuote: true },
  kit_arrastre: { name: 'Kit de arrastre', unitPrice: 0, labor: 40000, needsQuote: true },
  aceite: { name: 'Aceite y filtro', unitPrice: 0, labor: 25000, needsQuote: true },
  bateria_moto: { name: 'Batería de moto', unitPrice: 0, labor: 40000, needsQuote: true },
  llanta: { name: 'Llanta', unitPrice: 0, labor: 40000, needsQuote: true },
  diagnostico_moto: { name: 'Diagnóstico de falla', unitPrice: 0, labor: 40000 },
};

const MOT_MANTENIMIENTO = [
  { id: 'aceite', label: 'Aceite y filtro' },
  { id: 'frenos', label: 'Frenos: pastillas, bandas y líquido' },
  { id: 'kit', label: 'Kit de arrastre: cadena, piñón y corona' },
  { id: 'llantas', label: 'Llantas y presión' },
  { id: 'electrico', label: 'Luces, pito y batería' },
  { id: 'bujia', label: 'Bujía y filtro de aire' },
  { id: 'ruta', label: 'Prueba en ruta' },
];

const MOT_REVISION = [
  { id: 'recepcion', label: 'Kilometraje y estado de recepción' },
  { id: 'motor', label: 'Motor: ruidos y fugas' },
  { id: 'frenos', label: 'Frenos' },
  { id: 'suspension', label: 'Suspensión y dirección' },
  { id: 'electrico', label: 'Sistema eléctrico' },
  { id: 'llantas', label: 'Llantas' },
  { id: 'ruta', label: 'Prueba en ruta' },
];

// ─── Selección del oficio ──────────────────────────────────────────────────

const PACKS = {
  automatismos: { equipment: DOOR_EQUIPMENT, chips: DOOR_CHIPS_QUICK, parts: DOOR_PARTS, checklist: doorChecklist },
  metalmecanica: { equipment: METAL_EQUIPMENT, chips: METAL_CHIPS_QUICK, parts: METAL_PARTS, checklist: metalChecklist },
  cctv: {
    equipment: CCTV_EQUIPMENT, chips: CCTV_CHIPS_QUICK, parts: CCTV_PARTS,
    checklist: checklistFor(CCTV_MANTENIMIENTO, CCTV_INSTALACION),
    hint: 'O escriba: encontré una cámara sin imagen, cambié la fuente…',
  },
  refrigeracion: {
    equipment: REF_EQUIPMENT, chips: REF_CHIPS_QUICK, parts: REF_PARTS,
    checklist: checklistFor(REF_MANTENIMIENTO, REF_INSTALACION),
    hint: 'O escriba: encontré el equipo sin gas, limpié filtros y evaporador…',
  },
  electricidad: {
    equipment: ELEC_EQUIPMENT, chips: ELEC_CHIPS_QUICK, parts: ELEC_PARTS,
    checklist: checklistFor(ELEC_MANTENIMIENTO, ELEC_INSTALACION),
    hint: 'O escriba: encontré el breaker disparado, cambié la toma quemada…',
  },
  gas: {
    equipment: GAS_EQUIPMENT, chips: GAS_CHIPS_QUICK, parts: GAS_PARTS,
    checklist: checklistFor(GAS_MANTENIMIENTO, GAS_INSTALACION),
    hint: 'O escriba: encontré fuga en una unión, cambié el regulador…',
  },
  plomeria: {
    equipment: PLO_EQUIPMENT, chips: PLO_CHIPS_QUICK, parts: PLO_PARTS,
    checklist: checklistFor(PLO_MANTENIMIENTO, PLO_INSTALACION),
    hint: 'O escriba: encontré fuga en la tubería, destapé el desagüe…',
  },
  plagas: {
    equipment: PLA_EQUIPMENT, chips: PLA_CHIPS_QUICK, parts: PLA_PARTS,
    checklist: checklistFor(PLA_MANTENIMIENTO, PLA_MANTENIMIENTO),
    hint: 'O escriba: encontré presencia de cucarachas, apliqué gel…',
  },
  linea_blanca: {
    equipment: LB_EQUIPMENT, chips: LB_CHIPS_QUICK, parts: LB_PARTS,
    checklist: checklistFor(LB_MANTENIMIENTO, LB_INSTALACION),
    hint: 'O escriba: encontré que la lavadora no centrifuga, limpié el filtro…',
  },
  solar: {
    equipment: SOL_EQUIPMENT, chips: SOL_CHIPS_QUICK, parts: SOL_PARTS,
    checklist: checklistFor(SOL_MANTENIMIENTO, SOL_INSTALACION),
    hint: 'O escriba: encontré los paneles sucios, el inversor con alarma…',
  },
  taller_motos: {
    equipment: MOT_EQUIPMENT, chips: MOT_CHIPS_QUICK, parts: MOT_PARTS,
    checklist: checklistFor(MOT_MANTENIMIENTO, MOT_REVISION),
    hint: 'O escriba: encontré las pastillas gastadas, cambié el aceite…',
  },
};

const ALL_EQUIPMENT = Object.values(PACKS).flatMap((p) => p.equipment);

/** Oficio principal elegido en ARPA Suite (cerrajería se guarda como metalmecanica). */
export function detectOficio(storage) {
  try {
    const s = storage || (typeof window !== 'undefined' && window.localStorage ? window.localStorage : null);
    if (!s) return 'automatismos';
    const forced = s.getItem('arpa_next_oficio');
    if (forced && PACKS[forced]) return forced;
    const settings = JSON.parse(s.getItem('arpa_suite_user_settings') || '{}');
    const first = String((settings.activeOficios || [])[0] || '').toLowerCase();
    const id = first === 'cerrajeria' ? 'metalmecanica' : first;
    return PACKS[id] ? id : 'automatismos';
  } catch (e) {
    return 'automatismos';
  }
}

export const ACTIVE_OFICIO = detectOficio();
const PACK = PACKS[ACTIVE_OFICIO];

export const EQUIPMENT_TYPES = PACK.equipment;
export const QUICK_CHIPS = PACK.chips;
export const CAPTURE_HINT = PACK.hint || (ACTIVE_OFICIO === 'metalmecanica'
  ? 'O escriba: encontré los resortes sin tensión, lubriqué guías y eje…'
  : 'O escriba: encontré desgaste del piñón, ajusté la cremallera…');
/** Repuestos de todos los oficios: las reglas de cualquier oficio encuentran su precio. */
export const PART_CATALOG = Object.assign({}, ...Object.values(PACKS).map((p) => p.parts));

export function getChecklist(serviceType) {
  return PACK.checklist(serviceType).map((item) => ({ ...item, done: false, note: '' }));
}

export function equipmentTypeLabel(id) {
  return ALL_EQUIPMENT.find((t) => t.id === id)?.label || id || 'Equipo';
}

export function serviceTypeLabel(id) {
  return SERVICE_TYPES.find((t) => t.id === id)?.label || id || 'Servicio';
}

export const PART_CHIPS = Object.entries(PACK.parts).map(([id, p]) => ({
  id,
  name: p.name,
}));
