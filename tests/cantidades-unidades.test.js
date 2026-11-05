/**
 * Cantidades con decimales (7,5 m²), formato en PDF y unidades del catálogo.
 * node --test tests/cantidades-unidades.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function loadPricing() {
  const store = {};
  const sb = {
    console,
    Intl,
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    },
    navigator: { language: 'es-CO', languages: ['es-CO'] }
  };
  sb.window = sb;
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(read('js/arpa-pricing.js'), sb, { filename: 'arpa-pricing.js' });
  return sb.ArpaPricing;
}

function loadOficios() {
  const sb = { console, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, navigator: { language: 'es-CO' } };
  sb.window = sb;
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(read('js/arpa-oficios.js'), sb, { filename: 'arpa-oficios.js' });
  return sb.ArpaOficios;
}

test('parseCantidad acepta decimales con coma o punto', () => {
  const P = loadPricing();
  assert.strictEqual(P.parseCantidad('7,5'), 7.5);
  assert.strictEqual(P.parseCantidad('7.5'), 7.5);
  assert.strictEqual(P.parseCantidad(8), 8);
  assert.strictEqual(P.parseCantidad('2.345'), 2.35);
  assert.strictEqual(P.parseCantidad(''), 1);
  assert.strictEqual(P.parseCantidad('0'), 1);
  assert.strictEqual(P.parseCantidad('-3'), 1);
  assert.strictEqual(P.parseCantidad('abc'), 1);
  assert.strictEqual(P.parseCantidad('7,5') * 320000, 2400000);
});

test('formatoCantidad usa el separador del país', () => {
  const P = loadPricing();
  assert.strictEqual(P.formatoCantidad('7.5', 'COP'), '7,5');
  assert.strictEqual(P.formatoCantidad(8, 'COP'), '8');
  assert.strictEqual(P.formatoCantidad(1000, 'COP'), '1.000');
  assert.strictEqual(P.formatoCantidad('7.5', 'MXN'), '7.5');
});

test('cotización y cuenta de cobro ya no truncan cantidades', () => {
  for (const f of ['js/arpa-cotizacion.js', 'js/arpa-cuenta-cobro.js']) {
    assert.ok(!/parseInt\([^)]*cant/.test(read(f)), f + ' todavía usa parseInt en cantidades');
  }
  assert.match(read('js/arpa-cotizacion.js'), /formatoCantidad\(input\.value\)/);
  assert.match(read('js/arpa-cuenta-cobro.js'), /formatoCantidad\(row\.cant\)/);
});

test('catálogos base: unidades válidas y trabajos por m²', () => {
  const O = loadOficios();
  const cat = read('js/arpa-mi-catalogo.js');
  const UNIDADES = JSON.parse(cat.match(/const UNIDADES = (\[[^\]]*\]);/)[1].replace(/'/g, '"'));
  const norm = (u) => ({ un: 'unidad', und: 'unidad' }[String(u || '').toLowerCase()] || String(u || '').toLowerCase());
  for (const of of O.getOficiosList()) {
    if (of.id === 'automatismos') continue;
    // Array.from: los arreglos del vm tienen otro prototipo y deepStrictEqual los vería distintos.
    const items = Array.from(O.getSeedProductsForOficio(of.id) || []);
    const malas = items.filter((p) => !UNIDADES.includes(norm(p.unidad))).map((p) => p.cod + ':' + p.unidad);
    assert.deepStrictEqual(malas, [], of.id + ': unidades que la app no tiene');
    const m2 = items.filter((p) => /\(m²\)/.test(p.nom) && norm(p.unidad) !== 'm2').map((p) => p.cod);
    assert.deepStrictEqual(m2, [], of.id + ': dice (m²) pero no se cobra por m²');
  }
});
