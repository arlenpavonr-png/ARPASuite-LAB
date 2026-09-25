/**
 * Desbloqueo de prueba SOLO para ARPASuite-LAB.
 * No copiar a Formato-Arlenpav. No llama al backend de licencias
 * ni sincroniza empresa, catálogo ni historial.
 *
 * Activar: http://localhost:4173/?labdemo=1
 *          http://192.168.x.x:4173/?labdemo=1
 */
(function (global) {
  const SESSION_KEY = 'arpa_lab_demo';
  const ONBOARDING_KEY = 'arpa_onboarding';
  const PRODUCTION_HOSTS = /(formato-arlenpav|arpatechnologyglobal\.com)/i;

  function getHostname() {
    try {
      return String(global.location && global.location.hostname || '').trim().toLowerCase();
    } catch (e) {
      return '';
    }
  }

  function isLocalOrLanHost(host) {
    const h = String(host || '').replace(/^\[|\]$/g, '');
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
    return /^192\.168\.\d{1,3}\.\d{1,3}$/.test(h);
  }

  function isLabRepo() {
    return global.ARPA_IS_LAB === true;
  }

  function isForbiddenHost(host) {
    return PRODUCTION_HOSTS.test(host);
  }

  function queryWantsDemo() {
    try {
      return new URLSearchParams(global.location.search).get('labdemo') === '1';
    } catch (e) {
      return false;
    }
  }

  function sessionWantsDemo() {
    try {
      return global.sessionStorage.getItem(SESSION_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function persistSession() {
    try {
      global.sessionStorage.setItem(SESSION_KEY, '1');
    } catch (e) {}
  }

  function isAllowed() {
    if (!isLabRepo()) return false;
    const host = getHostname();
    if (!host || isForbiddenHost(host) || !isLocalOrLanHost(host)) return false;
    if (queryWantsDemo()) {
      persistSession();
      return true;
    }
    return sessionWantsDemo();
  }

  function skipOnboarding() {
    try {
      global.localStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (e) {}
  }

  function hideLicenseUi() {
    document.documentElement.classList.remove('license-checking');
    document.documentElement.classList.add('license-ok');
    const gate = document.getElementById('license-gate');
    if (gate) {
      gate.classList.remove('open');
      gate.setAttribute('hidden', '');
    }
    const trialGate = document.getElementById('trial-capture-gate');
    if (trialGate) {
      trialGate.hidden = true;
      trialGate.classList.remove('open');
    }
    document.body.style.overflow = '';
  }

  function applyLocalDemoSettings() {
    const brand = global.ArpaBrand;
    if (!brand || typeof brand.getSettings !== 'function' || typeof brand.saveSettings !== 'function') {
      return;
    }
    if (typeof brand.hasUserSettings === 'function' && brand.hasUserSettings()) {
      return;
    }
    const current = brand.getSettings() || {};
    if (String(current.companyName || '').trim()) return;
    brand.saveSettings({
      companyName: 'Empresa Demo LAB',
      nit: 'DEMO-RFC-000',
      address: 'Av. Reforma 100',
      city: 'Ciudad de México',
      phone: '3003208557',
      country: 'MX',
      currency: 'MXN',
      bankName: 'Banco Demo',
      accountType: 'CLABE',
      accountNumber: '000000000000000000',
      accountHolder: 'Empresa Demo LAB',
      technicianName: 'Técnico Demo'
    });
    try {
      global.localStorage.setItem('arpa_suite_settings_configured', 'true');
    } catch (e) {}
    if (global.ArpaOficios && typeof global.ArpaOficios.seedActiveOficios === 'function') {
      global.ArpaOficios.seedActiveOficios();
    }
  }

  function activateIfAllowed() {
    if (!isAllowed()) return false;
    skipOnboarding();
    hideLicenseUi();
    applyLocalDemoSettings();
    if (global.ArpaBrand && typeof global.ArpaBrand.applyToUI === 'function') {
      global.ArpaBrand.applyToUI();
    }
    if (global.ArpaI18n && typeof global.ArpaI18n.applyCountryLabels === 'function') {
      global.ArpaI18n.applyCountryLabels();
    } else if (global.ArpaBrand && typeof global.ArpaBrand.applyCountryLabels === 'function') {
      global.ArpaBrand.applyCountryLabels();
    }
    return true;
  }

  if (isAllowed()) {
    skipOnboarding();
    document.documentElement.classList.remove('license-checking');
    document.documentElement.classList.add('license-ok');
  }

  global.ArpaLabDemo = {
    isAllowed: isAllowed,
    isActive: isAllowed,
    activateIfAllowed: activateIfAllowed
  };
})(window);
