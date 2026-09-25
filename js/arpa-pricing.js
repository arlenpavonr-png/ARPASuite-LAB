/**
 * Módulo: Lista de precios, país, moneda y conversión de precargados.
 */
(function (global) {
  const PRICE_LIST_KEY = 'arpa_suite_price_list';

  const DEFAULT_PRICE_LIST = {
    instalacion: { labelKey: 'pricing.default.instalacion', value: 350000 },
    visitaTecnica: { labelKey: 'pricing.default.visita_tecnica', value: 85000 },
    mantenimiento: { labelKey: 'pricing.default.mantenimiento', value: 120000 },
    reparacion: { labelKey: 'pricing.default.reparacion', value: 150000 },
    manoObra: { labelKey: 'pricing.default.mano_obra', value: 65000 }
  };

  /**
   * Tasas fijas: cuántos COP equivalen a 1 unidad de la moneda destino.
   * Editar aquí cuando se actualice la conversión de precios precargados.
   */
  const FX_COP_PER_UNIT = {
    COP: 1,
    MXN: 220,
    CLP: 4.2,
    PEN: 1080,
    USD: 4000
  };

  const CURRENCIES = {
    COP: { locale: 'es-CO', symbol: '$' },
    USD: { locale: 'en-US', symbol: '$' },
    MXN: { locale: 'es-MX', symbol: '$' },
    PEN: { locale: 'es-PE', symbol: 'S/' },
    CLP: { locale: 'es-CL', symbol: '$' }
  };

  const COUNTRY_PROFILES = {
    CO: { currency: 'COP', taxLabelKey: 'tax.label.iva', taxRate: 0.19, phonePrefix: '57' },
    MX: { currency: 'MXN', taxLabelKey: 'tax.label.iva', taxRate: 0.16, phonePrefix: '52' },
    CL: { currency: 'CLP', taxLabelKey: 'tax.label.iva', taxRate: 0.19, phonePrefix: '56' },
    PE: { currency: 'PEN', taxLabelKey: 'tax.label.igv', taxRate: 0.18, phonePrefix: '51' },
    US: { currency: 'USD', taxLabelKey: 'tax.label.sales_tax', taxRate: 0, phonePrefix: '1' }
  };

  const PHONE_PREFIXES = Object.keys(COUNTRY_PROFILES)
    .map((code) => COUNTRY_PROFILES[code].phonePrefix)
    .sort((a, b) => b.length - a.length);

  function getDefaultLabel(key) {
    const item = DEFAULT_PRICE_LIST[key];
    return (window.ArpaI18n?.t?.(item.labelKey)) || item.labelKey;
  }

  function detectDefaultCurrencyFromLocale() {
    try {
      const lang = (navigator.language || navigator.userLanguage || '').toLowerCase();
      if (lang.includes('mx')) return 'MXN';
      if (lang.includes('pe')) return 'PEN';
      if (lang.includes('cl')) return 'CLP';
      if (lang.includes('us') || lang === 'en') return 'USD';
      return 'COP';
    } catch (e) {
      return 'COP';
    }
  }

  function detectDefaultCountryFromLocale() {
    try {
      const lang = (navigator.language || navigator.userLanguage || '').toLowerCase();
      if (lang.includes('mx')) return 'MX';
      if (lang.includes('pe')) return 'PE';
      if (lang.includes('cl')) return 'CL';
      if (lang.includes('us') || lang === 'en') return 'US';
      return 'CO';
    } catch (e) {
      return 'CO';
    }
  }

  function getCountryCode() {
    const saved = window.ArpaBrand?.getSettings?.()?.country;
    if (saved && COUNTRY_PROFILES[saved]) return saved;
    return 'CO';
  }

  function getCountryProfile(countryCode) {
    const code = (countryCode && COUNTRY_PROFILES[countryCode]) ? countryCode : getCountryCode();
    return { code, ...COUNTRY_PROFILES[code] };
  }

  function getTaxRate(countryCode) {
    return getCountryProfile(countryCode).taxRate;
  }

  function getTaxLabelText(countryCode) {
    const profile = getCountryProfile(countryCode);
    const pct = Math.round(profile.taxRate * 100);
    let labelWord = window.ArpaI18n?.t?.(profile.taxLabelKey) || '';
    if (!labelWord || /tax\.label\./i.test(labelWord)) {
      labelWord = window.ArpaI18n?.getLang?.() === 'en'
        ? (profile.taxLabelKey === 'tax.label.igv' ? 'IGV' : profile.taxLabelKey === 'tax.label.sales_tax' ? 'Sales tax' : 'VAT')
        : (profile.taxLabelKey === 'tax.label.igv' ? 'IGV' : profile.taxLabelKey === 'tax.label.sales_tax' ? 'Impuesto sobre ventas' : 'IVA');
    }
    const prefix = window.ArpaI18n?.getLang?.() === 'en' ? 'Include ' : 'Incluir ';
    return { labelWord, pct, full: labelWord + ' ' + pct + '%', toggle: prefix + labelWord + ' ' + pct + '%' };
  }

  function getDefaultCurrency() {
    const settings = window.ArpaBrand?.getSettings?.() || {};
    if (settings.country && COUNTRY_PROFILES[settings.country]) {
      return COUNTRY_PROFILES[settings.country].currency;
    }
    const saved = settings.currency;
    if (saved && CURRENCIES[saved]) return saved;
    return detectDefaultCurrencyFromLocale();
  }

  function roundCleanPrice(n, currencyCode) {
    const value = Number(n) || 0;
    if (value <= 0) return 0;
    const code = currencyCode || getDefaultCurrency();
    if (code === 'USD') {
      if (value < 10) return Math.round(value);
      if (value < 100) return Math.round(value / 5) * 5;
      return Math.round(value / 10) * 10;
    }
    if (code === 'CLP') {
      if (value < 1000) return Math.round(value / 10) * 10;
      return Math.round(value / 100) * 100;
    }
    if (code === 'MXN' || code === 'PEN') {
      if (value < 50) return Math.round(value);
      if (value < 500) return Math.round(value / 10) * 10;
      if (value < 5000) return Math.round(value / 10) * 10;
      return Math.round(value / 50) * 50;
    }
    return Math.round(value);
  }

  function convertCop(copAmount, countryCode) {
    const profile = getCountryProfile(countryCode);
    const currency = profile.currency;
    const cop = Number(copAmount) || 0;
    if (currency === 'COP') return cop;
    if (cop === 0) return 0;
    const perUnit = FX_COP_PER_UNIT[currency] || 1;
    return roundCleanPrice(cop / perUnit, currency);
  }

  function originalCopPrice(product, seedCop) {
    const seed = Number(seedCop);
    const stored = product?.pvpCop;
    if (Number.isFinite(seed)) return seed;
    if (stored != null && Number.isFinite(Number(stored))) return Number(stored);
    return null;
  }

  function applyPrecargadoPvp(copAmount, countryCode) {
    return convertCop(copAmount, countryCode);
  }

  function markPrecargadoProduct(product, copAmount, countryCode) {
    const pvpCop = Number(copAmount) || 0;
    return Object.assign({}, product, {
      pvpCop,
      precioPrecargado: true,
      pvp: applyPrecargadoPvp(pvpCop, countryCode)
    });
  }

  function looksLikePrecargado(product, seedCop) {
    if (!product || product.precioPrecargado === false) return false;
    if (product.precioPrecargado === true) return true;
    const cop = product.pvpCop != null ? Number(product.pvpCop) : Number(seedCop);
    if (!Number.isFinite(cop)) return false;
    const current = Number(product.pvp);
    if (current === cop) return true;
    return Object.keys(COUNTRY_PROFILES).some((code) => current === convertCop(cop, code));
  }

  function getPriceList() {
    try {
      const saved = JSON.parse(localStorage.getItem(PRICE_LIST_KEY) || '{}');
      const merged = {};
      Object.keys(DEFAULT_PRICE_LIST).forEach((key) => {
        const defaultCop = DEFAULT_PRICE_LIST[key].value;
        const converted = convertCop(defaultCop);
        const savedVal = Number(saved[key]?.value);
        const matchesKnown = saved[key] && Object.keys(COUNTRY_PROFILES).some((code) => (
          savedVal === defaultCop || savedVal === convertCop(defaultCop, code)
        ));
        const userEdited = !!saved[key]?.userEdited || (saved[key] && Number.isFinite(savedVal) && !matchesKnown);
        merged[key] = {
          label: saved[key]?.label || getDefaultLabel(key),
          value: userEdited ? (savedVal || 0) : converted,
          userEdited
        };
      });
      return merged;
    } catch (e) {
      const fallback = {};
      Object.keys(DEFAULT_PRICE_LIST).forEach((key) => {
        fallback[key] = {
          label: getDefaultLabel(key),
          value: convertCop(DEFAULT_PRICE_LIST[key].value),
          userEdited: false
        };
      });
      return fallback;
    }
  }

  function savePriceList(list) {
    localStorage.setItem(PRICE_LIST_KEY, JSON.stringify(list));
  }

  function readPriceListFromSettingsForm() {
    const list = {};
    document.querySelectorAll('[data-price-key]').forEach((input) => {
      const key = input.dataset.priceKey;
      const labelInput = document.querySelector(`[data-price-label="${key}"]`);
      const converted = convertCop(DEFAULT_PRICE_LIST[key]?.value || 0);
      const value = Number(String(input.value).replace(/\D/g, '')) || 0;
      list[key] = {
        label: labelInput?.value.trim() || getDefaultLabel(key) || key,
        value,
        userEdited: value !== converted
      };
    });
    return list;
  }

  function renderPriceListSettings() {
    const container = document.getElementById('settings-price-list');
    if (!container) return;
    const list = getPriceList();
    container.innerHTML = Object.entries(list).map(([key, item]) => `
      <div class="price-list-row">
        <input type="text" class="price-label-input" data-price-label="${key}" value="${escapeHtml(item.label)}" placeholder="Nombre del servicio">
        <input type="number" class="price-value-input" data-price-key="${key}" min="0" step="1" value="${item.value}" inputmode="numeric" placeholder="0">
      </div>
    `).join('');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function formatoPesos(n, currencyCode) {
    const code = (currencyCode && CURRENCIES[currencyCode]) ? currencyCode : getDefaultCurrency();
    const cfg = CURRENCIES[code] || CURRENCIES.COP;
    return cfg.symbol + ' ' + (Number(n) || 0).toLocaleString(cfg.locale);
  }

  function digitsOnly(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function formatCompanyPhone(raw, countryCode) {
    const profile = getCountryProfile(countryCode);
    const prefix = profile.phonePrefix || '57';
    let digits = digitsOnly(raw);
    if (!digits) return '';

    for (let i = 0; i < PHONE_PREFIXES.length; i++) {
      const p = PHONE_PREFIXES[i];
      if (digits === p) continue;
      if (!digits.startsWith(p) || digits.length <= p.length + 6) continue;
      if (p === prefix) break;
      const rest = digits.slice(p.length);
      if (rest.length >= 10) {
        digits = rest;
      }
      break;
    }

    if (!digits.startsWith(prefix)) {
      digits = prefix + digits;
    }
    return '+' + prefix + ' ' + digits.slice(prefix.length);
  }

  function getTaxIdLabel(countryCode) {
    return getCountryCodeFrom(countryCode) === 'MX' ? 'RFC' : 'NIT';
  }

  function getCountryCodeFrom(countryCode) {
    return (countryCode && COUNTRY_PROFILES[countryCode]) ? countryCode : getCountryCode();
  }

  function showsConvertedPriceNotice() {
    return getCountryCode() !== 'CO';
  }

  global.ArpaPricing = {
    PRICE_LIST_KEY,
    DEFAULT_PRICE_LIST,
    FX_COP_PER_UNIT,
    CURRENCIES,
    COUNTRY_PROFILES,
    getPriceList,
    savePriceList,
    readPriceListFromSettingsForm,
    renderPriceListSettings,
    detectDefaultCurrencyFromLocale,
    detectDefaultCountryFromLocale,
    getCountryCode,
    getCountryProfile,
    getTaxRate,
    getTaxLabelText,
    getDefaultCurrency,
    convertCop,
    originalCopPrice,
    applyPrecargadoPvp,
    markPrecargadoProduct,
    looksLikePrecargado,
    roundCleanPrice,
    formatCompanyPhone,
    getTaxIdLabel,
    showsConvertedPriceNotice,
    formatoPesos
  };
})(window);
