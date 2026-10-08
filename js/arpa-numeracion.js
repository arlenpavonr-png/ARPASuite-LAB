/**
 * Numeración local por documento — prefijo de técnico en plan PYME (ej. PJ-001).
 */
(function (global) {
  const SETTINGS_KEY = 'arpa_suite_user_settings';

  const KEYS = {
    formato: 'arpa_ultimo_no',
    cot: 'arpa_ultimo_cot',
    cc: 'arpa_cc_num'
  };

  function getSettingsRaw() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  /** 2–4 letras o números; vacío si no es válido. */
  function normalizeTechnicianCode(input) {
    const code = String(input || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 2 || code.length > 4) return '';
    return code;
  }

  function getTechnicianCode() {
    return normalizeTechnicianCode(getSettingsRaw().technicianCode);
  }

  function hasTechnicianPrefix() {
    return !!getTechnicianCode();
  }

  function parseSequenceNumber(value) {
    const s = String(value || '').trim();
    if (!s) return 0;
    const m = s.match(/(\d+)\s*$/);
    return m ? parseInt(m[1], 10) : 0;
  }

  function getStoredCounter(key) {
    try {
      return parseInt(localStorage.getItem(key) || '0', 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  function setCounter(key, n) {
    const seq = Math.max(0, parseInt(n, 10) || 0);
    try {
      localStorage.setItem(key, String(seq));
    } catch (e) { /* ignore */ }
    return seq;
  }

  function getMaxCounter(storageKey, fieldValue) {
    return Math.max(getStoredCounter(storageKey), parseSequenceNumber(fieldValue));
  }

  function formatWithPrefix(seq, pad) {
    const code = getTechnicianCode();
    if (!code) return null;
    return code + '-' + String(seq).padStart(pad, '0');
  }

  function formatFormNumber(n) {
    return formatWithPrefix(n, 3) || String(n).padStart(4, '0');
  }

  function formatCotNumber(n) {
    return formatWithPrefix(n, 3) || ('COT-' + String(n).padStart(3, '0'));
  }

  function formatCcNumber(n) {
    return formatWithPrefix(n, 3) || ('CC-' + String(n).padStart(3, '0'));
  }

  const FORMATTERS = {
    formato: formatFormNumber,
    cot: formatCotNumber,
    cc: formatCcNumber
  };

  function hasActiveLicenseCode() {
    try {
      return !!String(localStorage.getItem('arpa_suite_license_code') || '').trim();
    } catch (e) {
      return false;
    }
  }

  function blockIfNoLicense() {
    if (hasActiveLicenseCode()) return true;
    const msg = (window.ArpaI18n && window.ArpaI18n.t)
      ? window.ArpaI18n.t('alert.numeracion.sin_licencia')
      : 'Sin licencia activa. Revise Configuración → Licencia.';
    alert(msg);
    return false;
  }

  function nextNumber(docType, fieldValue) {
    if (!hasActiveLicenseCode()) {
      return { sequence: 0, value: '', blocked: true };
    }
    const storageKey = KEYS[docType] || KEYS.formato;
    const next = getMaxCounter(storageKey, fieldValue) + 1;
    setCounter(storageKey, next);
    const format = FORMATTERS[docType] || formatFormNumber;
    return { sequence: next, value: format(next) };
  }

  /**
   * Pedidos de número en curso, uno por tipo de documento.
   * Si llega un segundo pedido mientras la nube aún no responde el primero
   * (abrir la app + tocar el módulo, o doble toque en "+ NUEVO N°"),
   * se devuelve el MISMO pedido en vez de reservar otro número.
   * Antes eso consumía dos números y se saltaba uno (COT-004 → COT-005).
   */
  const pendingRequests = {};

  function nextNumberAsync(docType, fieldValue) {
    const key = KEYS[docType] ? docType : 'formato';
    if (pendingRequests[key]) return pendingRequests[key];
    const request = requestNextNumber(key, fieldValue);
    pendingRequests[key] = request;
    const clear = () => { if (pendingRequests[key] === request) delete pendingRequests[key]; };
    request.then(clear, clear);
    return request;
  }

  async function requestNextNumber(docType, fieldValue) {
    if (!hasActiveLicenseCode()) {
      return { sequence: 0, value: '', sincronizado: false, blocked: true };
    }
    const storageKey = KEYS[docType] || KEYS.formato;
    const localBase = getMaxCounter(storageKey, fieldValue);
    const format = FORMATTERS[docType] || formatFormNumber;
    let numero = localBase + 1;
    let sincronizado = false;
    try {
      const cloudNumero = await global.ArpaCloudSync?.obtenerSiguienteNumeroCloud?.(docType, localBase);
      if (cloudNumero && cloudNumero > 0) {
        numero = cloudNumero;
        sincronizado = true;
      }
    } catch (e) {
      // sin conexión u otro error — se usa el número local calculado arriba
    }
    setCounter(storageKey, numero);
    return { sequence: numero, value: format(numero), sincronizado };
  }

  /**
   * Número reservado que todavía no se ha usado en un documento guardado.
   * Antes, abrir la app con el formulario vacío pedía un número nuevo cada vez
   * (abrir y cerrar 3 veces gastaba 171, 172 y 173). Ahora se reutiliza el
   * reservado hasta que el documento se guarde en el Historial.
   */
  const RESERVED_PREFIX = 'arpa_numero_reservado_';

  function getReserved(docType) {
    try {
      return String(localStorage.getItem(RESERVED_PREFIX + docType) || '').trim();
    } catch (e) {
      return '';
    }
  }

  function setReserved(docType, value) {
    try {
      if (value) localStorage.setItem(RESERVED_PREFIX + docType, String(value));
    } catch (e) { /* ignore */ }
  }

  /** Libera el reservado solo si es el número que se acaba de usar (si se reabrió un documento viejo, se conserva). */
  function clearReserved(docType, usedValue) {
    try {
      const used = String(usedValue || '').trim();
      if (used && getReserved(docType) !== used) return;
      localStorage.removeItem(RESERVED_PREFIX + docType);
    } catch (e) { /* ignore */ }
  }

  function blockIfPymeMissingCode() {
    if (!global.ArpaLicense?.isPymePlan?.()) return true;
    if (getTechnicianCode()) return true;
    if (global.ArpaBrand?.openSettings) {
      global.ArpaBrand.openSettings();
      global.ArpaBrand.showError?.(
        window.ArpaI18n.t('alert.numeracion.pyme_codigo_y_guardar')
      );
    } else {
      alert(window.ArpaI18n.t('alert.numeracion.configure_iniciales_pyme'));
    }
    return false;
  }

  global.ArpaNumeracion = {
    KEYS,
    normalizeTechnicianCode,
    getTechnicianCode,
    hasTechnicianPrefix,
    parseSequenceNumber,
    getStoredCounter,
    setCounter,
    getMaxCounter,
    formatFormNumber,
    formatCotNumber,
    formatCcNumber,
    nextNumber,
    nextNumberAsync,
    hasActiveLicenseCode,
    blockIfNoLicense,
    blockIfPymeMissingCode,
    getReserved,
    setReserved,
    clearReserved
  };
})(typeof window !== 'undefined' ? window : globalThis);
