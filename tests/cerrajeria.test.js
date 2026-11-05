/**
 * Cerrajería y Metalmecánica: nombre por país, opciones nuevas del formato y catálogo ampliado.
 * node --test tests/cerrajeria.test.js
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

function loadOficios(local, catalog) {
  const sb = { console, localStorage: local || memStorage(), navigator: { language: 'es-CO' } };
  sb.window = sb;
  sb.globalThis = sb;
  const store = catalog || { products: [], categories: [] };
  sb.ArpaMiCatalogo = {
    getProducts: () => store.products,
    getCategories: () => store.categories,
    saveProducts: (list) => { store.products = list; },
    saveCategories: (list) => { store.categories = list; },
  };
  vm.createContext(sb);
  vm.runInContext(read('js/arpa-oficios.js'), sb, { filename: 'arpa-oficios.js' });
  return { api: sb.ArpaOficios, store };
}

function loadI18n(country) {
  const sb = {
    console, setTimeout: () => 0, clearTimeout() {},
    localStorage: memStorage(), navigator: { language: 'es-CO' },
    ArpaPricing: { getCountryCode: () => country },
    document: { querySelectorAll: () => [], getElementById: () => null, documentElement: { lang: 'es' }, addEventListener() {}, readyState: 'loading', body: null },
  };
  sb.window = sb;
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(read('js/arpa-i18n.js'), sb, { filename: 'arpa-i18n.js' });
  return sb.ArpaI18n;
}

test('en Colombia se llama Cerrajería y Metalmecánica; en otros países, Herrería', () => {
  assert.strictEqual(loadI18n('CO').t('oficio.metalmecanica'), 'Cerrajería y Metalmecánica');
  assert.strictEqual(loadI18n('MX').t('oficio.metalmecanica'), 'Herrería y Metalmecánica');
  assert.strictEqual(loadI18n('CL').t('formato.titulo.metalmecanica'), 'Tipo de Trabajo de Herrería');
  assert.strictEqual(loadI18n('CO').t('formato.titulo.metalmecanica'), 'Tipo de Trabajo de Cerrajería');
});

test('el formato trae cortina, reja ballesta y chapas, y "Otra" conserva su número', () => {
  const { api } = loadOficios();
  const ops = api.getOficioById('metalmecanica').formatoOpciones;
  const byId = Object.fromEntries(ops.map((o) => [o.id, o]));
  assert.strictEqual(byId.fmet1.label, 'Puerta/portón metálico');
  assert.strictEqual(byId.fmet5.label, 'Soldadura/reparación');
  assert.ok(byId.fmet6.otra, 'fmet6 sigue siendo "Otra" (formatos guardados no cambian)');
  assert.deepStrictEqual([byId.fmet7.label, byId.fmet8.label, byId.fmet9.label], ['Cortina enrollable', 'Reja ballesta', 'Chapas y cerraduras']);
  assert.strictEqual(ops.at(-1).id, 'fmet6', '"Otra" se muestra al final');
  assert.strictEqual(new Set(ops.map((o) => o.id)).size, ops.length, 'sin números repetidos');
});

test('catálogo base: 30 productos con cortinas, rejas ballesta y chapas', () => {
  const { api } = loadOficios();
  const list = api.seedCatalog_metalmecanica();
  assert.strictEqual(list.length, 30);
  const cats = new Set(list.map((p) => p.categoria));
  ['Cortinas', 'Rejas', 'Chapas y cerraduras'].forEach((c) => assert.ok(cats.has(c), c));
  assert.strictEqual(new Set(list.map((p) => p.cod)).size, 30, 'códigos únicos');
  list.filter((p) => /\(m²\)/.test(p.nom)).forEach((p) => assert.strictEqual(p.unidad, 'm2', p.nom));
});

test('quien ya tenía el oficio recibe solo los productos nuevos, una vez y sin duplicar', () => {
  const local = memStorage({ arpa_oficios_seeded: JSON.stringify(['metalmecanica']) });
  const viejos = loadOficios().api.seedCatalog_metalmecanica().slice(0, 20).map((p, i) => ({ ...p, id: 'p' + i, pvp: p.pvp + 1 }));
  const { api, store } = loadOficios(local, { products: viejos, categories: [] });
  const SEEDED_KEY = Object.keys(local.data).find((k) => /seeded/.test(k));
  assert.ok(SEEDED_KEY, 'usa la marca de oficios sembrados');
  const r = api.seedOficioIfNeeded('metalmecanica');
  assert.strictEqual(r.added, 10, 'agrega los 10 nuevos');
  assert.strictEqual(store.products.length, 30);
  assert.strictEqual(store.products.find((p) => p.cod === 'MET-001').pvp, viejos[0].pvp, 'no toca precios que el usuario cambió');
  const r2 = api.seedOficioIfNeeded('metalmecanica');
  assert.ok(!r2.added, 'la segunda vez no agrega nada');
  assert.strictEqual(store.products.length, 30);
});
