/**
 * Respaldo en Drive (Apps Script): guardar, listar, leer y permisos por licencia.
 * Corre el .gs real con Drive, Sheets y propiedades simulados.
 * node --test tests/respaldo-servidor.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

function fakeDrive() {
  let seq = 0;
  const byId = {};
  function folder(name) {
    const f = {
      id: 'fo' + (++seq), name, folders: [], files: [],
      getId: () => f.id,
      getName: () => f.name,
      getFoldersByName: (n) => iter(f.folders.filter((x) => x.name === n)),
      createFolder: (n) => { const c = folder(n); f.folders.push(c); return c; },
      getFilesByName: (n) => iter(f.files.filter((x) => x.name === n && !x.trashed)),
      getFiles: () => iter(f.files.filter((x) => !x.trashed)),
      createFile: (n, content) => { const x = file(n, content); f.files.push(x); return x; },
    };
    byId[f.id] = f;
    return f;
  }
  function file(name, content) {
    const x = {
      name, content, trashed: false, updated: new Date(),
      getName: () => x.name,
      getSize: () => x.content.length,
      getLastUpdated: () => x.updated,
      setContent: (c) => { x.content = c; x.updated = new Date(); },
      setTrashed: (t) => { x.trashed = t; },
      getBlob: () => ({ getDataAsString: () => x.content }),
    };
    return x;
  }
  function iter(list) {
    let i = 0;
    return { hasNext: () => i < list.length, next: () => list[i++] };
  }
  const rootFolder = folder('Mi unidad');
  return {
    rootFolder,
    api: {
      getRootFolder: () => rootFolder,
      getFolderById: (id) => { if (!byId[id]) throw new Error('no existe'); return byId[id]; },
    },
  };
}

function loadServer(rows) {
  const drive = fakeDrive();
  const props = {};
  const values = [['CODIGO', 'PLAN', 'CLIENTE', 'EMAIL', 'VENCIMIENTO', 'ACTIVO'], ...rows];
  const sheet = { getDataRange: () => ({ getValues: () => values }) };
  const sb = {
    console,
    DriveApp: drive.api,
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ text: t, setMimeType() { return this; } }) },
  };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(root, 'arpa-licencias-apps-script.gs'), 'utf8'), sb);
  const post = (body) => JSON.parse(sb.handleSyncPost_({ postData: { contents: JSON.stringify(body) } }).text);
  return { post, drive, props };
}

const PRO = 'ARPA-PRO-AAA111';
const rows = [
  [PRO, 'Pro', 'Cliente', '', new Date(2027, 9, 8), 'SI'],
  ['ARPA-PRO-INACTIVA', 'Pro', 'X', '', '', 'NO'],
  ['ARPA-FREE-T1', 'Free', 'Trial', '', new Date(2026, 9, 15), 'SI'],
];

test('guarda, lista y lee un respaldo de la licencia', () => {
  const { post, drive, props } = loadServer(rows);
  const r = post({ accion: 'respaldoguardar', licencia: PRO.toLowerCase(), app: 'suite', nombre: 'suite-ultimo.json', contenido: '{"a":1}' });
  assert.strictEqual(r.ok, true, r.mensaje);
  assert.ok(props.RESPALDO_FOLDER_ID, 'recuerda la carpeta raíz');
  const raiz = drive.rootFolder.folders[0];
  assert.strictEqual(raiz.name, 'ARPA Respaldos');
  assert.strictEqual(raiz.folders[0].name, PRO);
  assert.strictEqual(raiz.folders[0].folders[0].name, 'suite');

  const l = post({ accion: 'respaldolistar', licencia: PRO, app: 'suite' });
  assert.deepStrictEqual(l.archivos.map((a) => a.nombre), ['suite-ultimo.json']);
  const leido = post({ accion: 'respaldoleer', licencia: PRO, app: 'suite', nombre: 'suite-ultimo.json' });
  assert.strictEqual(leido.contenido, '{"a":1}');
});

test('guardar dos veces reemplaza el mismo archivo', () => {
  const { post } = loadServer(rows);
  post({ accion: 'respaldoguardar', licencia: PRO, app: 'next', nombre: 'next-datos.json', contenido: 'v1' });
  post({ accion: 'respaldoguardar', licencia: PRO, app: 'next', nombre: 'next-datos.json', contenido: 'v2' });
  const l = post({ accion: 'respaldolistar', licencia: PRO, app: 'next' });
  assert.strictEqual(l.archivos.length, 1);
  assert.strictEqual(post({ accion: 'respaldoleer', licencia: PRO, app: 'next', nombre: 'next-datos.json' }).contenido, 'v2');
});

test('solo deja los últimos 30 respaldos diarios', () => {
  const { post } = loadServer(rows);
  for (let d = 1; d <= 35; d++) {
    const dia = String(d).padStart(2, '0');
    const mes = d <= 31 ? '01' : '02';
    const nombre = `suite-2027-${mes}-${d <= 31 ? dia : String(d - 31).padStart(2, '0')}.json`;
    post({ accion: 'respaldoguardar', licencia: PRO, app: 'suite', nombre, contenido: 'x' });
  }
  post({ accion: 'respaldoguardar', licencia: PRO, app: 'suite', nombre: 'suite-ultimo.json', contenido: 'x' });
  const nombres = post({ accion: 'respaldolistar', licencia: PRO, app: 'suite' }).archivos.map((a) => a.nombre);
  assert.strictEqual(nombres.filter((n) => /\d{4}-\d{2}-\d{2}/.test(n)).length, 30);
  assert.ok(!nombres.includes('suite-2027-01-01.json'), 'borra los más viejos');
  assert.ok(nombres.includes('suite-2027-02-04.json') && nombres.includes('suite-ultimo.json'));
});

test('rechaza licencias sin respaldo, apps y nombres no válidos', () => {
  const { post } = loadServer(rows);
  const base = { accion: 'respaldoguardar', app: 'suite', nombre: 'suite-ultimo.json', contenido: 'x' };
  assert.strictEqual(post({ ...base, licencia: 'ARPA-PRO-NOEXISTE' }).ok, false);
  assert.strictEqual(post({ ...base, licencia: 'ARPA-PRO-INACTIVA' }).ok, false);
  assert.strictEqual(post({ ...base, licencia: 'ARPA-FREE-T1' }).ok, false);
  assert.strictEqual(post({ ...base, licencia: PRO, app: 'otra' }).ok, false);
  assert.strictEqual(post({ ...base, licencia: PRO, nombre: '../hoja.json' }).ok, false);
  assert.strictEqual(post({ ...base, licencia: PRO, contenido: '' }).ok, false);
  assert.strictEqual(post({ accion: 'respaldoleer', licencia: PRO, app: 'suite', nombre: 'no-existe.json' }).ok, false);
});

test('una licencia no ve los respaldos de otra', () => {
  const otra = 'ARPA-PYME-BBB222';
  const { post } = loadServer([...rows, [otra, 'PYME', 'Otro', '', new Date(2027, 9, 8), 'SI']]);
  post({ accion: 'respaldoguardar', licencia: PRO, app: 'suite', nombre: 'suite-ultimo.json', contenido: 'secreto' });
  assert.strictEqual(post({ accion: 'respaldolistar', licencia: otra, app: 'suite' }).archivos.length, 0);
  assert.strictEqual(post({ accion: 'respaldoleer', licencia: otra, app: 'suite', nombre: 'suite-ultimo.json' }).ok, false);
});

test('un pedido JSON desconocido responde JSON y no entra al flujo de ventas', () => {
  const { post } = loadServer(rows);
  const r = post({ accion: 'algo-nuevo', licencia: PRO });
  assert.strictEqual(r.ok, false);
  assert.match(r.mensaje, /desconocida/);
});
