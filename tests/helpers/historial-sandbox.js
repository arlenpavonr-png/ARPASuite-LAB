/**
 * Entorno falso para cargar numeración + historial + nube sin navegador ni red.
 * El servidor es una función que decide qué responde cada pedido (o lanza para simular sin conexión).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const cloudCode = read('js/arpa-cloud-sync.js');

function crearElemento(id) {
  const listeners = {};
  return {
    id,
    listeners,
    hidden: false,
    innerHTML: '',
    textContent: '',
    value: '',
    style: {},
    setAttribute() {},
    remove() {},
    querySelectorAll: () => [],
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); }
  };
}

const TEXTOS = {
  'hist.empty': 'Aún no hay servicios en el historial.<br>Guarde un formato como PDF para registrar el primer servicio.',
  'hist.no_results': 'No se encontraron resultados.'
};

/**
 * opts.servidor(payload) → objeto de respuesta | lanza Error (sin red)
 * opts.store: localStorage inicial
 */
function crearApp(opts) {
  const store = Object.assign({}, (opts && opts.store) || {});
  const enviados = [];
  const alertas = [];
  const elementos = {};
  const listeners = {};
  const estado = { servidor: (opts && opts.servidor) || (() => { throw new Error('offline'); }) };

  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    Date, Math, JSON, Number, String, Array, Object, RegExp, Error, Map, Set, Promise,
    isNaN, parseInt, parseFloat, setTimeout, clearTimeout,
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    },
    // Se simula el dominio de producción tomándolo del propio código (fetch es falso: no hay red).
    location: { hostname: cloudCode.match(/hostname !== '([^']+)'/)[1] },
    navigator: { onLine: true },
    CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; },
    alert: (m) => alertas.push(String(m)),
    scrollTo() {},
    document: {
      readyState: 'complete',
      getElementById: (id) => {
        if (!elementos[id] && (id === 'historial-list' || id === 'historial-empty' ||
          id === 'historial-buscar' || id === 'hist-stat-total-n' || id === 'hist-stat-mes-n' || id === 'hist-stat-cot-mes')) {
          elementos[id] = crearElemento(id);
        }
        return elementos[id] || null;
      },
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => crearElemento(''),
      body: { appendChild() {} },
      addEventListener() {},
      dispatchEvent() {}
    },
    addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
    fetch: (url, init) => {
      const payload = JSON.parse(init.body);
      enviados.push(payload);
      return new Promise((resolve, reject) => {
        let respuesta;
        try {
          respuesta = estado.servidor(payload);
        } catch (e) {
          reject(new TypeError('Failed to fetch'));
          return;
        }
        const texto = typeof respuesta === 'string' ? respuesta : JSON.stringify(respuesta);
        resolve({ ok: true, status: 200, text: () => Promise.resolve(texto), json: () => Promise.resolve(JSON.parse(texto)) });
      });
    },
    ArpaI18n: { t: (k) => (TEXTOS[k] != null ? TEXTOS[k] : k) },
    ArpaCotizacion: { getCotItemLabels: () => ['Motor corredizo'], getFilas: () => [], loadCotizacion() {} }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  ['js/arpa-numeracion.js', 'js/arpa-historial.js', 'js/arpa-cloud-sync.js'].forEach((rel) => {
    vm.runInContext(read(rel), sandbox, { filename: rel });
  });

  return {
    sandbox,
    store,
    enviados,
    alertas,
    elementos,
    set servidor(fn) { estado.servidor = fn; },
    historial: () => JSON.parse(store.arpa_suite_servicio_historial || '[]'),
    disparar: (type) => (listeners[type] || []).forEach((fn) => fn()),
    N: sandbox.ArpaNumeracion,
    H: sandbox.ArpaHistorial,
    C: sandbox.ArpaCloudSync
  };
}

/** Espera a que terminen las promesas pendientes (fetch falso + .then encadenados). */
function esperar() {
  return new Promise((r) => setTimeout(r, 20));
}

module.exports = { crearApp, esperar };
