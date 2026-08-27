/**
 * Marca blanca: configuración de empresa, logo y aplicación dinámica a la UI/PDF
 */
(function (global) {
  const SETTINGS_KEY = 'arpa_suite_user_settings';
  const SETTINGS_CONFIGURED_KEY = 'arpa_suite_settings_configured';
  const LICENSE_CODE_KEY = 'arpa_suite_license_code';
  const LICENSE_API = 'https://script.google.com/macros/s/AKfycbzKBeyDVWVqPG1R47EZTVKmCpa3SOwxs8LXrW4ipvRtiyyRV4trJKg7D4i89_cUTcH2/exec';
  const SALES_ENTRY_KEY = 'arpa_suite_sales_entry';
  const FORMATO_DRAFT_KEY = 'arpa_formato_borrador';
  const LOGO_STORAGE_KEY = 'arpa_logo';
  const GLOBAL_BRAND_URL = 'https://arpatechnologyglobal.com';
  const GLOBAL_FOOTER_TEXT = 'Generado con ARPA Suite · Pruébala gratis en arpatechnologyglobal.com · © 2026';
  function getGlobalFooterText() {
    return window.ArpaI18n?.t?.('brand.footer.global') || GLOBAL_FOOTER_TEXT;
  }
  const WL_FOOTER_TEXT = '';
  const COT_NOTA_LEGAL_HTML = '<strong>Nota:</strong> Cotización válida por <strong>15 días calendario</strong>. Precios en pesos colombianos (COP).';

  function getCotNotaLegalHtml() {
    const code = window.ArpaPricing?.getDefaultCurrency?.() || 'COP';
    const nameKey = 'currency.name.' + code.toLowerCase();
    const monedaNombre = window.ArpaI18n?.t?.(nameKey) || code;
    return window.ArpaI18n?.t?.('cot.nota_legal', { moneda_nombre: monedaNombre, moneda_codigo: code }) || COT_NOTA_LEGAL_HTML;
  }

  function isInternalAppUrl(url) {
    const u = String(url || '').trim().toLowerCase();
    return !u || u.includes('github.io') || u.includes('/formato-arlenpav');
  }

  const EMPTY_SETTINGS = {
    companyName: '',
    nit: '',
    address: '',
    city: '',
    phone: '',
    website: '',
    bankName: '',
    accountType: 'Ahorros',
    accountNumber: '',
    accountHolder: '',
    accountHolderDocument: '',
    technicianName: '',
    technicianDocument: '',
    technicianCode: '',
    activeOficios: ['automatismos'],
    logoBase64: '',
    appBrandName: '',
    appLogoBase64: ''
  };

  /** @deprecated use EMPTY_SETTINGS — kept for callers that read DEFAULTS */
  const DEFAULTS = { ...EMPTY_SETTINGS };

  const LEGACY_COMPANY_PATTERNS = [
    /automatismos\s*arlen\s*pav/i,
    /automatismos\s*arlenpav/i,
    /^automatismos\s*arpa/i,
    /arlen\s*pavon/i,
    /arlenpav/i
  ];
  const LEGACY_NIT_PATTERNS = [
    /901\.?\s*473\.?\s*259/i
  ];
  const LEGACY_PHONE_PATTERNS = [
    /300[\s.-]?568[\s.-]?3914/,
    /315[\s.-]?183[\s.-]?1998/
  ];

  const DEFAULT_LOGO = './icon-192x192.png';

  let pendingLogoBase64 = null;
  let pendingAppLogoBase64 = null;

  const DEFAULT_APP_BRAND_NAME = 'ARPA Suite';

  function hasUserSettings() {
    try {
      return localStorage.getItem(SETTINGS_CONFIGURED_KEY) === 'true';
    } catch (e) {
      return false;
    }
  }

  function isLegacyPreset(saved) {
    if (!saved || typeof saved !== 'object') return false;
    const fields = [
      saved.companyName,
      saved.nit,
      saved.address,
      saved.phone,
      saved.technicianName,
      saved.accountHolder,
      saved.website
    ];
    if (fields.some((v) => isLegacyFieldValue(v))) return true;
    if (LEGACY_NIT_PATTERNS.some((re) => re.test(String(saved.nit || '')))) return true;
    return false;
  }

  function containsLegacyBrandText(text) {
    const blob = String(text || '').toLowerCase();
    if (LEGACY_COMPANY_PATTERNS.some((re) => re.test(blob))) return true;
    if (blob.includes('automatismos') && blob.includes('arlen')) return true;
    return false;
  }

  function isFakeDefaultSettings(saved) {
    if (!saved || typeof saved !== 'object') return false;
    const name = String(saved.companyName || '').trim();
    const nit = String(saved.nit || '').trim();
    const phone = String(saved.phone || '').replace(/\D/g, '');
    const address = String(saved.address || '').trim();
    if (/^su empresa/i.test(name) && /^000/.test(nit.replace(/\D/g, ''))) return true;
    if (name === 'Su Empresa S.A.S.' && nit === '000.000.000-0') return true;
    if (address === 'Dirección comercial' && phone === '0000000000') return true;
    return false;
  }

  function isLegacyFieldValue(value) {
    const text = String(value || '').trim();
    if (!text) return false;
    if (containsLegacyBrandText(text)) return true;
    if (LEGACY_NIT_PATTERNS.some((re) => re.test(text))) return true;
    if (LEGACY_PHONE_PATTERNS.some((re) => re.test(text))) return true;
    return false;
  }

  function shouldPurgeSettings(saved) {
    if (!saved || typeof saved !== 'object') return false;
    if (isLegacyPreset(saved)) return true;
    if (containsLegacyBrandText(JSON.stringify(saved))) return true;
    if (!hasUserSettings() && isFakeDefaultSettings(saved)) return true;
    return false;
  }

  function scrubLegacyInputValues(root) {
    const scope = root || document;
    scope.querySelectorAll('input:not([type=file]):not([type=radio]):not([type=checkbox]), textarea, select').forEach((el) => {
      if (el.tagName === 'SELECT') return;
      const val = el.value;
      if (isLegacyFieldValue(val)) el.value = '';
    });
  }

  function resetUnconfiguredFormFields() {
    if (hasUserSettings()) return;
    scrubLegacyInputValues(document.getElementById('view-formato'));
    scrubLegacyInputValues(document.getElementById('view-cotizacion'));
    scrubLegacyInputValues(document.getElementById('view-cuenta-cobro'));
  }

  function migrateConfiguredFlag() {
    if (hasUserSettings()) return;
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      if (saved.companyName?.trim() && !isLegacyPreset(saved)) {
        localStorage.setItem(SETTINGS_CONFIGURED_KEY, 'true');
      }
    } catch (e) {}
  }

  function shouldPurgeDraft(draftRaw) {
    if (!draftRaw || draftRaw === '{}') return false;
    if (containsLegacyBrandText(draftRaw)) return true;
    try {
      const data = JSON.parse(draftRaw);
      return Object.values(data).some((v) => isLegacyFieldValue(String(v)));
    } catch (e) {
      return false;
    }
  }

  function getDedicatedLogo() {
    try {
      return localStorage.getItem(LOGO_STORAGE_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function setDedicatedLogo(logo) {
    try {
      const value = String(logo || '').trim();
      if (value) localStorage.setItem(LOGO_STORAGE_KEY, value);
      else localStorage.removeItem(LOGO_STORAGE_KEY);
      return true;
    } catch (e) {
      console.warn('[arpa-brand] setDedicatedLogo', e);
      showError(window.ArpaI18n.t('alert.brand.logo_no_guardado_quota'));
      return false;
    }
  }

  function migrateDedicatedLogoFromSettings() {
    try {
      if (getDedicatedLogo()) return;
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      const logo = String(saved.logoBase64 || '').trim();
      if (logo) setDedicatedLogo(logo);
    } catch (e) {}
  }

  function resolveLogoFromSettings(settings) {
    const dedicated = getDedicatedLogo();
    const fromSettings = String(settings?.logoBase64 || '').trim();
    return dedicated || fromSettings || '';
  }

  function purgeLegacyData() {
    try {
      const logoBackup = getDedicatedLogo();
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      if (!logoBackup) {
        const fromSettings = String(saved.logoBase64 || '').trim();
        if (fromSettings) setDedicatedLogo(fromSettings);
      }
      if (shouldPurgeSettings(saved)) {
        localStorage.removeItem(SETTINGS_KEY);
        localStorage.removeItem(SETTINGS_CONFIGURED_KEY);
      }
      const draft = localStorage.getItem(FORMATO_DRAFT_KEY) || '';
      if (shouldPurgeDraft(draft)) {
        localStorage.removeItem(FORMATO_DRAFT_KEY);
      }
      migrateConfiguredFlag();
    } catch (e) {}
  }

  function getSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      const merged = { ...EMPTY_SETTINGS, ...saved };
      const logo = resolveLogoFromSettings(merged);
      if (logo) merged.logoBase64 = logo;
      return merged;
    } catch (e) {
      const merged = { ...EMPTY_SETTINGS };
      const logo = resolveLogoFromSettings(merged);
      if (logo) merged.logoBase64 = logo;
      return merged;
    }
  }

  function saveSettings(data) {
    if (!data || typeof data !== 'object') return false;
    let hasLogoPayload = false;
    try {
      const current = getSettings();
      const merged = { ...current, ...data };
      hasLogoPayload = Boolean(String(merged.logoBase64 || '').trim());
      const dedicatedLogo = getDedicatedLogo() || String(current.logoBase64 || '').trim();
      if ('logoBase64' in data && !String(data.logoBase64 || '').trim() && dedicatedLogo) {
        merged.logoBase64 = dedicatedLogo;
      }
      if (hasLogoPayload) {
        if (!setDedicatedLogo(merged.logoBase64)) return false;
      }
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      return true;
    } catch (e) {
      console.warn('[arpa-brand]', e);
      const isQuota = e && (e.name === 'QuotaExceededError' || e.code === 22);
      showError(
        hasLogoPayload && isQuota
          ? window.ArpaI18n.t('alert.brand.logo_no_guardado_quota')
          : window.ArpaI18n.t('alert.brand.config_no_guardada')
      );
      return false;
    }
  }

  let companyApiCounter = 0;

  function getLicenseCode() {
    try {
      return (localStorage.getItem(LICENSE_CODE_KEY) || '').trim().toUpperCase();
    } catch (e) {
      return '';
    }
  }

  function licenseJsonp(params) {
    return new Promise((resolve, reject) => {
      companyApiCounter += 1;
      const cbName = 'arpaCompanyCb' + companyApiCounter + '_' + Date.now();
      const scriptId = 'arpa-company-jsonp-' + companyApiCounter;
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('timeout'));
      }, 15000);

      function cleanup() {
        clearTimeout(timeout);
        delete global[cbName];
        document.getElementById(scriptId)?.remove();
      }

      global[cbName] = (data) => {
        cleanup();
        resolve(data);
      };

      const qs = Object.keys(params).map((key) =>
        encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
      );
      qs.push('callback=' + encodeURIComponent(cbName));

      const script = document.createElement('script');
      script.id = scriptId;
      script.onerror = () => {
        cleanup();
        reject(new Error('network'));
      };
      script.src = LICENSE_API + '?' + qs.join('&');
      document.head.appendChild(script);
    });
  }

  function needsCompanyRestoreFromSheets() {
    const licencia = getLicenseCode();
    if (!licencia) return false;
    // v2: también sincronizar si toca por intervalo (cada 30 min)
    // ArpaCloudSync carga después de arpa-brand en el HTML, pero este
    // código corre en DOMContentLoaded, cuando ya todos los scripts están listos.
    if (global.ArpaCloudSync?.shouldSyncNow?.()) return true;
    const current = getSettings();
    if (String(current.companyName || '').trim()) return false;
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw || raw === '{}') return true;
    } catch (e) {
      return true;
    }
    return !hasUserSettings();
  }

  function pushCompanyDataToSheets(settings) {
    const licencia = getLicenseCode();
    if (!licencia) return;
    const payload = {
      accion: 'saveCompanyData',
      licencia,
      nombreEmpresa: settings.companyName || '',
      nit: settings.nit || '',
      direccion: settings.address || '',
      ciudad: settings.city || '',
      telefono: settings.phone || '',
      sitioWeb: settings.website || '',
      logoBase64: settings.logoBase64 || '',
      banco: settings.bankName || '',
      tipoCuenta: settings.accountType || '',
      numeroCuenta: settings.accountNumber || '',
      titularCuenta: settings.accountHolder || '',
      documentoTitular: settings.accountHolderDocument || '',
      nombreTecnico: settings.technicianName || '',
      documentoTecnico: settings.technicianDocument || '',
      codigoTecnico: settings.technicianCode || ''
    };
    const logoLen = String(payload.logoBase64 || '').length;
    if (logoLen > 1500 && global.ArpaCloudSync?.postJson) {
      global.ArpaCloudSync.postJson(payload).catch((err) => {
        console.warn('[arpa-brand] saveCompanyData POST', err);
      });
      return;
    }
    licenseJsonp(payload).catch((err) => {
      console.warn('[arpa-brand] saveCompanyData', err);
    });
  }

  function restoreCompanyDataFromSheets() {
    if (!needsCompanyRestoreFromSheets()) return Promise.resolve(false);
    const licencia = getLicenseCode();
    return licenseJsonp({ accion: 'getCompanyData', licencia })
      .then((data) => {
        if (!data || !data.encontrado || !String(data.nombreEmpresa || '').trim()) return false;
        const current = getSettings();
        const patch = {
          companyName: data.nombreEmpresa || '',
          nit: data.nit || current.nit || '',
          address: data.direccion || current.address || '',
          city: data.ciudad || current.city || '',
          phone: data.telefono || current.phone || '',
          website: data.sitioWeb || current.website || '',
          logoBase64: data.logoBase64 || current.logoBase64 || '',
          bankName: data.banco || current.bankName || '',
          accountType: data.tipoCuenta || current.accountType || '',
          accountNumber: data.numeroCuenta || current.accountNumber || '',
          accountHolder: data.titularCuenta || current.accountHolder || '',
          accountHolderDocument: data.documentoTitular || current.accountHolderDocument || '',
          technicianName: data.nombreTecnico || current.technicianName || '',
          technicianDocument: data.documentoTecnico || current.technicianDocument || '',
          technicianCode: data.codigoTecnico || current.technicianCode || ''
        };
        if (!saveSettings(patch)) return false;
        if (String(patch.logoBase64 || '').trim()) setDedicatedLogo(patch.logoBase64);
        try { localStorage.setItem(SETTINGS_CONFIGURED_KEY, 'true'); } catch (e) {}
        return true;
      })
      .catch((err) => {
        console.warn('[arpa-brand] getCompanyData', err);
        return false;
      });
  }

  function getLogo(settings) {
    const logo = resolveLogoFromSettings(settings);
    return logo || DEFAULT_LOGO;
  }

  function canCustomizeAppBrand() {
    return global.ArpaLicense?.canCustomizeBrand?.() ?? false;
  }

  function getAppLogo(settings) {
    if (canCustomizeAppBrand() && settings?.appLogoBase64) {
      return settings.appLogoBase64;
    }
    return DEFAULT_LOGO;
  }

  function getAppBrandName(settings) {
    if (canCustomizeAppBrand() && settings?.appBrandName?.trim()) {
      return settings.appBrandName.trim();
    }
    return DEFAULT_APP_BRAND_NAME;
  }

  function val(value, fallback) {
    const v = (value || '').trim();
    return v || fallback;
  }

  function showError(msg) {
    const el = document.getElementById('settings-error');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const body = document.querySelector('#settings-modal .settings-modal-body');
    if (body) body.scrollTop = 0;
  }

  function clearError() {
    const el = document.getElementById('settings-error');
    if (!el) return;
    el.textContent = '';
    el.classList.remove('visible');
  }

  function formatBankBlock(s) {
    const settings = s || getSettings();
    const bankName = val(settings.bankName, '');
    const accountType = val(settings.accountType, 'Ahorros');
    const accountNumber = val(settings.accountNumber, '');

    if (!bankName && !accountNumber) {
      if (!hasUserSettings()) {
        return '<em>' + window.ArpaI18n.t('brand.banco.configurar') + '</em>';
      }
      return '<em>' + window.ArpaI18n.t('brand.banco.completar') + '</em>';
    }
    const accountTypeKey = accountType === 'Corriente' ? 'cc.cuenta.corriente' : 'cc.cuenta.ahorros';
    const accountTypeLabel = window.ArpaI18n?.t?.(accountTypeKey) || accountType;
    return window.ArpaI18n.t('brand.banco.linea', { bank: val(bankName, '—'), tipo: accountTypeLabel, numero: val(accountNumber, '—') })
      .replace(/^(.*?):/, '<strong>$1:</strong>');
  }

  function syncBankBlocksForPrint() {
    const html = formatBankBlock(getSettings());
    ['brand-bank-block-formato', 'brand-bank-block'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    });
  }

  function applyToUI() {
    const s = getSettings();
    const configured = hasUserSettings() && Boolean(s.companyName?.trim());
    document.documentElement.classList.toggle('brand-unconfigured', !configured);

    const company = (s.companyName || '').trim();
    const companyUpper = configured ? company.toUpperCase() : (window.ArpaI18n?.t?.('brand.company_name.placeholder') || 'NOMBRE DE TU EMPRESA');
    const companyLogo = getLogo(s);
    const appLogo = getAppLogo(s);
    const appBrandName = getAppBrandName(s);

    const set = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };

    set('brand-logo', (el) => {
      el.src = companyLogo;
      el.alt = configured ? (company + ' – Logo') : (appBrandName + ' – Logo');
    });
    set('license-gate-logo', (el) => { el.src = appLogo; el.alt = appBrandName; });
    set('settings-logo-preview', (el) => { el.src = companyLogo; el.alt = 'Vista previa del logo en documentos'; });
    set('settings-app-logo-preview', (el) => { el.src = appLogo; el.alt = 'Vista previa del logo de la app'; });
    set('brand-company-name', (el) => {
      el.textContent = companyUpper;
      el.classList.toggle('brand-placeholder', !configured);
    });
    set('brand-company-contact', (el) => {
      if (!configured) {
        el.innerHTML = window.ArpaI18n?.t?.('brand.company_contact.placeholder') || 'Configure su empresa en <strong>⚙️ Ajustes</strong> para personalizar este documento.';
        return;
      }
      let html = `NIT: ${val(s.nit, '—')} &nbsp;|&nbsp; Tel: ${val(s.phone, '—')}<br>${val(s.address, '—')}`;
      const website = (s.website || '').trim();
      if (website && !isInternalAppUrl(website)) html += `<br>${website}`;
      el.innerHTML = html;
    });
    set('brand-screen-footer', (el) => {
      if (el.dataset.editable !== 'true') return;
      if (!configured) {
        el.innerHTML = window.ArpaI18n?.t?.('brand.screen_footer.placeholder') || 'Configure los datos de su empresa en ⚙️ Ajustes';
        return;
      }
      el.innerHTML = `${company} &nbsp;|&nbsp; NIT ${val(s.nit, '—')} &nbsp;|&nbsp; Tel ${val(s.phone, '—')}`;
    });
    set('brand-bank-block', (el) => { el.innerHTML = formatBankBlock(s); });
    set('brand-bank-block-formato', (el) => { el.innerHTML = formatBankBlock(s); });
    set('brand-warranty-header', (el) => {
      el.innerHTML = configured
        ? `<span class="shield">🛡️</span> Garantía – ${company}`
        : '<span class="shield">🛡️</span> Términos de Garantía';
    });
    set('brand-warranty-exclusion', (el) => {
      el.innerHTML = configured
        ? `<strong>Exclusiones de garantía:</strong> La garantía no aplica sobre daños causados por descargas eléctricas, sobretensiones, rayos u otras causas externas. Tampoco aplica cuando el equipo ha sido intervenido por <strong>personal no autorizado por ${company}</strong>.`
        : '<strong>Exclusiones de garantía:</strong> La garantía no aplica sobre daños por causas externas, descargas eléctricas o intervención de personal no autorizado.';
    });
    set('brand-verification-company', (el) => { el.textContent = configured ? company : 'su empresa'; });
    document.querySelectorAll('[data-brand-company]').forEach((el) => { el.textContent = configured ? company : 'su empresa'; });
    set('brand-technician-signature-label', (el) => {
      el.textContent = s.technicianName?.trim() ? `Firma Técnico – ${s.technicianName}` : 'Firma Técnico';
    });
    set('cot-elaborado-label', (el) => {
      el.textContent = s.technicianName?.trim() ? `Elaborado por – ${s.technicianName}` : 'Elaborado por';
    });
    set('cot-nota-legal', (el) => {
      el.innerHTML = getCotNotaLegalHtml();
    });
    set('validation-text', (el) => { el.textContent = appBrandName + ' · Listo'; });
    set('license-gate-title', (el) => {
      if (canCustomizeAppBrand() && s.appBrandName?.trim()) {
        el.textContent = appBrandName;
      }
    });

    const tech = document.getElementById('campo-tecnico-responsable');
    const techFirma = document.getElementById('campo-tecnico-firma');
    if (configured && tech && !tech.value.trim() && s.technicianName) tech.value = s.technicianName;
    if (configured && techFirma && !techFirma.value.trim() && s.technicianName) techFirma.value = s.technicianName;

    const cotNom = document.getElementById('cot-elaborado-nombre');
    const cotTel = document.getElementById('cot-elaborado-tel');
    if (configured && cotNom && !cotNom.value.trim() && s.technicianName) cotNom.value = s.technicianName;
    if (configured && cotTel && !cotTel.value.trim() && s.phone?.trim()) cotTel.value = s.phone.trim();

    document.title = document.title.includes('–') ? document.title : (configured ? `${appBrandName} – ${company}` : appBrandName);
    if (!configured) resetUnconfiguredFormFields();
    applyCuentaCobroFromSettings(s, { fillPago: 'if-empty' });
    window.ArpaI18n?.refreshBrandTexts?.();
  }

  function applyCuentaCobroFromSettings(s, options) {
    s = s || getSettings();
    const opts = options || {};
    const fillPago = opts.fillPago || 'if-empty';
    const configured = hasUserSettings() && Boolean(s.companyName?.trim());
    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = (text || '').trim() || '—';
    };

    setText('cc-cobrador-nombre', configured ? s.technicianName : '');
    setText('cc-cobrador-doc', configured ? s.technicianDocument : '');
    setText('cc-cobrador-empresa', configured ? s.companyName : '');
    setText('cc-cobrador-nit', configured ? s.nit : '');
    setText('cc-cobrador-tel', configured ? s.phone : '');
    setText('cc-cobrador-dir', configured ? s.address : '');
    const website = configured ? (s.website || '').trim() : '';
    setText('cc-cobrador-web', website && !isInternalAppUrl(website) ? website : '');

    const ccLogo = document.getElementById('cc-brand-logo');
    if (ccLogo) {
      ccLogo.src = getLogo(s);
      ccLogo.alt = configured ? (s.companyName || 'Logo empresa') : 'Logo empresa';
      ccLogo.hidden = !configured;
    }

    const firmaNom = document.getElementById('cc-firma-cobrador-nombre');
    if (firmaNom) firmaNom.textContent = configured ? (s.technicianName || '').trim() || '—' : '—';

    if (!configured || fillPago === 'never') return;

    const assignPago = (id, value) => {
      const el = document.getElementById(id);
      if (!el) return;
      const next = (value || '').trim();
      if (fillPago === 'always' || !el.value.trim()) el.value = next;
    };
    assignPago('cc-pago-banco', s.bankName);
    assignPago('cc-pago-numero', s.accountNumber);
    assignPago('cc-pago-titular', s.accountHolder);
    assignPago('cc-pago-titular-doc', s.accountHolderDocument);
    const tipo = document.getElementById('cc-pago-tipo');
    if (tipo && (fillPago === 'always' || !tipo.value)) tipo.value = s.accountType || 'Ahorros';

    const ciudad = document.getElementById('cc-ciudad');
    if (ciudad && (fillPago === 'always' || !ciudad.value.trim())) {
      let city = (s.city || '').trim();
      if (!city && (s.address || '').trim()) {
        const tail = String(s.address).split(/[–—-]/).pop()?.trim() || '';
        city = tail.split(',')[0]?.trim() || '';
      }
      if (city) ciudad.value = city;
    }
  }

  function imageHasTransparency(ctx, width, height) {
    const pixels = ctx.getImageData(0, 0, width, height).data;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] < 255) return true;
    }
    return false;
  }

  function compressLogoDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxSide = 400;
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;
          if (!width || !height) {
            resolve(dataUrl);
            return;
          }
          const scale = Math.min(1, maxSide / Math.max(width, height));
          width = Math.max(1, Math.round(width * scale));
          height = Math.max(1, Math.round(height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const usePng = imageHasTransparency(ctx, width, height);
          resolve(usePng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.75));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('image-load'));
      img.src = dataUrl;
    });
  }

  function readLogoFile(input, onLoad) {
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showError(window.ArpaI18n.t('alert.brand.imagen_invalida'));
      input.value = '';
      return;
    }
    if (file.size > 15000000) {
      showError(window.ArpaI18n.t('alert.brand.imagen_muy_grande'));
      input.value = '';
      return;
    }
    clearError();
    const reader = new FileReader();
    reader.onload = (e) => {
      compressLogoDataUrl(e.target.result)
        .then(onLoad)
        .catch(() => {
          showError(window.ArpaI18n.t('alert.brand.imagen_no_procesada'));
          input.value = '';
        });
    };
    reader.onerror = () => {
      showError(window.ArpaI18n.t('alert.brand.imagen_no_leida'));
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  function previewLogo(input) {
    readLogoFile(input, (dataUrl) => {
      pendingLogoBase64 = dataUrl;
      if (!setDedicatedLogo(dataUrl)) {
        pendingLogoBase64 = null;
        input.value = '';
        return;
      }
      const preview = document.getElementById('settings-logo-preview');
      if (preview) preview.src = dataUrl;
    });
  }

  function previewAppLogo(input) {
    if (!canCustomizeAppBrand()) return;
    readLogoFile(input, (dataUrl) => {
      pendingAppLogoBase64 = dataUrl;
      const preview = document.getElementById('settings-app-logo-preview');
      if (preview) preview.src = dataUrl;
    });
  }

  function applyTechnicianCodePolicy() {
    const required = global.ArpaLicense?.requiresTechnicianCode?.() ?? false;
    const req = document.getElementById('settings-technician-code-req');
    const input = document.getElementById('settings-technician-code');
    if (req) req.hidden = !required;
    if (input) input.required = required;
  }

  function applyBrandCustomizationPolicy() {
    const allowed = canCustomizeAppBrand();
    const lockEl = document.getElementById('settings-brand-lock');
    const appBrandEl = document.getElementById('settings-app-brand');
    const appLogoEl = document.getElementById('settings-app-logo');
    const appLogoBox = document.getElementById('settings-app-logo-box');

    if (lockEl) lockEl.hidden = allowed;
    [appBrandEl, appLogoEl].forEach((el) => {
      if (!el) return;
      if (el.type === 'file') el.disabled = !allowed;
      else el.readOnly = !allowed;
      el.classList.toggle('brand-field-locked', !allowed);
    });
    if (appLogoBox) appLogoBox.classList.toggle('brand-customization-locked', !allowed);
  }

  function openSettings(menuBtn) {
    clearError();
    pendingLogoBase64 = null;
    pendingAppLogoBase64 = null;
    const s = getSettings();
    const fields = {
      'settings-company': s.companyName,
      'settings-nit': s.nit,
      'settings-address': s.address,
      'settings-city': s.city,
      'settings-phone': s.phone,
      'settings-website': s.website,
      'settings-app-brand': s.appBrandName,
      'settings-bank': s.bankName,
      'settings-account-type': s.accountType,
      'settings-account-number': s.accountNumber,
      'settings-account-holder': s.accountHolder,
      'settings-account-holder-doc': s.accountHolderDocument,
      'settings-technician': s.technicianName,
      'settings-technician-doc': s.technicianDocument,
      'settings-technician-code': s.technicianCode
    };
    Object.entries(fields).forEach(([id, v]) => {
      const el = document.getElementById(id);
      if (el) el.value = v || '';
    });
    const currencySelect = document.getElementById('settings-currency');
    if (currencySelect) currencySelect.value = s.currency || window.ArpaPricing?.getDefaultCurrency?.() || 'COP';
    const preview = document.getElementById('settings-logo-preview');
    if (preview) preview.src = getLogo(s);
    const appPreview = document.getElementById('settings-app-logo-preview');
    if (appPreview) appPreview.src = getAppLogo(s);
    const logoInput = document.getElementById('settings-logo');
    if (logoInput) logoInput.value = '';
    const appLogoInput = document.getElementById('settings-app-logo');
    if (appLogoInput) appLogoInput.value = '';
    applyBrandCustomizationPolicy();
    applyTechnicianCodePolicy();
    global.ArpaOficios?.renderSettingsCheckboxes?.(document.getElementById('settings-oficios-grid'));
    global.ArpaPricing?.renderPriceListSettings?.();
    document.getElementById('settings-modal')?.classList.add('open');
    if (menuBtn) {
      document.querySelectorAll('.main-menu-btn').forEach((b) => b.classList.remove('active'));
      menuBtn.classList.add('active');
    }
  }

  function closeSettings() {
    document.getElementById('settings-modal')?.classList.remove('open');
    pendingLogoBase64 = null;
    pendingAppLogoBase64 = null;
    const view = global.ArpaViews?.getCurrentView?.() || 'formato';
    document.querySelectorAll('.main-menu-btn').forEach((b) => b.classList.remove('active'));
    const sel = view === 'cotizacion'
      ? '.main-menu-btn[onclick*="openCotizacionView"]'
      : view === 'catalogo'
      ? '.main-menu-btn[onclick*="openCatalogoView"]'
      : view === 'cuenta-cobro'
      ? '.main-menu-btn[onclick*="openCuentaCobroView"]'
      : view === 'historial'
      ? '.main-menu-btn[onclick*="openHistorialView"]'
      : '.main-menu-btn[onclick*="scrollToTopMenu"]';
    document.querySelector(sel)?.classList.add('active');
  }

  function saveFromModal() {
    clearError();
    const canAppBrand = canCustomizeAppBrand();
    const companyName = document.getElementById('settings-company')?.value.trim();
    const nit = document.getElementById('settings-nit')?.value.trim();
    const address = document.getElementById('settings-address')?.value.trim();
    const city = document.getElementById('settings-city')?.value.trim();
    const phone = document.getElementById('settings-phone')?.value.trim();
    const currency = document.getElementById('settings-currency')?.value.trim() || 'COP';
    const bankName = document.getElementById('settings-bank')?.value.trim();
    const accountType = document.getElementById('settings-account-type')?.value.trim();
    const accountNumber = document.getElementById('settings-account-number')?.value.trim();

    const current = getSettings();

    if (!companyName || !nit || !address || !phone || !bankName || !accountType || !accountNumber) {
      showError(window.ArpaI18n.t('alert.brand.campos_obligatorios'));
      return;
    }

    const techCodeRaw = document.getElementById('settings-technician-code')?.value.trim() || '';
    const techCode = global.ArpaNumeracion?.normalizeTechnicianCode?.(techCodeRaw) || '';
    if (global.ArpaLicense?.requiresTechnicianCode?.() && !techCode) {
      showError(window.ArpaI18n.t('alert.brand.pyme_codigo_requerido'));
      return;
    }
    if (techCodeRaw && !techCode) {
      showError(window.ArpaI18n.t('alert.brand.codigo_tecnico_formato'));
      return;
    }

    const settings = {
      companyName,
      nit,
      address,
      city,
      phone,
      currency,
      website: (() => {
        const w = document.getElementById('settings-website')?.value.trim() || '';
        return isInternalAppUrl(w) ? '' : w;
      })(),
      bankName,
      accountType,
      accountNumber,
      accountHolder: document.getElementById('settings-account-holder')?.value.trim() || '',
      accountHolderDocument: document.getElementById('settings-account-holder-doc')?.value.trim() || '',
      technicianName: document.getElementById('settings-technician')?.value.trim() || '',
      technicianDocument: document.getElementById('settings-technician-doc')?.value.trim() || '',
      technicianCode: techCode,
      activeOficios: global.ArpaOficios?.readSettingsCheckboxes?.(
        document.getElementById('settings-oficios-grid')
      ) || global.ArpaOficios?.getActiveOficiosFromSettings?.() || ['automatismos'],
      logoBase64: pendingLogoBase64 !== null ? pendingLogoBase64 : (current.logoBase64 || ''),
      appBrandName: canAppBrand
        ? (document.getElementById('settings-app-brand')?.value.trim() || '')
        : (current.appBrandName || ''),
      appLogoBase64: canAppBrand
        ? (pendingAppLogoBase64 !== null ? pendingAppLogoBase64 : (current.appLogoBase64 || ''))
        : (current.appLogoBase64 || '')
    };

    if (!saveSettings(settings)) return;

    pushCompanyDataToSheets(settings);

    global.ArpaOficios?.saveActiveOficios?.(settings.activeOficios);

    try { localStorage.setItem(SETTINGS_CONFIGURED_KEY, 'true'); } catch (e) {}
    try { localStorage.setItem(SALES_ENTRY_KEY, 'true'); } catch (e) {}

    try {
      global.ArpaOficios?.seedActiveOficios?.();
      global.ArpaMiCatalogo?.render?.();
      global.ArpaCatalogo?.invalidateListaCache?.();
      global.ArpaCotizacion?.updateCatalogHint?.();
      global.ArpaPricing?.savePriceList?.(global.ArpaPricing.readPriceListFromSettingsForm());
      global.ArpaCobros?.seedFromPriceList?.('cot');
      global.ArpaCotizacion?.refreshCobros?.();
      global.ArpaCuentaCobro?.refreshView?.();
    } catch (e) {
      console.warn('[arpa-brand] post-save hooks', e);
    }

    pendingLogoBase64 = null;
    pendingAppLogoBase64 = null;
    applyToUI();
    closeSettings();
  }

  let printUiBackup = null;

  function prepareForPrint() {
    printUiBackup = { contactHtml: null, sealHtml: null };
    const contact = document.getElementById('brand-company-contact');
    if (contact) {
      printUiBackup.contactHtml = contact.innerHTML;
      contact.querySelectorAll('a').forEach((a) => {
        const span = document.createElement('span');
        span.textContent = a.textContent;
        a.replaceWith(span);
      });
      contact.innerHTML = contact.innerHTML.replace(/https?:\/\/[^\s<]*github\.io[^\s<]*/gi, '');
    }
    const seal = document.getElementById('arpa-global-seal');
    if (seal) {
      printUiBackup.sealHtml = seal.innerHTML;
      const isWL = global.ArpaLicense?.isWhiteLabelLicense?.() ?? false;
      seal.innerHTML = isWL ? '' : `<p class="suite-footer-global-text">${getGlobalFooterText()}</p>`;
    }
    document.querySelectorAll('#suite-footer a[href]').forEach((a) => {
      const span = document.createElement('span');
      span.className = 'suite-footer-global-link';
      span.textContent = a.textContent;
      a.replaceWith(span);
    });
  }

  function restoreAfterPrint() {
    if (!printUiBackup) return;
    const contact = document.getElementById('brand-company-contact');
    if (contact && printUiBackup.contactHtml != null) contact.innerHTML = printUiBackup.contactHtml;
    const seal = document.getElementById('arpa-global-seal');
    if (seal && printUiBackup.sealHtml != null) seal.innerHTML = printUiBackup.sealHtml;
    printUiBackup = null;
  }

  function protectGlobalSeal() {
    const seal = document.getElementById('arpa-global-seal');
    if (!seal || seal.dataset.arpaCore !== 'immutable') return;
    new MutationObserver(() => {
      const isWL = global.ArpaLicense?.isWhiteLabelLicense?.() ?? false;
      if (isWL) {
        if (seal.textContent.trim() !== '') seal.innerHTML = '';
        return;
      }
      const text = seal.textContent.replace(/\s+/g, ' ').trim();
      if (!text.includes('arpatechnologyglobal.com')) {
        seal.innerHTML = `<p class="suite-footer-global-text">${getGlobalFooterText()}</p>`;
      }
      seal.querySelectorAll('a[href*="github.io"], a[href*="Formato-Arlenpav"]').forEach((a) => a.remove());
    }).observe(seal, { childList: true, subtree: true, characterData: true });
  }

  global.ArpaBrand = {
    SETTINGS_KEY,
    SETTINGS_CONFIGURED_KEY,
    SALES_ENTRY_KEY,
    FORMATO_DRAFT_KEY,
    GLOBAL_BRAND_URL,
    GLOBAL_FOOTER_TEXT,
    getCotNotaLegalHtml,
    DEFAULTS,
    EMPTY_SETTINGS,
    DEFAULT_LOGO,
    hasUserSettings,
    purgeLegacyData,
    isLegacyPreset,
    isLegacyFieldValue,
    containsLegacyBrandText,
    shouldPurgeSettings,
    scrubLegacyInputValues,
    resetUnconfiguredFormFields,
    getSettings,
    saveSettings,
    getLogo,
    getAppLogo,
    getAppBrandName,
    applyToUI,
    applyCuentaCobroFromSettings,
    prepareForPrint,
    restoreAfterPrint,
    previewLogo,
    previewAppLogo,
    openSettings,
    closeSettings,
    saveFromModal,
    showError,
    formatBankBlock,
    syncBankBlocksForPrint
  };

  global.applyUserSettingsToUI = applyToUI;
  global.openSettingsModal = openSettings;
  global.closeSettingsModal = closeSettings;
  global.saveSettingsFromModal = saveFromModal;
  global.previewLogoUpload = previewLogo;
  global.previewAppLogoUpload = previewAppLogo;

  document.addEventListener('DOMContentLoaded', () => {
    migrateDedicatedLogoFromSettings();
    purgeLegacyData();
    restoreCompanyDataFromSheets()
      .then(() => global.ArpaCloudSync?.restoreCloudDataIfNeeded?.())
      .finally(() => {
        applyToUI();
        protectGlobalSeal();
      });
  });
  document.getElementById('settings-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'settings-modal') closeSettings();
  });
})(window);
