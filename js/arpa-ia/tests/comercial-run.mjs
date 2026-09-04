/**
 * Pruebas exhaustivas del motor local ARPA IA COMERCIAL (sin red, sin claves).
 * Uso: node js/arpa-ia/tests/comercial-run.mjs
 */
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');

const PRODUCTION_LICENSE = 'https://script.google.com/macros/s/AKfycbzKBeyDVWVqPG1R47EZTVKmCpa3SOwxs8LXrW4ipvRtiyyRV4trJKg7D4i89_cUTcH2/exec';
const PRODUCTION_COT = 'https://script.google.com/macros/s/AKfycbyV0-C_XACD5suCh9gm1JkiKvrI3mket-z5GSFGFc6Y87HZaqFyCtVz7jmtQMayNEUeJg/exec';

const memory = {};
let fetchCalls = 0;

const sandbox = {
  console,
  parseInt,
  parseFloat,
  Number,
  String,
  Boolean,
  Array,
  Object,
  JSON,
  Math,
  Date,
  RegExp,
  Error,
  fetch: function () {
    fetchCalls += 1;
    return Promise.reject(new Error('IA Comercial no debe llamar red'));
  },
  localStorage: {
    getItem: function (k) {
      return Object.prototype.hasOwnProperty.call(memory, k) ? memory[k] : null;
    },
    setItem: function (k, v) {
      memory[k] = String(v);
    },
    removeItem: function (k) {
      delete memory[k];
    }
  }
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);

function load(rel) {
  const code = readFileSync(path.join(root, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

const COMERCIAL_FILES = [
  'js/arpa-ia/comercial/comercial-datos.js',
  'js/arpa-ia/comercial/comercial-reglas.js',
  'js/arpa-ia/comercial/comercial-analizador.js',
  'js/arpa-ia/comercial/comercial-api.js'
];

COMERCIAL_FILES.forEach(load);

const analizar = sandbox.ArpaIaComercial.analizar;
const analizarDesdeArpaSuite = sandbox.ArpaIaComercial.analizarDesdeArpaSuite;
const reglas = sandbox.ArpaIaComercialReglas;
const datos = sandbox.ArpaIaComercialDatos;
const HOY = '2026-09-02';

let passed = 0;
let failed = 0;

function section(title) {
  console.log('\n' + title);
}

function assert(cond, label) {
  if (cond) {
    passed += 1;
    console.log('  ok  ' + label);
  } else {
    failed += 1;
    console.log('  FAIL  ' + label);
  }
}

function tipos(res) {
  return (res.oportunidades || []).map(function (o) { return o.tipo; });
}

function delCliente(res, nombre) {
  return (res.oportunidades || []).filter(function (o) { return o.cliente === nombre; });
}

function deTipo(res, tipo) {
  return (res.oportunidades || []).filter(function (o) { return o.tipo === tipo; });
}

function clavesTipo(ops) {
  const seen = {};
  (ops || []).forEach(function (o) {
    const k = o.tipo + '|' + o.cliente + '|' + o.fecha_referencia + '|' + o.servicio_relacionado;
    seen[k] = (seen[k] || 0) + 1;
  });
  return seen;
}

function srcComercial() {
  return COMERCIAL_FILES.map(function (rel) {
    return readFileSync(path.join(root, rel), 'utf8');
  }).join('\n');
}

section('Chasis — estructura y sin invención');
{
  const vacio = analizar({ hoy: HOY, historial: [], clientes: [] });
  assert(!!vacio && Array.isArray(vacio.oportunidades), 'devuelve oportunidades[]');
  assert(vacio.fuente === 'local', 'fuente local');
  assert(vacio.hoy === HOY, 'respeta la fecha de análisis');
  assert(vacio.oportunidades.length === 0, 'datos vacíos: cero oportunidades');
  assert(vacio.faltantes.length >= 1, 'datos vacíos: declara faltantes');
  assert(!JSON.stringify(vacio).includes(PRODUCTION_LICENSE), 'no incrusta LICENSE de producción');
  assert(!JSON.stringify(vacio).includes(PRODUCTION_COT), 'no incrusta COT de producción');
  assert(reglas.MESES_MANTENIMIENTO === 6, 'intervalo de mantenimiento es 6 meses');
  assert(reglas.fechaProximaMantenimiento('2026-03-02') === '2026-09-02', '6 meses desde una fecha real');
  assert(reglas.fechaProximaMantenimiento('') === '', 'sin fecha no inventa la de 6 meses');
}

section('1. Instalación con fecha real → 6 meses');
{
  const res = analizar({
    hoy: HOY,
    historial: [{
      modulo: 'formato',
      cliente: 'Conjunto Los Almendros',
      ciudad: 'Envigado',
      fecha: '2026-04-02',
      subtipo: 'Instalación',
      tipo: 'Instalación',
      numero: 'OT-010',
      concepto: 'Instalación motor corrediza'
    }]
  });
  const ops = deTipo(res, 'mantenimiento_proximo');
  assert(ops.length === 1, '1 crea mantenimiento_proximo');
  assert(ops[0].cliente === 'Conjunto Los Almendros', '1 conserva el cliente real');
  assert(ops[0].fecha_referencia === '2026-04-02', '1 usa la fecha de instalación');
  assert(ops[0].fecha_proxima === '2026-10-02', '1 calcula 6 meses: 2026-10-02');
  assert(ops[0].dias_para_vencimiento === 30, '1 faltan 30 días');
  assert(ops[0].prioridad === 'ALTA', '1 prioridad ALTA por estar a 30 días');
  assert(/6 meses|instalaci/i.test(ops[0].motivo), '1 explica el motivo');
  assert(!deTipo(res, 'mantenimiento_vencido').length, '1 no lo marca vencido');
  assert(reglas.fechaProximaMantenimiento('2026-03-31') === '2026-09-30', '1 fin de mes: 31 mar + 6m = 30 sep');
}

section('2. Instalación sin fecha — no inventar, marcar faltante');
{
  const res = analizar({
    hoy: HOY,
    historial: [{
      modulo: 'formato',
      cliente: 'Sin Fecha',
      subtipo: 'Instalación',
      tipo: 'Instalación',
      numero: 'OT-060',
      concepto: 'Instalación sin fecha'
    }]
  });
  assert(deTipo(res, 'mantenimiento_proximo').length === 0, '2 no crea próximo');
  assert(deTipo(res, 'mantenimiento_vencido').length === 0, '2 no crea vencido');
  assert(!(res.oportunidades || []).some(function (o) { return o.fecha_proxima; }), '2 no inventa fecha de mantenimiento');
  const falta = (res.faltantes || []).some(function (f) {
    return f.cliente === 'Sin Fecha' && f.faltan.indexOf('fecha') >= 0;
  });
  assert(falta, '2 declara fecha faltante');
}

section('3. Mantenimiento próximo — fecha y prioridad');
{
  const media = analizar({
    hoy: HOY,
    historial: [{
      modulo: 'formato',
      cliente: 'Cliente Media',
      fecha: '2026-05-02',
      subtipo: 'Instalación',
      tipo: 'Instalación',
      numero: 'OT-011'
    }]
  });
  const opMedia = deTipo(media, 'mantenimiento_proximo')[0];
  assert(!!opMedia, '3 MEDIA: detecta próximo');
  assert(opMedia.fecha_proxima === '2026-11-02', '3 MEDIA: fecha 2026-11-02');
  assert(opMedia.dias_para_vencimiento === 61, '3 MEDIA: 61 días');
  assert(opMedia.prioridad === 'MEDIA', '3 MEDIA: prioridad MEDIA (31–90 días)');
  assert(!!opMedia.motivo, '3 MEDIA: tiene motivo');

  const baja = analizar({
    hoy: HOY,
    historial: [{
      modulo: 'formato',
      cliente: 'Cliente Baja',
      fecha: '2026-06-15',
      subtipo: 'Instalación',
      tipo: 'Instalación',
      numero: 'OT-012'
    }]
  });
  const opBaja = deTipo(baja, 'mantenimiento_proximo')[0];
  assert(!!opBaja, '3 BAJA: detecta próximo');
  assert(opBaja.fecha_proxima === '2026-12-15', '3 BAJA: fecha 2026-12-15');
  assert(opBaja.dias_para_vencimiento === 104, '3 BAJA: 104 días');
  assert(opBaja.prioridad === 'BAJA', '3 BAJA: prioridad BAJA (>90 días)');
}

section('4. Mantenimiento vencido — prioridad ALTA');
{
  const res = analizar({
    hoy: HOY,
    historial: [{
      modulo: 'formato',
      cliente: 'Cliente Vencido',
      fecha: '2025-01-15',
      subtipo: 'Instalación',
      tipo: 'Instalación',
      numero: 'OT-020',
      concepto: 'Instalación BFT'
    }]
  });
  const ops = deTipo(res, 'mantenimiento_vencido');
  assert(ops.length === 1, '4 crea mantenimiento_vencido');
  assert(ops[0].fecha_referencia === '2025-01-15', '4 conserva la fecha real');
  assert(ops[0].fecha_proxima === '2025-07-15', '4 vencimiento a 6 meses');
  assert(ops[0].dias_para_vencimiento < 0, '4 días negativos = vencido');
  assert(ops[0].prioridad === 'ALTA', '4 prioridad ALTA');
  assert(/venci/i.test(ops[0].motivo), '4 explica que venció');
}

section('5. Cliente con varios servicios → recurrente');
{
  const res = analizar({
    hoy: HOY,
    historial: [
      { modulo: 'formato', cliente: 'Cliente Recurrente', fecha: '2026-01-10', subtipo: 'Instalación', tipo: 'Instalación', numero: 'OT-031' },
      { modulo: 'formato', cliente: 'Cliente Recurrente', fecha: '2026-03-10', subtipo: 'Mantenimiento', tipo: 'Mantenimiento', numero: 'OT-032' },
      { modulo: 'formato', cliente: 'Cliente Recurrente', fecha: '2026-07-10', subtipo: 'Reparación', tipo: 'Reparación', numero: 'OT-033' }
    ]
  });
  const rec = deTipo(res, 'oportunidad_recurrente');
  assert(rec.length === 1, '5 crea oportunidad_recurrente');
  assert(rec[0].cliente === 'Cliente Recurrente', '5 mismo cliente');
  assert(/3 servicios/.test(rec[0].motivo), '5 menciona los 3 servicios reales');
  const mant = deTipo(res, 'mantenimiento_proximo').concat(deTipo(res, 'mantenimiento_vencido'));
  assert(mant.length === 1, '5 el ciclo usa el último mantenimiento real (2026-03-10 + 6m), no la reparación');
  assert(mant[0].fecha_referencia === '2026-03-10', '5 no inventa otra fecha de referencia');
  assert(mant[0].fecha_proxima === '2026-09-10', '5 próxima = 2026-09-10');
  assert(mant[0].tipo === 'mantenimiento_proximo', '5 aún no vence el 2026-09-10');
}

section('6. Último servicio hace 180+ días → seguimiento_cliente');
{
  const exacto = analizar({
    hoy: HOY,
    historial: [{
      modulo: 'formato',
      cliente: 'Cliente 180',
      fecha: '2026-03-06',
      subtipo: 'Reparación',
      tipo: 'Reparación',
      numero: 'OT-180'
    }]
  });
  const op180 = deTipo(exacto, 'seguimiento_cliente');
  assert(op180.length === 1, '6 exacto 180 días: detecta seguimiento');
  assert(op180[0].fecha_referencia === '2026-03-06', '6 exacto: fecha real');
  assert(op180[0].prioridad === 'MEDIA', '6 180 días = MEDIA');
  assert(/180/.test(op180[0].motivo), '6 motivo con los días reales');

  const corto = analizar({
    hoy: HOY,
    historial: [{
      modulo: 'formato',
      cliente: 'Cliente 179',
      fecha: '2026-03-07',
      subtipo: 'Reparación',
      tipo: 'Reparación',
      numero: 'OT-179'
    }]
  });
  assert(deTipo(corto, 'seguimiento_cliente').length === 0, '6 179 días: no crea seguimiento');

  const largo = analizar({
    hoy: HOY,
    historial: [{
      modulo: 'formato',
      cliente: 'Cliente Año',
      fecha: '2025-08-01',
      subtipo: 'Mantenimiento',
      tipo: 'Mantenimiento',
      numero: 'OT-365'
    }]
  });
  const opLargo = deTipo(largo, 'seguimiento_cliente')[0];
  assert(!!opLargo, '6 ≥365 días: detecta seguimiento');
  assert(opLargo.prioridad === 'ALTA', '6 ≥365 días = ALTA');
}

section('7. Cotización sin cierre');
{
  const res = analizar({
    hoy: HOY,
    historial: [{
      modulo: 'cotizacion',
      cliente: 'Cliente Cotización',
      fecha: '2026-07-20',
      numero: 'COT-040',
      total: 1500000,
      documento: 'Cotización',
      tipo: 'Cotización'
    }]
  });
  const ops = deTipo(res, 'cotizacion_sin_cierre');
  assert(ops.length === 1, '7 detecta cotización sin cierre');
  assert(ops[0].cliente === 'Cliente Cotización', '7 cliente real');
  assert(ops[0].fecha_referencia === '2026-07-20', '7 fecha real de la cotización');
  assert(/1500000/.test(ops[0].motivo), '7 usa el total registrado, no inventa otro');
  assert(!/2500000|2\.500/.test(JSON.stringify(ops[0])), '7 no inventa un precio distinto');
  assert(ops[0].prioridad === 'ALTA', '7 cotización abierta ≥30 días = ALTA');

  const cerradaCobro = analizar({
    hoy: HOY,
    historial: [
      { modulo: 'cotizacion', cliente: 'Cliente Cerrado', fecha: '2026-07-20', numero: 'COT-041', total: 800000 },
      { modulo: 'cuenta-cobro', cliente: 'Cliente Cerrado', fecha: '2026-08-01', numero: 'CC-041' }
    ]
  });
  assert(deTipo(cerradaCobro, 'cotizacion_sin_cierre').length === 0, '7 no marca si hay cuenta de cobro posterior');

  const cerradaOt = analizar({
    hoy: HOY,
    historial: [
      { modulo: 'cotizacion', cliente: 'Cliente OT', fecha: '2026-07-20', numero: 'COT-042', total: 500000 },
      { modulo: 'formato', cliente: 'Cliente OT', fecha: '2026-08-10', subtipo: 'Instalación', tipo: 'Instalación', numero: 'OT-042' }
    ]
  });
  assert(deTipo(cerradaOt, 'cotizacion_sin_cierre').length === 0, '7 no marca si hay formato posterior');
}

section('8. Varias condiciones simultáneas — sin duplicar');
{
  const res = analizar({
    hoy: HOY,
    historial: [
      { modulo: 'formato', cliente: 'Cliente Multi', fecha: '2025-01-10', subtipo: 'Instalación', tipo: 'Instalación', numero: 'OT-081' },
      { modulo: 'formato', cliente: 'Cliente Multi', fecha: '2025-03-10', subtipo: 'Reparación', tipo: 'Reparación', numero: 'OT-082' },
      { modulo: 'cotizacion', cliente: 'Cliente Multi', fecha: '2026-06-01', numero: 'COT-080', total: 400000, tipo: 'Cotización' }
    ]
  });
  const ops = delCliente(res, 'Cliente Multi');
  const set = tipos({ oportunidades: ops });
  assert(ops.length >= 3, '8 varias oportunidades del mismo cliente');
  assert(set.indexOf('mantenimiento_vencido') >= 0, '8 incluye mantenimiento vencido');
  assert(set.indexOf('oportunidad_recurrente') >= 0, '8 incluye recurrente');
  assert(set.indexOf('cotizacion_sin_cierre') >= 0, '8 incluye cotización sin cierre');
  assert(set.indexOf('seguimiento_cliente') >= 0, '8 incluye seguimiento');
  assert(ops.every(function (o) { return o.cliente === 'Cliente Multi'; }), '8 no inventa otro cliente');
  const counts = clavesTipo(ops);
  assert(Object.keys(counts).every(function (k) { return counts[k] === 1; }), '8 no duplica la misma oportunidad');
  assert(deTipo(res, 'mantenimiento_vencido').length === 1, '8 un solo mantenimiento_vencido');
  assert(deTipo(res, 'oportunidad_recurrente').length === 1, '8 una sola recurrente');
  assert(deTipo(res, 'cotizacion_sin_cierre').length === 1, '8 una sola cotización sin cierre');
  assert(deTipo(res, 'seguimiento_cliente').length === 1, '8 un solo seguimiento');

  const dupHist = analizar({
    hoy: HOY,
    historial: [
      { modulo: 'formato', cliente: 'Dup', fecha: '2026-04-02', subtipo: 'Instalación', tipo: 'Instalación', numero: 'OT-010' },
      { modulo: 'formato', cliente: 'Dup', fecha: '2026-04-02', subtipo: 'Instalación', tipo: 'Instalación', numero: 'OT-010' }
    ]
  });
  assert(deTipo(dupHist, 'mantenimiento_proximo').length === 1, '8 historial duplicado no crea dos próximos');
  assert(deTipo(dupHist, 'oportunidad_recurrente').length === 1, '8 dos registros del mismo cliente = una recurrente');
}

section('9. Cliente sin información suficiente — no inventar');
{
  const res = analizar({
    hoy: HOY,
    historial: [{
      modulo: 'formato',
      cliente: 'Cliente Incompleto',
      numero: 'OT-050'
    }]
  });
  assert(deTipo(res, 'mantenimiento_proximo').length === 0, '9 no inventa mantenimiento próximo');
  assert(deTipo(res, 'mantenimiento_vencido').length === 0, '9 no inventa mantenimiento vencido');
  assert(deTipo(res, 'seguimiento_cliente').length === 0, '9 no inventa seguimiento');
  const falta = (res.faltantes || []).some(function (f) {
    return f.cliente === 'Cliente Incompleto' && f.faltan.indexOf('fecha') >= 0;
  });
  assert(falta, '9 declara fecha faltante');
  assert(!(res.oportunidades || []).some(function (o) { return o.fecha_proxima && !o.fecha_referencia; }), '9 no inventa fecha_proxima');
  assert(!(res.oportunidades || []).some(function (o) { return /BFT|precio|1500000/.test(JSON.stringify(o)); }), '9 no inventa marca ni precio');
}

section('10. Datos vacíos — respuesta segura');
{
  const vacio = analizar({});
  assert(vacio.ok === true, '10 {} responde ok');
  assert(Array.isArray(vacio.oportunidades) && vacio.oportunidades.length === 0, '10 {} sin oportunidades');
  assert((vacio.faltantes || []).length >= 1, '10 {} indica faltantes');
  assert(!(vacio.oportunidades || []).some(function (o) { return o.cliente; }), '10 {} no inventa cliente');

  const nulo = analizar(null);
  assert(nulo.ok === true && nulo.oportunidades.length === 0, '10 null responde seguro');

  const basura = analizar({ hoy: HOY, historial: 'no-es-array', clientes: 7 });
  assert(basura.ok === true && basura.oportunidades.length === 0, '10 historial inválido no rompe');

  const sinCliente = analizar({
    hoy: HOY,
    historial: [{ modulo: 'formato', fecha: '2026-04-02', subtipo: 'Instalación', numero: 'OT-X' }]
  });
  assert(sinCliente.oportunidades.length === 0, '10 registro sin cliente no crea oportunidad');
  assert((sinCliente.faltantes || []).some(function (f) { return f.faltan.indexOf('cliente') >= 0; }), '10 declara cliente faltante');
}

section('11. Fechas inválidas — no producir fechas falsas');
{
  assert(datos.parseFecha('2026-02-30') === '', '11 2026-02-30 no se acepta');
  assert(datos.parseFecha('2026-13-01') === '', '11 2026-13-01 no se acepta');
  assert(datos.parseFecha('abc') === '', '11 texto no se convierte en fecha');
  assert(datos.parseFecha('99/99/9999') === '', '11 99/99/9999 no se acepta');
  assert(datos.parseFecha('15/01/2025') === '', '11 dd/mm/aaaa no se inventa como ISO');
  assert(datos.parseFecha('') === '', '11 vacío queda vacío');
  assert(datos.parseFecha(null) === '', '11 null queda vacío');
  assert(datos.parseFecha('2026-04-02T14:30:00') === '2026-04-02', '11 ISO con hora sí usa el día real');
  assert(reglas.fechaProximaMantenimiento('2026-02-30') === '', '11 6 meses sobre inválida = vacío');
  assert(reglas.diasEntre('2026-02-30', HOY) == null, '11 días sobre inválida = null');

  const res = analizar({
    hoy: HOY,
    historial: [{
      modulo: 'formato',
      cliente: 'Fecha Falsa',
      fecha: '2026-02-30',
      subtipo: 'Instalación',
      tipo: 'Instalación',
      numero: 'OT-BAD'
    }]
  });
  assert(deTipo(res, 'mantenimiento_proximo').length === 0, '11 no crea próximo con fecha inválida');
  assert(deTipo(res, 'mantenimiento_vencido').length === 0, '11 no crea vencido con fecha inválida');
  assert(!(res.oportunidades || []).some(function (o) { return o.fecha_proxima || o.fecha_referencia; }), '11 no inventa fecha_proxima ni referencia');
  assert((res.faltantes || []).some(function (f) {
    return f.cliente === 'Fecha Falsa' && f.faltan.indexOf('fecha') >= 0;
  }), '11 marca fecha faltante');

  const noSavedAt = analizar({
    hoy: HOY,
    historial: [{
      modulo: 'formato',
      cliente: 'Solo SavedAt',
      savedAt: '2026-04-02T10:00:00.000Z',
      subtipo: 'Instalación',
      tipo: 'Instalación',
      numero: 'OT-SAV'
    }]
  });
  assert(deTipo(noSavedAt, 'mantenimiento_proximo').length === 0, '11 savedAt no se usa como fecha de instalación');
  assert(!(noSavedAt.oportunidades || []).some(function (o) { return o.fecha_referencia === '2026-04-02'; }), '11 no toma savedAt como referencia');
}

section('12. Prioridades ALTA / MEDIA / BAJA y motivo');
{
  assert(reglas.prioridadMantenimiento(0) === 'ALTA', '12 mant 0 días = ALTA');
  assert(reglas.prioridadMantenimiento(-10) === 'ALTA', '12 mant vencido = ALTA');
  assert(reglas.prioridadMantenimiento(30) === 'ALTA', '12 mant 30 días = ALTA');
  assert(reglas.prioridadMantenimiento(31) === 'MEDIA', '12 mant 31 días = MEDIA');
  assert(reglas.prioridadMantenimiento(90) === 'MEDIA', '12 mant 90 días = MEDIA');
  assert(reglas.prioridadMantenimiento(91) === 'BAJA', '12 mant 91 días = BAJA');
  assert(reglas.prioridadSeguimiento(180) === 'MEDIA', '12 seguimiento 180 = MEDIA');
  assert(reglas.prioridadSeguimiento(364) === 'MEDIA', '12 seguimiento 364 = MEDIA');
  assert(reglas.prioridadSeguimiento(365) === 'ALTA', '12 seguimiento 365 = ALTA');
  assert(reglas.prioridadCotizacion(6) === 'BAJA', '12 cotización 6 días = BAJA');
  assert(reglas.prioridadCotizacion(7) === 'MEDIA', '12 cotización 7 días = MEDIA');
  assert(reglas.prioridadCotizacion(30) === 'ALTA', '12 cotización 30 días = ALTA');

  const mixto = analizar({
    hoy: HOY,
    historial: [
      { modulo: 'formato', cliente: 'Prio Alta', fecha: '2025-01-15', subtipo: 'Instalación', tipo: 'Instalación', numero: 'OT-A' },
      { modulo: 'formato', cliente: 'Prio Media', fecha: '2026-05-02', subtipo: 'Instalación', tipo: 'Instalación', numero: 'OT-M' },
      { modulo: 'formato', cliente: 'Prio Baja', fecha: '2026-06-15', subtipo: 'Instalación', tipo: 'Instalación', numero: 'OT-B' }
    ]
  });
  const pries = mixto.oportunidades.filter(function (o) { return o.tipo.indexOf('mantenimiento_') === 0; });
  assert(pries.some(function (o) { return o.prioridad === 'ALTA'; }), '12 hay ALTA en el resultado');
  assert(pries.some(function (o) { return o.prioridad === 'MEDIA'; }), '12 hay MEDIA en el resultado');
  assert(pries.some(function (o) { return o.prioridad === 'BAJA'; }), '12 hay BAJA en el resultado');
  assert(mixto.oportunidades.every(function (o) {
    return o.motivo && String(o.motivo).trim().length > 0;
  }), '12 cada oportunidad tiene motivo');
  assert(mixto.oportunidades.every(function (o) {
    return o.prioridad === 'ALTA' || o.prioridad === 'MEDIA' || o.prioridad === 'BAJA';
  }), '12 cada oportunidad tiene prioridad válida');
}

section('13. Seguridad de datos — local, sin red, sin clave, sin chat');
{
  const src = srcComercial();
  assert(src.indexOf(PRODUCTION_LICENSE) === -1, '13 código sin LICENSE de producción');
  assert(src.indexOf(PRODUCTION_COT) === -1, '13 código sin COT de producción');
  assert(!/sk-[A-Za-z0-9]/.test(src), '13 código sin API key');
  assert(src.indexOf('fetch(') === -1, '13 motor no hace fetch');
  assert(!/XMLHttpRequest|WebSocket|navigator\.sendBeacon/.test(src), '13 motor no envía a servicios externos');
  assert(!/setItem|removeItem|saveRecords|saveCliente|addRecord/.test(src), '13 motor no escribe historial ni clientes');
  assert(!/openai|anthropic|api\.openai|chatgpt/i.test(src), '13 motor sin LLM');
  assert(!/conversaci[oó]n|historial de chat|messages\s*=/.test(src), '13 motor no guarda conversaciones');

  const keysAntes = Object.keys(memory).slice();
  analizar({
    hoy: HOY,
    historial: [{
      modulo: 'formato',
      cliente: 'Seguro',
      fecha: '2026-04-02',
      subtipo: 'Instalación',
      tipo: 'Instalación',
      numero: 'OT-SEC'
    }]
  });
  assert(fetchCalls === 0, '13 analizar() no llamó fetch');
  assert(Object.keys(memory).length === keysAntes.length, '13 analizar() no escribió localStorage');

  sandbox.ArpaHistorial = {
    getRecords: function () {
      return [{ modulo: 'formato', cliente: 'Desde Suite', fecha: '2026-04-02', subtipo: 'Instalación', tipo: 'Instalación', numero: 'OT-HS' }];
    },
    getClientes: function () {
      return [{ nombre: 'Desde Suite' }];
    }
  };
  const desde = analizarDesdeArpaSuite({ hoy: HOY });
  assert(deTipo(desde, 'mantenimiento_proximo')[0] && deTipo(desde, 'mantenimiento_proximo')[0].cliente === 'Desde Suite', '13 analizarDesdeArpaSuite lee historial inyectado');
  assert(fetchCalls === 0, '13 analizarDesdeArpaSuite no llama red');
}

load('js/arpa-ia/comercial/comercial-ui.js');
const ui = sandbox.ArpaIaComercialUi;

section('14. Panel visual — casos de integración');
{
  const p1 = ui.renderHtml(analizar({
    hoy: HOY,
    historial: [{
      modulo: 'formato',
      cliente: 'Conjunto Los Almendros',
      fecha: '2026-04-02',
      subtipo: 'Instalación',
      tipo: 'Instalación',
      numero: 'OT-010',
      concepto: 'Instalación motor corrediza'
    }]
  }));
  assert(/Mantenimiento próximo/.test(p1.html), '14.1 instalación con fecha: muestra próximo');
  assert(/Conjunto Los Almendros/.test(p1.html), '14.1 cliente real');
  assert(/2026-10-02/.test(p1.html), '14.1 fecha a 6 meses');
  assert(/ALTA/.test(p1.html), '14.1 prioridad');
  assert(/Acción:/.test(p1.html), '14.1 acción sugerida');

  const p2 = ui.renderHtml(analizar({
    hoy: HOY,
    historial: [{
      modulo: 'formato',
      cliente: 'Cliente Vencido',
      fecha: '2025-01-15',
      subtipo: 'Instalación',
      tipo: 'Instalación',
      numero: 'OT-020'
    }]
  }));
  assert(/Mantenimiento vencido/.test(p2.html), '14.2 muestra vencido');
  assert(/Cliente Vencido/.test(p2.html), '14.2 cliente real');
  assert(/ALTA/.test(p2.html), '14.2 prioridad ALTA');

  const p3 = ui.renderHtml(analizar({
    hoy: HOY,
    historial: [
      { modulo: 'formato', cliente: 'Cliente Recurrente', fecha: '2026-01-10', subtipo: 'Instalación', tipo: 'Instalación', numero: 'OT-031' },
      { modulo: 'formato', cliente: 'Cliente Recurrente', fecha: '2026-03-10', subtipo: 'Mantenimiento', tipo: 'Mantenimiento', numero: 'OT-032' },
      { modulo: 'formato', cliente: 'Cliente Recurrente', fecha: '2026-07-10', subtipo: 'Reparación', tipo: 'Reparación', numero: 'OT-033' }
    ]
  }));
  assert(/Oportunidad recurrente/.test(p3.html), '14.3 varios servicios: recurrente');
  assert((p3.html.match(/Cliente Recurrente/g) || []).length >= 2, '14.3 el mismo cliente en más de una tarjeta');

  const p4 = ui.renderHtml(analizar({
    hoy: HOY,
    historial: [{
      modulo: 'cotizacion',
      cliente: 'Cliente Cotización',
      fecha: '2026-07-20',
      numero: 'COT-040',
      total: 1500000,
      tipo: 'Cotización'
    }]
  }));
  assert(/Cotización sin cierre/.test(p4.html), '14.4 cotización sin cierre');
  assert(/1500000/.test(p4.html), '14.4 total real, no inventado');

  const p5 = ui.renderHtml(analizar({
    hoy: HOY,
    historial: [{
      modulo: 'formato',
      cliente: 'Sin Fecha',
      subtipo: 'Instalación',
      tipo: 'Instalación',
      numero: 'OT-060'
    }]
  }));
  assert(p5.notas.indexOf(ui.MSG_FALTA_FECHA) >= 0, '14.5 sin fecha: mensaje de faltante');
  assert(!/2026-10-02|2026-04-02/.test(p5.html), '14.5 no inventa fecha de mantenimiento');
  assert(!/Mantenimiento próximo|Mantenimiento vencido/.test(p5.html), '14.5 no crea oportunidad de mantenimiento');

  const p6 = ui.renderHtml(analizar({
    hoy: HOY,
    historial: [{
      modulo: 'formato',
      cliente: 'Al día',
      fecha: '2026-08-20',
      subtipo: 'Reparación',
      tipo: 'Reparación',
      numero: 'OT-OK'
    }]
  }));
  assert(p6.empty, '14.6 reparación reciente: sin oportunidades');
  assert(p6.notas.indexOf(ui.MSG_SIN_OPORTUNIDADES) >= 0, '14.6 mensaje de sin oportunidades');
  assert(!/Mantenimiento|Cotización sin cierre|Oportunidad recurrente/.test(p6.html), '14.6 no inventa tipos');

  const htmlVacio = ui.renderHtml({ oportunidades: [], faltantes: [] });
  assert(htmlVacio.notas.indexOf(ui.MSG_SIN_OPORTUNIDADES) >= 0, '14.6 datos vacíos: mensaje seguro');
  assert(!/WhatsApp|enviar|campaña/i.test(p1.html + p6.html), '14 no ofrece envío automático');
}

section('15. Integración LAB — panel, otros motores intactos, sin producción');
{
  const htmlApp = readFileSync(path.join(root, 'index.html'), 'utf8');
  const views = readFileSync(path.join(root, 'js/arpa-views.js'), 'utf8');
  const sw = readFileSync(path.join(root, 'service-worker.js'), 'utf8');
  const uiSrc = readFileSync(path.join(root, 'js/arpa-ia/comercial/comercial-ui.js'), 'utf8');
  assert(htmlApp.indexOf('id="historial-ia-comercial"') >= 0, '15 panel en Historial');
  assert(/ARPA IA COMERCIAL/.test(htmlApp), '15 título del panel');
  assert(htmlApp.indexOf('comercial-ui.js') >= 0, '15 carga comercial-ui.js');
  assert(htmlApp.indexOf('id="formato-ia-tecnica"') >= 0, '15 IA Técnica OT sigue en el formato');
  assert(htmlApp.indexOf('id="formato-ia-informes"') >= 0, '15 IA Informes sigue en el formato');
  assert(htmlApp.indexOf('arpa-ia-cot-panel') >= 0 || htmlApp.indexOf('cotizador-ui.js') >= 0, '15 Cotizador IA sigue cargado');
  assert(views.indexOf('ArpaIaComercialUi') >= 0, '15 Historial refresca el panel al abrir');
  assert(/ia-fase/.test(sw), '15 service worker actualizado');
  assert(uiSrc.indexOf(PRODUCTION_LICENSE) === -1, '15 UI comercial sin LICENSE de producción');
  assert(uiSrc.indexOf('fetch(') === -1, '15 UI sin fetch');
  assert(uiSrc.indexOf('setItem') === -1, '15 UI no escribe storage');
  assert(!/ArpaWhatsApp|wa\.me|api\.whatsapp|sendWhatsApp/.test(uiSrc), '15 UI no envía WhatsApp ni campañas');
  assert(!/openai|anthropic|sk-[A-Za-z0-9]/.test(uiSrc), '15 UI sin LLM ni API key');
  assert(uiSrc.indexOf('getRecords') === -1 && uiSrc.indexOf('analizarDesdeArpaSuite') >= 0, '15 UI reutiliza el motor, no otra base');
}

section('16. Datos reales del LAB — captura, lectura y sin escritura');
{
  const formatoInstalacion = {
    id: 'lab-ot-010',
    modulo: 'formato',
    documento: 'Formato de Servicio',
    subtipo: 'Instalación',
    tipo: 'Instalación',
    numero: 'OT-010',
    numeroOt: 'OT-010',
    cliente: 'Conjunto Residencial Los Almendros',
    ciudad: 'Envigado',
    fecha: '2026-04-02',
    concepto: 'Instalación — BFT',
    estado: 'CERRADA',
    fechaHoraFinalizacion: '',
    materiales: [],
    fullSnapshot: {
      _tipo: 'instalacion',
      'formato-fecha': '2026-04-02',
      'formato-cliente-nombre': 'Conjunto Residencial Los Almendros',
      'sel-marca': 'BFT',
      'ref-manual': 'ARES 1500'
    },
    savedAt: '2026-09-02T18:00:00.000Z'
  };
  const formatoSinFecha = {
    id: 'lab-ot-nf',
    modulo: 'formato',
    documento: 'Formato de Servicio',
    subtipo: 'Instalación',
    tipo: 'Instalación',
    numero: 'OT-NF',
    cliente: 'Cliente Sin Fecha LAB',
    fecha: '',
    fullSnapshot: {
      _tipo: 'instalacion',
      'formato-cliente-nombre': 'Cliente Sin Fecha LAB'
    },
    savedAt: '2026-09-02T10:00:00.000Z'
  };
  const formatoVencido = {
    id: 'lab-ot-020',
    modulo: 'formato',
    documento: 'Formato de Servicio',
    subtipo: 'Instalación',
    tipo: 'Instalación',
    numero: 'OT-020',
    cliente: 'Cliente Vencido LAB',
    fecha: '2025-01-15',
    fullSnapshot: {
      _tipo: 'instalacion',
      'formato-fecha': '2025-01-15',
      'formato-cliente-nombre': 'Cliente Vencido LAB',
      'sel-marca': 'BFT'
    },
    savedAt: '2025-01-16T12:00:00.000Z'
  };
  const formatoViejo = {
    id: 'lab-ot-180',
    modulo: 'formato',
    documento: 'Formato de Servicio',
    subtipo: 'Reparación',
    tipo: 'Reparación',
    numero: 'OT-180',
    cliente: 'Cliente Seguimiento LAB',
    fecha: '2026-03-06',
    fullSnapshot: { _tipo: 'reparacion', 'formato-fecha': '2026-03-06' }
  };
  const cotPendiente = {
    id: 'lab-cot-040',
    modulo: 'cotizacion',
    documento: 'Cotización',
    tipo: 'Cotización',
    numero: 'COT-040',
    cliente: 'Cliente Cotización LAB',
    fecha: '2026-07-20',
    total: 1500000,
    fullSnapshot: { cliente: 'Cliente Cotización LAB', fecha: '2026-07-20', filas: [] },
    savedAt: '2026-07-20T15:00:00.000Z'
  };
  const rec1 = {
    id: 'lab-ot-r1',
    modulo: 'formato',
    documento: 'Formato de Servicio',
    subtipo: 'Instalación',
    tipo: 'Instalación',
    numero: 'OT-031',
    cliente: 'Cliente Recurrente LAB',
    fecha: '2026-01-10',
    fullSnapshot: { _tipo: 'instalacion', 'formato-fecha': '2026-01-10' }
  };
  const rec2 = {
    id: 'lab-ot-r2',
    modulo: 'formato',
    documento: 'Formato de Servicio',
    subtipo: 'Mantenimiento',
    tipo: 'Mantenimiento',
    numero: 'OT-032',
    cliente: 'Cliente Recurrente LAB',
    fecha: '2026-03-10',
    fullSnapshot: { _tipo: 'mantenimiento', 'formato-fecha': '2026-03-10' }
  };

  const norm = datos.normalizarRegistro(formatoInstalacion);
  assert(norm.fecha === '2026-04-02', '16 usa formato-fecha / fecha, no savedAt');
  assert(norm.equipo === 'BFT ARES 1500', '16 lee sel-marca y ref-manual reales');
  assert(norm.tipo_servicio === 'instalacion', '16 lee _tipo real del snapshot');
  assert(datos.fechaServicio({ savedAt: '2026-09-02T18:00:00.000Z', modulo: 'formato' }) === '', '16 savedAt solo no es fecha de servicio');

  const prox = analizar({ hoy: HOY, historial: [formatoInstalacion] });
  const opProx = deTipo(prox, 'mantenimiento_proximo')[0];
  assert(!!opProx, '16 instalación real → mantenimiento próximo');
  assert(opProx.fecha_proxima === '2026-10-02', '16 calcula 6 meses desde la fecha real');
  assert(/BFT ARES 1500/.test(opProx.servicio_relacionado), '16 muestra el equipo registrado');

  const sinF = analizar({ hoy: HOY, historial: [formatoSinFecha] });
  assert(deTipo(sinF, 'mantenimiento_proximo').length === 0, '16 sin fecha: no inventa próximo');
  assert(deTipo(sinF, 'mantenimiento_vencido').length === 0, '16 sin fecha: no inventa vencido');
  assert(!(sinF.oportunidades || []).some(function (o) { return o.fecha_proxima; }), '16 sin fecha: no crea fecha_proxima');
  assert((sinF.faltantes || []).some(function (f) { return f.faltan.indexOf('fecha') >= 0; }), '16 declara fecha faltante');

  const venc = analizar({ hoy: HOY, historial: [formatoVencido] });
  assert(deTipo(venc, 'mantenimiento_vencido').length === 1, '16 mantenimiento real vencido');
  assert(deTipo(venc, 'mantenimiento_vencido')[0].fecha_proxima === '2025-07-15', '16 vencimiento = fecha real + 6 meses');

  const cot = analizar({ hoy: HOY, historial: [cotPendiente] });
  assert(deTipo(cot, 'cotizacion_sin_cierre').length === 1, '16 cotización real pendiente');
  assert(/1500000/.test(deTipo(cot, 'cotizacion_sin_cierre')[0].motivo), '16 usa el total guardado');

  const seg = analizar({ hoy: HOY, historial: [formatoViejo] });
  assert(deTipo(seg, 'seguimiento_cliente').length === 1, '16 historial real de 180 días → seguimiento');

  const recu = analizar({ hoy: HOY, historial: [rec1, rec2] });
  assert(deTipo(recu, 'oportunidad_recurrente').length === 1, '16 varios formatos reales → recurrente');

  const vacio = analizar({ hoy: HOY, historial: [], clientes: [] });
  assert(vacio.oportunidades.length === 0, '16 historial vacío: cero oportunidades');

  let writes = 0;
  const prevSet = sandbox.localStorage.setItem;
  sandbox.localStorage.setItem = function () { writes += 1; prevSet.apply(this, arguments); };
  sandbox.ArpaHistorial = {
    getRecords: function () { return [formatoInstalacion, cotPendiente]; },
    getClientes: function () { return [{ id: 'c1', nombre: 'Conjunto Residencial Los Almendros', ciudad: 'Envigado' }]; },
    saveRecords: function () { writes += 1; },
    saveCliente: function () { writes += 1; }
  };
  const desde = analizarDesdeArpaSuite({ hoy: HOY });
  sandbox.localStorage.setItem = prevSet;
  assert(desde.oportunidades.length >= 2, '16 analizarDesdeArpaSuite lee getRecords reales');
  assert(writes === 0, '16 no escribe historial, clientes ni storage');
  assert(deTipo(desde, 'mantenimiento_proximo')[0].cliente === 'Conjunto Residencial Los Almendros', '16 conserva el cliente del historial');
  assert(deTipo(desde, 'mantenimiento_proximo')[0].id === 'lab-ot-010', '16 conserva el id real del historial');
  assert(deTipo(desde, 'mantenimiento_proximo')[0].numero === 'OT-010', '16 conserva el número real');
}

section('17. Usabilidad — resumen, faltantes y localizar documento');
{
  const mix = analizar({
    hoy: HOY,
    historial: [
      { id: 'lab-a', modulo: 'formato', cliente: 'Prio Alta', fecha: '2025-01-15', subtipo: 'Instalación', tipo: 'Instalación', numero: 'OT-A' },
      { id: 'lab-m', modulo: 'formato', cliente: 'Prio Media', fecha: '2026-05-02', subtipo: 'Instalación', tipo: 'Instalación', numero: 'OT-M' },
      { id: 'lab-b', modulo: 'formato', cliente: 'Prio Baja', fecha: '2026-06-15', subtipo: 'Instalación', tipo: 'Instalación', numero: 'OT-B' }
    ]
  });
  assert(mix.resumen && mix.resumen.por_prioridad.ALTA >= 1, '17 resumen ALTA');
  assert(mix.resumen.por_prioridad.MEDIA >= 1, '17 resumen MEDIA');
  assert(mix.resumen.por_prioridad.BAJA >= 1, '17 resumen BAJA');
  const htmlAll = ui.renderHtml(mix);
  assert(/Todas/.test(htmlAll.html) && /ALTA/.test(htmlAll.html), '17 panel muestra chips de prioridad');
  assert(/Ver en historial/.test(htmlAll.html), '17 botón Ver en historial si hay id');
  assert(/data-arpa-com-id="lab-a"/.test(htmlAll.html), '17 el botón usa el id real');
  const htmlAlta = ui.renderHtml(mix, 'ALTA');
  assert(htmlAlta.html.indexOf('Prio Baja') === -1, '17 filtro ALTA oculta BAJA');
  assert(htmlAlta.html.indexOf('Prio Alta') >= 0, '17 filtro ALTA conserva ALTA');

  const cotSinCliente = analizar({
    hoy: HOY,
    cotDraft: { numero: 'COT-013', fecha: '2026-09-02', nombre: '' }
  });
  assert(deTipo(cotSinCliente, 'cotizacion_sin_cierre').length === 0, '17 cotización sin cliente no inventa oportunidad');
  assert((cotSinCliente.faltantes || []).some(function (f) {
    return /COT-013/.test(f.detalle || '') && f.faltan.indexOf('cliente') >= 0;
  }), '17 declara cliente faltante del borrador COT-013');
  const htmlFalta = ui.renderHtml(cotSinCliente);
  assert(/COT-013/.test(htmlFalta.html) && /Datos faltantes/.test(htmlFalta.html), '17 el panel muestra el faltante');

  const uiSrc = readFileSync(path.join(root, 'js/arpa-ia/comercial/comercial-ui.js'), 'utf8');
  assert(uiSrc.indexOf('ArpaHistorial.verDocumento') === -1 && uiSrc.indexOf('.verDocumento(') === -1, '17 no abre/restaura el documento (no escribe draft)');
  assert(uiSrc.indexOf('setItem') === -1, '17 UI sigue sin escribir storage');
}

console.log('\n' + passed + ' pasadas, ' + failed + ' fallidas.');
if (failed) process.exit(1);
