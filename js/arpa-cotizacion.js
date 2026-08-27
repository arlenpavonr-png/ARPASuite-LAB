/**
 * Módulo: Cotización, ítems dinámicos y PDF
 */
(function (global) {
  var COT_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbyV0-C_XACD5suCh9gm1JkiKvrI3mket-z5GSFGFc6Y87HZaqFyCtVz7jmtQMayNEUeJg/exec';

  function guardarEnSheets(numCot, cliente, telefono, total, fecha) {
    return new Promise(function (resolve, reject) {
      var cb = '_arpaCotSheet_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      var script = document.createElement('script');
      var settled = false;

      function finish(fn, val) {
        if (settled) return;
        settled = true;
        try { delete global[cb]; } catch (e) { global[cb] = undefined; }
        script.remove();
        fn(val);
      }

      global[cb] = function (data) { finish(resolve, data); };
      script.onerror = function () { finish(reject, new Error('network')); };

      // Orden columnas Sheet: Número COT | Nombre cliente | Teléfono | Total | Fecha
      script.src = COT_SHEETS_URL
        + '?action=save'
        + '&numCot=' + encodeURIComponent(String(numCot || ''))
        + '&cliente=' + encodeURIComponent(String(cliente || ''))
        + '&telefono=' + encodeURIComponent(String(telefono || ''))
        + '&total=' + encodeURIComponent(String(total || ''))
        + '&fecha=' + encodeURIComponent(String(fecha || ''))
        + '&callback=' + cb;

      (document.body || document.head).appendChild(script);
    });
  }

  function formatoPesos(n) {
    return global.ArpaPricing?.formatoPesos(n) || ('$ ' + (Number(n) || 0).toLocaleString('es-CO'));
  }

  function getCatalogoActivo() {
    const oid = global.ArpaMiCatalogo?.getActiveOficioId?.()
      || global.ArpaOficios?.getActiveOficiosFromSettings?.()?.[0]
      || 'automatismos';
    const normalized = global.ArpaOficios?.normalizeOficioId?.(oid) || oid;
    const fromMiCatalogo = global.ArpaMiCatalogo?.getProducts?.(normalized);
    if (Array.isArray(fromMiCatalogo) && fromMiCatalogo.length) {
      return fromMiCatalogo
        .filter((p) => (p.nom || '').trim() && (p.cod || '').trim())
        .map((p) => global.ArpaCatalogo?.productToFlatDisplay?.(p, normalized) || p);
    }
    return global.ArpaCatalogo?.getListaProductos?.(normalized) || [];
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

  function buscarProductoCot() {
    const q = document.getElementById('buscador-cot')?.value.toLowerCase().trim();
    const res = document.getElementById('resultados-cot');
    if (!res) return;
    if (!q || q.length < 2) {
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
    const encontrados = catalogo.filter((p) => {
      const texto = [p.nom, p.cod, p.marca].filter(Boolean).join(' ').toLowerCase();
      return palabras.every((palabra) => texto.includes(palabra));
    }).slice(0, 10);
    if (!encontrados.length) {
      res.innerHTML = '<div class="resultado-item"><span class="resultado-nom" style="color:var(--muted)">' + escapeHtml(window.ArpaI18n.t('ui.cotizacion.sin_resultados')) + '</span></div>';
      res.style.display = 'block';
      return;
    }
    res.innerHTML = encontrados.map((p) =>
      `<div class="resultado-item" data-cod="${p.cod}" data-pvp="${p.pvp || 0}">
        <span class="resultado-cod">${p.cod}</span>
        <span class="resultado-nom">${p.nom}</span>
        <span class="resultado-pvp">${formatoPesos(p.pvp)}</span>
      </div>`
    ).join('');
    res.style.display = 'block';
    res.querySelectorAll('.resultado-item[data-cod]').forEach((el) => {
      el.addEventListener('click', () => seleccionarProductoCot(el.dataset.cod));
    });
  }

  function resolveProductPvp(prod) {
    if (prod && prod.pvp != null && prod.pvp !== '') return parsePvp(prod.pvp);
    return 0;
  }

  function seleccionarProductoCot(cod) {
    const prod = findProductoCot(cod);
    if (!prod) return;
    const cant = parseInt(document.getElementById('cant-input-cot')?.value, 10) || 1;
    const pvpCatalogo = resolveProductPvp(prod);
    const existente = filas.find((f) => f.cod === prod.cod);
    if (existente) {
      existente.cant += cant;
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
  }

  function renderTablaCot() {
    const tbody = document.getElementById('cot-tabla-body');
    if (!tbody) return;

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
        <td class="td-cant"><input type="number" class="cot-cant-input" min="1" value="${f.cant}" data-fila="${idx}"></td>
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
        filas[idx].cant = parseInt(input.value, 10) || 1;
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

  function recalcularCotizacion() {
    const subtotalProductos = filas.reduce((s, f) => s + f.pvp * f.cant, 0);
    const subtotalCobros = getCobrosLineas().reduce((s, f) => s + f.pvp * f.cant, 0);
    const subtotal = subtotalProductos + subtotalCobros;
    const conIva = document.getElementById('iva-check-cot')?.checked;
    const iva = conIva ? subtotal * 0.19 : 0;
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
    if (!global.ArpaNumeracion?.blockIfPymeMissingCode?.()) return;
    const numField = document.getElementById('numero-cot');
    const { value, sincronizado } = await global.ArpaNumeracion.nextNumberAsync('cot', numField?.value);
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
    const hoy = new Date();
    const fecha = document.getElementById('cot-fecha');
    const validez = document.getElementById('cot-validez');
    if (fecha) fecha.value = hoy.toISOString().split('T')[0];
    if (validez) {
      const v = new Date(hoy);
      v.setDate(v.getDate() + 15);
      validez.value = v.toISOString().split('T')[0];
    }
    const cliente = document.getElementById('cot-nombre')?.value || '';
    const nc = cliente ? '-' + cliente.replace(/\s+/g, '-').substring(0, 20) : '';
    document.title = `${value}${nc}-${hoy.toISOString().slice(0, 10)}`;
  }

  async function ensureCotNumero() {
    const numField = document.getElementById('numero-cot');
    if (numField && !numField.value.trim()) await nuevoCotNumero();
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
    const iva = conIva ? subtotal * 0.19 : 0;
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
    const numCot = (document.getElementById('numero-cot')?.value || '').trim();
    const cliente = document.querySelector('#cot-nombre, #cot-cliente, input[name*=nombre]')?.value?.trim() || '';
    const telefono = document.querySelector('#cot-tel, #cot-telefono, input[name*=tel]')?.value?.trim() || '';
    const total = document.querySelector('#total-val-cot, #cot-total, .cot-total')?.textContent?.trim() || '';
    const fecha = document.getElementById('cot-fecha')?.value?.trim()
      || new Date().toISOString().split('T')[0];
    guardarEnSheets(numCot, cliente, telefono, total, fecha);

    global.applyUserSettingsToUI?.();
    global.ArpaCobros?.syncFromEditor?.('cot');
    renderTablaCot();
    global.ArpaHistorial?.captureFromCotizacion?.();
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
    global.ArpaCobros?.syncFromEditor?.('cot');
    renderTablaCot();
    const rowPrintBackups = lockCotRowsForPrint(viewRoot);
    const elementos = viewRoot.querySelectorAll(
      'input:not([type=file]):not([type=checkbox]):not(.cot-cant-input):not(.cot-pvp-input):not(.cobro-desc):not(.cobro-valor), select, textarea'
    );
    const respaldos = [];
    elementos.forEach((el) => {
      const valor = el.tagName === 'SELECT'
        ? el.options[el.selectedIndex]?.text || ''
        : el.value || '';
      const span = document.createElement('span');
      span.className = 'pdf-valor';
      span.textContent = valor || el.placeholder || '';
      span.style.cssText = `display:inline-block;width:100%;font-size:13px;color:${valor ? '#1e293b' : '#9ca3af'};padding:8px 10px;font-family:'DM Sans',sans-serif;border-bottom:1px solid #d1d5db;min-height:36px;`;
      respaldos.push({ el, parent: el.parentNode });
      el.parentNode.replaceChild(span, el);
    });

    viewRoot.querySelectorAll('.cot-cant-input').forEach((input) => {
      const span = document.createElement('span');
      span.className = 'pdf-valor';
      span.textContent = input.value;
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
    try {
      const canvas = await html2canvas(viewRoot, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const blob = pdf.output('blob');
      const numero = document.getElementById('numero-cot')?.value.trim() || 'Cotizacion';
      const cliente = document.getElementById('cot-nombre')?.value.trim() || 'Cliente';
      const filename = `Cotizacion_${sanitizeCotFilenamePart(numero)}_${sanitizeCotFilenamePart(cliente)}.pdf`;
      return new File([blob], filename, { type: 'application/pdf' });
    } finally {
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
            cant: parseInt(f.cant, 10) || 1
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
    global.ArpaCobros?.init('cot');
    global.ArpaCobros?.seedFromPriceList('cot');

    const hoy = new Date();
    const fecha = document.getElementById('cot-fecha');
    const validez = document.getElementById('cot-validez');
    if (fecha && !fecha.value) fecha.value = hoy.toISOString().split('T')[0];
    if (validez && !validez.value) {
      const v = new Date(hoy);
      v.setDate(v.getDate() + 15);
      validez.value = v.toISOString().split('T')[0];
    }
    const numField = document.getElementById('numero-cot');
    if (numField && !numField.value.trim()) {
      ensureCotNumero();
    }

    document.getElementById('buscador-cot')?.addEventListener('input', buscarProductoCot);
    document.getElementById('buscador-cot')?.addEventListener('focus', updateCatalogHint);
    document.getElementById('iva-check-cot')?.addEventListener('change', recalcularCotizacion);
    document.addEventListener('click', (e) => {
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
    nuevoCotNumero,
    ensureCotNumero,
    guardarCotPDF,
    guardarCotPDFYWhatsApp,
    getCotSnapshot,
    getCotItemLabels,
    getFilas,
    loadCotizacion,
    getCatalogoActivo,
    updateCatalogHint,
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
