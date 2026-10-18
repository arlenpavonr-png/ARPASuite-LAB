/**
 * Idioma del documento para el cliente (PDF en inglés con la app en español).
 * node --test tests/pdf-idioma-documento.test.js
 *
 * Sin navegador: DOM mínimo de mentira + jsPDF de mentira que registra los textos.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

// ── DOM mínimo ──────────────────────────────────────────────────────────────
class El {
  constructor(tag, attrs, text) {
    this.tagName = String(tag).toUpperCase();
    this.attrs = {};
    this.children = [];
    this.parentElement = null;
    this._text = text || '';
    this._html = null;
    this.classList = { toggle() {}, add() {}, remove() {}, contains: () => false };
    this.style = {};
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === 'value') this.value = v;
      else if (k === 'type') this.type = v;
      else this.attrs[k] = String(v);
    });
    if (this.tagName === 'INPUT' && !this.type) this.type = 'text';
    if (this.value == null) this.value = '';
  }
  get id() { return this.attrs.id || ''; }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  hasAttribute(k) { return k in this.attrs; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener() {}
  get textContent() { return this.children.length ? this.children.map((c) => c.textContent).join('') : this._text; }
  set textContent(v) { this.children = []; this._text = String(v); this._html = null; }
  get innerHTML() { return this._html != null ? this._html : this._text; }
  set innerHTML(v) { this.children = []; this._html = String(v); this._text = String(v).replace(/<[^>]+>/g, ''); }
  append(...kids) { kids.forEach((k) => { k.parentElement = this; this.children.push(k); }); return this; }
  all() { return this.children.flatMap((c) => [c, ...c.all()]); }
  matches(sel) {
    let m;
    if ((m = /^\[([\w-]+)\]$/.exec(sel))) return this.hasAttribute(m[1]);
    if ((m = /^(\w+)\[type="(\w+)"\]$/.exec(sel))) return this.tagName === m[1].toUpperCase() && this.type === m[2];
    if ((m = /^\.([\w-]+)$/.exec(sel))) return (this.attrs.class || '').split(/\s+/).includes(m[1]);
    if ((m = /^#([\w-]+)$/.exec(sel))) return this.id === m[1];
    if (/^\w+$/.test(sel)) return this.tagName === sel.toUpperCase();
    return false;
  }
  querySelectorAll(sel) {
    const parts = sel.trim().split(/\s+/);
    if (parts.length === 2) {
      return this.all().filter((e) => e.matches(parts[0])).flatMap((e) => e.querySelectorAll(parts[1]));
    }
    return this.all().filter((e) => e.matches(sel));
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}

const h = (tag, attrs, text, kids) => new El(tag, attrs, text).append(...(kids || []));

function buildDocument() {
  const body = h('body', {}, '', [
    h('div', { class: 'page' }, '', [
      h('div', { class: 'header' }, '', [
        h('div', { id: 'doc-type-label', 'data-i18n': 'header.doc_type.cotizacion' }, 'Cotización'),
        h('label', { 'data-i18n': 'header.number_label' }, 'N°')
      ]),
      h('div', { id: 'view-cotizacion', class: 'suite-view' }, '', [
        h('span', { 'data-i18n': 'cot.section.datos_cliente' }, 'Datos del Cliente'),
        h('label', { 'data-i18n': 'formato.label.fecha' }, 'Fecha'),
        h('input', { id: 'cot-fecha', type: 'date', value: '2026-10-10' }),
        h('label', { 'data-i18n': 'cot.label.valida_hasta' }, 'Válida hasta'),
        h('input', { id: 'cot-validez', type: 'date', value: '2026-10-25' }),
        h('th', { 'data-i18n': 'cot.table.descripcion' }, 'Descripción'),
        h('th', { 'data-i18n': 'cot.table.cant' }, 'Cant.'),
        h('span', { 'data-i18n': 'cot.total.subtotal' }, 'Subtotal'),
        h('span', { 'data-i18n': 'cot.section.observaciones' }, 'Observaciones'),
        h('div', { 'data-i18n': 'cot.firma.aprobado_cliente' }, 'Aprobado por (Cliente)'),
        h('input', { class: 'firma-name', 'data-i18n-placeholder': 'formato.firma.placeholder.nombre', placeholder: 'Nombre completo' }),
        h('p', { id: 'cot-print-footer-global' }, 'Generado con ARPA Suite · Pruébala gratis en arpatechnologyglobal.com · © 2026')
      ])
    ]),
    h('select', { id: 'settings-doc-lang', value: 'es' })
  ]);
  const documentElement = h('html', { lang: 'es' });
  documentElement.lang = 'es';
  return {
    readyState: 'complete',
    documentElement,
    body,
    addEventListener() {},
    getElementById: (id) => body.all().find((e) => e.id === id) || null,
    querySelectorAll: (sel) => body.querySelectorAll(sel),
    querySelector: (sel) => body.querySelector(sel),
    createElement: (tag) => new El(tag)
  };
}

const SETTINGS = {
  country: 'US',
  companyName: 'Acme Garage Doors',
  technicianName: 'Carlos Pérez',
  technicianDocument: '123',
  nit: '98-7654321',
  phone: '3055550100',
  address: '100 Main St, Miami FL'
};

function makeSandbox(extraEls) {
  const store = {};
  const document = buildDocument();
  (extraEls || []).forEach((el) => document.body.append(el));
  const sb = {
    console,
    Intl,
    document,
    setTimeout: () => 0,
    clearTimeout() {},
    addEventListener() {},
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    },
    navigator: { language: 'es-CO', languages: ['es-CO'] },
    ArpaBrand: {
      getSettings: () => SETTINGS,
      getLogo: () => null,
      syncBankBlocksForPrint() {}
    },
    ArpaViews: { getCurrentView: () => 'cotizacion' },
    fechaLocalISO: (d) => d.toISOString().slice(0, 10),
    File: class { constructor(parts, name) { this.name = name; } },
    alert() {}
  };
  sb.window = sb;
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(read('js/arpa-pricing.js'), sb, { filename: 'arpa-pricing.js' });
  vm.runInContext(read('js/arpa-i18n.js'), sb, { filename: 'arpa-i18n.js' });
  return { sb, store, document };
}

// ── Pruebas: ajuste y PDF armado sobre el DOM (Cotización / Formato) ────────
test('por defecto el idioma del documento es Español y la app no cambia', () => {
  const { sb, store } = makeSandbox();
  assert.strictEqual(sb.ArpaDocLang.get(), 'es');
  assert.strictEqual(sb.ArpaI18n.getLang(), 'es');
  sb.ArpaDocLang.set('en');
  assert.strictEqual(store.arpa_doc_lang, 'en');
  assert.strictEqual(sb.ArpaI18n.getLang(), 'es', 'la interfaz sigue en español');
  assert.notStrictEqual(store.arpa_lang, 'en');
});

test('con Español el PDF de la cotización sale exactamente como antes', () => {
  const { sb, document } = makeSandbox();
  const byId = (id) => document.getElementById(id);
  sb.ArpaI18n.preparePdfSpanish('view-cotizacion');
  const texto = document.body.textContent;
  assert.match(texto, /Datos del Cliente/);
  assert.match(texto, /Válida hasta/);
  assert.match(texto, /Aprobado por \(Cliente\)/);
  assert.strictEqual(byId('cot-fecha').type, 'date');
  assert.strictEqual(byId('cot-fecha').value, '2026-10-10');
  assert.strictEqual(sb.ArpaI18n.getLang(), 'es');
  sb.ArpaI18n.restorePdfSpanish();
  assert.match(document.body.textContent, /Datos del Cliente/);
});

test('con English el PDF de la cotización sale en inglés y la app vuelve a español', () => {
  const { sb, store, document } = makeSandbox();
  const byId = (id) => document.getElementById(id);
  sb.ArpaDocLang.set('en');

  sb.ArpaI18n.preparePdfSpanish('view-cotizacion');
  const texto = document.body.textContent;
  assert.strictEqual(byId('doc-type-label').textContent, 'Estimate');
  assert.match(texto, /Customer Information/);
  assert.match(texto, /Valid until/);
  assert.match(texto, /Description/);
  assert.match(texto, /Approved by \(Customer\)/);
  assert.match(texto, /Generated with ARPA Suite/);
  assert.doesNotMatch(texto, /Datos del Cliente|Válida hasta|Aprobado por|Generado con/);
  assert.strictEqual(byId('cot-fecha').value, '10/10/2026', 'fecha MM/DD/YYYY');
  assert.strictEqual(byId('cot-validez').value, '10/25/2026');
  assert.strictEqual(document.querySelector('.firma-name').getAttribute('placeholder'), 'Full name');

  // arpa-formato-tipo llama apply(getLang()) durante el PDF: no debe romper el inglés ni guardar 'en' como idioma de la app.
  sb.ArpaI18n.apply('es');
  assert.match(document.body.textContent, /Customer Information/);
  assert.notStrictEqual(store.arpa_lang, 'en');

  sb.ArpaI18n.restorePdfSpanish();
  assert.match(document.body.textContent, /Datos del Cliente/);
  assert.match(document.body.textContent, /Válida hasta/);
  assert.strictEqual(byId('cot-fecha').type, 'date');
  assert.strictEqual(byId('cot-fecha').value, '2026-10-10');
  assert.strictEqual(sb.ArpaI18n.getLang(), 'es');
  assert.strictEqual(document.documentElement.lang, 'es');
});

test('el formato de servicio sale como "Work Order" en inglés', () => {
  const view = h('div', { id: 'view-formato' }, '', [
    h('span', { 'data-i18n': 'formato.section.datos_cliente' }, 'Datos del Cliente'),
    h('div', { 'data-i18n': 'formato.firma.cliente' }, 'Firma Cliente'),
    h('input', { id: 'formato-fecha', type: 'date', value: '2026-03-05' })
  ]);
  const { sb, document } = makeSandbox([view]);
  sb.ArpaViews.getCurrentView = () => 'formato';
  sb.ArpaDocLang.set('en');
  sb.ArpaI18n.preparePdfSpanish('view-formato');
  assert.strictEqual(document.getElementById('doc-type-label').textContent, 'Work Order');
  assert.match(view.textContent, /Customer Information/);
  assert.match(view.textContent, /Customer signature/);
  assert.strictEqual(document.getElementById('formato-fecha').value, '03/05/2026');
  sb.ArpaI18n.restorePdfSpanish();
  assert.match(view.textContent, /Firma Cliente/);
  assert.strictEqual(document.getElementById('formato-fecha').value, '2026-03-05');
});

test('ArpaDocLang: fechas, textos e impuesto con English y sin cambios con Español', () => {
  const { sb } = makeSandbox();
  const D = sb.ArpaDocLang;
  assert.strictEqual(D.date('2026-10-10'), '2026-10-10');
  assert.strictEqual(D.text('cc.pdf.title', 'CUENTA DE COBRO'), 'CUENTA DE COBRO');
  assert.strictEqual(D.taxLabel(), null);
  assert.strictEqual(D.shareMessage('cot', { nombre: 'John' }), null);
  D.set('en');
  assert.strictEqual(D.date('2026-10-10'), '10/10/2026');
  assert.strictEqual(D.date('—'), '—');
  assert.strictEqual(D.text('cc.pdf.title', 'CUENTA DE COBRO'), 'INVOICE');
  assert.strictEqual(D.taxLabel(), 'Sales tax 0%');
  assert.strictEqual(sb.ArpaI18n.getLang(), 'es', 'taxLabel no deja la app en inglés');
});

// ── Mensajes de WhatsApp ────────────────────────────────────────────────────
function loadWhatsApp(extraEls) {
  const ctx = makeSandbox(extraEls);
  vm.runInContext(read('js/arpa-whatsapp.js'), ctx.sb, { filename: 'arpa-whatsapp.js' });
  return ctx;
}

test('mensaje de WhatsApp del formato: español igual que antes, inglés con fecha MM/DD/YYYY', () => {
  const els = [
    h('input', { id: 'formato-cliente-nombre', value: 'John Smith' }),
    h('input', { id: 'numero-formato', value: 'OT-0007' }),
    h('input', { id: 'formato-fecha', type: 'date', value: '2026-10-10' })
  ];
  const { sb } = loadWhatsApp(els);
  assert.strictEqual(
    sb.ArpaWhatsApp.buildFormatoMessage(),
    'Hola John Smith, le comparto el formato de servicio N°OT-0007 con fecha 2026-10-10 de Acme Garage Doors. Por favor revíselo y confírmenos su recepción.'
  );
  sb.ArpaDocLang.set('en');
  assert.strictEqual(
    sb.ArpaWhatsApp.buildFormatoMessage(),
    'Hi John Smith, here is Work Order #OT-0007 dated 10/10/2026 from Acme Garage Doors. Please review it and let us know if you have any questions.'
  );
});

test('mensaje de WhatsApp de la cotización en inglés (arpa-cotizacion.js)', () => {
  const src = read('js/arpa-cotizacion.js');
  assert.match(src, /ArpaDocLang\?\.shareMessage\?\.\('cot'/);
  assert.match(src, /'file\.cot', 'Cotizacion'/);
  const { sb } = makeSandbox();
  sb.ArpaDocLang.set('en');
  assert.strictEqual(
    sb.ArpaDocLang.shareMessage('cot', { nombre: 'John', numero: 'COT-012', company: 'Acme Garage Doors' }),
    'Hi John, here is Estimate #COT-012 from Acme Garage Doors. Please review it and let us know if you have any questions.'
  );
  assert.strictEqual(sb.ArpaDocLang.shareMessage('cot', { numero: 'COT-012' }),
    'Hi there, here is Estimate #COT-012 from our company. Please review it and let us know if you have any questions.');
});

// ── Cuenta de Cobro / Invoice (jsPDF) ───────────────────────────────────────
function fakeJsPDF(record) {
  return function FakeDoc() {
    const doc = {
      internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
      text: (t) => { record.texts.push(...[].concat(t)); },
      splitTextToSize: (t) => [String(t)],
      save: (name) => { record.saved = name; },
      output: () => 'blob'
    };
    return new Proxy(doc, { get: (o, k) => (k in o ? o[k] : () => {}) });
  };
}

async function renderInvoice(docLang) {
  const ids = [
    'cc-numero', 'cc-ciudad', 'cc-fecha-emision', 'cc-fecha-vencimiento', 'cc-cliente-nombre', 'cc-cliente-doc',
    'cc-cliente-dir', 'cc-cliente-tel', 'cc-obs', 'cc-ret-pct', 'cc-pago-banco', 'cc-pago-numero', 'cc-pago-titular',
    'cc-pago-titular-doc', 'cc-pago-tipo'
  ].map((id) => h('input', { id }));
  ids.push(h('input', { id: 'cc-iva-check', type: 'checkbox' }));
  ids.push(h('input', { id: 'cc-ret-check', type: 'checkbox' }));
  const ctx = makeSandbox(ids);
  const record = { texts: [], saved: '' };
  ctx.sb.jspdf = { jsPDF: fakeJsPDF(record) };
  vm.runInContext(read('js/arpa-cuenta-cobro.js'), ctx.sb, { filename: 'arpa-cuenta-cobro.js' });
  ctx.store.arpa_cuenta_cobro_draft = JSON.stringify({
    numero: 'CC-0042', ciudad: 'Miami', fechaEmision: '2026-10-10', fechaVencimiento: '2026-10-25',
    clienteNombre: 'John Smith', clienteDoc: '55-1234567', clienteDir: '200 Ocean Dr', clienteTel: '3055550199',
    obs: 'Gate opener service', conIva: true, conRet: false, retPct: '11',
    pago: { bankName: 'Chase', accountNumber: '000123', accountHolder: 'Acme LLC', accountHolderDocument: '98-7654321', accountType: 'Corriente' },
    servicios: [{ desc: 'Gate opener repair', cant: 1, unit: 250 }]
  });
  ctx.sb.ArpaCuentaCobro.applyCcDraft();
  if (docLang === 'en') ctx.sb.ArpaDocLang.set('en');
  await ctx.sb.ArpaCuentaCobro.generarPDF();
  return { record, sb: ctx.sb };
}

test('Cuenta de Cobro con Español: textos de siempre', async () => {
  const { record, sb } = await renderInvoice('es');
  const all = record.texts.join('\n');
  for (const s of ['CUENTA DE COBRO', 'COBRADOR', 'CLIENTE', 'Emisión: 2026-10-10', 'Vence: 2026-10-25',
    'Descripción', 'V. Unit.', 'TOTAL A COBRAR', 'DATOS PARA CONSIGNACIÓN', 'Banco: Chase', 'Tipo: Corriente',
    'Observaciones', 'Firma cobrador', 'Firma cliente', 'NIT: 98-7654321']) {
    assert.ok(all.includes(s), 'falta "' + s + '"');
  }
  assert.match(record.saved, /^CuentaCobro_CC-0042_John_Smith\.pdf$/);
  assert.strictEqual(sb.ArpaI18n.getLang(), 'es');
});

test('Cuenta de Cobro con English: Invoice en inglés con fecha MM/DD/YYYY y Sales tax', async () => {
  const { record, sb } = await renderInvoice('en');
  const all = record.texts.join('\n');
  for (const s of ['INVOICE', 'FROM', 'BILL TO', 'Issued: 10/10/2026', 'Due: 10/25/2026', 'Description', 'Qty',
    'Unit Price', 'Amount', 'Subtotal', 'Sales tax 0%', 'TOTAL DUE', 'PAYMENT DETAILS', 'Bank: Chase',
    'Account type: Checking', 'Account holder: Acme LLC', 'Notes', 'Technician signature', 'Customer signature',
    'Tax ID: 98-7654321', 'Generated with ARPA Suite']) {
    assert.ok(all.includes(s), 'falta "' + s + '"');
  }
  for (const s of ['CUENTA DE COBRO', 'COBRADOR', 'TOTAL A COBRAR', 'CONSIGNACIÓN', 'Firma', 'Observaciones',
    'Emisión', 'Vence', 'Titular', 'Banco', 'NIT', 'Generado', 'derechos']) {
    assert.ok(!all.includes(s), 'quedó en español: "' + s + '"');
  }
  assert.match(record.saved, /^Invoice_CC-0042_John_Smith\.pdf$/);
  assert.strictEqual(sb.ArpaI18n.getLang(), 'es', 'la interfaz no cambia de idioma');
});

test('Configuración tiene el selector "Idioma del PDF para tu cliente" (Español por defecto)', () => {
  const html = read('index.html');
  const m = html.match(/<select id="settings-doc-lang">([\s\S]*?)<\/select>/);
  assert.ok(m, 'falta el selector en Configuración');
  assert.match(m[1], /<option value="es">Español<\/option>\s*<option value="en">English<\/option>/);
  assert.doesNotMatch(m[1], /selected/);
});

test('orden de trabajo en inglés: estado y unidades de materiales, y se restauran', () => {
  const opt = h('option', {}, 'Unidad');
  opt.setAttribute('value', 'Unidad');
  const view = h('div', { id: 'view-formato' }, '', [
    h('span', { id: 'formato-ot-badge', 'data-estado': 'BORRADOR' }, 'Borrador'),
    h('select', { class: 'ot-mat-unidad' }, '', [opt])
  ]);
  const { sb, document } = makeSandbox([view]);
  sb.ArpaOT = { estadoLabel: (e) => sb.ArpaI18n.t('ot.estado.' + String(e).toLowerCase()) };
  sb.ArpaDocLang.set('en');
  sb.ArpaI18n.preparePdfSpanish('view-formato');
  assert.strictEqual(document.getElementById('formato-ot-badge').textContent, 'Draft');
  assert.strictEqual(opt.textContent, 'Unit');
  assert.strictEqual(opt.getAttribute('value'), 'Unidad', 'el valor guardado no cambia');
  sb.ArpaI18n.restorePdfSpanish();
  assert.strictEqual(document.getElementById('formato-ot-badge').textContent, 'Borrador');
  assert.strictEqual(opt.textContent, 'Unidad');
});
