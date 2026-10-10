/**
 * Cotización: el número (COT-XXX) se asigna al guardar / generar PDF / compartir,
 * no al entrar al módulo. Así no se gastan números en cotizaciones sin terminar.
 * Sin nube (LAB): la numeración usa el camino local.
 * node --test tests/cotizacion-numero.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function fakeEl(id) {
  return {
    id,
    value: '',
    checked: false,
    hidden: false,
    textContent: '',
    innerHTML: '',
    style: { setProperty() {} },
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {},
    removeAttribute() {},
    hasAttribute: () => false,
    addEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    closest: () => null,
    appendChild() {},
    isConnected: true
  };
}

function loadSuite({ license = true, draft = null, counter = '3' } = {}) {
  const store = { arpa_ultimo_cot: counter };
  if (license) store.arpa_suite_license_code = 'LAB-TEST-LOCAL';
  if (draft) store.arpa_cot_draft = JSON.stringify(draft);
  const els = {};
  const getEl = (id) => (els[id] ||= fakeEl(id));
  const historial = [];
  const alerts = [];
  let prints = 0;

  const sb = {
    console,
    Intl,
    Date,
    JSON,
    Math,
    Promise,
    setTimeout: () => 0,
    clearTimeout() {},
    alert: (m) => alerts.push(String(m)),
    confirm: () => true,
    print: () => { prints++; },
    scrollTo() {},
    addEventListener() {},
    getComputedStyle: () => ({ display: '' }),
    navigator: { language: 'es-CO' },
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    },
    document: {
      title: '',
      body: fakeEl('body'),
      getElementById: getEl,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener() {},
      createElement: () => fakeEl('tmp')
    },
    fechaLocalISO: (d) => d.toISOString().slice(0, 10),
    ArpaI18n: { t: (k) => k },
    // Sin nube: obtenerSiguienteNumeroCloud no existe → número local.
    ArpaHistorial: {
      captureFromCotizacion: () => {
        historial.push(sb.ArpaCotizacion.getCotSnapshot().numero);
      }
    }
  };
  sb.window = sb;
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(read('js/arpa-numeracion.js'), sb, { filename: 'arpa-numeracion.js' });
  vm.runInContext(read('js/arpa-cotizacion.js'), sb, { filename: 'arpa-cotizacion.js' });
  vm.runInContext(read('js/arpa-views.js'), sb, { filename: 'arpa-views.js' });
  sb.ArpaCotizacion.initCotizacion();
  return {
    sb,
    store,
    numero: () => getEl('numero-cot').value,
    draft: () => JSON.parse(store.arpa_cot_draft || 'null'),
    historial,
    alerts,
    prints: () => prints
  };
}

test('entrar a Cotización no asigna número ni gasta el contador', () => {
  const s = loadSuite();
  s.sb.openCotizacionView(null);
  s.sb.openCotizacionView(null);
  assert.equal(s.numero(), '');
  assert.equal(s.store.arpa_ultimo_cot, '3');
  assert.equal(s.store.arpa_numero_reservado_cot, undefined);
});

test('guardar PDF asigna número, lo guarda en el borrador y lo usa en el Historial', async () => {
  const s = loadSuite();
  s.sb.openCotizacionView(null);
  let draftAlAsignar = null;
  const orig = s.sb.ArpaHistorial.captureFromCotizacion;
  s.sb.ArpaHistorial.captureFromCotizacion = () => { draftAlAsignar = s.draft(); orig(); };
  await s.sb.guardarCotPDF();
  assert.equal(s.numero(), 'COT-004');
  assert.equal(s.store.arpa_ultimo_cot, '4');
  assert.equal(draftAlAsignar?.numero, 'COT-004', 'el número quedó en el borrador al asignarse');
  assert.deepEqual(s.historial, ['COT-004']);
  assert.equal(s.prints(), 1);
});

test('compartir (PDF + WhatsApp) también asigna número antes de generar', async () => {
  const s = loadSuite();
  await s.sb.guardarCotPDFYWhatsApp();
  assert.equal(s.numero(), 'COT-004');
  assert.deepEqual(s.historial, ['COT-004']);
});

test('asegurarNumeroCot guarda el número de inmediato en el borrador', async () => {
  const s = loadSuite();
  assert.equal(await s.sb.ArpaCotizacion.asegurarNumeroCot(), true);
  assert.equal(s.draft().numero, 'COT-004');
});

test('un borrador con número lo conserva al entrar y al generar PDF', async () => {
  const s = loadSuite({ draft: { numero: 'COT-010', nombre: 'Cliente', filas: [] } });
  s.sb.openCotizacionView(null);
  assert.equal(s.numero(), 'COT-010');
  await s.sb.guardarCotPDF();
  await s.sb.guardarCotPDF();
  assert.equal(s.numero(), 'COT-010');
  assert.equal(s.store.arpa_ultimo_cot, '3', 'no se pidió otro número');
  assert.deepEqual(s.historial, ['COT-010', 'COT-010']);
});

test('un número reservado (de una versión anterior) se reutiliza al guardar', async () => {
  const s = loadSuite();
  s.store.arpa_numero_reservado_cot = 'COT-004';
  s.store.arpa_ultimo_cot = '4';
  await s.sb.guardarCotPDF();
  assert.equal(s.numero(), 'COT-004');
  assert.equal(s.store.arpa_ultimo_cot, '4');
});

test('"+ NUEVO N°" sigue asignando el siguiente y lo guarda en el borrador', async () => {
  const s = loadSuite();
  await s.sb.nuevoCotNumero();
  assert.equal(s.numero(), 'COT-004');
  assert.equal(s.draft().numero, 'COT-004');
  await s.sb.nuevoCotNumero();
  assert.equal(s.numero(), 'COT-005');
});

test('sin licencia no se genera PDF ni se pasa al Historial sin número', async () => {
  const s = loadSuite({ license: false });
  await s.sb.guardarCotPDF();
  await s.sb.guardarCotPDFYWhatsApp();
  assert.equal(s.numero(), '');
  assert.deepEqual(s.historial, []);
  assert.equal(s.prints(), 0);
  assert.ok(s.alerts.length >= 1);
});
