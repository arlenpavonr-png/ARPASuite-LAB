/**
 * Ventas manuales (Nequi / llave Bre-B): licencias creadas desde la pestaña VentasManuales.
 * Corre el .gs real con Sheet, correo, candado y propiedades simulados (sin red, nada se envía).
 * node --test tests/ventas-manuales.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'arpa-licencias-apps-script.gs'), 'utf8');

const VM_HEADERS = ['Fecha', 'Nombre', 'Email', 'Telefono', 'Plan', 'MontoCOP', 'Medio', 'Referencia', 'Codigo', 'Estado'];
const LIC_HEADERS = ['CODIGO', 'PLAN', 'CLIENTE', 'EMAIL', 'VENCIMIENTO', 'ACTIVO', 'DEVICE_ID'];

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
    getRange(r, c, nr, nc) {
      nr = nr || 1;
      nc = nc || 1;
      return {
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
    appendRow(row) { data.push(row.slice()); }
  };
}

function loadServer(ventas, opts) {
  opts = opts || {};
  const sheets = {
    'Hoja 1': createFakeSheet([LIC_HEADERS, ['ARPA-PRO-0007', 'Pro', 'Viejo', 'viejo@x.com', new Date(2027, 0, 1), 'SI', '']])
  };
  if (ventas) sheets.VentasManuales = createFakeSheet([VM_HEADERS].concat(ventas));
  const mails = [];
  const alerts = [];
  const props = { GUMROAD_PRODUCT_PRO: 'PROD_PRO' };
  let locked = false;
  const sb = {
    console,
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: (n) => sheets[n] || null,
        insertSheet: (n) => { sheets[n] = createFakeSheet([]); return sheets[n]; }
      }),
      flush() {},
      getUi: () => {
        if (opts.sinUi) throw new Error('Cannot call SpreadsheetApp.getUi() from this context.');
        return {
          alert: (m) => alerts.push(m),
          createMenu: (name) => {
            const menu = { name, items: [] };
            const api = {
              addItem: (label, fn) => { menu.items.push([label, fn]); return api; },
              addToUi: () => { alerts.push(menu); }
            };
            return api;
          }
        };
      }
    },
    MailApp: {
      sendEmail: (o) => {
        if (opts.correoFalla) throw new Error('cuota agotada');
        mails.push(o);
      }
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => (opts.candadoOcupado ? false : (locked = true)),
        waitLock: () => { locked = true; },
        releaseLock: () => { locked = false; }
      })
    },
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
      formatDate(d, tz, fmt) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return fmt === 'yyyy-MM-dd' ? d.getFullYear() + '-' + mm + '-' + dd : dd + '/' + mm + '/' + d.getFullYear();
      }
    }
  };
  vm.createContext(sb);
  vm.runInContext(code, sb);
  return { sb, sheets, mails, alerts, props, isLocked: () => locked };
}

const isDate = (v) => Object.prototype.toString.call(v) === '[object Date]';
const col = (h) => VM_HEADERS.indexOf(h);
const venta = (o) => {
  const row = VM_HEADERS.map(() => '');
  Object.keys(o).forEach((k) => { row[col(k)] = o[k]; });
  return row;
};
const ANA = { Nombre: 'Ana Gómez', Email: 'Ana@Correo.com ', Telefono: '3001234567', Plan: 'Técnico Independiente', MontoCOP: 340000, Medio: 'Nequi', Referencia: 'M123' };

test('crea una licencia PRO desde la fila y envía el correo con el código', () => {
  const { sb, sheets, mails, alerts, isLocked } = loadServer([venta(ANA)]);
  const r = sb.procesarVentasManuales();
  assert.strictEqual(r.creadas, 1);
  assert.strictEqual(r.errores, 0);
  const lic = sheets['Hoja 1'].data;
  const nueva = lic[lic.length - 1];
  assert.strictEqual(nueva[0], 'ARPA-PRO-0008', 'sigue la numeración existente');
  assert.strictEqual(nueva[1], 'Pro');
  assert.strictEqual(nueva[2], 'Ana Gómez');
  assert.strictEqual(nueva[3], 'ana@correo.com', 'email en minúsculas, como Gumroad');
  assert.strictEqual(nueva[5], 'SI');
  const dias = Math.round((nueva[4] - new Date()) / 86400000);
  assert.ok(dias >= 364 && dias <= 365, 'vence en 365 días');
  const fila = sheets.VentasManuales.data[1];
  assert.strictEqual(fila[col('Codigo')], 'ARPA-PRO-0008');
  assert.ok(/^Enviado \d{2}\/\d{2}\/\d{4}$/.test(fila[col('Estado')]), 'Estado "Enviado <fecha>"');
  assert.ok(isDate(fila[col('Fecha')]), 'llena la Fecha si estaba vacía');
  assert.strictEqual(mails.length, 1);
  assert.strictEqual(mails[0].to, 'ana@correo.com');
  assert.ok(mails[0].subject.includes('ARPA-PRO-0008') && mails[0].htmlBody.includes('ARPA-PRO-0008'), 'el correo lleva el código');
  assert.ok(alerts.some((a) => typeof a === 'string' && a.includes('1 licencia creada')), 'aviso final');
  assert.strictEqual(isLocked(), false, 'suelta el candado');
  assert.ok(sheets.Debug && sheets.Debug.data.some((r) => r[1] === 'venta_manual_licencia'), 'queda en Debug');
});

test('correr dos veces no crea dos licencias', () => {
  const { sb, sheets, mails, alerts } = loadServer([venta(ANA)]);
  sb.procesarVentasManuales();
  const r2 = sb.procesarVentasManuales();
  assert.strictEqual(r2.creadas, 0);
  assert.strictEqual(sheets['Hoja 1'].data.length, 3, 'una sola licencia nueva');
  assert.strictEqual(mails.length, 1, 'un solo correo');
  assert.ok(alerts[alerts.length - 1].includes('No hay ventas nuevas'));
});

test('respeta la Fecha que puso Arlen', () => {
  const fecha = new Date(2026, 9, 1);
  const { sb, sheets } = loadServer([venta({ ...ANA, Fecha: fecha })]);
  sb.procesarVentasManuales();
  assert.strictEqual(sheets.VentasManuales.data[1][col('Fecha')], fecha);
});

test('rechaza email inválido, plan Free, plan desconocido y datos faltantes', () => {
  const { sb, sheets, mails } = loadServer([
    venta({ ...ANA, Email: 'ana@correo' }),
    venta({ ...ANA, Plan: 'Free' }),
    venta({ ...ANA, Plan: 'Plan Oro' }),
    venta({ ...ANA, Nombre: '' }),
    venta({ ...ANA, Plan: '' }),
    venta({}),
    venta({ ...ANA, Email: 'luis@correo.co', Plan: 'PYME', Referencia: 'B-1' }),
    venta({ ...ANA, Email: 'wl@correo.co', Plan: 'WL', Referencia: 'B-2' })
  ]);
  const r = sb.procesarVentasManuales();
  const estado = (i) => sheets.VentasManuales.data[i][col('Estado')];
  assert.ok(/^ERROR: email no válido/.test(estado(1)));
  assert.ok(/^ERROR: el plan Free/.test(estado(2)));
  assert.ok(/^ERROR: plan desconocido/.test(estado(3)));
  assert.ok(/^ERROR: falta el Nombre/.test(estado(4)));
  assert.ok(/^ERROR: falta el Plan/.test(estado(5)));
  assert.strictEqual(estado(6), '', 'fila vacía se ignora');
  for (let i = 1; i <= 5; i++) assert.strictEqual(sheets.VentasManuales.data[i][col('Codigo')], '', 'error: sin código');
  assert.strictEqual(sheets.VentasManuales.data[7][col('Codigo')], 'ARPA-PYME-0001');
  assert.strictEqual(sheets.VentasManuales.data[8][col('Codigo')], 'ARPA-WL-0001');
  assert.strictEqual(r.creadas, 2);
  assert.strictEqual(r.errores, 5);
  assert.strictEqual(mails.length, 2, 'solo correos de las válidas');
  assert.strictEqual(sheets['Hoja 1'].data.length, 4, 'solo licencias de las válidas');
});

test('mapeo de planes', () => {
  const { sb } = loadServer([]);
  const p = (s) => { const r = sb.resolveManualPlan_(s); return r.plan ? r.plan.planLabel : 'ERR'; };
  assert.strictEqual(p('Técnico Independiente'), 'Pro');
  assert.strictEqual(p('tecnico independiente'), 'Pro');
  assert.strictEqual(p('Pro'), 'Pro');
  assert.strictEqual(p('PYME'), 'PYME');
  assert.strictEqual(p('White Label'), 'White Label');
  assert.strictEqual(p('wl'), 'White Label');
  assert.strictEqual(p('Free'), 'ERR');
  assert.strictEqual(p('Prueba gratis'), 'ERR');
  assert.strictEqual(p('Premium'), 'ERR');
});

test('la misma Referencia no genera dos licencias', () => {
  const { sb, sheets } = loadServer([venta(ANA), venta({ ...ANA, Email: 'otra@correo.com' })]);
  const r = sb.procesarVentasManuales();
  assert.strictEqual(r.creadas, 1);
  assert.ok(/^ERROR: la Referencia M123 ya tiene una licencia/.test(sheets.VentasManuales.data[2][col('Estado')]));
});

test('si el correo falla, la licencia queda anotada y no se duplica', () => {
  const s = loadServer([venta(ANA)], { correoFalla: true });
  const r = s.sb.procesarVentasManuales();
  const fila = s.sheets.VentasManuales.data[1];
  assert.strictEqual(r.errores, 1);
  assert.strictEqual(fila[col('Codigo')], 'ARPA-PRO-0008');
  assert.ok(/correo falló/.test(fila[col('Estado')]));
  s.sb.procesarVentasManuales();
  assert.strictEqual(s.sheets['Hoja 1'].data.length, 3, 'no crea otra licencia al reintentar');
});

test('la fila de licencia tiene los mismos campos que una venta de Gumroad', () => {
  const { sb, sheets } = loadServer([venta(ANA)]);
  sb.doPost({ postData: { contents: 'product_id=PROD_PRO&price=34000&email=gum%40correo.com&full_name=Gum+Road&sale_id=S1&resource_name=sale&refunded=false' } });
  sb.procesarVentasManuales();
  const lic = sheets['Hoja 1'].data;
  const gum = lic[2];
  const man = lic[3];
  assert.strictEqual(gum[0], 'ARPA-PRO-0008', 'venta Gumroad creada');
  assert.strictEqual(man[0], 'ARPA-PRO-0009', 'venta manual sigue la numeración');
  assert.strictEqual(gum.length, man.length);
  assert.deepStrictEqual(gum.map((v) => v !== ''), man.map((v) => v !== ''), 'mismas columnas llenas');
  assert.strictEqual(gum[1], man[1], 'mismo PLAN');
  assert.strictEqual(gum[5], man[5], 'mismo ACTIVO');
  assert.ok(isDate(gum[4]) && isDate(man[4]), 'VENCIMIENTO fecha en ambas');
});

test('pestaña VentasManuales se crea sola con encabezados', () => {
  const { sb, sheets, alerts } = loadServer(null);
  const r = sb.procesarVentasManuales();
  assert.ok(r.pestanaCreada);
  assert.deepStrictEqual(sheets.VentasManuales.data[0], VM_HEADERS);
  assert.ok(alerts[0].includes('Se creó la pestaña'));
});

test('columnas faltantes se agregan al final sin mover las de Arlen', () => {
  const { sb, sheets } = loadServer(null);
  sheets.VentasManuales = createFakeSheet([['Nombre', 'Email', 'Plan', 'Notas'], ['Ana', 'ana@correo.com', 'Pro', 'pagó el lunes']]);
  const r = sb.procesarVentasManuales();
  const h = sheets.VentasManuales.data[0];
  assert.deepStrictEqual(h.slice(0, 4), ['Nombre', 'Email', 'Plan', 'Notas']);
  assert.ok(h.includes('Codigo') && h.includes('Estado') && h.includes('Referencia'));
  assert.strictEqual(r.creadas, 1);
  assert.strictEqual(sheets.VentasManuales.data[1][h.indexOf('Codigo')], 'ARPA-PRO-0008');
});

test('menú ARPA y uso sin menú (editor)', () => {
  const { sb, alerts } = loadServer([]);
  sb.onOpen();
  const menu = alerts.find((a) => a && a.name === 'ARPA');
  assert.ok(menu, 'crea el menú ARPA');
  assert.deepStrictEqual(menu.items, [['Crear licencias de pagos manuales', 'procesarVentasManuales']]);
  const s = loadServer([venta(ANA)], { sinUi: true });
  assert.doesNotThrow(() => s.sb.onOpen(), 'onOpen no rompe sin interfaz');
  const r = s.sb.procesarVentasManuales();
  assert.strictEqual(r.creadas, 1, 'funciona ejecutado desde el editor');
  assert.ok(r.mensaje.includes('1 licencia creada'));
});

test('si otro proceso tiene el candado no crea nada', () => {
  const { sb, sheets, mails } = loadServer([venta(ANA)], { candadoOcupado: true });
  const r = sb.procesarVentasManuales();
  assert.ok(r.ocupado);
  assert.strictEqual(sheets['Hoja 1'].data.length, 2);
  assert.strictEqual(mails.length, 0);
});
