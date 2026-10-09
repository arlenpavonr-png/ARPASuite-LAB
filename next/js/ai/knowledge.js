/**
 * Conocimiento de campo por oficio (automatismos, cerrajería/metalmecánica,
 * cámaras/CCTV, refrigeración y electricidad).
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
export const PART_CATALOG = { ...DOOR_PARTS, ...METAL_PARTS, ...CCTV_PARTS, ...REF_PARTS, ...ELEC_PARTS };

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
