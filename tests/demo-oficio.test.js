/**
 * Modo demo: usa solo el oficio del cliente y al salir devuelve los oficios de la empresa.
 * node --test tests/demo-oficio.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function memStorage(init) {
  const data = { ...(init || {}) };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
    data,
  };
}

function loadSuite({ founder, local }) {
  const catalogs = {};
  const sb = {
    console,
    localStorage: local,
    navigator: { language: 'es-CO' },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    dispatchEvent: () => true,
  };
  sb.window = sb;
  sb.globalThis = sb;
  sb.ArpaLicense = { isFounderLicense: () => founder };
  sb.ArpaMiCatalogo = {
    getProducts: (id) => catalogs[id] || [],
    getCategories: () => [],
    saveProducts: (list, id) => { catalogs[id] = list; },
    saveCategories: () => {},
  };
  vm.createContext(sb);
  vm.runInContext(read('js/arpa-oficios.js'), sb, { filename: 'arpa-oficios.js' });
  vm.runInContext(read('js/arpa-brand.js'), sb, { filename: 'arpa-brand.js' });
  return { sb, catalogs };
}

const empresa = JSON.stringify({ companyName: 'Automatismos ARPA', activeOficios: ['automatismos', 'cctv'] });

test('Founder en demo: un solo oficio (el del cliente), sin mezclar con Automatismos', () => {
  const local = memStorage({
    arpa_suite_user_settings: empresa,
    arpa_suite_settings_configured: 'true',
    arpa_active_oficios: JSON.stringify(['automatismos', 'cctv']),
  });
  const { sb } = loadSuite({ founder: true, local });
  assert.deepStrictEqual([...sb.ArpaOficios.getActiveOficiosFromSettings()], ['automatismos', 'cctv']);

  sb.ArpaBrand.enterDemoMode();
  assert.ok(sb.ArpaBrand.isDemoMode());
  sb.ArpaOficios.saveActiveOficios(['metalmecanica', 'automatismos']);
  assert.deepStrictEqual([...sb.ArpaOficios.getActiveOficiosFromSettings()], ['metalmecanica']);
  assert.strictEqual(sb.ArpaOficios.getActiveFormatoOficioId(), 'metalmecanica');

  sb.ArpaBrand.exitDemoMode();
  assert.ok(!sb.ArpaBrand.isDemoMode());
  assert.deepStrictEqual([...sb.ArpaOficios.getActiveOficiosFromSettings()], ['automatismos', 'cctv']);
  assert.strictEqual(local.getItem('arpa_suite_demo_backup_oficios'), null);
});

test('sin Founder: cambiar de oficio en demo no borra el catálogo de la empresa', () => {
  const local = memStorage({
    arpa_suite_user_settings: JSON.stringify({ companyName: 'Automatismos ARPA', activeOficios: ['automatismos'] }),
    arpa_suite_settings_configured: 'true',
    arpa_active_oficios: JSON.stringify(['automatismos']),
  });
  const { sb, catalogs } = loadSuite({ founder: false, local });
  catalogs.automatismos = [{ cod: 'MOT-1', nom: 'Motor', pvp: 1 }];

  sb.ArpaBrand.enterDemoMode();
  const radio = { value: 'metalmecanica', checked: true, dataset: {}, addEventListener(type, fn) { this.fire = fn; } };
  const grid = { querySelectorAll: () => [radio], innerHTML: '' };
  sb.confirm = () => { throw new Error('en demo no debe pedir confirmación'); };
  sb.ArpaOficios.renderSettingsCheckboxes(grid);
  radio.fire({ target: radio });

  assert.deepStrictEqual([...sb.ArpaOficios.getActiveOficiosFromSettings()], ['metalmecanica']);
  assert.strictEqual(catalogs.automatismos.length, 1, 'el catálogo de Automatismos sigue intacto');

  sb.ArpaBrand.exitDemoMode();
  assert.deepStrictEqual([...sb.ArpaOficios.getActiveOficiosFromSettings()], ['automatismos']);
});
