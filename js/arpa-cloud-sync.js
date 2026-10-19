/**
 * Respaldo en Google Sheets: catálogo e historial (POST JSON)
 *
 * v2 — Sincronización periódica real (no solo al vaciar localStorage)
 *
 * Cambios respecto a v1:
 *  - shouldSyncNow(): decide si es hora de sincronizar (cada 30 min o primera vez)
 *  - needsCatalogRestore() / needsHistorialRestore(): activan sync si está vacío O si toca sincronizar
 *  - applyHistorialFromCloud(): MERGE (nube + local) en vez de reemplazar
 *  - restoreCloudDataIfNeeded(): guarda timestamp después de cada sync exitoso
 *  - forceSyncFromCloud(): fuerza sync ignorando el timestamp (botón "Sincronizar ahora")
 *  - Evento DOM 'arpa:sync-complete' al terminar — la UI puede escucharlo para mostrar badge
 */
(function (global) {
  'use strict';

  const LICENSE_API = 'https://script.google.com/macros/s/AKfycbw9wGLhbqFUt6FxRs0iLu_4xDntE8l2a4Vpd3BsXZyddPbII03BtFG6TpH7IpEe5Z3F/exec';
  const LICENSE_CODE_KEY      = 'arpa_suite_license_code';
  const CATALOG_PRODUCTS_KEY  = 'arpa_catalogo_usuario';
  const CATALOG_CATEGORIES_KEY= 'arpa_categorias_usuario';
  const HISTORIAL_KEY         = 'arpa_suite_servicio_historial';

  // ── Timestamp de última sincronización ──────────────────────────────────
  const LAST_SYNC_KEY      = 'arpa_last_cloud_sync';
  const SYNC_INTERVAL_MS   = 30 * 60 * 1000; // 30 minutos

  function getLastSyncTime() {
    try { return parseInt(localStorage.getItem(LAST_SYNC_KEY) || '0', 10); }
    catch (e) { return 0; }
  }

  function setLastSyncTime() {
    try { localStorage.setItem(LAST_SYNC_KEY, Date.now().toString()); }
    catch (e) {}
  }

  /**
   * ¿Es hora de sincronizar con la nube?
   * Retorna true si:
   *   - Nunca se ha sincronizado en este dispositivo, o
   *   - Pasaron más de 30 minutos desde la última sincronización
   */
  function shouldSyncNow() {
    if (!hasActiveLicense()) return false;
    return (Date.now() - getLastSyncTime()) > SYNC_INTERVAL_MS;
  }

  // ── Licencia ─────────────────────────────────────────────────────────────

  function getLicenseCode() {
    if (global.ArpaLabDemo && typeof global.ArpaLabDemo.isActive === 'function' && global.ArpaLabDemo.isActive()) {
      return '';
    }
    try { return (localStorage.getItem(LICENSE_CODE_KEY) || '').trim().toUpperCase(); }
    catch (e) { return ''; }
  }

  function hasActiveLicense() {
    return !!getLicenseCode();
  }

  // ── HTTP ──────────────────────────────────────────────────────────────────

  // El navegador solo acepta keepalive (envío que sigue aunque se cierre la app) si el
  // cuerpo pesa menos de 64 KB; se deja margen.
  const KEEPALIVE_MAX_BYTES = 60000;

  function postJson(payload, opts) {
    // Fuera del dominio de producción (LAB, localhost, red local) no se llama al servidor.
    if (global.location?.hostname !== 'arpa.arpatechnologyglobal.com') {
      return Promise.reject(new Error('network'));
    }
    const body = JSON.stringify(payload);
    const init = {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body
    };
    if (opts && opts.keepalive && body.length < KEEPALIVE_MAX_BYTES) init.keepalive = true;
    return fetch(LICENSE_API, init).then((res) => res.json());
  }

  // ── Catálogo local ────────────────────────────────────────────────────────

  function collectLocalCatalogProducts() {
    const collected = global.ArpaMiCatalogo?.collectProductsForCloud?.();
    return Array.isArray(collected) ? collected : [];
  }

  function isLocalCatalogEmpty() {
    if (typeof global.ArpaMiCatalogo?.isLocalCatalogEmpty === 'function') {
      return global.ArpaMiCatalogo.isLocalCatalogEmpty();
    }
    return collectLocalCatalogProducts().length === 0;
  }

  // ── Push catálogo → nube ──────────────────────────────────────────────────

  let catalogSyncTimer = null;
  let suppressCatalogSync = false;
  let catalogPushSeq = 0;
  const CATALOG_RETRY_MS = 4000;
  const CATALOG_AVISO_MS = 6000;

  // Modo demo (se muestra la app a un cliente con otro oficio): nada del catálogo sube a la
  // nube, para no reemplazar la copia de la empresa real con el catálogo de la demo.
  function isDemoModeActive() {
    return global.ArpaBrand?.isDemoMode?.() === true;
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function sendCatalogoOnce(licencia, productos, opts) {
    return postJson({ accion: 'savecatalogo', licencia, productos }, opts)
      .then((res) => (res && res.ok === true
        ? { ok: true, count: res.count }
        : { ok: false, mensaje: (res && res.mensaje) || 'Respuesta inválida del servidor.' }))
      .catch((err) => ({ ok: false, mensaje: (err && err.message) || 'network' }));
  }

  function mostrarAvisoCatalogo() {
    const doc = global.document;
    if (!doc || !doc.body || typeof doc.createElement !== 'function') return null;
    const texto = global.ArpaI18n?.t?.('aviso.catalogo.nube_no_guardada');
    const msg = texto && texto !== 'aviso.catalogo.nube_no_guardada'
      ? texto
      : 'El catálogo quedó guardado en este celular, pero no se pudo respaldar en la nube. Se intentará de nuevo en el próximo cambio.';
    const anterior = doc.getElementById?.('arpa-aviso-catalogo-nube');
    if (anterior) anterior.remove();
    const el = doc.createElement('div');
    el.id = 'arpa-aviso-catalogo-nube';
    el.setAttribute('role', 'status');
    el.textContent = msg;
    el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);' +
      'max-width:min(92vw,420px);background:#0f2044;color:#fff;padding:10px 16px;border-radius:8px;' +
      'font:500 13px system-ui,sans-serif;line-height:1.35;text-align:center;z-index:99999;' +
      'box-shadow:0 4px 12px rgba(0,0,0,.25);';
    doc.body.appendChild(el);
    setTimeout(() => { el.remove(); }, CATALOG_AVISO_MS);
    return el;
  }

  /**
   * Envía el catálogo completo (todos los oficios guardados en el celular).
   * Si falla (sin red o el servidor responde ok:false) reintenta UNA vez; si vuelve a
   * fallar muestra un aviso discreto. Devuelve { ok, count } o { ok:false, motivo|mensaje }.
   */
  function pushCatalogo(opts) {
    const licencia = getLicenseCode();
    if (!licencia) return Promise.resolve({ ok: false, motivo: 'sin_licencia' });
    if (isDemoModeActive()) return Promise.resolve({ ok: false, motivo: 'demo' });
    const productos = collectLocalCatalogProducts();
    if (productos.length) {
      global.ArpaMiCatalogo?.markEverHadProducts?.();
    } else {
      // El servidor ya no acepta una lista vacía (borraría la copia); no se envía.
      return Promise.resolve({ ok: false, motivo: 'vacio' });
    }
    const seq = ++catalogPushSeq;
    return sendCatalogoOnce(licencia, productos, opts).then((r1) => {
      if (r1.ok) return r1;
      console.warn('[arpa-cloud-sync] savecatalogo', r1.mensaje);
      return wait(CATALOG_RETRY_MS).then(() => {
        // Si mientras tanto salió un envío más nuevo, ese lleva los datos al día.
        if (seq !== catalogPushSeq) return { ok: false, motivo: 'reemplazado' };
        return sendCatalogoOnce(licencia, productos, opts).then((r2) => {
          if (r2.ok) return r2;
          console.warn('[arpa-cloud-sync] savecatalogo (reintento)', r2.mensaje);
          if (seq === catalogPushSeq) mostrarAvisoCatalogo();
          return r2;
        });
      });
    });
  }

  function scheduleCatalogCloudSync() {
    if (suppressCatalogSync) return;
    if (isDemoModeActive()) return;
    if (catalogSyncTimer) clearTimeout(catalogSyncTimer);
    catalogSyncTimer = setTimeout(() => {
      catalogSyncTimer = null;
      pushCatalogo();
    }, 2000);
  }

  /** Si hay un envío esperando el temporizador, lo manda ya (la app se va a segundo plano). */
  function flushCatalogCloudSync() {
    if (!catalogSyncTimer) return null;
    clearTimeout(catalogSyncTimer);
    catalogSyncTimer = null;
    return pushCatalogo({ keepalive: true });
  }

  if (global.document && typeof global.document.addEventListener === 'function') {
    global.document.addEventListener('visibilitychange', () => {
      if (global.document.visibilityState === 'hidden') flushCatalogCloudSync();
    });
  }
  if (typeof global.addEventListener === 'function') {
    global.addEventListener('pagehide', () => { flushCatalogCloudSync(); });
  }

  // ── Push historial → nube ─────────────────────────────────────────────────

  let suppressHistorialSync = false;

  function stripBase64(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj.map((item) =>
        (typeof item === 'string' && item.startsWith('data:')) ? null : stripBase64(item)
      );
    }
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string' && v.startsWith('data:')) {
        result[k] = null;
      } else if (v && typeof v === 'object') {
        result[k] = stripBase64(v);
      } else {
        result[k] = v;
      }
    }
    return result;
  }

  function recordToCloudEntry(record) {
    const entry = {
      id: record.id,
      tipo: record.documento || record.tipo || '',
      subtipo: record.subtipo || '',
      numero: record.numeroServicio || record.numero || '',
      cliente: record.cliente || '',
      ciudad: record.ciudad || '',
      fecha: record.fecha || '',
      monto: record.total != null ? record.total : '',
      concepto: record.concepto || ''
    };
    if (record.fullSnapshot) {
      try {
        entry.fullSnapshot = JSON.stringify(stripBase64(record.fullSnapshot));
      } catch (e) {}
    }
    return entry;
  }

  function pushHistorialEntry(record) {
    if (suppressHistorialSync || !record) return Promise.resolve();
    const licencia = getLicenseCode();
    if (!licencia) return Promise.resolve();
    return postJson({
      accion: 'savehistorialentry',
      licencia,
      entrada: recordToCloudEntry(record)
    }).catch((err) => {
      console.warn('[arpa-cloud-sync] savehistorialentry', err);
    });
  }

  function deleteHistorialEntry(entradaId) {
    if (suppressHistorialSync || !entradaId) return Promise.resolve();
    const licencia = getLicenseCode();
    if (!licencia) return Promise.resolve();
    return postJson({
      accion: 'deletehistorialentry',
      licencia,
      entradaId
    }).catch((err) => {
      console.warn('[arpa-cloud-sync] deletehistorialentry', err);
    });
  }

  // ── Conversión nube → registro local ──────────────────────────────────────

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function inferModuloFromTipo(tipo) {
    const t = String(tipo || '').toLowerCase();
    if (t.includes('cuenta')) return 'cuenta-cobro';
    if (t.includes('cotiz')) return 'cotizacion';
    return 'formato';
  }

  function cloudEntryToRecord(entry) {
    const tipo = entry.tipo || '';
    const modulo = inferModuloFromTipo(tipo);
    const monto = entry.monto;
    const record = {
      id: entry.id || newId(),
      modulo,
      documento: tipo,
      tipo,
      subtipo: entry.subtipo || '',
      numero: entry.numero || '',
      numeroServicio: entry.numero || '',
      cliente: entry.cliente || '',
      ciudad: entry.ciudad || '',
      fecha: entry.fecha || '',
      savedAt: new Date().toISOString()
    };
    if (entry.concepto) record.concepto = String(entry.concepto);
    if (monto !== '' && monto != null && !Number.isNaN(Number(monto))) {
      record.total = Number(monto);
    }
    if (entry.fullSnapshot) {
      try {
        record.fullSnapshot = typeof entry.fullSnapshot === 'string'
          ? JSON.parse(entry.fullSnapshot)
          : entry.fullSnapshot;
      } catch (e) {}
    }
    return record;
  }

  // ── ¿Hay que sincronizar? ─────────────────────────────────────────────────

  /**
   * ANTES (v1): solo restauraba si localStorage estaba vacío.
   * AHORA (v2): también restaura si pasaron más de 30 min desde la última sync.
   * Esto garantiza que un técnico que abre la app en un segundo dispositivo
   * reciba los datos del primer dispositivo.
   */
  function needsCatalogRestore() {
    if (!hasActiveLicense()) return false;
    return isLocalCatalogEmpty();
  }

  function needsHistorialRestore() {
    if (!hasActiveLicense()) return false;
    try {
      const data = JSON.parse(localStorage.getItem(HISTORIAL_KEY) || '[]');
      if (!Array.isArray(data) || data.length === 0) return true; // vacío → siempre
      return shouldSyncNow();                                      // con datos → si toca
    } catch (e) {
      return true;
    }
  }

  // ── Aplicar datos de la nube al dispositivo ───────────────────────────────

  function applyCatalogFromCloud(productos) {
    if (!Array.isArray(productos) || !productos.length) return false;
    if (!isLocalCatalogEmpty()) return false;

    const activeOficioId = global.ArpaMiCatalogo?.getActiveOficioId?.()
      || global.ArpaOficios?.normalizeOficioId?.(null)
      || 'automatismos';

    // Cada producto vuelve a su oficio (columna Oficio). Las filas viejas sin oficio
    // van al oficio activo, como antes.
    function oficioDe(p) {
      const raw = String(p?.oficioId || p?.oficio || '').trim();
      if (!raw) return activeOficioId;
      return global.ArpaOficios?.normalizeOficioId?.(raw) || raw;
    }

    const porOficio = new Map();
    function grupo(oficioId) {
      if (!porOficio.has(oficioId)) porOficio.set(oficioId, { categories: [], products: [], catKeyToId: new Map() });
      return porOficio.get(oficioId);
    }

    function ensureCategory(g, oficioId, name) {
      const label = String(name || 'General').trim() || 'General';
      const key = oficioId + '::' + label.toLowerCase();
      if (g.catKeyToId.has(key)) return g.catKeyToId.get(key);
      const cat = { id: newId(), name: label, oficioId };
      g.categories.push(cat);
      g.catKeyToId.set(key, cat.id);
      return cat.id;
    }

    productos.forEach((p) => {
      const oficioId = oficioDe(p);
      const g = grupo(oficioId);
      g.products.push({
        id: p.id || newId(),
        cod: String(p.cod || '').trim(),
        nom: String(p.nom || '').trim(),
        pvp: Number(p.pvp) || 0,
        unidad: String(p.unidad || 'unidad').trim() || 'unidad',
        marca: String(p.marca || '').trim(),
        categoriaId: ensureCategory(g, oficioId, p.categoria),
        oficioId
      });
    });

    if (!porOficio.size) return false;

    suppressCatalogSync = true;
    try {
      if (typeof global.ArpaMiCatalogo?.writeCategoriesRaw === 'function') {
        porOficio.forEach((g, oficioId) => {
          global.ArpaMiCatalogo.writeCategoriesRaw(oficioId, g.categories);
          global.ArpaMiCatalogo.writeProductsRaw(oficioId, g.products);
        });
      } else {
        const all = [...porOficio.values()];
        localStorage.setItem(CATALOG_CATEGORIES_KEY, JSON.stringify(all.flatMap((g) => g.categories)));
        localStorage.setItem(CATALOG_PRODUCTS_KEY, JSON.stringify(all.flatMap((g) => g.products)));
      }
      global.ArpaCatalogo?.invalidateListaCache?.();
      global.ArpaCotizacion?.updateCatalogHint?.();
      global.ArpaMiCatalogo?.refreshView?.();
      return true;
    } catch (e) {
      console.warn('[arpa-cloud-sync] applyCatalogFromCloud', e);
      return false;
    } finally {
      suppressCatalogSync = false;
    }
  }

  /**
   * ANTES (v1): reemplazaba el historial local con el de la nube.
   * AHORA (v2): FUSIONA nube + local.
   *
   * Estrategia:
   *   1. Base = registros de la NUBE (son los confirmados/definitivos)
   *   2. Se agregan registros LOCALES que la nube no tiene (creados offline)
   *   3. Si el mismo ID existe en ambos → la nube gana
   *   4. Resultado ordenado por fecha (más reciente primero)
   *
   * Esto preserva entradas creadas sin conexión y descarta entradas que
   * fueron eliminadas desde otro dispositivo (no están en la nube).
   */
  function applyHistorialFromCloud(entradas) {
    if (!Array.isArray(entradas) || !entradas.length) return false;

    // Convertir entradas de la nube a formato local
    const cloudRecords = entradas.map(cloudEntryToRecord);

    // Leer registros locales actuales
    let localRecords = [];
    try {
      localRecords = JSON.parse(localStorage.getItem(HISTORIAL_KEY) || '[]');
      if (!Array.isArray(localRecords)) localRecords = [];
    } catch (e) {}

    // Construir mapa: nube es la base (autoridad)
    const merged = new Map();
    cloudRecords.forEach((r) => merged.set(r.id, r));

    // Agregar registros locales que la nube no tiene (offline-created)
    localRecords.forEach((r) => {
      if (r.id && !merged.has(r.id)) merged.set(r.id, r);
    });

    // Ordenar: más reciente primero
    const records = Array.from(merged.values()).sort((a, b) => {
      const dateA = a.savedAt || a.fecha || '';
      const dateB = b.savedAt || b.fecha || '';
      return dateB.localeCompare(dateA);
    });

    suppressHistorialSync = true;
    try {
      localStorage.setItem(HISTORIAL_KEY, JSON.stringify(records));
      global.ArpaHistorial?.render?.();
      return true;
    } catch (e) {
      console.warn('[arpa-cloud-sync] applyHistorialFromCloud', e);
      return false;
    } finally {
      suppressHistorialSync = false;
    }
  }

  // ── Sincronización al abrir la app ────────────────────────────────────────

  /**
   * ANTES (v1): corría y listo, sin marcar cuándo se ejecutó.
   * AHORA (v2): guarda el timestamp al terminar, dispara evento DOM.
   */
  function restoreCloudDataIfNeeded() {
    const licencia = getLicenseCode();
    if (!licencia) return Promise.resolve({ catalog: false, historial: false });

    const tasks = [];

    if (needsCatalogRestore()) {
      tasks.push(
        postJson({ accion: 'getcatalogo', licencia })
          .then((data) => {
            if (!data?.ok || !data.productos?.length) return false;
            return applyCatalogFromCloud(data.productos);
          })
          .catch((err) => {
            console.warn('[arpa-cloud-sync] getcatalogo', err);
            return false;
          })
      );
    } else {
      tasks.push(Promise.resolve(false));
    }

    if (needsHistorialRestore()) {
      tasks.push(
        postJson({ accion: 'gethistorial', licencia })
          .then((data) => {
            if (!data?.ok || !data.entradas?.length) return false;
            return applyHistorialFromCloud(data.entradas);
          })
          .catch((err) => {
            console.warn('[arpa-cloud-sync] gethistorial', err);
            return false;
          })
      );
    } else {
      tasks.push(Promise.resolve(false));
    }

    return Promise.all(tasks).then(([catalog, historial]) => {
      // Marcar timestamp de sincronización exitosa
      setLastSyncTime();
      // Notificar a la UI (para mostrar badge "Sincronizado")
      try {
        document.dispatchEvent(new CustomEvent('arpa:sync-complete', {
          detail: { catalog, historial, timestamp: Date.now() }
        }));
      } catch (e) {}
      return { catalog, historial };
    });
  }

  /**
   * Fuerza una sincronización inmediata, ignorando el intervalo de 30 min.
   * Para usar desde el botón "Sincronizar ahora" en Configuración.
   */
  function forceSyncFromCloud() {
    try { localStorage.removeItem(LAST_SYNC_KEY); } catch (e) {}
    return restoreCloudDataIfNeeded();
  }

  // ── Catálogo Base Maestro ──────────────────────────────────────────────────

  function getCatalogoBase() {
    const licencia = getLicenseCode();
    if (!licencia) return Promise.resolve({ ok: false, mensaje: 'Sin licencia.' });
    return postJson({ accion: 'getcatalogobase', licencia })
      .catch((err) => {
        console.warn('[arpa-cloud-sync] getCatalogoBase', err);
        return { ok: false, mensaje: 'Error de red.' };
      });
  }

  // ── Numeración ─────────────────────────────────────────────────────────────

  function obtenerSiguienteNumeroCloud(tipo, clienteUltimo) {
    const licencia = getLicenseCode();
    if (!licencia) return Promise.resolve(null);
    return postJson({ accion: 'siguientenumero', licencia, tipo, clienteUltimo })
      .then((res) => (res && res.ok ? res.numero : null))
      .catch((err) => {
        console.warn('[arpa-cloud-sync] siguientenumero', err);
        return null;
      });
  }

  // ── API pública ────────────────────────────────────────────────────────────

  global.ArpaCloudSync = {
    LICENSE_API,
    postJson,
    // Push (local → nube)
    pushCatalogo,
    scheduleCatalogCloudSync,
    flushCatalogCloudSync,
    pushHistorialEntry,
    deleteHistorialEntry,
    // Pull (nube → local)
    restoreCloudDataIfNeeded,
    forceSyncFromCloud,          // ← NUEVO
    // Helpers de estado
    needsCatalogRestore,
    needsHistorialRestore,
    shouldSyncNow,               // ← NUEVO (lo usa arpa-brand.js)
    getLastSyncTime,             // ← NUEVO
    // Catálogo base maestro
    getCatalogoBase,
    // Numeración
    obtenerSiguienteNumeroCloud
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { stripBase64 };
  }
})(typeof window !== 'undefined' ? window : globalThis);
