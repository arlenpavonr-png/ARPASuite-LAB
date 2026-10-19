/**
 * Catálogo en la nube (Apps Script): savecatalogo / getcatalogo.
 * Corre el .gs real con una hoja "Catalogo" simulada que se comporta como
 * Google Sheets: setValues falla si el número de filas no coincide con el rango.
 * node --test tests/catalogo-servidor.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const HEADERS = ['Licencia', 'ProductoId', 'Codigo', 'Nombre', 'Precio', 'Unidad', 'Marca', 'Categoria'];

function fakeSheet(initialRows) {
  const data = initialRows.map((r) => r.slice());
  const sheet = {
    data,
    getLastRow: () => data.length,
    getDataRange: () => ({ getValues: () => data.map((r) => r.slice()) }),
    deleteRow: (n) => { data.splice(n - 1, 1); },
    getRange: (row, col, numRows, numCols) => {
      const nr = numRows == null ? 1 : numRows;
      const nc = numCols == null ? 1 : numCols;
      return {
        getValue: () => (data[row - 1] ? data[row - 1][col - 1] : ''),
        setValue: (v) => {
          while (data.length < row) data.push([]);
          data[row - 1][col - 1] = v;
        },
        setValues: (v) => {
          if (v.length !== nr) {
            throw new Error('El número de filas de los datos no coincide con el número de filas del rango. Los datos tienen ' + v.length + ', y el rango, ' + nr + '.');
          }
          v.forEach((fila) => {
            if (fila.length !== nc) throw new Error('El número de columnas no coincide.');
          });
          for (let i = 0; i < nr; i++) {
            while (data.length < row + i) data.push([]);
            const target = data[row - 1 + i];
            for (let j = 0; j < nc; j++) target[col - 1 + j] = v[i][j];
          }
        },
      };
    },
  };
  return sheet;
}

function loadServer(initialRows) {
  const sheet = fakeSheet([HEADERS, ...initialRows]);
  const lockCalls = { wait: 0, release: 0 };
  const debug = [];
  const sb = {
    console,
    Logger: { log() {} },
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: (n) => {
          if (n === 'Catalogo') return sheet;
          if (n === 'Debug') return { appendRow: (r) => debug.push(r) };
          return null;
        },
        insertSheet: () => { throw new Error('no debería crear hojas'); },
      }),
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }) },
    LockService: { getScriptLock: () => ({ waitLock() { lockCalls.wait++; }, releaseLock() { lockCalls.release++; } }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ text: t, setMimeType() { return this; } }) },
  };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(root, 'arpa-licencias-apps-script.gs'), 'utf8'), sb);
  const post = (body) => JSON.parse(sb.handleSyncPost_({ postData: { contents: JSON.stringify(body) } }).text);
  const doPost = (body) => sb.doPost({ postData: { contents: JSON.stringify(body) } });
  return { post, doPost, sheet, lockCalls, debug };
}

const A = 'ARPA-PRO-AAA111';
const B = 'ARPA-PYME-BBB222';

function productos(n, prefijo) {
  return Array.from({ length: n }, (_, i) => ({
    id: prefijo + '-' + i, cod: 'C' + i, nom: prefijo + ' producto ' + i,
    pvp: 100 + i, unidad: 'und', marca: 'M', categoria: 'Plomería',
  }));
}

function otrasLicencias(n) {
  return Array.from({ length: n }, (_, i) => [i % 2 ? B : 'ARPA-PRO-OTRA', 'p' + i, 'c' + i, 'n' + i, 1, 'und', '', 'General']);
}

function filasDe(sheet, lic) {
  return sheet.data.slice(1).filter((r) => String(r[0]).toUpperCase() === lic);
}

test('(a) con 2561 filas de otras licencias, A guarda 844 y las demás quedan intactas', () => {
  const otras = otrasLicencias(2561);
  const { post, sheet, lockCalls } = loadServer(otras);
  const r = post({ accion: 'savecatalogo', licencia: A.toLowerCase(), productos: productos(844, 'a') });
  assert.deepStrictEqual(r, { ok: true, count: 844 });
  assert.strictEqual(filasDe(sheet, A).length, 844);
  assert.strictEqual(sheet.data.length, 1 + 2561 + 844);
  assert.deepStrictEqual(sheet.data.slice(1, 2562), otras, 'las otras licencias no cambian');
  assert.strictEqual(lockCalls.wait, 1);
  assert.strictEqual(lockCalls.release, 1, 'libera el candado');
});

test('(b) guardar otra vez reemplaza: quedan 20, sin duplicados', () => {
  const { post, sheet } = loadServer(otrasLicencias(10));
  post({ accion: 'savecatalogo', licencia: A, productos: productos(844, 'a') });
  const r = post({ accion: 'savecatalogo', licencia: A, productos: productos(20, 'b') });
  assert.deepStrictEqual(r, { ok: true, count: 20 });
  const filas = filasDe(sheet, A);
  assert.strictEqual(filas.length, 20);
  assert.ok(filas.every((f) => String(f[1]).startsWith('b-')));
  assert.strictEqual(sheet.data.length, 1 + 10 + 20);
});

test('(c) getcatalogo devuelve exactamente lo guardado', () => {
  const { post } = loadServer(otrasLicencias(5));
  const guardados = productos(3, 'x');
  post({ accion: 'savecatalogo', licencia: A, productos: guardados });
  const r = post({ accion: 'getcatalogo', licencia: A });
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.productos, guardados.map((p) => ({
    id: p.id, cod: p.cod, nom: p.nom, pvp: p.pvp, unidad: p.unidad, marca: p.marca, categoria: p.categoria,
  })));
  assert.strictEqual(post({ accion: 'getcatalogo', licencia: B }).productos.length, 2, 'B solo ve lo suyo');
});

test('(d) lista vacía NO borra: responde ok:false y la copia de A queda intacta', () => {
  const { post, sheet, debug } = loadServer(otrasLicencias(6));
  post({ accion: 'savecatalogo', licencia: A, productos: productos(4, 'a') });
  const antes = sheet.data.map((r) => r.slice());
  const r = post({ accion: 'savecatalogo', licencia: A, productos: [] });
  assert.deepStrictEqual(r, { ok: false, mensaje: 'Catálogo vacío: no se borra la copia en la nube.' });
  assert.strictEqual(filasDe(sheet, A).length, 4);
  assert.deepStrictEqual(sheet.data, antes, 'la hoja no cambia');
  const ultimo = debug[debug.length - 1];
  assert.strictEqual(ultimo[1], 'catalogo_guardado');
  assert.deepStrictEqual(JSON.parse(ultimo[2]), { licencia: 'AAA111', cantidad: 0, resultado: 'rechazado_vacio' });
});

test('sin campo productos (null/ausente) tampoco borra', () => {
  const { post, sheet } = loadServer([]);
  post({ accion: 'savecatalogo', licencia: A, productos: productos(3, 'a') });
  const r = post({ accion: 'savecatalogo', licencia: A });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(filasDe(sheet, A).length, 3);
});

test('Debug anota cada guardado con los últimos 6 caracteres y la cantidad', () => {
  const { post, debug } = loadServer(otrasLicencias(3));
  post({ accion: 'savecatalogo', licencia: A.toLowerCase(), productos: productos(7, 'a') });
  post({ accion: 'savecatalogo', licencia: B, productos: productos(2, 'b') });
  const guardados = debug.filter((r) => r[1] === 'catalogo_guardado').map((r) => JSON.parse(r[2]));
  assert.deepStrictEqual(guardados, [
    { licencia: 'AAA111', cantidad: 7, resultado: 'ok' },
    { licencia: 'BBB222', cantidad: 2, resultado: 'ok' },
  ]);
  assert.ok(debug.every((r) => !String(r[2]).includes('ARPA-PRO-AAA111')), 'no guarda la licencia completa');
});

test('columna Oficio: se guarda, getcatalogo la devuelve y las filas viejas sin oficio siguen funcionando', () => {
  const vieja = [A, 'v-1', 'V1', 'Producto viejo', 50, 'und', '', 'General'];
  const { post, sheet } = loadServer([vieja]);
  // Leer una hoja de antes (8 columnas) agrega solo el título "Oficio".
  const r0 = post({ accion: 'getcatalogo', licencia: A });
  assert.strictEqual(sheet.data[0][8], 'Oficio');
  assert.deepStrictEqual(r0.productos, [{ id: 'v-1', cod: 'V1', nom: 'Producto viejo', pvp: 50, unidad: 'und', marca: '', categoria: 'General' }]);

  const lista = [
    { id: 'p1', cod: 'P1', nom: 'Tubo', pvp: 10, unidad: 'metro', marca: '', categoria: 'Tubería', oficioId: 'plomeria' },
    { id: 'c1', cod: 'C1', nom: 'Cámara', pvp: 900, unidad: 'unidad', marca: 'H', categoria: 'Cámaras', oficioId: 'cctv' },
  ];
  assert.deepStrictEqual(post({ accion: 'savecatalogo', licencia: A, productos: lista }), { ok: true, count: 2 });
  const r = post({ accion: 'getcatalogo', licencia: A });
  assert.deepStrictEqual(r.productos.map((p) => [p.id, p.oficioId]), [['p1', 'plomeria'], ['c1', 'cctv']]);
  assert.strictEqual(filasDe(sheet, A).length, 2, 'reescritura completa: sin duplicados');
});

test('productos inválidos no borran el catálogo existente', () => {
  const { post, sheet } = loadServer([]);
  post({ accion: 'savecatalogo', licencia: A, productos: productos(5, 'a') });
  const r = post({ accion: 'savecatalogo', licencia: A, productos: 'no-es-lista' });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(filasDe(sheet, A).length, 5);
});

test('si la hoja falla, la app recibe JSON {ok:false} y se anota en Debug', () => {
  const { doPost, sheet, debug } = loadServer([]);
  sheet.getLastRow = () => { throw new Error('hoja caída'); };
  const res = doPost({ accion: 'savecatalogo', licencia: A, productos: productos(2, 'a') });
  const json = JSON.parse(res.text);
  assert.strictEqual(json.ok, false);
  assert.match(json.mensaje, /hoja caída/);
  assert.ok(debug.some((r) => r[1] === 'error_doPost'));
});
