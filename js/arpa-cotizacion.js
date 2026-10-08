/**
 * Módulo: Cotización, ítems dinámicos y PDF
 */
(function (global) {
  function formatoPesos(n) {
    return global.ArpaPricing?.formatoPesos(n) || ('$ ' + (Number(n) || 0).toLocaleString('es-CO'));
  }

  function getCatalogoDeOficio(oid) {
    const normalized = global.ArpaOficios?.normalizeOficioId?.(oid) || oid;
    const fromMiCatalogo = global.ArpaMiCatalogo?.getProducts?.(normalized);
    if (Array.isArray(fromMiCatalogo) && fromMiCatalogo.length) {
      return fromMiCatalogo
        .filter((p) => (p.nom || '').trim() && (p.cod || '').trim())
        .map((p) => global.ArpaCatalogo?.productToFlatDisplay?.(p, normalized) || p);
    }
    return global.ArpaCatalogo?.getListaProductos?.(normalized) || [];
  }

  // Busca en TODOS los oficios activos (antes solo en el primero: con varios oficios,
  // p. ej. Cámaras + Automatismos, los motores no aparecían en la cotización).
  function getCatalogoActivo() {
    let ids = global.ArpaOficios?.getActiveOficiosFromSettings?.() || [];
    if (!Array.isArray(ids) || !ids.length) {
      ids = [global.ArpaMiCatalogo?.getActiveOficioId?.() || 'automatismos'];
    }
    const vistos = new Set();
    const out = [];
    ids.forEach((oid) => {
      getCatalogoDeOficio(oid).forEach((p) => {
        const cod = String(p.cod || '').trim();
        if (!cod || vistos.has(cod)) return;
        vistos.add(cod);
        out.push(p);
      });
    });
    return out;
  }

  function findProductoCot(cod) {
    const canon = String(cod || '').trim();
    return getCatalogoActivo().find((p) => p.cod === canon) || null;
  }

  function updateCatalogHint() {
    const hint = document.getElementById('cot-catalog-hint');
    if (!hint) return;
    hint.hidden = getCatalogoActivo().length > 0;
  }

  let filas = [];

  function getCobrosLineas() {
    global.ArpaCobros?.syncFromEditor?.('cot');
    return global.ArpaCobros?.getLines('cot') || [];
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }


  // Cantidades con decimales (7,5 m²); antes parseInt truncaba a 7.
  function parseCant(value) {
    if (global.ArpaPricing?.parseCantidad) return global.ArpaPricing.parseCantidad(value);
    const n = Number(String(value == null ? '' : value).trim().replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 1;
  }

  function prepararInputCantidad(el) {
    if (!el) return;
    el.min = '0.01';
    el.step = '0.01';
    el.inputMode = 'decimal';
  }

  function parsePvp(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function actualizarTotalFila(idx) {
    const f = filas[idx];
    if (!f) return;
    const tr = document.querySelector(`#cot-tabla-body tr[data-fila="${idx}"]`);
    const totalCell = tr?.querySelector('.td-total');
    if (totalCell) totalCell.textContent = formatoPesos(f.pvp * f.cant);
  }

  let marcaFiltroCot = '';
  const MAX_RESULTADOS_COT = 300;

  function normTxt(str) {
    return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function isEnglishUi() {
    const lang = global.ArpaI18n?.getLang?.() || global.ArpaI18n?.lang || document.documentElement.lang || 'es';
    return String(lang).toLowerCase().startsWith('en');
  }

  function ensureMarcasWrap() {
    let wrap = document.getElementById('cot-marcas');
    if (wrap) return wrap;
    const res = document.getElementById('resultados-cot');
    if (!res || !res.parentNode) return null;
    wrap = document.createElement('div');
    wrap.id = 'cot-marcas';
    wrap.className = 'cot-marcas';
    res.parentNode.insertBefore(wrap, res);
    return wrap;
  }

  function renderMarcasCot() {
    const wrap = ensureMarcasWrap();
    if (!wrap) return;
    const marcas = [...new Set(getCatalogoActivo().map((p) => String(p.marca || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
    if (marcas.length < 2) {
      wrap.hidden = true;
      return;
    }
    if (marcaFiltroCot && !marcas.includes(marcaFiltroCot)) marcaFiltroCot = '';
    wrap.hidden = false;
    const todas = isEnglishUi() ? 'All' : 'Todas';
    wrap.innerHTML = ['', ...marcas].map((m) =>
      `<button type="button" class="cot-marca-chip${m === marcaFiltroCot ? ' active' : ''}" data-marca="${escapeHtml(m)}">${escapeHtml(m || todas)}</button>`
    ).join('');
    wrap.querySelectorAll('.cot-marca-chip').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        marcaFiltroCot = b.dataset.marca || '';
        renderMarcasCot();
        buscarProductoCot();
      });
    });
  }

  function buscarProductoCot() {
    const q = normTxt(document.getElementById('buscador-cot')?.value).trim();
    const res = document.getElementById('resultados-cot');
    if (!res) return;
    if (!marcaFiltroCot && (!q || q.length < 2)) {
      res.style.display = 'none';
      updateCatalogHint();
      return;
    }
    const catalogo = getCatalogoActivo();
    if (!catalogo.length) {
      res.style.display = 'none';
      updateCatalogHint();
      return;
    }
    const palabras = q.split(/\s+/).filter(Boolean);
    let encontrados = catalogo.filter((p) => {
      if (marcaFiltroCot && String(p.marca || '').trim() !== marcaFiltroCot) return false;
      const texto = normTxt([p.nom, p.cod, p.marca].filter(Boolean).join(' '));
      return palabras.every((palabra) => texto.includes(palabra));
    });
    if (!q) encontrados = encontrados.slice().sort((a, b) => String(a.nom || '').localeCompare(String(b.nom || '')));
    if (!encontrados.length) {
      res.innerHTML = '<div class="resultado-item"><span class="resultado-nom" style="color:var(--muted)">' + escapeHtml(window.ArpaI18n.t('ui.cotizacion.sin_resultados')) + '</span></div>';
      res.style.display = 'block';
      return;
    }
    const total = encontrados.length;
    const visibles = encontrados.slice(0, MAX_RESULTADOS_COT);
    const en = isEnglishUi();
    let conteo = en ? `${total} product${total === 1 ? '' : 's'}` : `${total} producto${total === 1 ? '' : 's'}`;
    if (total > MAX_RESULTADOS_COT) conteo += en ? ` · showing ${MAX_RESULTADOS_COT}, type to narrow` : ` · mostrando ${MAX_RESULTADOS_COT}, escribe para afinar`;
    res.innerHTML = `<div class="resultado-conteo">${escapeHtml(conteo)}</div>` + visibles.map((p) =>
      `<div class="resultado-item" data-cod="${escapeHtml(p.cod)}" data-pvp="${p.pvp || 0}">
        <span class="resultado-cod">${escapeHtml(p.cod)}</span>
        <span class="resultado-nom">${escapeHtml(p.nom)}</span>
        <span class="resultado-pvp">${formatoPesos(resolveProductPvp(p))}</span>
      </div>`
    ).join('');
    res.scrollTop = 0;
    res.style.display = 'block';
    res.querySelectorAll('.resultado-item[data-cod]').forEach((el) => {
      el.addEventListener('click', () => seleccionarProductoCot(el.dataset.cod));
    });
  }

  function resolveProductPvp(prod) {
    if (!prod) return 0;
    const seed = global.ArpaCatalogo?.getSeedCop?.(prod.cod);
    if (typeof global.ArpaPricing?.resolveDisplayPvp === 'function') {
      return parsePvp(global.ArpaPricing.resolveDisplayPvp(prod, seed || undefined));
    }
    if (prod.pvp != null && prod.pvp !== '') return parsePvp(prod.pvp);
    return 0;
  }

  function seleccionarProductoCot(cod) {
    const prod = findProductoCot(cod);
    if (!prod) return;
    const cant = parseCant(document.getElementById('cant-input-cot')?.value);
    const pvpCatalogo = resolveProductPvp(prod);
    const existente = filas.find((f) => f.cod === prod.cod);
    if (existente) {
      existente.cant = parseCant(existente.cant + cant);
      if (!existente.pvp && pvpCatalogo) existente.pvp = pvpCatalogo;
    } else {
      filas.push({
        cod: prod.cod,
        nom: prod.nom,
        pvp: pvpCatalogo,
        cant,
        tipo: 'producto',
      });
    }
    document.getElementById('buscador-cot').value = '';
    document.getElementById('resultados-cot').style.display = 'none';
    document.getElementById('cant-input-cot').value = '1';
    renderTablaCot();
    if (marcaFiltroCot) buscarProductoCot();
  }

  function convertStaleCopFilas() {
    const pricing = global.ArpaPricing;
    if (!pricing || pricing.getCountryCode?.() === 'CO') return;
    filas.forEach((f) => {
      const seed = Number(global.ArpaCatalogo?.getSeedCop?.(f.cod)) || 0;
      if (!seed) return;
      if (Number(f.pvp) === seed) f.pvp = pricing.applyPrecargadoPvp(seed);
    });
  }

  function renderTablaCot() {
    const tbody = document.getElementById('cot-tabla-body');
    if (!tbody) return;
    convertStaleCopFilas();

    const cobros = getCobrosLineas();
    const lineas = filas.length + cobros.length;

    if (!lineas) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">' + escapeHtml(window.ArpaI18n.t('ui.cotizacion.tabla_vacia')) + '</td></tr>';
      recalcularCotizacion();
      return;
    }

    let html = '';
    filas.forEach((f, idx) => {
      html += `<tr class="cot-row" data-fila="${idx}">
        <td class="td-cod">${escapeHtml(f.cod)}</td>
        <td class="td-desc"><span class="cot-desc-text">${escapeHtml(f.nom)}</span></td>
        <td class="td-cant"><input type="number" class="cot-cant-input" min="0.01" step="0.01" inputmode="decimal" value="${f.cant}" data-fila="${idx}"></td>
        <td class="td-precio"><input type="number" class="cot-pvp-input" min="0" step="1000" value="${f.pvp}" data-fila="${idx}" inputmode="numeric"></td>
        <td class="td-total">${formatoPesos(f.pvp * f.cant)}</td>
        <td class="td-action"><button type="button" class="btn-quitar no-print" data-quitar="${idx}">✕</button></td>
      </tr>`;
    });
    cobros.forEach((f) => {
      html += `<tr class="row-cobro cot-row" data-cobro="1">
        <td class="td-cod">${escapeHtml(f.cod)}</td>
        <td class="td-desc"><span class="cot-desc-text">${escapeHtml(f.nom)}</span></td>
        <td class="td-cant"><span class="cot-cant-static">1</span></td>
        <td class="td-precio">${formatoPesos(f.pvp)}</td>
        <td class="td-total">${formatoPesos(f.pvp)}</td>
        <td class="td-action"></td>
      </tr>`;
    });

    tbody.innerHTML = html;
    tbody.querySelectorAll('.cot-cant-input').forEach((input) => {
      input.addEventListener('change', () => {
        const idx = Number(input.dataset.fila);
        filas[idx].cant = parseCant(input.value);
        actualizarTotalFila(idx);
        recalcularCotizacion();
      });
    });
    tbody.querySelectorAll('.cot-pvp-input').forEach((input) => {
      const syncPvp = () => {
        const idx = Number(input.dataset.fila);
        filas[idx].pvp = parsePvp(input.value);
        actualizarTotalFila(idx);
        recalcularCotizacion();
      };
      input.addEventListener('change', syncPvp);
      input.addEventListener('input', syncPvp);
    });
    tbody.querySelectorAll('[data-quitar]').forEach((btn) => {
      btn.addEventListener('click', () => {
        filas.splice(Number(btn.dataset.quitar), 1);
        renderTablaCot();
      });
    });
    recalcularCotizacion();
  }

  function getTaxRate() {
    const rate = Number(global.ArpaPricing?.getTaxRate?.());
    return Number.isFinite(rate) ? rate : 0;
  }

  function getTaxLabelInfo() {
    return global.ArpaPricing?.getTaxLabelText?.() || { labelWord: 'IVA', pct: 0, full: 'IVA (0%)' };
  }

  function syncTaxLabels() {
    applyTaxLabels();
  }

  function applyTaxLabels() {
    const tax = getTaxLabelInfo();
    const lang = global.ArpaI18n?.getLang?.() || 'es';
    const toggleText = lang === 'en'
      ? ('Include ' + tax.labelWord + ' ' + tax.pct + '%')
      : ('Incluir ' + tax.labelWord + ' ' + tax.pct + '%');
    const ivaCheck = document.getElementById('iva-check-cot');
    const toggleSpan = ivaCheck?.parentElement?.querySelector('span');
    if (toggleSpan) toggleSpan.textContent = toggleText;
    const ivaLabel = document.querySelector('#iva-row-cot .total-label');
    if (ivaLabel) ivaLabel.textContent = tax.full;
  }

  function recalcularCotizacion() {
    applyTaxLabels();
    const subtotalProductos = filas.reduce((s, f) => s + f.pvp * f.cant, 0);
    const subtotalCobros = getCobrosLineas().reduce((s, f) => s + f.pvp * f.cant, 0);
    const subtotal = subtotalProductos + subtotalCobros;
    const conIva = document.getElementById('iva-check-cot')?.checked;
    const iva = conIva ? subtotal * getTaxRate() : 0;
    const total = subtotal + iva;
    const subEl = document.getElementById('subtotal-val-cot');
    const ivaEl = document.getElementById('iva-val-cot');
    const totalEl = document.getElementById('total-val-cot');
    const ivaRow = document.getElementById('iva-row-cot');
    if (subEl) subEl.textContent = formatoPesos(subtotal);
    if (ivaEl) ivaEl.textContent = formatoPesos(iva);
    if (totalEl) totalEl.textContent = formatoPesos(total);
    if (ivaRow) ivaRow.style.display = conIva ? 'flex' : 'none';
  }

  function formatCotNumero(n) {
    return global.ArpaNumeracion?.formatCotNumber?.(n) || ('COT-' + String(n).padStart(3, '0'));
  }

  function parseCotNumero(value) {
    return global.ArpaNumeracion?.parseSequenceNumber?.(value) || 0;
  }

  function getUltimoCot() {
    const N = global.ArpaNumeracion;
    if (!N) return 0;
    return N.getMaxCounter(N.KEYS.cot, document.getElementById('numero-cot')?.value);
  }

  async function nuevoCotNumero() {
    if (!global.ArpaNumeracion?.blockIfNoLicense?.()) return;
    if (!global.ArpaNumeracion?.blockIfPymeMissingCode?.()) return;
    const numField = document.getElementById('numero-cot');
    const result = await global.ArpaNumeracion.nextNumberAsync('cot', numField?.value);
    if (!result || result.blocked) return;
    const { value, sincronizado } = result;
    if (!sincronizado) console.warn('[ARPA] Número de cotización generado offline, no sincronizado con la nube todavía.');
    const badge = document.getElementById('sync-status-cot');
    if (badge) {
      badge.style.display = 'inline-block';
      const licActiva = (localStorage.getItem('arpa_suite_license_code') || '(vacio)').trim();
      badge.title = 'Licencia activa: ' + licActiva;
      if (sincronizado) {
        badge.textContent = '☁️ ' + licActiva.slice(-6);
        badge.style.background = 'rgba(76,175,128,0.15)';
        badge.style.color = '#2e7d4f';
      } else {
        badge.textContent = '⚠️ ' + licActiva.slice(-6) + ' (local)';
        badge.style.background = 'rgba(224,82,82,0.15)';
        badge.style.color = '#c0392b';
      }
    }
    if (numField) numField.value = value;
    global.ArpaNumeracion?.setReserved?.('cot', value);
    const hoy = new Date();
    const fecha = document.getElementById('cot-fecha');
    const validez = document.getElementById('cot-validez');
    const fechaISO = global.fechaLocalISO(hoy);
    if (fecha) fecha.value = fechaISO;
    if (validez) {
      const v = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 15);
      validez.value = global.fechaLocalISO(v);
    }
    const cliente = document.getElementById('cot-nombre')?.value || '';
    const nc = cliente ? '-' + cliente.replace(/\s+/g, '-').substring(0, 20) : '';
    document.title = `${value}${nc}-${fechaISO}`;
  }

  async function ensureCotNumero() {
    if (!global.ArpaNumeracion?.hasActiveLicenseCode?.()) return;
    const numField = document.getElementById('numero-cot');
    if (!numField || numField.value.trim()) return;
    const reservado = global.ArpaNumeracion?.getReserved?.('cot');
    if (reservado) {
      numField.value = reservado;
      return;
    }
    await nuevoCotNumero();
  }

  function lockCotRowsForPrint(viewRoot) {
    if (!viewRoot) return [];
    const backups = [];
    viewRoot.querySelectorAll('#cot-tabla-body tr.cot-row').forEach((tr) => {
      backups.push({
        el: tr,
        breakInside: tr.style.breakInside,
        pageBreakInside: tr.style.pageBreakInside,
      });
      tr.style.breakInside = 'avoid-page';
      tr.style.pageBreakInside = 'avoid';
    });
    return backups;
  }

  function unlockCotRowsForPrint(backups) {
    backups.forEach(({ el, breakInside, pageBreakInside }) => {
      el.style.breakInside = breakInside;
      el.style.pageBreakInside = pageBreakInside;
    });
  }

  function getCotSnapshot() {
    global.ArpaCobros?.syncFromEditor?.('cot');
    const subtotalProductos = filas.reduce((s, f) => s + f.pvp * f.cant, 0);
    const subtotalCobros = getCobrosLineas().reduce((s, f) => s + f.pvp * f.cant, 0);
    const subtotal = subtotalProductos + subtotalCobros;
    const conIva = document.getElementById('iva-check-cot')?.checked;
    const iva = conIva ? subtotal * getTaxRate() : 0;
    const total = subtotal + iva;

    return {
      numero: document.getElementById('numero-cot')?.value.trim() || '',
      cliente: document.getElementById('cot-nombre')?.value.trim() || '',
      ciudad: document.getElementById('cot-ciudad')?.value.trim() || '',
      fecha: document.getElementById('cot-fecha')?.value || '',
      total
    };
  }

  function getFilas() {
    return filas.map(function(f) {
      return { cod: f.cod, nom: f.nom, pvp: f.pvp, cant: f.cant, tipo: f.tipo };
    });
  }
  function loadCotizacion(snap) {
    if (!snap) return;
    var numero = document.getElementById('numero-cot');
    var nombre = document.getElementById('cot-nombre');
    var ciudad = document.getElementById('cot-ciudad');
    var fecha  = document.getElementById('cot-fecha');
    var nit    = document.getElementById('cot-nit');
    var tel    = document.getElementById('cot-tel');
    var email  = document.getElementById('cot-email');
    if (numero) numero.value = snap.numero  || '';
    if (nombre) nombre.value = snap.cliente || '';
    if (ciudad) ciudad.value = snap.ciudad  || '';
    if (fecha)  fecha.value  = snap.fecha   || '';
    if (nit)    nit.value    = snap.nit     || '';
    if (tel)    tel.value    = snap.tel     || '';
    if (email)  email.value  = snap.email   || '';
    filas = (snap.filas || []).map(function(f) {
      return { cod: f.cod || '', nom: f.nom || '', pvp: f.pvp || 0, cant: f.cant || 1, tipo: f.tipo || 'producto' };
    });
    renderTablaCot();
    if (snap.cobros && global.ArpaCobros?.setLines) {
      global.ArpaCobros.setLines('cot', snap.cobros);
    }
  }

  function getCotItemLabels() {
    global.ArpaCobros?.syncFromEditor?.('cot');
    const labels = [];
    filas.forEach((f) => {
      const nom = (f.nom || '').trim();
      if (nom) labels.push(nom);
    });
    getCobrosLineas().forEach((line) => {
      const desc = (line.nom || line.desc || '').trim();
      if (desc && desc !== 'Ítem de cobro') labels.push(desc);
    });
    return labels;
  }

  function saveCotMetadata() {
    global.applyUserSettingsToUI?.();
    global.ArpaCobros?.syncFromEditor?.('cot');
    renderTablaCot();
    global.ArpaHistorial?.captureFromCotizacion?.();
    global.ArpaNumeracion?.clearReserved?.('cot', document.getElementById('numero-cot')?.value);
    clearCotDraft();
  }

  function beginCotPdfExport() {
    global.ArpaTrialCapture?.beginPdfExport?.();
    const viewRoot = document.getElementById('view-cotizacion');
    const viewWasHidden = viewRoot?.hasAttribute('hidden') ?? false;
    if (viewRoot) viewRoot.removeAttribute('hidden');

    document.body.classList.add('is-printing');
    global.ArpaBrand?.prepareForPrint?.();
    global.ArpaI18n?.preparePdfSpanish?.('view-cotizacion');
    global.ArpaBrand?.applyLegalCopyToDocuments?.({ onlyCustom: true });
    global.ArpaCobros?.syncFromEditor?.('cot');
    renderTablaCot();
    const rowPrintBackups = lockCotRowsForPrint(viewRoot);
    const elementos = viewRoot.querySelectorAll(
      'input:not([type=file]):not([type=checkbox]):not(.cot-cant-input):not(.cot-pvp-input):not(.cobro-desc):not(.cobro-valor), select, textarea'
    );
    const respaldos = [];
    const obs = document.getElementById('cot-obs');
    const obsSection = document.getElementById('cot-obs-section') || obs?.closest('.section');
    if (obsSection) obsSection.classList.toggle('print-hide-empty', !String(obs.value || '').trim());
    elementos.forEach((el) => {
      const valor = el.tagName === 'SELECT'
        ? el.options[el.selectedIndex]?.text || ''
        : el.value || '';
      const span = document.createElement('span');
      span.className = 'pdf-valor';
      span.textContent = valor;
      span.style.cssText = `display:inline-block;width:100%;font-size:13px;color:${valor ? '#1e293b' : '#9ca3af'};padding:8px 10px;font-family:'DM Sans',sans-serif;border-bottom:1px solid #d1d5db;min-height:36px;`;
      respaldos.push({ el, parent: el.parentNode });
      el.parentNode.replaceChild(span, el);
    });

    viewRoot.querySelectorAll('.cot-cant-input').forEach((input) => {
      const span = document.createElement('span');
      span.className = 'pdf-valor';
      span.textContent = global.ArpaPricing?.formatoCantidad
        ? global.ArpaPricing.formatoCantidad(input.value)
        : String(parseCant(input.value));
      span.style.cssText = 'display:inline-block;width:100%;text-align:center;font-size:13px;padding:4px;';
      respaldos.push({ el: input, parent: input.parentNode });
      input.parentNode.replaceChild(span, input);
    });

    viewRoot.querySelectorAll('.cot-pvp-input').forEach((input) => {
      const span = document.createElement('span');
      span.className = 'pdf-valor';
      span.textContent = formatoPesos(parsePvp(input.value));
      span.style.cssText = 'display:inline-block;width:100%;text-align:right;font-size:13px;padding:4px;font-family:\'DM Mono\',monospace;font-weight:600;';
      respaldos.push({ el: input, parent: input.parentNode });
      input.parentNode.replaceChild(span, input);
    });

    const btnStack = document.querySelector('#pdf-actions-cot .pdf-actions-stack');
    const btnStackDisplay = btnStack ? btnStack.style.display : '';
    if (btnStack) btnStack.style.display = 'none';
    const cobrosActions = document.getElementById('cobros-actions-cot');
    if (cobrosActions) cobrosActions.style.setProperty('display', 'none');
    document.getElementById('settings-modal')?.classList.remove('open');

    window.ArpaSignature?.prepareForPrint?.([
      'canvas-cot-cliente',
      'canvas-cot-elaborado'
    ]);

    return {
      viewRoot,
      viewWasHidden,
      rowPrintBackups,
      respaldos,
      btnStack,
      btnStackDisplay,
      cobrosActions,
      tituloRespaldo: document.title
    };
  }

  function endCotPdfExport(ctx, options) {
    const {
      viewRoot,
      viewWasHidden,
      rowPrintBackups,
      respaldos,
      btnStack,
      btnStackDisplay,
      cobrosActions,
      tituloRespaldo
    } = ctx;

    document.title = tituloRespaldo;
    if (viewRoot && viewWasHidden) viewRoot.setAttribute('hidden', '');
    document.body.classList.remove('is-printing');
    global.ArpaI18n?.restorePdfSpanish?.();
    global.ArpaBrand?.restoreAfterPrint?.();
    unlockCotRowsForPrint(rowPrintBackups);
    global.ArpaSignature?.restoreAfterPrint?.();
    respaldos.forEach(({ el, parent }) => {
      const span = parent.querySelector('.pdf-valor');
      if (span) parent.replaceChild(el, span);
    });
    if (btnStack) btnStack.style.display = btnStackDisplay;
    if (cobrosActions) cobrosActions.style.removeProperty('display');
    renderTablaCot();
    if (options?.trialCapture) global.ArpaTrialCapture?.onDocumentSaved?.('cotizacion');
    global.ArpaTrialCapture?.endPdfExport?.();
  }

  function sanitizeCotFilenamePart(text) {
    return String(text || '')
      .replace(/[^\w\s-áéíóúÁÉÍÓÚñÑ]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 40) || 'Cotizacion';
  }

  const COT_PDF_LETTER = { widthMm: 215.9, heightMm: 279.4, marginX: 12, marginTop: 12, marginBottom: 14 };
  const COT_WHATSAPP_PRINT_CSS = [
    'body.is-printing:not(.is-printing-formato) #cot-buscar-section,',
    'body.is-printing:not(.is-printing-formato) #cot-cobros-section,',
    'body.is-printing:not(.is-printing-formato) .buscador-wrap-cot,',
    'body.is-printing:not(.is-printing-formato) .iva-toggle,',
    'body.is-printing:not(.is-printing-formato) .cot-catalog-hint,',
    'body.is-printing:not(.is-printing-formato) .print-hide-empty,',
    'body.is-printing:not(.is-printing-formato) #pdf-actions-cot,',
    'body.is-printing:not(.is-printing-formato) #pdf-actions-formato,',
    'body.is-printing:not(.is-printing-formato) #view-cotizacion button,',
    'body.is-printing:not(.is-printing-formato) #view-cotizacion .tabla-productos .td-action,',
    'body.is-printing:not(.is-printing-formato) #view-cotizacion .tabla-productos thead th:last-child,',
    'body.is-printing:not(.is-printing-formato) #view-cotizacion .tabla-productos tbody td:last-child { display:none !important; }',
    'body.is-printing:not(.is-printing-formato) #cot-print-footer { display:block !important; background:#fff; border-top:1px solid #e2e8f0; margin-top:10px; }',
    'body.is-printing:not(.is-printing-formato) #cot-print-footer-local,',
    'body.is-printing:not(.is-printing-formato) #cot-print-footer .suite-footer-local { color:#334155 !important; font-size:10px !important; }',
    'body.is-printing:not(.is-printing-formato) #cot-print-footer-global,',
    'body.is-printing:not(.is-printing-formato) #cot-print-footer .suite-footer-global-text { color:#475569 !important; font-size:8pt !important; }',
    'body.is-printing:not(.is-printing-formato) .suite-footer { display:none !important; }',
    'body.is-printing .header { flex-direction:column; align-items:center; text-align:center; gap:10px; padding:16px 24px 12px; }',
    'body.is-printing .brand-logo-wrap { margin:0 auto; order:-1; max-width:180px; min-height:64px; padding:8px; }',
    'body.is-printing .header #brand-logo { max-height:56px; }',
    'body.is-printing .header-info, body.is-printing .header-meta { flex:none; width:100%; text-align:center; }',
    'body.is-printing .header-meta .no-field { justify-content:center; }',
    'body.is-printing #validation-badge,',
    'body.is-printing .lang-switch,',
    'body.is-printing .settings-btn,',
    'body.is-printing #header-meta-formato,',
    'body.is-printing #header-meta-cc,',
    'body.is-printing .header button,',
    'body.is-printing #sync-status-cot,',
    'body.is-printing #sync-status-formato,',
    'body.is-printing #sync-status-cc { display:none !important; }',
    'body.is-printing #header-meta-cot { display:block !important; }',
    'body.is-printing #view-cotizacion .firma-canvas, body.is-printing #view-cotizacion .firma-print-img { height:72px !important; }',
    'body.is-printing #view-cotizacion .firma-box { padding:6px 8px; gap:4px; }',
    'body.is-printing #view-cotizacion .garantia-body { padding:8px 12px; gap:5px; }',
    'body.is-printing #view-cotizacion .nota, body.is-printing #view-cotizacion .nota-cot { padding:8px 10px; }',
    // En el celular la página mide ~400 px: la tabla se cortaba (sin Precio/Total) y el PDF salía de 6-7 hojas.
    // Durante la exportación se fija el ancho de escritorio (760 px) y se anulan las reglas de pantalla angosta,
    // para que lo medido en pantalla y lo capturado por html2canvas sean el mismo diseño.
    'body.is-printing.cot-pdf-fixed-width .page { width:760px !important; min-width:760px !important; max-width:760px !important; margin:0 !important; }',
    'body.is-printing.cot-pdf-fixed-width .tabla-cot-wrap { overflow:visible !important; }',
    'body.is-printing.cot-pdf-fixed-width .g3 { grid-template-columns:1fr 1fr 1fr !important; }',
    'body.is-printing.cot-pdf-fixed-width .g4 { grid-template-columns:1fr 1fr 1fr 1fr !important; }',
    'body.is-printing.cot-pdf-fixed-width .firmas { grid-template-columns:1fr 1fr !important; }'
  ].join('\n');

  function isVisibleBreakEl(el) {
    if (!el) return false;
    const cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.height > 1 && r.width > 1;
  }

  function collectCotPdfBreakRanges(viewRoot) {
    const root = viewRoot.getBoundingClientRect();
    const scrollTop = viewRoot.scrollTop || 0;
    const push = (el, name, list) => {
      if (!isVisibleBreakEl(el)) return;
      const r = el.getBoundingClientRect();
      list.push({
        name,
        top: r.top - root.top + scrollTop,
        bottom: r.bottom - root.top + scrollTop
      });
    };
    const atomic = [];
    viewRoot.querySelectorAll('.grid > .field').forEach((el, i) => push(el, 'campo-' + i, atomic));
    viewRoot.querySelectorAll('.tabla-productos thead tr').forEach((el, i) => push(el, 'thead-' + i, atomic));
    viewRoot.querySelectorAll('.tabla-productos tbody tr:not(.empty-row)').forEach((el, i) => push(el, 'row-' + i, atomic));
    push(viewRoot.querySelector('.totales-box')?.closest('.section'), 'resumen', atomic);
    push(viewRoot.querySelector('.cot-bank-section'), 'bancarios', atomic);
    push(document.getElementById('cot-obs-section'), 'observaciones', atomic);
    push(document.getElementById('cot-garantia-section'), 'garantia', atomic);
    push(document.getElementById('cot-nota-requisitos'), 'requisitos', atomic);
    push(document.getElementById('cot-nota-legal'), 'nota-legal', atomic);
    push(document.getElementById('cot-aprobacion-section'), 'aprobacion', atomic);
    const extras = [];
    push(document.getElementById('cot-print-footer'), 'pie', extras);
    push(viewRoot.querySelector('.firmas'), 'firmas', extras);
    return { atomic, extras, rootHeight: Math.max(viewRoot.scrollHeight, root.height) };
  }

  function computeCanvasPageStarts(ranges, pageH, canvasH) {
    const items = (ranges || [])
      .filter((r) => r && r.bottom > r.top)
      .slice()
      .sort((a, b) => a.top - b.top || a.bottom - b.bottom);
    const starts = [0];
    let pageStart = 0;
    const EPS = 1.5;
    let guard = 0;
    while (pageStart + pageH < canvasH - EPS && guard < 40) {
      guard += 1;
      const pageEnd = pageStart + pageH;
      let cutAt = pageEnd;
      for (let i = 0; i < items.length; i += 1) {
        const el = items[i];
        if (el.bottom <= pageStart + EPS) continue;
        if (el.top >= pageEnd - EPS) break;
        const height = el.bottom - el.top;
        if (el.bottom <= pageEnd + EPS) continue;
        if (height > pageH + EPS) {
          cutAt = el.top > pageStart + EPS ? el.top : pageEnd;
          break;
        }
        cutAt = el.top > pageStart + EPS ? el.top : pageEnd;
        break;
      }
      if (cutAt <= pageStart + EPS) cutAt = pageEnd;
      if (cutAt >= canvasH - EPS) break;
      starts.push(cutAt);
      pageStart = cutAt;
    }
    return starts;
  }

  function pageIntervalHits(range, start, end, eps) {
    if (!range) return false;
    return range.top < end - eps && range.bottom > start + eps;
  }

  function injectCotWhatsAppPrintCss() {
    const existing = document.getElementById('arpa-cot-whatsapp-print-css');
    if (existing) existing.remove();
    const style = document.createElement('style');
    style.id = 'arpa-cot-whatsapp-print-css';
    style.textContent = COT_WHATSAPP_PRINT_CSS;
    document.head.appendChild(style);
    return style;
  }

  function waitForCotPdfLayout() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }

  function replaceHeaderCotNumber() {
    const input = document.getElementById('numero-cot');
    if (!input || input.tagName !== 'INPUT' || !input.parentNode) return null;
    const span = document.createElement('span');
    span.className = 'pdf-valor pdf-valor-numero-cot';
    span.textContent = input.value || '';
    span.style.cssText = 'display:inline-block;min-width:80px;padding:4px 6px;color:#fff;font-size:12px;font-weight:600;text-align:center;font-family:\'DM Sans\',sans-serif;';
    const parent = input.parentNode;
    parent.replaceChild(span, input);
    return { el: input, parent, span };
  }

  async function captureElementCanvas(html2canvas, el, opts) {
    opts = opts || {};
    const w = Math.max(1, Math.ceil(opts.width || el.scrollWidth || el.getBoundingClientRect().width));
    const h = Math.max(1, Math.ceil(opts.height || el.scrollHeight || el.getBoundingClientRect().height));
    return html2canvas(el, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: opts.backgroundColor == null ? '#ffffff' : opts.backgroundColor,
      width: w,
      height: h,
      windowWidth: w,
      windowHeight: h,
      scrollX: 0,
      scrollY: 0
    });
  }

  function stackCanvases(parts, targetW) {
    const scaled = parts.map((c) => {
      const h = c.height * (targetW / c.width);
      return { canvas: c, height: h };
    });
    const totalH = Math.max(1, Math.ceil(scaled.reduce((s, p) => s + p.height, 0)));
    const out = document.createElement('canvas');
    out.width = targetW;
    out.height = totalH;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, totalH);
    let y = 0;
    const tops = [];
    scaled.forEach((p) => {
      tops.push(y);
      ctx.drawImage(p.canvas, 0, y, targetW, p.height);
      y += p.height;
    });
    return { canvas: out, tops, heights: scaled.map((p) => p.height) };
  }

  function stampSearchableHeaderText(pdf, lines) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    let y = 5;
    (lines || []).forEach((line) => {
      const text = String(line || '').replace(/\s+/g, ' ').trim();
      if (!text) return;
      pdf.text(text, COT_PDF_LETTER.marginX, y);
      y += 3.2;
    });
  }

  function buildCotShareMessage() {
    const nombre = (document.getElementById('cot-nombre')?.value.trim() || 'Cliente').split(' ')[0];
    const numero = document.getElementById('numero-cot')?.value.trim() || '—';
    const company = global.ArpaBrand?.getSettings?.()?.companyName?.trim() || 'su empresa';
    return `Hola ${nombre}, le comparto la cotización N°${numero} de ${company}. Por favor revísela y confírmenos su recepción.`;
  }

  async function generarCotPdfFile() {
    const jsPDF = global.jspdf?.jsPDF || global.jsPDF;
    const html2canvas = global.html2canvas;
    const viewRoot = document.getElementById('view-cotizacion');
    if (!jsPDF || !html2canvas || !viewRoot) return null;

    const ctx = beginCotPdfExport();
    const printStyle = injectCotWhatsAppPrintCss();
    document.body.classList.add('cot-pdf-fixed-width');
    let numeroSwap = null;
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      viewRoot.scrollTop = 0;
      window.scrollTo(0, 0);
      numeroSwap = replaceHeaderCotNumber();
      await waitForCotPdfLayout();

      const headerEl = document.querySelector('.page > .header') || document.querySelector('.header');
      const goldEl = document.querySelector('.page > .gold-bar');
      const pageEl = document.querySelector('.page');
      const captureW = Math.max(
        320,
        Math.ceil((pageEl && pageEl.clientWidth) || viewRoot.scrollWidth || viewRoot.getBoundingClientRect().width)
      );

      const measured = collectCotPdfBreakRanges(viewRoot);
      const viewCanvas = await captureElementCanvas(html2canvas, viewRoot, {
        width: captureW,
        height: measured.rootHeight,
        backgroundColor: '#ffffff'
      });
      const headerCanvas = headerEl
        ? await captureElementCanvas(html2canvas, headerEl, {
          width: captureW,
          height: Math.ceil(headerEl.scrollHeight || headerEl.getBoundingClientRect().height),
          backgroundColor: '#0f2044'
        })
        : null;
      const goldCanvas = goldEl
        ? await captureElementCanvas(html2canvas, goldEl, {
          width: captureW,
          height: Math.max(4, Math.ceil(goldEl.getBoundingClientRect().height)),
          backgroundColor: '#d97706'
        })
        : null;

      const parts = [];
      if (headerCanvas) parts.push(headerCanvas);
      if (goldCanvas) parts.push(goldCanvas);
      parts.push(viewCanvas);
      const stacked = stackCanvases(parts, viewCanvas.width);
      const canvas = stacked.canvas;
      const headerBlockH = (headerCanvas ? stacked.heights[0] : 0)
        + (goldCanvas ? stacked.heights[headerCanvas ? 1 : 0] : 0);

      const scaleY = viewCanvas.height / measured.rootHeight;
      const viewOffset = headerBlockH;
      const toCanvas = (r) => ({
        name: r.name,
        top: r.top * scaleY + viewOffset,
        bottom: r.bottom * scaleY + viewOffset
      });
      const atomicPx = measured.atomic.map(toCanvas);
      if (headerBlockH > 1) {
        atomicPx.unshift({ name: 'encabezado', top: 0, bottom: headerBlockH });
      }
      const extrasPx = measured.extras.map(toCanvas);

      const contentW = COT_PDF_LETTER.widthMm - COT_PDF_LETTER.marginX * 2;
      const contentH = COT_PDF_LETTER.heightMm - COT_PDF_LETTER.marginTop - COT_PDF_LETTER.marginBottom;
      const pageCanvasH = contentH * (canvas.width / contentW);
      const starts = computeCanvasPageStarts(atomicPx, pageCanvasH, canvas.height);

      const company = (document.getElementById('brand-company-name')?.textContent || '').trim();
      const contact = (document.getElementById('brand-company-contact')?.innerText || '').replace(/\s+/g, ' ').trim();
      const numero = (numeroSwap?.el?.value || document.querySelector('.pdf-valor-numero-cot')?.textContent || document.getElementById('numero-cot')?.value || '').trim();

      const pdf = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' });
      for (let i = 0; i < starts.length; i += 1) {
        const srcY = Math.max(0, Math.floor(starts[i]));
        const nextY = i + 1 < starts.length ? starts[i + 1] : canvas.height;
        const srcH = Math.max(1, Math.min(Math.ceil(nextY - srcY), Math.ceil(canvas.height - srcY)));
        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = srcH;
        const sctx = slice.getContext('2d');
        sctx.fillStyle = '#ffffff';
        sctx.fillRect(0, 0, slice.width, slice.height);
        sctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
        const destH = srcH * contentW / canvas.width;
        if (i > 0) pdf.addPage();
        pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', COT_PDF_LETTER.marginX, COT_PDF_LETTER.marginTop, contentW, destH);
        if (i === 0) stampSearchableHeaderText(pdf, [company, contact, numero]);
      }

      const footer = extrasPx.find((r) => r.name === 'pie');
      const firmas = extrasPx.find((r) => r.name === 'firmas');
      const footerOnlyPages = [];
      for (let i = 0; i < starts.length; i += 1) {
        const s = starts[i];
        const e = i + 1 < starts.length ? starts[i + 1] : canvas.height;
        const hitsFooter = pageIntervalHits(footer, s, e, 2);
        const hitsFirmas = pageIntervalHits(firmas, s, e, 2);
        const hitsOther = atomicPx.some((r) => r.name !== 'aprobacion' && pageIntervalHits(r, s, e, 2));
        if (hitsFooter && !hitsFirmas && !hitsOther) footerOnlyPages.push(i + 1);
      }

      global.__arpaCotWhatsAppPdf = {
        format: 'letter',
        pageWidthMm: pdf.internal.pageSize.getWidth(),
        pageHeightMm: pdf.internal.pageSize.getHeight(),
        canvasH: canvas.height,
        pageCanvasH,
        starts,
        ranges: atomicPx,
        extras: extrasPx,
        footerOnlyPages,
        headerPx: headerBlockH,
        prep: {
          buscarHidden: window.getComputedStyle(document.getElementById('cot-buscar-section') || document.body).display === 'none',
          ivaHidden: window.getComputedStyle(document.querySelector('#view-cotizacion .iva-toggle') || document.body).display === 'none',
          suiteFooterHidden: window.getComputedStyle(document.getElementById('suite-footer') || document.body).display === 'none',
          cotFooterShown: window.getComputedStyle(document.getElementById('cot-print-footer') || document.body).display !== 'none',
          headerCaptured: headerBlockH > 40
        }
      };

      const blob = pdf.output('blob');
      const numeroArchivo = numero || document.getElementById('numero-cot')?.value.trim() || 'Cotizacion';
      const cliente = document.getElementById('cot-nombre')?.value.trim() || 'Cliente';
      const filename = `Cotizacion_${sanitizeCotFilenamePart(numeroArchivo)}_${sanitizeCotFilenamePart(cliente)}.pdf`;
      return new File([blob], filename, { type: 'application/pdf' });
    } finally {
      if (numeroSwap?.parent && numeroSwap.span?.parentNode === numeroSwap.parent) {
        numeroSwap.parent.replaceChild(numeroSwap.el, numeroSwap.span);
      }
      printStyle?.remove();
      document.body.classList.remove('cot-pdf-fixed-width');
      endCotPdfExport(ctx);
    }
  }

  function guardarCotPDF() {
    saveCotMetadata();

    const ctx = beginCotPdfExport();
    const numCot = document.getElementById('numero-cot')?.value.trim() || 'Cotización';
    document.title = numCot;

    window.print();

    scheduleAfterPrint(() => endCotPdfExport(ctx, { trialCapture: true }));
  }

  function scheduleAfterPrint(fn) {
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      fn();
    };
    window.addEventListener('afterprint', run, { once: true });
    setTimeout(run, 5000);
  }

  async function guardarCotPDFYWhatsApp() {
    saveCotMetadata();

    const telRaw = document.getElementById('cot-tel')?.value.trim() || '';
    const message = buildCotShareMessage();

    let file = null;
    try {
      file = await generarCotPdfFile();
    } catch (err) {
      console.warn('[arpa-cotizacion] pdf', err);
    }

    if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: file.name,
          text: message
        });
        global.ArpaTrialCapture?.onDocumentSaved?.('cotizacion');
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
        console.warn('[arpa-cotizacion] share', err);
      }
    }

    if (file) {
      downloadPdfFile(file);
      alert(window.ArpaI18n.t('alert.cotizacion.pdf_descargado_wa'));
    } else {
      alert(window.ArpaI18n.t('alert.pdf.no_generado_manual'));
    }
    global.ArpaWhatsApp?.openWhatsAppWithMessage?.(
      telRaw,
      message + ' (Adjunte el PDF descargado.)'
    );
    global.ArpaTrialCapture?.onDocumentSaved?.('cotizacion');
  }

  function downloadPdfFile(file) {
    try {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.warn('[arpa-cotizacion] download', err);
    }
  }

  function refreshCobros() {
    global.ArpaCobros?.renderEditor('cot');
    renderMarcasCot();
    renderTablaCot();
  }

  const COT_DRAFT_KEY = 'arpa_cot_draft';
  let draftSaveTimer = null;

  function collectCotDraft() {
    return {
      numero:   document.getElementById('numero-cot')?.value || '',
      nombre:   document.getElementById('cot-nombre')?.value || '',
      nit:      document.getElementById('cot-nit')?.value || '',
      tel:      document.getElementById('cot-tel')?.value || '',
      email:    document.getElementById('cot-email')?.value || '',
      ciudad:   document.getElementById('cot-ciudad')?.value || '',
      fecha:    document.getElementById('cot-fecha')?.value || '',
      validez:  document.getElementById('cot-validez')?.value || '',
      obs:      document.getElementById('cot-obs')?.value || '',
      conIva:   document.getElementById('iva-check-cot')?.checked || false,
      filas:    filas.map(function(f) {
        return { cod: f.cod, nom: f.nom, pvp: f.pvp, cant: f.cant };
      })
    };
  }

  function applyCotDraft() {
    try {
      var raw = localStorage.getItem(COT_DRAFT_KEY);
      if (!raw) return false;
      var d = JSON.parse(raw);
      if (!d || typeof d !== 'object') return false;

      var set = function(id, val) {
        var el = document.getElementById(id);
        if (el && val != null) el.value = val;
      };

      set('numero-cot', d.numero);
      set('cot-nombre', d.nombre);
      set('cot-nit', d.nit);
      set('cot-tel', d.tel);
      set('cot-email', d.email);
      set('cot-ciudad', d.ciudad);
      set('cot-fecha', d.fecha);
      set('cot-validez', d.validez);
      set('cot-obs', d.obs);

      var ivaCheck = document.getElementById('iva-check-cot');
      if (ivaCheck) ivaCheck.checked = !!d.conIva;

      if (Array.isArray(d.filas) && d.filas.length) {
        filas = d.filas.map(function(f) {
          return {
            cod:  String(f.cod  || ''),
            nom:  String(f.nom  || ''),
            pvp:  Number(f.pvp) || 0,
            cant: parseCant(f.cant)
          };
        });
        renderTablaCot();
        recalcularCotizacion();
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function scheduleCotDraftSave() {
    if (draftSaveTimer) clearTimeout(draftSaveTimer);
    draftSaveTimer = setTimeout(function() {
      draftSaveTimer = null;
      try {
        localStorage.setItem(COT_DRAFT_KEY, JSON.stringify(collectCotDraft()));
      } catch (e) {}
    }, 1500);
  }

  function clearCotDraft() {
    localStorage.removeItem(COT_DRAFT_KEY);
  }

  function bindCotDraftListeners() {
    var root = document.getElementById('view-cotizacion');
    if (!root || root.__cotDraftBound) return;
    root.__cotDraftBound = true;
    root.addEventListener('input', scheduleCotDraftSave);
    root.addEventListener('change', scheduleCotDraftSave);
  }

  function initCotizacion() {
    prepararInputCantidad(document.getElementById('cant-input-cot'));
    global.ArpaCobros?.init('cot');
    global.ArpaCobros?.seedFromPriceList('cot');

    const hoy = new Date();
    const fecha = document.getElementById('cot-fecha');
    const validez = document.getElementById('cot-validez');
    const fechaISO = global.fechaLocalISO(hoy);
    if (fecha && !fecha.value) fecha.value = fechaISO;
    if (validez && !validez.value) {
      const v = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 15);
      validez.value = global.fechaLocalISO(v);
    }
    const numField = document.getElementById('numero-cot');
    if (numField && !numField.value.trim()) {
      ensureCotNumero();
    }

    document.getElementById('buscador-cot')?.addEventListener('input', buscarProductoCot);
    document.getElementById('buscador-cot')?.addEventListener('focus', updateCatalogHint);
    renderMarcasCot();
    document.getElementById('iva-check-cot')?.addEventListener('change', recalcularCotizacion);
    document.addEventListener('click', (e) => {
      // Si el elemento clicado ya se re-renderizó (ej. al agregar con filtro de marca), no cerrar la lista
      if (!e.target.isConnected) return;
      if (e.target.closest('.cot-marca-chip') || e.target.closest('#cot-marcas')) return;
      if (!e.target.closest('.buscador-wrap-cot')) {
        const res = document.getElementById('resultados-cot');
        if (res) res.style.display = 'none';
      }
    });
    renderTablaCot();
    updateCatalogHint();
    applyCotDraft();
    bindCotDraftListeners();
  }

  function exportarACuentaCobro() {
    const nombre  = document.getElementById('cot-nombre')?.value.trim() || '';
    const nit     = document.getElementById('cot-nit')?.value.trim() || '';
    const tel     = document.getElementById('cot-tel')?.value.trim() || '';
    const ciudad  = document.getElementById('cot-ciudad')?.value.trim() || '';
    const fecha   = document.getElementById('cot-fecha')?.value || '';
    const obs     = document.getElementById('cot-obs')?.value.trim() || '';

    if (!nombre) {
      alert('Agrega el nombre del cliente antes de generar la Cuenta de Cobro.');
      return;
    }

    global.ArpaCobros?.syncFromEditor?.('cot');

    const todasLineas = [
      ...filas.map(function(f) {
        return { desc: (f.nom || '').trim(), cant: f.cant || 1, unit: f.pvp || 0 };
      }),
      ...getCobrosLineas().map(function(l) {
        return { desc: (l.nom || l.desc || '').trim(), cant: l.cant || 1, unit: l.pvp || 0 };
      })
    ].filter(function(s) { return s.desc; });

    if (!todasLineas.length) {
      todasLineas.push({ desc: 'Servicio técnico', cant: 1, unit: 0 });
    }

    const draft = {
      ciudad:        ciudad,
      fechaEmision:  fecha,
      clienteNombre: nombre,
      clienteDoc:    nit,
      clienteTel:    tel,
      obs:           obs,
      servicios:     todasLineas
    };

    try {
      const existing = localStorage.getItem('arpa_cuenta_cobro_draft');
      if (existing) {
        const d = JSON.parse(existing);
        const tieneCliente = d && d.clienteNombre && d.clienteNombre.trim();
        const tieneItems = d && Array.isArray(d.servicios) && d.servicios.some(function(s) { return s.desc && s.desc.trim(); });
        if (tieneCliente || tieneItems) {
          const msg = 'Ya tienes una Cuenta de Cobro en progreso' + (tieneCliente ? ' para ' + d.clienteNombre : '') + '.\n¿Sobreescribir con los datos de esta cotización?';
          if (!confirm(msg)) return;
        }
      }
      localStorage.setItem('arpa_cuenta_cobro_draft', JSON.stringify(draft));
    } catch (e) {
      alert('No se pudo preparar la Cuenta de Cobro.');
      return;
    }

    document.querySelector('.main-menu-btn[onclick*="openCuentaCobroView"]')?.click();

    setTimeout(function() {
      global.ArpaCuentaCobro?.applyCcDraft?.();
      global.ArpaCuentaCobro?.refreshView?.();
      window.scrollTo(0, 0);
    }, 450);
  }

  global.ArpaCotizacion = {
    initCotizacion,
    refreshCobros,
    renderTablaCot,
    recalcularCotizacion,
    nuevoCotNumero,
    ensureCotNumero,
    guardarCotPDF,
    guardarCotPDFYWhatsApp,
    generarCotPdfFile,
    computeCanvasPageStarts,
    collectCotPdfBreakRanges,
    getCotSnapshot,
    getCotItemLabels,
    getFilas,
    loadCotizacion,
    getCatalogoActivo,
    updateCatalogHint,
    syncTaxLabels,
    exportarACuentaCobro,
    clearCotDraft,
    scheduleCotDraftSave,
  };

  global.guardarCotPDF = guardarCotPDF;
  global.guardarCotPDFYWhatsApp = guardarCotPDFYWhatsApp;
  global.nuevoCotNumero = nuevoCotNumero;
  global.ensureCotNumero = ensureCotNumero;
  global.exportarACuentaCobro = exportarACuentaCobro;
})(window);
