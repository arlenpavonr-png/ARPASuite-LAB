/**
 * Cabezales (puertas automáticas de vidrio): opción del formato y referencias por marca.
 * node --test tests/cabezal.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

function load() {
  const sb = { console, navigator: { language: 'es-CO' } };
  sb.window = sb;
  sb.globalThis = sb;
  vm.createContext(sb);
  for (const f of ['js/arpa-oficios.js', 'js/arpa-catalogo.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sb);
  }
  return sb;
}

test('el formato de automatismos ofrece "Puerta automática de vidrio (cabezal)" antes de "Otra"', () => {
  const sb = load();
  const ids = sb.ArpaOficios.getFormatoConfig('automatismos').opciones.map((o) => o.id);
  assert.ok(ids.includes('c10'));
  assert.strictEqual(ids[ids.length - 1], 'c8');
  assert.strictEqual(sb.ArpaOficios.getFormatoMapaTipos('automatismos').c10, 'Cabezal');
});

test('cada marca principal trae referencias de cabezal con precio', () => {
  const marcas = load().ArpaCatalogo.getCatalogoMarcas();
  for (const m of ['Accessmatic', 'BFT', 'NAS', 'Elite']) {
    assert.ok(marcas[m].Cabezal.length > 0, m);
    assert.ok(marcas[m].Cabezal.every((p) => p.cod && p.pvp > 0), m);
  }
});

test('las traducciones tienen la etiqueta del cabezal', () => {
  const i18n = fs.readFileSync(path.join(root, 'js/arpa-i18n.js'), 'utf8');
  assert.ok((i18n.match(/'formato\.puerta\.cabezal'/g) || []).length >= 2);
});
