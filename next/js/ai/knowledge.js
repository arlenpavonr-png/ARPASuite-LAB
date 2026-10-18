/**
 * Conocimiento de campo por oficio (automatismos y cerrajería/metalmecánica).
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

// ─── Selección del oficio ──────────────────────────────────────────────────

const PACKS = {
  automatismos: { equipment: DOOR_EQUIPMENT, chips: DOOR_CHIPS_QUICK, parts: DOOR_PARTS, checklist: doorChecklist },
  metalmecanica: { equipment: METAL_EQUIPMENT, chips: METAL_CHIPS_QUICK, parts: METAL_PARTS, checklist: metalChecklist },
};

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
export const CAPTURE_HINT = ACTIVE_OFICIO === 'metalmecanica'
  ? 'O escriba: encontré los resortes sin tensión, lubriqué guías y eje…'
  : 'O escriba: encontré desgaste del piñón, ajusté la cremallera…';
/** Repuestos de todos los oficios: las reglas de cualquier oficio encuentran su precio. */
export const PART_CATALOG = { ...DOOR_PARTS, ...METAL_PARTS };

export function getChecklist(serviceType) {
  return PACK.checklist(serviceType).map((item) => ({ ...item, done: false, note: '' }));
}

export function equipmentTypeLabel(id) {
  const all = [...DOOR_EQUIPMENT, ...METAL_EQUIPMENT];
  return all.find((t) => t.id === id)?.label || id || 'Equipo';
}

export function serviceTypeLabel(id) {
  return SERVICE_TYPES.find((t) => t.id === id)?.label || id || 'Servicio';
}

export const PART_CHIPS = Object.entries(PACK.parts).map(([id, p]) => ({
  id,
  name: p.name,
}));
