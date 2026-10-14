/**
 * Cuenta de Cobro: el número (CC-XXX) se asigna al generar el PDF o compartir,
 * no al entrar al módulo ni al abrir la app. Así no se gastan números en
 * cuentas de cobro sin terminar. Sin nube (LAB): la numeración usa el camino local.
 * node --test tests/cuenta-cobro-numero.test.js
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

/** jsPDF de mentira: acepta cualquier llamada y cuenta los PDF guardados. */
function makeFakeJsPDF(saved) {
  return function FakeJsPDF() {
    const doc = {
      internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
      splitTextToSize: (t) => [String(t)],
      output: () => '',
      save: (filename) => { saved.push(filename); }
    };
    return new Proxy(doc, {
      get: (target, prop) => (prop in target ? target[prop] : () => 0)
    });
  };
}

function loadSuite({ license = true, draft = null, counter = '3' } = {}) {
  const store = { arpa_cc_num: counter };
  if (license) store.arpa_suite_license_code = 'LAB-TEST-LOCAL';
  if (draft) store.arpa_cuenta_cobro_draft = JSON.stringify(draft);
  const els = {};
  const getEl = (id) => (els[id] ||= fakeEl(id));
  const historial = [];
  const alerts = [];
  const pdfs = [];

  const sb = {
    console: { ...console, warn() {} },
    Intl,
    Date,
    JSON,
    Math,
    Number,
    String,
    Promise,
    Proxy,
    setTimeout: () => 0,
    clearTimeout() {},
    alert: (m) => alerts.push(String(m)),
    confirm: () => true,
    scrollTo() {},
    addEventListener() {},
    getComputedStyle: () => ({ display: '' }),
    navigator: { language: 'es-CO' },
    File: class { constructor(parts, name) { this.name = name; } },
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
    jspdf: { jsPDF: makeFakeJsPDF(pdfs) },
    // Sin nube: obtenerSiguienteNumeroCloud no existe → número local.
    ArpaHistorial: {
      captureFromCuentaCobro: (d) => { historial.push(d.numero); }
    }
  };
  sb.window = sb;
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(read('js/arpa-numeracion.js'), sb, { filename: 'arpa-numeracion.js' });
  vm.runInContext(read('js/arpa-cuenta-cobro.js'), sb, { filename: 'arpa-cuenta-cobro.js' });
  vm.runInContext(read('js/arpa-views.js'), sb, { filename: 'arpa-views.js' });
  sb.ArpaCuentaCobro.initCuentaCobro();
  return {
    sb,
    store,
    numero: () => getEl('cc-numero').value,
    draft: () => JSON.parse(store.arpa_cuenta_cobro_draft || 'null'),
    historial,
    alerts,
    pdfs
  };
}

const settle = () => new Promise((r) => setImmediate(r));

test('abrir la app y entrar a Cuenta de Cobro no asigna número ni gasta el contador', async () => {
  const s = loadSuite();
  await settle();
  s.sb.openCuentaCobroView(null);
  s.sb.openCuentaCobroView(null);
  await settle();
  assert.equal(s.numero(), '');
  assert.equal(s.store.arpa_cc_num, '3');
  assert.equal(s.store.arpa_numero_reservado_cc, undefined);
});

test('generar PDF asigna número, lo guarda en el borrador y lo usa en el Historial', async () => {
  const s = loadSuite();
  s.sb.openCuentaCobroView(null);
  let draftAlAsignar = null;
  const orig = s.sb.ArpaHistorial.captureFromCuentaCobro;
  s.sb.ArpaHistorial.captureFromCuentaCobro = (d) => { draftAlAsignar = s.draft(); orig(d); };
  await s.sb.ArpaCuentaCobro.generarPDF();
  assert.equal(s.store.arpa_cc_num, '4');
  assert.equal(draftAlAsignar?.numero, 'CC-004', 'el número quedó en el borrador al asignarse');
  assert.deepEqual(s.historial, ['CC-004']);
  assert.equal(s.pdfs.length, 1);
  assert.match(s.pdfs[0], /CC-004/);
});

test('compartir (WhatsApp) también asigna número antes de generar', async () => {
  const s = loadSuite();
  let draftAlAsignar = null;
  const orig = s.sb.ArpaHistorial.captureFromCuentaCobro;
  s.sb.ArpaHistorial.captureFromCuentaCobro = (d) => { draftAlAsignar = s.draft(); orig(d); };
  await s.sb.ArpaCuentaCobro.enviarWhatsApp();
  assert.equal(draftAlAsignar?.numero, 'CC-004');
  assert.deepEqual(s.historial, ['CC-004']);
});

test('asegurarNumeroCc guarda el número de inmediato en el borrador', async () => {
  const s = loadSuite();
  assert.equal(await s.sb.ArpaCuentaCobro.asegurarNumeroCc(), true);
  assert.equal(s.draft().numero, 'CC-004');
});

test('un borrador con número lo conserva al entrar y al generar PDF', async () => {
  const s = loadSuite({ draft: { numero: 'CC-010', clienteNombre: 'Cliente', servicios: [] } });
  s.sb.openCuentaCobroView(null);
  assert.equal(s.numero(), 'CC-010');
  await s.sb.ArpaCuentaCobro.generarPDF();
  assert.equal(s.store.arpa_cc_num, '3', 'no se pidió otro número');
  assert.deepEqual(s.historial, ['CC-010']);
});

test('después de generar el PDF el campo queda vacío y la siguiente no sale repetida', async () => {
  const s = loadSuite();
  await s.sb.ArpaCuentaCobro.generarPDF();
  assert.equal(s.numero(), '', 'el campo se vacía al terminar');
  assert.equal(s.draft(), null, 'el borrador se borra');
  await s.sb.ArpaCuentaCobro.generarPDF();
  assert.equal(s.numero(), '');
  assert.deepEqual(s.historial, ['CC-004', 'CC-005']);
});

test('un número reservado (de una versión anterior) se reutiliza al generar PDF', async () => {
  const s = loadSuite();
  s.store.arpa_numero_reservado_cc = 'CC-004';
  s.store.arpa_cc_num = '4';
  s.sb.openCuentaCobroView(null);
  assert.equal(s.numero(), '', 'entrar no toma el reservado');
  await s.sb.ArpaCuentaCobro.generarPDF();
  assert.equal(s.store.arpa_cc_num, '4');
  assert.deepEqual(s.historial, ['CC-004']);
});

test('"+ NUEVO N°" sigue asignando el siguiente y lo guarda en el borrador', async () => {
  const s = loadSuite();
  assert.equal(await s.sb.nuevoCcNumero(), true);
  assert.equal(s.numero(), 'CC-004');
  assert.equal(s.draft().numero, 'CC-004');
  await s.sb.nuevoCcNumero();
  assert.equal(s.numero(), 'CC-005');
  assert.equal(s.draft().numero, 'CC-005');
});

test('sin licencia no se genera PDF ni se pasa al Historial sin número', async () => {
  const s = loadSuite({ license: false });
  await s.sb.ArpaCuentaCobro.generarPDF();
  await s.sb.ArpaCuentaCobro.enviarWhatsApp();
  assert.equal(s.numero(), '');
  assert.deepEqual(s.historial, []);
  assert.equal(s.pdfs.length, 0);
  assert.equal(await s.sb.nuevoCcNumero(), false);
  assert.equal(await s.sb.ArpaCuentaCobro.ensureCcNumero(), false);
  assert.ok(s.alerts.includes('alert.numeracion.sin_licencia'));
});
