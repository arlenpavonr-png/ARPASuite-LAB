/**
 * "Calcular peso y motor": peso por material y motores con el margen de cada marca.
 * node --test tests/calculadora-peso.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'js/arpa-calculadora-peso.js'), 'utf8');

function load() {
  const win = {};
  const ctx = { window: win, globalThis: win, Number, String, Math, Array, Object };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return win.ArpaCalculadoraPeso;
}

test('corredizo 4 x 2 m en lámina pesa 160 kg', () => {
  const api = load();
  const c = api.calcularPeso('corredizo', 'lamina', 4, 2);
  assert.strictEqual(c.peso, 160);
  assert.strictEqual(c.porHoja, null);
});

test('margen: 160 kg → Accessmatic necesita 208 kg y BFT 192 kg', () => {
  const api = load();
  const cods = api.motoresRecomendados('corredizo', api.calcularPeso('corredizo', 'lamina', 4, 2)).map((m) => m.cod);
  assert.ok(cods.includes('KDEIMOSBTA400-1'));
  assert.ok(cods.includes('AUACKBD850'));
});

test('BFT A400 queda por fuera cuando el peso con 20 % pasa de 400 kg', () => {
  const api = load();
  const c = api.calcularPeso('corredizo', 'madera', 6, 2.5); // 375 kg → BFT necesita 450
  assert.strictEqual(c.peso, 380);
  const cods = api.motoresRecomendados('corredizo', c).map((m) => m.cod);
  assert.ok(!cods.includes('KDEIMOSBTA400-1'));
  assert.ok(cods.includes('KDEIMOSBTA600-1'));
  assert.ok(cods.includes('AUACKBD850'));
});

test('batiente de 2 hojas: peso y largo por hoja, y respeta el largo máximo del brazo', () => {
  const api = load();
  const c = api.calcularPeso('batiente', 'lamina', 6, 2, 2); // 240 kg, 120 por hoja, 3 m por hoja
  assert.strictEqual(c.porHoja, 120);
  assert.strictEqual(c.largoHoja, 3);
  const cods = api.motoresRecomendados('batiente', c).map((m) => m.cod);
  assert.ok(cods.includes('AUACEG250'));        // hasta 3 m
  assert.ok(cods.includes('K2PHOBOSBT-A40'));   // hasta 4 m
  assert.ok(!cods.includes('K2PHOBOSBT-A25'));  // solo 2,5 m
  assert.ok(!cods.includes('K1PHOBOSBT-A40'));  // kit de 1 brazo
});

test('cortina y garaje dan el peso pero no inventan motor', () => {
  const api = load();
  const c = api.calcularPeso('enrollable', 'gruesa', 3, 3);
  assert.strictEqual(c.peso, 100);
  assert.strictEqual(api.motoresRecomendados('enrollable', c).length, 0);
});

test('sin medidas no calcula', () => {
  const api = load();
  assert.strictEqual(api.calcularPeso('corredizo', 'lamina', '', 2), null);
});
