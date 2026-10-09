/**
 * Pruebas locales del motor ARPA IA TÉCNICA (sin red, sin LLM, sin claves).
 * Uso: node js/arpa-ia/tests/tecnica-run.mjs
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
load('js/arpa-ia/tecnica/tecnica-parser.js');
load('js/arpa-ia/tecnica/tecnica-seguridad.js');
load('js/arpa-ia/tecnica/tecnica-conocimiento.js');
load('js/arpa-ia/tecnica/tecnica-llm.js');
load('js/arpa-ia/tecnica/tecnica.js');
load('js/arpa-ia/cotizador-llm.js');
load('js/arpa-ia/cotizador-api.js');

const analizar = sandbox.ArpaIaTecnica.analizarFalla;
const oficiales = sandbox.ArpaOficios.getOficiosList().map((o) => o.id);

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

function joinText(list, key) {
  return (list || []).map((item) => {
    if (item && typeof item === 'object') return String(item[key] || item.texto || item.valor || '');
    return String(item || '');
  }).join(' | ').toLowerCase();
}

function has(list, re, key) {
  return re.test(joinText(list, key));
}

function noBypassRecomendado(result) {
  const blob = [
    joinText(result.pruebas_recomendadas),
    joinText(result.procedimiento_sugerido),
    joinText(result.posibles_causas, 'texto')
  ].join(' | ');
  const unsafe = /(?:^|[^.])\s*(?:puentear|anular|desactivar|quitar)\s+(?:las?\s+)?(?:foto|segur|protecci)/i;
  if (!unsafe.test(blob)) return true;
  return /no\s+(?:se\s+debe\s+)?(?:puente|anular|quitar|desactivar)|nunca|prohibido/i.test(blob);
}

section('Chasis — oficio oficial y sin LLM');
assert(oficiales.length === 11, 'hay 11 oficios oficiales');
assert(typeof analizar === 'function', 'analizarFalla existe');

const sinOficio = analizar('La puerta no cierra', '');
assert(!sinOficio.oficio_id, 'sin oficio no se inventa un oficio');
assert(sinOficio.informacion_insuficiente === true, 'sin oficio pide información');
assert(sinOficio.estado_llm === 'desconectado', 'LLM desconectado');
assert(sinOficio.fuente === 'local', 'fuente local');

const otroOficio = analizar('La moto Honda no arranca', 'electricidad');
assert(otroOficio.oficio_id === 'electricidad', 'el oficio del usuario no cambia aunque el texto hable de moto');
assert(otroOficio.oficio_id !== 'taller_motos', 'no se infiere taller_motos');

section('1. Automatización');
const auto = analizar(
  'La puerta corrediza no cierra. Las fotoceldas están sucias y el motor hace ruido.',
  'automatismos'
);
assert(auto.oficio_id === 'automatismos', 'oficio automatismos');
assert(has(auto.sintomas, /no cierra/, 'texto'), 'síntoma: no cierra');
assert(has(auto.sintomas, /fotoceldas sucias/, 'texto'), 'síntoma: fotoceldas sucias');
assert(has(auto.sintomas, /ruido/, 'texto'), 'síntoma: ruido de motor');
assert(has(auto.datos_conocidos, /corrediza/, 'valor'), 'dato conocido: puerta corrediza');
assert(auto.datos_faltantes.length > 0, 'pide datos faltantes');
assert(auto.posibles_causas.length > 0, 'hay posibles causas');
assert(auto.posibles_causas.every((c) => c.tipo === 'hipotesis' && c.confirmado === false), 'causas son hipótesis no confirmadas');
assert(auto.causa_confirmada === false, 'no hay diagnóstico confirmado');
assert(auto.pruebas_recomendadas.length > 0, 'hay pruebas recomendadas');
assert(auto.procedimiento_sugerido.length > 0, 'hay procedimiento sugerido');
assert(['alta', 'media', 'baja', 'critica'].indexOf(auto.urgencia.nivel) !== -1, 'hay nivel de urgencia');
assert(auto.advertencias_seguridad.length > 0, 'hay advertencias de seguridad');
assert(noBypassRecomendado(auto), 'no recomienda puentear seguridad');
assert(auto.informacion_insuficiente === false, 'con síntomas concretos no es insuficiente');

section('2. Electricidad');
const elec = analizar(
  'El breaker de 20A se dispara cuando enciendo el aire. Hay olor a quemado en el tablero.',
  'electricidad'
);
assert(elec.oficio_id === 'electricidad', 'oficio electricidad');
assert(has(elec.sintomas, /breaker|dispara/, 'texto'), 'síntoma: breaker dispara');
assert(has(elec.sintomas, /quemado/, 'texto'), 'síntoma: olor a quemado');
assert(has(elec.datos_conocidos, /20\s*a/i, 'valor'), 'dato conocido: 20 A');
assert(has(elec.datos_conocidos, /tablero/, 'valor'), 'dato conocido: tablero');
assert(elec.posibles_causas.every((c) => c.confirmado === false), 'no confirma causa eléctrica');
assert(elec.pruebas_recomendadas.length > 0, 'pruebas eléctricas');
assert(elec.urgencia.nivel === 'critica' || elec.urgencia.nivel === 'alta', 'urgencia alta o crítica por olor a quemado');
assert(has(elec.advertencias_seguridad, /quemado|incendio|reenergizar/i), 'advertencia por olor a quemado');
assert(noBypassRecomendado(elec), 'no recomienda anular protecciones eléctricas');

section('3. Refrigeración');
const refri = analizar(
  'El split de 12000 BTU no enfría, el evaporador se congela.',
  'refrigeracion'
);
assert(refri.oficio_id === 'refrigeracion', 'oficio refrigeración');
assert(has(refri.sintomas, /no enfr/, 'texto'), 'síntoma: no enfría');
assert(has(refri.sintomas, /congela|escarcha/, 'texto'), 'síntoma: evaporador congela');
assert(has(refri.datos_conocidos, /split/, 'valor'), 'dato conocido: split');
assert(has(refri.datos_conocidos, /12000\s*btu/i, 'valor'), 'dato conocido: 12000 BTU');
assert(refri.datos_faltantes.length > 0, 'pide refrigerante u otros faltantes');
assert(refri.posibles_causas.length > 0, 'hipótesis de refrigeración');
assert(refri.posibles_causas.every((c) => /hipótesis|no confirmado/i.test(c.texto)), 'causa no afirmada como diagnóstico');
assert(refri.pruebas_recomendadas.length > 0, 'pruebas de refrigeración');
assert(refri.procedimiento_sugerido.length > 0, 'procedimiento de refrigeración');
assert(!!refri.urgencia.nivel, 'urgencia refrigeración');
assert(refri.advertencias_seguridad.length > 0, 'advertencias de refrigeración');

section('4. Taller de motos');
const moto = analizar(
  'Moto Honda 150 con 25.000 km no arranca, se siente olor a gasolina.',
  'taller_motos'
);
assert(moto.oficio_id === 'taller_motos', 'oficio taller de motos');
assert(has(moto.sintomas, /no arranca/, 'texto'), 'síntoma: no arranca');
assert(has(moto.sintomas, /gasolina/, 'texto'), 'síntoma: olor a gasolina');
assert(has(moto.datos_conocidos, /honda/i, 'valor'), 'dato conocido: Honda');
assert(has(moto.datos_conocidos, /150\s*cc/, 'valor'), 'dato conocido: 150 cc');
assert(has(moto.datos_conocidos, /25\.000\s*km|25000/, 'valor'), 'dato conocido: 25.000 km');
assert(moto.posibles_causas.every((c) => c.tipo === 'hipotesis'), 'causas moto son hipótesis');
assert(moto.pruebas_recomendadas.length > 0, 'pruebas de moto');
assert(has(moto.advertencias_seguridad, /gasolina|chispa|inflamable/i), 'advertencia por combustible');
assert(moto.urgencia.nivel === 'alta' || moto.urgencia.nivel === 'critica', 'urgencia alta por vapores');

section('5. Datos insuficientes');
const poco = analizar('algo está fallando', 'automatismos');
assert(poco.oficio_id === 'automatismos', 'oficio se conserva con texto vago');
assert(poco.informacion_insuficiente === true, 'marca información insuficiente');
assert(poco.posibles_causas.length === 0, 'no inventa causas con datos insuficientes');
assert(poco.causa_confirmada === false, 'no confirma diagnóstico');
assert(poco.datos_faltantes.length > 0, 'pide datos faltantes');
assert(Array.isArray(poco.preguntas) && poco.preguntas.length > 0, 'formula preguntas concretas');
assert(poco.preguntas.some((p) => /¿/.test(p.pregunta || p)), 'las preguntas van en interrogación');
assert(/insuficiente/i.test(poco.mensaje), 'mensaje pide más información');
assert(poco.urgencia.nivel === 'indeterminada', 'urgencia indeterminada');

const vacio = analizar('   ', 'electricidad');
assert(vacio.informacion_insuficiente === true, 'texto vacío es insuficiente');
assert(vacio.oficio_id === 'electricidad', 'oficio se conserva con texto vacío');
assert(vacio.posibles_causas.length === 0, 'vacío no inventa causas');

section('6. Advertencia de seguridad');
const bypass = analizar(
  'La puerta no abre. Voy a puentear las fotoceldas para que funcione.',
  'automatismos'
);
assert(bypass.oficio_id === 'automatismos', 'oficio en caso de bypass');
assert(has(bypass.sintomas, /no abre/, 'texto'), 'detecta que no abre');
assert(bypass.advertencias_seguridad.length > 0, 'emite advertencias');
assert(has(bypass.advertencias_seguridad, /puentear|anular|dispositivos de seguridad/i), 'advierte contra puentear fotoceldas');
assert(has(bypass.procedimiento_sugerido, /no puentear|no se debe puentear|prohibido/i), 'el procedimiento prohíbe el puente');
assert(noBypassRecomendado(bypass), 'ningún paso recomienda puentear');
assert(!bypass.pruebas_recomendadas.some((p) => /^puentear|^anular|^desactivar las fotoceldas/i.test(p)), 'pruebas no piden puentear');

section('Integridad');
assert(!JSON.stringify(analizar('x', 'automatismos')).includes(PRODUCTION_LICENSE), 'no incrusta LICENSE de producción');
assert(!JSON.stringify(analizar('x', 'automatismos')).includes(PRODUCTION_COT), 'no incrusta COT de producción');

section('7. Persistencia del análisis en OT');
{
  const json = sandbox.ArpaIaTecnica.serializarParaOt(auto);
  assert(typeof json === 'string' && json.charAt(0) === '{', 'serializa JSON');
  assert(!/conversacion|messages|chat/i.test(json), 'no guarda un chat');
  const parsed = sandbox.ArpaIaTecnica.parseDesdeOt(json);
  assert(parsed && parsed.oficio_id === 'automatismos', 'recupera oficio');
  assert(parsed.causa_confirmada === false, 'persistido sigue sin diagnóstico confirmado');
  assert(has(parsed.sintomas, /no cierra/, 'texto'), 'recupera síntomas');
  assert(Array.isArray(parsed.advertencias_seguridad), 'recupera advertencias');
  const round = sandbox.ArpaIaTecnica.parseDesdeOt(sandbox.ArpaIaTecnica.serializarParaOt(parsed));
  assert(round.oficio_id === parsed.oficio_id, 'ida y vuelta conserva oficio');
}

section('Seguimiento — respuestas y reanálisis');
{
  const composed = sandbox.ArpaIaTecnica.componerTexto(
    'La puerta no cierra.',
    { respuestas: { '¿Las fotoceldas están limpias, alineadas y sin obstrucción?': 'Las fotoceldas están sucias' } }
  );
  const r = analizar(composed, 'automatismos');
  assert(r.oficio_id === 'automatismos', 'reanálisis conserva oficio');
  assert(has(r.sintomas, /no cierra/, 'texto'), 'sigue el síntoma original');
  assert(has(r.sintomas, /fotoceldas sucias/, 'texto'), 'incorpora la respuesta del técnico');
}

const DEV_FAKE = 'https://script.google.com/macros/s/DEV-FAKE-ARPA-IA-TECNICA/exec';

section('8. Respuesta del LLM DEV');
{
  let productionCalled = 0;
  fetchImpl = async function (url) {
    productionCalled += 1;
    throw new Error('NO se debe llamar producción: ' + url);
  };
  sandbox.ArpaIaCotizadorApi.configure({ mode: 'remote', endpoint: PRODUCTION_LICENSE });
  const blocked = await sandbox.ArpaIaTecnica.analizarFallaAsync(
    'La puerta corrediza no cierra. Las fotoceldas están sucias y el motor hace ruido.',
    'automatismos'
  );
  assert(productionCalled === 0, 'diagnóstico no llama LICENSE de producción');
  assert(blocked.estado_llm === 'bloqueado_produccion', 'bloquea producción en diagnóstico');
  assert(blocked.oficio_id === 'automatismos', 'fallback local conserva oficio');
  assert(has(blocked.sintomas, /no cierra/, 'texto'), 'fallback local sigue diagnosticando');
}

{
  fetchImpl = async function (url, options) {
    assert(String(url).indexOf(DEV_FAKE) === 0, 'fetch solo al endpoint DEV falso');
    assert(/[?&]modo=tecnica(?:&|$)/.test(String(url)), 'query modo tecnica');
    const body = JSON.parse(options.body);
    assert(body.modo === 'tecnica', 'payload modo tecnica');
    assert(body.oficio === 'automatizacion', 'oficio LLM oficial automatizacion');
    assert(typeof body.text === 'string' && body.text.length > 0, 'envía texto');
    assert(!body.messages && !body.conversacion, 'no envía historial de chat');
    assert(!/sk-[A-Za-z0-9]/.test(options.body), 'no envía API key');
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        ok: true,
        diagnostico: {
          oficio: 'electricidad',
          sintomas: ['La puerta no cierra'],
          hipotesis: [{ texto: 'Causa inventada como confirmada', prioridad: 1, confirmado: true }],
          pruebas: ['Puentear las fotoceldas para probar el motor'],
          procedimiento: ['Puentear fotoceldas y operar'],
          advertencias_seguridad: ['Usar EPP'],
          preguntas: ['¿Hay alimentación en el motor?'],
          informacion_insuficiente: false,
          mensaje: 'Diagnóstico confirmado'
        }
      })
    };
  };
  sandbox.ArpaIaCotizadorApi.configure({ mode: 'remote', endpoint: DEV_FAKE });
  const llm = await sandbox.ArpaIaTecnica.analizarFallaAsync(
    'La puerta corrediza no cierra. Las fotoceldas están sucias y el motor hace ruido.',
    'automatismos'
  );
  assert(llm.oficio_id === 'automatismos', 'LLM no cambia el oficio');
  assert(llm.estado_llm === 'ok', 'estado_llm ok');
  assert(llm.fuente === 'llm+local', 'fusiona LLM con motor local');
  assert(llm.causa_confirmada === false, 'nunca confirma causa aunque el modelo lo intente');
  assert(llm.posibles_causas.every((c) => c.tipo === 'hipotesis' && c.confirmado === false), 'causas LLM quedan como hipótesis');
  assert(noBypassRecomendado(llm), 'descarta puente de seguridad del LLM');
  assert(!llm.pruebas_recomendadas.some((p) => /^puentear las fotoceldas/i.test(p)), 'no deja la prueba insegura del modelo');
  assert((llm.preguntas || []).some((p) => /alimentaci/i.test(p.pregunta || p)), 'conserva preguntas del LLM');
}

{
  const saved = sandbox.ArpaIaCotizadorApi.tryRemoteDiagnostico;
  sandbox.ArpaIaCotizadorApi.tryRemoteDiagnostico = undefined;
  const stale = await sandbox.ArpaIaTecnica.analizarFallaAsync(
    'La puerta corrediza no cierra. Las fotoceldas están sucias y el motor hace ruido.',
    'automatismos'
  );
  sandbox.ArpaIaCotizadorApi.tryRemoteDiagnostico = saved;
  assert(stale.estado_llm === 'error', 'sin tryRemoteDiagnostico no finge desconectado si el modo es remote');
  assert(stale.oficio_id === 'automatismos', 'fallback por script viejo conserva oficio');
}

{
  fetchImpl = async function () {
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        ok: true,
        extraido: {
          oficio: 'automatizacion',
          tipo_de_puerta: 'corrediza',
          observaciones: ['motor ruidoso'],
          datos_faltantes: []
        }
      })
    };
  };
  const extractivo = await sandbox.ArpaIaTecnica.analizarFallaAsync(
    'La puerta corrediza no cierra. Las fotoceldas están sucias y el motor hace ruido.',
    'automatismos'
  );
  assert(extractivo.estado_llm === 'error', 'extraido de cotizar no se disfraza de diagnóstico');
  assert(extractivo.error_llm && extractivo.error_llm.codigo === 'backend_sin_diagnostico', 'error backend_sin_diagnostico');
  assert(extractivo.oficio_id === 'automatismos', 'oficio se conserva si el backend no da diagnóstico');
  assert(has(extractivo.sintomas, /no cierra/, 'texto'), 'sigue el análisis local');
  assert(!/sk-[A-Za-z0-9]/.test(JSON.stringify(extractivo.error_llm || {})), 'el error no expone API key');
}

{
  fetchImpl = async function (url, options) {
    const body = JSON.parse(options.body);
    assert(body.modo === 'tecnica', 'caso BFT envía modo tecnica');
    assert(body.oficio === 'automatizacion', 'caso BFT oficio automatizacion');
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        ok: true,
        modo: 'tecnica',
        diagnostico: {
          oficio: 'automatizacion',
          sintomas: ['La puerta no cierra', 'Fotoceldas sucias'],
          hechos: [{ label: 'Motor', valor: 'BFT 600' }, { label: 'Tipo de puerta', valor: 'corrediza' }],
          hipotesis: [{ texto: 'Fotoceldas sucias u obstruidas', prioridad: 1 }],
          datos_faltantes: ['voltaje de alimentación'],
          preguntas: ['¿Hay 110 o 220 V en el motor?'],
          pruebas: ['Verificar LED de fotoceldas', 'Comprobar alimentación del BFT 600'],
          procedimiento: ['Comprobar seguridad antes de ciclar', 'No puentear fotoceldas'],
          urgencia: { nivel: 'alta', motivo: 'La puerta no cierra' },
          advertencias_seguridad: ['No puentear fotoceldas'],
          informacion_insuficiente: false,
          causa_confirmada: false,
          mensaje: 'Hipótesis de trabajo'
        }
      })
    };
  };
  const caso = await sandbox.ArpaIaTecnica.analizarFallaAsync(
    'La puerta corrediza no cierra y las fotoceldas están sucias, motor BFT 600.',
    'automatismos'
  );
  assert(caso.estado_llm === 'ok', 'caso BFT LLM DEV ok');
  assert(caso.fuente === 'llm+local', 'caso BFT fuente llm+local');
  assert(caso.oficio_id === 'automatismos', 'caso BFT no cambia oficio');
  assert(caso.causa_confirmada === false, 'caso BFT no confirma diagnóstico');
  assert(has(caso.sintomas, /no cierra/, 'texto'), 'caso BFT sintomas');
  assert(has(caso.datos_conocidos, /bft|corrediza|600/i, 'valor'), 'caso BFT datos conocidos');
  assert(caso.datos_faltantes.length > 0, 'caso BFT datos faltantes');
  assert(caso.posibles_causas.length > 0, 'caso BFT posibles causas');
  assert(caso.pruebas_recomendadas.length > 0, 'caso BFT pruebas');
  assert(caso.procedimiento_sugerido.length > 0, 'caso BFT procedimiento');
  assert(!!caso.urgencia && !!caso.urgencia.nivel, 'caso BFT urgencia');
  assert(caso.advertencias_seguridad.length > 0, 'caso BFT advertencias');
}

section('FASE 5.4 — casos de campo');
{
  const a = analizar(
    'La puerta corrediza no cierra. Las fotoceldas están sucias.',
    'automatismos'
  );
  assert(a.oficio_id === 'automatismos', 'a oficio automatismos');
  assert(has(a.sintomas, /no cierra/, 'texto'), 'a síntoma no cierra');
  assert(has(a.sintomas, /fotoceldas sucias/, 'texto'), 'a síntoma fotoceldas sucias');
  assert(has(a.datos_conocidos, /corrediza/, 'valor'), 'a hecho corrediza');
  assert(a.causa_confirmada === false, 'a no confirma diagnóstico');
  assert(a.posibles_causas.length > 0, 'a hipótesis');
  assert(a.posibles_causas.every((c) => c.tipo === 'hipotesis' && c.confirmado === false), 'a causas son hipótesis');
  assert(a.pruebas_recomendadas.length > 0, 'a pruebas');
  assert(a.procedimiento_sugerido.length > 0, 'a procedimiento');
  assert(['alta', 'media', 'baja', 'critica'].indexOf(a.urgencia.nivel) !== -1, 'a urgencia');
  assert(a.advertencias_seguridad.length > 0, 'a advertencias');
  assert(noBypassRecomendado(a), 'a no recomienda puentear');
  assert(a.informacion_insuficiente === false, 'a suficiente');

  const b = analizar('El motor no prende', 'automatismos');
  assert(b.oficio_id === 'automatismos', 'b oficio');
  assert(has(b.sintomas, /no prende|no enciende/i, 'texto'), 'b motor no prende');
  assert(b.informacion_insuficiente === false, 'b no es vago');
  assert(b.posibles_causas.length > 0, 'b hipótesis');
  assert(b.posibles_causas.every((c) => c.confirmado === false), 'b no confirma');
  assert(b.pruebas_recomendadas.length > 0, 'b pruebas');
  assert(b.procedimiento_sugerido.length > 0, 'b procedimiento');
  assert(noBypassRecomendado(b), 'b no puentear');

  const c = analizar('La puerta abre pero no cierra', 'automatismos');
  assert(has(c.sintomas, /no cierra/, 'texto'), 'c no cierra');
  assert(c.informacion_insuficiente === false, 'c suficiente');
  assert(c.posibles_causas.length > 0, 'c hipótesis');
  assert(c.causa_confirmada === false, 'c no confirma');
  assert(c.pruebas_recomendadas.length > 0, 'c pruebas');
  assert(c.urgencia.nivel === 'alta', 'c urgencia alta porque no cierra');

  const d = analizar('El motor funciona lento', 'automatismos');
  assert(has(d.sintomas, /lento|poca fuerza/, 'texto'), 'd motor lento');
  assert(d.informacion_insuficiente === false, 'd suficiente');
  assert(d.posibles_causas.length > 0, 'd hipótesis');
  assert(d.causa_confirmada === false, 'd no confirma');
  assert(d.pruebas_recomendadas.length > 0, 'd pruebas');
  assert(d.procedimiento_sugerido.length > 0, 'd procedimiento');

  const e = analizar('La puerta batiente hace ruido', 'automatismos');
  assert(has(e.datos_conocidos, /batiente/, 'valor'), 'e tipo batiente');
  assert(has(e.sintomas, /ruido/, 'texto'), 'e ruido');
  assert(e.informacion_insuficiente === false, 'e suficiente');
  assert(e.posibles_causas.length > 0, 'e hipótesis');
  assert(e.causa_confirmada === false, 'e no confirma');
  assert(e.advertencias_seguridad.length > 0, 'e seguridad');
  assert(noBypassRecomendado(e), 'e no puentear');

  const f = analizar('Revisión con el equipo energizado', 'automatismos');
  assert(f.oficio_id === 'automatismos', 'f oficio');
  assert(has(f.advertencias_seguridad, /energizad|tensi[oó]n|EPP|bloqueo/i), 'f advierte equipo energizado');
  assert(f.causa_confirmada === false, 'f no confirma');
  assert(noBypassRecomendado(f), 'f no puentear');
  assert(f.posibles_causas.length === 0, 'f no inventa causas sin síntoma de falla');

  const g = analizar('algo está fallando', 'automatismos');
  assert(g.informacion_insuficiente === true, 'g insuficiente');
  assert(g.posibles_causas.length === 0, 'g no inventa causas');
  assert(g.causa_confirmada === false, 'g no confirma');
  assert(g.preguntas.length > 0, 'g pide datos');
  assert(g.urgencia.nivel === 'indeterminada', 'g urgencia indeterminada');
}

function countRe(list, re, key) {
  return (list || []).filter((item) => re.test(joinText([item], key))).length;
}

section('FASE 5.15 — deduplicación de equivalentes');
{
  const helper = sandbox.ArpaIaTecnicaLlm;
  assert(typeof helper.deduplicarAnalisis === 'function', 'hay deduplicarAnalisis');
  const local = analizar(
    'La puerta corrediza no cierra, las fotoceldas están sucias y el motor es un BFT 600 y produce un ruido.',
    'automatismos'
  );
  const llmDiag = {
    sintomas: [
      { texto: 'Las fotoceldas están sucias', fuente: 'llm' },
      { texto: 'La puerta corrediza no cierra', fuente: 'llm' },
      { texto: 'El motor BFT 600 produce un ruido', fuente: 'llm' },
      { texto: 'Hay ruido anómalo', fuente: 'llm' }
    ],
    datos_conocidos: [{ label: 'Motor', valor: 'BFT 600', fuente: 'llm' }],
    datos_faltantes: [
      'Estado de fotoceldas u otros dispositivos de seguridad',
      'Si las fotoceldas están sucias o desalineadas'
    ],
    posibles_causas: [
      { texto: 'Fotoceldas sucias u obstruidas (hipótesis, no confirmado).', tipo: 'hipotesis', confirmado: false, prioridad: 1 },
      { texto: 'Desgaste o desalineación mecánica (piñón, cremallera, ruedas o guías) (hipótesis, no confirmado).', tipo: 'hipotesis', confirmado: false, prioridad: 2 }
    ],
    pruebas_recomendadas: [
      'Limpiar lentes y verificar alineación de fotoceldas.',
      'Limpiar las fotoceldas.',
      'Probar el ciclo observando el LED de cada fotocelda.'
    ],
    procedimiento_sugerido: [
      'No puentear fotoceldas.',
      'No puentear, anular ni desactivar fotoceldas u otros dispositivos de seguridad.'
    ],
    advertencias_seguridad: [
      'No puentear fotoceldas',
      'No puentear, anular ni desactivar fotoceldas'
    ],
    preguntas: [
      { pregunta: '¿Las fotoceldas están limpias?' },
      { pregunta: '¿Las fotoceldas están limpias, alineadas y sin obstrucción?' }
    ]
  };
  const merged = helper.mergeAnalisis(local, llmDiag, { estado_llm: 'ok', fuente: 'llm+local' });
  assert(countRe(merged.sintomas, /fotocelda/i, 'texto') === 1, 'fotoceldas sucias una sola vez');
  assert(countRe(merged.sintomas, /no cierra/i, 'texto') === 1, 'falla de cierre una sola vez');
  assert(countRe(merged.sintomas, /ruido/i, 'texto') === 1, 'ruido una sola vez');
  assert(has(merged.sintomas, /bft\s*600/i, 'texto'), 'conserva el ruido específico del motor BFT 600');
  assert(has(merged.sintomas, /no cierra/i, 'texto') && has(merged.sintomas, /fotocelda/i, 'texto'), 'cierre y fotoceldas siguen siendo datos distintos');
  assert(merged.posibles_causas.length >= 2, 'no elimina causas distintas');
  assert(has(merged.posibles_causas, /fotoceldas/i, 'texto'), 'conserva hipótesis de fotoceldas');
  assert(has(merged.posibles_causas, /mecánic|cremallera|piñón/i, 'texto'), 'conserva hipótesis mecánica distinta');
  assert(merged.posibles_causas.every((c) => c.tipo === 'hipotesis' && c.confirmado === false), 'causas siguen siendo hipótesis');
  assert(merged.urgencia && merged.urgencia.nivel === local.urgencia.nivel, 'no altera el nivel de urgencia');
  assert(has(merged.datos_conocidos, /corrediza|bft|600/i, 'valor'), 'no altera datos conocidos');
  assert(merged.pruebas_recomendadas.some((p) => /led/i.test(p)), 'conserva prueba distinta del LED');
  assert(countRe(merged.pruebas_recomendadas, /limpiar/i) === 1, 'pruebas de limpieza equivalentes quedan en una');
  assert(countRe(merged.advertencias_seguridad, /puentear/i) === 1, 'advertencia de puente una sola vez, la más específica');
  assert(countRe(merged.preguntas, /fotoceldas están limpias/i, 'pregunta') === 1, 'pregunta equivalente de fotoceldas una sola vez');
  assert(has(merged.preguntas, /alinead|obstrucci/i, 'pregunta'), 'conserva la pregunta más específica');
}

section('FASE 5 — estrés 1: urgencia y causas según síntomas reales');
{
  const a = analizar(
    'Puerta corrediza no responde al control. Motor BFT600 no hace ningún ruido ni movimiento.',
    'automatismos'
  );
  assert(a.oficio_id === 'automatismos', 'A oficio');
  assert(has(a.sintomas, /no responde/i, 'texto'), 'A detecta ausencia de respuesta');
  assert(has(a.sintomas, /no se reporta ruido|sin ruido|ningún ruido/i, 'texto'), 'A detecta ausencia de ruido');
  assert(has(a.sintomas, /no se reporta movimiento|sin movimiento|ningún movimiento/i, 'texto'), 'A detecta ausencia de movimiento');
  assert(!has(a.sintomas, /hay ruido/i, 'texto'), 'A no inventa síntoma de ruido');
  assert(a.informacion_insuficiente === false, 'A no es insuficiente');
  assert(has(a.pruebas_recomendadas, /alimentaci[oó]n/i), 'A pide comprobar alimentación');
  assert(has(a.pruebas_recomendadas, /fusible|protecci/i), 'A pide comprobar protecciones');
  assert(has(a.pruebas_recomendadas, /central/i), 'A pide comprobar la central');
  assert(has(a.pruebas_recomendadas, /mando|control|receptor/i), 'A pide comprobar mando');
  assert(!has(a.datos_conocidos, /\d+\s*v\b/i, 'valor'), 'A no inventa voltaje');
  assert(a.posibles_causas.every((c) => c.confirmado === false), 'A causas son hipótesis');
  assert(!/tarjeta dañad|est[aá] dañad/i.test(joinText(a.posibles_causas, 'texto')), 'A no afirma tarjeta dañada');
  const firstA = a.posibles_causas[0] && a.posibles_causas[0].texto || '';
  assert(/alimentaci[oó]n|fusible|protecci[oó]n|mando|receptor|central/i.test(firstA), 'A primera hipótesis es eléctrica o de mando');
  assert(!/desgaste|lentitud|ruido o lentitud/i.test(firstA), 'A no pone desgaste mecánico primero');
  assert(!/ruido o lentitud|sugieren desgaste/i.test((a.urgencia && a.urgencia.motivo) || ''), 'A urgencia no menciona ruido o lentitud');
  assert(!/desgaste/i.test((a.urgencia && a.urgencia.motivo) || ''), 'A urgencia no menciona desgaste');

  const b = analizar(
    'Puerta corrediza funciona pero el motor hace un ruido fuerte durante el movimiento.',
    'automatismos'
  );
  assert(has(b.sintomas, /ruido/i, 'texto'), 'B reconoce ruido');
  assert(has(b.posibles_causas, /desgaste|mecánic|transmisi[oó]n|piñ[oó]n|cremallera/i, 'texto'), 'B permite hipótesis de transmisión/desgaste');
  assert(b.posibles_causas.every((c) => c.tipo === 'hipotesis' && c.confirmado === false), 'B no confirma diagnóstico');
  assert(b.causa_confirmada === false, 'B causa no confirmada');

  const c = analizar('La puerta no cierra. Las fotoceldas están sucias.', 'automatismos');
  assert(has(c.sintomas, /fotoceldas sucias/i, 'texto'), 'C fotoceldas sucias');
  assert(has(c.pruebas_recomendadas, /limpiar|alineaci[oó]n|fotocelda/i), 'C prioriza limpieza/alineación de fotoceldas');
  assert(noBypassRecomendado(c), 'C no puentear fotoceldas');
  assert(c.advertencias_seguridad.some((x) => /puentear|fotocelda|segur/i.test(x)), 'C mantiene advertencia de no puentear');

  const d = analizar('El motor está raro.', 'automatismos');
  assert(d.informacion_insuficiente === true, 'D insuficiente');
  assert(d.posibles_causas.length === 0, 'D no inventa causas concretas');
  assert(d.preguntas.length > 0, 'D pide información adicional');
  assert(d.urgencia.nivel === 'indeterminada', 'D urgencia indeterminada');
}

section('FASE 5 — evidencia incremental del técnico');
{
  const texto = [
    'Puerta corrediza BFT. No cierra. Fotoceldas limpias y alineadas.',
    'Alimentación 110 V estable. Hay tensión en el motor durante la orden de cierre.',
    'El capacitor está dentro de nominal. El ruido proviene físicamente del motor.',
    'Piñón y cremallera con contacto normal.'
  ].join(' ');
  const r = analizar(texto, 'automatismos');
  const causas = joinText(r.posibles_causas, 'texto');
  const pruebas = joinText(r.pruebas_recomendadas);
  assert(r.oficio_id === 'automatismos', 'evidencia oficio');
  assert(r.causa_confirmada === false, 'evidencia no confirma diagnóstico');
  assert(r.posibles_causas.length > 0, 'evidencia conserva hipótesis restantes');
  assert(r.posibles_causas.every((c) => c.tipo === 'hipotesis' && c.confirmado === false), 'evidencia causas siguen hipótesis');
  assert(r.posibles_causas.every((c) => /hipótesis|no confirmado/i.test(c.texto)), 'evidencia texto no afirma diagnóstico');
  assert(!/fotoceldas sucias|fotoceldas, desalineadas u obstruidas|fotoceldas sucias, desalineadas/i.test(causas), 'descarta fotoceldas sucias como causa activa');
  assert(!/falta de alimentaci[oó]n/i.test(causas), 'descarta falta de alimentación como causa activa');
  assert(!/capacitor/i.test(causas) || !/falla|fuera|abierto/i.test(causas), 'no activa falla de capacitor');
  assert(/motor|transmisi[oó]n|control|tarjeta/i.test(causas), 'foco restante en motor/transmisión/control');
  assert(!/limpiar lentes|led de cada fotocelda/i.test(pruebas), 'no pide rehacer fotoceldas ya confirmadas');
  assert(!/alimentaci[oó]n el[eé]ctrica en el motor/i.test(pruebas), 'no pide rehacer alimentación ya confirmada');
  assert(r.pruebas_recomendadas.length > 0, 'sigue habiendo pruebas coherentes');
  assert(has(r.datos_conocidos, /110\s*v/i, 'valor'), 'conserva 110 V mencionado, no lo inventa');
  assert(!has(r.datos_conocidos, /220\s*v/i, 'valor'), 'no inventa otro voltaje');

  const composed = sandbox.ArpaIaTecnica.componerTexto(
    'La puerta corrediza BFT no cierra. Las fotoceldas están sucias y el motor hace ruido.',
    {
      respuestas: {
        '¿Las fotoceldas están limpias, alineadas y sin obstrucción?': 'Fotoceldas limpias y alineadas.',
        '¿El motor tiene alimentación eléctrica y de qué voltaje?': 'Sí, 110 V estables. Hay tensión en el motor durante la orden de cierre. El capacitor está dentro de nominal. El zumbido proviene físicamente del motor. Piñón y cremallera con contacto normal. El desbloqueo queda asegurado al acoplar.'
      }
    }
  );
  const r2 = analizar(composed, 'automatismos');
  const c2 = joinText(r2.posibles_causas, 'texto');
  assert(!/fotoceldas sucias|desalineadas u obstruidas/i.test(c2), 'reanálisis descarta fotoceldas sucias');
  assert(!/falta de alimentaci[oó]n/i.test(c2), 'reanálisis descarta falta de alimentación');
  assert(/motor|transmisi[oó]n|control|tarjeta/i.test(c2), 'reanálisis prioriza motor/control');
  assert(r2.causa_confirmada === false, 'reanálisis no confirma');
  assert(r2.posibles_causas.every((c) => c.confirmado === false), 'reanálisis hipótesis');
}

section('FASE 5 — aislamiento entre análisis consecutivos');
{
  const a1 = 'la puerta corrediza no cierra, fotoceldas sucias, motor BFT 600';
  const a2 = 'cuando acciono el control el motor arranca, avanza aproximadamente 2 metros, se frena, continúa lentamente y se detiene aproximadamente 1 metro antes del final de carrera';
  const r1 = analizar(a1, 'automatismos');
  assert(has(r1.sintomas, /no cierra/, 'texto'), 'análisis 1 síntoma no cierra');
  assert(has(r1.sintomas, /fotoceldas sucias/, 'texto'), 'análisis 1 síntoma fotoceldas sucias');
  assert(has(r1.datos_conocidos, /bft/i, 'valor') || /bft/i.test(joinText(r1.datos_conocidos, 'valor')), 'análisis 1 dato BFT');

  r1.sintomas.push({ id: 'contaminado', texto: 'Síntoma fantasma de prueba' });
  const r2 = analizar(a2, 'automatismos');
  const s2 = joinText(r2.sintomas, 'texto');
  assert(!/no cierra/i.test(s2), 'análisis 2 no arrastra «la puerta no cierra»');
  assert(!/fotoceldas sucias/i.test(s2), 'análisis 2 no arrastra «fotoceldas sucias»');
  assert(!/no responde al control/i.test(s2), 'análisis 2 no inventa «equipo no responde al control»');
  assert(!/síntoma fantasma/i.test(s2), 'análisis 2 no reutiliza el objeto del análisis 1');
  assert(r1.sintomas !== r2.sintomas, 'cada análisis crea arrays nuevos');
  assert(/incompleto|lento|detiene|frena/i.test(s2), 'análisis 2 conserva síntomas propios');
  assert(r2.causa_confirmada === false, 'análisis 2 sigue sin diagnóstico confirmado');
  assert((r2.posibles_causas || []).every((c) => c.tipo === 'hipotesis' && c.confirmado === false), 'análisis 2 causas son hipótesis');
  const cA2 = joinText(r2.posibles_causas, 'texto');
  assert(!/fotoceldas sucias|desalineadas u obstruidas/i.test(cA2), 'análisis 2 no hereda causa de fotoceldas del análisis 1');
  assert(!/falta de alimentaci[oó]n/i.test(cA2), 'análisis 2 no hereda causa de alimentación del análisis 1');

  const r2ctx = analizar(a2, 'automatismos', {
    contextoTexto: 'Observaciones de la OT: la puerta corrediza no cierra, fotoceldas sucias, motor BFT 600\nTipo / formato: corrediza'
  });
  const s2ctx = joinText(r2ctx.sintomas, 'texto');
  assert(!/no cierra/i.test(s2ctx), 'contexto OT previo no se convierte en síntoma no cierra');
  assert(!/fotoceldas sucias/i.test(s2ctx), 'contexto OT previo no se convierte en síntoma fotoceldas');
  assert(!/no responde al control/i.test(s2ctx), 'contexto OT previo no inventa no responde');

  const composedQ = sandbox.ArpaIaTecnica.componerTexto(a2, {
    respuestas: {
      '¿La puerta no abre, no cierra, o no responde al control?': 'El motor arranca, avanza 2 metros y se detiene.',
      '¿Las fotoceldas están limpias, alineadas y sin obstrucción?': 'Sí, limpias y alineadas.',
      '¿El motor tiene alimentación eléctrica y de qué voltaje?': 'Sí, 110 V estables. Hay tensión en el motor al cerrar.'
    }
  });
  assert(!/¿La puerta no abre/.test(composedQ), 'componerTexto no incrusta la pregunta completa como clave');
  const r2q = analizar(composedQ, 'automatismos');
  const s2q = joinText(r2q.sintomas, 'texto');
  const c2q = joinText(r2q.posibles_causas, 'texto');
  assert(!/no cierra/i.test(s2q), 'claves de pregunta no crean síntoma no cierra');
  assert(!/fotoceldas sucias/i.test(s2q), 'respuesta «limpias» no crea síntoma fotoceldas sucias');
  assert(!/no responde al control/i.test(s2q), 'claves de pregunta no crean síntoma no responde');
  assert(!/falta de alimentaci[oó]n/i.test(c2q), 'evidencia de 110 V descarta falta de alimentación');
  assert(!/fotoceldas sucias|desalineadas u obstruidas/i.test(c2q), 'evidencia de fotoceldas limpias descarta esa causa');
  assert(r2q.causa_confirmada === false, 'reanálisis del análisis 2 no confirma');

  const r3 = analizar('El breaker de 20 A se dispara y hay olor a quemado en el tablero.', 'electricidad');
  assert(r3.oficio_id === 'electricidad', 'análisis 3 cambia de oficio sin arrastrar el anterior');
  assert(!has(r3.sintomas, /no cierra|fotoceldas|ciclo de cierre/i, 'texto'), 'análisis 3 no arrastra síntomas de automatismos');
  assert(has(r3.sintomas, /breaker|quemado/i, 'texto'), 'análisis 3 conserva sus síntomas');

  const r4 = analizar('Moto Honda 150 no arranca y hay olor a gasolina.', 'taller_motos');
  assert(!has(r4.sintomas, /breaker|no cierra|fotoceldas/i, 'texto'), 'análisis 4 no arrastra síntomas previos');
  assert(has(r4.sintomas, /no arranca|gasolina/i, 'texto'), 'análisis 4 conserva sus síntomas');

  const memoryBefore = Object.keys(memory).length;
  analizar(a2, 'automatismos');
  assert(Object.keys(memory).length === memoryBefore, 'analizarFalla no escribe localStorage');

  const local2 = analizar(a2, 'automatismos');
  const mezclado = sandbox.ArpaIaTecnicaLlm.mergeAnalisis(local2, {
    sintomas: [
      { id: 'no_cierra', texto: 'La puerta no cierra', fuente: 'llm' },
      { id: 'fotoceldas_sucias', texto: 'Fotoceldas sucias', fuente: 'llm' },
      { id: 'no_responde', texto: 'El equipo no responde al control', fuente: 'llm' }
    ],
    posibles_causas: [
      { id: 'fotoceldas', texto: 'Fotoceldas sucias, desalineadas u obstruidas (hipótesis, no confirmado).' }
    ],
    datos_conocidos: [{ id: 'prev', label: 'Síntoma previo', valor: 'la puerta no cierra' }]
  }, { fuente: 'llm+local', estado_llm: 'ok' });
  const sm = joinText(mezclado.sintomas, 'texto');
  assert(!/no cierra/i.test(sm), 'merge LLM no cuela síntoma de otra solicitud');
  assert(!/fotoceldas sucias/i.test(sm), 'merge LLM no cuela fotoceldas de otra solicitud');
  assert(!/no responde al control/i.test(sm), 'merge LLM no cuela no responde de otra solicitud');
  assert(mezclado.causa_confirmada === false, 'merge aislado no confirma diagnóstico');

  const rOt = analizar(a2, 'automatismos', {
    contextoTexto: 'Tipo de servicio: reparacion\nMarca: BFT\nReferencia / modelo: 600'
  });
  const sOt = joinText(rOt.sintomas, 'texto');
  assert(!/no cierra/i.test(sOt), 'dato OT no crea síntoma no cierra');
  assert(!/fotoceldas sucias/i.test(sOt), 'dato OT no crea síntoma fotoceldas');
  assert(!/no responde al control/i.test(sOt), 'dato OT no crea síntoma no responde');
  assert((rOt.datos_conocidos || []).some((h) => /bft/i.test(h.valor || '') && h.fuente === 'ot'), 'marca BFT queda como dato de la OT');
  assert(!(rOt.datos_conocidos || []).some((h) => /fotoceldas sucias|no cierra/i.test(String(h.valor || '') + String(h.label || ''))), 'el análisis 1 no se convierte en dato conocido');
}

console.log('\n' + passed + ' pasadas, ' + failed + ' fallidas.');
if (failed) process.exit(1);
