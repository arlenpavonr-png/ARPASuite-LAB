/**
 * Formato de Servicio — sección dinámica de tipo según oficio activo.
 */
(function (global) {
  const DRAFT_OFICIO_KEY = '_formatoOficio';
  const DRAFT_STORAGE_KEY = 'arpa_formato_borrador';
  let currentRenderOficio = null;
  let printLabelBackups = [];

  function getOficiosApi() {
    return global.ArpaOficios || {};
  }

  function readDraftRaw() {
    try {
      return JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function getDocumentFormatoOficio() {
    const draft = readDraftRaw();
    if (draft[DRAFT_OFICIO_KEY]) {
      return getOficiosApi().resolveFormatoOficioId?.(draft[DRAFT_OFICIO_KEY]) || 'automatismos';
    }
    return getOficiosApi().getActiveFormatoOficioId?.() || 'automatismos';
  }

  function setDocumentFormatoOficio(oficioId) {
    const next = getOficiosApi().resolveFormatoOficioId?.(oficioId) || 'automatismos';
    try {
      const draft = readDraftRaw();
      draft[DRAFT_OFICIO_KEY] = next;
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (e) { /* ignore */ }
    return next;
  }

  function getOtraOption(config) {
    return (config?.opciones || []).find((op) => op.otra);
  }

  function setNodeHidden(el, hidden) {
    if (!el) return;
    el.hidden = hidden;
    if (hidden) el.style.display = 'none';
    else el.style.removeProperty('display');
  }

  function updateMedidasVisibility(oficioId) {
    const config = getOficiosApi().getFormatoConfig?.(oficioId);
    const section = document.getElementById('formato-medidas-section');
    if (!section) return;
    setNodeHidden(section, !config?.showMedidas);
  }

  function clearEquipoFields() {
    const selMarca = document.getElementById('sel-marca');
    if (selMarca) selMarca.value = '';
    const marcaText = document.getElementById('formato-equipo-marca-text');
    if (marcaText) marcaText.value = '';
    const refManual = document.getElementById('ref-manual');
    if (refManual) refManual.value = '';
    const refGenerico = document.getElementById('formato-equipo-ref-text');
    if (refGenerico) refGenerico.value = '';
    const selRef = document.getElementById('sel-referencia');
    if (selRef) selRef.value = '';
    document.querySelectorAll('#formato-equipo-accesorios input[type="checkbox"]').forEach((cb) => {
      cb.checked = false;
    });
  }

  function applyEquipoRefPlaceholder(refInput, config) {
    if (!refInput || !config?.equipoRefPlaceholder) return;
    const ph = config.equipoRefPlaceholder;
    refInput.setAttribute('data-i18n-placeholder', ph.i18nKey);
    refInput.setAttribute('data-i18n-default-placeholder', ph.default);
    refInput.setAttribute('placeholder', ph.default);
  }

  function captureFormatoPrintSnapshot() {
    const oficioId = getDocumentFormatoOficio();
    const config = getOficiosApi().getFormatoConfig?.(oficioId);
    const selections = {};
    (config?.opciones || []).forEach((op) => {
      const el = document.getElementById(op.id);
      if (el) selections[op.id] = !!el.checked;
    });
    [
      'formato-tipo-otra-texto',
      'formato-equipo-marca-text',
      'formato-equipo-ref-text',
      'sel-marca',
      'sel-referencia',
      'ref-manual'
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el && 'value' in el) selections[id] = el.value || '';
    });
    return {
      oficioId,
      equipoModo: config?.equipoModo || 'none',
      selections
    };
  }

  function applyFormatoPrintSnapshot(snapshot) {
    if (!snapshot) return;
    const oficioId = snapshot.oficioId || getDocumentFormatoOficio();
    updateEquipoSection(oficioId, { skipCatalogRefresh: true });
    Object.entries(snapshot.selections || {}).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = !!val;
      else if ('value' in el) el.value = val == null ? '' : String(val);
    });
    updateOtraFieldVisibility(oficioId);
    if (snapshot.equipoModo === 'generico') {
      ['formato-equipo-marca-generico', 'formato-equipo-ref-generico'].forEach((blockId) => {
        setNodeHidden(document.getElementById(blockId), false);
      });
      setNodeHidden(document.getElementById('formato-equipo-section'), false);
    }
  }

  function getFormatoEquipoValues(oficioId) {
    const config = getOficiosApi().getFormatoConfig?.(oficioId);
    const modo = config?.equipoModo || 'none';
    if (modo === 'none') return null;

    const readText = (id) => (document.getElementById(id)?.value || '').trim();
    const readSelectText = (id) => {
      const el = document.getElementById(id);
      if (!el || el.tagName !== 'SELECT') return '';
      return (el.options[el.selectedIndex]?.text || '').trim();
    };
    const isPlaceholder = (value) => !value
      || value === 'Seleccionar...'
      || value === 'Seleccionar referencia...';

    if (modo === 'motor') {
      const marca = readSelectText('sel-marca');
      const selRef = document.getElementById('sel-referencia');
      let referencia = '';
      if (selRef && selRef.style.display !== 'none') {
        referencia = readSelectText('sel-referencia');
      } else {
        referencia = readText('ref-manual');
      }
      return {
        modo,
        marca: isPlaceholder(marca) ? '' : marca,
        referencia: isPlaceholder(referencia) ? '' : referencia
      };
    }

    return {
      modo,
      marca: readText('formato-equipo-marca-text'),
      referencia: readText('formato-equipo-ref-text')
    };
  }

  function isHiddenEquipoBlock(el) {
    const block = el.closest('[data-formato-equipo-motor], [data-formato-equipo-generico]');
    if (!block) return false;
    return block.hidden || block.style.display === 'none';
  }

  function shouldIncludePdfField(el) {
    if (!el) return false;
    const section = document.getElementById('formato-equipo-section');
    if (section?.hidden && el.closest('#formato-equipo-section')) return false;
    if (isHiddenEquipoBlock(el)) return false;
    if (el.id === 'sel-referencia' && el.style.display === 'none') return false;
    if (el.id === 'ref-manual' && el.style.display === 'none') return false;
    if (el.id === 'formato-equipo-marca-text' || el.id === 'formato-equipo-ref-text') {
      const txt = (el.value || '').trim();
      if (!txt) return false;
      const block = el.closest('[data-formato-equipo-generico]');
      if (block) setNodeHidden(block, false);
      const section = document.getElementById('formato-equipo-section');
      if (section) setNodeHidden(section, false);
      return true;
    }
    if (el.id === 'formato-tipo-otra-texto') {
      const txt = (el.value || '').trim();
      if (!txt) return false;
      const wrap = document.getElementById('formato-tipo-otra-wrap');
      if (wrap) {
        wrap.hidden = false;
        wrap.style.removeProperty('display');
      }
      return true;
    }
    return true;
  }

  function simulateFormatoPdfTipoOtra() {
    const oficioId = getDocumentFormatoOficio();
    const config = getOficiosApi().getFormatoConfig?.(oficioId);
    const otra = getOtraOption(config);
    const cb = otra ? document.getElementById(otra.id) : null;
    const txt = (document.getElementById('formato-tipo-otra-texto')?.value || '').trim();
    const lbl = otra ? document.querySelector('label[for="' + otra.id + '"]') : null;
    const wrap = document.getElementById('formato-tipo-otra-wrap');
    let pdfText = '';
    const input = document.getElementById('formato-tipo-otra-texto');
    if (input && shouldIncludePdfField(input)) {
      pdfText = input.value || input.placeholder || '';
    }
    return {
      oficioId,
      otraId: otra?.id || null,
      checked: !!cb?.checked,
      texto: txt,
      labelText: lbl?.textContent || '',
      wrapHidden: wrap?.hidden,
      pdfText
    };
  }

  function simulateFormatoPdfGenericFields() {
    const oficioId = getDocumentFormatoOficio();
    const otra = simulateFormatoPdfTipoOtra();
    const equipo = simulateFormatoPdfEquipoValues();
    const fields = {};
    ['formato-equipo-marca-text', 'formato-equipo-ref-text', 'formato-tipo-otra-texto'].forEach((id) => {
      const el = document.getElementById(id);
      const include = shouldIncludePdfField(el);
      fields[id] = {
        value: (el?.value || '').trim(),
        include: !!include,
        pdfText: include ? (el?.value || '').trim() : ''
      };
    });
    return { oficioId, fields, otra, equipo };
  }

  function simulateFormatoPdfEquipoValues() {
    const oficioId = getDocumentFormatoOficio();
    const viewRoot = document.getElementById('view-formato');
    if (!viewRoot) return { oficioId, equipo: null, fields: [] };

    const fields = [];
    viewRoot.querySelectorAll('input:not([type=file]):not([type=radio]):not([type=checkbox]), select, textarea').forEach((el) => {
      if (!shouldIncludePdfField(el)) return;
      if (!el.closest('#formato-equipo-section')) return;
      const valor = el.tagName === 'SELECT'
        ? (el.options[el.selectedIndex]?.text || '')
        : (el.value || '');
      const inObs = !!el.closest('.obs-lines');
      const label = el.closest('.field')?.querySelector('label')?.textContent?.trim() || el.id;
      fields.push({
        id: el.id || el.name || '',
        label,
        valor: valor || (inObs ? '' : (el.placeholder || ''))
      });
    });

    return {
      oficioId,
      equipo: getFormatoEquipoValues(oficioId),
      fields
    };
  }

  function updateEquipoSection(oficioId, options) {
    const opts = options || {};
    const config = getOficiosApi().getFormatoConfig?.(oficioId);
    const modo = config?.equipoModo || 'none';
    const section = document.getElementById('formato-equipo-section');
    setNodeHidden(section, modo === 'none');

    const motorMarca = document.getElementById('formato-equipo-marca-motor');
    const genericoMarca = document.getElementById('formato-equipo-marca-generico');
    const motorRef = document.getElementById('formato-equipo-ref-motor');
    const genericoRef = document.getElementById('formato-equipo-ref-generico');
    const accesorios = document.getElementById('formato-equipo-accesorios');
    const selRef = document.getElementById('sel-referencia');
    const refManual = document.getElementById('ref-manual');
    const refGenerico = document.getElementById('formato-equipo-ref-text');

    setNodeHidden(motorMarca, modo !== 'motor');
    setNodeHidden(genericoMarca, modo !== 'generico');
    setNodeHidden(motorRef, modo !== 'motor');
    setNodeHidden(genericoRef, modo !== 'generico');
    setNodeHidden(accesorios, modo !== 'motor');

    if (modo === 'generico') {
      if (refManual?.value && refGenerico && !refGenerico.value) {
        refGenerico.value = refManual.value;
      }
      applyEquipoRefPlaceholder(refGenerico, config);
    } else if (modo === 'motor') {
      if (!opts.skipCatalogRefresh && typeof global.actualizarReferencias === 'function') {
        global.actualizarReferencias();
      }
      applyEquipoRefPlaceholder(refManual, config);
    }

    if (global.ArpaI18n?.apply) {
      global.ArpaI18n.apply(global.ArpaI18n.getLang?.() || 'es');
    }
  }

  function updateOtraFieldVisibility(oficioId) {
    const wrap = document.getElementById('formato-tipo-otra-wrap');
    if (!wrap) return;
    const config = getOficiosApi().getFormatoConfig?.(oficioId);
    const otra = getOtraOption(config);
    if (!otra || oficioId === 'automatismos') {
      wrap.hidden = true;
      return;
    }
    const checked = !!document.getElementById(otra.id)?.checked;
    wrap.hidden = !checked;
  }

  function bindTipoCheckboxListeners(oficioId) {
    const config = getOficiosApi().getFormatoConfig?.(oficioId);
    if (!config) return;
    config.opciones.forEach((op) => {
      const el = document.getElementById(op.id);
      if (!el || el.dataset.formatoTipoBound === '1') return;
      el.dataset.formatoTipoBound = '1';
      el.addEventListener('change', () => {
        updateOtraFieldVisibility(currentRenderOficio || oficioId);
        if (typeof global.actualizarReferencias === 'function') {
          global.actualizarReferencias();
        }
      });
    });
    const otraInput = document.getElementById('formato-tipo-otra-texto');
    if (otraInput && otraInput.dataset.formatoTipoBound !== '1') {
      otraInput.dataset.formatoTipoBound = '1';
      otraInput.addEventListener('input', () => {
        if (typeof global.scheduleFormatoDraftSave === 'function') {
          global.scheduleFormatoDraftSave();
        }
      });
    }
  }

  function renderFormatoTipoSection(oficioId, options) {
    const opts = options || {};
    const api = getOficiosApi();
    const config = api.getFormatoConfig?.(oficioId);
    if (!config) return false;

    const chips = document.getElementById('formato-tipo-chips');
    const title = document.getElementById('formato-tipo-titulo');
    if (!chips || !title) return false;

    const previous = {};
    if (opts.preserveValues) {
      chips.querySelectorAll('input[type="checkbox"]').forEach((el) => {
        previous[el.id] = el.checked;
      });
    }

    const otraTextBefore = document.getElementById('formato-tipo-otra-texto')?.value || '';

    title.textContent = config.titulo;
    title.setAttribute('data-i18n', config.tituloI18nKey);
    title.setAttribute('data-i18n-default', config.titulo);

    chips.innerHTML = config.opciones.map((op) => (
      '<input type="checkbox" id="' + op.id + '">' +
      '<label for="' + op.id + '" data-i18n="' + op.i18nKey + '" data-i18n-default="' + op.label.replace(/"/g, '&quot;') + '">' + op.label + '</label>'
    )).join('');

    if (opts.selections) {
      Object.entries(opts.selections).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox') el.checked = !!val;
        else if ('value' in el) el.value = val == null ? '' : String(val);
      });
    } else if (opts.preserveValues) {
      Object.entries(previous).forEach(([id, checked]) => {
        const el = document.getElementById(id);
        if (el) el.checked = !!checked;
      });
      const otraInput = document.getElementById('formato-tipo-otra-texto');
      if (otraInput) otraInput.value = otraTextBefore;
    }

    currentRenderOficio = config.oficioId;
    updateMedidasVisibility(config.oficioId);
    updateEquipoSection(config.oficioId);
    updateOtraFieldVisibility(config.oficioId);
    bindTipoCheckboxListeners(config.oficioId);

    if (global.ArpaI18n?.apply) {
      global.ArpaI18n.apply(global.ArpaI18n.getLang?.() || 'es');
    }

    return true;
  }

  function collectTipoSelections() {
    const config = getOficiosApi().getFormatoConfig?.(currentRenderOficio || getDocumentFormatoOficio());
    const data = {};
    (config?.opciones || []).forEach((op) => {
      const el = document.getElementById(op.id);
      if (el) data[op.id] = !!el.checked;
    });
    const otraInput = document.getElementById('formato-tipo-otra-texto');
    if (otraInput) data['formato-tipo-otra-texto'] = otraInput.value || '';
    return data;
  }

  function refreshForActiveOficio(options) {
    const opts = options || {};
    const active = getOficiosApi().getActiveFormatoOficioId?.() || 'automatismos';
    if (!opts.keepDocumentOficio) {
      setDocumentFormatoOficio(active);
    }
    const oficioId = opts.keepDocumentOficio ? getDocumentFormatoOficio() : active;
    const renderOpts = {};
    if (opts.selections) renderOpts.selections = opts.selections;
    else if (!opts.clearSelections) renderOpts.preserveValues = true;
    renderFormatoTipoSection(oficioId, renderOpts);
    if (opts.clearSelections) {
      const otraInput = document.getElementById('formato-tipo-otra-texto');
      if (otraInput) otraInput.value = '';
      clearEquipoFields();
    }
    if (typeof global.scheduleFormatoDraftSave === 'function') {
      global.scheduleFormatoDraftSave();
    }
  }

  function ensureDocumentOficioForNewForm() {
    const active = getOficiosApi().getActiveFormatoOficioId?.() || 'automatismos';
    setDocumentFormatoOficio(active);
    renderFormatoTipoSection(active);
  }

  function hasLegacyAutomatismosDraft(data) {
    return ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9'].some((id) => data[id] != null);
  }

  function resolveDraftOficioId(data) {
    if (data[DRAFT_OFICIO_KEY]) {
      return getOficiosApi().resolveFormatoOficioId?.(data[DRAFT_OFICIO_KEY]) || 'automatismos';
    }
    if (hasLegacyAutomatismosDraft(data)) return 'automatismos';
    return getOficiosApi().getActiveFormatoOficioId?.() || 'automatismos';
  }

  function initFromDraft(draft) {
    const data = draft || readDraftRaw();
    const oficioId = resolveDraftOficioId(data);
    currentRenderOficio = oficioId;
    renderFormatoTipoSection(oficioId, { selections: data });
    updateMedidasVisibility(oficioId);
    updateEquipoSection(oficioId);
    updateOtraFieldVisibility(oficioId);
  }

  function ensureDocumentFormatoTipoForPrint(snapshot) {
    const snap = snapshot || captureFormatoPrintSnapshot();
    applyFormatoPrintSnapshot(snap);
    renderFormatoTipoSection(snap.oficioId, { selections: snap.selections });
    applyFormatoPrintSnapshot(snap);
    updateEquipoSection(snap.oficioId, { skipCatalogRefresh: true });
    return snap;
  }

  function prepareFormatoEquipoForPrint(snapshot) {
    applyFormatoPrintSnapshot(snapshot || captureFormatoPrintSnapshot());
  }

  function prepareFormatoTipoForPrint(snapshot) {
    const snap = ensureDocumentFormatoTipoForPrint(snapshot);
    prepareFormatoEquipoForPrint(snap);
    printLabelBackups = [];
    const oficioId = snap.oficioId;
    const config = getOficiosApi().getFormatoConfig?.(oficioId);
    const title = document.getElementById('formato-tipo-titulo');
    if (title) {
      printLabelBackups.push({ el: title, value: title.textContent });
      title.textContent = config?.titulo || title.textContent;
    }
    const otra = getOtraOption(config);
    const txt = (snap.selections?.['formato-tipo-otra-texto'] || '').trim();
    if (otra && oficioId !== 'automatismos' && txt) {
      const cb = document.getElementById(otra.id);
      const lbl = document.querySelector('label[for="' + otra.id + '"]');
      const wrap = document.getElementById('formato-tipo-otra-wrap');
      const otraInput = document.getElementById('formato-tipo-otra-texto');
      if (otraInput) otraInput.value = txt;
      if (lbl) {
        printLabelBackups.push({ el: lbl, value: lbl.textContent });
        const base = getOficiosApi().getFormatoOpcionLabel?.(oficioId, otra.id) || 'Otra';
        lbl.textContent = (cb?.checked ? base + ': ' : '') + txt;
      }
      if (wrap) {
        printLabelBackups.push({ el: wrap, prop: 'hidden', value: wrap.hidden });
        printLabelBackups.push({ el: wrap, prop: 'display', value: wrap.style.display });
        wrap.hidden = false;
        wrap.style.removeProperty('display');
      }
    }
    applyFormatoPrintSnapshot(snap);
  }

  function restoreFormatoTipoAfterPrint() {
    printLabelBackups.forEach((item) => {
      if (!item.el) return;
      if (item.prop === 'hidden') item.el.hidden = item.value;
      else if (item.prop === 'display') {
        if (item.value) item.el.style.display = item.value;
        else item.el.style.removeProperty('display');
      } else item.el.textContent = item.value;
    });
    printLabelBackups = [];
    if (global.ArpaI18n?.apply) {
      global.ArpaI18n.apply(global.ArpaI18n.getLang?.() || 'es');
    }
  }

  function initFormatoTipoByOficio() {
    const draft = readDraftRaw();
    if (draft && Object.keys(draft).length) {
      initFromDraft(draft);
    } else {
      ensureDocumentOficioForNewForm();
    }
    global.addEventListener('arpa-active-oficio-changed', () => {
      refreshForActiveOficio({ clearSelections: true });
    });
  }

  global.ArpaFormatoTipo = {
    DRAFT_OFICIO_KEY,
    getDocumentFormatoOficio,
    setDocumentFormatoOficio,
    renderFormatoTipoSection,
    collectTipoSelections,
    refreshForActiveOficio,
    ensureDocumentOficioForNewForm,
    initFromDraft,
    captureFormatoPrintSnapshot,
    applyFormatoPrintSnapshot,
    capturePrintSnapshot: captureFormatoPrintSnapshot,
    applyPrintSnapshot: applyFormatoPrintSnapshot,
    ensureDocumentFormatoTipoForPrint,
    prepareFormatoEquipoForPrint,
    prepareFormatoTipoForPrint,
    restoreFormatoTipoAfterPrint,
    initFormatoTipoByOficio,
    updateMedidasVisibility,
    updateEquipoSection,
    updateOtraFieldVisibility,
    clearEquipoFields,
    getFormatoEquipoValues,
    shouldIncludePdfField,
    simulateFormatoPdfEquipoValues,
    simulateFormatoPdfTipoOtra,
    simulateFormatoPdfGenericFields
  };
})(typeof window !== 'undefined' ? window : globalThis);
