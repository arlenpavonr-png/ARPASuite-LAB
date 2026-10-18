/**
 * Oficio Construcción y acabados (drywall / tablaroca) y aviso flotante fuera del PDF.
 * node --test tests/construccion.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function loadOficios() {
  const sb = { console, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, navigator: { language: 'es-MX' } };
  sb.window = sb;
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(read('js/arpa-oficios.js'), sb);
  return sb.ArpaOficios;
}

test('el oficio existe con sus tipos de trabajo y "Otra" al final', () => {
  const api = loadOficios();
  assert.strictEqual(api.normalizeOficioId('construccion'), 'construccion');
  assert.strictEqual(api.getOficioLabel('construccion'), 'Construcción y Acabados');
  const cfg = api.getFormatoConfig('construccion');
  assert.strictEqual(cfg.titulo, 'Tipo de Trabajo de Construcción');
  const labels = cfg.opciones.map((o) => o.label);
  ['Muros en drywall / tablaroca', 'Cielo raso / plafón', 'Fibrocemento / Durock'].forEach((l) => assert.ok(labels.includes(l), l));
  assert.ok(cfg.opciones.at(-1).otra, '"Otra" al final');
  assert.strictEqual(new Set(cfg.opciones.map((o) => o.id)).size, cfg.opciones.length, 'sin ids repetidos');
  assert.strictEqual(cfg.showMedidas, false, 'no muestra medidas de puerta');
});

test('catálogo base: 20 productos, códigos únicos y los de m² con unidad m2', () => {
  const list = loadOficios().seedCatalog_construccion();
  assert.strictEqual(list.length, 20);
  assert.strictEqual(new Set(list.map((p) => p.cod)).size, 20);
  list.filter((p) => /\(m²\)/.test(p.nom)).forEach((p) => assert.strictEqual(p.unidad, 'm2', p.nom));
});

test('se puede elegir en el registro de prueba', () => {
  assert.ok(/id: 'construccion', label: 'Construcción y Acabados'/.test(read('js/arpa-trial-capture.js')));
});

test('los avisos flotantes marcados no-print no salen en el PDF', () => {
  assert.ok(/@media print\s*\{\s*\.no-print\s*\{\s*display:\s*none\s*!important;/.test(read('index.html')));
});
