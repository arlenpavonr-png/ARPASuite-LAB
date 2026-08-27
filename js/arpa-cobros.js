/**
 * Cobros dinámicos: filas editables (descripción + valor) con suma automática
 */
(function (global) {
  const stores = {};

  function getStore(id) {
    if (!stores[id]) stores[id] = { lines: [], seeded: false };
    return stores[id];
  }

  function createLine(desc = '', value = 0) {
    return { id: Date.now() + Math.random(), desc, value: Number(value) || 0 };
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
          <input type="number" class="cobro-valor" min="0" step="1000" inputmode="numeric" value="${line.value || ''}" placeholder="0">
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
        store.lines[i].value = Number(input.value) || 0;
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
    if (store.seeded && store.lines.length) return;
    const list = global.ArpaPricing?.getPriceList?.();
    if (!list) return;
    store.lines = Object.values(list).map((item) => createLine(item.label, item.value));
    store.seeded = true;
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

  function setLines(storeId, rawLines) {
    const store = getStore(storeId);
    store.lines = (rawLines || []).map(function(l) {
      return createLine(l.desc || l.nom || '', l.value != null ? l.value : (l.pvp || 0));
    });
    store.seeded = false;
    renderEditor(storeId);
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
    refreshDefaultLabels,
    renderEditor,
    syncFromEditor
  };

  global.agregarCobroItem = (storeId) => addLine(storeId || 'cot');
})(window);
