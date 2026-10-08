/**
 * Marca blanca: configuración de empresa, logo y aplicación dinámica a la UI/PDF
 */
(function (global) {
  const SETTINGS_KEY = 'arpa_suite_user_settings';
  const SETTINGS_CONFIGURED_KEY = 'arpa_suite_settings_configured';
  const LICENSE_CODE_KEY = 'arpa_suite_license_code';
  const LICENSE_API = 'https://script.google.com/macros/s/AKfycbwzSL7-wLi9VeyNUzkiGTGgdWEPXz5DpY2qjLOZjKXGRl8I6nleSFManrWwozNnbsUlQA/exec';
  const SALES_ENTRY_KEY = 'arpa_suite_sales_entry';
  const FORMATO_DRAFT_KEY = 'arpa_formato_borrador';
  const LOGO_STORAGE_KEY = 'arpa_logo';
  const DEMO_MODE_KEY = 'arpa_suite_demo_mode';
  const DEMO_BACKUP_SETTINGS_KEY = 'arpa_suite_demo_backup_settings';
  const DEMO_BACKUP_CONFIGURED_KEY = 'arpa_suite_demo_backup_configured';
  const DEMO_BACKUP_LOGO_KEY = 'arpa_suite_demo_backup_logo';
  const HOME_SETTINGS_KEY = 'arpa_suite_home_settings';
  const HOME_CONFIGURED_KEY = 'arpa_suite_home_configured';
  const HOME_LOGO_KEY = 'arpa_suite_home_logo';
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
    const html = window.ArpaI18n?.t?.('cot.nota_legal', { moneda_nombre: monedaNombre, moneda_codigo: code });
    if (html && !/cot\.nota_legal/i.test(html)) return html;
    return COT_NOTA_LEGAL_HTML
      .replace('pesos colombianos (COP)', (monedaNombre || 'pesos') + ' (' + (code || 'COP') + ')');
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
    country: '',
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
    appLogoBase64: '',
    warrantyTerms: '',
    clientRequirements: ''
  };

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  /** Fecha AAAA-MM-DD en hora local del dispositivo (no UTC). */
  function fechaLocalISO(date) {
    const d = date instanceof Date ? date : new Date(date == null ? Date.now() : date);
    if (Number.isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

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
    if (hasUserSettings()) return false;
    if (!saved || typeof saved !== 'object') return false;
    if (isLegacyPreset(saved)) return true;
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
    if (hasUserSettings()) return false;
    if (!draftRaw || draftRaw === '{}') return false;
    return false;
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
  let countryWhenSettingsOpened = '';

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
    if (isDemoMode()) return;
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
    const licencia = getLicenseCode();
    if (!licencia) return Promise.resolve(false);
    if (!isDemoMode() && !needsCompanyRestoreFromSheets()) return Promise.resolve(false);
    return licenseJsonp({ accion: 'getCompanyData', licencia })
      .then((data) => {
        if (!data || !data.encontrado || !String(data.nombreEmpresa || '').trim()) return false;
        persistHomeFromSheets(data);
        if (isDemoMode()) {
          if (repairInvertedDemoIfNeeded(data.nombreEmpresa) && typeof document !== 'undefined') {
            applyToUI();
          }
          return false;
        }
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
        persistHomeFromCurrent();
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
    const accountTypeKey = accountType === 'Corriente'
      ? 'cc.cuenta.corriente'
      : accountType === 'CLABE'
        ? 'cc.cuenta.clabe'
        : 'cc.cuenta.ahorros';
    let accountTypeLabel = window.ArpaI18n?.t?.(accountTypeKey) || accountType;
    if (!accountTypeLabel || /cc\.cuenta\./i.test(accountTypeLabel)) accountTypeLabel = accountType;
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

  const DEFAULT_REQUIREMENTS_HTML = 'El cliente debe suministrar punto eléctrico (110V–220V) con polo a tierra para la instalación, incluyendo cableado y tubería para sensores si se requieren.';

  function applyLegalCopyToDocuments(options) {
    const onlyCustom = !!(options && options.onlyCustom);
    const s = getSettings();
    const customW = String(s.warrantyTerms || '').trim();
    const customR = String(s.clientRequirements || '').trim();
    const t = (key, vars) => window.ArpaI18n?.t?.(key, vars) || '';
    const lang = (document.documentElement.lang || 'es').toLowerCase();

    document.querySelectorAll('[data-arpa-warranty-items]').forEach((el) => {
      el.hidden = !!customW;
    });
    document.querySelectorAll('[data-arpa-warranty-custom]').forEach((el) => {
      el.hidden = !customW;
      el.textContent = customW;
    });

    document.querySelectorAll('[data-arpa-requirements-body]').forEach((el) => {
      if (customR) {
        el.textContent = customR;
        return;
      }
      if (onlyCustom) return;
      if (lang === 'en') {
        const html = t('formato.nota.body');
        el.innerHTML = (html && html !== 'formato.nota.body') ? html : DEFAULT_REQUIREMENTS_HTML;
        return;
      }
      const def = el.getAttribute('data-i18n-default-html');
      el.innerHTML = def != null ? def : DEFAULT_REQUIREMENTS_HTML;
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
      const taxId = global.ArpaPricing?.getTaxIdLabel?.() || 'NIT';
      const phone = global.ArpaPricing?.formatCompanyPhone?.(s.phone) || val(s.phone, '—');
      let html = `${taxId}: ${val(s.nit, '—')} &nbsp;|&nbsp; Tel: ${phone}<br>${val(s.address, '—')}`;
      const website = (s.website || '').trim();
      if (website && !isInternalAppUrl(website)) html += `<br>${website}`;
      el.innerHTML = html;
    });
    const footerLocalHtml = !configured
      ? (window.ArpaI18n?.t?.('brand.screen_footer.placeholder') || 'Configure los datos de su empresa en ⚙️ Ajustes')
      : (() => {
        const taxId = global.ArpaPricing?.getTaxIdLabel?.() || 'NIT';
        const phone = global.ArpaPricing?.formatCompanyPhone?.(s.phone) || val(s.phone, '—');
        return `${company} &nbsp;|&nbsp; ${taxId} ${val(s.nit, '—')} &nbsp;|&nbsp; Tel ${phone}`;
      })();
    set('brand-screen-footer', (el) => {
      if (el.dataset.editable !== 'true') return;
      el.innerHTML = footerLocalHtml;
    });
    set('cot-print-footer-local', (el) => { el.innerHTML = footerLocalHtml; });
    set('cot-print-footer-global', (el) => {
      const isWL = global.ArpaLicense?.isWhiteLabelLicense?.() ?? false;
      el.textContent = isWL ? '' : getGlobalFooterText();
    });
    set('brand-bank-block', (el) => { el.innerHTML = formatBankBlock(s); });
    set('brand-bank-block-formato', (el) => { el.innerHTML = formatBankBlock(s); });
    applyLegalCopyToDocuments();
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
    if (configured && cotTel && !cotTel.value.trim() && s.phone?.trim()) {
      cotTel.value = global.ArpaPricing?.formatCompanyPhone?.(s.phone) || s.phone.trim();
    }

    document.title = document.title.includes('–') ? document.title : (configured ? `${appBrandName} – ${company}` : appBrandName);
    if (!configured) resetUnconfiguredFormFields();
    applyCuentaCobroFromSettings(s, { fillPago: 'if-empty' });
    window.ArpaI18n?.refreshBrandTexts?.();
    applyLegalCopyToDocuments();
    window.ArpaI18n?.applyCountryLabels?.();
    global.ArpaCotizacion?.syncTaxLabels?.();
    global.ArpaMiCatalogo?.renderConvertedPriceNotice?.();
    global.ArpaCobros?.refreshPrecargadoValues?.('cot');
    window.ArpaI18n?.refreshDocTypeLabel?.();
    global.ArpaLicense?.refreshTrialBanner?.();
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

  function bindCountryCurrencySync() {
    const countrySelect = document.getElementById('settings-country');
    const currencySelect = document.getElementById('settings-currency');
    if (!countrySelect || countrySelect.dataset.arpaCountryBound === '1') return;
    countrySelect.dataset.arpaCountryBound = '1';
    countrySelect.addEventListener('change', function () {
      const code = countrySelect.value;
      const currency = global.ArpaPricing?.COUNTRY_PROFILES?.[code]?.currency;
      if (currency && currencySelect) currencySelect.value = currency;
      const current = getSettings();
      saveSettings({ ...current, country: code, currency: currency || current.currency });
      global.ArpaPricing?.renderPriceListSettings?.();
      global.ArpaMiCatalogo?.resyncPrecargadoPrices?.();
      global.ArpaCatalogo?.invalidateListaCache?.();
      global.ArpaMiCatalogo?.render?.();
      global.ArpaCobros?.refreshPrecargadoValues?.('cot');
      global.ArpaCotizacion?.syncTaxLabels?.();
      applyToUI();
    });
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
      'settings-technician-code': s.technicianCode,
      'settings-warranty-terms': s.warrantyTerms,
      'settings-client-requirements': s.clientRequirements
    };
    Object.entries(fields).forEach(([id, v]) => {
      const el = document.getElementById(id);
      if (el) el.value = v || '';
    });
    const currencySelect = document.getElementById('settings-currency');
    const countrySelect = document.getElementById('settings-country');
    const countryCode = (s.country && global.ArpaPricing?.COUNTRY_PROFILES?.[s.country])
      ? s.country
      : (global.ArpaPricing?.detectDefaultCountryFromLocale?.() || 'CO');
    if (countrySelect) countrySelect.value = countryCode;
    if (currencySelect) {
      const fromCountry = global.ArpaPricing?.COUNTRY_PROFILES?.[countryCode]?.currency;
      currencySelect.value = fromCountry
        || s.currency
        || global.ArpaPricing?.getDefaultCurrency?.()
        || 'COP';
    }
    countryWhenSettingsOpened = countryCode;
    bindCountryCurrencySync();
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
    global.ArpaLicense?.fillSettingsLicensePanel?.();
    document.getElementById('settings-modal')?.classList.add('open');
    try { global.dispatchEvent(new CustomEvent('arpa-demo-mode-changed')); } catch (e) {}
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
    const countryRaw = document.getElementById('settings-country')?.value.trim() || '';
    const country = (countryRaw && global.ArpaPricing?.COUNTRY_PROFILES?.[countryRaw])
      ? countryRaw
      : (global.ArpaPricing?.detectDefaultCountryFromLocale?.() || 'CO');
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
      country,
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
        : (current.appLogoBase64 || ''),
      warrantyTerms: document.getElementById('settings-warranty-terms')?.value || '',
      clientRequirements: document.getElementById('settings-client-requirements')?.value || ''
    };

    if (!saveSettings(settings)) return;

    if (!isDemoMode()) persistHomeFromCurrent();

    pushCompanyDataToSheets(settings);

    global.ArpaOficios?.saveActiveOficios?.(settings.activeOficios);

    try { localStorage.setItem(SETTINGS_CONFIGURED_KEY, 'true'); } catch (e) {}
    try { localStorage.setItem(SALES_ENTRY_KEY, 'true'); } catch (e) {}

    try {
      global.ArpaOficios?.seedActiveOficios?.();
      global.ArpaMiCatalogo?.render?.();
      global.ArpaCatalogo?.invalidateListaCache?.();
      global.ArpaCotizacion?.updateCatalogHint?.();
      if (country === (countryWhenSettingsOpened || current.country || 'CO')) {
        global.ArpaPricing?.savePriceList?.(global.ArpaPricing.readPriceListFromSettingsForm());
      }
      countryWhenSettingsOpened = country;
      global.ArpaCobros?.seedFromPriceList?.('cot');
      global.ArpaCotizacion?.refreshCobros?.();
      global.ArpaCotizacion?.recalcularCotizacion?.();
      global.ArpaCuentaCobro?.refreshView?.();
      global.ArpaCuentaCobro?.recalcularTotales?.();
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
    printUiBackup = { contactHtml: null, sealHtml: null, cotSealHtml: null };
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
    const isWL = global.ArpaLicense?.isWhiteLabelLicense?.() ?? false;
    const seal = document.getElementById('arpa-global-seal');
    if (seal) {
      printUiBackup.sealHtml = seal.innerHTML;
      seal.innerHTML = isWL ? '' : `<p class="suite-footer-global-text">${getGlobalFooterText()}</p>`;
    }
    const cotSeal = document.getElementById('cot-print-footer-global');
    if (cotSeal) {
      printUiBackup.cotSealHtml = cotSeal.innerHTML;
      cotSeal.textContent = isWL ? '' : getGlobalFooterText();
    }
    document.querySelectorAll('#suite-footer a[href], #cot-print-footer a[href]').forEach((a) => {
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
    const cotSeal = document.getElementById('cot-print-footer-global');
    if (cotSeal && printUiBackup.cotSealHtml != null) cotSeal.innerHTML = printUiBackup.cotSealHtml;
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

  function isDemoMode() {
    try { return localStorage.getItem(DEMO_MODE_KEY) === 'true'; }
    catch (e) { return false; }
  }

  function dispatchDemoModeChanged() {
    try { global.dispatchEvent(new CustomEvent('arpa-demo-mode-changed')); }
    catch (e) {}
  }

  function namesEqual(a, b) {
    return String(a || '').trim().toLowerCase().replace(/\s+/g, ' ')
      === String(b || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function readCompanyName(raw) {
    try {
      return String(JSON.parse(raw || '{}').companyName || '').trim();
    } catch (e) {
      return '';
    }
  }

  function persistHomeSnapshot(settingsRaw, configured, logo) {
    try {
      if (settingsRaw) localStorage.setItem(HOME_SETTINGS_KEY, settingsRaw);
      else localStorage.removeItem(HOME_SETTINGS_KEY);
      if (configured) localStorage.setItem(HOME_CONFIGURED_KEY, configured);
      else localStorage.removeItem(HOME_CONFIGURED_KEY);
      if (logo) localStorage.setItem(HOME_LOGO_KEY, logo);
      else localStorage.removeItem(HOME_LOGO_KEY);
    } catch (e) {
      console.warn('[arpa-brand] persistHomeSnapshot', e);
    }
  }

  function persistHomeFromCurrent() {
    persistHomeSnapshot(
      localStorage.getItem(SETTINGS_KEY),
      localStorage.getItem(SETTINGS_CONFIGURED_KEY),
      localStorage.getItem(LOGO_STORAGE_KEY)
    );
  }

  function persistHomeFromSheets(data) {
    let previous = {};
    try { previous = JSON.parse(localStorage.getItem(HOME_SETTINGS_KEY) || '{}') || {}; }
    catch (e) { previous = {}; }
    const patch = {
      ...previous,
      companyName: data.nombreEmpresa || previous.companyName || '',
      nit: data.nit || previous.nit || '',
      address: data.direccion || previous.address || '',
      city: data.ciudad || previous.city || '',
      phone: data.telefono || previous.phone || '',
      website: data.sitioWeb || previous.sitioWeb || previous.website || '',
      logoBase64: data.logoBase64 || previous.logoBase64 || '',
      bankName: data.banco || previous.bankName || '',
      accountType: data.tipoCuenta || previous.accountType || '',
      accountNumber: data.numeroCuenta || previous.accountNumber || '',
      accountHolder: data.titularCuenta || previous.accountHolder || '',
      accountHolderDocument: data.documentoTitular || previous.accountHolderDocument || '',
      technicianName: data.nombreTecnico || previous.technicianName || '',
      technicianDocument: data.documentoTecnico || previous.technicianDocument || '',
      technicianCode: data.codigoTecnico || previous.technicianCode || ''
    };
    persistHomeSnapshot(
      JSON.stringify(patch),
      'true',
      String(patch.logoBase64 || '').trim() || localStorage.getItem(HOME_LOGO_KEY)
    );
  }

  function homeCompanyName() {
    return readCompanyName(localStorage.getItem(HOME_SETTINGS_KEY));
  }

  function copyKey(fromKey, toKey) {
    const value = localStorage.getItem(fromKey);
    if (value) localStorage.setItem(toKey, value);
    else localStorage.removeItem(toKey);
  }

  function repairInvertedDemoIfNeeded(homeNameHint) {
    if (!isDemoMode()) return false;
    const homeName = String(homeNameHint || homeCompanyName() || '').trim();
    if (!homeName) return false;
    const liveName = String(getSettings().companyName || '').trim();
    const backupName = readCompanyName(localStorage.getItem(DEMO_BACKUP_SETTINGS_KEY));
    if (!backupName || !liveName) return false;
    if (!namesEqual(liveName, homeName) || namesEqual(backupName, homeName)) return false;
    copyKey(SETTINGS_KEY, 'arpa_suite_demo_swap_settings');
    copyKey(SETTINGS_CONFIGURED_KEY, 'arpa_suite_demo_swap_configured');
    copyKey(LOGO_STORAGE_KEY, 'arpa_suite_demo_swap_logo');
    copyKey(DEMO_BACKUP_SETTINGS_KEY, SETTINGS_KEY);
    copyKey(DEMO_BACKUP_CONFIGURED_KEY, SETTINGS_CONFIGURED_KEY);
    copyKey(DEMO_BACKUP_LOGO_KEY, LOGO_STORAGE_KEY);
    copyKey('arpa_suite_demo_swap_settings', DEMO_BACKUP_SETTINGS_KEY);
    copyKey('arpa_suite_demo_swap_configured', DEMO_BACKUP_CONFIGURED_KEY);
    copyKey('arpa_suite_demo_swap_logo', DEMO_BACKUP_LOGO_KEY);
    localStorage.removeItem('arpa_suite_demo_swap_settings');
    localStorage.removeItem('arpa_suite_demo_swap_configured');
    localStorage.removeItem('arpa_suite_demo_swap_logo');
    persistHomeSnapshot(
      localStorage.getItem(DEMO_BACKUP_SETTINGS_KEY),
      localStorage.getItem(DEMO_BACKUP_CONFIGURED_KEY),
      localStorage.getItem(DEMO_BACKUP_LOGO_KEY)
    );
    return true;
  }

  function applyFormAsDemoSettings() {
    if (typeof document === 'undefined') return false;
    const companyName = document.getElementById('settings-company')?.value.trim() || '';
    if (!companyName) return false;
    const current = getSettings();
    const settings = {
      ...current,
      companyName,
      nit: document.getElementById('settings-nit')?.value.trim() || '',
      address: document.getElementById('settings-address')?.value.trim() || '',
      city: document.getElementById('settings-city')?.value.trim() || '',
      phone: document.getElementById('settings-phone')?.value.trim() || '',
      website: document.getElementById('settings-website')?.value.trim() || '',
      bankName: document.getElementById('settings-bank')?.value.trim() || '',
      accountType: document.getElementById('settings-account-type')?.value.trim() || '',
      accountNumber: document.getElementById('settings-account-number')?.value.trim() || '',
      accountHolder: document.getElementById('settings-account-holder')?.value.trim() || '',
      accountHolderDocument: document.getElementById('settings-account-holder-doc')?.value.trim() || '',
      technicianName: document.getElementById('settings-technician')?.value.trim() || '',
      technicianDocument: document.getElementById('settings-technician-doc')?.value.trim() || '',
      technicianCode: document.getElementById('settings-technician-code')?.value.trim() || ''
    };
    if (!saveSettings(settings)) return false;
    try { localStorage.setItem(SETTINGS_CONFIGURED_KEY, 'true'); } catch (e) {}
    return true;
  }

  function enterDemoMode() {
    if (isDemoMode()) return;
    try {
      if (!localStorage.getItem(HOME_SETTINGS_KEY)) persistHomeFromCurrent();
      copyKey(HOME_SETTINGS_KEY, DEMO_BACKUP_SETTINGS_KEY);
      copyKey(HOME_CONFIGURED_KEY, DEMO_BACKUP_CONFIGURED_KEY);
      copyKey(HOME_LOGO_KEY, DEMO_BACKUP_LOGO_KEY);
      if (!localStorage.getItem(DEMO_BACKUP_SETTINGS_KEY)) {
        copyKey(SETTINGS_KEY, DEMO_BACKUP_SETTINGS_KEY);
        copyKey(SETTINGS_CONFIGURED_KEY, DEMO_BACKUP_CONFIGURED_KEY);
        copyKey(LOGO_STORAGE_KEY, DEMO_BACKUP_LOGO_KEY);
      }
      const homeName = readCompanyName(localStorage.getItem(DEMO_BACKUP_SETTINGS_KEY));
      const liveName = String(getSettings().companyName || '').trim();
      const formName = typeof document !== 'undefined'
        ? (document.getElementById('settings-company')?.value.trim() || '')
        : '';
      localStorage.setItem(DEMO_MODE_KEY, 'true');
      const liveIsDemo = liveName && homeName && !namesEqual(liveName, homeName);
      const formIsDemo = formName && homeName && !namesEqual(formName, homeName);
      if (liveIsDemo) {
        // Los datos actuales ya son del cliente; se deja el respaldo de la empresa real.
      } else if (formIsDemo && applyFormAsDemoSettings()) {
        // El formulario tiene los datos del cliente; no se suben a Sheets.
      } else {
        localStorage.removeItem(SETTINGS_KEY);
        localStorage.removeItem(SETTINGS_CONFIGURED_KEY);
        localStorage.removeItem(LOGO_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('[arpa-brand] enterDemoMode', e);
      return;
    }
    pendingLogoBase64 = null;
    pendingAppLogoBase64 = null;
    if (typeof document !== 'undefined') {
      applyToUI();
      if (document.getElementById('settings-modal')?.classList.contains('open')) {
        openSettings();
      }
    }
    dispatchDemoModeChanged();
  }

  function exitDemoMode() {
    if (!isDemoMode()) return;
    try {
      const settings = localStorage.getItem(DEMO_BACKUP_SETTINGS_KEY);
      const configured = localStorage.getItem(DEMO_BACKUP_CONFIGURED_KEY);
      const logo = localStorage.getItem(DEMO_BACKUP_LOGO_KEY);
      if (settings) localStorage.setItem(SETTINGS_KEY, settings);
      else localStorage.removeItem(SETTINGS_KEY);
      if (configured) localStorage.setItem(SETTINGS_CONFIGURED_KEY, configured);
      else localStorage.removeItem(SETTINGS_CONFIGURED_KEY);
      if (logo) localStorage.setItem(LOGO_STORAGE_KEY, logo);
      else localStorage.removeItem(LOGO_STORAGE_KEY);
      localStorage.removeItem(DEMO_BACKUP_SETTINGS_KEY);
      localStorage.removeItem(DEMO_BACKUP_CONFIGURED_KEY);
      localStorage.removeItem(DEMO_BACKUP_LOGO_KEY);
      localStorage.removeItem(DEMO_MODE_KEY);
    } catch (e) {
      console.warn('[arpa-brand] exitDemoMode', e);
      return;
    }
    pendingLogoBase64 = null;
    pendingAppLogoBase64 = null;
    if (typeof document !== 'undefined') {
      applyToUI();
      if (document.getElementById('settings-modal')?.classList.contains('open')) {
        openSettings();
      }
    }
    dispatchDemoModeChanged();
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
    applyLegalCopyToDocuments,
    fechaLocalISO,
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
    syncBankBlocksForPrint,
    isDemoMode,
    enterDemoMode,
    exitDemoMode,
    repairInvertedDemoIfNeeded
  };

  global.applyUserSettingsToUI = applyToUI;
  global.fechaLocalISO = fechaLocalISO;
  global.openSettingsModal = openSettings;
  global.closeSettingsModal = closeSettings;
  global.saveSettingsFromModal = saveFromModal;
  global.previewLogoUpload = previewLogo;
  global.previewAppLogoUpload = previewAppLogo;

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('settings-license-change')?.addEventListener('click', () => {
        global.ArpaLicense?.requestLicenseChange?.();
      });
      migrateDedicatedLogoFromSettings();
      purgeLegacyData();
      if (repairInvertedDemoIfNeeded()) {
        try { applyToUI(); } catch (e) {}
      }
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
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      containsLegacyBrandText,
      isLegacyFieldValue,
      isLegacyPreset,
      isFakeDefaultSettings,
      shouldPurgeSettings,
      shouldPurgeDraft,
      hasUserSettings,
      fechaLocalISO
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
