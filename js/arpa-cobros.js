/**
 * Cobros dinámicos: filas editables (descripción + valor) con suma automática
 */
(function (global) {
  const stores = {};

  function getStore(id) {
    if (!stores[id]) stores[id] = { lines: [], seeded: false };
    return stores[id];
  }

  function defaultPriceKeys() {
    return Object.keys(global.ArpaPricing?.DEFAULT_PRICE_LIST || {});
  }

  function isKnownConversion(cop, value) {
    const convert = global.ArpaPricing?.convertCop;
    const profiles = global.ArpaPricing?.COUNTRY_PROFILES;
    if (typeof convert !== 'function' || !profiles) return Number(value) === Number(cop);
    const val = Number(value);
    const original = Number(cop);
    if (val === original) return true;
    return Object.keys(profiles).some((code) => val === convert(original, code));
  }

  function inferDefaultKey(line) {
    const defaults = global.ArpaPricing?.DEFAULT_PRICE_LIST;
    if (!defaults || !line) return '';
    if (line.priceKey && defaults[line.priceKey]) return line.priceKey;
    const desc = String(line.desc || '').trim();
    for (let i = 0; i < defaultPriceKeys().length; i++) {
      const key = defaultPriceKeys()[i];
      const item = defaults[key];
      const labelKey = item.labelKey;
      const labels = [
        global.ArpaI18n?.t?.(labelKey),
        global.ArpaI18n?.translateIn?.(labelKey, 'es'),
        global.ArpaI18n?.translateIn?.(labelKey, 'en')
      ].filter(Boolean);
      if (desc && labels.indexOf(desc) !== -1) return key;
    }
    return '';
  }

  function attachPrecargadoMeta(line) {
    if (!line || line.userEdited) return line;
    const key = inferDefaultKey(line);
    if (!key) return line;
    const cop = Number(global.ArpaPricing.DEFAULT_PRICE_LIST[key].value);
    line.priceKey = key;
    if (line.valueCop == null || !Number.isFinite(Number(line.valueCop))) {
      line.valueCop = cop;
    }
    const val = Number(line.value);
    if (Number.isFinite(val) && val > 0 && !isKnownConversion(line.valueCop, val)) {
      line.userEdited = true;
    }
    return line;
  }

  function applyConvertedValue(line) {
    attachPrecargadoMeta(line);
    if (!line || line.userEdited) return line;
    if (line.valueCop == null || typeof global.ArpaPricing?.convertCop !== 'function') return line;
    line.value = global.ArpaPricing.convertCop(line.valueCop);
    return line;
  }

  function createLine(desc, value, meta) {
    const extra = meta || {};
    const line = {
      id: Date.now() + Math.random(),
      desc: desc || '',
      value: Number(value) || 0,
      valueCop: extra.valueCop != null ? Number(extra.valueCop) : null,
      userEdited: !!extra.userEdited,
      priceKey: extra.priceKey || ''
    };
    applyConvertedValue(line);
    return line;
  }

  function renderEditor(storeId) {
    const container = document.getElementById(`cobros-editor-${storeId}`);
    if (!container) return;
    const store = getStore(storeId);

    if (!store.lines.length) {
      container.innerHTML = '<p class="extra-items-empty">' + window.ArpaI18n.t('cobros.vacio') + '</p>';
      notifyChange(storeId);
      return;
    }

    container.innerHTML = store.lines.map((line, index) => `
      <div class="cobro-row" data-index="${index}">
        <div class="field cobro-desc-field">
          <label>${window.ArpaI18n.t('cobros.descripcion')}</label>
          <input type="text" class="cobro-desc" value="${escapeAttr(line.desc)}" placeholder="${escapeAttr(window.ArpaI18n.t('cobros.descripcion_placeholder'))}">
        </div>
        <div class="field cobro-valor-field">
          <label>${window.ArpaI18n.t('cobros.valor_cop', { moneda: window.ArpaPricing?.getDefaultCurrency?.() || 'COP' })}</label>
          <input type="number" class="cobro-valor" min="0" step="1" inputmode="numeric" value="${line.value || ''}" placeholder="0">
        </div>
        <button type="button" class="btn-quitar-extra cobro-remove" data-index="${index}" aria-label="${escapeAttr(window.ArpaI18n.t('cobros.quitar'))}">✕</button>
      </div>
    `).join('');

    container.querySelectorAll('.cobro-desc').forEach((input, i) => {
      input.addEventListener('input', () => {
        store.lines[i].desc = input.value;
        notifyChange(storeId);
      });
    });
    container.querySelectorAll('.cobro-valor').forEach((input, i) => {
      input.addEventListener('input', () => {
        const line = store.lines[i];
        if (!line) return;
        const next = Number(input.value) || 0;
        line.value = next;
        if (line.valueCop != null && typeof global.ArpaPricing?.convertCop === 'function') {
          line.userEdited = next !== global.ArpaPricing.convertCop(line.valueCop);
        } else {
          line.userEdited = true;
        }
        notifyChange(storeId);
      });
    });
    container.querySelectorAll('.cobro-remove').forEach((btn) => {
      btn.addEventListener('click', () => removeLine(storeId, Number(btn.dataset.index)));
    });

    notifyChange(storeId);
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;');
  }

  function syncFromEditor(storeId) {
    const store = getStore(storeId);
    const container = document.getElementById(`cobros-editor-${storeId}`);
    if (!container || !store.lines.length) return;
    container.querySelectorAll('.cobro-row').forEach((row, index) => {
      const line = store.lines[index];
      if (!line) return;
      const desc = row.querySelector('.cobro-desc');
      const valor = row.querySelector('.cobro-valor');
      if (desc) line.desc = desc.value;
      if (valor) line.value = Number(valor.value) || 0;
    });
  }

  function addLine(storeId, desc = '', value = 0) {
    getStore(storeId).lines.push(createLine(desc, value));
    renderEditor(storeId);
  }

  function removeLine(storeId, index) {
    getStore(storeId).lines.splice(index, 1);
    renderEditor(storeId);
  }

  function getLines(storeId) {
    syncFromEditor(storeId);
    return getStore(storeId).lines
      .filter((l) => l.desc.trim() || l.value > 0)
      .map((l, index) => ({
        cod: `COBRO-${index + 1}`,
        nom: l.desc.trim() || window.ArpaI18n.t('cobros.item_generico'),
        pvp: Number(l.value) || 0,
        cant: 1,
        tipo: 'cobro'
      }));
  }

  function getSubtotal(storeId) {
    return getLines(storeId).reduce((s, l) => s + l.pvp * l.cant, 0);
  }

  function seedFromPriceList(storeId) {
    const store = getStore(storeId);
    if (store.seeded && store.lines.length) {
      refreshPrecargadoValues(storeId);
      return;
    }
    const list = global.ArpaPricing?.getPriceList?.();
    const defaults = global.ArpaPricing?.DEFAULT_PRICE_LIST;
    if (!list || !defaults) return;
    store.lines = Object.keys(defaults).map((key) => {
      const item = list[key] || {};
      return createLine(item.label || global.ArpaPricing?.getDefaultLabel?.(key) || key, item.value, {
        priceKey: key,
        valueCop: defaults[key].value,
        userEdited: !!item.userEdited
      });
    });
    store.seeded = true;
    renderEditor(storeId);
  }

  function refreshPrecargadoValues(storeId) {
    const store = getStore(storeId);
    if (!store.lines.length) return;
    const list = global.ArpaPricing?.getPriceList?.() || {};
    store.lines.forEach((line) => {
      attachPrecargadoMeta(line);
      const key = line.priceKey;
      if (key && list[key]?.userEdited) {
        line.userEdited = true;
        line.value = Number(list[key].value) || line.value;
        return;
      }
      if (line.userEdited) return;
      applyConvertedValue(line);
      if (key && list[key]?.label && !line.userEdited) {
        line.desc = list[key].label;
      }
    });
    renderEditor(storeId);
  }

  function refreshDefaultLabels(storeId) {
    const store = getStore(storeId);
    if (!store.seeded || !store.lines.length) return;
    const defaults = global.ArpaPricing?.DEFAULT_PRICE_LIST;
    const i18n = global.ArpaI18n;
    if (!defaults || !i18n?.translateIn || !i18n?.getLang) return;
    const currentLang = i18n.getLang();
    Object.values(defaults).forEach((item) => {
      const esLabel = i18n.translateIn(item.labelKey, 'es');
      const enLabel = i18n.translateIn(item.labelKey, 'en');
      const newLabel = currentLang === 'en' ? enLabel : esLabel;
      const oldLabel = currentLang === 'en' ? esLabel : enLabel;
      store.lines.forEach((line) => {
        if (line.desc === oldLabel) line.desc = newLabel;
      });
    });
    renderEditor(storeId);
  }

  function setLines(storeId, rawLines, options) {
    const store = getStore(storeId);
    store.lines = (rawLines || []).map(function(l) {
      return createLine(l.desc || l.nom || '', l.value != null ? l.value : (l.pvp || 0), {
        valueCop: l.valueCop,
        userEdited: !!l.userEdited,
        priceKey: l.priceKey || ''
      });
    });
    store.seeded = !!(options && options.keepSeeded);
    if (store.lines.length) refreshPrecargadoValues(storeId);
    else renderEditor(storeId);
  }
  function notifyChange(storeId) {
    if (storeId === 'cot') global.ArpaCotizacion?.renderTablaCot?.(false);
  }

  function init(storeId) {
    const btn = document.getElementById(`btn-cobros-add-${storeId}`);
    btn?.addEventListener('click', () => addLine(storeId));
    renderEditor(storeId);
  }

  global.ArpaCobros = {
    init,
    addLine,
    removeLine,
    getLines,
    setLines,
    getSubtotal,
    seedFromPriceList,
    refreshPrecargadoValues,
    refreshDefaultLabels,
    renderEditor,
    syncFromEditor
  };

  global.agregarCobroItem = (storeId) => addLine(storeId || 'cot');
})(window);
