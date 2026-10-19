/**
 * App → nube: envío del catálogo (savecatalogo) y restauración (getcatalogo).
 * Corre los archivos reales arpa-oficios.js, arpa-mi-catalogo.js y arpa-cloud-sync.js
 * en un sandbox (vm) con fetch, temporizadores y DOM simulados.
 * node --test tests/catalogo-sync-app.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const LIC = 'ARPA-PRO-ZZZ999';

function memStorage(init) {
  const data = { ...(init || {}) };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
    data,
  };
}

function fakeDocument() {
  const listeners = {};
  const body = { children: [], appendChild(el) { this.children.push(el); el._parent = this; } };
  return {
    body,
    visibilityState: 'visible',
    listeners,
    addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
    dispatchEvent: () => true,
    getElementById: (id) => body.children.find((c) => c.id === id) || null,
    querySelectorAll: () => [],
    createElement: () => {
      const el = {
        id: '', textContent: '', style: {}, attrs: {},
        setAttribute(k, v) { this.attrs[k] = v; },
        remove() { if (this._parent) this._parent.children = this._parent.children.filter((c) => c !== this); },
      };
      return el;
    },
  };
}

/**
 * respuestas: lista de funciones/valores para cada fetch en orden; lo que sobra responde ok.
 */
function loadApp({ local, demo = false, respuestas = [] } = {}) {
  const timers = [];
  const fetchCalls = [];
  const document = fakeDocument();
  const winListeners = {};
  const sb = {
    console: { log() {}, warn() {}, error: console.error },
    localStorage: local,
    navigator: { language: 'es-MX' },
    location: { hostname: 'arpa.arpatechnologyglobal.com' },
    document,
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    addEventListener: (t, fn) => { (winListeners[t] = winListeners[t] || []).push(fn); },
    dispatchEvent: () => true,
    setTimeout: (fn, ms) => { const t = { fn, ms, id: timers.length + 1 }; timers.push(t); return t.id; },
    clearTimeout: (id) => { const i = timers.findIndex((t) => t.id === id); if (i >= 0) timers.splice(i, 1); },
    fetch: (url, init) => {
      const body = JSON.parse(init.body);
      fetchCalls.push({ url, body, keepalive: init.keepalive === true });
      const r = respuestas.length ? respuestas.shift() : null;
      if (r instanceof Error) return Promise.reject(r);
      const json = r || (body.accion === 'savecatalogo' ? { ok: true, count: body.productos.length } : { ok: true });
      return Promise.resolve({ json: () => Promise.resolve(json) });
    },
  };
  sb.window = sb;
  sb.globalThis = sb;
  sb.ArpaLicense = { isFounderLicense: () => false };
  sb.ArpaBrand = { isDemoMode: () => sb.__demo === true };
  sb.__demo = demo;
  vm.createContext(sb);
  vm.runInContext(read('js/arpa-oficios.js'), sb, { filename: 'arpa-oficios.js' });
  vm.runInContext(read('js/arpa-cloud-sync.js'), sb, { filename: 'arpa-cloud-sync.js' });
  vm.runInContext(read('js/arpa-mi-catalogo.js'), sb, { filename: 'arpa-mi-catalogo.js' });

  async function runTimers() {
    for (let k = 0; k < 30; k++) {
      await new Promise((r) => setImmediate(r));
      // El aviso se quita solo a los 6 s: ese temporizador no se corre aquí.
      const pending = timers.filter((t) => t.ms < 6000);
      pending.forEach((t) => { timers.splice(timers.indexOf(t), 1); t.fn(); });
    }
  }
  const saves = () => fetchCalls.filter((c) => c.body.accion === 'savecatalogo');
  const avisos = () => document.body.children.filter((c) => c.id === 'arpa-aviso-catalogo-nube');
  return { sb, timers, fetchCalls, saves, avisos, document, winListeners, runTimers };
}

function producto(id, oficioId, extra) {
  return { id, cod: id.toUpperCase(), nom: 'Producto ' + id, pvp: 100, unidad: 'unidad', marca: '', categoriaId: 'cat-' + oficioId, oficioId, ...extra };
}

function storageConCatalogos() {
  return memStorage({
    arpa_suite_license_code: LIC,
    arpa_active_oficios: JSON.stringify(['plomeria']),
    arpa_catalog_per_oficio_migrated_v1: 'true',
    arpa_catalog_plomeria: JSON.stringify([producto('p1', 'plomeria'), producto('p2', 'plomeria')]),
    arpa_categorias_plomeria: JSON.stringify([{ id: 'cat-plomeria', name: 'Tubería', oficioId: 'plomeria' }]),
    // Oficio inactivo con productos guardados (p. ej. el que se usó antes o en una demo).
    arpa_catalog_cctv: JSON.stringify([producto('c1', 'cctv')]),
    arpa_categorias_cctv: JSON.stringify([{ id: 'cat-cctv', name: 'Cámaras', oficioId: 'cctv' }]),
  });
}

test('se envían los productos de TODOS los oficios guardados, cada uno con su oficio', async () => {
  const app = loadApp({ local: storageConCatalogos() });
  const r = await app.sb.ArpaCloudSync.pushCatalogo();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(r)), { ok: true, count: 3 });
  const [save] = app.saves();
  assert.strictEqual(save.body.licencia, LIC);
  assert.deepStrictEqual(
    save.body.productos.map((p) => [p.id, p.oficioId, p.categoria]),
    [['p1', 'plomeria', 'Tubería'], ['p2', 'plomeria', 'Tubería'], ['c1', 'cctv', 'Cámaras']]
  );
  assert.strictEqual(app.avisos().length, 0);
});

test('modo demo: editar el catálogo no programa ni manda nada a la nube', async () => {
  const app = loadApp({ local: storageConCatalogos(), demo: true });
  app.sb.ArpaMiCatalogo.writeProductsRaw('plomeria', [producto('demo1', 'plomeria')]);
  await app.runTimers();
  assert.strictEqual(app.saves().length, 0);
  const r = await app.sb.ArpaCloudSync.pushCatalogo();
  assert.strictEqual(r.motivo, 'demo');
  assert.strictEqual(app.saves().length, 0);
});

test('respuesta ok:false: reintenta una vez y, si sigue fallando, muestra un aviso', async () => {
  const app = loadApp({
    local: storageConCatalogos(),
    respuestas: [{ ok: false, mensaje: 'x' }, { ok: false, mensaje: 'x' }],
  });
  const p = app.sb.ArpaCloudSync.pushCatalogo();
  await app.runTimers();
  const r = await p;
  assert.strictEqual(r.ok, false);
  assert.strictEqual(app.saves().length, 2, 'un envío + un reintento, no más');
  const avisos = app.avisos();
  assert.strictEqual(avisos.length, 1);
  assert.strictEqual(avisos[0].attrs.role, 'status');
  assert.match(avisos[0].textContent, /no se pudo respaldar en la nube/);
});

test('error de red y luego ok: el reintento lo guarda y no hay aviso', async () => {
  const app = loadApp({ local: storageConCatalogos(), respuestas: [new Error('Failed to fetch')] });
  const p = app.sb.ArpaCloudSync.pushCatalogo();
  await app.runTimers();
  const r = await p;
  assert.strictEqual(r.ok, true);
  assert.strictEqual(app.saves().length, 2);
  assert.strictEqual(app.avisos().length, 0);
});

test('catálogo vacío en el celular: no se manda una lista vacía', async () => {
  const local = memStorage({
    arpa_suite_license_code: LIC,
    arpa_active_oficios: JSON.stringify(['plomeria']),
    arpa_catalog_per_oficio_migrated_v1: 'true',
    arpa_catalog_ever_had_products: 'true',
  });
  const app = loadApp({ local });
  const r = await app.sb.ArpaCloudSync.pushCatalogo();
  assert.strictEqual(r.motivo, 'vacio');
  assert.strictEqual(app.saves().length, 0);
});

test('si la app se oculta con un envío pendiente, se manda de inmediato', async () => {
  const app = loadApp({ local: storageConCatalogos() });
  app.sb.ArpaMiCatalogo.writeProductsRaw('plomeria', [producto('p9', 'plomeria')]);
  assert.strictEqual(app.saves().length, 0, 'todavía esperando los 2 s');
  app.document.visibilityState = 'hidden';
  app.document.listeners.visibilitychange.forEach((fn) => fn());
  await new Promise((r) => setImmediate(r));
  assert.strictEqual(app.saves().length, 1);
  assert.strictEqual(app.saves()[0].keepalive, true, 'catálogo chico: va con keepalive');
  assert.ok(app.saves()[0].body.productos.some((p) => p.id === 'p9'));
  assert.ok(!app.timers.some((t) => t.ms === 2000), 'el temporizador se canceló');
  // pagehide sin nada pendiente no vuelve a enviar.
  app.winListeners.pagehide.forEach((fn) => fn());
  await new Promise((r) => setImmediate(r));
  assert.strictEqual(app.saves().length, 1);
});

test('getcatalogo: restaura cada producto en su oficio; filas viejas sin oficio van al activo', () => {
  const local = memStorage({
    arpa_suite_license_code: LIC,
    arpa_active_oficios: JSON.stringify(['plomeria']),
    arpa_catalog_per_oficio_migrated_v1: 'true',
    // Oficio ya sembrado: así la prueba ve solo lo restaurado (sin el catálogo base).
    arpa_oficios_seeded: JSON.stringify(['plomeria']),
  });
  const app = loadApp({ local });
  // La nube responde getcatalogo con dos oficios y una fila vieja sin oficio.
  const nube = [
    { id: 'p1', cod: 'P1', nom: 'Tubo', pvp: 10, unidad: 'metro', marca: '', categoria: 'Tubería', oficioId: 'plomeria' },
    { id: 'c1', cod: 'C1', nom: 'Cámara', pvp: 900, unidad: 'unidad', marca: 'H', categoria: 'Cámaras', oficioId: 'cctv' },
    { id: 'v1', cod: 'V1', nom: 'Viejo', pvp: 5, unidad: 'unidad', marca: '', categoria: 'General' },
  ];
  return (async () => {
    app.fetchCalls.length = 0;
    const respuestas = [{ ok: true, productos: nube }, { ok: true, entradas: [] }];
    app.sb.fetch = (url, init) => {
      app.fetchCalls.push({ body: JSON.parse(init.body) });
      return Promise.resolve({ json: () => Promise.resolve(respuestas.shift() || { ok: true }) });
    };
    const res = await app.sb.ArpaCloudSync.restoreCloudDataIfNeeded();
    assert.strictEqual(res.catalog, true);
    const plom = JSON.parse(local.data.arpa_catalog_plomeria);
    const cctv = JSON.parse(local.data.arpa_catalog_cctv);
    assert.deepStrictEqual(plom.map((p) => p.id), ['p1', 'v1']);
    assert.deepStrictEqual(cctv.map((p) => p.id), ['c1']);
    const catsCctv = JSON.parse(local.data.arpa_categorias_cctv);
    assert.strictEqual(catsCctv[0].name, 'Cámaras');
    assert.strictEqual(cctv[0].categoriaId, catsCctv[0].id);
    // Restaurar no dispara un envío de vuelta a la nube.
    await app.runTimers();
    assert.strictEqual(app.fetchCalls.filter((c) => c.body.accion === 'savecatalogo').length, 0);
  })();
});
