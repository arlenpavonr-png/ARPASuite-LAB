/**
 * Onboarding de primera apertura — oficio principal, catálogo demo (Automatismos)
 * y explicador de bienvenida antes de entrar a la app.
 */
(function (global) {
  const ONBOARDING_KEY = 'arpa_onboarding';
  const RUBRO_KEY = 'arpa_rubro';
  const OFICIO_AUTOMATISMOS = 'automatismos';
  let pendingFinish = null; // { oficioId, opts }

  function isOnboardingDone() {
    try {
      return localStorage.getItem(ONBOARDING_KEY) === 'true';
    } catch (e) {
      return false;
    }
  }

  function isLicenseReady() {
    return document.documentElement.classList.contains('license-ok');
  }

  function setOnboardingActive(active) {
    document.documentElement.classList.toggle('onboarding-active', active);
  }

  function showGate() {
    renderRubroButtons();
    setOnboardingActive(true);
    document.getElementById('onboarding-gate')?.classList.add('open');
  }

  function closeStepModals() {
    document.getElementById('onboarding-demo-modal')?.classList.remove('open');
    document.getElementById('onboarding-otro-modal')?.classList.remove('open');
  }

  function hideGate() {
    document.getElementById('onboarding-gate')?.classList.remove('open');
    closeStepModals();
    setOnboardingActive(false);
  }

  function getAutomatismosSeedCount() {
    return global.ArpaOficios?.getSeedProductCount?.(OFICIO_AUTOMATISMOS) || 0;
  }

  function openDemoModal() {
    const count = getAutomatismosSeedCount();
    const title = document.getElementById('onboarding-demo-title');
    const text = document.getElementById('onboarding-demo-text');
    if (title) title.textContent = window.ArpaI18n.t('onboarding.demo.titulo');
    if (text) text.textContent = window.ArpaI18n.t('onboarding.demo.pregunta', { count });
    closeStepModals();
    document.getElementById('onboarding-demo-modal')?.classList.add('open');
  }

  function openExplainerModal() {
    closeStepModals();
    document.getElementById('onboarding-otro-modal')?.classList.add('open');
  }

  function loadDemoCatalog() {
    global.ArpaOficios?.importSeedCatalog?.(OFICIO_AUTOMATISMOS, { force: true });
    global.ArpaCatalogo?.invalidateListaCache?.();
    global.ArpaCotizacion?.updateCatalogHint?.();
    global.ArpaMiCatalogo?.refreshView?.();
  }

  function activateOficio(oficioId) {
    if (!oficioId) return;
    global.ArpaOficios?.saveActiveOficios?.([oficioId]);
  }

  function finishOnboarding(oficioId, opts) {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    localStorage.setItem(RUBRO_KEY, oficioId);
    activateOficio(oficioId);
    hideGate();
    if (opts?.loadDemo) {
      loadDemoCatalog();
    }
    if (opts?.goToCatalog) {
      const btn = document.querySelector('[data-onboarding-oficio="' + OFICIO_AUTOMATISMOS + '"]')
        || document.querySelector('.main-menu-btn[onclick*="openCatalogoView"]');
      global.openCatalogoView?.(btn);
      global.ArpaMiCatalogo?.refreshView?.();
    }
  }

  function onOficioSelected(oficioId) {
    const id = global.ArpaOficios?.normalizeOficioId?.(oficioId) || oficioId;
    if (id === OFICIO_AUTOMATISMOS) {
      openDemoModal();
      return;
    }
    pendingFinish = { oficioId: id, opts: null };
    openExplainerModal();
  }

  function renderRubroButtons() {
    const container = document.getElementById('onboarding-rubros');
    if (!container) return;
    const oficios = global.ArpaOficios?.getOficiosList?.() || [];
    container.innerHTML = oficios.map((o) => {
      const label = global.ArpaOficios?.getOficioLabel?.(o.id) || o.id;
      const isPrimary = o.id === OFICIO_AUTOMATISMOS;
      return (
        '<button type="button" class="btn-onboarding-rubro' + (isPrimary ? ' primary' : '') + '" ' +
        'data-onboarding-oficio="' + o.id + '" data-i18n="' + o.i18nKey + '">' +
        label +
        '</button>'
      );
    }).join('');
    container.querySelectorAll('[data-onboarding-oficio]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        onOficioSelected(btn.getAttribute('data-onboarding-oficio'));
      });
    });
    if (global.ArpaI18n && typeof global.ArpaI18n.apply === 'function') {
      global.ArpaI18n.apply(global.ArpaI18n.getLang?.() || 'es');
    }
  }

  function initOnboarding() {
    renderRubroButtons();
    document.getElementById('btn-onboarding-demo-yes')?.addEventListener('click', () => {
      pendingFinish = { oficioId: OFICIO_AUTOMATISMOS, opts: { loadDemo: true, goToCatalog: true } };
      openExplainerModal();
    });
    document.getElementById('btn-onboarding-demo-skip')?.addEventListener('click', () => {
      pendingFinish = { oficioId: OFICIO_AUTOMATISMOS, opts: null };
      openExplainerModal();
    });
    document.getElementById('btn-onboarding-otro-continue')?.addEventListener('click', () => {
      if (pendingFinish) {
        finishOnboarding(pendingFinish.oficioId, pendingFinish.opts);
        pendingFinish = null;
      }
    });
  }

  function tryShow() {
    if (!isLicenseReady() || isOnboardingDone()) return false;
    showGate();
    return true;
  }

  global.ArpaOnboarding = {
    ONBOARDING_KEY,
    RUBRO_KEY,
    isOnboardingDone,
    loadDemoCatalog,
    tryShow,
    initOnboarding,
    renderRubroButtons
  };

  document.addEventListener('DOMContentLoaded', () => {
    initOnboarding();
    tryShow();
  });
})(window);
