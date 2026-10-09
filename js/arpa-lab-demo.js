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
  const OFICIO_AUTOMATISMOS = 'automatismos';
  const LAB_DEMO_PRODUCTS = [
    { cod: 'LAB-MOT-01', nom: 'Motor corredizo residencial (prueba)', pvpCop: 2200000, unidad: 'unidad', marca: 'LAB', categoria: 'Motores' },
    { cod: 'LAB-FOT-01', nom: 'Par de fotoceldas (prueba)', pvpCop: 180000, unidad: 'unidad', marca: 'LAB', categoria: 'Accesorios' },
    { cod: 'LAB-CTL-01', nom: 'Control remoto (prueba)', pvpCop: 95000, unidad: 'unidad', marca: 'LAB', categoria: 'Controles' },
    { cod: 'LAB-CRE-01', nom: 'Cremallera 1 m (prueba)', pvpCop: 45000, unidad: 'metro', marca: 'LAB', categoria: 'Accesorios' },
    { cod: 'LAB-LUZ-01', nom: 'Luz de cortesía (prueba)', pvpCop: 120000, unidad: 'unidad', marca: 'LAB', categoria: 'Accesorios' }
  ];
  const COBRO_LABEL_FALLBACK = {
    instalacion: 'Instalación',
    visitaTecnica: 'Visita Técnica',
    mantenimiento: 'Mantenimiento Preventivo',
    reparacion: 'Reparación',
    manoObra: 'Mano de Obra (hora)'
  };

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
  }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function seedLabDemoCatalog() {
    const cat = global.ArpaMiCatalogo;
    if (!cat || typeof cat.getProducts !== 'function' || typeof cat.saveProducts !== 'function') {
      return false;
    }
    let categories = cat.getCategories(OFICIO_AUTOMATISMOS) || [];
    let products = cat.getProducts(OFICIO_AUTOMATISMOS) || [];
    const catByName = new Map(
      categories.map((c) => [String(c.name || '').trim().toLowerCase(), c.id])
    );

    function ensureCategory(name) {
      const label = String(name || 'General').trim() || 'General';
      const key = label.toLowerCase();
      if (catByName.has(key)) return catByName.get(key);
      const id = newId();
      categories.push({ id: id, name: label, oficioId: OFICIO_AUTOMATISMOS });
      catByName.set(key, id);
      return id;
    }

    let changed = false;
    LAB_DEMO_PRODUCTS.forEach((item) => {
      const categoriaId = ensureCategory(item.categoria);
      const existing = products.find((p) => String(p.cod || '').trim().toUpperCase() === item.cod);
      const marked = global.ArpaPricing?.markPrecargadoProduct?.({
        id: existing?.id || newId(),
        cod: item.cod,
        nom: item.nom,
        unidad: item.unidad,
        marca: item.marca,
        categoriaId: categoriaId,
        oficioId: OFICIO_AUTOMATISMOS
      }, item.pvpCop) || {
        id: existing?.id || newId(),
        cod: item.cod,
        nom: item.nom,
        pvp: item.pvpCop,
        pvpCop: item.pvpCop,
        precioPrecargado: true,
        unidad: item.unidad,
        marca: item.marca,
        categoriaId: categoriaId,
        oficioId: OFICIO_AUTOMATISMOS
      };
      if (existing) {
        Object.assign(existing, marked, { id: existing.id });
        changed = true;
      } else {
        products.push(marked);
        changed = true;
      }
    });

    if (changed) {
      if (typeof cat.saveCategories === 'function') cat.saveCategories(categories, OFICIO_AUTOMATISMOS);
      cat.saveProducts(products, OFICIO_AUTOMATISMOS);
      global.ArpaMiCatalogo?.resyncPrecargadoPrices?.();
      global.ArpaMiCatalogo?.render?.();
      global.ArpaMiCatalogo?.renderConvertedPriceNotice?.();
    }
    return true;
  }

  function seedLabDemoCobros() {
    const defaults = global.ArpaPricing?.DEFAULT_PRICE_LIST;
    if (!defaults || !global.ArpaCobros || typeof global.ArpaCobros.setLines !== 'function') {
      return false;
    }
    try {
      if (!global.localStorage.getItem(global.ArpaPricing.PRICE_LIST_KEY || 'arpa_suite_price_list')) {
        global.localStorage.setItem(global.ArpaPricing.PRICE_LIST_KEY || 'arpa_suite_price_list', '{}');
      }
    } catch (e) {}
    const lines = Object.keys(defaults).map((key) => {
      const item = defaults[key];
      const label = global.ArpaI18n?.t?.(item.labelKey);
      return {
        desc: (label && !/pricing\.default\./i.test(label)) ? label : (COBRO_LABEL_FALLBACK[key] || key),
        priceKey: key,
        valueCop: item.value,
        userEdited: false
      };
    });
    global.ArpaCobros.setLines('cot', lines, { keepSeeded: true });
    if (typeof global.ArpaCobros.refreshPrecargadoValues === 'function') {
      global.ArpaCobros.refreshPrecargadoValues('cot');
    }
    if (global.ArpaCotizacion && typeof global.ArpaCotizacion.renderTablaCot === 'function') {
      global.ArpaCotizacion.renderTablaCot(false);
    }
    return true;
  }

  function seedLabDemoData() {
    if (!isAllowed()) return;
    seedLabDemoCatalog();
    seedLabDemoCobros();
  }

  function paintLocalBadge(badge) {
    if (!badge || !isAllowed()) return false;
    badge.style.display = 'inline-block';
    badge.textContent = 'LAB demo';
    badge.title = 'Modo Demo LAB: sin licencia ni sincronización';
    badge.style.background = 'rgba(217,119,6,0.15)';
    badge.style.color = '#b45309';
    return true;
  }

  function activateIfAllowed() {
    if (!isAllowed()) return false;
    skipOnboarding();
    hideLicenseUi();
    applyLocalDemoSettings();
    seedLabDemoData();
    if (global.ArpaBrand && typeof global.ArpaBrand.applyToUI === 'function') {
      global.ArpaBrand.applyToUI();
    }
    if (global.ArpaI18n && typeof global.ArpaI18n.applyCountryLabels === 'function') {
      global.ArpaI18n.applyCountryLabels();
    }
    if (global.ArpaI18n && typeof global.ArpaI18n.refreshBrandTexts === 'function') {
      global.ArpaI18n.refreshBrandTexts();
    }
    if (global.ArpaCotizacion && typeof global.ArpaCotizacion.syncTaxLabels === 'function') {
      global.ArpaCotizacion.syncTaxLabels();
    }
    seedLabDemoData();
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
    activateIfAllowed: activateIfAllowed,
    seedLabDemoData: seedLabDemoData,
    paintLocalBadge: paintLocalBadge
  };

  global.addEventListener('DOMContentLoaded', function () {
    if (!isAllowed()) return;
    seedLabDemoData();
  });
  global.addEventListener('load', function () {
    if (!isAllowed()) return;
    seedLabDemoData();
    if (global.ArpaCotizacion?.syncTaxLabels) global.ArpaCotizacion.syncTaxLabels();
    if (global.ArpaI18n?.refreshBrandTexts) global.ArpaI18n.refreshBrandTexts();
  });
})(window);
