/**
 * Helpers de licencia (cliente) — exenciones founder y permisos por plan.
 */
(function (global) {
  const LICENSE_CODE_KEY = 'arpa_suite_license_code';
  const LICENSE_PLAN_KEY = 'arpa_suite_license_plan';
  // El código fundador YA NO vive en el cliente. El servidor responde founder:true
  // al validar la licencia y ese resultado se guarda en LICENSE_FOUNDER_KEY.
  const LICENSE_FOUNDER_KEY = 'arpa_suite_license_founder';
  const HAD_PAID_LICENSE_KEY = 'arpa_suite_had_paid_license';
  const WL_PREFIX = 'ARPA-WL-';
  const PYME_PREFIX = 'ARPA-PYME-';
  const PRO_PREFIX = 'ARPA-PRO-';
  const FREE_PREFIX = 'ARPA-FREE-';

  function normalizeCode(code) {
    return String(code || '').trim().toUpperCase();
  }

  function getActiveLicenseCode() {
    try {
      return normalizeCode(localStorage.getItem(LICENSE_CODE_KEY) || '');
    } catch (e) {
      return '';
    }
  }

  /** Licencia fundador: exenta de bloqueos presentes y futuros. */
  function isFounderLicense(code) {
    const active = getActiveLicenseCode();
    if (!active) return false;
    if (code && normalizeCode(code) !== active) return false;
    try {
      return localStorage.getItem(LICENSE_FOUNDER_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function isWhiteLabelLicense(code) {
    return normalizeCode(code || getActiveLicenseCode()).indexOf(WL_PREFIX) === 0;
  }

  /** No expira localmente: Founder y cualquier plan pago (Pro/PYME/White Label).
   *  Solo el trial gratuito (FREE) debe expirar y bloquear el uso local.
   *  La licencia es perpetua — el vencimiento guardado es solo la fecha de PMA
   *  (mantenimiento/soporte), y su paso NUNCA debe bloquear el uso de la app. */
  function isNeverExpiring(code) {
    const c = normalizeCode(code || getActiveLicenseCode());
    if (!c) return false;
    if (c.indexOf(FREE_PREFIX) === 0) return false;
    return true;
  }

  /** Cambio de nombre de marca / logo de la app. */
  function canCustomizeBrand(code) {
    if (isFounderLicense(code)) return true;
    return isWhiteLabelLicense(code);
  }

  /** Atajo para futuras restricciones por plan. */
  function isExemptFromPlanRestrictions(code) {
    return isFounderLicense(code);
  }

  function getActiveLicensePlan() {
    try {
      return String(localStorage.getItem(LICENSE_PLAN_KEY) || '').trim().toUpperCase();
    } catch (e) {
      return '';
    }
  }

  function isFreePlanName(plan) {
    const p = String(plan || '').trim();
    return !p || /^free$/i.test(p);
  }

  /** Marca persistente: este equipo ya tuvo Pro/PYME/WL/Founder. No se borra al limpiar el código. */
  function markHadPaidLicenseIfNeeded(plan, founder, codigo) {
    const code = normalizeCode(codigo);
    const paidByPlan = !isFreePlanName(plan);
    const paidByCode = !!(code && code.indexOf(FREE_PREFIX) !== 0);
    if (founder === true || paidByPlan || paidByCode) {
      try { localStorage.setItem(HAD_PAID_LICENSE_KEY, '1'); } catch (e) { /* ignore */ }
    }
  }

  function hasHadPaidLicense() {
    try {
      if (localStorage.getItem(HAD_PAID_LICENSE_KEY) === '1') return true;
      if (localStorage.getItem(LICENSE_FOUNDER_KEY) === '1') return true;
      const plan = String(localStorage.getItem(LICENSE_PLAN_KEY) || '').trim();
      if (plan && !isFreePlanName(plan)) return true;
      return false;
    } catch (e) {
      return false;
    }
  }

  function isPymePlan(code) {
    const c = normalizeCode(code || getActiveLicenseCode());
    if (c.indexOf(PYME_PREFIX) === 0) return true;
    return getActiveLicensePlan() === 'PYME';
  }

  function isProPlan(code) {
    const c = normalizeCode(code || getActiveLicenseCode());
    if (c.indexOf(PRO_PREFIX) === 0) return true;
    return getActiveLicensePlan() === 'PRO';
  }

  /** Trial auto 7 días (ARPA-FREE-*). Excluye Founder, Pro, PYME y White Label. */
  function isFreeTrialLicense(code) {
    const c = normalizeCode(code || getActiveLicenseCode());
    if (!c) return false;
    if (isFounderLicense(c)) return false;
    if (isWhiteLabelLicense(c)) return false;
    if (isPymePlan(c)) return false;
    if (isProPlan(c)) return false;
    return c.indexOf(FREE_PREFIX) === 0;
  }

  function requiresTechnicianCode(code) {
    return isPymePlan(code);
  }

  function getLicenseExpiryLabel() {
    if (isNeverExpiring()) {
      return (window.ArpaI18n && window.ArpaI18n.t)
        ? window.ArpaI18n.t('settings.license.no_expiry')
        : 'Sin vencimiento';
    }
    try {
      const venc = String(localStorage.getItem('arpa_suite_license_vencimiento') || '').trim();
      if (!venc) {
        return (window.ArpaI18n && window.ArpaI18n.t)
          ? window.ArpaI18n.t('settings.license.no_expiry')
          : 'Sin vencimiento';
      }
      return venc;
    } catch (e) {
      return 'Sin vencimiento';
    }
  }

  function getTrialDaysRemaining() {
    if (!isFreeTrialLicense()) return null;
    try {
      const venc = String(localStorage.getItem('arpa_suite_license_vencimiento') || '').trim();
      if (!venc) return null;
      const parts = venc.split('-');
      let d;
      if (parts.length === 3) d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      else d = new Date(venc);
      if (isNaN(d.getTime())) return null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      d.setHours(0, 0, 0, 0);
      return Math.max(0, Math.round((d.getTime() - today.getTime()) / 86400000));
    } catch (e) {
      return null;
    }
  }

  function refreshTrialBanner() {
    const el = document.getElementById('trial-days-banner');
    if (!el) return;
    const code = getActiveLicenseCode();
    if (!code || code.indexOf(FREE_PREFIX) !== 0) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    const days = getTrialDaysRemaining();
    const x = days == null ? '—' : String(days);
    const text = (window.ArpaI18n && window.ArpaI18n.t)
      ? window.ArpaI18n.t('trial.banner.days_left', { days: x })
      : ('Prueba gratis: quedan ' + x + ' días');
    el.textContent = text;
    el.hidden = false;
  }

  function fillSettingsLicensePanel() {
    const planEl = document.getElementById('settings-license-plan');
    const codeEl = document.getElementById('settings-license-code');
    const vencEl = document.getElementById('settings-license-venc');
    const plan = getActiveLicensePlan() || (isFounderLicense() ? 'FOUNDER' : '') || '—';
    const code = getActiveLicenseCode();
    const last6 = code ? code.slice(-6) : '—';
    if (planEl) planEl.textContent = plan;
    if (codeEl) codeEl.textContent = last6;
    if (vencEl) vencEl.textContent = getLicenseExpiryLabel();
  }

  function requestLicenseChange() {
    const msg = (window.ArpaI18n && window.ArpaI18n.t)
      ? window.ArpaI18n.t('settings.license.confirm_change')
      : '¿Cambiar el código de licencia? La empresa, el catálogo, el historial y la numeración se conservan.';
    if (!window.confirm(msg)) return;
    if (window.ArpaLicenseGate && typeof window.ArpaLicenseGate.clearLicenseData === 'function') {
      window.ArpaLicenseGate.clearLicenseData();
    }
    if (window.ArpaBrand && typeof window.ArpaBrand.closeSettings === 'function') {
      window.ArpaBrand.closeSettings();
    }
    if (window.ArpaLicenseGate && typeof window.ArpaLicenseGate.showActivatePanel === 'function') {
      window.ArpaLicenseGate.showActivatePanel(
        (window.ArpaI18n && window.ArpaI18n.t)
          ? window.ArpaI18n.t('license_gate.subtitle_enter_code')
          : 'Ingrese su código de licencia'
      );
    }
  }

  // ── Plan PYME: rol jefe / técnico ──────────────────────────────────────────
  // El servidor responde rol "jefe" o "tecnico" al validar. El técnico solo hace
  // informes de trabajo (Formato de Servicio): no ve Cotización, Cuenta de cobro,
  // Configuración (empresa y cuenta) ni precios; su código queda fijo con sus iniciales.
  // Sin rol guardado (licencias de antes o servidor viejo) todo queda como hoy (jefe).
  const ROL_KEY = 'arpa_suite_license_rol';
  const ROL_JEFE_KEY = 'arpa_suite_license_jefe';
  const ROL_INICIALES_KEY = 'arpa_suite_tecnico_iniciales';
  const ROL_NOMBRE_KEY = 'arpa_suite_tecnico_nombre';
  const ROL_STYLE_ID = 'arpa-rol-tecnico-style';
  const ROL_BODY_CLASS = 'arpa-rol-tecnico';

  function readKey(key) {
    try { return String(localStorage.getItem(key) || '').trim(); } catch (e) { return ''; }
  }

  function isTechnicianRole() {
    if (global.ArpaLabDemo && typeof global.ArpaLabDemo.isActive === 'function' && global.ArpaLabDemo.isActive()) {
      return false;
    }
    return readKey(ROL_KEY) === 'tecnico' && !!getActiveLicenseCode();
  }

  function getTechnicianInitials() {
    return readKey(ROL_INICIALES_KEY).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  }

  function getTechnicianName() {
    return readKey(ROL_NOMBRE_KEY);
  }

  function getBossLicense() {
    return readKey(ROL_JEFE_KEY).toUpperCase();
  }

  /** Guarda el rol que respondió el servidor. Devuelve true si cambió. */
  function saveRoleFromValidation(data) {
    const antes = readKey(ROL_KEY);
    const rol = data && data.rol === 'tecnico' ? 'tecnico' : (data && data.rol === 'jefe' ? 'jefe' : '');
    try {
      if (rol === 'tecnico') {
        localStorage.setItem(ROL_KEY, 'tecnico');
        localStorage.setItem(ROL_JEFE_KEY, normalizeCode(data.licencia_jefe));
        localStorage.setItem(ROL_INICIALES_KEY, String(data.iniciales || '').trim().toUpperCase());
        localStorage.setItem(ROL_NOMBRE_KEY, String(data.nombre_tecnico || '').trim());
      } else {
        if (rol) localStorage.setItem(ROL_KEY, rol);
        else localStorage.removeItem(ROL_KEY);
        localStorage.removeItem(ROL_JEFE_KEY);
        localStorage.removeItem(ROL_INICIALES_KEY);
        localStorage.removeItem(ROL_NOMBRE_KEY);
      }
    } catch (e) { /* ignore */ }
    return antes !== rol;
  }

  function clearRole() {
    try {
      [ROL_KEY, ROL_JEFE_KEY, ROL_INICIALES_KEY, ROL_NOMBRE_KEY].forEach((k) => localStorage.removeItem(k));
    } catch (e) { /* ignore */ }
  }

  const ROL_CSS = [
    // Menú: solo OT, Catálogo e Historial.
    '.arpa-rol-tecnico .main-menu-btn[onclick*="openCotizacionView"],',
    '.arpa-rol-tecnico .main-menu-btn[onclick*="openCuentaCobroView"],',
    '.arpa-rol-tecnico .main-menu-btn[onclick*="openSettingsModal"],',
    '.arpa-rol-tecnico .settings-btn,',
    '.arpa-rol-tecnico #view-cotizacion,',
    '.arpa-rol-tecnico #view-cuenta-cobro,',
    '.arpa-rol-tecnico #pdf-actions-cot,',
    '.arpa-rol-tecnico #settings-modal,',
    // Catálogo de solo lectura y sin precios.
    '.arpa-rol-tecnico .catalogo-pvp,',
    '.arpa-rol-tecnico .catalogo-card-actions,',
    '.arpa-rol-tecnico .btn-catalogo-import,',
    '.arpa-rol-tecnico #btn-catalogo-fab,',
    '.arpa-rol-tecnico .catalogo-categorias-block,',
    '.arpa-rol-tecnico .catalogo-fx-notice,',
    // Historial: sin montos ni filtros de cotización / cuenta de cobro.
    '.arpa-rol-tecnico #hist-stat-cot-mes,',
    '.arpa-rol-tecnico #historial-stats > div:nth-child(3),',
    '.arpa-rol-tecnico .historial-tab[data-filtro="cotizacion"],',
    '.arpa-rol-tecnico .historial-tab[data-filtro="cuenta-cobro"]',
    '{ display: none !important; }'
  ].join('\n');

  function rolAviso() {
    const t = global.ArpaI18n && global.ArpaI18n.t;
    const txt = t ? t('rol.tecnico.solo_informes') : '';
    return (txt && txt !== 'rol.tecnico.solo_informes')
      ? txt
      : 'Tu código es de técnico: solo puedes hacer informes de trabajo. Lo demás lo maneja tu jefe.';
  }

  let rolGuardsInstalled = false;

  /** Envuelve las entradas a Cotización, Cuenta de cobro y Configuración: el técnico no entra. */
  function installRoleGuards() {
    if (rolGuardsInstalled) return;
    rolGuardsInstalled = true;
    ['openCotizacionView', 'openCuentaCobroView', 'openSettingsModal'].forEach((name) => {
      const original = global[name];
      if (typeof original !== 'function') return;
      global[name] = function rolGuard() {
        if (isTechnicianRole()) {
          try { global.alert(rolAviso()); } catch (e) { /* ignore */ }
          return undefined;
        }
        return original.apply(this, arguments);
      };
    });
    const views = global.ArpaViews;
    if (views && typeof views.showView === 'function') {
      const originalShow = views.showView;
      views.showView = function (view, btn) {
        if (isTechnicianRole() && (view === 'cotizacion' || view === 'cuenta-cobro')) view = 'formato';
        return originalShow.call(this, view, btn);
      };
    }
    const brand = global.ArpaBrand;
    if (brand && typeof brand.openSettings === 'function') {
      const originalOpen = brand.openSettings;
      brand.openSettings = function () {
        if (isTechnicianRole()) return undefined;
        return originalOpen.apply(this, arguments);
      };
    }
  }

  /** Aplica (o quita) la vista de técnico. Se llama al cargar y al validar la licencia. */
  function applyRoleUI() {
    if (typeof document === 'undefined' || !document.body) return;
    const tecnico = isTechnicianRole();
    if (tecnico && !document.getElementById(ROL_STYLE_ID)) {
      const style = document.createElement('style');
      style.id = ROL_STYLE_ID;
      style.textContent = ROL_CSS;
      (document.head || document.body).appendChild(style);
    }
    if (document.body.classList) document.body.classList.toggle(ROL_BODY_CLASS, tecnico);
    if (!tecnico) return;
    installRoleGuards();
    // Código de técnico fijo con sus iniciales.
    const input = document.getElementById('settings-technician-code');
    if (input) {
      input.value = getTechnicianInitials();
      input.readOnly = true;
      input.setAttribute('aria-readonly', 'true');
    }
    const vista = global.ArpaViews && global.ArpaViews.getCurrentView && global.ArpaViews.getCurrentView();
    if (vista === 'cotizacion' || vista === 'cuenta-cobro') {
      const btn = document.querySelector('.main-menu-btn[onclick*="scrollToTopMenu"]');
      global.ArpaViews.showView('formato', btn);
    }
  }

  /** Técnico: vuelve a bajar empresa, logo y catálogo del jefe (con internet). */
  function refreshTechnicianData() {
    if (!isTechnicianRole()) return Promise.resolve(false);
    const brand = global.ArpaBrand;
    const sync = global.ArpaCloudSync;
    const empresa = brand && typeof brand.restoreCompanyDataFromSheets === 'function'
      ? brand.restoreCompanyDataFromSheets()
      : Promise.resolve(false);
    return empresa
      .then(() => (sync && typeof sync.restoreCloudDataIfNeeded === 'function' ? sync.restoreCloudDataIfNeeded() : null))
      .catch(() => null)
      .then(() => {
        try { brand && brand.applyToUI && brand.applyToUI(); } catch (e) { /* ignore */ }
        applyRoleUI();
        return true;
      });
  }

  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', () => { applyRoleUI(); });
  }

  global.ArpaLicense = {
    WL_PREFIX,
    PYME_PREFIX,
    PRO_PREFIX,
    FREE_PREFIX,
    LICENSE_PLAN_KEY,
    LICENSE_FOUNDER_KEY,
    HAD_PAID_LICENSE_KEY,
    markHadPaidLicenseIfNeeded,
    hasHadPaidLicense,
    getActiveLicenseCode,
    getActiveLicensePlan,
    isFounderLicense,
    isWhiteLabelLicense,
    isNeverExpiring,
    canCustomizeBrand,
    isExemptFromPlanRestrictions,
    isPymePlan,
    isProPlan,
    isFreeTrialLicense,
    requiresTechnicianCode,
    getLicenseExpiryLabel,
    fillSettingsLicensePanel,
    requestLicenseChange,
    getTrialDaysRemaining,
    refreshTrialBanner,
    ROL_KEY,
    isTechnicianRole,
    getTechnicianInitials,
    getTechnicianName,
    getBossLicense,
    saveRoleFromValidation,
    clearRole,
    applyRoleUI,
    refreshTechnicianData
  };
})(typeof window !== 'undefined' ? window : globalThis);
