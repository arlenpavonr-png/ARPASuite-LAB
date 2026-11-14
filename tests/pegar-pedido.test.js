/**
 * "Pegar pedido": lectura del bloque de texto y búsqueda en el catálogo.
 * node --test tests/pegar-pedido.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'js/arpa-pegar-pedido.js'), 'utf8');

function load() {
  const win = {};
  const ctx = { window: win, globalThis: win, Map, Number, String, Math, Array, Object, Date, Promise, setTimeout };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return win.ArpaPegarPedido;
}

const CATALOGO = [
  { cod: 'K1LUXGV2B-1', nom: 'BFT – Kit 1 Brazo Hidraulico BFT Lux GV 2B 110V Rigel 6', pvp: 4923900 },
  { cod: 'K2LUXGV2B-1', nom: 'BFT – Kit 2 Brazos Hidraulicos BFT Lux GV 2B 110V Rigel 6', pvp: 8407900 },
  { cod: 'K1LUX2B-1', nom: 'BFT – Kit 1 Brazo Hidraulico BFT Lux 2B 110V', pvp: 3875900 },
  { cod: 'MITTO-C2', nom: 'BFT Control Mitto Cool C2', pvp: 89000 },
];

test('lee el pedido de Torre Picasso', () => {
  const api = load();
  const p = api.parsePedido([
    '```',
    '#PEDIDO-ARPA',
    'CLIENTE: Edificio Torre Picasso - Atn. Sra. Patricia Serna',
    'Teléfono: ',
    'Ciudad: Medellín',
    'PRODUCTO: K1LUXGV2B-1 | 1',
    'COBRO: Instalación brazo hidráulico | 650.000',
    'OBS: El kit incluye dos controles remotos.',
    'Incluye instalación.',
    '#FIN',
    '```',
  ].join('\n'));
  assert.strictEqual(p.esPedido, true);
  assert.strictEqual(p.datos.cliente, 'Edificio Torre Picasso - Atn. Sra. Patricia Serna');
  assert.strictEqual(p.datos.ciudad, 'Medellín');
  assert.strictEqual(p.datos.tel, '');
  assert.strictEqual(p.productos.length, 1);
  assert.strictEqual(p.productos[0].ref, 'K1LUXGV2B-1');
  assert.strictEqual(p.productos[0].cant, 1);
  assert.strictEqual(p.productos[0].precio, null);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(p.cobros)), [{ desc: 'Instalación brazo hidráulico', cant: 1, valor: 650000 }]);
  assert.strictEqual(p.obs, 'El kit incluye dos controles remotos.\nIncluye instalación.');
  assert.strictEqual(p.avisos.length, 0);
});

test('acepta viñetas, negritas y etiquetas sin tilde o en inglés', () => {
  const api = load();
  const p = api.parsePedido('- **Cliente:** Juan\n* telefono: 300 111 2222\n1. Product: MITTO-C2 | 3 | 80.000\nNotes: ok');
  assert.strictEqual(p.datos.cliente, 'Juan');
  assert.strictEqual(p.datos.tel, '300 111 2222');
  assert.strictEqual(p.productos[0].cant, 3);
  assert.strictEqual(p.productos[0].precio, 80000);
  assert.strictEqual(p.obs, 'ok');
});

test('montos en distintos formatos', () => {
  const api = load();
  assert.strictEqual(api.parseMonto('650.000'), 650000);
  assert.strictEqual(api.parseMonto('$ 650,000'), 650000);
  assert.strictEqual(api.parseMonto('650000'), 650000);
  assert.strictEqual(api.parseMonto('650 mil'), 650000);
  assert.strictEqual(api.parseMonto('1,5 millones'), 1500000);
  assert.strictEqual(api.parseMonto('1.234.567,50'), 1234567.5);
  assert.strictEqual(api.parseMonto('59.99'), 59.99);
  assert.strictEqual(api.parseMonto('$59 USD'), 59);
  assert.strictEqual(api.parseMonto(''), null);
  assert.strictEqual(api.parseMonto('a convenir'), null);
});

test('cobro con cantidad y cobro sin valor', () => {
  const api = load();
  const p = api.parsePedido('#PEDIDO\nCOBRO: Visita técnica | 2 | 85000\nCOBRO: Mano de obra');
  assert.strictEqual(p.cobros[0].cant, 2);
  assert.strictEqual(p.cobros[0].valor, 85000);
  assert.strictEqual(p.cobros[1].valor, 0);
  assert.strictEqual(p.avisos.length, 1);
});

test('texto que no es pedido', () => {
  const api = load();
  const p = api.parsePedido('Hola, ¿cómo vas?');
  assert.strictEqual(p.esPedido, false);
});

test('busca por código (sin importar mayúsculas) y por nombre', () => {
  const api = load();
  const r = api.matchProductos([
    { ref: 'k1luxgv2b-1', cant: 1, precio: null },
    { ref: 'mitto cool', cant: 2, precio: null },
    { ref: 'Lux GV', cant: 1, precio: null },
    { ref: 'Motor inexistente', cant: 1, precio: null },
  ], CATALOGO);
  assert.strictEqual(r.encontrados.length, 2);
  assert.strictEqual(r.encontrados[0].prod.cod, 'K1LUXGV2B-1');
  assert.strictEqual(r.encontrados[1].prod.cod, 'MITTO-C2');
  assert.strictEqual(r.faltantes.length, 2);
  assert.strictEqual(r.faltantes[0].ref, 'Lux GV');
  assert.deepStrictEqual(r.faltantes[0].sugerencias.map((p) => p.cod), ['K1LUXGV2B-1', 'K2LUXGV2B-1']);
  assert.strictEqual(r.faltantes[1].sugerencias.length, 0);
});
