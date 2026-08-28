/**
 * Conocimiento de campo para automatización de puertas y motores.
 * No copia catálogos de terceros: nombres genéricos + precios de referencia LAB.
 */

export const EQUIPMENT_TYPES = [
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

export const QUICK_CHIPS = [
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

export const PART_CATALOG = {
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

export function getChecklist(serviceType) {
  const extra =
    serviceType === 'instalacion' ? CHECKLIST_INSTALACION
      : serviceType === 'reparacion' ? CHECKLIST_REPARACION
        : CHECKLIST_MANTENIMIENTO;
  return [...extra, ...CHECKLIST_COMMON].map((item) => ({
    ...item,
    done: false,
    note: '',
  }));
}

export function equipmentTypeLabel(id) {
  return EQUIPMENT_TYPES.find((t) => t.id === id)?.label || id || 'Equipo';
}

export function serviceTypeLabel(id) {
  return SERVICE_TYPES.find((t) => t.id === id)?.label || id || 'Servicio';
}
