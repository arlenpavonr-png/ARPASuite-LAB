/**
 * Registro de prueba: el WhatsApp usa el prefijo del país configurado y la app envía el país.
 * Corre js/arpa-trial-capture.js con navegador simulado (fetch falso, sin red).
 * node --test tests/trial-pais.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'js/arpa-trial-capture.js'), 'utf8');

const PREFIX = { CO: '57', MX: '52', US: '1', CL: '56', PE: '51' };

function loadCapture(country, stored) {
  const store = Object.assign({}, stored || {});
  const sent = [];
  const win = {
    console,
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    },
    document: { readyState: 'complete', getElementById: () => null, addEventListener() {} },
    addEventListener() {},
    fetch: (url, opts) => {
      sent.push(JSON.parse(opts.body));
      return Promise.resolve({ json: () => ({ ok: true }) });
    },
    ArpaPricing: country === null ? undefined : {
      getCountryProfile: () => ({ code: country, phonePrefix: PREFIX[country] })
    }
  };
  win.window = win;
  vm.createContext(win);
  vm.runInContext(code, win);
  return { api: win.ArpaTrialCapture, sent, store };
}

test('número de 10 dígitos usa el prefijo del país configurado', () => {
  assert.strictEqual(loadCapture('CO').api.normalizePhone('300 123 4567'), '573001234567');
  assert.strictEqual(loadCapture('MX').api.normalizePhone('55 1234 5678'), '525512345678');
  assert.strictEqual(loadCapture('US').api.normalizePhone('(305) 555-1234'), '13055551234');
  assert.strictEqual(loadCapture(null).api.normalizePhone('3001234567'), '573001234567', 'sin perfil de país: Colombia como antes');
});

test('número con código de país se respeta', () => {
  const { api } = loadCapture('CO');
  assert.strictEqual(api.normalizePhone('+52 55 1234 5678'), '525512345678');
  assert.strictEqual(api.normalizePhone('+1 305 555 1234'), '13055551234');
  assert.strictEqual(api.normalizePhone('+57 300 123 4567'), '573001234567');
});

test('el registro envía el país guardado', async () => {
  const { api, sent } = loadCapture('MX', {
    arpa_trial_fecha_inicio: '2026-10-11',
    arpa_trial_id: 't-1',
    arpa_trial_whatsapp: '525512345678',
    arpa_trial_nombre: 'Ana',
    arpa_trial_oficio: 'gas',
    arpa_trial_pais: 'MX'
  });
  await api.registerTrialUserSilent();
  const body = sent[sent.length - 1];
  assert.strictEqual(body.accion, 'registerTrialUser');
  assert.strictEqual(body.pais, 'MX');
  assert.strictEqual(body.telefono, '525512345678');
  assert.strictEqual(api.TRIAL_PAIS_KEY, 'arpa_trial_pais');
});

test('registro guardado antes del cambio (sin país) sigue funcionando', async () => {
  const { api, sent } = loadCapture('CO', {
    arpa_trial_fecha_inicio: '2026-10-11',
    arpa_trial_id: 't-2',
    arpa_trial_whatsapp: '573001234567',
    arpa_trial_nombre: 'Juan',
    arpa_trial_oficio: 'gas'
  });
  await api.registerTrialUserSilent();
  const body = sent[sent.length - 1];
  assert.strictEqual(body.pais, '');
  assert.strictEqual(body.telefono, '573001234567');
});
