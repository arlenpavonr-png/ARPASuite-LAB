/**
 * WhatsApp al cliente: prefijo según el país configurado (antes siempre +57).
 * node --test tests/whatsapp-prefijo.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function loadWhatsApp(country) {
  const sb = { console, encodeURIComponent };
  sb.window = sb;
  sb.globalThis = sb;
  sb.ArpaPricing = country === undefined ? undefined : {
    getCountryProfile: () => ({ code: country, phonePrefix: { CO: '57', MX: '52', CL: '56', PE: '51', US: '1' }[country] })
  };
  vm.createContext(sb);
  vm.runInContext(read('js/arpa-whatsapp.js'), sb, { filename: 'arpa-whatsapp.js' });
  return sb.ArpaWhatsApp;
}

const numero = (url) => (url.match(/wa\.me\/(\d*)\?/) || [])[1];

test('Colombia: igual que antes', () => {
  const wa = loadWhatsApp('CO');
  assert.strictEqual(numero(wa.buildWaMeUrl('300 123 4567', 'hola')), '573001234567');
  assert.strictEqual(numero(wa.buildWaMeUrl('+57 300 123 4567', 'hola')), '573001234567');
});

test('Estados Unidos: 10 dígitos llevan +1, no +57', () => {
  const wa = loadWhatsApp('US');
  assert.strictEqual(numero(wa.buildWaMeUrl('(713) 555-0142', 'hi')), '17135550142');
  assert.strictEqual(numero(wa.buildWaMeUrl('+1 713 555 0142', 'hi')), '17135550142');
});

test('México, Chile y Perú usan su propio prefijo (Chile y Perú con 9 dígitos)', () => {
  assert.strictEqual(numero(loadWhatsApp('MX').buildWaMeUrl('55 1234 5678', 'hola')), '525512345678');
  assert.strictEqual(numero(loadWhatsApp('CL').buildWaMeUrl('9 1234 5678', 'hola')), '56912345678');
  assert.strictEqual(numero(loadWhatsApp('PE').buildWaMeUrl('987 654 321', 'hola')), '51987654321');
});

test('sin datos de país se usa +57; número incompleto abre WhatsApp sin destinatario', () => {
  const wa = loadWhatsApp(undefined);
  assert.strictEqual(numero(wa.buildWaMeUrl('3001234567', 'hola')), '573001234567');
  assert.strictEqual(numero(wa.buildWaMeUrl('12345', 'hola')), '');
});
