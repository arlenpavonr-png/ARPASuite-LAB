/**
 * Garantía por oficio: cada oficio (menos Automatismos, que usa el texto de siempre) tiene sus textos en ES y EN.
 * node --test tests/garantia-oficio.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function oficioIds() {
  const sb = { console, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, navigator: { language: 'es-CO' } };
  sb.window = sb;
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(read('js/arpa-oficios.js'), sb);
  return sb.ArpaOficios.OFICIOS.map((o) => o.id);
}

function warrantyTable() {
  const src = read('js/arpa-i18n.js');
  const start = src.indexOf('var WARRANTY_BY_OFICIO = ');
  const end = src.indexOf('\n  };', start);
  assert.ok(start > 0 && end > start, 'existe WARRANTY_BY_OFICIO');
  return vm.runInNewContext('(' + src.slice(start + 'var WARRANTY_BY_OFICIO = '.length, end + 4) + ')');
}

test('todos los oficios menos Automatismos tienen garantía propia en español e inglés', () => {
  const table = warrantyTable();
  const ids = oficioIds();
  ids.filter((id) => id !== 'automatismos').forEach((id) => {
    assert.ok(table[id], 'falta garantía de ' + id);
    ['es', 'en'].forEach((lang) => {
      assert.strictEqual(table[id][lang].length, 3, id + ' ' + lang + ': tiempo, mantenimiento y exclusiones');
      table[id][lang].forEach((txt) => assert.ok(String(txt).trim().length > 10, id + ' ' + lang + ' texto vacío'));
    });
  });
  assert.ok(!table.automatismos, 'Automatismos conserva el texto de siempre');
  Object.keys(table).forEach((id) => assert.ok(ids.includes(id), 'oficio desconocido: ' + id));
});

test('los textos de garantía de Cotización y Formato están marcados para cambiar con el oficio', () => {
  const html = read('index.html');
  ['formato.garantia.tiempo.body', 'formato.garantia.mantenimiento.body', 'formato.garantia.exclusiones.body_static'].forEach((k) => {
    const n = html.split(`data-arpa-warranty-part="${k}"`).length - 1;
    assert.strictEqual(n, 2, k);
  });
});
