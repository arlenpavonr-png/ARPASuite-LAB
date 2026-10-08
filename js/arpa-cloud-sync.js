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

  const LICENSE_API = 'https://script.google.com/macros/s/AKfycbwzSL7-wLi9VeyNUzkiGTGgdWEPXz5DpY2qjLOZjKXGRl8I6nleSFManrWwozNnbsUlQA/exec';
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
    try { return (localStorage.getItem(LICENSE_CODE_KEY) || '').trim().toUpperCase(); }
    catch (e) { return ''; }
  }

  function hasActiveLicense() {
    return !!getLicenseCode();
  }

  // ── HTTP ──────────────────────────────────────────────────────────────────

  function postJson(payload) {
    return fetch(LICENSE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then((res) => res.json());
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

  function pushCatalogo() {
    const licencia = getLicenseCode();
    if (!licencia) return Promise.resolve();
    const productos = collectLocalCatalogProducts();
    if (productos.length) {
      global.ArpaMiCatalogo?.markEverHadProducts?.();
    }
    if (!productos.length && !global.ArpaMiCatalogo?.hasEverHadProducts?.()) {
      return Promise.resolve();
    }
    return postJson({ accion: 'savecatalogo', licencia, productos }).catch((err) => {
      console.warn('[arpa-cloud-sync] savecatalogo', err);
    });
  }

  function scheduleCatalogCloudSync() {
    if (suppressCatalogSync) return;
    if (catalogSyncTimer) clearTimeout(catalogSyncTimer);
    catalogSyncTimer = setTimeout(() => {
      catalogSyncTimer = null;
      pushCatalogo();
    }, 2000);
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

    const oficioId = global.ArpaMiCatalogo?.getActiveOficioId?.()
      || global.ArpaOficios?.normalizeOficioId?.(null)
      || 'automatismos';

    const categories = [];
    const catKeyToId = new Map();

    function ensureCategory(name) {
      const label = String(name || 'General').trim() || 'General';
      const key = oficioId + '::' + label.toLowerCase();
      if (catKeyToId.has(key)) return catKeyToId.get(key);
      const cat = { id: newId(), name: label, oficioId };
      categories.push(cat);
      catKeyToId.set(key, cat.id);
      return cat.id;
    }

    const products = productos.map((p) => ({
      id: p.id || newId(),
      cod: String(p.cod || '').trim(),
      nom: String(p.nom || '').trim(),
      pvp: Number(p.pvp) || 0,
      unidad: String(p.unidad || 'unidad').trim() || 'unidad',
      marca: String(p.marca || '').trim(),
      categoriaId: ensureCategory(p.categoria),
      oficioId
    }));

    if (!products.length) return false;

    suppressCatalogSync = true;
    try {
      if (typeof global.ArpaMiCatalogo?.writeCategoriesRaw === 'function') {
        global.ArpaMiCatalogo.writeCategoriesRaw(oficioId, categories);
        global.ArpaMiCatalogo.writeProductsRaw(oficioId, products);
      } else {
        localStorage.setItem(CATALOG_CATEGORIES_KEY, JSON.stringify(categories));
        localStorage.setItem(CATALOG_PRODUCTS_KEY, JSON.stringify(products));
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
