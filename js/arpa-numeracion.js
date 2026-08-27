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

  function nextNumber(docType, fieldValue) {
    const storageKey = KEYS[docType] || KEYS.formato;
    const next = getMaxCounter(storageKey, fieldValue) + 1;
    setCounter(storageKey, next);
    const format = FORMATTERS[docType] || formatFormNumber;
    return { sequence: next, value: format(next) };
  }

  async function nextNumberAsync(docType, fieldValue) {
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
    blockIfPymeMissingCode
  };
})(typeof window !== 'undefined' ? window : globalThis);
