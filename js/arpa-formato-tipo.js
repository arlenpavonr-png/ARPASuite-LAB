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
      pdfText = input.value || '';
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
        valor: valor || ''
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

/**
 * Formato de Servicio — Lista de verificación de puertas automáticas (basada en la NTC 5926-3).
 * Puntos redactados por ARPA como verificaciones prácticas; no es el texto de la norma.
 * Se guarda en el borrador / historial bajo la llave `_checklistNtc`.
 * Va en este archivo (y no en uno nuevo) porque todo script de index.html debe estar en la
 * lista de precarga de service-worker.js, que es un archivo protegido.
 */
(function (global) {
  'use strict';

  const DRAFT_KEY = '_checklistNtc';
  const SECTION_ID = 'formato-checklist-ntc-section';
  const RESULTS = ['ok', 'no', 'na'];
  const OBS_MAX = 240;
  const DOOR_TYPES = ['corrediza', 'batiente', 'seccional', 'enrollable', 'peatonal', 'barrera'];

  // [id, español, inglés]
  const COMMON = [
    ['com_senal', 'Avisos de advertencia y señalización visibles y legibles.', 'Warning signs and labels are visible and legible.'],
    ['com_luz', 'Luz o aviso de movimiento funciona mientras la puerta se mueve.', 'Flashing light or movement warning works while the door moves.'],
    ['com_zona', 'Zona de movimiento de la puerta libre de objetos y obstáculos.', 'Door travel area is clear of objects and obstructions.'],
    ['com_fotocelda', 'Fotoceldas o sensores detectan a una persona o vehículo y detienen o devuelven la puerta.', 'Photocells or sensors detect a person or vehicle and stop or reverse the door.'],
    ['com_borde', 'Bordes o bandas de seguridad sensibles reaccionan al contacto (si los tiene).', 'Safety edges react on contact (if fitted).'],
    ['com_fuerza', 'Fuerza de cierre limitada: ante un obstáculo la puerta se detiene o se devuelve.', 'Closing force is limited: the door stops or reverses when it meets an obstacle.'],
    ['com_paro', 'Paro de emergencia funciona y está a la vista y al alcance.', 'Emergency stop works and is visible and reachable.'],
    ['com_manual', 'Desbloqueo manual funciona: sin energía la puerta se puede mover a mano.', 'Manual release works: without power the door can be moved by hand.'],
    ['com_finales', 'Finales de carrera (límites de apertura y cierre) bien ajustados.', 'Limit switches (open and close positions) are correctly adjusted.'],
    ['com_mandos', 'Pulsadores, controles remotos y mandos funcionan; el pulsador fijo tiene vista a la puerta.', 'Push buttons, remotes and controls work; the fixed button has a view of the door.'],
    ['com_tablero', 'Tablero o caja de control cerrado, limpio y con sus protecciones (breaker) en buen estado.', 'Control box is closed, clean and its circuit protection (breaker) is in good condition.'],
    ['com_tierra', 'Puesta a tierra conectada; cables sin daños ni empalmes expuestos.', 'Ground connection in place; wiring undamaged with no exposed splices.'],
    ['com_bateria', 'Batería de respaldo carga y mueve la puerta (si la tiene).', 'Backup battery charges and moves the door (if fitted).'],
    ['com_anclajes', 'Anclajes, tornillería y estructura firmes, sin fisuras ni corrosión grave.', 'Anchors, bolts and structure are secure, without cracks or severe corrosion.'],
    ['com_lubricacion', 'Partes móviles limpias y lubricadas según el fabricante.', 'Moving parts are clean and lubricated as per the manufacturer.'],
    ['com_ruido', 'Movimiento suave, sin golpes, ruidos ni vibraciones fuera de lo normal.', 'Smooth movement, without knocks, noises or abnormal vibration.']
  ];

  const BY_TYPE = {
    corrediza: [
      ['cor_cremallera', 'Cremallera y piñón alineados, bien fijados y con la holgura correcta.', 'Rack and pinion aligned, secured and with correct clearance.'],
      ['cor_riel', 'Riel y ruedas sin desgaste, deformación ni suciedad.', 'Track and wheels free of wear, deformation and dirt.'],
      ['cor_guia', 'Guía superior y rodillos mantienen la hoja derecha.', 'Top guide and rollers keep the gate upright.'],
      ['cor_topes', 'Topes mecánicos firmes en los dos extremos.', 'Mechanical end stops secure at both ends.'],
      ['cor_atrapamiento', 'Sin puntos de atrapamiento entre la hoja y columnas o muros (espacios protegidos).', 'No trapping points between the gate and posts or walls (gaps guarded).']
    ],
    batiente: [
      ['bat_bisagras', 'Bisagras o pivotes firmes, sin juego y lubricados.', 'Hinges or pivots secure, without play and lubricated.'],
      ['bat_brazos', 'Brazos o pistones del motor bien fijados, sin juego ni fugas.', 'Operator arms or rams secured, without play or leaks.'],
      ['bat_topes', 'Topes de piso o de apertura firmes.', 'Floor or opening stops secure.'],
      ['bat_cerradura', 'Electrocerradura o cerrojo funciona (si lo tiene).', 'Electric lock or latch works (if fitted).'],
      ['bat_atrapamiento', 'Espacio entre hoja y muro del lado de las bisagras sin riesgo de atrapar manos.', 'Gap between leaf and wall on the hinge side does not trap hands.']
    ],
    seccional: [
      ['sec_cables', 'Cables de acero sin hilos rotos ni óxido, bien enrollados en los tambores.', 'Steel cables without broken strands or rust, correctly wound on the drums.'],
      ['sec_resortes', 'Resortes (torsión o extensión) sin roturas ni desgaste.', 'Springs (torsion or extension) without breaks or wear.'],
      ['sec_balance', 'Puerta balanceada: con el motor desacoplado se queda quieta a media altura.', 'Door is balanced: with the operator released it stays still at half height.'],
      ['sec_anticaida', 'Dispositivo anticaída (rotura de cable o de resorte) presente y en buen estado.', 'Fall protection (cable or spring break device) present and in good condition.'],
      ['sec_rodillos', 'Rodillos, poleas y rieles alineados, firmes y sin desgaste.', 'Rollers, pulleys and tracks aligned, secure and without wear.'],
      ['sec_paneles', 'Paneles y bisagras entre paneles sin golpes, grietas ni tornillos flojos.', 'Panels and panel hinges without dents, cracks or loose screws.'],
      ['sec_sellos', 'Empaques inferior y laterales en buen estado.', 'Bottom and side seals in good condition.']
    ],
    enrollable: [
      ['enr_eje', 'Eje, tambor y soportes firmes, sin juego.', 'Shaft, drum and brackets secure, without play.'],
      ['enr_lamas', 'Lamas o lona y barra inferior sin roturas, rasgaduras ni piezas sueltas.', 'Slats or curtain and bottom bar without breaks, tears or loose parts.'],
      ['enr_guias', 'Guías laterales rectas, fijas y limpias.', 'Side guides straight, secure and clean.'],
      ['enr_freno', 'Freno del motor sostiene la cortina detenida en cualquier punto.', 'Motor brake holds the curtain still at any point.'],
      ['enr_anticaida', 'Dispositivo anticaída presente y en buen estado (si aplica).', 'Fall protection device present and in good condition (if applicable).'],
      ['enr_manual', 'Operación manual (cadena o manivela) funciona.', 'Manual operation (chain or crank) works.']
    ],
    peatonal: [
      ['pea_sensores', 'Sensores de apertura detectan a la persona a tiempo por ambos lados.', 'Activation sensors detect people in time on both sides.'],
      ['pea_umbral', 'Sensores de seguridad mantienen la puerta abierta mientras hay alguien en el paso.', 'Safety sensors keep the door open while someone is in the doorway.'],
      ['pea_velocidad', 'Velocidad de cierre suave y tiempo de espera adecuado.', 'Gentle closing speed and adequate hold-open time.'],
      ['pea_correa', 'Correa, poleas y carros sin desgaste; guía de piso libre.', 'Belt, pulleys and carriages without wear; floor guide clear.'],
      ['pea_vidrio', 'Vidrios y perfiles sin roturas; vidrio de seguridad.', 'Glass and frames without breaks; safety glass.'],
      ['pea_modos', 'Selector de modos (automático, abierta, cerrada, solo salida) funciona.', 'Mode selector (automatic, open, closed, exit only) works.'],
      ['pea_evacuacion', 'Sin energía la puerta abre o se puede abrir a mano para salir.', 'Without power the door opens or can be opened by hand to get out.']
    ],
    barrera: [
      ['bar_brazo', 'Brazo recto, bien fijado y con franjas reflectivas visibles.', 'Boom straight, secured and with visible reflective strips.'],
      ['bar_balance', 'Resorte de balanceo ajustado: el brazo queda equilibrado.', 'Balance spring adjusted: the boom is balanced.'],
      ['bar_detector', 'Detector de vehículos (lazo o fotocelda) evita que el brazo baje sobre un vehículo.', 'Vehicle detector (loop or photocell) prevents the boom from lowering onto a vehicle.'],
      ['bar_peatonal', 'Aviso de paso solo vehicular; los peatones tienen paso aparte.', 'Vehicle-only sign; pedestrians have a separate path.'],
      ['bar_apoyo', 'Apoyo u horquilla del brazo firme (si lo tiene).', 'Boom rest or fork secure (if fitted).']
    ]
  };

  const TEXT = {
    es: {
      title: 'Lista de verificación (NTC 5926-3)',
      toggle: 'Incluir lista de verificación en este informe',
      hint: 'Revisión de seguridad y funcionamiento de la puerta. Marque cada punto.',
      tipo: 'Tipo de puerta',
      tipo_elegir: 'Seleccione el tipo de puerta…',
      tipo_hint: 'Elija el tipo de puerta para ver los puntos.',
      'tipo.corrediza': 'Corrediza',
      'tipo.batiente': 'Batiente (1 o 2 hojas)',
      'tipo.seccional': 'Seccional o levadiza',
      'tipo.enrollable': 'Enrollable, cortina o rápida',
      'tipo.peatonal': 'Peatonal deslizante (vidrio)',
      'tipo.barrera': 'Barrera o talanquera',
      grupo_comun: 'Comunes a todas las puertas',
      grupo_tipo: 'Puerta: {tipo}',
      ok: 'Cumple',
      no: 'No cumple',
      na: 'No aplica',
      pending: 'Sin revisar',
      obs: 'Observación (opcional)',
      obs_no: '¿Qué falla y qué recomienda?',
      foto: 'Foto',
      foto_quitar: 'Toca para quitar la foto',
      resumen: 'Resumen',
      resumen_pend: '{n} sin revisar',
      no_lista: 'Puntos que no cumplen',
      no_ninguno: 'Ningún punto marcado como "No cumple".',
      print_title: 'Lista de verificación basada en la NTC 5926-3',
      print_tipo: 'Tipo de puerta',
      col_num: '#',
      col_punto: 'Punto revisado',
      col_res: 'Resultado',
      col_obs: 'Observación',
      recomendaciones: 'Recomendaciones (puntos que no cumplen)',
      sin_obs: 'Corregir antes de seguir usando la puerta con normalidad.',
      fotos: 'Fotos de la lista de verificación',
      nota: 'Esta lista no reemplaza la norma; el técnico es responsable de su aplicación.'
    },
    en: {
      title: 'Checklist (NTC 5926-3)',
      toggle: 'Include checklist in this report',
      hint: 'Door safety and operation check. Mark every item.',
      tipo: 'Door type',
      tipo_elegir: 'Select the door type…',
      tipo_hint: 'Choose the door type to see the items.',
      'tipo.corrediza': 'Sliding gate',
      'tipo.batiente': 'Swing gate (1 or 2 leaves)',
      'tipo.seccional': 'Sectional or up-and-over',
      'tipo.enrollable': 'Rolling, shutter or high-speed',
      'tipo.peatonal': 'Pedestrian sliding (glass)',
      'tipo.barrera': 'Barrier gate',
      grupo_comun: 'Common to all doors',
      grupo_tipo: 'Door: {tipo}',
      ok: 'Pass',
      no: 'Fail',
      na: 'N/A',
      pending: 'Not checked',
      obs: 'Note (optional)',
      obs_no: 'What is wrong and what do you recommend?',
      foto: 'Photo',
      foto_quitar: 'Tap to remove the photo',
      resumen: 'Summary',
      resumen_pend: '{n} not checked',
      no_lista: 'Failed items',
      no_ninguno: 'No item marked as "Fail".',
      print_title: 'Checklist based on NTC 5926-3',
      print_tipo: 'Door type',
      col_num: '#',
      col_punto: 'Item checked',
      col_res: 'Result',
      col_obs: 'Note',
      recomendaciones: 'Recommendations (failed items)',
      sin_obs: 'Correct before normal use of the door continues.',
      fotos: 'Checklist photos',
      nota: 'This checklist does not replace the standard; the technician is responsible for its application.'
    }
  };

  // Casillas de "Tipo de Puerta / Motor" del formato (oficio Automatismos) → tipo de la lista.
  const CHIP_TO_TYPE = [
    ['c5', 'seccional'], ['c4', 'seccional'], ['c9', 'enrollable'], ['c1', 'corrediza'],
    ['c7', 'corrediza'], ['c2', 'batiente'], ['c3', 'batiente'], ['c6', 'barrera']
  ];

  let state = emptyState();

  function emptyState() {
    return { enabled: false, tipo: '', items: {} };
  }

  function pickLang(l) {
    return l === 'en' ? 'en' : 'es';
  }

  function uiLang() {
    return pickLang(global.ArpaI18n?.getLang?.());
  }

  function docLang() {
    return global.ArpaDocLang?.isEnglish?.() ? 'en' : 'es';
  }

  function tx(key, l, vars) {
    const dict = TEXT[pickLang(l)];
    let s = dict[key] != null ? dict[key] : (TEXT.es[key] != null ? TEXT.es[key] : key);
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : ''));
    return s;
  }

  function tipoLabel(tipo, l) {
    return DOOR_TYPES.includes(tipo) ? tx('tipo.' + tipo, l) : '';
  }

  /** Puntos que aplican al tipo de puerta: comunes + propios, numerados 1..N. */
  function getItems(tipo, l) {
    const lang = pickLang(l);
    const out = [];
    const push = (row, group) => out.push({ id: row[0], group, text: lang === 'en' ? row[2] : row[1], num: out.length + 1 });
    COMMON.forEach((row) => push(row, 'comun'));
    (BY_TYPE[tipo] || []).forEach((row) => push(row, tipo));
    return out;
  }

  function normalize(raw) {
    const st = emptyState();
    if (!raw || typeof raw !== 'object') return st;
    st.enabled = raw.enabled === true;
    st.tipo = DOOR_TYPES.includes(raw.tipo) ? raw.tipo : '';
    const items = raw.items && typeof raw.items === 'object' ? raw.items : {};
    Object.keys(items).forEach((id) => {
      const it = items[id];
      if (!it || typeof it !== 'object' || !/^[a-z]{3}_[a-z_]+$/.test(id)) return;
      const r = RESULTS.includes(it.r) ? it.r : '';
      const obs = typeof it.obs === 'string' ? it.obs.slice(0, OBS_MAX) : '';
      const foto = typeof it.foto === 'string' && it.foto.indexOf('data:image/') === 0 ? it.foto : '';
      if (r || obs || foto) st.items[id] = { r, obs, foto };
    });
    return st;
  }

  function clone(st) {
    return JSON.parse(JSON.stringify(st));
  }

  /** Conteo y lista de "No cumple" solo con los puntos del tipo de puerta elegido. */
  function summarize(st, l) {
    const s = normalize(st);
    const res = { total: 0, ok: 0, no: 0, na: 0, pending: 0, noItems: [], fotos: [] };
    if (!s.tipo) return res;
    getItems(s.tipo, l).forEach((item) => {
      const it = s.items[item.id] || {};
      res.total += 1;
      if (it.r === 'ok') res.ok += 1;
      else if (it.r === 'no') {
        res.no += 1;
        res.noItems.push({ id: item.id, num: item.num, text: item.text, obs: it.obs || '' });
      } else if (it.r === 'na') res.na += 1;
      else res.pending += 1;
      if (it.foto) res.fotos.push({ id: item.id, num: item.num, r: it.r || '', foto: it.foto });
    });
    return res;
  }

  function tipoFromChips(doc) {
    const d = doc || global.document;
    if (!d) return '';
    for (const [id, tipo] of CHIP_TO_TYPE) {
      if (d.getElementById(id)?.checked) return tipo;
    }
    return '';
  }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function resultLabel(r, l) {
    return r ? tx(r, l) : tx('pending', l);
  }

  /** Tabla del PDF (HTML). Vacío si la lista está apagada o sin tipo de puerta. */
  function buildPrintHtml(st, l) {
    const s = normalize(st);
    if (!s.enabled || !s.tipo) return '';
    const lang = pickLang(l);
    const sum = summarize(s, lang);
    const items = getItems(s.tipo, lang);
    let rows = '';
    let lastGroup = '';
    items.forEach((item) => {
      if (item.group !== lastGroup) {
        lastGroup = item.group;
        const g = item.group === 'comun' ? tx('grupo_comun', lang) : tx('grupo_tipo', lang, { tipo: tipoLabel(s.tipo, lang) });
        rows += '<tr class="ntc-pr-group"><td colspan="4">' + esc(g) + '</td></tr>';
      }
      const it = s.items[item.id] || {};
      const r = it.r || '';
      rows += '<tr class="ntc-pr-row ntc-pr-' + (r || 'pending') + '">' +
        '<td class="ntc-pr-num">' + item.num + '</td>' +
        '<td>' + esc(item.text) + '</td>' +
        '<td class="ntc-pr-res">' + esc(resultLabel(r, lang)) + '</td>' +
        '<td>' + esc(it.obs || '') + '</td></tr>';
    });
    const box = (cls, n, label) => '<div class="ntc-pr-box ' + cls + '"><strong>' + n + '</strong><span>' + esc(label) + '</span></div>';
    // El título "Lista de verificación basada en la NTC 5926-3" va en el título de la sección.
    let html = '<div class="ntc-pr-head"><div class="ntc-pr-tipo">' + esc(tx('print_tipo', lang)) + ': <strong>' + esc(tipoLabel(s.tipo, lang)) + '</strong></div></div>' +
      '<div class="ntc-pr-sum">' + box('ntc-pr-box-ok', sum.ok, tx('ok', lang)) + box('ntc-pr-box-no', sum.no, tx('no', lang)) +
      box('ntc-pr-box-na', sum.na, tx('na', lang)) +
      (sum.pending ? box('ntc-pr-box-pending', sum.pending, tx('pending', lang)) : '') + '</div>';
    if (sum.noItems.length) {
      html += '<div class="ntc-pr-reco"><div class="ntc-pr-reco-title">' + esc(tx('recomendaciones', lang)) + '</div><ul>' +
        sum.noItems.map((n) => '<li><strong>#' + n.num + ' ' + esc(n.text) + '</strong><br>' + esc(n.obs || tx('sin_obs', lang)) + '</li>').join('') +
        '</ul></div>';
    }
    html += '<table class="ntc-pr-table"><colgroup><col style="width:6%"><col style="width:50%"><col style="width:15%"><col style="width:29%"></colgroup>' +
      '<thead><tr><th>' + esc(tx('col_num', lang)) + '</th><th>' + esc(tx('col_punto', lang)) + '</th><th>' + esc(tx('col_res', lang)) +
      '</th><th>' + esc(tx('col_obs', lang)) + '</th></tr></thead><tbody>' + rows + '</tbody></table>';
    if (sum.fotos.length) {
      html += '<div class="ntc-pr-fotos-title">' + esc(tx('fotos', lang)) + '</div><div class="ntc-pr-fotos">' +
        sum.fotos.map((f) => '<figure class="ntc-pr-foto"><img src="' + esc(f.foto) + '" alt=""><figcaption>#' + f.num + ' · ' + esc(resultLabel(f.r, lang)) + '</figcaption></figure>').join('') +
        '</div>';
    }
    html += '<p class="ntc-pr-nota">' + esc(tx('nota', lang)) + '</p>';
    return html;
  }

  function buildSummaryHtml(st, l) {
    const sum = summarize(st, l);
    let html = '<div class="ntc-sum-title">' + esc(tx('resumen', l)) + '</div><div class="ntc-sum-boxes">' +
      '<span class="ntc-chip ntc-chip-ok">' + sum.ok + ' ' + esc(tx('ok', l)) + '</span>' +
      '<span class="ntc-chip ntc-chip-no">' + sum.no + ' ' + esc(tx('no', l)) + '</span>' +
      '<span class="ntc-chip ntc-chip-na">' + sum.na + ' ' + esc(tx('na', l)) + '</span>' +
      (sum.pending ? '<span class="ntc-chip ntc-chip-pending">' + esc(tx('resumen_pend', l, { n: sum.pending })) + '</span>' : '') +
      '</div><div class="ntc-sum-sub">' + esc(tx('no_lista', l)) + '</div>';
    html += sum.noItems.length
      ? '<ul class="ntc-sum-list">' + sum.noItems.map((n) => '<li><strong>#' + n.num + '</strong> ' + esc(n.text) + (n.obs ? '<br><em>' + esc(n.obs) + '</em>' : '') + '</li>').join('') + '</ul>'
      : '<p class="ntc-sum-none">' + esc(tx('no_ninguno', l)) + '</p>';
    return html;
  }

  function buildEditorHtml(st, l, locked) {
    const s = normalize(st);
    const dis = locked ? ' disabled' : '';
    let html = '<label class="ntc-switch"><input type="checkbox" data-ntc="toggle"' + (s.enabled ? ' checked' : '') + dis + '>' +
      '<span class="ntc-switch-ui" aria-hidden="true"></span><span class="ntc-switch-text">' + esc(tx('toggle', l)) + '</span></label>';
    if (!s.enabled) return html;
    html += '<p class="ntc-hint">' + esc(tx('hint', l)) + '</p>';
    html += '<div class="field ntc-tipo"><label>' + esc(tx('tipo', l)) + '</label><select data-ntc="tipo"' + dis + '>' +
      '<option value="">' + esc(tx('tipo_elegir', l)) + '</option>' +
      DOOR_TYPES.map((t) => '<option value="' + t + '"' + (s.tipo === t ? ' selected' : '') + '>' + esc(tipoLabel(t, l)) + '</option>').join('') +
      '</select></div>';
    if (!s.tipo) return html + '<p class="ntc-hint">' + esc(tx('tipo_hint', l)) + '</p>';
    let lastGroup = '';
    getItems(s.tipo, l).forEach((item) => {
      if (item.group !== lastGroup) {
        if (lastGroup) html += '</div>';
        lastGroup = item.group;
        const g = item.group === 'comun' ? tx('grupo_comun', l) : tx('grupo_tipo', l, { tipo: tipoLabel(s.tipo, l) });
        html += '<div class="ntc-group"><div class="ntc-group-title">' + esc(g) + '</div>';
      }
      const it = s.items[item.id] || {};
      html += '<div class="ntc-item" data-item="' + item.id + '" data-r="' + (it.r || '') + '">' +
        '<div class="ntc-item-text"><span class="ntc-num">' + item.num + '</span>' + esc(item.text) + '</div>' +
        '<div class="ntc-btns" role="group">' +
        RESULTS.map((r) => '<button type="button" class="ntc-btn ntc-btn-' + r + '" data-ntc="r" data-v="' + r + '" aria-pressed="' + (it.r === r) + '"' + dis + '>' + esc(tx(r, l)) + '</button>').join('') +
        '</div>';
      if (it.r || it.obs || it.foto) {
        html += '<div class="ntc-extra"><input type="text" class="ntc-obs" data-ntc="obs" maxlength="' + OBS_MAX + '" value="' + esc(it.obs || '') + '" placeholder="' +
          esc(tx(it.r === 'no' ? 'obs_no' : 'obs', l)) + '"' + (locked ? ' readonly' : '') + '>';
        if (it.foto) {
          html += '<img class="ntc-thumb" data-ntc="foto-del" src="' + esc(it.foto) + '" alt="" title="' + esc(tx('foto_quitar', l)) + '">';
        } else if (!locked) {
          html += '<label class="ntc-foto-btn">📷 ' + esc(tx('foto', l)) + '<input type="file" accept="image/*" data-ntc="foto" class="ntc-file"></label>';
        }
        html += '</div>';
      }
      html += '</div>';
    });
    if (lastGroup) html += '</div>';
    html += '<div class="ntc-summary" data-ntc-summary>' + buildSummaryHtml(s, l) + '</div>';
    return html;
  }

  // ── DOM ──────────────────────────────────────────────────────────────────
  const CSS = [
    '#' + SECTION_ID + '[hidden]{display:none!important}',
    '.ntc-switch{display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;font-weight:600;color:#1e293b}',
    '.ntc-switch input{position:absolute;opacity:0;width:1px;height:1px}',
    '.ntc-switch-ui{flex:0 0 auto;width:40px;height:22px;border-radius:11px;background:#cbd5e1;position:relative;transition:background .15s}',
    '.ntc-switch-ui::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .15s}',
    '.ntc-switch input:checked+.ntc-switch-ui{background:#16a34a}',
    '.ntc-switch input:checked+.ntc-switch-ui::after{left:21px}',
    '.ntc-switch input:focus-visible+.ntc-switch-ui{outline:2px solid #2563eb;outline-offset:2px}',
    '.ntc-hint{font-size:11px;color:var(--muted,#64748b);margin:8px 0;line-height:1.4}',
    '.ntc-tipo{margin:6px 0 10px}',
    '.ntc-group{margin-top:12px}',
    '.ntc-group-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--blue,#1d4ed8);margin-bottom:6px}',
    '.ntc-item{border:1px solid var(--border,#e2e8f0);border-radius:8px;padding:8px 10px;margin-bottom:6px;background:#fff}',
    '.ntc-item[data-r="no"]{border-color:#f5a3a3;background:#fff5f5}',
    '.ntc-item[data-r="ok"]{border-color:#a7dcc0}',
    '.ntc-item-text{font-size:13px;line-height:1.35;color:#1e293b;margin-bottom:6px}',
    '.ntc-num{display:inline-block;min-width:22px;font-weight:700;color:var(--muted,#64748b)}',
    '.ntc-btns{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}',
    '.ntc-btn{border:1.5px solid var(--border,#cbd5e1);background:#fff;border-radius:6px;padding:8px 4px;font-size:12px;font-weight:700;color:#475569;cursor:pointer;font-family:inherit}',
    '.ntc-btn-ok[aria-pressed="true"]{background:#16a34a;border-color:#16a34a;color:#fff}',
    '.ntc-btn-no[aria-pressed="true"]{background:#dc2626;border-color:#dc2626;color:#fff}',
    '.ntc-btn-na[aria-pressed="true"]{background:#64748b;border-color:#64748b;color:#fff}',
    '.ntc-btn:disabled{opacity:.6;cursor:default}',
    '.ntc-extra{display:flex;gap:6px;align-items:center;margin-top:6px}',
    '.ntc-obs{flex:1 1 auto;min-width:0;border:1.5px solid var(--border,#cbd5e1);border-radius:6px;padding:7px 8px;font-size:12px;font-family:inherit}',
    '.ntc-foto-btn{position:relative;flex:0 0 auto;border:1.5px dashed var(--border,#cbd5e1);border-radius:6px;padding:6px 8px;font-size:12px;font-weight:600;color:#475569;cursor:pointer;white-space:nowrap}',
    '.ntc-file{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}',
    '.ntc-thumb{flex:0 0 auto;width:48px;height:48px;object-fit:cover;border-radius:6px;cursor:pointer}',
    '.ntc-summary{margin-top:12px;border:1px solid var(--border,#e2e8f0);border-radius:8px;padding:10px;background:#f8fafc}',
    '.ntc-sum-title,.ntc-sum-sub{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted,#64748b)}',
    '.ntc-sum-sub{margin-top:8px}',
    '.ntc-sum-boxes{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}',
    '.ntc-chip{font-size:12px;font-weight:700;padding:4px 8px;border-radius:12px;background:#e2e8f0;color:#334155}',
    '.ntc-chip-ok{background:#dcfce7;color:#166534}.ntc-chip-no{background:#fee2e2;color:#991b1b}.ntc-chip-pending{background:#fef3c7;color:#92400e}',
    '.ntc-sum-list{margin:6px 0 0;padding-left:18px;font-size:12px;color:#991b1b;line-height:1.4}',
    '.ntc-sum-none{font-size:12px;color:var(--muted,#64748b);margin:6px 0 0}',
    '.ntc-print{display:none}',
    'body.is-printing-formato #' + SECTION_ID + '.ntc-print-off{display:none!important}',
    'body.is-printing-formato #' + SECTION_ID + ' .ntc-print{display:block!important}',
    '.ntc-pr-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:8px}',
    '.ntc-pr-tipo{font-size:11px;color:#334155}',
    '.ntc-pr-sum{display:flex;gap:8px;margin-bottom:8px;break-inside:avoid;page-break-inside:avoid}',
    '.ntc-pr-box{flex:1 1 0;border:1px solid #cbd5e1;border-radius:6px;padding:6px 8px;text-align:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
    '.ntc-pr-box strong{display:block;font-size:18px;line-height:1.1}',
    '.ntc-pr-box span{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px}',
    '.ntc-pr-box-ok{background:#ecfdf3;color:#166534;border-color:#a7dcc0}',
    '.ntc-pr-box-no{background:#fdecec;color:#b42318;border-color:#f5a3a3}',
    '.ntc-pr-box-na{background:#f1f5f9;color:#475569}',
    '.ntc-pr-box-pending{background:#fffbeb;color:#92400e;border-color:#fcd34d}',
    '.ntc-pr-reco{border-left:4px solid #b42318;background:#fdecec;padding:6px 10px;margin-bottom:8px;break-inside:avoid;page-break-inside:avoid;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
    '.ntc-pr-reco-title{font-size:11px;font-weight:800;color:#b42318;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px}',
    '.ntc-pr-reco ul{margin:0;padding-left:16px;font-size:11px;line-height:1.4;color:#1e293b}',
    '.ntc-pr-reco li{margin-bottom:3px}',
    '.ntc-pr-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10.5px}',
    '.ntc-pr-table thead{display:table-header-group}',
    '.ntc-pr-table th{background:#1a2a4a;color:#fff;text-align:left;padding:5px 6px;font-size:10px;text-transform:uppercase;letter-spacing:.3px;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
    '.ntc-pr-table td{border-bottom:1px solid #e2e8f0;padding:4px 6px;vertical-align:top;line-height:1.3;overflow-wrap:anywhere}',
    '.ntc-pr-table tr{break-inside:avoid;page-break-inside:avoid}',
    '.ntc-pr-group td{background:#eef2f7;font-weight:800;color:#1a2a4a;font-size:10px;text-transform:uppercase;letter-spacing:.3px;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
    '.ntc-pr-num{text-align:center;color:#64748b;font-weight:700}',
    '.ntc-pr-res{font-weight:800}',
    '.ntc-pr-ok .ntc-pr-res{color:#166534}',
    '.ntc-pr-na .ntc-pr-res,.ntc-pr-pending .ntc-pr-res{color:#64748b;font-weight:600}',
    '.ntc-pr-no td{background:#fdecec;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
    '.ntc-pr-no .ntc-pr-res{color:#b42318}',
    '.ntc-pr-fotos-title{font-size:11px;font-weight:800;color:#1a2a4a;margin:10px 0 4px}',
    '.ntc-pr-fotos{display:flex;flex-wrap:wrap;gap:6px}',
    '.ntc-pr-foto{margin:0;width:calc(33.33% - 4px);break-inside:avoid;page-break-inside:avoid}',
    '.ntc-pr-foto img{width:100%;height:110px;object-fit:cover;border-radius:4px;display:block}',
    '.ntc-pr-foto figcaption{font-size:9.5px;color:#475569;margin-top:2px}',
    '.ntc-pr-nota{font-size:9.5px;font-style:italic;color:#64748b;margin:8px 0 0}'
  ].join('\n');

  function getSection() {
    return global.document?.getElementById?.(SECTION_ID) || null;
  }

  function isApplicable() {
    const oficio = global.ArpaFormatoTipo?.getDocumentFormatoOficio?.() || 'automatismos';
    return oficio === 'automatismos';
  }

  function isLocked() {
    return !!global.document?.getElementById?.('view-formato')?.classList?.contains('ot-locked');
  }

  function ensureMounted() {
    const section = getSection();
    if (!section) return null;
    if (!global.document.getElementById('arpa-checklist-ntc-css')) {
      const style = global.document.createElement('style');
      style.id = 'arpa-checklist-ntc-css';
      style.textContent = CSS;
      global.document.head.appendChild(style);
    }
    if (!section.__ntcMounted) {
      section.__ntcMounted = true;
      section.innerHTML = '<div class="section-title"><span class="dot"></span><span data-ntc-title></span></div>' +
        '<div class="ntc-editor no-print" data-ntc-editor></div><div class="ntc-print" data-ntc-print></div>';
      section.addEventListener('click', onClick);
      section.addEventListener('change', onChange);
      section.addEventListener('input', onInput);
    }
    return section;
  }

  function render() {
    const section = ensureMounted();
    if (!section) return;
    const l = uiLang();
    section.hidden = !isApplicable();
    section.classList.toggle('ntc-print-off', !state.enabled || !state.tipo);
    section.querySelector('[data-ntc-title]').textContent = tx('title', l);
    section.querySelector('[data-ntc-editor]').innerHTML = buildEditorHtml(state, l, isLocked());
  }

  function save() {
    if (typeof global.scheduleFormatoDraftSave === 'function') global.scheduleFormatoDraftSave();
  }

  function itemOf(target) {
    const row = target.closest?.('[data-item]');
    return row ? row.getAttribute('data-item') : '';
  }

  function setItemRaw(id, patch) {
    const cur = Object.assign({ r: '', obs: '', foto: '' }, state.items[id] || {}, patch);
    if (!cur.r && !cur.obs && !cur.foto) delete state.items[id];
    else state.items[id] = cur;
  }

  function onClick(ev) {
    if (isLocked()) return;
    const btn = ev.target.closest?.('[data-ntc]');
    if (!btn) return;
    const kind = btn.getAttribute('data-ntc');
    const id = itemOf(btn);
    if (kind === 'r' && id) {
      const v = btn.getAttribute('data-v');
      const cur = (state.items[id] || {}).r;
      // Tocar de nuevo el mismo botón lo desmarca.
      setItemRaw(id, { r: cur === v ? '' : v });
      render();
      save();
    } else if (kind === 'foto-del' && id) {
      setItemRaw(id, { foto: '' });
      render();
      save();
    }
  }

  function onChange(ev) {
    const el = ev.target;
    const kind = el.getAttribute?.('data-ntc');
    if (!kind || isLocked()) return;
    if (kind === 'toggle') {
      setEnabled(el.checked);
    } else if (kind === 'tipo') {
      setTipo(el.value);
    } else if (kind === 'foto') {
      const id = itemOf(el);
      const file = el.files && el.files[0];
      if (!id || !file) return;
      const reader = new global.FileReader();
      reader.onload = function (e) {
        const compress = typeof global.compressPhotoToJpeg === 'function'
          ? global.compressPhotoToJpeg(e.target.result, 900, 0.6)
          : Promise.resolve(e.target.result);
        compress.then((dataUrl) => {
          setItemRaw(id, { foto: String(dataUrl || '') });
          state = normalize(state);
          render();
          save();
        });
      };
      reader.readAsDataURL(file);
    }
  }

  function onInput(ev) {
    const el = ev.target;
    if (el.getAttribute?.('data-ntc') !== 'obs' || isLocked()) return;
    const id = itemOf(el);
    if (!id) return;
    setItemRaw(id, { obs: String(el.value || '').slice(0, OBS_MAX) });
    const sumEl = getSection()?.querySelector('[data-ntc-summary]');
    if (sumEl) sumEl.innerHTML = buildSummaryHtml(state, uiLang());
    // El formato ya guarda el borrador con cada 'input' dentro de #view-formato.
  }

  function setEnabled(on) {
    state.enabled = !!on;
    if (state.enabled && !state.tipo) state.tipo = tipoFromChips();
    render();
    save();
  }

  function setTipo(tipo) {
    state.tipo = DOOR_TYPES.includes(tipo) ? tipo : '';
    render();
    save();
  }

  function setItem(id, patch) {
    setItemRaw(id, patch || {});
    state = normalize(state);
    render();
    save();
  }

  function getState() {
    return clone(state);
  }

  function hasData(st) {
    return !!(st && (st.enabled || st.tipo || Object.keys(st.items || {}).length));
  }

  function enrichDraft(data) {
    if (!data || typeof data !== 'object') return data;
    if (hasData(state)) data[DRAFT_KEY] = clone(state);
    else delete data[DRAFT_KEY];
    return data;
  }

  function restoreFromDraft(data) {
    state = normalize(data && data[DRAFT_KEY]);
    render();
  }

  function reset() {
    state = emptyState();
    render();
  }

  /** Quita las fotos de la lista del borrador (cuando no hay espacio). Modifica `snapshot`. */
  function stripPhotos(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || !snapshot[DRAFT_KEY]) return snapshot;
    const st = normalize(snapshot[DRAFT_KEY]);
    Object.keys(st.items).forEach((id) => { st.items[id].foto = ''; });
    snapshot[DRAFT_KEY] = normalize(st);
    return snapshot;
  }

  // Antes de que guardarPDF() cambie los campos por texto: no se vuelve a pintar el editor aquí.
  function prepareForPrint() {
    const section = ensureMounted();
    if (!section) return;
    section.hidden = !isApplicable();
    const l = docLang();
    section.classList.toggle('ntc-print-off', !state.enabled || !state.tipo);
    section.querySelector('[data-ntc-title]').textContent = tx('print_title', l);
    const printEl = section.querySelector('[data-ntc-print]');
    if (printEl) printEl.innerHTML = section.hidden ? '' : buildPrintHtml(state, l);
  }

  // Después de que guardarPDF() devuelva los campos a su sitio.
  function restoreAfterPrint() {
    const section = getSection();
    const printEl = section?.querySelector('[data-ntc-print]');
    if (printEl) printEl.innerHTML = '';
    render();
  }

  function init() {
    if (!getSection()) return;
    render();
    global.addEventListener('arpa-active-oficio-changed', () => setTimeout(render, 0));
    global.document.addEventListener('click', (ev) => {
      if (ev.target?.closest?.('.lang-btn')) setTimeout(render, 0);
    });
  }

  global.ArpaChecklistNtc = {
    DRAFT_KEY,
    DOOR_TYPES: DOOR_TYPES.slice(),
    TEXT,
    getItems,
    normalize,
    summarize,
    tipoFromChips,
    buildPrintHtml,
    buildEditorHtml,
    buildSummaryHtml,
    getState,
    setEnabled,
    setTipo,
    setItem,
    enrichDraft,
    restoreFromDraft,
    reset,
    stripPhotos,
    prepareForPrint,
    restoreAfterPrint,
    render,
    init
  };

  if (global.document && typeof global.document.addEventListener === 'function') {
    if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
