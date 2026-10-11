/**
 * Secuencia de seguimiento de pruebas gratis (días 0, 2, 5, 6, 7, 10 y 20).
 * Corre el .gs real con hoja y correo simulados: sin red, sin Google, nada se envía.
 * node --test tests/secuencia-pruebas.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'arpa-licencias-apps-script.gs'), 'utf8');

function ok(cond, msg) {
  assert.ok(cond, msg);
}

// ─── Hoja falsa ──────────────────────────────────────────────────────────────
function createFakeSheet(rows) {
  const data = rows.map((r) => r.slice());
  function width() {
    return data.reduce((m, r) => Math.max(m, r.length), 0);
  }
  function cell(r, c) {
    const row = data[r - 1] || [];
    return row[c - 1] === undefined ? '' : row[c - 1];
  }
  function setCell(r, c, v) {
    while (data.length < r) data.push([]);
    const row = data[r - 1];
    while (row.length < c) row.push('');
    row[c - 1] = v;
  }
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
        setValues(vals) {
          vals.forEach((row, i) => row.forEach((v, j) => setCell(r + i, c + j, v)));
        },
        setValue(v) {
          setCell(r, c, v);
        }
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
    appendRow(row) {
      data.push(row.slice());
    }
  };
}

const mails = [];
const logs = [];
let currentSheet = null;
let networkCalls = 0;

const sandbox = {
  console,
  Date,
  Math,
  JSON,
  Number,
  String,
  Array,
  Object,
  RegExp,
  Error,
  isNaN,
  isFinite,
  encodeURIComponent,
  SpreadsheetApp: {
    openById() {
      return {
        getSheetByName: () => currentSheet,
        insertSheet: () => currentSheet
      };
    }
  },
  MailApp: { sendEmail: (opts) => mails.push(opts) },
  GmailApp: { sendEmail: () => { networkCalls += 1; } },
  UrlFetchApp: { fetch: () => { networkCalls += 1; } },
  Logger: { log: (m) => logs.push(String(m)) },
  Session: { getScriptTimeZone: () => 'America/Bogota' },
  Utilities: {
    formatDate(d, tz, fmt) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear());
      return fmt === 'yyyy-MM-dd' ? yy + '-' + mm + '-' + dd : dd + '/' + mm + '/' + yy;
    }
  }
};
vm.createContext(sandbox);
vm.runInContext(
  code + '\n;this.__x = { CONFIG: CONFIG, TRIAL_SEQUENCE_: TRIAL_SEQUENCE_, TRIALS_HEADERS_: TRIALS_HEADERS_ };',
  sandbox,
  { filename: 'arpa-licencias-apps-script.gs' }
);
const S = sandbox;
const X = sandbox.__x;
const GUMROAD = 'https://arpatech.gumroad.com/l/arpa-suite-tecnico';
const m = (d, n, o) => S.buildTrialSequenceMessage_(d, n, o);
const oldHeaders = ['Nombre', 'Oficio', 'Telefono', 'FechaInicio', 'FechaVencimiento', 'TrialId', 'Notificado', 'Convertido'];
const today = new Date(2026, 9, 11);
const iso = (daysAgo) => {
  const d = new Date(2026, 9, 11 - daysAgo);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

// ─── Configuración ───────────────────────────────────────────────────────────
test('Configuración', () => {
  ok(X.CONFIG.TRIAL_UPGRADE_GUMROAD_URL === GUMROAD, 'link de pago = Gumroad plan Técnico');
  ok(X.TRIAL_SEQUENCE_.map((s) => s.day).join(',') === '0,2,5,6,7,10,20', 'días 0, 2, 5, 6, 7, 10 y 20');
  ok(X.TRIALS_HEADERS_.slice(0, 8).join('|') === 'Nombre|Oficio|Telefono|FechaInicio|FechaVencimiento|TrialId|Notificado|Convertido', 'columnas originales en el mismo orden');
  ok(X.TRIALS_HEADERS_.includes('Secuencia') && X.TRIALS_HEADERS_.includes('Detener'), 'columnas nuevas Secuencia y Detener');

  // ─── Textos aprobados ────────────────────────────────────────────────────────
});

test('Textos aprobados (con nombre y oficio)', () => {
  ok(m(0, 'Juan Pérez', 'electricidad') === '¡Hola Juan! Bienvenido a ARPA Suite. Primer paso: en Configuración sube tu logo y los datos de tu empresa; desde ahí todos tus PDF salen con tu marca. Cualquier duda, me escribes aquí mismo.', 'día 0 exacto');
  ok(m(2, 'Juan', 'electricidad') === 'Juan, ¿ya hiciste tu primera cotización? Tip para electricidad: agrega al Catálogo los 10 productos que más usas y la cotización sale en 2 minutos. Hazla con un cliente real y mándasela por WhatsApp.', 'día 2 exacto');
  ok(m(5, 'Juan', 'electricidad') === 'Juan, ya llevas 5 días con ARPA Suite. ¿Algún cliente te ha dicho algo del PDF? Si algo no te ha funcionado, dime y te ayudo hoy mismo.', 'día 5 exacto');
  ok(m(6, 'Juan', 'electricidad') === '¡Hola Juan! Mañana vence tu prueba de ARPA Suite. Si te sirvió para tus trabajos de electricidad, el plan Técnico Independiente es $83 USD pago único, sin mensualidades: ' + GUMROAD + ' ¿Te quedó alguna duda?', 'día 6 exacto');
  ok(m(7, 'Juan', 'electricidad') === 'Juan, hoy es el último día de tu prueba. Cuando actives tu código sigues donde ibas. $83 USD una sola vez: ' + GUMROAD + ' ¿Lo dejamos activo hoy?', 'día 7 exacto');
  ok(m(10, 'Juan', 'electricidad') === 'Hola Juan, tu prueba de ARPA Suite terminó hace unos días. ¿Qué te faltó para decidirte: el precio, la forma de pago o algo de la app? Si quieres, te doy 7 días más para probarla con un trabajo real. Respóndeme y te la activo.', 'día 10 exacto');
  ok(m(20, 'Juan', 'electricidad') === 'Hola Juan, último mensaje de mi parte, no te quiero llenar el WhatsApp. Si más adelante quieres mandar tus cotizaciones de electricidad en PDF con tu logo, ARPA Suite sigue siendo pago único: https://arpatechnologyglobal.com ¡Éxitos con tus trabajos!', 'día 20 exacto');
  ok(m(3, 'Juan', 'gas') === '' && m(8, 'Juan', 'gas') === '', 'días fuera de la secuencia no tienen mensaje');
  ok(S.buildTrialDay6WhatsAppMessage_('Juan', 'electricidad') === m(6, 'Juan', 'electricidad'), 'buildTrialDay6WhatsAppMessage_ usa el texto nuevo');
  ok(!/arpatechnologyglobal\.com\/?$/.test(m(6, 'Juan', '').split(' ¿')[0]), 'día 6 ya no apunta a la página web');
});

test('Variante del día 2 (refrigeración, gas, mantenimiento)', () => {
  const v2 = 'después de cada mantenimiento haz el Formato de Servicio con fotos; queda en tu historial y la app te recuerda a los 6 meses.';
  ok(m(2, 'Ana', 'refrigeracion') === 'Ana, ¿ya hiciste tu primera cotización? Tip para refrigeración y aire acondicionado: ' + v2, 'refrigeración (id de la app)');
  ok(m(2, 'Ana', 'gas').endsWith(v2), 'gas');
  ok(m(2, 'Ana', 'Mantenimiento industrial').endsWith(v2), 'mantenimiento (texto libre)');
  ok(m(2, 'Ana', 'Refrigeración').endsWith(v2), 'refrigeración con tilde');
  ok(!m(2, 'Ana', 'plomeria').includes('Formato de Servicio'), 'plomería usa el texto normal');
  ok(!m(2, 'Ana', 'gasfiteria').includes('Formato de Servicio'), '"gas" solo como palabra completa');
  ok(!m(2, 'Ana', 'electricidad').includes('Formato de Servicio'), 'electricidad usa el texto normal');
});

test('Sin nombre / sin oficio', () => {
  ok(m(0, '', '').startsWith('¡Hola! Bienvenido'), 'día 0 sin nombre');
  ok(m(2, '', '').startsWith('¿Ya hiciste tu primera cotización? Tip: agrega'), 'día 2 sin nombre ni oficio');
  ok(m(5, '', 'gas').startsWith('Ya llevas 5 días'), 'día 5 sin nombre');
  ok(m(6, 'Luis', '').includes('Si te sirvió para tus trabajos, el plan'), 'día 6 sin oficio');
  ok(m(7, '', '').startsWith('Hoy es el último día'), 'día 7 sin nombre');
  ok(m(10, '', '').startsWith('Hola, tu prueba'), 'día 10 sin nombre');
  ok(m(20, '', '').includes('tus cotizaciones en PDF con tu logo'), 'día 20 sin oficio');
  ok(m(0, '  maría   josé ', '').startsWith('¡Hola María!'), 'primer nombre con mayúscula');
  ok(m(6, 'Luis', 'linea_blanca').includes('trabajos de línea blanca,'), 'oficio de la app con nombre legible');
  ok(!/\[Nombre\]|\[oficio\]|undefined|null/.test([0, 2, 5, 6, 7, 10, 20].map((d) => m(d, '', '') + m(d, 'A', 'gas')).join(' ')), 'nunca quedan [Nombre], [oficio] ni undefined');

  // ─── Qué día toca ────────────────────────────────────────────────────────────
});

test('Qué día toca (pickTrialSequenceStep_)', () => {
  const pick = (n, sent) => {
    const s = S.pickTrialSequenceStep_(n, sent || []);
    return s ? s.day : null;
  };
  ok(pick(0) === 0 && pick(2) === 2 && pick(5) === 5 && pick(6) === 6 && pick(7) === 7 && pick(10) === 10 && pick(20) === 20, 'cada día de la secuencia');
  ok(pick(-1) === null, 'antes de empezar: nada');
  ok(pick(1) === 0, 'día 0 se puede preparar al día siguiente (registro después del correo)');
  ok(pick(1, [0]) === null, 'día 0 ya preparado: nada el día 1');
  ok(pick(3) === 2 && pick(4) === 2, 'día 2 atrasado hasta el día 4');
  ok(pick(3, [2]) === null, 'día 2 ya preparado: nada');
  ok(pick(8) === null && pick(9) === null, 'días 8 y 9: nada (el día 7 no se manda atrasado)');
  ok(pick(6, [0, 2, 5]) === 6, 'día 6 aunque falten otros (solo el más reciente)');
  ok(pick(6, [6]) === null, 'día 6 ya preparado: nada');
  ok(pick(12) === 10 && pick(13) === null, 'día 10 vale hasta el 12');
  ok(pick(22) === 20 && pick(23) === null && pick(200) === null, 'día 20 vale hasta el 22; pruebas viejas no reciben nada');
});

test('Fila completa (planTrialSequenceRow_)', () => {
  const base = { nombre: 'Juan Pérez', oficio: 'refrigeracion', telefono: '300 123 4567', trialId: 'T1', notificado: '', convertido: '', secuencia: '', detener: '' };
  let p = S.planTrialSequenceRow_({ ...base, fechaInicio: iso(2) }, today);
  ok(p && p.day === 2, 'fecha ISO, día 2');
  ok(p.waLink.startsWith('https://wa.me/573001234567?text='), 'link wa.me con 57 + número');
  ok(decodeURIComponent(p.waLink.split('?text=')[1]) === p.message, 'el link lleva el mensaje exacto');
  ok(p.message.includes('Formato de Servicio'), 'refrigeración recibe la variante');
  ok(p.secuenciaNueva === '2', 'Secuencia queda "2"');
  p = S.planTrialSequenceRow_({ ...base, fechaInicio: new Date(2026, 9, 6, 15, 30), secuencia: '0,2' }, today);
  ok(p && p.day === 5 && p.secuenciaNueva === '0,2,5', 'FechaInicio como fecha de Sheets; Secuencia "0,2,5"');
  ok(S.planTrialSequenceRow_({ ...base, fechaInicio: iso(5), secuencia: '0,2,5' }, today) === null, 'no repite el mismo día');
  ok(S.planTrialSequenceRow_({ ...base, fechaInicio: iso(6), convertido: 'Si' }, today) === null, 'Convertido: sale de la secuencia');
  ok(S.planTrialSequenceRow_({ ...base, fechaInicio: iso(6), detener: 'respondió' }, today) === null, 'Detener: no se le escribe más');
  ok(S.planTrialSequenceRow_({ ...base, fechaInicio: iso(6), telefono: '' }, today) === null, 'sin teléfono: nada');
  ok(S.planTrialSequenceRow_({ ...base, fechaInicio: 'no es fecha' }, today) === null, 'fecha inválida: nada');
  ok(S.planTrialSequenceRow_({ ...base, fechaInicio: iso(6), notificado: 'Si' }, today) === null, 'Notificado del sistema anterior cuenta como día 6');
  p = S.planTrialSequenceRow_({ ...base, fechaInicio: iso(7), notificado: 'Si', secuencia: '' }, today);
  ok(p && p.day === 7 && p.secuenciaNueva === '6,7', 'Notificado anterior + día 7 → Secuencia "6,7"');

  // ─── Columnas en hojas existentes ────────────────────────────────────────────
});

test('Columnas nuevas en hojas existentes', () => {
  let sh = createFakeSheet([oldHeaders, ['Ana', 'gas', '3001112233', iso(1), iso(-6), 'T0', '', '']]);
  let col = S.ensureTrialsSheetHeaders_(sh);
  ok(sh.data[0][8] === 'Secuencia' && sh.data[0][9] === 'Detener', 'agrega Secuencia y Detener al final');
  ok(sh.data[0].slice(0, 8).join('|') === oldHeaders.join('|'), 'no mueve columnas existentes');
  ok(col.secuencia === 8 && col.detener === 9 && col.notificado === 6, 'mapa de columnas correcto');
  ok(sh.data[1][0] === 'Ana' && sh.data[1][3] === iso(1), 'no toca los datos');
  S.ensureTrialsSheetHeaders_(sh);
  ok(sh.data[0].length === 10, 'repetir no duplica columnas');
  sh = createFakeSheet([oldHeaders.concat(['Notas'])]);
  col = S.ensureTrialsSheetHeaders_(sh);
  ok(sh.data[0][8] === 'Notas' && sh.data[0][9] === 'Secuencia' && col.detener === 10, 'respeta columnas propias de Arlen');

  // ─── Correo diario (con hoja falsa) ──────────────────────────────────────────
});

test('Correo diario a Arlen (hoja y correo falsos)', () => {
  const now = new Date();
  const daysAgo = (n) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - n);
  currentSheet = createFakeSheet([
    oldHeaders,
    ['Juan Pérez', 'refrigeracion', '3001234567', daysAgo(2), '', 'T1', '', ''],
    ['Ana', 'electricidad', '3009876543', daysAgo(6), '', 'T2', '', ''],
    ['Comprador', 'gas', '3000000001', daysAgo(6), '', 'T3', '', 'Si'],
    ['Pedro', 'solar', '3000000002', daysAgo(9), '', 'T4', '', ''],
    ['Luis', 'plomeria', '3000000003', daysAgo(5), '', 'T5', '', '']
  ]);
  currentSheet.data[5][9] = 'pidió no escribir';
  mails.length = 0;
  let leads = S.previsualizarSecuenciaPruebas();
  ok(leads.length === 2 && mails.length === 0, 'vista previa: 2 mensajes y no envía correo');
  ok((currentSheet.data[1][8] || '') === '', 'vista previa: no marca Secuencia');
  leads = S.revisarSecuenciaPruebas();
  ok(mails.length === 1, 'UN solo correo para todos');
  ok(mails[0].to === X.CONFIG.TRIAL_NOTIFY_EMAIL, 'correo va al aviso de Arlen (TRIAL_NOTIFY_EMAIL)');
  ok(/2 mensajes para enviar hoy/.test(mails[0].subject), 'asunto con la cantidad');
  const html = mails[0].htmlBody;
  ok(html.includes('Día 2') && html.includes('Día 6'), 'lista días 2 y 6');
  ok(html.includes('https://wa.me/573001234567?text=') && html.includes('https://wa.me/573009876543?text='), 'links wa.me de cada persona');
  ok(!html.includes('3000000001') && !html.includes('3000000003') && !html.includes('3000000002'), 'excluye Convertido, Detener y días sin mensaje');
  ok(html.includes('Juan Pérez · refrigeración y aire acondicionado · 3001234567'), 'nombre, oficio y teléfono');
  ok(currentSheet.data[1][8] === '2' && currentSheet.data[2][8] === '6', 'marca Secuencia por fila');
  ok(currentSheet.data[2][6] === 'Si' && currentSheet.data[1][6] === '', 'día 6 sigue marcando Notificado');
  mails.length = 0;
  S.revisarSecuenciaPruebas();
  ok(mails.length === 0, 'correr dos veces el mismo día no repite (máximo uno por persona por día)');
  mails.length = 0;
  S.revisarTrialsDia6();
  ok(mails.length === 0, 'revisarTrialsDia6 (trigger viejo) delega sin duplicar');
  currentSheet.data[1][8] = '';
  S.revisarTrialsDia6({ triggerUid: 'x' });
  ok(mails.length === 1 && /Día 2/.test(mails[0].htmlBody), 'trigger viejo con evento prepara la secuencia');
  ok(networkCalls === 0, 'sin llamadas de red');

  const fail = (msg) => { throw new Error(msg); };
  mails.length = 0;
  currentSheet.data[1][8] = '';
  const savedSend = S.MailApp.sendEmail;
  S.MailApp.sendEmail = () => fail('cuota');
  let threw = false;
  try { S.revisarSecuenciaPruebas(); } catch (e) { threw = true; }
  S.MailApp.sendEmail = savedSend;
  ok(threw && currentSheet.data[1][8] === '', 'si el correo falla no marca nada (se reintenta)');
});
