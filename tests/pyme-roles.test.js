/**
 * Plan PYME: roles jefe y técnico (pestaña "Técnicos") — 1 jefe + 2 técnicos = 3 celulares.
 * Corre el .gs real con la hoja simulada (sin red; no toca el Apps Script ni la hoja real).
 * node --test tests/pyme-roles.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'arpa-licencias-apps-script.gs'), 'utf8');

const LIC_HEADERS = ['CODIGO', 'PLAN', 'CLIENTE', 'EMAIL', 'VENCIMIENTO', 'ACTIVO', 'DEVICE_ID'];
const TEC_HEADERS = ['CodigoTecnico', 'LicenciaJefe', 'Iniciales', 'Nombre', 'Activo'];
const EMP_HEADERS = [
  'Licencia', 'NombreEmpresa', 'NIT', 'Direccion', 'Ciudad', 'Telefono', 'SitioWeb',
  'UltimaActualizacion', 'LogoBase64', 'Banco', 'TipoCuenta', 'NumeroCuenta',
  'TitularCuenta', 'DocumentoTitular', 'NombreTecnico', 'DocumentoTecnico', 'CodigoTecnico'
];
const FUTURO = new Date(2099, 0, 1);

function createFakeSheet(rows) {
  const data = rows.map((r) => r.slice());
  const width = () => data.reduce((m, r) => Math.max(m, r.length), 0);
  const cell = (r, c) => {
    const row = data[r - 1] || [];
    return row[c - 1] === undefined ? '' : row[c - 1];
  };
  const setCell = (r, c, v) => {
    while (data.length < r) data.push([]);
    const row = data[r - 1];
    while (row.length < c) row.push('');
    row[c - 1] = v;
  };
  return {
    data,
    getLastColumn: () => width(),
    getLastRow: () => data.length,
    getRange(r, c, nr, nc) {
      nr = nr || 1;
      nc = nc || 1;
      return {
        getValue: () => cell(r, c),
        getValues() {
          const out = [];
          for (let i = 0; i < nr; i++) {
            const row = [];
            for (let j = 0; j < nc; j++) row.push(cell(r + i, c + j));
            out.push(row);
          }
          return out;
        },
        setValues(vals) { vals.forEach((row, i) => row.forEach((v, j) => setCell(r + i, c + j, v))); },
        setValue(v) { setCell(r, c, v); }
      };
    },
    getDataRange() {
      const w = width();
      return {
        getValues: () => data.map((r) => {
          const row = r.slice();
          while (row.length < w) row.push('');
          return row;
        })
      };
    },
    appendRow(row) { data.push(row.slice()); },
    deleteRow(i) { data.splice(i - 1, 1); }
  };
}

const JEFE = 'ARPA-PYME-0003';
const JEFE_VIEJO = 'ARPA-PYME-0009';

function loadServer(opts) {
  opts = opts || {};
  const sheets = {
    'Hoja 1': createFakeSheet([
      LIC_HEADERS,
      [JEFE, 'PYME', 'Puertas Ya', 'jefe@x.com', FUTURO, 'SI', ''],
      [JEFE_VIEJO, 'PYME', 'PYME sin técnicos', 'viejo@x.com', FUTURO, 'SI', ''],
      ['ARPA-PYME-0010', 'PYME', 'Inactiva', 'off@x.com', FUTURO, 'NO', ''],
      ['ARPA-PRO-0001', 'Pro', 'Independiente', 'pro@x.com', FUTURO, 'SI', '']
    ]),
    Empresas: createFakeSheet([
      EMP_HEADERS,
      [JEFE, 'Puertas Ya SAS', '900.1', 'Cra 1', 'Medellín', '300', 'puertasya.co', new Date(), 'data:image/png;base64,LOGO',
        'Bancolombia', 'Ahorros', '123-456', 'Jefe Pérez', 'CC 1', 'Jefe Pérez', 'CC 1', 'JF']
    ]),
    Catalogo: createFakeSheet([
      ['Licencia', 'ProductoId', 'Codigo', 'Nombre', 'Precio', 'Unidad', 'Marca', 'Categoria'],
      [JEFE, 'p1', 'BFT-1', 'Motor corredizo', 1500000, 'unidad', 'BFT', 'Motores']
    ]),
    Historial: createFakeSheet([
      ['Licencia', 'EntradaId', 'Tipo', 'Subtipo', 'Numero', 'Cliente', 'Ciudad', 'Fecha', 'Monto', 'Concepto'],
      [JEFE, 'h1', 'Cotización', '', 'JF-COT-001', 'Cliente A', 'Medellín', '2026-11-01', 2500000, 'Motor'],
      ['ARPA-TEC-0001', 'h2', 'Formato de Servicio', 'Mantenimiento', 'JP-OT-001', 'Cliente B', 'Medellín', '2026-11-02', '', '']
    ])
  };
  if (opts.tecnicos !== null) {
    sheets[opts.nombrePestana || 'Técnicos'] = createFakeSheet([TEC_HEADERS].concat(opts.tecnicos || [
      ['ARPA-TEC-0001', JEFE, 'JP', 'Juan Pérez', 'SI'],
      ['ARPA-TEC-0002', JEFE, 'ML', 'María López', 'SI'],
      ['ARPA-TEC-0003', JEFE, 'CR', 'Carlos Ruiz', 'NO']
    ]));
  }
  const props = { FOUNDER_CODE: 'ARPA-FOUNDER-X' };
  const sb = {
    console,
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: (n) => sheets[n] || null,
        insertSheet: (n) => { sheets[n] = createFakeSheet([]); return sheets[n]; }
      }),
      flush() {}
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock() {}, releaseLock() {} }) },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (k in props ? props[k] : null),
        setProperty: (k, v) => { props[k] = v; }
      })
    },
    ContentService: {
      MimeType: { JSON: 'json', JAVASCRIPT: 'js' },
      createTextOutput: (t) => ({ text: t, setMimeType() { return this; }, getContent() { return t; } })
    },
    Logger: { log() {} },
    Session: { getScriptTimeZone: () => 'America/Bogota' },
    Utilities: {
      formatDate(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      }
    }
  };
  vm.createContext(sb);
  vm.runInContext(code, sb);
  const post = (body) => JSON.parse(sb.doPost({ postData: { contents: JSON.stringify(body) } }).getContent());
  return { sb, sheets, post };
}

const plain = (o) => JSON.parse(JSON.stringify(o));

test('jefe vs técnico: el código del jefe responde rol jefe y el del técnico rol técnico con licencia e iniciales', () => {
  const { sb } = loadServer();
  const jefe = plain(sb.validateLicense_(JEFE, 'cel-jefe-000001'));
  assert.strictEqual(jefe.valido, true);
  assert.strictEqual(jefe.rol, 'jefe');

  const tec = plain(sb.validateLicense_('ARPA-TEC-0001', 'cel-tec1-000001'));
  assert.strictEqual(tec.valido, true);
  assert.strictEqual(tec.rol, 'tecnico');
  assert.strictEqual(tec.licencia_jefe, JEFE);
  assert.strictEqual(tec.iniciales, 'JP');
  assert.strictEqual(tec.nombre_tecnico, 'Juan Pérez');
  assert.strictEqual(tec.plan, 'PYME');
  assert.strictEqual(tec.founder, false);
});

test('el código del técnico no distingue mayúsculas y la pestaña puede llamarse "Tecnicos" sin tilde', () => {
  const { sb } = loadServer({ nombrePestana: 'Tecnicos' });
  const tec = plain(sb.validateLicense_('arpa-tec-0002'.toUpperCase(), 'cel-tec2-000001'));
  assert.strictEqual(tec.valido, true);
  assert.strictEqual(tec.iniciales, 'ML');
});

test('técnico desactivado no entra', () => {
  const { sb } = loadServer();
  const r = plain(sb.validateLicense_('ARPA-TEC-0003', 'cel-tec3-000001'));
  assert.strictEqual(r.valido, false);
  assert.strictEqual(r.desactivado, true);
  assert.match(r.mensaje, /desactivado/);
});

test('técnico de un jefe con licencia inactiva o que no es PYME no entra', () => {
  const { sb } = loadServer({
    tecnicos: [
      ['ARPA-TEC-0101', 'ARPA-PYME-0010', 'AA', 'De inactiva', 'SI'],
      ['ARPA-TEC-0102', 'ARPA-PRO-0001', 'BB', 'De un Pro', 'SI'],
      ['ARPA-TEC-0103', 'ARPA-PYME-9999', 'CC', 'Jefe inexistente', 'SI']
    ]
  });
  assert.strictEqual(sb.validateLicense_('ARPA-TEC-0101', 'cel-a-0000001').valido, false);
  assert.match(sb.validateLicense_('ARPA-TEC-0102', 'cel-b-0000001').mensaje, /solo para el plan PYME/);
  assert.strictEqual(sb.validateLicense_('ARPA-TEC-0103', 'cel-c-0000001').valido, false);
});

test('1 jefe + 2 técnicos: un 3.er técnico activo no entra', () => {
  const { sb } = loadServer({
    tecnicos: [
      ['ARPA-TEC-0001', JEFE, 'JP', 'Juan', 'SI'],
      ['ARPA-TEC-0002', JEFE, 'ML', 'María', 'SI'],
      ['ARPA-TEC-0004', JEFE, 'PQ', 'Pedro', 'SI']
    ]
  });
  assert.strictEqual(sb.validateLicense_('ARPA-TEC-0001', 'cel-t1-0000001').valido, true);
  assert.strictEqual(sb.validateLicense_('ARPA-TEC-0002', 'cel-t2-0000001').valido, true);
  const tercero = plain(sb.validateLicense_('ARPA-TEC-0004', 'cel-t4-0000001'));
  assert.strictEqual(tercero.valido, false);
  assert.strictEqual(tercero.fuera_de_cupo, true);
  assert.match(tercero.mensaje, /1 jefe \+ 2 técnicos/);
});

test('al desactivar un técnico, el siguiente activo entra en su cupo', () => {
  const { sb } = loadServer({
    tecnicos: [
      ['ARPA-TEC-0001', JEFE, 'JP', 'Juan', 'NO'],
      ['ARPA-TEC-0002', JEFE, 'ML', 'María', 'SI'],
      ['ARPA-TEC-0004', JEFE, 'PQ', 'Pedro', 'SI']
    ]
  });
  assert.strictEqual(sb.validateLicense_('ARPA-TEC-0004', 'cel-t4-0000001').valido, true);
});

test('límite de celulares: el técnico entra en 1 celular y el jefe con técnicos en 1', () => {
  const { sb, sheets } = loadServer();
  assert.strictEqual(sb.validateLicense_('ARPA-TEC-0001', 'cel-tec1-000001').valido, true);
  assert.strictEqual(sb.validateLicense_('ARPA-TEC-0001', 'cel-tec1-000001').valido, true, 'el mismo celular vuelve a entrar');
  const otro = plain(sb.validateLicense_('ARPA-TEC-0001', 'cel-tec1-000002'));
  assert.strictEqual(otro.valido, false);
  assert.match(otro.mensaje, /Límite de dispositivos/);

  assert.strictEqual(sb.validateLicense_(JEFE, 'cel-jefe-000001').valido, true);
  const jefe2 = plain(sb.validateLicense_(JEFE, 'cel-jefe-000002'));
  assert.strictEqual(jefe2.valido, false, 'el jefe con técnicos solo usa 1 celular');

  assert.strictEqual(sb.validateLicense_('ARPA-TEC-0002', 'cel-tec2-000001').valido, true);
  const registrados = sheets.Dispositivos.data.slice(1);
  assert.strictEqual(registrados.length, 3, 'en total 3 celulares: 1 jefe + 2 técnicos');
});

test('licencia PYME vieja sin pestaña Técnicos funciona como hoy (3 celulares, rol jefe)', () => {
  const { sb } = loadServer({ tecnicos: null });
  ['cel-v-00000001', 'cel-v-00000002', 'cel-v-00000003'].forEach((cel) => {
    const r = plain(sb.validateLicense_(JEFE, cel));
    assert.strictEqual(r.valido, true, cel);
    assert.strictEqual(r.rol, 'jefe');
  });
  assert.strictEqual(sb.validateLicense_(JEFE, 'cel-v-00000004').valido, false, 'el 4.º celular no entra');
  assert.strictEqual(sb.validateLicense_('ARPA-TEC-0001', 'cel-x-0000001').valido, false, 'sin pestaña no hay códigos de técnico');
});

test('licencia PYME sin técnicos en la pestaña sigue con 3 celulares', () => {
  const { sb } = loadServer();
  ['cel-w-00000001', 'cel-w-00000002', 'cel-w-00000003'].forEach((cel) => {
    assert.strictEqual(sb.validateLicense_(JEFE_VIEJO, cel).valido, true, cel);
  });
});

test('el técnico no puede guardar empresa ni logo (GET y POST) y el jefe sí', () => {
  const { sb, sheets, post } = loadServer();
  const antes = JSON.stringify(sheets.Empresas.data);
  const jsonp = sb.doGet({ parameter: { accion: 'saveCompanyData', licencia: 'ARPA-TEC-0001', nombreEmpresa: 'Hackeo', callback: 'cb' } }).getContent();
  const r1 = JSON.parse(jsonp.replace(/^[^(]*\(/, '').replace(/\);?\s*$/, ''));
  assert.strictEqual(r1.ok, false);
  assert.strictEqual(r1.rechazado, true);
  const r2 = post({ accion: 'saveCompanyData', licencia: 'ARPA-TEC-0002', nombreEmpresa: 'Otra', logoBase64: 'data:x' });
  assert.strictEqual(r2.ok, false);
  assert.match(r2.mensaje, /Solo el jefe/);
  const r3 = post({ accion: 'saveCompanyData', licencia: 'ARPA-TEC-0003', nombreEmpresa: 'Desactivado' });
  assert.strictEqual(r3.ok, false, 'tampoco un técnico desactivado');
  assert.strictEqual(JSON.stringify(sheets.Empresas.data), antes, 'la empresa no cambió');

  const rj = post({ accion: 'saveCompanyData', licencia: JEFE, nombreEmpresa: 'Puertas Ya 2' });
  assert.strictEqual(rj.ok, true);
  assert.strictEqual(sheets.Empresas.data[1][1], 'Puertas Ya 2');
});

test('el técnico no puede guardar el catálogo y el del jefe queda igual', () => {
  const { sheets, post } = loadServer();
  const r = post({ accion: 'savecatalogo', licencia: 'ARPA-TEC-0001', productos: [{ id: 'x', nom: 'Gratis', pvp: 1 }] });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.rechazado, true);
  const filas = sheets.Catalogo.data.slice(1);
  assert.strictEqual(filas.length, 1);
  assert.strictEqual(filas[0][0], JEFE);
  assert.strictEqual(filas[0][4], 1500000);
});

test('el técnico lee la empresa y el logo del jefe, sin datos bancarios, con su nombre e iniciales', () => {
  const { sb } = loadServer();
  const d = plain(sb.getCompanyData_({ licencia: 'ARPA-TEC-0001' }));
  assert.strictEqual(d.encontrado, true);
  assert.strictEqual(d.nombreEmpresa, 'Puertas Ya SAS');
  assert.strictEqual(d.logoBase64, 'data:image/png;base64,LOGO');
  assert.strictEqual(d.numeroCuenta, '');
  assert.strictEqual(d.banco, '');
  assert.strictEqual(d.nombreTecnico, 'Juan Pérez');
  assert.strictEqual(d.codigoTecnico, 'JP');
  assert.strictEqual(d.rol, 'tecnico');
  const off = plain(sb.getCompanyData_({ licencia: 'ARPA-TEC-0003' }));
  assert.strictEqual(off.ok, false, 'técnico desactivado no descarga datos');
});

test('el técnico lee el catálogo del jefe sin precios', () => {
  const { post } = loadServer();
  const r = post({ accion: 'getcatalogo', licencia: 'ARPA-TEC-0001' });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.sin_precios, true);
  assert.strictEqual(r.productos.length, 1);
  assert.strictEqual(r.productos[0].nom, 'Motor corredizo');
  assert.strictEqual(r.productos[0].pvp, 0);
  const j = post({ accion: 'getcatalogo', licencia: JEFE });
  assert.strictEqual(j.productos[0].pvp, 1500000, 'el jefe sigue viendo sus precios');
});

test('historial: el técnico ve solo lo suyo, sin montos, y no guarda cotizaciones', () => {
  const { sheets, post } = loadServer();
  const h = post({ accion: 'gethistorial', licencia: 'ARPA-TEC-0001' });
  assert.strictEqual(h.ok, true);
  assert.deepStrictEqual(h.entradas.map((e) => e.id), ['h2'], 'no ve la cotización del jefe');
  assert.ok(h.entradas.every((e) => e.monto === ''));

  const cot = post({ accion: 'savehistorialentry', licencia: 'ARPA-TEC-0001', entrada: { id: 'h3', tipo: 'Cotización', monto: 900 } });
  assert.strictEqual(cot.ok, false);
  const ot = post({ accion: 'savehistorialentry', licencia: 'ARPA-TEC-0001', entrada: { id: 'h4', tipo: 'Formato de Servicio', monto: 900 } });
  assert.strictEqual(ot.ok, true);
  const fila = sheets.Historial.data[sheets.Historial.data.length - 1];
  assert.strictEqual(fila[0], 'ARPA-TEC-0001', 'queda bajo el código del técnico');
  assert.strictEqual(fila[8], '', 'sin monto');

  const otro = post({ accion: 'gethistorial', licencia: 'ARPA-TEC-0002' });
  assert.strictEqual(otro.entradas.length, 0, 'un técnico no ve el historial del otro');
  const jefe = post({ accion: 'gethistorial', licencia: JEFE });
  assert.strictEqual(jefe.entradas[0].monto, 2500000, 'el jefe sigue viendo sus montos');
});
