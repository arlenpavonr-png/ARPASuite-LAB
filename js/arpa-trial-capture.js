/**
 * Captura de WhatsApp en trial gratis + sync con Sheets
 * Disparadores: primer guardado (modal) o día 3 sin guardar (pantalla completa).
 */
(function (global) {
  'use strict';

  const LICENSE_API = 'https://script.google.com/macros/s/AKfycbzKBeyDVWVqPG1R47EZTVKmCpa3SOwxs8LXrW4ipvRtiyyRV4trJKg7D4i89_cUTcH2/exec';
  const LICENSE_CODE_KEY = 'arpa_suite_license_code';
  const ACTIVE_OFICIOS_KEY = 'arpa_active_oficios';
  const TRIAL_START_KEY = 'arpa_trial_fecha_inicio';
  const TRIAL_WHATSAPP_KEY = 'arpa_trial_whatsapp';
  const TRIAL_NOMBRE_KEY = 'arpa_trial_nombre';
  const TRIAL_OFICIO_KEY = 'arpa_trial_oficio';
  const TRIAL_ID_KEY = 'arpa_trial_id';
  const TRIAL_SYNCED_KEY = 'arpa_trial_synced';
  const TRIAL_DOC_SAVED_KEY = 'arpa_trial_doc_saved';
  const TRIAL_CAPTURED_KEY = 'arpa_trial_captured';

  const OFICIO_OPTIONS = [
    { id: 'automatismos', label: 'Automatismos' },
    { id: 'electricidad', label: 'Electricidad' },
    { id: 'gas', label: 'Gas' },
    { id: 'refrigeracion', label: 'Refrigeración y Aire Acondicionado' },
    { id: 'cctv', label: 'Cámaras y CCTV / Seguridad Electrónica' },
    { id: 'plomeria', label: 'Plomería y Fontanería' },
    { id: 'metalmecanica', label: 'Metalmecánica y Soldadura' },
    { id: 'plagas', label: 'Control de Plagas / Fumigación' },
    { id: 'linea_blanca', label: 'Línea Blanca / Electrodomésticos' },
    { id: 'solar', label: 'Energía Solar' }
  ];

  function t(key, fallback) {
    if (global.ArpaI18n && typeof global.ArpaI18n.t === 'function') {
      const val = global.ArpaI18n.t(key);
      if (val && val !== key) return val;
    }
    return fallback || key;
  }

  function getSavedLicenseCode() {
    try {
      return (localStorage.getItem(LICENSE_CODE_KEY) || '').trim();
    } catch (e) {
      return '';
    }
  }

  function getTrialStartDate() {
    try {
      return (localStorage.getItem(TRIAL_START_KEY) || '').trim();
    } catch (e) {
      return '';
    }
  }

  function isSynced() {
    try {
      return localStorage.getItem(TRIAL_SYNCED_KEY) === 'true';
    } catch (e) {
      return false;
    }
  }

  function isCaptureCompleted() {
    try {
      if (localStorage.getItem(TRIAL_CAPTURED_KEY) === 'true') return true;
      const whatsapp = (localStorage.getItem(TRIAL_WHATSAPP_KEY) || '').trim();
      const nombre = (localStorage.getItem(TRIAL_NOMBRE_KEY) || '').trim();
      return !!(whatsapp && nombre);
    } catch (e) {
      return false;
    }
  }

  function hasDocumentSaved() {
    try {
      return localStorage.getItem(TRIAL_DOC_SAVED_KEY) === 'true';
    } catch (e) {
      return false;
    }
  }

  function getTrialDayIndex() {
    const start = getTrialStartDate();
    if (!start) return 0;
    const startDate = new Date(start + 'T00:00:00');
    const today = new Date();
    startDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.floor((today - startDate) / 86400000);
  }

  function needsBackupCaptureOnLoad() {
    if (!shouldOfferTrialCapture()) return false;
    if (!getTrialStartDate()) return false;
    if (hasDocumentSaved()) return false;
    return getTrialDayIndex() >= 2;
  }

  function ensureTrialStartSilent() {
    if (getTrialStartDate()) return;
    const now = new Date();
    const fechaInicio = now.toISOString().slice(0, 10);
    const trialId = 't-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    try {
      localStorage.setItem(TRIAL_START_KEY, fechaInicio);
      localStorage.setItem(TRIAL_ID_KEY, trialId);
    } catch (e) {
      console.warn('[arpa-trial-capture] ensureTrialStartSilent', e);
    }
  }

  function normalizePhone(raw) {
    let digits = String(raw || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10) digits = '57' + digits;
    if (digits.length === 11 && digits.startsWith('3')) digits = '57' + digits;
    return digits;
  }

  function getPreferredOficioId() {
    try {
      const stored = (localStorage.getItem(TRIAL_OFICIO_KEY) || '').trim();
      if (stored && OFICIO_OPTIONS.some((o) => o.id === stored)) return stored;
      const raw = localStorage.getItem(ACTIVE_OFICIOS_KEY);
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      const id = Array.isArray(parsed) ? String(parsed[0] || '').trim() : '';
      return OFICIO_OPTIONS.some((o) => o.id === id) ? id : '';
    } catch (e) {
      return '';
    }
  }

  function readOficioSelectValue(select) {
    if (!select) return '';
    const value = (select.value || '').trim();
    if (value) return value;
    const idx = select.selectedIndex;
    if (idx > 0 && select.options[idx]) {
      return (select.options[idx].value || '').trim();
    }
    return '';
  }

  function populateOficioSelect(select) {
    if (!select) return;
    select.innerHTML = '<option value="">' + t('trial_capture.oficio_placeholder', 'Seleccione su oficio principal…') + '</option>' +
      OFICIO_OPTIONS.map((o) => `<option value="${o.id}">${o.label}</option>`).join('');
    const preferred = getPreferredOficioId();
    if (preferred) {
      select.value = preferred;
    } else {
      select.selectedIndex = 0;
    }
  }

  function isFreeTrialUser() {
    if (global.ArpaLicense && typeof global.ArpaLicense.isFreeTrialLicense === 'function') {
      return global.ArpaLicense.isFreeTrialLicense();
    }
    const code = getSavedLicenseCode().toUpperCase();
    if (!code) return false;
    if (code === 'ARPA-FOUNDER-001') return false;
    if (code.indexOf('ARPA-WL-') === 0) return false;
    if (code.indexOf('ARPA-PYME-') === 0) return false;
    if (code.indexOf('ARPA-PRO-') === 0) return false;
    return code.indexOf('ARPA-FREE-') === 0;
  }

  function shouldOfferTrialCapture() {
    if (isCaptureCompleted()) return false;
    return isFreeTrialUser();
  }

  function showCaptureError(msg) {
    const el = document.getElementById('trial-capture-error');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('visible', !!msg);
  }

  function setCaptureActive(active) {
    document.documentElement.classList.toggle('trial-capture-active', active);
  }

  function hideCapture() {
    const gate = document.getElementById('trial-capture-gate');
    gate?.classList.remove('trial-capture-gate--modal');
    setCaptureActive(false);
    gate?.setAttribute('hidden', '');
  }

  function applyCaptureCopy(options) {
    const titleEl = document.getElementById('trial-capture-title');
    const subEl = document.querySelector('#trial-capture-gate .trial-capture-sub');
    const btn = document.getElementById('trial-capture-submit');
    if (!titleEl || !subEl) return;

    const variant = options.variant || 'backup';

    if (options.title) {
      titleEl.textContent = options.title;
    } else if (variant === 'achievement') {
      titleEl.textContent = t('trial_capture.title_achievement', '¡Sigue avanzando con ARPA Suite!');
    } else {
      titleEl.textContent = t('trial_capture.title', 'Bienvenido a ARPA Suite');
    }

    if (options.subtitle) {
      subEl.textContent = options.subtitle;
    } else if (variant === 'achievement') {
      subEl.textContent = t(
        'trial_capture.subtitle_achievement',
        'Completa el formulario en menos de un minuto. Te avisamos por WhatsApp antes de que venza tu prueba gratis.'
      );
    } else {
      subEl.textContent = t(
        'trial_capture.subtitle_backup',
        'Para recordarte antes de que termine tu prueba y poder ayudarte, déjanos un WhatsApp de contacto.'
      );
    }

    if (btn) {
      btn.textContent = options.btnText ||
        (variant === 'achievement'
          ? t('trial_capture.btn_submit', 'Guardar y continuar')
          : t('trial_capture.btn_start', 'Continuar a la app'));
    }
  }

  function postRegisterTrial(payload) {
    return fetch(LICENSE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ accion: 'registerTrialUser' }, payload))
    }).then((res) => res.json());
  }

  function readStoredTrialPayload() {
    try {
      return {
        telefono: localStorage.getItem(TRIAL_WHATSAPP_KEY) || '',
        fechaInicio: localStorage.getItem(TRIAL_START_KEY) || '',
        trialId: localStorage.getItem(TRIAL_ID_KEY) || '',
        nombre: localStorage.getItem(TRIAL_NOMBRE_KEY) || '',
        oficio: localStorage.getItem(TRIAL_OFICIO_KEY) || ''
      };
    } catch (e) {
      return null;
    }
  }

  function registerTrialUserSilent() {
    if (isSynced()) return Promise.resolve(true);
    const stored = readStoredTrialPayload();
    if (!stored || !stored.telefono || !stored.fechaInicio || !stored.trialId) {
      return Promise.resolve(false);
    }

    return postRegisterTrial(stored)
      .then((data) => {
        if (data && data.ok) {
          try { localStorage.setItem(TRIAL_SYNCED_KEY, 'true'); } catch (e) { /* ignore */ }
          return true;
        }
        return false;
      })
      .catch(() => false);
  }

  function retryPendingRegistration() {
    if (isSynced() || !getTrialStartDate()) return;
    registerTrialUserSilent();
  }

  function showCapture(opts) {
    let options = {};
    if (typeof opts === 'function') {
      options = { onComplete: opts, mode: 'fullscreen', variant: 'backup' };
    } else {
      options = opts || {};
    }

    const mode = options.mode || 'fullscreen';
    const onComplete = options.onComplete;
    const gate = document.getElementById('trial-capture-gate');
    const nameInput = document.getElementById('trial-capture-name');
    const oficioSelect = document.getElementById('trial-capture-oficio');
    const phoneInput = document.getElementById('trial-capture-phone');
    const btn = document.getElementById('trial-capture-submit');
    if (!gate || !btn) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    applyCaptureCopy(options);
    if (pdfExportDepth > 0) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }
    gate.removeAttribute('hidden');
    gate.classList.toggle('trial-capture-gate--modal', mode === 'modal');
    setCaptureActive(mode === 'fullscreen');
    showCaptureError('');
    populateOficioSelect(oficioSelect);
    if (phoneInput && !phoneInput.value.trim()) phoneInput.value = '+57 ';

    function finish() {
      hideCapture();
      if (typeof onComplete === 'function') onComplete();
      registerTrialUserSilent();
    }

    function onSubmit() {
      const nombre = (nameInput?.value || '').trim();
      const oficio = readOficioSelectValue(oficioSelect);
      const phone = normalizePhone(phoneInput?.value || '');

      if (!nombre) {
        showCaptureError(t('trial_capture.error_name', 'Ingrese su nombre.'));
        nameInput?.focus();
        return;
      }
      if (!oficio) {
        showCaptureError(t('trial_capture.error_oficio', 'Seleccione su oficio.'));
        oficioSelect?.focus();
        return;
      }
      if (phone.length < 11) {
        showCaptureError(t('trial_capture.error_phone', 'Ingrese un número de WhatsApp válido con código de país.'));
        phoneInput?.focus();
        return;
      }

      ensureTrialStartSilent();
      let fechaInicio = getTrialStartDate();
      let trialId = '';
      try {
        trialId = localStorage.getItem(TRIAL_ID_KEY) || '';
        if (!trialId) {
          trialId = 't-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
          localStorage.setItem(TRIAL_ID_KEY, trialId);
        }
        if (!fechaInicio) {
          fechaInicio = new Date().toISOString().slice(0, 10);
          localStorage.setItem(TRIAL_START_KEY, fechaInicio);
        }
        localStorage.setItem(TRIAL_WHATSAPP_KEY, phone);
        localStorage.setItem(TRIAL_NOMBRE_KEY, nombre);
        localStorage.setItem(TRIAL_OFICIO_KEY, oficio);
        localStorage.setItem(TRIAL_CAPTURED_KEY, 'true');
        localStorage.setItem(ACTIVE_OFICIOS_KEY, JSON.stringify([oficio]));
        localStorage.removeItem(TRIAL_SYNCED_KEY);
      } catch (e) {
        console.warn('[arpa-trial-capture] localStorage', e);
      }

      btn.disabled = true;
      finish();
    }

    btn.disabled = false;
    btn.onclick = onSubmit;
    [nameInput, phoneInput].forEach((el) => {
      el?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') onSubmit();
      }, { once: false });
    });

    nameInput?.focus();
  }

  let pdfExportDepth = 0;
  let pendingCaptureDocType = null;

  function beginPdfExport() {
    pdfExportDepth += 1;
    hideCapture();
  }

  function endPdfExport() {
    pdfExportDepth = Math.max(0, pdfExportDepth - 1);
    if (pdfExportDepth > 0) return;
    if (!pendingCaptureDocType) return;
    const docType = pendingCaptureDocType;
    pendingCaptureDocType = null;
    showCaptureAfterSave(docType);
  }

  function showCaptureAfterSave(docType) {
    const docLabel = docType === 'cotizacion'
      ? t('trial_capture.doc_cotizacion', 'Cotización')
      : t('trial_capture.doc_formato', 'Formato de Servicio');

    const titleTemplate = t('trial_capture.title_after_save', '¡Tu {doc} quedó guardado!');
    const title = titleTemplate.replace('{doc}', docLabel);

    showCapture({
      mode: 'modal',
      variant: 'achievement',
      title: title,
      subtitle: t(
        'trial_capture.subtitle_after_save',
        'Para acompañarte durante la prueba, confirma tu nombre, oficio y un WhatsApp de contacto.'
      ),
      btnText: t('trial_capture.btn_submit_modal', 'Enviar datos')
    });
  }

  function onDocumentSaved(docType) {
    try {
      localStorage.setItem(TRIAL_DOC_SAVED_KEY, 'true');
    } catch (e) { /* ignore */ }

    if (!shouldOfferTrialCapture()) return;

    if (pdfExportDepth > 0) {
      pendingCaptureDocType = docType;
      return;
    }

    showCaptureAfterSave(docType);
  }

  function maybeShowBackupCaptureOnLoad(onContinue) {
    if (!needsBackupCaptureOnLoad()) {
      if (typeof onContinue === 'function') onContinue();
      return;
    }
    showCapture({
      mode: 'fullscreen',
      variant: 'achievement',
      title: t('trial_capture.title_achievement', '¡Sigue avanzando con ARPA Suite!'),
      subtitle: t(
        'trial_capture.subtitle_achievement',
        'Completa el formulario en menos de un minuto. Te avisamos por WhatsApp antes de que venza tu prueba gratis.'
      ),
      btnText: t('trial_capture.btn_start', 'Continuar a la app'),
      onComplete: onContinue
    });
  }

  global.ArpaTrialCapture = {
    TRIAL_START_KEY,
    TRIAL_WHATSAPP_KEY,
    TRIAL_NOMBRE_KEY,
    TRIAL_OFICIO_KEY,
    TRIAL_ID_KEY,
    TRIAL_DOC_SAVED_KEY,
    TRIAL_CAPTURED_KEY,
    ensureTrialStartSilent,
    isCaptureCompleted,
    beginPdfExport,
    endPdfExport,
    onDocumentSaved,
    maybeShowBackupCaptureOnLoad,
    showCapture,
    retryPendingRegistration,
    registerTrialUserSilent
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', retryPendingRegistration);
  } else {
    retryPendingRegistration();
  }

  global.addEventListener('online', retryPendingRegistration);
})(window);
