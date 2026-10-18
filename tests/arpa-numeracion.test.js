const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// Entorno mínimo: localStorage en memoria y una "nube" que tarda en responder,
// con la misma regla que Apps Script: max(actual, clienteUltimo) + 1.
let store;
let cloud;
let cloudCalls;
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};
global.ArpaCloudSync = {
  obtenerSiguienteNumeroCloud: (tipo, clienteUltimo) => new Promise((resolve) => {
    cloudCalls++;
    setTimeout(() => {
      cloud[tipo] = Math.max(cloud[tipo] || 0, clienteUltimo) + 1;
      resolve(cloud[tipo]);
    }, 30);
  })
};

require('../js/arpa-numeracion.js');
const N = global.ArpaNumeracion;

beforeEach(() => {
  store = { arpa_suite_license_code: 'ARPA-TEST-2026', arpa_ultimo_cot: '3', arpa_cc_num: '7' };
  cloud = { cot: 3, cc: 7, formato: 0 };
  cloudCalls = 0;
});

describe('nextNumberAsync — sin saltos de numeración', () => {
  it('dos pedidos simultáneos de cotización dan el MISMO número (no salta)', async () => {
    const [a, b] = await Promise.all([
      N.nextNumberAsync('cot', ''),
      N.nextNumberAsync('cot', '')
    ]);
    assert.equal(a.value, 'COT-004');
    assert.equal(b.value, 'COT-004');
    assert.equal(cloudCalls, 1);
    assert.equal(cloud.cot, 4);
  });

  it('un pedido después de terminado el anterior sí avanza al siguiente', async () => {
    const a = await N.nextNumberAsync('cot', '');
    const b = await N.nextNumberAsync('cot', a.value);
    assert.equal(a.value, 'COT-004');
    assert.equal(b.value, 'COT-005');
  });

  it('cotización y cuenta de cobro no se bloquean entre sí', async () => {
    const [cot, cc] = await Promise.all([
      N.nextNumberAsync('cot', ''),
      N.nextNumberAsync('cc', '')
    ]);
    assert.equal(cot.value, 'COT-004');
    assert.equal(cc.value, 'CC-008');
  });

  it('con prefijo de técnico (AP) tampoco salta', async () => {
    store.arpa_suite_user_settings = JSON.stringify({ technicianCode: 'AP' });
    store.arpa_ultimo_cot = '158';
    cloud.cot = 158;
    const [a, b] = await Promise.all([
      N.nextNumberAsync('cot', ''),
      N.nextNumberAsync('cot', '')
    ]);
    assert.equal(a.value, 'AP-COT-159');
    assert.equal(b.value, 'AP-COT-159');
  });

  it('con prefijo de técnico cada documento se distingue: AP-180, AP-COT-180, AP-CC-012', () => {
    store.arpa_suite_user_settings = JSON.stringify({ technicianCode: 'AP' });
    assert.equal(N.formatFormNumber(180), 'AP-180');
    assert.equal(N.formatCotNumber(180), 'AP-COT-180');
    assert.equal(N.formatCcNumber(12), 'AP-CC-012');
  });

  it('la secuencia sigue igual al pasar de AP-180 a AP-COT-181', async () => {
    store.arpa_suite_user_settings = JSON.stringify({ technicianCode: 'AP' });
    store.arpa_ultimo_cot = '180';
    cloud.cot = 180;
    assert.equal(N.parseSequenceNumber('AP-COT-180'), 180);
    const r = await N.nextNumberAsync('cot', 'AP-180');
    assert.equal(r.value, 'AP-COT-181');
  });

  it('sin nube (offline) sigue dando número local sin saltar', async () => {
    const original = global.ArpaCloudSync.obtenerSiguienteNumeroCloud;
    global.ArpaCloudSync.obtenerSiguienteNumeroCloud = () => Promise.reject(new Error('offline'));
    try {
      const [a, b] = await Promise.all([
        N.nextNumberAsync('cot', ''),
        N.nextNumberAsync('cot', '')
      ]);
      assert.equal(a.value, 'COT-004');
      assert.equal(b.value, 'COT-004');
      assert.equal(a.sincronizado, false);
    } finally {
      global.ArpaCloudSync.obtenerSiguienteNumeroCloud = original;
    }
  });

  it('sin licencia sigue bloqueado', async () => {
    delete store.arpa_suite_license_code;
    const r = await N.nextNumberAsync('cot', '');
    assert.equal(r.blocked, true);
  });
});

describe('número reservado sin usar', () => {
  it('se guarda, se lee y se libera', () => {
    N.setReserved('cot', 'AP-171');
    assert.equal(N.getReserved('cot'), 'AP-171');
    N.clearReserved('cot', 'AP-171');
    assert.equal(N.getReserved('cot'), '');
  });

  it('no se libera si se guardó un documento viejo con otro número', () => {
    N.setReserved('cot', 'AP-172');
    N.clearReserved('cot', 'AP-170');
    assert.equal(N.getReserved('cot'), 'AP-172');
  });

  it('cotización y cuenta de cobro tienen reservas separadas', () => {
    N.setReserved('cot', 'COT-005');
    N.setReserved('cc', 'CC-009');
    N.clearReserved('cot', 'COT-005');
    assert.equal(N.getReserved('cot'), '');
    assert.equal(N.getReserved('cc'), 'CC-009');
  });
});

describe('service worker', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.join(__dirname, '..');
  it('precachea todos los scripts que carga index.html y los baja frescos', () => {
    const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const scripts = [...new Set([...html.matchAll(/src="(\.\/js\/[^"]+)"/g)].map((m) => m[1]))];
    assert.ok(scripts.length > 10);
    scripts.forEach((s) => assert.ok(sw.includes(`'${s}'`), 'falta en LOCAL_ASSETS: ' + s));
    assert.match(sw, /cache: 'reload'/);
  });
});
