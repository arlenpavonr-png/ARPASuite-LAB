/**
 * Respaldo completo en la nube (Google Drive del dueño, vía Apps Script de licencias).
 *
 * Suite: copia todos los datos de la app (historial con detalle, clientes, catálogos,
 * empresa, numeración) en "suite-ultimo.json" y una copia por día "suite-AAAA-MM-DD.json".
 * NEXT usa post() para subir sus propios archivos.
 * Solo para licencias pagas o fundador. Nunca en la demo del LAB.
 */
(function (global) {
  'use strict';

  const FORMAT = 'arpa-suite-respaldo';
  const VERSION = 1;
  const LICENSE_CODE_KEY = 'arpa_suite_license_code';
  const STATE_KEY = 'arpa_respaldo_nube_estado';
  // Datos propios de este celular o de la licencia: no se copian ni se pisan al restaurar.
  const EXCLUDE = /^(arpa_suite_license_|arpa_suite_had_paid_license$|arpa_suite_device_id$|arpa_last_cloud_sync$|arpa_lab_demo$|arpa_respaldo_|arpa_next_|arpa_trial_|arpa_install_banner)/;
  const MIN_INTERVAL_MS = 10 * 60 * 1000;
  const DEVICE_KEY = 'arpa_suite_device_id';
  const OWN_DEVICE_KEY = 'arpa_respaldo_dispositivo';

  function storage() {
    try { return global.localStorage; } catch (e) { return null; }
  }

  function licenseCode() {
    try { return String(storage()?.getItem(LICENSE_CODE_KEY) || '').trim().toUpperCase(); } catch (e) { return ''; }
  }

  function isLabDemo() {
    try {
      if (global.ArpaLabDemo?.isActive?.()) return true;
      const host = String(global.location?.hostname || '');
      const local = /^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)$/.test(host);
      return local && global.sessionStorage?.getItem('arpa_lab_demo') === '1';
    } catch (e) {
      return false;
    }
  }

  /** ¿Este celular puede subir respaldos? */
  function enabled() {
    const code = licenseCode();
    if (!code || code.indexOf('ARPA-FREE-') === 0) return false;
    if (isLabDemo()) return false;
    return typeof global.ArpaCloudSync?.postJson === 'function';
  }

  function post(accion, extra) {
    if (!enabled()) return Promise.resolve({ ok: false, mensaje: 'Respaldo en la nube no disponible.' });
    return global.ArpaCloudSync.postJson({ accion, licencia: licenseCode(), ...(extra || {}) })
      .catch((err) => ({ ok: false, mensaje: String(err?.message || err) }));
  }

  /**
   * Identificador corto de este celular: cada celular guarda sus propios archivos,
   * así un celular nuevo (o con los datos borrados) nunca pisa la copia buena de otro.
   */
  function deviceTag() {
    const s = storage();
    let id = '';
    try { id = String(s?.getItem(DEVICE_KEY) || s?.getItem(OWN_DEVICE_KEY) || ''); } catch (e) { id = ''; }
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      try { s?.setItem(OWN_DEVICE_KEY, id); } catch (e) { /* ignore */ }
    }
    return id.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'equipo';
  }

  function readState() {
    try { return JSON.parse(storage()?.getItem(STATE_KEY) || '{}') || {}; } catch (e) { return {}; }
  }

  function writeState(patch) {
    try { storage()?.setItem(STATE_KEY, JSON.stringify({ ...readState(), ...patch })); } catch (e) { /* ignore */ }
  }

  function hoy(now) {
    const d = now || new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function hash(text) {
    let h = 0;
    for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) | 0;
    return text.length + ':' + h;
  }

  /** Copia de los datos de la suite guardados en este celular. */
  function snapshotSuite(store, now) {
    const s = store || storage();
    const keys = {};
    if (s) {
      for (let i = 0; i < s.length; i += 1) {
        const k = s.key(i);
        if (!k || k.indexOf('arpa') !== 0 || EXCLUDE.test(k)) continue;
        keys[k] = s.getItem(k);
      }
    }
    return { format: FORMAT, version: VERSION, exportedAt: (now || new Date()).toISOString(), keys };
  }

  /** Valida y escribe una copia de la suite en este celular. No toca la licencia. */
  function restoreSuite(text, store) {
    let obj;
    try { obj = JSON.parse(String(text || '')); } catch (e) { obj = null; }
    if (!obj || obj.format !== FORMAT || !obj.keys || typeof obj.keys !== 'object') {
      throw new Error('El archivo no es un respaldo de ARPA Suite.');
    }
    const s = store || storage();
    let n = 0;
    for (const [k, v] of Object.entries(obj.keys)) {
      if (k.indexOf('arpa') !== 0 || EXCLUDE.test(k) || typeof v !== 'string') continue;
      s.setItem(k, v);
      n += 1;
    }
    return { keys: n, exportedAt: obj.exportedAt || '' };
  }

  const SERVER_RETRY_MS = 20 * 60 * 1000;

  /**
   * ¿El servidor ya sabe guardar respaldos? Se pregunta con una consulta pequeña
   * antes de mandar copias grandes; si no, se espera 20 minutos para volver a probar
   * (o se prueba ya mismo con force, p. ej. al tocar "Guardar copia ahora").
   */
  function serverReady(now, force) {
    const t = (now || new Date()).getTime();
    const st = readState();
    if (st.serverOkAt && t - st.serverOkAt < 24 * 60 * 60 * 1000) return Promise.resolve(true);
    if (!force && st.serverFailAt && t - st.serverFailAt < SERVER_RETRY_MS) return Promise.resolve(false);
    return post('respaldolistar', { app: 'suite' }).then((r) => {
      if (r?.ok) writeState({ serverOkAt: t, serverFailAt: 0 });
      else writeState({ serverFailAt: t, serverError: String(r?.mensaje || 'sin respuesta').slice(0, 160), suiteError: r?.mensaje || 'La nube aún no está lista.' });
      return !!r?.ok;
    });
  }

  let running = null;

  /**
   * Sube la copia de la suite si cambió (máximo cada 10 min) y una vez al día la copia diaria.
   * @returns {Promise<{ok: boolean, skipped?: string}>}
   */
  function backupSuite(options) {
    const o = options || {};
    if (!enabled()) return Promise.resolve({ ok: false, skipped: 'sin_licencia' });
    if (running) return running;
    const now = o.now || new Date();
    const state = readState();
    const snap = snapshotSuite(null, now);
    const text = JSON.stringify(snap);
    const h = hash(JSON.stringify(snap.keys));
    const day = hoy(now);
    const changed = h !== state.suiteHash;
    const needDaily = state.suiteDia !== day;
    if (!o.force && !changed && !needDaily) return Promise.resolve({ ok: true, skipped: 'sin_cambios' });
    if (!o.force && changed && !needDaily && now.getTime() - (state.suiteAt || 0) < MIN_INTERVAL_MS) {
      return Promise.resolve({ ok: true, skipped: 'reciente' });
    }
    const base = 'suite-' + deviceTag();
    running = serverReady(now, !!o.force)
      .then((ready) => (ready
        ? post('respaldoguardar', { app: 'suite', nombre: base + '-ultimo.json', contenido: text })
        : { ok: false, mensaje: 'La nube aún no está lista.', skippedServer: true }))
      .then((r) => {
        if (r?.skippedServer) return r;
        if (!r?.ok) return r || { ok: false };
        if (!needDaily) return r;
        return post('respaldoguardar', { app: 'suite', nombre: base + '-' + day + '.json', contenido: text });
      })
      .then((r) => {
        if (r?.ok) writeState({ suiteHash: h, suiteAt: now.getTime(), suiteDia: day, suiteOk: now.toISOString() });
        else if (!r?.skippedServer) writeState({ suiteError: r?.mensaje || 'error', suiteErrorAt: now.toISOString() });
        return r || { ok: false };
      })
      .finally(() => { running = null; });
    return running;
  }

  /** Programa respaldos automáticos de la suite mientras la app está abierta. */
  function startAutoSuite() {
    if (global.__arpaRespaldoAuto) return;
    global.__arpaRespaldoAuto = true;
    const run = () => { backupSuite().catch(() => {}); };
    setTimeout(run, 15000);
    setInterval(run, MIN_INTERVAL_MS);
    global.document?.addEventListener?.('visibilitychange', () => {
      if (global.document.visibilityState === 'hidden') run();
    });
  }

  function status() {
    return { enabled: enabled(), ...readState() };
  }

  global.ArpaRespaldoNube = {
    FORMAT,
    enabled,
    post,
    snapshotSuite,
    restoreSuite,
    backupSuite,
    startAutoSuite,
    status,
    hoy,
    deviceTag,
    serverReady,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = global.ArpaRespaldoNube;

  if (global.document && !global.ARPA_RESPALDO_NO_AUTO) {
    // Solo en la suite: la página de recuperación no debe subir nada antes de restaurar.
    const start = () => { if (!global.ARPA_RESPALDO_NO_AUTO) startAutoSuite(); };
    if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', start);
    else start();
  }
})(typeof window !== 'undefined' ? window : globalThis);
