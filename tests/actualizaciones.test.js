/**
 * Actualizaciones anuales: quién tiene ARPA NEXT según la fecha "actualizaciones hasta" (PMA).
 * node --test tests/actualizaciones.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const upd = require(path.join(root, 'js/arpa-actualizaciones.js'));

function mem(data) {
  const store = { ...(data || {}) };
  return { getItem: (k) => (k in store ? store[k] : null) };
}

const DESDE = upd.RELEASES.next.disponibleDesde;
const HOY = new Date(2027, 1, 15);
const ANTES = new Date(2026, 9, 8);

function chk(local, extra) {
  return upd.check('next', { storage: mem(local), session: mem(), hostname: 'example.org', today: HOY, ...(extra || {}) });
}

test('sin licencia no abre', () => {
  const r = chk({});
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'sin_licencia');
});

test('fundador siempre abre, aunque no tenga fecha', () => {
  const r = chk({ arpa_suite_license_code: 'ARPA-XYZ', arpa_suite_license_founder: '1' });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.reason, 'founder');
});

test('plan pago con actualizaciones vigentes al salir NEXT abre', () => {
  const r = chk({ arpa_suite_license_code: 'ARPA-PRO-AAA111', arpa_suite_license_vencimiento: '2027-10-08' });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.reason, 'pma');
});

test('la fecha exacta de salida cuenta como vigente', () => {
  const r = chk({ arpa_suite_license_code: 'ARPA-PYME-BBB222', arpa_suite_license_vencimiento: DESDE });
  assert.strictEqual(r.ok, true);
});

test('quien no renovó antes de salir NEXT no la tiene, y se le dice por qué', () => {
  const r = chk({ arpa_suite_license_code: 'ARPA-PRO-CCC333', arpa_suite_license_vencimiento: '2026-12-31' });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'no_renovo');
  assert.strictEqual(r.hasta, '2026-12-31');
});

test('lo ya obtenido se conserva: PMA vencido hoy pero vigente al salir NEXT', () => {
  const r = upd.check('next', {
    storage: mem({ arpa_suite_license_code: 'ARPA-PRO-DDD444', arpa_suite_license_vencimiento: '2027-03-01' }),
    session: mem(), hostname: 'example.org', today: new Date(2029, 0, 1)
  });
  assert.strictEqual(r.ok, true);
});

test('plan pago sin fecha registrada no abre (hay que revisar la hoja)', () => {
  const r = chk({ arpa_suite_license_code: 'ARPA-WL-EEE555' });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'sin_fecha');
});

test('prueba gratis vigente ve NEXT; vencida no', () => {
  const vigente = chk({ arpa_suite_license_code: 'ARPA-FREE-F1', arpa_suite_license_vencimiento: '2027-02-20' });
  assert.strictEqual(vigente.ok, upd.TRIAL_INCLUYE_ACTUALIZACIONES);
  const vencida = chk({ arpa_suite_license_code: 'ARPA-FREE-F2', arpa_suite_license_vencimiento: '2027-02-01' });
  assert.strictEqual(vencida.ok, false);
  assert.strictEqual(vencida.reason, 'trial_vencido');
});

test('demo del LAB abre solo en localhost o red local', () => {
  const session = mem({ arpa_lab_demo: '1' });
  assert.strictEqual(chk({}, { session, hostname: 'localhost' }).reason, 'lab_demo');
  assert.strictEqual(chk({}, { session, hostname: '192.168.1.20' }).ok, true);
  assert.strictEqual(chk({}, { session, hostname: 'example.org' }).ok, false);
});

test('función desconocida no abre', () => {
  const r = upd.check('nada', { storage: mem({ arpa_suite_license_founder: '1', arpa_suite_license_code: 'X' }), session: mem(), today: HOY });
  assert.strictEqual(r.ok, false);
});

test('enlace de renovación va al WhatsApp de ventas con los últimos 6 del código', () => {
  const url = upd.renewUrl('next', { storage: mem({ arpa_suite_license_code: 'ARPA-PRO-123456' }), session: mem(), today: HOY });
  assert.match(url, /^https:\/\/wa\.me\/573016092542\?text=/);
  assert.match(decodeURIComponent(url), /ARPA NEXT.*123456/);
});

test('NEXT carga el módulo antes de arrancar y bloquea sin licencia', () => {
  const html = fs.readFileSync(path.join(root, 'next/index.html'), 'utf8');
  const iUpd = html.indexOf('../js/arpa-actualizaciones.js');
  const iApp = html.indexOf('./js/app.js');
  assert.ok(iUpd > 0 && iUpd < iApp, 'arpa-actualizaciones.js antes de app.js');
  const app = fs.readFileSync(path.join(root, 'next/js/app.js'), 'utf8');
  assert.match(app, /if \(!hasNextUpdate\(\)\) return;\s*\n\s*store = await openStore\(\);/);
});

test('antes de la fecha de salida solo el fundador la usa', () => {
  const opts = { session: mem(), hostname: 'example.org', today: ANTES };
  const founder = upd.check('next', { ...opts, storage: mem({ arpa_suite_license_code: 'ARPA-X', arpa_suite_license_founder: '1' }) });
  assert.strictEqual(founder.ok, true);
  const pro = upd.check('next', { ...opts, storage: mem({ arpa_suite_license_code: 'ARPA-PRO-AAA111', arpa_suite_license_vencimiento: '2027-10-08' }) });
  assert.strictEqual(pro.ok, false);
  assert.strictEqual(pro.reason, 'pronto');
  const trial = upd.check('next', { ...opts, storage: mem({ arpa_suite_license_code: 'ARPA-FREE-F3', arpa_suite_license_vencimiento: '2026-10-12' }) });
  assert.strictEqual(trial.reason, 'pronto');
});
