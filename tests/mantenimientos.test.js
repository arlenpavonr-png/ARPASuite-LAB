/**
 * Mantenimientos por hacer: 6 meses después de cada instalación o mantenimiento.
 * node --test tests/mantenimientos.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function load() {
  const sb = { console, URLSearchParams };
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js/arpa-mantenimientos.js'), 'utf8'), sb);
  return sb.ArpaMantenimientos;
}

const recs = [
  { modulo: 'formato', subtipo: 'Instalación', cliente: 'Edificio Norte', fecha: '2026-03-01', numero: 'AP-001', ciudad: 'Medellín' },
  { modulo: 'formato', subtipo: 'Reparación', cliente: 'Edificio Norte', fecha: '2026-05-01' },
  { modulo: 'formato', subtipo: 'Instalación', cliente: 'Casa Sur', fecha: '2026-08-15', numero: 'AP-010' },
  { modulo: 'formato', subtipo: 'Mantenimiento', cliente: 'casa sur', fecha: '2026-09-20', numero: 'AP-020' },
  { modulo: 'cotizacion', tipo: 'Cotización', cliente: 'Otro', fecha: '2026-01-01' },
];
const clientes = [{ nombre: 'Edificio Norte', tel: '300 123 4567' }];

test('un recordatorio por cliente a los 180 días de su última instalación o mantenimiento', () => {
  const M = load();
  const l = M.calcular(recs, clientes, {}, '2026-10-09');
  assert.strictEqual(l.length, 2);
  const norte = l.find((i) => i.cliente === 'Edificio Norte');
  assert.strictEqual(norte.vence, '2026-08-28');
  assert.ok(norte.dias < 0, 'vencido');
  assert.strictEqual(norte.tel, '300 123 4567');
  const sur = l.find((i) => i.key === 'casa sur');
  assert.strictEqual(sur.base, '2026-09-20', 'el mantenimiento reinicia el conteo');
  assert.strictEqual(l[0].cliente, 'Edificio Norte', 'ordenado por fecha');
});

test('hecho y descartado lo quitan; un servicio nuevo lo vuelve a crear', () => {
  const M = load();
  const est = { 'edificio norte': { base: '2026-03-01', status: 'hecho' } };
  assert.strictEqual(M.calcular(recs, clientes, est, '2026-10-09').length, 1);
  const nuevo = [...recs, { modulo: 'formato', subtipo: 'Mantenimiento', cliente: 'Edificio Norte', fecha: '2026-10-05' }];
  const l = M.calcular(nuevo, clientes, est, '2026-10-09');
  assert.strictEqual(l.find((i) => i.key === 'edificio norte').vence, '2027-04-03');
});

test('posponer corre la fecha', () => {
  const M = load();
  const est = { 'edificio norte': { base: '2026-03-01', status: 'pospuesto', hasta: '2026-10-16' } };
  assert.strictEqual(M.calcular(recs, clientes, est, '2026-10-09').find((i) => i.key === 'edificio norte').vence, '2026-10-16');
});

test('mensaje, WhatsApp y calendario', () => {
  const M = load();
  const item = M.calcular(recs, clientes, {}, '2026-10-09')[0];
  const msg = M.mensajeCliente(item, 'Automatismos ARPA');
  assert.match(msg, /^Hola Edificio, ya se cumplen 6 meses desde la instalación del 01\/03\/2026/);
  assert.match(msg, /Automatismos ARPA\.$/);
  assert.match(M.waUrl('300 123 4567', 'x'), /^https:\/\/wa\.me\/573001234567\?text=x$/);
  assert.match(M.waUrl('525512345678', 'x'), /wa\.me\/525512345678/, 'número con indicativo se respeta');
  const cal = M.calendarUrl(item, 'Automatismos ARPA');
  assert.match(cal, /^https:\/\/calendar\.google\.com\/calendar\/render\?/);
  assert.match(decodeURIComponent(cal), /dates=20260828\/20260829/);
  assert.match(decodeURIComponent(cal.replace(/\+/g, ' ')), /Mantenimiento – Edificio Norte/);
});

test('el aviso al guardar calcula la fecha desde el formato', () => {
  const M = load();
  const p = M.proximoDesdeRecord({ modulo: 'formato', subtipo: 'Instalación', cliente: 'Local 5', fecha: '2026-10-09' });
  assert.strictEqual(p.vence, '2027-04-07');
  assert.strictEqual(M.proximoDesdeRecord({ modulo: 'formato', subtipo: 'Reparación', cliente: 'X', fecha: '2026-10-09' }), null);
});

// ── Fase 2: sincronización con el servidor (WhatsApp automático) ──────────

function loadConNube(responder) {
  const store = {};
  const llamadas = [];
  const sb = {
    console, URLSearchParams,
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
    },
    ArpaHistorial: { getRecords: () => recs, getClientes: () => clientes },
    ArpaCloudSync: { postJson: (p) => { llamadas.push(p); return Promise.resolve(responder(p)); } },
  };
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js/arpa-mantenimientos.js'), 'utf8'), sb);
  return { M: sb.ArpaMantenimientos, store, llamadas };
}

test('sin licencia no manda nada al servidor', async () => {
  const { M, llamadas } = loadConNube(() => ({ ok: true, activo: true }));
  await M.sincronizar(false);
  assert.strictEqual(llamadas.length, 0);
});

test('manda solo los datos del aviso y no repite si la lista no cambió', async () => {
  const { M, store, llamadas } = loadConNube(() => ({ ok: true, activo: true, envioReal: true, avisados: {} }));
  store.arpa_suite_license_code = 'arpa-founder-x';
  await M.sincronizar(false);
  assert.strictEqual(llamadas.length, 1);
  const p = llamadas[0];
  assert.strictEqual(p.accion, 'mantenimientossync');
  assert.strictEqual(p.licencia, 'ARPA-FOUNDER-X');
  const norte = p.items.find((i) => i.clave === 'edificio norte');
  assert.strictEqual(Object.keys(norte).sort().join(','), ['avisadoEl', 'base', 'clave', 'cliente', 'estado', 'tel', 'tipo', 'vence'].join(','));
  assert.strictEqual(norte.tel, '300 123 4567');
  assert.strictEqual(norte.estado, 'pendiente');
  await M.sincronizar(false);
  assert.strictEqual(llamadas.length, 1, 'misma lista: no vuelve a mandar');
  assert.strictEqual(JSON.parse(store.arpa_mantenimientos_sync).envioReal, true);
});

test('licencia sin envío automático: no vuelve a intentar en 7 días', async () => {
  const { M, store, llamadas } = loadConNube(() => ({ ok: true, activo: false }));
  store.arpa_suite_license_code = 'ARPA-PRO-1';
  await M.sincronizar(false);
  store.arpa_mantenimientos_estado = JSON.stringify({ 'casa sur': { base: '2026-09-20', status: 'hecho' } });
  await M.sincronizar(false);
  assert.strictEqual(llamadas.length, 1);
});

test('marca como avisado lo que el servidor ya mandó, solo para la misma fecha base', async () => {
  const { M, store } = loadConNube(() => ({
    ok: true, activo: true, envioReal: true,
    avisados: {
      'edificio norte': { base: '2026-03-01', avisadoEl: '2026-08-21' },
      'casa sur': { base: '2026-01-01', avisadoEl: '2026-07-01' },
    },
  }));
  store.arpa_suite_license_code = 'ARPA-FOUNDER-X';
  await M.sincronizar(false);
  const est = JSON.parse(store.arpa_mantenimientos_estado);
  assert.strictEqual(est['edificio norte'].avisadoEl, '2026-08-21');
  assert.strictEqual(est['casa sur'], undefined, 'otra fecha base: se ignora');
});
