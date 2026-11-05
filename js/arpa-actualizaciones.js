/**
 * Actualizaciones anuales de ARPA Suite.
 *
 * La licencia es de por vida. La fecha de vencimiento que guarda el servidor
 * para Pro / PYME / White Label es la del PMA: "actualizaciones hasta".
 * Una función nueva queda disponible si el PMA seguía vigente el día en que
 * salió esa función. Quien no renueva conserva para siempre lo que ya tenía;
 * solo deja de recibir lo que salga después.
 *
 * No llama al servidor: usa los datos que la suite guarda al validar la licencia.
 */
(function (global) {
  const LICENSE_CODE_KEY = 'arpa_suite_license_code';
  const LICENSE_VENC_KEY = 'arpa_suite_license_vencimiento';
  const LICENSE_FOUNDER_KEY = 'arpa_suite_license_founder';
  const LAB_DEMO_SESSION_KEY = 'arpa_lab_demo';
  const FREE_PREFIX = 'ARPA-FREE-';
  const SALES_WHATSAPP = '573016092542';

  /** Fecha de salida de cada actualización (AAAA-MM-DD). */
  const RELEASES = {
    next: { label: 'ARPA NEXT', disponibleDesde: '2027-01-01' }
  };

  /** Durante los 7 días de prueba se muestra todo, para que vean lo que compran. */
  const TRIAL_INCLUYE_ACTUALIZACIONES = true;

  function storageGet(storage, key) {
    try {
      return String((storage && storage.getItem(key)) || '').trim();
    } catch (e) {
      return '';
    }
  }

  function parseDateOnly(str) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(str || '').trim());
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  }

  function startOfDay(date) {
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function isLocalOrLanHost(host) {
    const h = String(host || '').toLowerCase().replace(/^\[|\]$/g, '');
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
    return /^192\.168\.\d{1,3}\.\d{1,3}$/.test(h);
  }

  /** Demo del LAB (?labdemo=1 en localhost o red local). Nunca aplica en el dominio público. */
  function isLabDemo(env) {
    let host = env.hostname;
    if (host == null) {
      try { host = global.location && global.location.hostname; } catch (e) { host = ''; }
    }
    if (!isLocalOrLanHost(host)) return false;
    return storageGet(env.session, LAB_DEMO_SESSION_KEY) === '1';
  }

  function defaultEnv(opts) {
    const o = opts || {};
    let storage = o.storage;
    let session = o.session;
    try { if (storage === undefined) storage = global.localStorage; } catch (e) { storage = null; }
    try { if (session === undefined) session = global.sessionStorage; } catch (e) { session = null; }
    return {
      storage,
      session,
      hostname: o.hostname,
      today: o.today ? startOfDay(o.today) : startOfDay(new Date())
    };
  }

  /** Fecha "actualizaciones hasta" guardada, o '' si no hay. */
  function getUpdatesUntil(opts) {
    const env = defaultEnv(opts);
    return storageGet(env.storage, LICENSE_VENC_KEY);
  }

  /**
   * ¿Esta licencia tiene la actualización `featureId`?
   * @returns {{ok: boolean, reason: string, feature: string, label: string,
   *            disponibleDesde: string, hasta: string}}
   * reason: founder | lab_demo | trial | pma | sin_licencia | pronto | trial_vencido |
   *         sin_fecha | no_renovo | desconocida
   */
  function check(featureId, opts) {
    const env = defaultEnv(opts);
    const release = RELEASES[featureId];
    const out = {
      ok: false,
      reason: 'desconocida',
      feature: featureId,
      label: release ? release.label : String(featureId || ''),
      disponibleDesde: release ? release.disponibleDesde : '',
      hasta: storageGet(env.storage, LICENSE_VENC_KEY)
    };
    if (!release) return out;

    if (isLabDemo(env)) return { ...out, ok: true, reason: 'lab_demo' };

    const code = storageGet(env.storage, LICENSE_CODE_KEY).toUpperCase();
    if (!code) return { ...out, reason: 'sin_licencia' };

    if (storageGet(env.storage, LICENSE_FOUNDER_KEY) === '1') {
      return { ...out, ok: true, reason: 'founder' };
    }

    // Antes de la fecha de salida solo la usa el fundador (pruebas en campo).
    const desde = parseDateOnly(release.disponibleDesde);
    if (desde && env.today < desde) return { ...out, reason: 'pronto' };

    const hasta = parseDateOnly(out.hasta);

    if (code.indexOf(FREE_PREFIX) === 0) {
      if (TRIAL_INCLUYE_ACTUALIZACIONES && hasta && hasta >= env.today) {
        return { ...out, ok: true, reason: 'trial' };
      }
      return { ...out, reason: 'trial_vencido' };
    }

    if (!hasta) return { ...out, reason: 'sin_fecha' };

    if (desde && hasta >= desde) return { ...out, ok: true, reason: 'pma' };
    return { ...out, reason: 'no_renovo' };
  }

  function hasUpdate(featureId, opts) {
    return check(featureId, opts).ok;
  }

  /** Enlace de WhatsApp para pedir la renovación. */
  function renewUrl(featureId, opts) {
    const r = check(featureId, opts);
    let code = '';
    try { code = storageGet(defaultEnv(opts).storage, LICENSE_CODE_KEY).slice(-6); } catch (e) { code = ''; }
    const text = 'Hola, quiero activar la actualización ' + r.label + ' de ARPA Suite.'
      + (code ? ' Mi licencia termina en ' + code + '.' : '');
    return 'https://wa.me/' + SALES_WHATSAPP + '?text=' + encodeURIComponent(text);
  }

  const api = {
    RELEASES,
    TRIAL_INCLUYE_ACTUALIZACIONES,
    check,
    hasUpdate,
    getUpdatesUntil,
    renewUrl,
    parseDateOnly
  };

  global.ArpaActualizaciones = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
