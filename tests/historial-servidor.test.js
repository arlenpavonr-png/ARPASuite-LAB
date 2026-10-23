/**
 * Historial en el servidor: una fila por documento (actualiza por id) y el
 * borrado quita todas las filas del id. Corre el .gs real con hoja simulada:
 * sin red, sin Google.
 * node --test tests/historial-servidor.test.js
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const code = fs.readFileSync(path.join(__dirname, '..', 'arpa-licencias-apps-script.gs'), 'utf8');
const HEAD = ['Licencia', 'EntradaId', 'Tipo', 'Subtipo', 'Numero', 'Cliente', 'Ciudad', 'Fecha', 'Monto', 'Concepto'];

function crearServidor(filas, opts) {
  const data = [HEAD.slice()].concat((filas || []).map((r) => r.slice()));
  const sheet = {
    data,
    getRange(r, c, nr, nc) {
      return {
        getValue: () => (data[r - 1] || [])[c - 1] ?? '',
        setValues(vals) {
          vals.forEach((row, i) => row.forEach((v, j) => {
            while (data.length < r + i) data.push([]);
            data[r - 1 + i][c - 1 + j] = v;
          }));
        }
      };
    },
    getDataRange: () => ({ getValues: () => data.map((r) => r.slice()) }),
    appendRow: (row) => data.push(row.slice()),
    deleteRow: (n) => data.splice(n - 1, 1)
  };
  const sandbox = {
    console, Date, Math, JSON, Number, String, Array, Object, RegExp, Error, isNaN,
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet, insertSheet: () => sheet }) },
    LockService: { getScriptLock: () => ({ tryLock: () => !(opts && opts.ocupado), waitLock() {}, releaseLock() {} }) },
    Session: { getScriptTimeZone: () => 'America/Bogota' },
    Utilities: {
      formatDate(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      }
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    ContentService: { createTextOutput: (t) => ({ setMimeType: () => t }), MimeType: { JSON: 'json' } }
  };
  vm.createContext(sandbox);
  vm.runInContext(code + '\n;this.__x = { saveHistorialEntry_, deleteHistorialEntry_, getHistorial_ };', sandbox);
  return { sheet, x: sandbox.__x, filasDe: (id) => data.filter((r) => r[1] === id).length };
}

const LIC = 'ARPA-PRO-TEST';
// Los objetos vienen de otro contexto (vm): se comparan como JSON.
const plano = (o) => JSON.parse(JSON.stringify(o));
const entrada = (id, cliente, monto) => ({ id, tipo: 'Cotización', numero: 'AP-COT-189', cliente, fecha: '2026-10-19', monto });

describe('saveHistorialEntry_', () => {
  it('documento nuevo: agrega una fila', () => {
    const s = crearServidor();
    assert.deepEqual(plano(s.x.saveHistorialEntry_(LIC, entrada('a1', 'Muros', 100))), { ok: true, actualizado: false });
    assert.equal(s.filasDe('a1'), 1);
  });

  it('mismo id otra vez (editar o reintento): actualiza la misma fila, no agrega otra', () => {
    const s = crearServidor();
    s.x.saveHistorialEntry_(LIC, entrada('a1', 'Muros', 100));
    assert.deepEqual(plano(s.x.saveHistorialEntry_(LIC, entrada('a1', 'Muros', 250))), { ok: true, actualizado: true });
    assert.equal(s.filasDe('a1'), 1);
    assert.equal(s.sheet.data.find((r) => r[1] === 'a1')[8], 250);
  });

  it('copias viejas del mismo id: quedan en una sola fila con los datos nuevos', () => {
    const vieja = [LIC, 'a1', 'Cotización', '', 'AP-COT-189', 'Muros', '', '2026-10-19', 100, ''];
    const s = crearServidor([vieja, vieja, [LIC, 'otro', 'Cotización', '', 'X', 'Y', '', '', 1, ''], vieja]);
    s.x.saveHistorialEntry_(LIC, entrada('a1', 'Muros', 300));
    assert.equal(s.filasDe('a1'), 1);
    assert.equal(s.filasDe('otro'), 1);
    assert.equal(s.sheet.data.find((r) => r[1] === 'a1')[8], 300);
  });

  it('el mismo id de OTRA licencia no se toca', () => {
    const s = crearServidor([['ARPA-PRO-OTRA', 'a1', 'Cotización', '', '1', 'Z', '', '', 5, '']]);
    s.x.saveHistorialEntry_(LIC, entrada('a1', 'Muros', 100));
    assert.equal(s.filasDe('a1'), 2);
    assert.equal(s.sheet.data.find((r) => r[0] === 'ARPA-PRO-OTRA')[5], 'Z');
  });

  it('servidor ocupado: responde ok:false (la app lo deja pendiente y reintenta)', () => {
    const s = crearServidor([], { ocupado: true });
    const r = s.x.saveHistorialEntry_(LIC, entrada('a1', 'Muros', 100));
    assert.equal(r.ok, false);
    assert.equal(s.filasDe('a1'), 0);
  });

  it('sin id: ok:false', () => {
    assert.equal(crearServidor().x.saveHistorialEntry_(LIC, {}).ok, false);
  });
});

describe('deleteHistorialEntry_', () => {
  it('borra TODAS las filas del id (antes quedaba una y el documento volvía)', () => {
    const fila = [LIC, 'a1', 'Cotización', '', 'AP-COT-189', 'Muros', '', '', 100, ''];
    const s = crearServidor([fila, [LIC, 'b2', 'Cotización', '', 'X', 'Y', '', '', 1, ''], fila]);
    assert.deepEqual(plano(s.x.deleteHistorialEntry_(LIC, 'a1')), { ok: true, deleted: true, filas: 2 });
    assert.equal(s.filasDe('a1'), 0);
    assert.equal(s.filasDe('b2'), 1);
    assert.equal(s.x.getHistorial_(LIC).entradas.some((e) => e.id === 'a1'), false);
  });

  it('no borra el mismo id de otra licencia', () => {
    const s = crearServidor([['ARPA-PRO-OTRA', 'a1', 'Cotización', '', '1', 'Z', '', '', 5, '']]);
    s.x.deleteHistorialEntry_(LIC, 'a1');
    assert.equal(s.filasDe('a1'), 1);
  });
});

describe('getHistorial_', () => {
  it('fecha convertida por Sheets en Date vuelve como AAAA-MM-DD', () => {
    const s = crearServidor([[LIC, 'a1', 'Cotización', '', '1', 'C', '', new Date(2026, 9, 12), 5, '']]);
    assert.equal(s.x.getHistorial_(LIC).entradas[0].fecha, '2026-10-12');
  });

  it('copias del mismo id: se entrega una sola, la última', () => {
    const s = crearServidor([
      [LIC, 'a1', 'Cotización', '', '1', 'Viejo', '', '2026-10-12', 5, ''],
      [LIC, 'a1', 'Cotización', '', '1', 'Nuevo', '', '2026-10-12', 9, '']
    ]);
    const e = s.x.getHistorial_(LIC).entradas;
    assert.equal(e.length, 1);
    assert.equal(e[0].cliente, 'Nuevo');
    assert.equal(e[0].monto, 9);
  });
});
