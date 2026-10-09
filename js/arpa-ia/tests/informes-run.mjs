/**
 * Pruebas del motor ARPA IA INFORMES (sin red, sin claves).
 * Uso: node js/arpa-ia/tests/informes-run.mjs
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
let fetchImpl = async function () {
  throw new Error('fetch no configurado en la prueba');
};

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
  TypeError,
  setTimeout,
  clearTimeout,
  AbortController,
  fetch: function () { return fetchImpl.apply(this, arguments); },
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(memory, k) ? memory[k] : null),
    setItem: (k, v) => { memory[k] = String(v); },
    removeItem: (k) => { delete memory[k]; }
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

load('js/arpa-oficios.js');
load('js/arpa-ia/perfiles.js');
load('js/arpa-ia/cotizador-api.js');
load('js/arpa-ia/informes/informes-parser.js');
load('js/arpa-ia/informes/informes-prompts.js');
load('js/arpa-ia/informes/informes-generador.js');
load('js/arpa-ia/informes/informes-api.js');
load('js/arpa-ia/informes/informes-ui.js');

const generar = sandbox.ArpaIaInformes.generar;
const generarAsync = sandbox.ArpaIaInformes.generarAsync;

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log('  ok  ' + msg);
  } else {
    failed += 1;
    console.error('  FAIL  ' + msg);
  }
}

function section(name) {
  console.log('\n' + name);
}

function blob(informe) {
  return JSON.stringify(informe || {}).toLowerCase();
}

function expectedKeys(informe) {
  const keys = [
    'titulo', 'numero_ot', 'fecha', 'cliente', 'ubicacion', 'tecnico',
    'oficio', 'tipo_servicio', 'equipo', 'marca', 'modelo', 'descripcion_trabajo',
    'hallazgos', 'diagnostico', 'trabajos_realizados', 'materiales_utilizados',
    'resultado', 'recomendaciones', 'observaciones', 'resumen_cliente',
    'nota_tecnica', 'advertencias'
  ];
  return keys.every((k) => Object.prototype.hasOwnProperty.call(informe, k));
}

function isStringList(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function shapeOk(informe) {
  return !!(informe && expectedKeys(informe)
    && typeof informe.titulo === 'string'
    && typeof informe.resumen_cliente === 'string'
    && typeof informe.nota_tecnica === 'string'
    && typeof informe.diagnostico === 'string'
    && isStringList(informe.hallazgos)
    && isStringList(informe.trabajos_realizados)
    && isStringList(informe.materiales_utilizados)
    && isStringList(informe.recomendaciones)
    && isStringList(informe.advertencias));
}

function noInventionExtras(informe) {
  const t = blob(informe);
  if (/\$|\bpvp\b|\bprecio\b|\bcop\s*\d|\busd\b/.test(t)) return false;
  return true;
}

section('Chasis — estructura y fallback');
{
  const inf = generar({ oficio: 'automatizacion', tipo_servicio: 'mantenimiento' });
  assert(shapeOk(inf), 'JSON con campos esperados');
  assert(inf.fuente === 'local', 'fuente local por defecto');
  assert(inf.estado_llm === 'desconectado', 'LLM desconectado sin llamada');
  assert(/automatismos|automatiz/i.test(inf.oficio), 'respeta oficio automatización');
  assert(inf.tipo_servicio === 'mantenimiento', 'respeta tipo mantenimiento');
  assert(inf.materiales_utilizados.length === 0, 'sin materiales si no hay registro');
  assert(inf.causa_confirmada === false, 'no confirma causa por defecto');
}

section('PRUEBA 1 — Mantenimiento');
{
  const inf = generar({
    oficio: 'automatizacion',
    tipo_servicio: 'mantenimiento',
    equipo: 'motor para puerta corrediza',
    marca: 'BFT',
    modelo: '600',
    sintomas: ['la puerta no cierra'],
    hallazgos: ['fotoceldas sucias'],
    trabajos_ejecutados: ['limpieza y alineación de fotoceldas'],
    resultado: 'la puerta realiza correctamente el cierre',
    materiales: 'ninguno registrado'
  });
  const t = blob(inf);
  assert(shapeOk(inf), '1 estructura');
  assert(inf.marca === 'BFT', '1 marca BFT');
  assert(inf.modelo === '600', '1 modelo 600');
  assert(inf.tipo_servicio === 'mantenimiento', '1 tipo mantenimiento');
  assert(t.indexOf('no cierra') !== -1, '1 menciona síntoma no cierra');
  assert(/fotoceldas sucias/.test(t), '1 menciona fotoceldas sucias');
  assert(/limpieza y alineaci[oó]n de fotoceldas/.test(t), '1 menciona trabajo registrado');
  assert(/realiza correctamente el cierre/.test(t), '1 menciona resultado');
  assert(inf.materiales_utilizados.length === 0, '1 no inventa materiales');
  assert(!/cremallera|capacitor|engranaje/.test(t), '1 no agrega reparaciones no registradas');
  assert(inf.trabajos_realizados.length === 1, '1 solo el trabajo registrado');
}

section('PRUEBA 2 — Reparación pendiente');
{
  const inf = generar({
    oficio: 'automatizacion',
    tipo_servicio: 'reparacion',
    equipo: 'motor de puerta corrediza',
    marca: 'BFT',
    modelo: '600',
    sintomas: ['motor produce ruido y puerta no funciona'],
    trabajos_ejecutados: ['revisión mecánica y eléctrica'],
    resultado: 'pendiente de reparación'
  });
  const t = blob(inf);
  assert(shapeOk(inf), '2 estructura');
  assert(inf.tipo_servicio === 'reparacion', '2 tipo reparación');
  assert(/pendiente/.test(t), '2 queda pendiente');
  assert(/no est[aá] terminada/.test(t), '2 la reparación no está terminada');
  assert(/revisi[oó]n mec[aá]nica y el[eé]ctrica/.test(t), '2 menciona el trabajo hecho');
  assert(inf.materiales_utilizados.length === 0, '2 no inventa materiales');
}

section('PRUEBA 3 — Datos incompletos');
{
  const inf = generar({
    oficio: 'automatizacion',
    tipo_servicio: 'mantenimiento',
    equipo: 'puerta corrediza',
    sintomas: ['no cierra']
  });
  const t = blob(inf);
  assert(shapeOk(inf), '3 estructura');
  assert(inf.marca === '', '3 no inventa marca');
  assert(inf.modelo === '', '3 no inventa modelo');
  assert(inf.resultado === '', '3 no inventa resultado');
  assert(inf.materiales_utilizados.length === 0, '3 no inventa materiales');
  assert(!/\bbft\b/.test(t), '3 no introduce BFT');
  assert(!/nice|came|ppa/.test(t), '3 no introduce otras marcas');
  assert(t.indexOf('no cierra') !== -1, '3 conserva el síntoma');
}

section('PRUEBA 4 — Hipótesis de IA Técnica');
{
  const inf = generar({
    oficio: 'automatizacion',
    tipo_servicio: 'reparacion',
    equipo: 'puerta corrediza',
    sintomas: ['no cierra'],
    ia_tecnica: {
      causa_confirmada: false,
      posibles_causas: [
        { texto: 'fotoceldas sucias o desalineadas', confirmado: false, tipo: 'hipotesis' }
      ]
    }
  });
  const t = blob(inf);
  assert(shapeOk(inf), '4 estructura');
  assert(inf.causa_confirmada === false, '4 no confirma');
  assert(/hip[oó]tesis|posible causa/.test(t), '4 lo marca como hipótesis');
  assert(/fotoceldas sucias o desalineadas/.test(t), '4 incluye la hipótesis registrada');
  assert(!/diagn[oó]stico confirmado:/.test(inf.diagnostico.toLowerCase()), '4 no lo vende como diagnóstico confirmado');
}

section('PRUEBA 5 — Oficio refrigeración');
{
  const inf = generar({
    oficio: 'refrigeracion',
    tipo_servicio: 'mantenimiento',
    equipo: 'aire acondicionado',
    sintomas: ['no enfría correctamente']
  });
  const t = blob(inf);
  assert(shapeOk(inf), '5 estructura');
  assert(/refriger/i.test(inf.oficio), '5 oficio refrigeración');
  assert(inf.tipo_servicio === 'mantenimiento', '5 tipo');
  assert(/no enfr[ií]a/.test(t), '5 síntoma de refrigeración');
  assert(!/fotocelda|corrediza|cremallera|\bbft\b/.test(t), '5 no mete automatización de puertas');
}

section('PRUEBA 6 — Taller de motos');
{
  const inf = generar({
    oficio: 'taller_motos',
    tipo_servicio: 'reparacion',
    equipo: 'motocicleta',
    sintomas: ['dificultad de encendido']
  });
  const t = blob(inf);
  assert(shapeOk(inf), '6 estructura');
  assert(/taller de motos/i.test(inf.oficio), '6 oficio taller de motos');
  assert(inf.tipo_servicio === 'reparacion', '6 tipo reparación');
  assert(/encendido/.test(t), '6 síntoma de encendido');
  assert(!/fotocelda|corrediza|puerta/.test(t), '6 no introduce puertas');
}

section('PRUEBA 7 — Seguridad');
{
  const inf = generar({
    oficio: 'automatizacion',
    tipo_servicio: 'reparacion',
    sintomas: ['no cierra'],
    advertencias: ['No puentear fotoceldas'],
    ia_tecnica: {
      causa_confirmada: false,
      advertencias_seguridad: ['No anular dispositivos de seguridad']
    }
  });
  const t = blob(inf);
  assert(shapeOk(inf), '7 estructura');
  assert(inf.advertencias.some((a) => /puentear fotoceldas/i.test(a)), '7 conserva advertencia de la OT');
  assert(inf.advertencias.some((a) => /anular dispositivos/i.test(a)), '7 conserva advertencia de IA Técnica');
  assert(/puentear/.test(t) && /anular/.test(t), '7 ambas advertencias en el informe');
}

section('PRUEBA 8 — No inventar');
{
  const inf = generar({
    oficio: 'automatizacion',
    tipo_servicio: 'mantenimiento'
  });
  const t = blob(inf);
  assert(shapeOk(inf), '8 estructura');
  assert(inf.marca === '' && inf.modelo === '', '8 sin marca ni modelo');
  assert(inf.materiales_utilizados.length === 0, '8 sin materiales');
  assert(inf.trabajos_realizados.length === 0, '8 sin reparaciones inventadas');
  assert(inf.resultado === '', '8 sin resultado inventado');
  assert(noInventionExtras(inf), '8 sin precios');
  assert(!/\bbft\b|\bnice\b|\bcame\b|\bhonda\b/.test(t), '8 sin marcas no suministradas');
  assert(!/\d+\s*(kg|m|mm|v|btu)/.test(t), '8 sin mediciones inventadas');
  assert(!/cremallera|capacitor|repuesto/.test(t), '8 sin materiales no registrados');
}

section('LLM — bloqueo de producción, fallback y sanitizado');
{
  sandbox.ArpaIaCotizadorApi.configure({ mode: 'remote', endpoint: PRODUCTION_LICENSE });
  const blocked = await generarAsync({ oficio: 'automatizacion', sintomas: ['no cierra'] });
  assert(blocked.estado_llm === 'bloqueado_produccion', 'bloquea LICENSE de producción');
  assert(blocked.fuente === 'local_por_error_llm', 'cae a local tras bloqueo');
  assert(shapeOk(blocked), 'fallback bloqueado sigue siendo informe válido');

  sandbox.ArpaIaCotizadorApi.configure({ mode: 'remote', endpoint: PRODUCTION_COT });
  const blockedCot = await generarAsync({ oficio: 'automatizacion' });
  assert(blockedCot.estado_llm === 'bloqueado_produccion', 'bloquea COT de producción');

  let called = 0;
  fetchImpl = async function () {
    called += 1;
    throw new Error('red caida');
  };
  sandbox.ArpaIaCotizadorApi.configure({
    mode: 'remote',
    endpoint: 'https://script.google.com/macros/s/DEV-FAKE-ARPA-IA-INFORMES/exec'
  });
  const fallback = await generarAsync({
    oficio: 'automatizacion',
    tipo_servicio: 'mantenimiento',
    marca: 'BFT',
    sintomas: ['no cierra']
  });
  assert(called === 1, 'intenta LLM DEV');
  assert(fallback.estado_llm === 'error', 'estado error si LLM falla');
  assert(fallback.marca === 'BFT', 'fallback local conserva hechos');
  assert(!/sk-[A-Za-z0-9]/.test(JSON.stringify(fallback.error_llm || {})), 'error no expone API key');

  fetchImpl = async function (url, options) {
    const body = JSON.parse(options.body);
    assert(body.modo === 'informe', 'payload modo informe');
    assert(body.ot && typeof body.ot === 'object', 'payload incluye ot');
    assert(body.ot.marca === 'BFT', 'payload ot conserva marca de la OT');
    assert(!body.messages && !body.conversacion, 'no envía historial');
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        ok: true,
        modo: 'informe',
        informe: {
          titulo: 'Informe',
          marca: 'Nice',
          modelo: 'inventado',
          materiales_utilizados: ['cremallera 4 m'],
          resumen_cliente: 'Se cambió el motor Nice y se cobró $500.000',
          nota_tecnica: 'Hechos registrados.',
          diagnostico: 'Falla confirmada de fotoceldas'
        }
      })
    };
  };
  const merged = await generarAsync({
    oficio: 'automatizacion',
    tipo_servicio: 'mantenimiento',
    marca: 'BFT',
    modelo: '600',
    sintomas: ['no cierra'],
    ia_tecnica: {
      causa_confirmada: false,
      posibles_causas: [{ texto: 'fotoceldas sucias', tipo: 'hipotesis', confirmado: false }]
    }
  });
  assert(merged.estado_llm === 'ok', 'LLM ok se fusiona');
  assert(merged.marca === 'BFT', 'no deja marca inventada por el LLM');
  assert(merged.modelo === '600', 'conserva modelo de la OT');
  assert(merged.materiales_utilizados.length === 0, 'no acepta materiales inventados del LLM');
  assert(!/\$|500\.000|nice/.test(blob(merged)), 'descarta prosa con precio y marca ajena');
  assert(/hip[oó]tesis|no hay diagn[oó]stico confirmado/.test(merged.diagnostico.toLowerCase()), 'sigue sin confirmar la hipótesis');
}

section('Prompts — sin clave y oficio fijado');
{
  const parsed = sandbox.ArpaIaInformes.parsear({ oficio: 'refrigeracion', sintomas: ['no enfría'] });
  const sys = sandbox.ArpaIaInformesPrompts.buildSystemPrompt(parsed);
  const input = sandbox.ArpaIaInformesPrompts.buildInput(parsed);
  assert(/refrigeracion/.test(sys), 'prompt fija oficio refrigeración');
  assert(/NO inventes/i.test(sys), 'prompt prohíbe inventar');
  assert(!/sk-[A-Za-z0-9]/.test(sys + input), 'prompts sin API key');
  assert(/no enfr/.test(input.toLowerCase()), 'input lleva el síntoma de la OT');
}

section('Integración OT — Automatización y Mantenimiento');
{
  const ui = sandbox.ArpaIaInformesUi;
  assert(!!ui && typeof ui.otDesdeCampos === 'function', 'hay recolector de OT');
  const auto = ui.otDesdeCampos({
    oficio: 'automatizacion',
    tipo_servicio: 'mantenimiento',
    numero_ot: 'OT-LAB-AUTO',
    cliente: 'Cliente LAB Auto',
    ubicacion: 'Medellín',
    equipo: 'Puerta corrediza',
    marca: 'BFT',
    modelo: '600',
    descripcion_trabajo: 'Mantenimiento — puerta corrediza',
    trabajos_realizados: ['Limpieza de fotoceldas', 'Lubricación'],
    materiales: [],
    observaciones: 'Equipo funcionando'
  });
  const infAuto = generar(auto);
  assert(infAuto.cliente === 'Cliente LAB Auto', '1 OT automatización conserva cliente');
  assert(infAuto.ubicacion === 'Medellín', '1 OT automatización conserva ubicación');
  assert(infAuto.marca === 'BFT' && infAuto.modelo === '600', '1 OT automatización conserva equipo BFT 600');
  assert(infAuto.trabajos_realizados.indexOf('Limpieza de fotoceldas') >= 0, '1 OT automatización conserva trabajos');
  assert(infAuto.materiales_utilizados.length === 0, '1 OT automatización no inventa materiales');
  assert(!/\$|pvp|precio/.test(blob(infAuto)), '1 OT automatización sin precios');
  assert(infAuto.causa_confirmada === false, '1 OT automatización no confirma causa');

  const mant = ui.otDesdeCampos({
    oficio: 'automatizacion',
    tipo_servicio: 'mantenimiento',
    numero_ot: 'OT-LAB-MANT',
    cliente: 'Cliente LAB Mant',
    ubicacion: 'Envigado',
    equipo: 'Motor para puerta corrediza',
    descripcion_trabajo: 'Mantenimiento preventivo',
    trabajos_realizados: ['Revisión de fotoceldas', 'Verificación de funcionamiento'],
    materiales: ['Fotocelda usada en campo'],
    observaciones: 'Mantenimiento preventivo ejecutado'
  });
  const infMant = generar(mant);
  assert(infMant.numero_ot === 'OT-LAB-MANT', '2 OT mantenimiento conserva número');
  assert(infMant.tipo_servicio === 'mantenimiento', '2 OT mantenimiento conserva tipo');
  assert(infMant.cliente === 'Cliente LAB Mant', '2 OT mantenimiento conserva cliente');
  assert(infMant.materiales_utilizados.indexOf('Fotocelda usada en campo') >= 0, '2 OT mantenimiento conserva material real');
  assert(!/cremallera 4 m|nice|\$500/.test(blob(infMant)), '2 OT mantenimiento no inventa extra');

  const cabecera = ui.otDesdeCampos({
    oficio: 'automatismos',
    tipo_servicio: 'mantenimiento',
    numero_ot: 'OT-001',
    cliente: 'Conjunto Residencial Los Almendros',
    direccion: 'Calle 37 Sur 27A-10',
    ciudad: 'Envigado',
    tecnico: 'Carlos Restrepo',
    equipo: 'Corrediza',
    marca: 'BFT',
    modelo: 'ARES 1500',
    trabajos_realizados: ['Limpieza de riel y fotoceldas'],
    materiales: [{ desc: 'Grasa para motor', cant: '1', unidad: 'Unidad' }]
  });
  const infCab = generar(cabecera);
  assert(cabecera.tecnico === 'Carlos Restrepo', 'técnico de cabecera se envía');
  assert(infCab.tecnico === 'Carlos Restrepo', 'informe conserva el técnico de cabecera');
  assert(cabecera.ubicacion === 'Calle 37 Sur 27A-10, Envigado', 'ubicación junta dirección y ciudad');
  assert(infCab.ubicacion === 'Calle 37 Sur 27A-10, Envigado', 'informe conserva dirección y ciudad');
  assert(cabecera.materiales[0] === 'Grasa para motor 1 Unidad', 'material conserva cantidad real');
  assert(infCab.materiales_utilizados[0] === 'Grasa para motor 1 Unidad', 'informe conserva material y cantidad');

  const soloCiudad = ui.otDesdeCampos({ ciudad: 'Envigado' });
  assert(soloCiudad.ubicacion === 'Envigado', 'sin dirección conserva solo ciudad');
  const sinTecnico = ui.otDesdeCampos({ cliente: 'X' });
  assert(sinTecnico.tecnico === '', 'sin técnico de cabecera queda vacío');
  const matSinCant = ui.otDesdeCampos({
    materiales: [{ desc: 'Grasa para motor', unidad: 'Unidad' }]
  });
  assert(matSinCant.materiales[0] === 'Grasa para motor Unidad', 'sin cantidad no inventa un 1');
  assert(typeof ui.formatearMaterial === 'function', 'hay formateador de material');
}

console.log('\n' + passed + ' pasadas, ' + failed + ' fallidas.');
if (failed) process.exit(1);
