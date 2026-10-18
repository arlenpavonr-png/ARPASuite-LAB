/**
 * Pruebas exhaustivas del núcleo ARPA IA COPILOTO (sin red, sin claves, sin escritura).
 * Uso: node js/arpa-ia/copiloto/copiloto-tests.mjs
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
let setItemCalls = 0;

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
  Promise,
  AbortController,
  setTimeout,
  clearTimeout,
  fetch: function () {
    fetchCalls += 1;
    return Promise.reject(new Error('Copiloto no debe llamar red'));
  },
  localStorage: {
    getItem: function (k) {
      return Object.prototype.hasOwnProperty.call(memory, k) ? memory[k] : null;
    },
    setItem: function (k, v) {
      setItemCalls += 1;
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

const FILES = [
  'js/arpa-ia/copiloto/copiloto-parser.js',
  'js/arpa-ia/copiloto/copiloto-consultas.js',
  'js/arpa-ia/copiloto/copiloto-respuesta.js',
  'js/arpa-ia/copiloto/copiloto-api.js'
];

FILES.forEach(load);
load('js/arpa-ia/copiloto/copiloto-llm.js');

const consultar = sandbox.ArpaIaCopiloto.consultar;
const consultarDesde = sandbox.ArpaIaCopiloto.consultarDesdeArpaSuite;
const parser = sandbox.ArpaIaCopilotoParser;
const consultas = sandbox.ArpaIaCopilotoConsultas;
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

function intent(pregunta) {
  return parser.parsear(pregunta).intencion;
}

function formaOk(r) {
  return !!(r && r.ok === true && typeof r.intencion === 'string' &&
    typeof r.datos_disponibles === 'boolean' && Array.isArray(r.resultados) &&
    typeof r.resumen === 'string' && Array.isArray(r.advertencias));
}

function snap(obj) {
  return JSON.stringify(obj);
}

const histBase = [
  {
    id: 'ot-hoy',
    modulo: 'formato',
    cliente: 'Conjunto Residencial Los Almendros',
    ciudad: 'Envigado',
    fecha: '2026-09-02',
    subtipo: 'Mantenimiento',
    tipo: 'Mantenimiento',
    numero: 'OT-001',
    concepto: 'Mantenimiento — BFT',
    estado: 'BORRADOR',
    fullSnapshot: {
      _tipo: 'mantenimiento',
      'formato-fecha': '2026-09-02',
      'formato-cliente-nombre': 'Conjunto Residencial Los Almendros',
      'sel-marca': 'BFT',
      'ref-manual': 'ARES 1500'
    }
  }
];

const clientesBase = [
  { id: 'cli-1', nombre: 'Conjunto Residencial Los Almendros', ciudad: 'Envigado' }
];

function ctx(extra) {
  return Object.assign({
    hoy: HOY,
    historial: histBase.map(function (r) { return Object.assign({}, r); }),
    clientes: clientesBase.map(function (c) { return Object.assign({}, c); }),
    oficio: 'automatismos'
  }, extra || {});
}

section('Chasis — forma, fuente local, sin red');
{
  const r = consultar('¿Qué trabajos tengo hoy?', ctx());
  assert(formaOk(r), 'respuesta tiene la forma requerida');
  assert(r.fuente === 'local', 'fuente local');
  assert(r.hoy === HOY, 'respeta la fecha de referencia');
  assert(r.oficio === 'automatismos', 'reporta el oficio configurado');
  assert(fetchCalls === 0, 'no llama fetch al consultar');
  const src = FILES.map(function (rel) { return readFileSync(path.join(root, rel), 'utf8'); }).join('\n');
  assert(src.indexOf(PRODUCTION_LICENSE) < 0, 'código no incrusta LICENSE de producción');
  assert(src.indexOf(PRODUCTION_COT) < 0, 'código no incrusta COT de producción');
  assert(!/\bopenai\b/i.test(src) && !/api[_-]?key/i.test(src), 'sin API key ni OpenAI');
  assert(!/whatsapp/i.test(src), 'sin WhatsApp');
  assert(src.indexOf('localStorage.setItem') < 0, 'código no escribe localStorage');
}

section('Parser — intenciones mínimas y variaciones');
{
  assert(intent('¿Qué trabajos tengo hoy?') === 'trabajos_hoy', 'A parser trabajos hoy');
  assert(intent('Muéstrame los trabajos de hoy') === 'trabajos_hoy', 'A variación trabajos de hoy');
  assert(intent('¿Qué servicios hice hoy?') === 'trabajos_hoy', 'A variación servicios hoy');
  assert(intent('¿Cuántos trabajos hice este mes?') === 'trabajos_periodo', 'periodo este mes');
  assert(intent('¿Qué servicios hice esta semana?') === 'trabajos_periodo', 'periodo esta semana');
  assert(intent('¿Qué mantenimientos tengo pendientes?') === 'mantenimientos_proximos', 'B pendientes → próximos');
  assert(intent('Muéstrame los mantenimientos próximos') === 'mantenimientos_proximos', 'B próximos');
  assert(intent('¿Qué mantenimientos tengo?') === 'mantenimientos_proximos', 'B mantenimiento sin vencido');
  assert(intent('¿Tengo mantenimientos vencidos?') === 'mantenimientos_vencidos', 'C vencidos');
  assert(intent('¿Hay mantenimientos atrasados?') === 'mantenimientos_vencidos', 'C atrasados');
  assert(intent('¿Qué clientes llevan más de 6 meses sin servicio?') === 'clientes_sin_seguimiento', 'D 6 meses');
  assert(intent('¿Qué clientes no atiendo hace más de 6 meses?') === 'clientes_sin_seguimiento', 'D no atiendo');
  assert(intent('¿Qué clientes llevan más de 180 días sin servicio?') === 'clientes_sin_seguimiento', 'D 180 días');
  assert(intent('¿Qué cotizaciones tengo pendientes?') === 'cotizaciones_pendientes', 'E pendientes');
  assert(intent('¿Qué cotizaciones están pendientes?') === 'cotizaciones_pendientes', 'E están pendientes');
  assert(intent('¿Qué cotizaciones están cerradas?') === 'cotizaciones_cerradas', 'cerradas');
  assert(intent('¿Qué cuentas de cobro están pendientes?') === 'cuentas_cobro_pendientes', 'F cuentas');
  assert(intent('¿Qué cuentas de cobro tengo pendientes?') === 'cuentas_cobro_pendientes', 'F tengo pendientes');
  assert(intent('¿Qué servicios tiene este cliente?') === 'cliente_historial', 'G este cliente');
  assert(intent('¿Qué servicios tiene el cliente Los Almendros?') === 'cliente_historial', 'G cliente nombrado');
  assert(parser.parsear('¿Qué servicios tiene el cliente Los Almendros?').cliente.indexOf('Los Almendros') >= 0, 'G extrae nombre');
  assert(intent('¿Cuánto vendí este mes?') === 'resumen_ventas', 'H vendí');
  assert(intent('¿Cuál es el resumen de ventas del mes?') === 'resumen_ventas', 'H ventas');
  assert(intent('¿Cuál es el clima en Envigado?') === 'desconocida', 'I desconocida clima');
  assert(intent('¿Cuáles clientes tienen más servicios?') === 'desconocida', 'I no inventa intención no soportada');
  assert(intent('') === 'desconocida', 'I pregunta vacía');
  assert(intent('hola') === 'desconocida', 'I saludo');
}

section('A. Trabajos de hoy');
{
  const r = consultar('¿Qué trabajos tengo hoy?', ctx());
  assert(r.intencion === 'trabajos_hoy', 'A intención');
  assert(r.datos_disponibles === true, 'A datos disponibles');
  assert(r.resultados.length === 1, 'A 1 trabajo hoy');
  assert(r.resultados[0].cliente === 'Conjunto Residencial Los Almendros', 'A cliente real');
  assert(r.resultados[0].numero === 'OT-001', 'A número real');
  assert(r.resultados[0].fecha === '2026-09-02', 'A fecha real');
  assert(r.resumen.indexOf('NO DISPONIBLE') < 0, 'A resume con datos');
}

section('A. Hoy sin coincidencias (otra fecha de referencia)');
{
  const r = consultar('¿Qué trabajos tengo hoy?', ctx({ hoy: '2026-08-01' }));
  assert(r.datos_disponibles === true, 'A otra fecha: sí se puede consultar');
  assert(r.resultados.length === 0, 'A otra fecha: 0 trabajos (no inventa)');
}

section('B. Mantenimientos próximos');
{
  const r = consultar('¿Qué mantenimientos tengo pendientes?', ctx());
  assert(r.intencion === 'mantenimientos_proximos', 'B intención');
  assert(r.datos_disponibles === true, 'B se puede calcular: hay fecha real');
  assert(r.resultados.length === 1, 'B 1 próximo');
  assert(r.resultados[0].fecha === '2026-09-02', 'B usa fecha del servicio');
  assert(r.resultados[0].fecha_proxima === '2027-03-02', 'B 6 meses = 2027-03-02');
  assert(r.resultados[0].estado === 'proximo', 'B no está vencido');
  assert(r.resultados[0].cliente === 'Conjunto Residencial Los Almendros', 'B cliente real');
}

section('C. Mantenimientos vencidos');
{
  const hist = [{
    modulo: 'formato',
    cliente: 'Taller El Faro',
    fecha: '2025-12-02',
    subtipo: 'Instalación',
    tipo: 'Instalación',
    numero: 'OT-020',
    fullSnapshot: { _tipo: 'instalacion', 'formato-fecha': '2025-12-02' }
  }];
  const r = consultar('¿Tengo mantenimientos vencidos?', ctx({
    historial: hist,
    clientes: [{ nombre: 'Taller El Faro' }]
  }));
  assert(r.intencion === 'mantenimientos_vencidos', 'C intención');
  assert(r.datos_disponibles === true, 'C hay fecha para calcular');
  assert(r.resultados.length === 1, 'C 1 vencido');
  assert(r.resultados[0].fecha === '2025-12-02', 'C fecha real de instalación');
  assert(r.resultados[0].fecha_proxima === '2026-06-02', 'C 6 meses = 2026-06-02');
  assert(r.resultados[0].estado === 'vencido', 'C marcado vencido');
  const prox = consultar('¿Qué mantenimientos tengo próximos?', ctx({
    historial: hist,
    clientes: [{ nombre: 'Taller El Faro' }]
  }));
  assert(prox.resultados.length === 0, 'C el vencido no aparece como próximo');
}

section('D. Clientes sin seguimiento');
{
  const hist = [{
    modulo: 'formato',
    cliente: 'Edificio Sur',
    fecha: '2026-01-02',
    subtipo: 'Reparación',
    tipo: 'Reparación',
    numero: 'OT-030'
  }];
  const r = consultar('¿Qué clientes llevan más de 6 meses sin servicio?', ctx({
    historial: hist,
    clientes: [{ nombre: 'Edificio Sur' }]
  }));
  assert(r.intencion === 'clientes_sin_seguimiento', 'D intención');
  assert(r.datos_disponibles === true, 'D datos suficientes');
  assert(r.resultados.length === 1, 'D 1 cliente');
  assert(r.resultados[0].cliente === 'Edificio Sur', 'D cliente real');
  assert(r.resultados[0].fecha === '2026-01-02', 'D última fecha real');
  assert(r.resultados[0].dias_sin_servicio === 243, 'D 243 días desde 2026-01-02');
  const reciente = consultar('¿Qué clientes llevan más de 6 meses sin servicio?', ctx());
  assert(reciente.resultados.length === 0, 'D servicio de hoy no genera seguimiento');
}

section('E. Cotizaciones pendientes y no confundir cerradas');
{
  const hist = [
    {
      modulo: 'cotizacion',
      cliente: 'Portones Norte',
      fecha: '2026-08-20',
      numero: 'COT-010',
      total: 450000
    },
    {
      modulo: 'cotizacion',
      cliente: 'Portones Sur',
      fecha: '2026-08-01',
      numero: 'COT-011',
      total: 200000
    },
    {
      modulo: 'formato',
      cliente: 'Portones Sur',
      fecha: '2026-08-15',
      subtipo: 'Instalación',
      numero: 'OT-040'
    }
  ];
  const pend = consultar('¿Qué cotizaciones tengo pendientes?', ctx({ historial: hist, clientes: [] }));
  assert(pend.intencion === 'cotizaciones_pendientes', 'E intención pendientes');
  assert(pend.datos_disponibles === true, 'E hay cotizaciones');
  assert(pend.resultados.length === 1, 'E solo 1 pendiente');
  assert(pend.resultados[0].numero === 'COT-010', 'E COT-010 abierta');
  assert(pend.resultados[0].cliente === 'Portones Norte', 'E cliente de la abierta');
  const cerr = consultar('¿Qué cotizaciones están cerradas?', ctx({ historial: hist, clientes: [] }));
  assert(cerr.intencion === 'cotizaciones_cerradas', 'E intención cerradas');
  assert(cerr.resultados.length === 1, 'E 1 cerrada');
  assert(cerr.resultados[0].numero === 'COT-011', 'E COT-011 cerrada por formato posterior');
  assert(pend.resultados.every(function (x) { return x.numero !== 'COT-011'; }), 'E no mezcla cerrada en pendientes');
}

section('F. Cuentas de cobro');
{
  const vacio = consultar('¿Qué cuentas de cobro están pendientes?', ctx());
  assert(vacio.intencion === 'cuentas_cobro_pendientes', 'F intención');
  assert(vacio.datos_disponibles === false, 'F sin CC: NO DISPONIBLE');
  assert(vacio.resumen === 'NO DISPONIBLE EN LAB', 'F resumen NO DISPONIBLE');
  const hist = [{
    modulo: 'cuenta-cobro',
    cliente: 'Portones Norte',
    fecha: '2026-08-25',
    numero: 'CC-003',
    total: 450000
  }];
  const r = consultar('¿Qué cuentas de cobro están pendientes?', ctx({ historial: hist, clientes: [] }));
  assert(r.datos_disponibles === true, 'F con CC existentes se listan');
  assert(r.resultados.length === 1, 'F 1 cuenta real');
  assert(r.resultados[0].numero === 'CC-003', 'F número real');
  assert(r.advertencias.some(function (a) { return /no se inventa/i.test(a); }), 'F avisa que no inventa estado de pago');
}

section('G. Historial de un cliente');
{
  const r = consultar('¿Qué servicios tiene este cliente?', ctx({
    cliente: 'Conjunto Residencial Los Almendros'
  }));
  assert(r.intencion === 'cliente_historial', 'G intención');
  assert(r.datos_disponibles === true, 'G datos');
  assert(r.resultados.length === 1, 'G 1 documento');
  assert(r.resultados[0].numero === 'OT-001', 'G OT real');
  const nombrado = consultar('¿Qué servicios tiene el cliente Conjunto Residencial Los Almendros?', ctx());
  assert(nombrado.resultados.length === 1, 'G extrae el cliente de la pregunta');
  const ajeno = consultar('¿Qué servicios tiene el cliente Cliente Inventado SA?', ctx());
  assert(ajeno.datos_disponibles === false, 'G cliente inexistente: no inventa historial');
  assert(ajeno.resultados.length === 0, 'G cero resultados inventados');
}

section('H. Ventas del mes');
{
  const hist = [
    { modulo: 'cotizacion', cliente: 'A', fecha: '2026-09-01', numero: 'COT-020', total: 100000 },
    { modulo: 'cotizacion', cliente: 'B', fecha: '2026-08-01', numero: 'COT-019', total: 999999 },
    { modulo: 'cuenta-cobro', cliente: 'A', fecha: '2026-09-02', numero: 'CC-008', total: 50000 }
  ];
  const r = consultar('¿Cuánto vendí este mes?', ctx({ historial: hist, clientes: [] }));
  assert(r.intencion === 'resumen_ventas', 'H intención');
  assert(r.datos_disponibles === true, 'H hay documentos del mes');
  assert(r.resultados.length === 2, 'H solo docs de septiembre');
  assert(r.resultados.every(function (x) { return x.numero !== 'COT-019'; }), 'H no suma agosto');
  assert(r.resumen.indexOf('150000') >= 0, 'H total 100000+50000');
  assert(r.resumen.indexOf('999999') < 0, 'H no usa el total de otro mes');
}

section('I. Pregunta desconocida');
{
  const r = consultar('¿Cuál es la capital de Francia?', ctx());
  assert(r.intencion === 'desconocida', 'I intención desconocida');
  assert(r.datos_disponibles === false, 'I no consulta datos');
  assert(r.resultados.length === 0, 'I sin resultados');
  assert(r.resumen === 'NO DISPONIBLE EN LAB', 'I NO DISPONIBLE');
  assert(r.advertencias.some(function (a) { return /intención/i.test(a); }), 'I declara que no clasificó');
}

section('J. Datos insuficientes');
{
  const sinCliente = consultar('¿Qué servicios tiene este cliente?', ctx());
  assert(sinCliente.intencion === 'cliente_historial', 'J reconoce intención');
  assert(sinCliente.datos_disponibles === false, 'J sin nombre de cliente: insuficiente');
  assert(sinCliente.resumen === 'NO DISPONIBLE EN LAB', 'J NO DISPONIBLE');
  const sinFechaMant = consultar('¿Qué mantenimientos tengo próximos?', ctx({
    historial: [{
      modulo: 'formato',
      cliente: 'Sin Fecha',
      fecha: '',
      subtipo: 'Instalación',
      numero: 'OT-099'
    }],
    clientes: [{ nombre: 'Sin Fecha' }]
  }));
  assert(sinFechaMant.datos_disponibles === false, 'J sin fecha no calcula 6 meses');
  assert(sinFechaMant.resultados.length === 0, 'J no inventa fecha próxima');
  const draftSinCliente = consultar('¿Qué cotizaciones tengo pendientes?', ctx({
    historial: [],
    clientes: [],
    cotDraft: { numero: 'COT-013', fecha: '2026-09-02', nombre: '' }
  }));
  assert(draftSinCliente.datos_disponibles === false || draftSinCliente.resultados.length === 0, 'J draft sin cliente no es oportunidad');
}

section('K. No invención');
{
  const r = consultar('¿Cuánto vendí este mes?', ctx({
    historial: [{ modulo: 'cotizacion', cliente: 'X', fecha: '2026-09-01', numero: 'COT-030' }],
    clientes: []
  }));
  assert(r.datos_disponibles === true, 'K consulta posible');
  assert(r.resumen.indexOf('No se inventó') >= 0 || r.resumen.indexOf('no tienen total') >= 0 || r.resumen.indexOf('Ninguno tiene total') >= 0, 'K declara que no inventa monto');
  assert(!/\b(1000000|999999|123456)\b/.test(JSON.stringify(r)), 'K no mete cifras inventadas');
  const mant = consultar('¿Qué mantenimientos tengo pendientes?', ctx({
    historial: [{
      modulo: 'formato',
      cliente: 'Solo reparación',
      fecha: '2026-09-02',
      subtipo: 'Reparación',
      numero: 'OT-050'
    }],
    clientes: [{ nombre: 'Solo reparación' }]
  }));
  assert(mant.datos_disponibles === false, 'K reparación sola no inventa mantenimiento a 6 meses');
  const fantasma = consultar('¿Cuántos clientes VIP tengo?', ctx());
  assert(fantasma.intencion === 'desconocida', 'K no inventa intención VIP');
  assert(fantasma.resultados.length === 0, 'K no inventa clientes VIP');
}

section('L. Solo lectura');
{
  const historial = histBase.map(function (r) { return Object.assign({}, r); });
  const clientes = clientesBase.map(function (c) { return Object.assign({}, c); });
  const beforeHist = snap(historial);
  const beforeCli = snap(clientes);
  memory.arpa_suite_servicio_historial = beforeHist;
  memory.arpa_suite_clientes = JSON.stringify(clientes);
  memory.arpa_cot_draft = JSON.stringify({ numero: 'COT-013', nombre: '', fecha: '2026-09-02' });
  const beforeMem = snap(memory);
  const writesBefore = setItemCalls;
  const preguntas = [
    '¿Qué trabajos tengo hoy?',
    '¿Qué mantenimientos tengo pendientes?',
    '¿Tengo mantenimientos vencidos?',
    '¿Qué clientes llevan más de 6 meses sin servicio?',
    '¿Qué cotizaciones tengo pendientes?',
    '¿Qué cuentas de cobro están pendientes?',
    '¿Qué servicios tiene este cliente?',
    '¿Cuánto vendí este mes?',
    '¿Cuál es el clima?'
  ];
  preguntas.forEach(function (q) {
    consultar(q, { hoy: HOY, historial: historial, clientes: clientes, oficio: 'automatismos' });
  });
  consultarDesde('¿Qué trabajos tengo hoy?', { hoy: HOY });
  assert(snap(historial) === beforeHist, 'L historial de entrada intacto');
  assert(snap(clientes) === beforeCli, 'L clientes de entrada intactos');
  assert(snap(memory) === beforeMem, 'L localStorage intacto');
  assert(setItemCalls === writesBefore, 'L cero setItem');
  assert(fetchCalls === 0, 'L cero fetch');
}

section('M. Fechas controlables');
{
  assert(consultas.addMonths('2026-09-02', 6) === '2027-03-02', 'M +6 meses');
  assert(consultas.addMonths('', 6) === '', 'M sin fecha no inventa');
  assert(consultas.parseFecha('2026-02-30') === '', 'M rechaza fecha inválida');
  assert(consultas.parseFecha('02/09/2026') === '', 'M no usa formato ambiguo');
  assert(consultas.parseFecha('2026-09-02T15:00:00') === '2026-09-02', 'M ISO con hora → día');
  const hist = [{
    modulo: 'formato',
    cliente: 'Fecha Control',
    fecha: '2026-03-02',
    subtipo: 'Mantenimiento',
    numero: 'OT-060'
  }];
  const marzo = consultar('¿Qué mantenimientos tengo pendientes?', ctx({ hoy: '2026-03-03', historial: hist }));
  const vencSept = consultar('¿Tengo mantenimientos vencidos?', ctx({ hoy: '2026-09-02', historial: hist }));
  assert(vencSept.resultados.length === 1, 'M con hoy 2026-09-02 está vencido');
  assert(vencSept.resultados[0].fecha_proxima === '2026-09-02', 'M próxima fija desde fecha real');
  assert(vencSept.resultados[0].fecha === '2026-03-02', 'M no inventa la fecha de origen');
  assert(marzo.resultados.length === 1 && marzo.resultados[0].estado === 'proximo', 'M con hoy 2026-03-03 sigue próximo');
  const hoyOtro = consultar('¿Qué trabajos tengo hoy?', ctx({ hoy: '2026-03-02', historial: hist }));
  assert(hoyOtro.resultados.length === 1, 'M "hoy" usa la fecha inyectada');
  const hoyLab = consultar('¿Qué trabajos tengo hoy?', ctx({ hoy: HOY, historial: hist }));
  assert(hoyLab.resultados.length === 0, 'M el 2-sep no lista el trabajo de marzo');
}

section('N. Oficio configurado');
{
  const r = consultar('¿Qué trabajos tengo hoy?', ctx({ oficio: 'automatismos' }));
  assert(r.oficio === 'automatismos', 'N conserva automatismos');
  const otro = consultar('¿Qué trabajos tengo hoy?', ctx({ oficio: 'metalmecanica' }));
  assert(otro.oficio === 'metalmecanica', 'N respeta el oficio ya configurado (no lo cambia)');
  const sin = consultar('¿Qué trabajos tengo hoy?', {
    hoy: HOY,
    historial: histBase.map(function (x) { return Object.assign({}, x); }),
    clientes: []
  });
  assert(!sin.oficio, 'N sin oficio configurado no infiere uno');
}

section('O. Datos vacíos');
{
  const vacioCtx = { hoy: HOY, historial: [], clientes: [] };
  const qs = [
    ['¿Qué trabajos tengo hoy?', 'trabajos_hoy'],
    ['¿Qué mantenimientos tengo próximos?', 'mantenimientos_proximos'],
    ['¿Tengo mantenimientos vencidos?', 'mantenimientos_vencidos'],
    ['¿Qué clientes llevan más de 6 meses sin servicio?', 'clientes_sin_seguimiento'],
    ['¿Qué cotizaciones tengo pendientes?', 'cotizaciones_pendientes'],
    ['¿Qué cuentas de cobro están pendientes?', 'cuentas_cobro_pendientes'],
    ['¿Qué servicios tiene el cliente Nadie?', 'cliente_historial'],
    ['¿Cuánto vendí este mes?', 'resumen_ventas']
  ];
  qs.forEach(function (pair) {
    const r = consultar(pair[0], vacioCtx);
    assert(r.intencion === pair[1], 'O ' + pair[1] + ' clasifica');
    assert(r.datos_disponibles === false, 'O ' + pair[1] + ' sin datos');
    assert(r.resultados.length === 0, 'O ' + pair[1] + ' cero resultados');
    assert(r.resumen === 'NO DISPONIBLE EN LAB', 'O ' + pair[1] + ' NO DISPONIBLE');
  });
}

section('Trabajos del período');
{
  const hist = [
    { modulo: 'formato', cliente: 'A', fecha: '2026-09-01', subtipo: 'Reparación', numero: 'OT-071' },
    { modulo: 'formato', cliente: 'B', fecha: '2026-08-15', subtipo: 'Reparación', numero: 'OT-070' }
  ];
  const r = consultar('¿Cuántos trabajos hice este mes?', ctx({ historial: hist, clientes: [] }));
  assert(r.intencion === 'trabajos_periodo', 'periodo intención');
  assert(r.resultados.length === 1, 'periodo solo septiembre');
  assert(r.resultados[0].numero === 'OT-071', 'periodo OT del mes');
}

section('Borrador COT-013 sin cliente no se inventa como pendiente con cliente');
{
  const r = consultar('¿Qué cotizaciones tengo pendientes?', {
    hoy: HOY,
    historial: [],
    clientes: clientesBase,
    cotDraft: { numero: 'COT-013', fecha: '2026-09-02', nombre: '' }
  });
  assert(r.resultados.every(function (x) { return x.cliente !== 'Conjunto Residencial Los Almendros'; }), 'draft vacío no se asigna al cliente de la agenda');
}

section('consultarDesdeArpaSuite lee y no escribe');
{
  memory.arpa_suite_servicio_historial = JSON.stringify(histBase);
  memory.arpa_suite_clientes = JSON.stringify(clientesBase);
  const before = snap(memory);
  const writes = setItemCalls;
  sandbox.ArpaHistorial = {
    getRecords: function () { return JSON.parse(memory.arpa_suite_servicio_historial); },
    getClientes: function () { return JSON.parse(memory.arpa_suite_clientes); }
  };
  const r = consultarDesde('¿Qué trabajos tengo hoy?', { hoy: HOY, oficio: 'automatismos' });
  assert(r.datos_disponibles === true && r.resultados.length === 1, 'desde ARPASuite lee el historial real');
  assert(snap(memory) === before, 'desde ARPASuite no muta storage');
  assert(setItemCalls === writes, 'desde ARPASuite no hace setItem');
}

section('FASE 8.2 — consultas sobre el snapshot real de LAB');
{
  const labReal = {
    hoy: '2026-09-02',
    oficio: 'automatismos',
    historial: [{
      id: 'mtkmnesognmn0',
      modulo: 'formato',
      documento: 'Formato de Servicio',
      tipo: 'Mantenimiento',
      subtipo: 'Mantenimiento',
      numero: 'OT-001',
      numeroServicio: 'OT-001',
      numeroOt: 'OT-001',
      cliente: 'Conjunto Residencial Los Almendros',
      ciudad: 'Envigado',
      fecha: '2026-09-02',
      fechaHoraFinalizacion: '',
      fechaHoraInicio: '',
      concepto: 'Mantenimiento — BFT',
      formatoOficio: 'automatismos',
      estado: 'BORRADOR',
      savedAt: '2026-09-02T22:19:43.414Z',
      fullSnapshot: {
        _tipo: 'mantenimiento',
        _estado: 'BORRADOR',
        _formatoOficio: 'automatismos',
        'formato-fecha': '2026-09-02',
        'formato-cliente-nombre': 'Conjunto Residencial Los Almendros',
        'sel-marca': 'BFT',
        'ref-manual': 'ARES 1500'
      }
    }],
    clientes: [{
      id: 'mtkmneso9qbw1',
      nombre: 'Conjunto Residencial Los Almendros',
      ciudad: 'Envigado'
    }],
    cotDraft: {
      numero: 'COT-013',
      nombre: '',
      nit: '',
      fecha: '2026-09-02',
      filas: [{
        cant: 1,
        cod: 'KARESBTA1000Z25-2',
        nom: 'BFT – Kit BFT Ares BT A1000 220V Pinon 25 - Corrediza hasta 500kg 12m/min',
        pvp: 3539000
      }]
    },
    settings: { activeOficios: ['automatismos'] }
  };

  const beforeLab = snap(labReal);
  const writesBefore = setItemCalls;
  const fetchBefore = fetchCalls;
  const noDisp = [];
  const reconocidas = [];

  function runLab(pregunta, extra) {
    return consultar(pregunta, Object.assign({}, labReal, extra || {}));
  }

  function markNoDisp(id, motivo) {
    noDisp.push(id + ': ' + motivo);
    console.log('  NO DISPONIBLE EN LAB  ' + id + ' — ' + motivo);
  }

  const q1 = runLab('¿Qué trabajos tengo hoy?');
  assert(q1.intencion === 'trabajos_hoy', '8.2.1 intención trabajos_hoy');
  assert(q1.datos_disponibles === true && q1.resultados.length === 1, '8.2.1 1 trabajo real de hoy');
  assert(q1.resultados[0].numero === 'OT-001', '8.2.1 fuente OT-001');
  assert(q1.resultados[0].cliente === 'Conjunto Residencial Los Almendros', '8.2.1 cliente real');
  assert(q1.resultados[0].fecha === '2026-09-02', '8.2.1 fecha real, no savedAt');
  reconocidas.push('trabajos_hoy');

  const q2 = runLab('¿Qué mantenimientos tengo próximos?');
  assert(q2.intencion === 'mantenimientos_proximos', '8.2.2 intención próximos');
  assert(q2.resultados.length === 1, '8.2.2 1 próximo real');
  assert(q2.resultados[0].fecha === '2026-09-02', '8.2.2 fecha origen real');
  assert(q2.resultados[0].fecha_proxima === '2027-03-02', '8.2.2 6 meses desde fecha real');
  assert(q2.resultados[0].estado === 'proximo', '8.2.2 estado próximo');
  reconocidas.push('mantenimientos_proximos');

  const q3 = runLab('¿Tengo mantenimientos vencidos?');
  assert(q3.intencion === 'mantenimientos_vencidos', '8.2.3 intención vencidos');
  assert(q3.datos_disponibles === true, '8.2.3 sí se puede calcular con la fecha de OT-001');
  assert(q3.resultados.length === 0, '8.2.3 LAB no tiene vencidos (OT-001 está próximo)');
  markNoDisp('3', 'no hay mantenimiento vencido en el historial real');
  reconocidas.push('mantenimientos_vencidos');

  const q4 = runLab('¿Qué clientes llevan más de 6 meses sin servicio?');
  assert(q4.intencion === 'clientes_sin_seguimiento', '8.2.4 intención seguimiento');
  assert(q4.resultados.length === 0, '8.2.4 el único servicio es de hoy: no inventa 180 días');
  markNoDisp('4', 'ningún cliente real supera 180 días sin servicio');
  reconocidas.push('clientes_sin_seguimiento');

  const q5 = runLab('¿Qué cotizaciones tengo pendientes?');
  assert(q5.intencion === 'cotizaciones_pendientes', '8.2.5 intención pendientes');
  assert(q5.resultados.length === 0, '8.2.5 COT-013 sin cliente no se vuelve pendiente');
  assert(!JSON.stringify(q5).includes('3539000'), '8.2.5 no inventa el PVP del borrador');
  markNoDisp('5', 'no hay cotización guardada con cliente; COT-013 es borrador sin cliente');
  reconocidas.push('cotizaciones_pendientes');

  const q6 = runLab('¿Qué cotizaciones están cerradas?');
  assert(q6.intencion === 'cotizaciones_cerradas', '8.2.6 intención cerradas');
  assert(q6.resultados.length === 0, '8.2.6 no hay cotización cerrada real');
  markNoDisp('6', 'no hay cotización guardada ni cierre posterior');
  reconocidas.push('cotizaciones_cerradas');

  const q7 = runLab('¿Qué cuentas de cobro tengo pendientes?');
  assert(q7.intencion === 'cuentas_cobro_pendientes', '8.2.7 intención cuentas');
  assert(q7.datos_disponibles === false, '8.2.7 sin CC en LAB');
  assert(q7.resumen === 'NO DISPONIBLE EN LAB', '8.2.7 NO DISPONIBLE EN LAB');
  markNoDisp('7', 'no hay cuentas de cobro en el historial');
  reconocidas.push('cuentas_cobro_pendientes');

  const q8sin = runLab('¿Qué servicios tiene este cliente?');
  assert(q8sin.intencion === 'cliente_historial', '8.2.8 intención historial');
  assert(q8sin.datos_disponibles === false && q8sin.resumen === 'NO DISPONIBLE EN LAB', '8.2.8 sin nombre: insuficiente');
  const q8 = runLab('¿Qué servicios tiene el cliente Conjunto Residencial Los Almendros?');
  assert(q8.intencion === 'cliente_historial', '8.2.8 intención con nombre real');
  assert(q8.resultados.length === 1 && q8.resultados[0].numero === 'OT-001', '8.2.8 historial real del cliente');
  reconocidas.push('cliente_historial');

  const q9 = runLab('¿Cuánto vendí este mes?');
  assert(q9.intencion === 'resumen_ventas', '8.2.9 intención ventas');
  assert(!/\b3539000\b/.test(JSON.stringify(q9)), '8.2.9 no usa el PVP del borrador como venta');
  if (!q9.datos_disponibles || (q9.meta && q9.meta.total_registrado == null) || /no se invent|no tienen total|Ninguno tiene total|NO DISPONIBLE/i.test(q9.resumen)) {
    markNoDisp('9', 'no hay total registrado en cotización/CC del mes');
  }
  reconocidas.push('resumen_ventas');

  const q10 = runLab('Muéstrame los trabajos de hoy');
  assert(q10.intencion === 'trabajos_hoy', '8.2.10 variación trabajos de hoy');
  assert(q10.resultados.length === 1 && q10.resultados[0].numero === 'OT-001', '8.2.10 mismo OT-001 real');

  const q11 = runLab('¿Cuáles clientes tienen más servicios?');
  assert(q11.intencion === 'desconocida', '8.2.11 ambigua: no inventa intención');
  assert(q11.resumen === 'NO DISPONIBLE EN LAB', '8.2.11 NO DISPONIBLE');
  markNoDisp('11', 'pregunta ambigua / intención no soportada');
  reconocidas.push('desconocida');

  const q12 = runLab('¿Qué servicios tiene este cliente?');
  assert(q12.datos_disponibles === false, '8.2.12 datos insuficientes (falta el cliente)');
  markNoDisp('12', 'pregunta de historial sin identificar el cliente');

  const q13 = runLab('¿Qué servicios tiene el cliente Cliente Inventado SA?');
  assert(q13.intencion === 'cliente_historial', '8.2.13 intención');
  assert(q13.datos_disponibles === false && q13.resultados.length === 0, '8.2.13 no inventa historial');
  markNoDisp('13', 'el cliente no existe en LAB');

  const q14 = runLab('¿Qué trabajos tengo hoy?', { oficio: 'automatismos' });
  assert(q14.oficio === 'automatismos', '8.2.14 oficio configurado se conserva');
  assert(q14.oficio !== 'metalmecanica', '8.2.14 no infiere otro oficio');
  reconocidas.push('oficio:automatismos');

  const q15 = consultar('¿Qué trabajos tengo hoy?', { hoy: '2026-09-02', historial: [], clientes: [] });
  assert(q15.datos_disponibles === false && q15.resumen === 'NO DISPONIBLE EN LAB', '8.2.15 datos vacíos');
  markNoDisp('15', 'contexto vacío a propósito');

  assert(snap(labReal) === beforeLab, '8.2 integridad: snapshot LAB intacto');
  assert(setItemCalls === writesBefore, '8.2 integridad: 0 setItem');
  assert(fetchCalls === fetchBefore, '8.2 integridad: 0 fetch extra');
  sandbox.__fase82 = {
    noDisponibles: noDisp,
    reconocidas: reconocidas
  };
}

section('Integridad final');
{
  assert(fetchCalls === 0, 'integridad: 0 fetch');
}

section('FASE 8.6 — capa LLM DEV (redacción + anti-invención)');
{
  const llm = sandbox.ArpaIaCopilotoLlm;
  const labPack = {
    hoy: HOY,
    oficio: 'automatismos',
    historial: histBase.map(function (r) { return Object.assign({}, r); }),
    clientes: clientesBase.map(function (c) { return Object.assign({}, c); })
  };
  const DEV_URL = 'https://script.google.com/macros/s/FAKE-ARPA-IA-DEV-LAB/exec';
  let lastFetch = null;

  function mockInforme(resumen) {
    sandbox.fetch = function (url, req) {
      fetchCalls += 1;
      lastFetch = { url: String(url), body: req && req.body ? String(req.body) : '' };
      return Promise.resolve({
        ok: true,
        status: 200,
        text: function () {
          return Promise.resolve(JSON.stringify({
            ok: true,
            modo: 'informe',
            informe: { resumen_cliente: resumen, nota_tecnica: '', resultado: '' }
          }));
        }
      });
    };
  }

  sandbox.ArpaIaCotizadorApi = { mode: 'remote', endpoint: DEV_URL };

  const pMant = llm.construirPaquete(consultar('¿Qué mantenimientos tengo próximos?', labPack));
  assert(pMant.intencion === 'mantenimientos_proximos', '8.6 paquete intención próximos');
  assert(pMant.resultados.length === 1 && pMant.resultados[0].numero === 'OT-001', '8.6 paquete solo OT-001');
  assert(!JSON.stringify(pMant).includes('3539000'), '8.6 paquete no lleva PVP');
  assert(!/licen|arpa_suite_license/i.test(JSON.stringify(pMant)), '8.6 paquete sin licencia');

  const okMant = 'Hay 1 mantenimiento próximo para Conjunto Residencial Los Almendros, OT-001, fecha 2026-09-02, próximo 2027-03-02.';
  const v1 = llm.validarRedaccion(okMant, pMant);
  assert(v1.ok === true, '8.6.1 redacción próximos válida');

  const pHoy = llm.construirPaquete(consultar('¿Qué trabajos tengo hoy?', labPack));
  const v2 = llm.validarRedaccion('Hay 1 trabajo hoy: OT-001 de Conjunto Residencial Los Almendros, 2026-09-02, estado BORRADOR.', pHoy);
  assert(v2.ok === true, '8.6.2 redacción trabajos hoy válida');

  const pCot = llm.construirPaquete(consultar('¿Qué cotizaciones tengo pendientes?', {
    hoy: HOY,
    historial: [],
    clientes: clientesBase,
    cotDraft: { numero: 'COT-013', fecha: '2026-09-02', nombre: '', filas: [{ pvp: 3539000 }] },
    oficio: 'automatismos'
  }));
  assert(pCot.resultados.length === 0, '8.6.3 COT-013 no entra como pendiente');
  assert(llm.validarRedaccion('No hay cotizaciones pendientes en los registros.', pCot).ok, '8.6.3 redacción vacía válida');
  assert(!llm.validarRedaccion('La cotización COT-013 está pendiente por 3539000.', pCot).ok, '8.6.3 inventar PVP de COT-013 se descarta');
  assert(!llm.validarRedaccion('COT-013 es una venta cerrada al cliente Los Almendros.', pCot).ok, '8.6.3 no convierte borrador en venta');

  const pSeg = llm.construirPaquete(consultar('¿Qué clientes llevan más de 6 meses sin servicio?', labPack));
  assert(pSeg.resultados.length === 0, '8.6.4 sin clientes a 180 días');
  assert(llm.validarRedaccion('No hay clientes con 180 días o más sin un servicio registrado.', pSeg).ok, '8.6.4 redacción vacía válida');

  const pCc = llm.construirPaquete(consultar('¿Qué cuentas de cobro tengo pendientes?', labPack));
  assert(pCc.datos_disponibles === false, '8.6.5 cuentas no disponibles');
  assert(llm.validarRedaccion('NO DISPONIBLE EN LAB. No hay cuentas de cobro.', pCc).ok, '8.6.5 NO DISPONIBLE válido');
  assert(!llm.validarRedaccion('Hay 2 cuentas de cobro pendientes de pago por 900000.', pCc).ok, '8.6.5 inventar cuentas se descarta');

  const pEste = llm.construirPaquete(consultar('¿Qué servicios tiene este cliente?', labPack));
  assert(pEste.datos_disponibles === false, '8.6.6 este cliente insuficiente');
  assert(!llm.validarRedaccion('El cliente Conjunto Residencial Los Almendros tiene OT-001.', pEste).ok, '8.6.6 no rellena este cliente');

  const pDesc = llm.construirPaquete(consultar('Muéstrame información que no exista en los datos.', labPack));
  assert(pDesc.intencion === 'desconocida', '8.6.7 intención desconocida');
  assert(llm.validarRedaccion('NO DISPONIBLE EN LAB. No se pudo determinar la consulta.', pDesc).ok, '8.6.7 NO DISPONIBLE válido');
  assert(!llm.validarRedaccion('Encontré 4 servicios nuevos para Cliente Inventado SA.', pDesc).ok, '8.6.7 no inventa intención ni cliente');

  assert(!llm.validarRedaccion('El cliente Cliente Inventado SA tiene 3 servicios.', pHoy).ok, '8.6 cliente inexistente se descarta');
  assert(!llm.validarRedaccion('También aparece OT-999 en el historial.', pHoy).ok, '8.6 número inexistente se descarta');
  assert(!llm.validarRedaccion('El trabajo de hoy es del 2025-01-15.', pHoy).ok, '8.6 fecha inexistente se descarta');
  assert(!llm.validarRedaccion('El total es 3539000.', pHoy).ok, '8.6 precio inexistente se descarta');
  assert(!llm.validarRedaccion('Hay 1 trabajo hoy de OT-001. Oficio electricidad.', pHoy).ok, '8.6 oficio incorrecto se descarta');
  assert(!llm.validarRedaccion('Hay una instalación nueva que no estaba en los datos.', pCc).ok, '8.6 servicio inexistente se descarta');
  assert(!llm.validarRedaccion('Todo está disponible y hay datos.', pDesc).ok, '8.6 datos_disponibles=false exige NO DISPONIBLE');

  const consultarAsync = sandbox.ArpaIaCopiloto.consultarAsync;
  mockInforme(okMant);
  const asyncMant = await consultarAsync('¿Qué mantenimientos tengo próximos?', labPack);
  assert(asyncMant.llm_usado === true, '8.6 async acepta redacción válida');
  assert(asyncMant.resultados[0].numero === 'OT-001', '8.6 async conserva hechos locales');
  assert(asyncMant.fuente === 'local+llm', '8.6 async fuente local+llm');
  assert(lastFetch && lastFetch.url.indexOf('modo=informe') >= 0, '8.6 usa el backend DEV existente');
  assert(lastFetch.body.indexOf('3539000') < 0, '8.6 fetch no envía PVP');
  assert(!/licen/i.test(lastFetch.body), '8.6 fetch no envía licencia');
  assert(lastFetch.body.indexOf('intencion') >= 0 && lastFetch.body.indexOf('resumen_local') >= 0, '8.6 envía paquete controlado');

  mockInforme('El cliente Cliente Inventado SA pidió OT-999 el 2020-01-01 por 9999999.');
  const asyncBad = await consultarAsync('¿Qué trabajos tengo hoy?', labPack);
  assert(asyncBad.llm_usado === false, '8.6 async descarta invención');
  assert(asyncBad.resumen === asyncBad.resumen_local, '8.6 async cae al resumen local');
  assert(asyncBad.resultados[0].numero === 'OT-001', '8.6 async no altera resultados');

  const localOnly = await consultarAsync('¿Qué trabajos tengo hoy?', labPack, { localOnly: true });
  assert(localOnly.fuente === 'local' && localOnly.llm_usado === false, '8.6 localOnly no usa LLM');

  const fetchBeforeProd = fetchCalls;
  sandbox.ArpaIaCotizadorApi = { mode: 'remote', endpoint: PRODUCTION_LICENSE };
  const blocked = await consultarAsync('¿Qué trabajos tengo hoy?', labPack);
  assert(blocked.fuente === 'local', '8.6 producción bloqueada: se queda en local');
  assert(fetchCalls === fetchBeforeProd, '8.6 producción bloqueada: 0 fetch');
  sandbox.ArpaIaCotizadorApi = { mode: 'remote', endpoint: DEV_URL };

  const sync = consultar('¿Qué trabajos tengo hoy?', labPack);
  assert(sync.fuente === 'local' && sync.llm_usado === false, '8.6 consultar sync sigue sin LLM');
}

const fase82 = sandbox.__fase82 || { noDisponibles: [], reconocidas: [] };
console.log('\n========================================');
console.log('Copiloto: ' + passed + ' pasaron, ' + failed + ' fallaron, total ' + (passed + failed));
console.log('NO DISPONIBLE EN LAB (informativo, no es fallo): ' + fase82.noDisponibles.length);
fase82.noDisponibles.forEach(function (x) { console.log('  - ' + x); });
console.log('========================================');
if (failed) process.exit(1);
