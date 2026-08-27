/**
 * Módulo: Lista de precios (localStorage)
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
  function getDefaultLabel(key) {
    const item = DEFAULT_PRICE_LIST[key];
    return (window.ArpaI18n?.t?.(item.labelKey)) || item.labelKey;
  }

  function getPriceList() {
    try {
      const saved = JSON.parse(localStorage.getItem(PRICE_LIST_KEY) || '{}');
      const merged = {};
      Object.keys(DEFAULT_PRICE_LIST).forEach((key) => {
        merged[key] = {
          label: saved[key]?.label || getDefaultLabel(key),
          value: Number(saved[key]?.value ?? DEFAULT_PRICE_LIST[key].value) || 0
        };
      });
      return merged;
    } catch (e) {
      return { ...DEFAULT_PRICE_LIST };
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
      list[key] = {
        label: labelInput?.value.trim() || getDefaultLabel(key) || key,
        value: Number(String(input.value).replace(/\D/g, '')) || 0
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
        <input type="number" class="price-value-input" data-price-key="${key}" min="0" step="1000" value="${item.value}" inputmode="numeric" placeholder="0">
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

  const CURRENCIES = {
    COP: { locale: 'es-CO', symbol: '$' },
    USD: { locale: 'en-US', symbol: '$' },
    MXN: { locale: 'es-MX', symbol: '$' },
    PEN: { locale: 'es-PE', symbol: 'S/' },
    CLP: { locale: 'es-CL', symbol: '$' }
  };
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
  function getDefaultCurrency() {
    const saved = window.ArpaBrand?.getSettings?.()?.currency;
    if (saved && CURRENCIES[saved]) return saved;
    return detectDefaultCurrencyFromLocale();
  }
  function formatoPesos(n, currencyCode) {
    const code = (currencyCode && CURRENCIES[currencyCode]) ? currencyCode : getDefaultCurrency();
    const cfg = CURRENCIES[code] || CURRENCIES.COP;
    return cfg.symbol + ' ' + (Number(n) || 0).toLocaleString(cfg.locale);
  }
  global.ArpaPricing = {
    PRICE_LIST_KEY,
    DEFAULT_PRICE_LIST,
    CURRENCIES,
    getPriceList,
    savePriceList,
    readPriceListFromSettingsForm,
    renderPriceListSettings,
    detectDefaultCurrencyFromLocale,
    getDefaultCurrency,
    formatoPesos
  };
})(window);
