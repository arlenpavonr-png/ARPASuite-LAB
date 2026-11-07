/**
 * Link de pago opcional (Configuración -> Cotización y Cuenta de cobro).
 * node --test tests/link-pago.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'js/arpa-link-pago.js'), 'utf8');

function load(stored) {
  const store = new Map(stored ? [['arpa_suite_payment_link', stored]] : []);
  const win = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    },
    QRCode: { toDataURL: () => Promise.resolve('data:image/png;base64,AAAA') },
    URL
  };
  const ctx = { window: win, globalThis: win, URL, Promise, String, setTimeout };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return { api: win.ArpaLinkPago, store };
}

test('normaliza links válidos y rechaza los inválidos', () => {
  const { api } = load();
  assert.strictEqual(api.normalize('https://checkout.bold.co/abc'), 'https://checkout.bold.co/abc');
  assert.strictEqual(api.normalize('  paypal.me/arlen  '), 'https://paypal.me/arlen');
  assert.strictEqual(api.normalize(''), '');
  assert.strictEqual(api.normalize('javascript:alert(1)'), '');
  assert.strictEqual(api.normalize('ftp://x.com/a'), '');
  assert.strictEqual(api.normalize('hola mundo'), '');
  assert.strictEqual(api.normalize('https://localhost'), '');
});

test('guardar y borrar el link', () => {
  const { api, store } = load();
  assert.strictEqual(api.get(), '');
  assert.strictEqual(api.set('mpago.la/123'), 'https://mpago.la/123');
  assert.strictEqual(store.get('arpa_suite_payment_link'), 'https://mpago.la/123');
  api.set('');
  assert.strictEqual(store.has('arpa_suite_payment_link'), false);
});

function fakeDoc() {
  const calls = [];
  const doc = new Proxy({}, {
    get(_, name) {
      if (name === 'splitTextToSize') return (t) => [t];
      return (...args) => { calls.push([name, ...args]); };
    }
  });
  return { doc, calls };
}

test('sin link, la cuenta de cobro no cambia', async () => {
  const { api } = load();
  const { doc, calls } = fakeDoc();
  const y = await api.addToPdf(doc, { x: 15, y: 100, width: 180, pageHeight: 297, margin: 15 });
  assert.strictEqual(y, 100);
  assert.strictEqual(calls.length, 0);
});

test('con link, dibuja recuadro, QR y link clicable', async () => {
  const { api } = load('https://checkout.bold.co/abc');
  const { doc, calls } = fakeDoc();
  const y = await api.addToPdf(doc, { x: 15, y: 100, width: 180, pageHeight: 297, margin: 15 });
  assert.ok(y > 100);
  assert.ok(calls.some((c) => c[0] === 'addImage'), 'agrega el QR');
  const link = calls.find((c) => c[0] === 'textWithLink');
  assert.ok(link && link[4].url === 'https://checkout.bold.co/abc', 'link clicable');
  assert.ok(calls.some((c) => c[0] === 'text' && /PAGAR EN LÍNEA/.test(c[1])));
});

test('salta de página si no cabe', async () => {
  const { api } = load('https://paypal.me/arlen');
  const { doc, calls } = fakeDoc();
  await api.addToPdf(doc, { x: 15, y: 280, width: 180, pageHeight: 297, margin: 15 });
  assert.ok(calls.some((c) => c[0] === 'addPage'));
});
