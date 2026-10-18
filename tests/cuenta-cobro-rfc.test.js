/**
 * Cuenta de cobro en México: el PDF dice RFC, no NIT / C.C.
 * node --test tests/cuenta-cobro-rfc.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'arpa-cuenta-cobro.js'), 'utf8');

test('el PDF toma la etiqueta fiscal del país (RFC en México)', () => {
  assert.ok(/const taxLabel = global\.ArpaPricing\?\.getTaxIdLabel\?\.\(\) \|\| 'NIT';/.test(src));
  assert.ok(!/\['(NIT|C\.C\. \/ NIT|NIT \/ C\.C\.)', d\./.test(src), 'sin NIT fijo en las filas del PDF');
  assert.ok(!src.includes('`NIT: ${d.cobrador.nit}`'), 'sin NIT fijo en el encabezado');
});

test('en Colombia los textos quedan como antes', () => {
  assert.ok(src.includes("taxLabel === 'NIT' ? 'C.C. / NIT' : taxLabel"));
  assert.ok(src.includes("taxLabel === 'NIT' ? 'NIT / C.C.' : taxLabel"));
  assert.ok(src.includes("taxLabel === 'NIT' ? 'NIT/C.C.' : taxLabel"));
});
