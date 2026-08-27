/**
 * Helpers de licencia (cliente) — exenciones founder y permisos por plan.
 */
(function (global) {
  const LICENSE_CODE_KEY = 'arpa_suite_license_code';
  const LICENSE_PLAN_KEY = 'arpa_suite_license_plan';
  const FOUNDER_CODE = 'ARPA-FOUNDER-7X9K2M4QZ1';
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
    return normalizeCode(code || getActiveLicenseCode()) === FOUNDER_CODE;
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

  global.ArpaLicense = {
    FOUNDER_CODE,
    WL_PREFIX,
    PYME_PREFIX,
    PRO_PREFIX,
    FREE_PREFIX,
    LICENSE_PLAN_KEY,
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
    requiresTechnicianCode
  };
})(typeof window !== 'undefined' ? window : globalThis);
